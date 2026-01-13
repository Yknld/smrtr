import { supabase } from '../config/supabase';

export interface StudyPlan {
  id: string;
  user_id: string;
  course_id: string | null;
  title: string;
  timezone: string;
  is_enabled: boolean;
  created_at: string;
}

export interface StudyPlanRule {
  id: string;
  user_id: string;
  study_plan_id: string;
  rrule: string;
  start_time_local: string;
  duration_min: number;
  remind_before_min: number;
  created_at: string;
}

export interface StudyPlanWithRules {
  plan: StudyPlan;
  rules: StudyPlanRule[];
}

export interface CreateStudyPlanParams {
  title: string;
  courseId?: string | null;
  timezone?: string;
  isEnabled?: boolean;
  rules: {
    rrule: string;
    startTimeLocal: string;
    durationMin?: number;
    remindBeforeMin?: number;
  }[];
}

/**
 * Create or update a study plan with recurrence rules
 */
export async function upsertStudyPlan(
  params: CreateStudyPlanParams,
  planId?: string
): Promise<StudyPlanWithRules> {
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  
  if (sessionError) {
    console.error('[Schedule] Session error:', sessionError);
    throw new Error('Failed to get session');
  }
  
  if (!session) {
    console.error('[Schedule] No active session');
    throw new Error('User not authenticated. Please log in again.');
  }

  console.log('[Schedule] Creating study plan with user:', session.user?.id);

  // Get device timezone if not provided
  const timezone = params.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;

  const requestBody = {
    plan: {
      ...(planId && { id: planId }),
      title: params.title,
      course_id: params.courseId,
      timezone,
      is_enabled: params.isEnabled !== false,
    },
    rules: params.rules.map(rule => ({
      rrule: rule.rrule,
      start_time_local: rule.startTimeLocal,
      duration_min: rule.durationMin || 45,
      remind_before_min: rule.remindBeforeMin || 10,
    })),
  };

  console.log('[Schedule] Request body:', JSON.stringify(requestBody, null, 2));

  const response = await fetch(
    'https://euxfugfzmpsemkjpcpuz.supabase.co/functions/v1/study_plan_upsert',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV1eGZ1Z2Z6bXBzZW1ranBjcHV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgwMDkyMDYsImV4cCI6MjA4MzU4NTIwNn0.bsfC3T5WoUhGrS-6VuowULRHciY7BpzMCBQ3F4fZFRI',
      },
      body: JSON.stringify(requestBody),
    }
  );

  console.log('[Schedule] Response status:', response.status);

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[Schedule] Error response:', errorText);
    
    let errorData;
    try {
      errorData = JSON.parse(errorText);
    } catch (e) {
      errorData = { error: { message: errorText || 'Unknown error' } };
    }
    
    throw new Error(errorData.error?.message || `Failed to create study plan: ${response.status}`);
  }

  const data = await response.json();
  console.log('[Schedule] Success:', data);
  return data;
}

/**
 * Fetch all study plans for the current user
 */
export async function fetchStudyPlans(): Promise<StudyPlan[]> {
  const { data, error } = await supabase
    .from('study_plans')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch study plans: ${error.message}`);
  }

  return data || [];
}

/**
 * Fetch a single study plan with its rules
 */
export async function fetchStudyPlanWithRules(planId: string): Promise<StudyPlanWithRules | null> {
  // Fetch plan
  const { data: plan, error: planError } = await supabase
    .from('study_plans')
    .select('*')
    .eq('id', planId)
    .single();

  if (planError || !plan) {
    return null;
  }

  // Fetch rules
  const { data: rules, error: rulesError } = await supabase
    .from('study_plan_rules')
    .select('*')
    .eq('study_plan_id', planId)
    .order('created_at', { ascending: true });

  if (rulesError) {
    throw new Error(`Failed to fetch study plan rules: ${rulesError.message}`);
  }

  return {
    plan,
    rules: rules || [],
  };
}

/**
 * Delete a study plan (cascade deletes rules)
 */
export async function deleteStudyPlan(planId: string): Promise<void> {
  const { error } = await supabase
    .from('study_plans')
    .delete()
    .eq('id', planId);

  if (error) {
    throw new Error(`Failed to delete study plan: ${error.message}`);
  }
}

/**
 * Toggle a study plan's enabled status
 */
export async function toggleStudyPlan(planId: string, isEnabled: boolean): Promise<void> {
  const { error } = await supabase
    .from('study_plans')
    .update({ is_enabled: isEnabled })
    .eq('id', planId);

  if (error) {
    throw new Error(`Failed to update study plan: ${error.message}`);
  }
}

/**
 * Helper: Build RRULE string from day selection
 * @param days Array of day numbers (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
 * @returns RRULE string (e.g., "FREQ=WEEKLY;BYDAY=MO,WE,FR")
 */
export function buildRRule(days: number[]): string {
  if (days.length === 0) {
    return 'FREQ=DAILY';
  }

  if (days.length === 7) {
    return 'FREQ=DAILY';
  }

  // Convert day numbers to RRULE day codes
  const dayMap: { [key: number]: string } = {
    0: 'SU',
    1: 'MO',
    2: 'TU',
    3: 'WE',
    4: 'TH',
    5: 'FR',
    6: 'SA',
  };

  const dayCodes = days.map(d => dayMap[d]).join(',');
  return `FREQ=WEEKLY;BYDAY=${dayCodes}`;
}

/**
 * Helper: Parse RRULE to extract selected days
 * @param rrule RRULE string (e.g., "FREQ=WEEKLY;BYDAY=MO,WE,FR")
 * @returns Array of day numbers (0-6)
 */
export function parseRRule(rrule: string): number[] {
  if (rrule === 'FREQ=DAILY') {
    return [0, 1, 2, 3, 4, 5, 6];
  }

  const match = rrule.match(/BYDAY=([A-Z,]+)/);
  if (!match) {
    return [];
  }

  const dayCodes = match[1].split(',');
  const codeMap: { [key: string]: number } = {
    'SU': 0,
    'MO': 1,
    'TU': 2,
    'WE': 3,
    'TH': 4,
    'FR': 5,
    'SA': 6,
  };

  return dayCodes.map(code => codeMap[code]).filter(d => d !== undefined);
}
