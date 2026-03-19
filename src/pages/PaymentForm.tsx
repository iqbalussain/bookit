import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '@/contexts/AppContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { currencySymbols, type Payment, type PaymentMethod } from '@/types';
import { ArrowLeft, Save, CreditCard, Banknote, Building2, Globe, Smartphone } from 'lucide-react';

export default function PaymentForm() {
  const { id: invoiceId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { getInvoice, getClient, payments, addPayment, updateInvoice, settings, createJournalEntry } = useApp();

  const invoice = invoiceId ? getInvoice(invoiceId) : undefined;
  const client = invoice ? getClient(invoice.clientId) : undefined;
  const currencySymbol = currencySymbols[settings.currency];

  const existingPayments = useMemo(
    () => (invoice ? payments.filter((p) => p.invoiceId === invoice.id) : []),
    [invoice, payments]
  );

  const totalPaid = existingPayments.reduce((s, p) => s + p.amount, 0);
  const remaining = (invoice?.netTotal || 0) - totalPaid;

  const [amount, setAmount] = useState(remaining > 0 ? remaining : 0);
  const [method, setMethod] = useState<PaymentMethod>('bank');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');

  if (!invoice) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-sm text-muted-foreground">Invoice not found</p>
        <Button variant="outline" size="sm" className="mt-3" onClick={() => navigate('/invoices')}>Back to Invoices</Button>
      </div>
    );
  }

  const handleSave = () => {
    if (amount <= 0) { toast({ title: 'Error', description: 'Amount must be greater than 0', variant: 'destructive' }); return; }
    if (amount > remaining) { toast({ title: 'Error', description: 'Amount cannot exceed balance', variant: 'destructive' }); return; }

    const now = new Date().toISOString();
    const payment: Payment = {
      id: crypto.randomUUID(), invoiceId: invoice.id, invoiceType: 'sales',
      amount, date, method, reference, notes, createdAt: now,
    };

    addPayment(payment);

    // Determine payment account
    const paymentAccountId = method === 'cash' ? 'acc-1000' : 'acc-1010';

    // Journal: Debit Cash/Bank, Credit A/R
    createJournalEntry({
      id: crypto.randomUUID(), date, reference: `REC-${invoice.number}`,
      referenceType: 'receipt', referenceId: payment.id,
      description: `Receipt against ${invoice.number}`,
      lines: [
        { accountId: paymentAccountId, debit: amount, credit: 0 },
        { accountId: 'acc-1100', debit: 0, credit: amount },
      ],
      createdAt: now,
    });

    const newTotalPaid = totalPaid + amount;
    if (newTotalPaid >= invoice.netTotal) {
      updateInvoice({ ...invoice, status: 'paid', updatedAt: now });
    } else if (newTotalPaid > 0) {
      updateInvoice({ ...invoice, status: 'partial', updatedAt: now });
    }

    toast({ title: 'Payment recorded', description: `${currencySymbol}${amount.toLocaleString('en-IN')} payment recorded.` });
    navigate(`/invoices/${invoice.id}`);
  };

  const methodIcons: Record<PaymentMethod, React.ReactNode> = {
    cash: <Banknote className="h-4 w-4" />,
    bank: <Building2 className="h-4 w-4" />,
    card: <CreditCard className="h-4 w-4" />,
    cheque: <CreditCard className="h-4 w-4" />,
    online: <Globe className="h-4 w-4" />,
  };

  return (
    <div className="space-y-3 pb-20 lg:pb-4 max-w-lg mx-auto">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/invoices/${invoice.id}`)} className="h-8 w-8 shrink-0"><ArrowLeft className="h-4 w-4" /></Button>
        <div className="min-w-0">
          <h1 className="text-lg font-bold tracking-tight truncate">Record Payment</h1>
          <p className="text-xs text-muted-foreground truncate">{invoice.number} • {client?.name || 'Unknown Client'}</p>
        </div>
      </div>

      <Card>
        <CardContent className="p-3">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div><p className="text-[10px] text-muted-foreground uppercase">Total</p><p className="text-sm font-bold">{currencySymbol}{invoice.netTotal.toLocaleString('en-IN')}</p></div>
            <div><p className="text-[10px] text-muted-foreground uppercase">Paid</p><p className="text-sm font-bold text-success">{currencySymbol}{totalPaid.toLocaleString('en-IN')}</p></div>
            <div><p className="text-[10px] text-muted-foreground uppercase">Balance</p><p className={`text-sm font-bold ${remaining > 0 ? 'text-destructive' : 'text-success'}`}>{currencySymbol}{remaining.toLocaleString('en-IN')}</p></div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="py-2.5 px-3"><CardTitle className="text-sm">Payment Details</CardTitle></CardHeader>
        <CardContent className="px-3 pb-3 space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Amount ({currencySymbol}) *</Label>
            <div className="flex gap-2">
              <Input type="number" min="0" max={remaining} step="0.01" value={amount} onChange={(e) => setAmount(Number(e.target.value) || 0)} className="h-9 flex-1" />
              {remaining > 0 && amount !== remaining && (
                <Button type="button" variant="outline" size="sm" className="h-9 text-xs shrink-0" onClick={() => setAmount(remaining)}>
                  Full ({currencySymbol}{remaining.toLocaleString('en-IN')})
                </Button>
              )}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Payment Method</Label>
            <Select value={method} onValueChange={(v) => setMethod(v as PaymentMethod)}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="cash"><span className="flex items-center gap-2">{methodIcons.cash} Cash</span></SelectItem>
                <SelectItem value="bank"><span className="flex items-center gap-2">{methodIcons.bank} Bank Transfer</span></SelectItem>
                <SelectItem value="card"><span className="flex items-center gap-2">{methodIcons.card} Card</span></SelectItem>
                <SelectItem value="cheque"><span className="flex items-center gap-2">{methodIcons.cheque} Cheque</span></SelectItem>
                <SelectItem value="online"><span className="flex items-center gap-2">{methodIcons.online} Online</span></SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Reference / Cheque No.</Label>
            <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Reference number" className="h-9" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Payment Date</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-9" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Payment notes..." rows={2} className="resize-none text-sm" />
          </div>
        </CardContent>
      </Card>

      {existingPayments.length > 0 && (
        <Card>
          <CardHeader className="py-2.5 px-3"><CardTitle className="text-sm">Previous Payments</CardTitle></CardHeader>
          <CardContent className="px-3 pb-3">
            <div className="space-y-1.5">
              {existingPayments.map((p) => (
                <div key={p.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                  <div><p className="text-xs font-medium capitalize">{p.method}</p><p className="text-[10px] text-muted-foreground">{new Date(p.date).toLocaleDateString()}</p></div>
                  <p className="text-xs font-semibold text-success">{currencySymbol}{p.amount.toLocaleString('en-IN')}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="fixed bottom-16 lg:bottom-0 left-0 right-0 lg:relative p-3 lg:p-0 bg-background border-t lg:border-0 z-30">
        <Button onClick={handleSave} className="w-full h-10" disabled={remaining <= 0}>
          <Save className="mr-1.5 h-4 w-4" />Record Payment
        </Button>
      </div>
    </div>
  );
}
