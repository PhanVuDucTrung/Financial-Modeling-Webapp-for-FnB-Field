import type { ReactElement } from 'react'
import { describe, expect, it } from 'vitest'
import { renderToString } from 'react-dom/server'
import App from './App'
import { calculate } from './engine/model'
import { cafePreset } from './engine/presets'
import { NAV } from './nav'
import { InputPage } from './pages/InputPage'
import { RunScreen } from './pages/RunScreen'
import { Workspace } from './pages/Workspace'
import { Advisor } from './views/Advisor'
import { AdvisoryReport } from './views/AdvisoryReport'
import { Analysis, Sources } from './views/Analysis'
import { Finance } from './views/Finance'
import { Operations } from './views/Operations'
import { Summary } from './views/Overview'
import { BudgetMode, GoalMode } from './views/Planning'
import { SECTIONS, SectionBody } from './views/Sections'

const noop = () => {}
const tabsOf = (id: string) => NAV.find((n) => n.id === id)!.tabs.map((t) => t.id)

function all(inputs = structuredClone(cafePreset)): Record<string, ReactElement> {
  const results = calculate(inputs)
  const P = { inputs, results }
  const v: Record<string, ReactElement> = {
    summary: <Summary {...P} onOpen={noop} />, sources: <Sources />,
    report: <AdvisoryReport inputs={inputs} results={results} onClose={noop} />,
    budget: <BudgetMode inputs={inputs} setInputs={noop} budget={1.5e9} setBudget={noop} />,
    goalProfit: <GoalMode inputs={inputs} setInputs={noop} kind="profit" setKind={noop} value={80} setValue={noop} />,
    goalPayback: <GoalMode inputs={inputs} setInputs={noop} kind="payback" setKind={noop} value={24} setValue={noop} />,
    input: <InputPage inputs={inputs} setInputs={noop} results={results} health={null} onBrief={noop} onRun={noop} />,
    run: <RunScreen onBurst={noop} onGone={noop} />,
    workspace: <Workspace inputs={inputs} setInputs={noop} results={results} health={null} advice={null} setAdvice={noop}
      plan={{ budget: 1.5e9, setBudget: noop, goalKind: 'profit', setGoalKind: noop, goalValue: 80, setGoalValue: noop }} onEdit={noop} />,
  }
  for (const s of SECTIONS) v[`section:${s.key}`] = <SectionBody k={s.key} inputs={inputs} setInputs={noop} results={results} />
  for (const t of tabsOf('finance')) v[`finance:${t}`] = <Finance {...P} tab={t} />
  for (const t of tabsOf('ops')) v[`ops:${t}`] = <Operations {...P} tab={t} />
  for (const t of tabsOf('analysis')) v[`analysis:${t}`] = <Analysis {...P} tab={t} />
  v.ai = <Advisor {...P} health={null} advice={null} setAdvice={noop} setInputs={noop} />
  return v
}

describe('kết xuất giao diện', () => {
  it('mọi trang, mục và sub tab kết xuất được', () => {
    for (const [k, el] of Object.entries(all())) expect(renderToString(el).length, k).toBeGreaterThan(150)
  })

  it('không vỡ khi dự án lỗ, không hoàn vốn hoặc nhân công tính theo %', () => {
    const bad = structuredClone(cafePreset)
    bad.demand.aov = 30000
    bad.laborMode = 'percent'
    for (const [k, el] of Object.entries(all(bad))) expect(renderToString(el).length, k).toBeGreaterThan(150)
  })

  it('không dùng dấu gạch dài, chấm tròn hay chấm giữa trong nội dung hiển thị', () => {
    for (const [k, el] of Object.entries(all())) {
      const text = renderToString(el).replace(/<[^>]*>/g, ' ')
      for (const ch of ['—', '–', '·', '•', '−']) expect(text.includes(ch), `${k} chứa ${ch}`).toBe(false)
    }
  })

  it('app mở ở trang nhập giả định, đúng tên và ngôn ngữ', () => {
    const html = renderToString(<App />)
    for (const s of ['Financial Model', 'FOR ENTERPRISE', 'Run Agent Analysis', 'Mặt bằng', 'Vốn đầu tư', 'Break-even point']) expect(html, s).toContain(s)
    for (const s of ['Café', 'cà phê', 'Phán quyết', 'Đừng mở', 'Mở dự án', 'Xuất Excel', 'claude-sonnet']) expect(html, s).not.toContain(s)
  })

  it('khung kết quả có thanh trái, nút mở phân tích chi tiết và lời khuyên', () => {
    const html = renderToString(all()['workspace'])
    for (const s of ['Tổng quan', 'Trợ lý AI', 'Lời khuyên', 'Xem phân tích', 'Chỉnh thông số']) expect(html, s).toContain(s)
    expect(html).not.toContain('Phán quyết')
  })
})
