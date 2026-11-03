import { ChangeEvent, FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  AlertTriangle, Archive, ArrowDown, ArrowUp, ChevronLeft, Eye, FileUp, ImagePlus, ListChecks, Pencil, Plus, Rocket, Trash2, Undo2,
} from 'lucide-react';
import { api } from '../../services/api';
import { useLoad } from '../../lib/useLoad';
import { errorMessage, formatDate, lessonTypeLabel, levelLabel } from '../../lib/format';
import { Thumbnail } from '../../components/CourseCard';
import { LessonIcon } from '../../components/LessonIcon';
import { Markdown } from '../../components/Markdown';
import { Page } from '../../components/Layout';
import {
  Alert, Badge, Button, Card, cx, EmptyState, Field, Input, Modal, ProgressBar, Select, Spinner, Table, Td, Textarea,
} from '../../components/ui';
import { useToast } from '../../components/Toast';
import { statusBadge } from './InstructorPages';
import type {
  CourseEditor, CourseLevel, EditorLesson, EditorQuestion, EditorSection, LessonRequest, LessonType,
} from '../../types/api';

type Tab = 'info' | 'curriculum' | 'students';

export function CourseEditorPage() {
  const { id = '' } = useParams();
  const courseId = Number(id);
  const navigate = useNavigate();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const tab = (params.get('tab') as Tab) || 'info';
  const { data, setData, loading, error } = useLoad(() => api.editor(courseId), [courseId]);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (loading && !data) return <Spinner className="py-24" />;
  if (error || !data) return <Page><Alert>{error || 'Kursus tidak ditemukan'}</Alert></Page>;

  const c = data.course;

  /** Runs an editor mutation; every endpoint returns the fresh editor state. */
  const run = async (fn: () => Promise<CourseEditor>, success?: string) => {
    setBusy(true);
    try {
      setData(await fn());
      if (success) toast.success(success);
      return true;
    } catch (err) {
      toast.error(errorMessage(err));
      return false;
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await api.deleteCourse(courseId);
      toast.success('Kursus dihapus');
      navigate('/instructor');
    } catch (err) {
      toast.error(errorMessage(err));
      setConfirmDelete(false);
    } finally {
      setBusy(false);
    }
  };

  const tabs: Array<[Tab, string]> = [['info', 'Informasi'], ['curriculum', 'Kurikulum'], ['students', 'Siswa']];

  return (
    <Page>
      <Link to="/instructor" className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-700"><ChevronLeft size={16} /> Semua kursus</Link>
      <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Badge tone={statusBadge[c.status].tone}>{statusBadge[c.status].label}</Badge>
            {c.publishedAt && <span className="text-xs text-slate-400">Terbit {formatDate(c.publishedAt)}</span>}
          </div>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">{c.title}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => navigate(`/learn/${c.id}`)}><Eye size={16} /> Pratinjau</Button>
          {c.status === 'PUBLISHED' && <Button variant="secondary" onClick={() => navigate(`/courses/${c.slug}`)}>Lihat halaman</Button>}
          {c.status !== 'PUBLISHED' && (
            <Button disabled={busy || data.publishProblems.length > 0} onClick={() => run(() => api.publish(c.id), 'Kursus diterbitkan')}
              title={data.publishProblems.length ? 'Lengkapi dulu syarat penerbitan' : undefined}><Rocket size={16} /> Terbitkan</Button>
          )}
          {c.status === 'PUBLISHED' && <Button variant="secondary" disabled={busy} onClick={() => run(() => api.unpublish(c.id), 'Kursus dikembalikan ke draf')}><Undo2 size={16} /> Jadikan draf</Button>}
          {c.status !== 'ARCHIVED' && c.studentCount > 0 && <Button variant="secondary" disabled={busy} onClick={() => run(() => api.archive(c.id), 'Kursus diarsipkan')}><Archive size={16} /> Arsipkan</Button>}
          {c.studentCount === 0 && <Button variant="danger" disabled={busy} onClick={() => setConfirmDelete(true)}><Trash2 size={16} /> Hapus</Button>}
        </div>
      </div>

      {c.status !== 'PUBLISHED' && data.publishProblems.length > 0 && (
        <div className="mt-4"><Alert tone="warn">
          <p className="flex items-center gap-1.5 font-semibold"><AlertTriangle size={16} /> Sebelum diterbitkan, lengkapi:</p>
          <ul className="ml-6 mt-1 list-disc">{data.publishProblems.map((p) => <li key={p}>{p}</li>)}</ul>
        </Alert></div>
      )}

      <div className="mt-6 flex gap-1 border-b border-slate-200">
        {tabs.map(([k, label]) => (
          <button key={k} onClick={() => setParams({ tab: k }, { replace: true })}
            className={cx('-mb-px border-b-2 px-4 py-2 text-sm font-medium', tab === k ? 'border-brand-600 text-brand-700' : 'border-transparent text-slate-500 hover:text-slate-700')}>
            {label}{k === 'students' ? ` (${c.studentCount})` : k === 'curriculum' ? ` (${c.lessonCount})` : ''}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === 'info' && <InfoTab data={data} busy={busy} run={run} />}
        {tab === 'curriculum' && <CurriculumTab data={data} busy={busy} run={run} />}
        {tab === 'students' && <StudentsTab courseId={c.id} />}
      </div>

      <Modal open={confirmDelete} title="Hapus kursus" onClose={() => setConfirmDelete(false)}
        footer={<><Button variant="secondary" onClick={() => setConfirmDelete(false)}>Batal</Button><Button variant="danger" disabled={busy} onClick={remove}>Hapus permanen</Button></>}>
        <p className="text-sm text-slate-700">Kursus <b>{c.title}</b> beserta seluruh materinya akan dihapus permanen.</p>
      </Modal>
    </Page>
  );
}

type RunFn = (fn: () => Promise<CourseEditor>, success?: string) => Promise<boolean>;

function InfoTab({ data, busy, run }: { data: CourseEditor; busy: boolean; run: RunFn }) {
  const categories = useLoad(() => api.categories());
  const c = data.course;
  const [description, setDescription] = useState(data.description ?? '');
  const [showPreview, setShowPreview] = useState(false);

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    void run(() => api.updateCourse(c.id, {
      title: String(f.get('title')).trim(),
      subtitle: String(f.get('subtitle') ?? '').trim() || null,
      description: description.trim() || null,
      whatYouLearn: String(f.get('whatYouLearn') ?? '').trim() || null,
      level: f.get('level') as CourseLevel,
      price: Number(f.get('price') || 0),
      categoryId: f.get('categoryId') ? Number(f.get('categoryId')) : null,
    }), 'Informasi kursus disimpan');
  };

  const pickThumb = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) void run(() => api.uploadThumbnail(c.id, file), 'Gambar sampul diperbarui');
  };

  return (
    <form onSubmit={submit} className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <Card className="space-y-4">
        <Field label="Judul *"><Input name="title" required maxLength={160} defaultValue={c.title} /></Field>
        <Field label="Subjudul"><Input name="subtitle" maxLength={255} defaultValue={c.subtitle ?? ''} /></Field>
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-sm font-medium text-slate-700">Deskripsi</span>
            <button type="button" className="text-xs font-semibold text-brand-600" onClick={() => setShowPreview((p) => !p)}>{showPreview ? 'Edit' : 'Pratinjau'}</button>
          </div>
          {showPreview
            ? <div className="min-h-[180px] rounded-lg border border-slate-200 p-3"><Markdown text={description || '_Belum ada deskripsi_'} /></div>
            : <Textarea rows={8} maxLength={20000} value={description} onChange={(e) => setDescription(e.target.value)} />}
          <span className="mt-1 block text-xs text-slate-500">Mendukung Markdown: **tebal**, _miring_, ## judul, - daftar, `kode`.</span>
        </div>
        <Field label="Yang akan dipelajari" hint="Satu poin per baris">
          <Textarea name="whatYouLearn" rows={5} maxLength={5000} defaultValue={data.whatYouLearn ?? ''} />
        </Field>
      </Card>
      <div className="space-y-6">
        <Card>
          <p className="mb-2 text-sm font-medium text-slate-700">Gambar sampul</p>
          <div className="overflow-hidden rounded-xl"><Thumbnail course={c} /></div>
          <label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            <ImagePlus size={16} /> {c.thumbnailUrl ? 'Ganti gambar' : 'Unggah gambar'}
            <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={pickThumb} disabled={busy} />
          </label>
          <p className="mt-1 text-xs text-slate-500">JPG/PNG/WebP, maks. 2 MB, rasio 16:9.</p>
        </Card>
        <Card className="space-y-4">
          <Field label="Kategori">
            <Select name="categoryId" defaultValue={data.categoryId ?? ''}>
              <option value="">Tanpa kategori</option>
              {(categories.data ?? []).map((cat) => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
            </Select>
          </Field>
          <Field label="Level">
            <Select name="level" defaultValue={c.level}>
              {(Object.keys(levelLabel) as CourseLevel[]).map((l) => <option key={l} value={l}>{levelLabel[l]}</option>)}
            </Select>
          </Field>
          <Field label="Harga (Rp)" hint="Isi 0 untuk kursus gratis"><Input name="price" type="number" min={0} step={1000} defaultValue={Number(c.price)} /></Field>
        </Card>
        <Button type="submit" className="w-full" disabled={busy}>Simpan informasi</Button>
      </div>
    </form>
  );
}

function CurriculumTab({ data, busy, run }: { data: CourseEditor; busy: boolean; run: RunFn }) {
  const [sectionModal, setSectionModal] = useState<EditorSection | 'new' | null>(null);
  const [lessonModal, setLessonModal] = useState<{ sectionId: number; lesson?: EditorLesson } | null>(null);
  const [quizLesson, setQuizLesson] = useState<EditorLesson | null>(null);
  const [deleting, setDeleting] = useState<{ kind: 'section' | 'lesson'; id: number; title: string } | null>(null);

  // Keep open modals pointing at the latest lesson data after each save.
  const findLesson = (id?: number) => data.sections.flatMap((s) => s.lessons).find((l) => l.id === id);

  const saveSection = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const title = String(new FormData(e.currentTarget).get('title')).trim();
    const ok = sectionModal === 'new'
      ? await run(() => api.addSection(data.course.id, title), 'Bagian ditambahkan')
      : sectionModal && await run(() => api.updateSection(sectionModal.id, title), 'Bagian diperbarui');
    if (ok) setSectionModal(null);
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    const ok = deleting.kind === 'section'
      ? await run(() => api.deleteSection(deleting.id), 'Bagian dihapus')
      : await run(() => api.deleteLesson(deleting.id), 'Materi dihapus');
    if (ok) setDeleting(null);
  };

  return (
    <div>
      {data.sections.length === 0 ? (
        <EmptyState title="Kurikulum masih kosong" description="Mulai dengan menambahkan bagian (mis. 'Pengenalan'), lalu isi dengan materi."
          action={<Button onClick={() => setSectionModal('new')}><Plus size={16} /> Tambah bagian</Button>} />
      ) : (
        <div className="space-y-4">
          {data.sections.map((s, si) => (
            <div key={s.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3">
                <span className="text-xs font-semibold uppercase text-slate-400">Bagian {si + 1}</span>
                <span className="flex-1 font-semibold text-slate-900">{s.title}</span>
                <IconBtn label="Naikkan" disabled={busy || si === 0} onClick={() => run(() => api.moveSection(s.id, 'UP'))}><ArrowUp size={15} /></IconBtn>
                <IconBtn label="Turunkan" disabled={busy || si === data.sections.length - 1} onClick={() => run(() => api.moveSection(s.id, 'DOWN'))}><ArrowDown size={15} /></IconBtn>
                <IconBtn label="Ubah judul" onClick={() => setSectionModal(s)}><Pencil size={15} /></IconBtn>
                <IconBtn label="Hapus bagian" onClick={() => setDeleting({ kind: 'section', id: s.id, title: s.title })}><Trash2 size={15} className="text-rose-500" /></IconBtn>
              </div>
              <ul className="divide-y divide-slate-100">
                {s.lessons.map((l, li) => (
                  <li key={l.id} className="flex items-center gap-3 px-4 py-3">
                    <LessonIcon type={l.type} className="shrink-0 text-slate-400" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-800">{l.title}</p>
                      <p className="text-xs text-slate-500">
                        {lessonTypeLabel[l.type]}{l.durationMinutes ? ` · ${l.durationMinutes} mnt` : ''}{l.freePreview ? ' · pratinjau gratis' : ''}
                        {l.type === 'QUIZ' && ` · ${l.questions.length} soal`}
                        {l.type === 'PDF' && (l.hasFile ? ` · ${l.originalFileName}` : ' · file belum diunggah')}
                      </p>
                    </div>
                    {l.type === 'QUIZ' && <Button size="sm" variant="secondary" onClick={() => setQuizLesson(l)}><ListChecks size={14} /> Soal</Button>}
                    <IconBtn label="Naikkan" disabled={busy || li === 0} onClick={() => run(() => api.moveLesson(l.id, 'UP'))}><ArrowUp size={15} /></IconBtn>
                    <IconBtn label="Turunkan" disabled={busy || li === s.lessons.length - 1} onClick={() => run(() => api.moveLesson(l.id, 'DOWN'))}><ArrowDown size={15} /></IconBtn>
                    <IconBtn label="Ubah materi" onClick={() => setLessonModal({ sectionId: s.id, lesson: l })}><Pencil size={15} /></IconBtn>
                    <IconBtn label="Hapus materi" onClick={() => setDeleting({ kind: 'lesson', id: l.id, title: l.title })}><Trash2 size={15} className="text-rose-500" /></IconBtn>
                  </li>
                ))}
              </ul>
              <button onClick={() => setLessonModal({ sectionId: s.id })}
                className="flex w-full items-center gap-2 px-4 py-3 text-sm font-semibold text-brand-600 hover:bg-brand-50"><Plus size={16} /> Tambah materi</button>
            </div>
          ))}
          <Button variant="secondary" onClick={() => setSectionModal('new')}><Plus size={16} /> Tambah bagian</Button>
        </div>
      )}

      <Modal open={sectionModal !== null} title={sectionModal === 'new' ? 'Tambah bagian' : 'Ubah bagian'} onClose={() => setSectionModal(null)}>
        <form key={sectionModal === 'new' ? 'new' : sectionModal?.id} onSubmit={saveSection} className="space-y-3">
          <Field label="Judul bagian"><Input name="title" required maxLength={160} autoFocus defaultValue={sectionModal && sectionModal !== 'new' ? sectionModal.title : ''} /></Field>
          <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setSectionModal(null)}>Batal</Button><Button type="submit" disabled={busy}>Simpan</Button></div>
        </form>
      </Modal>

      {lessonModal && (
        <LessonModal sectionId={lessonModal.sectionId} lesson={findLesson(lessonModal.lesson?.id) ?? lessonModal.lesson}
          busy={busy} run={run} onClose={() => setLessonModal(null)}
          onCreated={(l) => {
            // Quiz: go straight to writing questions. PDF: keep the dialog open on the new lesson to upload the file.
            if (l.type === 'QUIZ') { setLessonModal(null); setQuizLesson(l); } else setLessonModal({ sectionId: lessonModal.sectionId, lesson: l });
          }}
          findNew={(title, type) => data.sections.find((s) => s.id === lessonModal.sectionId)?.lessons.filter((l) => l.title === title && l.type === type).pop()} />
      )}

      {quizLesson && <QuizEditor lesson={findLesson(quizLesson.id) ?? quizLesson} busy={busy} run={run} onClose={() => setQuizLesson(null)} />}

      <Modal open={deleting !== null} title={deleting?.kind === 'section' ? 'Hapus bagian' : 'Hapus materi'} onClose={() => setDeleting(null)}
        footer={<><Button variant="secondary" onClick={() => setDeleting(null)}>Batal</Button><Button variant="danger" disabled={busy} onClick={confirmDelete}>Hapus</Button></>}>
        <p className="text-sm text-slate-700"><b>{deleting?.title}</b> {deleting?.kind === 'section' ? 'beserta semua materinya ' : ''}akan dihapus. Progres siswa pada materi ini ikut terhapus.</p>
      </Modal>
    </div>
  );
}

