import { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useApp } from '@/contexts/AppContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import {
  currencySymbols,
  type Client,
  type DiscountType,
  type Invoice,
  type InvoiceStatus,
  type InvoiceType,
  type LineItem,
  type Project,
  type ProjectInvoiceSummary,
} from '@/types';
import { Plus, Trash2, Save, ArrowLeft, Send, Download, Share2, CreditCard, AlertTriangle } from 'lucide-react';
import { generatePDF, shareViaWhatsApp } from '@/lib/documentUtils';
import { ItemPicker } from '@/components/ItemPicker';
import { safeRandomUUID } from '@/lib/uuid';
import { useDelayedMissingRedirect } from '@/hooks/useDelayedMissingRedirect';

const formatPercent = (value: number) => `${value.toFixed(2).replace(/\.00$/, '')}%`;
const roundMoney = (value: number) => Math.round((Number(value) || 0) * 100) / 100;

const createNormalItem = (): LineItem => ({
  id: safeRandomUUID(),
  name: '',
  description: '',
  quantity: 1,
  rate: 0,
  total: 0,
});

const createProjectItem = (): LineItem => ({
  id: safeRandomUUID(),
  name: 'Project Activity',
  description: '',
  quantity: 1,
  rate: 0,
  total: 0,
  percentage: 0,
});

