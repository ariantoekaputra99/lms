import { FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Award, BadgeCheck, Download, ShieldX } from 'lucide-react';
import { api } from '../../services/api';
import { useLoad } from '../../lib/useLoad';
import { formatDate } from '../../lib/format';
import { Page } from '../../components/Layout';
import { Button, Card, EmptyState, Input, Spinner } from '../../components/ui';

export function VerifyPage() {
  const navigate = useNavigate();
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const code = String(new FormData(e.currentTarget).get('code') ?? '').trim().toUpperCase();
    if (code) navigate(`/certificates/${encodeURIComponent(code)}`);
  };
  return (
    <Page className="max-w-xl">
      <Card className="p-8 text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-600"><Award /></span>
        <h1 className="mt-4 text-2xl font-bold text-slate-900">Verifikasi Sertifikat</h1>
        <p className="mt-1 text-sm text-slate-500">Masukkan kode yang tertera pada sertifikat.</p>
        <form onSubmit={submit} className="mt-6 flex gap-2">
          <Input name="code" placeholder="Contoh: AB12CD34" required className="font-mono uppercase" aria-label="Kode sertifikat" />
          <Button type="submit">Periksa</Button>
        </form>
      </Card>
    </Page>
  );
}

export function CertificatePage() {
  const { code = '' } = useParams();
  const { data, loading, error } = useLoad(() => api.verifyCertificate(code), [code]);

  if (loading && !data) return <Spinner className="py-24" />;
  if (error || !data) {
    return (
      <Page className="max-w-xl">
        <EmptyState icon={<ShieldX size={22} />} title="Sertifikat tidak ditemukan"
          description={`Kode "${code}" tidak terdaftar. Periksa kembali penulisan kodenya.`}
          action={<Link to="/verify" className="font-semibold text-brand-600">Coba kode lain</Link>} />
      </Page>
    );
  }

  return (
    <Page className="max-w-2xl">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-2 bg-emerald-50 px-6 py-3 text-sm font-medium text-emerald-700">
          <BadgeCheck size={18} /> Sertifikat ini valid dan diterbitkan oleh platform kami
        </div>
        <div className="p-8 text-center">
          <p className="text-sm uppercase tracking-widest text-slate-400">Sertifikat Penyelesaian</p>
          <p className="mt-4 text-3xl font-bold text-slate-900">{data.studentName}</p>
          <p className="mt-2 text-slate-500">telah menyelesaikan kursus</p>
          <Link to={`/courses/${data.courseSlug}`} className="mt-2 block text-xl font-semibold text-brand-700 hover:underline">{data.courseTitle}</Link>
          <div className="mt-6 grid gap-4 text-sm sm:grid-cols-3">
            <div><p className="text-slate-400">Instruktur</p><p className="font-medium text-slate-800">{data.instructorName}</p></div>
            <div><p className="text-slate-400">Tanggal terbit</p><p className="font-medium text-slate-800">{formatDate(data.issuedAt)}</p></div>
            <div><p className="text-slate-400">Kode</p><p className="font-mono font-medium text-slate-800">{data.code}</p></div>
          </div>
          <a href={api.certificatePdfUrl(data.code)} target="_blank" rel="noopener noreferrer"
            className="mt-8 inline-flex items-center gap-2 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-700">
            <Download size={16} /> Unduh PDF
          </a>
        </div>
      </div>
    </Page>
  );
}
