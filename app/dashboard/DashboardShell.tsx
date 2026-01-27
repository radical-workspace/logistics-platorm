'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { useAuth } from '@/app/auth/AuthProvider';

type NavItem = {
  href: string;
  label: string;
  adminOnly?: boolean;
};

type DashboardShellProps = {
  children: React.ReactNode;
  initialUserEmail?: string | null;
  initialRole?: string | null;
};

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Home' },
  { href: '/dashboard/shipments', label: 'Shipments' },
  { href: '/dashboard/vehicles', label: 'Vehicles' },
  { href: '/dashboard/tracking', label: 'Tracking' },
  { href: '/admin', label: 'Admin', adminOnly: true },
];

export default function DashboardShell({
  children,
  initialUserEmail,
  initialRole,
}: DashboardShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, profile, isLoading, signOut } = useAuth();
 
// Auth pages bypass shell
  if (pathname.startsWith('/dashboard/auth')) {
    return <>{children}</>;
  }

  const effectiveEmail = user?.email ?? initialUserEmail ?? null;
  const effectiveRole = profile?.role ?? initialRole ?? null;

  const isAdmin = effectiveRole === 'admin';
  const filtered = NAV_ITEMS.filter((i) => !i.adminOnly || isAdmin);
  const canShowUser = !!effectiveEmail && !isLoading;

  const onSignOut = async () => {
    await signOut();
    router.replace('/dashboard/auth/login');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="leading-tight">
              <div className="font-black tracking-wide">Dashboard</div>
              {canShowUser ? (
                <div className="text-xs text-slate-400 truncate max-w-55 sm:max-w-90">
                  {effectiveEmail}
                  {effectiveRole && (
                    <span className="text-slate-500"> · {effectiveRole}</span>
                  )}
                </div>
              ) : (
                <div className="text-xs text-slate-500">Signed out</div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-2">
              {filtered.map((item) => {
                const active =
                  pathname === item.href ||
                  (item.href !== '/dashboard' &&
                    pathname.startsWith(item.href));

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={
                      active
                        ? 'bg-blue-600 text-white px-3 py-2 rounded font-semibold'
                        : 'bg-slate-900 hover:bg-slate-800 transition px-3 py-2 rounded font-semibold text-slate-200'
                    }
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <button
              type="button"
              className="md:hidden bg-slate-900 border border-slate-800 rounded px-3 py-2 font-semibold"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="Toggle dashboard menu"
            >
              Menu
            </button>

            <button
              type="button"
              className="bg-slate-900 hover:bg-slate-800 transition border border-slate-800 px-3 py-2 rounded font-semibold"
              onClick={onSignOut}
              disabled={!effectiveEmail || isLoading}
            >
              Sign out
            </button>
          </div>
        </div>

        {/* Mobile nav */}
        {menuOpen && (
          <div className="md:hidden border-t border-slate-800 bg-slate-950">
            <div className="max-w-7xl mx-auto px-4 sm:px-8 py-3 grid grid-cols-2 gap-2">
              {filtered.map((item) => {
                const active =
                  pathname === item.href ||
                  (item.href !== '/dashboard' &&
                    pathname.startsWith(item.href));

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className={
                      active
                        ? 'bg-blue-600 text-white px-3 py-3 rounded font-semibold text-center'
                        : 'bg-slate-900 hover:bg-slate-800 transition px-3 py-3 rounded font-semibold text-center'
                    }
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-8 py-6">
        {children}
      </main>
    </div>
  );
}
