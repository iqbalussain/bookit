import { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import type { Account, AccountType } from '@/types';
import { Plus, Trash2, BookOpen } from 'lucide-react';

const typeColors: Record<AccountType, string> = {
  asset: 'bg-primary/10 text-primary',
  liability: 'bg-destructive/10 text-destructive',
  income: 'bg-success/10 text-success',
  expense: 'bg-warning/10 text-warning',
  equity: 'bg-accent text-accent-foreground',
};

export default function ChartOfAccounts() {
  const { accounts, addAccount, deleteAccount, getAccountBalance } = useApp();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ code: '', name: '', type: 'asset' as AccountType });

  const grouped = {
    asset: accounts.filter((a) => a.type === 'asset'),
    liability: accounts.filter((a) => a.type === 'liability'),
    equity: accounts.filter((a) => a.type === 'equity'),
    income: accounts.filter((a) => a.type === 'income'),
    expense: accounts.filter((a) => a.type === 'expense'),
  };

  const handleAdd = () => {
    if (!formData.code.trim() || !formData.name.trim()) {
      toast({ title: 'Error', description: 'Code and name are required', variant: 'destructive' });
      return;
    }
    if (accounts.some((a) => a.code === formData.code)) {
      toast({ title: 'Error', description: 'Account code already exists', variant: 'destructive' });
      return;
    }
    const account: Account = { id: `acc-${formData.code}`, code: formData.code, name: formData.name, type: formData.type, isSystem: false };
    addAccount(account);
    toast({ title: 'Account added', description: `${formData.code} - ${formData.name}` });
    setIsDialogOpen(false);
    setFormData({ code: '', name: '', type: 'asset' });
  };

  const typeLabels: Record<AccountType, string> = { asset: 'Assets', liability: 'Liabilities', equity: 'Equity', income: 'Income', expense: 'Expenses' };

  return (
    <div className="space-y-3 pb-20 lg:pb-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Chart of Accounts</h1>
          <p className="text-xs text-muted-foreground hidden sm:block">Your accounting structure</p>
        </div>
        <Button size="sm" onClick={() => setIsDialogOpen(true)}>
          <Plus className="mr-1.5 h-4 w-4" />Add Account
        </Button>
      </div>

      {(Object.entries(grouped) as [AccountType, Account[]][]).map(([type, accs]) => (
        <Card key={type}>
          <CardHeader className="py-2.5 px-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Badge variant="outline" className={`${typeColors[type]} text-[10px]`}>{typeLabels[type]}</Badge>
              <span className="text-xs text-muted-foreground">({accs.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            {accs.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-2">No accounts</p>
            ) : (
              <div className="space-y-1">
                {accs.sort((a, b) => a.code.localeCompare(b.code)).map((acc) => {
                  const balance = getAccountBalance(acc.id);
                  return (
                    <div key={acc.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-2.5">
                        <span className="text-xs font-mono text-muted-foreground w-10">{acc.code}</span>
                        <span className="text-sm">{acc.name}</span>
                        {acc.isSystem && <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">System</Badge>}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-medium ${balance >= 0 ? '' : 'text-destructive'}`}>
                          {balance !== 0 ? `${balance >= 0 ? 'Dr' : 'Cr'} ${Math.abs(balance).toLocaleString('en-IN')}` : '—'}
                        </span>
                        {!acc.isSystem && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7"><Trash2 className="h-3.5 w-3.5" /></Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader><AlertDialogTitle>Delete Account</AlertDialogTitle><AlertDialogDescription>Delete {acc.code} - {acc.name}?</AlertDialogDescription></AlertDialogHeader>
                              <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => deleteAccount(acc.id)} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction></AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader><DialogTitle>Add Account</DialogTitle><DialogDescription>Add a new account to your chart</DialogDescription></DialogHeader>
          <div className="grid gap-3 py-3">
            <div className="space-y-1.5"><Label className="text-xs">Code *</Label><Input value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} placeholder="e.g. 1200" className="h-9" /></div>
            <div className="space-y-1.5"><Label className="text-xs">Name *</Label><Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Account name" className="h-9" /></div>
            <div className="space-y-1.5">
              <Label className="text-xs">Type</Label>
              <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v as AccountType })}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="asset">Asset</SelectItem>
                  <SelectItem value="liability">Liability</SelectItem>
                  <SelectItem value="equity">Equity</SelectItem>
                  <SelectItem value="income">Income</SelectItem>
                  <SelectItem value="expense">Expense</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={handleAdd}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
