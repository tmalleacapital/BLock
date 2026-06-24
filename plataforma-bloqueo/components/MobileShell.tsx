'use client';

import { useState } from 'react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

interface Props {
  isAdmin: boolean;
  email: string;
  children: React.ReactNode;
}

export default function MobileShell({ isAdmin, email, children }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-full">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <Sidebar
        isAdmin={isAdmin}
        mobileOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <div className="flex-1 min-h-screen overflow-y-auto min-w-0">
        <TopBar email={email} onMenuClick={() => setSidebarOpen(true)} />
        <div style={{ paddingTop: '48px' }}>
          {children}
        </div>
      </div>
    </div>
  );
}