const IconBtn = ({ label, children, ...props }: { label: string; children: React.ReactNode; disabled?: boolean; onClick: () => void }) => (
  <button type="button" aria-label={label} title={label} {...props}
    className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-30">{children}</button>
);

const LESSON_TYPES: LessonType[] = ['VIDEO', 'TEXT', 'PDF', 'QUIZ', 'ASSIGNMENT'];

function LessonModal({ sectionId, lesson, busy, run, onClose, onCreated, findNew }: {
  sectionId: number; lesson?: EditorLesson; busy: boolean; run: RunFn; onClose: () => void;
  onCreated: (l: EditorLesson) => void; findNew: (title: string, type: LessonType) => EditorLesson | undefined;
}) {
  const [type, setType] = useState<LessonType>(lesson?.type ?? 'VIDEO');
  const [content, setContent] = useState(lesson?.content ?? '');
  const [preview, setPreview] = useState(false);
  const [pending, setPending] = useState<{ title: string; type: LessonType } | null>(null);
  const locked = Boolean(lesson && (lesson.hasFile || lesson.questions.length > 0));

  // The editor state arrives after the save; hand the newly created quiz/PDF lesson back to the parent.
  const created = pending ? findNew(pending.title, pending.type) : undefined;
  useEffect(() => {
    if (created) { setPending(null); onCreated(created); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [created]);

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const body: LessonRequest = {
      title: String(f.get('title')).trim(),
      type,
      durationMinutes: f.get('durationMinutes') ? Number(f.get('durationMinutes')) : null,
      freePreview: f.get('freePreview') === 'on',
      videoUrl: type === 'VIDEO' ? String(f.get('videoUrl') ?? '').trim() || null : null,
      content: type === 'VIDEO' || type === 'TEXT' || type === 'PDF' ? content.trim() || null : null,
      passingScore: type === 'QUIZ' ? Number(f.get('passingScore') || 70) : null,
      assignmentInstructions: type === 'ASSIGNMENT' ? String(f.get('assignmentInstructions') ?? '').trim() || null : null,
    };
    const ok = lesson
      ? await run(() => api.updateLesson(lesson.id, body), 'Materi disimpan')
      : await run(() => api.addLesson(sectionId, body), 'Materi ditambahkan');
    if (!ok) return;
    if (!lesson && (type === 'QUIZ' || type === 'PDF')) setPending({ title: body.title, type });
    else onClose();
  };

  const uploadPdf = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file && lesson) void run(() => api.uploadLessonFile(lesson.id, file), 'File PDF diunggah');
  };

  const previewable = type === 'VIDEO' || type === 'TEXT';

  return (
    <Modal open wide title={lesson ? 'Ubah materi' : 'Tambah materi'} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <span className="mb-1.5 block text-sm font-medium text-slate-700">Jenis materi</span>
          <div className="grid grid-cols-5 gap-2">
            {LESSON_TYPES.map((t) => (
              <button key={t} type="button" disabled={locked && t !== type} onClick={() => setType(t)}
                className={cx('flex flex-col items-center gap-1 rounded-xl border px-2 py-3 text-xs font-medium disabled:opacity-40',
                  type === t ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50')}>
                <LessonIcon type={t} size={18} /> {lessonTypeLabel[t]}
              </button>
            ))}
          </div>
          {locked && <p className="mt-1 text-xs text-slate-500">Jenis tidak bisa diubah karena materi sudah berisi file/soal.</p>}
        </div>
        <div className="grid gap-3 sm:grid-cols-[1fr_140px]">
          <Field label="Judul *"><Input name="title" required maxLength={160} defaultValue={lesson?.title} autoFocus /></Field>
          <Field label="Durasi (menit)"><Input name="durationMinutes" type="number" min={0} max={1440} defaultValue={lesson?.durationMinutes ?? ''} /></Field>
        </div>

        {type === 'VIDEO' && (
          <Field label="URL video" hint="YouTube, Vimeo, Google Drive, atau link langsung .mp4">
            <Input name="videoUrl" type="url" placeholder="https://www.youtube.com/watch?v=..." defaultValue={lesson?.videoUrl ?? ''} />
          </Field>
        )}
        {type === 'QUIZ' && (
          <Field label="Nilai minimal lulus (0–100)"><Input name="passingScore" type="number" min={0} max={100} defaultValue={lesson?.passingScore ?? 70} /></Field>
        )}
        {type === 'ASSIGNMENT' && (
          <Field label="Instruksi tugas" hint="Mendukung Markdown. Siswa mengunggah PDF, ZIP, gambar, atau dokumen Office (maks. 10 MB).">
            <Textarea name="assignmentInstructions" rows={6} maxLength={5000} defaultValue={lesson?.assignmentInstructions ?? ''} />
          </Field>
        )}
        {(type === 'VIDEO' || type === 'TEXT' || type === 'PDF') && (
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700">{type === 'TEXT' ? 'Isi materi *' : 'Catatan / ringkasan (opsional)'}</span>
              <button type="button" className="text-xs font-semibold text-brand-600" onClick={() => setPreview((p) => !p)}>{preview ? 'Edit' : 'Pratinjau'}</button>
            </div>
            {preview
              ? <div className="min-h-[200px] rounded-lg border border-slate-200 p-3"><Markdown text={content || '_Kosong_'} /></div>
              : <Textarea rows={type === 'TEXT' ? 12 : 5} maxLength={100000} value={content} onChange={(e) => setContent(e.target.value)} className="font-mono text-xs" />}
            <span className="mt-1 block text-xs text-slate-500">Markdown: ## judul, **tebal**, - daftar, ```kode```, [tautan](https://...)</span>
          </div>
        )}
        {type === 'PDF' && (
          <div className="rounded-xl border border-dashed border-slate-300 p-4">
            {lesson ? (
              <>
                <p className="text-sm text-slate-700">{lesson.hasFile ? <>File saat ini: <b>{lesson.originalFileName}</b></> : 'Belum ada file PDF.'}</p>
                <label className="mt-2 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                  <FileUp size={16} /> {lesson.hasFile ? 'Ganti PDF' : 'Unggah PDF'}
                  <input type="file" accept="application/pdf,.pdf" className="hidden" onChange={uploadPdf} disabled={busy} />
                </label>
                <p className="mt-1 text-xs text-slate-500">Maks. 20 MB.</p>
              </>
            ) : <p className="text-sm text-slate-500">Simpan materi dulu, lalu unggah file PDF di jendela ini.</p>}
          </div>
        )}
        {previewable && (
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" name="freePreview" defaultChecked={lesson?.freePreview} className="accent-brand-600" />
            Pratinjau gratis (bisa dilihat siapa pun di halaman kursus)
          </label>
        )}
        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>{lesson && type === 'PDF' ? 'Tutup' : 'Batal'}</Button>
          <Button type="submit" disabled={busy}>{lesson ? 'Simpan' : type === 'QUIZ' ? 'Simpan & tulis soal' : type === 'PDF' ? 'Simpan & unggah PDF' : 'Tambah materi'}</Button>
        </div>
      </form>
    </Modal>
  );
}

const emptyQuestion = (): EditorQuestion => ({ text: '', explanation: '', options: [{ text: '', correct: true }, { text: '', correct: false }] });

function QuizEditor({ lesson, busy, run, onClose }: { lesson: EditorLesson; busy: boolean; run: RunFn; onClose: () => void }) {
  const [questions, setQuestions] = useState<EditorQuestion[]>(() =>
    lesson.questions.length ? lesson.questions.map((q) => ({ ...q, options: q.options.map((o) => ({ ...o })) })) : [emptyQuestion()]);
  const [error, setError] = useState('');

  const update = (qi: number, patch: Partial<EditorQuestion>) => setQuestions((qs) => qs.map((q, i) => (i === qi ? { ...q, ...patch } : q)));
  const setOption = (qi: number, oi: number, patch: { text?: string; correct?: boolean }) =>
    setQuestions((qs) => qs.map((q, i) => i !== qi ? q : {
      ...q,
      options: q.options.map((o, j) => patch.correct ? { ...o, correct: j === oi } : j === oi ? { ...o, ...patch } : o),
    }));

  const save = async () => {
    const problem = questions.findIndex((q) => !q.text.trim() || q.options.length < 2 || q.options.some((o) => !o.text.trim()) || !q.options.some((o) => o.correct));
    if (problem >= 0) { setError(`Soal ${problem + 1}: isi pertanyaan, minimal 2 pilihan yang terisi, dan tandai 1 jawaban benar.`); return; }
    setError('');
    if (await run(() => api.saveQuiz(lesson.id, questions), 'Soal kuis disimpan')) onClose();
  };

  return (
    <Modal open wide title={`Soal kuis: ${lesson.title}`} onClose={onClose}
      footer={<><span className="mr-auto self-center text-sm text-slate-500">{questions.length} soal · lulus ≥ {lesson.passingScore ?? 70}</span>
        <Button variant="secondary" onClick={onClose}>Batal</Button><Button disabled={busy} onClick={save}>Simpan soal</Button></>}>
      {error && <div className="mb-3"><Alert>{error}</Alert></div>}
      <ol className="space-y-5">
        {questions.map((q, qi) => (
          <li key={qi} className="rounded-xl border border-slate-200 p-4">
            <div className="flex items-start gap-2">
              <span className="mt-2 text-sm font-semibold text-slate-400">{qi + 1}.</span>
              <Textarea rows={2} placeholder="Tulis pertanyaan..." value={q.text} maxLength={2000} onChange={(e) => update(qi, { text: e.target.value })} />
              <IconBtn label="Hapus soal" disabled={questions.length === 1} onClick={() => setQuestions((qs) => qs.filter((_, i) => i !== qi))}><Trash2 size={15} className="text-rose-500" /></IconBtn>
            </div>
            <div className="ml-6 mt-3 space-y-2">
              {q.options.map((o, oi) => (
                <div key={oi} className="flex items-center gap-2">
                  <input type="radio" name={`correct-${qi}`} checked={o.correct} onChange={() => setOption(qi, oi, { correct: true })}
                    className="accent-emerald-600" aria-label="Jawaban benar" title="Tandai sebagai jawaban benar" />
                  <Input value={o.text} maxLength={500} placeholder={`Pilihan ${String.fromCharCode(65 + oi)}`} onChange={(e) => setOption(qi, oi, { text: e.target.value })}
                    className={o.correct ? 'border-emerald-300 bg-emerald-50' : ''} />
                  <IconBtn label="Hapus pilihan" disabled={q.options.length <= 2}
                    onClick={() => update(qi, { options: (() => { const rest = q.options.filter((_, j) => j !== oi); if (o.correct) rest[0] = { ...rest[0], correct: true }; return rest; })() })}>
                    <Trash2 size={14} />
                  </IconBtn>
                </div>
              ))}
              {q.options.length < 8 && (
                <button type="button" className="text-xs font-semibold text-brand-600" onClick={() => update(qi, { options: [...q.options, { text: '', correct: false }] })}>+ Tambah pilihan</button>
              )}
              <Input placeholder="Pembahasan (opsional, ditampilkan setelah siswa menjawab)" value={q.explanation ?? ''} maxLength={2000}
                onChange={(e) => update(qi, { explanation: e.target.value })} className="text-xs" />
            </div>
          </li>
        ))}
      </ol>
      {questions.length < 100 && <Button variant="secondary" className="mt-4" onClick={() => setQuestions((qs) => [...qs, emptyQuestion()])}><Plus size={16} /> Tambah soal</Button>}
      <p className="mt-3 text-xs text-slate-500">Pilih bulatan di sebelah kiri untuk menandai jawaban yang benar.</p>
    </Modal>
  );
}

function StudentsTab({ courseId }: { courseId: number }) {
  const { data, loading, error } = useLoad(() => api.courseStudents(courseId), [courseId]);
  if (error) return <Alert>{error}</Alert>;
  if (loading && !data) return <Spinner />;
  return (
    <Table headers={['Siswa', 'Terdaftar', 'Progres', 'Selesai']} empty={(data ?? []).length === 0} emptyText="Belum ada siswa yang terdaftar">
      {(data ?? []).map((s) => (
        <tr key={s.userId}>
          <Td><p className="font-medium text-slate-900">{s.fullName}</p><p className="text-xs text-slate-500">{s.email}</p></Td>
          <Td className="text-slate-500">{formatDate(s.enrolledAt)}</Td>
          <Td><div className="flex items-center gap-2"><ProgressBar value={s.progressPercent} className="w-28" /><span className="text-xs text-slate-500">{s.progressPercent}%</span></div></Td>
          <Td>{s.completedAt ? <Badge tone="green">{formatDate(s.completedAt)}</Badge> : <span className="text-slate-400">-</span>}</Td>
        </tr>
      ))}
    </Table>
  );
}
