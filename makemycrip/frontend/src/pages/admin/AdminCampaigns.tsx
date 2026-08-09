import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Send, X, ChevronDown, ChevronUp, Megaphone, Clock, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import {
  useGetCampaignsQuery,
  useCreateCampaignMutation,
  useSendCampaignMutation,
  useCancelCampaignMutation,
  CampaignDto,
} from '@/store/api/notificationApi'
import toast from '@/hooks/useToast'

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  subject: z.string().min(1, 'Subject is required'),
  body: z.string().min(10, 'Body must be at least 10 characters'),
  ctaText: z.string().optional(),
  ctaUrl: z.string().optional(),
  discountCode: z.string().optional(),
  expiresAt: z.string().optional(),
  targetType: z.enum(['ALL', 'BY_CITY', 'BY_USER_ID', 'CONDITION_BASED']),
  targetCities: z.string().optional(),
  targetUserIds: z.string().optional(),
  targetCondition: z.string().optional(),
  conditionValue: z.string().optional(),
  scheduledAt: z.string().optional(),
})

type FormData = z.infer<typeof schema>

const STATUS_BADGE: Record<string, { color: string; icon: React.ReactNode }> = {
  DRAFT: { color: 'bg-gray-100 text-gray-600', icon: <Clock size={12} /> },
  SCHEDULED: { color: 'bg-blue-100 text-blue-700', icon: <Clock size={12} /> },
  SENDING: { color: 'bg-yellow-100 text-yellow-700', icon: <Loader2 size={12} className="animate-spin" /> },
  SENT: { color: 'bg-green-100 text-green-700', icon: <CheckCircle size={12} /> },
  CANCELLED: { color: 'bg-red-100 text-red-600', icon: <XCircle size={12} /> },
}

