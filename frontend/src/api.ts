const BASE_URL = '/api'

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  const data = await response.json()

  if (!response.ok) {
    if (response.status === 401) {
      window.dispatchEvent(new CustomEvent('auth:expired'))
    }
    throw new Error(data.error || `Request failed: ${response.status}`)
  }

  return data
}

export const login = (email: string, password: string) =>
  request<{ user: { id: string; email: string } }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })

export const register = (email: string, password: string) =>
  request<{ userId: string }>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })

export const getMe = () =>
  request<{ user: { id: string; email: string } }>('/auth/me')

export const logout = () =>
  request<{ message: string }>('/auth/logout', { method: 'POST' })

export const getSeats = () =>
  request<Array<{ id: number; label: string; available: boolean }>>('/seats')

export const processPayment = (seatId: number) =>
  request<{ paymentId: string; status: string }>('/payment', {
    method: 'POST',
    body: JSON.stringify({ seatId }),
  })

export const finalizeReservation = (seatId: number, paymentId: string) =>
  request<{ id: string; status: string }>('/reservation/finalize', {
    method: 'POST',
    body: JSON.stringify({ seatId, paymentId }),
  })