import { BarChart, CustomChart, HeatmapChart, LineChart, ScatterChart, TreemapChart } from 'echarts/charts'
import {
  GridComponent, LegendComponent, MarkAreaComponent, MarkLineComponent, MarkPointComponent,
  TooltipComponent, VisualMapComponent,
} from 'echarts/components'
import * as echarts from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { useEffect, useRef } from 'react'
import { uiScale } from '../scale'

echarts.use([
  BarChart, LineChart, HeatmapChart, ScatterChart, CustomChart, TreemapChart, GridComponent, TooltipComponent, VisualMapComponent,
  LegendComponent, MarkLineComponent, MarkPointComponent, MarkAreaComponent, CanvasRenderer,
])

export type ChartOption = echarts.EChartsCoreOption

export function EChart({ option, height = 280 }: { option: ChartOption; height?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const chart = useRef<echarts.ECharts | null>(null)

  useEffect(() => {
    if (!ref.current) return
    chart.current = echarts.init(ref.current, undefined, { renderer: 'canvas' })
    // khi giao diện bị zoom, ECharts đọc toạ độ chuột (clientX trừ rect.left) theo px nhìn thấy trong khi vẽ theo px cục bộ.
    // Chặn sự kiện chuột ở pha bắt rồi gửi lại bản đã chia cho hệ số zoom để tooltip và hover đúng chỗ.
    const host = ref.current
    const fixed = new WeakSet<Event>()
    const fix = (e: Event) => {
      const S = uiScale()
      if (S === 1 || fixed.has(e)) return
      const m = e as MouseEvent
      const b = host.getBoundingClientRect()
      e.stopImmediatePropagation()
      const n = new MouseEvent(m.type, { bubbles: true, cancelable: true, composed: true, view: window, detail: m.detail, button: m.button, buttons: m.buttons, ctrlKey: m.ctrlKey, shiftKey: m.shiftKey, altKey: m.altKey, metaKey: m.metaKey, screenX: m.screenX, screenY: m.screenY, clientX: b.left + (m.clientX - b.left) / S, clientY: b.top + (m.clientY - b.top) / S })
      fixed.add(n)
      m.target?.dispatchEvent(n)
    }
    const EVS = ['mousemove', 'mousedown', 'mouseup', 'click', 'dblclick'] as const
    EVS.forEach((t) => host.addEventListener(t, fix, true))
    const ro = new ResizeObserver(() => chart.current?.resize())
    ro.observe(ref.current)
    return () => {
      ro.disconnect()
      EVS.forEach((t) => host.removeEventListener(t, fix, true))
      chart.current?.dispose()
      chart.current = null
    }
  }, [])

  useEffect(() => {
    chart.current?.setOption(option, true)
  }, [option])

  return <div className="chart-surface"><div ref={ref} style={{ height, width: '100%' }} /></div>
}
