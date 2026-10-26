"use client";
import Link from "next/link";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return <main className="login-page"><div className="login-card"><div className="login-mark">F</div><span className="eyebrow">FUNDAMENTU.IA</span><h1>Não foi possível carregar esta área</h1><p>Ocorreu uma falha temporária. Você pode tentar novamente sem perder seus dados salvos.</p><button className="google-button" onClick={() => reset()}>Tentar novamente</button><Link className="back-link" href="/">Voltar para o dashboard</Link></div></main>;
}
