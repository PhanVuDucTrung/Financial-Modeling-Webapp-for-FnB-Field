import { money, num } from '../lib/format'

/** Chênh lệch có màu: xanh là tốt hơn, đỏ là kém hơn. `goodWhen` cho biết số tăng là tốt hay số giảm là tốt. */
export function Delta({ d, fmt, goodWhen = 'up', same = 'Giữ nguyên' }: { d: number | null; fmt: (x: number) => string; goodWhen?: 'up' | 'down'; same?: string }) {
  if (d == null || !isFinite(d)) return <span className="text-dim">n/a</span>
  if (Math.abs(d) < 1e-9) return <span className="text-dim">{same}</span>
  const good = goodWhen === 'up' ? d > 0 : d < 0
  return <span className={good ? 'text-good' : 'text-bad'}>{d > 0 ? '+' : '-'}{fmt(Math.abs(d))}</span>
}

export const dMoney = (a: number, b: number, goodWhen: 'up' | 'down' = 'up') => <Delta d={b - a} fmt={(x) => money(x)} goodWhen={goodWhen} />
export const dArea = (a: number, b: number) => <Delta d={b - a} fmt={(x) => `${num(x)} m²`} goodWhen="up" />
export const dPoint = (a: number | null, b: number | null) => <Delta d={a == null || b == null ? null : b - a} fmt={(x) => `${num(x * 100)} điểm %`} />
export const dMonths = (a: number | null, b: number | null) => {
  if (a == null && b == null) return <span className="text-dim">n/a</span>
  if (a == null) return <span className="text-good">Có thể hoàn vốn</span>
  if (b == null) return <span className="text-bad">Mất khả năng hoàn vốn</span>
  return <Delta d={b - a} fmt={(x) => `${num(x, 1)} tháng`} goodWhen="down" />
}
export const dLevel = (a: string, b: string, order: string[]) => {
  const d = order.indexOf(b) - order.indexOf(a)
  return d === 0 ? <span className="text-dim">Giữ nguyên</span> : <span className={d > 0 ? 'text-good' : 'text-bad'}>{d > 0 ? 'Tốt hơn' : 'Kém hơn'}</span>
}
export const LEVELS = ['dont', 'consider', 'open']
