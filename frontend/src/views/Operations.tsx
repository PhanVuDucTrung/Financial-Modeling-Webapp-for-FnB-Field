import { Rich } from '../lib/rich'
import { useState } from 'react'
import { EChart } from '../components/EChart'
import * as ch from '../components/charts'
import { Reveal } from '../components/motion'
import { Card, Dial, Field, Gauge, Kpi, MiniBars, Ring, Table } from '../components/ui'
import { benchmark } from '../engine/benchmark'
import { peakHoursOf, staffLines } from '../engine/model'
import { money, num, pct } from '../lib/format'
import type { ViewProps } from './Overview'

const occTone = (x: number) => (x > 1 ? ('bad' as const) : x > 0.85 ? ('warn' as const) : ('good' as const))
const kpiGrid = 'stagger grid grid-cols-2 gap-5 xl:grid-cols-4'

export function Operations({ inputs, results: r, tab }: ViewProps & { tab: string }) {
  const op = r.operation
  const [target, setTarget] = useState(Math.round(op.coversPerDay * 1.3))

  if (tab === 'staff') {
    const labor = benchmark(inputs, r).find((b) => b.key === 'labor')
    const laborShare = op.laborCost / (r.monthly.revenue || 1)
    const payroll = op.staff.reduce((a, x) => a + x.cost, 0) || 1
    const levels = [0.6, 0.8, 1, 1.25, 1.5].map((k) => Math.round((op.coversPerDay * k) / 10) * 10)
    return (
      <div className="space-y-12">
        <div className={kpiGrid}>
          <Kpi label="Tổng nhân sự" value={`${num(op.totalHeadcount)} người`} viz={<MiniBars data={op.staff.map((s) => s.headcount)} />} />
          <Kpi label="Chi phí nhân sự mỗi tháng" value={money(op.laborCost)} sub={`${pct(laborShare, 1)} doanh thu`} viz={<Ring ratio={laborShare / 0.4} tone={laborShare > 0.3 ? 'bad' : 'good'} />} />
          <Kpi label="Khách mỗi nhân sự mỗi ngày" value={num(op.coversPerDay / (op.totalHeadcount || 1), 1)} />
          <Kpi label="Doanh thu mỗi nhân sự" value={money(r.monthly.revenue / (op.totalHeadcount || 1))} sub="mỗi tháng" />
        </div>
        <div className="grid gap-12 xl:grid-cols-[1.4fr_1fr]">
          <Reveal>
            <Card title="Payroll by role (triệu VND/tháng)" subtitle={inputs.laborMode === 'percent' ? 'Tham khảo, mô hình đang tính nhân công theo % doanh thu' : 'đã gồm bảo hiểm và phụ cấp'}>
              <EChart option={ch.staffCostBars(op.staff)} height={Math.max(240, op.staff.length * 54)} />
            </Card>
          </Reveal>
          {labor && (
            <Reveal delay={80}>
              <Card title="Labor cost against the industry (% doanh thu)" subtitle="vạch trắng là cận trên của khoảng tham chiếu">
                <div className="num text-[44px] font-bold leading-none">{pct(labor.value, 1)}</div>
                <div className="mt-6"><Gauge ratio={labor.value / (labor.high * 1.6)} mark={labor.high / (labor.high * 1.6)} tone={labor.status === 'ok' ? 'good' : labor.status === 'high' ? 'bad' : 'warn'} h={12} /></div>
                <p className="mt-5 text-[13.5px] leading-relaxed text-dim"><Rich>{`Khoảng tham chiếu ${pct(labor.low)} đến ${pct(labor.high)} doanh thu, độ tin cậy ${labor.confidence}. `}</Rich>{labor.status === 'ok' ? 'Chi phí nhân sự nằm trong khoảng tham chiếu.' : labor.status === 'high' ? 'Chi phí nhân sự cao hơn khoảng tham chiếu, nên rà lại số người và lương.' : 'Chi phí nhân sự thấp hơn khoảng tham chiếu, cần kiểm tra xem có đủ người phục vụ giờ cao điểm.'}</p>
              </Card>
            </Reveal>
          )}
        </div>
        <Reveal>
          <Card title="Headcount by role" subtitle={inputs.laborMode === 'percent' ? 'Tham khảo, mô hình đang tính nhân công theo % doanh thu' : 'Số người cố định cộng thêm theo lượng khách mỗi ngày'}>
            <Table head={['Vị trí', 'Số người', 'Chi phí mỗi tháng', '% quỹ lương']} rows={[
              ...op.staff.map((s) => ({ cells: [s.name, s.headcount, money(s.cost), pct(s.cost / payroll)] })),
              { strong: true, cells: ['Tổng', op.totalHeadcount, money(payroll), '100%'] },
            ]} />
          </Card>
        </Reveal>
        <div className="grid gap-12 xl:grid-cols-[1.3fr_1fr]">
          <Reveal>
            <Card title="Staffing steps up as traffic grows" subtitle="Cột cam là mức khách kế hoạch, số người tăng theo bậc khi vượt ngưỡng của từng vị trí">
              <EChart option={ch.headcountCurve(inputs, r)} height={300} />
            </Card>
          </Reveal>
          <Reveal delay={80}>
            <Card title="Staffing at different traffic levels" subtitle="Doanh thu và nhân sự tại các mức khách khác nhau">
              <Table head={['Khách mỗi ngày', 'Nhân sự', 'Chi phí', '% doanh thu']} rows={levels.map((c) => {
                const lines = staffLines(inputs, c)
                const cost = lines.reduce((s, l) => s + l.cost, 0)
                const rev = c * inputs.demand.aov * inputs.site.daysPerMonth
                return { strong: c === levels[2], cells: [num(c), num(lines.reduce((s, l) => s + l.headcount, 0)), money(cost), pct(rev ? cost / rev : 0, 1)] }
              })} />
            </Card>
          </Reveal>
        </div>
      </div>
    )
  }

  const seatsNeeded = target / inputs.demand.seatTurnover
  const areaNeeded = seatsNeeded * inputs.site.areaPerSeat + inputs.site.kitchenArea
  const extra = areaNeeded - inputs.site.totalArea
  return (
    <div className="space-y-12">
      <div className={kpiGrid}>
        <Kpi label="Chỗ ngồi" value={num(Math.floor(op.seats))} sub={`${num(op.tables)} bàn`} viz={<Ring ratio={op.occupancyAvg} tone={occTone(op.occupancyAvg)} />} />
        <Kpi label="Khách mỗi ngày" value={num(Math.round(op.coversPerDay))} sub={`${num(inputs.demand.seatTurnover, 1)} lượt mỗi chỗ`} />
        <Kpi label="Đơn mỗi giờ cao điểm" value={num(Math.round(op.ordersPerPeakHour))} sub={`${pct(inputs.site.peakShare)} khách dồn vào ${peakHoursOf(inputs)} giờ`} />
        <Kpi label="Doanh thu mỗi m² sàn" value={money(op.revenuePerM2)} sub={`${money(op.revenuePerSeat)} mỗi chỗ ngồi`} />
      </div>

      <div className="grid gap-12 xl:grid-cols-[1.7fr_1fr]">
        <Reveal>
          <Card title="Peak hours fill the room (% chỗ ngồi)" subtitle="% chỗ ngồi có khách trong từng giờ mở cửa, cột cam là các giờ cao điểm">
            <EChart option={ch.hourlyOccupancy(inputs, r)} height={330} />
          </Card>
        </Reveal>
        <Reveal delay={80}>
          <Card title="Capacity at a glance" subtitle="Tính từ thời gian khách ngồi và số chỗ">
            <div className="grid grid-cols-2 gap-6">
              <Dial ratio={op.occupancyAvg} mark={0.9} tone={occTone(op.occupancyAvg)} value={pct(op.occupancyAvg)} label="Cả ngày" note={`${num(inputs.site.openHoursPerDay)} giờ mở cửa`} />
              <Dial ratio={op.occupancyPeak} mark={0.9} tone={occTone(op.occupancyPeak)} value={pct(op.occupancyPeak)} label="Giờ cao điểm" note={`${pct(inputs.site.peakShare)} khách trong ${peakHoursOf(inputs)} giờ`} />
            </div>
            <p className="mt-6 text-[13.5px] leading-relaxed text-dim">Vạch đen trên mỗi cung là mốc 90%, trên mốc này khách bắt đầu phải chờ.</p>
            <p className="mt-3 text-[13.5px] leading-relaxed text-dim">
              <Rich>{op.occupancyPeak > 1
                ? 'Giờ cao điểm vượt 100%, lượng khách kế hoạch không đủ chỗ ngồi nên doanh thu thực tế sẽ thấp hơn.'
                : op.occupancyPeak > 0.9
                  ? 'Giờ cao điểm trên 90%, dễ quá tải, khách phải chờ hoặc bỏ đi.'
                  : 'Công suất giờ cao điểm trong ngưỡng chịu được. Còn dư chỗ để tăng lượng khách.'}</Rich>
            </p>
          </Card>
        </Reveal>
      </div>

      <div className="grid gap-12 xl:grid-cols-[1.7fr_1fr]">
        <Reveal>
          <Card title="Floor area needed as traffic grows (m²)" subtitle="Giữ nguyên vòng quay ghế và diện tích mỗi chỗ ngồi, đường ngang là diện tích hiện có">
            <EChart option={ch.areaCurve(inputs, r)} height={330} />
          </Card>
        </Reveal>
        <Reveal delay={80}>
          <Card title="Test a target traffic level" subtitle="Nhập số khách mỗi ngày muốn đạt">
            <div className="max-w-xs"><Field label="Khách mục tiêu mỗi ngày" value={target} onChange={setTarget} min={10} max={1000} step={10} slider unit="khách" /></div>
            <div className="stagger mt-8 grid grid-cols-1 gap-4">
              <Kpi label="Chỗ ngồi cần" value={num(Math.ceil(seatsNeeded))} />
              <Kpi label="Diện tích cần" value={`${num(areaNeeded)} m²`} />
              <Kpi label="So với diện tích hiện có" value={`${extra >= 0 ? '+' : '-'}${num(Math.abs(extra))} m²`} tone={extra > 0 ? 'warn' : 'good'} />
            </div>
          </Card>
        </Reveal>
      </div>

      <Reveal>
        <Card title="How hard the floor space works" subtitle="Các chỉ số giúp so sánh với địa điểm khác trước khi chốt thuê">
          <Table head={['Chỉ số', 'Giá trị', 'Ý nghĩa']} rows={[
            { cells: ['Doanh thu mỗi m² sàn mỗi tháng', money(op.revenuePerM2), 'Càng cao thì mặt bằng càng được khai thác tốt'] },
            { cells: ['Doanh thu mỗi chỗ ngồi mỗi tháng', money(op.revenuePerSeat), 'Dùng để so sánh với quán cùng phân khúc'] },
            { cells: ['Tiền thuê trên doanh thu', pct(r.rentMonthlyY1 / (r.monthly.revenue || 1), 1), 'Thường nên dưới 15 đến 20% doanh thu'] },
            { cells: ['Diện tích dành cho bếp và quầy bar', pct(inputs.site.kitchenArea / (inputs.site.totalArea || 1)), 'Phần diện tích không tạo chỗ ngồi'] },
            { cells: ['Số khách mỗi chỗ ngồi mỗi ngày', num(inputs.demand.seatTurnover, 1), 'Chính là vòng quay ghế'] },
            { cells: ['Thời gian khách ngồi', `${num(inputs.site.avgStayMinutes)} phút`, 'Càng dài thì công suất giờ cao điểm càng căng'] },
          ]} />
        </Card>
      </Reveal>
    </div>
  )
}
