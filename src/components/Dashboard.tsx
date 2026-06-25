/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Truck, Calendar, Activity, AlertTriangle, ChevronRight, TrendingUp, BarChart3, Sparkles, Lock } from 'lucide-react';
import { useAuth } from './FirebaseProvider';
import { db } from '../lib/firebase';
import { collection, query, onSnapshot } from 'firebase/firestore';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from 'recharts';

export default function Dashboard({ onStartInspect }: { onStartInspect: () => void }) {
  const { user } = useAuth();
  const [vehicles, setVehicles] = React.useState<any[]>([]);
  const [reports, setReports] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const qV = query(collection(db, 'vehicles'));
    const unsubscribeV = onSnapshot(qV, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setVehicles(docs);
    });

    const qR = query(collection(db, 'reports'));
    const unsubscribeR = onSnapshot(qR, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setReports(docs);
      setLoading(false);
    });

    return () => {
      unsubscribeV();
      unsubscribeR();
    };
  }, []);

  const currentVehicle = vehicles[0] || { plateNumber: '---', brand: 'No Units', model: 'Found', lastOdometer: 0 };

  // Calculate dynamic statistics
  const totalReports = reports.length;
  const reportsWithIssues = reports.filter(r => r.items?.some((item: any) => item.status === 'issue'));
  const activeIssuesCount = reportsWithIssues.length;

  // Sorted reports for recent logs
  const sortedReports = [...reports].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const recentLogs = sortedReports.slice(0, 4);

  // Helper to resolve vehicle plate and model
  const getVehicleDetails = (vehicleId: string) => {
    const found = vehicles.find(v => v.id === vehicleId);
    if (found) {
      return `${found.plateNumber} (${found.model})`;
    }
    // Fallback if ID is a plate number already
    return vehicleId === 'scb_ambulance' ? 'B 1229 PIX (Ambulance)' : 
           vehicleId === 'scb_elf' ? 'B 7258 TDB (Elf)' : 
           vehicleId === 'scb_apv' ? 'B 1035 PIX (APV)' : vehicleId;
  };

  // Prepare chart data for the last 10 days
  const getChartData = () => {
    const dataMap: { [key: string]: { harian: number; mingguan: number; bulanan: number; dateStr: string } } = {};
    
    // Initialize last 10 days
    for (let i = 9; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const label = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
      const key = d.toISOString().split('T')[0];
      dataMap[key] = { harian: 0, mingguan: 0, bulanan: 0, dateStr: label };
    }

    // Aggregate reports
    reports.forEach(report => {
      if (!report.date) return;
      const key = report.date.split('T')[0];
      if (dataMap[key]) {
        if (report.type === 'harian') {
          dataMap[key].harian += 1;
        } else if (report.type === 'mingguan') {
          dataMap[key].mingguan += 1;
        } else if (report.type === 'bulanan') {
          dataMap[key].bulanan += 1;
        }
      }
    });

    return Object.keys(dataMap).sort().map(key => ({
      name: dataMap[key].dateStr,
      'Harian': dataMap[key].harian,
      'Mingguan': dataMap[key].mingguan,
      'Bulanan': dataMap[key].bulanan,
      'Total': dataMap[key].harian + dataMap[key].mingguan + dataMap[key].bulanan
    }));
  };

  const chartData = getChartData();

  // Custom styled Tooltip matching dark theme
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-zinc-950 border-2 border-zinc-800 p-4 rounded-2xl shadow-2xl font-sans">
          <p className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-2 border-b border-zinc-800 pb-1.5">{label}</p>
          {payload.map((p: any) => (
            <div key={p.name} className="flex items-center gap-4 text-xs mt-1.5 justify-between min-w-[140px]">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                <span className="text-zinc-500 font-bold uppercase tracking-wider text-[10px]">{p.name}</span>
              </div>
              <span className="text-white font-black">{p.value} x</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[50vh] bg-transparent">
        <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-12 auto-rows-min gap-4">
      {/* Welcome Area */}
      <div className="col-span-12 lg:col-span-8 flex items-center gap-6 mb-4 bento-card border-none bg-transparent !p-0">
        <div className="w-16 h-16 rounded-[24px] bg-amber-500 flex items-center justify-center text-zinc-950 font-black text-2xl shadow-xl shadow-amber-500/20">
          O
        </div>
        <div>
          <h2 className="text-3xl font-black tracking-tighter text-white uppercase italic">Dashboard</h2>
          <p className="text-zinc-500 font-mono text-xs">Operator SCB • Sistem Inspeksi Armada</p>
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
            <p className="text-zinc-500 text-[10px] italic font-mono uppercase">
              Update Terakhir: {sortedReports[0] ? new Date(sortedReports[0].date).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '07:45'}
            </p>
          </div>
          <h2 className="text-5xl font-black text-white tracking-tighter mb-2 italic">{currentVehicle.plateNumber}</h2>
          {vehicles.length > 0 ? (
            <p className="text-zinc-400 font-bold uppercase tracking-widest text-sm">{currentVehicle.brand} {currentVehicle.model}</p>
          ) : (
            <p className="text-amber-500 font-black uppercase tracking-widest text-sm animate-pulse">TAMBAH UNIT DI MENU FLEET</p>
          )}
        </div>

        <div className="flex flex-col gap-2 mt-8 relative z-10">
          <button 
            onClick={onStartInspect}
            className={`py-5 flex-1 flex items-center justify-center gap-3 text-lg italic transition-all duration-300 ${
              user?.isAnonymous
                ? 'bg-zinc-800/80 hover:bg-zinc-800 text-zinc-500 hover:text-zinc-400 border border-zinc-700/50 rounded-[20px] font-bold cursor-pointer'
                : 'btn-primary'
            }`}
          >
            {user?.isAnonymous ? <Lock className="w-6 h-6 text-zinc-500" /> : <Activity className="w-6 h-6" />}
            {user?.isAnonymous ? 'MULAI INSPEKSI (AKSES TAMU)' : 'MULAI INSPEKSI BARU'}
          </button>
          {user?.isAnonymous && (
            <p className="text-[10px] text-zinc-500 font-mono text-center uppercase tracking-wider italic">
              * Anda masuk sebagai tamu. Formulir inspeksi dikunci (Read-Only).
            </p>
          )}
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
              <div className={`w-3 h-3 rounded-full ${activeIssuesCount > 0 ? 'bg-rose-500 animate-pulse' : 'bg-green-500'}`}></div>
           </div>
           <div>
              <p className="text-3xl font-black text-white tracking-tighter italic uppercase">
                {activeIssuesCount > 0 ? 'Attention' : 'Ready'}
              </p>
              <p className="text-xs text-zinc-600 font-bold uppercase italic">
                {activeIssuesCount > 0 ? `${activeIssuesCount} Temuan Isu` : 'Laik Operasi'}
              </p>
           </div>
        </div>
      </div>

      {/* Interactive Charts Area - Recharts Visualizer */}
      <div className="col-span-12 bento-card flex flex-col justify-between p-6 overflow-hidden">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-xl">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white uppercase tracking-tight italic">Tren Frekuensi Inspeksi</h3>
              <p className="text-[10px] text-zinc-500 font-mono">DURABLE CLOUD SYNCHRONIZED ANALYTICS (10 HARI TERAKHIR)</p>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-zinc-950/50 p-2 border border-zinc-800 rounded-xl">
            <TrendingUp className="w-4 h-4 text-amber-500 animate-bounce" />
            <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Laporan Masuk: {totalReports} Total</span>
          </div>
        </div>

        <div className="w-full h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorHarian" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorMingguan" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
              <XAxis 
                dataKey="name" 
                stroke="#4b5563" 
                fontSize={10} 
                tickLine={false} 
                axisLine={false}
                dy={10}
              />
              <YAxis 
                stroke="#4b5563" 
                fontSize={10} 
                tickLine={false} 
                axisLine={false}
                allowDecimals={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                verticalAlign="top" 
                height={36} 
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 'bold', letterSpacing: '0.05em' }}
              />
              <Area 
                type="monotone" 
                dataKey="Harian" 
                stroke="#f59e0b" 
                fillOpacity={1} 
                fill="url(#colorHarian)" 
                strokeWidth={3}
              />
              <Area 
                type="monotone" 
                dataKey="Mingguan" 
                stroke="#3b82f6" 
                fillOpacity={1} 
                fill="url(#colorMingguan)" 
                strokeWidth={3}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 mt-6 pt-5 border-t border-zinc-800 text-[10px] text-zinc-500 font-mono">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>Saran: Lakukan inspeksi harian sebelum armada meninggalkan depo SCB.</span>
          </div>
          <span>REAL-TIME ANALYSIS ENGINE</span>
        </div>
      </div>

      {/* Grid Stats (Small Bento) */}
      <div className="col-span-12 md:col-span-6 lg:col-span-4 bento-card !p-5 flex items-center gap-5">
        <div className="w-14 h-14 bg-zinc-950 border border-zinc-800 rounded-2xl flex items-center justify-center">
          <Calendar className="text-amber-500 w-6 h-6" />
        </div>
        <div>
          <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">Next Schedule</p>
          <p className="text-xl font-black text-white italic">HARI INI</p>
          <p className="text-[9px] text-amber-500/60 font-black uppercase tracking-tighter">Pemeriksaan Harian Rutin</p>
        </div>
      </div>

      <div className="col-span-12 md:col-span-6 lg:col-span-4 bento-card !p-5 flex items-center gap-5 border-l-4 border-l-rose-500">
        <div className="w-14 h-14 bg-zinc-950 border border-zinc-800 rounded-2xl flex items-center justify-center">
          <AlertTriangle className="text-rose-500 w-6 h-6" />
        </div>
        <div>
          <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">Temuan Masalah</p>
          <p className="text-xl font-black text-white">{activeIssuesCount} TEMUAN</p>
          <p className="text-[9px] text-zinc-600 font-bold font-mono">
            {reportsWithIssues[0] ? `Terakhir: ${new Date(reportsWithIssues[0].date).toLocaleDateString('id-ID')}` : 'Tidak ada temuan'}
          </p>
        </div>
      </div>

      <div className="col-span-12 md:col-span-6 lg:col-span-4 bento-card !p-5 flex items-center gap-5">
        <div className="w-14 h-14 bg-amber-500 rounded-2xl flex items-center justify-center">
          <ChevronRight className="text-zinc-900 w-6 h-6" />
        </div>
        <div>
          <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">Total Laporan</p>
          <p className="text-xl font-black text-white tracking-widest">{totalReports} <span className="text-sm">LAPORAN</span></p>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="col-span-12 mt-8">
        <h3 className="text-xs font-black uppercase tracking-[0.3em] text-zinc-700 mb-6 px-2">Log Inspeksi Terakhir</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {recentLogs.map((report) => {
               const hasIssue = report.items?.some((item: any) => item.status === 'issue');
               return (
                 <div key={report.id} className="bento-card !p-4 !rounded-2xl flex items-center justify-between hover:border-amber-500/50 cursor-pointer group bg-zinc-900/40">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-zinc-950 flex items-center justify-center border border-zinc-800 shadow-inner group-hover:border-zinc-700">
                          <Truck className="w-5 h-5 text-zinc-600 group-hover:text-amber-500 transition-colors" />
                      </div>
                      <div>
                          <p className="text-xs font-black text-zinc-200 uppercase tracking-widest group-hover:text-white truncate max-w-[200px]">
                            {getVehicleDetails(report.vehicleId)}
                          </p>
                          <p className="text-[10px] font-mono text-zinc-600 uppercase mt-0.5">
                            Inspeksi {report.type} • {new Date(report.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} {new Date(report.date).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                      <span className={`text-[9px] px-2 py-0.5 rounded-full font-black uppercase border ${
                        hasIssue 
                          ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' 
                          : 'bg-green-500/10 text-green-500 border-green-500/20'
                      }`}>
                        {hasIssue ? 'Temuan' : 'Aman'}
                      </span>
                      <ChevronRight className="w-4 h-4 text-zinc-800 group-hover:text-amber-500 transition-all group-hover:translate-x-1" />
                    </div>
                 </div>
               );
            })}

            {recentLogs.length === 0 && (
              <div className="col-span-2 text-center py-8 border border-dashed border-zinc-800 rounded-2xl text-zinc-600 text-xs italic">
                Belum ada log pemeriksaan armada. Mulai inspeksi di atas!
              </div>
            )}
        </div>
      </div>
    </div>
  );
}
