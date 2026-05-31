import { test, expect } from '@playwright/test'

test('full reservation flow', async ({ page }) => {
  await page.goto('http://localhost:5173/login')
  await page.fill('input[type="email"]', 'user@test.com')
  await page.fill('input[type="password"]', 'password123')
  await page.click('button[type="submit"]')
  await expect(page).toHaveURL('/seats')

  await page.click('button:has-text("Reserve")')
  await expect(page).toHaveURL(/\/checkout\?seatId=/)

  await page.click('button:has-text("Pay & Reserve")')
  await expect(page).toHaveURL(/\/confirmation/)
})