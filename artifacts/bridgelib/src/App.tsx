import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, Route, Switch, Router as WouterRouter, useLocation } from 'wouter';
import { ArrowRight, ArrowUpRight, BookOpen, Check, GraduationCap, Layers3, MapPin, RefreshCw, UsersRound, X } from 'lucide-react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import NotFound from '@/pages/not-found';
import AdminDashboard from '@/pages/admin-dashboard';

type AuthMode = 'signup' | 'login';
type LearnerPath = 'school_learner' | 'wassce_candidate' | 'independent_learner';
type Profile = { id: string; role: string | null; full_name: string | null; learner_path: LearnerPath | null; education_level: string | null; grade_level: string | null; school_name: string | null; county: string | null; target_exam_year: number | null; onboarding_completed: boolean | null };
type Subject = { id: string | number; name: string; description: string | null };
type LearningClass = { id: string; name: string; education_level: string | null; grade_level: string | null; academic_year: number | string | null; status: string | null };
type Toast = { message: string; kind: 'success' | 'error' } | null;
type PracticeOption = { id: string; text: string };
type PracticeQuestion = { id: string; prompt: string; options: PracticeOption[]; explanation: string | null; exam_type: string | null };
type ReviewItem = { question_id: string; prompt: string; is_correct: boolean; correct_option: string; explanation: string | null };
type ExamResult = { score: number; total_questions: number; review?: ReviewItem[] };

const paths: { id: LearnerPath; title: string; description: string; number: string }[] = [
  { id: 'school_learner', title: 'School learner', description: 'For primary, junior high, and senior high students building strong foundations.', number: '01' },
  { id: 'wassce_candidate', title: 'WASSCE candidate', description: 'For learners preparing for WASSCE, including private candidates.', number: '02' },
  { id: 'independent_learner', title: 'Independent learner', description: 'For self-study, adult learning, and revision at your own pace.', number: '03' },
];
const educationLevels = [['primary', 'Primary school'], ['junior_high', 'Junior high school'], ['senior_high', 'Senior high school'], ['college_vocational', 'College / vocational'], ['other', 'Other / not sure yet']];
const pretty = (value?: string | null) => value ? value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()) : '';
const getErrorMessage = (error: unknown, fallback: string) => error instanceof Error ? error.message : fallback;

function Brand() { return <a className="brand" href="/" aria-label="BridgeLIB home" data-testid="link-bridgelib-home"><span className="brand-mark">B</span><span>Bridge<span className="brand-light">LIB</span></span></a>; }
function AdminAccessNotice({ message, onReturnHome, onRetry }: { message: string; onReturnHome: () => void; onRetry?: () => void }) {
  return <main className="admin-access-page" data-testid="admin-access-denied"><div className="bridge-wrap"><section className="admin-access-card" role="alert"><p className="eyebrow">ADMIN ACCESS</p><h1>Access denied</h1><p>{message}</p><div className="admin-access-actions">{onRetry && <button className="bridge-button primary" type="button" onClick={onRetry} data-testid="button-retry-admin-check">Retry profile check</button>}<button className="bridge-button secondary" type="button" onClick={onReturnHome} data-testid="button-return-from-admin">Return to learning space</button></div></section></div></main>;
}

