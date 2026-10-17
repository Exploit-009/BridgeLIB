
import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, RefreshCw, Plus, Save } from 'lucide-react';
import { supabase } from '../lib/supabase';

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

type Plan = {
  id: string;
  name: string;
  description: string | null;
  billing_interval: 'monthly' | 'yearly';
  amount_minor: number;
  currency: 'LRD' | 'USD';
  is_active: boolean;
};

const groups: AdminGroup[] = [
  {
    title: 'Content management',
    description: 'Learning resources and platform announcements.',
    areas: [
      { id: 'subjects', title: 'Subjects', summary: 'Review the subject catalogue.', status: 'Not connected', details: 'Subject management will be connected in a later step.' },
      { id: 'lessons', title: 'Lessons', summary: 'Organize lessons and learning materials.', status: 'Not connected', details: 'Lesson management will be connected after the lesson schema is verified.' },
      { id: 'exam-questions', title: 'Exam questions', summary: 'Manage question-bank content.', status: 'Not connected', details: 'Question-bank management is not connected yet.' },
      { id: 'announcements', title: 'Announcements', summary: 'Prepare platform notices.', status: 'Not connected', details: 'Announcement management is not connected yet.' },
      { id: 'scholarships', title: 'Scholarships', summary: 'Review scholarship listings.', status: 'Not connected', details: 'Scholarship management is not connected yet.' },
    ],
  },
  {
    title: 'People and schools',
    description: 'Accounts and institutions.',
    areas: [
      { id: 'students', title: 'Students', summary: 'Student-account management.', status: 'Not connected', details: 'Student management will be developed separately.' },
      { id: 'teachers', title: 'Teachers', summary: 'Teacher-account management.', status: 'Not connected', details: 'Teacher management will be developed separately.' },
      { id: 'schools', title: 'Schools', summary: 'School-review management.', status: 'Not connected', details: 'School management will be connected in a later step.' },
    ],
  },
  {
    title: 'Subscriptions and payments',
    description: 'Manage premium plans and prepare payment oversight.',
    areas: [
      { id: 'subscriptions', title: 'Subscriptions', summary: 'Create plans and control their prices.', status: 'Connected to subscription_plans', details: 'Manage BridgeLIB premium plan prices and availability.' },
      { id: 'payments', title: 'Payments', summary: 'Review payment transactions.', status: 'Payment records not connected to this screen', details: 'Payment history and school invoices will be connected in the next phase. Mobile-money processing is not enabled yet.' },
    ],
  },
];

type AdminDashboardProps = {
  onNavigateHome: () => void;
  onSignOut: () => void | Promise<void>;
};

const emptyPlan = {
  name: '',
  description: '',
  billing_interval: 'monthly' as 'monthly' | 'yearly',
  amount: '',
  currency: 'LRD' as 'LRD' | 'USD',
  is_active: false,
};

