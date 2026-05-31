#!/bin/bash
# scripts/test-e2e.sh
# End-to-end test script for Seat Reservation Platform
# Usage: bash scripts/test-e2e.sh

BASE_URL="http://localhost:3000/api"
COOKIE_JAR="/tmp/seat-reservation-cookies.txt"

echo "============================================"
echo "  Seat Reservation Platform - E2E Test"
echo "============================================"
echo ""

# Clean up from previous runs
rm -f $COOKIE_JAR

# 1. Health Check
echo "1. Health Check"
curl -s "$BASE_URL/health" | python3 -m json.tool
echo ""

# 2. Register a new user
echo "2. Register user"
EMAIL="test-$(date +%s)@example.com"
PASSWORD="TestPass123!"
curl -s -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"$EMAIL\", \"password\": \"$PASSWORD\"}" | python3 -m json.tool
echo ""

# 3. Login
echo "3. Login"
curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -c $COOKIE_JAR \
  -d "{\"email\": \"$EMAIL\", \"password\": \"$PASSWORD\"}" | python3 -m json.tool
echo ""

# 4. Check auth status
echo "4. Get current user (auth check)"
curl -s "$BASE_URL/auth/me" -b $COOKIE_JAR | python3 -m json.tool
echo ""

# 5. Get seats
echo "5. Get available seats"
curl -s "$BASE_URL/seats" -b $COOKIE_JAR | python3 -m json.tool
echo ""

# 6. Process payment
echo "6. Process payment for seat 1"
PAYMENT_RESPONSE=$(curl -s -X POST "$BASE_URL/payment" \
  -H "Content-Type: application/json" \
  -b $COOKIE_JAR \
  -d '{"seatId": 1}')
echo "$PAYMENT_RESPONSE" | python3 -m json.tool

PAYMENT_ID=$(echo "$PAYMENT_RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin).get('paymentId', ''))")
echo "   Payment ID: $PAYMENT_ID"
echo ""

# 7. Finalize reservation
if [ -n "$PAYMENT_ID" ]; then
  echo "7. Finalize reservation"
  curl -s -X POST "$BASE_URL/reservation/finalize" \
    -H "Content-Type: application/json" \
    -b $COOKIE_JAR \
    -d "{\"seatId\": 1, \"paymentId\": \"$PAYMENT_ID\"}" | python3 -m json.tool
  echo ""
fi

# 8. Check seats again (seat 1 should now be unavailable)
echo "8. Get seats after reservation (seat 1 should be reserved)"
curl -s "$BASE_URL/seats" -b $COOKIE_JAR | python3 -m json.tool
echo ""

# 9. Attempt double booking (should fail with 409)
echo "9. Attempt double booking (should fail with 409)"
curl -s -X POST "$BASE_URL/reservation/finalize" \
  -H "Content-Type: application/json" \
  -b $COOKIE_JAR \
  -d "{\"seatId\": 1, \"paymentId\": \"$PAYMENT_ID\"}" | python3 -m json.tool
echo ""

# 10. Logout
echo "10. Logout"
curl -s -X POST "$BASE_URL/auth/logout" -b $COOKIE_JAR | python3 -m json.tool
echo ""

# 11. Verify session invalid after logout
echo "11. Access protected route after logout (should fail with 401)"
curl -s "$BASE_URL/auth/me" -b $COOKIE_JAR | python3 -m json.tool
echo ""

echo "============================================"
echo "  E2E Test Complete"
echo "============================================"