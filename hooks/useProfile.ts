import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getMyProfile, updateMyProfile, type ProfilePatch } from "../lib/profiles";
import type { Profile } from "../lib/database.types";
import { useAuth } from "./useAuth";

export function useProfile() {
  const { isAuthenticated } = useAuth();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["profile"],
    enabled: isAuthenticated,
    queryFn: getMyProfile,
  });

  const update = useMutation({
    mutationFn: (patch: ProfilePatch) => updateMyProfile(patch),
    // Optimistic: reflect the change immediately, reconcile on success.
    onMutate: async (patch) => {
      await qc.cancelQueries({ queryKey: ["profile"] });
      const prev = qc.getQueryData<Profile | null>(["profile"]);
      if (prev) qc.setQueryData(["profile"], { ...prev, ...patch });
      return { prev };
    },
    onError: (_e, _patch, ctx) => {
      if (ctx?.prev) qc.setQueryData(["profile"], ctx.prev);
    },
    onSuccess: (profile) => qc.setQueryData(["profile"], profile),
  });

  return { profile: query.data ?? null, isLoading: query.isLoading, update };
}
