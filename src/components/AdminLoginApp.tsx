import { useEffect, useState } from "react";
import { CheckCircle2, Eye, EyeOff, LockKeyhole, Server, ShieldCheck, Truck } from "lucide-react";
import { login } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function routeTo(path: string) {
  window.location.href = path;
}

export default function AdminLoginApp() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const canSubmit = username.trim() !== "" && password.trim() !== "" && !loading;

  useEffect(() => {
    const session = getSession();
    if (session?.user.role?.toLowerCase() === "admin") {
      routeTo("/dashboard");
    }
  }, []);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(username.trim(), password.trim());
      routeTo("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo iniciar sesion");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center px-4 py-8">
      <section className="admin-card-enter grid w-full max-w-5xl overflow-hidden rounded-lg border border-border bg-card text-card-foreground shadow-sm lg:grid-cols-[0.95fr_1.05fr]">
        <div className="hidden border-r border-border bg-muted p-8 lg:flex lg:flex-col lg:justify-between">
          <div>
            <div className="mb-7 flex h-11 w-11 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Truck className="h-5 w-5" />
            </div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-muted-foreground">Tracker Mexico GPS</p>
            <h1 className="mt-3 max-w-sm text-3xl font-black leading-tight text-foreground">
              Control central para clientes, usuarios y unidades.
            </h1>
          </div>
        </div>

        <div className="p-6 sm:p-8 lg:p-10">
          <div className="mb-8 flex items-start justify-between gap-4">
            <div>
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground lg:hidden">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-muted-foreground">Panel Admin</p>
              <h2 className="mt-2 text-2xl font-black text-foreground">Iniciar sesion</h2>
            </div>
            <div className="flex flex-col items-end gap-2">
              <Badge variant="secondary">Seguro</Badge>
            </div>
          </div>

          <form className="space-y-5" onSubmit={onSubmit}>
            <div className="space-y-2">
              <Label htmlFor="email">Email administrador</Label>
              <Input
                id="email"
                type="email"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin@tracker.local"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pr-11"
                  required
                />
                <button
                  type="button"
                  className="absolute right-1 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? "Ocultar password" : "Mostrar password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            {error ? (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-3 text-sm font-semibold text-red-800">
                {error}
              </div>
            ) : null}
            <Button className="h-11 w-full" disabled={!canSubmit}>
              <LockKeyhole className="h-4 w-4" />
              {loading ? "Validando acceso..." : "Entrar al panel"}
            </Button>
          </form>
        </div>
      </section>
    </main>
  );
}