function BridgeHome() {
  const [location, setLocation] = useLocation();
  const [user, setUser] = useState<User | null>(null);
  const [restoring, setRestoring] = useState(true);
  const [mode, setMode] = useState<AuthMode>('signup');
  const [authOpen, setAuthOpen] = useState(false);
  const [resetMode, setResetMode] = useState(false);
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
    }).catch((error: unknown) => {
      if (!active) return;
      setToast({ message: getErrorMessage(error, 'Could not restore your session.'), kind: 'error' });
      setRestoring(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session: Session | null) => {
      setUser(session?.user ?? null);
      setRestoring(false);
    });
    return () => { active = false; listener.subscription.unsubscribe(); };
  }, []);

  useEffect(() => { if (!toast) return; const timer = window.setTimeout(() => setToast(null), 4500); return () => window.clearTimeout(timer); }, [toast]);
  useEffect(() => { if (!user) setSelectedSubject(null); }, [user]);

  const loadDashboard = useCallback(async (current: User) => {
    setProfileState('loading'); setSubjectsState('loading'); setClassesState('loading');
    setDashboardError(''); setSubjectError(''); setClassError('');
    const [profileResult, subjectResult, classResult] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', current.id).maybeSingle(),
      supabase.from('subjects').select('id,name,description').order('name'),
      supabase.from('classes').select('id,name,education_level,grade_level,academic_year,status').order('created_at', { ascending: false }).limit(20),
    ]);
    if (profileResult.error) { setProfileState('error'); setDashboardError(profileResult.error.message); }
    else { setProfile(profileResult.data as Profile | null); setProfileState('ready'); }
    if (subjectResult.error) { setSubjectsState('error'); setSubjectError(subjectResult.error.message); }
    else { setSubjects((subjectResult.data ?? []) as Subject[]); setSubjectsState('ready'); }
    if (classResult.error) { setClassesState('error'); setClassError(classResult.error.message); }
    else { setClasses((classResult.data ?? []) as LearningClass[]); setClassesState('ready'); }
  }, []);

  useEffect(() => {
    if (user) void loadDashboard(user);
    else { setProfile(null); setSubjects([]); setClasses([]); setProfileState('loading'); setSubjectsState('loading'); setClassesState('loading'); }
  }, [user?.id, loadDashboard]);

  const openAuth = (nextMode: AuthMode, path: LearnerPath = 'school_learner') => {
    setMode(nextMode); setSelectedPath(path); setResetMode(false); setAuthOpen(true); setAuthMessage(null);
    window.setTimeout(() => document.getElementById('auth-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 30);
  };

  const onAuthSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    const email = String(form.get('email') ?? '').trim(); const password = String(form.get('password') ?? '');
    setBusy(true); setAuthMessage(null);
    try {
      if (resetMode) {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/` });
        if (error) throw error;
        setAuthMessage({ message: 'If an account exists for that email, a password-reset link has been sent. Check your inbox and spam folder.', kind: 'success' });
        return;
      }
      if (mode === 'signup') {
        const fullName = String(form.get('fullName') ?? '').trim();
        const learnerPath = String(form.get('learnerPath') ?? selectedPath) as LearnerPath;
        const educationLevel = String(form.get('educationLevel') ?? 'primary');
        const gradeLevel = String(form.get('gradeLevel') ?? '').trim() || null;
        const yearText = String(form.get('examYear') ?? '').trim(); const targetExamYear = yearText ? Number(yearText) : null;
        const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: fullName, learner_path: learnerPath, education_level: educationLevel, grade_level: gradeLevel, target_exam_year: targetExamYear } } });
        if (error) throw error;
        if (data.session && data.user) {
          const { error: updateError } = await supabase.from('profiles').update({ full_name: fullName, learner_path: learnerPath, education_level: educationLevel, grade_level: gradeLevel, target_exam_year: targetExamYear, onboarding_completed: true, updated_at: new Date().toISOString() }).eq('id', data.user.id);
          if (updateError) throw updateError;
          setAuthMessage({ message: 'Your account is ready. Opening your BridgeLIB space鈥�', kind: 'success' }); setUser(data.user);
        } else setAuthMessage({ message: 'Account created. Check your email for a confirmation link, then sign in.', kind: 'success' });
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error; setUser(data.user); setAuthOpen(false);
      }
    } catch (error) { setAuthMessage({ message: getErrorMessage(error, 'Something went wrong. Please try again.'), kind: 'error' }); }
    finally { setBusy(false); }
  };

  const onOnboardingSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); if (!user) return; const form = new FormData(event.currentTarget);
    const yearText = String(form.get('target_exam_year') ?? '').trim(); setOnboardingBusy(true);
    try {
      const { error } = await supabase.from('profiles').update({ full_name: String(form.get('full_name') ?? '').trim(), learner_path: String(form.get('learner_path') ?? ''), education_level: String(form.get('education_level') ?? ''), grade_level: String(form.get('grade_level') ?? '').trim() || null, target_exam_year: yearText ? Number(yearText) : null, onboarding_completed: true, updated_at: new Date().toISOString() }).eq('id', user.id);
      if (error) throw error; setToast({ message: 'Your learner profile has been saved.', kind: 'success' }); await loadDashboard(user);
    } catch (error) { setToast({ message: getErrorMessage(error, 'Your profile could not be saved.'), kind: 'error' }); }
    finally { setOnboardingBusy(false); }
  };

  const onSchoolSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); if (!user) return; const form = new FormData(event.currentTarget); setSchoolBusy(true); setSchoolMessage(null);
    try {
      const { error } = await supabase.from('schools').insert({ name: String(form.get('schoolName') ?? '').trim(), county: String(form.get('county') ?? '').trim() || null, school_type: String(form.get('schoolType') ?? 'public'), created_by: user.id, status: 'pending' });
      if (error) throw error; setSchoolMessage({ message: 'Application submitted for review. Your school is not verified yet.', kind: 'success' }); (event.currentTarget as HTMLFormElement).reset();
    } catch (error) { setSchoolMessage({ message: getErrorMessage(error, 'Could not submit the school application.'), kind: 'error' }); }
    finally { setSchoolBusy(false); }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) setToast({ message: error.message, kind: 'error' });
    else { setUser(null); setToast({ message: 'You have signed out.', kind: 'success' }); window.scrollTo({ top: 0, behavior: 'smooth' }); setLocation('/'); }
  };
  const isAdminRoute = location === '/admin' || location === '/admin/';
  const isVerifiedAdmin = Boolean(user && profileState === 'ready' && profile?.role === 'admin');
  const returnHome = () => setLocation('/');
  const adminRouteView = !user ? <AdminAccessNotice message="Sign in with a BridgeLIB administrator account. Access is denied until the profile role can be verified." onReturnHome={returnHome} /> : profileState === 'loading' ? <main className="admin-access-page" aria-live="polite" data-testid="admin-access-checking"><div className="bridge-wrap"><section className="admin-access-card"><p className="eyebrow">ADMIN ACCESS</p><h1>Checking your profile</h1><p>Admin access stays closed until BridgeLIB can verify your database profile.</p><div className="loading-line" aria-hidden="true" /></section></div></main> : profileState === 'error' ? <AdminAccessNotice message="We couldn't verify your admin profile. Access is denied until the profile check succeeds." onReturnHome={returnHome} onRetry={() => void loadDashboard(user)} /> : profile?.role !== 'admin' ? <AdminAccessNotice message="This account does not have an admin role. No management data is available on this page." onReturnHome={returnHome} /> : <AdminDashboard onNavigateHome={returnHome} onSignOut={signOut} />;

  const restoreView = restoring ? <main className="app-section" aria-live="polite"><div className="bridge-wrap"><div className="loading-line" /><div style={{ height: 18 }} /><div className="loading-block" /></div></main> : isAdminRoute ? adminRouteView : user ? (
    <main className="app-section" id="dashboard"><div className="bridge-wrap">
      <header className="app-header"><div><p className="eyebrow">YOUR BRIDGELIB SPACE</p><h2 data-testid="text-welcome">{profile?.full_name ? `Welcome, ${profile.full_name.split(' ')[0]}` : `Welcome, ${user.email?.split('@')[0] ?? 'learner'}`}</h2><p>{profile?.role === 'teacher' ? 'Your teacher workspace is ready to grow.' : 'Your learning journey continues here.'}</p></div><button className="bridge-button secondary" type="button" onClick={signOut} data-testid="button-sign-out">Sign out <ArrowUpRight size={16} /></button></header>
      {profileState === 'error' && <div className="dashboard-card" role="alert" data-testid="status-profile-error"><h3>We could not load your profile</h3><p>{dashboardError}</p><button className="bridge-button secondary" onClick={() => void loadDashboard(user)}><RefreshCw size={15} /> Try again</button></div>}
      {profileState === 'loading' && <div className="dashboard-card" aria-label="Loading learner profile"><div className="loading-line" /><div style={{ height: 14 }} /><div className="loading-line" /></div>}
      {profileState === 'ready' && profile && !profile.onboarding_completed && <section className="dashboard-card" aria-labelledby="onboarding-heading"><h3 id="onboarding-heading">Finish your learner profile</h3><p>These details help BridgeLIB show the right learning information. Your account role cannot be changed here.</p><form className="school-form" onSubmit={onOnboardingSubmit}><label className="form-field">Full name<input name="full_name" defaultValue={profile.full_name ?? ''} required /></label><label className="form-field">Learning path<select name="learner_path" defaultValue={profile.learner_path ?? 'school_learner'}>{paths.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}</select></label><label className="form-field">Education level<select name="education_level" defaultValue={profile.education_level ?? 'primary'}>{educationLevels.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="form-field">Grade / class<input name="grade_level" defaultValue={profile.grade_level ?? ''} placeholder="For example, Grade 8" /></label><label className="form-field">Target WASSCE year<input name="target_exam_year" type="number" min="2020" max="2100" defaultValue={profile.target_exam_year ?? ''} /></label><button className="bridge-button primary" type="submit" disabled={onboardingBusy}>{onboardingBusy ? 'Saving鈥�' : 'Save learner profile'}</button></form></section>}
      <div className="dashboard-grid">
        <section className="dashboard-card dashboard-main"><span className="dashboard-icon"><BookOpen /></span><h3>My learning</h3><p data-testid="text-profile-summary">{profile ? [pretty(profile.learner_path), pretty(profile.education_level), profile.grade_level].filter(Boolean).join(' 路 ') || 'Your learner profile is being prepared.' : 'Your learning profile is loading.'}</p><div className="subject-list" aria-live="polite">
          {subjectsState === 'loading' && <><div className="loading-block" /><div className="loading-block" /></>}
          {subjectsState === 'error' && <div className="list-state" role="alert" data-testid="status-subjects-error">Subjects could not be loaded. {subjectError}<br /><button className="text-button" onClick={() => user && void loadDashboard(user)}>Try again</button></div>}
          {subjectsState === 'ready' && subjects.length === 0 && <div className="list-state">Subject resources will appear here as they are added.</div>}
          {subjectsState === 'ready' && <Dialog open={selectedSubject !== null} onOpenChange={(open) => { if (!open) setSelectedSubject(null); }}><div className="subject-list">{subjects.map((subject) => <DialogTrigger asChild key={subject.id}><button className="subject-item subject-card-trigger" type="button" onClick={() => setSelectedSubject(subject)}>{subject.name}<small>{subject.description || 'Subject'}</small></button></DialogTrigger>)}</div><DialogContent className="subject-dialog"><>{selectedSubject && <><DialogHeader className="subject-dialog-header"><span className="subject-dialog-kicker">SUBJECT OVERVIEW</span><DialogTitle className="subject-dialog-title">{selectedSubject.name}</DialogTitle><DialogDescription className="subject-dialog-description">{selectedSubject.description?.trim() || 'No description has been added for this subject yet.'}</DialogDescription></DialogHeader><section className="subject-learning-note"><h4>Learning resources</h4><p>Lessons, activities, and practice for {selectedSubject.name} will appear here as they are added to BridgeLIB.</p><Link href="/practice" className="bridge-button primary">Open Practice Exams <ArrowRight size={16} /></Link></section><DialogFooter className="subject-dialog-footer"><DialogClose asChild><button className="bridge-button secondary" type="button">Back to subjects</button></DialogClose></DialogFooter></>}</></DialogContent></Dialog>}
        </div></section>
        <section className="dashboard-card"><span className="dashboard-icon"><UsersRound /></span><h3>Available classes</h3><p>Classes visible to your account under current access rules. Class joining is not available yet.</p><div className="subject-list" aria-live="polite">{classesState === 'loading' && <div className="loading-block" />}{classesState === 'error' && <div className="list-state" role="alert">Class information could not be loaded. {classError}<br /><button className="text-button" onClick={() => user && void loadDashboard(user)}>Try again</button></div>}{classesState === 'ready' && classes.length === 0 && <div className="list-state">No available classes are currently visible to your account.</div>}{classesState === 'ready' && classes.map((item) => <div className="subject-item" key={item.id}>{item.name}<small>{[pretty(item.education_level), item.grade_level, item.academic_year, pretty(item.status)].filter(Boolean).join(' 路 ')}</small></div>)}</div></section>
        <section className="dashboard-card"><span className="dashboard-icon"><Layers3 /></span><h3>Practice & exams</h3><p>Practise subjects, answer exam questions, check your score, and review explanations.</p><Link href="/practice" className="bridge-button primary">Start Practice <ArrowRight size={16} /></Link></section>
        <section className="dashboard-card"><span className="dashboard-icon"><ArrowUpRight /></span><h3>My progress</h3><p>Your saved assessment history will appear here as progress tracking is connected.</p><span className="feature-status">Progress tracking in development</span></section>
      </div>
      <section className="dashboard-card school-application"><h3>Register a school</h3><p>Submit a school profile for review. Submitting it does not mean the school is verified.</p><form className="school-form" onSubmit={onSchoolSubmit}><label className="form-field">School name<input name="schoolName" required maxLength={180} placeholder="School name" /></label><label className="form-field">School type<select name="schoolType" defaultValue="public"><option value="public">Public</option><option value="private">Private</option><option value="faith_based">Faith-based</option><option value="community">Community</option><option value="other">Other</option></select></label><label className="form-field">County<input name="county" placeholder="County (optional)" /></label><button className="bridge-button primary" type="submit" disabled={schoolBusy}>{schoolBusy ? 'Submitting鈥�' : 'Submit school'}</button></form>{schoolMessage && <p className={`status-message ${schoolMessage.kind}`} role="status">{schoolMessage.message}</p>}</section>
      {['teacher', 'school_admin', 'admin'].includes(profile?.role ?? '') && <section className="dashboard-card teacher-notice"><span className="dashboard-icon"><GraduationCap /></span><h3>Teacher workspace</h3><p>Your approved account role is recognized. Creating classes and managing examinations need connected tools.</p></section>}
    </div></main>
  ) : (
    <><main><section className="bridge-wrap hero" id="hero"><div className="hero-copy"><p className="eyebrow">BUILT FOR LEARNING IN LIBERIA</p><h1>Learn better.<br /><span>Move forward.</span></h1><p className="hero-text">Lessons, practice, school classes, and exam preparation鈥攂rought together in one learning platform for Liberia.</p><div className="hero-actions"><button className="bridge-button primary" onClick={() => openAuth('signup')}>Create free account <ArrowRight size={17} /></button><button className="bridge-button secondary" onClick={() => openAuth('login')}>Sign in</button></div><p className="fine-print">A growing education platform for learners and teachers across Liberia.</p></div><div className="hero-art" aria-label="Illustration of the BridgeLIB learner dashboard"><div className="art-orbit orbit-one" /><div className="art-orbit orbit-two" /><div className="art-card art-main"><div className="art-card-top"><span className="dot" /><span className="dot" /><span className="dot" /><span className="art-label">MY LEARNING</span></div><div className="art-title">Your next step starts here.</div><div className="art-progress"><span /></div>{[['M','Mathematics','Practice and improve','blue'],['E','English Language','Lessons and revision','green'],['L','Learning pathways','One step at a time','violet']].map(([letter, title, sub, color]) => <div className="art-row" key={title}><span className={`art-icon ${color}`}>{letter}</span><div><b>{title}</b><small>{sub}</small></div><span className="art-arrow"><ArrowUpRight size={17} /></span></div>)}</div><div className="floating-tag tag-top">A place to keep learning</div><div className="floating-tag tag-bottom"><Check size={14} /> Progress, step by step</div></div></section>
      <section className="section" id="features"><div className="bridge-wrap"><div className="section-heading"><p className="eyebrow">ONE CONNECTED PLATFORM</p><h2 className="section-title">Learning belongs<br />within reach.</h2><p>BridgeLIB is being built to connect learning, teaching, and school life in one secure place鈥攚ith tools designed for learners across Liberia.</p></div><div className="feature-grid">{[{icon:<BookOpen />, bg:'blue-bg', title:'Lessons & subjects', text:'Organize learning by education level, grade, subject, and topic.'},{icon:<Check />, bg:'green-bg', title:'Practice & exams', text:'Answer questions, review explanations, and prepare for examinations.'},{icon:<UsersRound />, bg:'violet-bg', title:'Classes & teachers', text:'Give teachers a place to manage classes and student work.'},{icon:<MapPin />, bg:'amber-bg', title:'Learning across Liberia', text:'Make space for schools and learners from every county.'}].map((item) => <article className="feature-card" key={item.title}><div className={`feature-icon ${item.bg}`}>{item.icon}</div><h3>{item.title}</h3><p>{item.text}</p></article>)}</div></div></section>
      <section className="section soft" id="pathways"><div className="bridge-wrap"><div className="section-heading"><p className="eyebrow">CHOOSE YOUR PATH</p><h2 className="section-title">One account.<br />Your learning journey.</h2><p>Choose the path that best describes your current learning goal. You can update learning details later.</p></div><div className="path-grid">{paths.map((path) => <article className={`path-card ${path.id === 'wassce_candidate' ? 'featured' : ''}`} key={path.id}><span className="path-number">{path.number}</span><h3>{path.title}</h3><p>{path.description}</p><button className="text-button" onClick={() => openAuth('signup', path.id)}>Choose this path <ArrowRight size={15} /></button></article>)}</div></div></section>
      <section className={`auth-section ${authOpen ? '' : 'hidden'}`} id="auth-section" aria-labelledby="auth-title"><div className="auth-card"><button className="close-button" aria-label="Close account form" onClick={() => { setAuthOpen(false); setResetMode(false); document.getElementById('hero')?.scrollIntoView({ behavior: 'smooth' }); }}><X size={18} /></button><div className="auth-heading"><span className="brand-mark">B</span><p className="eyebrow">WELCOME TO BRIDGELIB</p><h2 id="auth-title">{resetMode ? 'Reset your password' : mode === 'signup' ? 'Create your account' : 'Welcome back'}</h2><p>{resetMode ? 'Enter your email and we will send a password-reset link.' : mode === 'signup' ? 'Start your learning journey.' : 'Sign in to continue learning.'}</p></div>
        {!resetMode && <div className="auth-tabs" role="tablist" aria-label="Account access"><button className={`auth-tab ${mode === 'signup' ? 'active' : ''}`} role="tab" aria-selected={mode === 'signup'} onClick={() => { setMode('signup'); setAuthMessage(null); }}>Create account</button><button className={`auth-tab ${mode === 'login' ? 'active' : ''}`} role="tab" aria-selected={mode === 'login'} onClick={() => { setMode('login'); setAuthMessage(null); }}>Sign in</button></div>}
        <form onSubmit={onAuthSubmit}>
          {mode === 'signup' && !resetMode && <><label className="form-field">Full name<input name="fullName" autoComplete="name" placeholder="Your full name" required /></label><label className="form-field">Learning path<select name="learnerPath" value={selectedPath} onChange={(event) => setSelectedPath(event.target.value as LearnerPath)}>{paths.map((path) => <option value={path.id} key={path.id}>{path.title}</option>)}</select></label><label className="form-field">Education level<select name="educationLevel" required>{educationLevels.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label><label className="form-field">Current grade or class<input name="gradeLevel" placeholder="For example, Grade 8 or private candidate" /></label>{selectedPath === 'wassce_candidate' && <label className="form-field">Target WASSCE year <span className="muted">(optional)</span><input name="examYear" type="number" min="2020" max="2100" placeholder="For example, 2027" /></label>}</>}
          <label className="form-field">Email address<input name="email" type="email" autoComplete="email" placeholder="you@example.com" required /></label>
          {!resetMode && <label className="form-field">Password<input name="password" type="password" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} minLength={8} placeholder="At least 8 characters" required /></label>}
          <button className="bridge-button primary button-full" type="submit" disabled={busy}>{busy ? resetMode ? 'Sending link鈥�' : mode === 'signup' ? 'Creating account鈥�' : 'Signing in鈥�' : resetMode ? 'Send password-reset link' : mode === 'signup' ? 'Create account' : 'Sign in'} <ArrowRight size={16} /></button>
          {mode === 'login' && !resetMode && <button type="button" className="text-button" onClick={() => { setResetMode(true); setAuthMessage(null); }}>Forgot password?</button>}
          {resetMode && <button type="button" className="text-button" onClick={() => { setResetMode(false); setAuthMessage(null); }}>Back to sign in</button>}
          {authMessage && <p className={`status-message ${authMessage.kind}`} role="status">{authMessage.message}</p>}
        </form><p className="auth-note">Teacher and school access use a separate verification process. This learner form cannot grant teacher privileges.</p></div></section></main><footer className="footer"><div className="bridge-wrap footer-inner"><Brand /><p>Building better learning opportunities in Liberia.</p><small>BridgeLIB is an independent project. Government or institutional partnerships will only be announced after formal approval.</small></div></footer></>
  );
  return <div className="bridge-shell"><header className="bridge-header"><Brand />{!user && !restoring && <nav className="bridge-nav" aria-label="Main navigation"><a href="#features">Features</a><a href="#pathways">Learning paths</a><button className="bridge-button quiet" onClick={() => openAuth('login')}>Sign in</button></nav>}{user && <nav className="bridge-nav signed-in-nav" aria-label="Signed-in navigation"><Link href="/">Learning space</Link><Link href="/practice">Practice exams</Link>{isVerifiedAdmin && <Link href="/admin" aria-current={isAdminRoute ? 'page' : undefined}>Admin dashboard</Link>}</nav>}</header>{restoreView}{toast && <div className={`toast ${toast.kind}`} role="status" data-testid="status-toast">{toast.message}</div>}</div>;
}

function PracticePage() {
  const [subjects, setSubjects] = useState<Subject[]>([]); const [subjectId, setSubjectId] = useState(''); const [questions, setQuestions] = useState<PracticeQuestion[]>([]); const [answers, setAnswers] = useState<Record<string, string>>({}); const [review, setReview] = useState<ReviewItem[]>([]); const [result, setResult] = useState<ExamResult | null>(null); const [secondsLeft, setSecondsLeft] = useState(30 * 60); const [loading, setLoading] = useState(true); const [examStarted, setExamStarted] = useState(false); const [submitting, setSubmitting] = useState(false); const [errorMessage, setErrorMessage] = useState(''); const [authRequired, setAuthRequired] = useState(false); const submittingRef = useRef(false);
  useEffect(() => { let active = true; (async () => { setLoading(true); setErrorMessage(''); try { const { data, error } = await supabase.from('subjects').select('id,name,description').order('name'); if (error) throw error; if (active) setSubjects((data ?? []) as Subject[]); } catch (error) { if (active) setErrorMessage(getErrorMessage(error, 'Could not load subjects. Try again.')); } finally { if (active) setLoading(false); } })(); return () => { active = false; }; }, []);
  useEffect(() => { if (!examStarted || result) return; const timer = window.setInterval(() => setSecondsLeft((previous) => Math.max(0, previous - 1)), 1000); return () => window.clearInterval(timer); }, [examStarted, result]);
  async function startExam() { if (!subjectId) { setErrorMessage('Please choose a subject first.'); return; } setLoading(true); setErrorMessage(''); setAuthRequired(false); setAnswers({}); setReview([]); setResult(null); submittingRef.current = false; try { const { data, error } = await supabase.from('exam_questions').select('id,prompt,options,explanation,exam_type').eq('subject_id', Number(subjectId)).eq('is_published', true).limit(20); if (error) throw error; const valid = ((data ?? []) as PracticeQuestion[]).filter((q) => q.id && q.prompt && Array.isArray(q.options) && q.options.length > 0 && q.options.every((o) => typeof o.id === 'string' && typeof o.text === 'string')); if (!valid.length) { setErrorMessage('No usable published questions are available for this subject yet. Questions must be added and published before students can practise.'); return; } setQuestions(valid); setSecondsLeft(30 * 60); setExamStarted(true); } catch (error) { setErrorMessage(getErrorMessage(error, 'Could not load the questions. Please try again.')); } finally { setLoading(false); } }
  async function submitExam(timeExpired = false) { if (submittingRef.current || result || questions.length === 0) return; const answered = questions.filter((q) => answers[q.id]); if (!timeExpired && answered.length === 0) { setErrorMessage('Answer at least one question before submitting.'); return; } if (!answered.length) { setErrorMessage('No answers were recorded. Please answer at least one question before submitting.'); setExamStarted(false); return; } submittingRef.current = true; setSubmitting(true); setErrorMessage(''); try { const { data: authData, error: authError } = await supabase.auth.getUser(); if (authError) throw authError; if (!authData.user) { setAuthRequired(true); throw new Error('Please sign in to BridgeLIB before submitting your exam.'); } const payload = answered.map((q) => ({ question_id: q.id, selected_option: answers[q.id] })); const { data, error } = await supabase.rpc('submit_exam_attempt', { p_answers: payload }); if (error) throw error; const examResult = data as ExamResult; if (!examResult || typeof examResult.score !== 'number' || typeof examResult.total_questions !== 'number') throw new Error('The exam was submitted, but the server returned results in an unexpected format.'); setResult(examResult); setReview(Array.isArray(examResult.review) ? examResult.review : []); setExamStarted(false); } catch (error) { setErrorMessage(getErrorMessage(error, 'Could not submit your exam. Please try again.')); submittingRef.current = false; } finally { setSubmitting(false); } }
  useEffect(() => { if (examStarted && secondsLeft === 0 && !result && !submitting) void submitExam(true); }, [secondsLeft, examStarted, result, submitting]);
  function resetPractice() { setResult(null); setReview([]); setQuestions([]); setAnswers({}); setExamStarted(false); setSecondsLeft(30 * 60); setErrorMessage(''); setAuthRequired(false); submittingRef.current = false; }
  const answeredCount = Object.keys(answers).filter((id) => questions.some((q) => q.id === id)).length; const minutes = Math.floor(secondsLeft / 60); const seconds = secondsLeft % 60; const percentage = result && result.total_questions > 0 ? Math.round(result.score / result.total_questions * 100) : 0;
  return <main className="min-h-screen bg-[#f6f7fb] p-4 sm:p-6"><div className="mx-auto max-w-4xl"><Link href="/" className="text-blue-600 hover:underline">鈫� Back to BridgeLIB</Link><h1 className="mt-6 text-3xl font-bold text-slate-900">Practice Exams</h1><p className="mt-2 text-slate-600">Practise your subjects, track your score, and learn from explanations.</p>
    {errorMessage && <div role="alert" className="mt-5 rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-900"><p>{errorMessage}</p>{authRequired && <Link href="/" className="mt-3 inline-block font-semibold text-blue-700 underline">Return to BridgeLIB to sign in</Link>}</div>}
    {!examStarted && !result && <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-xl font-semibold">Choose your subject</h2><label htmlFor="practice-subject" className="mt-4 block text-sm font-medium text-slate-700">Subject</label><select id="practice-subject" value={subjectId} onChange={(event) => { setSubjectId(event.target.value); setErrorMessage(''); }} className="mt-2 w-full rounded-lg border border-slate-300 bg-white p-3" disabled={loading}><option value="">Select a subject</option>{subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>{subjects.length === 0 && !loading && !errorMessage && <p className="mt-3 text-sm text-slate-500">No subjects are available yet.</p>}<p className="mt-3 text-sm text-slate-500">Up to 20 published questions per session 路 30-minute timer</p><button type="button" onClick={() => void startExam()} disabled={loading || !subjectId} className="mt-5 w-full rounded-lg bg-[#0b5fff] px-5 py-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">{loading ? 'Loading鈥�' : 'Start Practice'}</button></section>}
    {examStarted && !result && <><section className="mt-5 rounded-xl border border-slate-200 bg-white p-4"><div className="flex flex-wrap items-center justify-between gap-3"><span className="font-medium text-slate-700">Answered: {answeredCount} / {questions.length}</span><span className={`font-bold tabular-nums ${secondsLeft < 300 ? 'text-red-600' : 'text-slate-900'}`} aria-live="polite">Time: {minutes}:{String(seconds).padStart(2, '0')}</span></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-[#0b5fff] transition-all" style={{ width: `${answeredCount / questions.length * 100}%` }} /></div></section>{questions.map((q, index) => <section key={q.id} className="mt-4 rounded-xl border border-slate-200 bg-white p-5"><p className="text-sm font-semibold text-blue-700">Question {index + 1} of {questions.length}</p><h2 className="mt-2 font-semibold text-slate-900">{q.prompt}</h2><div className="mt-4 space-y-3">{q.options.map((o) => <label key={o.id} className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 ${answers[q.id] === o.id ? 'border-blue-500 bg-blue-50' : 'border-slate-200'}`}><input type="radio" name={`question-${q.id}`} value={o.id} checked={answers[q.id] === o.id} onChange={() => setAnswers((prev) => ({ ...prev, [q.id]: o.id }))} className="mt-1" /><span>{o.text}</span></label>)}</div></section>)}<button type="button" onClick={() => void submitExam()} disabled={submitting} className="mt-5 w-full rounded-lg bg-[#0b5fff] px-5 py-3 font-semibold text-white disabled:opacity-50">{submitting ? 'Marking exam鈥�' : 'Submit Exam'}</button></>}
    {result && <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5"><h2 className="text-2xl font-bold text-slate-900">Your Results</h2><p className="mt-3 text-lg">Score: <strong>{result.score} / {result.total_questions}</strong></p><p className="mt-1 text-slate-600">Percentage: <strong>{percentage}%</strong></p><div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-[#0b5fff]" style={{ width: `${percentage}%` }} /></div><h3 className="mt-6 text-xl font-semibold">Review answers</h3>{review.length === 0 && <p className="mt-3 text-slate-600">The server did not return answer explanations for this attempt.</p>}{review.map((item, i) => <div key={item.question_id} className="mt-4 border-t border-slate-200 pt-4"><p className="font-semibold">{i + 1}. {item.prompt}</p><p className={`mt-2 font-medium ${item.is_correct ? 'text-green-700' : 'text-red-700'}`}>{item.is_correct ? 'Correct' : 'Incorrect'}</p><p className="mt-1 text-sm text-slate-600">Correct option: {item.correct_option}</p>{item.explanation && <p className="mt-2 text-slate-700">Explanation: {item.explanation}</p>}</div>)}<button type="button" onClick={resetPractice} className="mt-6 w-full rounded-lg bg-[#0b5fff] px-5 py-3 font-semibold text-white">Practise Another Subject</button></section>}
  </div></main>;
}

function AppRouter() { return <Switch><Route path="/" component={BridgeHome} /><Route path="/admin" component={BridgeHome} /><Route path="/practice" component={PracticePage} /><Route component={NotFound} /></Switch>; }
function App() { return <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><AppRouter /></WouterRouter>; }
export default App;