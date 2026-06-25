/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { Truck, Calendar, ChevronRight, FileText, Search, Download, X, CheckCircle2, AlertCircle, AlertTriangle, Camera, ClipboardCheck } from 'lucide-react';
import { db, auth } from '../lib/firebase';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import * as XLSX from 'xlsx';
import { motion, AnimatePresence } from 'motion/react';

export default function History() {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedReport, setSelectedReport] = useState<any | null>(null);
  const [zoomedPhoto, setZoomedPhoto] = useState<string | null>(null);

  useEffect(() => {
    const q = query(
      collection(db, 'reports'),
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
        'Status': report.items.every((i: any) => i.status === 'ok') ? 'AMAN' : 'TEMUAN',
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

  // Filter reports based on search query
  const filteredReports = reports.filter(report => {
    const term = searchTerm.toLowerCase();
    const vehicleMatch = report.vehicleId?.toLowerCase().includes(term);
    const typeMatch = report.type?.toLowerCase().includes(term);
    const summaryMatch = report.summary?.toLowerCase().includes(term);
    return vehicleMatch || typeMatch || summaryMatch;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 mb-8">
         <div className="flex-1 relative">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-600 w-5 h-5 font-black uppercase" />
            <input 
              type="text" 
              placeholder="CARI UNIT ATAU JENIS..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
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
        ) : filteredReports.map((report) => (
          <div 
            key={report.id} 
            onClick={() => setSelectedReport(report)}
            className="bento-card !p-5 flex items-center justify-between hover:bg-zinc-900/60 hover:border-amber-500/30 group cursor-pointer transition-all"
          >
            <div className="flex items-center gap-6">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border-2 border-zinc-800 bg-zinc-950 ${
                report.items?.every((i: any) => i.status === 'ok') ? 'text-green-500 border-green-500/10' : 'text-red-500 border-red-500/10'
              }`}>
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <p className="font-black text-white italic uppercase tracking-tight text-xl">{report.type}</p>
                  <span className={`text-[9px] px-2 py-0.5 rounded-full font-black uppercase border ${
                    report.items?.every((i: any) => i.status === 'ok') ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'
                  }`}>
                    {report.items?.every((i: any) => i.status === 'ok') ? 'AMAN' : 'TEMUAN'}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-[10px] font-mono text-zinc-600 mt-1 uppercase">
                   <div className="flex items-center gap-1.5 uppercase font-black tracking-widest">
                      <Calendar className="w-3 h-3" />
                      {new Date(report.date).toLocaleDateString('id-ID')}
                   </div>
                   <div className="flex items-center gap-1.5 uppercase font-black tracking-widest">
                      <Truck className="w-3 h-3" />
                      {report.vehicleId === 'scb_ambulance' ? 'B 1229 PIX' : 
                       report.vehicleId === 'scb_elf' ? 'B 7258 TDB' : 
                       report.vehicleId === 'scb_apv' ? 'B 1035 PIX' : report.vehicleId}
                   </div>
                </div>
              </div>
            </div>
            <div className="text-right flex items-center gap-6">
               <div className="hidden sm:block">
                  <p className="text-[10px] text-zinc-700 uppercase font-black tracking-[0.2em]">Odometer</p>
                  <p className="text-lg font-mono font-black text-amber-500 tracking-tighter">{report.odometer?.toLocaleString()} <span className="text-[10px] font-sans text-zinc-600">KM</span></p>
               </div>
               <ChevronRight className="w-5 h-5 text-zinc-800 group-hover:text-amber-500 group-hover:translate-x-1 transition-all" />
            </div>
          </div>
        ))}
        {!loading && filteredReports.length === 0 && (
          <div className="text-center py-24 bento-card bg-zinc-950/20 border-dashed">
             <FileText className="w-20 h-20 text-zinc-900 mx-auto mb-6" />
             <p className="text-zinc-700 font-black uppercase tracking-[0.3em]">Tidak Ada Laporan Tersedia</p>
          </div>
        )}
      </div>

      {/* Report Detail Modal */}
      <AnimatePresence>
        {selectedReport && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedReport(null)}
              className="absolute inset-0 bg-zinc-950/85 backdrop-blur-md"
            />

            {/* Modal Box */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-2xl bg-zinc-900 border-2 border-zinc-800 rounded-[32px] overflow-hidden shadow-2xl flex flex-col max-h-[85vh] z-10"
            >
              {/* Header */}
              <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl border ${
                    selectedReport.items?.every((i: any) => i.status === 'ok') 
                      ? 'bg-green-500/10 border-green-500/20 text-green-500' 
                      : 'bg-red-500/10 border-red-500/20 text-red-500'
                  }`}>
                    <ClipboardCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-white italic uppercase tracking-tight">Detail Inspeksi {selectedReport.type}</h2>
                    <p className="text-[10px] text-zinc-500 font-mono">ID LAPORAN: {selectedReport.id}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedReport(null)}
                  className="p-2 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable Body */}
              <div className="p-6 overflow-y-auto space-y-6 flex-1">
                {/* Meta Summary Panel */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-zinc-950/50 rounded-2xl border border-zinc-800">
                    <span className="text-[9px] font-black uppercase text-zinc-500 font-mono tracking-wider">Unit Armada</span>
                    <p className="text-lg font-black text-white italic mt-1 uppercase">
                      {selectedReport.vehicleId === 'scb_ambulance' ? 'B 1229 PIX' : 
                       selectedReport.vehicleId === 'scb_elf' ? 'B 7258 TDB' : 
                       selectedReport.vehicleId === 'scb_apv' ? 'B 1035 PIX' : selectedReport.vehicleId}
                    </p>
                  </div>
                  <div className="p-4 bg-zinc-950/50 rounded-2xl border border-zinc-800">
                    <span className="text-[9px] font-black uppercase text-zinc-500 font-mono tracking-wider">Odometer Tercatat</span>
                    <p className="text-lg font-black text-amber-500 font-mono mt-1">
                      {selectedReport.odometer?.toLocaleString()} <span className="text-xs font-sans text-zinc-500 uppercase">KM</span>
                    </p>
                  </div>
                </div>

                {/* Checklist Results */}
                <div className="space-y-3">
                  <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block">Detail Checklist Kondisi</span>
                  <div className="space-y-2.5">
                    {selectedReport.items?.map((item: any) => (
                      <div 
                        key={item.id} 
                        className="p-3 bg-zinc-950/30 border border-zinc-800/80 rounded-xl flex flex-col gap-3 transition-colors hover:border-zinc-800"
                      >
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-zinc-200 uppercase tracking-wide">{item.label}</span>
                          <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border uppercase ${
                            item.status === 'ok' 
                              ? 'bg-green-500/10 text-green-500 border-green-500/20' 
                              : item.status === 'issue' 
                              ? 'bg-red-500/10 text-red-500 border-red-500/20' 
                              : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                          }`}>
                            {item.status === 'ok' ? 'BAIK' : item.status === 'issue' ? 'ADA MASALAH' : 'N/A'}
                          </span>
                        </div>

                        {/* If checklist item has issue details */}
                        {(item.comment || item.photo) && (
                          <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                            <div className="flex-1 space-y-1">
                              <span className="text-[8px] font-black uppercase text-red-500 tracking-wider flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" />
                                TEMUAN MASALAH
                              </span>
                              <p className="text-xs font-bold text-white uppercase italic">
                                {item.comment || 'Tidak ada keterangan tertulis.'}
                              </p>
                            </div>
                            {item.photo && (
                              <div className="shrink-0 relative group cursor-zoom-in" onClick={() => setZoomedPhoto(item.photo)}>
                                <img 
                                  src={item.photo} 
                                  alt="Bukti Temuan" 
                                  className="w-16 h-16 rounded-lg object-cover border border-zinc-700 hover:border-amber-500/50 transition-all"
                                  referrerPolicy="no-referrer"
                                />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center rounded-lg transition-opacity animate-fade-in">
                                  <Camera className="w-4 h-4 text-white" />
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Summary Notes */}
                <div className="p-4 bg-zinc-950/20 border border-zinc-800 rounded-2xl space-y-2">
                  <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block font-mono">Catatan Akhir</span>
                  <p className="text-xs font-bold text-zinc-300 uppercase italic">
                    {selectedReport.summary || 'TIDAK ADA CATATAN AKHIR YANG DITULIS.'}
                  </p>
                </div>

                {/* Signatures & Metadata */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-zinc-800">
                  <div className="space-y-1">
                    <span className="text-[9px] font-black text-zinc-500 uppercase tracking-wider block font-mono">WAKTU SUBMIT</span>
                    <p className="text-xs text-zinc-400 font-bold uppercase">
                      {new Date(selectedReport.date).toLocaleString('id-ID', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                  <div className="space-y-2 flex flex-col items-start sm:items-end">
                    <span className="text-[9px] font-black text-zinc-500 uppercase tracking-wider block font-mono">TANDA TANGAN DRIVER</span>
                    <div className="w-32 h-16 bg-zinc-950 rounded-xl border border-zinc-800 flex items-center justify-center p-2">
                      <span className="text-[8px] font-black uppercase text-zinc-700 tracking-widest italic font-mono">E-TANDA TANGAN</span>
                    </div>
                  </div>
                </div>
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

      {/* Fullscreen Photo Zoom Overlay */}
      <AnimatePresence>
        {zoomedPhoto && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setZoomedPhoto(null)}
              className="absolute inset-0 bg-black/95 backdrop-blur-xl"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative max-w-4xl max-h-[85vh] z-[120] overflow-hidden rounded-2xl border-2 border-zinc-800"
            >
              <img 
                src={zoomedPhoto} 
                alt="Foto zoom" 
                className="max-w-full max-h-[80vh] object-contain"
                referrerPolicy="no-referrer"
              />
              <button 
                onClick={() => setZoomedPhoto(null)}
                className="absolute top-4 right-4 p-2 bg-black/60 border border-zinc-800 text-white rounded-full hover:bg-zinc-900 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
