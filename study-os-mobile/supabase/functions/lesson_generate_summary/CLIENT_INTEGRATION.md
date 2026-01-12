# Client Integration: lesson_generate_summary

Quick reference for integrating the `lesson_generate_summary` Edge Function into mobile/web clients.

---

## TypeScript/React Native Example

### Basic Usage

```typescript
import { supabase } from './supabaseClient';

interface GenerateSummaryRequest {
  lesson_id: string;
  tone?: 'casual' | 'exam' | 'deep';
  length?: 'short' | 'medium' | 'long';
}

interface SummaryResponse {
  output_id: string;
  summary: string;
  key_concepts: string[];
  example_questions: string[];
  metadata: {
    content_source: string;
    content_length: number;
    tone: string;
    length: string;
  };
}

async function generateLessonSummary(
  lessonId: string,
  tone: 'casual' | 'exam' | 'deep' = 'casual',
  length: 'short' | 'medium' | 'long' = 'medium'
): Promise<SummaryResponse> {
  const { data: session } = await supabase.auth.getSession();
  
  if (!session?.session) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(
    `${process.env.SUPABASE_URL}/functions/v1/lesson_generate_summary`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        lesson_id: lessonId,
        tone,
        length,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to generate summary');
  }

  return response.json();
}

// Usage
try {
  const summary = await generateLessonSummary(
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'casual',
    'medium'
  );
  
  console.log('Summary:', summary.summary);
  console.log('Key Concepts:', summary.key_concepts);
  console.log('Questions:', summary.example_questions);
} catch (error) {
  console.error('Error:', error.message);
}
```

---

## React Hook

```typescript
import { useState } from 'react';
import { supabase } from './supabaseClient';

interface UseLessonSummaryResult {
  summary: SummaryResponse | null;
  loading: boolean;
  error: string | null;
  generateSummary: (
    lessonId: string,
    tone?: 'casual' | 'exam' | 'deep',
    length?: 'short' | 'medium' | 'long'
  ) => Promise<void>;
  clearError: () => void;
}

export function useLessonSummary(): UseLessonSummaryResult {
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateSummary = async (
    lessonId: string,
    tone: 'casual' | 'exam' | 'deep' = 'casual',
    length: 'short' | 'medium' | 'long' = 'medium'
  ) => {
    setLoading(true);
    setError(null);

    try {
      const { data: session } = await supabase.auth.getSession();
      
      if (!session?.session) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(
        `${process.env.SUPABASE_URL}/functions/v1/lesson_generate_summary`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ lesson_id: lessonId, tone, length }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate summary');
      }

      const data = await response.json();
      setSummary(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const clearError = () => setError(null);

  return { summary, loading, error, generateSummary, clearError };
}

// Usage in component
function LessonSummaryScreen({ lessonId }: { lessonId: string }) {
  const { summary, loading, error, generateSummary } = useLessonSummary();

  const handleGenerate = () => {
    generateSummary(lessonId, 'casual', 'medium');
  };

  if (loading) return <Text>Generating summary...</Text>;
  if (error) return <Text>Error: {error}</Text>;
  if (!summary) return <Button onPress={handleGenerate}>Generate Summary</Button>;

  return (
    <ScrollView>
      <Text style={styles.title}>Summary</Text>
      <Text>{summary.summary}</Text>

      <Text style={styles.title}>Key Concepts</Text>
      {summary.key_concepts.map((concept, i) => (
        <Text key={i}>• {concept}</Text>
      ))}

      <Text style={styles.title}>Example Questions</Text>
      {summary.example_questions.map((question, i) => (
        <Text key={i}>{i + 1}. {question}</Text>
      ))}
    </ScrollView>
  );
}
```

---

## Retrieving Saved Summaries

