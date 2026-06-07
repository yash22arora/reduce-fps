import { useMutation } from "@tanstack/react-query";

export function useCreateOrder() {
  return useMutation({
    mutationFn: async ({ amount, credits }: { amount: number; credits: number }) => {
      const res = await fetch("/api/payment/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, credits }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create order");
      return data;
    },
  });
}

export function useVerifyPayment() {
  return useMutation({
    mutationFn: async (payload: {
      razorpay_order_id: string;
      razorpay_payment_id: string;
      razorpay_signature: string;
      userId: string;
      credits: number;
    }) => {
      const res = await fetch("/api/payment/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Payment verification failed");
      return res.json();
    },
  });
}