function formatAmount(amountMinor: number, currency: string) {
  const amount = amountMinor / 100;
  return `${currency} ${amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function AdminDashboard({
  onNavigateHome,
  onSignOut,
}: AdminDashboardProps) {
  const [activeArea, setActiveArea] = useState<AdminArea | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [form, setForm] = useState(emptyPlan);
  const [editingId, setEditingId] = useState<string | null>(null);

  async function loadPlans() {
    setLoading(true);
    setError('');

    const { data, error: loadError } = await supabase
      .from('subscription_plans')
      .select('id,name,description,billing_interval,amount_minor,currency,is_active')
      .order('created_at', { ascending: false });

    if (loadError) {
      setError(`Could not load plans: ${loadError.message}`);
      setPlans([]);
    } else {
      setPlans((data ?? []) as Plan[]);
    }

    setLoading(false);
  }

  useEffect(() => {
    void loadPlans();
  }, []);

  function startEditing(plan: Plan) {
    setEditingId(plan.id);
    setForm({
      name: plan.name,
      description: plan.description ?? '',
      billing_interval: plan.billing_interval,
      amount: String(plan.amount_minor / 100),
      currency: plan.currency,
      is_active: plan.is_active,
    });
    setMessage('');
    setError('');
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyPlan);
    setMessage('');
  }

  async function savePlan(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setMessage('');

    const amount = Number(form.amount);

    if (!form.name.trim()) {
      setError('Enter a plan name.');
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      setError('Enter a price greater than zero.');
      return;
    }

    if (amount > 100000000000) {
      setError('That price is too large.');
      return;
    }

    const amountMinor = Math.round(amount * 100);

    setSaving(true);

    const values = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      billing_interval: form.billing_interval,
      amount_minor: amountMinor,
      currency: form.currency,
      is_active: form.is_active,
      updated_at: new Date().toISOString(),
    };

    const result = editingId
      ? await supabase
          .from('subscription_plans')
          .update(values)
          .eq('id', editingId)
          .select('id')
      : await supabase
          .from('subscription_plans')
          .insert(values)
          .select('id');

    setSaving(false);

    if (result.error) {
      setError(`Could not save plan: ${result.error.message}`);
      return;
    }

    if (!result.data?.length) {
      setError('No plan was saved. Check your admin role and Supabase permissions.');
      return;
    }

    setMessage(editingId ? 'Plan updated.' : 'Plan created.');
    resetForm();
    await loadPlans();
  }

  async function togglePlan(plan: Plan) {
    setError('');
    setMessage('');

    const { data, error: updateError } = await supabase
      .from('subscription_plans')
      .update({
        is_active: !plan.is_active,
        updated_at: new Date().toISOString(),
      })
      .eq('id', plan.id)
      .select('id');

    if (updateError) {
      setError(`Could not update plan: ${updateError.message}`);
      return;
    }

    if (!data?.length) {
      setError('No plan was changed. Check your admin role and Supabase permissions.');
      return;
    }

    setMessage(`${plan.name} is now ${plan.is_active ? 'inactive' : 'active'}.`);
    await loadPlans();
  }

  return (
    <main className="admin-section" id="admin-dashboard" data-testid="admin-dashboard">
      <div className="bridge-wrap">
        <header className="admin-page-header">
          <div>
            <p className="eyebrow">ADMIN WORKSPACE · ROLE FROM PROFILE</p>
            <h1>Platform management</h1>
            <p>Manage BridgeLIB premium pricing and review other management areas.</p>
          </div>
          <div className="admin-header-actions">
            <button className="bridge-button secondary" type="button" onClick={onNavigateHome}>
              <ArrowLeft size={16} aria-hidden="true" /> Learning space
            </button>
            <button className="bridge-button quiet" type="button" onClick={() => void onSignOut()}>
              Sign out
            </button>
          </div>
        </header>

        <section className="admin-security-note" role="status">
          <strong>Database access stays protected.</strong>
          <span>Supabase RLS must authorize all changes. This dashboard does not use a service-role key.</span>
        </section>

        <div className="admin-dashboard-layout">
          <nav className="admin-sidebar" aria-label="Admin dashboard sections">
            <button
              className={`admin-nav-button ${activeArea ? '' : 'active'}`}
              type="button"
              onClick={() => setActiveArea(null)}
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
                    onClick={() => setActiveArea(area)}
                  >
                    {area.title}
                  </button>
                ))}
              </div>
            ))}
          </nav>

          <div className="admin-main-content">
            {activeArea?.id === 'subscriptions' ? (
              <section className="admin-detail-panel">
                <button className="admin-back-link" type="button" onClick={() => setActiveArea(null)}>
                  <ArrowLeft size={15} aria-hidden="true" /> Back to overview
                </button>

                <p className="eyebrow">SUBSCRIPTIONS</p>
                <h2>Premium plan pricing</h2>
                <p className="admin-area-summary">
                  Create plans and set their prices. New plans are inactive by default until you activate them.
                </p>

                {error && <p role="alert">{error}</p>}
                {message && <p role="status">{message}</p>}

                <form onSubmit={savePlan} className="admin-placeholder-panel">
                  <h3>{editingId ? 'Edit plan' : 'Create a premium plan'}</h3>

                  <label>
                    Plan name
                    <input
                      required
                      value={form.name}
                      onChange={(event) => setForm({ ...form, name: event.target.value })}
                      placeholder="e.g. BridgeLIB Premium"
                    />
                  </label>

                  <label>
                    Description
                    <textarea
                      value={form.description}
                      onChange={(event) => setForm({ ...form, description: event.target.value })}
                      placeholder="What does this plan include?"
                      rows={3}
                    />
                  </label>

                  <label>
                    Price
                    <input
                      required
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={form.amount}
                      onChange={(event) => setForm({ ...form, amount: event.target.value })}
                      placeholder="0.00"
                    />
                  </label>

                  <label>
                    Currency
                    <select
                      value={form.currency}
                      onChange={(event) => setForm({ ...form, currency: event.target.value as 'LRD' | 'USD' })}
                    >
                      <option value="LRD">Liberian dollar (LRD)</option>
                      <option value="USD">US dollar (USD)</option>
                    </select>
                  </label>

                  <label>
                    Billing period
                    <select
                      value={form.billing_interval}
                      onChange={(event) => setForm({ ...form, billing_interval: event.target.value as 'monthly' | 'yearly' })}
                    >
                      <option value="monthly">Monthly</option>
                      <option value="yearly">Yearly</option>
                    </select>
                  </label>

                  <label>
                    <input
                      type="checkbox"
                      checked={form.is_active}
                      onChange={(event) => setForm({ ...form, is_active: event.target.checked })}
                    />
                    Offer this plan to learners
                  </label>

                  <div className="admin-header-actions">
                    <button className="bridge-button" type="submit" disabled={saving}>
                      <Save size={16} aria-hidden="true" />
                      {saving ? 'Saving…' : editingId ? 'Save changes' : 'Create plan'}
                    </button>
                    {editingId && (
                      <button className="bridge-button secondary" type="button" onClick={resetForm}>
                        Cancel edit
                      </button>
                    )}
                  </div>
                </form>

                <div className="admin-overview-heading">
                  <h3>Saved plans</h3>
                  <button className="bridge-button secondary" type="button" onClick={() => void loadPlans()} disabled={loading}>
                    <RefreshCw size={15} aria-hidden="true" /> Refresh
                  </button>
                </div>

                {loading ? (
                  <p>Loading subscription plans…</p>
                ) : plans.length === 0 ? (
                  <p>No plans found. Create your first plan above.</p>
                ) : (
                  <div className="admin-area-grid">
                    {plans.map((plan) => (
                      <article className="admin-status-card" key={plan.id}>
                        <span className="admin-card-label">{plan.billing_interval} billing</span>
                        <h3>{plan.name}</h3>
                        <strong>{formatAmount(plan.amount_minor, plan.currency)}</strong>
                        <p>{plan.description || 'No description provided.'}</p>
                        <p>Status: {plan.is_active ? 'Active' : 'Inactive'}</p>
                        <div className="admin-header-actions">
                          <button className="bridge-button secondary" type="button" onClick={() => startEditing(plan)}>
                            Edit
                          </button>
                          <button className="bridge-button quiet" type="button" onClick={() => void togglePlan(plan)}>
                            {plan.is_active ? 'Deactivate' : 'Activate'}
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                )}

                <p className="admin-detail-footnote">
                  Prices are stored in minor units. No mobile-money payment is initiated by this page.
                </p>
              </section>
            ) : activeArea ? (
              <section className="admin-detail-panel">
                <button className="admin-back-link" type="button" onClick={() => setActiveArea(null)}>
                  <ArrowLeft size={15} aria-hidden="true" /> Back to overview
                </button>
                <p className="eyebrow">
                  {groups.find((group) => group.areas.some((area) => area.id === activeArea.id))?.title}
                </p>
                <h2>{activeArea.title}</h2>
                <p className="admin-area-summary">{activeArea.summary}</p>
                <span className="admin-status-pill">{activeArea.status}</span>
                <div className="admin-placeholder-panel">
                  <strong>Not connected yet</strong>
                  <p>{activeArea.details}</p>
                </div>
              </section>
            ) : (
              <div className="admin-overview" data-testid="admin-overview">
                <div className="admin-overview-heading">
                  <div>
                    <p className="eyebrow">OVERVIEW</p>
                    <h2>Management areas</h2>
                  </div>
                  <span className="admin-read-only-badge">Pricing management available</span>
                </div>

                <div className="admin-overview-status-grid">
                  <article className="admin-status-card">
                    <span className="admin-card-label">Administrator access</span>
                    <strong>Profile role checked</strong>
                    <p>Existing app-level admin access must remain in place.</p>
                  </article>
                  <article className="admin-status-card">
                    <span className="admin-card-label">Subscription plans</span>
                    <strong>{plans.length} plan(s)</strong>
                    <p>Open Subscriptions to create or manage premium pricing.</p>
                  </article>
                  <article className="admin-status-card">
                    <span className="admin-card-label">Payments</span>
                    <strong>Not connected yet</strong>
                    <p>Orange Money and MTN MoMo processing still require a secure provider integration.</p>
                  </article>
                </div>

                {groups.map((group) => (
                  <section className="admin-overview-group" key={group.title}>
                    <div className="admin-group-heading">
                      <div>
                        <h3>{group.title}</h3>
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
                        >
                          <span className="admin-area-mark" aria-hidden="true">
                            {area.title.slice(0, 2).toUpperCase()}
                          </span>
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
