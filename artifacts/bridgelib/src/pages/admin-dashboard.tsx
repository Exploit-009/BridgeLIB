
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { supabase } from '@/lib/supabase';

type Subject = {
  id: number;
  name: string;
  description: string | null;
};

type Lesson = {
  id: string;
  subject_id: number;
  title: string;
  summary: string | null;
  content: string;
  education_level: string;
  grade_level: string | null;
  is_published: boolean;
};

type QuestionOption = {
  id: string;
  text: string;
};

type ExamQuestion = {
  id: string;
  subject_id: number;
  prompt: string;
  options: QuestionOption[];
  explanation: string | null;
  exam_type: string;
  is_published: boolean;
};

type Tab = 'subjects' | 'lessons' | 'questions';

type Props = {
  onNavigateHome?: () => void;
  onSignOut?: () => void;
};

const levels = [
  { value: 'primary', label: 'Primary school' },
  { value: 'junior_high', label: 'Junior high school' },
  { value: 'senior_high', label: 'Senior high school' },
  { value: 'college_vocational', label: 'College / vocational' },
  { value: 'other', label: 'Other' },
];

const inputStyle = {
  width: '100%',
  boxSizing: 'border-box' as const,
  padding: '11px 12px',
  border: '1px solid #dbe1ea',
  borderRadius: 8,
  fontSize: 14,
  background: '#fff',
  color: '#172033',
};

const buttonStyle = {
  padding: '10px 14px',
  border: 'none',
  borderRadius: 8,
  background: '#0b5fff',
  color: '#fff',
  fontWeight: 600,
  cursor: 'pointer',
};

const secondaryButton = {
  ...buttonStyle,
  background: '#eef2f8',
  color: '#243047',
};

const cardStyle = {
  background: '#fff',
  border: '1px solid #e6eaf1',
  borderRadius: 12,
  padding: 16,
};

function errorText(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && error !== null && 'message' in error) {
    return String(error.message);
  }
  return 'An unexpected error occurred.';
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label style={{ display: 'grid', gap: 7, fontSize: 13, fontWeight: 600 }}>
      {label}
      {children}
    </label>
  );
}

