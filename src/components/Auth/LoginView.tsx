import { Home } from "lucide-react";
import { Button } from "../ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/Card";

interface LoginViewProps {
  onLogin: () => void;
  loading: boolean;
  error?: string | null;
}

export const LoginView = ({ onLogin, loading, error }: LoginViewProps) => {
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
          {error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <Button
            onClick={onLogin}
            loading={loading}
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
