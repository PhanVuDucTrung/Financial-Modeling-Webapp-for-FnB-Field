import type { Inputs, Results } from '../engine/types'

export interface Health { ok: boolean; ai: boolean; provider?: string | null; model: string | null }
export interface Advice {
  source: 'ai' | 'fallback'; model: string | null; note?: string
  headline: string; strengths: string[]; risks: string[]; actions: string[]; caveat: string
}
export interface ParseResult {
  source: 'ai' | 'fallback'; model: string | null; note?: string
  intent: 'estimate' | 'budget' | 'goal_profit' | 'goal_payback'
  budget: number | null; goalValue: number | null
  patch: Record<string, number | string>
  summary: string; assumed: string[]; questions: string[]
}
export interface ChatResult {
  source: 'ai' | 'fallback'; reply: string
  whatIf: { label: string; patch: Record<string, number | string> } | null
}

async function req<T>(url: string, init?: RequestInit): Promise<T> {
  const r = await fetch(url, init)
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`)
  return r.json() as Promise<T>
}
const post = <T,>(url: string, body: unknown) =>
  req<T>(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })

export const api = {
  health: () => req<Health>('/api/health'),
  projects: () => req<{ name: string; updated: string }[]>('/api/projects'),
  load: (name: string) => req<Inputs>(`/api/projects/${encodeURIComponent(name)}`),
  save: (name: string, inputs: Inputs) =>
    req<{ saved: string }>(`/api/projects/${encodeURIComponent(name)}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(inputs),
    }),
  remove: (name: string) => req<{ deleted: string }>(`/api/projects/${encodeURIComponent(name)}`, { method: 'DELETE' }),
  advise: (summary: unknown) => post<Advice>('/api/ai/advise', { summary }),
  parse: (text: string) => post<ParseResult>('/api/ai/parse', { text }),
  chat: (question: string, context: unknown, history: { role: string; content: string }[]) =>
    post<ChatResult>('/api/ai/chat', { question, context, history }),
  async exportXlsx(inputs: Inputs, results: Results, advice: Advice | null) {
    const r = await fetch('/api/export', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ inputs, results, advice }),
    })
    if (!r.ok) throw new Error(await r.text())
    const blob = await r.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${inputs.meta.name.replace(/[^\w-]+/g, '-')}-bao-cao.xlsx`
    a.click()
    URL.revokeObjectURL(url)
  },
}
