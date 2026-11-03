import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, SearchX } from 'lucide-react';
import { api } from '../../services/api';
import { useLoad } from '../../lib/useLoad';
import { levelLabel } from '../../lib/format';
import { CourseCard } from '../../components/CourseCard';
import { Page } from '../../components/Layout';
import { Alert, EmptyState, Input, Select, Spinner } from '../../components/ui';
import type { CourseLevel } from '../../types/api';

export function CatalogPage() {
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const category = params.get('category') ?? '';
  const level = (params.get('level') ?? '') as CourseLevel | '';
  const priceFilter = params.get('price') ?? '';
  const sort = params.get('sort') ?? '';
  const [text, setText] = useState(q);

  useEffect(() => { setText(q); }, [q]);
  // Debounce the free-text search so we don't hit the API on every keystroke.
  useEffect(() => {
    const t = setTimeout(() => { if (text !== q) update('q', text.trim()); }, 350);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  const categories = useLoad(() => api.categories());
  const courses = useLoad(() => api.catalog({ q, category, level, price: priceFilter, sort }), [q, category, level, priceFilter, sort]);

  function update(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value); else next.delete(key);
    setParams(next, { replace: true });
  }

  return (
    <Page>
      <h1 className="text-2xl font-bold text-slate-900">Jelajahi Kursus</h1>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_180px_160px_150px_170px]">
        <div className="relative sm:col-span-2 lg:col-span-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Cari judul kursus..." className="pl-9" aria-label="Cari" />
        </div>
        <Select value={category} onChange={(e) => update('category', e.target.value)} aria-label="Kategori">
          <option value="">Semua kategori</option>
          {(categories.data ?? []).map((c) => <option key={c.id} value={c.slug}>{c.name}</option>)}
        </Select>
        <Select value={level} onChange={(e) => update('level', e.target.value)} aria-label="Level">
          <option value="">Semua level</option>
          {(Object.keys(levelLabel) as CourseLevel[]).map((l) => <option key={l} value={l}>{levelLabel[l]}</option>)}
        </Select>
        <Select value={priceFilter} onChange={(e) => update('price', e.target.value)} aria-label="Harga">
          <option value="">Semua harga</option>
          <option value="free">Gratis</option>
          <option value="paid">Berbayar</option>
        </Select>
        <Select value={sort} onChange={(e) => update('sort', e.target.value)} aria-label="Urutkan">
          <option value="">Terbaru</option>
          <option value="popular">Terpopuler</option>
          <option value="price_asc">Harga terendah</option>
          <option value="price_desc">Harga tertinggi</option>
        </Select>
      </div>

      <div className="mt-6">
        {courses.error && <Alert>{courses.error}</Alert>}
        {courses.loading && !courses.data ? <Spinner /> : (courses.data ?? []).length === 0 ? (
          <EmptyState icon={<SearchX size={22} />} title="Kursus tidak ditemukan" description="Coba kata kunci lain atau hapus beberapa filter." />
        ) : (
          <>
            <p className="mb-3 text-sm text-slate-500">{courses.data?.length} kursus</p>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {(courses.data ?? []).map((c) => <CourseCard key={c.id} course={c} />)}
            </div>
          </>
        )}
      </div>
    </Page>
  );
}
