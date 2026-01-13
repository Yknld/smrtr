#!/bin/bash
# Test if we can call with service key directly

SUPABASE_URL="https://euxfugfzmpsemkjpcpuz.supabase.co"

echo "Checking if we can list secrets..."
supabase secrets list 2>&1 | head -10
