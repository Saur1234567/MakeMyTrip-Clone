import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import { RootState } from '@/store'

interface HotelSearchParams {
  city?: string
  checkIn: string
  checkOut: string
  adults: number
  children?: number
  rooms?: number
  page?: number
  size?: number
  sortBy?: string
  minPrice?: number
  maxPrice?: number
  starRatings?: number[]
  freeCancellation?: boolean
  minGuestRating?: number
  amenities?: string[]
  hotelTypes?: string[]
}

export const hotelApi = createApi({
  reducerPath: 'hotelApi',
  baseQuery: fetchBaseQuery({
    baseUrl: import.meta.env.VITE_API_URL || 'http://localhost:8081',
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as RootState).auth.accessToken
      if (token) headers.set('Authorization', `Bearer ${token}`)
      return headers
    },
  }),
  tagTypes: ['Hotel', 'Review', 'Wishlist'],
  endpoints: (builder) => ({
    searchHotels: builder.query({
      query: (params: HotelSearchParams) => ({
        url: '/api/v1/hotels/search',
        params,
      }),
      providesTags: ['Hotel'],
    }),
    getHotelBySlug: builder.query({
      query: ({ city, slug }: { city: string; slug: string }) => `/api/v1/hotels/${city}/${slug}`,
      providesTags: (_result, _error, { slug }) => [{ type: 'Hotel', id: slug }],
    }),
    getHotelById: builder.query({
      query: (id: string) => `/api/v1/hotels/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Hotel', id }],
    }),
    getAvailableRooms: builder.query({
      query: ({ hotelId, checkIn, checkOut, adults, children, rooms }: {
        hotelId: string
        checkIn: string
        checkOut: string
        adults: number
        children?: number
        rooms?: number
      }) => ({
        url: `/api/v1/hotels/${hotelId}/rooms`,
        params: { checkIn, checkOut, adults, children, rooms },
      }),
    }),
    getHotelReviews: builder.query({
      query: ({ hotelId, page = 0, size = 10 }: { hotelId: string; page?: number; size?: number }) => ({
        url: `/api/v1/hotels/${hotelId}/reviews`,
        params: { page, size },
      }),
      providesTags: (_result, _error, { hotelId }) => [{ type: 'Review', id: hotelId }],
    }),
    toggleWishlist: builder.mutation({
      query: (hotelId: string) => ({
        url: `/api/v1/hotels/${hotelId}/wishlist`,
        method: 'POST',
      }),
      invalidatesTags: ['Wishlist', 'Hotel'],
    }),
  }),
})

export const {
  useSearchHotelsQuery,
  useGetHotelBySlugQuery,
  useGetHotelByIdQuery,
  useGetAvailableRoomsQuery,
  useGetHotelReviewsQuery,
  useToggleWishlistMutation,
} = hotelApi
