import { useState } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';

type AdminArea = {
  id: string;
  title: string;
  summary: string;
  status: string;
  details: string;
};

type AdminGroup = {
  title: string;
  description: string;
  areas: AdminArea[];
};

const groups: AdminGroup[] = [
  {
    title: 'Content management',
    description: 'Learning resources and platform announcements.',
    areas: [
      {
        id: 'subjects',
        title: 'Subjects',
        summary: 'Review the subject catalogue.',
        status: 'Existing table · no actions',
        details: 'The existing subjects table is not queried or modified by this shell. Any future management action must be covered by Supabase RLS.',
      },
      {
        id: 'lessons',
        title: 'Lessons',
        summary: 'Organize lessons and learning materials.',
        status: 'No verified lesson table',
        details: 'Lesson records are not connected here. This section stays inactive until a suitable schema and its RLS policies are verified.',
      },
      {
        id: 'exam-questions',
        title: 'Exam questions',
        summary: 'Manage question-bank content.',
        status: 'No question table verified',
        details: 'The project notes identify exam-question and assessment tables as future work. The existing exam_papers table is not treated as a question bank.',
      },
      {
        id: 'announcements',
        title: 'Announcements',
        summary: 'Prepare platform notices.',
        status: 'No verified announcement table',
        details: 'No announcement records are loaded or written in this first phase.',
      },
      {
        id: 'scholarships',
        title: 'Scholarships',
        summary: 'Review scholarship listings.',
        status: 'Existing table · no actions',
        details: 'A scholarships table exists, but this shell does not read or change its records. RLS must authorize any later management operation.',
      },
    ],
  },
  {
    title: 'People and schools',
    description: 'Accounts and institutions protected by existing access rules.',
    areas: [
      {
        id: 'students',
        title: 'Students',
        summary: 'Student-account management entry point.',
        status: 'Profiles · no global listing',
        details: 'Profiles are not enumerated here. This shell only relies on the signed-in user’s already-loaded profile role to display the route.',
      },
      {
        id: 'teachers',
        title: 'Teachers',
        summary: 'Teacher-account management entry point.',
        status: 'Profiles · no global listing',
        details: 'Teacher profiles are not queried or changed here. Role assignments remain outside this client-side shell and must follow the trusted administrative process.',
      },
      {
        id: 'schools',
        title: 'Schools',
        summary: 'School-review management entry point.',
        status: 'Existing table · no actions',
        details: 'This page does not load or update school records or application status. Existing school RLS remains in force.',
      },
    ],
  },
  {
    title: 'Subscriptions and payments',
    description: 'Tracking entry points only; no billing operations are enabled.',
    areas: [
      {
        id: 'subscriptions',
        title: 'Subscriptions',
        summary: 'Future plan and subscription tracking.',
        status: 'No subscription table',
        details: 'The verified public schema has no subscription table. LRD/USD plan prices, subscription status, and expiry are not configured or stored by this shell.',
      },
      {
        id: 'payments',
        title: 'Payments',
        summary: 'Future transaction-status tracking.',
        status: 'No transaction table',
        details: 'No payment records or processing are available here. Orange Money and Lonestar MTN are not integrated or verified.',
      },
    ],
  },
];

type AdminDashboardProps = {
  onNavigateHome: () => void;
  onSignOut: () => void | Promise<void>;
};

