import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function RefundPolicy() {
  return (
    <main className="min-h-screen p-8 max-w-4xl mx-auto flex flex-col gap-8 pb-20">
      <Link href="/" className="inline-flex items-center gap-2 text-zinc-400 hover:text-neon-cyan transition-colors w-fit">
        <ArrowLeft className="w-4 h-4" />
        Back to Home
      </Link>
      
      <div className="glass-panel p-8 md:p-12 rounded-3xl border border-[var(--border)]">
        <h1 className="text-3xl md:text-5xl font-black mb-8 text-transparent bg-clip-text bg-gradient-to-r from-neon-cyan to-neon-yellow">
          Refund Policy
        </h1>
        
        <div className="flex flex-col gap-6 text-zinc-300 leading-relaxed">
          <p>Last updated: May 2026</p>
          
          <section>
            <h2 className="text-xl font-bold text-white mb-2">1. General Rule: No Refunds</h2>
            <p>Due to the nature of digital credits, all purchases of ChronoFrame transcoding credits are final and non-refundable once the transaction is completed and credits are added to your account.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-2">2. Exception: Payment Failures</h2>
            <p>If a technical error occurs during the Razorpay checkout process where your payment method is charged but credits are not added to your account, we will manually verify the transaction and either credit your account or issue a full refund within 5-7 business days.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-2">3. Device Compatibility</h2>
            <p>We explicitly offer an anonymous free trial. It is your responsibility to test our WebAssembly engine on your device during the free trial to ensure compatibility and performance before purchasing credits. We do not offer refunds if your specific device struggles with the heavy processing loads of video transcoding.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-2">4. Requesting Assistance</h2>
            <p>If you believe you have a legitimate case for a refund due to a billing error, please reach out to our support team with your Razorpay Transaction ID and Google Auth email address.</p>
          </section>
        </div>
      </div>
    </main>
  );
}
