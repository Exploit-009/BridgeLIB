# BridgeLIB

BridgeLIB connects learners, teachers, and schools across Liberia with a shared online learning space.

## Run & Operate

- `pnpm --filter @workspace/bridgelib run dev` — run the BridgeLIB web app through its managed workflow
- `pnpm --filter @workspace/bridgelib run typecheck` — typecheck the web app
- `pnpm run typecheck` — typecheck all workspace packages
- The app uses the existing external Supabase project and its browser-safe publishable key.
- Do not apply the bundled historical migrations to another database or put a service-role key in the browser.

## Stack

- pnpm workspaces, TypeScript, React, and Vite
- Authentication and learner data: the existing Supabase project, accessed with its JavaScript client
- Authorization: Supabase Row Level Security; users must not be able to assign their own roles

## Where things live

- `artifacts/bridgelib/` — BridgeLIB web application
- `artifacts/bridgelib/legacy-foundation/` — original supplied website and database-status notes
- `artifacts/api-server/` — shared API scaffold (not the source of BridgeLIB learner data)

## Architecture decisions

- Keep the existing Supabase database and authentication; do not migrate the app to the workspace database.
- Roles are assigned through a trusted administrative process, never by learner signup.
- School submissions remain pending until reviewed; a submission does not verify a school.
- Classes, digital exams, and progress tracking must not be represented with fabricated learner data.

## Product

- Public landing page with school learner, WASSCE candidate, and independent learner signup paths.
- Email/password account creation and sign-in, profile onboarding, subject and class views, and pending school applications.
- Exam engine, class invitation acceptance, and progress history are not implemented in the supplied foundation.

## User preferences

No additional preferences stated.

## Gotchas

- The database already has applied migrations in the existing Supabase project; review its status notes before any schema work.

## Pointers

- See `artifacts/bridgelib/legacy-foundation/README.md` and `database/SCHEMA_STATUS.md` for the supplied project's scope and database history.
- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
