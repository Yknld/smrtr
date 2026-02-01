/**
 * Mock data for Study OS web app (no backend).
 * Replace with Supabase or API calls when backend is connected.
 */

export const MOCK_COURSES = [
  {
    id: 'c1',
    title: 'Introduction to Biology',
    color: '#10B981',
    term: 'Fall 2024',
    lessonCount: 5,
    lastOpenedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    isCompleted: false,
  },
  {
    id: 'c2',
    title: 'Linear Algebra',
    color: '#8B5CF6',
    term: 'Fall 2024',
    lessonCount: 12,
    lastOpenedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
    isCompleted: false,
  },
  {
    id: 'c3',
    title: 'Completed Course',
    color: '#6366F1',
    term: 'Spring 2024',
    lessonCount: 8,
    lastOpenedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    isCompleted: true,
  },
]

export const MOCK_LESSONS = {
  c1: [
    { id: 'l1', title: 'Cell Structure', status: 'ready', lastOpenedAt: new Date() },
    { id: 'l2', title: 'Genetics Basics', status: 'ready', lastOpenedAt: null },
    { id: 'l3', title: 'Evolution', status: 'processing', lastOpenedAt: null },
  ],
  c2: [
    { id: 'l4', title: 'Vectors and Spaces', status: 'ready', lastOpenedAt: new Date() },
    { id: 'l5', title: 'Matrix Operations', status: 'ready', lastOpenedAt: null },
  ],
  c3: [],
}

export const MOCK_COURSES_WITH_PODCASTS = [
  { id: 'c1', title: 'Introduction to Biology', color: '#10B981', podcastCount: 3, lastPodcastAt: new Date() },
  { id: 'c2', title: 'Linear Algebra', color: '#8B5CF6', podcastCount: 1, lastPodcastAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) },
]

export const MOCK_PODCASTS = {
  c1: [
    { id: 'p1', lessonId: 'l1', lessonTitle: 'Cell Structure', podcastUrl: null, podcastAvailable: true, durationMs: 420000, createdAt: new Date() },
    { id: 'p2', lessonId: 'l2', lessonTitle: 'Genetics Basics', podcastUrl: null, podcastAvailable: false, durationMs: null, createdAt: new Date(Date.now() - 86400000) },
  ],
  c2: [
    { id: 'p3', lessonId: 'l4', lessonTitle: 'Vectors and Spaces', podcastUrl: null, podcastAvailable: true, durationMs: 600000, createdAt: new Date(Date.now() - 2 * 86400000) },
  ],
}

export function getCourses() {
  return Promise.resolve([...MOCK_COURSES])
}

export function getCoursesWithPodcasts() {
  return Promise.resolve([...MOCK_COURSES_WITH_PODCASTS])
}

export function getLessons(courseId) {
  return Promise.resolve(MOCK_LESSONS[courseId] || [])
}

export function getPodcastsForCourse(courseId) {
  return Promise.resolve(MOCK_PODCASTS[courseId] || [])
}

export function createCourse({ title, color }) {
  const id = 'c' + Date.now()
  MOCK_COURSES.unshift({
    id,
    title,
    color,
    term: '',
    lessonCount: 0,
    lastOpenedAt: null,
    isCompleted: false,
  })
  MOCK_LESSONS[id] = []
  return Promise.resolve({ id, title, color })
}

export function createLesson(courseId, title, _type) {
  const lessons = MOCK_LESSONS[courseId] || []
  const id = 'l' + Date.now()
  const lesson = { id, title, status: 'upload', lastOpenedAt: null }
  lessons.push(lesson)
  MOCK_LESSONS[courseId] = lessons
  return Promise.resolve(lesson)
}

/** Mock flashcards by lessonId */
export const MOCK_FLASHCARDS = {
  l1: [
    { id: 'f1', front: 'What is the basic unit of life?', back: 'The cell.' },
    { id: 'f2', front: 'What organelle produces ATP?', back: 'Mitochondria.' },
    { id: 'f3', front: 'Where is DNA stored in the cell?', back: 'In the nucleus.' },
    { id: 'f4', front: 'What is the function of ribosomes?', back: 'Protein synthesis.' },
    { id: 'f5', front: 'What surrounds the cell?', back: 'The cell membrane.' },
  ],
  l2: [
    { id: 'f6', front: 'What is a gene?', back: 'A segment of DNA that codes for a trait.' },
    { id: 'f7', front: 'What are alleles?', back: 'Different forms of the same gene.' },
  ],
  l4: [
    { id: 'f8', front: 'What is a vector?', back: 'A quantity with magnitude and direction.' },
    { id: 'f9', front: 'What is a scalar?', back: 'A quantity with only magnitude.' },
  ],
}

/** Mock quiz questions by lessonId */
export const MOCK_QUIZ = {
  l1: [
    { id: 'q1', stem: 'Which organelle is known as the powerhouse of the cell?', options: ['Ribosome', 'Mitochondria', 'Golgi apparatus', 'Nucleus'], correctIndex: 1 },
    { id: 'q2', stem: 'Where does protein synthesis occur?', options: ['Nucleus', 'Mitochondria', 'Ribosomes', 'Cell membrane'], correctIndex: 2 },
    { id: 'q3', stem: 'What is the function of the cell membrane?', options: ['ATP production', 'Selective barrier', 'DNA storage', 'Protein synthesis'], correctIndex: 1 },
  ],
  l2: [
    { id: 'q4', stem: 'What is heredity?', options: ['Passing traits to offspring', 'Cell division', 'Energy production', 'Protein folding'], correctIndex: 0 },
  ],
  l4: [
    { id: 'q5', stem: 'A vector in R³ has how many components?', options: ['1', '2', '3', '4'], correctIndex: 2 },
  ],
}

export function getFlashcards(lessonId) {
  return Promise.resolve(MOCK_FLASHCARDS[lessonId] || [])
}

export function getQuizQuestions(lessonId) {
  return Promise.resolve(MOCK_QUIZ[lessonId] || [])
}

export function getPodcastForLesson(lessonId) {
  for (const list of Object.values(MOCK_PODCASTS)) {
    const found = list.find((p) => p.lessonId === lessonId)
    if (found) return Promise.resolve(found)
  }
  return Promise.resolve(null)
}
