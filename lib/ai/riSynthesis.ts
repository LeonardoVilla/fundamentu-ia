import { db } from "@/lib/db/client";
import { aiCredentials, aiProviderOrder, riAgents } from "@/lib/db/schema";
import { decryptSecret } from "./secrets";

type Provider = "openai" | "deepseek" | "gemini" | "claude";
type Result = { summary: string; score: number | null; provider: string; runs: Array<{ agentName: string; role: string; output: string; status: "completed" | "failed" }> };

const defaults: Record<Provider, string> = { openai: "gpt-4o-mini", deepseek: "deepseek-chat", gemini: "gemini-2.5-flash", claude: "claude-sonnet-4-5" };

function parseResult(raw: string, provider: string, runs: Result["runs"]): Result {
  const scoreMatch = raw.match(/(?:score|pontuação|nota)\D{0,15}(\d{1,3})/i);
  const score = scoreMatch ? Math.max(0, Math.min(100, Number(scoreMatch[1]))) : null;
  return { summary: raw.trim(), score, provider, runs };
}

async function complete(provider: Provider, key: string, model: string, prompt: string): Promise<string> {
  const signal = AbortSignal.timeout(15000);
  if (provider === "claude") {
    const response = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "Content-Type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" }, body: JSON.stringify({ model, max_tokens: 1000, messages: [{ role: "user", content: prompt }] }), signal });
    if (!response.ok) throw new Error(`Claude HTTP ${response.status}`);
    const data = await response.json();
    return data?.content?.[0]?.text ?? "";
  }
  if (provider === "gemini") {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }), signal });
    if (!response.ok) throw new Error(`Gemini HTTP ${response.status}`);
    const data = await response.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  }
  const endpoint = provider === "openai" ? "https://api.openai.com/v1/chat/completions" : "https://api.deepseek.com/chat/completions";
  const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` }, body: JSON.stringify({ model, messages: [{ role: "user", content: prompt }] }), signal });
  if (!response.ok) throw new Error(`${provider} HTTP ${response.status}`);
  const data = await response.json();
  return data?.choices?.[0]?.message?.content ?? "";
}

export async function synthesizeRi(input: { ticker: string; assetType: string; method: string; sourceText: string }): Promise<Result | null> {
  const [credentials, orderRows, configuredAgents] = await Promise.all([db.select().from(aiCredentials), db.select().from(aiProviderOrder), db.select().from(riAgents)]);
  const credentialMap = new Map(credentials.map((item) => [item.provider as Provider, item]));
  const order = orderRows.length ? orderRows.sort((a, b) => a.position - b.position).map((item) => item.provider as Provider) : ["deepseek", "openai", "gemini", "claude"] as Provider[];
  const activeAgents = configuredAgents.filter((agent) => agent.enabled);
  const agentInstructions = activeAgents.length
    ? activeAgents.map((agent) => `Agente ${agent.name} — função: ${agent.role}. Instruções: ${agent.prompt || "Use uma leitura crítica e cite apenas evidências encontradas."}`).join("\n")
    : "Agente padrão — faça uma leitura geral de fundamentos, riscos e sinais de convergência.";
  const prompt = `Você coordena o pipeline de agentes fundamentalistas do fundamentu.ia. Aplique prioritariamente o método ${input.method}. Use as funções abaixo como perspectivas complementares, mas produza uma única resposta final. Analise exclusivamente o conteúdo público coletado do RI. Não invente números. Responda em português com: (1) resumo executivo em até 5 frases, (2) sinais positivos, (3) pontos de atenção, (4) score de aderência ao método de 0 a 100 escrito como "Score: N". Ativo: ${input.ticker} (${input.assetType}).\n\nAgentes ativos:\n${agentInstructions}\n\nConteúdo do RI:\n${input.sourceText.slice(0, 10000)}`;

  for (const provider of order) {
    const credential = credentialMap.get(provider);
    const key = credential?.apiKey ? decryptSecret(credential.apiKey) : provider === "claude" ? process.env.ANTHROPIC_API_KEY : undefined;
    if (!key || credential?.enabled === false) continue;
    try {
      const raw = await complete(provider, key, credential?.model || defaults[provider], prompt);
      if (raw.trim()) return parseResult(raw, provider, [{ agentName: "Coordenador de agentes", role: activeAgents.length ? activeAgents.map((agent) => agent.role).join("; ") : "Síntese fundamentalista geral", output: raw.trim(), status: "completed" }]);
    } catch { /* tenta o próximo provedor configurado */ }
  }
  return null;
}
