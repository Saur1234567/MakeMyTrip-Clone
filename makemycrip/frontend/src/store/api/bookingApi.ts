import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import { RootState } from '@/store'

// ─── Coupon types ─────────────────────────────────────────────────────────────

export interface CouponValidateRequest {
  code: string
  bookingRef: string
  paymentMethod: string
  /** Hotel UUID — used for HOTEL-scoped coupon validation */
  hotelId?: string
  /** City name — used for CITY-scoped coupon validation */
  city?: string
  /** Room type name — used for ROOM_TYPE-scoped coupon validation */
  roomType?: string
  selectedBank?: string | null
  selectedWallet?: string | null
  selectedUpiApp?: string | null
}

export interface CouponValidateResponse {
  code: string
  label: string
  description: string
  discountType: 'FLAT' | 'PERCENT'
  discountValue: number
  /** Server-computed discount amount — the ONLY value the frontend should use */
  discountAmount: number
  originalAmount: number
  finalAmount: number
  /** Coupon scope: UNIVERSAL | HOTEL | CITY | ROOM_TYPE */
  scope: string
  isStackable: boolean
  /** CSV of applicable payment methods, e.g. "all" or "card,netbanking" */
  applicablePaymentMethods: string | null
  minBookingAmount: number | null
  maxDiscountAmount: number | null
}

export const bookingApi = createApi({
  reducerPath: 'bookingApi',
  baseQuery: fetchBaseQuery({
    baseUrl: import.meta.env.VITE_API_URL || 'http://localhost:8081',
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as RootState).auth.accessToken
      if (token) headers.set('Authorization', `Bearer ${token}`)
      return headers
    },
  }),
  tagTypes: ['Booking'],
  endpoints: (builder) => ({
    initiateBooking: builder.mutation({
      query: (body) => ({ url: '/api/v1/bookings/initiate', method: 'POST', body }),
      invalidatesTags: ['Booking'],
    }),
    getMyBookings: builder.query({
      query: ({ status, page = 0, size = 10 }: { status?: string; page?: number; size?: number }) => ({
        url: '/api/v1/bookings',
        params: { status, page, size },
      }),
      providesTags: ['Booking'],
    }),
    getBookingDetail: builder.query({
      query: (bookingRef: string) => `/api/v1/bookings/${bookingRef}`,
      providesTags: (_result, _error, ref) => [{ type: 'Booking', id: ref }],
    }),
    getCancellationPreview: builder.query({
      query: (bookingRef: string) => `/api/v1/bookings/${bookingRef}/cancel/preview`,
    }),
    cancelBooking: builder.mutation({
      query: ({ bookingRef, reason }: { bookingRef: string; reason: string }) => ({
        url: `/api/v1/bookings/${bookingRef}/cancel`,
        method: 'POST',
        body: { reason },
      }),
      invalidatesTags: ['Booking'],
    }),
    /**
     * Server-side coupon validation.
     * Returns server-computed discountAmount — never trust client-side calculation.
     * Validates scope (UNIVERSAL/HOTEL/CITY/ROOM_TYPE), payment method, bank, wallet, UPI app.
     */
    validateCoupon: builder.mutation<{ data: CouponValidateResponse }, CouponValidateRequest>({
      query: (body) => ({
        url: '/api/v1/coupons/validate',
        method: 'POST',
        body,
      }),
    }),
    /**
     * Fetches all coupons applicable to the given booking context.
     * Filtered by scope (hotel, city, room type), usage limits, and expiry.
     * Discount amounts are estimated using the booking's current total.
     */
    getAvailableCoupons: builder.query<{ data: CouponValidateResponse[] }, string>({
      query: (bookingRef: string) => ({
        url: '/api/v1/coupons/available',
        params: { bookingRef },
      }),
    }),
  }),
})

export const {
  useInitiateBookingMutation,
  useGetMyBookingsQuery,
  useGetBookingDetailQuery,
  useGetCancellationPreviewQuery,
  useCancelBookingMutation,
  useValidateCouponMutation,
  useGetAvailableCouponsQuery,
} = bookingApi
