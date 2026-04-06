import { useState } from "react";
import type { FormEvent } from "react";
import { Home, Eye, EyeOff, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import type { LoginViewProps } from "../../types";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/Card";

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 shrink-0">
    <path
      fill="#4285F4"
      d="M21.805 12.23c0-.79-.064-1.366-.202-1.964H12.24v3.604h5.494c-.111.896-.71 2.246-2.042 3.152l-.019.121 2.938 2.23.204.02c1.873-1.695 2.99-4.189 2.99-7.163"
    />
    <path
      fill="#34A853"
      d="M12.24 21.75c2.693 0 4.953-.868 6.604-2.357l-3.143-2.372c-.84.575-1.968.98-3.461.98-2.638 0-4.88-1.695-5.683-4.044l-.116.01-3.055 2.317-.04.109c1.642 3.17 4.981 5.357 8.894 5.357"
    />
    <path
      fill="#FBBC05"
      d="M6.557 13.957A5.813 5.813 0 016.225 12c0-.68.12-1.34.323-1.957l-.005-.131-3.094-2.354-.101.047A9.643 9.643 0 002.32 12c0 1.547.378 3.01 1.028 4.395z"
    />
    <path
      fill="#EA4335"
      d="M12.24 5.999c1.884 0 3.153.802 3.876 1.473l2.83-2.708C17.184 3.167 14.934 2.25 12.24 2.25c-3.913 0-7.252 2.186-8.894 5.356l3.2 2.438c.812-2.349 3.055-4.045 5.693-4.045"
    />
  </svg>
);

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
  const [isEmailExpanded, setIsEmailExpanded] = useState(false);

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
          <p className="mt-1 text-sm text-gray-500">Gestion des locations</p>
        </CardHeader>

        <CardContent className="space-y-4">
          {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
          {info && <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-700">{info}</div>}
          {signupError && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{signupError}</div>}

          <Button
            onClick={onLoginGoogle}
            loading={loadingGoogle}
            variant="secondary"
            size="lg"
            className="w-full border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
          >
            {!loadingGoogle && <GoogleIcon />}
            Se connecter avec Google
          </Button>

          <div className="rounded-xl border border-gray-200 bg-gray-50/60">
            <button
              type="button"
              onClick={() => setIsEmailExpanded((prev) => !prev)}
              className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
              aria-expanded={isEmailExpanded}
            >
              <div>
                <p className="text-sm font-medium text-gray-800">Utiliser une adresse email</p>
              </div>
              {isEmailExpanded ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
            </button>

            {isEmailExpanded && (
              <div className="border-t border-gray-200 px-4 py-4 space-y-4">
                <div className="flex gap-2 rounded-lg bg-gray-100 p-1">
                  <button
                    type="button"
                    onClick={() => {
                      setMode("login");
                      setSignupError("");
                      setSignupCompleted(false);
                    }}
                    className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
                      mode === "login" ? "bg-white text-primary-600 shadow-sm" : "text-gray-600 hover:text-gray-900"
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
                      mode === "signup" ? "bg-white text-primary-600 shadow-sm" : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    Créer un compte
                  </button>
                </div>

                {!(signupCompleted && mode === "signup") && (
                  <form onSubmit={handleEmailSubmit} className="space-y-3">
                    <Input label="Email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required />
                    <div className="relative">
                      <Input
                        label="Mot de passe"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        autoComplete={mode === "login" ? "current-password" : "new-password"}
                        hint={mode === "signup" ? "8+ caractères, avec majuscule, minuscule, chiffre, symbole." : undefined}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-9 text-gray-400 hover:text-gray-600"
                        aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
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
                          aria-label={showConfirmPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                        >
                          {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    )}
                    <Button type="submit" loading={mode === "login" ? loadingEmail : loadingSignUp} size="lg" className="w-full">
                      {mode === "login" ? "Se connecter" : "Créer mon compte"}
                    </Button>
                  </form>
                )}

                {mode === "login" && (
                  <Button type="button" variant="ghost" loading={loadingReset} className="w-full" onClick={() => onResetPassword(email.trim())}>
                    Mot de passe oublié
                  </Button>
                )}
              </div>
            )}
          </div>
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-4 text-center text-sm text-amber-800">
            <p className="font-medium">Vous n&apos;êtes pas membre de la famille&nbsp;?</p>
            <a
              href="/presentation"
              target="_self"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center justify-center gap-2 text-amber-700 font-semibold hover:text-amber-800"
            >
              Accédez à la page de présentation
              <ExternalLink size={14} />
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
