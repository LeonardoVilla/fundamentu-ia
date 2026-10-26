import Link from "next/link";

export default function NotFound() {
  return <main className="login-page"><div className="login-card"><div className="login-mark">F</div><span className="eyebrow">FUNDAMENTU.IA</span><h1>Página não encontrada</h1><p>O endereço acessado não existe ou foi movido.</p><Link className="google-button" href="/">Voltar para o dashboard</Link></div></main>;
}
