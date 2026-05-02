"use client";

import { useState, useRef, ChangeEvent, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Video, Play, Download, Settings2, Loader2, ArrowRight, ShieldCheck, User } from 'lucide-react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import { createClient } from '@/lib/supabase/client';
import { AuthModal } from '@/components/AuthModal';
import { PaymentModal } from '@/components/PaymentModal';
import { toast } from 'react-hot-toast';

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [uploadedPath, setUploadedPath] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');

  const [targetFps, setTargetFps] = useState<number>(6);

  const [status, setStatus] = useState<"idle" | "loading_ffmpeg" | "processing" | "done" | "error">("loading_ffmpeg");
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [progress, setProgress] = useState<number>(0);
  const [progressLabel, setProgressLabel] = useState<string>('');

  const [outputPath, setOutputPath] = useState<string>('');
  const [outputFileName, setOutputFileName] = useState<string>('');
  const [outputFileSize, setOutputFileSize] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const ffmpegRef = useRef<FFmpeg | null>(null);

  // Auth & Paywall State
  const [user, setUser] = useState<any>(null);
  const [credits, setCredits] = useState<number | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const supabase = createClient();

  const fetchCredits = async (userId: string) => {
    const { data } = await supabase.from('user_profiles').select('credits').eq('id', userId).single();
    if (data) {
      setCredits(data.credits);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) fetchCredits(currentUser.id);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) fetchCredits(currentUser.id);
      else setCredits(null);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  useEffect(() => {
    if (status === 'processing') {
      if (progress === 0) setProgressLabel('Allocating WASM Memory...');
      else if (progress < 15) setProgressLabel('Analyzing Source Media...');
      else if (progress < 85) setProgressLabel('Transcoding Frames...');
      else if (progress < 99) setProgressLabel('Muxing MP4 Container...');
      else setProgressLabel('Finalizing Video Object...');
    }
  }, [progress, status]);

  useEffect(() => {
    const loadFFmpeg = async () => {
      setStatus("loading_ffmpeg");
      try {
        const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.10/dist/umd';
        const ffmpeg = new FFmpeg();
        ffmpegRef.current = ffmpeg;

        ffmpeg.on('progress', ({ progress }) => {
          // ffmpeg.wasm progress goes from 0 to 1
          setProgress(Math.round(progress * 100));
        });

        await ffmpeg.load({
          coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
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

  const cleanupCurrentSession = () => {
    if (uploadedPath) URL.revokeObjectURL(uploadedPath);
    if (outputPath) URL.revokeObjectURL(outputPath);
  };

  const handleUploadClick = async () => {
    if (!user) {
      const res = await fetch('/api/usage/anon');
      const data = await res.json();
      if (data.used) {
        setIsAuthModalOpen(true);
        return;
      }
    } else if (credits !== null && credits <= 0) {
      setIsPaymentModalOpen(true);
      return;
    }

    fileInputRef.current?.click();
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];

      // 100MB limit
      if (selectedFile.size > 100 * 1024 * 1024) {
        setErrorMessage("File exceeds 100MB limit.");
        return;
      }

      if (!selectedFile.type.startsWith('video/')) {
        setErrorMessage("Please select a valid video file.");
        return;
      }

      setFile(selectedFile);
      setErrorMessage('');
      cleanupCurrentSession();
      setUploadedPath(URL.createObjectURL(selectedFile));
      setFileName(selectedFile.name);
      setStatus("idle");
    }
  };

  const handleConvert = async () => {
    if (!file || !fileName || !ffmpegRef.current) return;

    if (!user) {
      // Consume anonymous usage via API securely before processing
      try {
        const usageRes = await fetch('/api/usage/anon', { method: 'POST' });
        const usageData = await usageRes.json();

        if (!usageRes.ok || !usageData.success) {
          setIsAuthModalOpen(true);
          return;
        }
      } catch (err: any) {
        setErrorMessage(err.message);
        return;
      }
    } else {
      // Deduct credits via API securely before processing
      try {
        const usageRes = await fetch('/api/usage/decrement', { method: 'POST' });
        const usageData = await usageRes.json();

        if (!usageRes.ok || !usageData.success) {
          if (usageData.reason === 'out_of_credits') {
            setIsPaymentModalOpen(true);
            return;
          }
          throw new Error(usageData.error || 'Failed to deduct credits');
        }

        // Update local state with remaining credits
        setCredits(usageData.remaining);
      } catch (err: any) {
        setErrorMessage(err.message);
        return;
      }
    }

    setStatus("processing");
    setProgress(0);
    setProgressLabel('Allocating WASM Memory...');
    setErrorMessage('');

    try {
      const ffmpeg = ffmpegRef.current;
      const ext = fileName.substring(fileName.lastIndexOf('.'));
      const inputName = `input${ext}`;
      const outputName = 'output.mp4';

      await ffmpeg.writeFile(inputName, await fetchFile(file));
      setProgressLabel('Booting Transcoding Engine...');

      await ffmpeg.exec([
        '-y',
        '-i', inputName,
        '-vf', `fps=${targetFps}`,
        '-c:v', 'libx264',
        '-pix_fmt', 'yuv420p',
        '-an',
        outputName
      ]);

      setProgressLabel('Extracting Output Stream...');

      const data = await ffmpeg.readFile(outputName);

      setProgressLabel('Constructing Output Blob...');
      // Depending on version, data could be Uint8Array or Buffer
      // @ts-ignore
      const videoBlob = new Blob([data.buffer || data], { type: 'video/mp4' });
      const url = URL.createObjectURL(videoBlob);

      setOutputPath(url);

      // Construct output filename
      const baseName = fileName.lastIndexOf('.') > 0 ? fileName.substring(0, fileName.lastIndexOf('.')) : fileName;
      setOutputFileName(`${baseName}_${targetFps}fps.mp4`);

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
          if (user) fetchCredits(user.id);
          toast.success("Credits successfully purchased! You may now upload and transcode media.");
        }}
      />

      <main className="min-h-screen p-8 max-w-6xl mx-auto flex flex-col gap-12 relative">
        <header className="flex flex-col gap-4 text-center items-center py-8 relative">

          <div className="absolute top-0 right-0 flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-3">
                {credits !== null && (
                  <span className="px-3 py-1 text-xs font-bold rounded-full bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/30">
                    {credits} Credits
                  </span>
                )}
                <span className="text-xs text-zinc-500">{user.email}</span>
                <button
                  onClick={async () => {
                    await supabase.auth.signOut();
                    toast.success("Signed out successfully.");
                  }}
                  className="px-4 py-1.5 text-xs font-bold rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition-colors"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsAuthModalOpen(true)}
                className="flex items-center gap-2 px-4 py-1.5 text-xs font-bold rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition-colors"
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

          {/* Privacy Shield */}
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

        {/* Loading Engine State */}
        {status === "loading_ffmpeg" && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="w-12 h-12 animate-spin text-neon-cyan" />
            <p className="text-zinc-400 animate-pulse">Initializing WebAssembly Transcoding Core...</p>
          </div>
        )}

        {/* Upload Section */}
        {!file && status === "idle" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-xl mx-auto"
          >
            <div
              onClick={handleUploadClick}
              className="glass-panel p-12 rounded-2xl border-dashed border-2 hover:border-neon-cyan transition-colors cursor-pointer flex flex-col items-center justify-center gap-4 text-center group"
            >
              <div className="w-16 h-16 rounded-full bg-zinc-800/50 flex items-center justify-center group-hover:bg-neon-cyan/20 transition-colors">
                <Upload className="w-8 h-8 text-zinc-400 group-hover:text-neon-cyan transition-colors" />
              </div>
              <div>
                <h3 className="text-xl font-medium mb-2">Select Media File</h3>
                <p className="text-zinc-500 text-sm">Drag & drop or browse for MP4, MOV, or WEBM (Max 100MB payload)</p>
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

        {/* Main Workspace */}
        {file && uploadedPath && status !== "loading_ffmpeg" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col gap-8"
          >
            {/* Videos Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left Column: Original */}
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

                <div className="glass-panel rounded-xl overflow-hidden aspect-video relative group">
                  <video
                    src={uploadedPath}
                    controls
                    controlsList="nodownload"
                    onContextMenu={(e) => e.preventDefault()}
                    className="w-full h-full object-contain bg-black/50"
                  />
                </div>

                {/* Horizontal Controls */}
                <div className="glass-panel p-6 rounded-xl flex flex-row items-end justify-between gap-4 mt-auto">
                  <div className="flex flex-col gap-2 shrink-0">
                    <label className="text-xs font-medium text-zinc-400 flex items-center gap-2">
                      <Settings2 className="w-4 h-4 text-neon-cyan" />
                      Target FPS
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={60}
                      value={targetFps}
                      onChange={(e) => setTargetFps(Number(e.target.value))}
                      className="w-24 h-14 bg-black/40 border border-[var(--border)] rounded-lg px-3 focus:outline-none focus:border-neon-cyan transition-colors text-lg text-center font-mono"
                    />
                  </div>

                  <div className="flex-1 w-full flex flex-col items-center">
                    <button
                      onClick={handleConvert}
                      disabled={status === "processing"}
                      className={`w-full h-14 rounded-lg font-bold flex items-center justify-center gap-2 transition-all ${status === "processing"
                        ? "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                        : "bg-white text-black hover:bg-neon-cyan hover:shadow-[0_0_20px_rgba(0,240,255,0.4)]"
                        }`}
                    >
                      {status === "processing" ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Play className="w-5 h-5" fill="currentColor" />
                          Begin Transcoding
                        </>
                      )}
                    </button>
                  </div>
                </div>
                <p className="text-xs text-zinc-500 text-center -mt-2">Note: Audio tracks are automatically stripped to prevent frame synchronization anomalies.</p>
              </div>

              {/* Right Column: Output */}
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold flex items-center gap-2">
                    <ArrowRight className="w-5 h-5 text-neon-yellow" />
                    Transcoded Output
                  </h2>
                  <div className="flex items-center gap-2">
                    {outputFileSize && (
                      <span className="px-3 py-1 text-xs rounded-full bg-zinc-800 text-zinc-300">
                        {(outputFileSize / (1024 * 1024)).toFixed(2)} MB
                      </span>
                    )}
                    {status === "done" && (
                      <span className="px-3 py-1 text-xs rounded-full bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/30">
                        {targetFps} FPS
                      </span>
                    )}
                  </div>
                </div>

                <div className="glass-panel rounded-xl overflow-hidden aspect-video relative flex items-center justify-center p-4">
                  {status === "idle" || status === "error" ? (
                    <p className="text-zinc-600 font-medium text-center">Awaiting source media...</p>
                  ) : status === "processing" ? (
                    <div className="flex flex-col items-center justify-center w-full max-w-xs mx-auto gap-4">
                      <div className="w-16 h-16 rounded-full border-4 border-zinc-800 border-t-neon-cyan animate-spin mb-2" />
                      <p className="text-neon-cyan animate-pulse font-medium text-center">{progressLabel}</p>
                      <div className="w-full bg-zinc-800 rounded-full h-2.5 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-neon-cyan to-neon-yellow h-full transition-all duration-300"
                          style={{ width: `${progress}%` }}
                        ></div>
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

                {/* Download Action */}
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
    </>
  );
}
