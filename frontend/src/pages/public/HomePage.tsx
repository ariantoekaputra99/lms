import { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Award, ClipboardCheck, PlayCircle, Search } from 'lucide-react';
import { api } from '../../services/api';
import { useLoad } from '../../lib/useLoad';
import { PLATFORM_NAME } from '../../lib/format';
import { CourseCard } from '../../components/CourseCard';
import { Page } from '../../components/Layout';
import { Spinner } from '../../components/ui';

export function HomePage() {
  const navigate = useNavigate();
  const popular = useLoad(() => api.catalog({ sort: 'popular' }));
  const categories = useLoad(() => api.categories());

  const search = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const q = String(new FormData(e.currentTarget).get('q') ?? '').trim();
    navigate(q ? `/courses?q=${encodeURIComponent(q)}` : '/courses');
  };

  return (
    <>
      <section className="bg-gradient-to-br from-brand-700 via-brand-600 to-violet-600 text-white">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-widest text-brand-100">{PLATFORM_NAME}</p>
            <h1 className="mt-3 text-4xl font-extrabold leading-tight sm:text-5xl">Belajar skill baru, kapan saja dan di mana saja.</h1>
            <p className="mt-4 text-lg text-brand-100">Kursus video, materi bacaan, kuis, dan tugas dari instruktur berpengalaman — lengkap dengan sertifikat.</p>
            <form onSubmit={search} className="mt-8 flex max-w-xl gap-2 rounded-2xl bg-white p-2 shadow-xl">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input name="q" placeholder="Mau belajar apa hari ini?" aria-label="Cari kursus"
                  className="w-full rounded-xl py-3 pl-10 pr-3 text-slate-900 outline-none" />
              </div>
              <button className="rounded-xl bg-brand-600 px-5 font-semibold hover:bg-brand-700">Cari</button>
            </form>
          </div>
        </div>
      </section>

      <Page>
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            [PlayCircle, 'Belajar mandiri', 'Video dan materi bisa diakses kapan saja, progres tersimpan otomatis.'],
            [ClipboardCheck, 'Kuis & tugas', 'Uji pemahaman dengan kuis dan dapatkan nilai serta masukan dari instruktur.'],
            [Award, 'Sertifikat', 'Selesaikan semua materi dan dapatkan sertifikat yang bisa diverifikasi.'],
          ].map(([Icon, title, desc]) => {
            const I = Icon as typeof PlayCircle;
            return (
              <div key={title as string} className="flex gap-3 rounded-2xl border border-slate-200 bg-white p-5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600"><I size={20} /></span>
                <div><p className="font-semibold text-slate-900">{title as string}</p><p className="mt-1 text-sm text-slate-500">{desc as string}</p></div>
              </div>
            );
          })}
        </div>

        {(categories.data ?? []).length > 0 && (
          <div className="mt-12">
            <h2 className="text-xl font-bold text-slate-900">Kategori</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {(categories.data ?? []).map((c) => (
                <Link key={c.id} to={`/courses?category=${c.slug}`}
                  className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:border-brand-300 hover:text-brand-700">
                  {c.name} <span className="text-slate-400">({c.courseCount})</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        <div className="mt-12 flex items-end justify-between">
          <h2 className="text-xl font-bold text-slate-900">Kursus populer</h2>
          <Link to="/courses" className="text-sm font-semibold text-brand-600 hover:text-brand-700">Lihat semua →</Link>
        </div>
        {popular.loading && !popular.data ? <Spinner /> : (
          <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {(popular.data ?? []).slice(0, 8).map((c) => <CourseCard key={c.id} course={c} />)}
          </div>
        )}
        {popular.data?.length === 0 && <p className="mt-4 text-sm text-slate-500">Belum ada kursus yang dipublikasikan.</p>}
      </Page>
    </>
  );
}
