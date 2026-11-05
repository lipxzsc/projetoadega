/**
 * LOGIN / SIGNUP do administrador.
 *
 * Segurança:
 *  - Antes de tentar entrar, consultamos no servidor se o e-mail não está
 *    bloqueado por excesso de tentativas (proteção contra força bruta).
 *  - Cada falha é registrada no servidor; o sucesso limpa o histórico.
 *  - O e-mail nunca é gravado em texto puro (só o hash SHA-256).
 *
 * O primeiro usuário criado pode se promover a admin com 1 toque (claim_admin).
 */
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { ArrowLeft, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { checkLoginAllowed, recordLoginAttempt } from "@/lib/login-guard.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { brandMeta, STORE_ARTWORK } from "@/lib/brand";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
  head: () => ({ meta: brandMeta("Acesso administrativo", "Acesso à administração da Subzero Delivery.") }),
});

function AuthPage() {
  const navigate = useNavigate();
  const canTryLogin = useServerFn(checkLoginAllowed);
  const logAttempt = useServerFn(recordLoginAttempt);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [session, setSession] = useState<{ userId: string } | null>(null);

  // Detecta sessão atual + escuta mudanças
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setSession({ userId: data.user.id });
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s?.user ? { userId: s.user.id } : null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // 1. Rate limit no servidor
      const guard = await canTryLogin({ data: { email } });
      if (!guard.allowed) {
        toast.error("Muitas tentativas", {
          description: `Aguarde ${guard.blockedForMinutes} minutos antes de tentar novamente.`,
        });
        return;
      }

      // 2. Tentativa de login
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      await logAttempt({ data: { email, success: !error } });

      if (error) {
        toast.error("Falha no login", {
          description: `Credenciais inválidas. Tentativas restantes: ${Math.max(0, guard.remaining - 1)}.`,
        });
        return;
      }
      toast.success("Bem-vindo!");
      navigate({ to: "/admin" });
    } finally {
      setLoading(false);
    }
  };


  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin + "/auth" },
    });
    setLoading(false);
    if (error) return toast.error("Falha no cadastro", { description: error.message });
    toast.success("Conta criada! Faça login.");
  };

  const handleClaimAdmin = async () => {
    setClaiming(true);
    const { data, error } = await supabase.rpc("claim_admin");
    setClaiming(false);
    if (error) return toast.error("Erro", { description: error.message });
    if (data === true) {
      toast.success("Você agora é admin!");
      navigate({ to: "/admin" });
    } else {
      toast.info("Já existe um administrador cadastrado.");
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-md items-center gap-3 px-4 py-4">
          <Link to="/" className="text-muted-foreground hover:text-primary">
            <ArrowLeft className="size-5" />
          </Link>
          <h1 className="flex items-center gap-2 text-lg font-bold">
            <ShieldCheck className="size-5 text-primary" /> Admin
          </h1>
        </div>
      </header>

      <main className="mx-auto max-w-md space-y-4 px-4 py-8">
        <img src={STORE_ARTWORK} alt="Subzero Delivery" width={1186} height={280} className="mx-auto h-24 w-full max-w-sm object-contain" />
        {session ? (
          <div className="space-y-3 rounded-2xl border border-border bg-card p-5">
            <p className="text-sm text-muted-foreground">Você está logado.</p>
            <div className="flex flex-col gap-2">
              <Button onClick={() => navigate({ to: "/admin" })}>Ir para o painel</Button>
              <Button onClick={handleClaimAdmin} disabled={claiming} variant="outline">
                {claiming ? <Loader2 className="size-4 animate-spin" /> : "Tornar-me administrador (1ª vez)"}
              </Button>
              <Button onClick={handleSignOut} variant="ghost">Sair</Button>
            </div>
          </div>
        ) : (
          <Tabs defaultValue="login">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Entrar</TabsTrigger>
              <TabsTrigger value="signup">Criar conta</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-3 rounded-2xl border border-border bg-card p-5">
                <div className="space-y-1.5">
                  <Label>Email</Label>
                  <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Senha</Label>
                  <Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? <Loader2 className="size-4 animate-spin" /> : "Entrar"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="space-y-3 rounded-2xl border border-border bg-card p-5">
                <div className="space-y-1.5">
                  <Label>Email</Label>
                  <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Senha (mínimo 6 caracteres)</Label>
                  <Input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? <Loader2 className="size-4 animate-spin" /> : "Criar conta"}
                </Button>
                <p className="text-xs text-muted-foreground">
                  Após criar a conta e fazer login, toque em "Tornar-me administrador" para liberar o painel (só funciona se ainda não houver outro admin).
                </p>
              </form>
            </TabsContent>
          </Tabs>
        )}
      </main>
    </div>
  );
}
