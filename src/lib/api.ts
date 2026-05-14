import { clearSession, requireAdminSession, setSession, type AdminSession } from "./auth";

const API_BASE = import.meta.env.PUBLIC_BITACORA_API_BASE || "/bitacora_/src";

type ApiEnvelope<T> = {
  success: boolean;
  message?: string;
  data?: T;
  user?: AdminSession["user"];
  token?: string;
  expires_at?: number;
};

export type ResumenData = {
  clientesActivos: number;
  usuariosActivos: number;
  unidadesActivas: number;
  despachosHoy: number;
  ultimosClientes: Array<{ id: number; nombre: string; activo: number; created_at: string }>;
  ultimosUsuarios: Array<{
    id: number;
    email: string;
    nombre: string;
    role: string;
    activo: number;
    created_at: string;
  }>;
};

export type Cliente = {
  id: number;
  nombre: string;
  slug: string;
  activo: number;
  total_unidades: number;
  total_usuarios: number;
  created_at: string;
};

export type Usuario = {
  id: number;
  email: string;
  nombre: string;
  role: string;
  activo: number;
  clientes: string[];
  tabs: number[];
  created_at: string;
};

async function readJson<T>(response: Response): Promise<ApiEnvelope<T>> {
  const text = await response.text();
  try {
    return JSON.parse(text) as ApiEnvelope<T>;
  } catch {
    throw new Error("El servidor no devolvió JSON válido");
  }
}

export async function login(username: string, password: string) {
  const response = await fetch(`${API_BASE}/usuarios/login.php`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ username, password }),
  });
  const json = await readJson<never>(response);
  if (!response.ok || !json.success || !json.user || !json.token || !json.expires_at) {
    throw new Error(json.message || "No se pudo iniciar sesión");
  }
  if (String(json.user.role).toLowerCase() !== "admin") {
    throw new Error("Esta cuenta no tiene permisos de administrador");
  }
  const session = { user: json.user, token: json.token, expiresAt: json.expires_at };
  setSession(session);
  return session;
}

export async function adminFetch<T>(path: string, options: RequestInit = {}) {
  const session = requireAdminSession();
  const response = await fetch(`${API_BASE}/admin/${path}`, {
    ...options,
    headers: {
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.headers || {}),
      Authorization: `Bearer ${session.token}`,
    },
  });
  const json = await readJson<T>(response);
  if (response.status === 401 || response.status === 403) {
    clearSession();
  }
  if (!response.ok || !json.success) {
    throw new Error(json.message || "Error consultando API admin");
  }
  return json.data as T;
}

export const api = {
  resumen: () => adminFetch<ResumenData>("resumen.php"),
  clientes: () => adminFetch<Cliente[]>("clientes.php"),
  usuarios: () => adminFetch<Usuario[]>("usuarios.php"),
  crearClienteUsuario: (payload: Record<string, unknown>) =>
    adminFetch<{ clienteId: number; usuarioId: number }>("cliente_usuario.php", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
};
