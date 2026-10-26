import { redirect } from "next/navigation";
import { auth, signIn } from "@/lib/auth";
import { Suspense } from "react";

export default function LoginPage() {
  return <Suspense fallback={<main className="login-page"><div className="login-card">Carregando…</div></main>}><LoginContent /></Suspense>;
}

async function LoginContent() {
  const session = await auth();
  if (session?.user) redirect("/");

  return <main className="login-page"><div className="login-card"><div className="login-mark">F</div><span className="eyebrow">FUNDAMENTU.IA</span><h1>Entre para analisar seus ativos</h1><p>Use sua conta Google para acessar sua carteira e as configurações dos agentes de IA.</p><form action={async () => { "use server"; await signIn("google", { redirectTo: "/" }); }}><button className="google-button" type="submit"><span>G</span> Entrar com Google</button></form><small>Seus dados e credenciais de IA ficam protegidos no ambiente do sistema.</small></div></main>;
}
