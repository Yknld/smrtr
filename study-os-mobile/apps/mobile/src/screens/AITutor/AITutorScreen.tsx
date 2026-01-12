import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography } from '../../ui/tokens';
import { supabase } from '../../config/supabase';

// Helper to render markdown text with bold formatting
const renderMarkdownText = (text: string) => {
  // Split by **bold** markers and render
  const parts: Array<{ text: string; bold: boolean }> = [];
  const boldRegex = /\*\*(.*?)\*\*/g;
  let lastIndex = 0;
  let match;

  while ((match = boldRegex.exec(text)) !== null) {
    // Add text before bold
    if (match.index > lastIndex) {
      parts.push({ text: text.substring(lastIndex, match.index), bold: false });
    }
    // Add bold text
    parts.push({ text: match[1], bold: true });
    lastIndex = boldRegex.lastIndex;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push({ text: text.substring(lastIndex), bold: false });
  }

  return parts;
};

// Component to render formatted message
const FormattedMessage: React.FC<{ content: string; isUser: boolean }> = ({ content, isUser }) => {
  // Clean content: remove ## headers, replace * bullets with •
  let cleanContent = content.replace(/^##\s+/gm, '');
  cleanContent = cleanContent.replace(/^\s*\*\s+/gm, '• ');
  cleanContent = cleanContent.replace(/^\s*-\s+/gm, '• ');
  
  const parts = renderMarkdownText(cleanContent);
  
  const textStyle = isUser ? styles.messageTextUser : styles.messageTextAI;

  return (
    <Text style={textStyle}>
      {parts.map((part, partIndex) => (
        <Text
          key={partIndex}
          style={[textStyle, part.bold ? { fontWeight: '700' } : {}]}
        >
          {part.text}
        </Text>
      ))}
    </Text>
  );
};

interface AITutorScreenProps {
  route: {
    params: {
      lessonId: string;
      lessonTitle: string;
      sourceCount?: number; // Number of lesson sources (notes, assets, etc.)
    };
  };
  navigation: any;
}

interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
}

const SUGGESTED_ACTIONS = [
  { id: 'explain', label: 'Explain concept', icon: 'book-outline' as const },
  { id: 'quiz', label: 'Quiz me', icon: 'help-circle-outline' as const },
  { id: 'flashcards', label: 'Flashcards', icon: 'layers-outline' as const },
  { id: 'summarize', label: 'Summarize', icon: 'document-text-outline' as const },
  { id: 'podcast', label: 'Make podcast', icon: 'mic-outline' as const },
];

const TypingIndicator: React.FC = () => {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animate = (dot: Animated.Value, delay: number) => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
        ])
      ).start();
    };

    animate(dot1, 0);
    animate(dot2, 150);
    animate(dot3, 300);
  }, []);

  const dotStyle = (animValue: Animated.Value) => ({
    opacity: animValue.interpolate({
      inputRange: [0, 1],
      outputRange: [0.3, 1],
    }),
  });

  return (
    <View style={styles.typingIndicator}>
      <Animated.View style={[styles.typingDot, dotStyle(dot1)]} />
      <Animated.View style={[styles.typingDot, dotStyle(dot2)]} />
      <Animated.View style={[styles.typingDot, dotStyle(dot3)]} />
    </View>
  );
};

