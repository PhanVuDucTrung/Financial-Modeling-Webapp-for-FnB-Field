import type { ComponentProps, ReactNode } from 'react'
import { Field, Icon, Segmented, Table } from '../components/ui'
import { calculate } from '../engine/model'
import type { Inputs, Results, StaffRole } from '../engine/types'
import { mn, money, months, num, pct } from '../lib/format'
import { getPath, setPath } from '../lib/path'

export type SetInputs = (f: (p: Inputs) => Inputs) => void
export type SectionKey = 'site' | 'cost' | 'labor' | 'capex' | 'rent' | 'fin'
type Extra = Partial<ComponentProps<typeof Field>>

/** Thứ tự và mô tả các nhóm giả định trên trang Thông số */
export const SECTIONS: { key: SectionKey; no: string; title: string; desc: string }[] = [
  { key: 'site', no: '01', title: 'Mặt bằng và nhu cầu', desc: 'Diện tích, sức chứa và doanh thu kỳ vọng, nhóm giả định ảnh hưởng nhiều nhất đến kết quả.' },
  { key: 'cost', no: '02', title: 'Chi phí vận hành', desc: 'Các khoản chi tính theo tỷ lệ phần trăm doanh thu.' },
  { key: 'labor', no: '03', title: 'Nhân sự', desc: 'Tính theo từng vị trí (bottom-up) hoặc theo tỷ lệ phần trăm doanh thu (top-down).' },
  { key: 'capex', no: '04', title: 'Vốn đầu tư', desc: 'Chi phí xây dựng, máy móc, dụng cụ, tiền hoạt động và đặt cọc thuê.' },
  { key: 'rent', no: '05', title: 'Thuê mặt bằng', desc: 'Giá thuê, phí dịch vụ, thời hạn hợp đồng và mức tăng giá theo năm.' },
  { key: 'fin', no: '06', title: 'Tài chính và ngưỡng đánh giá', desc: 'Thuế, tăng trưởng, tỷ lệ chiết khấu và các ngưỡng để đưa ra lời khuyên.' },
]

