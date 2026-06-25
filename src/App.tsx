/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import Inspect from './components/Inspect';
import History from './components/History';
import Notifications from './components/Notifications';
import Vehicles from './components/Vehicles';
import Repairs from './components/Repairs';
import { FirebaseProvider, useAuth } from './components/FirebaseProvider';

function AppContent() {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isInspecting, setIsInspecting] = useState(false);

  const isGuest = user?.isAnonymous || !user;

  useEffect(() => {
    if (isGuest && (activeTab === 'repairs' || activeTab === 'inspect')) {
      setActiveTab('dashboard');
    }
    if (isGuest && isInspecting) {
      setIsInspecting(false);
    }
  }, [isGuest, activeTab, isInspecting]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const renderContent = () => {
    if (isInspecting) {
      if (isGuest) {
        return (
          <div className="p-8 bento-card border border-zinc-800 text-center space-y-4">
            <h2 className="text-xl font-black text-red-500 uppercase">AKSES DITOLAK</h2>
            <p className="text-zinc-400">Tamu tidak diberikan akses untuk mengisi atau mengirimkan formulir inspeksi baru.</p>
          </div>
        );
      }
      return <Inspect onCancel={() => setIsInspecting(false)} />;
    }

    switch (activeTab) {
      case 'dashboard':
        return <Dashboard onStartInspect={() => {
          if (!isGuest) {
            setIsInspecting(true);
          }
        }} />;
      case 'inspect':
        if (isGuest) {
          return (
            <div className="p-8 bento-card border border-zinc-800 text-center space-y-4">
              <h2 className="text-xl font-black text-red-500 uppercase">AKSES DITOLAK</h2>
              <p className="text-zinc-400">Tamu tidak diberikan akses untuk mengisi atau mengirimkan formulir inspeksi baru.</p>
            </div>
          );
        }
        return <Inspect onCancel={() => setActiveTab('dashboard')} />;
      case 'history':
        return <History />;
      case 'notifications':
        return <Notifications />;
      case 'vehicles':
        return <Vehicles />;
      case 'repairs':
        if (isGuest) {
          return (
            <div className="p-8 bento-card border border-zinc-800 text-center space-y-4">
              <h2 className="text-xl font-black text-red-500 uppercase">AKSES DITOLAK</h2>
              <p className="text-zinc-400">Tamu tidak diberikan akses untuk memonitoring atau mengelola perbaikan (maintenance).</p>
            </div>
          );
        }
        return <Repairs />;
      default:
        return <Dashboard onStartInspect={() => setIsInspecting(true)} />;
    }
  };

  return (
    <Layout 
      activeTab={isInspecting ? 'inspect' : activeTab} 
      setActiveTab={(tab) => {
        setIsInspecting(false);
        setActiveTab(tab);
      }}
    >
      {renderContent()}
    </Layout>
  );
}

export default function App() {
  return (
    <FirebaseProvider>
      <AppContent />
    </FirebaseProvider>
  );
}
