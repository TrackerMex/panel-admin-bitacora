export type AdminUser = {
  id: number;
  username: string;
  nombre: string;
  role: string;
  cliente: string;
  clientes: Array<{ id: number; nombre: string }>;
  unidades: string[];
  tabs: number[];
};

export type AdminSession = {
  user: AdminUser;
  token: string;
  expiresAt: number;
};

const SESSION_KEY = "bitacoraAdminSession";

export function getSession(): AdminSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as AdminSession;
    if (!session.token || !session.expiresAt || session.expiresAt <= Date.now() / 1000) {
      clearSession();
      return null;
    }
    return session;
  } catch {
    clearSession();
    return null;
  }
}

export function setSession(session: AdminSession) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession() {
  sessionStorage.removeItem(SESSION_KEY);
}

export function requireAdminSession(): AdminSession {
  const session = getSession();
  if (!session || String(session.user.role).toLowerCase() !== "admin") {
    throw new Error("Sesión de administrador requerida");
  }
  return session;
}