const grid = (children: ReactNode, cols = 2) => <div className={`grid gap-x-16 gap-y-9 ${cols === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>{children}</div>

/** Bảng tổng kết riêng của từng nhóm, hiện ngay dưới các ô nhập */
function Recap({ children }: { children: ReactNode }) {
  return (
    <div className="panel mt-14 p-8">
      <div className="serif mb-4 text-[34px] italic leading-none">Tổng kết nhóm này</div>
      {children}
    </div>
  )
}

const COST_KEYS = ['deduction', 'cogs', 'utilities', 'tools', 'marketing', 'maintenance', 'rd', 'other', 'ga', 'franchise']

export function SectionBody({ k, inputs, setInputs, results: r }: { k: SectionKey; inputs: Inputs; setInputs: SetInputs; results: Results }) {
  const F = (label: string, path: string, extra: Extra = {}) => (
    <Field key={path} label={label} value={getPath(inputs, path) as number} onChange={(v) => setInputs((p) => setPath(p, path, v))} {...extra} />
  )
  const op = r.operation
  const y1 = r.annual[0]

  if (k === 'site') {
    return (
      <div className="sec-body">
        {grid(<>
          {F('Tổng diện tích sàn', 'site.totalArea', { unit: 'm²', slider: true, min: 30, max: 400, step: 5 })}
          {F('Bếp và quầy bar', 'site.kitchenArea', { unit: 'm²' })}
          {F('Diện tích mỗi chỗ ngồi', 'site.areaPerSeat', { unit: 'm²', step: 0.1, min: 0.5 })}
          {F('Số chỗ trung bình mỗi bàn', 'site.seatsPerTable', { unit: 'chỗ', step: 0.2, min: 1 })}
          {F('Vòng quay ghế', 'demand.seatTurnover', { unit: 'lần/ngày', slider: true, min: 0.5, max: 8, step: 0.1 })}
          {F('AOV, giá trị đơn trung bình', 'demand.aov', { unit: 'đồng', slider: true, min: 30000, max: 200000, step: 1000, vnd: true })}
          {F('Số ngày bán mỗi tháng', 'site.daysPerMonth', { unit: 'ngày', min: 20, max: 31 })}
          {F('Giờ mở cửa mỗi ngày', 'site.openHoursPerDay', { unit: 'giờ', min: 4, max: 24 })}
          {F('Thời gian khách ngồi', 'site.avgStayMinutes', { unit: 'phút', step: 5, min: 10, max: 240 })}
          {F('Số giờ cao điểm', 'site.peakHours', { unit: 'giờ', min: 1, max: 8, step: 1 })}
          {F('Khách dồn vào giờ cao điểm', 'site.peakShare', { asPct: true, unit: '%', step: 5 })}
          {F('Thời gian ramp-up', 'ramp.months', { unit: 'tháng', min: 0, max: 12, hint: '0 là không áp dụng' })}
          {F('Doanh thu tháng đầu', 'ramp.startPct', { asPct: true, unit: '%', step: 5, hint: 'so với mức ổn định' })}
        </>)}
        <Recap>
          <Table rows={[
            { cells: ['Sức chứa', `${num(Math.floor(op.seats))} chỗ, ${num(op.tables)} bàn`] },
            { cells: ['Khách mỗi ngày', num(Math.round(op.coversPerDay))] },
            { cells: ['Doanh thu mỗi tháng khi ổn định', money(r.monthly.revenue)] },
            { cells: ['Doanh thu năm 1, đã tính ramp-up', money(y1?.revenue)] },
            { cells: ['Doanh thu mỗi m² sàn mỗi tháng', money(op.revenuePerM2)] },
            { cells: ['Công suất lấp đầy trung bình', pct(op.occupancyAvg)] },
            { cells: ['Công suất lấp đầy giờ cao điểm', pct(op.occupancyPeak)] },
          ]} />
        </Recap>
      </div>
    )
  }

  if (k === 'cost') {
    const lines = r.pnl.filter((l) => COST_KEYS.includes(l.key) && l.amount > 0)
    return (
      <div className="sec-body">
        {grid(<>
          {F('COGS, giá vốn', 'pnl.cogsPct', { asPct: true, unit: '%', slider: true, min: 15, max: 50, step: 0.5 })}
          {F('Giảm trừ doanh thu', 'pnl.revenueDeductionPct', { asPct: true, unit: '%', step: 0.1, hint: 'voucher, phí nền tảng' })}
          {F('Điện nước, dịch vụ', 'pnl.utilitiesPct', { asPct: true, unit: '%', step: 0.1 })}
          {F('Công cụ dụng cụ', 'pnl.toolsPct', { asPct: true, unit: '%', step: 0.1 })}
          {F('Marketing', 'pnl.marketingPct', { asPct: true, unit: '%', step: 0.1 })}
          {F('Bảo trì, bảo dưỡng', 'pnl.maintenancePct', { asPct: true, unit: '%', step: 0.1 })}
          {F('R&D và tiếp khách', 'pnl.rdPct', { asPct: true, unit: '%', step: 0.1 })}
          {F('Chi phí khác', 'pnl.otherPct', { asPct: true, unit: '%', step: 0.1 })}
          {F('Chi phí chung phân bổ', 'pnl.gaPct', { asPct: true, unit: '%', step: 0.1 })}
          {F('Nhượng quyền', 'pnl.franchisePct', { asPct: true, unit: '%', step: 0.1 })}
        </>)}
        <Recap>
          <Table head={['Khoản chi', '% doanh thu', 'Triệu VND mỗi tháng']} rows={[
            ...lines.map((l) => ({ cells: [l.label.trim().replace(/^[\d.]+\s*/, ''), pct(l.pct, 1), mn(l.amount, 1)] })),
            { strong: true, cells: ['Tổng', pct(lines.reduce((s, l) => s + l.pct, 0), 1), mn(lines.reduce((s, l) => s + l.amount, 0), 1)] },
          ]} />
        </Recap>
      </div>
    )
  }

  if (k === 'labor') return <Labor inputs={inputs} setInputs={setInputs} results={r} F={F} />

  if (k === 'capex') {
    const lines = r.capexLines.filter((c) => c.amount > 0)
    return (
      <div className="sec-body">
        {grid(<>
          {F('Xây dựng và thi công', 'capex.constructionPerM2', { unit: 'đ/m²', vnd: true, step: 100000 })}
          {F('Tài sản cố định', 'capex.fixedAssets', { unit: 'đồng', vnd: true, step: 10_000_000, hint: 'máy móc, nội thất' })}
          {F('Công cụ dụng cụ', 'capex.tools', { unit: 'đồng', vnd: true, step: 5_000_000 })}
          {F('Chi phí tiền hoạt động', 'capex.preOpening', { unit: 'đồng', vnd: true, step: 5_000_000 })}
          {F('Phí nhượng quyền trả trước', 'capex.franchiseFee', { unit: 'đồng', vnd: true, step: 10_000_000 })}
          {F('Đặt cọc thuê', 'capex.depositMonths', { unit: 'tháng', min: 0, max: 12 })}
          {F('Khấu hao tài sản cố định', 'capex.fixedAssetsLifeMonths', { unit: 'tháng' })}
          {F('Khấu hao công cụ', 'capex.toolsLifeMonths', { unit: 'tháng' })}
        </>)}
        <Recap>
          <Table head={['Hạng mục', 'Số tiền', '% tổng vốn']} rows={[
            ...lines.map((c) => ({ cells: [c.label, money(c.amount), pct(c.amount / (r.capexTotal || 1), 1)] })),
            { strong: true, cells: ['Tổng vốn đầu tư', money(r.capexTotal), '100%'] },
            { muted: true, cells: ['Vốn mỗi m² sàn', money(r.capexTotal / (inputs.site.totalArea || 1)), ''] },
          ]} />
        </Recap>
      </div>
    )
  }

  if (k === 'rent') {
    const years = r.annual.slice(0, Math.max(1, Math.min(inputs.site.leaseYears, 5)))
    return (
      <div className="sec-body">
        {grid(<>
          {F('Thuê theo m²', 'rent.perM2', { unit: 'đ/m²/tháng', vnd: true, step: 10000, slider: true, min: 0, max: 1_000_000 })}
          {F('Thuê theo % doanh thu', 'rent.pctSales', { asPct: true, unit: '%', step: 0.5 })}
          {F('Phí dịch vụ theo m²', 'rent.servicePerM2', { unit: 'đ/m²/tháng', vnd: true, step: 10000 })}
          {F('Phí dịch vụ theo % doanh thu', 'rent.servicePctSales', { asPct: true, unit: '%', step: 0.5 })}
          {F('Thời hạn thuê', 'site.leaseYears', { unit: 'năm', min: 1, max: 10 })}
        </>)}
        <div className="mt-6">
          <div className="label mb-3">Mức tăng giá thuê theo năm</div>
          <div className="grid grid-cols-5 gap-8">
            {Array.from({ length: Math.min(5, Math.max(inputs.site.leaseYears, 1)) }, (_, i) => (
              <Field key={i} label={`Năm ${i + 1}`} asPct step={1} value={inputs.rent.escalation[i] ?? 0}
                onChange={(v) => setInputs((p) => { const n = structuredClone(p); n.rent.escalation[i] = v; return n })} />
            ))}
          </div>
        </div>
        <Recap>
          <Table head={['Năm', 'Tiền thuê mỗi tháng', '% doanh thu']} rows={[
            ...years.map((y) => ({ cells: [`Năm ${y.year}`, money(y.rentMonthly), pct(y.revenue ? (y.rentMonthly * 12) / y.revenue : 0, 1)] })),
            { muted: true, cells: [`Đặt cọc ${num(inputs.capex.depositMonths, 1)} tháng`, money(r.capexLines.find((c) => c.key === 'deposit')?.amount ?? 0), 'Hoàn lại cuối hợp đồng'] },
          ]} />
        </Recap>
      </div>
    )
  }

  const v = inputs.verdict
  return (
    <div className="sec-body">
      {grid(<>
        {F('Thuế thu nhập doanh nghiệp', 'finance.taxRate', { asPct: true, unit: '%', step: 1 })}
        {F('Tăng trưởng hằng năm', 'finance.ebitdaGrowth', { asPct: true, unit: '%', step: 0.5 })}
        {F('Tỷ lệ chiết khấu (NPV)', 'finance.discountRate', { asPct: true, unit: '%', step: 0.5 })}
      </>)}
      <div className="label mb-4 mt-8">Ngưỡng đưa ra lời khuyên</div>
      {grid(<>
        {F('Hoàn vốn tốt, tối đa', 'verdict.goodPaybackMonths', { unit: 'tháng' })}
        {F('Hoàn vốn kém, trên', 'verdict.badPaybackMonths', { unit: 'tháng' })}
        {F('IRR tốt, tối thiểu', 'verdict.goodIrr', { asPct: true, unit: '%' })}
        {F('IRR kém, dưới', 'verdict.badIrr', { asPct: true, unit: '%' })}
        {F('Biên an toàn tối thiểu', 'verdict.goodSafety', { asPct: true, unit: '%' })}
      </>)}
      <Recap>
        <Table head={['Chỉ tiêu', 'Kết quả hiện tại', 'Ngưỡng tốt']} rows={[
          { cells: ['Hoàn vốn', months(r.paybackCumulative), `tối đa ${v.goodPaybackMonths} tháng`] },
          { cells: ['IRR mỗi năm', pct(r.irr), `tối thiểu ${pct(v.goodIrr)}`] },
          { cells: ['Biên an toàn', pct(r.marginOfSafety), `tối thiểu ${pct(v.goodSafety)}`] },
          { cells: ['NPV', money(r.npv), 'lớn hơn 0'] },
        ]} />
      </Recap>
    </div>
  )
}

const head = 'label pb-2 font-semibold'

function Labor({ inputs, setInputs, results, F }: {
  inputs: Inputs; setInputs: SetInputs; results: Results; F: (label: string, path: string, extra?: Extra) => ReactNode
}) {
  const op = results.operation
  const updateRole = (idx: number, patch: Partial<StaffRole>) =>
    setInputs((p) => { const n = structuredClone(p); n.staff[idx] = { ...n.staff[idx], ...patch }; return n })
  // Đối chiếu hai cách tính để thấy chênh lệch
  const alt = calculate({ ...inputs, laborMode: inputs.laborMode === 'percent' ? 'bottomup' : 'percent' })
  const share = (x: Results) => (x.operation.laborCost || 0) / (x.monthly.revenue || 1)
  const total = op.staff.reduce((s, x) => s + x.cost, 0)
  const num2 = 'field-input num w-full px-1 py-1.5 text-right text-[15px] font-bold text-input'

  return (
    <div className="sec-body">
      <Segmented value={inputs.laborMode} onChange={(m) => setInputs((p) => ({ ...p, laborMode: m }))}
        options={[{ id: 'bottomup', label: 'Theo vị trí' }, { id: 'percent', label: 'Theo % doanh thu' }]} />
      <div className="mt-7">
        {inputs.laborMode === 'percent' ? (
          <div className="max-w-sm">{F('Nhân công', 'pnl.laborPct', { asPct: true, unit: '%', slider: true, min: 10, max: 40, step: 0.5 })}</div>
        ) : (
          <>
            <div className="grid grid-cols-[1.5fr_1fr_1.25fr_1fr_28px] items-end gap-x-6 gap-y-3">
              <div className={head}>Vị trí</div>
              <div className={`${head} text-right`}>Số người cố định</div>
              <div className={`${head} text-right`}>Thêm 1 người cho mỗi (khách/ngày)</div>
              <div className={`${head} text-right`}>Lương tháng (triệu)</div>
              <div />
              {inputs.staff.map((role, idx) => (
                <div key={role.id} className="contents">
                  <input value={role.name} onChange={(e) => updateRole(idx, { name: e.target.value })} className="field-input py-1.5 text-[14.5px] font-semibold" />
                  <input type="number" min={0} value={role.baseCount} onChange={(e) => updateRole(idx, { baseCount: parseFloat(e.target.value) || 0 })} className={num2} />
                  <input type="number" min={0} step={10} value={role.coversPerExtraHead} onChange={(e) => updateRole(idx, { coversPerExtraHead: parseFloat(e.target.value) || 0 })} className={num2} />
                  <input type="number" min={0} step={0.5} value={+(role.salary / 1e6).toFixed(2)} onChange={(e) => updateRole(idx, { salary: (parseFloat(e.target.value) || 0) * 1e6 })} className={num2} />
                  <button title="Xóa vị trí" aria-label="Xóa vị trí" className="grid place-items-center text-dim transition hover:text-bad"
                    onClick={() => setInputs((p) => ({ ...p, staff: p.staff.filter((_, i) => i !== idx) }))}><Icon name="close" size={15} /></button>
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-center justify-between">
              <button className="link-arrow text-[13px]"
                onClick={() => setInputs((p) => ({ ...p, staff: [...p.staff, { id: `r${Date.now()}`, name: 'Vị trí mới', baseCount: 1, coversPerExtraHead: 0, salary: 7_000_000 }] }))}>
                <Icon name="plus" size={15} /> Thêm vị trí
              </button>
              <p className="text-[12px] text-dim">Nhập 0 ở cột "Thêm 1 người" nếu vị trí đó không tăng theo lượng khách.</p>
            </div>
            <div className="mt-6 max-w-sm">{F('Bảo hiểm và phụ cấp doanh nghiệp đóng thêm trên lương', 'employerOnCostPct', { asPct: true, unit: '%', step: 0.5 })}</div>
          </>
        )}
      </div>
      <Recap>
        {inputs.laborMode === 'bottomup' && (
          <Table head={['Vị trí', 'Số người dự kiến', 'Chi phí mỗi tháng', '% quỹ lương']} rows={[
            ...op.staff.map((s) => ({ cells: [s.name, num(s.headcount), money(s.cost), pct(total ? s.cost / total : 0)] })),
            { strong: true, cells: ['Tổng', num(op.totalHeadcount), money(total), '100%'] },
          ]} />
        )}
        <Table rows={[
          { cells: ['Chi phí nhân sự mỗi tháng', money(op.laborCost)] },
          { cells: ['Tỷ lệ trên doanh thu', pct(share(results), 1)] },
          { muted: true, cells: [inputs.laborMode === 'percent' ? 'Nếu tính theo vị trí' : 'Nếu tính theo % doanh thu', pct(share(alt), 1)] },
        ]} />
      </Recap>
    </div>
  )
}
