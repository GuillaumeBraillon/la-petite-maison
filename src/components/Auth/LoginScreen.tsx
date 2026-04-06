import { useState } from "react";
import { supabase } from "../../services/supabaseClient";
import { LoginView } from "./LoginView";

interface LoginScreenProps {
  error?: string | null;
}

export const LoginScreen = ({ error }: LoginScreenProps) => {
  const [googleLoading, setGoogleLoading] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [signUpLoading, setSignUpLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginInfo, setLoginInfo] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    setLoginInfo(null);
    setLoginError(null);
    setGoogleLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
    });
    if (error) {
      setLoginError(error.message);
    }
    setGoogleLoading(false);
  };

  const handleEmailLogin = async (email: string, password: string) => {
    setLoginInfo(null);
    setLoginError(null);
    setEmailLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      setLoginError(error.message);
    }
    setEmailLoading(false);
  };

  const handleSignUp = async (email: string, password: string) => {
    setLoginInfo(null);
    setLoginError(null);
    if (!email || !password) {
      setLoginError("Email et mot de passe requis.");
      return;
    }
    setSignUpLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
      },
    });
    if (error) {
      setLoginError(error.message);
    } else {
      setLoginInfo("Compte cree. Verifie ton email pour confirmer l'inscription.");
    }
    setSignUpLoading(false);
  };

  const handleResetPassword = async (email: string) => {
    setLoginInfo(null);
    setLoginError(null);
    if (!email) {
      setLoginError("Email requis pour la reinitialisation.");
      return;
    }
    setResetLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    });
    if (error) {
      setLoginError(error.message);
    } else {
      setLoginInfo("Email de reinitialisation envoye.");
    }
    setResetLoading(false);
  };

  return (
    <LoginView
      onLoginGoogle={handleGoogleLogin}
      onLoginEmail={handleEmailLogin}
      onSignUp={handleSignUp}
      onResetPassword={handleResetPassword}
      loadingGoogle={googleLoading}
      loadingEmail={emailLoading}
      loadingSignUp={signUpLoading}
      loadingReset={resetLoading}
      error={loginError ?? error}
      info={loginInfo}
    />
  );
};
