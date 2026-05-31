import { useSearchParams, useNavigate } from 'react-router-dom'

export default function Confirmation() {
  const [searchParams] = useSearchParams()
  const reservationId = searchParams.get('reservationId')
  const seatId = searchParams.get('seatId')
  const navigate = useNavigate()

  return (
    <div style={{ maxWidth: 500, margin: '100px auto', padding: 20, textAlign: 'center' }}>
      <h1 style={{ color: '#4CAF50' }}>Reservation Confirmed!</h1>
      <p>Reservation ID: {reservationId}</p>
      <p>Seat: #{seatId}</p>
      <button onClick={() => navigate('/seats')} style={{ padding: '10px 24px', marginTop: 20 }}>
        Back to Seats
      </button>
    </div>
  )
}