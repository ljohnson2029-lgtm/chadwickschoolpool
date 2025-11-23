/**
 * Permission utilities for carpool operations
 * Validates user permissions based on account type (student vs parent)
 */

/**
 * Check if user can create carpools
 * @param email User's email address
 * @returns true if user is a parent (non-@chadwickschool.org), false if student
 */
export function canCreateCarpool(email: string | undefined): boolean {
  if (!email) return false;
  // Students (@chadwickschool.org) cannot create carpools
  return !email.toLowerCase().endsWith('@chadwickschool.org');
}

/**
 * Check if user can edit a carpool
 * @param email User's email address
 * @param ownerId ID of the carpool owner
 * @param currentUserId Current user's ID
 * @returns true if user is a parent AND owns the carpool
 */
export function canEditCarpool(
  email: string | undefined, 
  ownerId: string, 
  currentUserId: string
): boolean {
  if (!email || !ownerId || !currentUserId) return false;
  // Must be a parent AND own the carpool
  return !email.toLowerCase().endsWith('@chadwickschool.org') && ownerId === currentUserId;
}

/**
 * Check if user can delete a carpool
 * @param email User's email address
 * @param ownerId ID of the carpool owner
 * @param currentUserId Current user's ID
 * @returns true if user is a parent AND owns the carpool
 */
export function canDeleteCarpool(
  email: string | undefined,
  ownerId: string,
  currentUserId: string
): boolean {
  if (!email || !ownerId || !currentUserId) return false;
  // Must be a parent AND own the carpool
  return !email.toLowerCase().endsWith('@chadwickschool.org') && ownerId === currentUserId;
}

/**
 * Check if user can request rides
 * @param email User's email address
 * @returns true if user is a parent, false if student
 */
export function canRequestRide(email: string | undefined): boolean {
  if (!email) return false;
  // Students cannot request rides
  return !email.toLowerCase().endsWith('@chadwickschool.org');
}

/**
 * Check if user is a student
 * @param email User's email address
 * @returns true if user has @chadwickschool.org email
 */
export function isStudent(email: string | undefined): boolean {
  if (!email) return false;
  return email.toLowerCase().endsWith('@chadwickschool.org');
}

/**
 * Check if user is a parent
 * @param email User's email address
 * @returns true if user does NOT have @chadwickschool.org email
 */
export function isParent(email: string | undefined): boolean {
  if (!email) return false;
  return !email.toLowerCase().endsWith('@chadwickschool.org');
}

/**
 * Get permission error message for students
 * @param action The action being attempted (e.g., "create carpool", "edit carpool")
 * @returns Error message explaining why students cannot perform the action
 */
export function getStudentPermissionError(action: string): string {
  return `Student accounts cannot ${action}. Please ask a linked parent to ${action} on your behalf.`;
}
