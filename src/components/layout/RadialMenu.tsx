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

export function RadialMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  // Close on route change
  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    if (isOpen) window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen]);

  const toggle = useCallback(() => setIsOpen(prev => !prev), []);

  const itemCount = navItems.length;
  // On desktop: full circle. On mobile: semicircle (top half)
  const radius = 140; // px from center
  const mobileRadius = 120;

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[60] bg-background/80 backdrop-blur-md transition-opacity duration-300"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Radial items */}
      <div className="fixed bottom-6 right-6 z-[70] lg:bottom-8 lg:right-8">
        {/* Nav items arranged in a circle */}
        {navItems.map((item, index) => {
          const isActive = location.pathname === item.href ||
            (item.href !== '/' && location.pathname.startsWith(item.href));

          // Desktop: arrange in a circle (arc from -180° to 0°, i.e. top-left semicircle)
          // Mobile: same but smaller radius
          const angleStart = -180;
          const angleEnd = -10;
          const angle = angleStart + (index / (itemCount - 1)) * (angleEnd - angleStart);
          const rad = (angle * Math.PI) / 180;

          return (
            <Link
              key={item.name}
              to={item.href}
              onClick={() => setIsOpen(false)}
              className={cn(
                'absolute flex flex-col items-center justify-center transition-all duration-300 ease-out',
                isOpen
                  ? 'opacity-100 scale-100'
                  : 'opacity-0 scale-50 pointer-events-none'
              )}
              style={{
                transitionDelay: isOpen ? `${index * 40}ms` : '0ms',
                // Position relative to the trigger button center
                // Using CSS custom properties for responsive radius
                '--desktop-x': `${Math.cos(rad) * radius}px`,
                '--desktop-y': `${Math.sin(rad) * radius}px`,
                '--mobile-x': `${Math.cos(rad) * mobileRadius}px`,
                '--mobile-y': `${Math.sin(rad) * mobileRadius}px`,
                transform: isOpen
                  ? `translate(var(--tx), var(--ty)) scale(1)`
                  : 'translate(0, 0) scale(0.5)',
              } as React.CSSProperties}
            >
              <div
                className={cn(
                  'radial-item flex h-12 w-12 items-center justify-center rounded-full shadow-lg transition-colors duration-200',
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-primary/30'
                    : 'bg-card text-foreground border border-border hover:bg-accent hover:text-accent-foreground'
                )}
              >
                <item.icon className="h-5 w-5" />
              </div>
              <span
                className={cn(
                  'mt-1 text-[10px] font-semibold whitespace-nowrap',
                  isActive ? 'text-primary' : 'text-foreground'
                )}
              >
                {item.name}
              </span>
            </Link>
          );
        })}

        {/* Trigger Button */}
        <button
          onClick={toggle}
          className={cn(
            'relative flex h-14 w-14 items-center justify-center rounded-full shadow-xl transition-all duration-300',
            'bg-primary text-primary-foreground hover:shadow-primary/40',
            isOpen && 'rotate-90 bg-destructive hover:bg-destructive/90'
          )}
          aria-label={isOpen ? 'Close menu' : 'Open menu'}
        >
          {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Inline styles for responsive positioning via JS (avoids needing extra CSS file logic) */}
      <style>{`
        .radial-item {
          /* items already styled via tailwind */
        }
        @media (min-width: 1024px) {
          ${navItems.map((_, i) => {
            const angleStart = -180;
            const angleEnd = -10;
            const angle = angleStart + (i / (itemCount - 1)) * (angleEnd - angleStart);
            const rad = (angle * Math.PI) / 180;
            const x = Math.cos(rad) * radius;
            const y = Math.sin(rad) * radius;
            return `
              .fixed a:nth-child(${i + 1}) {
                --tx: ${x}px;
                --ty: ${y}px;
              }
            `;
          }).join('')}
        }
      `}</style>
    </>
  );
}
