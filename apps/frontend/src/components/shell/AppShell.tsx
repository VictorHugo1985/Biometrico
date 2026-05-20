import { useState } from 'react';
import { Sidebar } from 'primereact/sidebar';
import { TopBar } from './TopBar';
import { AppSidebar } from './AppSidebar';

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex flex-column" style={{ minHeight: '100vh' }}>
      <TopBar onMenuToggle={() => setSidebarOpen(true)} />

      <div className="flex flex-1">
        {/* Desktop sidebar — always visible on lg+ */}
        <div className="hidden lg:block surface-50 border-right-1 surface-border" style={{ width: '250px', flexShrink: 0 }}>
          <AppSidebar />
        </div>

        {/* Mobile drawer */}
        <Sidebar
          visible={sidebarOpen}
          onHide={() => setSidebarOpen(false)}
          className="p-sidebar-sm"
          style={{ width: '250px' }}
        >
          <AppSidebar onNavigate={() => setSidebarOpen(false)} />
        </Sidebar>

        {/* Main content */}
        <main className="flex-1 p-4 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
