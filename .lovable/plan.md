# Classroom Feature — Staff Invitations & Access

A new "Classroom" subsystem layered on top of the existing courses/users. It lets admins assign existing staff (or invite new ones) to classrooms/cohorts with role-based permissions (teaching vs non-teaching), with email + in-app invitations.

## Scope

- New roles: `teaching_staff`, `non_teaching_staff` (extend `app_role` enum).
- New entities: classrooms, cohorts, classroom_permissions, staff_classrooms, staff_invitations, class_schedules, attendance_sessions, attendance_records.
- Invitation flow with email (Resend, already configured) + in-app notification.
- Admin UI: manage classrooms, invite/assign staff, manage permissions.
- Staff UI: pending invitations, accept invitation, classroom dashboard.
- Permissions enforced via RLS + UI gating.

## Database (migration)

```text
app_role enum: add 'teaching_staff', 'non_teaching_staff'

classrooms(id, name, description, course_id?, created_by, created_at)
cohorts(id, classroom_id, name, start_date, end_date, created_by, created_at)
staff_classrooms(id, user_id, classroom_id, role 'teaching'|'non_teaching', assigned_by, assigned_at, UNIQUE(user_id, classroom_id))
classroom_permissions(id, user_id, classroom_id, permission text, granted_at)
staff_invitations(id, email, classroom_id, cohort_id?, staff_role, token UNIQUE, status 'pending'|'accepted'|'revoked'|'expired', invited_by, created_at, accepted_at?, expires_at)
class_schedules(id, cohort_id, title, scheduled_at, duration_minutes, created_by)
attendance_sessions(id, cohort_id, schedule_id?, code UNIQUE, opened_at, closes_at, created_by)
attendance_records(id, session_id, user_id, marked_at, UNIQUE(session_id,user_id))
```

RLS: admins manage everything; teaching staff manage their assigned classrooms; non-teaching staff get read-only on assigned classrooms; students can only mark attendance for their cohort.

Helper SQL functions:
- `is_classroom_staff(_user, _classroom)` (security definer)
- `is_teaching_staff(_user, _classroom)` (security definer)

## Edge Functions

- `invite-staff` — create invitation row, generate token, send email via Resend, insert in-app notification if user already exists.
- `accept-invitation` — validate token, attach `staff_classrooms` + role, assign user_role if needed, mark invitation accepted.

## Frontend

New routes:
- `/admin/classrooms` (admin) — list/create classrooms, manage cohorts, invite staff, manage permissions.
- `/classroom` (staff) — dashboard listing assigned classrooms.
- `/classroom/:id` — classroom detail (cohorts, schedules, attendance, students).
- `/invitation/:token` — public route to accept invitation (sign in / create password if new).
- `/staff/invitations` — pending invitations list.

Components:
- `AdminClassroomsTab` (added to existing Admin page)
- `ClassroomManager`, `CohortManager`, `StaffInviteDialog`, `ClassroomDashboard`, `PendingInvitations`, `AttendanceManager`, `ScheduleManager`.

UI gating uses `staff_classrooms.role` to hide create/edit actions for non-teaching staff.

## Email

Use existing `send-email` edge function + Resend to send invitation with link to `/invitation/:token`. In-app notification inserted into existing `notifications` table.

## Out of scope (this iteration)

- Real-time attendance scanning (QR) — codes only.
- Payroll integration beyond reading existing user records.
- Bulk CSV staff import (admin invites individually or by email).

## Acceptance

- Admin can create classroom + cohort, invite staff by email.
- Existing user receives in-app notification + email; on accept gains classroom access.
- New user follows signup → invitation flow.
- Teaching staff can create cohorts/lessons/schedules/attendance for their classrooms.
- Non-teaching staff can only view; create buttons hidden + RLS blocks writes.
