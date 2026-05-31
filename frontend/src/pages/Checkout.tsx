import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { processPayment, finalizeReservation } from '../api'

export default function Checkout() {
  const [searchParams] = useSearchParams()
  const seatId = Number(searchParams.get('seatId'))
  const [status, setStatus] = useState<'idle' | 'paying' | 'finalizing' | 'error'>('idle')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handlePay = async () => {
    if (!seatId) {
      setError('No seat selected')
      return
    }

    setStatus('paying')
    setError('')

    try {
      const paymentResult = await processPayment(seatId)

      if (paymentResult.status !== 'succeeded') {
        setStatus('error')
        setError('Payment failed. Please try again.')
        return
      }

      setStatus('finalizing')
      const reservation = await finalizeReservation(seatId, paymentResult.paymentId)

      navigate(`/confirmation?reservationId=${reservation.id}&seatId=${seatId}`)
    } catch (err: any) {
      setStatus('error')
      if (err.message?.includes('already reserved')) {
        setError('Sorry, this seat was just taken by another user.')
      } else {
        setError(err.message || 'An error occurred')
      }
    }
  }

  return (
    <div style={{ maxWidth: 500, margin: '100px auto', padding: 20, textAlign: 'center' }}>
      <h1>Checkout</h1>
      <p>Seat #{seatId}</p>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <button
        onClick={handlePay}
        disabled={status === 'paying' || status === 'finalizing'}
        style={{ padding: '12px 32px', fontSize: 16 }}
      >
        {status === 'paying' ? 'Processing Payment...' :
         status === 'finalizing' ? 'Finalizing Reservation...' :
         'Pay & Reserve'}
      </button>
    </div>
  )
}