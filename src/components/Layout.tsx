/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { LayoutDashboard, ClipboardCheck, History, Bell, User, Truck, LogOut } from 'lucide-react';
import { motion } from 'motion/react';
import { auth } from '../lib/firebase';
import { useAuth } from './FirebaseProvider';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export default function Layout({ children, activeTab, setActiveTab }: LayoutProps) {
  const { user } = useAuth();
  const tabs = [
    { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
    { id: 'inspect', label: 'Inspect', icon: ClipboardCheck },
    { id: 'history', label: 'History', icon: History },
    { id: 'notifications', label: 'Alerts', icon: Bell },
    { id: 'vehicles', label: 'Fleet', icon: Truck },
  ];

  const handleLogout = () => {
    if (confirm('Apakah Anda yakin ingin keluar?')) {
      auth.signOut();
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-zinc-950 font-sans">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-zinc-900 text-white h-screen fixed inset-y-0 border-r border-zinc-800">
        <div className="p-6 flex items-center gap-3">
          <div className="bg-amber-500 p-2 rounded-xl">
            <Truck className="w-6 h-6 text-zinc-950" />
          </div>
          <span className="font-bold text-xl tracking-tighter uppercase italic">Driver<span className="text-amber-500">Check</span></span>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-4 py-4 rounded-2xl transition-all ${
                activeTab === tab.id 
                  ? 'bg-zinc-800 text-amber-500 shadow-inner border border-zinc-700' 
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <tab.icon className="w-5 h-5" />
              <span className="font-bold uppercase text-xs tracking-widest">{tab.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-zinc-800">
          <div className="flex items-center justify-between gap-3 px-4 py-3 bg-zinc-950/50 rounded-2xl border border-zinc-800">
            <div className="flex items-center gap-3 overflow-hidden">
                <div className="w-8 h-8 rounded-xl bg-amber-500 flex items-center justify-center shrink-0 text-zinc-950 font-bold text-xs">
                  {user?.photoURL ? (
                    <img src={user.photoURL} className="w-full h-full rounded-xl" alt="" referrerPolicy="no-referrer" />
                  ) : (user?.displayName?.[0] || 'D')}
                </div>
                <div className="overflow-hidden">
                  <p className="text-xs font-bold text-white truncate">{user?.displayName || 'Driver'}</p>
                </div>
            </div>
            <button 
              onClick={handleLogout}
              className="p-1.5 hover:bg-red-500/10 text-zinc-600 hover:text-red-500 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 md:ml-64 pb-24 md:pb-0">
        <header className="bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800 h-20 flex items-center justify-between px-8 sticky top-0 z-30">
          <div className="flex flex-col">
            <h1 className="text-sm font-black uppercase tracking-[0.2em] text-zinc-500">{activeTab}</h1>
            <p className="text-[10px] text-zinc-600 italic">V-CHECK SYSTEM V2.4</p>
          </div>
          <div className="flex items-center gap-4">
            <button className="w-10 h-10 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-center text-zinc-400 relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-amber-500 rounded-full animate-pulse"></span>
            </button>
          </div>
        </header>

        <div className="p-8 max-w-6xl mx-auto">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            {children}
          </motion.div>
        </div>
      </main>

      {/* Bottom Nav - Mobile */}
      <nav className="md:hidden fixed bottom-6 inset-x-6 bg-zinc-900/90 backdrop-blur-xl border-2 border-zinc-800 h-20 rounded-[32px] flex items-center justify-around px-4 z-40 shadow-2xl">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-col items-center gap-1 min-w-[64px] transition-all ${
              activeTab === tab.id ? 'text-amber-500 scale-110' : 'text-zinc-600'
            }`}
          >
            <tab.icon className="w-5 h-5" />
            <span className="text-[9px] font-black uppercase tracking-tighter">{tab.label}</span>
          </button>
        ))}
        <button
          onClick={handleLogout}
          className="flex flex-col items-center gap-1 min-w-[64px] text-zinc-700"
        >
          <LogOut className="w-5 h-5" />
          <span className="text-[9px] font-black uppercase tracking-tighter">Exit</span>
        </button>
      </nav>
    </div>
  );
}
