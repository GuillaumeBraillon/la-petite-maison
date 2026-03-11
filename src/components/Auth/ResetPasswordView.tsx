import { useState } from "react";
import type { FormEvent } from "react";
import { Lock, Eye, EyeOff } from "lucide-react";
import type { ResetPasswordViewProps } from "../../types";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/Card";

export const ResetPasswordView = ({ onSubmit, onContinue, loading, error, success }: ResetPasswordViewProps) => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLocalError(null);

    if (password.length < 8) {
      setLocalError("Le mot de passe doit contenir au moins 8 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      setLocalError("Les mots de passe ne correspondent pas.");
      return;
    }

    onSubmit(password);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-white flex items-center justify-center p-6">
      <Card className="w-full max-w-sm overflow-hidden">
        <CardHeader className="text-center bg-white">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-100">
            <Lock size={28} className="text-primary-600" />
          </div>
          <CardTitle className="text-2xl">Nouveau mot de passe</CardTitle>
          <p className="mt-1 text-sm text-gray-500">Choisis un mot de passe securise.</p>
        </CardHeader>

        <CardContent className="space-y-4">
          {error ? <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}
          {localError ? <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{localError}</div> : null}
          {success ? <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-700">{success}</div> : null}

          {!success ? (
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="relative">
                <Input
                  label="Nouveau mot de passe"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="new-password"
                  hint="8+ caracteres, avec majuscule, minuscule, chiffre, symbole."
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
              <Button type="submit" loading={loading} size="lg" className="w-full">
                Mettre a jour
              </Button>
            </form>
          ) : (
            <Button type="button" size="lg" className="w-full" onClick={onContinue}>
              Continuer
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
