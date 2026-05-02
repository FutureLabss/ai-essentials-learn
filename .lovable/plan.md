# Leaderboard & Gamification

Bring learners back daily by rewarding progress with points, streaks, and badges, and showing a friendly public leaderboard.

## What learners will see

1. **Gamification card on Dashboard** — total points, current streak (with flame icon), rank, and next badge progress.
2. **Leaderboard page (`/leaderboard`)** — top 50 learners this week, this month, and all-time. Tabs to switch. Shows display name (first name + last initial), avatar, points, streak. Current user always pinned at the bottom if not in top 50.
3. **Badge gallery** — unlocked vs locked badges with descriptions, on profile/Settings page.
4. **Toast + animation** when points are earned or a badge unlocked ("+10 points · Lesson complete!").
5. **Streak reminder** — small banner if streak is at risk today (push/email already exists; add UI nudge).

## Point rules (configurable)

| Action | Points |
|---|---|
| Complete a lesson | 10 |
| Pass a quiz (first attempt) | 25 |
| Pass a quiz (retry) | 10 |
| Submit an assignment | 15 |
| Complete a week | 50 (bonus) |
| Earn a certificate | 200 |
| Daily login (first lesson activity of day) | 5 |
| Post in discussion | 5 (cap 2/day) |
| Leave a course review | 20 |

Points are awarded server-side only, never trusted from the client.

## Streak rules

- Streak = consecutive days with at least one completed lesson.
- Resets to 0 if a day is missed (timezone: Africa/Lagos).
- Milestones: 3, 7, 14, 30, 60, 100 days → award badges.

## Badges (initial set)

Progression: First Step (1 lesson), Week Warrior (1 week complete), Course Champion (1 course complete), Polymath (2+ courses).
Streaks: On Fire (3-day), Unstoppable (7-day), Devoted (30-day).
Quality: Perfect Score (100% on a quiz), Helpful Voice (10 discussion posts), Reviewer (left a review).
Special: Early Bird (joined first month), Referrer (once referrals ship).

## Privacy

- Leaderboard opt-out toggle in Settings (default: opted in).
- Display name only (first name + last initial). Never email or phone.

## Technical plan

### Database (migration)

```sql
-- Points ledger (auditable, append-only)
create table public.point_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  event_type text not null,           -- 'lesson_complete', 'quiz_pass', etc.
  reference_id text,                  -- lesson_id / quiz_id / etc.
  points int not null,
  created_at timestamptz not null default now(),
  unique (user_id, event_type, reference_id)  -- prevents double-award
);

-- Aggregated user stats (denormalized for fast leaderboard)
create table public.user_gamification (
  user_id uuid primary key,
  total_points int not null default 0,
  current_streak int not null default 0,
  longest_streak int not null default 0,
  last_active_date date,
  leaderboard_opt_in boolean not null default true,
  updated_at timestamptz not null default now()
);

-- Badge catalog + unlocks
create table public.badges (
  id text primary key,                -- 'first_step', 'on_fire', etc.
  name text not null,
  description text not null,
  icon text not null,                 -- lucide icon name
  category text not null              -- 'progression' | 'streak' | 'quality' | 'special'
);

create table public.user_badges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  badge_id text not null references public.badges(id),
  earned_at timestamptz not null default now(),
  unique (user_id, badge_id)
);
```

RLS:
- `point_events`: users SELECT own; service role INSERT.
- `user_gamification`: users SELECT own + SELECT others where `leaderboard_opt_in = true`; users UPDATE own (only `leaderboard_opt_in`); service role full access.
- `badges`: authenticated SELECT.
- `user_badges`: authenticated SELECT (public for leaderboard profile peek); service role INSERT.

### Edge function: `award-points`

Single source of truth. Called from existing flows (lesson complete, quiz attempt, etc.). Validates JWT, checks for duplicate via unique constraint, inserts `point_events`, recomputes `user_gamification` (points + streak), evaluates badge rules and inserts unlocks. Returns `{ pointsAdded, newTotal, streak, newBadges[] }`.

### Client integration points

- `markLessonComplete` → invoke `award-points` with `lesson_complete`.
- Quiz submit (`Quiz.tsx`) → invoke with `quiz_pass` (only if passed).
- `AssignmentSubmission.tsx` → `assignment_submit`.
- `LessonDiscussion.tsx` → `discussion_post`.
- `CourseReviews.tsx` → `course_review`.
- Certificate creation → `certificate_earned`.

Show toast with points/badges from response.

### New files

- `src/pages/Leaderboard.tsx` — tabs (Weekly/Monthly/All-time), avatar list, current-user pin.
- `src/components/GamificationCard.tsx` — Dashboard widget (points, streak, next badge).
- `src/components/BadgeGallery.tsx` — used in Settings.
- `src/lib/gamification.ts` — typed wrapper around `award-points` invoke.
- `supabase/functions/award-points/index.ts`.
- Route `/leaderboard` added to `App.tsx`, nav link in `AppShell`.

### Backfill

One-time SQL to seed `point_events` from existing `lesson_progress`, `quiz_attempts`, `certificates`, `assignment_submissions`, `course_reviews` so existing learners aren't at zero. Then refresh `user_gamification`.

## Out of scope (next iteration)

- Cohort-only leaderboards
- Tutor/admin role excluded from leaderboard
- Seasons/resets
- Redeemable rewards (discount codes for top learners)

Ready to build?