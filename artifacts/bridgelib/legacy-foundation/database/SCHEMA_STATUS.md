# BridgeLIB database status

## Existing tables retained
- `profiles`
- `subjects` (11 existing rows retained)
- `exam_papers`
- `scholarships`

## Added profile fields
- `learner_path`
- `education_level`
- `grade_level`
- `school_name`
- `county`
- `target_exam_year`
- `onboarding_completed`

A trigger now creates a `profiles` row when a new Supabase Auth user is created. The profile role is not editable by the user through normal profile updates.

## Added school/class tables
- `schools`
- `school_memberships`
- `classes`
- `teacher_class_assignments`
- `class_memberships`
- `class_invites`

All these tables have Row Level Security enabled. The class invitation acceptance flow and assessment/question tables are future migrations.

## Security note
The `public.rls_auto_enable()` function has had execute permission revoked from `PUBLIC`, `anon`, and `authenticated`. Supabase's security advisor returned no security lints after the fix. Continue to run advisors after future migrations.


The signup trigger also saves the selected learner path, education level, grade, and target exam year from signup metadata, so email-confirmation flows do not lose onboarding choices. These are profile fields only and do not grant permissions.
