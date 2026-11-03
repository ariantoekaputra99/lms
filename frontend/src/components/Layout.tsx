import { ReactNode, useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Award, BookOpen, ChevronDown, GraduationCap, LayoutDashboard, LogOut, Menu, Receipt, Settings, Shield, X } from 'lucide-react';
import { useAuth, isInstructor } from '../lib/auth';
import { PLATFORM_NAME, roleLabel } from '../lib/format';
import { cx } from './ui';

const navClass = ({ isActive }: { isActive: boolean }) =>
  cx('rounded-lg px-3 py-2 text-sm font-medium transition', isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900');

export function Layout() {
  const { user, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  const links: Array<{ to: string; label: string; end?: boolean }> = [{ to: '/courses', label: 'Jelajahi Kursus' }];
  if (user) links.push({ to: '/my/courses', label: 'Kursus Saya' });
  if (isInstructor(user)) links.push({ to: '/instructor', label: 'Instruktur' });
  if (user?.role === 'ADMIN') links.push({ to: '/admin', label: 'Admin' });

  const logout = () => { signOut(); navigate('/'); };

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2 font-bold text-slate-900">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white"><GraduationCap size={20} /></span>
            <span className="hidden sm:inline">{PLATFORM_NAME}</span>
          </Link>
          <nav className="ml-4 hidden items-center gap-1 md:flex">
            {links.map((l) => <NavLink key={l.to} to={l.to} end={l.end} className={navClass}>{l.label}</NavLink>)}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            {user ? <UserMenu onLogout={logout} /> : (
              <div className="hidden items-center gap-2 sm:flex">
                <Link to="/login" state={{ from: location.pathname }} className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">Masuk</Link>
                <Link to="/register" className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">Daftar</Link>
              </div>
            )}
            <button className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 md:hidden" onClick={() => setMobileOpen((o) => !o)} aria-label="Menu">
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
        {mobileOpen && (
          <nav className="border-t border-slate-200 bg-white px-4 py-3 md:hidden">
            <div className="flex flex-col gap-1">
              {links.map((l) => <NavLink key={l.to} to={l.to} className={navClass}>{l.label}</NavLink>)}
              {!user && <>
                <NavLink to="/login" className={navClass}>Masuk</NavLink>
                <NavLink to="/register" className={navClass}>Daftar</NavLink>
              </>}
            </div>
          </nav>
        )}
      </header>
      <main className="flex-1"><Outlet /></main>
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-6 text-sm text-slate-500 sm:flex-row sm:px-6">
          <p>© {new Date().getFullYear()} {PLATFORM_NAME}</p>
          <Link to="/verify" className="hover:text-slate-700">Verifikasi sertifikat</Link>
        </div>
      </footer>
    </div>
  );
}

function UserMenu({ onLogout }: { onLogout: () => void }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const location = useLocation();

  useEffect(() => { setOpen(false); }, [location.pathname]);
  useEffect(() => {
    const onClick = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);
  if (!user) return null;
  const initials = user.fullName.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();

  const item = (to: string, icon: ReactNode, label: string) => (
    <Link to={to} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-100">{icon}{label}</Link>
  );

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 hover:bg-slate-100" aria-haspopup="menu" aria-expanded={open}>
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">{initials}</span>
        <span className="hidden max-w-[140px] truncate text-sm font-medium text-slate-700 sm:inline">{user.fullName}</span>
        <ChevronDown size={16} className="text-slate-400" />
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-60 rounded-xl border border-slate-200 bg-white p-2 shadow-lg" role="menu">
          <div className="border-b border-slate-100 px-3 pb-2 pt-1">
            <p className="truncate text-sm font-semibold text-slate-900">{user.fullName}</p>
            <p className="truncate text-xs text-slate-500">{user.email} · {roleLabel[user.role]}</p>
          </div>
          <div className="pt-1">
            {item('/my/courses', <BookOpen size={16} />, 'Kursus Saya')}
            {item('/my/certificates', <Award size={16} />, 'Sertifikat')}
            {item('/my/orders', <Receipt size={16} />, 'Riwayat Pembelian')}
            {isInstructor(user) && item('/instructor', <LayoutDashboard size={16} />, 'Dasbor Instruktur')}
            {user.role === 'ADMIN' && item('/admin', <Shield size={16} />, 'Admin')}
            {item('/account', <Settings size={16} />, 'Pengaturan Akun')}
            <button onClick={onLogout} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-rose-600 hover:bg-rose-50"><LogOut size={16} /> Keluar</button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Container used by most pages. */
export const Page = ({ children, className }: { children: ReactNode; className?: string }) =>
  <div className={cx('mx-auto max-w-7xl px-4 py-8 sm:px-6', className)}>{children}</div>;