```typescript
async function getSavedSummaries(lessonId: string) {
  const { data, error } = await supabase
    .from('lesson_outputs')
    .select('*')
    .eq('lesson_id', lessonId)
    .eq('type', 'summary')
    .eq('status', 'ready')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data.map(output => ({
    id: output.id,
    createdAt: output.created_at,
    summary: output.content_json.summary,
    keyConcepts: output.content_json.key_concepts,
    exampleQuestions: output.content_json.example_questions,
  }));
}

// Get most recent summary
async function getLatestSummary(lessonId: string) {
  const { data, error } = await supabase
    .from('lesson_outputs')
    .select('*')
    .eq('lesson_id', lessonId)
    .eq('type', 'summary')
    .eq('status', 'ready')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No summary found
      return null;
    }
    throw new Error(error.message);
  }

  return {
    id: data.id,
    createdAt: data.created_at,
    summary: data.content_json.summary,
    keyConcepts: data.content_json.key_concepts,
    exampleQuestions: data.content_json.example_questions,
  };
}
```

---

## Error Handling

```typescript
async function generateSummaryWithErrorHandling(lessonId: string) {
  try {
    const summary = await generateLessonSummary(lessonId);
    return { success: true, data: summary };
  } catch (error) {
    if (error instanceof Error) {
      // Handle specific error messages
      if (error.message.includes('No content available')) {
        return {
          success: false,
          error: 'NO_CONTENT',
          message: 'Please add content to this lesson first.',
        };
      }
      
      if (error.message.includes('PDF extraction not yet supported')) {
        return {
          success: false,
          error: 'UNSUPPORTED_FORMAT',
          message: 'PDF summaries are coming soon. Try text or audio lessons.',
        };
      }
      
      if (error.message.includes('unauthorized')) {
        return {
          success: false,
          error: 'UNAUTHORIZED',
          message: 'You do not have access to this lesson.',
        };
      }
      
      if (error.message.includes('not found')) {
        return {
          success: false,
          error: 'NOT_FOUND',
          message: 'Lesson not found.',
        };
      }
    }
    
    return {
      success: false,
      error: 'UNKNOWN',
      message: 'Failed to generate summary. Please try again.',
    };
  }
}
```

---

## Loading States

```typescript
type SummaryState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: SummaryResponse }
  | { status: 'error'; error: string };

function useSummaryState() {
  const [state, setState] = useState<SummaryState>({ status: 'idle' });

  const generate = async (lessonId: string) => {
    setState({ status: 'loading' });
    
    try {
      const data = await generateLessonSummary(lessonId);
      setState({ status: 'success', data });
    } catch (error) {
      setState({
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  return { state, generate };
}

// Usage
function SummaryButton({ lessonId }: { lessonId: string }) {
  const { state, generate } = useSummaryState();

  return (
    <>
      <Button
        onPress={() => generate(lessonId)}
        disabled={state.status === 'loading'}
      >
        {state.status === 'loading' ? 'Generating...' : 'Generate Summary'}
      </Button>

      {state.status === 'success' && (
        <Text>{state.data.summary}</Text>
      )}

      {state.status === 'error' && (
        <Text style={{ color: 'red' }}>{state.error}</Text>
      )}
    </>
  );
}
```

---

## Caching Strategy

```typescript
// Simple in-memory cache
const summaryCache = new Map<string, { data: SummaryResponse; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function getCachedSummary(lessonId: string): Promise<SummaryResponse | null> {
  const cached = summaryCache.get(lessonId);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  
  // Try to get from database
  const saved = await getLatestSummary(lessonId);
  
  if (saved) {
    const data: SummaryResponse = {
      output_id: saved.id,
      summary: saved.summary,
      key_concepts: saved.keyConcepts,
      example_questions: saved.exampleQuestions,
      metadata: {
        content_source: 'database',
        content_length: 0,
        tone: 'unknown',
        length: 'unknown',
      },
    };
    
    summaryCache.set(lessonId, { data, timestamp: Date.now() });
    return data;
  }
  
  return null;
}

async function generateOrGetCachedSummary(
  lessonId: string,
  tone?: 'casual' | 'exam' | 'deep',
  length?: 'short' | 'medium' | 'long'
): Promise<SummaryResponse> {
  // Try cache first
  const cached = await getCachedSummary(lessonId);
  if (cached) {
    return cached;
  }
  
  // Generate new summary
  const summary = await generateLessonSummary(lessonId, tone, length);
  
  // Cache it
  summaryCache.set(lessonId, { data: summary, timestamp: Date.now() });
  
  return summary;
}
```

