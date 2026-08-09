import { useState, useEffect, useRef, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Bell, BellRing, Check, CheckCheck, Trash2, ExternalLink, X } from 'lucide-react'
import { useSelector } from 'react-redux'
import { RootState } from '@/store'
import { motion, AnimatePresence } from 'framer-motion'
import {
  useGetUnreadCountQuery,
  useGetNotificationsQuery,
  useMarkReadMutation,
  useMarkAllReadMutation,
  useDeleteNotificationMutation,
  NotificationDto,
} from '@/store/api/notificationApi'

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
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

export default function NotificationBell() {
  const { isAuthenticated, accessToken, user } = useSelector((s: RootState) => s.auth)
  const [open, setOpen] = useState(false)
  const [wsNotifications, setWsNotifications] = useState<NotificationDto[]>([])
  const panelRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  const { data: unreadData, refetch: refetchCount } = useGetUnreadCountQuery(undefined, {
    skip: !isAuthenticated,
    pollingInterval: 60000,
  })
  const { data: notifPage } = useGetNotificationsQuery(
    { page: 0, size: 10 },
    { skip: !isAuthenticated || !open }
  )

  const [markRead] = useMarkReadMutation()
  const [markAllRead] = useMarkAllReadMutation()
  const [deleteNotif] = useDeleteNotificationMutation()

  // Merge WS real-time notifications with fetched ones (deduplicated)
  const notifications: NotificationDto[] = (() => {
    const fetched = notifPage?.content ?? []
    const ids = new Set(fetched.map((n) => n.id))
    const extra = wsNotifications.filter((n) => !ids.has(n.id))
    return [...extra, ...fetched]
  })()

  const unreadCount = (unreadData?.count ?? 0) + wsNotifications.filter((n) => n.status === 'UNREAD').length

  // WebSocket connection — dynamically imported to avoid CJS/ESM issues with sockjs-client
  useEffect(() => {
    if (!isAuthenticated || !accessToken || !user?.id) return

    let client: any = null
    let cancelled = false

    const connect = async () => {
      try {
        const { Client } = await import('@stomp/stompjs')
        const SockJS = (await import('sockjs-client')).default

        if (cancelled) return

        client = new Client({
          webSocketFactory: () => new SockJS('/ws'),
          connectHeaders: { Authorization: `Bearer ${accessToken}` },
          reconnectDelay: 5000,
          onConnect: () => {
            if (cancelled) return
            client.subscribe(`/user/${user.id}/queue/notifications`, (msg: any) => {
              try {
                const notif: NotificationDto = JSON.parse(msg.body)
                setWsNotifications((prev) => [notif, ...prev.slice(0, 49)])
                refetchCount()
              } catch {
                // ignore parse errors
              }
            })
          },
          onStompError: () => {
            // silently ignore STOMP errors — notifications still work via polling
          },
        })

        client.activate()
      } catch {
        // WebSocket unavailable — fall back to polling only
      }
    }

    connect()

    return () => {
      cancelled = true
      if (client) {
        try { client.deactivate() } catch { /* ignore */ }
      }
    }
  }, [isAuthenticated, accessToken, user?.id])

  // Close panel on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleOpen = () => {
    setOpen((v) => !v)
  }

  const handleMarkRead = useCallback(async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    await markRead(id)
    setWsNotifications((prev) => prev.map((n) => n.id === id ? { ...n, status: 'READ' } : n))
    refetchCount()
  }, [markRead, refetchCount])

  const handleDelete = useCallback(async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    await deleteNotif(id)
    setWsNotifications((prev) => prev.filter((n) => n.id !== id))
    refetchCount()
  }, [deleteNotif, refetchCount])

  const handleMarkAll = async () => {
    await markAllRead()
    setWsNotifications((prev) => prev.map((n) => ({ ...n, status: 'READ' as const })))
    refetchCount()
  }

  const handleNotifClick = (notif: NotificationDto) => {
    if (notif.status === 'UNREAD') markRead(notif.id)
    setWsNotifications((prev) => prev.map((n) => n.id === notif.id ? { ...n, status: 'READ' } : n))
    setOpen(false)
    if (notif.actionUrl) navigate(notif.actionUrl)
  }

  if (!isAuthenticated) return null

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell Button */}
      <button
        onClick={handleOpen}
        className="relative flex items-center justify-center w-9 h-9 rounded-full hover:bg-white/10 transition-colors"
        aria-label="Notifications"
      >
        {unreadCount > 0 ? (
          <BellRing size={20} className="text-white" />
        ) : (
          <Bell size={20} className="text-white/80" />
        )}
        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.span
              key="badge"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      {/* Dropdown Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="panel"
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-[360px] bg-white rounded-xl shadow-2xl border border-gray-100 z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
              <span className="font-semibold text-gray-800 text-sm">Notifications</span>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAll}
                    className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
                    title="Mark all as read"
                  >
                    <CheckCheck size={13} /> All read
                  </button>
                )}
                <Link
                  to="/user/notifications"
                  onClick={() => setOpen(false)}
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                >
                  See all
                </Link>
                <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600 ml-1">
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* List */}
            <div className="max-h-[420px] overflow-y-auto divide-y divide-gray-50">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                  <Bell size={32} className="mb-3 opacity-30" />
                  <p className="text-sm font-medium">No notifications yet</p>
                  <p className="text-xs mt-1">We'll notify you about bookings, offers & more</p>
                </div>
              ) : (
                notifications.slice(0, 10).map((notif) => (
                  <div
                    key={notif.id}
                    onClick={() => handleNotifClick(notif)}
                    className={`flex gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors group ${
                      notif.status === 'UNREAD' ? 'bg-blue-50/40' : ''
                    }`}
                  >
                    {/* Icon */}
                    <div className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-base ${TYPE_COLORS[notif.type] ?? 'bg-gray-100'}`}>
                      {TYPE_ICONS[notif.type] ?? '🔔'}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-1">
                        <p className={`text-sm font-medium text-gray-800 leading-tight truncate ${notif.status === 'UNREAD' ? 'font-semibold' : ''}`}>
                          {notif.title}
                        </p>
                        {notif.status === 'UNREAD' && (
                          <span className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full mt-1" />
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{notif.message}</p>
                      <p className="text-[11px] text-gray-400 mt-1">{timeAgo(notif.createdAt)}</p>
                    </div>

                    {/* Actions */}
                    <div className="flex-shrink-0 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {notif.status === 'UNREAD' && (
                        <button
                          onClick={(e) => handleMarkRead(notif.id, e)}
                          className="p-1 rounded hover:bg-blue-100 text-blue-500"
                          title="Mark as read"
                        >
                          <Check size={12} />
                        </button>
                      )}
                      <button
                        onClick={(e) => handleDelete(notif.id, e)}
                        className="p-1 rounded hover:bg-red-100 text-red-400"
                        title="Delete"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="border-t border-gray-100 px-4 py-2.5 bg-gray-50">
                <Link
                  to="/user/notifications"
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
                >
                  <ExternalLink size={12} /> View all notifications
                </Link>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
