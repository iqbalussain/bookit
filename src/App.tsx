import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppProvider } from "@/contexts/AppContext";
import { AppLayout } from "@/components/layout/AppLayout";
import Dashboard from "./pages/Dashboard";
import QuotationsList from "./pages/QuotationsList";
import QuotationForm from "./pages/QuotationForm";
import InvoicesList from "./pages/InvoicesList";
import InvoiceForm from "./pages/InvoiceForm";
import PurchaseInvoicesList from "./pages/PurchaseInvoicesList";
import PurchaseInvoiceForm from "./pages/PurchaseInvoiceForm";
import ClientsList from "./pages/ClientsList";
import ClientStatement from "./pages/ClientStatement";
import PaymentForm from "./pages/PaymentForm";
import PaymentsReceipts from "./pages/PaymentsReceipts";
import VoucherDashboard from "./pages/VoucherDashboard";
import ExpensesVoucher from "./pages/ExpensesVoucher";
import ContraVoucher from "./pages/ContraVoucher";
import LoanGivenVoucher from "./pages/LoanGivenVoucher";
import LoanReceivedVoucher from "./pages/LoanReceivedVoucher";
import ChartOfAccounts from "./pages/ChartOfAccounts";
import AccountStatement from "./pages/AccountStatement";
import Settings from "./pages/Settings";
import ProfitAndLoss from "./pages/reports/ProfitAndLoss";
import BalanceSheet from "./pages/reports/BalanceSheet";
import TrialBalance from "./pages/reports/TrialBalance";
import AgingReport from "./pages/reports/AgingReport";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AppProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppLayout>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/quotations" element={<QuotationsList />} />
              <Route path="/quotations/new" element={<QuotationForm />} />
              <Route path="/quotations/:id" element={<QuotationForm />} />
              <Route path="/invoices" element={<InvoicesList />} />
              <Route path="/invoices/new" element={<InvoiceForm />} />
              <Route path="/invoices/:id" element={<InvoiceForm />} />
              <Route path="/invoices/:id/payment" element={<PaymentForm />} />
              <Route path="/purchases" element={<PurchaseInvoicesList />} />
              <Route path="/purchases/new" element={<PurchaseInvoiceForm />} />
              <Route path="/purchases/:id" element={<PurchaseInvoiceForm />} />
              <Route path="/payments" element={<PaymentsReceipts />} />
              <Route path="/vouchers" element={<VoucherDashboard />} />
              <Route path="/vouchers/expenses/new" element={<ExpensesVoucher />} />
              <Route path="/vouchers/contra/new" element={<ContraVoucher />} />
              <Route path="/vouchers/loan-given/new" element={<LoanGivenVoucher />} />
              <Route path="/vouchers/loan-received/new" element={<LoanReceivedVoucher />} />
              <Route path="/clients" element={<ClientsList />} />
              <Route path="/clients/:id/statement" element={<ClientStatement />} />
              <Route path="/accounts" element={<ChartOfAccounts />} />
              <Route path="/accounts/:id/statement" element={<AccountStatement />} />
              <Route path="/reports/pnl" element={<ProfitAndLoss />} />
              <Route path="/reports/balance-sheet" element={<BalanceSheet />} />
              <Route path="/reports/trial-balance" element={<TrialBalance />} />
              <Route path="/reports/aging" element={<AgingReport />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AppLayout>
        </BrowserRouter>
      </TooltipProvider>
    </AppProvider>
  </QueryClientProvider>
);

export default App;