export const AITutorScreen: React.FC<AITutorScreenProps> = ({ route, navigation }) => {
  const { lessonId, lessonTitle, sourceCount = 0 } = route.params;
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  const handleSend = async () => {
    if (!inputText.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputText.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    const messageText = inputText.trim();
    setInputText('');
    setIsTyping(true);
    setError(null);

    try {
      // Check if user is authenticated
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Please sign in to use AI Tutor');
      }

      console.log('[AITutor] Sending message to tutor_chat function...');

      // Call tutor_chat edge function
      const { data, error: functionError } = await supabase.functions.invoke('tutor_chat', {
        body: {
          conversationId: conversationId,
          lessonId: lessonId,
          message: messageText,
        },
      });

      console.log('[AITutor] Function response:', { 
        data, 
        error: functionError,
        errorDetails: functionError ? {
          message: functionError.message,
          status: functionError.context?.status,
          body: functionError.context?.body,
        } : null
      });

      if (functionError) {
        console.error('[AITutor] Function error details:', {
          message: functionError.message,
          context: functionError.context,
          stack: functionError.stack,
        });
        
        // Try to parse error message from response
        const errorMsg = functionError.context?.body || functionError.message || 'Failed to get AI response';
        throw new Error(errorMsg);
      }

      // Save conversation ID for follow-up messages
      if (data?.conversationId && !conversationId) {
        setConversationId(data.conversationId);
      }

      // Add AI response to messages
      const aiMessage: Message = {
        id: data?.messageId || (Date.now() + 1).toString(),
        type: 'ai',
        content: data?.assistantMessage || 'No response received',
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (err: any) {
      console.error('[AITutor] Error sending message:', err);
      setError(err.message || 'Failed to send message');
      
      // Show error message in chat
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: '⚠️ Sorry, I encountered an error. Please try again.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleActionPress = (actionId: string, label: string) => {
    // Pre-fill input with action-specific prompt
    const prompts: Record<string, string> = {
      explain: 'Can you explain a concept from this lesson?',
      quiz: 'Quiz me on this lesson',
      flashcards: 'Generate flashcards from this lesson',
      summarize: 'Summarize the key points of this lesson',
      podcast: 'Create a podcast-style summary of this lesson',
    };
    setInputText(prompts[actionId] || label);
  };

  const handleMicPress = () => {
    // TODO: Implement voice input
    console.log('Voice input');
  };

  useEffect(() => {
    // Scroll to bottom when new messages arrive
    if (messages.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages, isTyping]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />
      
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
            
            <View style={styles.headerTitleContainer}>
              <Text style={styles.headerTitle}>AI Tutor</Text>
              {sourceCount > 0 && (
                <View style={styles.contextPill}>
                  <Text style={styles.contextPillText}>
                    Using {sourceCount} lesson source{sourceCount > 1 ? 's' : ''}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Suggested Actions */}
        {messages.length === 0 && (
          <View style={styles.suggestedActionsContainer}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.suggestedActionsContent}
            >
              {SUGGESTED_ACTIONS.map((action) => (
                <TouchableOpacity
                  key={action.id}
                  style={styles.actionChip}
                  onPress={() => handleActionPress(action.id, action.label)}
                  activeOpacity={0.7}
                >
                  <Ionicons name={action.icon} size={16} color={colors.textSecondary} />
                  <Text style={styles.actionChipText}>{action.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Chat Messages */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
        >
          {messages.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="chatbubbles-outline" size={48} color={colors.textTertiary} />
              <Text style={styles.emptyStateTitle}>Ask me anything</Text>
              <Text style={styles.emptyStateSubtitle}>
                I can help explain concepts, quiz you, or generate study materials from "{lessonTitle}"
              </Text>
            </View>
          ) : (
            messages.map((message) => (
              <View
                key={message.id}
                style={[
                  styles.messageRow,
                  message.type === 'user' ? styles.messageRowUser : styles.messageRowAI,
                ]}
              >
                <View
                  style={[
                    styles.messageBubble,
                    message.type === 'user' ? styles.messageBubbleUser : styles.messageBubbleAI,
                  ]}
                >
                  <FormattedMessage 
                    content={message.content} 
                    isUser={message.type === 'user'} 
                  />
                </View>
              </View>
            ))
          )}
          
          {isTyping && (
            <View style={[styles.messageRow, styles.messageRowAI]}>
              <View style={[styles.messageBubble, styles.messageBubbleAI]}>
                <TypingIndicator />
              </View>
            </View>
          )}
        </ScrollView>

        {/* Input Bar */}
        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              placeholder="Ask a question..."
              placeholderTextColor={colors.textTertiary}
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={500}
              returnKeyType="send"
              onSubmitEditing={handleSend}
              blurOnSubmit={false}
            />
            
            <View style={styles.inputActions}>
              <TouchableOpacity
                style={styles.inputButton}
                onPress={handleMicPress}
                activeOpacity={0.7}
              >
                <Ionicons name="mic-outline" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.inputButton,
                  styles.sendButton,
                  !inputText.trim() && styles.sendButtonDisabled,
                ]}
                onPress={handleSend}
                disabled={!inputText.trim()}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="arrow-up"
                  size={22}
                  color={inputText.trim() ? colors.textPrimary : colors.textTertiary}
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backButton: {
    padding: spacing.sm,
    marginRight: spacing.sm,
    marginLeft: -spacing.sm,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
  contextPill: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.pill,
    marginTop: spacing.xs,
  },
  contextPillText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  suggestedActionsContainer: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  suggestedActionsContent: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  actionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.pill,
    gap: spacing.xs,
    marginRight: spacing.sm,
  },
  actionChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: spacing.lg,
    flexGrow: 1,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing['2xl'],
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  emptyStateSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  messageRow: {
    marginBottom: spacing.md,
    flexDirection: 'row',
  },
  messageRowUser: {
    justifyContent: 'flex-end',
  },
  messageRowAI: {
    justifyContent: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.md,
  },
  messageBubbleUser: {
    backgroundColor: colors.primary,
  },
  messageBubbleAI: {
    backgroundColor: colors.surfaceElevated,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 21,
    marginBottom: 4,
  },
  messageTextUser: {
    color: colors.background,
  },
  messageTextAI: {
    color: colors.textPrimary,
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 2,
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.textSecondary,
  },
  inputContainer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: colors.textPrimary,
    maxHeight: 100,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xs,
  },
  inputActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  inputButton: {
    padding: spacing.xs,
  },
  sendButton: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.sm,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.4,
  },
});
