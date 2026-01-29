#!/bin/bash
# Check OpenHand conversation status
# Usage: ./check_openhand_status.sh <conversation_id>

CONVERSATION_ID="${1:-ff8780368fc446f69e13c30af56cd3b3}"
OPENHAND_API_KEY="${OPENHAND_API_KEY}"

if [ -z "$OPENHAND_API_KEY" ]; then
  echo "Error: OPENHAND_API_KEY environment variable not set"
  echo "Set it with: export OPENHAND_API_KEY='your-key'"
  exit 1
fi

echo "Checking OpenHand conversation: $CONVERSATION_ID"
echo ""

curl -X GET "https://app.all-hands.dev/api/conversations/$CONVERSATION_ID" \
  -H "Authorization: Bearer $OPENHAND_API_KEY" \
  -H "Content-Type: application/json" \
  | jq '.'
