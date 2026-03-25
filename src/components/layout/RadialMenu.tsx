import { useState, useEffect, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, FileText, Receipt, Users, Settings, ShoppingCart,
  BookOpen, BarChart3, Menu, X, Wallet,
} from 'lucide-react';

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

const RADIUS = 120;

export function RadialMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  useEffect(() => { setIsOpen(false); }, [location.pathname]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsOpen(false); };
    if (isOpen) window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen]);

  const toggle = useCallback(() => setIsOpen(prev => !prev), []);

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[60] bg-background/80 backdrop-blur-md"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Radial items — centered on screen */}
      <div className="fixed inset-0 z-[65] pointer-events-none flex items-center justify-center">
        {navItems.map((item, index) => {
          const isActive = location.pathname === item.href ||
            (item.href !== '/' && location.pathname.startsWith(item.href));
          const angle = (index / navItems.length) * 360 - 90; // start from top
          const rad = (angle * Math.PI) / 180;
          const x = Math.cos(rad) * RADIUS;
          const y = Math.sin(rad) * RADIUS;

          return (
            <Link
              key={item.name}
              to={item.href}
              title={item.name}
              onClick={() => setIsOpen(false)}
              className={cn(
                'absolute pointer-events-auto transition-all duration-300 ease-out',
                isOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-0 !pointer-events-none'
              )}
              style={{
                transitionDelay: isOpen ? `${index * 35}ms` : '0ms',
                transform: isOpen
                  ? `translate(${x}px, ${y}px) scale(1)`
                  : 'translate(0, 0) scale(0)',
              }}
            >
              <div
                className={cn(
                  'flex h-12 w-12 items-center justify-center rounded-full shadow-lg transition-colors duration-200',
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-primary/30'
                    : 'bg-card text-foreground border border-border hover:bg-accent hover:text-accent-foreground'
                )}
              >
                <item.icon className="h-5 w-5" />
              </div>
            </Link>
          );
        })}
      </div>

      {/* Trigger — bottom center */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[70]">
        <button
          onClick={toggle}
          className={cn(
            'flex h-14 w-14 items-center justify-center rounded-full shadow-xl transition-all duration-300',
            'bg-primary text-primary-foreground hover:shadow-primary/40',
            isOpen && 'rotate-90 bg-destructive hover:bg-destructive/90'
          )}
          aria-label={isOpen ? 'Close menu' : 'Open menu'}
        >
          {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>
    </>
  );
}