export default function AdminDashboard({
  onNavigateHome,
  onSignOut,
}: Props) {
  const [tab, setTab] = useState<Tab>('subjects');
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [correctAnswers, setCorrectAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const [subjectId, setSubjectId] = useState('');
  const [subjectName, setSubjectName] = useState('');
  const [subjectDescription, setSubjectDescription] = useState('');
  const [editingSubject, setEditingSubject] = useState<number | null>(null);

  const [lessonId, setLessonId] = useState<string | null>(null);
  const [lessonSubject, setLessonSubject] = useState('');
  const [lessonTitle, setLessonTitle] = useState('');
  const [lessonSummary, setLessonSummary] = useState('');
  const [lessonContent, setLessonContent] = useState('');
  const [lessonLevel, setLessonLevel] = useState('senior_high');
  const [lessonGrade, setLessonGrade] = useState('');
  const [lessonPublished, setLessonPublished] = useState(false);

  const [questionId, setQuestionId] = useState<string | null>(null);
  const [questionSubject, setQuestionSubject] = useState('');
  const [questionPrompt, setQuestionPrompt] = useState('');
  const [optionA, setOptionA] = useState('');
  const [optionB, setOptionB] = useState('');
  const [optionC, setOptionC] = useState('');
  const [optionD, setOptionD] = useState('');
  const [correctOption, setCorrectOption] = useState('A');
  const [questionExplanation, setQuestionExplanation] = useState('');
  const [examType, setExamType] = useState('WASSCE');
  const [questionPublished, setQuestionPublished] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const [subjectResult, lessonResult, questionResult] = await Promise.all([
        supabase.from('subjects').select('id,name,description').order('name'),
        supabase
          .from('lessons')
          .select(
            'id,subject_id,title,summary,content,education_level,grade_level,is_published',
          )
          .order('created_at', { ascending: false }),
        supabase
          .from('exam_questions')
          .select(
            'id,subject_id,prompt,options,explanation,exam_type,is_published',
          )
          .order('created_at', { ascending: false }),
      ]);

      if (subjectResult.error) throw subjectResult.error;
      if (lessonResult.error) throw lessonResult.error;
      if (questionResult.error) throw questionResult.error;

      const loadedSubjects = (subjectResult.data ?? []) as Subject[];
      const loadedLessons = (lessonResult.data ?? []) as Lesson[];
      const loadedQuestions = (questionResult.data ?? []) as ExamQuestion[];

      setSubjects(loadedSubjects);
      setLessons(loadedLessons);
      setQuestions(
        loadedQuestions.map((question) => ({
          ...question,
          options: Array.isArray(question.options)
            ? question.options.map((option, index) => {
                if (typeof option === 'string') {
                  return { id: String.fromCharCode(65 + index), text: option };
                }

                const item = option as Record<string, unknown>;
                return {
                  id: String(item.id ?? item.label ?? String.fromCharCode(65 + index)),
                  text: String(item.text ?? item.label ?? ''),
                };
              })
            : [],
        })),
      );

      if (!lessonSubject && loadedSubjects[0]) {
        setLessonSubject(String(loadedSubjects[0].id));
      }
      if (!questionSubject && loadedSubjects[0]) {
        setQuestionSubject(String(loadedSubjects[0].id));
      }
      if (!subjectId && loadedSubjects[0]) {
        setSubjectId(String(loadedSubjects[0].id));
      }

      const questionIds = loadedQuestions.map((question) => question.id);

      if (questionIds.length) {
        const answerResult = await supabase
          .from('exam_question_answers')
          .select('question_id,correct_option')
          .in('question_id', questionIds);

        if (answerResult.error) throw answerResult.error;

        const answerMap: Record<string, string> = {};
        for (const answer of answerResult.data ?? []) {
          answerMap[answer.question_id] = answer.correct_option;
        }
        setCorrectAnswers(answerMap);
      } else {
        setCorrectAnswers({});
      }
    } catch (err) {
      setError(errorText(err));
    } finally {
      setLoading(false);
    }
  }, [lessonSubject, questionSubject, subjectId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  function clearNotice() {
    setError('');
    setMessage('');
  }

  function startNewSubject() {
    setEditingSubject(null);
    setSubjectName('');
    setSubjectDescription('');
    clearNotice();
  }

  function editSubject(subject: Subject) {
    setEditingSubject(subject.id);
    setSubjectName(subject.name);
    setSubjectDescription(subject.description ?? '');
    clearNotice();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function saveSubject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearNotice();
    setBusy(true);

    try {
      const values = {
        name: subjectName.trim(),
        description: subjectDescription.trim() || null,
      };

      const result = editingSubject
        ? await supabase.from('subjects').update(values).eq('id', editingSubject)
        : await supabase.from('subjects').insert(values);

      if (result.error) throw result.error;

      setMessage(editingSubject ? 'Subject updated.' : 'Subject added.');
      startNewSubject();
      await loadData();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  async function deleteSubject(subject: Subject) {
    if (
      !window.confirm(
        `Delete "${subject.name}"? Existing lessons, classes, or questions may prevent deletion.`,
      )
    ) {
      return;
    }

    clearNotice();
    setBusy(true);

    try {
      const { error: deleteError } = await supabase
        .from('subjects')
        .delete()
        .eq('id', subject.id);

      if (deleteError) throw deleteError;
      setMessage('Subject deleted.');
      if (editingSubject === subject.id) startNewSubject();
      await loadData();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  function resetLesson() {
    setLessonId(null);
    setLessonTitle('');
    setLessonSummary('');
    setLessonContent('');
    setLessonLevel('senior_high');
    setLessonGrade('');
    setLessonPublished(false);
    if (subjects[0]) setLessonSubject(String(subjects[0].id));
  }

  function editLesson(lesson: Lesson) {
    setLessonId(lesson.id);
    setLessonSubject(String(lesson.subject_id));
    setLessonTitle(lesson.title);
    setLessonSummary(lesson.summary ?? '');
    setLessonContent(lesson.content);
    setLessonLevel(lesson.education_level);
    setLessonGrade(lesson.grade_level ?? '');
    setLessonPublished(lesson.is_published);
    clearNotice();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function saveLesson(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearNotice();
    setBusy(true);

    try {
      const { data: userResult, error: userError } =
        await supabase.auth.getUser();

      if (userError) throw userError;

      const values = {
        subject_id: Number(lessonSubject),
        title: lessonTitle.trim(),
        summary: lessonSummary.trim() || null,
        content: lessonContent.trim(),
        education_level: lessonLevel,
        grade_level: lessonGrade.trim() || null,
        is_published: lessonPublished,
        updated_at: new Date().toISOString(),
      };

      const result = lessonId
        ? await supabase.from('lessons').update(values).eq('id', lessonId)
        : await supabase.from('lessons').insert({
            ...values,
            created_by: userResult.user?.id ?? null,
          });

      if (result.error) throw result.error;

      setMessage(lessonId ? 'Lesson updated.' : 'Lesson saved.');
      resetLesson();
      await loadData();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  async function deleteLesson(lesson: Lesson) {
    if (!window.confirm(`Delete lesson "${lesson.title}"?`)) return;

    clearNotice();
    setBusy(true);

    try {
      const { error: deleteError } = await supabase
        .from('lessons')
        .delete()
        .eq('id', lesson.id);

      if (deleteError) throw deleteError;
      setMessage('Lesson deleted.');
      if (lessonId === lesson.id) resetLesson();
      await loadData();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  function resetQuestion() {
    setQuestionId(null);
    setQuestionPrompt('');
    setOptionA('');
    setOptionB('');
    setOptionC('');
    setOptionD('');
    setCorrectOption('A');
    setQuestionExplanation('');
    setExamType('WASSCE');
    setQuestionPublished(false);
    if (subjects[0]) setQuestionSubject(String(subjects[0].id));
  }

  function editQuestion(question: ExamQuestion) {
    const optionMap: Record<string, string> = {};
    for (const option of question.options) {
      optionMap[option.id.toUpperCase()] = option.text;
    }

    setQuestionId(question.id);
    setQuestionSubject(String(question.subject_id));
    setQuestionPrompt(question.prompt);
    setOptionA(optionMap.A ?? '');
    setOptionB(optionMap.B ?? '');
    setOptionC(optionMap.C ?? '');
    setOptionD(optionMap.D ?? '');
    setCorrectOption(correctAnswers[question.id] ?? 'A');
    setQuestionExplanation(question.explanation ?? '');
    setExamType(question.exam_type || 'WASSCE');
    setQuestionPublished(question.is_published);
    clearNotice();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function saveQuestion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearNotice();
    setBusy(true);

    try {
      const { data: userResult, error: userError } =
        await supabase.auth.getUser();

      if (userError) throw userError;

      const options = [
        { id: 'A', text: optionA.trim() },
        { id: 'B', text: optionB.trim() },
        { id: 'C', text: optionC.trim() },
        { id: 'D', text: optionD.trim() },
      ];

      const values = {
        subject_id: Number(questionSubject),
        prompt: questionPrompt.trim(),
        options,
        explanation: questionExplanation.trim() || null,
        exam_type: examType,
        is_published: questionPublished,
        updated_at: new Date().toISOString(),
      };

      let savedId = questionId;

      if (questionId) {
        const { error: updateError } = await supabase
          .from('exam_questions')
          .update(values)
          .eq('id', questionId);

        if (updateError) throw updateError;
      } else {
        const { data, error: insertError } = await supabase
          .from('exam_questions')
          .insert({
            ...values,
            created_by: userResult.user?.id ?? null,
          })
          .select('id')
          .single();

        if (insertError) throw insertError;
        savedId = data.id;
      }

      if (!savedId) throw new Error('Could not identify the saved question.');

      const { error: answerError } = await supabase
        .from('exam_question_answers')
        .upsert(
          {
            question_id: savedId,
            correct_option: correctOption,
            created_by: userResult.user?.id ?? null,
          },
          { onConflict: 'question_id' },
        );

      if (answerError) throw answerError;

      setMessage(
        questionId
          ? 'Question and answer key updated.'
          : 'Question and answer key saved.',
      );
      resetQuestion();
      await loadData();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  async function deleteQuestion(question: ExamQuestion) {
    if (!window.confirm('Delete this question and its answer key?')) return;

    clearNotice();
    setBusy(true);

    try {
      const { error: answerError } = await supabase
        .from('exam_question_answers')
        .delete()
        .eq('question_id', question.id);

      if (answerError) throw answerError;

      const { error: questionError } = await supabase
        .from('exam_questions')
        .delete()
        .eq('id', question.id);

      if (questionError) throw questionError;

      setMessage('Question deleted.');
      if (questionId === question.id) resetQuestion();
      await loadData();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  async function toggleQuestionPublished(question: ExamQuestion) {
    clearNotice();
    setBusy(true);

    try {
      const { error: updateError } = await supabase
        .from('exam_questions')
        .update({ is_published: !question.is_published })
        .eq('id', question.id);

      if (updateError) throw updateError;

      setMessage(
        question.is_published ? 'Question moved to draft.' : 'Question published.',
      );
      await loadData();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  const publishedLessons = lessons.filter((item) => item.is_published).length;
  const publishedQuestions = questions.filter((item) => item.is_published).length;

  return (
    <main
      style={{
        minHeight: '100vh',
        background: '#f6f7fb',
        color: '#172033',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      <header
        style={{
          background: '#0f172a',
          color: '#fff',
          padding: '18px 16px',
        }}
      >
        <div
          style={{
            maxWidth: 1180,
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <div>
            <div style={{ fontSize: 12, color: '#a9c4ff', fontWeight: 700 }}>
              BRIDGELIB ADMINISTRATION
            </div>
            <h1 style={{ margin: '5px 0', fontSize: 23 }}>
              Content management
            </h1>
            <div style={{ color: '#cbd5e1', fontSize: 13 }}>
              Manage subjects, lessons and examination questions.
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {onNavigateHome && (
              <button type="button" style={secondaryButton} onClick={onNavigateHome}>
                Back to BridgeLIB
              </button>
            )}
            {onSignOut && (
              <button type="button" style={secondaryButton} onClick={onSignOut}>
                Sign out
              </button>
            )}
          </div>
        </div>
      </header>

      <div style={{ maxWidth: 1180, margin: '0 auto', padding: 16 }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit,minmax(145px,1fr))',
            gap: 12,
            margin: '8px 0 20px',
          }}
        >
          {[
            { label: 'Subjects', value: subjects.length },
            { label: 'Lessons', value: lessons.length },
            { label: 'Published lessons', value: publishedLessons },
            { label: 'Questions', value: questions.length },
            { label: 'Published questions', value: publishedQuestions },
          ].map((stat) => (
            <div key={stat.label} style={cardStyle}>
              <div style={{ fontSize: 12, color: '#657187' }}>{stat.label}</div>
              <div style={{ fontSize: 26, fontWeight: 800, marginTop: 5 }}>
                {stat.value}
              </div>
            </div>
          ))}
        </div>

        <nav
          aria-label="Content management sections"
          style={{
            display: 'flex',
            gap: 8,
            flexWrap: 'wrap',
            marginBottom: 16,
          }}
        >
          {([
            ['subjects', 'Subjects'],
            ['lessons', 'Lessons'],
            ['questions', 'WASSCE questions'],
          ] as [Tab, string][]).map(([value, label]) => (
            <button
              type="button"
              key={value}
              onClick={() => {
                setTab(value);
                clearNotice();
              }}
              style={{
                ...buttonStyle,
                background: tab === value ? '#0b5fff' : '#fff',
                color: tab === value ? '#fff' : '#243047',
                border: tab === value ? '1px solid #0b5fff' : '1px solid #dbe1ea',
              }}
            >
              {label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => void loadData()}
            style={{ ...secondaryButton, marginLeft: 'auto' }}
          >
            Refresh
          </button>
        </nav>

        {message && (
          <div
            role="status"
            style={{
              background: '#e8f8ef',
              border: '1px solid #b8e7c9',
              padding: 12,
              borderRadius: 8,
              marginBottom: 12,
              color: '#17643b',
            }}
          >
            {message}
          </div>
        )}

        {error && (
          <div
            role="alert"
            style={{
              background: '#fff0f0',
              border: '1px solid #f3c1c1',
              padding: 12,
              borderRadius: 8,
              marginBottom: 12,
              color: '#9b1c1c',
              overflowWrap: 'anywhere',
            }}
          >
            <strong>Could not complete that action.</strong>
            <div style={{ marginTop: 5 }}>{error}</div>
            <div style={{ fontSize: 12, marginTop: 6 }}>
              Check your connection and admin permissions, then try Refresh.
            </div>
          </div>
        )}

        {loading ? (
          <div style={cardStyle}>Loading BridgeLIB content…</div>
        ) : (
          <>
            {tab === 'subjects' && (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,320px),1fr))',
                  gap: 16,
                  alignItems: 'start',
                }}
              >
                <form onSubmit={saveSubject} style={{ ...cardStyle, display: 'grid', gap: 14 }}>
                  <h2 style={{ margin: 0, fontSize: 19 }}>
                    {editingSubject ? 'Edit subject' : 'Add a subject'}
                  </h2>
                  <Field label="Subject name">
                    <input
                      style={inputStyle}
                      value={subjectName}
                      onChange={(e) => setSubjectName(e.target.value)}
                      placeholder="e.g. Mathematics"
                      required
                      minLength={2}
                      maxLength={100}
                    />
                  </Field>
                  <Field label="Description">
                    <textarea
                      style={{ ...inputStyle, minHeight: 100, resize: 'vertical' }}
                      value={subjectDescription}
                      onChange={(e) => setSubjectDescription(e.target.value)}
                      placeholder="Briefly describe this subject"
                    />
                  </Field>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button disabled={busy} style={buttonStyle}>
                      {busy ? 'Saving…' : editingSubject ? 'Save changes' : 'Add subject'}
                    </button>
                    {editingSubject !== null && (
                      <button
                        type="button"
                        style={secondaryButton}
                        onClick={startNewSubject}
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </form>

                <section style={{ ...cardStyle, display: 'grid', gap: 12 }}>
                  <h2 style={{ margin: 0, fontSize: 19 }}>Existing subjects</h2>
                  {subjects.length === 0 && <p>No subjects found.</p>}
                  {subjects.map((subject) => (
                    <article
                      key={subject.id}
                      style={{
                        borderBottom: '1px solid #edf0f5',
                        paddingBottom: 12,
                      }}
                    >
                      <strong>{subject.name}</strong>
                      <p style={{ color: '#657187', fontSize: 13, margin: '5px 0 10px' }}>
                        {subject.description || 'No description yet.'}
                      </p>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          type="button"
                          style={secondaryButton}
                          onClick={() => editSubject(subject)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          style={{ ...secondaryButton, color: '#b42318' }}
                          onClick={() => void deleteSubject(subject)}
                        >
                          Delete
                        </button>
                      </div>
                    </article>
                  ))}
                </section>
              </div>
            )}

            {tab === 'lessons' && (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,340px),1fr))',
                  gap: 16,
                  alignItems: 'start',
                }}
              >
                <form onSubmit={saveLesson} style={{ ...cardStyle, display: 'grid', gap: 14 }}>
                  <h2 style={{ margin: 0, fontSize: 19 }}>
                    {lessonId ? 'Edit lesson' : 'Create a lesson'}
                  </h2>
                  {subjects.length === 0 ? (
                    <p>Add a subject before creating a lesson.</p>
                  ) : (
                    <>
                      <Field label="Subject">
                        <select
                          style={inputStyle}
                          value={lessonSubject}
                          onChange={(e) => setLessonSubject(e.target.value)}
                          required
                        >
                          {subjects.map((s) => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Lesson title">
                        <input
                          style={inputStyle}
                          value={lessonTitle}
                          onChange={(e) => setLessonTitle(e.target.value)}
                          required
                          minLength={3}
                          maxLength={180}
                          placeholder="e.g. Introduction to algebra"
                        />
                      </Field>
                      <Field label="Short summary">
                        <textarea
                          style={{ ...inputStyle, minHeight: 70 }}
                          value={lessonSummary}
                          onChange={(e) => setLessonSummary(e.target.value)}
                          placeholder="What will learners understand?"
                        />
                      </Field>
                      <Field label="Lesson content">
                        <textarea
                          style={{ ...inputStyle, minHeight: 190, resize: 'vertical' }}
                          value={lessonContent}
                          onChange={(e) => setLessonContent(e.target.value)}
                          required
                          placeholder="Write the lesson, examples, definitions and explanations here."
                        />
                      </Field>
                      <Field label="Education level">
                        <select
                          style={inputStyle}
                          value={lessonLevel}
                          onChange={(e) => setLessonLevel(e.target.value)}
                        >
                          {levels.map((level) => (
                            <option key={level.value} value={level.value}>
                              {level.label}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Grade / class (optional)">
                        <input
                          style={inputStyle}
                          value={lessonGrade}
                          onChange={(e) => setLessonGrade(e.target.value)}
                          placeholder="e.g. Grade 9"
                        />
                      </Field>
                      <label style={{ display: 'flex', gap: 9, alignItems: 'center', fontSize: 14 }}>
                        <input
                          type="checkbox"
                          checked={lessonPublished}
                          onChange={(e) => setLessonPublished(e.target.checked)}
                        />
                        Publish this lesson for learners
                      </label>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <button disabled={busy} style={buttonStyle}>
                          {busy ? 'Saving…' : lessonId ? 'Save changes' : 'Save lesson'}
                        </button>
                        {lessonId && (
                          <button type="button" style={secondaryButton} onClick={resetLesson}>
                            Cancel
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </form>

                <section style={{ ...cardStyle, display: 'grid', gap: 12 }}>
                  <h2 style={{ margin: 0, fontSize: 19 }}>Lessons library</h2>
                  {lessons.length === 0 && <p>No lessons have been created yet.</p>}
                  {lessons.map((lesson) => (
                    <article
                      key={lesson.id}
                      style={{
                        borderBottom: '1px solid #edf0f5',
                        paddingBottom: 12,
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                        <strong>{lesson.title}</strong>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            color: lesson.is_published ? '#147443' : '#805b11',
                          }}
                        >
                          {lesson.is_published ? 'PUBLISHED' : 'DRAFT'}
                        </span>
                      </div>
                      <div style={{ color: '#657187', fontSize: 12, margin: '6px 0' }}>
                        {subjects.find((s) => s.id === lesson.subject_id)?.name ?? 'Subject'} ·{' '}
                        {levels.find((l) => l.value === lesson.education_level)?.label ?? lesson.education_level}
                        {lesson.grade_level ? ` · ${lesson.grade_level}` : ''}
                      </div>
                      <p style={{ fontSize: 13, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
                        {lesson.summary || lesson.content.slice(0, 150)}
                      </p>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <button type="button" style={secondaryButton} onClick={() => editLesson(lesson)}>
                          Edit
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          style={{ ...secondaryButton, color: '#b42318' }}
                          onClick={() => void deleteLesson(lesson)}
                        >
                          Delete
                        </button>
                      </div>
                    </article>
                  ))}
                </section>
              </div>
            )}

            {tab === 'questions' && (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,340px),1fr))',
                  gap: 16,
                  alignItems: 'start',
                }}
              >
                <form onSubmit={saveQuestion} style={{ ...cardStyle, display: 'grid', gap: 14 }}>
                  <h2 style={{ margin: 0, fontSize: 19 }}>
                    {questionId ? 'Edit question' : 'Add an exam question'}
                  </h2>
                  {subjects.length === 0 ? (
                    <p>Add a subject before creating a question.</p>
                  ) : (
                    <>
                      <Field label="Subject">
                        <select
                          style={inputStyle}
                          value={questionSubject}
                          onChange={(e) => setQuestionSubject(e.target.value)}
                          required
                        >
                          {subjects.map((s) => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Question type">
                        <select
                          style={inputStyle}
                          value={examType}
                          onChange={(e) => setExamType(e.target.value)}
                        >
                          <option value="WASSCE">WASSCE</option>
                          <option value="WAEC">WAEC</option>
                          <option value="National">National examination</option>
                          <option value="Practice">Practice</option>
                        </select>
                      </Field>
                      <Field label="Question">
                        <textarea
                          style={{ ...inputStyle, minHeight: 110 }}
                          value={questionPrompt}
                          onChange={(e) => setQuestionPrompt(e.target.value)}
                          required
                          placeholder="Enter the complete question."
                        />
                      </Field>

                      <Field label="Option A">
                        <input style={inputStyle} value={optionA} onChange={(e) => setOptionA(e.target.value)} required />
                      </Field>
                      <Field label="Option B">
                        <input style={inputStyle} value={optionB} onChange={(e) => setOptionB(e.target.value)} required />
                      </Field>
                      <Field label="Option C">
                        <input style={inputStyle} value={optionC} onChange={(e) => setOptionC(e.target.value)} required />
                      </Field>
                      <Field label="Option D">
                        <input style={inputStyle} value={optionD} onChange={(e) => setOptionD(e.target.value)} required />
                      </Field>

                      <Field label="Correct answer">
                        <select
                          style={inputStyle}
                          value={correctOption}
                          onChange={(e) => setCorrectOption(e.target.value)}
                        >
                          <option value="A">A — {optionA || 'Option A'}</option>
                          <option value="B">B — {optionB || 'Option B'}</option>
                          <option value="C">C — {optionC || 'Option C'}</option>
                          <option value="D">D — {optionD || 'Option D'}</option>
                        </select>
                      </Field>

                      <Field label="Explanation">
                        <textarea
                          style={{ ...inputStyle, minHeight: 120 }}
                          value={questionExplanation}
                          onChange={(e) => setQuestionExplanation(e.target.value)}
                          placeholder="Explain why the answer is correct, step by step."
                        />
                      </Field>

                      <label style={{ display: 'flex', gap: 9, alignItems: 'center', fontSize: 14 }}>
                        <input
                          type="checkbox"
                          checked={questionPublished}
                          onChange={(e) => setQuestionPublished(e.target.checked)}
                        />
                        Publish this question for practice
                      </label>

                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <button disabled={busy} style={buttonStyle}>
                          {busy ? 'Saving…' : questionId ? 'Save changes' : 'Save question'}
                        </button>
                        {questionId && (
                          <button type="button" style={secondaryButton} onClick={resetQuestion}>
                            Cancel
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </form>

                <section style={{ ...cardStyle, display: 'grid', gap: 12 }}>
                  <h2 style={{ margin: 0, fontSize: 19 }}>Question bank</h2>
                  {questions.length === 0 && <p>No questions have been added yet.</p>}
                  {questions.map((question) => (
                    <article
                      key={question.id}
                      style={{
                        borderBottom: '1px solid #edf0f5',
                        paddingBottom: 14,
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                        <strong style={{ overflowWrap: 'anywhere' }}>{question.prompt}</strong>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            color: question.is_published ? '#147443' : '#805b11',
                          }}
                        >
                          {question.is_published ? 'PUBLISHED' : 'DRAFT'}
                        </span>
                      </div>
                      <div style={{ color: '#657187', fontSize: 12, margin: '6px 0' }}>
                        {subjects.find((s) => s.id === question.subject_id)?.name ?? 'Subject'} · {question.exam_type}
                      </div>
                      <div style={{ display: 'grid', gap: 5, fontSize: 13 }}>
                        {question.options.map((option) => (
                          <div
                            key={option.id}
                            style={{
                              color: correctAnswers[question.id] === option.id ? '#147443' : '#344054',
                              fontWeight: correctAnswers[question.id] === option.id ? 700 : 400,
                            }}
                          >
                            {option.id}. {option.text}
                            {correctAnswers[question.id] === option.id ? ' ✓ Correct answer' : ''}
                          </div>
                        ))}
                      </div>
                      {question.explanation && (
                        <p style={{ fontSize: 13, color: '#657187', whiteSpace: 'pre-wrap' }}>
                          Explanation: {question.explanation}
                        </p>
                      )}
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
                        <button
                          type="button"
                          style={secondaryButton}
                          onClick={() => editQuestion(question)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          style={secondaryButton}
                          onClick={() => void toggleQuestionPublished(question)}
                        >
                          {question.is_published ? 'Unpublish' : 'Publish'}
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          style={{ ...secondaryButton, color: '#b42318' }}
                          onClick={() => void deleteQuestion(question)}
                        >
                          Delete
                        </button>
                      </div>
                    </article>
                  ))}
                </section>
              </div>
            )}
          </>
        )}

        <footer
          style={{
            color: '#657187',
            fontSize: 12,
            textAlign: 'center',
            padding: '28px 8px 14px',
          }}
        >
          BridgeLIB · Manage educational content carefully. Review answers before publishing.
        </footer>
      </div>
    </main>
  );
}
