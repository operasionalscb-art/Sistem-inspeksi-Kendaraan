/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { InspectionType, InspectionItem } from '../types';
import { INSPECTION_TEMPLATES, VEHICLES } from '../constants';
import { CheckCircle2, AlertCircle, HelpCircle, Save, ArrowLeft, Camera, User, ChevronRight, Truck, Car, X, ShieldAlert, Eye, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { auth, db, handleFirestoreError } from '../lib/firebase';
import { collection, addDoc, onSnapshot, query, updateDoc, doc, where } from 'firebase/firestore';
import CameraCapture from './CameraCapture';
import { useAuth } from './FirebaseProvider';

export default function Inspect({ onCancel }: { onCancel: () => void }) {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [type, setType] = useState<InspectionType | null>(null);
  const [items, setItems] = useState<InspectionItem[]>([]);
  const [odometer, setOdometer] = useState<string>('');
  const [summary, setSummary] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
  const [activePhotoItem, setActivePhotoItem] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  React.useEffect(() => {
    const q = query(collection(db, 'vehicles'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setVehicles(docs);
      if (docs.length > 0 && !selectedVehicleId) {
        // Try to find a sensible default or just use the first one
        setSelectedVehicleId(docs[0].id);
      }
    });
    return unsubscribe;
  }, []);

  const startInspection = (selectedType: InspectionType) => {
    setType(selectedType);
    setItems(
      INSPECTION_TEMPLATES[selectedType].map((label, i) => ({
        id: `item-${i}`,
        label,
        status: 'ok',
      }))
    );
    setStep(2);
  };

  const updateItemStatus = (id: string, status: 'ok' | 'issue' | 'n/a') => {
    setItems(items.map((item) => (item.id === id ? { ...item, status } : item)));
  };

  const handleSubmit = async () => {
    if (!type || !selectedVehicleId) return;
    
    setIsSubmitting(true);
    setShowConfirmModal(false);
    try {
      const reportData = {
        userId: auth.currentUser?.uid || 'shared',
        vehicleId: selectedVehicleId,
        type: type,
        date: new Date().toISOString(),
        items: items,
        odometer: parseInt(odometer),
        signature: 'PLACEHOLDER_BASE64', // In real app, capture canvas data
        summary: summary,
      };

      await addDoc(collection(db, 'reports'), reportData);
      // Update vehicle last odometer
      await updateDoc(doc(db, 'vehicles', selectedVehicleId), {
        lastOdometer: parseInt(odometer)
      });
      setShowSuccessModal(true);
    } catch (error) {
      console.error('Submit report error:', error);
      handleFirestoreError(error, 'create', 'reports');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isComplete = items.every((i) => i.status !== null) && odometer.length > 0;
  const isGuest = user?.isAnonymous || !user;

  if (isGuest) {
    return (
      <div className="max-w-2xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button onClick={onCancel} className="w-12 h-12 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-center text-zinc-400 hover:text-white transition-colors">
             <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="text-right">
            <span className="px-3 py-1 bg-amber-500/10 text-amber-500 text-[10px] font-black uppercase rounded-full border border-amber-500/20 tracking-widest">
              GUEST READ-ONLY
            </span>
          </div>
        </div>

        {/* Info Card */}
        <div className="bento-card border-amber-500/30 bg-gradient-to-br from-zinc-900 to-zinc-950 !p-8 shadow-2xl relative overflow-hidden text-center space-y-6">
          <div className="absolute top-0 right-0 p-8 opacity-[0.02]">
            <ShieldAlert className="w-48 h-48" />
          </div>
          
          <div className="mx-auto w-16 h-16 bg-amber-500/10 border border-amber-500/20 rounded-[20px] flex items-center justify-center text-amber-500 shadow-lg shadow-amber-500/5">
            <Lock className="w-8 h-8" />
          </div>

          <div className="space-y-3">
            <h2 className="text-2xl sm:text-3xl font-black text-white italic uppercase tracking-tight">
              Akses Tamu Terbatas
            </h2>
            <p className="text-zinc-400 text-xs sm:text-sm font-medium leading-relaxed max-w-lg mx-auto">
              Anda saat ini berada dalam <strong>Akses Tamu (Guest Mode)</strong>. Mode ini hanya diberikan izin untuk melihat riwayat laporan dan status unit armada secara real-time.
            </p>
            <p className="text-amber-500 text-[11px] font-black uppercase tracking-wider max-w-md mx-auto bg-amber-500/5 border border-amber-500/15 p-3.5 rounded-xl mt-3">
              Tamu tidak memiliki otorisasi untuk mengisi atau mengirimkan formulir inspeksi baru.
            </p>
          </div>

          <div className="pt-4 border-t border-zinc-800/60 max-w-md mx-auto space-y-4">
            <p className="text-zinc-500 text-[10px] font-mono leading-relaxed">
              Hubungi Administrator atau klik tombol <strong>Pengelolaan Akun</strong> (ikon User di pojok kanan atas) untuk masuk menggunakan kredensial resmi.
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={onCancel}
                className="flex-1 py-3 bg-zinc-950 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all italic"
              >
                Kembali ke Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header with progress */}
      <div className="flex items-center justify-between mb-12">
        <button onClick={onCancel} className="w-12 h-12 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-center text-zinc-400 hover:text-white transition-colors">
           <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="flex gap-2">
           {[1, 2, 3].map(s => (
             <div key={s} className={`h-1.5 w-16 rounded-full transition-all duration-500 ${s <= step ? 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.3)]' : 'bg-zinc-800'}`} />
           ))}
        </div>
        <div className="w-12" />
      </div>

      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-8"
          >
            <div className="text-center space-y-3">
              <h2 className="text-4xl font-black tracking-tighter text-white uppercase italic">Pilih Frekuensi</h2>
              <p className="text-zinc-500 font-medium">Tentukan jenis pemeriksaan yang akan dilakukan</p>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {(['harian', 'mingguan', 'bulanan'] as InspectionType[]).map((t) => (
                <button
                  key={t}
                  onClick={() => startInspection(t)}
                  className="bento-card text-left group hover:border-amber-500 hover:bg-zinc-900/80 transition-all flex items-center justify-between"
                >
                   <div className="space-y-1">
                      <span className="text-[10px] font-black uppercase text-amber-500 tracking-[0.2em]">{t}</span>
                      <h3 className="text-2xl font-black capitalize italic text-white">Inspeksi {t}</h3>
                      <p className="text-zinc-500 text-xs font-medium">
                         {t === 'harian' && 'Checklist rutin harian unit operasional'}
                         {t === 'mingguan' && 'Pemeriksaan performa & kebersihan detail'}
                         {t === 'bulanan' && 'Maintenance berkala & servis mesin'}
                      </p>
                   </div>
                   <div className="w-14 h-14 bg-zinc-950 rounded-2xl flex items-center justify-center border border-zinc-800 group-hover:border-amber-500/30">
                      <ChevronRight className="w-6 h-6 text-zinc-700 group-hover:text-amber-500 group-hover:translate-x-1 transition-all" />
                   </div>
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-8"
          >
            <div className="sticky top-20 z-20 bg-zinc-900/90 backdrop-blur-md border border-zinc-800 rounded-3xl p-4 md:p-5 shadow-xl shadow-zinc-950/50 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                {/* Left Side: Form title and type */}
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                    <h2 className="text-xl sm:text-2xl font-black capitalize italic text-white tracking-tight uppercase">
                      INSPEKSI {type}
                    </h2>
                  </div>
                  <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                    LENGKAPI CHECKLIST DI BAWAH INI
                  </p>
                </div>

                {/* Right Side: Vehicle selection dropdown */}
                <div className="flex items-center gap-3">
                  <div className="text-right hidden xs:block">
                    <p className="text-[9px] font-black text-zinc-500 uppercase tracking-wider">UNIT ARMADA</p>
                    <p className="text-xs font-mono font-bold text-zinc-400">SELECT VEHICLE</p>
                  </div>
                  <div className="relative min-w-[200px] xs:min-w-[240px] flex-1 sm:flex-initial">
                    <select 
                      value={selectedVehicleId}
                      onChange={(e) => setSelectedVehicleId(e.target.value)}
                      className="w-full bg-zinc-950 text-white font-black uppercase text-xs sm:text-sm outline-none border-2 border-amber-500/50 hover:border-amber-500 px-4 py-3 pr-10 rounded-xl cursor-pointer transition-colors focus:border-amber-500 appearance-none text-left italic shadow-lg shadow-amber-500/5"
                    >
                      {vehicles.map(v => (
                        <option key={v.id} value={v.id} className="bg-zinc-900 text-white font-bold">
                          {v.plateNumber} — {v.brand} {v.model}
                        </option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 right-3.5 flex items-center pointer-events-none text-amber-500">
                      <ChevronRight className="w-4 h-4 rotate-90" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Row inside the header: Progress & Odometer badge */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-zinc-800/60">
                {/* Micro Progress Bar */}
                <div className="flex items-center gap-3 flex-1 min-w-[180px]">
                  <div className="flex-1 bg-zinc-950 h-2 rounded-full overflow-hidden border border-zinc-800/50">
                    <div 
                      className="bg-gradient-to-r from-amber-500 to-amber-400 h-full rounded-full transition-all duration-300"
                      style={{ width: `${(items.filter(i => i.status !== null).length / items.length) * 100}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest whitespace-nowrap">
                    PROGRESS: {items.filter(i => i.status !== null).length} / {items.length} ITEM
                  </span>
                </div>

                {/* Info Badges */}
                <div className="flex items-center gap-2">
                  <div className="bg-zinc-950/80 px-3 py-1.5 rounded-lg text-[10px] font-mono font-black text-zinc-400 border border-zinc-800">
                    ODOMETER: <span className="text-amber-500">{odometer || '---'} KM</span>
                  </div>
                  {odometer && (
                    <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider">
                      Ready
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {items.map((item) => (
                <div key={item.id} className="bento-card !p-5 flex flex-col gap-4 hover:bg-zinc-900/60 transition-all">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                    <p className="font-bold text-zinc-200 text-lg italic uppercase tracking-tight">{item.label}</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => updateItemStatus(item.id, 'ok')}
                        className={`px-4 py-2.5 rounded-xl border-2 text-[10px] font-black uppercase tracking-widest transition-all ${
                          item.status === 'ok' 
                            ? 'bg-green-500 border-green-500 text-zinc-950 shadow-[0_0_15px_rgba(34,197,94,0.3)]' 
                            : 'bg-zinc-950 border-zinc-800 text-zinc-600 hover:border-zinc-700'
                        }`}
                      >
                        PASSED
                      </button>
                      <button
                        onClick={() => updateItemStatus(item.id, 'issue')}
                        className={`px-4 py-2.5 rounded-xl border-2 text-[10px] font-black uppercase tracking-widest transition-all ${
                          item.status === 'issue' 
                            ? 'bg-red-500 border-red-500 text-zinc-950 shadow-[0_0_15px_rgba(239,68,68,0.3)]' 
                            : 'bg-zinc-950 border-zinc-800 text-zinc-600 hover:border-zinc-700'
                        }`}
                      >
                        ISSUE
                      </button>
                      <button
                        onClick={() => updateItemStatus(item.id, 'n/a')}
                        className={`px-4 py-2.5 rounded-xl border-2 text-[10px] font-black uppercase tracking-widest transition-all ${
                          item.status === 'n/a' 
                            ? 'bg-zinc-700 border-zinc-700 text-white' 
                            : 'bg-zinc-950 border-zinc-800 text-zinc-600 hover:border-zinc-700'
                        }`}
                      >
                        N/A
                      </button>
                    </div>
                  </div>

                  {item.status === 'issue' && (
                    <div className="p-4 bg-zinc-950/60 border border-zinc-800 rounded-2xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                      <div className="flex-1 space-y-1">
                        <label className="text-[9px] font-black uppercase text-zinc-500 tracking-wider">Catatan Isu / Kerusakan</label>
                        <input 
                          type="text"
                          placeholder="Misal: Retak, bocor, aus, lampu mati..."
                          value={item.comment || ''}
                          onChange={(e) => {
                            const comment = e.target.value;
                            setItems(items.map(it => it.id === item.id ? { ...it, comment } : it));
                          }}
                          className="w-full bg-zinc-900 border border-zinc-800 focus:border-amber-500/50 rounded-xl px-4 py-2.5 text-xs text-white font-bold uppercase placeholder:text-zinc-700 outline-none transition-all"
                        />
                      </div>
                      <div className="shrink-0 flex items-center gap-3">
                        {item.photo ? (
                          <div className="relative group">
                            <img 
                              src={item.photo} 
                              alt="Bukti Masalah" 
                              className="w-16 h-16 rounded-xl object-cover border border-zinc-800 shadow-inner"
                              referrerPolicy="no-referrer"
                            />
                            <button 
                              onClick={() => {
                                setItems(items.map(it => it.id === item.id ? { ...it, photo: undefined } : it));
                              }}
                              className="absolute -top-1.5 -right-1.5 p-1 bg-rose-500 hover:bg-rose-600 rounded-full text-white transition-colors"
                              title="Hapus Foto"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setActivePhotoItem(item.id);
                            }}
                            className="px-4 py-3 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500/30 hover:border-amber-500/50 rounded-xl text-[10px] font-black uppercase tracking-wider italic transition-all flex items-center gap-2"
                          >
                            <Camera className="w-4 h-4" />
                            AMBIL FOTO BUKTI
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="bento-card bg-zinc-950 border-zinc-800 border-dashed space-y-4">
               <label className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-600">Update Odometer</label>
               <input 
                  type="number"
                  value={odometer}
                  onChange={(e) => setOdometer(e.target.value)}
                  placeholder="INPUT ODOMETER..."
                  className="w-full bg-zinc-900 border-2 border-zinc-800 rounded-2xl p-5 text-4xl font-mono font-black text-amber-500 focus:border-amber-500/50 outline-none caret-amber-500 placeholder:text-zinc-800"
               />
            </div>

            <button
               onClick={() => setStep(3)}
               disabled={!odometer}
               className="w-full btn-primary py-5 text-xl italic"
            >
               LANJUTKAN & VALIDASI
            </button>
          </motion.div>
        )}

        {step === 3 && (
           <motion.div
            key="step3"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-8"
           >
              <div className="text-center space-y-3">
                <h2 className="text-4xl font-black tracking-tighter text-white uppercase italic">Validasi Laporan</h2>
                <p className="text-zinc-500 font-medium">Beri catatan akhir dan tanda tangan driver</p>
              </div>

              <div className="bento-card bg-zinc-950 border-zinc-800 space-y-4">
                 <label className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-600">Catatan Kondisi Unit</label>
                 <textarea 
                    value={summary}
                    onChange={(e) => setSummary(e.target.value)}
                    placeholder="CONTOH: BAN KIRI KURANG ANGIN..."
                    className="w-full bg-zinc-900 border-2 border-zinc-800 rounded-2xl p-5 min-h-[140px] focus:border-amber-500/50 outline-none text-zinc-100 placeholder:text-zinc-800 font-bold uppercase text-sm italic"
                 />
              </div>

              <div className="bento-card space-y-4">
                 <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-600">Tanda Tangan Driver</label>
                    <button className="text-[10px] text-amber-500 font-black uppercase tracking-widest hover:underline">Reset</button>
                 </div>
                 <div className="w-full h-48 bg-zinc-950 rounded-[32px] border-2 border-dashed border-zinc-800 flex items-center justify-center relative overflow-hidden group">
                    <div className="text-zinc-700 pointer-events-none text-[10px] font-black uppercase tracking-[0.2em] group-hover:text-zinc-600 transition-colors">Signature Canvas</div>
                 </div>
              </div>

              <div className="flex gap-4">
                 <button 
                  onClick={() => setStep(2)}
                  className="flex-1 btn-secondary py-5 italic uppercase tracking-widest text-sm"
                 >
                    KEMBALI
                 </button>
                 <button 
                  onClick={() => setShowConfirmModal(true)}
                  disabled={isSubmitting}
                  className="flex-[2] btn-primary py-5 text-xl italic"
                 >
                    {isSubmitting ? (
                      <div className="w-6 h-6 border-4 border-zinc-950 border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <Save className="w-6 h-6 mr-2 inline-block" />
                    )}
                    SELESAI & KIRIM
                 </button>
              </div>
           </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {activePhotoItem !== null && (
          <CameraCapture 
            title={`Foto: ${items.find(it => it.id === activePhotoItem)?.label}`}
            onClose={() => setActivePhotoItem(null)}
            onCapture={(photoData) => {
              setItems(items.map(it => it.id === activePhotoItem ? { ...it, photo: photoData } : it));
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showConfirmModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowConfirmModal(false)}
              className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-zinc-900 border-2 border-zinc-800 rounded-[40px] p-8 w-full max-w-md shadow-2xl space-y-6"
            >
              <div className="flex items-center gap-3 text-amber-500">
                <AlertCircle className="w-8 h-8" />
                <h2 className="text-2xl font-black uppercase italic tracking-tighter">
                  Konfirmasi Kirim
                </h2>
              </div>
              <p className="text-zinc-400 font-medium text-sm leading-relaxed">
                Apakah Anda yakin semua data pemeriksaan dan odometer untuk unit <span className="text-white font-bold">{vehicles.find(v => v.id === selectedVehicleId)?.plateNumber}</span> sudah sesuai? Laporan akan disimpan secara permanen di database cloud.
              </p>
              <div className="flex gap-4 pt-2">
                <button 
                  onClick={() => setShowConfirmModal(false)}
                  className="flex-1 btn-secondary py-3.5 rounded-2xl text-xs font-black uppercase tracking-wider italic text-center"
                >
                  BATAL
                </button>
                <button 
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="flex-[2] btn-primary py-3.5 rounded-2xl text-xs font-black uppercase tracking-wider italic flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <div className="w-5 h-5 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      YA, KIRIM
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSuccessModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-zinc-900 border-2 border-zinc-800 rounded-[40px] p-8 w-full max-w-md shadow-2xl text-center space-y-6"
            >
              <div className="mx-auto w-16 h-16 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center border border-green-500/25 animate-bounce">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter">
                  Laporan Terkirim!
                </h2>
                <p className="text-zinc-400 text-sm font-medium">
                  Inspeksi unit <span className="text-amber-500 font-bold">{vehicles.find(v => v.id === selectedVehicleId)?.plateNumber}</span> berhasil disimpan ke cloud database.
                </p>
              </div>
              <button 
                onClick={() => {
                  setShowSuccessModal(false);
                  onCancel();
                }}
                className="w-full btn-primary py-4 rounded-2xl text-sm font-black uppercase tracking-wider italic"
              >
                KEMBALI KE BERANDA
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
