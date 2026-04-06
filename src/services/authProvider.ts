import type { User } from "@supabase/supabase-js";

export const getAuthProvider = (user: User | null | undefined): string | null => {
  const appMetadataProvider = user?.app_metadata?.provider;
  if (typeof appMetadataProvider === "string" && appMetadataProvider.trim().length > 0) {
    return appMetadataProvider.trim().toLowerCase();
  }

  const userMetadataProvider = user?.user_metadata?.provider;
  if (typeof userMetadataProvider === "string" && userMetadataProvider.trim().length > 0) {
    return userMetadataProvider.trim().toLowerCase();
  }

  return null;
};
