import { Layout } from "@/components/Layout";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Settings as SettingsIcon, ArrowRight } from "lucide-react";

export default function Settings() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) {
    navigate("/login");
    return null;
  }

  return (
    <Layout authenticated={true} onLogout={logout}>
      <div className="min-h-[calc(100vh-200px)] flex items-center justify-center px-4 py-12">
        <div className="max-w-lg text-center">
          <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
            <SettingsIcon className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Settings</h1>
          <p className="text-muted-foreground mb-8">
            Configure your hospital's preferences, API integrations,
            notification settings, user management, and security policies. You
            can also manage multilingual preferences and alert thresholds.
          </p>
          <button
            onClick={() => navigate("/dashboard")}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary text-white font-semibold rounded-lg hover:shadow-lg transition-all"
          >
            Back to Dashboard <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </Layout>
  );
}
