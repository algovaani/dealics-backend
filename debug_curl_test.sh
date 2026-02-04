#!/bin/bash

# Debug test script for additional_images upload
# Replace these variables with your actual values

BASE_URL="http://localhost:3000"
CARD_ID="1521"
JWT_TOKEN="YOUR_JWT_TOKEN_HERE"

echo "=== DEBUG TEST: Additional Images Upload ==="
echo "This will help you see what's happening in the server logs"
echo ""

echo "1. Testing with text filename..."
curl -X PUT "${BASE_URL}/api/user/tradingcards/${CARD_ID}" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "additional_images": "test-image.jpg"
  }' \
  -v

echo ""
echo "2. Testing with file upload..."
# Create a dummy file for testing
echo "dummy image content" > test-image.jpg

curl -X PUT "${BASE_URL}/api/user/tradingcards/${CARD_ID}" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -F "additional_images=@test-image.jpg" \
  -v

# Clean up
rm -f test-image.jpg

echo ""
echo "=== CHECK YOUR SERVER LOGS ==="
echo "Look for these debug messages:"
echo "- [DEBUG CONTROLLER UPDATE] Starting file processing..."
echo "- [DEBUG CONTROLLER UPDATE] Final additional images array..."
echo "- [DEBUG CONTROLLER UPDATE] About to call service..."
echo "- [DEBUG SERVICE UPDATE] Starting updateTradingCard..."
echo "- [DEBUG SERVICE] Existing images..."
echo "- [DEBUG SERVICE] Using new images..."
echo "- [DEBUG SERVICE] Created card image record..."
