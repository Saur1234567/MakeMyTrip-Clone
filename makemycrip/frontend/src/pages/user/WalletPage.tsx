import { useEffect, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { Wallet, Gift, TrendingUp, Clock, Loader2 } from 'lucide-react'
import { format } from 'date-fns'
import { useSelector } from 'react-redux'
import { RootState } from '@/store'
import axiosInstance from '@/lib/axios'

export default function WalletPage() {
  const user = useSelector((s: RootState) => s.auth.user)
  const [transactions, setTransactions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    axiosInstance.get('/api/v1/users/loyalty/transactions').then(r => {
      // Backend returns { currentPoints, tier, transactions: [] }
      const data = r.data.data
      setTransactions(Array.isArray(data) ? data : (data?.transactions || []))
    }).finally(() => setLoading(false))
  }, [])

  const points = user?.loyaltyPoints ?? 0

  const TIER_BENEFITS: Record<string, string[]> = {
    BRONZE: ['Earn 1 point per ₹100 spent', 'Birthday bonus points'],
    SILVER: ['3% discount on bookings', 'Priority support', 'Early check-in (subject to availability)'],
    GOLD: ['7% discount on bookings', 'Free room upgrade (subject to availability)', 'Late checkout'],
    PLATINUM: ['12% discount on bookings', 'Guaranteed room upgrade', 'Lounge access', 'Dedicated concierge'],
  }

  const tier = user?.loyaltyTier || 'BRONZE'
  const benefits = TIER_BENEFITS[tier] || TIER_BENEFITS.BRONZE

  return (
    <>
      <Helmet><title>Loyalty Points | MakeMyCrip</title></Helmet>
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Gift size={22} className="text-brand-blue" /> Loyalty Points
        </h1>

        {/* Points card */}
        <div className="bg-gradient-to-br from-brand-blue to-blue-800 rounded-2xl p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-blue-200 text-sm">Total Points</p>
              <p className="text-4xl font-black">{points.toLocaleString('en-IN')}</p>
            </div>
            <div className="text-right">
              <p className="text-blue-200 text-xs mb-1">Tier</p>
              <span className="bg-white/20 px-3 py-1 rounded-full text-sm font-bold capitalize">{tier}</span>
            </div>
          </div>
          <p className="text-blue-200 text-xs">1 point = ₹0.50 value · Redeem during checkout</p>
        </div>

        {/* Benefits */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <h2 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
            <TrendingUp size={16} className="text-brand-blue" /> Your {tier} Benefits
          </h2>
          <ul className="space-y-2">
            {benefits.map((b, i) => (
              <li key={i} className="flex items-center gap-2 text-sm text-gray-700">
                <div className="w-4 h-4 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                </div>
                {b}
              </li>
            ))}
          </ul>
        </div>

        {/* Transactions */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Clock size={16} className="text-brand-blue" /> Points History
          </h2>

          {loading && <div className="flex justify-center py-8"><Loader2 size={24} className="animate-spin text-brand-blue" /></div>}

          {!loading && transactions.length === 0 && (
            <p className="text-center text-gray-400 py-8 text-sm">No transactions yet. Start booking to earn points!</p>
          )}

          <div className="space-y-2">
            {transactions.map((tx: any, i: number) => (
              <div key={i} className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${tx.points > 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                    {tx.points > 0 ? <TrendingUp size={14} className="text-green-600" /> : <Wallet size={14} className="text-red-600" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">{tx.description}</p>
                    <p className="text-xs text-gray-400">{format(new Date(tx.createdAt), 'd MMM yyyy')}</p>
                  </div>
                </div>
                <span className={`text-sm font-bold ${tx.points > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {tx.points > 0 ? '+' : ''}{tx.points} pts
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
