import { Rich } from '../lib/rich'
import { uiScale } from '../scale'
import { useEffect, useRef, useState, type MouseEvent } from 'react'
import { AiStage, type StagePhase } from '../components/AiStage'
import { Button, Icon, Table } from '../components/ui'
import { calculate } from '../engine/model'
import type { Inputs, Results } from '../engine/types'
import { api, type Advice, type ChatResult, type Health } from '../lib/api'
import { money, months, pct } from '../lib/format'
import { applyPatch } from '../lib/path'
import { buildSummary } from '../lib/summary'

interface Msg { role: 'user' | 'assistant'; content: string; compare?: { label: string; patch: Record<string, number | string>; after: Results } }

/** Trợ lý AI: một khung hội thoại duy nhất cho nhận xét tổng quan và câu hỏi "nếu thì sao". Việc điền giả định nằm ở trang Thông số. */
export function Advisor({ inputs, results, advice, setAdvice, setInputs }: {
  inputs: Inputs; results: Results; health: Health | null
  advice: Advice | null; setAdvice: (a: Advice | null) => void
  setInputs: (f: (p: Inputs) => Inputs) => void
}) {
  const [busy, setBusy] = useState('')
  const [err, setErr] = useState('')
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [q, setQ] = useState('')
  const end = useRef<HTMLDivElement>(null)
  // hoạt cảnh hạt chỉ chạy trong lần chat đầu tiên: idle, rồi think khi bắt đầu hỏi, rồi leave khi có câu trả lời, rồi gone (không bao giờ quay lại)
  const [stage, setStage] = useState<StagePhase | 'gone'>('idle')
  const [stageLabel, setStageLabel] = useState('Đang phân tích mô hình')
  const thinkAt = useRef(0)
  const beginThink = (label: string) => { if (stage !== 'idle') return; thinkAt.current = performance.now(); setStageLabel(label); setStage('think') }
  useEffect(() => {
    if (stage !== 'think' || busy) return
    const wait = Math.max(0, 2000 - (performance.now() - thinkAt.current))
    const t = setTimeout(() => setStage('leave'), wait)
    return () => clearTimeout(t)
  }, [stage, busy])
  useEffect(() => { if (msgs.length || advice) end.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }) }, [msgs.length, busy, advice])

  const run = async (key: string, f: () => Promise<void>) => {
    setBusy(key); setErr('')
    try { await f() } catch { setErr("Bản Demo hiện không hỗ trợ tính năng này") } finally { setBusy('') }
  }
  const analyse = () => { beginThink('Đang nhận xét kết quả'); return run('advice', async () => setAdvice(await api.advise(buildSummary(inputs, results)))) }
  const ask = (question: string) => {
    if (!question.trim() || busy) return
    beginThink('Đang phân tích mô hình')
    const history = msgs.map((m) => ({ role: m.role, content: m.content }))
    setMsgs((m) => [...m, { role: 'user', content: question }]); setQ('')
    void run('chat', async () => {
      const r: ChatResult = await api.chat(question, buildSummary(inputs, results), history)
      const msg: Msg = { role: 'assistant', content: r.reply }
      if (r.whatIf) msg.compare = { label: r.whatIf.label, patch: r.whatIf.patch, after: calculate(applyPatch(inputs, r.whatIf.patch)) }
      setMsgs((m) => [...m, msg])
    })
  }
  const track = (e: MouseEvent<HTMLDivElement>) => {
    const b = e.currentTarget.getBoundingClientRect()
    e.currentTarget.style.setProperty('--mx', `${(e.clientX - b.left) / uiScale()}px`)
    e.currentTarget.style.setProperty('--my', `${(e.clientY - b.top) / uiScale()}px`)
  }

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <div className="relative flex-1" style={{ minHeight: 440 }}>
        {stage !== 'gone' && (
          <div className="absolute inset-0">
            <AiStage phase={stage} label={stageLabel} onGone={() => setStage('gone')} />
            <div className={`pointer-events-none absolute inset-0 grid place-items-center text-center transition-opacity duration-500 ${stage === 'idle' ? 'opacity-100' : 'opacity-0'}`}>
              <div>
                <div className="serif text-[34px] leading-tight">Ask anything <span className="italic">about your model</span></div>
              </div>
            </div>
          </div>
        )}
        <div className="relative space-y-6 pt-2">
      {err && <p className="rounded-[6px] bg-bad/10 px-4 py-3 text-[13.5px] text-bad">{err}</p>}

        {advice && (
          <div className="fade-in panel space-y-7 p-7">
            <p className="text-[24px] font-bold leading-snug tracking-tight">{advice.headline}</p>
            <div className="stagger grid gap-8 md:grid-cols-3">
              {([['Điểm mạnh', advice.strengths, 'text-good'], ['Rủi ro', advice.risks, 'text-bad'], ['Nên làm', advice.actions, 'text-accent']] as const).map(([t, items, c]) => (
                <div key={t}>
                  <div className={`flex items-center gap-2 text-[14px] font-bold ${c}`}><i className="h-1.5 w-1.5 rounded-full bg-current" />{t}</div>
                  <ul className="mt-3 space-y-3 text-[14px] leading-relaxed text-muted">{items.map((x) => <li key={x}><Rich>{x}</Rich></li>)}</ul>
                </div>
              ))}
            </div>
            {advice.caveat && <p className="text-[12.5px] text-dim">{advice.caveat}</p>}
          </div>
        )}
        {msgs.map((m, i) => (
          <div key={i} className={`fade-in ${m.role === 'user' ? 'text-right' : ''}`}>
            <div className={`inline-block max-w-[85%] px-5 py-3 text-left text-[15px] leading-relaxed ${m.role === 'user' ? 'rounded-[18px] bg-ink text-bg' : 'rounded-[18px] bg-[var(--msg-bot)]'}`}>{m.role === 'user' ? m.content : <Rich>{m.content}</Rich>}</div>
            {m.compare && (
              <div className="panel mt-4 p-6">
                <div className="mb-4 flex items-center justify-between gap-4 text-[15px]"><span className="font-bold">{m.compare.label}</span><Button onClick={() => setInputs((p) => applyPatch(p, m.compare!.patch))}>Áp dụng vào mô hình</Button></div>
                <Table strongLast head={['', 'Hiện tại', 'Kịch bản', 'Chênh lệch']} rows={[
                  { cells: ['Dòng tiền hoạt động mỗi tháng', money(results.monthly.cm), money(m.compare.after.monthly.cm), delta(m.compare.after.monthly.cm - results.monthly.cm, money)] },
                  { cells: ['Hoàn vốn', months(results.paybackCumulative), months(m.compare.after.paybackCumulative), deltaMonths(results.paybackCumulative, m.compare.after.paybackCumulative)] },
                  { cells: ['IRR mỗi năm', pct(results.irr), pct(m.compare.after.irr), results.irr != null && m.compare.after.irr != null ? delta(m.compare.after.irr - results.irr, (x) => `${(x * 100).toFixed(0)} điểm %`) : 'n/a'] },
                  { cells: ['Lời khuyên', results.verdict.label, m.compare.after.verdict.label, results.verdict.level === m.compare.after.verdict.level ? 'Giữ nguyên' : 'Thay đổi'] },
                ]} />
              </div>
            )}
          </div>
        ))}
        {busy && stage === 'gone' && <p className="shimmer inline-block text-[14px] font-semibold">Đang tính</p>}
        <div ref={end} style={{ scrollMarginBottom: 170 }} />
        </div>
      </div>

      <div className="sticky bottom-0 z-20 -mx-4 px-4 pb-8 pt-6">
        <div className="glass flex items-center gap-3 p-3" onMouseMove={track}>
          <textarea value={q} onChange={(e) => setQ(e.target.value)} rows={2}
            placeholder="Đặt câu hỏi dạng nếu thì sao, ví dụ: tăng giá thuê 20%, giảm AOV 10%."
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ask(q) } }}
            className="relative flex-1 resize-none bg-transparent px-4 py-2.5 text-[15.5px] font-medium outline-none placeholder:text-dim" />
          <button onClick={() => ask(q)} disabled={busy === 'chat'} aria-label="Gửi" title="Gửi"
            className="btn-accent relative grid h-12 w-12 shrink-0 place-items-center rounded-[8px] disabled:opacity-60"><Icon name="send" size={20} /></button>
        </div>
        <div className="mt-3 flex items-center gap-5 pl-1">
          <button onClick={() => void analyse()} disabled={busy === 'advice'} className="link-arrow text-[14px] disabled:opacity-50">
            <Icon name="spark" size={17} /> {busy === 'advice' ? 'Đang nhận xét' : advice ? 'Nhận xét lại kết quả' : 'Nhận xét kết quả hiện tại'}
          </button>
          <span className="text-[12.5px] text-dim">AI đọc số do mô hình tính, không tự tính lại.</span>
        </div>
      </div>
    </div>
  )
}

const delta = (d: number, f: (x: number) => string) => <span className={d > 0 ? 'text-good' : d < 0 ? 'text-bad' : ''}>{d > 0 ? '+' : d < 0 ? '-' : ''}{f(Math.abs(d))}</span>
const deltaMonths = (a: number | null, b: number | null) => {
  if (a == null || b == null) return a == null && b == null ? 'n/a' : b == null ? 'Mất khả năng hoàn vốn' : 'Có thể hoàn vốn'
  const d = b - a
  return <span className={d < 0 ? 'text-good' : d > 0 ? 'text-bad' : ''}>{d < 0 ? 'Nhanh hơn ' : d > 0 ? 'Chậm hơn ' : 'Giữ nguyên'}{d === 0 ? '' : `${Math.abs(d).toFixed(1)} tháng`}</span>
}
