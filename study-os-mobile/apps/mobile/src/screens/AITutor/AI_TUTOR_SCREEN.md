# AI Tutor Screen

## Overview
A focused, calm chat interface scoped to a single lesson where students can interact with an AI tutor for personalized learning assistance.

## Features

### Header
- **Back button**: Returns to Lesson Hub
- **Title**: "AI Tutor" 
- **Context pill**: Shows "Using X lesson sources" to indicate how many resources the AI has access to

### Suggested Actions
Horizontal scrollable row of quick action chips:
- **Explain concept**: Pre-fills prompt to explain a concept
- **Quiz me**: Initiates a quiz session
- **Flashcards**: Generates flashcards from lesson
- **Summarize**: Creates lesson summary
- **Make podcast**: Generates podcast-style audio summary

These actions appear when chat is empty and provide quick entry points.

### Chat Interface
- **User messages**: Right-aligned with primary color background
- **AI messages**: Left-aligned with elevated surface background
- **Typing indicator**: Smooth animated dots when AI is responding
- **Empty state**: Calm guidance when no messages

### Input Bar
- **Text input**: Multi-line with 500 character limit
- **Mic button**: Voice input (placeholder for future implementation)
- **Send button**: Submits message, disabled when input is empty

## Design Principles

### Focused & Calm
- No distracting elements
- Minimal color palette (gray-based)
- Subtle borders and elevation
- Clear visual hierarchy

### Conversation Flow
- Messages grouped by sender
- Proper spacing for readability
- Auto-scroll to latest message
- Typing indicator for AI response

## Technical Implementation

### Props
```typescript
interface AITutorScreenProps {
  route: {
    params: {
      lessonId: string;
      lessonTitle: string;
      sourceCount?: number;
    };
  };
  navigation: any;
}
```

### Message Structure
```typescript
interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
}
```

## Navigation
Accessed from Lesson Hub via "AI Tutor" action tile:
```typescript
navigation.navigate('AITutor', {
  lessonId,
  lessonTitle,
  sourceCount: 0, // TODO: Calculate from actual sources
});
```

## Future Enhancements
- [ ] Voice input implementation
- [ ] Real AI integration (replace placeholder responses)
- [ ] Message history persistence
- [ ] Source count calculation from lesson assets/notes
- [ ] Suggested follow-up questions
- [ ] Context-aware action recommendations
- [ ] Message editing/deletion
- [ ] Export conversation
- [ ] Share insights

## Files
- `AITutorScreen.tsx` - Main screen component
- Located in `/src/screens/AITutor/`

## Related Screens
- **Lesson Hub**: Entry point to AI Tutor
- **Lesson Workspace**: Alternate study mode
- **Assets**: Source materials for AI context
