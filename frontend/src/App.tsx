import { uiScale } from './scale'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { calculate } from './engine/model'
import { cafePreset } from './engine/presets'
import type { Inputs } from './engine/types'
import { api, type Advice, type Health, type ParseResult } from './lib/api'
import { applyPatch } from './lib/path'
import { Aurora } from './components/motion'
import { applyTheme, loadTheme, ThemeToggle, type Theme } from './components/ThemeToggle'
import { InputPage } from './pages/InputPage'
import { SwarmBuild } from './components/SwarmBuild'
import { RunScreen } from './pages/RunScreen'
import { Workspace } from './pages/Workspace'
import type { GoalKind } from './views/Planning'

const LS_KEY = 'fme.inputs.v4'
function loadInitial(): Inputs {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw) {
      const p = JSON.parse(raw) as Inputs
      // Bỏ qua dữ liệu cũ thiếu trường mới
      if (p?.capex && 'depositMonths' in p.capex && p.site && 'avgStayMinutes' in p.site && 'peakHours' in p.site && p.staff) return p
    }
  } catch { /* trình duyệt chặn storage */ }
  return structuredClone(cafePreset)
}

type Phase = 'input' | 'running' | 'building' | 'results'

// áp chế độ sáng tối đã lưu ngay khi tải, trước lần vẽ đầu tiên (tránh nháy nền sáng)
const initialTheme = loadTheme()
if (typeof document !== 'undefined') applyTheme(initialTheme)

const firstPhaseInput = typeof location === 'undefined' || new URLSearchParams(location.search).get('phase') !== 'results'

export default function App() {
  const [theme, setThemeState] = useState<Theme>(initialTheme)
  const setTheme = useCallback((t: Theme) => {
    const root = document.documentElement
    root.classList.add('theme-fade')
    applyTheme(t)
    setThemeState(t)
    window.setTimeout(() => root.classList.remove('theme-fade'), 500)
  }, [])
  const [inputs, setInputsRaw] = useState<Inputs>(loadInitial)
  // ?phase=results mở thẳng màn hình kết quả (dùng khi kiểm thử giao diện)
  const [phase, setPhase] = useState<Phase>(() => (typeof location !== 'undefined' && new URLSearchParams(location.search).get('phase') === 'results' ? 'results' : 'input'))
  const [budget, setBudget] = useState(1_500_000_000)
  const [goalKind, setGoalKind] = useState<GoalKind>('profit')
  const [goalValue, setGoalValue] = useState(80)
  const [health, setHealth] = useState<Health | null>(null)
  const [advice, setAdvice] = useState<Advice | null>(null)
  const [showRun, setShowRun] = useState(false)

  const setInputs = useCallback((f: (p: Inputs) => Inputs) => { setInputsRaw(f); setAdvice(null) }, [])
  const results = useMemo(() => calculate(inputs), [inputs])

  // thẻ lắc theo con trỏ như khối 3D
  useEffect(() => {
    let cur: HTMLElement | null = null
    const reset = (el: HTMLElement | null) => { if (el) { el.style.setProperty('--rx', '0deg'); el.style.setProperty('--ry', '0deg') } }
    const move = (e: PointerEvent) => {
      const el = (e.target as HTMLElement | null)?.closest?.('.float .glass, .summary-card') as HTMLElement | null
      if (cur && cur !== el) reset(cur)
      if (el && el !== cur && !el.classList.contains('summary-card')) { el.classList.remove('wob'); void el.offsetWidth; el.classList.add('wob'); setTimeout(() => el.classList.remove('wob'), 950) }
      cur = el
      if (!el) return
      const b = el.getBoundingClientRect()
      const x = (e.clientX - b.left) / b.width - 0.5, y = (e.clientY - b.top) / b.height - 0.5
      const k = Math.min(1, 520 / Math.max(b.width, 200))
      el.style.setProperty('--ry', `${(x * 16 * k).toFixed(2)}deg`)
      el.style.setProperty('--rx', `${(-y * 14 * k).toFixed(2)}deg`)
      el.style.setProperty('--mx', `${(e.clientX - b.left) / uiScale()}px`)
      el.style.setProperty('--my', `${(e.clientY - b.top) / uiScale()}px`)
    }
    const out = () => { reset(cur); cur = null }
    document.addEventListener('pointermove', move)
    document.addEventListener('pointerleave', out)
    return () => { document.removeEventListener('pointermove', move); document.removeEventListener('pointerleave', out) }
  }, [])
  useEffect(() => { try { localStorage.setItem(LS_KEY, JSON.stringify(inputs)) } catch { /* bỏ qua */ } }, [inputs])
  useEffect(() => { api.health().then(setHealth).catch(() => setHealth({ ok: false, ai: false, model: null })) }, [])

  /** Áp kết quả đọc mô tả: điền giả định, và nhớ vốn hoặc mục tiêu nếu người dùng nêu */
  const applyBrief = (r: ParseResult) => {
    setInputs((p) => applyPatch(p, r.patch))
    if (r.intent === 'budget' && r.budget) setBudget(r.budget)
    if (r.intent === 'goal_profit' && r.goalValue) { setGoalKind('profit'); setGoalValue(Math.round(r.goalValue / 1e6)) }
    if (r.intent === 'goal_payback' && r.goalValue) { setGoalKind('payback'); setGoalValue(Math.round(r.goalValue)) }
  }

  return (
    <>
      <Aurora />
      <ThemeToggle theme={theme} onChange={setTheme} delayMs={firstPhaseInput ? 3300 : 0} />
      {phase === 'input' && <InputPage inputs={inputs} setInputs={setInputs} results={results} health={health} onBrief={applyBrief} onRun={() => { setShowRun(true); setPhase('running') }} />}
      {phase !== 'input' && (
        <Workspace inputs={inputs} setInputs={setInputs} results={results} health={health} advice={advice} setAdvice={setAdvice}
          plan={{ budget, setBudget, goalKind, setGoalKind, goalValue, setGoalValue }} onEdit={() => setPhase('input')} />
      )}
      {showRun && <RunScreen onBurst={() => setPhase('building')} onGone={() => setShowRun(false)} />}
      {phase === 'building' && <SwarmBuild onDone={() => setPhase('results')} />}
    </>
  )
}
