import type { ReactNode } from 'react'

/**
 * In đậm các cụm quan trọng trong câu: số kèm đơn vị, phần trăm, và các từ kết luận.
 * Dùng cho đoạn văn dài để mắt quét thấy ngay con số và kết luận cần nhớ.
 */
const UNIT = '(?:%|\\s?(?:tháng|năm|ngày|giờ|phút|khách|chỗ|bàn|người|lần|m²|điểm|triệu VND|tỷ VND|ngàn VND|VND|đồng|tr|k)(?![\\p{L}]))?'
const NUM = `[+\\-−]?\\d[\\d.,]*${UNIT}`
const WORDS = 'Không nên mở|Nên mở|Cân nhắc|Chưa đạt|Đạt|quá tải|hòa vốn'
const RE = new RegExp(`(\\u201c[^\\u201d]+\\u201d|"[^"]+"|${NUM}|(?<![\\p{L}])(?:${WORDS})(?![\\p{L}]))`, 'gu')

/** Từ kết luận mang màu theo nghĩa: nên mở và đạt là xanh, không nên mở và chưa đạt là đỏ, cân nhắc là vàng */
function tone(p: string): string {
  const t = p.replace(/[“”"]/g, '').trim()
  if (/^Không nên mở$/.test(t) || /^Chưa đạt$/.test(t)) return 'text-bad'
  if (/^Nên mở$/.test(t) || /^Đạt$/.test(t)) return 'text-good'
  if (/^Cân nhắc$/.test(t)) return 'text-warn'
  return 'text-ink'
}

export function Rich({ children }: { children: string }): ReactNode {
  const parts = children.split(RE)
  return <>{parts.map((p, i) => (i % 2 ? <b key={i} className={`font-semibold ${tone(p)}`}>{p}</b> : p))}</>
}
