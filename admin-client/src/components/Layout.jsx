// admin-client/src/components/Layout.jsx

import { useState } from "react";
import { Menu } from "lucide-react";
import Sidebar from "./Sidebar";

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-bg overflow-hidden">
      {/* Sidebar — receives open state + close handler */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Mobile top navbar — hidden on desktop */}
        <header
          className="lg:hidden flex-shrink-0 h-14 flex items-center px-4 gap-3 bg-primary-deeper"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}
        >
          <button
            onClick={() => setSidebarOpen(true)}
            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center
              justify-center transition-colors flex-shrink-0"
            aria-label="Open sidebar"
          >
            <Menu size={20} className="text-white" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-white/10 border border-white/20
              flex items-center justify-center overflow-hidden flex-shrink-0">
              <img
                src="/logo.jpg"
                alt="Austrum"
                className="w-full h-full object-cover rounded-full"
                onError={(e) => { e.currentTarget.style.display = "none"; }}
              />
            </div>
            <p className="font-sans font-bold text-white text-sm tracking-tight">Austrum</p>
          </div>
        </header>

        {/* Page content — scrolls independently */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden bg-bg">
          {children}
        </main>
      </div>
    </div>
  );
}