import { useState } from "react";
import type { FormEvent } from "react";
import { Home, Eye, EyeOff } from "lucide-react";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/Card";

interface LoginViewProps {
  onLoginGoogle: () => void;
  onLoginEmail: (email: string, password: string) => void;
  onSignUp: (email: string, password: string) => void;
  onResetPassword: (email: string) => void;
  loadingGoogle: boolean;
  loadingEmail: boolean;
  loadingSignUp: boolean;
  loadingReset: boolean;
  error?: string | null;
  info?: string | null;
}

export const LoginView = ({
  onLoginGoogle,
  onLoginEmail,
  onSignUp,
  onResetPassword,
  loadingGoogle,
  loadingEmail,
  loadingSignUp,
  loadingReset,
  error,
  info,
}: LoginViewProps) => {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [signupError, setSignupError] = useState("");
  const [signupCompleted, setSignupCompleted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleEmailSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (mode === "login") {
      onLoginEmail(email.trim(), password);
    } else {
      setSignupError("");
      if (!email.trim()) {
        setSignupError("L'email est requis.");
        return;
      }
      if (password.length < 8) {
        setSignupError("Le mot de passe doit contenir au moins 8 caractères.");
        return;
      }
      if (password !== confirmPassword) {
        setSignupError("Les mots de passe ne correspondent pas.");
        return;
      }
      setSignupCompleted(true);
      onSignUp(email.trim(), password);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-white flex items-center justify-center p-6">
      <Card className="w-full max-w-sm overflow-hidden">
        <CardHeader className="text-center bg-white">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-100">
            <Home size={28} className="text-primary-600" />
          </div>
          <CardTitle className="text-2xl">La Petite Maison</CardTitle>
          <p className="mt-1 text-sm text-gray-500">
            Gestion des locations familiales
          </p>
        </CardHeader>

        <CardContent className="space-y-4">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}
          {info && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-700">
              {info}
            </div>
          )}
          {signupError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {signupError}
            </div>
          )}

          {/* Mode Toggle */}
          <div className="flex gap-2 rounded-lg bg-gray-100 p-1">
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setSignupError("");
                setSignupCompleted(false);
              }}
              className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
                mode === "login"
                  ? "bg-white text-primary-600 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Connexion
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("signup");
                setSignupError("");
                setSignupCompleted(false);
              }}
              className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
                mode === "signup"
                  ? "bg-white text-primary-600 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Créer un compte
            </button>
          </div>

          {!(signupCompleted && mode === "signup") && (
            <form onSubmit={handleEmailSubmit} className="space-y-3">
              <Input
                label="Email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                required
              />
              <div className="relative">
                <Input
                  label="Mot de passe"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete={
                    mode === "login" ? "current-password" : "new-password"
                  }
                  hint={
                    mode === "signup"
                      ? "8+ caractères, avec majuscule, minuscule, chiffre, symbole."
                      : undefined
                  }
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-9 text-gray-400 hover:text-gray-600"
                  aria-label={
                    showPassword
                      ? "Masquer le mot de passe"
                      : "Afficher le mot de passe"
                  }
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {mode === "signup" && (
                <div className="relative">
                  <Input
                    label="Confirmer le mot de passe"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    autoComplete="new-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-9 text-gray-400 hover:text-gray-600"
                    aria-label={
                      showConfirmPassword
                        ? "Masquer le mot de passe"
                        : "Afficher le mot de passe"
                    }
                  >
                    {showConfirmPassword ? (
                      <EyeOff size={18} />
                    ) : (
                      <Eye size={18} />
                    )}
                  </button>
                </div>
              )}
              <Button
                type="submit"
                loading={mode === "login" ? loadingEmail : loadingSignUp}
                size="lg"
                className="w-full"
              >
                {mode === "login" ? "Se connecter" : "Créer mon compte"}
              </Button>
            </form>
          )}

          {mode === "login" && (
            <Button
              type="button"
              variant="ghost"
              loading={loadingReset}
              className="w-full"
              onClick={() => onResetPassword(email.trim())}
            >
              Mot de passe oublié
            </Button>
          )}

          <div className="flex items-center gap-2">
            <div className="h-px flex-1 bg-gray-200" />
            <span className="text-xs text-gray-400">ou</span>
            <div className="h-px flex-1 bg-gray-200" />
          </div>

          <Button
            onClick={onLoginGoogle}
            loading={loadingGoogle}
            size="lg"
            className="w-full"
          >
            Se connecter avec Google
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
