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
  Chrome,
  Search,
  Filter,
  Check,
  Activity,
  Eye,
  Phone,
  Wrench,
  Sun,
  Moon,
  Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from './FirebaseProvider';
import { db } from '../lib/firebase';
import { collection, query, onSnapshot, addDoc, deleteDoc, doc, setDoc, where, getDocs } from 'firebase/firestore';

interface Permission {
  id: string;
  label: string;
  description: string;
}

const ROLE_PERMISSIONS: Record<string, string[]> = {
  driver: ['inspect_own', 'view_own_history'],
  inspector: ['inspect_all', 'edit_odometer', 'view_all_history'],
  admin: ['manage_fleet', 'view_all_history', 'send_notifications'],
  super_admin: ['manage_fleet', 'view_all_history', 'send_notifications', 'manage_accounts', 'edit_roles'],
};

const ALL_PERMISSIONS: Permission[] = [
  { id: 'inspect_own', label: 'Mengisi Inspeksi Mandiri', description: 'Mengisi laporan harian/mingguan armada yang ditugaskan' },
  { id: 'inspect_all', label: 'Inspeksi Semua Armada', description: 'Mengisi inspeksi untuk unit apa saja tanpa batasan' },
  { id: 'edit_odometer', label: 'Koreksi Odometer', description: 'Memperbarui dan mengoreksi data angka kilometer armada' },
  { id: 'view_own_history', label: 'Melihat Riwayat Pribadi', description: 'Melihat laporan inspeksi yang dikirim sendiri' },
  { id: 'view_all_history', label: 'Melihat Semua Riwayat', description: 'Akses penuh ke semua laporan historis armada' },
  { id: 'manage_fleet', label: 'Kelola Unit Fleet', description: 'Menambah, mengubah, dan menghapus armada SCB' },
  { id: 'send_notifications', label: 'Kirim Notifikasi', description: 'Mengirim peringatan dan informasi penting ke pengemudi' },
  { id: 'manage_accounts', label: 'Pengelolaan Akun', description: 'Menambah, menonaktifkan, dan menghapus akun pengguna' },
  { id: 'edit_roles', label: 'Modifikasi Hak Akses', description: 'Mengatur peran (role) dan memodifikasi izin akses sistem' },
];

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export default function Layout({ children, activeTab, setActiveTab }: LayoutProps) {
  const { user, role, loginWithEmail, registerWithEmail, loginWithGoogle, logout } = useAuth();
  const isGuest = user?.isAnonymous || !user;
  
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    if (saved) return saved === 'dark';
    return true; // default is dark mode
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.remove('light');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.add('light');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [newDriverName, setNewDriverName] = useState('');
  const [newDriverEmail, setNewDriverEmail] = useState('');
  const [newDriverPhone, setNewDriverPhone] = useState('');
  const [newDriverRole, setNewDriverRole] = useState<'driver' | 'inspector' | 'admin' | 'super_admin'>('driver');
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
  
  // Login states
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  
  // Registration states
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [registerName, setRegisterName] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerPhone, setRegisterPhone] = useState('');
  const [registerRole, setRegisterRole] = useState<'driver' | 'inspector' | 'admin'>('driver');
  const [registerError, setRegisterError] = useState('');
  const [isRegisteringProcess, setIsRegisteringProcess] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);

  const [isAddingDriver, setIsAddingDriver] = useState(false);
  const [addDriverError, setAddDriverError] = useState('');
  const [addDriverSuccess, setAddDriverSuccess] = useState('');

  const tabs = [
    { id: 'dashboard', label: 'Beranda', icon: LayoutDashboard },
    ...(!isGuest ? [{ id: 'inspect', label: 'Inspeksi', icon: ClipboardCheck }] : []),
    { id: 'history', label: 'Riwayat', icon: History },
    { id: 'notifications', label: 'Notifikasi', icon: Bell },
    { id: 'vehicles', label: 'Armada', icon: Truck },
    ...(!isGuest ? [{ id: 'repairs', label: 'Pemeliharaan', icon: Wrench }] : []),
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
              role: 'driver',
              addedAt: new Date().toISOString()
            });
            await addDoc(collection(db, 'drivers'), {
              name: 'Prasetyo Utomo',
              email: 'prasetyo.utomo@scb.id',
              phone: '0857-9876-5432',
              status: 'Aktif',
              role: 'driver',
              addedAt: new Date().toISOString()
            });
            await addDoc(collection(db, 'drivers'), {
              name: 'Bambang Triyono',
              email: 'bambang.inspector@scb.id',
              phone: '0813-8888-9999',
              status: 'Aktif',
              role: 'inspector',
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

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterError('');

    // Field-by-field client-side check to provide clean, explicit alerts
    const missing = [];
    if (!registerName.trim()) missing.push('Nama Lengkap');
    if (!registerEmail.trim()) missing.push('Alamat Email');
    if (!registerPhone.trim()) missing.push('Nomor Telepon');
    if (!registerPassword.trim()) missing.push('Password');

    if (missing.length > 0) {
      setRegisterError(`Mohon lengkapi seluruh kolom pendaftaran. Kolom berikut masih kosong: ${missing.join(', ')}`);
      return;
    }

    if (registerPassword.length < 6) {
      setRegisterError('Password harus minimal 6 karakter demi keamanan akun Anda.');
      return;
    }

    if (!registerEmail.includes('@') || !registerEmail.includes('.')) {
      setRegisterError('Format alamat email tidak valid.');
      return;
    }

    setIsRegisteringProcess(true);
    try {
      const result = await registerWithEmail(
        registerEmail,
        registerPassword,
        registerName,
        registerPhone,
        registerRole
      );
      if (result && result.pendingApproval) {
        setRegistrationSuccess(true);
      } else {
        setRegisterName('');
        setRegisterEmail('');
        setRegisterPassword('');
        setRegisterPhone('');
        setRegisterRole('driver');
        setIsRegisterMode(false);
        setIsAccountOpen(false);
      }
    } catch (err: any) {
      setRegisterError(err.message || 'Pendaftaran gagal. Silakan coba lagi.');
    } finally {
      setIsRegisteringProcess(false);
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
    setAddDriverError('');
    setAddDriverSuccess('');

    const missing = [];
    if (!newDriverName.trim()) missing.push('Nama Lengkap');
    if (!newDriverEmail.trim()) missing.push('Email Pengguna');

    if (missing.length > 0) {
      setAddDriverError(`Gagal menambah akun. Kolom berikut masih kosong: ${missing.join(', ')}`);
      return;
    }

    if (!newDriverEmail.includes('@') || !newDriverEmail.includes('.')) {
      setAddDriverError('Format email tidak valid.');
      return;
    }

    setIsAddingDriver(true);
    try {
      // Check duplicate in Firestore
      const q = query(collection(db, 'drivers'), where('email', '==', newDriverEmail.trim().toLowerCase()));
      const snap = await getDocs(q);
      if (!snap.empty) {
        setAddDriverError('Akun dengan alamat email tersebut sudah terdaftar.');
        setIsAddingDriver(false);
        return;
      }

      await addDoc(collection(db, 'drivers'), {
        name: newDriverName.trim(),
        email: newDriverEmail.trim().toLowerCase(),
        phone: newDriverPhone.trim() || '---',
        role: newDriverRole,
        status: 'Aktif',
        addedAt: new Date().toISOString()
      });
      
      setAddDriverSuccess(`Akun ${newDriverName} berhasil ditambahkan dengan peran ${newDriverRole}!`);
      setNewDriverName('');
      setNewDriverEmail('');
      setNewDriverPhone('');
      setNewDriverRole('driver');
    } catch (err: any) {
      console.error("Failed to add driver:", err);
      setAddDriverError(err.message || 'Gagal menyimpan akun ke database.');
    } finally {
      setIsAddingDriver(false);
    }
  };

  const handleUpdateDriverRole = async (id: string, newRole: string) => {
    try {
      await setDoc(doc(db, 'drivers', id), { role: newRole }, { merge: true });
    } catch (err) {
      console.error("Failed to update driver role:", err);
    }
  };

  const handleUpdateDriverStatus = async (id: string, newStatus: string) => {
    try {
      await setDoc(doc(db, 'drivers', id), { status: newStatus }, { merge: true });
    } catch (err) {
      console.error("Failed to update driver status:", err);
    }
  };

  const handleDeleteDriver = async (id: string) => {
    if (confirm('Hapus akun ini dari sistem?')) {
      try {
        await deleteDoc(doc(db, 'drivers', id));
        if (selectedDriverId === id) {
          setSelectedDriverId(null);
        }
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
              <span className="font-bold uppercase text-xs tracking-widest flex items-center gap-1.5">
                {tab.label}
                {tab.id === 'inspect' && isGuest && <Lock className="w-3.5 h-3.5 text-zinc-600" />}
              </span>
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
            <h1 className="text-sm font-black uppercase tracking-[0.2em] text-zinc-500">
              {activeTab === 'dashboard' ? 'Beranda' :
               activeTab === 'inspect' ? 'Inspeksi' :
               activeTab === 'history' ? 'Riwayat' :
               activeTab === 'notifications' ? 'Notifikasi' :
               activeTab === 'vehicles' ? 'Armada' :
               activeTab === 'repairs' ? 'Pemeliharaan' : activeTab}
            </h1>
            <p className="text-[10px] text-zinc-600 italic">V-CHECK SYSTEM V2.4</p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="w-10 h-10 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-center text-zinc-400 hover:text-white hover:border-amber-500/30 transition-all"
              title={isDarkMode ? "Mode Terang" : "Mode Gelap"}
            >
              {isDarkMode ? <Sun className="w-5 h-5 text-amber-500" /> : <Moon className="w-5 h-5 text-indigo-500" />}
            </button>
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
            <div className="relative">
              <tab.icon className="w-5 h-5" />
              {tab.id === 'inspect' && isGuest && (
                <div className="absolute -top-1.5 -right-1.5 bg-zinc-950 border border-zinc-800 rounded-full p-0.5">
                  <Lock className="w-2.5 h-2.5 text-zinc-500" />
                </div>
              )}
            </div>
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
              className={`relative w-full ${user && role === 'super_admin' ? 'max-w-4xl' : 'max-w-md'} bg-zinc-900 border-2 border-zinc-800 rounded-[32px] overflow-hidden shadow-2xl flex flex-col max-h-[85vh] z-10 transition-all duration-300`}
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

                {/* Case 1: NOT LOGGED IN AS SUPER ADMIN -> LOGIN / REGISTER FORM */}
                {role !== 'super_admin' ? (
                  <div className="space-y-6">
                    {/* Sliding tab toggle */}
                    <div className="flex bg-zinc-950 p-1.5 rounded-2xl border border-zinc-800 max-w-md mx-auto">
                      <button
                        type="button"
                        onClick={() => setIsRegisterMode(false)}
                        className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-wider italic transition-all ${
                          !isRegisterMode 
                            ? 'bg-amber-500 text-zinc-950 font-black' 
                            : 'text-zinc-500 hover:text-white'
                        }`}
                      >
                        MASUK AKUN
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsRegisterMode(true)}
                        className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-wider italic transition-all ${
                          isRegisterMode 
                            ? 'bg-amber-500 text-zinc-950 font-black' 
                            : 'text-zinc-500 hover:text-white'
                        }`}
                      >
                        DAFTAR AKUN
                      </button>
                    </div>

                    {isRegisterMode ? (
                      registrationSuccess ? (
                        <div className="text-center py-6 px-4 space-y-5 animate-fade-in">
                          <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/30 rounded-full flex items-center justify-center mx-auto text-amber-500">
                            <Clock className="w-8 h-8 animate-pulse" />
                          </div>
                          <div className="space-y-2">
                            <h3 className="text-lg font-black text-white uppercase italic tracking-tight">Pendaftaran Terkirim</h3>
                            <p className="text-xs text-zinc-400 leading-relaxed max-w-sm mx-auto">
                              Pendaftaran akun Anda berhasil disimpan ke cloud database dengan peran <span className="text-amber-400 font-bold uppercase">{registerRole}</span>.
                            </p>
                            <p className="text-xs text-zinc-400 leading-relaxed max-w-sm mx-auto">
                              Status Akun: <span className="text-amber-500 font-black uppercase italic">"Menunggu Persetujuan"</span> dari Super Admin. Anda dapat masuk setelah disetujui.
                            </p>
                          </div>
                          <div className="bg-zinc-950/50 p-4 rounded-xl border border-zinc-800 text-left space-y-1.5 max-w-xs mx-auto">
                            <p className="text-[9px] text-zinc-500 font-black uppercase">Detail Akun Anda</p>
                            <p className="text-xs font-bold text-zinc-300">Nama: {registerName}</p>
                            <p className="text-xs font-mono text-zinc-400">Email: {registerEmail}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setRegistrationSuccess(false);
                              setRegisterName('');
                              setRegisterEmail('');
                              setRegisterPassword('');
                              setRegisterPhone('');
                              setRegisterRole('driver');
                              setIsRegisterMode(false);
                            }}
                            className="btn-primary px-8 py-2.5 text-xs font-black uppercase tracking-wider italic rounded-xl"
                          >
                            KEMBALI KE MASUK
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="text-center py-1">
                            <h3 className="text-lg font-black text-white uppercase tracking-tight italic">Registrasi Akun Baru</h3>
                            <p className="text-xs text-zinc-500 mt-1">Buat akun Driver, Inspector, atau Admin Anda untuk terintegrasi dengan armada SCB</p>
                          </div>

                          <form onSubmit={handleRegisterSubmit} className="space-y-4 max-w-md mx-auto">
                            <div>
                              <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1.5">NAMA LENGKAP</label>
                              <div className="relative">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 w-4.5 h-4.5" />
                                <input 
                                  type="text" 
                                  placeholder="Contoh: Ahmad Jayadi"
                                  value={registerName}
                                  onChange={(e) => setRegisterName(e.target.value)}
                                  className="w-full bg-zinc-950 border-2 border-zinc-800 text-white rounded-xl py-3 pl-11 pr-4 text-xs font-bold outline-none focus:border-amber-500/50 transition-all placeholder:text-zinc-700"
                                  required
                                />
                              </div>
                            </div>

                            <div>
                              <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1.5">ALAMAT EMAIL</label>
                              <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 w-4.5 h-4.5" />
                                <input 
                                  type="email" 
                                  placeholder="driver@scb.id"
                                  value={registerEmail}
                                  onChange={(e) => setRegisterEmail(e.target.value)}
                                  className="w-full bg-zinc-950 border-2 border-zinc-800 text-white rounded-xl py-3 pl-11 pr-4 text-xs font-bold outline-none focus:border-amber-500/50 transition-all placeholder:text-zinc-700"
                                  required
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1.5">NOMOR TELEPON</label>
                                <div className="relative">
                                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 w-4.5 h-4.5" />
                                  <input 
                                    type="tel" 
                                    placeholder="0812xxxxxx"
                                    value={registerPhone}
                                    onChange={(e) => setRegisterPhone(e.target.value)}
                                    className="w-full bg-zinc-950 border-2 border-zinc-800 text-white rounded-xl py-3 pl-11 pr-4 text-xs font-bold outline-none focus:border-amber-500/50 transition-all placeholder:text-zinc-700"
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
                                    value={registerPassword}
                                    onChange={(e) => setRegisterPassword(e.target.value)}
                                    className="w-full bg-zinc-950 border-2 border-zinc-800 text-white rounded-xl py-3 pl-11 pr-4 text-xs font-bold outline-none focus:border-amber-500/50 transition-all placeholder:text-zinc-700"
                                    required
                                  />
                                </div>
                              </div>
                            </div>

                            <div>
                              <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1.5">PERAN (ROLE) AKSES</label>
                              <select 
                                value={registerRole}
                                onChange={(e) => setRegisterRole(e.target.value as any)}
                                className="w-full bg-zinc-950 border-2 border-zinc-800 text-white rounded-xl py-3 px-4 text-xs font-bold outline-none focus:border-amber-500/50 transition-all appearance-none cursor-pointer"
                              >
                                <option value="driver">DRIVER (Pengemudi Armada)</option>
                                <option value="inspector">INSPECTOR (Pemeriksa Teknis)</option>
                                <option value="admin">ADMIN (Staf Operasional)</option>
                              </select>
                            </div>

                            {/* Pembagian Role dan Deskripsi Hak Akses */}
                            <div className="p-3 bg-zinc-950/60 rounded-xl border border-zinc-850 text-[10px] space-y-2 mt-2">
                              <p className="font-black text-amber-500 uppercase tracking-widest italic">Deskripsi Hak Akses Peran:</p>
                              <div className="grid grid-cols-1 gap-2 divide-y divide-zinc-900">
                                <div className="pt-1.5 first:pt-0 text-left">
                                  <p className="font-bold text-white uppercase tracking-wider">Driver (Pengemudi)</p>
                                  <p className="text-zinc-500 leading-relaxed">Mengisi laporan inspeksi mandiri harian/mingguan untuk unit armada yang ditugaskan dan melihat riwayat laporan pribadinya.</p>
                                </div>
                                <div className="pt-1.5 text-left">
                                  <p className="font-bold text-blue-400 uppercase tracking-wider">Inspector (Pemeriksa Teknis)</p>
                                  <p className="text-zinc-500 leading-relaxed">Melakukan inspeksi mendalam untuk seluruh unit armada, mengoreksi data odometer, serta melihat semua riwayat laporan.</p>
                                </div>
                                <div className="pt-1.5 text-left">
                                  <p className="font-bold text-purple-400 uppercase tracking-wider">Admin (Staf Operasional)</p>
                                  <p className="text-zinc-500 leading-relaxed">Mengelola unit fleet (tambah, edit, hapus), melihat semua riwayat laporan, serta mengirimkan notifikasi penting ke driver.</p>
                                </div>
                              </div>
                            </div>

                            {registerError && (
                              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-500 text-[11px] font-bold flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4 shrink-0" />
                                <span>{registerError}</span>
                              </div>
                            )}

                            <div className="pt-2">
                              <button 
                                type="submit"
                                disabled={isRegisteringProcess}
                                className="btn-primary w-full py-3.5 flex items-center justify-center gap-2 text-xs font-black uppercase italic tracking-widest"
                              >
                                <Plus className="w-4 h-4" />
                                {isRegisteringProcess ? 'MENDAFTARKAN...' : 'DAFTARKAN AKUN BARU'}
                              </button>
                            </div>
                          </form>
                        </div>
                      )
                    ) : (
                      <div className="space-y-4">
                        <div className="text-center py-1">
                          <h3 className="text-lg font-black text-white uppercase tracking-tight italic">Masuk ke Sistem</h3>
                          <p className="text-xs text-zinc-500 mt-1">Silakan masuk menggunakan email dan password Anda untuk sinkronisasi data</p>
                        </div>

                        <form onSubmit={handleLoginSubmit} className="space-y-4 max-w-md mx-auto">
                          <div>
                            <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1.5">EMAIL OPERASIONAL / DRIVER</label>
                            <div className="relative">
                              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 w-4.5 h-4.5" />
                              <input 
                                type="email" 
                                placeholder="operasional.scb@gmail.com atau driver@scb.id"
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
                            <p className="text-[10px] text-zinc-500 mt-1.5 italic">Gunakan password Anda (Password default: admin123)</p>
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
                    )}
                  </div>
                ) : (
                  /* Case 2: LOGGED IN AS SUPER ADMIN -> ADVANCED ACCOUNT & ACCESS CONTROL MANAGEMENT */
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start h-[55vh]">
                    {/* Left Column: Accounts Directory (5 cols) */}
                    <div className="lg:col-span-5 flex flex-col h-full bg-zinc-950/20 border border-zinc-800 rounded-2xl overflow-hidden p-4 space-y-4">
                      {/* Search & Filter Header */}
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
                            <Activity className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                            Direktori Akun ({(
                              drivers.filter(driver => {
                                const matchesSearch = 
                                  driver.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                  driver.email?.toLowerCase().includes(searchQuery.toLowerCase());
                                const driverRole = driver.role || 'driver';
                                const matchesRole = roleFilter === 'all' || driverRole === roleFilter;
                                const matchesStatus = statusFilter === 'all' || (driver.status || 'Aktif') === statusFilter;
                                return matchesSearch && matchesRole && matchesStatus;
                              })
                            ).length})
                          </span>
                          <button
                            onClick={() => setSelectedDriverId(null)}
                            className="text-[9px] font-bold text-amber-500 hover:text-amber-400 uppercase tracking-widest flex items-center gap-1"
                          >
                            <Plus className="w-3 h-3" /> Tambah Baru
                          </button>
                        </div>

                        {/* Search Input */}
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600 w-3.5 h-3.5" />
                          <input
                            type="text"
                            placeholder="Cari nama atau email..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-xl py-2 pl-9 pr-4 text-xs font-medium outline-none focus:border-amber-500/50 transition-all placeholder:text-zinc-700"
                          />
                        </div>

                        {/* Filter row */}
                        <div className="grid grid-cols-2 gap-2">
                          <div className="relative">
                            <select
                              value={roleFilter}
                              onChange={(e) => setRoleFilter(e.target.value)}
                              className="w-full bg-zinc-950 text-zinc-400 font-bold text-[9px] outline-none border border-zinc-800 px-2 py-1.5 rounded-lg cursor-pointer appearance-none uppercase"
                            >
                              <option value="all">Semua Peran</option>
                              <option value="driver">Driver</option>
                              <option value="inspector">Inspector</option>
                              <option value="admin">Admin</option>
                              <option value="super_admin">Super Admin</option>
                            </select>
                          </div>
                          <div className="relative">
                            <select
                              value={statusFilter}
                              onChange={(e) => setStatusFilter(e.target.value)}
                              className="w-full bg-zinc-950 text-zinc-400 font-bold text-[9px] outline-none border border-zinc-800 px-2 py-1.5 rounded-lg cursor-pointer appearance-none uppercase"
                            >
                              <option value="all">Semua Status</option>
                              <option value="Aktif">Aktif</option>
                              <option value="Menunggu Persetujuan">Menunggu Persetujuan</option>
                              <option value="Nonaktif">Nonaktif</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      {/* Scrollable list */}
                      <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[35vh]">
                        {drivers
                          .filter(driver => {
                            const matchesSearch = 
                              driver.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                              driver.email?.toLowerCase().includes(searchQuery.toLowerCase());
                            const driverRole = driver.role || 'driver';
                            const matchesRole = roleFilter === 'all' || driverRole === roleFilter;
                            const matchesStatus = statusFilter === 'all' || (driver.status || 'Aktif') === statusFilter;
                            return matchesSearch && matchesRole && matchesStatus;
                          })
                          .map((driver) => {
                            const driverRole = driver.role || 'driver';
                            const isSelected = selectedDriverId === driver.id;
                            return (
                              <div
                                key={driver.id}
                                onClick={() => setSelectedDriverId(driver.id)}
                                className={`p-3 bg-zinc-950/60 border rounded-xl flex items-center justify-between cursor-pointer transition-all hover:border-zinc-700 ${
                                  isSelected ? 'border-amber-500/50 bg-amber-500/[0.02]' : 'border-zinc-800'
                                }`}
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div className={`w-8 h-8 rounded-lg font-black text-xs flex items-center justify-center uppercase shrink-0 ${
                                    isSelected ? 'bg-amber-500 text-zinc-950' : 'bg-zinc-900 border border-zinc-800 text-zinc-400'
                                  }`}>
                                    {driver.name?.[0] || 'A'}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-xs font-black text-white uppercase italic truncate">{driver.name}</p>
                                    <p className="text-[9px] text-zinc-500 font-mono truncate">{driver.email}</p>
                                  </div>
                                </div>

                                <div className="flex flex-col items-end gap-1 shrink-0">
                                  <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-wider ${
                                    driverRole === 'super_admin' ? 'bg-red-500/10 text-red-500 border border-red-500/20' :
                                    driverRole === 'admin' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' :
                                    driverRole === 'inspector' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                                    'bg-zinc-800 text-zinc-400 border border-zinc-700'
                                  }`}>
                                    {driverRole === 'super_admin' ? 'Super Admin' : 
                                     driverRole === 'admin' ? 'Admin' : 
                                     driverRole === 'inspector' ? 'Inspector' : 'Driver'}
                                  </span>
                                  <span className={`text-[8px] font-bold ${
                                    (driver.status || 'Aktif') === 'Aktif' ? 'text-emerald-500' : 
                                    (driver.status || 'Aktif') === 'Menunggu Persetujuan' ? 'text-amber-500 animate-pulse font-black' : 
                                    'text-zinc-500'
                                  }`}>
                                    ● {driver.status || 'Aktif'}
                                  </span>
                                </div>
                              </div>
                            );
                          })}

                        {drivers.filter(driver => {
                          const matchesSearch = 
                            driver.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            driver.email?.toLowerCase().includes(searchQuery.toLowerCase());
                          const driverRole = driver.role || 'driver';
                          const matchesRole = roleFilter === 'all' || driverRole === roleFilter;
                          const matchesStatus = statusFilter === 'all' || (driver.status || 'Aktif') === statusFilter;
                          return matchesSearch && matchesRole && matchesStatus;
                        }).length === 0 && (
                          <div className="text-center py-8 border border-dashed border-zinc-800 rounded-xl text-zinc-600 text-xs italic">
                            Tidak ada akun yang cocok.
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right Column: Add/Details & Matrix View (7 cols) */}
                    <div className="lg:col-span-7 h-full flex flex-col bg-zinc-950/20 border border-zinc-800 rounded-2xl p-4 overflow-y-auto space-y-4 max-h-[55vh]">
                      {drivers.find(d => d.id === selectedDriverId) ? (
                        /* Selected Driver Details & Matrix Mode */
                        (() => {
                          const selectedDriver = drivers.find(d => d.id === selectedDriverId);
                          return (
                            <div className="space-y-4">
                              {/* Header Detail */}
                              <div className="flex justify-between items-start pb-3 border-b border-zinc-800">
                                <div className="min-w-0 flex-1 pr-4">
                                  <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest">Detail Akun & Peran</span>
                                  <h4 className="text-base font-black text-white uppercase italic truncate">{selectedDriver.name}</h4>
                                  <p className="text-[10px] text-zinc-400 font-mono truncate">{selectedDriver.email}</p>
                                </div>
                                <button
                                  onClick={() => handleDeleteDriver(selectedDriver.id)}
                                  className="px-2.5 py-1.5 bg-red-500/10 border border-red-500/20 hover:bg-red-500 hover:text-zinc-950 text-red-500 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all flex items-center gap-1 shrink-0"
                                  title="Hapus Akun"
                                >
                                  <Trash2 className="w-3.5 h-3.5" /> HAPUS
                                </button>
                              </div>

                              {/* Quick Edit Panel */}
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1.5">Hak Akses Peran (Role)</label>
                                  <select
                                    value={selectedDriver.role || 'driver'}
                                    onChange={(e) => handleUpdateDriverRole(selectedDriver.id, e.target.value)}
                                    className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-xl py-2 px-3 text-xs font-bold outline-none focus:border-amber-500/50 transition-all cursor-pointer"
                                  >
                                    <option value="driver">Driver (Pengemudi)</option>
                                    <option value="inspector">Inspector (Pemeriksa)</option>
                                    <option value="admin">Admin Operasional</option>
                                    <option value="super_admin">Super Admin</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1.5">Status Akun</label>
                                  <select
                                    value={selectedDriver.status || 'Aktif'}
                                    onChange={(e) => handleUpdateDriverStatus(selectedDriver.id, e.target.value)}
                                    className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-xl py-2 px-3 text-xs font-bold outline-none focus:border-amber-500/50 transition-all cursor-pointer"
                                  >
                                    <option value="Aktif">Aktif</option>
                                    <option value="Menunggu Persetujuan">Menunggu Persetujuan</option>
                                    <option value="Nonaktif">Nonaktif</option>
                                  </select>
                                </div>
                              </div>

                              {/* Details info block */}
                              <div className="bg-zinc-950/40 p-3 rounded-xl border border-zinc-850 grid grid-cols-2 gap-2 text-left">
                                <div>
                                  <p className="text-[8px] font-black text-zinc-500 uppercase">Nomor Telepon</p>
                                  <p className="text-xs font-bold text-zinc-300">{selectedDriver.phone || '---'}</p>
                                </div>
                                <div>
                                  <p className="text-[8px] font-black text-zinc-500 uppercase">Ditambahkan Pada</p>
                                  <p className="text-xs font-mono text-zinc-400">
                                    {selectedDriver.addedAt ? new Date(selectedDriver.addedAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '---'}
                                  </p>
                                </div>
                              </div>

                              {/* Quick Approval Action Box */}
                              {selectedDriver.status === 'Menunggu Persetujuan' && (
                                <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
                                  <div className="space-y-1 text-left">
                                    <p className="text-xs font-black text-amber-500 uppercase tracking-widest italic flex items-center gap-1.5">
                                      <Clock className="w-4 h-4 animate-pulse" /> MENUNGGU PERSETUJUAN
                                    </p>
                                    <p className="text-[10px] text-zinc-400 leading-relaxed">
                                      Akun ini tidak dapat mengakses sistem sebelum Anda menyetujui pendaftarannya.
                                    </p>
                                  </div>
                                  <div className="flex gap-2 w-full sm:w-auto shrink-0">
                                    <button
                                      onClick={() => handleUpdateDriverStatus(selectedDriver.id, 'Aktif')}
                                      className="flex-1 sm:flex-none px-4 py-2 bg-emerald-500 hover:bg-emerald-650 text-zinc-950 font-black text-[10px] uppercase tracking-widest rounded-xl transition-all"
                                    >
                                      SETUJUI AKUN
                                    </button>
                                    <button
                                      onClick={() => handleDeleteDriver(selectedDriver.id)}
                                      className="flex-1 sm:flex-none px-4 py-2 bg-red-500/10 border border-red-500/30 hover:bg-red-500 hover:text-zinc-950 text-red-500 font-black text-[10px] uppercase tracking-widest rounded-xl transition-all"
                                    >
                                      TOLAK
                                    </button>
                                  </div>
                                </div>
                              )}

                              {/* Access Rights Matrix */}
                              <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                  <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Matriks Hak Akses & Izin</span>
                                  <span className="text-[9px] text-amber-500 font-mono uppercase font-black italic">
                                    Peran: {selectedDriver.role || 'driver'}
                                  </span>
                                </div>

                                <div className="border border-zinc-850 rounded-xl overflow-hidden bg-zinc-950/40 divide-y divide-zinc-900">
                                  {ALL_PERMISSIONS.map((perm) => {
                                    const driverRole = selectedDriver.role || 'driver';
                                    const hasPermission = ROLE_PERMISSIONS[driverRole]?.includes(perm.id);
                                    return (
                                      <div key={perm.id} className="p-2.5 flex items-start justify-between gap-3 text-left">
                                        <div className="min-w-0">
                                          <p className={`text-xs font-black uppercase tracking-tight ${hasPermission ? 'text-zinc-200' : 'text-zinc-600 line-through'}`}>
                                            {perm.label}
                                          </p>
                                          <p className="text-[9px] text-zinc-500 font-medium leading-relaxed">
                                            {perm.description}
                                          </p>
                                        </div>
                                        <div className="shrink-0 pt-0.5">
                                          {hasPermission ? (
                                            <div className="w-4 h-4 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center">
                                              <Check className="w-2.5 h-2.5" />
                                            </div>
                                          ) : (
                                            <div className="w-4 h-4 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-700 flex items-center justify-center text-[8px] font-bold">
                                              ✕
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          );
                        })()
                      ) : (
                        /* Add User Form Mode */
                        <div className="space-y-4">
                          <div className="pb-3 border-b border-zinc-800">
                            <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest">Registrasi Akun Baru</span>
                            <h4 className="text-base font-black text-white uppercase italic">Tambah Pengguna & Peran</h4>
                            <p className="text-[10px] text-zinc-400">Daftarkan akun operasional baru ke cloud database.</p>
                          </div>

                          <form onSubmit={handleAddDriver} className="space-y-3">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <label className="block text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1">Nama Lengkap</label>
                                <input
                                  type="text"
                                  placeholder="Contoh: Budi Santoso"
                                  value={newDriverName}
                                  onChange={(e) => setNewDriverName(e.target.value)}
                                  className="w-full bg-zinc-950 border border-zinc-800 focus:border-amber-500/50 text-white rounded-xl py-2 px-3 text-xs font-bold outline-none transition-all placeholder:text-zinc-700"
                                  required
                                />
                              </div>
                              <div>
                                <label className="block text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1">Email Pengguna</label>
                                <input
                                  type="email"
                                  placeholder="budi@scb.id"
                                  value={newDriverEmail}
                                  onChange={(e) => setNewDriverEmail(e.target.value)}
                                  className="w-full bg-zinc-950 border border-zinc-800 focus:border-amber-500/50 text-white rounded-xl py-2 px-3 text-xs font-bold outline-none transition-all placeholder:text-zinc-700"
                                  required
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <label className="block text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1">Nomor Telepon</label>
                                <input
                                  type="text"
                                  placeholder="Contoh: 0812-xxxx-xxxx"
                                  value={newDriverPhone}
                                  onChange={(e) => setNewDriverPhone(e.target.value)}
                                  className="w-full bg-zinc-950 border border-zinc-800 focus:border-amber-500/50 text-white rounded-xl py-2 px-3 text-xs font-bold outline-none transition-all placeholder:text-zinc-700"
                                />
                              </div>
                              <div>
                                <label className="block text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1">Pilih Hak Akses (Role)</label>
                                <select
                                  value={newDriverRole}
                                  onChange={(e) => setNewDriverRole(e.target.value as any)}
                                  className="w-full bg-zinc-950 text-white font-black text-xs outline-none border border-zinc-800 hover:border-amber-500/50 px-3 py-2 rounded-xl cursor-pointer transition-colors"
                                >
                                  <option value="driver">Driver (Pengemudi)</option>
                                  <option value="inspector">Inspector (Pemeriksa)</option>
                                  <option value="admin">Admin Operasional</option>
                                  <option value="super_admin">Super Admin</option>
                                </select>
                              </div>
                            </div>

                            {/* Dynamically preview permissions matrix for new role */}
                            <div className="bg-zinc-950/40 p-3 rounded-xl border border-zinc-800 space-y-1.5 text-left">
                              <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">
                                Izin Terkait Peran ({newDriverRole}):
                              </span>
                              <div className="flex flex-wrap gap-1.5">
                                {ALL_PERMISSIONS.map((perm) => {
                                  const hasPermission = ROLE_PERMISSIONS[newDriverRole]?.includes(perm.id);
                                  if (!hasPermission) return null;
                                  return (
                                    <span key={perm.id} className="text-[8px] font-black bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2 py-1 rounded-md uppercase">
                                      {perm.label}
                                    </span>
                                  );
                                })}
                              </div>
                            </div>

                            {addDriverError && (
                              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-500 text-[11px] font-bold flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4 shrink-0" />
                                <span>{addDriverError}</span>
                              </div>
                            )}

                            {addDriverSuccess && (
                              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-[11px] font-bold flex items-center gap-2">
                                <Check className="w-4 h-4 shrink-0" />
                                <span>{addDriverSuccess}</span>
                              </div>
                            )}

                            <div className="flex justify-end pt-1">
                              <button
                                type="submit"
                                disabled={isAddingDriver}
                                className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-zinc-950 font-black uppercase tracking-wider text-[10px] rounded-xl transition-all italic flex items-center gap-1.5"
                              >
                                <Plus className="w-4 h-4" />
                                {isAddingDriver ? 'MENAMBAHKAN...' : 'TAMBAH AKUN BARU'}
                              </button>
                            </div>
                          </form>
                        </div>
                      )}
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
