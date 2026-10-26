"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Item = { id: number; ticker: string; assetType: string; createdAt: string };

export default function MonitoredPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [message, setMessage] = useState("");
  useEffect(() => { fetch("/api/watchlist").then(response => response.ok ? response.json() : null).then(data => { if (data) setItems(data.items); }); }, []);
  async function remove(ticker: string) { const response = await fetch(`/api/watchlist?ticker=${encodeURIComponent(ticker)}`, { method: "DELETE" }); if (response.ok) setItems(current => current.filter(item => item.ticker !== ticker)); else setMessage("Não foi possível remover o ativo."); }
  return <main className="settings-page"><div className="settings-top"><div><Link href="/" className="back-link">← Voltar para análise</Link><span className="eyebrow">FUNDAMENTU.IA · MONITORAMENTO</span><h1>Ativos monitorados</h1><p>Acompanhe os ativos que você deseja revisar pelo RI.</p></div><span className="settings-badge">{items.length} ativos</span></div><section className="portfolio-table">{items.length === 0 ? <div className="empty-agents">Nenhum ativo monitorado.<br /><span>Use o botão “Monitorar” na página de análise.</span></div> : <div className="table-scroll"><table><thead><tr><th>Ticker</th><th>Tipo</th><th>Adicionado em</th><th /></tr></thead><tbody>{items.map(item => <tr key={item.ticker}><td><strong>{item.ticker}</strong></td><td>{item.assetType}</td><td>{new Date(item.createdAt).toLocaleDateString("pt-BR")}</td><td><Link className="asset-action" href={`/?ticker=${encodeURIComponent(item.ticker)}`}>Analisar</Link> <button className="text-button" onClick={() => void remove(item.ticker)}>Remover</button></td></tr>)}</tbody></table></div>}{message && <p className="import-message">{message}</p>}</section></main>;
}
