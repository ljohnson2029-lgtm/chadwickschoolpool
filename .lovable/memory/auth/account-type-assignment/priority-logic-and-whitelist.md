---
name: Account type assignment priority logic
description: Role assignment uses parent_email_whitelist as single source of truth. Chadwick emails not in whitelist = student. Non-chadwick emails not in whitelist = denied entirely.
type: feature
---

Account type is determined by two factors: email domain and parent_email_whitelist table.

**Logic:**
1. `@chadwickschool.org` + in parent_email_whitelist → **Parent**
2. `@chadwickschool.org` + NOT in parent_email_whitelist → **Student**
3. Non-chadwick email + in parent_email_whitelist → **Parent**
4. Non-chadwick email + NOT in parent_email_whitelist → **DENIED** (cannot create account)

**Denial message:** "This email is not recognized. Please use your Chadwick School email or contact your school administrator."

**Implementation:**
- `auth-check-email` edge function gates access using `parent_email_whitelist` (not `approved_emails`)
- `auth-create-account` edge function enforces the same gate before creating accounts
- `is_student_email()` DB function uses `is_whitelisted_parent()` check first, then domain check
- The `parent_email_whitelist` table is the single source of truth for parent identification
