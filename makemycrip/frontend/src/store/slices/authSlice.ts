import { createSlice, PayloadAction } from '@reduxjs/toolkit'

interface User {
  id: string
  email: string
  firstName: string
  lastName?: string
  phone?: string
  /** Primary role (legacy single-role support) */
  role: string
  /** Multi-role array — a user can be ADMIN + HOTEL_MANAGER + USER simultaneously */
  roles?: string[]
  loyaltyTier: string
  loyaltyPoints?: number
  isEmailVerified: boolean
  dateOfBirth?: string
  gender?: string
  profilePictureUrl?: string
}

// Helper: normalize user object from backend (handles both AuthResponse.UserInfo and UserProfileDto shapes)
export function normalizeUser(raw: any): User {
  return {
    id: String(raw.id),
    email: raw.email,
    firstName: raw.firstName,
    lastName: raw.lastName,
    phone: raw.phone,
    role: raw.role || 'USER',
    roles: raw.roles,
    loyaltyTier: raw.loyaltyTier || 'BRONZE',
    loyaltyPoints: raw.loyaltyPoints ?? 0,
    isEmailVerified: raw.isEmailVerified ?? raw.emailVerified ?? false,
    dateOfBirth: raw.dateOfBirth,
    gender: raw.gender,
    profilePictureUrl: raw.profilePictureUrl,
  }
}

interface AuthState {
  user: User | null
  accessToken: string | null
  refreshToken: string | null
  isAuthenticated: boolean
}

const loadFromStorage = (): Partial<AuthState> => {
  try {
    const user = localStorage.getItem('user')
    const accessToken = localStorage.getItem('accessToken')
    const refreshToken = localStorage.getItem('refreshToken')
    return {
      user: user ? JSON.parse(user) : null,
      accessToken,
      refreshToken,
      isAuthenticated: !!accessToken,
    }
  } catch {
    return {}
  }
}

const initialState: AuthState = {
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  ...loadFromStorage(),
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (state, action: PayloadAction<{ user: User; accessToken: string; refreshToken?: string }>) => {
      state.user = action.payload.user
      state.accessToken = action.payload.accessToken
      if (action.payload.refreshToken) state.refreshToken = action.payload.refreshToken
      state.isAuthenticated = true
      localStorage.setItem('user', JSON.stringify(action.payload.user))
      localStorage.setItem('accessToken', action.payload.accessToken)
      if (action.payload.refreshToken) localStorage.setItem('refreshToken', action.payload.refreshToken)
    },
    setTokens: (state, action: PayloadAction<{ accessToken: string; refreshToken?: string }>) => {
      state.accessToken = action.payload.accessToken
      if (action.payload.refreshToken) state.refreshToken = action.payload.refreshToken
      localStorage.setItem('accessToken', action.payload.accessToken)
      if (action.payload.refreshToken) localStorage.setItem('refreshToken', action.payload.refreshToken)
    },
    logout: (state) => {
      state.user = null
      state.accessToken = null
      state.refreshToken = null
      state.isAuthenticated = false
      localStorage.removeItem('user')
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
    },
    updateUser: (state, action: PayloadAction<Partial<User>>) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload }
        localStorage.setItem('user', JSON.stringify(state.user))
      }
    },
  },
})

export const { setCredentials, setTokens, logout, updateUser } = authSlice.actions
export default authSlice.reducer
