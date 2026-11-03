import { FormEvent, ReactNode, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { GraduationCap } from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../lib/auth';
import { errorMessage, PLATFORM_NAME } from '../../lib/format';
import { Alert, Button, Field, Input } from '../../components/ui';

function AuthShell({ title, subtitle, children }: { title: string; subtitle: ReactNode; children: ReactNode }) {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-600 text-white"><GraduationCap /></span>
          <h1 className="mt-4 text-2xl font-bold text-slate-900">{title}</h1>
          <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
        </div>
        {children}
      </div>
    </div>
  );
}

/** Only allow in-app redirects after login (prevents open redirects via ?from=). */
const safeFrom = (from: unknown) => (typeof from === 'string' && from.startsWith('/') && !from.startsWith('//') ? from : '/my/courses');

export function LoginPage() {
  const { user, signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = safeFrom((location.state as { from?: string } | null)?.from);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={from} replace />;

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setError('');
    try {
      signIn(await api.login(String(f.get('email')).trim(), String(f.get('password'))));
      navigate(from, { replace: true });
    } catch (err) {
      setError(errorMessage(err, 'Login gagal'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell title="Masuk" subtitle={<>Belum punya akun? <Link to="/register" state={location.state} className="font-semibold text-brand-600">Daftar</Link></>}>
      {error && <div className="mb-4"><Alert>{error}</Alert></div>}
      <form onSubmit={submit} className="space-y-4">
        <Field label="Email"><Input name="email" type="email" autoComplete="email" required autoFocus /></Field>
        <Field label="Password"><Input name="password" type="password" autoComplete="current-password" required /></Field>
        <Button type="submit" size="lg" className="w-full" disabled={busy}>{busy ? 'Memproses...' : 'Masuk'}</Button>
      </form>
    </AuthShell>
  );
}

export function RegisterPage() {
  const { user, signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [instructor, setInstructor] = useState(false);

  if (user) return <Navigate to="/my/courses" replace />;

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    if (f.get('password') !== f.get('confirm')) { setError('Konfirmasi password tidak sama'); return; }
    setBusy(true);
    setError('');
    try {
      const res = await api.register(String(f.get('fullName')).trim(), String(f.get('email')).trim(), String(f.get('password')), instructor);
      signIn(res);
      navigate(res.user.role === 'INSTRUCTOR' ? '/instructor' : safeFrom((location.state as { from?: string } | null)?.from), { replace: true });
    } catch (err) {
      setError(errorMessage(err, 'Pendaftaran gagal'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell title={`Daftar di ${PLATFORM_NAME}`} subtitle={<>Sudah punya akun? <Link to="/login" state={location.state} className="font-semibold text-brand-600">Masuk</Link></>}>
      {error && <div className="mb-4"><Alert>{error}</Alert></div>}
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1 text-sm font-medium">
          {[false, true].map((v) => (
            <button key={String(v)} type="button" onClick={() => setInstructor(v)}
              className={`rounded-lg py-2 ${instructor === v ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-600'}`}>
              {v ? 'Saya ingin mengajar' : 'Saya ingin belajar'}
            </button>
          ))}
        </div>
        <Field label="Nama lengkap"><Input name="fullName" autoComplete="name" required maxLength={120} autoFocus /></Field>
        <Field label="Email"><Input name="email" type="email" autoComplete="email" required maxLength={160} /></Field>
        <Field label="Password" hint="Minimal 8 karakter"><Input name="password" type="password" autoComplete="new-password" required minLength={8} maxLength={72} /></Field>
        <Field label="Ulangi password"><Input name="confirm" type="password" autoComplete="new-password" required minLength={8} maxLength={72} /></Field>
        <Button type="submit" size="lg" className="w-full" disabled={busy}>{busy ? 'Memproses...' : 'Buat akun'}</Button>
      </form>
    </AuthShell>
  );
}
