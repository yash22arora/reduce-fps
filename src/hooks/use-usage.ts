import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export function useAnonStatus() {
  return useQuery({
    queryKey: ["anonStatus"],
    queryFn: async () => {
      const res = await fetch("/api/usage/anon");
      if (!res.ok) throw new Error("Failed to check anonymous status");
      return res.json();
    },
    staleTime: 0, // Always check
  });
}

export function useMarkAnonUsed() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/usage/anon", { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to mark anonymous usage");
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["anonStatus"] });
    },
  });
}

export function useDecrementCredits() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/usage/decrement", { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.reason || data.error || "Failed to deduct credits");
      }
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["credits"] });
    },
  });
}
