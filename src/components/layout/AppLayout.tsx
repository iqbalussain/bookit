import { ReactNode, useState, useEffect, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, FileText, Receipt, Users, Settings, ShoppingCart,
  BookOpen, BarChart3, Menu, X, Wallet,
} from 'lucide-react';

interface AppLayoutProps { children: ReactNode; }

const navItems = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Quotations', href: '/quotations', icon: FileText },
  { name: 'Sales', href: '/invoices', icon: Receipt },
  { name: 'Purchases', href: '/purchases', icon: ShoppingCart },
  { name: 'Vouchers', href: '/vouchers', icon: Wallet },
  { name: 'Parties', href: '/clients', icon: Users },
  { name: 'Accounts', href: '/accounts', icon: BookOpen },
  { name: 'Reports', href: '/reports/pnl', icon: BarChart3 },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export function AppLayout({ children }: AppLayoutProps) {
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  // Close on route change
  useEffect(() => { setMenuOpen(false); }, [location.pathname]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenuOpen(false); };
    if (menuOpen) window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [menuOpen]);

  const toggle = useCallback(() => setMenuOpen(p => !p), []);
  const itemCount = navItems.length;
  const radius = 150;
  const mobileRadius = 120;

  return (
    <div className="min-h-screen bg-background">
      {/* Minimal Header */}
      <header className="sticky top-0 z-30 flex h-12 items-center gap-3 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-3 lg:px-4">
        <Link to="/" className="flex items-center gap-2">
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

      {/* Main content — full width now */}
      <main className="flex-1 p-3 lg:p-6 pb-24">{children}</main>

      {/* Radial Menu Overlay */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-[60] bg-background/80 backdrop-blur-md"
          onClick={() => setMenuOpen(false)}
        />
      )}

      {/* Radial nav items */}
      <div className="fixed bottom-6 right-6 z-[70] lg:bottom-8 lg:right-8">
        {navItems.map((item, index) => {
          const isActive = location.pathname === item.href ||
            (item.href !== '/' && location.pathname.startsWith(item.href));

          // Semicircle arc from ~200° to ~340° (upper-left quadrant area)
          const angleStart = 190;
          const angleEnd = 350;
          const angle = angleStart + (index / (itemCount - 1)) * (angleEnd - angleStart);
          const rad = (angle * Math.PI) / 180;

          const useRadius = typeof window !== 'undefined' && window.innerWidth < 1024 ? mobileRadius : radius;
          const x = Math.cos(rad) * useRadius;
          const y = Math.sin(rad) * useRadius;

          return (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                'absolute flex flex-col items-center justify-center transition-all duration-300 ease-out',
                menuOpen
                  ? 'opacity-100 scale-100'
                  : 'opacity-0 scale-0 pointer-events-none'
              )}
              style={{
                transitionDelay: menuOpen ? `${index * 35}ms` : '0ms',
                transform: menuOpen
                  ? `translate(${x}px, ${y}px) scale(1)`
                  : 'translate(0px, 0px) scale(0)',
                left: '50%',
                top: '50%',
                marginLeft: '-24px',
                marginTop: '-24px',
              }}
            >
              <div
                className={cn(
                  'flex h-12 w-12 items-center justify-center rounded-full shadow-lg transition-all duration-200',
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-primary/40 ring-2 ring-primary/20'
                    : 'bg-card text-foreground border border-border hover:bg-primary hover:text-primary-foreground hover:shadow-primary/30'
                )}
              >
                <item.icon className="h-5 w-5" />
              </div>
              <span
                className={cn(
                  'mt-1 text-[10px] font-semibold whitespace-nowrap select-none',
                  isActive ? 'text-primary' : 'text-foreground'
                )}
              >
                {item.name}
              </span>
            </Link>
          );
        })}

        {/* Trigger FAB */}
        <button
          onClick={toggle}
          className={cn(
            'relative flex h-14 w-14 items-center justify-center rounded-full shadow-xl transition-all duration-300 z-10',
            'bg-primary text-primary-foreground',
            menuOpen
              ? 'rotate-90 bg-destructive shadow-destructive/40'
              : 'hover:shadow-primary/50 hover:scale-105'
          )}
          aria-label={menuOpen ? 'Close navigation' : 'Open navigation'}
        >
          {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>
    </div>
  );
}
