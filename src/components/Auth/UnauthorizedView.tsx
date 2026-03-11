import { ShieldX, LogOut } from "lucide-react";
import type { UnauthorizedViewProps } from "../../types";
import { Button } from "../ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/Card";

/**
 * Vue affichée lorsqu'un utilisateur non autorisé tente d'accéder à l'application.
 */
export const UnauthorizedView = ({ userEmail, onLogout }: UnauthorizedViewProps) => {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full border-red-100">
        <CardHeader className="text-center bg-red-50/60 border-b border-red-100">
          <div className="bg-red-100 text-red-600 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <ShieldX size={40} />
          </div>
          <CardTitle className="text-2xl">Email validé ✓</CardTitle>
          <p className="text-sm text-gray-600 mt-2 px-4">
            Votre adresse email a été confirmée. Un administrateur doit maintenant autoriser votre accès à l&apos;application.
          </p>
        </CardHeader>

        <CardContent className="space-y-5">
          <div className="text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
            <span className="font-medium text-gray-900">Compte connecté :</span> {userEmail ?? "Email non disponible"}
          </div>

          <Button onClick={onLogout} variant="secondary" className="w-full">
            <LogOut size={16} />
            Se déconnecter
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
