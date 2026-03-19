import { Link } from 'react-router-dom';
import { useApp } from '@/contexts/AppContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { currencySymbols } from '@/types';
import {
  FileText, Receipt, Clock, TrendingUp, TrendingDown, Plus, ArrowRight, ChevronRight, ShoppingCart,
} from 'lucide-react';

export default function Dashboard() {
  const { quotations, invoices, purchaseInvoices, clients, payments, settings, getClient } = useApp();
  const currencySymbol = currencySymbols[settings.currency];

  const totalQuotations = quotations.length;
  const totalInvoices = invoices.length;
  const pendingPayments = invoices.filter((i) => i.status === 'sent' || i.status === 'partial').length;
  const pendingAmount = invoices
    .filter((i) => i.status === 'sent' || i.status === 'partial')
    .reduce((sum, i) => sum + i.netTotal, 0);

  const totalPayable = purchaseInvoices
    .filter((p) => p.status !== 'paid')
    .reduce((sum, p) => sum + p.netTotal, 0);

  const recentDocuments = [
    ...quotations.map((q) => ({ ...q, type: 'quotation' as const })),
    ...invoices.map((i) => ({ ...i, type: 'invoice' as const })),
  ]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5);

  const getStatusDot = (status: string) => {
    const colors: Record<string, string> = {
      draft: 'bg-muted-foreground', sent: 'bg-primary', approved: 'bg-success',
      rejected: 'bg-destructive', paid: 'bg-success', partial: 'bg-warning',
      overdue: 'bg-destructive', converted: 'bg-primary', cancelled: 'bg-muted-foreground',
    };
    return <span className={`inline-block h-2 w-2 rounded-full ${colors[status] || 'bg-muted-foreground'}`} />;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Welcome{settings.name ? `, ${settings.name}` : ''}!</p>
        </div>
        <div className="hidden lg:flex gap-2">
          <Button asChild size="sm"><Link to="/quotations/new"><Plus className="mr-1.5 h-4 w-4" />New Quote</Link></Button>
          <Button asChild variant="outline" size="sm"><Link to="/invoices/new"><Plus className="mr-1.5 h-4 w-4" />New Invoice</Link></Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
        <Card className="p-3">
          <div className="flex items-center justify-between mb-1"><span className="text-xs font-medium text-muted-foreground">Quotations</span><FileText className="h-4 w-4 text-muted-foreground" /></div>
          <div className="text-xl font-bold">{totalQuotations}</div>
          <p className="text-[10px] text-muted-foreground">{quotations.filter((q) => q.status === 'approved').length} approved</p>
        </Card>
        <Card className="p-3">
          <div className="flex items-center justify-between mb-1"><span className="text-xs font-medium text-muted-foreground">Sales Invoices</span><Receipt className="h-4 w-4 text-muted-foreground" /></div>
          <div className="text-xl font-bold">{totalInvoices}</div>
          <p className="text-[10px] text-muted-foreground">{invoices.filter((i) => i.status === 'paid').length} paid</p>
        </Card>
        <Card className="p-3">
          <div className="flex items-center justify-between mb-1"><span className="text-xs font-medium text-muted-foreground">Receivable</span><TrendingUp className="h-4 w-4 text-muted-foreground" /></div>
          <div className="text-lg font-bold truncate">{currencySymbol}{pendingAmount.toLocaleString('en-IN')}</div>
          <p className="text-[10px] text-muted-foreground">{pendingPayments} outstanding</p>
        </Card>
        <Card className="p-3">
          <div className="flex items-center justify-between mb-1"><span className="text-xs font-medium text-muted-foreground">Payable</span><TrendingDown className="h-4 w-4 text-muted-foreground" /></div>
          <div className="text-lg font-bold truncate">{currencySymbol}{totalPayable.toLocaleString('en-IN')}</div>
          <p className="text-[10px] text-muted-foreground">{purchaseInvoices.filter((p) => p.status !== 'paid').length} bills</p>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between py-3 px-3 sm:px-4">
          <CardTitle className="text-base">Recent Activity</CardTitle>
          <div className="hidden sm:flex gap-2">
            <Button variant="ghost" size="sm" asChild className="h-7 text-xs"><Link to="/quotations">Quotes <ArrowRight className="ml-1 h-3 w-3" /></Link></Button>
            <Button variant="ghost" size="sm" asChild className="h-7 text-xs"><Link to="/invoices">Invoices <ArrowRight className="ml-1 h-3 w-3" /></Link></Button>
          </div>
        </CardHeader>
        <CardContent className="px-3 pb-3 sm:px-4 sm:pb-4">
          {recentDocuments.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-sm text-muted-foreground">No documents yet.</p>
              <p className="text-xs text-muted-foreground mt-1">Create your first quotation or invoice to get started.</p>
            </div>
          ) : (
            <div className="space-y-1">
              {recentDocuments.map((doc) => {
                const client = getClient(doc.clientId);
                return (
                  <Link key={`${doc.type}-${doc.id}`} to={`/${doc.type}s/${doc.id}`} className="flex items-center justify-between p-2 rounded-lg hover:bg-accent transition-colors group">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      {doc.type === 'quotation' ? <FileText className="h-4 w-4 text-primary shrink-0" /> : <Receipt className="h-4 w-4 text-primary shrink-0" />}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2"><p className="text-sm font-medium truncate">{doc.number}</p>{getStatusDot(doc.status)}</div>
                        <p className="text-xs text-muted-foreground truncate">{client?.name || 'Unknown'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-sm font-medium">{currencySymbol}{doc.netTotal.toLocaleString('en-IN')}</span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity hidden sm:block" />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {clients.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-6">
            <p className="text-sm text-muted-foreground mb-3">Start by adding your first client</p>
            <Button asChild size="sm"><Link to="/clients"><Plus className="mr-1.5 h-4 w-4" />Add Client</Link></Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
