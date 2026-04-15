/**
 * Permission utilities for carpool operations
 * Validates user permissions based on account type (parent vs student)
 * 
 * IMPORTANT: These functions use profile.account_type as the source of truth,
 * NOT the email domain. This is because some @chadwickschool.org emails are
 * whitelisted parents (via parent_email_whitelist table).
 */

/**
 * Check if user can create carpools
 * @param accountType User's account type from profile
 * @returns true if user is a parent, false if student
 */
export function canCreateCarpool(accountType: string | undefined): boolean {
  if (!accountType) return false;
  return accountType === 'parent';
}

/**
 * Check if user can edit a carpool
 * @param accountType User's account type from profile
 * @param ownerId ID of the carpool owner
 * @param currentUserId Current user's ID
 * @returns true if user is a parent AND owns the carpool
 */
export function canEditCarpool(
  accountType: string | undefined, 
  ownerId: string, 
  currentUserId: string
): boolean {
  if (!accountType || !ownerId || !currentUserId) return false;
  return accountType === 'parent' && ownerId === currentUserId;
}

/**
 * Check if user can delete a carpool
 * @param accountType User's account type from profile
 * @param ownerId ID of the carpool owner
 * @param currentUserId Current user's ID
 * @returns true if user is a parent AND owns the carpool
 */
export function canDeleteCarpool(
  accountType: string | undefined,
  ownerId: string,
  currentUserId: string
): boolean {
  if (!accountType || !ownerId || !currentUserId) return false;
  return accountType === 'parent' && ownerId === currentUserId;
}

/**
 * Check if user can request rides
 * @param accountType User's account type from profile
 * @returns true if user is a parent, false if student
 */
export function canRequestRide(accountType: string | undefined): boolean {
  if (!accountType) return false;
  return accountType === 'parent';
}

/**
 * Check if user is a student
 * @param accountType User's account type from profile
 * @returns true if account_type is 'student'
 */
export function isStudent(accountType: string | undefined): boolean {
  if (!accountType) return false;
  return accountType === 'student';
}

/**
 * Check if user is a parent
 * @param accountType User's account type from profile
 * @returns true if account_type is 'parent'
 */
export function isParent(accountType: string | undefined): boolean {
  if (!accountType) return false;
  return accountType === 'parent';
}

/**
 * Get permission error message for students
 * @param action The action being attempted (e.g., "create carpool", "edit carpool")
 * @returns Error message explaining why students cannot perform the action
 */
export function getStudentPermissionError(action: string): string {
  return `Student accounts cannot ${action}. Please ask a linked parent to ${action} on your behalf.`;
}
