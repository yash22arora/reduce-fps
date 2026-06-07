"use client";

import { useState, useRef, ChangeEvent, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Video, Play, Download, Settings2, Loader2, ArrowRight, ShieldCheck, User } from 'lucide-react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import { createClient } from '@/lib/supabase/client';
import { AuthModal } from '@/components/AuthModal';
import { PaymentModal } from '@/components/PaymentModal';
import { toast } from 'react-hot-toast';
import Link from 'next/link';
import { DemoModal } from '@/components/DemoModal';
import { useCredits } from '@/hooks/use-credits';
import { useAnonStatus, useMarkAnonUsed, useDecrementCredits } from '@/hooks/use-usage';

const ASPECT_RATIOS = [
  { id: 'original', label: 'Original', w: 0,  h: 0  },
  { id: '16:9',     label: '16:9',     w: 16, h: 9  },
  { id: '9:16',     label: '9:16',     w: 9,  h: 16 },
  { id: '4:3',      label: '4:3',      w: 4,  h: 3  },
  { id: '3:4',      label: '3:4',      w: 3,  h: 4  },
  { id: '1:1',      label: '1:1',      w: 1,  h: 1  },
  { id: '4:5',      label: '4:5',      w: 4,  h: 5  },
  { id: '5:4',      label: '5:4',      w: 5,  h: 4  },
];

const QUALITY_LABELS = ['Low', 'Medium', 'High'] as const;
// CRF 23 is FFmpeg's default (good quality). Lower = larger file, higher = smaller.
const QUALITY_CRF    = [35, 28, 23];

// Multipliers relative to a source assumed at CRF ~23 (typical web/phone video).
// Each 6 CRF units ≈ 2× bitrate change in H.264.
const QUALITY_MULT   = [0.25, 0.6, 1.0]; // Low (CRF 35), Medium (CRF 28), High (CRF 23)

function calcOutputDimensions(srcW: number, srcH: number, ratio: string) {
  if (ratio === 'original') return { w: srcW, h: srcH };
  const [rw, rh] = ratio.split(':').map(Number);
  const srcR = srcW / srcH, tgtR = rw / rh;
  let w: number, h: number;
  if (srcR > tgtR) {
    h = srcH; w = Math.round(srcH * tgtR); if (w % 2) w -= 1;
  } else {
    w = srcW; h = Math.round(srcW / tgtR); if (h % 2) h -= 1;
  }
  return { w, h };
}

function sliderTrackStyle(value: number, min: number, max: number): React.CSSProperties {
  const pct = ((value - min) / (max - min)) * 100;
  return {
    background: `linear-gradient(to right, #00f0ff ${pct}%, #27272a ${pct}%)`,
  };
}

function AspectRatioRect({ w, h, selected }: { w: number; h: number; selected: boolean }) {
  const BOX = 36;
  const ratio = w / h;
  let rw: number, rh: number;
  if (ratio >= 1) {
    rw = BOX;
    rh = Math.round(BOX / ratio);
  } else {
    rh = BOX;
    rw = Math.round(BOX * ratio);
  }
  return (
    <div
      className="rounded-sm border-2 transition-colors"
      style={{
        width: rw,
        height: rh,
        borderColor: selected ? '#00f0ff' : '#3f3f46',
        backgroundColor: selected ? 'rgba(0,240,255,0.1)' : 'transparent',
      }}
    />
  );
}

