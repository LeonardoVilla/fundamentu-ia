"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Provider = { id: string; label: string; description: string; color: string; model: string; connected: boolean; helpUrl: string };

const initialProviders: Provider[] = [
  { id: "deepseek", label: "DeepSeek", description: "Rápido e econômico para sínteses e classificação.", color: "#4f8df7", model: "deepseek-chat", connected: false, helpUrl: "https://platform.deepseek.com/api_keys" },
  { id: "openai", label: "OpenAI (ChatGPT)", description: "Modelos robustos para análise e geração de texto.", color: "#1f9b72", model: "gpt-4o-mini", connected: false, helpUrl: "https://platform.openai.com/api-keys" },
  { id: "gemini", label: "Google Gemini", description: "Boa capacidade multimodal e cota gratuita.", color: "#6b72e8", model: "gemini-2.5-flash", connected: false, helpUrl: "https://aistudio.google.com/app/apikey" },
  { id: "claude", label: "Claude", description: "Leitura cuidadosa de documentos extensos.", color: "#d47b4c", model: "claude-sonnet-4-5", connected: false, helpUrl: "https://platform.claude.com/settings/keys" },
];

export default function IaSettingsPage() {
  const [providers, setProviders] = useState(initialProviders);
  const [saved, setSaved] = useState<string | null>(null);
  const [keys, setKeys] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/ai-config")
      .then(async response => { const data = await response.json(); if (!response.ok) throw new Error(data.error ?? "Não foi possível carregar as configurações."); return data; })
      .then(data => {
        if (Array.isArray(data.providers)) {
          setProviders(current => data.providers.map((item: { provider: string; connected: boolean; enabled: boolean; model: string | null }) => {
            const base = current.find(provider => provider.id === item.provider) ?? current[0];
            return { ...base, id: item.provider, connected: item.connected && item.enabled, model: item.model ?? base.model };
          }));
        }
      })
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Não foi possível carregar as configurações."))
      .finally(() => setLoading(false));
  }, []);

  function persistSettings(next: Provider[]) {
    void fetch("/api/ai-config", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "saveSettings", settings: next.map((provider) => ({ provider: provider.id, enabled: provider.connected, model: provider.model })) }) });
  }

  function updateProvider(id: string, update: Partial<Provider>) {
    const next = providers.map(provider => provider.id === id ? { ...provider, ...update } : provider);
    setProviders(next);
    persistSettings(next);
    setSaved(null);
  }

  function saveKey(id: string) {
    if (!keys[id]?.trim()) return;
    setError(null);
    void fetch("/api/ai-config", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "saveCredential", provider: id, apiKey: keys[id] }) }).then(async response => {
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? "Não foi possível salvar a chave.");
      const next = providers.map(provider => provider.id === id ? { ...provider, connected: true } : provider);
      setProviders(next);
      persistSettings(next);
      setKeys(current => ({ ...current, [id]: "" }));
      setSaved(id);
      window.setTimeout(() => setSaved(null), 1800);
    }).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Não foi possível salvar a chave."));
  }

  function move(id: string, direction: -1 | 1) {
    const index = providers.findIndex(provider => provider.id === id);
    const target = index + direction;
    if (target < 0 || target >= providers.length) return;
    const next = [...providers];
    [next[index], next[target]] = [next[target], next[index]];
    setProviders(next);
    persistSettings(next);
    setSaved("order");
    window.setTimeout(() => setSaved(null), 1800);
  }

  return <main className="settings-page">
    <div className="settings-top"><div><Link href="/" className="back-link">← Voltar para análise</Link><span className="eyebrow">CONFIGURAÇÕES · AGENTES DE IA</span><h1>Gerenciamento de APIs</h1><p>Cadastre os provedores que seus agentes poderão usar no rastreio do RI.</p></div><div className="settings-actions"><Link href="/configuracoes/agentes" className="settings-badge">Gerenciar agentes</Link><span className="settings-badge">{loading ? "Carregando…" : "Área administrativa"}</span></div></div>

    {error && <p className="ri-error">{error}</p>}
    <section className="settings-section"><div className="settings-section-heading"><div><span className="section-kicker">ORQUESTRAÇÃO</span><h2>Ordem de uso das IAs</h2><p>Os agentes usam a primeira IA ativa que responder. Se houver erro, cota esgotada ou resposta inválida, passam para a próxima.</p></div><span className="fallback-pill">Fallback automático</span></div>
      <div className="provider-order">{providers.map((provider, index) => <div className={`provider-order-row ${provider.connected ? "" : "disabled"}`} key={provider.id}><span className="order-number">{provider.connected ? index + 1 : "–"}</span><span className="provider-dot" style={{ background: provider.color }} /><div className="provider-order-copy"><strong>{provider.label}</strong><span>{provider.connected ? "Chave cadastrada" : "Sem chave cadastrada — será pulado"}</span></div><button className="move-button" onClick={() => move(provider.id, -1)} disabled={index === 0} aria-label={`Subir ${provider.label}`}>↑</button><button className="move-button" onClick={() => move(provider.id, 1)} disabled={index === providers.length - 1} aria-label={`Descer ${provider.label}`}>↓</button><button className={`switch ${provider.connected ? "on" : ""}`} onClick={() => updateProvider(provider.id, { connected: !provider.connected })} role="switch" aria-checked={provider.connected}><i /></button></div>)}</div>
      {saved === "order" && <span className="saved-message">Ordem salva.</span>}
    </section>

    <section className="settings-section"><div className="settings-section-heading"><div><span className="section-kicker">CREDENCIAIS</span><h2>Chaves de API</h2><p>As chaves serão armazenadas cifradas no servidor e nunca serão exibidas novamente.</p></div><span className="security-label">▣ Protegido</span></div><div className="provider-cards">{providers.map(provider => <article className="api-card" key={provider.id}><div className="api-card-top"><div className="provider-brand" style={{ background: provider.color }}>{provider.label.slice(0, 1)}</div><div><h3>{provider.label}</h3><span className={provider.connected ? "connected" : "not-connected"}><i /> {provider.connected ? "Conectado" : "Não configurado"}</span></div><span className="masked-key">{provider.connected ? "••••••••" : ""}</span></div><p>{provider.description}</p><div className="api-input-row"><input type="password" value={keys[provider.id] ?? ""} onChange={event => setKeys(current => ({ ...current, [provider.id]: event.target.value }))} placeholder={provider.connected ? "Substituir chave de API…" : "Cole sua chave de API…"} aria-label={`Chave de API ${provider.label}`} /><button onClick={() => saveKey(provider.id)}>Salvar</button></div><div className="model-row"><label htmlFor={`model-${provider.id}`}>Modelo usado pelos agentes</label><select id={`model-${provider.id}`} value={provider.model} onChange={event => updateProvider(provider.id, { model: event.target.value })}><option>{provider.model}</option><option>Modelo padrão recomendado</option><option>Modelo econômico</option></select>{saved === provider.id && <span className="saved-message">salvo</span>}</div><a href={provider.helpUrl} target="_blank" rel="noreferrer" className="provider-help">Obter chave no painel do provedor ↗</a></article>)}</div></section>
    <div className="settings-note"><span>ⓘ</span><p>O rastreio do RI poderá usar provedores diferentes por agente no futuro. Esta ordem funciona como fallback global enquanto a configuração individual dos agentes não estiver definida.</p></div>
  </main>;
}
