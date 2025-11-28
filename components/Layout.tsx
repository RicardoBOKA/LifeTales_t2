import React from 'react';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-paper text-ink font-sans selection:bg-primary selection:text-white">
      <div className="mx-auto max-w-md h-full min-h-screen relative shadow-2xl bg-white/50">
        {children}
      </div>
    </div>
  );
};