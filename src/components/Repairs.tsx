/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { 
  Wrench, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Search, 
  Plus, 
  Trash2, 
  User, 
  Calendar, 
  Coins, 
  FileText, 
  X, 
  Sparkles, 
  Camera, 
  Check, 
  Filter, 
  ChevronRight, 
  AlertCircle,
  Truck,
  FileSpreadsheet
} from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, query, onSnapshot, setDoc, doc, addDoc, deleteDoc, orderBy } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from './FirebaseProvider';

interface RepairTask {
  id: string; // `${reportId}_${itemId}` for inspection items or custom string for routine logs
  reportId?: string; // empty if routine log
  vehicleId: string;
  itemId?: string; // empty if routine log
  itemLabel: string; // e.g. "Rem Utama", "Kelistrikan" or custom like "Ganti Oli"
  originalComment?: string;
  originalPhoto?: string;
  dateCreated: string;
  
  // Follow-up status
  status: 'pending' | 'in_progress' | 'resolved';
  repairCost?: number;
  repairDate?: string;
  mechanicName?: string;
  repairNotes?: string;
  resolvedPhoto?: string;
  updatedBy?: string;
  isRoutine?: boolean;
}

export default function Repairs() {
  const { user, role } = useAuth();
  const [activeTab, setActiveTab] = useState<'issues' | 'routine'>('issues');
  const [reports, setReports] = useState<any[]>([]);
  const [dbRepairs, setDbRepairs] = useState<RepairTask[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filter & Search states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [vehicleFilter, setVehicleFilter] = useState<string>('all');

  // Modal states
  const [selectedTask, setSelectedTask] = useState<RepairTask | null>(null);
  const [isActionOpen, setIsActionOpen] = useState(false);
  const [isRoutineOpen, setIsRoutineOpen] = useState(false);

  // Form states for Repair Follow-up
  const [formStatus, setFormStatus] = useState<'pending' | 'in_progress' | 'resolved'>('pending');
  const [formCost, setFormCost] = useState('');
  const [formMechanic, setFormMechanic] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formDate, setFormDate] = useState('');
  const [formPhoto, setFormPhoto] = useState(''); // Base64 of resolved item

  // Form states for Routine Maintenance
  const [routineVehicle, setRoutineVehicle] = useState('scb_ambulance');
  const [routineLabel, setRoutineLabel] = useState('Ganti Oli Mesin');
  const [routineNotes, setRoutineNotes] = useState('');
  const [routineCost, setRoutineCost] = useState('');
  const [routineDate, setRoutineDate] = useState(new Date().toISOString().split('T')[0]);
  const [routineMechanic, setRoutineMechanic] = useState('');

  // Local storage photo capture support
  const [isCapturing, setIsCapturing] = useState(false);
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);

  // Load Inspection reports & Repairs documents from Firestore
  useEffect(() => {
    // 1. Listen to reports (to scan for issues)
    const reportsQuery = query(collection(db, 'reports'), orderBy('date', 'desc'));
    const unsubscribeReports = onSnapshot(reportsQuery, (snapshot) => {
      const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setReports(docs);
    }, (error) => {
      console.error("Error reading reports for maintenance:", error);
    });

    // 2. Listen to repairs collection
    const repairsQuery = collection(db, 'repairs');
    const unsubscribeRepairs = onSnapshot(repairsQuery, (snapshot) => {
      const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as RepairTask[];
      setDbRepairs(docs);
      setLoading(false);
    }, (error) => {
      console.error("Error reading repairs collection:", error);
      setLoading(false);
    });

    return () => {
      unsubscribeReports();
      unsubscribeRepairs();
    };
  }, []);

  // Merge report issues and standalone repairs to construct the final list of corrective repairs
  const getCorrectiveRepairs = (): RepairTask[] => {
    const list: RepairTask[] = [];

    // Map existing repair tasks by ID for easy lookup
    const repairsMap = new Map<string, RepairTask>();
    dbRepairs.forEach(r => {
      if (!r.isRoutine) {
        repairsMap.set(r.id, r);
      }
    });

    // Scan through all inspection reports
    reports.forEach(report => {
      const reportItems = report.items || [];
      reportItems.forEach((item: any) => {
        if (item.status === 'issue') {
          const repairId = `${report.id}_${item.id}`;
          
          if (repairsMap.has(repairId)) {
            // Already initialized/edited in database
            list.push(repairsMap.get(repairId)!);
          } else {
            // Found a new issue from inspection that doesn't have an active repairs document yet
            list.push({
              id: repairId,
              reportId: report.id,
              vehicleId: report.vehicleId,
              itemId: item.id,
              itemLabel: item.label,
              originalComment: item.comment || 'Terdapat temuan masalah.',
              originalPhoto: item.photo || '',
              dateCreated: report.date,
              status: 'pending' // Default to pending
            });
          }
        }
      });
    });

    // Sort by creation date descending
    return list.sort((a, b) => new Date(b.dateCreated).getTime() - new Date(a.dateCreated).getTime());
  };

  const getRoutineServices = (): RepairTask[] => {
    return dbRepairs
      .filter(r => r.isRoutine)
      .sort((a, b) => new Date(b.dateCreated).getTime() - new Date(a.dateCreated).getTime());
  };

  // Helper for naming vehicle ids nicely
  const getVehiclePlate = (id: string) => {
    if (id === 'scb_ambulance') return 'B 1229 PIX (Ambulans)';
    if (id === 'scb_elf') return 'B 7258 TDB (Elf)';
    if (id === 'scb_apv') return 'B 1035 PIX (APV Support)';
    return id;
  };

  // KPI calculations
  const correctiveList = getCorrectiveRepairs();
  const routineList = getRoutineServices();
  const allList = activeTab === 'issues' ? correctiveList : routineList;

  const totalCost = dbRepairs.reduce((acc, curr) => acc + (curr.repairCost || 0), 0);
  const pendingCount = correctiveList.filter(r => r.status === 'pending').length;
  const inProgressCount = correctiveList.filter(r => r.status === 'in_progress').length;
  const resolvedCount = correctiveList.filter(r => r.status === 'resolved').length;

  // Filter application
  const filteredList = allList.filter(task => {
    // 1. Search term
    const queryStr = searchTerm.toLowerCase();
    const matchesSearch = 
      task.itemLabel.toLowerCase().includes(queryStr) ||
      (task.originalComment || '').toLowerCase().includes(queryStr) ||
      (task.repairNotes || '').toLowerCase().includes(queryStr) ||
      getVehiclePlate(task.vehicleId).toLowerCase().includes(queryStr);

    // 2. Status filter
    const matchesStatus = statusFilter === 'all' || task.status === statusFilter;

    // 3. Vehicle filter
    const matchesVehicle = vehicleFilter === 'all' || task.vehicleId === vehicleFilter;

    return matchesSearch && matchesStatus && matchesVehicle;
  });

  // Action Submission (Tindak Lanjut Perbaikan)
  const handleOpenAction = (task: RepairTask) => {
    setSelectedTask(task);
    setFormStatus(task.status);
    setFormCost(task.repairCost ? String(task.repairCost) : '');
    setFormMechanic(task.mechanicName || '');
    setFormNotes(task.repairNotes || '');
    setFormDate(task.repairDate || new Date().toISOString().split('T')[0]);
    setFormPhoto(task.resolvedPhoto || '');
    setIsActionOpen(true);
  };

  const handleSaveAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask) return;

    try {
      const repairRef = doc(db, 'repairs', selectedTask.id);
      const repairData: any = {
        ...selectedTask,
        status: formStatus,
        repairCost: Number(formCost) || 0,
        repairDate: formDate || new Date().toISOString().split('T')[0],
        mechanicName: formMechanic,
        repairNotes: formNotes,
        resolvedPhoto: formPhoto,
        updatedBy: user?.email || 'Administrator SCB',
        updatedAt: new Date().toISOString()
      };

      await setDoc(repairRef, repairData, { merge: true });
      setIsActionOpen(false);
      setSelectedTask(null);
    } catch (err) {
      console.error("Gagal menyimpan data perbaikan:", err);
      alert("Gagal memperbarui status perbaikan. Silakan coba kembali.");
    }
  };

  // Submit Routine Maintenance
  const handleSaveRoutine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!routineLabel) return;

    try {
      const routineId = 'routine_' + Date.now();
      const routineData: RepairTask = {
        id: routineId,
        vehicleId: routineVehicle,
        itemLabel: routineLabel,
        originalComment: 'Servis Berkala / Perawatan Rutin',
        dateCreated: routineDate,
        status: 'resolved', // Routine logged usually directly resolved/completed
        repairCost: Number(routineCost) || 0,
        repairDate: routineDate,
        mechanicName: routineMechanic,
        repairNotes: routineNotes,
        isRoutine: true,
        updatedBy: user?.email || 'Administrator SCB'
      };

      await setDoc(doc(db, 'repairs', routineId), routineData);
      setIsRoutineOpen(false);
      // Reset forms
      setRoutineLabel('Ganti Oli Mesin');
      setRoutineNotes('');
      setRoutineCost('');
      setRoutineMechanic('');
    } catch (err) {
      console.error("Gagal menyimpan servis rutin:", err);
      alert("Gagal mencatat servis rutin. Silakan coba kembali.");
    }
  };

  // Delete repair/service entry
  const handleDeleteRepair = async (id: string) => {
    if (confirm('Hapus log perbaikan/servis ini? Tindakan ini tidak dapat dibatalkan.')) {
      try {
        await deleteDoc(doc(db, 'repairs', id));
      } catch (err) {
        console.error("Gagal menghapus log perbaikan:", err);
      }
    }
  };

  // Camera capture helper for proof of repair
  const startCamera = async () => {
    setIsCapturing(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      setVideoStream(stream);
      const videoElement = document.getElementById('repair-camera') as HTMLVideoElement;
      if (videoElement) {
        videoElement.srcObject = stream;
        videoElement.play();
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      setIsCapturing(false);
    }
  };

  const capturePhoto = () => {
    const videoElement = document.getElementById('repair-camera') as HTMLVideoElement;
    if (videoElement && videoStream) {
      const canvas = document.createElement('canvas');
      canvas.width = videoElement.videoWidth;
      canvas.height = videoElement.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        setFormPhoto(dataUrl);
      }
      stopCamera();
    }
  };

  const stopCamera = () => {
    if (videoStream) {
      videoStream.getTracks().forEach(track => track.stop());
      setVideoStream(null);
    }
    setIsCapturing(false);
  };

  return (
    <div className="space-y-6">
      {/* KPI Stats Overview Panel */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bento-card bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800/80 !p-5 relative overflow-hidden group hover:border-amber-500/20 transition-all">
          <div className="absolute right-3 top-3 opacity-10 text-amber-500">
            <Coins className="w-12 h-12" />
          </div>
          <p className="text-[10px] text-zinc-600 uppercase font-black tracking-widest">Total Biaya Perawatan</p>
          <p className="text-xl sm:text-2xl font-black font-mono text-amber-500 mt-2 tracking-tight">
            Rp {totalCost.toLocaleString('id-ID')}
          </p>
          <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 mt-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-500/80" />
            <span>Korektif & Servis Rutin</span>
          </div>
        </div>

        <div className="bento-card bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800/80 !p-5 relative overflow-hidden group hover:border-red-500/20 transition-all">
          <div className="absolute right-3 top-3 opacity-10 text-red-500">
            <AlertTriangle className="w-12 h-12" />
          </div>
          <p className="text-[10px] text-zinc-600 uppercase font-black tracking-widest">Belum Dikerjakan</p>
          <p className="text-xl sm:text-2xl font-black font-mono text-red-500 mt-2 tracking-tight">
            {pendingCount} <span className="text-xs font-sans text-zinc-600 font-bold uppercase">Temuan</span>
          </p>
          <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 mt-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></div>
            <span>Menunggu tindakan</span>
          </div>
        </div>

        <div className="bento-card bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800/80 !p-5 relative overflow-hidden group hover:border-amber-500/20 transition-all">
          <div className="absolute right-3 top-3 opacity-10 text-amber-500">
            <Clock className="w-12 h-12" />
          </div>
          <p className="text-[10px] text-zinc-600 uppercase font-black tracking-widest">Sedang Diperbaiki</p>
          <p className="text-xl sm:text-2xl font-black font-mono text-amber-500 mt-2 tracking-tight">
            {inProgressCount} <span className="text-xs font-sans text-zinc-600 font-bold uppercase">Armada</span>
          </p>
          <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 mt-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></div>
            <span>Berjalan di bengkel</span>
          </div>
        </div>

        <div className="bento-card bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800/80 !p-5 relative overflow-hidden group hover:border-green-500/20 transition-all">
          <div className="absolute right-3 top-3 opacity-10 text-green-500">
            <CheckCircle2 className="w-12 h-12" />
          </div>
          <p className="text-[10px] text-zinc-600 uppercase font-black tracking-widest">Selesai Diperbaiki</p>
          <p className="text-xl sm:text-2xl font-black font-mono text-green-500 mt-2 tracking-tight">
            {resolvedCount} <span className="text-xs font-sans text-zinc-600 font-bold uppercase">Item</span>
          </p>
          <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 mt-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
            <span>Sukses direparasi</span>
          </div>
        </div>
      </div>

      {/* Main Tab Switcher */}
      <div className="flex bg-zinc-900 p-1 rounded-2xl border border-zinc-800/80 max-w-lg">
        <button
          onClick={() => {
            setActiveTab('issues');
            setStatusFilter('all');
          }}
          className={`flex-1 py-3.5 rounded-xl text-xs font-black uppercase tracking-widest italic transition-all flex items-center justify-center gap-2 ${
            activeTab === 'issues' 
              ? 'bg-amber-500 text-zinc-950 font-black shadow-lg' 
              : 'text-zinc-500 hover:text-white'
          }`}
        >
          <AlertTriangle className="w-4 h-4 shrink-0" />
          Perbaikan Temuan Inspeksi
        </button>
        <button
          onClick={() => {
            setActiveTab('routine');
            setStatusFilter('all');
          }}
          className={`flex-1 py-3.5 rounded-xl text-xs font-black uppercase tracking-widest italic transition-all flex items-center justify-center gap-2 ${
            activeTab === 'routine' 
              ? 'bg-amber-500 text-zinc-950 font-black shadow-lg' 
              : 'text-zinc-500 hover:text-white'
          }`}
        >
          <Wrench className="w-4 h-4 shrink-0" />
          Servis Berkala / Rutin
        </button>
      </div>

      {/* Filter and Control Bar */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-600 w-5 h-5" />
          <input 
            type="text" 
            placeholder="CARI SUKU CADANG, UNIT, ATAU CATATAN..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-zinc-900 border-2 border-zinc-800 text-white rounded-[24px] py-4 pl-14 pr-6 outline-none focus:border-amber-500/50 transition-all font-black uppercase italic text-xs tracking-widest placeholder:text-zinc-800"
          />
        </div>

        <div className="flex gap-3">
          {/* Status Filter */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-zinc-900 border-2 border-zinc-800 text-zinc-400 font-bold uppercase tracking-wider text-[11px] rounded-2xl py-3.5 pl-4 pr-10 outline-none appearance-none cursor-pointer focus:border-amber-500/50 transition-all"
            >
              <option value="all">SEMUA STATUS</option>
              <option value="pending">BELUM SELESAI</option>
              <option value="in_progress">SEDANG DIPERBAIKI</option>
              <option value="resolved">SELESAI</option>
            </select>
            <Filter className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 pointer-events-none" />
          </div>

          {/* Vehicle Filter */}
          <div className="relative">
            <select
              value={vehicleFilter}
              onChange={(e) => setVehicleFilter(e.target.value)}
              className="bg-zinc-900 border-2 border-zinc-800 text-zinc-400 font-bold uppercase tracking-wider text-[11px] rounded-2xl py-3.5 pl-4 pr-10 outline-none appearance-none cursor-pointer focus:border-amber-500/50 transition-all"
            >
              <option value="all">SEMUA ARMADA</option>
              <option value="scb_ambulance">AMBULANS B 1229 PIX</option>
              <option value="scb_elf">ELF B 7258 TDB</option>
              <option value="scb_apv">APV B 1035 PIX</option>
            </select>
            <Filter className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 pointer-events-none" />
          </div>

          {activeTab === 'routine' && (
            <button
              onClick={() => setIsRoutineOpen(true)}
              className="btn-primary flex items-center justify-center gap-2 py-3 px-5 text-xs italic font-black uppercase tracking-wider rounded-2xl"
            >
              <Plus className="w-4 h-4" />
              CATAT SERVIS
            </button>
          )}
        </div>
      </div>

      {/* Main List Rendering */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-20">
            <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto shadow-[0_0_15px_rgba(245,158,11,0.2)]"></div>
            <p className="mt-6 text-zinc-600 font-black uppercase tracking-widest text-[10px]">Sinkronisasi Data Perbaikan...</p>
          </div>
        ) : filteredList.map((task) => (
          <div 
            key={task.id}
            className="bento-card border border-zinc-800/80 bg-zinc-900/40 p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 hover:bg-zinc-900/60 hover:border-zinc-700 transition-all group"
          >
            {/* Left Content Column */}
            <div className="flex-1 space-y-3">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-black uppercase border tracking-widest ${
                  task.status === 'pending' 
                    ? 'bg-red-500/10 text-red-500 border-red-500/20' 
                    : task.status === 'in_progress' 
                    ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' 
                    : 'bg-green-500/10 text-green-500 border-green-500/20'
                }`}>
                  {task.status === 'pending' ? 'BELUM SELESAI' : task.status === 'in_progress' ? 'PERBAIKAN' : 'SELESAI'}
                </span>

                {task.isRoutine && (
                  <span className="text-[10px] px-2.5 py-0.5 rounded-full font-black uppercase bg-purple-500/10 text-purple-400 border border-purple-500/20 tracking-widest">
                    RUTIN / BERKALA
                  </span>
                )}

                <span className="text-xs text-zinc-500 font-mono tracking-tight font-bold">
                  {new Date(task.dateCreated).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}
                </span>
              </div>

              <div>
                <h3 className="text-lg font-black text-white uppercase italic tracking-tight">{task.itemLabel}</h3>
                <div className="flex items-center gap-2 text-xs text-zinc-400 mt-1 uppercase font-bold">
                  <Truck className="w-3.5 h-3.5 text-zinc-500" />
                  <span>{getVehiclePlate(task.vehicleId)}</span>
                </div>
              </div>

              {/* Descriptions & Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="p-3 bg-zinc-950/40 rounded-xl border border-zinc-800 text-[11px] leading-relaxed">
                  <span className="text-[8px] font-black uppercase text-zinc-600 block mb-1">Keterangan Awal / Temuan</span>
                  <p className="text-zinc-400 font-medium uppercase italic">{task.originalComment || 'Tidak ada catatan tambahan.'}</p>
                </div>

                {task.repairNotes && (
                  <div className="p-3 bg-amber-500/5 rounded-xl border border-amber-500/10 text-[11px] leading-relaxed">
                    <span className="text-[8px] font-black uppercase text-amber-500 block mb-1">Catatan Tindakan Bengkel</span>
                    <p className="text-zinc-300 font-bold uppercase italic">{task.repairNotes}</p>
                  </div>
                )}
              </div>

              {/* Maintenance summary inline metrics */}
              {task.status !== 'pending' && (
                <div className="flex flex-wrap gap-4 text-[10px] font-mono font-black uppercase text-zinc-500 pt-1.5">
                  {task.mechanicName && (
                    <div className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5" />
                      <span>Mekanik: <span className="text-zinc-300 font-bold">{task.mechanicName}</span></span>
                    </div>
                  )}
                  {task.repairCost !== undefined && (
                    <div className="flex items-center gap-1.5">
                      <Coins className="w-3.5 h-3.5 text-amber-500" />
                      <span>Biaya: <span className="text-amber-500 font-bold">Rp {task.repairCost.toLocaleString('id-ID')}</span></span>
                    </div>
                  )}
                  {task.repairDate && (
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Selesai: <span className="text-zinc-300 font-bold">{task.repairDate}</span></span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right Action Column */}
            <div className="flex items-center gap-4 shrink-0 w-full md:w-auto pt-4 md:pt-0 border-t md:border-t-0 border-zinc-800/80">
              {/* Media Thumbnails */}
              <div className="flex gap-2.5">
                {task.originalPhoto && (
                  <div className="text-center">
                    <img 
                      src={task.originalPhoto} 
                      alt="Sebelum" 
                      className="w-12 h-12 rounded-lg object-cover border border-zinc-800" 
                      referrerPolicy="no-referrer"
                    />
                    <span className="text-[8px] text-zinc-600 block mt-1 font-mono uppercase">SEBELUM</span>
                  </div>
                )}
                {task.resolvedPhoto && (
                  <div className="text-center">
                    <img 
                      src={task.resolvedPhoto} 
                      alt="Sesudah" 
                      className="w-12 h-12 rounded-lg object-cover border border-zinc-800" 
                      referrerPolicy="no-referrer"
                    />
                    <span className="text-[8px] text-zinc-600 block mt-1 font-mono uppercase">SESUDAH</span>
                  </div>
                )}
              </div>

              {/* Main Interaction Button */}
              <div className="flex-1 md:flex-none flex justify-end gap-2">
                <button
                  onClick={() => handleOpenAction(task)}
                  className={`py-3 px-5 text-xs font-black uppercase tracking-wider italic rounded-xl flex items-center justify-center gap-1.5 transition-all ${
                    task.status === 'resolved' 
                      ? 'bg-zinc-800 hover:bg-zinc-750 text-zinc-300 border border-zinc-700/60' 
                      : 'bg-amber-500 hover:bg-amber-400 text-zinc-950 shadow-md shadow-amber-500/5'
                  }`}
                >
                  <Wrench className="w-3.5 h-3.5" />
                  {task.status === 'resolved' ? 'EDIT LOG' : 'TINDAK LANJUT'}
                </button>

                {role === 'super_admin' && (
                  <button
                    onClick={() => handleDeleteRepair(task.id)}
                    className="p-3 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/10 rounded-xl transition-all"
                    title="Hapus Log"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}

        {!loading && filteredList.length === 0 && (
          <div className="text-center py-24 bento-card bg-zinc-950/20 border-dashed">
            <Wrench className="w-20 h-20 text-zinc-900 mx-auto mb-6 animate-pulse" />
            <p className="text-zinc-700 font-black uppercase tracking-[0.3em] text-xs">Belum Ada Catatan Pemeliharaan</p>
          </div>
        )}
      </div>

      {/* MODAL 1: Follow up Repair Action */}
      <AnimatePresence>
        {isActionOpen && selectedTask && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                stopCamera();
                setIsActionOpen(false);
              }}
              className="absolute inset-0 bg-zinc-950/85 backdrop-blur-md"
            />

            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-lg bg-zinc-900 border-2 border-zinc-800 rounded-[32px] overflow-hidden shadow-2xl flex flex-col max-h-[85vh] z-10"
            >
              {/* Header */}
              <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-xl">
                    <Wrench className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-white italic uppercase tracking-tight">Tindak Lanjut Perbaikan</h2>
                    <p className="text-[9px] text-zinc-500 font-mono">TASK ID: {selectedTask.id}</p>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    stopCamera();
                    setIsActionOpen(false);
                  }}
                  className="p-2 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable Form */}
              <form onSubmit={handleSaveAction} className="p-6 overflow-y-auto space-y-4 flex-1">
                {/* Meta Summary Info */}
                <div className="p-4 bg-zinc-950/60 rounded-2xl border border-zinc-800 space-y-1">
                  <span className="text-[8px] font-black uppercase text-zinc-500 font-mono">DIPERBAIKI UNTUK</span>
                  <h4 className="text-sm font-black text-white uppercase italic">{selectedTask.itemLabel}</h4>
                  <p className="text-[10px] text-zinc-400 font-bold uppercase">{getVehiclePlate(selectedTask.vehicleId)}</p>
                </div>

                {/* Status Toggle */}
                <div>
                  <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">STATUS PERBAIKAN</label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setFormStatus('pending')}
                      className={`py-3 rounded-xl text-xs font-black uppercase italic tracking-wider border-2 transition-all ${
                        formStatus === 'pending'
                          ? 'bg-red-500/15 border-red-500 text-red-500'
                          : 'bg-zinc-950 border-zinc-800 text-zinc-500 hover:text-zinc-400'
                      }`}
                    >
                      BELUM SELESAI
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormStatus('in_progress')}
                      className={`py-3 rounded-xl text-xs font-black uppercase italic tracking-wider border-2 transition-all ${
                        formStatus === 'in_progress'
                          ? 'bg-amber-500/15 border-amber-500 text-amber-500'
                          : 'bg-zinc-950 border-zinc-800 text-zinc-500 hover:text-zinc-400'
                      }`}
                    >
                      DIPERBAIKI
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormStatus('resolved')}
                      className={`py-3 rounded-xl text-xs font-black uppercase italic tracking-wider border-2 transition-all ${
                        formStatus === 'resolved'
                          ? 'bg-green-500/15 border-green-500 text-green-500'
                          : 'bg-zinc-950 border-zinc-800 text-zinc-500 hover:text-zinc-400'
                      }`}
                    >
                      SELESAI
                    </button>
                  </div>
                </div>

                {/* Grid Inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1.5">BIAYA PERBAIKAN (RP)</label>
                    <input 
                      type="number" 
                      placeholder="Contoh: 450000"
                      value={formCost}
                      onChange={(e) => setFormCost(e.target.value)}
                      className="w-full bg-zinc-950 border-2 border-zinc-800 text-white rounded-xl py-3 px-4 text-xs font-bold outline-none focus:border-amber-500/50 transition-all placeholder:text-zinc-800"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1.5">TANGGAL TINDAKAN</label>
                    <input 
                      type="date" 
                      value={formDate}
                      onChange={(e) => setFormDate(e.target.value)}
                      className="w-full bg-zinc-950 border-2 border-zinc-800 text-white rounded-xl py-3 px-4 text-xs font-bold outline-none focus:border-amber-500/50 transition-all text-zinc-300"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1.5">NAMA BENGKEL / MEKANIK</label>
                  <input 
                    type="text" 
                    placeholder="Contoh: Bengkel Utama SCB / Pak Mamat"
                    value={formMechanic}
                    onChange={(e) => setFormMechanic(e.target.value)}
                    className="w-full bg-zinc-950 border-2 border-zinc-800 text-white rounded-xl py-3 px-4 text-xs font-bold outline-none focus:border-amber-500/50 transition-all placeholder:text-zinc-800"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1.5">CATATAN TINDAKAN PERBAIKAN</label>
                  <textarea 
                    rows={3}
                    placeholder="Tuliskan detail perbaikan yang dilakukan (misal: penggantian kampas rem baru original)..."
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    className="w-full bg-zinc-950 border-2 border-zinc-800 text-white rounded-xl py-3 px-4 text-xs font-bold outline-none focus:border-amber-500/50 transition-all placeholder:text-zinc-800 resize-none"
                  />
                </div>

                {/* Evidence Photo of Repair */}
                <div>
                  <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">BUKTI PERBAIKAN (FOTO)</label>
                  {isCapturing ? (
                    <div className="space-y-3">
                      <div className="relative bg-black rounded-2xl overflow-hidden aspect-video border border-zinc-800">
                        <video id="repair-camera" className="w-full h-full object-cover" playsInline />
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={capturePhoto}
                          className="flex-1 py-3 bg-green-500 hover:bg-green-400 text-zinc-950 text-xs font-black uppercase italic tracking-widest rounded-xl transition-all"
                        >
                          AMBIL FOTO
                        </button>
                        <button
                          type="button"
                          onClick={stopCamera}
                          className="py-3 px-5 bg-zinc-950 border border-zinc-800 text-zinc-400 hover:text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all"
                        >
                          BATAL
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-4">
                      {formPhoto ? (
                        <div className="relative">
                          <img 
                            src={formPhoto} 
                            alt="Bukti Perbaikan" 
                            className="w-24 h-24 rounded-2xl object-cover border border-zinc-700" 
                            referrerPolicy="no-referrer"
                          />
                          <button
                            type="button"
                            onClick={() => setFormPhoto('')}
                            className="absolute -top-1.5 -right-1.5 p-1 bg-red-500 text-white rounded-full border border-zinc-900 shadow-md hover:bg-red-400"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={startCamera}
                          className="w-24 h-24 bg-zinc-950 hover:bg-zinc-900 border-2 border-dashed border-zinc-800 hover:border-zinc-750 text-zinc-500 hover:text-zinc-400 rounded-2xl flex flex-col items-center justify-center gap-1.5 transition-all"
                        >
                          <Camera className="w-6 h-6" />
                          <span className="text-[8px] font-black uppercase tracking-wider">AMBIL FOTO</span>
                        </button>
                      )}
                      <div className="flex-1 text-[10px] text-zinc-500 italic leading-relaxed">
                        Sangat direkomendasikan untuk mengambil foto bukti fisik sparepart baru atau hasil akhir perbaikan sebagai dokumentasi otentik.
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer Submit Button */}
                <div className="pt-4 border-t border-zinc-800">
                  <button 
                    type="submit"
                    className="btn-primary w-full py-4 flex items-center justify-center gap-2 text-xs font-black uppercase italic tracking-widest"
                  >
                    <Check className="w-4 h-4" />
                    SIMPAN TINDAK LANJUT
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: Create Routine Maintenance Log */}
      <AnimatePresence>
        {isRoutineOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsRoutineOpen(false)}
              className="absolute inset-0 bg-zinc-950/85 backdrop-blur-md"
            />

            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-lg bg-zinc-900 border-2 border-zinc-800 rounded-[32px] overflow-hidden shadow-2xl flex flex-col max-h-[85vh] z-10"
            >
              {/* Header */}
              <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-500/10 border border-purple-500/20 text-purple-400 rounded-xl">
                    <Wrench className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-white italic uppercase tracking-tight">Catat Servis Rutin / Berkala</h2>
                    <p className="text-[9px] text-zinc-500 font-mono">PREVENTIVE MAINTENANCE LOG</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsRoutineOpen(false)}
                  className="p-2 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable Form */}
              <form onSubmit={handleSaveRoutine} className="p-6 overflow-y-auto space-y-4 flex-1">
                <div>
                  <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1.5">PILIH ARMADA</label>
                  <select 
                    value={routineVehicle}
                    onChange={(e) => setRoutineVehicle(e.target.value)}
                    className="w-full bg-zinc-950 border-2 border-zinc-800 text-white rounded-xl py-3 px-4 text-xs font-bold outline-none focus:border-amber-500/50 transition-all appearance-none cursor-pointer"
                  >
                    <option value="scb_ambulance">AMBULANS B 1229 PIX</option>
                    <option value="scb_elf">ELF B 7258 TDB</option>
                    <option value="scb_apv">APV B 1035 PIX</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1.5">NAMA SERVIS / PERAWATAN</label>
                  <select
                    value={routineLabel}
                    onChange={(e) => setRoutineLabel(e.target.value)}
                    className="w-full bg-zinc-950 border-2 border-zinc-800 text-white rounded-xl py-3 px-4 text-xs font-bold outline-none focus:border-amber-500/50 transition-all appearance-none cursor-pointer mb-2"
                  >
                    <option value="Ganti Oli Mesin">Ganti Oli Mesin</option>
                    <option value="Servis Rutin Bulanan">Servis Rutin Bulanan</option>
                    <option value="Penggantian Ban">Penggantian Ban</option>
                    <option value="Tune Up & Kelistrikan">Tune Up & Kelistrikan</option>
                    <option value="Pembersihan AC / Cabin">Pembersihan AC / Cabin</option>
                    <option value="Uji Emisi / KIR">Uji Emisi / KIR</option>
                    <option value="Lainnya">Lainnya (Tulis manual di bawah)</option>
                  </select>
                  {routineLabel === 'Lainnya' && (
                    <input 
                      type="text"
                      placeholder="Masukkan nama servis manual..."
                      onChange={(e) => setRoutineLabel(e.target.value)}
                      className="w-full bg-zinc-950 border-2 border-zinc-800 text-white rounded-xl py-3 px-4 text-xs font-bold outline-none focus:border-amber-500/50 transition-all placeholder:text-zinc-800 animate-fade-in"
                      required
                    />
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1.5">BIAYA SERVIS (RP)</label>
                    <input 
                      type="number" 
                      placeholder="Contoh: 350000"
                      value={routineCost}
                      onChange={(e) => setRoutineCost(e.target.value)}
                      className="w-full bg-zinc-950 border-2 border-zinc-800 text-white rounded-xl py-3 px-4 text-xs font-bold outline-none focus:border-amber-500/50 transition-all placeholder:text-zinc-800"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1.5">TANGGAL SERVIS</label>
                    <input 
                      type="date" 
                      value={routineDate}
                      onChange={(e) => setRoutineDate(e.target.value)}
                      className="w-full bg-zinc-950 border-2 border-zinc-800 text-white rounded-xl py-3 px-4 text-xs font-bold outline-none focus:border-amber-500/50 transition-all text-zinc-300"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1.5">BENGKEL / MEKANIK REKANAN</label>
                  <input 
                    type="text" 
                    placeholder="Contoh: Bengkel SCB Center / Mandiri Motor"
                    value={routineMechanic}
                    onChange={(e) => setRoutineMechanic(e.target.value)}
                    className="w-full bg-zinc-950 border-2 border-zinc-800 text-white rounded-xl py-3 px-4 text-xs font-bold outline-none focus:border-amber-500/50 transition-all placeholder:text-zinc-800"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1.5">DESKRIPSI TINDAKAN PERAWATAN</label>
                  <textarea 
                    rows={3}
                    placeholder="Tuliskan keterangan pengerjaan servis secara terperinci..."
                    value={routineNotes}
                    onChange={(e) => setRoutineNotes(e.target.value)}
                    className="w-full bg-zinc-950 border-2 border-zinc-800 text-white rounded-xl py-3 px-4 text-xs font-bold outline-none focus:border-amber-500/50 transition-all placeholder:text-zinc-800 resize-none"
                  />
                </div>

                {/* Footer Submit */}
                <div className="pt-4 border-t border-zinc-800">
                  <button 
                    type="submit"
                    className="btn-primary w-full py-4 flex items-center justify-center gap-2 text-xs font-black uppercase italic tracking-widest"
                  >
                    <Check className="w-4 h-4" />
                    CATAT DAN SIMPAN LOG
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
