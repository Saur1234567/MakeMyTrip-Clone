import axios, { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import { store } from '@/store'
import { logout, setTokens } from '@/store/slices/authSlice'
import toast from '@/hooks/useToast'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8081',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
})

// Request interceptor: attach access token
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = store.getState().auth.accessToken
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

let isRefreshing = false
let failedQueue: Array<{ resolve: (value: unknown) => void; reject: (reason?: unknown) => void }> = []

const processQueue = (error: Error | null, token: string | null = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error)
    else resolve(token)
  })
  failedQueue = []
}

// Response interceptor: handle 401 and refresh
api.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean }
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`
            return api(originalRequest)
          })
          .catch((err) => Promise.reject(err))
      }

      originalRequest._retry = true
      isRefreshing = true

      const refreshToken = store.getState().auth.refreshToken
      if (!refreshToken) {
        store.dispatch(logout())
        return Promise.reject(error)
      }

      try {
        const response = await axios.post<{ data: { accessToken: string; refreshToken?: string } }>(
          `${import.meta.env.VITE_API_URL || 'http://localhost:8081'}/api/v1/auth/refresh`,
          { refreshToken }
        )
        const { accessToken, refreshToken: newRefresh } = response.data.data
        store.dispatch(setTokens({ accessToken, refreshToken: newRefresh || refreshToken }))
        processQueue(null, accessToken)
        originalRequest.headers.Authorization = `Bearer ${accessToken}`
        return api(originalRequest)
      } catch (refreshError) {
        processQueue(refreshError as Error)
        store.dispatch(logout())
        window.location.href = '/auth/login'
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    // Parse API error response
    const apiError = error.response?.data as {
      message?: string
      subErrors?: Array<{ field: string; message: string }>
    }
    if (apiError?.message && !apiError?.subErrors) {
      toast.error(apiError.message)
    }
    return Promise.reject(error)
  }
)

export default api
