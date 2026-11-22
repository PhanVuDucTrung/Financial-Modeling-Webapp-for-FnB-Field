import { useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { findTerm } from '../lib/glossary'
import { uiScale } from '../scale'

/** Dấu hỏi chìm: mờ nhạt cho đến khi rê chuột vào vùng quanh nó thì rõ lên và bung lời giải thích */
export function Hint({ text }: { text: string }) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null)
  return (
    <span className="hint relative ml-1 inline-flex h-[15px] w-[15px] shrink-0 cursor-help items-center justify-center rounded-full align-middle text-[9.5px] font-bold leading-none before:absolute before:-inset-2 before:content-['']"
      onPointerEnter={(e) => { const r = e.currentTarget.getBoundingClientRect(), s = uiScale(); setPos({ x: (r.left + r.width / 2) / s, y: r.top / s }) }}
      onPointerLeave={() => setPos(null)}>
      ?
      {pos && createPortal(
        <div role="tooltip" className="hint-tip pointer-events-none fixed z-[90] w-[250px] rounded-[14px] px-4 py-3 text-left text-[12.5px] font-normal normal-case leading-relaxed tracking-normal text-ink"
          style={{ left: Math.max(130, Math.min(pos.x, window.innerWidth / uiScale() - 130)), top: pos.y - 10, transform: 'translate(-50%,-100%)' }}>
          {text}
        </div>, document.body)}
    </span>
  )
}

/** Gắn dấu hỏi giải thích ở cuối chuỗi nếu trong chuỗi có thuật ngữ. Đặt ở cuối câu để không chen ngang chữ. */
export function hinted(text: string): ReactNode {
  const t = findTerm(text)
  if (!t) return text
  return <>{text}<Hint text={t.hint} /></>
}
