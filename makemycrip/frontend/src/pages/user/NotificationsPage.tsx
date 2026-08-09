import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, Check, CheckCheck, Trash2, RefreshCw } from 'lucide-react'
import {
  useGetNotificationsQuery,
  useGetUnreadCountQuery,
  useMarkReadMutation,
  useMarkAllReadMutation,
  useDeleteNotificationMutation,
  NotificationDto,
} from '@/store/api/notificationApi'

const TABS = [
  { label: 'All', value: '' },
  { label: 'Bookings', value: 'BOOKING' },
  { label: 'Payments', value: 'PAYMENT' },
  { label: 'Offers', value: 'OFFER' },
  { label: 'Reminders', value: 'REMINDER' },
  { label: 'System', value: 'SYSTEM' },
]

const TYPE_COLORS: Record<string, string> = {
  BOOKING: 'bg-blue-100 text-blue-700',
  PAYMENT: 'bg-green-100 text-green-700',
  OFFER: 'bg-orange-100 text-orange-700',
  REMINDER: 'bg-yellow-100 text-yellow-700',
  SYSTEM: 'bg-gray-100 text-gray-600',
}

const TYPE_ICONS: Record<string, string> = {
  BOOKING: '🏨',
  PAYMENT: '💳',
  OFFER: '🎁',
  REMINDER: '⏰',
  SYSTEM: '🔔',
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function NotificationsPage() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('')
  const [page, setPage] = useState(0)
  const [allNotifications, setAllNotifications] = useState<NotificationDto[]>([])
  const [hasMore, setHasMore] = useState(false)
  const loaderRef = useRef<HTMLDivElement>(null)
  // Track which (tab, page) combos we've already appended to avoid double-appending
  const appendedRef = useRef<Set<string>>(new Set())

  const { data, isFetching } = useGetNotificationsQuery(
    { type: activeTab || undefined, page, size: 20 },
    { refetchOnMountOrArgChange: true }
  )
  const { refetch: refetchCount } = useGetUnreadCountQuery(undefined, { skip: false })
  const [markRead] = useMarkReadMutation()
  const [markAllRead] = useMarkAllReadMutation()
  const [deleteNotif] = useDeleteNotificationMutation()

  // Reset when tab changes
  useEffect(() => {
    setPage(0)
    setAllNotifications([])
    setHasMore(false)
    appendedRef.current.clear()
  }, [activeTab])

  // Append new page results — only once per (tab+page) combination
  useEffect(() => {
    if (!data || isFetching) return
    const key = `${activeTab}:${page}`
    if (appendedRef.current.has(key)) return
    appendedRef.current.add(key)

    const content = data.content ?? []
    if (page === 0) {
      setAllNotifications(content)
    } else {
      setAllNotifications((prev) => {
        const safePrev = prev ?? []
        const ids = new Set(safePrev.map((n) => n.id))
        const newItems = content.filter((n) => !ids.has(n.id))
        return newItems.length > 0 ? [...safePrev, ...newItems] : safePrev
      })
    }
    setHasMore(!data.last && content.length > 0)
  }, [data, isFetching, activeTab, page])

  // Infinite scroll observer — only set up when we have more pages and are not fetching
  useEffect(() => {
    const el = loaderRef.current
    if (!el || !hasMore || isFetching) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setPage((p) => p + 1)
        }
      },
      { threshold: 0.1 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [hasMore, isFetching])

  const handleMarkRead = useCallback(async (id: string) => {
    await markRead(id)
    setAllNotifications((prev) => (prev ?? []).map((n) => n.id === id ? { ...n, status: 'READ' as const } : n))
    refetchCount()
  }, [markRead, refetchCount])

  const handleDelete = useCallback(async (id: string) => {
    await deleteNotif(id)
    setAllNotifications((prev) => (prev ?? []).filter((n) => n.id !== id))
    refetchCount()
  }, [deleteNotif, refetchCount])

  const handleMarkAll = async () => {
    await markAllRead()
    setAllNotifications((prev) => (prev ?? []).map((n) => ({ ...n, status: 'READ' as const })))
    refetchCount()
  }

  const handleRefresh = () => {
    appendedRef.current.clear()
    setPage(0)
    setAllNotifications([])
    setHasMore(false)
  }

  const handleNotifClick = (notif: NotificationDto) => {
    if (notif.status === 'UNREAD') handleMarkRead(notif.id)
    if (notif.actionUrl) navigate(notif.actionUrl)
  }

  const safeNotifications = allNotifications ?? []
  const unreadCount = safeNotifications.filter((n) => n.status === 'UNREAD').length
  const isInitialLoading = isFetching && safeNotifications.length === 0

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          {unreadCount > 0 && (
            <p className="text-sm text-gray-500 mt-0.5">{unreadCount} unread</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
            title="Refresh"
          >
            <RefreshCw size={16} className={isFetching ? 'animate-spin' : ''} />
          </button>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAll}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors"
            >
              <CheckCheck size={14} /> Mark all read
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1 mb-4 scrollbar-hide">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              activeTab === tab.value
                ? 'bg-brand-blue text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Notification List */}
      <div className="space-y-2">
        {/* Loading skeleton — only on initial load */}
        {isInitialLoading && (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-3 p-4 rounded-xl border border-gray-100 bg-white animate-pulse">
                <div className="w-10 h-10 rounded-full bg-gray-200 flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-100 rounded w-full" />
                  <div className="h-3 bg-gray-100 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Notification items */}
        <AnimatePresence initial={false}>
          {safeNotifications.map((notif) => (
            <motion.div
              key={notif.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              onClick={() => handleNotifClick(notif)}
              className={`flex gap-3 p-4 rounded-xl border cursor-pointer hover:shadow-sm transition-all group ${
                notif.status === 'UNREAD'
                  ? 'bg-blue-50/60 border-blue-100'
                  : 'bg-white border-gray-100'
              }`}
            >
              {/* Icon */}
              <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-lg ${TYPE_COLORS[notif.type] ?? 'bg-gray-100'}`}>
                {TYPE_ICONS[notif.type] ?? '🔔'}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className={`text-sm text-gray-800 leading-tight ${notif.status === 'UNREAD' ? 'font-semibold' : 'font-medium'}`}>
                    {notif.title}
                  </p>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {notif.status === 'UNREAD' && (
                      <span className="w-2 h-2 bg-blue-500 rounded-full" />
                    )}
                    <span className="text-[11px] text-gray-400 whitespace-nowrap">{timeAgo(notif.createdAt)}</span>
                  </div>
                </div>
                <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{notif.message}</p>
                {notif.category && (
                  <span className={`inline-block mt-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full ${TYPE_COLORS[notif.type] ?? 'bg-gray-100 text-gray-500'}`}>
                    {notif.category}
                  </span>
                )}
              </div>

              {/* Actions */}
              <div className="flex-shrink-0 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {notif.status === 'UNREAD' && (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleMarkRead(notif.id) }}
                    className="p-1.5 rounded-lg hover:bg-blue-100 text-blue-500 transition-colors"
                    title="Mark as read"
                  >
                    <Check size={13} />
                  </button>
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(notif.id) }}
                  className="p-1.5 rounded-lg hover:bg-red-100 text-red-400 transition-colors"
                  title="Delete"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Empty state */}
        {!isInitialLoading && safeNotifications.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <Bell size={48} className="mb-4 opacity-20" />
            <p className="text-base font-medium">No notifications</p>
            <p className="text-sm mt-1">
              {activeTab ? `No ${activeTab.toLowerCase()} notifications yet` : "You're all caught up!"}
            </p>
          </div>
        )}

        {/* Infinite scroll trigger */}
        <div ref={loaderRef} className="py-4 flex justify-center">
          {isFetching && safeNotifications.length > 0 && (
            <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          )}
          {!hasMore && safeNotifications.length > 0 && !isFetching && (
            <p className="text-xs text-gray-400">All notifications loaded</p>
          )}
        </div>
      </div>
    </div>
  )
}
