/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Truck } from 'lucide-react';
import { signInWithGoogle } from '../lib/firebase';

export default function Login() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 p-6 font-sans">
      <div className="max-w-md w-full space-y-10 bg-zinc-900 p-10 rounded-[48px] border-2 border-zinc-800 shadow-2xl shadow-black relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl"></div>
        
        <div className="text-center space-y-6 relative z-10">
          <div className="bg-amber-500 w-20 h-20 rounded-[28px] flex items-center justify-center mx-auto shadow-2xl shadow-amber-500/10 rotate-3 group-hover:rotate-6 transition-transform">
            <Truck className="w-12 h-12 text-zinc-950" />
          </div>
          <div className="space-y-2">
            <h1 className="text-4xl font-black text-white italic tracking-tighter uppercase">Driver<span className="text-amber-500">Check</span></h1>
            <p className="text-zinc-600 text-xs font-black uppercase tracking-[0.3em]">Fleet Security System</p>
          </div>
        </div>

        <button
          onClick={() => signInWithGoogle()}
          className="w-full flex items-center justify-center gap-4 bg-zinc-950 border-2 border-zinc-800 py-5 px-8 rounded-3xl font-black text-zinc-200 uppercase tracking-widest text-[10px] hover:border-amber-500 hover:text-white transition-all shadow-inner active:scale-95 italic"
        >
          <img src="https://www.google.com/favicon.ico" className="w-5 h-5 filter grayscale brightness-200 group-hover:grayscale-0 transition-all" alt="Google" referrerPolicy="no-referrer" />
          Authorize via Google
        </button>

        <div className="pt-6 text-center border-t border-zinc-800/50">
           <p className="text-[9px] text-zinc-700 uppercase font-black tracking-[0.4em] leading-relaxed">
             Secure Access Protocol • 2026
           </p>
        </div>
      </div>
    </div>
  );
}
