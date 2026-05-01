"use client";

import { useState, useRef, ChangeEvent, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Video, Play, Download, Settings2, Loader2, ArrowRight } from 'lucide-react';

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [uploadedPath, setUploadedPath] = useState<string>('');
  const [fileId, setFileId] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');

  const [targetFps, setTargetFps] = useState<number>(6);

  const [status, setStatus] = useState<"idle" | "uploading" | "processing" | "done" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string>('');

  const [outputPath, setOutputPath] = useState<string>('');
  const [outputFileName, setOutputFileName] = useState<string>('');
  const [outputFileSize, setOutputFileSize] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const isDownloadingRef = useRef<boolean>(false);

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (fileId && !isDownloadingRef.current) {
        fetch('/api/cleanup', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileId }),
          keepalive: true
        }).catch(console.error);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [fileId]);

  const cleanupCurrentSession = async () => {
    if (fileId) {
      try {
        await fetch('/api/cleanup', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileId })
        });
      } catch (err) {
        console.error('Cleanup failed:', err);
      }
    }
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
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
      await uploadVideo(selectedFile);
    }
  };

  const uploadVideo = async (selectedFile: File) => {
    setStatus("uploading");
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      const data = await res.json();
      setFileId(data.fileId);
      setUploadedPath(data.filePath);
      setFileName(data.fileName);
      setStatus("idle");
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to upload video.");
      setStatus("error");
    }
  };

  const handleConvert = async () => {
    if (!fileId || !fileName) return;

    setStatus("processing");
    setErrorMessage('');

    try {
      const res = await fetch('/api/convert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileId,
          fileName,
          targetFps
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Conversion failed');
      }

      const data = await res.json();
      setOutputPath(data.outputPath);
      setOutputFileName(data.outputFileName);
      setOutputFileSize(data.outputSize);
      setStatus("done");
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to convert video.");
      setStatus("error");
    }
  };

  return (
    <main className="min-h-screen p-8 max-w-6xl mx-auto flex flex-col gap-12">
      <header className="flex flex-col gap-4 text-center items-center py-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-3 px-4 py-2 rounded-full border border-[var(--border)] bg-[var(--card)]"
        >
          <div className="w-2 h-2 rounded-full bg-[var(--neon-cyan)] neon-glow animate-pulse" />
          <span className="text-sm font-medium tracking-widest uppercase text-zinc-400">ChronoFrame Engine</span>
        </motion.div>
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-5xl md:text-7xl font-bold tracking-tighter"
        >
          Manipulate <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--neon-cyan)] to-[var(--neon-pink)]">Time</span>
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-zinc-400 max-w-lg text-balance"
        >
          Upload any video and process its frame rate with absolute precision locally.
        </motion.p>
      </header>

      {errorMessage && (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/50 text-red-400 text-center">
          {errorMessage}
        </div>
      )}

      {/* Upload Section */}
      {!file && status !== "uploading" && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-xl mx-auto"
        >
          <div
            onClick={() => fileInputRef.current?.click()}
            className="glass-panel p-12 rounded-2xl border-dashed border-2 hover:border-[var(--neon-cyan)] transition-colors cursor-pointer flex flex-col items-center justify-center gap-4 text-center group"
          >
            <div className="w-16 h-16 rounded-full bg-zinc-800/50 flex items-center justify-center group-hover:bg-[var(--neon-cyan)]/20 transition-colors">
              <Upload className="w-8 h-8 text-zinc-400 group-hover:text-[var(--neon-cyan)] transition-colors" />
            </div>
            <div>
              <h3 className="text-xl font-medium mb-2">Initialize Sequence</h3>
              <p className="text-zinc-500 text-sm">Drag & drop or click to upload MP4, MOV, WEBM (Max 100MB)</p>
            </div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="video/mp4,video/quicktime,video/webm"
              className="hidden"
            />
          </div>
        </motion.div>
      )}

      {(status === "uploading") && (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="w-12 h-12 animate-spin text-[var(--neon-cyan)]" />
          <p className="text-zinc-400 animate-pulse">Uploading video to secure local buffer...</p>
        </div>
      )}

      {/* Main Workspace */}
      {file && uploadedPath && status !== "uploading" && (
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
                  <Video className="w-5 h-5 text-[var(--neon-cyan)]" />
                  Original Stream
                </h2>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 text-xs rounded-full bg-zinc-800 text-zinc-300">
                    {(file.size / (1024 * 1024)).toFixed(2)} MB
                  </span>
                  <button
                    onClick={async () => {
                      await cleanupCurrentSession();
                      setFile(null);
                      setUploadedPath('');
                      setFileId('');
                      setFileName('');
                      setOutputPath('');
                      setOutputFileName('');
                      setOutputFileSize(null);
                      setStatus('idle');
                      setErrorMessage('');
                    }}
                    className="px-4 py-1.5 text-xs font-bold rounded-lg bg-white text-black hover:bg-[var(--neon-cyan)] hover:shadow-[0_0_15px_rgba(0,240,255,0.4)] transition-all flex items-center justify-center"
                  >
                    Change File
                  </button>
                </div>
              </div>

              <div className="glass-panel rounded-xl overflow-hidden aspect-video relative group">
                <video
                  src={`/api/video?path=${encodeURIComponent(uploadedPath)}`}
                  controls
                  className="w-full h-full object-contain bg-black/50"
                />
              </div>

              {/* Horizontal Controls */}
              <div className="glass-panel p-6 rounded-xl flex flex-row items-end justify-between gap-4 mt-auto">
                <div className="flex flex-col gap-2 shrink-0">
                  <label className="text-xs font-medium text-zinc-400 flex items-center gap-2">
                    <Settings2 className="w-4 h-4 text-[var(--neon-cyan)]" />
                    Target FPS
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={60}
                    value={targetFps}
                    onChange={(e) => setTargetFps(Number(e.target.value))}
                    className="w-24 h-14 bg-black/40 border border-[var(--border)] rounded-lg px-3 focus:outline-none focus:border-[var(--neon-cyan)] transition-colors text-lg text-center font-mono"
                  />
                </div>

                <div className="flex-1 w-full flex flex-col items-center">
                  <button
                    onClick={handleConvert}
                    disabled={status === "processing"}
                    className={`w-full h-14 rounded-lg font-bold flex items-center justify-center gap-2 transition-all ${status === "processing"
                      ? "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                      : "bg-white text-black hover:bg-[var(--neon-cyan)] hover:shadow-[0_0_20px_rgba(0,240,255,0.4)]"
                      }`}
                  >
                    {status === "processing" ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Processing
                      </>
                    ) : (
                      <>
                        <Play className="w-5 h-5" fill="currentColor" />
                        Execute Conversion
                      </>
                    )}
                  </button>
                </div>
              </div>
              <p className="text-xs text-zinc-500 text-center -mt-2">Note: Audio will be removed to prevent desync.</p>
            </div>

            {/* Right Column: Output */}
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <ArrowRight className="w-5 h-5 text-[var(--neon-pink)]" />
                  Processed Stream
                </h2>
                <div className="flex items-center gap-2">
                  {outputFileSize && (
                    <span className="px-3 py-1 text-xs rounded-full bg-zinc-800 text-zinc-300">
                      {(outputFileSize / (1024 * 1024)).toFixed(2)} MB
                    </span>
                  )}
                  {status === "done" && (
                    <span className="px-3 py-1 text-xs rounded-full bg-[var(--neon-cyan)]/20 text-[var(--neon-cyan)] border border-[var(--neon-cyan)]/30">
                      {targetFps} FPS
                    </span>
                  )}
                </div>
              </div>

              <div className="glass-panel rounded-xl overflow-hidden aspect-video relative flex items-center justify-center">
                {status === "idle" || status === "error" ? (
                  <p className="text-zinc-600 font-medium">Awaiting execution...</p>
                ) : status === "processing" ? (
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-16 h-16 rounded-full border-4 border-zinc-800 border-t-[var(--neon-cyan)] animate-spin" />
                    <p className="text-[var(--neon-cyan)] animate-pulse font-medium">Transcoding Engine Active</p>
                  </div>
                ) : status === "done" && outputPath ? (
                  <video
                    src={`/api/video?path=${encodeURIComponent(outputPath)}`}
                    controls
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
                      href={`/api/download?path=${encodeURIComponent(outputPath)}`}
                      download={outputFileName}
                      onClick={() => {
                        isDownloadingRef.current = true;
                        // Reset after a short delay to re-enable cleanup for actual unloads
                        setTimeout(() => { isDownloadingRef.current = false; }, 2000);
                      }}
                      className="w-full py-4 rounded-lg font-bold flex items-center justify-center gap-2 bg-gradient-to-r from-[var(--neon-cyan)] to-[var(--neon-pink)] text-white hover:opacity-90 transition-opacity shadow-[0_0_15px_rgba(0,240,255,0.3)]"
                    >
                      <Download className="w-5 h-5" />
                      Acquire Output File
                    </a>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      )}
    </main>
  );
}
