# BridgeLIB Web — Foundation v1

This is the first browser-based BridgeLIB frontend, connected to the existing Supabase project with a **publishable** key. It does not use a service-role/secret key.

## Included
- Responsive landing page and mobile-first layout
- Learner signup paths: School Learner, WASSCE Candidate, Independent Learner
- Email/password sign-in
- Learner profile onboarding fields
- Authenticated subject listing
- Dashboard placeholder for classes, practice/exams, and progress
- School application submission with pending status
- Supabase auth profile creation is handled by a database trigger

## Files
- `index.html` — page structure
- `css/styles.css` — responsive design
- `js/config.js` — Supabase URL and publishable key
- `js/app.js` — authentication and dashboard behavior
- `database/` — notes about the current remote database state

## Run it
1. Upload/extract the ZIP into a browser-based editor or static host.
2. Open `index.html` through that editor's preview or local static server. Some browser environments block auth redirects when opening a raw `file://` page.
3. In Supabase Authentication settings, configure the Site URL and allowed redirect URLs for your chosen preview/deployment URL.
4. Ensure email confirmation settings match your desired test flow.
5. Test account signup with an email address you can access, then sign in.
6. Do not put any `service_role` or secret key in this project.

## Important current limits
- Teacher roles must be assigned through a trusted administrative process; learners cannot grant themselves teacher/admin access.
- Class tables and policies exist, but the class invite join flow and digital exam engine are not implemented yet.
- School applications are stored as `pending`; submission does not verify a school or establish a Ministry partnership.
- The site has not been deployed publicly and needs end-to-end testing on your chosen preview host.
- Do not distribute official past papers or third-party question-bank content without checking permission/licensing.

## Existing Supabase database
Project reference: `qlwtccmvddhgdnknrgnh`
Region: `eu-west-1`

The connected remote project already has migrations:
- `bridge_lib_additive_foundation`
- `bridge_profile_security_and_auth`
- `bridge_school_class_foundation`
- `bridge_fix_class_policy_scoping`
- `bridge_preserve_signup_onboarding`

The SQL migrations have been applied to the connected Supabase project. Do not blindly re-run them against another database. Use new versioned migrations for future changes.
