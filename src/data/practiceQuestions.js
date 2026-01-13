// Static demo questions for practice
export const PRACTICE_QUESTIONS = {
  flashcards: [
    {
      id: 'f1',
      front: 'What is time complexity?',
      back: 'Time complexity describes how the runtime of an algorithm grows with the size of the input data.'
    },
    {
      id: 'f2',
      front: 'What is a binary search tree?',
      back: 'A binary search tree is a data structure where each node has at most two children, and nodes are organized such that left child < parent < right child.'
    },
    {
      id: 'f3',
      front: 'What is Big O notation?',
      back: 'Big O notation is used to describe the upper bound of an algorithm\'s time or space complexity in the worst case scenario.'
    },
    {
      id: 'f4',
      front: 'What is a hash table?',
      back: 'A hash table is a data structure that uses a hash function to map keys to values, allowing for average O(1) lookup time.'
    },
    {
      id: 'f5',
      front: 'What is the difference between a stack and a queue?',
      back: 'A stack is LIFO (Last In First Out) while a queue is FIFO (First In First Out).'
    }
  ],
  multipleChoice: [
    {
      id: 'q1',
      question: 'What is the time complexity of binary search?',
      options: [
        'O(n)',
        'O(log n)',
        'O(n log n)',
        'O(1)'
      ],
      correctIndex: 1
    },
    {
      id: 'q2',
      question: 'Which data structure follows LIFO principle?',
      options: [
        'Queue',
        'Stack',
        'Array',
        'Linked List'
      ],
      correctIndex: 1
    },
    {
      id: 'q3',
      question: 'What is the worst-case time complexity of quicksort?',
      options: [
        'O(n log n)',
        'O(n²)',
        'O(log n)',
        'O(n)'
      ],
      correctIndex: 1
    },
    {
      id: 'q4',
      question: 'Which algorithm is used for finding shortest paths in a graph?',
      options: [
        'Bubble Sort',
        'Dijkstra\'s Algorithm',
        'Binary Search',
        'Quick Sort'
      ],
      correctIndex: 1
    },
    {
      id: 'q5',
      question: 'What is the space complexity of merge sort?',
      options: [
        'O(1)',
        'O(log n)',
        'O(n)',
        'O(n log n)'
      ],
      correctIndex: 2
    }
  ]
}
