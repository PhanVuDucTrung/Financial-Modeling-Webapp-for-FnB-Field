import { uiScale } from '../scale'
import { useState, type MouseEvent } from 'react'
import { api, type Health, type ParseResult } from '../lib/api'
import { describePatch } from '../lib/labels'
import { Icon } from './ui'

/** Ô mô tả dự án: AI đọc rồi điền các giả định tương ứng. Kính lỏng phản ứng theo con trỏ. */
export function Brief({ onResult }: { health?: Health | null; onResult: (r: ParseResult) => void }) {
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [res, setRes] = useState<ParseResult | null>(null)
  const [err, setErr] = useState('')
  const submit = async () => {
    if (text.trim().length < 3 || busy) return
    setBusy(true); setErr('')
    try { const r = await api.parse(text); setRes(r); onResult(r) }
    catch { setErr("Bản Demo hiện không hỗ trợ tính năng này") }
    finally { setBusy(false) }
  }
  const track = (e: MouseEvent<HTMLDivElement>) => {
    const b = e.currentTarget.getBoundingClientRect()
    e.currentTarget.style.setProperty('--mx', `${(e.clientX - b.left) / uiScale()}px`)
    e.currentTarget.style.setProperty('--my', `${(e.clientY - b.top) / uiScale()}px`)
  }
  return (
    <div>
      <div className="glass flex items-center gap-3 p-3" onMouseMove={track}>
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={2}
          placeholder="Mô tả dự án của bạn, AI sẽ điền giả định tương ứng."
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void submit() } }}
          className="relative flex-1 resize-none bg-transparent px-4 py-2.5 text-[15.5px] font-medium outline-none placeholder:text-dim" />
        <button onClick={() => void submit()} disabled={busy} aria-label="Điền giả định" title="Điền giả định"
          className="btn-accent relative grid h-12 w-12 shrink-0 place-items-center rounded-[8px] disabled:opacity-60">
          <span className={busy ? 'animate-spin' : ''}><Icon name="spark" size={20} /></span>
        </button>
      </div>
      {err && <p className="mt-3 text-[12.5px] text-bad">{err}</p>}
      {res && (
        <div className="fade-in mt-4 border-l-2 border-accent/70 pl-4 text-[13.5px]">
          <p className="font-semibold">{res.summary}</p>
          {Object.keys(res.patch).length > 0 && <p className="mt-1.5 text-[12.5px] text-dim">Đã điền: {describePatch(res.patch)}</p>}
          {res.assumed.length > 0 && <p className="mt-1 text-[12.5px] text-dim">Giữ mặc định: {res.assumed.join(', ')}</p>}
          {res.questions.map((q) => <p key={q} className="mt-1 text-[12.5px] font-semibold text-warn">Cần xác nhận: {q}</p>)}
        </div>
      )}
    </div>
  )
}
