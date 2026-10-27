import React, { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import CommandPalette from './CommandPalette';

export const AppLayout = () => {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(
    () => localStorage.getItem('dso_sidebar_collapsed') === 'true'
  );
  const [isCommandOpen, setIsCommandOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem('dso_sidebar_collapsed', String(isCollapsed));
  }, [isCollapsed]);

  // Global Cmd/Ctrl+K shortcut
  useEffect(() => {
    const handleKeyDown = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setIsCommandOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="app-shell flex">
      <Sidebar
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
        isMobileOpen={isMobileOpen}
        closeMobileMenu={() => setIsMobileOpen(false)}
      />

      <div
        className={`flex min-w-0 flex-1 flex-col transition-[padding] duration-300 ease-in-out ${
          isCollapsed ? 'lg:pl-[76px]' : 'lg:pl-64'
        }`}
      >
        <Topbar
          openMobileMenu={() => setIsMobileOpen(true)}
          openCommandPalette={() => setIsCommandOpen(true)}
        />

        <main className="relative flex-1">
          {/* Ambient background accents */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-hero-glow opacity-70"
          />
          <div className="relative mx-auto w-full max-w-[1600px] px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
            <Outlet />
          </div>
        </main>
      </div>

      <CommandPalette open={isCommandOpen} onClose={() => setIsCommandOpen(false)} />
    </div>
  );
};

export default AppLayout;
