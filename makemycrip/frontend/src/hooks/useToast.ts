// Simple toast utility — wraps the Radix toast dispatch
const toast = {
  success: (message: string) => {
    window.dispatchEvent(new CustomEvent('toast', { detail: { type: 'success', message } }))
  },
  error: (message: string) => {
    window.dispatchEvent(new CustomEvent('toast', { detail: { type: 'error', message } }))
  },
  info: (message: string) => {
    window.dispatchEvent(new CustomEvent('toast', { detail: { type: 'info', message } }))
  },
}

export default toast
