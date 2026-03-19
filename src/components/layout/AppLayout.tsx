import { ReactNode, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MobileBottomNav } from './MobileBottomNav';
import { FloatingActionButton } from './FloatingActionButton';
import {
  LayoutDashboard, FileText, Receipt, Users, Settings, Menu, X, ChevronRight,
  ShoppingCart, CreditCard, BookOpen, BarChart3, ChevronDown,
} from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface AppLayoutProps { children: ReactNode; }

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Quotations', href: '/quotations', icon: FileText },
  { name: 'Sales Invoices', href: '/invoices', icon: Receipt },
  { name: 'Purchase Invoices', href: '/purchases', icon: ShoppingCart },
  { name: 'Payments & Receipts', href: '/payments', icon: CreditCard },
  { name: 'Parties', href: '/clients', icon: Users },
  { name: 'Chart of Accounts', href: '/accounts', icon: BookOpen },
];

const reportLinks = [
  { name: 'Profit & Loss', href: '/reports/pnl' },
  { name: 'Balance Sheet', href: '/reports/balance-sheet' },
  { name: 'Trial Balance', href: '/reports/trial-balance' },
  { name: 'Aging Report', href: '/reports/aging' },
];

export function AppLayout({ children }: AppLayoutProps) {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [reportsOpen, setReportsOpen] = useState(false);

  const isFormPage = location.pathname.includes('/new') ||
    (location.pathname.includes('/quotations/') && location.pathname !== '/quotations') ||
    (location.pathname.includes('/invoices/') && location.pathname !== '/invoices') ||
    (location.pathname.includes('/purchases/') && location.pathname !== '/purchases');

  return (
    <div className="min-h-screen bg-background">
      {sidebarOpen && <div className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm lg:hidden" onClick={() => setSidebarOpen(false)} />}

      <aside className={cn(
        'fixed inset-y-0 left-0 z-50 w-56 transform bg-sidebar border-r border-sidebar-border transition-transform duration-200 ease-in-out lg:translate-x-0',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        <div className="flex h-12 items-center justify-between px-3 border-b border-sidebar-border">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground"><Receipt className="h-4 w-4" /></div>
            <span className="font-semibold text-sm text-sidebar-foreground">SmartBusiness</span>
          </Link>
          <Button variant="ghost" size="icon" className="h-8 w-8 lg:hidden" onClick={() => setSidebarOpen(false)}><X className="h-4 w-4" /></Button>
        </div>

        <ScrollArea className="flex-1 py-2">
          <nav className="space-y-0.5 px-2">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href || (item.href !== '/' && location.pathname.startsWith(item.href));
              return (
                <Link key={item.name} to={item.href} onClick={() => setSidebarOpen(false)}
                  className={cn('flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors',
                    isActive ? 'bg-sidebar-accent text-sidebar-primary' : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                  )}>
                  <item.icon className="h-[18px] w-[18px]" />{item.name}
                  {isActive && <ChevronRight className="ml-auto h-4 w-4" />}
                </Link>
              );
            })}

            {/* Reports section */}
            <Collapsible open={reportsOpen || location.pathname.startsWith('/reports')} onOpenChange={setReportsOpen}>
              <CollapsibleTrigger className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors w-full text-sidebar-foreground hover:bg-sidebar-accent">
                <BarChart3 className="h-[18px] w-[18px]" />Reports
                <ChevronDown className={`ml-auto h-4 w-4 transition-transform ${reportsOpen || location.pathname.startsWith('/reports') ? 'rotate-180' : ''}`} />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="ml-7 space-y-0.5 mt-0.5">
                  {reportLinks.map((item) => {
                    const isActive = location.pathname === item.href;
                    return (
                      <Link key={item.name} to={item.href} onClick={() => setSidebarOpen(false)}
                        className={cn('block rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors',
                          isActive ? 'bg-sidebar-accent text-sidebar-primary' : 'text-sidebar-foreground hover:bg-sidebar-accent'
                        )}>
                        {item.name}
                      </Link>
                    );
                  })}
                </div>
              </CollapsibleContent>
            </Collapsible>

            <Link to="/settings" onClick={() => setSidebarOpen(false)}
              className={cn('flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors',
                location.pathname === '/settings' ? 'bg-sidebar-accent text-sidebar-primary' : 'text-sidebar-foreground hover:bg-sidebar-accent'
              )}>
              <Settings className="h-[18px] w-[18px]" />Settings
            </Link>
          </nav>
        </ScrollArea>
      </aside>

      <div className="lg:pl-56">
        <header className="sticky top-0 z-30 flex h-12 items-center gap-3 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-3 lg:px-4">
          <Button variant="ghost" size="icon" className="h-8 w-8 lg:hidden" onClick={() => setSidebarOpen(true)}><Menu className="h-5 w-5" /></Button>
          <Link to="/" className="flex items-center gap-2 lg:hidden">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground"><Receipt className="h-4 w-4" /></div>
            <span className="font-semibold text-sm">SmartBusiness</span>
          </Link>
          <div className="flex-1" />
          <div className="text-xs text-muted-foreground hidden sm:block">{new Date().toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' })}</div>
        </header>
        <main className="flex-1 p-3 lg:p-4 pb-20 lg:pb-4">{children}</main>
      </div>

      <MobileBottomNav />
      {!isFormPage && <FloatingActionButton />}
    </div>
  );
}