function CampaignCard({ campaign, onSend, onCancel }: {
  campaign: CampaignDto
  onSend: (id: string) => void
  onCancel: (id: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const badge = STATUS_BADGE[campaign.status] ?? STATUS_BADGE.DRAFT

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 bg-brand-blue/10 rounded-lg flex items-center justify-center flex-shrink-0">
            <Megaphone size={16} className="text-brand-blue" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-gray-800 text-sm truncate">{campaign.name}</p>
            <p className="text-xs text-gray-500 truncate">{campaign.subject}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
          <span className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${badge.color}`}>
            {badge.icon} {campaign.status}
          </span>
          {campaign.totalSent != null && campaign.totalSent > 0 && (
            <span className="text-xs text-gray-400">{campaign.totalSent} sent</span>
          )}
          {expanded ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 border-t border-gray-100 pt-3 space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-xs text-gray-400 font-medium uppercase tracking-wide">Target</span>
                  <p className="text-gray-700 mt-0.5">{campaign.targetType}
                    {campaign.targetCities && <span className="text-gray-500"> · {campaign.targetCities}</span>}
                    {campaign.targetCondition && <span className="text-gray-500"> · {campaign.targetCondition}</span>}
                  </p>
                </div>
                {campaign.discountCode && (
                  <div>
                    <span className="text-xs text-gray-400 font-medium uppercase tracking-wide">Coupon</span>
                    <p className="font-mono font-bold text-orange-600 mt-0.5">{campaign.discountCode}</p>
                  </div>
                )}
                {campaign.scheduledAt && (
                  <div>
                    <span className="text-xs text-gray-400 font-medium uppercase tracking-wide">Scheduled</span>
                    <p className="text-gray-700 mt-0.5">{new Date(campaign.scheduledAt).toLocaleString('en-IN')}</p>
                  </div>
                )}
                {campaign.sentAt && (
                  <div>
                    <span className="text-xs text-gray-400 font-medium uppercase tracking-wide">Sent At</span>
                    <p className="text-gray-700 mt-0.5">{new Date(campaign.sentAt).toLocaleString('en-IN')}</p>
                  </div>
                )}
              </div>

              <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600 whitespace-pre-wrap line-clamp-4">
                {campaign.body}
              </div>

              <div className="flex gap-2">
                {(campaign.status === 'DRAFT' || campaign.status === 'SCHEDULED') && (
                  <button
                    onClick={() => onSend(campaign.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-blue text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                  >
                    <Send size={13} /> Send Now
                  </button>
                )}
                {campaign.status !== 'SENT' && campaign.status !== 'CANCELLED' && campaign.status !== 'SENDING' && (
                  <button
                    onClick={() => onCancel(campaign.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors"
                  >
                    <X size={13} /> Cancel
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function AdminCampaigns() {
  const [showForm, setShowForm] = useState(false)
  const [page, setPage] = useState(0)

  const { data, isLoading, refetch } = useGetCampaignsQuery({ page, size: 20 })
  const [createCampaign, { isLoading: creating }] = useCreateCampaignMutation()
  const [sendCampaign] = useSendCampaignMutation()
  const [cancelCampaign] = useCancelCampaignMutation()

  const { register, handleSubmit, watch, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { targetType: 'ALL' },
  })

  const targetType = watch('targetType')
  const targetCondition = watch('targetCondition')

  const onSubmit = async (data: FormData) => {
    try {
      await createCampaign({
        ...data,
        expiresAt: data.expiresAt || undefined,
        scheduledAt: data.scheduledAt || undefined,
      }).unwrap()
      toast.success('Campaign created!')
      reset()
      setShowForm(false)
      refetch()
    } catch {
      toast.error('Failed to create campaign')
    }
  }

  const handleSend = async (id: string) => {
    try {
      await sendCampaign(id).unwrap()
      toast.success('Campaign sent!')
      refetch()
    } catch {
      toast.error('Failed to send campaign')
    }
  }

  const handleCancel = async (id: string) => {
    try {
      await cancelCampaign(id).unwrap()
      toast.success('Campaign cancelled')
      refetch()
    } catch {
      toast.error('Failed to cancel campaign')
    }
  }

  const campaigns: CampaignDto[] = data?.content ?? []

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Promotional Campaigns</h1>
          <p className="text-sm text-gray-500 mt-0.5">Create and manage email + in-app campaigns</p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-2 px-4 py-2 bg-brand-blue text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          {showForm ? <X size={16} /> : <Plus size={16} />}
          {showForm ? 'Cancel' : 'New Campaign'}
        </button>
      </div>

      {/* Create Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mb-6"
          >
            <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
              <h2 className="font-semibold text-gray-800 text-lg">Create Campaign</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Campaign Name *</label>
                  <input {...register('name')} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue" placeholder="Summer Sale 2025" />
                  {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email Subject *</label>
                  <input {...register('subject')} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue" placeholder="Exclusive offer just for you!" />
                  {errors.subject && <p className="text-red-500 text-xs mt-1">{errors.subject.message}</p>}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Message Body *</label>
                <textarea {...register('body')} rows={4} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue resize-none" placeholder="Write your campaign message here..." />
                {errors.body && <p className="text-red-500 text-xs mt-1">{errors.body.message}</p>}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">CTA Button Text</label>
                  <input {...register('ctaText')} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue" placeholder="Book Now" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">CTA URL</label>
                  <input {...register('ctaUrl')} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue" placeholder="/hotels/search" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Discount Code</label>
                  <input {...register('discountCode')} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-blue uppercase" placeholder="SAVE20" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Offer Expires At</label>
                  <input type="datetime-local" {...register('expiresAt')} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Schedule Send At (leave blank to save as draft)</label>
                  <input type="datetime-local" {...register('scheduledAt')} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue" />
                </div>
              </div>

              {/* Target Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Target Audience *</label>
                <select {...register('targetType')} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue">
                  <option value="ALL">All Users</option>
                  <option value="BY_CITY">By City (users who booked in specific cities)</option>
                  <option value="BY_USER_ID">By User IDs (comma-separated)</option>
                  <option value="CONDITION_BASED">Condition Based</option>
                </select>
              </div>

              {targetType === 'BY_CITY' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cities (comma-separated)</label>
                  <input {...register('targetCities')} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue" placeholder="Mumbai, Delhi, Bangalore" />
                </div>
              )}

              {targetType === 'BY_USER_ID' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">User IDs (comma-separated UUIDs)</label>
                  <textarea {...register('targetUserIds')} rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-blue resize-none" placeholder="uuid1, uuid2, uuid3" />
                </div>
              )}

              {targetType === 'CONDITION_BASED' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Condition</label>
                    <select {...register('targetCondition')} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue">
                      <option value="">Select condition</option>
                      <option value="RETURNING_CUSTOMER">Returning Customers (2+ bookings)</option>
                      <option value="NEVER_BOOKED">Never Booked</option>
                      <option value="INACTIVE_X_DAYS">Inactive for X days</option>
                      <option value="UPCOMING_CHECKIN">Upcoming Check-in (next X days)</option>
                    </select>
                  </div>
                  {(targetCondition === 'INACTIVE_X_DAYS' || targetCondition === 'UPCOMING_CHECKIN') && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {targetCondition === 'INACTIVE_X_DAYS' ? 'Days inactive' : 'Days ahead'}
                      </label>
                      <input type="number" {...register('conditionValue')} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue" placeholder="30" min="1" />
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={creating}
                  className="flex items-center gap-2 px-5 py-2 bg-brand-blue text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-60"
                >
                  {creating ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
                  {creating ? 'Creating...' : 'Create Campaign'}
                </button>
                <button
                  type="button"
                  onClick={() => { reset(); setShowForm(false) }}
                  className="px-5 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Campaign List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : campaigns.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <Megaphone size={48} className="mb-4 opacity-20" />
          <p className="text-base font-medium">No campaigns yet</p>
          <p className="text-sm mt-1">Create your first promotional campaign above</p>
        </div>
      ) : (
        <div className="space-y-3">
          {campaigns.map((campaign) => (
            <CampaignCard
              key={campaign.id}
              campaign={campaign}
              onSend={handleSend}
              onCancel={handleCancel}
            />
          ))}

          {/* Pagination */}
          {data && data.totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 pt-4">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors"
              >
                Previous
              </button>
              <span className="text-sm text-gray-500">Page {page + 1} of {data.totalPages}</span>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= data.totalPages - 1}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
