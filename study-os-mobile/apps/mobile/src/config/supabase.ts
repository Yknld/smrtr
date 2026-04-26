import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const SUPABASE_URL = 'https://redixnommutdtpmccpto.supabase.co';
/** Full URL to solver.html (interactive pages viewer). Host solver.html, homework-app.js, homework-styles.css in a public Supabase Storage bucket "solver" and set this to its solver.html URL. */
export const SOLVER_VIEWER_URL = 'https://redixnommutdtpmccpto.supabase.co/storage/v1/object/public/solver/solver.html';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJlZGl4bm9tbXV0ZHRwbWNjcHRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcxMzM4NzMsImV4cCI6MjA5MjcwOTg3M30.uLRxJKJduzcxYAvpwT5C8HJhYlPZ7KdYnTHbHi68zqY';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
