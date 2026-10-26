"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

type Agent = { id: number; name: string; role: string; provider: string; prompt: string; enabled: boolean };

const emptyForm = { name: "", role: "", provider: "openai", prompt: "" };

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [message, setMessage] = useState("");

  async function load() {
    const response = await fetch("/api/ri-agents");
    if (response.ok) setAgents((await response.json()).agents);
  }
  useEffect(() => {
    let active = true;
    fetch("/api/ri-agents").then(response => response.ok ? response.json() : null).then(data => {
      if (active && data) setAgents(data.agents);
    });
    return () => { active = false; };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const response = await fetch("/api/ri-agents", { method: editingId ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(editingId ? { ...form, id: editingId } : form) });
    if (!response.ok) { setMessage((await response.json()).error ?? "Não foi possível salvar."); return; }
    setForm(emptyForm); setEditingId(null); setMessage("Agente salvo."); await load();
    window.setTimeout(() => setMessage(""), 1800);
  }

  function edit(agent: Agent) { setEditingId(agent.id); setForm({ name: agent.name, role: agent.role, provider: agent.provider, prompt: agent.prompt }); window.scrollTo({ top: 0, behavior: "smooth" }); }
  async function remove(id: number) { if (!window.confirm("Remover este agente?")) return; await fetch("/api/ri-agents", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) }); await load(); }
  async function toggle(agent: Agent) { await fetch("/api/ri-agents", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...agent, enabled: !agent.enabled }) }); await load(); }

  return <main className="settings-page"><div className="settings-top"><div><Link href="/configuracoes/ia" className="back-link">← Configurações de IA</Link><span className="eyebrow">CONFIGURAÇÕES · ORQUESTRAÇÃO</span><h1>Agentes do RI</h1><p>Defina quem coleta, interpreta e consolida as informações de Relações com Investidores.</p></div><span className="settings-badge">{agents.length} agentes</span></div>
    <section className="agent-layout"><form className="agent-form settings-section" onSubmit={submit}><div className="settings-section-heading"><div><span className="section-kicker">{editingId ? "EDITAR AGENTE" : "NOVO AGENTE"}</span><h2>{editingId ? "Atualizar configuração" : "Adicionar agente"}</h2></div></div><label>Nome<input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Ex.: Analista de resultados" /></label><label>Função no fluxo<input required value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} placeholder="Ex.: Interpretar ITR e DFP" /></label><label>Provedor<select value={form.provider} onChange={e => setForm({ ...form, provider: e.target.value })}><option value="openai">OpenAI</option><option value="deepseek">DeepSeek</option><option value="gemini">Google Gemini</option><option value="claude">Claude</option></select></label><label>Instruções do agente<textarea value={form.prompt} onChange={e => setForm({ ...form, prompt: e.target.value })} placeholder="Descreva como este agente deve analisar os dados..." rows={6} /></label><div className="agent-form-actions"><button type="submit">{editingId ? "Salvar alterações" : "Criar agente"}</button>{editingId && <button type="button" className="cancel-button" onClick={() => { setEditingId(null); setForm(emptyForm); }}>Cancelar</button>}</div>{message && <span className="saved-message">{message}</span>}</form><section className="agent-list settings-section"><div className="settings-section-heading"><div><span className="section-kicker">PIPELINE DO RI</span><h2>Agentes cadastrados</h2></div></div>{agents.length === 0 ? <div className="empty-agents">Nenhum agente configurado ainda.<br /><span>Crie o primeiro agente para montar o pipeline.</span></div> : agents.map(agent => <article className={`agent-card ${agent.enabled ? "" : "disabled"}`} key={agent.id}><div className="agent-card-top"><span className="agent-number">{agent.id}</span><div><h3>{agent.name}</h3><span>{agent.role}</span></div><button className={`switch ${agent.enabled ? "on" : ""}`} onClick={() => void toggle(agent)} role="switch" aria-checked={agent.enabled}><i /></button></div><div className="agent-meta"><span>{agent.provider}</span><span>{agent.prompt ? "Prompt personalizado" : "Prompt padrão"}</span></div><div className="agent-actions"><button onClick={() => edit(agent)}>Editar</button><button onClick={() => void remove(agent.id)}>Remover</button></div></article>)}</section></section>
  </main>;
}
