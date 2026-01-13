// Class color mapping - matches class IDs to their colors
export const CLASS_COLORS = {
  '1': '#4F46E5', // Introduction to Computer Science - indigo
  '2': '#10B981', // Linear Algebra - green
  '3': '#F59E0B', // History of Art - amber
  '4': '#EF4444'  // Organic Chemistry - red
}

// Get class color by ID, fallback to primary accent
export const getClassColor = (classId) => {
  return CLASS_COLORS[classId] || '#4F46E5'
}
