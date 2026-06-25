/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import Inspect from './components/Inspect';
import History from './components/History';
import Notifications from './components/Notifications';
import Vehicles from './components/Vehicles';
import { FirebaseProvider, useAuth } from './components/FirebaseProvider';

function AppContent() {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isInspecting, setIsInspecting] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const renderContent = () => {
    if (isInspecting) {
      return <Inspect onCancel={() => setIsInspecting(false)} />;
    }

    switch (activeTab) {
      case 'dashboard':
        return <Dashboard onStartInspect={() => setIsInspecting(true)} />;
      case 'inspect':
        return <Inspect onCancel={() => setActiveTab('dashboard')} />;
      case 'history':
        return <History />;
      case 'notifications':
        return <Notifications />;
      case 'vehicles':
        return <Vehicles />;
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
