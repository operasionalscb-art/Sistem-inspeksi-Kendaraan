/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState, useEffect } from 'react';
import { Camera, X, RotateCcw, Check, Upload, AlertTriangle, Image as ImageIcon } from 'lucide-react';
import { motion } from 'motion/react';

interface CameraCaptureProps {
  onCapture: (base64Image: string) => void;
  onClose: () => void;
  title?: string;
}

export default function CameraCapture({ onCapture, onClose, title = 'Ambil Foto Bukti' }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Start live webcam stream
  const startCamera = async () => {
    setCameraError(null);
    try {
      // Clean up previous stream if any
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setCameraActive(true);
      }
    } catch (err: any) {
      console.warn("Failed to get live user media:", err);
      setCameraError(
        err.name === 'NotAllowedError' 
          ? 'Izin kamera ditolak. Silakan gunakan tombol unggah di bawah.' 
          : 'Kamera langsung tidak tersedia di perangkat ini. Silakan unggah foto.'
      );
      setCameraActive(false);
    }
  };

  useEffect(() => {
    startCamera();
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const handleCapture = () => {
    if (!videoRef.current) return;
    
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    
    // Maintain aspects
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Draw current video frame to canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
      setPhoto(dataUrl);
      
      // Stop stream while reviewing
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        setCameraActive(false);
      }
    }
  };

  const handleRetake = () => {
    setPhoto(null);
    startCamera();
  };

  // Handle local file selection / native mobile camera capture
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setPhoto(base64);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        setCameraActive(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleUsePhoto = () => {
    if (photo) {
      onCapture(photo);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        onClick={onClose}
        className="absolute inset-0 bg-zinc-950/90 backdrop-blur-md"
      />

      {/* Capture Container */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative w-full max-w-lg bg-zinc-900 border-2 border-zinc-800 rounded-[28px] overflow-hidden shadow-2xl flex flex-col z-10"
      >
        {/* Header */}
        <div className="p-5 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500 rounded-xl text-zinc-950">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-wider italic">{title}</h3>
              <p className="text-[9px] font-mono text-zinc-500 uppercase">FOTO KERUSAKAN / TEMUAN UNIT</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* Camera Preview Area */}
        <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden border-b border-zinc-800">
          {photo ? (
            <img 
              src={photo} 
              alt="Preview tangkapan" 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : cameraActive ? (
            <video 
              ref={videoRef}
              playsInline
              muted
              className="w-full h-full object-cover scale-x-[-1]" // mirror for intuitive positioning
            />
          ) : (
            <div className="p-6 text-center space-y-4">
              <div className="w-16 h-16 bg-zinc-900 border-2 border-dashed border-zinc-800 rounded-2xl flex items-center justify-center mx-auto text-zinc-600 animate-pulse">
                <Camera className="w-8 h-8" />
              </div>
              <p className="text-xs text-zinc-500 max-w-xs mx-auto font-medium">
                {cameraError || 'Menghubungkan ke kamera langsung...'}
              </p>
            </div>
          )}

          {/* Guidelines Overlay */}
          {!photo && cameraActive && (
            <div className="absolute inset-4 border border-dashed border-white/20 rounded-xl pointer-events-none flex items-center justify-center">
              <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-white/30 bg-black/40 px-3 py-1 rounded-full">Posisikan Isu Di Sini</span>
            </div>
          )}
        </div>

        {/* Controls Panel */}
        <div className="p-6 bg-zinc-950/40 space-y-4">
          {photo ? (
            /* Confirm or Retake */
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={handleRetake}
                className="py-3 px-4 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-white rounded-xl text-xs font-black uppercase tracking-wider italic transition-all flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                ULANGI FOTO
              </button>
              <button
                type="button"
                onClick={handleUsePhoto}
                className="py-3 px-4 bg-emerald-500 hover:bg-emerald-600 text-zinc-950 rounded-xl text-xs font-black uppercase tracking-wider italic transition-all flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" />
                GUNAKAN FOTO
              </button>
            </div>
          ) : (
            /* Live Capture Controls */
            <div className="space-y-4">
              <div className="flex justify-center">
                {cameraActive ? (
                  <button
                    type="button"
                    onClick={handleCapture}
                    className="w-16 h-16 bg-white hover:bg-zinc-100 rounded-full border-4 border-zinc-800 hover:border-zinc-700 active:scale-95 transition-all flex items-center justify-center text-zinc-900 group shadow-lg"
                    title="Ambil Foto"
                  >
                    <div className="w-10 h-10 rounded-full border-2 border-zinc-900 bg-transparent flex items-center justify-center">
                      <div className="w-4 h-4 bg-zinc-900 rounded-full"></div>
                    </div>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={startCamera}
                    className="py-2.5 px-4 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl text-[10px] font-black uppercase tracking-wider text-amber-500 transition-all flex items-center gap-2"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    COBA AKTIFKAN KAMERA LAGI
                  </button>
                )}
              </div>

              {/* Upload fallback */}
              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-zinc-800"></div>
                <span className="flex-shrink mx-3 text-[8px] font-black text-zinc-600 uppercase tracking-widest">ATAU</span>
                <div className="flex-grow border-t border-zinc-800"></div>
              </div>

              <div className="flex justify-center">
                <label className="cursor-pointer py-3.5 px-5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl text-xs font-black uppercase tracking-widest italic text-zinc-400 hover:text-white transition-all flex items-center gap-2.5">
                  <Upload className="w-4 h-4 text-amber-500" />
                  <span>PILIH DARI GALERI / AMBIL KABEL</span>
                  <input 
                    type="file" 
                    accept="image/*"
                    capture="environment"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          )}

          <p className="text-[9px] text-zinc-600 text-center font-mono uppercase">
            Format gambar didukung: JPG, PNG • Max size ~2MB
          </p>
        </div>
      </motion.div>
    </div>
  );
}
