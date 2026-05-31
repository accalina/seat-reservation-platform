#!/bin/bash
# scripts/load-test.sh
# Sends 10 concurrent reservation finalize requests for the same seat

SEAT_ID=3
BASE_URL="http://localhost:3000/api"

COOKIE=$(curl -s -c - -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"user@test.com","password":"password123"}' | grep sessionId)

for i in {1..10}; do
  curl -s -X POST "$BASE_URL/payment" \
    -H "Content-Type: application/json" \
    -b <(echo "$COOKIE") \
    -d "{\"seatId\": $SEAT_ID}" &
done
wait

echo "Check that only 1 reservation exists for seat $SEAT_ID"