import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

interface DemoModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
}

export function DemoModal({
  isOpen,
  onClose,
  title = "See the magic in action!",
  subtitle = 'Did not shoot your videos with Dazz Cam? You can still make that "OK JAANU" edit ;)',
}: DemoModalProps) {
  const [muted, setMuted] = useState(true);
  const toggleMute = () => setMuted(!muted);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.85, opacity: 0, y: 50 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.85, opacity: 0, y: 50 }}
            transition={{ type: "spring", stiffness: 150, damping: 25 }}
            className="w-full max-w-6xl overflow-hidden relative"
          >
            <button
              onClick={onClose}
              className="hidden md:block absolute top-8 right-8 text-zinc-400 hover:text-white transition-colors z-10"
            >
              <X className="w-8 h-8 cursor-pointer bg-zinc-800/50 hover:bg-zinc-800 p-2 rounded-full" />
            </button>

            <div className="p-8 flex flex-col gap-6 text-center">
              <div>
                <h2 className="text-2xl text-zinc-200 font-molle">{title}</h2>
                <p className="text-zinc-400 text-sm font-indie-flower">
                  {subtitle}
                </p>
              </div>

              <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-2xl">
                <video
                  src="https://cdn.servatom.com/ChronoFrame/Demo.mp4"
                  autoPlay
                  loop
                  playsInline
                  muted={muted}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleMute();
                  }}
                  onContextMenu={(e) => e.preventDefault()}
                  className="w-full h-full object-contain bg-black/50 rounded-2xl"
                ></video>
              </div>
              <span className="text-zinc-400 text-xs font-inter">
                Tap the video to mute/unmute. P.S. the video is in 6fps.
              </span>

              <button
                onClick={onClose}
                className="md:hidden block mx-auto mt-8 text-zinc-400 hover:text-white transition-colors z-10"
              >
                <X className="w-8 h-8 cursor-pointer bg-zinc-800/50 hover:bg-zinc-800 p-2 rounded-full" />
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
