import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getSeats } from '../api'

interface Seat {
  id: number
  label: string
  available: boolean
}

export default function Seats() {
  const [seats, setSeats] = useState<Seat[]>([])
  const [loading, setLoading] = useState(true)
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    getSeats()
      .then(setSeats)
      .finally(() => setLoading(false))
  }, [])

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  if (loading) return <p>Loading seats...</p>

  return (
    <div style={{ maxWidth: 600, margin: '50px auto', padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1>Available Seats</h1>
        <div>
          <span style={{ marginRight: 16 }}>{user?.email}</span>
          <button onClick={handleLogout}>Logout</button>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        {seats.map((seat) => (
          <div
            key={seat.id}
            style={{
              border: '2px solid',
              borderColor: seat.available ? '#4CAF50' : '#f44336',
              borderRadius: 8,
              padding: 24,
              textAlign: 'center',
              backgroundColor: seat.available ? '#e8f5e9' : '#ffebee',
            }}
          >
            <h3>{seat.label}</h3>
            <p>{seat.available ? 'Available' : 'Reserved'}</p>
            {seat.available && (
              <button
                onClick={() => navigate(`/checkout?seatId=${seat.id}`)}
                style={{ padding: '8px 16px' }}
              >
                Reserve
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}