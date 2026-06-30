import { useQuery } from "@tanstack/react-query";
import { getUserStats } from "../lib/stats";

export function useUserStats(userId: string) {
  return useQuery({
    queryKey: ["userStats", userId],
    enabled: Boolean(userId),
    queryFn: () => getUserStats(userId),
  });
}
