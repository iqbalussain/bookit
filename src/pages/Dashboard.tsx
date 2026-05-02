import { useMemo } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { currencySymbols } from '@/types';
import {
  Bell,
  ShieldCheck,
  CircleDollarSign,
  Sparkles,
} from 'lucide-react';
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import LocalInstallationSetup from '@/components/LocalInstallationSetup';

function addDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

export default function Dashboard() {
  const {
    invoices = [],
    purchaseInvoices = [],
    payments = [],
    settings,
    getCustomers,
    getRecentAuditLog,
  } = useApp();

  const currencySymbol = currencySymbols[settings.currency];
  const today = new Date();

  // ✅ SAFE FORMAT
  const formatCurrency = (value: number = 0) => {
    try {
      return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: settings.currency,
        maximumFractionDigits: 2,
      }).format(value || 0);
    } catch {
      return `${currencySymbol}${(value || 0).toFixed(2)}`;
    }
  };

  // ✅ ALL CALCULATIONS MEMOIZED
  const {
    revenue,
    receivableAmount,
    overdueInvoices,
    dueSoonInvoices,
    trendData,
    customerInsights,
    paymentBehavior,
  } = useMemo(() => {
    const safeInvoices = invoices.map((inv) => ({
      ...inv,
      netTotal: Number(inv.netTotal) || 0,
      items: Array.isArray(inv.items) ? inv.items : [],
      createdAt: inv.createdAt || new Date().toISOString(),
    }));

    const paid = safeInvoices.filter((i) => i.status === 'paid');
    const outstanding = safeInvoices.filter((i) => i.status !== 'paid');

    const overdue = outstanding.filter((i) => {
      if (!i.dueDate) return false;
      return new Date(i.dueDate) < today;
    });

    const dueSoon = outstanding.filter((i) => {
      if (!i.dueDate) return false;
      const due = new Date(i.dueDate);
      return due >= today && due <= addDays(today, 7);
    });

    const revenueVal = paid.reduce((sum, i) => sum + i.netTotal, 0);
    const receivableVal = outstanding.reduce((sum, i) => sum + i.netTotal, 0);

    // ✅ TREND FIXED
    const trend = Array.from({ length: 6 }).map((_, index) => {
      const date = addDays(today, -((5 - index) * 6));

      const value = safeInvoices.reduce((sum, inv) => {
        if (new Date(inv.createdAt) <= date) {
          return sum + inv.netTotal;
        }
        return sum;
      }, 0);

      return {
        day: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        value,
      };
    });

    // ✅ CUSTOMER INSIGHTS SAFE
    const customers = getCustomers();

    const insights = customers
      .map((c) => {
        const owed = safeInvoices
          .filter((i) => i.clientId === c.id && i.status !== 'paid')
          .reduce((sum, i) => sum + i.netTotal, 0);

        return {
          name: c.name,
          owed,
        };
      })
      .filter((c) => c.owed > 0)
      .slice(0, 4);

    // ✅ PAYMENT BEHAVIOR SAFE
    const behavior = customers.map((c) => {
      const paidInvoices = safeInvoices.filter(
        (i) => i.clientId === c.id && i.status === 'paid'
      );

      const relatedPayments = payments.filter((p) =>
        paidInvoices.some((i) => i.id === p.invoiceId)
      );

      const avg =
        relatedPayments.length === 0
          ? 0
          : relatedPayments.reduce((sum, p) => {
              const inv = paidInvoices.find((i) => i.id === p.invoiceId);
              if (!inv) return sum;

              const diff =
                new Date(p.date).getTime() -
                new Date(inv.createdAt).getTime();

              return sum + diff / (1000 * 60 * 60 * 24);
            }, 0) / relatedPayments.length;

      return {
        name: c.name,
        averageDays: Math.round(avg || 0),
      };
    });

    return {
      revenue: revenueVal,
      receivableAmount: receivableVal,
      overdueInvoices: overdue,
      dueSoonInvoices: dueSoon,
      trendData: trend,
      customerInsights: insights,
      paymentBehavior: behavior,
    };
  }, [invoices, payments, getCustomers]);

  const auditEntries = getRecentAuditLog(5);

  return (
    <div className="space-y-6">
      <LocalInstallationSetup />

      {/* HEADER */}
      <div className="p-6 rounded-2xl border">
        <h1 className="text-2xl font-semibold">
          Welcome back {settings.name || ''}
        </h1>
        <p className="text-sm text-muted-foreground">
          Your business overview
        </p>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <p>Revenue</p>
            <h2>{formatCurrency(revenue)}</h2>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p>Outstanding</p>
            <h2>{formatCurrency(receivableAmount)}</h2>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p>Overdue</p>
            <h2>{overdueInvoices.length}</h2>
          </CardContent>
        </Card>
      </div>

      {/* CHART */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue Trend</CardTitle>
        </CardHeader>
        <CardContent className="h-72">
          {trendData.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <Tooltip />
                <Area type="monotone" dataKey="value" stroke="#3b82f6" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <p>No data</p>
          )}
        </CardContent>
      </Card>

      {/* ALERTS */}
      <Card>
        <CardHeader>
          <CardTitle>Alerts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>Due Soon: {dueSoonInvoices.length}</div>
          <div>Overdue: {overdueInvoices.length}</div>
        </CardContent>
      </Card>

      {/* CUSTOMERS */}
      <Card>
        <CardHeader>
          <CardTitle>Top Customers</CardTitle>
        </CardHeader>
        <CardContent>
          {customerInsights.map((c) => (
            <div key={c.name} className="flex justify-between">
              <span>{c.name}</span>
              <span>{formatCurrency(c.owed)}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* ACTIVITY */}
      <Card>
        <CardHeader>
          <CardTitle>Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {auditEntries.map((a) => (
            <div key={a.id}>{a.action}</div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}