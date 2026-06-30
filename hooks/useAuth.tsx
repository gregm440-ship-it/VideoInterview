import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";
import { Platform } from "react-native";
import * as AppleAuthentication from "expo-apple-authentication";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { makeRedirectUri } from "expo-auth-session";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import { DEMO_MODE, DEMO_USER } from "../lib/demo";

WebBrowser.maybeCompleteAuthSession();

// In demo mode we stand in a fake signed-in user so every gated feature works.
const DEMO_SESSION = {
  user: { id: DEMO_USER.id, email: DEMO_USER.email },
} as unknown as Session;

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  /** True once the user opted to browse without an account. */
  isGuest: boolean;
  /** True only when a real authenticated session exists. */
  isAuthenticated: boolean;
  /** Still restoring the persisted session. */
  loading: boolean;
  continueAsGuest: () => void;
  signInWithApple: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  /** Sends a magic link / OTP to the given email. */
  signInWithEmail: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// Redirect target for OAuth + magic-link deep links back into the app.
const redirectTo = makeRedirectUri({ scheme: "repandsip" });

/** Exchange the `code`/tokens carried on a returned deep link for a session. */
async function createSessionFromUrl(url: string) {
  const { params, errorCode } = (() => {
    const parsed = Linking.parse(url);
    return {
      params: parsed.queryParams ?? {},
      errorCode: (parsed.queryParams?.error_code as string | undefined) ?? null,
    };
  })();
  if (errorCode) throw new Error(String(errorCode));

  const code = params.code as string | undefined;
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) throw error;
  }
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [loading, setLoading] = useState(true);

  // Restore + subscribe to auth state.
  useEffect(() => {
    if (DEMO_MODE) {
      setSession(DEMO_SESSION); // start signed in as the demo user
      setLoading(false);
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      if (next) setIsGuest(false); // a real session supersedes guest mode
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // Handle deep links that carry an auth code (magic link / OAuth return).
  useEffect(() => {
    const sub = Linking.addEventListener("url", ({ url }) => {
      createSessionFromUrl(url).catch((e) => console.warn("[auth] deep link", e));
    });
    return () => sub.remove();
  }, []);

  const continueAsGuest = useCallback(() => setIsGuest(true), []);

  const signInWithApple = useCallback(async () => {
    if (DEMO_MODE) return setSession(DEMO_SESSION);
    if (Platform.OS !== "ios") {
      throw new Error("Sign in with Apple is available on iOS.");
    }
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });
    if (!credential.identityToken) {
      throw new Error("Apple sign-in did not return an identity token.");
    }
    const { error } = await supabase.auth.signInWithIdToken({
      provider: "apple",
      token: credential.identityToken,
    });
    if (error) throw error;
  }, []);

  const signInWithGoogle = useCallback(async () => {
    if (DEMO_MODE) return setSession(DEMO_SESSION);
    // Browser-based OAuth via Supabase. Configure the Google provider in the
    // Supabase dashboard and add `redirectTo` to the allowed redirect URLs.
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo, skipBrowserRedirect: true },
    });
    if (error) throw error;
    if (!data.url) throw new Error("Google sign-in could not start.");

    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
    if (result.type === "success") {
      await createSessionFromUrl(result.url);
    }
  }, []);

  const signInWithEmail = useCallback(async (email: string) => {
    if (DEMO_MODE) return setSession(DEMO_SESSION);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: redirectTo },
    });
    if (error) throw error;
  }, []);

  const signOut = useCallback(async () => {
    if (!DEMO_MODE) await supabase.auth.signOut();
    setSession(null);
    setIsGuest(false);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      isGuest,
      isAuthenticated: Boolean(session),
      loading,
      continueAsGuest,
      signInWithApple,
      signInWithGoogle,
      signInWithEmail,
      signOut,
    }),
    [
      session,
      isGuest,
      loading,
      continueAsGuest,
      signInWithApple,
      signInWithGoogle,
      signInWithEmail,
      signOut,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an <AuthProvider>.");
  return ctx;
}
