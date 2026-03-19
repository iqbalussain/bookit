import { ReactNode, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MobileBottomNav } from './MobileBottomNav';
import { FloatingActionButton } from './FloatingActionButton';
import {
  Tooltip, TooltipContent, TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  LayoutDashboard, FileText, Receipt, Users, Settings, Menu, X, ChevronRight,
  ShoppingCart, CreditCard, BookOpen, BarChart3, ChevronDown, PanelLeftClose, PanelLeft,
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

function SidebarNavItem({ item, isActive, collapsed, onClick }: {
  item: { name: string; href: string; icon: React.ElementType };
  isActive: boolean;
  collapsed: boolean;
  onClick?: () => void;
}) {
  const linkContent = (
    <Link
      to={item.href}
      onClick={onClick}
      className={cn(
        'flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-all duration-150',
        collapsed && 'justify-center px-0 py-2.5',
        isActive
          ? 'bg-sidebar-accent text-sidebar-primary border-l-2 border-sidebar-primary'
          : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground border-l-2 border-transparent'
      )}
    >
      <item.icon className={cn('h-[18px] w-[18px] shrink-0', collapsed && 'h-5 w-5')} />
      {!collapsed && <span className="truncate">{item.name}</span>}
      {!collapsed && isActive && <ChevronRight className="ml-auto h-4 w-4 shrink-0" />}
    </Link>
  );

  if (collapsed) {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
        <TooltipContent side="right" className="font-medium">
          {item.name}
        </TooltipContent>
      </Tooltip>
    );
  }

  return linkContent;
}

export function AppLayout({ children }: AppLayoutProps) {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(true);
  const [reportsOpen, setReportsOpen] = useState(false);

  const isFormPage = location.pathname.includes('/new') ||
    (location.pathname.includes('/quotations/') && location.pathname !== '/quotations') ||
    (location.pathname.includes('/invoices/') && location.pathname !== '/invoices') ||
    (location.pathname.includes('/purchases/') && location.pathname !== '/purchases');

  const isReportActive = location.pathname.startsWith('/reports');
  const isSettingsActive = location.pathname === '/settings';

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        'fixed inset-y-0 left-0 z-50 flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-200 ease-in-out',
        // Mobile: always full width, slide in/out
        sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        'w-56 lg:translate-x-0',
        // Desktop: collapsed or expanded
        collapsed ? 'lg:w-14' : 'lg:w-56',
      )}>
        {/* Header */}
        <div className={cn(
          'flex h-12 items-center border-b border-sidebar-border shrink-0',
          collapsed ? 'justify-center px-0' : 'justify-between px-3'
        )}>
          {!collapsed && (
            <Link to="/" className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground shrink-0">
                <Receipt className="h-4 w-4" />
              </div>
              <span className="font-semibold text-sm text-sidebar-foreground truncate">SmartBusiness</span>
            </Link>
          )}
          {collapsed && (
            <Link to="/" className="flex items-center justify-center">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Receipt className="h-4 w-4" />
              </div>
            </Link>
          )}
          <Button
            variant="ghost"
            size="icon"
            className={cn('h-8 w-8 lg:hidden', collapsed && 'absolute right-1 top-2')}
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Toggle button - desktop only */}
        <div className={cn(
          'hidden lg:flex items-center border-b border-sidebar-border shrink-0',
          collapsed ? 'justify-center py-1.5' : 'justify-end px-2 py-1.5'
        )}>
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-sidebar-foreground hover:bg-sidebar-accent"
                onClick={() => setCollapsed(!collapsed)}
              >
                {collapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              {collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 py-2">
          <nav className={cn('space-y-0.5', collapsed ? 'px-1.5' : 'px-2')}>
            {navigation.map((item) => {
              const isActive = location.pathname === item.href || (item.href !== '/' && location.pathname.startsWith(item.href));
              return (
                <SidebarNavItem
                  key={item.name}
                  item={item}
                  isActive={isActive}
                  collapsed={collapsed}
                  onClick={() => setSidebarOpen(false)}
                />
              );
            })}

            {/* Reports section */}
            {collapsed ? (
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <div
                    className={cn(
                      'flex items-center justify-center rounded-lg py-2.5 text-sm font-medium transition-all cursor-pointer',
                      isReportActive
                        ? 'bg-sidebar-accent text-sidebar-primary border-l-2 border-sidebar-primary'
                        : 'text-sidebar-foreground hover:bg-sidebar-accent border-l-2 border-transparent'
                    )}
                  >
                    <BarChart3 className="h-5 w-5" />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right" className="p-0">
                  <div className="py-1">
                    <div className="px-3 py-1.5 text-xs font-semibold text-muted-foreground">Reports</div>
                    {reportLinks.map((item) => {
                      const isActive = location.pathname === item.href;
                      return (
                        <Link
                          key={item.name}
                          to={item.href}
                          className={cn(
                            'block px-3 py-1.5 text-sm transition-colors hover:bg-muted',
                            isActive ? 'text-primary font-medium' : ''
                          )}
                        >
                          {item.name}
                        </Link>
                      );
                    })}
                  </div>
                </TooltipContent>
              </Tooltip>
            ) : (
              <Collapsible open={reportsOpen || isReportActive} onOpenChange={setReportsOpen}>
                <CollapsibleTrigger className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors w-full text-sidebar-foreground hover:bg-sidebar-accent border-l-2 border-transparent">
                  <BarChart3 className="h-[18px] w-[18px]" />Reports
                  <ChevronDown className={`ml-auto h-4 w-4 transition-transform ${reportsOpen || isReportActive ? 'rotate-180' : ''}`} />
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
            )}
          </nav>
        </ScrollArea>

        {/* Settings at bottom */}
        <div className={cn('border-t border-sidebar-border p-2 shrink-0', collapsed && 'px-1.5')}>
          <SidebarNavItem
            item={{ name: 'Settings', href: '/settings', icon: Settings }}
            isActive={isSettingsActive}
            collapsed={collapsed}
            onClick={() => setSidebarOpen(false)}
          />
        </div>
      </aside>

      {/* Main content */}
      <div className={cn(
        'transition-all duration-200',
        collapsed ? 'lg:pl-14' : 'lg:pl-56'
      )}>
        <header className="sticky top-0 z-30 flex h-12 items-center gap-3 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-3 lg:px-4">
          <Button variant="ghost" size="icon" className="h-8 w-8 lg:hidden" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
          <Link to="/" className="flex items-center gap-2 lg:hidden">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Receipt className="h-4 w-4" />
            </div>
            <span className="font-semibold text-sm">SmartBusiness</span>
          </Link>
          <div className="flex-1" />
          <div className="text-xs text-muted-foreground hidden sm:block">
            {new Date().toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' })}
          </div>
        </header>
        <main className="flex-1 p-3 lg:p-4 pb-20 lg:pb-4">{children}</main>
      </div>

      <MobileBottomNav />
      {!isFormPage && <FloatingActionButton />}
    </div>
  );
}
