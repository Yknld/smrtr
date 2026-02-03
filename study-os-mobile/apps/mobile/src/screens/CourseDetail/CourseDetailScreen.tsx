import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  RefreshControl,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LessonWithOutputs, LessonStatus } from '../../types/lesson';
import { fetchLessons, createLesson, deleteLesson } from '../../data/lessons.repository';
import { deleteCourse } from '../../data/courses.repository';
import { colors, spacing } from '../../ui/tokens';
import { LessonCard } from '../../components/LessonCard/LessonCard';
import { LoadingState } from '../../components/LoadingState/LoadingState';
import { EmptyState } from '../../components/EmptyState/EmptyState';
import { BottomSheet, BottomSheetAction } from '../../components/BottomSheet/BottomSheet';
import { FAB } from '../../components/FAB/FAB';

interface CourseDetailScreenProps {
  route: {
    params: {
      courseId: string;
      courseTitle: string;
    };
  };
  navigation: any;
}

export const CourseDetailScreen: React.FC<CourseDetailScreenProps> = ({ route, navigation }) => {
  const { courseId, courseTitle } = route.params;
  const [lessons, setLessons] = useState<LessonWithOutputs[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [lessonSheetVisible, setLessonSheetVisible] = useState(false);
  const [selectedLesson, setSelectedLesson] = useState<LessonWithOutputs | null>(null);

  // Load lessons
  const loadLessons = useCallback(async () => {
    try {
      const data = await fetchLessons(courseId);
      setLessons(data);
    } catch (error: any) {
      console.error('Failed to load lessons:', error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [courseId]);

  useEffect(() => {
    loadLessons();
  }, []);

  // Handle refresh
  const handleRefresh = () => {
    setRefreshing(true);
    loadLessons();
  };

  // Handle lesson press
  const handleLessonPress = (lesson: LessonWithOutputs) => {
    navigation.navigate('LessonHub', {
      lessonId: lesson.id,
      lessonTitle: lesson.title,
    });
  };

  // Handle lesson long press: show sheet with Delete Lesson
  const handleLessonLongPress = (lesson: LessonWithOutputs) => {
    setSelectedLesson(lesson);
  };

  const handleDeleteLessonFromSheet = () => {
    const lesson = selectedLesson;
    setSelectedLesson(null);
    if (!lesson) return;
    Alert.alert(
      'Delete Lesson',
      `Delete "${lesson.title}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteLesson(lesson.id);
              await loadLessons();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete lesson');
            }
          },
        },
      ]
    );
  };

  const handleDeleteCourse = () => {
    setMenuVisible(false);
    Alert.alert(
      'Delete Course',
      `Delete "${courseTitle}" and all its lessons? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteCourse(courseId);
              navigation.goBack();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete course');
            }
          },
        },
      ]
    );
  };

  // Overflow menu actions
  const menuActions: BottomSheetAction[] = [
    {
      label: 'Rename Course',
      onPress: () => console.log('Rename course'),
    },
    {
      label: 'Archive Course',
      onPress: () => console.log('Archive course'),
    },
    {
      label: 'Delete Course',
      onPress: handleDeleteCourse,
    },
  ];

  // Handle lesson creation
  const handleCreateBlankLesson = async () => {
    try {
      setLessonSheetVisible(false);
      const lessonCount = lessons.length + 1;
      const newLesson = await createLesson(
        courseId,
        `Lesson ${lessonCount}`,
        'upload'
      );
      
      // Reload lessons
      await loadLessons();
      
      // Navigate to the new lesson
      navigation.navigate('LessonHub', {
        lessonId: newLesson.id,
        lessonTitle: newLesson.title,
      });
    } catch (error: any) {
      console.error('Failed to create lesson:', error.message);
      // TODO: Show error to user
    }
  };

  // Lesson creation actions
  const lessonActions: BottomSheetAction[] = [
    {
      label: 'New Blank Lesson',
      onPress: handleCreateBlankLesson,
    },
    {
      label: 'Import YouTube',
      onPress: () => console.log('Import YouTube'),
    },
    {
      label: 'Upload Files',
      onPress: () => console.log('Upload files'),
    },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />
      
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          
          <Text style={styles.title} numberOfLines={1}>
            {courseTitle}
          </Text>
          
          <TouchableOpacity
            style={styles.menuButton}
            onPress={() => setMenuVisible(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="ellipsis-horizontal" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* Lessons List */}
        {loading ? (
          <LoadingState count={5} />
        ) : lessons.length === 0 ? (
          <EmptyState
            title="No lessons yet"
            subtitle="Create your first lesson or import content"
          />
        ) : (
          <ScrollView
            style={styles.lessonList}
            contentContainerStyle={styles.lessonListContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={colors.primary}
              />
            }
          >
            {lessons.map((lesson) => (
              <LessonCard
                key={lesson.id}
                lesson={lesson}
                onPress={() => handleLessonPress(lesson)}
                onLongPress={() => handleLessonLongPress(lesson)}
              />
            ))}
          </ScrollView>
        )}

        {/* FAB for creating lesson */}
        <FAB onPress={() => setLessonSheetVisible(true)} />

        {/* Overflow Menu */}
        <BottomSheet
          visible={menuVisible}
          onClose={() => setMenuVisible(false)}
          actions={menuActions}
        />

        {/* Lesson Creation Sheet */}
        <BottomSheet
          visible={lessonSheetVisible}
          onClose={() => setLessonSheetVisible(false)}
          actions={lessonActions}
        />

        {/* Lesson options sheet (long-press) */}
        <BottomSheet
          visible={!!selectedLesson}
          onClose={() => setSelectedLesson(null)}
          title={selectedLesson?.title}
          actions={[
            {
              label: 'Delete Lesson',
              onPress: handleDeleteLessonFromSheet,
            },
          ]}
        />
      </View>
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
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
  },
  backButton: {
    padding: spacing.xs,
    marginRight: spacing.sm,
  },
  title: {
    flex: 1,
    fontSize: 20,
    fontWeight: '600',
    color: colors.textPrimary,
    letterSpacing: -0.2,
  },
  menuButton: {
    padding: spacing.xs,
    marginLeft: spacing.sm,
  },
  lessonList: {
    flex: 1,
  },
  lessonListContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl + 60,
  },
});
