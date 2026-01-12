import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  RefreshControl,
  SafeAreaView,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CourseWithMeta } from '../../types/course';
import { fetchCourses, searchCourses } from '../../data/courses.repository';
import { colors, spacing, typography } from '../../ui/tokens';
import { SearchBar } from '../../components/SearchBar/SearchBar';
import { CourseCard } from '../../components/CourseCard/CourseCard';
import { LoadingState } from '../../components/LoadingState/LoadingState';
import { EmptyState } from '../../components/EmptyState/EmptyState';
import { CreateCourseModal } from '../../components/CreateCourseModal/CreateCourseModal';
import { FAB } from '../../components/FAB/FAB';
import { createCourse } from '../../data/courses.repository';

interface HomeScreenProps {
  navigation?: any;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const [courses, setCourses] = useState<CourseWithMeta[]>([]);
  const [filteredCourses, setFilteredCourses] = useState<CourseWithMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchExpanded, setSearchExpanded] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);

  // Separate courses into current and completed
  const currentCourses = filteredCourses.filter(course => !course.isCompleted);
  const completedCourses = filteredCourses.filter(course => course.isCompleted);

  // Load courses
  const loadCourses = useCallback(async () => {
    try {
      const data = await fetchCourses();
      setCourses(data);
      applyFilters(data, searchQuery);
    } catch (error: any) {
      console.error('Failed to load courses:', error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    loadCourses();
  }, []);

  // Apply search
  const applyFilters = (
    allCourses: CourseWithMeta[],
    query: string
  ) => {
    const filtered = searchCourses(allCourses, query);
    setFilteredCourses(filtered);
  };

  // Handle search
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    applyFilters(courses, query);
  };

  // Handle search icon press
  const handleSearchIconPress = () => {
    setSearchExpanded(true);
  };

  // Handle close search
  const handleCloseSearch = () => {
    setSearchExpanded(false);
    setSearchQuery('');
    applyFilters(courses, '');
  };

  // Handle refresh
  const handleRefresh = () => {
    setRefreshing(true);
    loadCourses();
  };

  // Handle course press
  const handleCoursePress = (course: CourseWithMeta) => {
    navigation.navigate('CourseDetail', {
      courseId: course.id,
      courseTitle: course.title,
    });
  };

  // Handle create course
  const handleCreateCourse = async (title: string, color: string) => {
    try {
      await createCourse({ title, color });
      // Reload courses after creation
      await loadCourses();
    } catch (error: any) {
      console.error('Failed to create course:', error.message);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />
      
      <View style={styles.container}>
        {/* Search */}
        <View style={styles.searchContainer}>
          {searchExpanded ? (
            <View style={styles.searchBarContainer}>
          <SearchBar
            value={searchQuery}
            onChangeText={handleSearch}
            placeholder="Search courses..."
          />
              <TouchableOpacity
                onPress={handleCloseSearch}
                style={styles.closeButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              onPress={handleSearchIconPress}
              style={styles.searchIconButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="search" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Course List */}
        {loading ? (
          <LoadingState count={5} />
        ) : filteredCourses.length === 0 ? (
          <EmptyState
            title={
              searchQuery
                ? 'No courses found'
                : courses.length === 0
                ? 'Create your first course'
                : 'No courses match your search'
            }
            subtitle={
              searchQuery
                ? 'Try a different search term'
                : courses.length === 0
                ? 'Get started by creating a course or importing content'
                : undefined
            }
            actionLabel={courses.length === 0 ? 'Create Course' : undefined}
            onAction={courses.length === 0 ? () => setCreateModalVisible(true) : undefined}
          />
        ) : (
          <ScrollView
            style={styles.courseList}
            contentContainerStyle={styles.courseListContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={colors.primary}
              />
            }
          >
            {/* Current Courses Section */}
            {currentCourses.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Current</Text>
                {currentCourses.map((course) => (
                  <CourseCard
                    key={course.id}
                    course={course}
                    onPress={() => handleCoursePress(course)}
                  />
                ))}
              </>
            )}

            {/* Completed Courses Section */}
            {completedCourses.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Completed</Text>
                {completedCourses.map((course) => (
                  <CourseCard
                    key={course.id}
                    course={course}
                    onPress={() => handleCoursePress(course)}
                  />
                ))}
              </>
            )}
          </ScrollView>
        )}

        {/* FAB for creating course */}
        <FAB onPress={() => setCreateModalVisible(true)} />

        {/* Create Course Modal */}
        <CreateCourseModal
          visible={createModalVisible}
          onClose={() => setCreateModalVisible(false)}
          onCreate={handleCreateCourse}
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
  searchContainer: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchIconButton: {
    padding: spacing.xs,
  },
  searchBarContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  closeButton: {
    padding: spacing.xs,
  },
  courseList: {
    flex: 1,
  },
  courseListContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl + 60, // Extra space for bottom tabs
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
});
