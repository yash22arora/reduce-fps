import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function TermsConditions() {
  return (
    <main className="min-h-screen p-8 max-w-4xl mx-auto flex flex-col gap-8 pb-20">
      <Link href="/" className="inline-flex items-center gap-2 text-zinc-400 hover:text-neon-cyan transition-colors w-fit">
        <ArrowLeft className="w-4 h-4" />
        Back to Home
      </Link>
      
      <div className="glass-panel p-8 md:p-12 rounded-3xl border border-[var(--border)]">
        <h1 className="text-3xl md:text-5xl font-black mb-8 text-transparent bg-clip-text bg-gradient-to-r from-neon-cyan to-neon-yellow">
          Terms & Conditions
        </h1>
        
        <div className="flex flex-col gap-6 text-zinc-300 leading-relaxed">
          <p>Last updated: May 2026</p>
          
          <section>
            <h2 className="text-xl font-bold text-white mb-2">1. Acceptance of Terms</h2>
            <p>By accessing and using ChronoFrame ("the Service"), you agree to be bound by these Terms and Conditions. If you do not agree with any part of these terms, you must not use our service.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-2">2. Service Description</h2>
            <p>ChronoFrame provides a client-side WebAssembly video frame rate conversion tool. All processing occurs locally on your device. We do not upload, store, or transmit your video files to our servers.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-2">3. Freemium Model and Credits</h2>
            <p>We operate on a freemium model. Anonymous users are granted one free conversion. Further use requires account registration and the purchase of transcoding credits. Credits do not expire, but are non-transferable.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-2">4. User Responsibilities</h2>
            <p>You are solely responsible for the content you process using ChronoFrame. You agree not to use the service to process illegal, copyrighted (without authorization), or malicious content.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-2">5. Limitation of Liability</h2>
            <p>ChronoFrame is provided "as is". We are not liable for any data loss, device performance issues, or damages arising from the use of our heavy WebAssembly processing workloads.</p>
          </section>
        </div>
      </div>
    </main>
  );
}
