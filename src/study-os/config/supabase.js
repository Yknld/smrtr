/**
 * Supabase client for Study OS web.
 * Uses localStorage for auth persistence (no AsyncStorage on web).
 * Mirror: study-os-mobile/apps/mobile/src/config/supabase.ts
 */
import { createClient } from '@supabase/supabase-js'

export const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || 'https://euxfugfzmpsemkjpcpuz.supabase.co'
export const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV1eGZ1Z2Z6bXBzZW1ranBjcHV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgwMDkyMDYsImV4cCI6MjA4MzU4NTIwNn0.bsfC3T5WoUhGrS-6VuowULRHciY7BpzMCBQ3F4fZFRI'

/** Full URL to solver.html (interactive pages viewer). */
export const SOLVER_VIEWER_URL =
  import.meta.env.VITE_SOLVER_VIEWER_URL ||
  'https://euxfugfzmpsemkjpcpuz.supabase.co/storage/v1/object/public/solver/solver.html'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: window.localStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
})
