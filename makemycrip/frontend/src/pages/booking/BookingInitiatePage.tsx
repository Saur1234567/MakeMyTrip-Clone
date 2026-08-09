import { useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { motion } from 'framer-motion'
import {
  User, Mail, Phone, Calendar, Users, ChevronRight,
  Plus, Minus, Info, CheckCircle, AlertCircle, Coffee, Bike, Utensils, Car
} from 'lucide-react'
import { format, differenceInDays } from 'date-fns'
import { useSelector } from 'react-redux'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { RootState } from '@/store'
import { useGetAvailableRoomsQuery } from '@/store/api/hotelApi'
import { useInitiateBookingMutation } from '@/store/api/bookingApi'

// ─── Types ────────────────────────────────────────────────────────────────────

interface AddOn {
  type: string
  label: string
  description: string
  price: number
  icon: any
  unit: string
}

const ADD_ONS: AddOn[] = [
  { type: 'BREAKFAST', label: 'Breakfast', description: 'Continental breakfast for all guests', price: 350, icon: Coffee, unit: 'per person/night' },
  { type: 'AIRPORT_TRANSFER', label: 'Airport Transfer', description: 'One-way airport pickup/drop', price: 800, icon: Car, unit: 'per trip' },
  { type: 'BICYCLE_RENTAL', label: 'Bicycle Rental', description: 'Explore the city at your own pace', price: 200, icon: Bike, unit: 'per day' },
  { type: 'DINNER', label: 'Dinner', description: 'Set dinner for all guests', price: 600, icon: Utensils, unit: 'per person/night' },
]

const guestSchema = z.object({
  firstName: z.string().min(2, 'Min 2 characters'),
  lastName: z.string().min(1, 'Required'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().regex(/^[6-9]\d{9}$/, 'Invalid mobile').optional().or(z.literal('')),
  guestType: z.enum(['ADULT', 'CHILD', 'INFANT']),
  age: z.number().min(0).max(120).optional(),
})

const schema = z.object({
  primaryGuest: z.object({
    firstName: z.string().min(2, 'Min 2 characters'),
    lastName: z.string().min(1, 'Required'),
    email: z.string().email('Invalid email'),
    phone: z.string().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit mobile number'),
  }),
  additionalGuests: z.array(guestSchema).optional(),
  specialRequests: z.string().max(500).optional(),
  arrivalTime: z.string().optional(),
})

type FormData = z.infer<typeof schema>

// ─── Price Summary ────────────────────────────────────────────────────────────

function PriceSummary({ room, nights, adults, addOns }: {
  room: any
  nights: number
  adults: number
  addOns: { type: string; quantity: number }[]
}) {
  if (!room) return null

  const baseTotal = room.discountedPrice * nights
  const addOnTotal = addOns.reduce((sum, ao) => {
    const def = ADD_ONS.find(a => a.type === ao.type)
    if (!def || ao.quantity === 0) return sum
    const isPerPerson = def.unit.includes('person')
    const isPerDay = def.unit.includes('day') || def.unit.includes('night')
    let cost = def.price
    if (isPerPerson) cost *= adults
    if (isPerDay) cost *= nights
    return sum + cost * ao.quantity
  }, 0)

  const subTotal = baseTotal + addOnTotal
  // Use priceBreakdown.totalTax if available (from backend), otherwise fall back to 0
  const gst = (room.priceBreakdown?.totalTax ?? 0) * nights
  const convenienceFee = room.priceBreakdown?.convenienceFee ?? 99
  const total = subTotal + gst + convenienceFee

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 sticky top-24">
      <h3 className="font-bold text-gray-900 mb-4">Price Summary</h3>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between text-gray-600">
          <span>{room.name}</span>
          <span>₹{room.discountedPrice.toLocaleString('en-IN')} × {nights} nights</span>
        </div>
        <div className="flex justify-between font-medium text-gray-800">
          <span>Room total</span>
          <span>₹{baseTotal.toLocaleString('en-IN')}</span>
        </div>

        {addOnTotal > 0 && (
          <div className="flex justify-between text-gray-600">
            <span>Add-ons</span>
            <span>₹{addOnTotal.toLocaleString('en-IN')}</span>
          </div>
        )}

        <div className="border-t border-gray-100 pt-2 mt-2">
          <div className="flex justify-between text-gray-600">
            <span>Taxes & fees (GST)</span>
            <span>₹{gst.toLocaleString('en-IN')}</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>Convenience fee</span>
            <span>₹{convenienceFee}</span>
          </div>
        </div>

        <div className="border-t border-gray-200 pt-3 mt-2 flex justify-between font-black text-gray-900 text-base">
          <span>Total</span>
          <span>₹{total.toLocaleString('en-IN')}</span>
        </div>
      </div>

      <div className="mt-4 bg-green-50 rounded-lg p-3 text-xs text-green-700">
        <CheckCircle size={12} className="inline mr-1" />
        No payment required now. Pay at checkout.
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function BookingInitiatePage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const user = useSelector((s: RootState) => s.auth.user)

  const hotelId = searchParams.get('hotelId') || ''
  const roomTypeId = searchParams.get('roomTypeId') || ''
  const checkIn = searchParams.get('checkIn') || ''
  const checkOut = searchParams.get('checkOut') || ''
  const adults = Number(searchParams.get('adults') || 1)
  const nights = differenceInDays(new Date(checkOut), new Date(checkIn)) || 1

  const [selectedAddOns, setSelectedAddOns] = useState<{ type: string; quantity: number }[]>(
    ADD_ONS.map(a => ({ type: a.type, quantity: 0 }))
  )
  const [serverError, setServerError] = useState('')

  const { data: roomData } = useGetAvailableRoomsQuery(
    { hotelId, checkIn, checkOut, adults },
    { skip: !hotelId || !checkIn || !checkOut }
  )
  const [initiateBooking, { isLoading }] = useInitiateBookingMutation()

  const selectedRoom = roomData?.data?.find((r: any) => r.id === roomTypeId)

  const { register, control, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      primaryGuest: {
        firstName: user?.firstName || '',
        lastName: user?.lastName || '',
        email: user?.email || '',
        phone: user?.phone || '',
      },
      additionalGuests: adults > 1
        ? Array.from({ length: adults - 1 }, () => ({
            firstName: '', lastName: '', email: '', phone: '', guestType: 'ADULT' as const,
          }))
        : [],
    },
  })

  const { fields: guestFields } = useFieldArray({ control, name: 'additionalGuests' })

  const toggleAddOn = (type: string, delta: number) => {
    setSelectedAddOns(prev => prev.map(a =>
      a.type === type ? { ...a, quantity: Math.max(0, a.quantity + delta) } : a
    ))
  }

  const onSubmit = async (data: FormData) => {
    setServerError('')
    try {
      const activeAddOns = selectedAddOns
        .filter(a => a.quantity > 0)
        .map(a => ({ type: a.type, quantity: a.quantity }))

      const res = await initiateBooking({
        hotelId,
        roomTypeId,
        checkIn,
        checkOut,
        adults,
        primaryGuest: data.primaryGuest,
        additionalGuests: data.additionalGuests || [],
        specialRequests: data.specialRequests,
        arrivalTime: data.arrivalTime,
        addOns: activeAddOns,
      }).unwrap()

      navigate(`/booking/payment?bookingRef=${res.data.bookingRef}`)
    } catch (err: any) {
      setServerError(err?.data?.message || 'Could not initiate booking. Please try again.')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  return (
    <>
      <Helmet>
        <title>Complete Your Booking | MakeMyCrip</title>
      </Helmet>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Breadcrumb */}
        <nav className="text-xs text-gray-500 mb-6 flex items-center gap-1">
          <span>Search</span> <ChevronRight size={12} />
          <span>Hotel Details</span> <ChevronRight size={12} />
          <span className="text-gray-900 font-medium">Guest Details</span> <ChevronRight size={12} />
          <span>Payment</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

              {serverError && (
                <div className="flex items-center gap-2 bg-red-50 text-red-700 border border-red-200 rounded-xl px-4 py-3 text-sm">
                  <AlertCircle size={16} /> {serverError}
                </div>
              )}

              {/* Booking summary bar */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex flex-wrap gap-4 text-sm text-blue-800">
                {selectedRoom && <span className="font-semibold">{selectedRoom.name}</span>}
                <span className="flex items-center gap-1"><Calendar size={14} />
                  {format(new Date(checkIn), 'd MMM')} – {format(new Date(checkOut), 'd MMM yyyy')}
                </span>
                <span className="flex items-center gap-1"><Users size={14} /> {adults} adult{adults !== 1 ? 's' : ''}</span>
                <span>{nights} night{nights !== 1 ? 's' : ''}</span>
              </div>

              {/* Primary Guest */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <User size={18} className="text-brand-blue" /> Primary Guest
                </h2>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">First name *</label>
                    <input
                      {...register('primaryGuest.firstName')}
                      className={`w-full px-3 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue ${errors.primaryGuest?.firstName ? 'border-red-400' : 'border-gray-200'}`}
                    />
                    {errors.primaryGuest?.firstName && <p className="text-xs text-red-600 mt-1">{errors.primaryGuest.firstName.message}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Last name *</label>
                    <input
                      {...register('primaryGuest.lastName')}
                      className={`w-full px-3 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue ${errors.primaryGuest?.lastName ? 'border-red-400' : 'border-gray-200'}`}
                    />
                    {errors.primaryGuest?.lastName && <p className="text-xs text-red-600 mt-1">{errors.primaryGuest.lastName.message}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      <Mail size={13} className="inline mr-1" /> Email *
                    </label>
                    <input
                      {...register('primaryGuest.email')}
                      type="email"
                      className={`w-full px-3 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue ${errors.primaryGuest?.email ? 'border-red-400' : 'border-gray-200'}`}
                    />
                    {errors.primaryGuest?.email && <p className="text-xs text-red-600 mt-1">{errors.primaryGuest.email.message}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      <Phone size={13} className="inline mr-1" /> Mobile *
                    </label>
                    <div className="flex">
                      <span className="px-3 py-2.5 bg-gray-100 border border-r-0 border-gray-200 rounded-l-xl text-sm text-gray-600">+91</span>
                      <input
                        {...register('primaryGuest.phone')}
                        type="tel"
                        maxLength={10}
                        className={`flex-1 px-3 py-2.5 border rounded-r-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue ${errors.primaryGuest?.phone ? 'border-red-400' : 'border-gray-200'}`}
                      />
                    </div>
                    {errors.primaryGuest?.phone && <p className="text-xs text-red-600 mt-1">{errors.primaryGuest.phone.message}</p>}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Expected arrival time</label>
                  <select
                    {...register('arrivalTime')}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue bg-white"
                  >
                    <option value="">Select time (optional)</option>
                    {Array.from({ length: 24 }, (_, i) => {
                      const h = String(i).padStart(2, '0')
                      return <option key={h} value={`${h}:00`}>{h}:00</option>
                    })}
                  </select>
                </div>
              </div>

              {/* Additional Guests */}
              {guestFields.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                  <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Users size={18} className="text-brand-blue" /> Additional Guests
                  </h2>
                  <div className="space-y-6">
                    {guestFields.map((field, i) => (
                      <div key={field.id} className="border-b border-gray-100 pb-6 last:border-0 last:pb-0">
                        <p className="text-sm font-semibold text-gray-700 mb-3">Guest {i + 2}</p>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs text-gray-500 mb-1 block">First name *</label>
                            <input
                              {...register(`additionalGuests.${i}.firstName`)}
                              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-500 mb-1 block">Last name *</label>
                            <input
                              {...register(`additionalGuests.${i}.lastName`)}
                              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-500 mb-1 block">Guest type</label>
                            <select
                              {...register(`additionalGuests.${i}.guestType`)}
                              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue bg-white"
                            >
                              <option value="ADULT">Adult</option>
                              <option value="CHILD">Child</option>
                              <option value="INFANT">Infant</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Add-ons */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                <h2 className="font-bold text-gray-900 mb-1 flex items-center gap-2">
                  <Plus size={18} className="text-brand-blue" /> Add-ons & Services
                </h2>
                <p className="text-sm text-gray-500 mb-4">Enhance your stay with these optional services.</p>
                <div className="space-y-3">
                  {ADD_ONS.map(addOn => {
                    const current = selectedAddOns.find(a => a.type === addOn.type)?.quantity || 0
                    return (
                      <div key={addOn.type} className="flex items-center justify-between p-4 border border-gray-100 rounded-xl hover:border-brand-blue/30 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                            <addOn.icon size={18} className="text-brand-blue" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-800">{addOn.label}</p>
                            <p className="text-xs text-gray-500">{addOn.description}</p>
                            <p className="text-xs text-brand-blue font-medium mt-0.5">
                              ₹{addOn.price} {addOn.unit}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {current > 0 && (
                            <>
                              <button type="button" onClick={() => toggleAddOn(addOn.type, -1)}
                                className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50">
                                <Minus size={14} />
                              </button>
                              <span className="w-6 text-center font-semibold text-sm">{current}</span>
                            </>
                          )}
                          <button type="button" onClick={() => toggleAddOn(addOn.type, 1)}
                            className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                              current > 0 ? 'bg-brand-blue text-white hover:bg-blue-700' : 'border border-gray-200 hover:bg-gray-50'
                            }`}>
                            <Plus size={14} />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Special Requests */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                <h2 className="font-bold text-gray-900 mb-1 flex items-center gap-2">
                  <Info size={18} className="text-brand-blue" /> Special Requests
                </h2>
                <p className="text-xs text-gray-500 mb-3">Requests are not guaranteed but the hotel will try their best.</p>
                <textarea
                  {...register('specialRequests')}
                  rows={3}
                  maxLength={500}
                  placeholder="E.g. early check-in, high floor, away from elevator..."
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 bg-brand-red hover:bg-red-700 disabled:bg-red-300 text-white font-bold py-4 rounded-xl transition-colors text-base"
              >
                {isLoading ? (
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <> Proceed to Payment <ChevronRight size={18} /> </>
                )}
              </button>
            </form>
          </div>

          {/* Sidebar */}
          <div className="hidden lg:block">
            <PriceSummary room={selectedRoom} nights={nights} adults={adults} addOns={selectedAddOns} />
          </div>
        </div>
      </div>
    </>
  )
}
