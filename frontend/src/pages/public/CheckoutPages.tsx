import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Clock, CreditCard, XCircle } from 'lucide-react';
import { api } from '../../services/api';
import { useLoad } from '../../lib/useLoad';
import { errorMessage, formatDateTime, money, orderStatusLabel } from '../../lib/format';
import { Page } from '../../components/Layout';
import { Alert, Button, Card, Spinner } from '../../components/ui';
import { useToast } from '../../components/Toast';
import type { Order } from '../../types/api';

/** Development payment page used when no Midtrans key is configured. */
export function SimulatePaymentPage() {
  const { code = '' } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { data, loading, error, setData } = useLoad(() => api.order(code), [code]);
  const [busy, setBusy] = useState(false);

  const act = async (pay: boolean) => {
    setBusy(true);
    try {
      const o = await api.simulatePayment(code, pay);
      setData(o);
      if (o.status === 'PAID') {
        toast.success('Pembayaran berhasil. Selamat belajar!');
        navigate(`/learn/${o.courseId}`);
      }
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  if (loading && !data) return <Spinner className="py-24" />;
  if (error || !data) return <Page className="max-w-lg"><Alert>{error || 'Pesanan tidak ditemukan'}</Alert></Page>;

  return (
    <Page className="max-w-lg">
      <Card className="p-6">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 text-brand-600"><CreditCard size={20} /></span>
          <div>
            <h1 className="text-lg font-bold text-slate-900">Pembayaran</h1>
            <p className="text-xs text-slate-500">{data.orderCode}</p>
          </div>
        </div>
        <div className="mt-5"><Alert tone="warn">Mode simulasi: tidak ada uang yang ditagih. Atur <code>MIDTRANS_SERVER_KEY</code> di server untuk pembayaran sungguhan.</Alert></div>
        <OrderSummary order={data} />
        {data.status === 'PENDING' ? (
          <div className="mt-6 grid grid-cols-2 gap-2">
            <Button variant="secondary" disabled={busy} onClick={() => act(false)}>Batalkan</Button>
            <Button variant="success" disabled={busy} onClick={() => act(true)}>Bayar {money(data.amount)}</Button>
          </div>
        ) : <OrderResult order={data} />}
      </Card>
    </Page>
  );
}

/** Return page after Midtrans Snap (?order_id=...). Polls while the payment is still pending. */
export function CheckoutFinishPage() {
  const [params] = useSearchParams();
  const code = params.get('order_id') ?? '';
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!code) { setError('Kode pesanan tidak ditemukan'); return; }
    let stop = false;
    let tries = 0;
    const poll = async () => {
      try {
        const o = await api.order(code);
        if (stop) return;
        setOrder(o);
        if (o.status === 'PENDING' && tries++ < 20) setTimeout(poll, 3000);
      } catch (err) {
        if (!stop) setError(errorMessage(err));
      }
    };
    void poll();
    return () => { stop = true; };
  }, [code]);

  return (
    <Page className="max-w-lg">
      <Card className="p-6">
        <h1 className="text-lg font-bold text-slate-900">Status Pembayaran</h1>
        {error && <div className="mt-4"><Alert>{error}</Alert></div>}
        {!order && !error && <Spinner />}
        {order && <><OrderSummary order={order} /><OrderResult order={order} /></>}
      </Card>
    </Page>
  );
}

function OrderSummary({ order }: { order: Order }) {
  return (
    <dl className="mt-5 space-y-2 rounded-xl bg-slate-50 p-4 text-sm">
      <div className="flex justify-between gap-4"><dt className="text-slate-500">Kursus</dt><dd className="text-right font-medium text-slate-900">{order.courseTitle}</dd></div>
      <div className="flex justify-between gap-4"><dt className="text-slate-500">Tanggal</dt><dd className="text-slate-700">{formatDateTime(order.createdAt)}</dd></div>
      <div className="flex justify-between gap-4 border-t border-slate-200 pt-2"><dt className="font-semibold text-slate-900">Total</dt><dd className="font-bold text-slate-900">{money(order.amount)}</dd></div>
    </dl>
  );
}

function OrderResult({ order }: { order: Order }) {
  if (order.status === 'PAID') {
    return (
      <div className="mt-6 text-center">
        <CheckCircle2 className="mx-auto text-emerald-600" size={40} />
        <p className="mt-2 font-semibold text-slate-900">Pembayaran berhasil</p>
        <Link to={`/learn/${order.courseId}`} className="mt-4 inline-block rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-700">Mulai belajar</Link>
      </div>
    );
  }
  if (order.status === 'PENDING') {
    return (
      <div className="mt-6 text-center">
        <Clock className="mx-auto text-amber-500" size={40} />
        <p className="mt-2 font-semibold text-slate-900">Menunggu pembayaran</p>
        <p className="mt-1 text-sm text-slate-500">Halaman ini akan diperbarui otomatis setelah pembayaran diterima.</p>
        {order.redirectUrl && order.provider === 'MIDTRANS' && (
          <a href={order.redirectUrl} className="mt-4 inline-block rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-700">Lanjutkan pembayaran</a>
        )}
      </div>
    );
  }
  return (
    <div className="mt-6 text-center">
      <XCircle className="mx-auto text-rose-500" size={40} />
      <p className="mt-2 font-semibold text-slate-900">{orderStatusLabel[order.status]}</p>
      <Link to={`/courses/${order.courseSlug}`} className="mt-4 inline-block text-sm font-semibold text-brand-600">Kembali ke halaman kursus</Link>
    </div>
  );
}
