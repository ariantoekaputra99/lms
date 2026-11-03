import { FormEvent, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { ClipboardCheck, Download, Plus } from 'lucide-react';
import { api, downloadFile } from '../../services/api';
import { useLoad } from '../../lib/useLoad';
import { errorMessage, formatDateTime, levelLabel, money, num, price } from '../../lib/format';
import { Thumbnail } from '../../components/CourseCard';
import { Page } from '../../components/Layout';
import {
  Alert, Badge, Button, cx, EmptyState, Field, Input, Modal, PageHeader, Select, Spinner, Stat, Table, Td, Textarea,
} from '../../components/ui';
import { useToast } from '../../components/Toast';
import type { CourseLevel, CourseStatus, Submission } from '../../types/api';

export const statusBadge: Record<CourseStatus, { label: string; tone: 'green' | 'amber' | 'slate' }> = {
  PUBLISHED: { label: 'Terbit', tone: 'green' },
  DRAFT: { label: 'Draf', tone: 'amber' },
  ARCHIVED: { label: 'Diarsipkan', tone: 'slate' },
};

export function InstructorNav() {
  const cls = ({ isActive }: { isActive: boolean }) =>
    cx('-mb-px border-b-2 px-4 py-2 text-sm font-medium', isActive ? 'border-brand-600 text-brand-700' : 'border-transparent text-slate-500 hover:text-slate-700');
  return (
    <div className="mb-6 flex gap-1 border-b border-slate-200">
      <NavLink to="/instructor" end className={cls}>Kursus</NavLink>
      <NavLink to="/instructor/submissions" className={cls}>Penilaian Tugas</NavLink>
    </div>
  );
}

export function InstructorDashboard() {
  const stats = useLoad(() => api.instructorStats());
  const courses = useLoad(() => api.instructorCourses());
  const [creating, setCreating] = useState(false);

  return (
    <Page>
      <PageHeader title="Dasbor Instruktur" actions={<Button onClick={() => setCreating(true)}><Plus size={16} /> Buat kursus</Button>} />
      <InstructorNav />
      {stats.data && (
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Kursus" value={num(stats.data.courses)} sub={`${num(stats.data.publishedCourses)} terbit`} />
          <Stat label="Siswa" value={num(stats.data.students)} />
          <Stat label="Pendapatan" value={money(stats.data.revenue)} sub="Dari pesanan lunas" />
          <Stat label="Tugas menunggu dinilai" value={num(stats.data.pendingSubmissions)}
            sub={stats.data.pendingSubmissions > 0 ? <Link to="/instructor/submissions" className="font-semibold text-brand-600">Nilai sekarang →</Link> : 'Semua sudah dinilai'} />
        </div>
      )}
      {courses.error && <Alert>{courses.error}</Alert>}
      {courses.loading && !courses.data ? <Spinner /> : (courses.data ?? []).length === 0 ? (
        <EmptyState title="Belum ada kursus" description="Buat kursus pertama Anda, susun kurikulumnya, lalu terbitkan."
          action={<Button onClick={() => setCreating(true)}><Plus size={16} /> Buat kursus</Button>} />
      ) : (
        <div className="space-y-3">
          {(courses.data ?? []).map((c) => (
            <Link key={c.id} to={`/instructor/courses/${c.id}`}
              className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm hover:border-brand-300">
              <div className="w-32 shrink-0 overflow-hidden rounded-xl sm:w-40"><Thumbnail course={c} /></div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={statusBadge[c.status].tone}>{statusBadge[c.status].label}</Badge>
                  {c.categoryName && <span className="text-xs text-slate-400">{c.categoryName}</span>}
                </div>
                <p className="mt-1 truncate font-semibold text-slate-900">{c.title}</p>
                <p className="mt-1 text-sm text-slate-500">{c.lessonCount} materi · {num(c.studentCount)} siswa · {price(c.price)}</p>
              </div>
              <span className="hidden text-sm font-semibold text-brand-600 sm:block">Kelola →</span>
            </Link>
          ))}
        </div>
      )}
      <CreateCourseModal open={creating} onClose={() => setCreating(false)} />
    </Page>
  );
}

function CreateCourseModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const toast = useToast();
  const categories = useLoad(() => api.categories());
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    try {
      const ed = await api.createCourse({
        title: String(f.get('title')).trim(),
        subtitle: String(f.get('subtitle') ?? '').trim() || null,
        level: f.get('level') as CourseLevel,
        price: Number(f.get('price') || 0),
        categoryId: f.get('categoryId') ? Number(f.get('categoryId')) : null,
      });
      toast.success('Kursus dibuat. Lanjutkan dengan menyusun kurikulum.');
      navigate(`/instructor/courses/${ed.course.id}?tab=curriculum`);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} title="Buat kursus baru" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <Field label="Judul kursus *"><Input name="title" required maxLength={160} autoFocus /></Field>
        <Field label="Subjudul"><Input name="subtitle" maxLength={255} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Level">
            <Select name="level" defaultValue="BEGINNER">
              {(Object.keys(levelLabel) as CourseLevel[]).map((l) => <option key={l} value={l}>{levelLabel[l]}</option>)}
            </Select>
          </Field>
          <Field label="Harga (Rp)" hint="0 = gratis"><Input name="price" type="number" min={0} step={1000} defaultValue={0} /></Field>
        </div>
        <Field label="Kategori">
          <Select name="categoryId" defaultValue="">
            <option value="">Tanpa kategori</option>
            {(categories.data ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </Field>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Batal</Button>
          <Button type="submit" disabled={busy}>{busy ? 'Membuat...' : 'Buat kursus'}</Button>
        </div>
      </form>
    </Modal>
  );
}

export function SubmissionsPage() {
  const toast = useToast();
  const { data, loading, error, reload } = useLoad(() => api.submissions());
  const [filter, setFilter] = useState<'SUBMITTED' | 'GRADED' | ''>('SUBMITTED');
  const [grading, setGrading] = useState<Submission | null>(null);
  const [busy, setBusy] = useState(false);
  const rows = (data ?? []).filter((s) => !filter || s.status === filter);

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!grading) return;
    const f = new FormData(e.currentTarget);
    setBusy(true);
    try {
      await api.grade(grading.id, Number(f.get('grade')), String(f.get('feedback') ?? '').trim());
      toast.success(`Tugas ${grading.studentName} dinilai`);
      setGrading(null);
      void reload();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const download = (s: Submission) =>
    downloadFile(api.submissionFilePath(s.id), s.originalFileName).catch((err) => toast.error(errorMessage(err)));

  return (
    <Page>
      <PageHeader title="Dasbor Instruktur" />
      <InstructorNav />
      <div className="mb-4 flex gap-2">
        {([['SUBMITTED', 'Menunggu dinilai'], ['GRADED', 'Sudah dinilai'], ['', 'Semua']] as const).map(([k, label]) => (
          <Button key={k} size="sm" variant={filter === k ? 'primary' : 'secondary'} onClick={() => setFilter(k)}>
            {label} ({(data ?? []).filter((s) => !k || s.status === k).length})
          </Button>
        ))}
      </div>
      {error && <Alert>{error}</Alert>}
      {loading && !data ? <Spinner /> : rows.length === 0 ? (
        <EmptyState icon={<ClipboardCheck size={22} />} title={filter === 'SUBMITTED' ? 'Tidak ada tugas yang menunggu penilaian' : 'Belum ada tugas'} />
      ) : (
        <Table headers={['Siswa', 'Tugas', 'Dikumpulkan', 'File', 'Nilai', '']}>
          {rows.map((s) => (
            <tr key={s.id}>
              <Td><p className="font-medium text-slate-900">{s.studentName}</p><p className="text-xs text-slate-500">{s.studentEmail}</p></Td>
              <Td><p className="text-slate-900">{s.lessonTitle}</p><p className="text-xs text-slate-500">{s.courseTitle}</p></Td>
              <Td className="whitespace-nowrap text-slate-500">{formatDateTime(s.submittedAt)}</Td>
              <Td><button onClick={() => download(s)} className="inline-flex max-w-[180px] items-center gap-1 truncate text-brand-700 hover:underline"><Download size={14} /> {s.originalFileName}</button></Td>
              <Td>{s.status === 'GRADED' ? <Badge tone="green">{s.grade}</Badge> : <Badge tone="amber">Belum</Badge>}</Td>
              <Td className="text-right"><Button size="sm" variant={s.status === 'GRADED' ? 'secondary' : 'primary'} onClick={() => setGrading(s)}>{s.status === 'GRADED' ? 'Ubah nilai' : 'Nilai'}</Button></Td>
            </tr>
          ))}
        </Table>
      )}

      <Modal open={grading !== null} title="Nilai tugas" onClose={() => setGrading(null)}>
        {grading && (
          <form key={grading.id} onSubmit={submit} className="space-y-3">
            <div className="rounded-xl bg-slate-50 p-4 text-sm">
              <p className="font-medium text-slate-900">{grading.studentName} — {grading.lessonTitle}</p>
              <p className="text-slate-500">{grading.courseTitle}</p>
              {grading.note && <p className="mt-2 text-slate-700">Catatan siswa: {grading.note}</p>}
              <button type="button" onClick={() => download(grading)} className="mt-2 inline-flex items-center gap-1 font-semibold text-brand-700"><Download size={14} /> Unduh {grading.originalFileName}</button>
            </div>
            <Field label="Nilai (0–100)"><Input name="grade" type="number" min={0} max={100} required defaultValue={grading.grade ?? ''} autoFocus /></Field>
            <Field label="Masukan untuk siswa"><Textarea name="feedback" rows={4} maxLength={2000} defaultValue={grading.feedback ?? ''} /></Field>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" onClick={() => setGrading(null)}>Batal</Button>
              <Button type="submit" disabled={busy}>Simpan nilai</Button>
            </div>
          </form>
        )}
      </Modal>
    </Page>
  );
}
