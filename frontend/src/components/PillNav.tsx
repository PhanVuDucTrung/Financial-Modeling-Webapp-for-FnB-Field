import { useEffect, useLayoutEffect, useRef, useState } from 'react'

/**
 * Menu viên thuốc kiểu kính lỏng (theo mẫu): mục đang chọn là một mảng kính mờ có bóng xám nhẹ ở mép trên và mép dưới,
 * trượt mượt sang mục mới và giãn ra một chút khi di chuyển. Chữ mục chọn in đậm.
 */
export function PillNav({ items, active, onSelect }: { items: { key: string; label: string }[]; active: string; onSelect: (k: string) => void }) {
  const refs = useRef<Record<string, HTMLButtonElement | null>>({})
  const [box, setBox] = useState({ left: 0, width: 0, ready: false })
  const measure = () => {
    const el = refs.current[active]
    if (!el) return
    setBox((b) => (b.ready && b.left === el.offsetLeft && b.width === el.offsetWidth ? b : { left: el.offsetLeft, width: el.offsetWidth, ready: true }))
  }
  useLayoutEffect(measure, [active])
  useEffect(() => {
    window.addEventListener('resize', measure)
    void document.fonts?.ready.then(measure)
    return () => window.removeEventListener('resize', measure)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active])
  return (
    <div className="pill-nav">
      <i className="hl" style={{ left: box.left, width: box.width, opacity: box.ready ? 1 : 0 }} />
      {items.map((it) => (
        <button key={it.key} ref={(el) => { refs.current[it.key] = el }} onClick={() => onSelect(it.key)} className={`pill-item ${active === it.key ? 'on' : ''}`}>
          <span data-t={it.label}>{it.label}</span>
        </button>
      ))}
    </div>
  )
}
