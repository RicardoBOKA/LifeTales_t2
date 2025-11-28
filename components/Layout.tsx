import React from 'react';

interface LayoutProps {
  children: React.ReactNode;
  bottomNav?: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children, bottomNav }) => {
  return (
    <div className="min-h-screen bg-paper text-ink font-sans selection:bg-primary selection:text-white pb-20">
      <div className="mx-auto max-w-md h-full min-h-screen relative shadow-2xl bg-white/50 flex flex-col">
        <main className="flex-1 relative overflow-hidden flex flex-col">
          {children}
        </main>
        {bottomNav && (
          <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pointer-events-none">
            <div className="w-full max-w-md pointer-events-auto">
              {bottomNav}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};