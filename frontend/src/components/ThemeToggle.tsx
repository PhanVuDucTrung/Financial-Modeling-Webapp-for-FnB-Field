import { applyChartTheme } from '../theme'

export type Theme = 'light' | 'dark'
const KEY = 'fme.theme'

export function loadTheme(): Theme {
  try { return localStorage.getItem(KEY) === 'dark' ? 'dark' : 'light' } catch { return 'light' }
}

/** Áp chế độ sáng tối cho CSS (thuộc tính data-theme), bảng màu biểu đồ và quả cầu. Gọi trước khi vẽ lại giao diện. */
export function applyTheme(t: Theme) {
  if (typeof document === 'undefined') return
  document.documentElement.dataset.theme = t
  applyChartTheme(t === 'dark')
  try { localStorage.setItem(KEY, t) } catch { /* trình duyệt chặn storage */ }
  window.dispatchEvent(new Event('fme-theme'))
}

const SUN = <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="4.2" fill="currentColor" /><path d="M12 2.5v2.4M12 19.1v2.4M2.5 12h2.4M19.1 12h2.4M5.3 5.3l1.7 1.7M17 17l1.7 1.7M18.7 5.3L17 7M7 17l-1.7 1.7" /></svg>
const MOON = <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor"><path d="M20.5 14.6A8.6 8.6 0 0 1 9.4 3.5a.7.7 0 0 0-1-.8A9.7 9.7 0 1 0 21.3 15.6a.7.7 0 0 0-.8-1z" /></svg>

/** Nút viên thuốc ở góc phải trên: sáng hiện mặt trời, tối hiện mặt trăng */
export function ThemeToggle({ theme, onChange, delayMs = 0 }: { theme: Theme; onChange: (t: Theme) => void; delayMs?: number }) {
  const dark = theme === 'dark'
  return (
    <button type="button" data-theme-toggle role="switch" aria-checked={dark} aria-label={dark ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'} title={dark ? 'Giao diện tối' : 'Giao diện sáng'}
      onClick={() => onChange(dark ? 'light' : 'dark')}
      className={`${delayMs ? 'fade-in ' : ''}fixed right-8 top-5 z-[35] h-[34px] w-[68px] rounded-full p-[3px] transition-shadow duration-300 hover:shadow-[0_0_0_1.5px_rgba(255,109,41,0.5)]`}
      style={{ animationDelay: delayMs ? `${delayMs}ms` : undefined, background: 'var(--g-pill)', borderTop: '1.5px solid var(--g-edge-t)', borderBottom: '1.5px solid var(--g-edge-b)', boxShadow: '0 12px 26px -14px rgba(var(--sh),0.4)' }}>
      {/* biểu tượng mờ của chế độ còn lại nằm sẵn trong lòng nút */}
      <span className="pointer-events-none absolute left-[10px] top-1/2 -translate-y-1/2 text-dim opacity-60">{SUN}</span>
      <span className="pointer-events-none absolute right-[10px] top-1/2 -translate-y-1/2 text-dim opacity-60">{MOON}</span>
      <span className="relative block h-full w-[28px] rounded-full text-white transition-transform duration-500 ease-[cubic-bezier(0.5,0,0.15,1)]"
        style={{ transform: `translateX(${dark ? 34 : 0}px)`, background: dark ? 'linear-gradient(160deg,#6b6fe0,#3d3f9c)' : 'linear-gradient(160deg,#ffb347,#ff6d29)', boxShadow: dark ? '0 0 14px rgba(120,125,255,0.55)' : '0 0 14px rgba(255,109,41,0.6)' }}>
        <span className="absolute inset-0 grid place-items-center">{dark ? MOON : SUN}</span>
      </span>
    </button>
  )
}