export default function InvoiceForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const {
    invoices, addInvoice, updateInvoice,
    quotations, updateQuotation,
    clients, addClient, getClient, settings,
    generateInvoiceNumber,
    postSalesInvoice, repostSalesInvoice, adjustItemStock, calculateInvoicePaymentStatus,
    salesmen, addSalesman,
    projects, addProject, updateProject, getProject,
  } = useApp();

  const isEditing = id && id !== 'new';
  const existingInvoice = isEditing ? invoices.find((i) => i.id === id) : null;
  const fromQuotationId = searchParams.get('fromQuotation');
  const sourceQuotation = fromQuotationId ? quotations.find((q) => q.id === fromQuotationId) : null;
  const currencySymbol = currencySymbols[settings.currency];

  const defaultDueDate = new Date();
  defaultDueDate.setDate(defaultDueDate.getDate() + 30);

  const [clientId, setClientId] = useState(existingInvoice?.clientId || sourceQuotation?.clientId || '');
  const [salesmanId, setSalesmanId] = useState<string>(existingInvoice?.salesmanId || sourceQuotation?.salesmanId || '');
  const [dueDate, setDueDate] = useState(existingInvoice?.dueDate || defaultDueDate.toISOString().split('T')[0]);
  const [notes, setNotes] = useState(existingInvoice?.notes || sourceQuotation?.notes || '');
  const [terms, setTerms] = useState(existingInvoice?.terms || sourceQuotation?.terms || 'Payment terms: Net 30 days');
  const [invoiceType, setInvoiceType] = useState<InvoiceType>(existingInvoice?.invoiceType || 'normal');
  const [discountType, setDiscountType] = useState<DiscountType>(existingInvoice?.discountType || 'percentage');
  const [discountValue, setDiscountValue] = useState(existingInvoice?.discountValue || 0);
  const [projectId, setProjectId] = useState(existingInvoice?.projectId || '');
  const [lpoNumber, setLpoNumber] = useState(existingInvoice?.lpoNumber || '');
  const [projectTotalValue, setProjectTotalValue] = useState(existingInvoice?.projectTotalValue || 0);
  const [items, setItems] = useState<LineItem[]>(
    existingInvoice?.items?.length
      ? existingInvoice.items
      : sourceQuotation?.items?.length
        ? sourceQuotation.items
        : [createNormalItem()]
  );

  const [isAddClientOpen, setIsAddClientOpen] = useState(false);
  const [newClient, setNewClient] = useState({ name: '', email: '', phone: '', address: '' });
  const [isAddSalesmanOpen, setIsAddSalesmanOpen] = useState(false);
  const [newSalesman, setNewSalesman] = useState({ name: '', phone: '' });
  const [isAddProjectOpen, setIsAddProjectOpen] = useState(false);
  const [newProject, setNewProject] = useState({ name: '', totalValue: '', lpoNumber: '' });

  const selectedProject = getProject(projectId);

  useEffect(() => {
    if (!selectedProject || isEditing) return;
    setProjectTotalValue(Number(selectedProject.totalValue) || 0);
    setLpoNumber(selectedProject.lpoNumber || '');
  }, [isEditing, selectedProject]);

  const normalSubtotal = useMemo(() => items.reduce((sum, item) => sum + (Number(item.total) || 0), 0), [items]);
  const vatTotal = useMemo(() => items.reduce((sum, item) => sum + (Number(item.vatAmount) || 0), 0), [items]);
  const discountAmount = useMemo(() => {
    if (invoiceType !== 'normal') return 0;
    const safeValue = Math.max(0, Number(discountValue) || 0);
    return discountType === 'percentage'
      ? Math.min(normalSubtotal, (normalSubtotal * safeValue) / 100)
      : Math.min(normalSubtotal, safeValue);
  }, [discountType, discountValue, invoiceType, normalSubtotal]);
  const normalGrandTotal = Math.max(0, normalSubtotal - discountAmount + vatTotal);

  const currentProjectPercentage = useMemo(
    () => items.reduce((sum, item) => sum + (Number(item.percentage) || 0), 0),
    [items]
  );
  const projectInvoiceAmount = useMemo(
    () => items.reduce((sum, item) => sum + (Number(item.total) || 0), 0),
    [items]
  );
  const previousProjectInvoices = useMemo(
    () => invoices.filter((invoice) =>
      invoice.projectId === projectId &&
      invoice.id !== existingInvoice?.id &&
      invoice.status !== 'cancelled'
    ),
    [existingInvoice?.id, invoices, projectId]
  );
  const previousProjectPercentage = previousProjectInvoices.reduce((sum, invoice) => sum + (Number(invoice.totalPercentage) || 0), 0);
  const previousProjectAmount = previousProjectInvoices.reduce((sum, invoice) => sum + (Number(invoice.netTotal) || 0), 0);
  const remainingBeforeCurrent = Math.max(0, 100 - previousProjectPercentage);
  const totalProjectPercentage = previousProjectPercentage + currentProjectPercentage;
  const totalProjectAmount = previousProjectAmount + projectInvoiceAmount;
  const remainingProjectPercentage = Math.max(0, 100 - totalProjectPercentage);
  const effectiveProjectTotalValue = Number(projectTotalValue) || Number(selectedProject?.totalValue) || 0;
  const remainingProjectAmount = Math.max(0, effectiveProjectTotalValue - totalProjectAmount);
  const isProjectOverLimit = invoiceType === 'project' && totalProjectPercentage > 100.0001;
  const isProjectNearLimit = invoiceType === 'project' && totalProjectPercentage >= 90 && !isProjectOverLimit;
  const netTotal = invoiceType === 'project' ? projectInvoiceAmount : normalGrandTotal;

  const projectSummary: ProjectInvoiceSummary | undefined = invoiceType === 'project'
    ? {
      projectTotalValue: effectiveProjectTotalValue,
      previousPercentage: previousProjectPercentage,
      previousAmount: previousProjectAmount,
      currentPercentage: currentProjectPercentage,
      currentAmount: projectInvoiceAmount,
      totalInvoicedPercentage: totalProjectPercentage,
      totalInvoicedAmount: totalProjectAmount,
      remainingPercentage: remainingProjectPercentage,
      remainingAmount: remainingProjectAmount,
    }
    : undefined;

  const displayedStatus: InvoiceStatus | 'draft' = existingInvoice ? calculateInvoicePaymentStatus(existingInvoice.id) : 'draft';
  const currentStatus: InvoiceStatus = existingInvoice?.status === 'draft'
    ? 'draft'
    : existingInvoice?.status === 'cancelled'
      ? 'cancelled'
      : displayedStatus;

  const handleInvoiceTypeChange = (value: InvoiceType) => {
    setInvoiceType(value);
    setItems(value === 'project' ? [createProjectItem()] : [createNormalItem()]);
  };

  const updateNormalItem = (index: number, field: keyof LineItem, value: string | number) => {
    setItems((prev) => {
      const updated = [...prev];
      const item = { ...updated[index] };
      if (field === 'quantity' || field === 'rate') {
        item[field] = Number(value) || 0;
        item.total = roundMoney(item.quantity * item.rate);
        item.vatAmount = item.vatApplicable ? roundMoney((item.total * (item.vatPercentage ?? 0)) / 100) : 0;
      } else {
        (item as any)[field] = value;
      }
      updated[index] = item;
      return updated;
    });
  };

  const updateProjectItem = (index: number, field: 'description' | 'percentage' | 'total', value: string | number) => {
    setItems((prev) => {
      const updated = [...prev];
      const item = { ...updated[index] };
      if (field === 'percentage') {
        item.percentage = Number(value) || 0;
        item.total = roundMoney((effectiveProjectTotalValue * item.percentage) / 100);
        item.rate = item.total;
      } else if (field === 'total') {
        item.total = Number(value) || 0;
        item.rate = item.total;
        item.percentage = effectiveProjectTotalValue > 0 ? roundMoney((item.total / effectiveProjectTotalValue) * 100) : 0;
      } else {
        item.description = String(value);
        item.name = String(value).split('\n')[0] || 'Project Activity';
      }
      updated[index] = item;
      return updated;
    });
  };

  const selectItemForRow = (index: number, picked: { id: string; name: string; description?: string; rate: number; vatApplicable: boolean; vatPercentage: number; }) => {
    setItems((prev) => {
      const updated = [...prev];
      const cur = updated[index];
      const qty = cur.quantity || 1;
      const rate = picked.rate;
      const total = roundMoney(qty * rate);
      const vatAmount = picked.vatApplicable ? roundMoney((total * picked.vatPercentage) / 100) : 0;
      updated[index] = {
        ...cur,
        itemId: picked.id,
        name: picked.name,
        description: picked.description ?? cur.description,
        rate,
        total,
        vatApplicable: picked.vatApplicable,
        vatPercentage: picked.vatPercentage,
        vatAmount,
      };
      return updated;
    });
  };

  const addLineItem = () => setItems((prev) => [...prev, invoiceType === 'project' ? createProjectItem() : createNormalItem()]);

  const removeItem = (index: number) => {
    if (items.length === 1) {
      toast({ title: 'Cannot remove', description: 'At least one line is required.', variant: 'destructive' });
      return;
    }
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddClient = () => {
    if (!newClient.name.trim()) {
      toast({ title: 'Error', description: 'Client name is required', variant: 'destructive' });
      return;
    }
    const client: Client = { id: safeRandomUUID(), ...newClient, type: 'customer', createdAt: new Date().toISOString() };
    addClient(client);
    setClientId(client.id);
    setIsAddClientOpen(false);
    setNewClient({ name: '', email: '', phone: '', address: '' });
    toast({ title: 'Client added', description: `${client.name} has been added.` });
  };

  const handleAddProject = () => {
    if (!newProject.name.trim() || !Number(newProject.totalValue)) {
      toast({ title: 'Project details required', description: 'Enter project name and total value.', variant: 'destructive' });
      return;
    }
    const now = new Date().toISOString();
    const project: Project = {
      id: safeRandomUUID(),
      name: newProject.name,
      totalValue: Number(newProject.totalValue) || 0,
      lpoNumber: newProject.lpoNumber,
      totalInvoicedAmount: 0,
      totalInvoicedPercentage: 0,
      remainingAmount: Number(newProject.totalValue) || 0,
      remainingPercentage: 100,
      linkedInvoiceIds: [],
      createdAt: now,
      updatedAt: now,
    };
    addProject(project);
    setProjectId(project.id);
    setProjectTotalValue(project.totalValue);
    setLpoNumber(project.lpoNumber);
    setIsAddProjectOpen(false);
    setNewProject({ name: '', totalValue: '', lpoNumber: '' });
  };

  const validateInvoice = () => {
    if (!clientId) return 'Please select a client';
    if (!salesmanId) return 'Please select a salesman';
    if (invoiceType === 'project') {
      if (!projectId) return 'Please select a project';
      if (!effectiveProjectTotalValue) return 'Project total value is required';
      if (items.some((item) => !item.description.trim())) return 'All project activities need a description';
      if (currentProjectPercentage <= 0 || projectInvoiceAmount <= 0) return 'Project invoice percentage or amount must be greater than zero';
      if (isProjectOverLimit) return `This invoice exceeds the remaining project percentage of ${formatPercent(remainingBeforeCurrent)}`;
      return null;
    }
    if (items.some((item) => !item.name.trim())) return 'All items must have a name';
    return null;
  };

  const buildInvoicePayload = (now: string, base?: Invoice): Invoice => ({
    ...(base || {}),
    id: base?.id || safeRandomUUID(),
    number: base?.number || generateInvoiceNumber(),
    clientId,
    quotationId: sourceQuotation?.id || base?.quotationId,
    invoiceType,
    projectId: invoiceType === 'project' ? projectId : undefined,
    projectName: invoiceType === 'project' ? selectedProject?.name : undefined,
    lpoNumber: invoiceType === 'project' ? lpoNumber : undefined,
    projectTotalValue: invoiceType === 'project' ? effectiveProjectTotalValue : undefined,
    totalPercentage: invoiceType === 'project' ? currentProjectPercentage : undefined,
    discountType: invoiceType === 'normal' ? discountType : undefined,
    discountValue: invoiceType === 'normal' ? Number(discountValue) || 0 : undefined,
    discountAmount: invoiceType === 'normal' ? discountAmount : undefined,
    subtotal: invoiceType === 'normal' ? normalSubtotal : projectInvoiceAmount,
    vatTotal: invoiceType === 'normal' ? vatTotal : 0,
    projectSummary,
    items,
    netTotal: roundMoney(netTotal),
    status: base?.status || 'draft',
    dueDate,
    notes,
    terms,
    salesmanId,
    createdAt: base?.createdAt || now,
    updatedAt: now,
  } as Invoice);

  const handleSave = () => {
    const validationMessage = validateInvoice();
    if (validationMessage) {
      toast({ title: 'Error', description: validationMessage, variant: 'destructive' });
      return;
    }

    const now = new Date().toISOString();

    if (invoiceType === 'project' && selectedProject) {
      updateProject({ ...selectedProject, totalValue: effectiveProjectTotalValue, lpoNumber, updatedAt: now });
    }

    if (isEditing && existingInvoice) {
      const updated = buildInvoicePayload(now, existingInvoice);
      try {
        updateInvoice(updated);
        repostSalesInvoice(existingInvoice, updated);
      } catch (err) {
        updateInvoice(existingInvoice);
        toast({ title: 'Invoice update failed', description: err instanceof Error ? err.message : String(err), variant: 'destructive' });
        return;
      }

      toast({ title: 'Invoice updated', description: `${existingInvoice.number} has been updated.` });
    } else {
      const newInvoice = buildInvoicePayload(now);
      addInvoice(newInvoice);

      if (invoiceType === 'normal') {
        items.forEach((li) => { if (li.itemId) adjustItemStock(li.itemId, -li.quantity); });
      }

      if (sourceQuotation) {
        updateQuotation({ ...sourceQuotation, status: 'converted', convertedInvoiceId: newInvoice.id, updatedAt: now });
      }

      try {
        postSalesInvoice(newInvoice);
      } catch (err) {
        console.error('[InvoiceForm] Journal entry failed:', err);
        toast({ title: 'Journal entry failed', description: err instanceof Error ? err.message : String(err), variant: 'destructive' });
      }

      toast({ title: 'Invoice created', description: `${newInvoice.number} has been created.` });
      navigate(`/invoices/${newInvoice.id}`);
    }
  };

  const handleMarkAsSent = () => {
    if (!existingInvoice) return;
    const now = new Date().toISOString();
    updateInvoice({ ...existingInvoice, status: 'sent', updatedAt: now });
    toast({ title: 'Invoice sent', description: `${existingInvoice.number} marked as sent.` });
  };

  const handleDownloadPDF = async () => {
    if (!existingInvoice) return;
    const client = getClient(clientId);
    try {
      await generatePDF({ type: 'invoice', document: existingInvoice, client, settings });
      toast({ title: 'PDF downloaded successfully' });
    } catch (err) {
      toast({ title: 'PDF generation failed', description: err instanceof Error ? err.message : String(err), variant: 'destructive' });
    }
  };

  const handleShare = () => {
    if (!existingInvoice) return;
    const client = getClient(clientId);
    shareViaWhatsApp({ type: 'invoice', document: existingInvoice, client, settings });
  };

  useDelayedMissingRedirect(Boolean(isEditing), Boolean(existingInvoice), '/invoices');

  const statusColors: Record<InvoiceStatus, string> = {
    draft: 'bg-muted text-muted-foreground',
    sent: 'bg-primary/10 text-primary',
    paid: 'bg-success/10 text-success',
    partial: 'bg-warning/10 text-warning',
    overdue: 'bg-destructive/10 text-destructive',
    cancelled: 'bg-muted text-muted-foreground',
  };

  return (
    <div className="space-y-3 pb-24 lg:pb-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Button variant="ghost" size="icon" onClick={() => navigate('/invoices')} className="h-8 w-8 shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <h1 className="text-lg font-bold tracking-tight truncate">
              {isEditing ? existingInvoice?.number : 'New Invoice'}
            </h1>
            <p className="text-xs text-muted-foreground hidden sm:block truncate">
              {invoiceType === 'project' ? 'Project wise billing' : sourceQuotation ? `From ${sourceQuotation.number}` : 'Normal invoice'}
            </p>
          </div>
          {isEditing && (
            <Badge variant="outline" className={`${statusColors[currentStatus]} text-xs ml-1`}>
              {currentStatus}
            </Badge>
          )}
        </div>
        {isEditing && (
          <div className="flex gap-1.5 shrink-0">
            {(currentStatus === 'partial' || (existingInvoice?.status === 'sent' && currentStatus !== 'paid')) && (
              <Button variant="outline" size="sm" onClick={() => navigate(`/invoices/${id}/payment`)} className="h-8 px-2">
                <CreditCard className="h-4 w-4" />
                <span className="hidden sm:inline ml-1.5">Payment</span>
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={handleDownloadPDF} className="h-8 px-2">
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline ml-1.5">PDF</span>
            </Button>
            <Button variant="outline" size="sm" onClick={handleShare} className="h-8 px-2">
              <Share2 className="h-4 w-4" />
              <span className="hidden sm:inline ml-1.5">Share</span>
            </Button>
          </div>
        )}
      </div>

      <Card>
        <CardHeader className="py-2.5 px-3"><CardTitle className="text-sm">Client & Details</CardTitle></CardHeader>
        <CardContent className="px-3 pb-3 space-y-3">
          <div className="grid gap-3 sm:grid-cols-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Invoice Type</Label>
              <Select value={invoiceType} onValueChange={(value) => handleInvoiceTypeChange(value as InvoiceType)} disabled={Boolean(isEditing)}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normal Invoice</SelectItem>
                  <SelectItem value="project">Project Wise Invoice</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Client *</Label>
              <div className="flex gap-1.5">
                <Select value={clientId} onValueChange={setClientId}>
                  <SelectTrigger className="flex-1 h-9"><SelectValue placeholder="Select client" /></SelectTrigger>
                  <SelectContent>{clients.map((client) => <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>)}</SelectContent>
                </Select>
                <Button type="button" variant="outline" size="icon" className="h-9 w-9 shrink-0" onClick={() => setIsAddClientOpen(true)}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Due Date</Label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="h-9" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Salesman *</Label>
              <div className="flex gap-1.5">
                <Select value={salesmanId} onValueChange={setSalesmanId}>
                  <SelectTrigger className="flex-1 h-9"><SelectValue placeholder="Select salesman" /></SelectTrigger>
                  <SelectContent>{salesmen.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                </Select>
                <Button type="button" variant="outline" size="icon" className="h-9 w-9 shrink-0" onClick={() => setIsAddSalesmanOpen(true)}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {invoiceType === 'project' && (
            <div className="grid gap-3 sm:grid-cols-3 pt-2 border-t">
              <div className="space-y-1.5">
                <Label className="text-xs">Project *</Label>
                <div className="flex gap-1.5">
                  <Select value={projectId} onValueChange={setProjectId}>
                    <SelectTrigger className="flex-1 h-9"><SelectValue placeholder="Select project" /></SelectTrigger>
                    <SelectContent>{projects.map((project) => <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>)}</SelectContent>
                  </Select>
                  <Button type="button" variant="outline" size="icon" className="h-9 w-9 shrink-0" onClick={() => setIsAddProjectOpen(true)}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">LPO Number</Label>
                <Input value={lpoNumber} onChange={(e) => setLpoNumber(e.target.value)} className="h-9" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Project Total Value</Label>
                <Input type="number" min="0" step="0.01" value={projectTotalValue} onChange={(e) => setProjectTotalValue(Number(e.target.value) || 0)} className="h-9 text-right" />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {invoiceType === 'project' && (
        <Card>
          <CardContent className="p-3 space-y-3">
            <div className="grid gap-2 sm:grid-cols-4">
              <div className="rounded-md border p-2"><p className="text-xs text-muted-foreground">Previously Invoiced</p><p className="text-sm font-semibold">{formatPercent(previousProjectPercentage)} / {currencySymbol}{previousProjectAmount.toLocaleString('en-IN')}</p></div>
              <div className="rounded-md border p-2"><p className="text-xs text-muted-foreground">Remaining Before Current</p><p className="text-sm font-semibold">{formatPercent(remainingBeforeCurrent)}</p></div>
              <div className="rounded-md border p-2"><p className="text-xs text-muted-foreground">Current Invoice</p><p className="text-sm font-semibold">{formatPercent(currentProjectPercentage)} / {currencySymbol}{projectInvoiceAmount.toLocaleString('en-IN')}</p></div>
              <div className="rounded-md border p-2"><p className="text-xs text-muted-foreground">After Save</p><p className="text-sm font-semibold">{formatPercent(totalProjectPercentage)} complete</p></div>
            </div>
            <Progress value={Math.min(100, totalProjectPercentage)} />
            {(isProjectOverLimit || isProjectNearLimit) && (
              <Alert variant={isProjectOverLimit ? 'destructive' : 'default'}>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {isProjectOverLimit
                    ? `This exceeds the project limit. Remaining before this invoice is ${formatPercent(remainingBeforeCurrent)}.`
                    : 'This project is near full billing. Please confirm the final invoice values.'}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between py-2.5 px-3">
          <CardTitle className="text-sm">{invoiceType === 'project' ? 'Project Invoice Activities' : 'Items'}</CardTitle>
          <Button type="button" variant="outline" size="sm" onClick={addLineItem} className="h-7 text-xs">
            <Plus className="mr-1 h-3.5 w-3.5" />Add
          </Button>
        </CardHeader>
        <CardContent className="px-3 pb-3">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-xs text-muted-foreground">
                  <th className="text-left py-2 w-10">Sl.</th>
                  <th className="text-left py-2 min-w-[220px]">{invoiceType === 'project' ? 'Description of Activities' : 'Description'}</th>
                  {invoiceType === 'project' ? (
                    <>
                      <th className="text-right py-2 w-36">Payment %</th>
                      <th className="text-right py-2 w-36">Amount</th>
                    </>
                  ) : (
                    <>
                      <th className="text-right py-2 w-20">Qty</th>
                      <th className="text-right py-2 w-24">Rate</th>
                      <th className="text-right py-2 w-28">Amount</th>
                    </>
                  )}
                  <th className="w-8"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <tr key={item.id} className="border-b last:border-0">
                    <td className="py-2 text-muted-foreground">{index + 1}</td>
                    <td className="py-2">
                      {invoiceType === 'project' ? (
                        <Textarea value={item.description} onChange={(e) => updateProjectItem(index, 'description', e.target.value)} rows={2} className="text-sm" />
                      ) : (
                        <div className="space-y-1">
                          <ItemPicker value={item.itemId} fallbackName={item.name} onSelect={(it) => selectItemForRow(index, it)} />
                          <Textarea value={item.description} onChange={(e) => updateNormalItem(index, 'description', e.target.value)} placeholder="Description" rows={2} className="text-sm" />
                        </div>
                      )}
                    </td>
                    {invoiceType === 'project' ? (
                      <>
                        <td className="py-2"><Input type="number" min="0" max="100" step="0.01" value={item.percentage ?? 0} onChange={(e) => updateProjectItem(index, 'percentage', e.target.value)} className="h-8 text-right" /></td>
                        <td className="py-2"><Input type="number" min="0" step="0.01" value={item.total} onChange={(e) => updateProjectItem(index, 'total', e.target.value)} className="h-8 text-right" /></td>
                      </>
                    ) : (
                      <>
                        <td className="py-2"><Input type="number" min="1" value={item.quantity} onChange={(e) => updateNormalItem(index, 'quantity', e.target.value)} className="h-8 text-right" /></td>
                        <td className="py-2"><Input type="number" min="0" step="0.01" value={item.rate} onChange={(e) => updateNormalItem(index, 'rate', e.target.value)} className="h-8 text-right" /></td>
                        <td className="py-2 text-right font-medium">{currencySymbol}{(item.total + (item.vatApplicable ? (item.vatAmount ?? 0) : 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      </>
                    )}
                    <td className="py-2"><Button type="button" variant="ghost" size="icon" onClick={() => removeItem(index)} className="h-7 w-7"><Trash2 className="h-3.5 w-3.5" /></Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-3 flex justify-end">
            <div className="w-full sm:w-80 rounded-lg bg-primary/10 p-2.5 space-y-1">
              {invoiceType === 'normal' ? (
                <>
                  <div className="flex items-center justify-between text-xs"><span className="text-muted-foreground">Subtotal</span><span>{currencySymbol}{normalSubtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
                  <div className="grid grid-cols-[1fr_90px_100px] gap-2 items-center text-xs">
                    <span className="text-muted-foreground">Discount</span>
                    <Select value={discountType} onValueChange={(value) => setDiscountType(value as DiscountType)}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="percentage">%</SelectItem><SelectItem value="fixed">Fixed</SelectItem></SelectContent>
                    </Select>
                    <Input type="number" min="0" step="0.01" value={discountValue} onChange={(e) => setDiscountValue(Number(e.target.value) || 0)} className="h-8 text-right" />
                  </div>
                  <div className="flex items-center justify-between text-xs"><span className="text-muted-foreground">Discount Amount</span><span>-{currencySymbol}{discountAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
                  <div className="flex items-center justify-between text-xs"><span className="text-muted-foreground">VAT</span><span>{currencySymbol}{vatTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between text-xs"><span className="text-muted-foreground">Current Invoice %</span><span>{formatPercent(currentProjectPercentage)}</span></div>
                  <div className="flex items-center justify-between text-xs"><span className="text-muted-foreground">Total Invoiced %</span><span>{formatPercent(totalProjectPercentage)}</span></div>
                  <div className="flex items-center justify-between text-xs"><span className="text-muted-foreground">Remaining</span><span>{formatPercent(remainingProjectPercentage)}</span></div>
                </>
              )}
              <div className="flex items-center justify-between text-sm font-bold pt-1 border-t"><span>Grand Total</span><span>{currencySymbol}{netTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
            </div>
          </div>
        </CardContent>
      </Card>

      {invoiceType === 'project' && projectSummary && (
        <Card>
          <CardHeader className="py-2.5 px-3"><CardTitle className="text-sm">Project Summary</CardTitle></CardHeader>
          <CardContent className="px-3 pb-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4 text-sm">
            <div className="rounded-md border p-2"><p className="text-xs text-muted-foreground">Project Total Value</p><p className="font-semibold">{currencySymbol}{projectSummary.projectTotalValue.toLocaleString('en-IN')}</p></div>
            <div className="rounded-md border p-2"><p className="text-xs text-muted-foreground">Previously Invoiced</p><p className="font-semibold">{formatPercent(projectSummary.previousPercentage)} / {currencySymbol}{projectSummary.previousAmount.toLocaleString('en-IN')}</p></div>
            <div className="rounded-md border p-2"><p className="text-xs text-muted-foreground">Current Invoice</p><p className="font-semibold">{formatPercent(projectSummary.currentPercentage)} / {currencySymbol}{projectSummary.currentAmount.toLocaleString('en-IN')}</p></div>
            <div className="rounded-md border p-2"><p className="text-xs text-muted-foreground">Remaining</p><p className="font-semibold">{formatPercent(projectSummary.remainingPercentage)} / {currencySymbol}{projectSummary.remainingAmount.toLocaleString('en-IN')}</p></div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="py-2.5 px-3"><CardTitle className="text-sm">Notes & Terms</CardTitle></CardHeader>
        <CardContent className="px-3 pb-3 space-y-3">
          <div className="space-y-1.5"><Label htmlFor="notes" className="text-xs">Notes</Label><Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes for client..." rows={2} className="resize-none text-sm" /></div>
          <div className="space-y-1.5"><Label htmlFor="terms" className="text-xs">Terms & Conditions</Label><Textarea id="terms" value={terms} onChange={(e) => setTerms(e.target.value)} placeholder="Payment terms..." rows={2} className="resize-none text-sm" /></div>
        </CardContent>
      </Card>

      <div className="fixed bottom-16 lg:bottom-0 left-0 right-0 lg:relative p-3 lg:p-0 bg-background border-t lg:border-0 z-30">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row gap-2 sm:justify-between lg:max-w-none">
          <div className="flex gap-2">
            {currentStatus === 'draft' && isEditing && (
              <Button onClick={handleMarkAsSent} size="sm" className="flex-1 sm:flex-none h-9">
                <Send className="mr-1.5 h-4 w-4" />Mark as Sent
              </Button>
            )}
            {(currentStatus === 'partial' || (existingInvoice?.status === 'sent' && currentStatus !== 'paid')) && isEditing && (
              <Button onClick={() => navigate(`/invoices/${id}/payment`)} size="sm" className="flex-1 sm:flex-none h-9">
                <CreditCard className="mr-1.5 h-4 w-4" />Record Payment
              </Button>
            )}
          </div>
          {currentStatus === 'draft' && (
            <Button onClick={handleSave} variant="outline" size="sm" className="h-9">
              <Save className="mr-1.5 h-4 w-4" />Save {isEditing ? 'Changes' : 'Draft'}
            </Button>
          )}
        </div>
      </div>

      <Dialog open={isAddClientOpen} onOpenChange={setIsAddClientOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader><DialogTitle>Add New Client</DialogTitle><DialogDescription>Quick add a new client</DialogDescription></DialogHeader>
          <div className="grid gap-3 py-3">
            <div className="space-y-1.5"><Label htmlFor="clientName" className="text-xs">Name *</Label><Input id="clientName" value={newClient.name} onChange={(e) => setNewClient({ ...newClient, name: e.target.value })} className="h-9" /></div>
            <div className="space-y-1.5"><Label htmlFor="clientEmail" className="text-xs">Email</Label><Input id="clientEmail" type="email" value={newClient.email} onChange={(e) => setNewClient({ ...newClient, email: e.target.value })} className="h-9" /></div>
            <div className="space-y-1.5"><Label htmlFor="clientPhone" className="text-xs">Phone</Label><Input id="clientPhone" value={newClient.phone} onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })} className="h-9" /></div>
            <div className="space-y-1.5"><Label htmlFor="clientAddress" className="text-xs">Address</Label><Input id="clientAddress" value={newClient.address} onChange={(e) => setNewClient({ ...newClient, address: e.target.value })} className="h-9" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsAddClientOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={handleAddClient}>Add Client</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isAddSalesmanOpen} onOpenChange={setIsAddSalesmanOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader><DialogTitle>Add Salesman</DialogTitle><DialogDescription>Quick add a new salesman</DialogDescription></DialogHeader>
          <div className="grid gap-3 py-3">
            <div className="space-y-1.5"><Label className="text-xs">Name *</Label><Input value={newSalesman.name} onChange={(e) => setNewSalesman({ ...newSalesman, name: e.target.value })} className="h-9" /></div>
            <div className="space-y-1.5"><Label className="text-xs">Phone</Label><Input value={newSalesman.phone} onChange={(e) => setNewSalesman({ ...newSalesman, phone: e.target.value })} className="h-9" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsAddSalesmanOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={() => {
              if (!newSalesman.name.trim()) return toast({ title: 'Error', description: 'Salesman name required', variant: 'destructive' });
              const s = { id: safeRandomUUID(), name: newSalesman.name, phone: newSalesman.phone, createdAt: new Date().toISOString() };
              addSalesman(s);
              setSalesmanId(s.id);
              setIsAddSalesmanOpen(false);
              setNewSalesman({ name: '', phone: '' });
              toast({ title: 'Salesman added', description: `${s.name} created.` });
            }}>Add Salesman</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isAddProjectOpen} onOpenChange={setIsAddProjectOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader><DialogTitle>Add Project</DialogTitle><DialogDescription>Create a project master record for progress billing.</DialogDescription></DialogHeader>
          <div className="grid gap-3 py-3">
            <div className="space-y-1.5"><Label className="text-xs">Project Name *</Label><Input value={newProject.name} onChange={(e) => setNewProject({ ...newProject, name: e.target.value })} className="h-9" /></div>
            <div className="space-y-1.5"><Label className="text-xs">Total Project Value *</Label><Input type="number" min="0" step="0.01" value={newProject.totalValue} onChange={(e) => setNewProject({ ...newProject, totalValue: e.target.value })} className="h-9 text-right" /></div>
            <div className="space-y-1.5"><Label className="text-xs">LPO Number</Label><Input value={newProject.lpoNumber} onChange={(e) => setNewProject({ ...newProject, lpoNumber: e.target.value })} className="h-9" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsAddProjectOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={handleAddProject}>Add Project</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
