/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { Truck, Calendar, ChevronRight, FileText, Search, Download } from 'lucide-react';
import { db, auth } from '../lib/firebase';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import * as XLSX from 'xlsx';

export default function History() {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(
      collection(db, 'reports'),
      where('userId', '==', auth.currentUser.uid),
      orderBy('date', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setReports(docs);
      setLoading(false);
    }, (error) => {
      console.error(error);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const handleExport = () => {
    if (reports.length === 0) return;

    const exportData = reports.map(report => {
      const data: any = {
        'Tanggal': new Date(report.date).toLocaleString('id-ID'),
        'Unit': report.vehicleId,
        'Tipe': report.type.toUpperCase(),
        'Odometer': report.odometer,
        'Status': report.items.every((i: any) => i.status === 'ok') ? 'SUCCESS' : 'ISSUES',
        'Catatan': report.summary || ''
      };
      
      // Add checklist items as dynamic columns
      report.items.forEach((item: any) => {
        data[item.label] = item.status.toUpperCase();
      });
      
      return data;
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Laporan Inspeksi");
    
    // Generate file name with current date
    const fileName = `Laporan_Inspeksi_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 mb-8">
         <div className="flex-1 relative">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-600 w-5 h-5 font-black uppercase" />
            <input 
              type="text" 
              placeholder="CARI UNIT ATAU JENIS..."
              className="w-full bg-zinc-900 border-2 border-zinc-800 text-white rounded-[24px] py-4 pl-14 pr-6 outline-none focus:border-amber-500/50 transition-all font-black uppercase italic text-xs tracking-widest placeholder:text-zinc-800"
            />
         </div>
         <button 
           onClick={handleExport}
           className="btn-primary w-full sm:w-auto flex items-center justify-center gap-2 italic"
           disabled={reports.length === 0}
         >
            <Download className="w-5 h-5" />
            EXPORT EXCEL
         </button>
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-20">
            <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto shadow-[0_0_15px_rgba(245,158,11,0.2)]"></div>
            <p className="mt-6 text-zinc-600 font-black uppercase tracking-widest text-[10px]">Sinkronisasi Data...</p>
          </div>
        ) : reports.map((report) => (
          <div 
            key={report.id} 
            className="bento-card !p-5 flex items-center justify-between hover:bg-zinc-900/60 group cursor-pointer"
          >
            <div className="flex items-center gap-6">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border-2 border-zinc-800 bg-zinc-950 ${
                report.items.every((i: any) => i.status === 'ok') ? 'text-green-500' : 'text-red-500'
              }`}>
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <p className="font-black text-white italic uppercase tracking-tight text-xl">{report.type}</p>
                  <span className={`text-[9px] px-2 py-0.5 rounded-full font-black uppercase border ${
                    report.items.every((i: any) => i.status === 'ok') ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'
                  }`}>
                    {report.items.every((i: any) => i.status === 'ok') ? 'SUCCESS' : 'ISSUES'}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-[10px] font-mono text-zinc-600 mt-1 uppercase">
                   <div className="flex items-center gap-1.5 uppercase font-black tracking-widest">
                      <Calendar className="w-3 h-3" />
                      {new Date(report.date).toLocaleDateString('id-ID')}
                   </div>
                   <div className="flex items-center gap-1.5 uppercase font-black tracking-widest">
                      <Truck className="w-3 h-3" />
                      {report.vehicleId}
                   </div>
                </div>
              </div>
            </div>
            <div className="text-right flex items-center gap-6">
               <div className="hidden sm:block">
                  <p className="text-[10px] text-zinc-700 uppercase font-black tracking-[0.2em]">Odometer</p>
                  <p className="text-lg font-mono font-black text-amber-500 tracking-tighter">{report.odometer.toLocaleString()} <span className="text-[10px] font-sans text-zinc-600">KM</span></p>
               </div>
               <ChevronRight className="w-5 h-5 text-zinc-800 group-hover:text-amber-500 group-hover:translate-x-1 transition-all" />
            </div>
          </div>
        ))}
        {!loading && reports.length === 0 && (
          <div className="text-center py-24 bento-card bg-zinc-950/20 border-dashed">
             <FileText className="w-20 h-20 text-zinc-900 mx-auto mb-6" />
             <p className="text-zinc-700 font-black uppercase tracking-[0.3em]">No Logs Available</p>
          </div>
        )}
      </div>
    </div>
  );
}
