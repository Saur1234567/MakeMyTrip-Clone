import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import type { RootState } from '@/store'

export interface NotificationDto {
  id: string
  type: 'BOOKING' | 'PAYMENT' | 'OFFER' | 'REMINDER' | 'SYSTEM'
  title: string
  message: string
  actionUrl?: string
  category?: string
  status: 'UNREAD' | 'READ'
  referenceId?: string
  referenceType?: string
  readAt?: string
  expiresAt?: string
  createdAt: string
}

export interface NotificationPage {
  content: NotificationDto[]
  totalElements: number
  totalPages: number
  number: number
  size: number
  last: boolean
}

export interface CampaignDto {
  id: string
  name: string
  subject: string
  body: string
  ctaText?: string
  ctaUrl?: string
  discountCode?: string
  expiresAt?: string
  status: string
  targetType: string
  targetCities?: string
  targetUserIds?: string
  targetCondition?: string
  conditionValue?: string
  scheduledAt?: string
  sentAt?: string
  totalSent?: number
  createdAt: string
}

export interface CampaignRequest {
  name: string
  subject: string
  body: string
  ctaText?: string
  ctaUrl?: string
  discountCode?: string
  expiresAt?: string
  targetType: string
  targetCities?: string
  targetUserIds?: string
  targetCondition?: string
  conditionValue?: string
  scheduledAt?: string
}

export const notificationApi = createApi({
  reducerPath: 'notificationApi',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api/v1',
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as RootState).auth.accessToken
      if (token) headers.set('Authorization', `Bearer ${token}`)
      return headers
    },
  }),
  tagTypes: ['Notification', 'Campaign'],
  endpoints: (builder) => ({
    // ── User Notifications ──────────────────────────────────────────────────
    getNotifications: builder.query<NotificationPage, { type?: string; page?: number; size?: number }>({
      query: ({ type, page = 0, size = 20 } = {}) => ({
        url: '/notifications',
        params: { ...(type ? { type } : {}), page, size },
      }),
      providesTags: ['Notification'],
    }),

    getUnreadCount: builder.query<{ count: number }, void>({
      query: () => '/notifications/unread-count',
      providesTags: ['Notification'],
    }),

    markRead: builder.mutation<void, string>({
      query: (id) => ({ url: `/notifications/${id}/read`, method: 'PATCH' }),
      invalidatesTags: ['Notification'],
    }),

    markAllRead: builder.mutation<void, void>({
      query: () => ({ url: '/notifications/read-all', method: 'PATCH' }),
      invalidatesTags: ['Notification'],
    }),

    deleteNotification: builder.mutation<void, string>({
      query: (id) => ({ url: `/notifications/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Notification'],
    }),

    // ── Admin Campaigns ─────────────────────────────────────────────────────
    getCampaigns: builder.query<{ content: CampaignDto[]; totalElements: number; totalPages: number; number: number }, { page?: number; size?: number }>({
      query: ({ page = 0, size = 20 } = {}) => ({
        url: '/admin/campaigns',
        params: { page, size },
      }),
      providesTags: ['Campaign'],
    }),

    getCampaign: builder.query<CampaignDto, string>({
      query: (id) => `/admin/campaigns/${id}`,
      providesTags: ['Campaign'],
    }),

    createCampaign: builder.mutation<CampaignDto, CampaignRequest>({
      query: (body) => ({ url: '/admin/campaigns', method: 'POST', body }),
      invalidatesTags: ['Campaign'],
    }),

    sendCampaign: builder.mutation<CampaignDto, string>({
      query: (id) => ({ url: `/admin/campaigns/${id}/send`, method: 'POST' }),
      invalidatesTags: ['Campaign'],
    }),

    cancelCampaign: builder.mutation<void, string>({
      query: (id) => ({ url: `/admin/campaigns/${id}/cancel`, method: 'POST' }),
      invalidatesTags: ['Campaign'],
    }),
  }),
})

export const {
  useGetNotificationsQuery,
  useGetUnreadCountQuery,
  useMarkReadMutation,
  useMarkAllReadMutation,
  useDeleteNotificationMutation,
  useGetCampaignsQuery,
  useGetCampaignQuery,
  useCreateCampaignMutation,
  useSendCampaignMutation,
  useCancelCampaignMutation,
} = notificationApi
