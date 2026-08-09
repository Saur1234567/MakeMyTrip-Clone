import { configureStore } from '@reduxjs/toolkit'
import authReducer from './slices/authSlice'
import searchReducer from './slices/searchSlice'
import { hotelApi } from './api/hotelApi'
import { bookingApi } from './api/bookingApi'
import { authApi } from './api/authApi'
import { notificationApi } from './api/notificationApi'

export const store = configureStore({
  reducer: {
    auth: authReducer,
    search: searchReducer,
    [hotelApi.reducerPath]: hotelApi.reducer,
    [bookingApi.reducerPath]: bookingApi.reducer,
    [authApi.reducerPath]: authApi.reducer,
    [notificationApi.reducerPath]: notificationApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware()
      .concat(hotelApi.middleware)
      .concat(bookingApi.middleware)
      .concat(authApi.middleware)
      .concat(notificationApi.middleware),
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
