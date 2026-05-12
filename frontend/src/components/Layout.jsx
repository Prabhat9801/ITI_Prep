import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, BookOpen, PenTool, Calendar, GraduationCap, X, Menu, History } from 'lucide-react';

const Layout = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();

  const navItems = [
    { name: 'Dashboard', path: '/', icon: <LayoutDashboard size={20} /> },
    { name: 'AI Learn', path: '/learn', icon: <GraduationCap size={20} /> },
    { name: 'Practice', path: '/practice', icon: <PenTool size={20} /> },
    { name: 'History', path: '/history', icon: <History size={20} /> },
    { name: '15-Day Plan', path: '/study-plan', icon: <Calendar size={20} /> },
  ];

  // Close sidebar on mobile when navigating
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location.pathname]);

  return (
    <div className="flex bg-gradient min-h-screen text-text">
      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-surface/80 backdrop-blur-md border-b border-border z-40 flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 bg-surface-light rounded-lg text-text-muted hover:text-white"
          >
            {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
          <div className="flex items-center gap-2">
            <span className="text-xl">⚡</span>
            <h1 className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">
              AI Tutor
            </h1>
          </div>
        </div>
      </div>

      {/* Sidebar Overlay (Mobile) */}
      {isSidebarOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 h-full w-64 bg-surface md:bg-transparent md:glass
        md:m-4 md:mr-0 md:rounded-2xl flex flex-col justify-between z-50
        transition-transform duration-300 ease-in-out md:h-[calc(100vh-32px)]
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div>
          <div className="p-6 hidden md:block">
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary flex items-center gap-2">
              <span className="text-2xl">⚡</span> AI Tutor
            </h1>
            <p className="text-xs text-text-muted mt-1">BTSC ITI Electronics Mech</p>
          </div>
          
          <div className="p-6 md:hidden flex justify-between items-center border-b border-border">
            <h1 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="text-xl">⚡</span> Menu
            </h1>
            <button onClick={() => setIsSidebarOpen(false)} className="text-text-muted">
              <X size={24} />
            </button>
          </div>
          
          <nav className="mt-6 px-4 space-y-2">
            {navItems.map((item) => (
              <NavLink
                key={item.name}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
                    isActive 
                      ? 'bg-primary/20 text-primary font-semibold border border-primary/30' 
                      : 'text-text-muted hover:bg-surface-light hover:text-text'
                  }`
                }
              >
                {item.icon}
                {item.name}
              </NavLink>
            ))}
          </nav>
        </div>
        
        <div className="p-4 mb-4">
          <div className="bg-surface-light/50 border border-border p-4 rounded-xl text-sm">
            <p className="text-text-muted mb-2 font-medium">Exam Readiness</p>
            <div className="w-full bg-surface rounded-full h-2 mb-1 overflow-hidden">
              <div className="bg-gradient-to-r from-secondary to-primary h-2 rounded-full" style={{ width: '45%' }}></div>
            </div>
            <p className="text-right text-xs text-secondary font-bold">45%</p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 md:ml-[280px] p-4 pt-20 md:pt-8 md:p-8 animate-fade-in w-full overflow-x-hidden">
        {children}
      </main>
    </div>
  );
};

export default Layout;
