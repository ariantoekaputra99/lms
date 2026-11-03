import { useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { BarChart3, BookOpen, Check, ChevronDown, Clock, Eye, Pencil, Users } from 'lucide-react';
import { api } from '../../services/api';
import { useLoad } from '../../lib/useLoad';
import { useAuth } from '../../lib/auth';
import { duration, errorMessage, lessonTypeLabel, levelLabel, num, price } from '../../lib/format';
import { Thumbnail } from '../../components/CourseCard';
import { LessonIcon } from '../../components/LessonIcon';
import { Markdown } from '../../components/Markdown';
import { VideoPlayer } from '../../components/VideoPlayer';
import { Page } from '../../components/Layout';
import { Alert, Badge, Button, Modal, Spinner } from '../../components/ui';
import { useToast } from '../../components/Toast';
import type { LessonContent } from '../../types/api';

export function CourseDetailPage() {
  const { slug = '' } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  // Reload when the user logs in/out so "enrolled"/"canManage" are correct.
  const { data, loading, error } = useLoad(() => api.course(slug), [slug, user?.id]);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState<Record<number, boolean>>({});
  const [preview, setPreview] = useState<LessonContent | null>(null);

  if (loading && !data) return <Spinner className="py-24" />;
  if (error || !data) return <Page><Alert>{error || 'Kursus tidak ditemukan'}</Alert></Page>;

  const { course, sections, instructor } = data;
  const learnUrl = `/learn/${course.id}`;

  const join = async () => {
    if (!user) {
      navigate('/login', { state: { from: location.pathname } });
      return;
    }
    setBusy(true);
    try {
      const res = await api.checkout(course.id);
      if (res.enrolled) {
        toast.success('Berhasil terdaftar. Selamat belajar!');
        navigate(learnUrl);
      } else if (res.redirectUrl) {
        // Simulator page lives in this app; Midtrans Snap is an external hosted page.
        const url = new URL(res.redirectUrl, window.location.origin);
        if (url.origin === window.location.origin) navigate(url.pathname + url.search);
        else window.location.href = res.redirectUrl;
      }
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const showPreview = async (id: number) => {
    try {
      setPreview(await api.previewLesson(id));
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const allOpen = sections.every((s) => open[s.id] !== false);

  return (
    <>
      <section className="bg-slate-900 text-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_360px]">
          <div>
            <div className="flex flex-wrap gap-2 text-sm">
              {course.categoryName && <Link to={`/courses?category=${course.categorySlug}`} className="text-brand-300 hover:text-brand-200">{course.categoryName}</Link>}
              {course.status !== 'PUBLISHED' && <Badge tone="amber">{course.status === 'DRAFT' ? 'Draf' : 'Diarsipkan'}</Badge>}
            </div>
            <h1 className="mt-2 text-3xl font-bold leading-tight sm:text-4xl">{course.title}</h1>
            {course.subtitle && <p className="mt-3 text-lg text-slate-300">{course.subtitle}</p>}
            <p className="mt-4 text-sm text-slate-300">Instruktur: <span className="font-semibold text-white">{instructor.fullName}</span></p>
            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-300">
              <span className="inline-flex items-center gap-1.5"><BarChart3 size={16} /> {levelLabel[course.level]}</span>
              <span className="inline-flex items-center gap-1.5"><BookOpen size={16} /> {course.lessonCount} materi</span>
              {course.totalMinutes > 0 && <span className="inline-flex items-center gap-1.5"><Clock size={16} /> {duration(course.totalMinutes)}</span>}
              <span className="inline-flex items-center gap-1.5"><Users size={16} /> {num(course.studentCount)} siswa</span>
            </div>
          </div>
          <div className="lg:row-span-2">
            <div className="overflow-hidden rounded-2xl bg-white text-slate-900 shadow-xl lg:sticky lg:top-24">
              <Thumbnail course={course} />
              <div className="p-5">
                <p className={`text-3xl font-bold ${course.free ? 'text-emerald-600' : ''}`}>{price(course.price)}</p>
                {data.enrolled ? (
                  <Button size="lg" className="mt-4 w-full" onClick={() => navigate(learnUrl)}>Lanjutkan belajar</Button>
                ) : course.status === 'PUBLISHED' ? (
                  <Button size="lg" className="mt-4 w-full" disabled={busy} onClick={join}>
                    {busy ? 'Memproses...' : course.free ? 'Daftar gratis' : 'Beli kursus'}
                  </Button>
                ) : (
                  <p className="mt-4 text-sm text-slate-500">Kursus ini belum dibuka untuk pendaftaran.</p>
                )}
                {data.canManage && (
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <Button variant="secondary" onClick={() => navigate(`/instructor/courses/${course.id}`)}><Pencil size={15} /> Edit</Button>
                    <Button variant="secondary" onClick={() => navigate(learnUrl)}><Eye size={15} /> Pratinjau</Button>
                  </div>
                )}
                <ul className="mt-5 space-y-2 text-sm text-slate-600">
                  <li className="flex gap-2"><Check size={16} className="text-emerald-600" /> Akses selamanya</li>
                  <li className="flex gap-2"><Check size={16} className="text-emerald-600" /> {course.lessonCount} materi termasuk kuis & tugas</li>
                  <li className="flex gap-2"><Check size={16} className="text-emerald-600" /> Sertifikat penyelesaian</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Page className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="min-w-0 space-y-8">
          {data.whatYouLearn.length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <h2 className="text-xl font-bold text-slate-900">Yang akan Anda pelajari</h2>
              <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                {data.whatYouLearn.map((w, i) => <li key={i} className="flex gap-2 text-sm text-slate-700"><Check size={18} className="shrink-0 text-brand-600" /> {w}</li>)}
              </ul>
            </div>
          )}

          <div>
            <div className="flex items-end justify-between">
              <h2 className="text-xl font-bold text-slate-900">Kurikulum</h2>
              {sections.length > 0 && (
                <button className="text-sm font-medium text-brand-600 hover:text-brand-700"
                  onClick={() => setOpen(Object.fromEntries(sections.map((s) => [s.id, !allOpen])))}>
                  {allOpen ? 'Tutup semua' : 'Buka semua'}
                </button>
              )}
            </div>
            <p className="mt-1 text-sm text-slate-500">{sections.length} bagian · {course.lessonCount} materi{course.totalMinutes ? ` · ${duration(course.totalMinutes)}` : ''}</p>
            <div className="mt-4 divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200 bg-white">
              {sections.map((s) => {
                const isOpen = open[s.id] !== false;
                return (
                  <div key={s.id}>
                    <button onClick={() => setOpen((o) => ({ ...o, [s.id]: !isOpen }))} aria-expanded={isOpen}
                      className="flex w-full items-center justify-between bg-slate-50 px-5 py-3 text-left">
                      <span className="font-semibold text-slate-900">{s.title}</span>
                      <span className="flex items-center gap-2 text-xs text-slate-500">{s.lessons.length} materi <ChevronDown size={16} className={`transition ${isOpen ? 'rotate-180' : ''}`} /></span>
                    </button>
                    {isOpen && (
                      <ul className="divide-y divide-slate-100">
                        {s.lessons.map((l) => (
                          <li key={l.id} className="flex items-center gap-3 px-5 py-3 text-sm">
                            <LessonIcon type={l.type} className="shrink-0 text-slate-400" />
                            <span className="flex-1 text-slate-700">{l.title}</span>
                            {l.freePreview && (l.type === 'VIDEO' || l.type === 'TEXT') && (
                              <button onClick={() => showPreview(l.id)} className="text-xs font-semibold text-brand-600 hover:text-brand-700">Pratinjau</button>
                            )}
                            <span className="w-16 text-right text-xs text-slate-400">{l.durationMinutes ? `${l.durationMinutes} mnt` : lessonTypeLabel[l.type]}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {data.description && (
            <div>
              <h2 className="text-xl font-bold text-slate-900">Deskripsi</h2>
              <Markdown text={data.description} className="mt-3" />
            </div>
          )}

          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="text-xl font-bold text-slate-900">Instruktur</h2>
            <p className="mt-3 font-semibold text-brand-700">{instructor.fullName}</p>
            {instructor.headline && <p className="text-sm text-slate-500">{instructor.headline}</p>}
            {instructor.bio && <p className="mt-3 whitespace-pre-line text-sm text-slate-700">{instructor.bio}</p>}
          </div>
        </div>
      </Page>

      <Modal open={preview !== null} wide title={preview ? `Pratinjau: ${preview.title}` : ''} onClose={() => setPreview(null)}>
        {preview?.type === 'VIDEO' && preview.videoUrl && <VideoPlayer url={preview.videoUrl} title={preview.title} />}
        {preview?.content && <Markdown text={preview.content} className="mt-4" />}
      </Modal>
    </>
  );
}
