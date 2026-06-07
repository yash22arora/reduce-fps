import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

export function useCredits(userId: string | undefined) {
  const supabase = createClient();
  
  return useQuery({
    queryKey: ["credits", userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from("user_profiles")
        .select("credits")
        .eq("id", userId)
        .single();
      
      if (error) throw error;
      return data.credits as number;
    },
    enabled: !!userId,
  });
}
