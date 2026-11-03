import { FormEvent, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { api } from '../../services/api';
import { useLoad } from '../../lib/useLoad';
import { useAuth } from '../../lib/auth';
import { errorMessage, formatDate, formatDateTime, money, num, orderStatusLabel, roleLabel } from '../../lib/format';
import { Page } from '../../components/Layout';
import { Alert, Badge, Button, cx, Field, Input, Modal, PageHeader, Select, Spinner, Stat, Table, Td } from '../../components/ui';
import { useToast } from '../../components/Toast';
import { orderTone } from '../student/MyPages';
import type { Category, Order, OrderStatus, Role } from '../../types/api';

function AdminNav() {
  const cls = ({ isActive }: { isActive: boolean }) =>
    cx('-mb-px whitespace-nowrap border-b-2 px-4 py-2 text-sm font-medium', isActive ? 'border-brand-600 text-brand-700' : 'border-transparent text-slate-500 hover:text-slate-700');
  return (
    <div className="mb-6 flex gap-1 overflow-x-auto border-b border-slate-200">
      <NavLink to="/admin" end className={cls}>Ringkasan</NavLink>
      <NavLink to="/admin/users" className={cls}>Pengguna</NavLink>
      <NavLink to="/admin/orders" className={cls}>Pesanan</NavLink>
      <NavLink to="/admin/categories" className={cls}>Kategori</NavLink>
    </div>
  );
}

function OrdersTable({ orders }: { orders: Order[] }) {
  return (
    <Table headers={['Pesanan', 'Siswa', 'Kursus', 'Tanggal', 'Total', 'Metode', 'Status']} empty={orders.length === 0} emptyText="Belum ada pesanan">
      {orders.map((o) => (
        <tr key={o.id}>
          <Td className="font-mono text-xs">{o.orderCode}</Td>
          <Td><p className="text-slate-900">{o.studentName}</p><p className="text-xs text-slate-500">{o.studentEmail}</p></Td>
          <Td><Link to={`/courses/${o.courseSlug}`} className="hover:text-brand-700">{o.courseTitle}</Link></Td>
          <Td className="whitespace-nowrap text-slate-500">{formatDateTime(o.createdAt)}</Td>
          <Td className="font-semibold">{money(o.amount)}</Td>
          <Td className="text-xs text-slate-500">{o.provider}{o.paymentType ? ` · ${o.paymentType}` : ''}</Td>
          <Td><Badge tone={orderTone[o.status]}>{orderStatusLabel[o.status]}</Badge></Td>
        </tr>
      ))}
    </Table>
  );
}

export function AdminDashboard() {
  const { data, loading, error } = useLoad(() => api.adminStats());
  return (
    <Page>
      <PageHeader title="Admin" />
      <AdminNav />
      {error && <Alert>{error}</Alert>}
      {loading && !data ? <Spinner /> : data && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Pengguna" value={num(data.users)} sub={`${num(data.students)} siswa · ${num(data.instructors)} instruktur`} />
            <Stat label="Kursus" value={num(data.courses)} sub={`${num(data.publishedCourses)} terbit`} />
            <Stat label="Pendaftaran" value={num(data.enrollments)} />
            <Stat label="Pendapatan" value={money(data.revenue)} sub="Total pesanan lunas" />
          </div>
          <div className="mt-8 flex items-end justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Pesanan terbaru</h2>
            <Link to="/admin/orders" className="text-sm font-semibold text-brand-600">Semua pesanan →</Link>
          </div>
          <div className="mt-3"><OrdersTable orders={data.recentOrders} /></div>
        </>
      )}
    </Page>
  );
}

