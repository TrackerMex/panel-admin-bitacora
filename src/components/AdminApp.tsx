import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  Building2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  LayoutDashboard,
  LogOut,
  Monitor,
  Moon,
  RefreshCcw,
  Server,
  ShieldCheck,
  Sun,
  Truck,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { api, type Cliente, type ResumenData, type Usuario } from "@/lib/api";
import { clearSession, getSession, type AdminSession } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
} from "@/components/ui/pagination";
import { Toaster } from "@/components/ui/sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";

type View = "dashboard" | "clientes" | "usuarios";
type ThemeMode = "light" | "dark" | "system";

const tabs = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
  { id: "clientes", label: "Clientes", icon: Building2, href: "/clientes" },
  { id: "usuarios", label: "Usuarios", icon: Users, href: "/usuarios" },
] as const;

const defaultTabs = [0, 1, 2, 3, 4, 5, 6, 7];
const tablePageSize = 5;
const tempPasswordsKey = "bitacoraAdminTempPasswords";

function routeTo(path: string) {
  window.location.href = path;
}

function formatDate(value: string) {
  if (!value) return "-";
  const date = new Date(value.replace(" ", "T"));
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short" });
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("es-MX").format(value);
}

function readTempPasswords() {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(sessionStorage.getItem(tempPasswordsKey) || "{}") as Record<string, string>;
  } catch {
    return {};
  }
}

function saveTempPassword(email: string, password: string) {
  if (typeof window === "undefined") return;
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail || !password) return;
  const passwords = readTempPasswords();
  passwords[normalizedEmail] = password;
  sessionStorage.setItem(tempPasswordsKey, JSON.stringify(passwords));
}

function activeBadge(active: number) {
  return active ? <Badge variant="secondary">Activo</Badge> : <Badge variant="destructive">Inactivo</Badge>;
}

function initials(value: string) {
  const words = String(value || "?").trim().split(/\s+/).filter(Boolean);
  return words.length > 1 ? `${words[0][0]}${words[1][0]}`.toUpperCase() : words[0]?.slice(0, 2).toUpperCase() || "?";
}

function roleBadge(role: string) {
  const normalized = String(role || "").toLowerCase();
  const label = normalized || "sin rol";
  const className =
    normalized === "admin"
      ? "bg-sky-50 text-sky-700 ring-1 ring-sky-100 dark:bg-sky-950/30 dark:text-sky-300 dark:ring-sky-900/50"
      : normalized === "editor"
        ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-300 dark:ring-emerald-900/50"
        : "bg-muted text-muted-foreground ring-1 ring-border";
  return <Badge className={className}>{label}</Badge>;
}

