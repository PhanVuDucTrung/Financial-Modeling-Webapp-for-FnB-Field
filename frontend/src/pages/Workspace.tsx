import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { AdviceSide } from '../components/Advice'
import { AiBackdrop } from '../components/AiBackdrop'
import { useSmoothScroll } from '../components/motion'
import { PlanBackdrop } from '../components/PlanBackdrop'
import { Icon } from '../components/ui'
import type { Inputs, Results } from '../engine/types'
import type { Advice, Health } from '../lib/api'
import { NAV, type SectionId } from '../nav'
import { Advisor } from '../views/Advisor'
import { AdvisoryReport } from '../views/AdvisoryReport'
import { Analysis } from '../views/Analysis'
import { Finance } from '../views/Finance'
import { Operations } from '../views/Operations'
import { Summary } from '../views/Overview'
import { BudgetMode, GoalMode, type GoalKind } from '../views/Planning'

export interface PlanState { budget: number; setBudget: (n: number) => void; goalKind: GoalKind; setGoalKind: (k: GoalKind) => void; goalValue: number; setGoalValue: (n: number) => void }

/** Không gian kết quả: một thanh điều hướng duy nhất bên trái (mục chính mở ra các tab con), nội dung ở giữa */
export function Workspace({ inputs, setInputs, results, health, advice, setAdvice, plan, onEdit }: {
  inputs: Inputs; setInputs: (f: (p: Inputs) => Inputs) => void; results: Results; health: Health | null
  advice: Advice | null; setAdvice: (a: Advice | null) => void; plan: PlanState; onEdit: () => void
}) {
  const [section, setSection] = useState<SectionId>('overview')
  const [tabs, setTabs] = useState<Record<string, string>>({})
  const [report, setReport] = useState(false)
  const mainRef = useRef<HTMLElement>(null)
  useSmoothScroll(mainRef)
  const nav = NAV.find((n) => n.id === section)!
  const tab = tabs[section] ?? nav.tabs[0].id
  const go = (s: SectionId, t?: string) => { setSection(s); if (t) setTabs((x) => ({ ...x, [s]: t })) }
  const P = { inputs, results }
  // đổi mục hoặc tab con thì cuộn về đầu trang
  // mỗi tab nhớ vị trí cuộn riêng: lần đầu mở thì ở đầu trang, quay lại tab cũ thì về đúng chỗ đã đứng
  const scrollPos = useRef<Record<string, number>>({})
  const tabKey = `${section}:${tab}`
  const tabKeyRef = useRef(tabKey)
  tabKeyRef.current = tabKey
  useEffect(() => {
    const el = mainRef.current
    if (!el) return
    const save = () => { scrollPos.current[tabKeyRef.current] = el.scrollTop }
    el.addEventListener('scroll', save, { passive: true })
    return () => el.removeEventListener('scroll', save)
  }, [])
  useLayoutEffect(() => {
    const el = mainRef.current
    if (!el) return
    el.scrollTop = scrollPos.current[tabKey] ?? 0
    el.dispatchEvent(new Event('sw-sync'))
  }, [tabKey])
  // mở báo cáo chi tiết thì ẩn nút đổi theme để không đè lên nút Đóng
  useEffect(() => {
    document.documentElement.classList.toggle('report-open', report)
    return () => document.documentElement.classList.remove('report-open')
  }, [report])
  const open = () => setReport(true)


  return (
    <div className="app-bg grid h-[calc(var(--vh)*100)] w-full overflow-hidden" style={{ gridTemplateColumns: '292px minmax(0,1fr)' }}>
      <aside className="flex min-h-0 flex-col p-4">
        <div data-sw="text" data-sw-logo className="w-max px-4 pb-6 pt-4 leading-none"><div className="serif text-[26px]">Financial Model</div><div className="mt-1 text-[10px] font-semibold tracking-[0.34em] text-accent">FOR ENTERPRISE</div></div>
        <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
          {NAV.map((n) => {
            const on = n.id === section
            return (
              <div key={n.id}>
                <button data-sw="rect" onClick={() => go(n.id)}
                  className={`group relative flex w-full items-center gap-4 rounded-[16px] px-4 py-3 text-left transition-all duration-300 ${on ? 'bg-[var(--nav-on)] text-ink shadow-[0_14px_30px_-16px_rgba(var(--sh),0.4)]' : 'text-muted hover:bg-[var(--nav-hover)] hover:text-ink'}`}>
                  <span className={`num text-[11.5px] font-bold transition-colors ${on ? 'text-accent' : 'text-dim'}`}>{n.no}</span>
                  <span className={`text-[14.5px] transition-transform duration-300 group-hover:translate-x-0.5 ${on ? 'font-bold' : 'font-medium'}`}>{n.label}</span>
                  <span className={`ml-auto h-1.5 w-1.5 rounded-full bg-accent shadow-[0_0_12px_#ff6d29] transition-all duration-300 ${on ? 'scale-100 opacity-100' : 'scale-0 opacity-0'}`} />
                </button>
                {/* các tab con mở ra ngay dưới mục chính đang chọn */}
                <div className="grid transition-all duration-500" style={{ gridTemplateRows: on && n.tabs.length > 1 ? '1fr' : '0fr' }}>
                  <div className="overflow-hidden">
                    <div className="ml-[34px] space-y-0.5 py-1.5">
                      {n.tabs.length > 1 && n.tabs.map((t) => (
                        <button key={t.id} onClick={() => go(n.id, t.id)}
                          className={`relative block w-full rounded-[10px] px-4 py-1.5 text-left text-[13.5px] transition ${tab === t.id ? 'font-bold text-accent' : 'text-dim hover:text-ink'}`}>
                          <span className={`absolute left-0 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-accent transition-all duration-300 ${tab === t.id ? 'scale-100 opacity-100' : 'scale-0 opacity-0'}`} />
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </nav>
        <div className="space-y-4 pt-3">
          <AdviceSide results={results} onOpen={open} />
          <button data-sw="rect" onClick={onEdit} className="flex items-center gap-2 px-3 text-[12.5px] text-dim transition hover:text-accent"><Icon name="back" size={15} /> Chỉnh thông số</button>
        </div>
      </aside>

      <div className="relative flex min-h-0 min-w-0 flex-col">
        {section === 'ai' && <AiBackdrop />}
        {section === 'plan' && <PlanBackdrop />}
        <header className="relative z-10 flex shrink-0 items-baseline gap-4 px-10 pb-2 pt-9">
          <h1 data-sw="text" className="serif text-[42px] leading-none">{nav.label}</h1>
          {nav.tabs.length > 1 && <span className="text-[14px] text-dim">{nav.tabs.find((t) => t.id === tab)?.label}</span>}
        </header>

        <main ref={mainRef} data-sw-scroll className="relative z-10 min-h-0 flex-1 overflow-y-auto px-10 pb-12 pt-4">
          <div key={`${section}:${tab}`} className="rise relative mx-auto max-w-[1440px]">
            {section === 'overview' && <Summary {...P} onOpen={open} />}
            {section === 'finance' && <Finance {...P} tab={tab} />}
            {section === 'ops' && <Operations {...P} tab={tab} />}
            {section === 'analysis' && <Analysis {...P} tab={tab} />}
            {section === 'plan' && (tab === 'goal'
              ? <GoalMode inputs={inputs} setInputs={setInputs} kind={plan.goalKind} setKind={plan.setGoalKind} value={plan.goalValue} setValue={plan.setGoalValue} />
              : <BudgetMode inputs={inputs} setInputs={setInputs} budget={plan.budget} setBudget={plan.setBudget} />)}
          </div>
          {/* Trợ lý AI luôn nằm trong cây để giữ hội thoại khi chuyển mục */}
          <div className={section === 'ai' ? 'rise relative mx-auto flex min-h-full max-w-[1100px] flex-col' : 'hidden'}>
            <Advisor {...P} health={health} advice={advice} setAdvice={setAdvice} setInputs={setInputs} />
          </div>
        </main>
      </div>

      {report && <AdvisoryReport inputs={inputs} results={results} onClose={() => setReport(false)} />}
    </div>
  )
}
