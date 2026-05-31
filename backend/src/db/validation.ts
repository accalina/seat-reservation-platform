import { z } from 'zod'

export const insertUserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  passwordHash: z.string().min(1),
})

export const insertReservationSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  seatId: z.number().int().gt(0),
  status: z.enum(['confirmed', 'cancelled']),
  paymentId: z.string().uuid().optional(),
})