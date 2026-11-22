// Kiểu dữ liệu của lõi tính toán. Toàn bộ tiền tệ tính bằng VND.
// Lõi chia 2 phần: "chung" (vốn, chi phí, dòng tiền, hòa vốn) và "ngành" (FnB: chỗ ngồi x vòng quay x AOV).

export type LaborMode = 'percent' | 'bottomup'

export interface StaffRole {
  id: string
  name: string
  /** Số người cố định mỗi ngày (đã gồm các ca) */
  baseCount: number
  /** Thêm 1 người cho mỗi N lượt khách/ngày. 0 = không tăng theo khách */
  coversPerExtraHead: number
  /** Lương gộp/tháng (VND) */
  salary: number
}

export interface Inputs {
  meta: {
    name: string
    district: string
    format: string
  }
  site: {
    totalArea: number // m2 sàn
    kitchenArea: number // m2 bếp + quầy bar
    areaPerSeat: number // m2 / chỗ ngồi
    leaseYears: number // thời hạn thuê = số năm tính dòng tiền
    daysPerMonth: number
    seatsPerTable: number
    openHoursPerDay: number
    peakHours: number // số giờ cao điểm mỗi ngày (mặc định 3)
    peakShare: number // % lượt khách dồn vào các giờ cao điểm
    avgStayMinutes: number // thời gian khách ngồi trung bình (phút), dùng tính công suất lấp đầy
  }
  demand: {
    seatTurnover: number // vòng quay ghế / ngày
    aov: number // giá trị đơn trung bình (VND)
  }
  ramp: {
    months: number // số tháng để đạt 100% doanh thu. 0 = không ramp-up
    startPct: number // % doanh thu tháng đầu
  }
  pnl: {
    revenueDeductionPct: number
    cogsPct: number
    laborPct: number // dùng khi laborMode = percent
    utilitiesPct: number
    toolsPct: number
    rdPct: number
    maintenancePct: number
    otherPct: number
    marketingPct: number
    franchisePct: number
    gaPct: number // chi phí chung phân bổ
    interestPct: number
  }
  laborMode: LaborMode
  staff: StaffRole[]
  employerOnCostPct: number // chi phí doanh nghiệp đóng thêm trên lương (ước tính)
  rent: {
    pctSales: number
    perM2: number // VND / m2 / tháng
    servicePctSales: number
    servicePerM2: number
    /** Mức tăng giá thuê theo năm. index 0 = năm 1 (thường 0) */
    escalation: number[]
  }
  capex: {
    constructionPerM2: number // VND / m2 sàn
    fixedAssets: number
    tools: number
    preOpening: number
    franchiseFee: number
    /** Đặt cọc thuê (số tháng tiền thuê). Không khấu hao, được hoàn lại cuối hợp đồng */
    depositMonths: number
    fixedAssetsLifeMonths: number
    toolsLifeMonths: number
  }
  finance: {
    ebitdaGrowth: number
    taxRate: number
    discountRate: number
  }
  verdict: {
    goodPaybackMonths: number
    badPaybackMonths: number
    goodIrr: number
    badIrr: number
    goodSafety: number // biên an toàn tối thiểu
  }
}

export interface PnlLine {
  key: string
  label: string
  amount: number
  pct: number // % trên doanh thu
  kind: 'revenue' | 'cost' | 'subtotal' | 'total'
  fixed?: boolean
}

export interface StaffLine {
  id: string
  name: string
  headcount: number
  cost: number
}

export interface AnnualRow {
  year: number
  rentMonthly: number
  revenue: number
  deduction: number
  cogs: number
  labor: number
  rent: number
  otherOpex: number
  cm: number // dòng tiền hoạt động trước thuế (EBITDA)
  depreciation: number
  profitBeforeTax: number
  tax: number
  netProfit: number
  cashflow: number
  cumulative: number
}

export interface Operation {
  seats: number
  tables: number
  coversPerDay: number
  ordersPerPeakHour: number
  staff: StaffLine[]
  totalHeadcount: number
  laborCost: number
  revenuePerM2: number
  revenuePerSeat: number
  /** Công suất lấp đầy trung bình trong giờ mở cửa (1 = 100%) */
  occupancyAvg: number
  /** Công suất lấp đầy trong giờ cao điểm. Trên 100% nghĩa là không đủ chỗ */
  occupancyPeak: number
}

export type VerdictLevel = 'open' | 'consider' | 'dont'

export interface Verdict {
  level: VerdictLevel
  label: string
  reasons: string[]
}

export interface Results {
  operation: Operation
  pnl: PnlLine[]
  monthly: {
    revenue: number
    netRevenue: number
    cm: number
    depreciation: number
    uc: number
    cmPct: number
    ucPct: number
  }
  capexTotal: number
  capexLines: { key: string; label: string; amount: number; lifeMonths: number; monthlyDep: number }[]
  monthlyDepreciation: number
  rentMonthlyY1: number
  annual: AnnualRow[]
  /** Payback đơn giản = vốn / dòng tiền hoạt động tháng (cách của file Excel gốc) */
  paybackSimple: number
  /** Payback theo dòng tiền lũy kế từng tháng (có ramp-up, tăng giá thuê, thuế). null = chưa hoàn vốn trong thời hạn thuê */
  paybackCumulative: number | null
  irr: number | null
  npv: number
  breakEvenRevenue: number
  breakEvenCovers: number
  marginOfSafety: number
  fixedCost: number
  variableCostPct: number
  unitVariableCost: number
  monthlyCumulative: number[] // dòng tiền lũy kế theo tháng (bắt đầu bằng -vốn)
  verdict: Verdict
}
