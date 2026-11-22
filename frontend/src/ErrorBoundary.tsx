import { Component, type ErrorInfo, type ReactNode } from 'react'

/** Bắt lỗi khi chạy để app không trắng trang mà hiện nội dung lỗi (dễ báo cáo) */
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }
  static getDerivedStateFromError(error: Error) { return { error } }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error('[CFS] lỗi giao diện:', error, info.componentStack) }
  render() {
    if (!this.state.error) return this.props.children
    return (
      <div style={{ maxWidth: 720, margin: '60px auto', padding: 24, fontFamily: 'inherit' }}>
        <h2 style={{ fontSize: 20, fontWeight: 700 }}>Giao diện gặp lỗi</h2>
        <p style={{ marginTop: 8 }}>Bạn có thể thử đặt lại dữ liệu demo. Nếu vẫn lỗi, hãy gửi nội dung bên dưới cho người phát triển.</p>
        <pre style={{ marginTop: 12, padding: 12, background: '#11151c', borderRadius: 8, whiteSpace: 'pre-wrap', fontSize: 12 }}>{String(this.state.error.stack ?? this.state.error.message)}</pre>
        <button style={{ marginTop: 12, padding: '8px 16px', borderRadius: 999, background: '#c6ff3d', color: '#0b0e13', fontWeight: 700 }}
          onClick={() => { try { localStorage.removeItem('fme.inputs.v2') } catch { /* bỏ qua */ } location.reload() }}>
          Đặt lại dữ liệu demo và tải lại
        </button>
      </div>
    )
  }
}