export default function Home() {
  const [file, setFile]               = useState<File | null>(null);
  const [uploadedPath, setUploadedPath] = useState<string>('');
  const [fileName, setFileName]       = useState<string>('');

  const [targetFps, setTargetFps]     = useState<number>(6);
  const [detectedFps, setDetectedFps] = useState<number | null>(null);
  const [isDetectingFps, setIsDetectingFps] = useState(false);
  const [quality, setQuality]         = useState<number>(2); // 0=Low 1=Medium 2=High
  const [aspectRatio, setAspectRatio] = useState<string>('original');
  const [videoMeta, setVideoMeta]     = useState<{ duration: number; width: number; height: number } | null>(null);

  const estimatedSizeMB = useMemo(() => {
    // Need source fps to compute the frame-count ratio.
    if (!videoMeta || !file || !detectedFps) return null;
    const { w: outW, h: outH } = calcOutputDimensions(videoMeta.width, videoMeta.height, aspectRatio);
    const pixelFactor = (outW * outH) / (videoMeta.width * videoMeta.height);
    // Base: scale source file size by fps ratio, pixel ratio, and quality multiplier.
    return (file.size / (1024 * 1024)) * (targetFps / detectedFps) * pixelFactor * QUALITY_MULT[quality];
  }, [videoMeta, file, detectedFps, targetFps, quality, aspectRatio]);

  const [status, setStatus]           = useState<"idle" | "loading_ffmpeg" | "processing" | "done" | "error">("loading_ffmpeg");
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [progress, setProgress]       = useState<number>(0);

  const [outputPath, setOutputPath]   = useState<string>('');
  const [outputFileName, setOutputFileName] = useState<string>('');
  const [outputFileSize, setOutputFileSize] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const ffmpegRef    = useRef<FFmpeg | null>(null);
  const videoRef     = useRef<HTMLVideoElement>(null);

  const [user, setUser]               = useState<any>(null);
  const supabase                      = createClient();
  const { data: credits, refetch: refetchCredits } = useCredits(user?.id);
  const { data: anonStatus, isLoading: isAnonLoading } = useAnonStatus();
  const markAnonUsed                  = useMarkAnonUsed();
  const decrementCredits              = useDecrementCredits();

  const [isAuthModalOpen, setIsAuthModalOpen]       = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isDemoModalOpen, setIsDemoModalOpen]       = useState(false);
  const [isSigningOut, setIsSigningOut]             = useState(false);
  const [isClickingUpload, setIsClickingUpload]     = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, [supabase]);

  const progressLabel = status !== 'processing' ? '' :
    progress === 0  ? 'Allocating WASM Memory...' :
    progress < 15   ? 'Analyzing Source Media...' :
    progress < 85   ? 'Transcoding Frames...' :
    progress < 99   ? 'Muxing MP4 Container...' :
                      'Finalizing Video Object...';

  useEffect(() => {
    const loadFFmpeg = async () => {
      setStatus("loading_ffmpeg");
      try {
        const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.10/dist/umd';
        const ffmpeg  = new FFmpeg();
        ffmpegRef.current = ffmpeg;
        ffmpeg.on('progress', ({ progress }) => {
          setProgress(Math.round(progress * 100));
        });
        await ffmpeg.load({
          coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`,   'text/javascript'),
          wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
        });
        setStatus("idle");
      } catch (err: any) {
        console.error("FFmpeg Load Error:", err);
        setErrorMessage("Failed to load FFmpeg engine. Please refresh.");
        setStatus("error");
      }
    };
    loadFFmpeg();
  }, []);

  useEffect(() => {
    if (!file || !ffmpegRef.current) return;

    const detect = async () => {
      const ffmpeg = ffmpegRef.current!;
      setIsDetectingFps(true);

      const ext       = file.name.substring(file.name.lastIndexOf('.'));
      const probeName = `probe${ext}`;
      let   fps: number | null = null;

      const logHandler = ({ message }: { message: string }) => {
        if (fps) return;
        const m = message.match(/(\d+(?:\.\d+)?)\s+fps/);
        if (m) fps = Math.round(parseFloat(m[1]));
      };

      ffmpeg.on('log', logHandler);
      try {
        await ffmpeg.writeFile(probeName, await fetchFile(file));
        await ffmpeg.exec(['-i', probeName]);
      } catch {
        // FFmpeg exits non-zero when no output is given — that's expected.
        // Stream info is emitted to the log before the error.
      } finally {
        ffmpeg.off('log', logHandler);
        try { await ffmpeg.deleteFile(probeName); } catch {}
      }

      if (fps && fps > 0) {
        setDetectedFps(fps);
        setTargetFps((prev) => Math.min(prev, fps!));
      }
      setIsDetectingFps(false);
    };

    detect();
  }, [file]);

  useEffect(() => {
    if (!localStorage.getItem('demo_seen')) setIsDemoModalOpen(true);
  }, []);

  useEffect(() => {
    document.body.style.overflow = isDemoModalOpen ? 'hidden' : 'auto';
  }, [isDemoModalOpen]);

  const cleanupCurrentSession = () => {
    if (uploadedPath) URL.revokeObjectURL(uploadedPath);
    if (outputPath)   URL.revokeObjectURL(outputPath);
  };

  const handleUploadClick = async () => {
    if (isDemoModalOpen) return;
    setIsClickingUpload(true);
    try {
      if (!user) {
        if (isAnonLoading) return;
        if (anonStatus?.used) { setIsAuthModalOpen(true); return; }
      } else if (credits !== undefined && credits !== null && credits <= 0) {
        setIsPaymentModalOpen(true);
        return;
      }
      fileInputRef.current?.click();
    } finally {
      setTimeout(() => setIsClickingUpload(false), 1000);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.size > 100 * 1024 * 1024) { setErrorMessage("File exceeds 100MB limit."); return; }
      if (!selectedFile.type.startsWith('video/'))  { setErrorMessage("Please select a valid video file."); return; }
      setFile(selectedFile);
      setErrorMessage('');
      setDetectedFps(null);
      setTargetFps(6);
      setVideoMeta(null);
      cleanupCurrentSession();
      setUploadedPath(URL.createObjectURL(selectedFile));
      setFileName(selectedFile.name);
      setStatus("idle");
    }
  };

  const handleConvert = async () => {
    if (!file || !fileName || !ffmpegRef.current) return;

    if (!user) {
      try { await markAnonUsed.mutateAsync(); }
      catch (err: any) { setErrorMessage(err.message); return; }
    } else {
      try { await decrementCredits.mutateAsync(); }
      catch (err: any) {
        if (err.message === 'out_of_credits') { setIsPaymentModalOpen(true); return; }
        setErrorMessage(err.message);
        return;
      }
    }

    setStatus("processing");
    setProgress(0);
    setErrorMessage('');

    try {
      const ffmpeg    = ffmpegRef.current;
      const ext       = fileName.substring(fileName.lastIndexOf('.'));
      const inputName = `input${ext}`;
      const outputName = 'output.mp4';

      await ffmpeg.writeFile(inputName, await fetchFile(file));

      const filters: string[] = [`fps=${targetFps}`];

      if (aspectRatio !== 'original' && videoRef.current) {
        const [ratioW, ratioH] = aspectRatio.split(':').map(Number);
        const sourceW = videoRef.current.videoWidth;
        const sourceH = videoRef.current.videoHeight;

        if (sourceW && sourceH) {
          const sourceRatio = sourceW / sourceH;
          const targetRatio = ratioW / ratioH;
          let cropW: number, cropH: number;

          if (sourceRatio > targetRatio) {
            cropH = sourceH;
            cropW = Math.round(sourceH * targetRatio);
            if (cropW % 2 !== 0) cropW -= 1;
          } else {
            cropW = sourceW;
            cropH = Math.round(sourceW / targetRatio);
            if (cropH % 2 !== 0) cropH -= 1;
          }

          filters.push(`crop=${cropW}:${cropH}`);
        }
      }

      await ffmpeg.exec([
        '-y',
        '-i', inputName,
        '-vf', filters.join(','),
        '-c:v', 'libx264',
        '-crf', String(QUALITY_CRF[quality]),
        '-pix_fmt', 'yuv420p',
        '-an',
        outputName,
      ]);

      const data = await ffmpeg.readFile(outputName);
      // @ts-ignore
      const videoBlob = new Blob([data.buffer || data], { type: 'video/mp4' });
      const url = URL.createObjectURL(videoBlob);
      setOutputPath(url);

      const baseName   = fileName.lastIndexOf('.') > 0 ? fileName.substring(0, fileName.lastIndexOf('.')) : fileName;
      const ratioTag   = aspectRatio !== 'original' ? `_${aspectRatio.replace(':', 'x')}` : '';
      const qualityTag = `_${QUALITY_LABELS[quality].toLowerCase()}`;
      setOutputFileName(`${baseName}_${targetFps}fps${ratioTag}${qualityTag}.mp4`);

      // @ts-ignore
      setOutputFileSize(data.byteLength || data.length);
      setStatus("done");

    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "Failed to convert video.");
      setStatus("error");
    }
  };

  return (
    <>
      <style>{`
        .custom-slider {
          -webkit-appearance: none;
          appearance: none;
          height: 4px;
          border-radius: 9999px;
          outline: none;
          cursor: pointer;
          width: 100%;
        }
        .custom-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #00f0ff;
          cursor: pointer;
          box-shadow: 0 0 10px rgba(0,240,255,0.6);
          border: 2px solid rgba(0,240,255,0.3);
          transition: box-shadow 0.2s;
        }
        .custom-slider::-webkit-slider-thumb:hover {
          box-shadow: 0 0 18px rgba(0,240,255,0.95);
        }
        .custom-slider::-moz-range-thumb {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #00f0ff;
          cursor: pointer;
          box-shadow: 0 0 10px rgba(0,240,255,0.6);
          border: 2px solid rgba(0,240,255,0.3);
        }
      `}</style>

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={() => setIsAuthModalOpen(false)}
      />
      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        userId={user?.id}
        onSuccess={() => {
          setIsPaymentModalOpen(false);
          refetchCredits();
          toast.success("Credits successfully purchased! You may now upload and transcode media.");
        }}
      />
      <DemoModal
        isOpen={isDemoModalOpen}
        onClose={() => {
          localStorage.setItem('demo_seen', '1');
          setIsDemoModalOpen(false);
        }}
      />

      <main className="min-h-screen p-8 max-w-6xl mx-auto flex flex-col gap-12 relative">
        <header className="flex flex-col gap-4 text-center items-center pb-8 relative">

          <div className="flex mb-8 items-center gap-4 w-full">
            {user ? (
              <div className="flex items-center justify-between w-full">
                <div className='mr-auto flex items-center gap-2'>
                  <span className="text-xs text-zinc-500">{user.email}</span>
                  {credits !== null && (
                    <span className="px-3 py-1 text-xs font-bold rounded-full bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/30">
                      {credits} Credits
                    </span>
                  )}
                </div>
                <button
                  onClick={async () => {
                    setIsSigningOut(true);
                    await supabase.auth.signOut();
                    setIsSigningOut(false);
                    toast.success("Signed out successfully.");
                  }}
                  disabled={isSigningOut}
                  className="ml-auto px-4 py-1.5 text-xs font-bold rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition-colors flex items-center gap-2"
                >
                  {isSigningOut ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                  Sign Out
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsAuthModalOpen(true)}
                className="flex ml-auto items-center gap-2 px-4 py-1.5 text-xs font-bold rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition-colors"
              >
                <User className="w-4 h-4" />
                Sign In
              </button>
            )}
          </div>

          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-3 px-4 py-2 rounded-full border border-[var(--border)] bg-[var(--card)]"
          >
            <div className="w-2 h-2 rounded-full bg-neon-cyan neon-glow animate-pulse" />
            <span className="text-sm font-medium tracking-widest uppercase text-zinc-400">ChronoFrame</span>
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-5xl md:text-7xl font-bold tracking-tighter"
          >
            FPS <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-cyan to-neon-yellow">Transcoder</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-zinc-400 max-w-lg text-balance"
          >
            Locally transcode video files to a custom frame rate using WebAssembly. Secure, fast, and completely client-side.
          </motion.p>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="flex items-start justify-center gap-3 mt-4 px-4 py-3 bg-green-500/10 border border-green-500/20 text-green-400 rounded-lg text-sm max-w-xl"
          >
            <ShieldCheck className="w-5 h-5 shrink-0 mt-0.5" />
            <span className="text-left"><strong>End-to-End Privacy:</strong> All transcoding is executed locally via WebAssembly. Your files are never uploaded to an external server.</span>
          </motion.div>
        </header>

        {errorMessage && (
          <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/50 text-red-400 text-center">
            {errorMessage}
          </div>
        )}

        {status === "loading_ffmpeg" && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="w-12 h-12 animate-spin text-neon-cyan" />
            <p className="text-zinc-400 animate-pulse">Initializing WebAssembly Transcoding Core...</p>
          </div>
        )}

        {!file && status === "idle" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-xl mx-auto"
          >
            <div
              onClick={handleUploadClick}
              className={`glass-panel p-12 rounded-2xl border-dashed border-2 transition-all cursor-pointer flex flex-col items-center justify-center gap-4 text-center group ${isAnonLoading || isClickingUpload ? 'opacity-50 pointer-events-none' : 'hover:border-neon-cyan'}`}
            >
              <div className="w-16 h-16 rounded-full bg-zinc-800/50 flex items-center justify-center group-hover:bg-neon-cyan/20 transition-colors">
                {isAnonLoading || isClickingUpload ? (
                  <Loader2 className="w-8 h-8 text-neon-cyan animate-spin" />
                ) : (
                  <Upload className="w-8 h-8 text-zinc-400 group-hover:text-neon-cyan transition-colors" />
                )}
              </div>
              <div>
                <h3 className="text-xl font-medium mb-2">
                  {isAnonLoading ? "Verifying Engine Status..." : isClickingUpload ? "Opening Picker..." : "Select Media File"}
                </h3>
                <p className="text-zinc-500 text-sm">
                  {isAnonLoading ? "Please wait while we check your remaining credits." : isClickingUpload ? "Preparing local transcoding environment..." : "Drag & drop or browse for MP4, MOV, or WEBM (Max 100MB payload)"}
                </p>
              </div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                onClick={(e) => e.stopPropagation()}
                accept="video/mp4,video/quicktime,video/webm"
                className="hidden"
              />
            </div>
          </motion.div>
        )}

        {file && uploadedPath && status !== "loading_ffmpeg" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col gap-8"
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left Column: Source + Controls */}
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold flex items-center gap-2">
                    <Video className="w-5 h-5 text-neon-cyan" />
                    Source Media
                  </h2>
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 text-xs rounded-full bg-zinc-800 text-zinc-300">
                      {(file.size / (1024 * 1024)).toFixed(2)} MB
                    </span>
                    <button
                      onClick={() => {
                        cleanupCurrentSession();
                        setFile(null);
                        setUploadedPath('');
                        setFileName('');
                        setOutputPath('');
                        setOutputFileName('');
                        setOutputFileSize(null);
                        setStatus('idle');
                        setErrorMessage('');
                      }}
                      className="px-4 py-1.5 text-xs font-bold rounded-lg bg-white text-black hover:bg-neon-cyan hover:shadow-[0_0_15px_rgba(0,240,255,0.4)] transition-all flex items-center justify-center"
                    >
                      Change File
                    </button>
                  </div>
                </div>

                <div className="glass-panel rounded-xl overflow-hidden aspect-video relative">
                  <video
                    ref={videoRef}
                    src={uploadedPath}
                    controls
                    controlsList="nodownload"
                    onContextMenu={(e) => e.preventDefault()}
                    onLoadedMetadata={() => {
                      const v = videoRef.current;
                      if (v) setVideoMeta({ duration: v.duration, width: v.videoWidth, height: v.videoHeight });
                    }}
                    className="w-full h-full object-contain bg-black/50"
                  />
                </div>

                {/* Expanded Controls Panel */}
                <div className="glass-panel p-6 rounded-xl flex flex-col gap-6">

                  {/* FPS Slider */}
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium text-zinc-400 flex items-center gap-2">
                        <Settings2 className="w-4 h-4 text-neon-cyan" />
                        Target FPS
                        {isDetectingFps && <Loader2 className="w-3 h-3 animate-spin text-zinc-500" />}
                      </label>
                      <span className="text-2xl font-mono font-bold text-neon-cyan tabular-nums">{targetFps}</span>
                    </div>
                    <input
                      type="range"
                      min={3}
                      max={detectedFps ?? 60}
                      step={1}
                      value={targetFps}
                      disabled={isDetectingFps}
                      onChange={(e) => setTargetFps(Number(e.target.value))}
                      className="custom-slider disabled:opacity-40"
                      style={sliderTrackStyle(targetFps, 3, detectedFps ?? 60)}
                    />
                    <div className="flex justify-between text-xs text-zinc-600 font-mono">
                      <span>3</span>
                      {detectedFps
                        ? <span className="text-zinc-500">{detectedFps} fps (original)</span>
                        : <span>60</span>
                      }
                    </div>
                  </div>

                  {/* Quality Slider */}
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium text-zinc-400">Compression Quality</label>
                      <span
                        className="text-sm font-bold tabular-nums"
                        style={{ color: quality === 2 ? '#00f0ff' : quality === 1 ? '#fbbf24' : '#f87171' }}
                      >
                        {QUALITY_LABELS[quality]}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={2}
                      step={1}
                      value={quality}
                      onChange={(e) => setQuality(Number(e.target.value))}
                      className="custom-slider"
                      style={sliderTrackStyle(quality, 0, 2)}
                    />
                    <div className="flex justify-between text-xs text-zinc-600">
                      <span>Low</span>
                      <span>Medium</span>
                      <span>High</span>
                    </div>
                  </div>

                  {/* Aspect Ratio Grid */}
                  <div className="flex flex-col gap-3">
                    <label className="text-xs font-medium text-zinc-400">Aspect Ratio</label>
                    <div className="grid grid-cols-4 gap-2">
                      {ASPECT_RATIOS.map((ratio) => {
                        const isSelected = aspectRatio === ratio.id;
                        return (
                          <button
                            key={ratio.id}
                            onClick={() => setAspectRatio(ratio.id)}
                            className={`flex flex-col items-center justify-center gap-2 py-3 px-2 rounded-lg border transition-all ${
                              isSelected
                                ? 'border-neon-cyan bg-neon-cyan/10 shadow-[0_0_12px_rgba(0,240,255,0.15)]'
                                : 'border-zinc-800 bg-zinc-900/50 hover:border-zinc-600'
                            }`}
                          >
                            <div className="flex items-center justify-center w-10 h-10">
                              {ratio.id === 'original' ? (
                                <div
                                  className="w-8 h-8 rounded-sm border-2 border-dashed flex items-center justify-center transition-colors"
                                  style={{ borderColor: isSelected ? '#00f0ff' : '#3f3f46' }}
                                >
                                  <span className="text-xs font-bold" style={{ color: isSelected ? '#00f0ff' : '#52525b' }}>
                                    —
                                  </span>
                                </div>
                              ) : (
                                <AspectRatioRect w={ratio.w} h={ratio.h} selected={isSelected} />
                              )}
                            </div>
                            <span
                              className="text-xs font-mono font-bold"
                              style={{ color: isSelected ? '#00f0ff' : '#71717a' }}
                            >
                              {ratio.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Transcoding Button */}
                  <button
                    onClick={handleConvert}
                    disabled={status === "processing" || markAnonUsed.isPending || decrementCredits.isPending}
                    className="group relative flex items-center justify-center gap-3 w-full px-10 py-5 bg-white text-black font-black rounded-2xl hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100 disabled:active:scale-100 shadow-[0_0_20px_rgba(255,255,255,0.3)]"
                  >
                    {status === "processing" || markAnonUsed.isPending || decrementCredits.isPending ? (
                      <>
                        <Loader2 className="w-6 h-6 animate-spin" />
                        <span>{status === "processing" ? "Converting..." : "Verifying..."}</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-6 h-6" fill="currentColor" />
                        <span>Begin Transcoding</span>
                      </>
                    )}
                  </button>
                </div>

                <p className="text-xs text-zinc-500 text-center -mt-2">
                  Note: Audio tracks are automatically stripped to prevent frame synchronization anomalies.
                </p>
              </div>

              {/* Right Column: Output */}
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold flex items-center gap-2">
                    <ArrowRight className="w-5 h-5 text-neon-yellow" />
                    Transcoded Output
                  </h2>
                  <div className="flex items-center gap-2 flex-wrap justify-end">
                    {outputFileSize && (
                      <span className="px-3 py-1 text-xs rounded-full bg-zinc-800 text-zinc-300">
                        {(outputFileSize / (1024 * 1024)).toFixed(2)} MB
                      </span>
                    )}
                    {status === "done" && (
                      <>
                        <span className="px-3 py-1 text-xs rounded-full bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/30">
                          {targetFps} FPS
                        </span>
                        <span
                          className="px-3 py-1 text-xs rounded-full border font-bold"
                          style={{
                            color: quality === 2 ? '#00f0ff' : quality === 1 ? '#fbbf24' : '#f87171',
                            borderColor: quality === 2 ? 'rgba(0,240,255,0.3)' : quality === 1 ? 'rgba(251,191,36,0.3)' : 'rgba(248,113,113,0.3)',
                            backgroundColor: quality === 2 ? 'rgba(0,240,255,0.1)' : quality === 1 ? 'rgba(251,191,36,0.1)' : 'rgba(248,113,113,0.1)',
                          }}
                        >
                          {QUALITY_LABELS[quality]}
                        </span>
                        {aspectRatio !== 'original' && (
                          <span className="px-3 py-1 text-xs rounded-full bg-neon-yellow/20 text-neon-yellow border border-neon-yellow/30">
                            {aspectRatio}
                          </span>
                        )}
                      </>
                    )}
                  </div>
                </div>

                <div className="glass-panel rounded-xl overflow-hidden aspect-video relative flex items-center justify-center p-4">
                  {status === "idle" || status === "error" ? (
                    <div className="flex flex-col items-center gap-3 text-center">
                      <p className="text-zinc-600 font-medium">Awaiting transcoding...</p>
                      {estimatedSizeMB !== null && (
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-3xl font-mono font-bold text-neon-cyan">
                            ~{estimatedSizeMB < 1 ? `${(estimatedSizeMB * 1024).toFixed(0)} KB` : `${estimatedSizeMB.toFixed(1)} MB`}
                          </span>
                          <span className="text-xs text-zinc-500 uppercase tracking-widest">estimated output size</span>
                        </div>
                      )}
                    </div>
                  ) : status === "processing" ? (
                    <div className="flex flex-col items-center justify-center w-full max-w-xs mx-auto gap-4">
                      <div className="w-16 h-16 rounded-full border-4 border-zinc-800 border-t-neon-cyan animate-spin mb-2" />
                      <p className="text-neon-cyan animate-pulse font-medium text-center">{progressLabel}</p>
                      <div className="w-full bg-zinc-800 rounded-full h-2.5 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-neon-cyan to-neon-yellow h-full transition-all duration-300"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <p className="text-xs text-zinc-400 font-mono text-center">{progress}% Complete</p>
                    </div>
                  ) : status === "done" && outputPath ? (
                    <video
                      src={outputPath}
                      controls
                      controlsList="nodownload"
                      onContextMenu={(e) => e.preventDefault()}
                      className="w-full h-full object-contain bg-black/50"
                    />
                  ) : null}
                </div>

                <AnimatePresence>
                  {status === "done" && outputPath && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="w-full"
                    >
                      <a
                        href={outputPath}
                        download={outputFileName}
                        className="w-full py-4 rounded-lg font-bold flex items-center justify-center gap-2 bg-gradient-to-r from-neon-cyan to-neon-yellow text-black hover:opacity-90 transition-opacity shadow-[0_0_15px_rgba(0,240,255,0.3)]"
                      >
                        <Download className="w-5 h-5" />
                        Download Output
                      </a>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        )}
      </main>

      <footer className='p-8 max-w-xl mx-auto flex flex-col gap-12'>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="flex flex-row text-sm w-full justify-between text-zinc-500"
        >
          <Link href="/refund" className='hover:text-neon-cyan transition-colors cursor-pointer'>
            <p>Refund Policy</p>
          </Link>
          <Link href="/terms" className='hover:text-neon-cyan transition-colors cursor-pointer'>
            <p>Terms of Service</p>
          </Link>
          <Link href="/privacy" className='hover:text-neon-cyan transition-colors cursor-pointer'>
            <p>Privacy Policy</p>
          </Link>
        </motion.div>
      </footer>
    </>
  );
}
