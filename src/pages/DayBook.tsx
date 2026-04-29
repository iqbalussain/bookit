import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '@/contexts/AppContext';
import { currencySymbols } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type Entry = { id: string; date: string; number: string; kind: string; party: string; amount: number; link: string };

export default function DayBook() {
  const { quotations, invoices, purchaseInvoices, payments, vouchers, settings, getClient } = useApp();
  const today = new Date().toISOString().slice(0, 10);
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const symbol = currencySymbols[settings.currency || 'INR'];

  const rows = useMemo(() => {
    const all: Entry[] = [
      ...quotations.map((q) => ({ id: q.id, date: q.createdAt.slice(0, 10), number: q.number, kind: 'Quotation', party: getClient(q.clientId)?.name || 'Unknown', amount: q.netTotal, link: `/quotations/${q.id}` })),
      ...invoices.map((q) => ({ id: q.id, date: q.createdAt.slice(0, 10), number: q.number, kind: 'Sales Invoice', party: getClient(q.clientId)?.name || 'Unknown', amount: q.netTotal, link: `/invoices/${q.id}` })),
      ...purchaseInvoices.map((q) => ({ id: q.id, date: q.createdAt.slice(0, 10), number: q.number, kind: 'Purchase Bill', party: getClient(q.vendorId)?.name || 'Unknown', amount: q.netTotal, link: `/purchases/${q.id}` })),
      ...payments.map((q) => ({ id: q.id, date: q.date, number: `PAY-${q.id.slice(0, 8)}`, kind: q.invoiceType === 'sales' ? 'Receipt Voucher' : 'Payment Voucher', party: '', amount: q.amount, link: '/payments' })),
      ...vouchers.map((q) => ({ id: q.id, date: q.date, number: q.number, kind: `${q.type} Voucher`, party: q.partyName, amount: q.amount, link: '/vouchers' })),
    ];

    return all
      .filter((e) => e.date >= from && e.date <= to)
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [quotations, invoices, purchaseInvoices, payments, vouchers, from, to, getClient]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Day Book</h1>
      </div>
      <div className="flex gap-2">
        <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="max-w-44" />
        <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="max-w-44" />
      </div>
      <div className="space-y-2">
        {rows.map((row) => (
          <div key={`${row.kind}-${row.id}`} className="rounded border p-3 flex items-center justify-between gap-3">
            <div>
              <p className="font-medium">{row.number} · {row.kind}</p>
              <p className="text-sm text-muted-foreground">{row.date} {row.party ? `· ${row.party}` : ''}</p>
            </div>
            <div className="flex items-center gap-2">
              <p className="font-semibold">{symbol}{row.amount.toLocaleString('en-IN')}</p>
              <Button asChild size="sm" variant="outline"><Link to={row.link}>Open / Edit</Link></Button>
              <Button size="sm" onClick={() => window.print()}>Print</Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
