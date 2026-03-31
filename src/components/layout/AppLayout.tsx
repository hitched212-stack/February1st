import { Outlet } from 'react-router-dom';
import { useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { MobileHeader } from './MobileHeader';
import { BottomNav } from './BottomNav';
import { PageTransition } from './PageTransition';
import { useState } from 'react';

export function AppLayout() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const location = useLocation();
  const isTradeFormPage = location.pathname === '/add' || location.pathname.startsWith('/edit');
  
  return (
    <div
      className={`flex min-h-screen relative overflow-hidden w-full ${
        isTradeFormPage
          ? 'bg-[radial-gradient(circle_at_top,rgba(139,92,246,0.18),transparent_30%),radial-gradient(circle_at_82%_8%,rgba(59,130,246,0.14),transparent_26%),linear-gradient(180deg,rgba(10,10,10,0.95),rgba(10,10,10,1))]'
          : 'bg-background'
      }`}
    >
      {isTradeFormPage && (
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:32px_32px] opacity-[0.12]" />
      )}
      <Sidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />
      {/* Spacer for floating sidebar - only on desktop (sidebar width + margins) */}
      <div className={`hidden md:block flex-shrink-0 transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)] ${isCollapsed ? 'w-[88px]' : 'w-[280px]'}`} />
      <div className="flex-1 flex flex-col relative min-w-0 w-full" style={{ zIndex: 2 }}>
        <MobileHeader />
        <main className={`flex-1 overflow-x-hidden overflow-y-auto w-full md:pb-0 ${isTradeFormPage ? 'pb-0' : 'pb-24'}`}>
          <PageTransition>
            <Outlet />
          </PageTransition>
        </main>
        <BottomNav />
      </div>
    </div>
  );
}
