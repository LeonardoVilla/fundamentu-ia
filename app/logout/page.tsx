import Link from "next/link";
import { signOut } from "@/lib/auth";

export default function LogoutPage() {
  return <main className="login-page"><div className="login-card"><div className="login-mark">F</div><span className="eyebrow">FUNDAMENTU.IA</span><h1>Sair da conta?</h1><p>Você poderá entrar novamente usando sua conta Google.</p><form action={async () => { "use server"; await signOut({ redirectTo: "/login" }); }}><button className="google-button" type="submit">Sair com segurança</button></form><Link className="back-link" href="/">Cancelar</Link></div></main>;
}
