import { useEffect, useState, type FormEvent } from 'react';
import { Route, Switch, Router as WouterRouter } from 'wouter';
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Check,
  GraduationCap,
  Layers3,
  MapPin,
  RefreshCw,
  UsersRound,
  X,
} from 'lucide-react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import NotFound from '@/pages/not-found';

type AuthMode = 'signup' | 'login';
type LearnerPath = 'school_learner' | 'wassce_candidate' | 'independent_learner';
type Profile = {
  id: string;
  role: string | null;
  full_name: string | null;
  learner_path: LearnerPath | null;
  education_level: string | null;
  grade_level: string | null;
  school_name: string | null;
  county: string | null;
  target_exam_year: number | null;
  onboarding_completed: boolean | null;
};
type Subject = { id: string; name: string; description: string | null };
type LearningClass = {
  id: string;
  name: string;
  education_level: string | null;
  grade_level: string | null;
  academic_year: number | string | null;
  status: string | null;
};
type Toast = { message: string; kind: 'success' | 'error' } | null;

const paths: { id: LearnerPath; title: string; description: string; number: string }[] = [
  { id: 'school_learner', title: 'School learner', description: 'For primary, junior high, and senior high students building strong foundations.', number: '01' },
  { id: 'wassce_candidate', title: 'WASSCE candidate', description: 'For learners preparing for WASSCE, including private candidates.', number: '02' },
  { id: 'independent_learner', title: 'Independent learner', description: 'For self-study, adult learning, and revision at your own pace.', number: '03' },
];

const educationLevels = [
  ['primary', 'Primary school'],
  ['junior_high', 'Junior high school'],
  ['senior_high', 'Senior high school'],
  ['college_vocational', 'College / vocational'],
  ['other', 'Other / not sure yet'],
];

const pretty = (value?: string | null) =>
  value ? value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()) : '';

function Brand() {
  return (
    <a className="brand" href="/" aria-label="BridgeLIB home" data-testid="link-bridgelib-home">
      <span className="brand-mark">B</span>
      <span>Bridge<span className="brand-light">LIB</span></span>
    </a>
  );
}

