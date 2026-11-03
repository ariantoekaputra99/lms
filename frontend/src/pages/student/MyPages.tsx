import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { Award, BookOpen, Download, Receipt } from 'lucide-react';
import { api } from '../../services/api';
import { useLoad } from '../../lib/useLoad';
import { useAuth } from '../../lib/auth';
import { errorMessage, formatDate, formatDateTime, money, orderStatusLabel, roleLabel } from '../../lib/format';
import { Thumbnail } from '../../components/CourseCard';
import { Page } from '../../components/Layout';
import { Alert, Badge, Button, Card, EmptyState, Field, Input, PageHeader, ProgressBar, Spinner, Table, Td, Textarea } from '../../components/ui';
import { useToast } from '../../components/Toast';
import type { OrderStatus } from '../../types/api';

export function MyCoursesPage() {
  const { data, loading, error } = useLoad(() => api.myCourses());
  const [tab, setTab] = useState<'active' | 'done'>('active');
  const list = (data ?? []).filter((c) => (tab === 'done' ? c.completedAt : !c.completedAt));

  return (
    <Page>
      <PageHeader title="Kursus Saya" />
      <div className="mb-5 flex gap-1 border-b border-slate-200">
        {([['active', 'Sedang dipelajari'], ['done', 'Selesai']] as const).map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium ${tab === k ? 'border-brand-600 text-brand-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
            {label} ({(data ?? []).filter((c) => (k === 'done' ? c.completedAt : !c.completedAt)).length})
          </button>
        ))}
      </div>
      {error && <Alert>{error}</Alert>}
      {loading && !data ? <Spinner /> : list.length === 0 ? (
        <EmptyState icon={<BookOpen size={22} />} title={tab === 'done' ? 'Belum ada kursus yang selesai' : 'Belum ada kursus yang diikuti'}
          description="Temukan kursus yang sesuai dengan tujuan belajar Anda."
          action={<Link to="/courses" className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-700">Jelajahi kursus</Link>} />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((m) => (
            <div key={m.course.id} className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <Link to={`/learn/${m.course.id}`}><Thumbnail course={m.course} /></Link>
              <div className="flex flex-1 flex-col p-4">
                <Link to={`/learn/${m.course.id}`} className="line-clamp-2 font-semibold text-slate-900 hover:text-brand-700">{m.course.title}</Link>
                <p className="mt-1 text-sm text-slate-500">{m.course.instructorName}</p>
                <div className="mt-auto pt-4">
                  <ProgressBar value={m.progressPercent} />
                  <p className="mt-1.5 text-xs text-slate-500">{m.completedLessons}/{m.totalLessons} materi · {m.progressPercent}%</p>
                  <div className="mt-3 flex gap-2">
                    <Link to={`/learn/${m.course.id}`} className="flex-1 rounded-lg bg-brand-600 px-3 py-2 text-center text-sm font-medium text-white hover:bg-brand-700">
                      {m.progressPercent === 0 ? 'Mulai belajar' : m.completedAt ? 'Ulas materi' : 'Lanjutkan'}
                    </Link>
                    {m.certificateCode && (
                      <Link to={`/certificates/${m.certificateCode}`} className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-700" title="Sertifikat"><Award size={18} /></Link>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Page>
  );
}

export function MyCertificatesPage() {
  const { data, loading, error } = useLoad(() => api.myCertificates());
  return (
    <Page>
      <PageHeader title="Sertifikat Saya" description="Sertifikat bisa dibagikan dan diverifikasi siapa pun melalui tautannya." />
      {error && <Alert>{error}</Alert>}
      {loading && !data ? <Spinner /> : (data ?? []).length === 0 ? (
        <EmptyState icon={<Award size={22} />} title="Belum ada sertifikat" description="Selesaikan semua materi sebuah kursus untuk mendapatkan sertifikat." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {(data ?? []).map((c) => (
            <Card key={c.code} className="flex items-start gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600"><Award /></span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-slate-900">{c.courseTitle}</p>
                <p className="text-sm text-slate-500">Terbit {formatDate(c.issuedAt)} · <span className="font-mono">{c.code}</span></p>
                <div className="mt-3 flex flex-wrap gap-3 text-sm font-semibold">
                  <Link to={`/certificates/${c.code}`} className="text-brand-600 hover:text-brand-700">Lihat</Link>
                  <a href={api.certificatePdfUrl(c.code)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-brand-600 hover:text-brand-700"><Download size={14} /> PDF</a>
                  <button className="text-slate-500 hover:text-slate-700"
                    onClick={() => navigator.clipboard?.writeText(`${window.location.origin}/certificates/${c.code}`)}>Salin tautan</button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </Page>
  );
}

export const orderTone: Record<OrderStatus, 'green' | 'amber' | 'red' | 'slate'> = {
  PAID: 'green', PENDING: 'amber', FAILED: 'red', EXPIRED: 'slate', CANCELLED: 'slate',
};

export function MyOrdersPage() {
  const { data, loading, error } = useLoad(() => api.myOrders());
  return (
    <Page>
      <PageHeader title="Riwayat Pembelian" />
      {error && <Alert>{error}</Alert>}
      {loading && !data ? <Spinner /> : (data ?? []).length === 0 ? (
        <EmptyState icon={<Receipt size={22} />} title="Belum ada pembelian" />
      ) : (
        <Table headers={['Pesanan', 'Kursus', 'Tanggal', 'Total', 'Status', '']}>
          {(data ?? []).map((o) => (
            <tr key={o.id}>
              <Td className="font-mono text-xs">{o.orderCode}</Td>
              <Td><Link to={`/courses/${o.courseSlug}`} className="font-medium text-slate-900 hover:text-brand-700">{o.courseTitle}</Link></Td>
              <Td className="whitespace-nowrap text-slate-500">{formatDateTime(o.createdAt)}</Td>
              <Td className="font-semibold">{money(o.amount)}</Td>
              <Td><Badge tone={orderTone[o.status]}>{orderStatusLabel[o.status]}</Badge></Td>
              <Td className="text-right">
                {o.status === 'PAID' && <Link to={`/learn/${o.courseId}`} className="text-sm font-semibold text-brand-600">Belajar</Link>}
                {o.status === 'PENDING' && o.redirectUrl && (
                  o.provider === 'SIMULATOR'
                    ? <Link to={`/checkout/simulate/${o.orderCode}`} className="text-sm font-semibold text-brand-600">Bayar</Link>
                    : <a href={o.redirectUrl} className="text-sm font-semibold text-brand-600">Bayar</a>
                )}
              </Td>
            </tr>
          ))}
        </Table>
      )}
    </Page>
  );
}

export function AccountPage() {
  const { user, setUser } = useAuth();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  if (!user) return null;

  const saveProfile = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    try {
      setUser(await api.updateProfile({
        fullName: String(f.get('fullName')).trim(),
        headline: String(f.get('headline') ?? '').trim() || null,
        bio: String(f.get('bio') ?? '').trim() || null,
      }));
      toast.success('Profil disimpan');
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const changePassword = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    if (f.get('newPassword') !== f.get('confirm')) { toast.error('Konfirmasi password tidak sama'); return; }
    setBusy(true);
    try {
      await api.changePassword(String(f.get('currentPassword')), String(f.get('newPassword')));
      toast.success('Password diganti');
      form.reset();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Page className="max-w-4xl">
      <PageHeader title="Pengaturan Akun" description={`${user.email} · ${roleLabel[user.role]}`} />
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <h2 className="font-semibold text-slate-900">Profil</h2>
          <form onSubmit={saveProfile} className="mt-4 space-y-3">
            <Field label="Nama lengkap"><Input name="fullName" required maxLength={120} defaultValue={user.fullName} /></Field>
            <Field label="Headline" hint="Tampil di halaman kursus jika Anda instruktur, mis. 'Senior Developer'">
              <Input name="headline" maxLength={160} defaultValue={user.headline ?? ''} />
            </Field>
            <Field label="Bio"><Textarea name="bio" rows={4} maxLength={2000} defaultValue={user.bio ?? ''} /></Field>
            <Button type="submit" disabled={busy}>Simpan profil</Button>
          </form>
        </Card>
        <Card className="h-fit">
          <h2 className="font-semibold text-slate-900">Ganti Password</h2>
          <form onSubmit={changePassword} className="mt-4 space-y-3">
            <Field label="Password lama"><Input name="currentPassword" type="password" autoComplete="current-password" required /></Field>
            <Field label="Password baru" hint="Minimal 8 karakter"><Input name="newPassword" type="password" autoComplete="new-password" minLength={8} maxLength={72} required /></Field>
            <Field label="Ulangi password baru"><Input name="confirm" type="password" autoComplete="new-password" minLength={8} maxLength={72} required /></Field>
            <Button type="submit" disabled={busy}>Simpan password</Button>
          </form>
        </Card>
      </div>
    </Page>
  );
}
