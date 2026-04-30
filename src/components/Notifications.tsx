/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { Bell, Info, AlertTriangle, CheckCircle2, MoreVertical, Trash2 } from 'lucide-react';
import { db, auth, handleFirestoreError } from '../lib/firebase';
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc } from 'firebase/firestore';

export default function Notifications() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', auth.currentUser.uid),
      orderBy('date', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setAlerts(docs);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const markAsRead = async (id: string) => {
    try {
      await updateDoc(doc(db, 'notifications', id), { read: true });
    } catch (error) {
      handleFirestoreError(error, 'update', `notifications/${id}`);
    }
  };

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-8">
         <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest underline cursor-pointer hover:text-amber-400">Mark all as read</p>
         <button className="w-10 h-10 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-center hover:bg-zinc-800">
            <Trash2 className="w-4 h-4 text-zinc-600 hover:text-red-500" />
         </button>
      </div>

      <div className="space-y-3">
        {loading ? (
             <div className="text-center py-20">
                <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto shadow-[0_0_15px_rgba(245,158,11,0.2)]"></div>
             </div>
        ) : alerts.map((alert) => (
          <div 
            key={alert.id} 
            onClick={() => !alert.read && markAsRead(alert.id)}
            className={`bento-card !p-5 flex items-start gap-5 transition-all hover:bg-zinc-900/60 cursor-pointer ${
              !alert.read ? 'border-l-4 border-l-amber-500 bg-zinc-900 shadow-xl' : 'opacity-60 bg-transparent'
            }`}
          >
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border-2 border-zinc-800 shrink-0 ${
              alert.type === 'warning' ? 'text-amber-500 bg-amber-500/5' :
              alert.type === 'success' ? 'text-green-500 bg-green-500/5' :
              'text-blue-500 bg-blue-500/5'
            }`}>
              {alert.type === 'warning' && <AlertTriangle className="w-6 h-6" />}
              {alert.type === 'success' && <CheckCircle2 className="w-6 h-6" />}
              {alert.type === 'info' && <Info className="w-6 h-6" />}
            </div>
            
            <div className="flex-1 min-w-0">
               <div className="flex items-center justify-between gap-2">
                  <h4 className={`font-black uppercase tracking-tight italic text-lg ${!alert.read ? 'text-white' : 'text-zinc-500'}`}>
                    {alert.title}
                  </h4>
                  <span className="text-[10px] text-zinc-600 font-mono uppercase tracking-widest">
                    {new Date(alert.date).toLocaleDateString('id-ID')}
                  </span>
               </div>
               <p className="mt-1 text-sm text-zinc-400 font-medium">
                  {alert.message}
               </p>
            </div>
          </div>
        ))}
      </div>

      {!loading && alerts.length === 0 && (
        <div className="text-center py-24 bento-card bg-zinc-950/20 border-dashed">
           <Bell className="w-20 h-20 text-zinc-900 mx-auto mb-6" />
           <p className="text-zinc-700 font-black uppercase tracking-[0.3em]">No Notifications</p>
        </div>
      )}
    </div>
  );
}
