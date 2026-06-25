/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { Truck, Plus, Search, Edit2, Trash2, X, Save } from 'lucide-react';
import { auth, db, handleFirestoreError } from '../lib/firebase';
import { collection, query, onSnapshot, addDoc, updateDoc, deleteDoc, doc, where } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from './FirebaseProvider';

export default function Vehicles() {
  const { role } = useAuth();
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<any>(null);
  const [formData, setFormData] = useState({
    plateNumber: '',
    model: '',
    brand: '',
    lastOdometer: 0,
    userId: ''
  });

  useEffect(() => {
    const q = query(collection(db, 'vehicles'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setVehicles(docs);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, 'list', 'vehicles');
    });
    return unsubscribe;
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const dataWithUser = {
        ...formData,
        userId: auth.currentUser?.uid || 'shared'
      };
      if (editingVehicle) {
        await updateDoc(doc(db, 'vehicles', editingVehicle.id), dataWithUser);
        alert('Data unit armada berhasil diperbarui.');
      } else {
        await addDoc(collection(db, 'vehicles'), dataWithUser);
        alert('Data unit armada baru berhasil ditambahkan.');
      }
      closeModal();
    } catch (error: any) {
      console.error('Failed to save vehicle:', error);
      alert('Gagal menyimpan data unit armada: ' + (error.message || error));
    }
  };

  const handleDelete = async (id: string) => {
    if (role !== 'super_admin') {
      alert('Hanya Super Admin yang diizinkan untuk menghapus data unit armada.');
      return;
    }
    if (confirm('Apakah Anda yakin ingin menghapus data unit armada ini?')) {
      try {
        await deleteDoc(doc(db, 'vehicles', id));
        alert('Data unit armada berhasil dihapus.');
      } catch (error: any) {
        console.error('Failed to delete vehicle:', error);
        alert('Gagal menghapus data unit armada: ' + (error.message || error));
      }
    }
  };

  const openModal = (vehicle: any = null) => {
    if (vehicle) {
      setEditingVehicle(vehicle);
      setFormData({
        plateNumber: vehicle.plateNumber,
        model: vehicle.model,
        brand: vehicle.brand,
        lastOdometer: vehicle.lastOdometer,
        userId: vehicle.userId
      });
    } else {
      setEditingVehicle(null);
      setFormData({ plateNumber: '', model: '', brand: '', lastOdometer: 0, userId: auth.currentUser?.uid || '' });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingVehicle(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
         <div className="flex-1 w-full relative">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-600 w-5 h-5" />
            <input 
              type="text" 
              placeholder="CARI PLAT NOMOR..."
              className="w-full bg-zinc-900 border-2 border-zinc-800 text-white rounded-[24px] py-4 pl-14 pr-6 outline-none focus:border-amber-500/50 transition-all font-black uppercase italic text-xs tracking-widest placeholder:text-zinc-800"
            />
         </div>
         {role === 'super_admin' && (
           <button 
             onClick={() => openModal()}
             className="btn-primary w-full sm:w-auto flex items-center justify-center gap-2 italic"
           >
              <Plus className="w-5 h-5" />
              TAMBAH UNIT
           </button>
         )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading ? (
          <div className="col-span-full py-20 text-center">
            <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto shadow-[0_0_15px_rgba(245,158,11,0.2)]"></div>
          </div>
        ) : vehicles.map((vehicle) => (
          <div key={vehicle.id} className="bento-card group flex flex-col justify-between h-48 hover:border-amber-500/50 transition-all">
            <div className="flex justify-between items-start">
               <div>
                  <h3 className="text-2xl font-black text-white italic tracking-tighter uppercase">{vehicle.plateNumber}</h3>
                  <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">{vehicle.brand} {vehicle.model}</p>
               </div>
               {role === 'super_admin' && (
                 <div className="bg-zinc-950 p-2 rounded-xl flex gap-2">
                    <button onClick={() => openModal(vehicle)} className="p-2 text-zinc-500 hover:text-amber-500 transition-colors" title="Edit Unit">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(vehicle.id)} className="p-2 text-zinc-500 hover:text-red-500 transition-colors" title="Hapus Unit">
                      <Trash2 className="w-4 h-4" />
                    </button>
                 </div>
               )}
            </div>
            
            <div className="border-t border-zinc-800 pt-4 flex justify-between items-center">
               <div className="font-mono">
                  <p className="text-[9px] text-zinc-600 font-black uppercase tracking-widest">Odometer</p>
                  <p className="text-amber-500 font-black">{vehicle.lastOdometer.toLocaleString()} <span className="text-zinc-600">KM</span></p>
               </div>
               <Truck className="w-8 h-8 text-zinc-800 group-hover:text-amber-500/20 transition-colors" />
            </div>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
             <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               onClick={closeModal}
               className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm" 
             />
             <motion.div 
               initial={{ opacity: 0, scale: 0.9, y: 20 }}
               animate={{ opacity: 1, scale: 1, y: 0 }}
               exit={{ opacity: 0, scale: 0.9, y: 20 }}
               className="relative bg-zinc-900 border-2 border-zinc-800 rounded-[40px] p-8 w-full max-w-md shadow-2xl"
             >
                <div className="flex justify-between items-center mb-8">
                   <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter">
                     {editingVehicle ? 'Edit Unit' : 'Unit Baru'}
                   </h2>
                   <button onClick={closeModal} className="p-2 bg-zinc-800 rounded-xl text-zinc-400">
                     <X className="w-5 h-5" />
                   </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                   <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 px-2">Plat Nomor</label>
                        <input 
                          required
                          value={formData.plateNumber}
                          onChange={e => setFormData({...formData, plateNumber: e.target.value.toUpperCase()})}
                          placeholder="B 1234 ABC"
                          className="w-full bg-zinc-950 border-2 border-zinc-800 rounded-2xl p-4 text-white font-black italic uppercase outline-none focus:border-amber-500/50" 
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 px-2">Brand</label>
                          <input 
                            required
                            value={formData.brand}
                            onChange={e => setFormData({...formData, brand: e.target.value})}
                            placeholder="Toyota"
                            className="w-full bg-zinc-950 border-2 border-zinc-800 rounded-2xl p-4 text-white font-bold outline-none focus:border-amber-500/50" 
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 px-2">Model</label>
                          <input 
                            required
                            value={formData.model}
                            onChange={e => setFormData({...formData, model: e.target.value})}
                            placeholder="Dyna"
                            className="w-full bg-zinc-950 border-2 border-zinc-800 rounded-2xl p-4 text-white font-bold outline-none focus:border-amber-500/50" 
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 px-2">Last Odometer</label>
                        <input 
                          type="number"
                          required
                          value={formData.lastOdometer}
                          onChange={e => setFormData({...formData, lastOdometer: parseInt(e.target.value) || 0})}
                          className="w-full bg-zinc-950 border-2 border-zinc-800 rounded-2xl p-4 text-white font-mono font-black outline-none focus:border-amber-500/50" 
                        />
                      </div>
                   </div>

                   <button type="submit" className="w-full btn-primary py-5 text-xl flex items-center justify-center gap-2 italic">
                      <Save className="w-6 h-6" />
                      SIMPAN DATA
                   </button>
                </form>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
