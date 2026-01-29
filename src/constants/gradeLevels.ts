// Grade level options for profile forms
export const GRADE_LEVELS = [
  'Pre-K',
  'Kindergarten',
  '1st Grade',
  '2nd Grade',
  '3rd Grade',
  '4th Grade',
  '5th Grade',
  '6th Grade',
  '7th Grade',
  '8th Grade',
  '9th Grade',
  '10th Grade',
  '11th Grade',
  '12th Grade',
] as const;

export const PARENT_GRADE_LEVEL = 'Parent/Adult';

export type GradeLevel = typeof GRADE_LEVELS[number] | typeof PARENT_GRADE_LEVEL;

// Get student-only grade levels (no Parent/Adult)
export const getStudentGradeLevels = () => GRADE_LEVELS;

// Get all grade levels including Parent/Adult
export const getAllGradeLevels = () => [...GRADE_LEVELS, PARENT_GRADE_LEVEL] as const;
