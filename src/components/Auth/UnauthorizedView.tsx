import { ShieldX, Mail, LogOut } from "lucide-react";
import { Button } from "../ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/Card";

interface UnauthorizedViewProps {
  userEmail?: string;
  onLogout: () => void;
}

/**
 * Vue affichée lorsqu'un utilisateur non autorisé tente d'accéder à l'application.
 */
export const UnauthorizedView = ({
  userEmail,
  onLogout,
}: UnauthorizedViewProps) => {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full border-red-100">
        <CardHeader className="text-center bg-red-50/60 border-b border-red-100">
          <div className="bg-red-100 text-red-600 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <ShieldX size={40} />
          </div>
          <CardTitle className="text-2xl">Accès refusé</CardTitle>
          <p className="text-sm text-gray-600 mt-2 px-4">
            Ce compte n’est pas autorisé à accéder à cette application.
          </p>
        </CardHeader>

        <CardContent className="space-y-5">
          <div className="text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
            <span className="font-medium text-gray-900">Compte connecté :</span>{" "}
            {userEmail ?? "Email non disponible"}
          </div>

          <div className="bg-yellow-50 border border-yellow-100 rounded-lg p-4 flex items-start gap-3">
            <div className="bg-yellow-100 text-yellow-700 rounded-full p-1.5 mt-0.5">
              <Mail size={16} />
            </div>
            <p className="text-sm text-yellow-900 leading-relaxed">
              Contactez un administrateur pour demander l’accès à votre adresse
              email.
            </p>
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
