import { FormEvent, useEffect, useRef, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Award, CheckCircle2, ChevronLeft, ChevronRight, Circle, Download, Eye, FileUp, Menu, PartyPopper, X, XCircle,
} from 'lucide-react';
import { api, downloadFile, fetchBlobUrl } from '../../services/api';
import { useLoad } from '../../lib/useLoad';
import { errorMessage, formatDateTime, lessonTypeLabel } from '../../lib/format';
import { LessonIcon } from '../../components/LessonIcon';
import { Markdown } from '../../components/Markdown';
import { VideoPlayer } from '../../components/VideoPlayer';
import { Alert, Badge, Button, cx, Field, ProgressBar, Spinner, Textarea } from '../../components/ui';
import { useToast } from '../../components/Toast';
import type { LearningCourse, LessonContent, QuizResult } from '../../types/api';

export function LearnPage() {
  const { courseId = '', lessonId } = useParams();
  const cid = Number(courseId);
  const learning = useLoad(() => api.learning(cid), [cid]);
  const [sidebar, setSidebar] = useState(false);

  if (learning.loading && !learning.data) return <Spinner className="py-24" />;
  if (learning.error || !learning.data) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16">
        <Alert>{learning.error || 'Kursus tidak ditemukan'}</Alert>
        <Link to="/my/courses" className="mt-4 inline-block text-sm font-semibold text-brand-600">← Kembali ke Kursus Saya</Link>
      </div>
    );
  }
  const data = learning.data;
  const all = data.sections.flatMap((s) => s.lessons);
  if (all.length === 0) {
    return <div className="mx-auto max-w-lg px-4 py-16"><Alert tone="info">Kursus ini belum memiliki materi.</Alert></div>;
  }
  if (!lessonId) {
    const next = all.find((l) => !l.completed) ?? all[0];
    return <Navigate to={`/learn/${cid}/${next.id}`} replace />;
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      <aside className={cx('fixed inset-y-0 left-0 z-40 w-80 shrink-0 overflow-y-auto border-r border-slate-200 bg-white transition-transform lg:sticky lg:top-16 lg:z-0 lg:h-[calc(100vh-4rem)] lg:translate-x-0',
        sidebar ? 'translate-x-0 shadow-2xl' : '-translate-x-full')}>
        <Outline data={data} activeId={Number(lessonId)} onPick={() => setSidebar(false)} onClose={() => setSidebar(false)} />
      </aside>
      {sidebar && <div className="fixed inset-0 z-30 bg-slate-900/40 lg:hidden" onClick={() => setSidebar(false)} />}
      <div className="min-w-0 flex-1">
        <button onClick={() => setSidebar(true)} className="m-4 inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 lg:hidden">
          <Menu size={16} /> Daftar materi ({data.progressPercent}%)
        </button>
        <LessonView key={lessonId} lessonId={Number(lessonId)} course={data} onProgress={learning.reload} />
      </div>
    </div>
  );
}

