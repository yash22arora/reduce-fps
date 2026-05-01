import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, X, Zap, CheckCircle2 } from 'lucide-react';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  onSuccess: () => void;
}

export function PaymentModal({ isOpen, onClose, userId, onSuccess }: PaymentModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<"starter" | "pro">("starter");

  const plans = {
    starter: { credits: 5, price: 199, label: "Starter Pack" },
    pro: { credits: 10, price: 299, label: "Pro Pack" }
  };

  const handlePayment = async () => {
    setIsLoading(true);
    try {
      // 1. Create order
      const plan = plans[selectedPlan];
      const orderRes = await fetch('/api/payment/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: plan.price, credits: plan.credits }),
      });
      
      const orderData = await orderRes.json();
      if (!orderRes.ok) throw new Error(orderData.error);

      // 2. Initialize Razorpay Checkout
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: orderData.amount,
        currency: "INR",
        name: "ChronoFrame Engine",
        description: `${plan.credits} Transcoding Credits`,
        order_id: orderData.orderId,
        handler: async function (response: any) {
          // 3. Verify Payment
          const verifyRes = await fetch('/api/payment/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              userId: userId,
              credits: plan.credits
            }),
          });
          
          if (verifyRes.ok) {
            onSuccess();
          } else {
            alert('Payment verification failed. Please contact support.');
          }
        },
        theme: {
          color: "#00f0ff"
        }
      };

      // @ts-ignore
      const rzp = new window.Razorpay(options);
      rzp.open();
      
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="w-full max-w-xl bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-2xl overflow-hidden relative"
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white transition-colors z-10"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="p-8 flex flex-col gap-8 mt-4">
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-neon-cyan/20 flex items-center justify-center mx-auto mb-4 border border-neon-cyan/30">
                  <Zap className="w-8 h-8 text-neon-cyan" />
                </div>
                <h2 className="text-3xl font-bold text-white mb-2">Power Up Your Engine</h2>
                <p className="text-zinc-400">You've run out of free transcoding credits. Purchase a pack to continue processing media locally at warp speed.</p>
              </div>

              <div className="grid grid-cols-2 gap-4 relative">
                <div 
                  onClick={() => setSelectedPlan('starter')}
                  className={`cursor-pointer p-6 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${selectedPlan === 'starter' ? 'border-neon-cyan bg-neon-cyan/10' : 'border-[var(--border)] bg-black/40 hover:border-zinc-500'}`}
                >
                  <h3 className="text-xl font-bold text-white">Starter</h3>
                  <div className="text-3xl font-black text-neon-cyan">₹199</div>
                  <p className="text-sm text-zinc-400 font-medium">5 Credits</p>
                </div>
                <div 
                  onClick={() => setSelectedPlan('pro')}
                  className={`relative cursor-pointer p-6 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${selectedPlan === 'pro' ? 'border-neon-yellow bg-neon-yellow/10' : 'border-[var(--border)] bg-black/40 hover:border-zinc-500'}`}
                >
                  <div className="absolute -top-3 px-3 py-0.5 bg-neon-yellow text-black text-xs font-bold rounded-full">BEST VALUE</div>
                  <h3 className="text-xl font-bold text-white">Pro</h3>
                  <div className="text-3xl font-black text-neon-yellow">₹299</div>
                  <p className="text-sm text-zinc-400 font-medium">10 Credits</p>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3 text-sm text-zinc-300">
                  <CheckCircle2 className="w-4 h-4 text-green-400" />
                  <span>Max 100MB payload limit maintained</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-zinc-300">
                  <CheckCircle2 className="w-4 h-4 text-green-400" />
                  <span>100% Private local WebAssembly processing</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-zinc-300">
                  <CheckCircle2 className="w-4 h-4 text-green-400" />
                  <span>Credits never expire</span>
                </div>
              </div>

              <button
                onClick={handlePayment}
                disabled={isLoading}
                className="w-full py-4 bg-gradient-to-r from-neon-cyan to-neon-yellow text-black font-bold text-lg rounded-xl hover:opacity-90 transition-opacity shadow-[0_0_20px_rgba(0,240,255,0.3)] flex items-center justify-center gap-2"
              >
                {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : `Pay ₹${plans[selectedPlan].price} Securely`}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