export default function AdminDashboard({ onNavigateHome, onSignOut }: AdminDashboardProps) {
  const [activeArea, setActiveArea] = useState<AdminArea | null>(null);

  return (
    <main className="admin-section" id="admin-dashboard" data-testid="admin-dashboard">
      <div className="bridge-wrap">
        <header className="admin-page-header">
          <div>
            <p className="eyebrow">ADMIN WORKSPACE · ROLE FROM PROFILE</p>
            <h1>Platform management</h1>
            <p>First-phase dashboard shell. Management records and actions are not connected.</p>
          </div>
          <div className="admin-header-actions">
            <button className="bridge-button secondary" type="button" onClick={onNavigateHome} data-testid="button-admin-learning-space">
              <ArrowLeft size={16} aria-hidden="true" /> Learning space
            </button>
            <button className="bridge-button quiet" type="button" onClick={() => void onSignOut()} data-testid="button-admin-sign-out">
              Sign out
            </button>
          </div>
        </header>

        <section className="admin-security-note" role="status" data-testid="status-admin-rls-note">
          <strong>Database access stays protected.</strong>
          <span>This role check controls the navigation only. This shell makes no management data requests or writes; future operations must still be authorized by Supabase RLS.</span>
        </section>

        <div className="admin-dashboard-layout">
          <nav className="admin-sidebar" aria-label="Admin dashboard sections">
            <button
              className={`admin-nav-button ${activeArea ? '' : 'active'}`}
              type="button"
              aria-current={activeArea ? undefined : 'page'}
              onClick={() => setActiveArea(null)}
              data-testid="admin-nav-overview"
            >
              Overview
            </button>
            {groups.map((group) => (
              <div className="admin-sidebar-group" key={group.title}>
                <p className="admin-sidebar-group-title">{group.title}</p>
                {group.areas.map((area) => (
                  <button
                    className={`admin-nav-button ${activeArea?.id === area.id ? 'active' : ''}`}
                    key={area.id}
                    type="button"
                    aria-current={activeArea?.id === area.id ? 'page' : undefined}
                    onClick={() => setActiveArea(area)}
                    data-testid={`admin-nav-${area.id}`}
                  >
                    {area.title}
                  </button>
                ))}
              </div>
            ))}
          </nav>

          <div className="admin-main-content">
            {activeArea ? (
              <section className="admin-detail-panel" aria-labelledby="admin-area-title">
                <button className="admin-back-link" type="button" onClick={() => setActiveArea(null)} data-testid="button-admin-back-overview">
                  <ArrowLeft size={15} aria-hidden="true" /> Back to overview
                </button>
                <p className="eyebrow">{groups.find((group) => group.areas.some((area) => area.id === activeArea.id))?.title}</p>
                <h2 id="admin-area-title" data-testid="admin-area-title">{activeArea.title}</h2>
                <p className="admin-area-summary">{activeArea.summary}</p>
                <span className="admin-status-pill">{activeArea.status}</span>
                <div className="admin-placeholder-panel">
                  <strong>Placeholder — no records changed</strong>
                  <p>{activeArea.details}</p>
                </div>
                <p className="admin-detail-footnote">No service-role key is used. Supabase RLS remains the enforcement boundary for any future data access.</p>
              </section>
            ) : (
              <div className="admin-overview" data-testid="admin-overview">
                <div className="admin-overview-heading">
                  <div>
                    <p className="eyebrow">OVERVIEW</p>
                    <h2>Management areas</h2>
                  </div>
                  <span className="admin-read-only-badge">Shell only · no data changed</span>
                </div>

                <div className="admin-overview-status-grid">
                  <article className="admin-status-card">
                    <span className="admin-card-label">Navigation gate</span>
                    <strong>Profile role checked</strong>
                    <p>The admin link appears only after the signed-in profile is loaded with role “admin”.</p>
                  </article>
                  <article className="admin-status-card">
                    <span className="admin-card-label">Management data</span>
                    <strong>Not connected</strong>
                    <p>No content, profile, school, subscription, or payment records are queried by this page.</p>
                  </article>
                  <article className="admin-status-card">
                    <span className="admin-card-label">Payment processing</span>
                    <strong>Not enabled</strong>
                    <p>No provider integration or transaction tracking is claimed in this phase.</p>
                  </article>
                </div>

                {groups.map((group) => (
                  <section className="admin-overview-group" key={group.title} aria-labelledby={`group-${group.title.replaceAll(' ', '-').toLowerCase()}`}>
                    <div className="admin-group-heading">
                      <div>
                        <h3 id={`group-${group.title.replaceAll(' ', '-').toLowerCase()}`}>{group.title}</h3>
                        <p>{group.description}</p>
                      </div>
                    </div>
                    <div className="admin-area-grid">
                      {group.areas.map((area) => (
                        <button
                          className="admin-area-card"
                          key={area.id}
                          type="button"
                          onClick={() => setActiveArea(area)}
                          data-testid={`admin-open-${area.id}`}
                        >
                          <span className="admin-area-mark" aria-hidden="true">{area.title.slice(0, 2).toUpperCase()}</span>
                          <span className="admin-area-card-body">
                            <strong>{area.title}</strong>
                            <span>{area.summary}</span>
                            <small>{area.status}</small>
                          </span>
                          <ArrowRight className="admin-area-arrow" size={17} aria-hidden="true" />
                        </button>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