export function AdminUsersPage() {
  const { user: me } = useAuth();
  const toast = useToast();
  const { data, setData, loading, error } = useLoad(() => api.adminUsers());
  const [query, setQuery] = useState('');
  const [role, setRole] = useState<Role | ''>('');
  const rows = (data ?? []).filter((u) => (!role || u.role === role) && `${u.fullName} ${u.email}`.toLowerCase().includes(query.toLowerCase()));

  const update = async (id: number, nextRole: Role, active: boolean) => {
    try {
      const u = await api.adminUpdateUser(id, nextRole, active);
      setData((data ?? []).map((x) => (x.id === id ? u : x)));
      toast.success(`${u.fullName} diperbarui`);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  return (
    <Page>
      <PageHeader title="Admin" />
      <AdminNav />
      <div className="mb-4 flex flex-wrap gap-3">
        <div className="relative w-full max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cari nama atau email" className="pl-9" />
        </div>
        <Select value={role} onChange={(e) => setRole(e.target.value as Role | '')} className="max-w-[220px]">
          <option value="">Semua peran</option>
          {(Object.keys(roleLabel) as Role[]).map((r) => <option key={r} value={r}>{roleLabel[r]}</option>)}
        </Select>
      </div>
      {error && <Alert>{error}</Alert>}
      {loading && !data ? <Spinner /> : (
        <Table headers={['Pengguna', 'Peran', 'Status', 'Bergabung']} empty={rows.length === 0}>
          {rows.map((u) => {
            const self = u.id === me?.id;
            return (
              <tr key={u.id} className={u.active ? '' : 'opacity-60'}>
                <Td><p className="font-medium text-slate-900">{u.fullName}{self && <span className="ml-1 text-xs text-slate-400">(Anda)</span>}</p><p className="text-xs text-slate-500">{u.email}</p></Td>
                <Td>
                  <Select value={u.role} disabled={self} onChange={(e) => update(u.id, e.target.value as Role, u.active)} className="max-w-[160px] py-1.5" aria-label="Peran">
                    {(Object.keys(roleLabel) as Role[]).map((r) => <option key={r} value={r}>{roleLabel[r]}</option>)}
                  </Select>
                </Td>
                <Td>
                  <label className="inline-flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={u.active} disabled={self} onChange={(e) => update(u.id, u.role, e.target.checked)} className="accent-brand-600" />
                    {u.active ? 'Aktif' : 'Nonaktif'}
                  </label>
                </Td>
                <Td className="text-slate-500">{formatDate(u.createdAt)}</Td>
              </tr>
            );
          })}
        </Table>
      )}
    </Page>
  );
}

export function AdminOrdersPage() {
  const { data, loading, error } = useLoad(() => api.adminOrders());
  const [status, setStatus] = useState<OrderStatus | ''>('');
  const rows = (data ?? []).filter((o) => !status || o.status === status);
  const paidTotal = rows.filter((o) => o.status === 'PAID').reduce((s, o) => s + Number(o.amount), 0);
  return (
    <Page>
      <PageHeader title="Admin" />
      <AdminNav />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Select value={status} onChange={(e) => setStatus(e.target.value as OrderStatus | '')} className="max-w-[220px]">
          <option value="">Semua status</option>
          {(Object.keys(orderStatusLabel) as OrderStatus[]).map((s) => <option key={s} value={s}>{orderStatusLabel[s]}</option>)}
        </Select>
        <span className="text-sm text-slate-500">{rows.length} pesanan · lunas {money(paidTotal)}</span>
      </div>
      {error && <Alert>{error}</Alert>}
      {loading && !data ? <Spinner /> : <OrdersTable orders={rows} />}
    </Page>
  );
}

export function AdminCategoriesPage() {
  const toast = useToast();
  const { data, loading, error, reload } = useLoad(() => api.categories());
  const [editing, setEditing] = useState<Category | 'new' | null>(null);
  const [deleting, setDeleting] = useState<Category | null>(null);
  const [busy, setBusy] = useState(false);

  const save = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const name = String(new FormData(e.currentTarget).get('name')).trim();
    setBusy(true);
    try {
      if (editing === 'new') await api.createCategory(name);
      else if (editing) await api.updateCategory(editing.id, name);
      toast.success('Kategori disimpan');
      setEditing(null);
      void reload();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!deleting) return;
    setBusy(true);
    try {
      await api.deleteCategory(deleting.id);
      toast.success('Kategori dihapus');
      setDeleting(null);
      void reload();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Page>
      <PageHeader title="Admin" actions={<Button onClick={() => setEditing('new')}><Plus size={16} /> Tambah kategori</Button>} />
      <AdminNav />
      {error && <Alert>{error}</Alert>}
      {loading && !data ? <Spinner /> : (
        <Table headers={['Nama', 'Slug', 'Kursus terbit', '']} empty={(data ?? []).length === 0}>
          {(data ?? []).map((c) => (
            <tr key={c.id}>
              <Td className="font-medium text-slate-900">{c.name}</Td>
              <Td className="font-mono text-xs text-slate-500">{c.slug}</Td>
              <Td>{c.courseCount}</Td>
              <Td className="whitespace-nowrap text-right">
                <Button variant="ghost" size="sm" onClick={() => setEditing(c)} aria-label="Ubah"><Pencil size={14} /></Button>
                <Button variant="ghost" size="sm" onClick={() => setDeleting(c)} aria-label="Hapus"><Trash2 size={14} className="text-rose-500" /></Button>
              </Td>
            </tr>
          ))}
        </Table>
      )}
      <Modal open={editing !== null} title={editing === 'new' ? 'Tambah kategori' : 'Ubah kategori'} onClose={() => setEditing(null)}>
        <form key={editing === 'new' ? 'new' : editing?.id} onSubmit={save} className="space-y-3">
          <Field label="Nama kategori"><Input name="name" required maxLength={80} autoFocus defaultValue={editing && editing !== 'new' ? editing.name : ''} /></Field>
          <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setEditing(null)}>Batal</Button><Button type="submit" disabled={busy}>Simpan</Button></div>
        </form>
      </Modal>
      <Modal open={deleting !== null} title="Hapus kategori" onClose={() => setDeleting(null)}
        footer={<><Button variant="secondary" onClick={() => setDeleting(null)}>Batal</Button><Button variant="danger" disabled={busy} onClick={remove}>Hapus</Button></>}>
        <p className="text-sm text-slate-700">Hapus kategori <b>{deleting?.name}</b>?</p>
      </Modal>
    </Page>
  );
}