function BridgeHome() {
  const [user, setUser] = useState<User | null>(null);
  const [restoring, setRestoring] = useState(true);
  const [mode, setMode] = useState<AuthMode>('signup');
  const [authOpen, setAuthOpen] = useState(false);
  const [selectedPath, setSelectedPath] = useState<LearnerPath>('school_learner');
  const [busy, setBusy] = useState(false);
  const [authMessage, setAuthMessage] = useState<Toast>(null);
  const [toast, setToast] = useState<Toast>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [classes, setClasses] = useState<LearningClass[]>([]);
  const [profileState, setProfileState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [subjectsState, setSubjectsState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [classesState, setClassesState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [dashboardError, setDashboardError] = useState('');
  const [subjectError, setSubjectError] = useState('');
  const [classError, setClassError] = useState('');
  const [onboardingBusy, setOnboardingBusy] = useState(false);
  const [schoolBusy, setSchoolBusy] = useState(false);
  const [schoolMessage, setSchoolMessage] = useState<Toast>(null);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      if (error) setToast({ message: `We could not restore your session: ${error.message}`, kind: 'error' });
      setUser(data.session?.user ?? null);
      setRestoring(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session: Session | null) => {
      setUser(session?.user ?? null);
      setRestoring(false);
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 4500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!user) setSelectedSubject(null);
  }, [user]);

  const loadDashboard = async (current: User) => {
    setProfileState('loading');
    setSubjectsState('loading');
    setClassesState('loading');
    setDashboardError('');
    setSubjectError('');
    setClassError('');
    const [profileResult, subjectResult, classResult] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', current.id).maybeSingle(),
      supabase.from('subjects').select('id,name,description').order('name'),
      supabase.from('classes').select('id,name,education_level,grade_level,academic_year,status').order('created_at', { ascending: false }).limit(20),
    ]);
    if (profileResult.error) {
      setProfileState('error');
      setDashboardError(profileResult.error.message);
    } else {
      setProfile(profileResult.data as Profile | null);
      setProfileState('ready');
    }
    if (subjectResult.error) {
      setSubjectsState('error');
      setSubjectError(subjectResult.error.message);
    } else {
      setSubjects((subjectResult.data ?? []) as Subject[]);
      setSubjectsState('ready');
    }
    if (classResult.error) {
      setClassesState('error');
      setClassError(classResult.error.message);
    } else {
      setClasses((classResult.data ?? []) as LearningClass[]);
      setClassesState('ready');
    }
  };

  useEffect(() => {
    if (user) void loadDashboard(user);
    else {
      setProfile(null);
      setSubjects([]);
      setClasses([]);
    }
    // Supabase user ID is the resource boundary; loadDashboard is intentionally not a dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const openAuth = (nextMode: AuthMode, path: LearnerPath = 'school_learner') => {
    setMode(nextMode);
    setSelectedPath(path);
    setAuthOpen(true);
    setAuthMessage(null);
    window.setTimeout(() => document.getElementById('auth-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 30);
  };

  const onAuthSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get('email') ?? '').trim();
    const password = String(form.get('password') ?? '');
    setBusy(true);
    setAuthMessage(null);
    try {
      if (mode === 'signup') {
        const fullName = String(form.get('fullName') ?? '').trim();
        const learnerPath = String(form.get('learnerPath') ?? selectedPath) as LearnerPath;
        const educationLevel = String(form.get('educationLevel') ?? '');
        const gradeLevel = String(form.get('gradeLevel') ?? '').trim() || null;
        const yearText = String(form.get('examYear') ?? '').trim();
        const targetExamYear = yearText ? Number(yearText) : null;
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              learner_path: learnerPath,
              education_level: educationLevel,
              grade_level: gradeLevel,
              target_exam_year: targetExamYear,
            },
          },
        });
        if (error) throw error;
        if (data.session && data.user) {
          const { error: updateError } = await supabase.from('profiles').update({
            full_name: fullName,
            learner_path: learnerPath,
            education_level: educationLevel,
            grade_level: gradeLevel,
            target_exam_year: targetExamYear,
            onboarding_completed: true,
            updated_at: new Date().toISOString(),
          }).eq('id', data.user.id);
          if (updateError) throw updateError;
          setAuthMessage({ message: 'Your account is ready. Opening your BridgeLIB space…', kind: 'success' });
          setUser(data.user);
        } else {
          setAuthMessage({ message: 'Account created. Check your email for a confirmation link, then sign in to finish your profile.', kind: 'success' });
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        setUser(data.user);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Something went wrong. Please try again.';
      setAuthMessage({ message, kind: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const onOnboardingSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user) return;
    const form = new FormData(event.currentTarget);
    const yearText = String(form.get('target_exam_year') ?? '').trim();
    setOnboardingBusy(true);
    try {
      const { error } = await supabase.from('profiles').update({
        full_name: String(form.get('full_name') ?? '').trim(),
        learner_path: String(form.get('learner_path') ?? ''),
        education_level: String(form.get('education_level') ?? ''),
        grade_level: String(form.get('grade_level') ?? '').trim() || null,
        target_exam_year: yearText ? Number(yearText) : null,
        onboarding_completed: true,
        updated_at: new Date().toISOString(),
      }).eq('id', user.id);
      if (error) throw error;
      setToast({ message: 'Your learner profile has been saved.', kind: 'success' });
      await loadDashboard(user);
    } catch (error) {
      setToast({ message: error instanceof Error ? error.message : 'Your profile could not be saved.', kind: 'error' });
    } finally {
      setOnboardingBusy(false);
    }
  };

  const onSchoolSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user) return;
    const form = new FormData(event.currentTarget);
    setSchoolBusy(true);
    setSchoolMessage(null);
    try {
      const { error } = await supabase.from('schools').insert({
        name: String(form.get('schoolName') ?? '').trim(),
        county: String(form.get('county') ?? '').trim() || null,
        school_type: String(form.get('schoolType') ?? 'public'),
        created_by: user.id,
        status: 'pending',
      });
      if (error) throw error;
      setSchoolMessage({ message: 'Application submitted for review. Your school is not verified yet.', kind: 'success' });
      event.currentTarget.reset();
    } catch (error) {
      setSchoolMessage({ message: error instanceof Error ? error.message : 'Could not submit the school application.', kind: 'error' });
    } finally {
      setSchoolBusy(false);
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) setToast({ message: error.message, kind: 'error' });
    else {
      setUser(null);
      setToast({ message: 'You have signed out.', kind: 'success' });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const restoreView = restoring ? (
    <main className="app-section" aria-live="polite">
      <div className="bridge-wrap">
        <div className="loading-line" />
        <div style={{ height: 18 }} />
        <div className="loading-block" />
      </div>
    </main>
  ) : user ? (
    <main className="app-section" id="dashboard">
      <div className="bridge-wrap">
        <header className="app-header">
          <div>
            <p className="eyebrow">YOUR BRIDGELIB SPACE</p>
            <h2 data-testid="text-welcome">{profile?.full_name ? `Welcome, ${profile.full_name.split(' ')[0]}` : `Welcome, ${user.email?.split('@')[0] ?? 'learner'}`}</h2>
            <p>{profile?.role === 'teacher' ? 'Your teacher workspace is ready to grow.' : 'Your learning journey continues here.'}</p>
          </div>
          <button className="bridge-button secondary" type="button" onClick={signOut} data-testid="button-sign-out">Sign out <ArrowUpRight size={16} /></button>
        </header>

        {profileState === 'error' && (
          <div className="dashboard-card" role="alert" data-testid="status-profile-error">
            <h3>We could not load your profile</h3>
            <p>{dashboardError}</p>
            <button className="bridge-button secondary" onClick={() => void loadDashboard(user)} data-testid="button-retry-profile"><RefreshCw size={15} /> Try again</button>
          </div>
        )}

        {profileState === 'loading' && <div className="dashboard-card" aria-label="Loading learner profile"><div className="loading-line" /><div style={{ height: 14 }} /><div className="loading-line" /></div>}

        {profileState === 'ready' && profile && !profile.onboarding_completed && (
          <section className="dashboard-card" aria-labelledby="onboarding-heading">
            <h3 id="onboarding-heading">Finish your learner profile</h3>
            <p>These details help BridgeLIB show the right learning information. Your account role cannot be changed here.</p>
            <form className="school-form" onSubmit={onOnboardingSubmit}>
              <label className="form-field">Full name<input name="full_name" defaultValue={profile.full_name ?? ''} required data-testid="input-onboarding-name" /></label>
              <label className="form-field">Learning path<select name="learner_path" defaultValue={profile.learner_path ?? 'school_learner'} data-testid="select-onboarding-path">{paths.map((path) => <option key={path.id} value={path.id}>{path.title}</option>)}</select></label>
              <label className="form-field">Education level<select name="education_level" defaultValue={profile.education_level ?? 'primary'} data-testid="select-onboarding-level">{educationLevels.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
              <label className="form-field">Grade / class<input name="grade_level" defaultValue={profile.grade_level ?? ''} placeholder="For example, Grade 8" data-testid="input-onboarding-grade" /></label>
              <label className="form-field">Target WASSCE year<input name="target_exam_year" type="number" min="2020" max="2100" defaultValue={profile.target_exam_year ?? ''} data-testid="input-onboarding-exam-year" /></label>
              <button className="bridge-button primary" type="submit" disabled={onboardingBusy} data-testid="button-save-onboarding">{onboardingBusy ? 'Saving…' : 'Save learner profile'}</button>
            </form>
          </section>
        )}

        <div className="dashboard-grid">
          <section className="dashboard-card dashboard-main">
            <span className="dashboard-icon"><BookOpen aria-hidden="true" /></span>
            <h3>My learning</h3>
            {profileState === 'ready' ? (
              <p data-testid="text-profile-summary">
                {profile
                  ? [pretty(profile.learner_path), pretty(profile.education_level), profile.grade_level].filter(Boolean).join(' · ') || 'Your learner profile is being prepared.'
                  : 'Your profile is being prepared.'}
              </p>
            ) : <p>Your learning profile is loading.</p>}
            <div className="subject-list" aria-live="polite">
              {subjectsState === 'loading' && <><div className="loading-block" /><div className="loading-block" /></>}
              {subjectsState === 'error' && <div className="list-state" role="alert" data-testid="status-subjects-error">Subjects could not be loaded. {subjectError}<br /><button className="text-button" onClick={() => user && void loadDashboard(user)} data-testid="button-retry-subjects">Try again</button></div>}
              {subjectsState === 'ready' && subjects.length === 0 && <div className="list-state" data-testid="status-subjects-empty">Subject resources will appear here as they are added.</div>}
              {subjectsState === 'ready' && (
                <Dialog
                  open={selectedSubject !== null}
                  onOpenChange={(open) => {
                    if (!open) setSelectedSubject(null);
                  }}
                >
                  {subjects.map((subject) => (
                    <DialogTrigger asChild key={subject.id}>
                      <button
                        className="subject-item subject-card-trigger"
                        type="button"
                        onClick={() => setSelectedSubject(subject)}
                        aria-label={`View ${subject.name} learning details`}
                        data-testid={`card-subject-${subject.id}`}
                      >
                        {subject.name}
                        <small>{subject.description || 'Subject'}</small>
                      </button>
                    </DialogTrigger>
                  ))}
                  <DialogContent className="subject-dialog" data-testid="dialog-subject-details">
                    {selectedSubject && (
                      <>
                        <DialogHeader className="subject-dialog-header">
                          <span className="subject-dialog-kicker">SUBJECT OVERVIEW</span>
                          <DialogTitle className="subject-dialog-title">{selectedSubject.name}</DialogTitle>
                          <DialogDescription className="subject-dialog-description">
                            {selectedSubject.description?.trim() || 'No description has been added for this subject yet.'}
                          </DialogDescription>
                        </DialogHeader>
                        <section className="subject-learning-note" aria-label="Learning resources">
                          <h4>Learning resources</h4>
                          <p>Lessons, activities, and practice for {selectedSubject.name} will appear here as they are added to BridgeLIB.</p>
                        </section>
                        <DialogFooter className="subject-dialog-footer">
                          <DialogClose asChild>
                            <button className="bridge-button secondary" type="button" data-testid="button-close-subject-dialog">
                              Back to subjects
                            </button>
                          </DialogClose>
                        </DialogFooter>
                      </>
                    )}
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </section>

          <section className="dashboard-card">
            <span className="dashboard-icon"><UsersRound aria-hidden="true" /></span>
            <h3>Available classes</h3>
            <p>Classes visible to your account under current access rules. Class joining is not available yet.</p>
            <div className="subject-list" aria-live="polite">
              {classesState === 'loading' && <div className="loading-block" />}
              {classesState === 'error' && <div className="list-state" role="alert" data-testid="status-classes-error">Class information could not be loaded. {classError}<br /><button className="text-button" onClick={() => user && void loadDashboard(user)} data-testid="button-retry-classes">Try again</button></div>}
              {classesState === 'ready' && classes.length === 0 && <div className="list-state" data-testid="status-classes-empty">No available classes are currently visible to your account.</div>}
              {classesState === 'ready' && classes.map((item) => (
                <div className="subject-item" key={item.id} data-testid={`card-class-${item.id}`}>{item.name}<small>{[pretty(item.education_level), item.grade_level, item.academic_year, pretty(item.status)].filter(Boolean).join(' · ')}</small></div>
              ))}
            </div>
          </section>

          <section className="dashboard-card">
            <span className="dashboard-icon"><Layers3 aria-hidden="true" /></span>
            <h3>Practice & exams</h3>
            <p>Question banks, past papers, digital tests, and results are not available in this foundation yet.</p>
            <span className="feature-status" data-testid="status-practice-planned">Planned for a future build phase</span>
          </section>

          <section className="dashboard-card">
            <span className="dashboard-icon"><ArrowUpRight aria-hidden="true" /></span>
            <h3>My progress</h3>
            <p>Progress history will appear when learning activities and assessments are introduced.</p>
            <span className="feature-status" data-testid="status-progress-planned">Not available yet</span>
          </section>
        </div>

        <section className="dashboard-card school-application">
          <h3>Register a school</h3>
          <p>Submit a school profile for review. Submitting it does not mean the school is verified or create an institutional partnership.</p>
          <form className="school-form" onSubmit={onSchoolSubmit}>
            <label className="form-field">School name<input name="schoolName" required maxLength={180} placeholder="School name" data-testid="input-school-name" /></label>
            <label className="form-field">School type<select name="schoolType" defaultValue="public" data-testid="select-school-type"><option value="public">Public</option><option value="private">Private</option><option value="faith_based">Faith-based</option><option value="community">Community</option><option value="other">Other</option></select></label>
            <label className="form-field">County<input name="county" placeholder="County (optional)" data-testid="input-school-county" /></label>
            <button className="bridge-button primary" type="submit" disabled={schoolBusy} data-testid="button-submit-school">{schoolBusy ? 'Submitting…' : 'Submit school'}</button>
          </form>
          {schoolMessage && <p className={`status-message ${schoolMessage.kind}`} role="status" data-testid="status-school-application">{schoolMessage.message}</p>}
        </section>

        {['teacher', 'school_admin', 'admin'].includes(profile?.role ?? '') && (
          <section className="dashboard-card teacher-notice" data-testid="status-teacher-role">
            <span className="dashboard-icon"><GraduationCap aria-hidden="true" /></span>
            <h3>Teacher workspace</h3>
            <p>Your approved account role is recognized. Creating classes and managing examinations are not available in this build.</p>
          </section>
        )}
      </div>
    </main>
  ) : (
    <>
      <main>
        <section className="bridge-wrap hero" id="hero">
          <div className="hero-copy">
            <p className="eyebrow">BUILT FOR LEARNING IN LIBERIA</p>
            <h1>Learn better.<br /><span>Move forward.</span></h1>
            <p className="hero-text">Lessons, practice, school classes, and exam preparation—brought together in one learning platform for Liberia.</p>
            <div className="hero-actions">
              <button className="bridge-button primary" onClick={() => openAuth('signup')} data-testid="button-hero-signup">Create free account <ArrowRight size={17} /></button>
              <button className="bridge-button secondary" onClick={() => openAuth('login')} data-testid="button-hero-login">Sign in</button>
            </div>
            <p className="fine-print">A growing education platform for learners and teachers across Liberia.</p>
          </div>
          <div className="hero-art" aria-label="Illustration of the BridgeLIB learner dashboard">
            <div className="art-orbit orbit-one" /><div className="art-orbit orbit-two" />
            <div className="art-card art-main">
              <div className="art-card-top"><span className="dot" /><span className="dot" /><span className="dot" /><span className="art-label">MY LEARNING</span></div>
              <div className="art-title">Your next step starts here.</div>
              <div className="art-progress"><span /></div>
              <div className="art-row"><span className="art-icon blue">M</span><div><b>Mathematics</b><small>Practice and improve</small></div><span className="art-arrow"><ArrowUpRight size={17} /></span></div>
              <div className="art-row"><span className="art-icon green">E</span><div><b>English Language</b><small>Lessons and revision</small></div><span className="art-arrow"><ArrowUpRight size={17} /></span></div>
              <div className="art-row"><span className="art-icon violet">L</span><div><b>Learning pathways</b><small>One step at a time</small></div><span className="art-arrow"><ArrowUpRight size={17} /></span></div>
            </div>
            <div className="floating-tag tag-top">A place to keep learning</div>
            <div className="floating-tag tag-bottom"><Check size={14} /> Progress, step by step</div>
          </div>
        </section>

        <section className="section" id="features">
          <div className="bridge-wrap">
            <div className="section-heading">
              <p className="eyebrow">ONE CONNECTED PLATFORM</p>
              <h2 className="section-title">Learning belongs<br />within reach.</h2>
              <p>BridgeLIB is being built to connect learning, teaching, and school life in one secure place—with tools designed for learners across Liberia.</p>
            </div>
            <div className="feature-grid">
              <article className="feature-card"><div className="feature-icon blue-bg"><BookOpen /></div><h3>Lessons & subjects</h3><p>Organize learning by education level, grade, subject, and topic.</p></article>
              <article className="feature-card"><div className="feature-icon green-bg"><Check /></div><h3>Practice & exams</h3><p>Build toward question banks, past papers, digital tests, and feedback.</p></article>
              <article className="feature-card"><div className="feature-icon violet-bg"><UsersRound /></div><h3>Classes & teachers</h3><p>Give teachers a place to manage classes and student work.</p></article>
              <article className="feature-card"><div className="feature-icon amber-bg"><MapPin /></div><h3>Learning across Liberia</h3><p>Make space for schools and learners from every county.</p></article>
            </div>
          </div>
        </section>

        <section className="section soft" id="pathways">
          <div className="bridge-wrap">
            <div className="section-heading">
              <p className="eyebrow">CHOOSE YOUR PATH</p>
              <h2 className="section-title">One account.<br />Your learning journey.</h2>
              <p>Choose the path that best describes your current learning goal. You can update learning details later.</p>
            </div>
            <div className="path-grid">
              {paths.map((path) => (
                <article className={`path-card ${path.id === 'wassce_candidate' ? 'featured' : ''}`} key={path.id}>
                  <span className="path-number">{path.number}</span>
                  <h3>{path.title}</h3>
                  <p>{path.description}</p>
                  <button className="text-button" onClick={() => openAuth('signup', path.id)} data-testid={`button-select-path-${path.id}`}>Choose this path <ArrowRight size={15} /></button>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className={`auth-section ${authOpen ? '' : 'hidden'}`} id="auth-section" aria-labelledby="auth-title">
          <div className="auth-card">
            <button className="close-button" aria-label="Close account form" onClick={() => { setAuthOpen(false); document.getElementById('hero')?.scrollIntoView({ behavior: 'smooth' }); }} data-testid="button-close-auth"><X size={18} /></button>
            <div className="auth-heading">
              <span className="brand-mark">B</span>
              <p className="eyebrow">WELCOME TO BRIDGELIB</p>
              <h2 id="auth-title">{mode === 'signup' ? 'Create your account' : 'Welcome back'}</h2>
              <p>{mode === 'signup' ? 'Start your learning journey.' : 'Sign in to continue learning.'}</p>
            </div>
            <div className="auth-tabs" role="tablist" aria-label="Account access">
              <button className={`auth-tab ${mode === 'signup' ? 'active' : ''}`} role="tab" aria-selected={mode === 'signup'} onClick={() => { setMode('signup'); setAuthMessage(null); }} data-testid="tab-create-account">Create account</button>
              <button className={`auth-tab ${mode === 'login' ? 'active' : ''}`} role="tab" aria-selected={mode === 'login'} onClick={() => { setMode('login'); setAuthMessage(null); }} data-testid="tab-sign-in">Sign in</button>
            </div>
            <form onSubmit={onAuthSubmit}>
              {mode === 'signup' && <>
                <label className="form-field">Full name<input name="fullName" autoComplete="name" placeholder="Your full name" required data-testid="input-full-name" /></label>
                <label className="form-field">Learning path<select name="learnerPath" value={selectedPath} onChange={(event) => setSelectedPath(event.target.value as LearnerPath)} data-testid="select-learner-path">{paths.map((path) => <option value={path.id} key={path.id}>{path.title}</option>)}</select></label>
                <label className="form-field">Education level<select name="educationLevel" required data-testid="select-education-level">{educationLevels.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
                <label className="form-field">Current grade or class<input name="gradeLevel" placeholder="For example, Grade 8 or private candidate" data-testid="input-grade-level" /></label>
                {selectedPath === 'wassce_candidate' && <label className="form-field">Target WASSCE year <span className="muted">(optional)</span><input name="examYear" type="number" min="2020" max="2100" placeholder="For example, 2027" data-testid="input-exam-year" /></label>}
              </>}
              <label className="form-field">Email address<input name="email" type="email" autoComplete="email" placeholder="you@example.com" required data-testid="input-email" /></label>
              <label className="form-field">Password<input name="password" type="password" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} minLength={8} placeholder="At least 8 characters" required data-testid="input-password" /></label>
              <button className="bridge-button primary button-full" type="submit" disabled={busy} data-testid="button-auth-submit">{busy ? (mode === 'signup' ? 'Creating account…' : 'Signing in…') : mode === 'signup' ? 'Create account' : 'Sign in'} <ArrowRight size={16} /></button>
              {authMessage && <p className={`status-message ${authMessage.kind}`} role="status" data-testid="status-auth-message">{authMessage.message}</p>}
            </form>
            <p className="auth-note">Teacher and school access use a separate verification process. This learner form cannot grant teacher privileges.</p>
          </div>
        </section>
      </main>
      <footer className="footer">
        <div className="bridge-wrap footer-inner">
          <Brand />
          <p>Building better learning opportunities in Liberia.</p>
          <small>BridgeLIB is an independent project. Government or institutional partnerships will only be announced after formal approval.</small>
        </div>
      </footer>
    </>
  );

  return (
    <div className="bridge-shell">
      <header className="bridge-header">
        <Brand />
        {!user && !restoring && <nav className="bridge-nav" aria-label="Main navigation">
          <a href="#features" data-testid="link-features">Features</a>
          <a href="#pathways" data-testid="link-learning-paths">Learning paths</a>
          <button className="bridge-button quiet" onClick={() => openAuth('login')} data-testid="button-nav-login">Sign in</button>
        </nav>}
        {user && <span className="bridge-nav" data-testid="text-signed-in">Learning space</span>}
      </header>
      {restoreView}
      {toast && <div className={`toast ${toast.kind}`} role="status" data-testid="status-toast">{toast.message}</div>}
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={BridgeHome} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
      <Router />
    </WouterRouter>
  );
}

export default App;