function getPreferredTheme() {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(mode: ThemeMode) {
  const resolved = mode === "system" ? getPreferredTheme() : mode;
  document.documentElement.classList.toggle("dark", resolved === "dark");
}

function useThemeMode() {
  const [theme, setTheme] = useState<ThemeMode>("system");

  useEffect(() => {
    const saved = (localStorage.getItem("bitacoraAdminTheme") as ThemeMode | null) || "system";
    setTheme(saved);
    applyTheme(saved);
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      if ((localStorage.getItem("bitacoraAdminTheme") || "system") === "system") {
        applyTheme("system");
      }
    };
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  function updateTheme(next: ThemeMode) {
    localStorage.setItem("bitacoraAdminTheme", next);
    setTheme(next);
    applyTheme(next);
  }

  return { theme, updateTheme };
}

function ThemeToggle() {
  const { theme, updateTheme } = useThemeMode();
  const options: Array<{ value: ThemeMode; label: string; icon: typeof Sun }> = [
    { value: "light", label: "Claro", icon: Sun },
    { value: "dark", label: "Oscuro", icon: Moon },
    { value: "system", label: "Sistema", icon: Monitor },
  ];

  return (
    <div className="inline-flex rounded-lg border border-border bg-muted p-1">
      {options.map((option) => {
        const Icon = option.icon;
        const active = theme === option.value;
        return (
          <button
            key={option.value}
            type="button"
            className={`inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-xs font-bold transition ${
              active ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => updateTheme(option.value)}
            aria-pressed={active}
          >
            <Icon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function Shell({ view }: { view: View }) {
  const [session, setSession] = useState<AdminSession | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const saved = getSession();
    if (!saved || saved.user.role?.toLowerCase() !== "admin") {
      routeTo("/login");
      return;
    }
    setSession(saved);
  }, []);

  function logout() {
    clearSession();
    routeTo("/login");
  }

  if (!session) {
    return <div className="grid min-h-screen place-items-center text-sm font-semibold text-muted-foreground">Validando sesión...</div>;
  }

  const title = tabs.find((tab) => tab.id === view)?.label || "Dashboard";

  return (
    <>
      <Toaster position="top-right" richColors closeButton />
      <div className="admin-shell grid lg:grid-cols-[250px_1fr]">
        <aside className="border-r border-border bg-card px-4 py-5">
        <div className="mb-7 flex items-center gap-3 px-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Truck className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-black text-foreground">Bitácora Admin Tracker México GPS</p>
          </div>
        </div>
        <nav className="space-y-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = tab.id === view;
            return (
              <button
                key={tab.id}
                className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm font-bold transition ${
                  active ? "bg-secondary text-secondary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
                onClick={() => routeTo(tab.href)}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </aside>
      <div className="min-w-0">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-card px-6 py-4">
          <div>
            <h1 className="text-xl font-black text-foreground">{title}</h1>
            <p className="text-sm text-muted-foreground">{session.user.nombre || session.user.username}</p>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button variant="secondary" onClick={logout}>
              <LogOut className="h-4 w-4" />
              Cerrar sesión
            </Button>
          </div>
        </header>
        <main className="admin-view-enter p-5 lg:p-7">
          {error ? <p className="mb-4 rounded-md bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p> : null}
          {view === "dashboard" ? <DashboardView onError={setError} /> : null}
          {view === "clientes" ? <ClientesView onError={setError} /> : null}
          {view === "usuarios" ? <UsuariosView onError={setError} /> : null}
        </main>
        </div>
      </div>
    </>
  );
}

function DashboardView({ onError }: { onError: (message: string) => void }) {
  const [data, setData] = useState<ResumenData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState("");

  async function load() {
    setLoading(true);
    onError("");
    try {
      setData(await api.resumen());
      setLastUpdated(new Date().toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" }));
    } catch (err) {
      onError(err instanceof Error ? err.message : "No se pudo cargar el resumen");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const kpis = [
    {
      label: "Clientes activos",
      value: data?.clientesActivos ?? 0,
      detail: "Cuentas con acceso operativo",
      icon: Building2,
      tone: "bg-sky-50 text-sky-700 ring-sky-100 dark:bg-sky-950/30 dark:text-sky-300 dark:ring-sky-900/50",
    },
    {
      label: "Usuarios activos",
      value: data?.usuariosActivos ?? 0,
      detail: "Administradores, editores y lectores",
      icon: Users,
      tone: "bg-violet-50 text-violet-700 ring-violet-100 dark:bg-violet-950/30 dark:text-violet-300 dark:ring-violet-900/50",
    },
    {
      label: "Unidades activas",
      value: data?.unidadesActivas ?? 0,
      detail: "Unidades visibles en Bitácora",
      icon: Truck,
      tone: "bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-300 dark:ring-emerald-900/50",
    },
    {
      label: "Despachos hoy",
      value: data?.despachosHoy ?? 0,
      detail: "Actividad registrada del día",
      icon: Activity,
      tone: "bg-amber-50 text-amber-700 ring-amber-100 dark:bg-amber-950/30 dark:text-amber-300 dark:ring-amber-900/50",
    },
  ];
  const clientes = data?.clientesActivos ?? 0;
  const usuarios = data?.usuariosActivos ?? 0;
  const unidades = data?.unidadesActivas ?? 0;
  const despachos = data?.despachosHoy ?? 0;
  const unidadesPorCliente = clientes ? Math.round((unidades / clientes) * 10) / 10 : 0;
  const usuariosPorCliente = clientes ? Math.round((usuarios / clientes) * 10) / 10 : 0;
  const actividad = unidades ? Math.min(100, Math.round((despachos / unidades) * 100)) : 0;

  return (
    <div className="space-y-6" aria-busy={loading}>
      <section className="rounded-lg border border-border bg-card text-card-foreground shadow-sm">
        <div className="flex flex-col gap-5 p-5 lg:flex-row lg:items-center lg:justify-between lg:p-6">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">Operación multi-tenant</Badge>
              <span className="text-xs font-semibold text-muted-foreground">
                {lastUpdated ? `Actualizado ${lastUpdated}` : "Esperando datos"}
              </span>
            </div>
            <h2 className="mt-3 text-2xl font-black tracking-tight text-foreground">Resumen operativo</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Estado central de clientes, usuarios y unidades que alimentan Bitácora y Planificador.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => routeTo("/clientes")}>
              <UserPlus className="h-4 w-4" />
              Nuevo cliente
            </Button>
            <Button onClick={load} disabled={loading}>
              <RefreshCcw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Actualizar
            </Button>
          </div>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Card key={kpi.label} className="admin-card-enter overflow-hidden">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-xs font-black uppercase tracking-[0.12em] text-muted-foreground">{kpi.label}</p>
                    <p className="mt-3 text-3xl font-black tabular-nums tracking-tight text-foreground">
                      {loading ? <span className="block h-9 w-16 animate-pulse rounded-md bg-muted" /> : formatNumber(kpi.value)}
                    </p>
                    <p className="mt-2 text-xs font-semibold leading-5 text-muted-foreground">{kpi.detail}</p>
                  </div>
                  <div className={`rounded-lg p-2.5 ring-1 ${kpi.tone}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </section>
      <section className="grid gap-4 xl:grid-cols-[1.45fr_0.85fr]">
        <div className="grid gap-4">
          <RecentCard title="Ultimos clientes" rows={data?.ultimosClientes || []} type="clientes" loading={loading} />
          <RecentCard title="Ultimos usuarios" rows={data?.ultimosUsuarios || []} type="usuarios" loading={loading} />
        </div>
        <Card className="admin-card-enter xl:sticky xl:top-6 xl:self-start">
          <CardHeader>
            <CardTitle>Lectura rapida</CardTitle>
            <CardDescription>Indicadores derivados para detectar carga y cobertura.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="rounded-md border border-border bg-muted/40 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-foreground">Cobertura por cliente</p>
                  <p className="mt-1 text-xs font-semibold text-muted-foreground">Unidades promedio asignadas</p>
                </div>
                <span className="text-2xl font-black tabular-nums text-foreground">{loading ? "..." : unidadesPorCliente}</span>
              </div>
            </div>
            <div className="rounded-md border border-border p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-foreground">Usuarios por cliente</p>
                  <p className="mt-1 text-xs font-semibold text-muted-foreground">Promedio de accesos activos</p>
                </div>
                <span className="text-2xl font-black tabular-nums text-foreground">{loading ? "..." : usuariosPorCliente}</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-bold text-foreground">Actividad del dia</span>
                <span className="font-black tabular-nums text-foreground">{loading ? "..." : String(actividad) + "%"}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary transition-all" style={{ width: (loading ? 0 : actividad) + "%" }} />
              </div>
              <p className="text-xs font-semibold leading-5 text-muted-foreground">
                Porcentaje estimado entre despachos del dia y unidades activas.
              </p>
            </div>
            <div className="grid gap-2 border-t border-border pt-4">
              <StatusLine icon={ShieldCheck} label="APIs admin" value="JWT activo" />
              <StatusLine icon={Server} label="Base multi-tenant" value="Segmentada" />
              <StatusLine icon={CheckCircle2} label="Visibilidad" value="Por cliente" />
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function StatusLine({ icon: Icon, label, value }: { icon: typeof ShieldCheck; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md px-1 py-2">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
          <Icon className="h-4 w-4" />
        </span>
        <span className="truncate text-sm font-semibold text-muted-foreground">{label}</span>
      </div>
      <span className="text-sm font-black text-foreground">{value}</span>
    </div>
  );
}

function RecentCard({
  title,
  rows,
  type,
  loading,
}: {
  title: string;
  rows: any[];
  type: "clientes" | "usuarios";
  loading: boolean;
}) {
  const description = type === "clientes" ? "Altas recientes de cuentas cliente" : "Accesos creados o actualizados recientemente";
  const colSpan = type === "usuarios" ? 4 : 3;

  return (
    <Card className="admin-card-enter">
      <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        <Badge variant="secondary">{loading ? "Cargando" : String(rows.length) + " registros"}</Badge>
      </CardHeader>
      <CardContent className="overflow-x-auto p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              {type === "usuarios" ? <TableHead>Rol</TableHead> : null}
              <TableHead>Estado</TableHead>
              <TableHead>Alta</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 4 }).map((_, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <div className="h-4 w-40 animate-pulse rounded bg-muted" />
                  </TableCell>
                  {type === "usuarios" ? (
                    <TableCell>
                      <div className="h-4 w-16 animate-pulse rounded bg-muted" />
                    </TableCell>
                  ) : null}
                  <TableCell>
                    <div className="h-5 w-16 animate-pulse rounded-full bg-muted" />
                  </TableCell>
                  <TableCell>
                    <div className="h-4 w-28 animate-pulse rounded bg-muted" />
                  </TableCell>
                </TableRow>
              ))
            ) : rows.length ? (
              rows.map((row) => (
                <TableRow key={row.id} className="admin-row-enter admin-table-row">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-secondary text-xs font-black uppercase text-secondary-foreground">
                        {String(row.nombre || row.email || "?").slice(0, 2)}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-foreground">{row.nombre || row.email}</p>
                        {type === "usuarios" ? <p className="truncate text-xs text-muted-foreground">{row.email}</p> : null}
                      </div>
                    </div>
                  </TableCell>
                  {type === "usuarios" ? (
                    <TableCell>
                      <Badge>{row.role}</Badge>
                    </TableCell>
                  ) : null}
                  <TableCell>{activeBadge(row.activo)}</TableCell>
                  <TableCell>{formatDate(row.created_at)}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={colSpan} className="py-10 text-center">
                  <p className="font-semibold text-foreground">Sin registros recientes</p>
                  <p className="mt-1 text-sm text-muted-foreground">Cuando existan altas nuevas apareceran aqui.</p>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function getVisiblePages(page: number, totalPages: number) {
  const pages = new Set([1, totalPages, page - 1, page, page + 1]);
  return Array.from(pages)
    .filter((value) => value >= 1 && value <= totalPages)
    .sort((a, b) => a - b);
}

function TablePagination({
  page,
  totalItems,
  pageSize,
  onPageChange,
}: {
  page: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = Math.min(page, totalPages);
  const start = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, totalItems);
  const visiblePages = getVisiblePages(currentPage, totalPages);

  function goTo(nextPage: number) {
    onPageChange(Math.min(Math.max(nextPage, 1), totalPages));
  }

  if (totalItems <= pageSize) {
    return (
      <div className="flex items-center justify-between border-t border-border px-4 py-3 text-sm text-muted-foreground">
        <span>{totalItems ? `${totalItems} registros` : "Sin registros"}</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 border-t border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm font-semibold text-muted-foreground">
        Mostrando {start}-{end} de {totalItems}
      </p>
      <Pagination className="mx-0 w-auto justify-start sm:justify-end" aria-label="Paginacion de tabla">
        <PaginationContent>
          <PaginationItem>
            <Button
              type="button"
              variant="ghost"
              size="default"
              disabled={currentPage === 1}
              aria-label="Ir a la pagina anterior"
              onClick={() => {
                goTo(currentPage - 1);
              }}
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Anterior</span>
            </Button>
          </PaginationItem>
          {visiblePages.map((pageNumber, index) => {
            const previous = visiblePages[index - 1];
            return (
              <div key={pageNumber} className="contents">
                {previous && pageNumber - previous > 1 ? (
                  <PaginationItem>
                    <span className="flex h-9 min-w-9 items-center justify-center px-2 text-sm text-muted-foreground">...</span>
                  </PaginationItem>
                ) : null}
                <PaginationItem>
                  <Button
                    type="button"
                    variant={currentPage === pageNumber ? "outline" : "ghost"}
                    size="icon"
                    aria-current={currentPage === pageNumber ? "page" : undefined}
                    aria-label={`Ir a la pagina ${pageNumber}`}
                    onClick={() => {
                      goTo(pageNumber);
                    }}
                  >
                    {pageNumber}
                  </Button>
                </PaginationItem>
              </div>
            );
          })}
          <PaginationItem>
            <Button
              type="button"
              variant="ghost"
              size="default"
              disabled={currentPage === totalPages}
              aria-label="Ir a la pagina siguiente"
              onClick={() => {
                goTo(currentPage + 1);
              }}
            >
              <span className="hidden sm:inline">Siguiente</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}

function ClientesView({ onError }: { onError: (message: string) => void }) {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [createdAccess, setCreatedAccess] = useState<{ email: string; password: string } | null>(null);
  const [showCreatedPassword, setShowCreatedPassword] = useState(false);
  const [showFormPassword, setShowFormPassword] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [form, setForm] = useState({
    clienteNombre: "",
    usuarioNombre: "",
    email: "",
    passwordTemporal: "",
    role: "editor",
  });

  async function load() {
    setLoading(true);
    onError("");
    try {
      setClientes(await api.clientes());
    } catch (err) {
      onError(err instanceof Error ? err.message : "No se pudieron cargar clientes");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setCreatedAccess(null);
    setShowCreatedPassword(false);
    onError("");
    try {
      await api.crearClienteUsuario({
        ...form,
        tabs: form.role === "lector" ? [3, 4, 5, 6, 7] : defaultTabs,
        activo: true,
      });
      setCreatedAccess({ email: form.email, password: form.passwordTemporal });
      saveTempPassword(form.email, form.passwordTemporal);
      toast.success("Cliente creado correctamente", {
        description: `${form.clienteNombre} queda vinculado a ${form.email}.`,
      });
      setForm({ clienteNombre: "", usuarioNombre: "", email: "", passwordTemporal: "", role: "editor" });
      setShowFormPassword(false);
      setDialogOpen(false);
      setPage(1);
      await load();
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudo guardar el cliente";
      onError(message);
      toast.error("No se pudo crear el registro", { description: message });
    } finally {
      setSaving(false);
    }
  }

  const clientesActivos = clientes.filter((cliente) => cliente.activo).length;
  const totalUnidades = clientes.reduce((sum, cliente) => sum + Number(cliente.total_unidades || 0), 0);
  const totalUsuarios = clientes.reduce((sum, cliente) => sum + Number(cliente.total_usuarios || 0), 0);
  const totalClientePages = Math.max(1, Math.ceil(clientes.length / tablePageSize));
  const clientePage = Math.min(page, totalClientePages);
  const clientesPaginados = clientes.slice((clientePage - 1) * tablePageSize, clientePage * tablePageSize);

  return (
    <div className="space-y-5">
      <section className="grid gap-4 md:grid-cols-3">
        <MiniMetric label="Clientes activos" value={loading ? "..." : formatNumber(clientesActivos)} icon={Building2} />
        <MiniMetric label="Unidades asignadas" value={loading ? "..." : formatNumber(totalUnidades)} icon={Truck} />
        <MiniMetric label="Usuarios vinculados" value={loading ? "..." : formatNumber(totalUsuarios)} icon={Users} />
      </section>

      {createdAccess ? (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200">
          <p className="font-semibold">Cliente guardado. Acceso temporal asignado:</p>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
            <span className="font-medium">{createdAccess.email}</span>
            <span className="hidden text-emerald-600 dark:text-emerald-400 sm:inline">/</span>
            <span className="inline-flex min-h-9 items-center gap-2 rounded-md border border-emerald-200 bg-background px-2 py-1 font-mono text-xs font-semibold text-foreground dark:border-emerald-900/70">
              <span>{showCreatedPassword ? createdAccess.password : "**********"}</span>
              <button
                type="button"
                className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                onClick={() => setShowCreatedPassword((value) => !value)}
                aria-label={showCreatedPassword ? "Ocultar password asignado" : "Mostrar password asignado"}
              >
                {showCreatedPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </span>
          </div>
        </div>
      ) : null}

      <Card className="admin-card-enter">
        <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle>Listado de clientes</CardTitle>
            <CardDescription>{loading ? "Cargando..." : String(clientes.length) + " clientes registrados"}</CardDescription>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <UserPlus className="h-4 w-4" />
                  Nuevo cliente
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Nuevo cliente</DialogTitle>
                  <DialogDescription>Alta del cliente y usuario principal en una sola operacion.</DialogDescription>
                </DialogHeader>
                <form className="space-y-5" onSubmit={submit}>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-md border border-border bg-muted/40 p-4">
                      <p className="text-xs font-black uppercase tracking-[0.12em] text-muted-foreground">Cliente</p>
                      <div className="mt-4 space-y-4">
                        <Field id="cliente-nombre" label="Nombre del cliente">
                          <Input id="cliente-nombre" value={form.clienteNombre} onChange={(e) => setForm({ ...form, clienteNombre: e.target.value })} required />
                        </Field>
                        <Field id="cliente-role" label="Rol inicial">
                          <NativeSelect id="cliente-role" className="w-full" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                            <NativeSelectOption value="editor">Editor</NativeSelectOption>
                            <NativeSelectOption value="lector">Lector</NativeSelectOption>
                            <NativeSelectOption value="admin">Admin</NativeSelectOption>
                          </NativeSelect>
                        </Field>
                      </div>
                    </div>

                    <div className="rounded-md border border-border p-4">
                      <p className="text-xs font-black uppercase tracking-[0.12em] text-muted-foreground">Usuario principal</p>
                      <div className="mt-4 space-y-4">
                        <Field id="usuario-nombre" label="Nombre usuario">
                          <Input id="usuario-nombre" value={form.usuarioNombre} onChange={(e) => setForm({ ...form, usuarioNombre: e.target.value })} required />
                        </Field>
                        <Field id="usuario-email" label="Email">
                          <Input id="usuario-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
                        </Field>
                        <Field id="usuario-password-temporal" label="Password temporal">
                          <div className="relative">
                            <Input
                              id="usuario-password-temporal"
                              type={showFormPassword ? "text" : "password"}
                              autoComplete="new-password"
                              className="pr-11"
                              value={form.passwordTemporal}
                              onChange={(e) => setForm({ ...form, passwordTemporal: e.target.value })}
                              required
                            />
                            <button
                              type="button"
                              className="absolute right-1 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                              onClick={() => setShowFormPassword((value) => !value)}
                              aria-label={showFormPassword ? "Ocultar password temporal" : "Mostrar password temporal"}
                            >
                              {showFormPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                        </Field>
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="secondary" onClick={() => setDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button disabled={saving}>
                      <UserPlus className="h-4 w-4" />
                      {saving ? "Guardando..." : "Crear cliente y usuario"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
            <Button variant="secondary" onClick={load} disabled={loading}>
              <RefreshCcw className={"h-4 w-4 " + (loading ? "animate-spin" : "")} />
              Actualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Unidades</TableHead>
                <TableHead>Usuarios</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Alta</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 8 }).map((_, index) => (
                  <TableRow key={index}>
                    <TableCell><div className="h-4 w-44 animate-pulse rounded bg-muted" /></TableCell>
                    <TableCell><div className="h-4 w-10 animate-pulse rounded bg-muted" /></TableCell>
                    <TableCell><div className="h-4 w-10 animate-pulse rounded bg-muted" /></TableCell>
                    <TableCell><div className="h-5 w-16 animate-pulse rounded-full bg-muted" /></TableCell>
                    <TableCell><div className="h-4 w-28 animate-pulse rounded bg-muted" /></TableCell>
                  </TableRow>
                ))
              ) : clientes.length ? (
                clientesPaginados.map((cliente) => (
                  <TableRow key={cliente.id} className="admin-row-enter admin-table-row">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-secondary text-xs font-black text-secondary-foreground">
                          {initials(cliente.nombre)}
                        </span>
                        <div>
                          <p className="font-semibold text-foreground">{cliente.nombre}</p>
                          <p className="text-xs text-muted-foreground">{cliente.slug}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-semibold tabular-nums">{formatNumber(Number(cliente.total_unidades || 0))}</TableCell>
                    <TableCell className="font-semibold tabular-nums">{formatNumber(Number(cliente.total_usuarios || 0))}</TableCell>
                    <TableCell>{activeBadge(cliente.activo)}</TableCell>
                    <TableCell>{formatDate(cliente.created_at)}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center">
                    <p className="font-semibold text-foreground">No hay clientes registrados</p>
                    <p className="mt-1 text-sm text-muted-foreground">Crea el primer cliente desde Nuevo cliente.</p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
        {!loading ? <TablePagination page={clientePage} totalItems={clientes.length} pageSize={tablePageSize} onPageChange={setPage} /> : null}
      </Card>
    </div>
  );
}

function MiniMetric({ label, value, icon: Icon }: { label: string; value: string; icon: typeof Building2 }) {
  return (
    <Card className="admin-card-enter">
      <CardContent className="flex items-center justify-between gap-4 p-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
          <p className="mt-2 text-2xl font-black tabular-nums text-foreground">{value}</p>
        </div>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
          <Icon className="h-5 w-5" />
        </span>
      </CardContent>
    </Card>
  );
}

function UsuariosView({ onError }: { onError: (message: string) => void }) {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [tempPasswords, setTempPasswords] = useState<Record<string, string>>({});
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});

  async function load() {
    setLoading(true);
    onError("");
    try {
      setUsuarios(await api.usuarios());
    } catch (err) {
      onError(err instanceof Error ? err.message : "No se pudieron cargar usuarios");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setTempPasswords(readTempPasswords());
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return usuarios;
    return usuarios.filter((u) => String(u.nombre + " " + u.email + " " + u.role + " " + u.clientes.join(" ")).toLowerCase().includes(q));
  }, [usuarios, query]);

  const admins = usuarios.filter((usuario) => String(usuario.role).toLowerCase() === "admin").length;
  const editors = usuarios.filter((usuario) => String(usuario.role).toLowerCase() === "editor").length;
  const sinCliente = usuarios.filter((usuario) => !usuario.clientes.length).length;
  const totalUsuarioPages = Math.max(1, Math.ceil(filtered.length / tablePageSize));
  const usuarioPage = Math.min(page, totalUsuarioPages);
  const usuariosPaginados = filtered.slice((usuarioPage - 1) * tablePageSize, usuarioPage * tablePageSize);

  return (
    <div className="space-y-5">
      <section className="grid gap-4 md:grid-cols-3">
        <MiniMetric label="Admins" value={loading ? "..." : formatNumber(admins)} icon={ShieldCheck} />
        <MiniMetric label="Editores" value={loading ? "..." : formatNumber(editors)} icon={UserPlus} />
        <MiniMetric label="Sin cliente" value={loading ? "..." : formatNumber(sinCliente)} icon={Users} />
      </section>

      <Card className="admin-card-enter">
        <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle>Usuarios</CardTitle>
            <CardDescription>
              {loading ? "Cargando..." : String(filtered.length) + " visibles de " + String(usuarios.length) + " registrados"}
            </CardDescription>
          </div>
          <div className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto">
            <div className="relative sm:w-80">
              <Input
                id="usuarios-busqueda"
                className="h-10 pr-10"
                aria-label="Buscar usuarios"
                placeholder="Buscar por usuario, email, rol o cliente"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
              />
              {query ? (
                <button
                  type="button"
                  className="absolute right-1 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                  onClick={() => {
                    setQuery("");
                    setPage(1);
                  }}
                  aria-label="Limpiar busqueda"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : null}
            </div>
            <Button variant="secondary" onClick={load} disabled={loading}>
              <RefreshCcw className={"h-4 w-4 " + (loading ? "animate-spin" : "")} />
              Actualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuario</TableHead>
                <TableHead>Password</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Clientes</TableHead>
                <TableHead>Tabs</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Alta</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 6 }).map((_, index) => (
                  <TableRow key={index}>
                    <TableCell><div className="h-4 w-48 animate-pulse rounded bg-muted" /></TableCell>
                    <TableCell><div className="h-4 w-28 animate-pulse rounded bg-muted" /></TableCell>
                    <TableCell><div className="h-5 w-16 animate-pulse rounded-full bg-muted" /></TableCell>
                    <TableCell><div className="h-4 w-36 animate-pulse rounded bg-muted" /></TableCell>
                    <TableCell><div className="h-4 w-20 animate-pulse rounded bg-muted" /></TableCell>
                    <TableCell><div className="h-5 w-16 animate-pulse rounded-full bg-muted" /></TableCell>
                    <TableCell><div className="h-4 w-28 animate-pulse rounded bg-muted" /></TableCell>
                  </TableRow>
                ))
              ) : filtered.length ? (
                usuariosPaginados.map((usuario) => (
                  <TableRow key={usuario.id} className="admin-row-enter admin-table-row">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-secondary text-xs font-black text-secondary-foreground">
                          {initials(usuario.nombre || usuario.email)}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-foreground">{usuario.nombre || usuario.email}</p>
                          <p className="truncate text-xs text-muted-foreground">{usuario.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {tempPasswords[usuario.email.toLowerCase()] ? (
                        <span className="inline-flex min-h-9 items-center gap-2 rounded-md border border-border bg-background px-2 py-1 font-mono text-xs font-semibold text-foreground">
                          <span>{visiblePasswords[usuario.email] ? tempPasswords[usuario.email.toLowerCase()] : "**********"}</span>
                          <button
                            type="button"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                            onClick={() =>
                              setVisiblePasswords((current) => ({
                                ...current,
                                [usuario.email]: !current[usuario.email],
                              }))
                            }
                            aria-label={visiblePasswords[usuario.email] ? "Ocultar password temporal" : "Mostrar password temporal"}
                          >
                            {visiblePasswords[usuario.email] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </span>
                      ) : (
                        <Badge variant="outline">Protegida</Badge>
                      )}
                    </TableCell>
                    <TableCell>{roleBadge(usuario.role)}</TableCell>
                    <TableCell>
                      {usuario.clientes.length ? (
                        <div className="flex max-w-sm flex-wrap gap-1.5">
                          {usuario.clientes.map((cliente) => (
                            <Badge key={cliente} variant="secondary">{cliente}</Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="text-sm font-semibold text-muted-foreground">Sin cliente</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-xs font-semibold text-muted-foreground">{usuario.tabs.length ? usuario.tabs.join(",") : "-"}</span>
                    </TableCell>
                    <TableCell>{activeBadge(usuario.activo)}</TableCell>
                    <TableCell>{formatDate(usuario.created_at)}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center">
                    <p className="font-semibold text-foreground">No hay usuarios para esa busqueda</p>
                    <p className="mt-1 text-sm text-muted-foreground">Ajusta el texto o actualiza la lista.</p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
        {!loading ? <TablePagination page={usuarioPage} totalItems={filtered.length} pageSize={tablePageSize} onPageChange={setPage} /> : null}
      </Card>
    </div>
  );
}

function Field({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}

export default function AdminApp({ initialView }: { initialView: View }) {
  return <Shell view={initialView} />;
}
