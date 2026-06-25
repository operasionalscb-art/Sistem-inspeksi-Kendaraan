/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  ClipboardCheck, 
  History, 
  Bell, 
  User, 
  Truck, 
  LogOut, 
  Shield, 
  Lock, 
  Mail, 
  Users, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  X, 
  AlertTriangle,
  Settings,
  Key,
  Chrome
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from './FirebaseProvider';
import { db } from '../lib/firebase';
import { collection, query, onSnapshot, addDoc, deleteDoc, doc } from 'firebase/firestore';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export default function Layout({ children, activeTab, setActiveTab }: LayoutProps) {
  const { user, role, loginWithEmail, loginWithGoogle, logout } = useAuth();
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [newDriverName, setNewDriverName] = useState('');
  const [newDriverEmail, setNewDriverEmail] = useState('');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isAddingDriver, setIsAddingDriver] = useState(false);

  const tabs = [
    { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
    { id: 'inspect', label: 'Inspect', icon: ClipboardCheck },
    { id: 'history', label: 'History', icon: History },
    { id: 'notifications', label: 'Alerts', icon: Bell },
    { id: 'vehicles', label: 'Fleet', icon: Truck },
  ];

  // Load drivers when account manager modal is open and user is Super Admin
  useEffect(() => {
    if (!isAccountOpen || role !== 'super_admin') return;

    const q = query(collection(db, 'drivers'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setDrivers(docs);

      // Auto-seed some mock drivers if the drivers collection is completely empty
      if (docs.length === 0) {
        const seedDrivers = async () => {
          try {
            await addDoc(collection(db, 'drivers'), {
              name: 'Ahmad Jayadi',
              email: 'ahmad.jayadi@scb.id',
              phone: '0812-3456-7890',
              status: 'Aktif',
              addedAt: new Date().toISOString()
            });
            await addDoc(collection(db, 'drivers'), {
              name: 'Prasetyo Utomo',
              email: 'prasetyo.utomo@scb.id',
              phone: '0857-9876-5432',
              status: 'Aktif',
              addedAt: new Date().toISOString()
            });
          } catch (e) {
            console.error("Failed to seed initial drivers list", e);
          }
        };
        seedDrivers();
      }
    });

    return unsubscribe;
  }, [isAccountOpen, role]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail) return;
    setIsLoggingIn(true);
    setLoginError('');
    try {
      await loginWithEmail(loginEmail, loginPassword || 'admin123');
      setLoginEmail('');
      setLoginPassword('');
    } catch (err: any) {
      setLoginError(err.message || 'Login gagal. Silakan coba lagi.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleQuickLoginAdmin = async () => {
    setIsLoggingIn(true);
    setLoginError('');
    try {
      await loginWithEmail('operasional.scb@gmail.com', 'admin123');
    } catch (err: any) {
      setLoginError(err.message || 'Quick login failed.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleAddDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDriverName || !newDriverEmail) return;
    setIsAddingDriver(true);
    try {
      await addDoc(collection(db, 'drivers'), {
        name: newDriverName,
        email: newDriverEmail,
        status: 'Aktif',
        addedAt: new Date().toISOString()
      });
      setNewDriverName('');
      setNewDriverEmail('');
    } catch (err) {
      console.error("Failed to add driver:", err);
    } finally {
      setIsAddingDriver(false);
    }
  };

  const handleDeleteDriver = async (id: string) => {
    if (confirm('Hapus driver ini dari sistem?')) {
      try {
        await deleteDoc(doc(db, 'drivers', id));
      } catch (err) {
        console.error("Failed to delete driver:", err);
      }
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

        {/* Profile Trigger - Bottom Sidebar */}
        <div className="p-4 border-t border-zinc-800">
          <button 
            onClick={() => setIsAccountOpen(true)}
            className="w-full flex items-center justify-between gap-3 px-4 py-3 bg-zinc-950/50 hover:bg-zinc-950 rounded-2xl border border-zinc-800 hover:border-amber-500/30 transition-all text-left group"
          >
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-8 h-8 rounded-xl bg-amber-500 flex items-center justify-center shrink-0 text-zinc-950 font-black text-sm uppercase shadow-md group-hover:scale-105 transition-transform">
                {user?.email === 'operasional.scb@gmail.com' ? 'SA' : (user?.displayName?.[0] || 'D')}
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-black text-white truncate group-hover:text-amber-500 transition-colors uppercase italic">
                  {user?.email === 'operasional.scb@gmail.com' ? 'Super Admin' : (user?.displayName || 'Driver SCB')}
                </p>
                <p className="text-[9px] text-zinc-500 font-mono truncate">{user?.email || 'driver@scb.id'}</p>
              </div>
            </div>
            <Settings className="w-4 h-4 text-zinc-600 group-hover:text-amber-500 group-hover:rotate-45 transition-all" />
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 md:ml-64 pb-24 md:pb-0">
        <header className="bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800 h-20 flex items-center justify-between px-8 sticky top-0 z-30">
          <div className="flex flex-col">
            <h1 className="text-sm font-black uppercase tracking-[0.2em] text-zinc-500">{activeTab}</h1>
            <p className="text-[10px] text-zinc-600 italic">V-CHECK SYSTEM V2.4</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="w-10 h-10 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-center text-zinc-400 relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-amber-500 rounded-full animate-pulse"></span>
            </button>
            <button 
              onClick={() => setIsAccountOpen(true)}
              className="w-10 h-10 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-center text-zinc-400 hover:text-white hover:border-amber-500/30 transition-all"
              title="Pengelolaan Akun"
            >
              <User className="w-5 h-5" />
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
      </nav>

      {/* Account Management Dialog / Modal */}
      <AnimatePresence>
        {isAccountOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAccountOpen(false)}
              className="absolute inset-0 bg-zinc-950/85 backdrop-blur-md"
            />

            {/* Dialog Container */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: "spring", duration: 0.4 }}
              className="relative w-full max-w-2xl bg-zinc-900 border-2 border-zinc-800 rounded-[32px] overflow-hidden shadow-2xl flex flex-col max-h-[85vh] z-10"
            >
              {/* Header */}
              <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-500 rounded-xl text-zinc-950">
                    <Shield className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-white italic uppercase tracking-tight">Pengelolaan Akun</h2>
                    <p className="text-[10px] text-zinc-500 font-mono">SISTEM INTEGRASI MULTI-USER</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsAccountOpen(false)}
                  className="p-2 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-400 hover:text-white hover:border-amber-500/30 transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="p-6 overflow-y-auto space-y-6 flex-1">
                {/* Status User Saat Ini */}
                <div className="p-5 bg-zinc-950/50 rounded-2xl border border-zinc-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500 text-zinc-950 font-black text-xl flex items-center justify-center uppercase shadow-lg">
                      {user?.email === 'operasional.scb@gmail.com' ? 'SA' : (user?.displayName?.[0] || 'D')}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-black text-white uppercase italic">
                          {user?.email === 'operasional.scb@gmail.com' ? 'Super Admin SCB' : (user?.displayName || 'Driver SCB')}
                        </p>
                        {role === 'super_admin' ? (
                          <span className="text-[9px] font-black uppercase tracking-widest bg-amber-500/10 border border-amber-500/30 text-amber-500 px-2 py-0.5 rounded-full">
                            Super Admin
                          </span>
                        ) : (
                          <span className="text-[9px] font-black uppercase tracking-widest bg-zinc-800 border border-zinc-700 text-zinc-400 px-2 py-0.5 rounded-full">
                            Driver / Tamu
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-400 font-mono mt-0.5">{user?.email || 'driver@scb.id'}</p>
                    </div>
                  </div>

                  {!user?.isAnonymous && (
                    <button 
                      onClick={() => {
                        logout();
                        setIsAccountOpen(false);
                      }}
                      className="w-full sm:w-auto px-4 py-2 bg-red-500/10 border border-red-500/30 hover:bg-red-500 hover:text-white text-red-500 text-xs font-black uppercase tracking-wider rounded-xl transition-all italic flex items-center justify-center gap-2"
                    >
                      <LogOut className="w-4 h-4" />
                      LOGOUT
                    </button>
                  )}
                </div>

                {/* Case 1: NOT LOGGED IN AS SUPER ADMIN -> LOGIN FORM */}
                {role !== 'super_admin' ? (
                  <div className="space-y-4">
                    <div className="text-center py-2">
                      <h3 className="text-lg font-bold text-white uppercase tracking-tight">Masuk Sebagai Super Admin</h3>
                      <p className="text-xs text-zinc-500 mt-1">Silakan masuk menggunakan email SCB untuk mengelola pengemudi & armada</p>
                    </div>

                    <form onSubmit={handleLoginSubmit} className="space-y-4 max-w-md mx-auto">
                      <div>
                        <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1.5">EMAIL OPERASIONAL</label>
                        <div className="relative">
                          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 w-4.5 h-4.5" />
                          <input 
                            type="email" 
                            placeholder="operasional.scb@gmail.com"
                            value={loginEmail}
                            onChange={(e) => setLoginEmail(e.target.value)}
                            className="w-full bg-zinc-950 border-2 border-zinc-800 text-white rounded-xl py-3 pl-11 pr-4 text-xs font-bold outline-none focus:border-amber-500/50 transition-all placeholder:text-zinc-700"
                            required
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1.5">PASSWORD</label>
                        <div className="relative">
                          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 w-4.5 h-4.5" />
                          <input 
                            type="password" 
                            placeholder="••••••••"
                            value={loginPassword}
                            onChange={(e) => setLoginPassword(e.target.value)}
                            className="w-full bg-zinc-950 border-2 border-zinc-800 text-white rounded-xl py-3 pl-11 pr-4 text-xs font-bold outline-none focus:border-amber-500/50 transition-all placeholder:text-zinc-700"
                          />
                        </div>
                        <p className="text-[10px] text-zinc-500 mt-1.5 italic">Gunakan email operasional.scb@gmail.com (Password default: admin123)</p>
                      </div>

                      {loginError && (
                        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-500 text-[11px] font-bold flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 shrink-0" />
                          <span>{loginError}</span>
                        </div>
                      )}

                      <div className="pt-2 flex flex-col gap-3">
                        <button 
                          type="submit"
                          disabled={isLoggingIn}
                          className="btn-primary w-full py-3.5 flex items-center justify-center gap-2 text-xs font-black uppercase italic tracking-widest"
                        >
                          <Key className="w-4 h-4" />
                          {isLoggingIn ? 'MEMPROSES...' : 'MASUK DENGAN EMAIL'}
                        </button>

                        <button 
                          type="button"
                          onClick={handleQuickLoginAdmin}
                          disabled={isLoggingIn}
                          className="w-full py-3.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border-2 border-dashed border-amber-500/40 rounded-xl text-xs font-black uppercase tracking-widest italic transition-all flex items-center justify-center gap-2"
                        >
                          <Shield className="w-4 h-4" />
                          MASUK CEPAT SUPER ADMIN
                        </button>

                        <div className="relative flex py-2 items-center">
                          <div className="flex-grow border-t border-zinc-800"></div>
                          <span className="flex-shrink mx-4 text-[10px] font-black text-zinc-600 uppercase tracking-wider">ATAU</span>
                          <div className="flex-grow border-t border-zinc-800"></div>
                        </div>

                        <button 
                          type="button"
                          onClick={async () => {
                            try {
                              await loginWithGoogle();
                            } catch (e) {
                              console.error(e);
                            }
                          }}
                          className="w-full py-3 bg-zinc-950 hover:bg-zinc-800 text-white border-2 border-zinc-800 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                        >
                          <Chrome className="w-4 h-4 text-amber-500" />
                          INTEGRASI GOOGLE SIGN-IN
                        </button>
                      </div>
                    </form>
                  </div>
                ) : (
                  /* Case 2: LOGGED IN AS SUPER ADMIN -> MANAGE DRIVERS PANEL */
                  <div className="space-y-6">
                    <div className="flex items-center gap-2 text-amber-500">
                      <Users className="w-5 h-5" />
                      <h3 className="text-sm font-black uppercase tracking-widest italic">Panel Pengelolaan Pengemudi SCB</h3>
                    </div>

                    {/* Form tambah driver baru */}
                    <form onSubmit={handleAddDriver} className="p-4 bg-zinc-950/30 border border-zinc-800 rounded-2xl space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1">Nama Lengkap</label>
                          <input 
                            type="text" 
                            placeholder="Contoh: Budi Santoso"
                            value={newDriverName}
                            onChange={(e) => setNewDriverName(e.target.value)}
                            className="w-full bg-zinc-950 border border-zinc-800 focus:border-amber-500/50 text-white rounded-xl py-2.5 px-4 text-xs font-bold outline-none transition-all"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1">Email Pengemudi</label>
                          <input 
                            type="email" 
                            placeholder="budi@scb.id"
                            value={newDriverEmail}
                            onChange={(e) => setNewDriverEmail(e.target.value)}
                            className="w-full bg-zinc-950 border border-zinc-800 focus:border-amber-500/50 text-white rounded-xl py-2.5 px-4 text-xs font-bold outline-none transition-all"
                            required
                          />
                        </div>
                      </div>
                      <div className="flex justify-end">
                        <button 
                          type="submit"
                          disabled={isAddingDriver}
                          className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-zinc-950 font-black uppercase tracking-wider text-[10px] rounded-lg transition-all italic flex items-center gap-1.5"
                        >
                          <Plus className="w-4 h-4" />
                          TAMBAH DRIVER
                        </button>
                      </div>
                    </form>

                    {/* Daftar Driver saat ini */}
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Daftar Driver Aktif ({drivers.length})</span>
                        <span className="text-[9px] font-mono text-zinc-600 italic">DATABASE CLOUD SYNCHRONIZED</span>
                      </div>

                      <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                        {drivers.map((driver) => (
                          <div key={driver.id} className="p-3.5 bg-zinc-950/70 border border-zinc-800 hover:border-zinc-700 rounded-xl flex justify-between items-center transition-all">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 text-amber-500 font-bold text-xs flex items-center justify-center uppercase">
                                {driver.name?.[0] || 'D'}
                              </div>
                              <div>
                                <p className="text-xs font-black text-white uppercase italic">{driver.name}</p>
                                <p className="text-[10px] text-zinc-500 font-mono">{driver.email}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-[9px] font-black bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 px-2 py-0.5 rounded-full uppercase">
                                {driver.status || 'Aktif'}
                              </span>
                              <button 
                                onClick={() => handleDeleteDriver(driver.id)}
                                className="p-1.5 bg-zinc-900 hover:bg-red-500/10 text-zinc-500 hover:text-red-500 border border-zinc-800 rounded-lg transition-all"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}

                        {drivers.length === 0 && (
                          <div className="text-center py-6 border border-dashed border-zinc-800 rounded-xl text-zinc-600 text-xs italic">
                            Sedang memuat data driver SCB...
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-5 border-t border-zinc-800 bg-zinc-950/40 flex justify-between items-center text-[10px] text-zinc-600 font-mono">
                <span>SCB OPERASIONAL MANAGEMENT PORTAL</span>
                <span>SECURED AES-256</span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
