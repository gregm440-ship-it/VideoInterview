import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as social from "../lib/social";
import { useAuth } from "./useAuth";

export function useFeed() {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ["feed"],
    enabled: isAuthenticated,
    queryFn: social.getFeed,
  });
}

export function usePublicProfile(userId: string) {
  return useQuery({
    queryKey: ["publicProfile", userId],
    enabled: Boolean(userId),
    queryFn: () => social.getPublicProfile(userId),
  });
}

export function useFollow(targetId: string) {
  const { isAuthenticated, user } = useAuth();
  const qc = useQueryClient();
  const isSelf = user?.id === targetId;

  const status = useQuery({
    queryKey: ["isFollowing", targetId],
    enabled: isAuthenticated && Boolean(targetId) && !isSelf,
    queryFn: () => social.isFollowing(targetId),
  });

  const toggle = useMutation({
    mutationFn: async () => {
      if (status.data) await social.unfollowUser(targetId);
      else await social.followUser(targetId);
      return !status.data;
    },
    onSuccess: (nowFollowing) => {
      qc.setQueryData(["isFollowing", targetId], nowFollowing);
      qc.invalidateQueries({ queryKey: ["feed"] });
      qc.invalidateQueries({ queryKey: ["publicProfile", targetId] });
      qc.invalidateQueries({ queryKey: ["followedAtHotel"] });
    },
  });

  return {
    isSelf,
    isFollowing: Boolean(status.data),
    loading: status.isLoading,
    pending: toggle.isPending,
    toggle: () => toggle.mutate(),
  };
}

export function useFollowedAtHotel(hotelId: string | null) {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ["followedAtHotel", hotelId],
    enabled: isAuthenticated && Boolean(hotelId),
    queryFn: () => social.getFollowedReviewersAtHotel(hotelId!),
  });
}
