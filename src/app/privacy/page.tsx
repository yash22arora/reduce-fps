import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function PrivacyPolicy() {
  const email = "yash22arora@gmail.com";
  return (
    <main className="min-h-screen p-8 max-w-4xl mx-auto flex flex-col gap-8 pb-20">
      <Link href="/" className="inline-flex items-center gap-2 text-zinc-400 hover:text-neon-cyan transition-colors w-fit">
        <ArrowLeft className="w-4 h-4" />
        Back to Home
      </Link>

      <div className="glass-panel p-8 md:p-12 rounded-3xl border border-[var(--border)]">
        <h1 className="text-3xl md:text-5xl font-black mb-8 text-transparent bg-clip-text bg-gradient-to-r from-neon-cyan to-neon-yellow">
          Privacy Policy
        </h1>

        <div className="flex flex-col gap-6 text-zinc-300 leading-relaxed">
          <p>Last updated: May 2026</p>

          <section>
            <h2 className="text-xl font-bold text-white mb-2">1. Local Processing Guarantee</h2>
            <p>At ChronoFrame, privacy is built into our core architecture. <strong>We NEVER upload your videos.</strong> All video transcoding is performed 100% locally within your browser using WebAssembly. Your media files never touch our servers.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-2">2. Information We Collect</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Account Information:</strong> If you sign in, we collect your email address via Google Auth to manage your account and credits.</li>
              <li><strong>Payment Information:</strong> We use Razorpay to process payments securely. We do not store your credit card details.</li>
              <li><strong>Usage Data:</strong> We track IP addresses securely for enforcing anonymous limits and deduct credits upon conversion attempts.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-2">3. How We Use Your Information</h2>
            <p>Your information is used strictly to provide and maintain the Service, process payments, and enforce access control (freemium limits).</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-2">4. Third-Party Services</h2>
            <p>We use Supabase for authentication and database management, and Razorpay for payment processing. These services have their own privacy policies governing the data they collect directly.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-2">5. Contact Us</h2>
            <p>If you have questions about our Privacy Policy, please contact our support team.</p>
            <p className='mt-8'><b>Email: </b> <a href={`mailto:${email}`} className="hover:text-neon-cyan transition-colors cursor-pointer">{email}</a></p>
          </section>
        </div>
      </div>
    </main>
  );
}