function Outline({ data, activeId, onPick, onClose }: { data: LearningCourse; activeId: number; onPick: () => void; onClose: () => void }) {
  return (
    <div>
      <div className="border-b border-slate-200 p-4">
        <div className="flex items-start justify-between gap-2">
          <Link to={`/courses/${data.course.slug}`} className="text-sm font-semibold leading-snug text-slate-900 hover:text-brand-700">{data.course.title}</Link>
          <button onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-100 lg:hidden" aria-label="Tutup"><X size={18} /></button>
        </div>
        {data.preview ? (
          <p className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-amber-700"><Eye size={14} /> Mode pratinjau instruktur</p>
        ) : (
          <>
            <ProgressBar value={data.progressPercent} className="mt-3" />
            <p className="mt-1.5 text-xs text-slate-500">{data.completedLessons} dari {data.totalLessons} materi selesai ({data.progressPercent}%)</p>
          </>
        )}
        {data.certificateCode && (
          <Link to={`/certificates/${data.certificateCode}`} className="mt-3 flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
            <Award size={16} /> Lihat sertifikat Anda
          </Link>
        )}
      </div>
      {data.sections.map((s, si) => (
        <div key={s.id}>
          <p className="bg-slate-50 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-500">Bagian {si + 1}: {s.title}</p>
          <ul>
            {s.lessons.map((l) => (
              <li key={l.id}>
                <Link to={`/learn/${data.course.id}/${l.id}`} onClick={onPick}
                  className={cx('flex items-start gap-3 px-4 py-3 text-sm hover:bg-slate-50', l.id === activeId && 'bg-brand-50 hover:bg-brand-50')}>
                  {l.completed ? <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-emerald-600" /> : <Circle size={18} className="mt-0.5 shrink-0 text-slate-300" />}
                  <span className="min-w-0 flex-1">
                    <span className={cx('block', l.id === activeId ? 'font-semibold text-brand-800' : 'text-slate-700')}>{l.title}</span>
                    <span className="mt-0.5 flex items-center gap-1 text-xs text-slate-400">
                      <LessonIcon type={l.type} size={12} /> {lessonTypeLabel[l.type]}{l.durationMinutes ? ` · ${l.durationMinutes} mnt` : ''}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function LessonView({ lessonId, course, onProgress }: { lessonId: number; course: LearningCourse; onProgress: () => Promise<void> }) {
  const navigate = useNavigate();
  const toast = useToast();
  const { data: lesson, loading, error, reload } = useLoad(() => api.lesson(lessonId), [lessonId]);
  const [busy, setBusy] = useState(false);
  const [celebrate, setCelebrate] = useState<string | null>(null);
  // Celebrate whenever a certificate appears while this lesson is open (works for every lesson type,
  // including assignments whose response doesn't report course completion).
  const initialCert = useRef(course.certificateCode);
  useEffect(() => {
    if (!initialCert.current && course.certificateCode) {
      setCelebrate(course.certificateCode);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [course.certificateCode]);

  useEffect(() => { window.scrollTo({ top: 0 }); }, [lessonId]);

  if (loading && !lesson) return <Spinner className="py-24" />;
  if (error || !lesson) return <div className="p-6"><Alert>{error || 'Materi tidak ditemukan'}</Alert></div>;

  const afterProgress = async (courseCompleted: boolean, certificateCode?: string | null) => {
    await Promise.all([reload(), onProgress()]);
    if (courseCompleted && certificateCode) setCelebrate(certificateCode);
    if (courseCompleted) window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const complete = async (goNext: boolean) => {
    setBusy(true);
    try {
      const res = await api.completeLesson(lesson.id);
      await afterProgress(res.courseCompleted, res.certificateCode);
      if (goNext && lesson.nextLessonId && !res.courseCompleted) navigate(`/learn/${course.course.id}/${lesson.nextLessonId}`);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const manual = lesson.type === 'VIDEO' || lesson.type === 'TEXT' || lesson.type === 'PDF';

  return (
    <div className="mx-auto max-w-4xl px-4 pb-16 sm:px-8 lg:pt-8">
      {lesson.preview && <div className="mb-4"><Alert tone="warn">Mode pratinjau: progres, kuis, dan tugas tidak disimpan.</Alert></div>}
      {celebrate && (
        <div className="mb-6 flex flex-col items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
          <PartyPopper className="text-emerald-600" size={36} />
          <p className="text-lg font-bold text-emerald-800">Selamat! Anda menyelesaikan kursus ini.</p>
          <Link to={`/certificates/${celebrate}`} className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-700">
            <Award size={16} /> Lihat sertifikat
          </Link>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <Badge tone="brand"><LessonIcon type={lesson.type} size={12} /> {lessonTypeLabel[lesson.type]}</Badge>
        {lesson.durationMinutes ? <Badge>{lesson.durationMinutes} menit</Badge> : null}
        {lesson.completed && <Badge tone="green"><CheckCircle2 size={12} /> Selesai</Badge>}
      </div>
      <h1 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">{lesson.title}</h1>

      <div className="mt-6 space-y-6">
        {lesson.type === 'VIDEO' && (lesson.videoUrl
          ? <VideoPlayer url={lesson.videoUrl} title={lesson.title} />
          : <Alert tone="info">Video belum tersedia.</Alert>)}
        {lesson.type === 'PDF' && <PdfViewer lesson={lesson} />}
        {lesson.content && <Markdown text={lesson.content} />}
        {lesson.type === 'QUIZ' && <QuizView lesson={lesson} onDone={afterProgress} />}
        {lesson.type === 'ASSIGNMENT' && <AssignmentView lesson={lesson} onDone={() => afterProgress(false)} />}
      </div>

      <div className="mt-10 flex flex-col-reverse gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
        <Button variant="secondary" disabled={!lesson.previousLessonId} onClick={() => navigate(`/learn/${course.course.id}/${lesson.previousLessonId}`)}>
          <ChevronLeft size={16} /> Sebelumnya
        </Button>
        <div className="flex flex-col gap-2 sm:flex-row">
          {manual && !lesson.preview && !lesson.completed && (
            <Button variant="success" disabled={busy} onClick={() => complete(true)}>
              <CheckCircle2 size={16} /> {lesson.nextLessonId ? 'Tandai selesai & lanjut' : 'Tandai selesai'}
            </Button>
          )}
          {lesson.nextLessonId && (manual && !lesson.completed && !lesson.preview ? null : (
            <Button onClick={() => navigate(`/learn/${course.course.id}/${lesson.nextLessonId}`)}>Berikutnya <ChevronRight size={16} /></Button>
          ))}
          {!lesson.nextLessonId && (
            <Button variant="secondary" onClick={() => navigate('/my/courses')}><ArrowLeft size={16} /> Kursus Saya</Button>
          )}
        </div>
      </div>
    </div>
  );
}

function PdfViewer({ lesson }: { lesson: LessonContent }) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!lesson.hasFile) return;
    let revoked = false;
    let objectUrl: string | null = null;
    fetchBlobUrl(api.lessonFilePath(lesson.id))
      .then((u) => { objectUrl = u; if (!revoked) setUrl(u); })
      .catch((err) => setError(errorMessage(err)));
    return () => { revoked = true; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [lesson.id, lesson.hasFile]);

  if (!lesson.hasFile) return <Alert tone="info">File PDF belum diunggah oleh instruktur.</Alert>;
  if (error) return <Alert>{error}</Alert>;
  if (!url) return <Spinner />;
  return (
    <div>
      <iframe src={url} title={lesson.title} className="h-[75vh] w-full rounded-xl border border-slate-200 bg-white" />
      <a href={url} download={lesson.originalFileName ?? 'materi.pdf'} className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600">
        <Download size={16} /> Unduh {lesson.originalFileName ?? 'PDF'}
      </a>
    </div>
  );
}

function QuizView({ lesson, onDone }: { lesson: LessonContent; onDone: (courseCompleted: boolean, cert?: string | null) => Promise<void> }) {
  const toast = useToast();
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [result, setResult] = useState<QuizResult | null>(null);
  const [busy, setBusy] = useState(false);
  const best = lesson.attempts.reduce((m, a) => Math.max(m, a.score), 0);
  const answered = Object.keys(answers).length;

  if (lesson.questions.length === 0) return <Alert tone="info">Kuis ini belum memiliki soal.</Alert>;

  const submit = async () => {
    if (lesson.preview) { toast.error('Kuis tidak bisa dikerjakan dalam mode pratinjau'); return; }
    setBusy(true);
    try {
      const r = await api.submitQuiz(lesson.id, answers);
      setResult(r);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      await onDone(r.courseCompleted, r.certificateCode);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const byQuestion = new Map(result?.results.map((r) => [r.questionId, r]) ?? []);

  return (
    <div>
      <div className="flex flex-wrap gap-3 rounded-xl bg-slate-100 p-4 text-sm text-slate-700">
        <span>{lesson.questions.length} soal</span>
        <span>· Nilai lulus <b>{lesson.passingScore ?? 70}</b></span>
        {lesson.attempts.length > 0 && <span>· {lesson.attempts.length} percobaan, nilai terbaik <b>{best}</b></span>}
      </div>

      {result && (
        <div className={cx('mt-4 rounded-xl border p-5', result.passed ? 'border-emerald-200 bg-emerald-50' : 'border-rose-200 bg-rose-50')}>
          <p className={cx('text-2xl font-bold', result.passed ? 'text-emerald-700' : 'text-rose-700')}>Nilai {result.score}</p>
          <p className="text-sm text-slate-700">{result.correctCount} dari {result.totalCount} benar · {result.passed ? 'Lulus 🎉' : `Belum lulus (minimal ${result.passingScore})`}</p>
          {!result.passed && <Button variant="secondary" size="sm" className="mt-3" onClick={() => { setResult(null); setAnswers({}); }}>Coba lagi</Button>}
        </div>
      )}

      <ol className="mt-6 space-y-6">
        {lesson.questions.map((q, i) => {
          const r = byQuestion.get(q.id);
          return (
            <li key={q.id} className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="font-medium text-slate-900"><span className="mr-2 text-slate-400">{i + 1}.</span>{q.text}</p>
              <div className="mt-3 space-y-2" role="radiogroup">
                {q.options.map((o) => {
                  const chosen = answers[q.id] === o.id;
                  const isCorrect = r?.correctOptionId === o.id;
                  const isWrongPick = r && chosen && !r.correct;
                  return (
                    <label key={o.id} className={cx('flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 text-sm',
                      r ? (isCorrect ? 'border-emerald-300 bg-emerald-50' : isWrongPick ? 'border-rose-300 bg-rose-50' : 'border-slate-200')
                        : chosen ? 'border-brand-400 bg-brand-50' : 'border-slate-200 hover:bg-slate-50')}>
                      <input type="radio" name={`q${q.id}`} checked={chosen} disabled={Boolean(result)}
                        onChange={() => setAnswers((a) => ({ ...a, [q.id]: o.id }))} className="accent-brand-600" />
                      <span className="flex-1">{o.text}</span>
                      {r && isCorrect && <CheckCircle2 size={16} className="text-emerald-600" />}
                      {isWrongPick && <XCircle size={16} className="text-rose-600" />}
                    </label>
                  );
                })}
              </div>
              {r?.explanation && <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-600"><b>Pembahasan:</b> {r.explanation}</p>}
            </li>
          );
        })}
      </ol>

      {!result && (
        <div className="mt-6 flex items-center justify-between gap-3">
          <p className="text-sm text-slate-500">{answered} dari {lesson.questions.length} soal dijawab</p>
          <Button disabled={busy || answered < lesson.questions.length} onClick={submit}>{busy ? 'Mengirim...' : 'Kumpulkan jawaban'}</Button>
        </div>
      )}
    </div>
  );
}

const ACCEPT = '.pdf,.zip,.jpg,.jpeg,.png,.webp,.docx,.xlsx,.pptx';

function AssignmentView({ lesson, onDone }: { lesson: LessonContent; onDone: () => Promise<void> }) {
  const toast = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast.error('Ukuran file maksimal 10 MB'); return; }
    setBusy(true);
    try {
      await api.submitAssignment(lesson.id, file, note.trim());
      toast.success('Tugas berhasil dikumpulkan');
      setFile(null);
      setNote('');
      await onDone();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      {lesson.assignmentInstructions && (
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="font-semibold text-slate-900">Instruksi</h2>
          <Markdown text={lesson.assignmentInstructions} className="mt-2" />
        </div>
      )}

      {lesson.submissions.length > 0 && (
        <div>
          <h2 className="font-semibold text-slate-900">Pengumpulan Anda</h2>
          <ul className="mt-3 space-y-3">
            {lesson.submissions.map((s) => (
              <li key={s.id} className="rounded-xl border border-slate-200 bg-white p-4 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <button onClick={() => downloadFile(api.submissionFilePath(s.id), s.originalFileName).catch((err) => toast.error(errorMessage(err)))}
                    className="inline-flex items-center gap-1.5 font-medium text-brand-700 hover:underline"><Download size={14} /> {s.originalFileName}</button>
                  {s.status === 'GRADED' ? <Badge tone={Number(s.grade) >= 70 ? 'green' : 'amber'}>Nilai {s.grade}</Badge> : <Badge>Menunggu penilaian</Badge>}
                </div>
                <p className="mt-1 text-xs text-slate-500">Dikumpulkan {formatDateTime(s.submittedAt)}</p>
                {s.note && <p className="mt-2 text-slate-600">Catatan: {s.note}</p>}
                {s.feedback && <p className="mt-2 rounded-lg bg-brand-50 p-3 text-slate-700"><b>Masukan instruktur:</b> {s.feedback}</p>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {!lesson.preview && (
        <form onSubmit={submit} className="rounded-xl border border-dashed border-slate-300 bg-white p-5">
          <h2 className="font-semibold text-slate-900">{lesson.submissions.length ? 'Kumpulkan ulang' : 'Kumpulkan tugas'}</h2>
          <label className="mt-3 flex cursor-pointer flex-col items-center gap-2 rounded-lg bg-slate-50 px-4 py-6 text-center text-sm text-slate-600 hover:bg-slate-100">
            <FileUp className="text-brand-600" />
            {file ? <span className="font-medium text-slate-900">{file.name}</span> : <span>Klik untuk memilih file</span>}
            <span className="text-xs text-slate-400">PDF, ZIP, gambar, atau dokumen Office · maks. 10 MB</span>
            <input type="file" accept={ACCEPT} className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </label>
          <Field label="Catatan (opsional)" className="mt-3">
            <Textarea rows={2} maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
          <Button type="submit" className="mt-3" disabled={!file || busy}>{busy ? 'Mengunggah...' : 'Kirim tugas'}</Button>
        </form>
      )}
    </div>
  );
}