---

## React Native Component Example

```tsx
import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity, StyleSheet } from 'react-native';

interface LessonSummaryProps {
  lessonId: string;
}

export function LessonSummary({ lessonId }: LessonSummaryProps) {
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSavedSummary();
  }, [lessonId]);

  const loadSavedSummary = async () => {
    try {
      const saved = await getLatestSummary(lessonId);
      if (saved) {
        setSummary({
          output_id: saved.id,
          summary: saved.summary,
          key_concepts: saved.keyConcepts,
          example_questions: saved.exampleQuestions,
          metadata: {
            content_source: 'database',
            content_length: 0,
            tone: 'unknown',
            length: 'unknown',
          },
        });
      }
    } catch (err) {
      console.error('Failed to load saved summary:', err);
    }
  };

  const handleGenerate = async (tone: 'casual' | 'exam' | 'deep' = 'casual') => {
    setLoading(true);
    setError(null);

    try {
      const newSummary = await generateLessonSummary(lessonId, tone, 'medium');
      setSummary(newSummary);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate summary');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Generating summary...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.button} onPress={() => handleGenerate()}>
          <Text style={styles.buttonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!summary) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>No summary yet</Text>
        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.button} onPress={() => handleGenerate('casual')}>
            <Text style={styles.buttonText}>Casual</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.button} onPress={() => handleGenerate('exam')}>
            <Text style={styles.buttonText}>Exam Prep</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.button} onPress={() => handleGenerate('deep')}>
            <Text style={styles.buttonText}>Deep Dive</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Summary</Text>
        <Text style={styles.summaryText}>{summary.summary}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Key Concepts</Text>
        {summary.key_concepts.map((concept, index) => (
          <View key={index} style={styles.listItem}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.conceptText}>{concept}</Text>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Example Questions</Text>
        {summary.example_questions.map((question, index) => (
          <View key={index} style={styles.questionItem}>
            <Text style={styles.questionNumber}>{index + 1}.</Text>
            <Text style={styles.questionText}>{question}</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity style={styles.regenerateButton} onPress={() => handleGenerate()}>
        <Text style={styles.buttonText}>Regenerate</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  summaryText: {
    fontSize: 16,
    lineHeight: 24,
  },
  listItem: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  bullet: {
    fontSize: 16,
    marginRight: 8,
  },
  conceptText: {
    fontSize: 16,
    flex: 1,
  },
  questionItem: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  questionNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 8,
  },
  questionText: {
    fontSize: 16,
    flex: 1,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  errorText: {
    color: 'red',
    fontSize: 16,
    marginBottom: 16,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 16,
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    margin: 4,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  regenerateButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 32,
  },
});
```

---

## Best Practices

1. **Cache summaries** - Don't regenerate on every view
2. **Show loading states** - Summary generation takes 5-10 seconds
3. **Handle errors gracefully** - Provide helpful error messages
4. **Allow regeneration** - Let users try different tones/lengths
5. **Store in database** - Query `lesson_outputs` before generating
6. **Validate content** - Check if lesson has content before calling
7. **Use optimistic UI** - Show skeleton/placeholder while loading

---

## Related Documentation

- [Gemini Summary API](../../../backend/docs/gemini-summary.md)
- [Test Cases](../../../backend/tests/lesson_generate_summary.test.md)
- [Edge Functions README](../README.md)
