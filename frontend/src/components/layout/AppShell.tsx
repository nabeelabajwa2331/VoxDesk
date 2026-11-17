import { Outlet } from 'react-router';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { TabBar } from './TabBar';

export function AppShell() {
  return (
    <div className="flex min-h-dvh">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-raised focus:px-4 focus:py-2">
        Skip to content
      </a>
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main id="main" className="w-full max-w-[1440px] flex-1 px-4 pt-6 pb-28 lg:px-10 lg:py-10">
          <Outlet />
        </main>
      </div>
      <TabBar />
    </div>
  );
}
