/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Truck, Calendar, Activity, AlertTriangle, ChevronRight } from 'lucide-react';
import { useAuth } from './FirebaseProvider';
import { db } from '../lib/firebase';
import { collection, query, onSnapshot, where } from 'firebase/firestore';

export default function Dashboard({ onStartInspect }: { onStartInspect: () => void }) {
  const { user } = useAuth();
  const [vehicles, setVehicles] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'vehicles'), where('userId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setVehicles(docs);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const currentVehicle = vehicles[0] || { plateNumber: '---', brand: 'No Units', model: 'Found', lastOdometer: 0 };

  return (
    <div className="grid grid-cols-12 auto-rows-min gap-4">
      {/* Welcome Area */}
      <div className="col-span-12 lg:col-span-8 flex items-center gap-6 mb-4 bento-card border-none bg-transparent !p-0">
        <div className="w-16 h-16 rounded-[24px] bg-amber-500 flex items-center justify-center text-zinc-950 font-black text-2xl shadow-xl shadow-amber-500/20">
          {user?.displayName?.[0] || 'D'}
        </div>
        <div>
          <h2 className="text-3xl font-black tracking-tighter text-white uppercase italic">Dashboard</h2>
          <p className="text-zinc-500 font-mono text-xs">{user?.email}</p>
        </div>
      </div>

      <div className="col-span-12 lg:col-span-4 flex items-center justify-end mb-4">
         <div className="bg-zinc-900 border border-zinc-800 px-4 py-2 rounded-2xl flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">System Online</span>
         </div>
      </div>

      {/* Vehicle Status Card - Main Bento Item */}
      <div className="col-span-12 lg:col-span-8 bento-card flex flex-col justify-between group overflow-hidden relative min-h-[320px]">
        <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity">
           <Truck className="w-64 h-64 -rotate-12 translate-x-12 translate-y-12" />
        </div>
        
        <div className="relative z-10">
          <div className="flex justify-between items-start mb-6">
            <span className="px-3 py-1 bg-amber-500/10 text-amber-500 text-[10px] font-black uppercase rounded-full border border-amber-500/20 tracking-widest">Active Unit</span>
            <p className="text-zinc-500 text-[10px] italic font-mono uppercase">Update Terakhir: 07:45</p>
          </div>
          <h2 className="text-5xl font-black text-white tracking-tighter mb-2 italic">{currentVehicle.plateNumber}</h2>
          {vehicles.length > 0 ? (
            <p className="text-zinc-400 font-bold uppercase tracking-widest text-sm">{currentVehicle.brand} {currentVehicle.model}</p>
          ) : (
            <p className="text-amber-500 font-black uppercase tracking-widest text-sm animate-pulse">TAMBAH UNIT DI MENU FLEET</p>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mt-8 relative z-10">
          <button 
            onClick={onStartInspect}
            className="btn-primary py-5 flex-1 flex items-center justify-center gap-3 text-lg italic"
          >
            <Activity className="w-6 h-6" />
            MULAI INSPEKSI
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="col-span-12 md:col-span-6 lg:col-span-4 bento-row flex flex-col gap-4">
        <div className="bento-card flex flex-col justify-between h-40">
           <div className="flex justify-between items-center">
              <span className="text-[10px] text-zinc-500 uppercase font-black tracking-widest">Odometer</span>
              <Truck className="w-4 h-4 text-zinc-700" />
           </div>
           <div>
              <p className="text-3xl font-black font-mono text-amber-500 tracking-tighter">{currentVehicle.lastOdometer.toLocaleString()}</p>
              <p className="text-xs text-zinc-600 font-bold uppercase">KILOMETER TOTAL</p>
           </div>
        </div>

        <div className="bento-card flex flex-col justify-between h-40 bg-zinc-950 border-zinc-800 border-dashed">
           <div className="flex justify-between items-center">
              <span className="text-[10px] text-zinc-500 uppercase font-black tracking-widest">Status Unit</span>
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
           </div>
           <div>
              <p className="text-3xl font-black text-white tracking-tighter italic uppercase">Ready</p>
              <p className="text-xs text-zinc-600 font-bold uppercase italic">Laik Operasi</p>
           </div>
        </div>
      </div>

      {/* Grid Stats (Small Bento) */}
      <div className="col-span-12 md:col-span-6 lg:col-span-4 bento-card !p-5 flex items-center gap-5">
        <div className="w-14 h-14 bg-zinc-950 border border-zinc-800 rounded-2xl flex items-center justify-center">
          <Calendar className="text-amber-500 w-6 h-6" />
        </div>
        <div>
          <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">Next Schedule</p>
          <p className="text-xl font-black text-white italic">25 APR 2026</p>
          <p className="text-[9px] text-amber-500/60 font-black uppercase tracking-tighter">Pemeriksaan Mingguan</p>
        </div>
      </div>

      <div className="col-span-12 md:col-span-6 lg:col-span-4 bento-card !p-5 flex items-center gap-5 border-l-4 border-l-red-500">
        <div className="w-14 h-14 bg-zinc-950 border border-zinc-800 rounded-2xl flex items-center justify-center">
          <AlertTriangle className="text-red-500 w-6 h-6" />
        </div>
        <div>
          <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">Issues Found</p>
          <p className="text-xl font-black text-white">0 ACTIVE</p>
          <p className="text-[9px] text-zinc-600 font-bold font-mono">Last issue: 12 April</p>
        </div>
      </div>

      <div className="col-span-12 md:col-span-6 lg:col-span-4 bento-card !p-5 flex items-center gap-5">
        <div className="w-14 h-14 bg-amber-500 rounded-2xl flex items-center justify-center">
          <ChevronRight className="text-zinc-900 w-6 h-6" />
        </div>
        <div>
          <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">Total Reports</p>
          <p className="text-xl font-black text-white tracking-widest">14 <span className="text-sm">/ BLN</span></p>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="col-span-12 mt-8">
        <h3 className="text-xs font-black uppercase tracking-[0.3em] text-zinc-700 mb-6 px-2">Recent Logs</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((_, i) => (
               <div key={i} className="bento-card !p-4 !rounded-2xl flex items-center justify-between hover:border-amber-500/50 cursor-pointer group bg-zinc-900/40">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-zinc-950 flex items-center justify-center border border-zinc-800 shadow-inner group-hover:border-zinc-700">
                        <Truck className="w-5 h-5 text-zinc-600 group-hover:text-amber-500 transition-colors" />
                    </div>
                    <div>
                        <p className="text-xs font-black text-zinc-200 uppercase tracking-widest group-hover:text-white">Inspeksi Harian</p>
                        <p className="text-[10px] font-mono text-zinc-600 uppercase">23 Apr • 07:45 AM</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-[9px] px-2 py-0.5 rounded-full bg-green-500/10 text-green-500 font-black uppercase border border-green-500/20">Clean</span>
                    <ChevronRight className="w-4 h-4 text-zinc-800 group-hover:text-amber-500 transition-all group-hover:translate-x-1" />
                  </div>
               </div>
            ))}
        </div>
      </div>
    </div>
  );
}
