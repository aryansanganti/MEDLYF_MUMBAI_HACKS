import { Layout } from "@/components/Layout";
import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Home } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname,
    );
  }, [location.pathname]);

  return (
    <Layout authenticated={false}>
      <div className="min-h-[calc(100vh-200px)] flex items-center justify-center px-4 py-12">
        <div className="text-center max-w-md">
          <div className="mb-6">
            <div className="text-7xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary via-secondary to-accent mb-2">
              404
            </div>
            <h1 className="text-3xl font-bold mb-2">Page Not Found</h1>
            <p className="text-muted-foreground mb-8">
              Sorry, the page you're looking for doesn't exist. It might have
              been moved or deleted.
            </p>
          </div>

          <div className="space-y-3">
            <Link
              to="/"
              className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-primary to-secondary text-white font-semibold rounded-lg hover:shadow-lg transition-all"
            >
              <Home className="w-4 h-4" />
              Go Home
            </Link>
            <Link
              to="/dashboard"
              className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 border border-primary text-primary font-semibold rounded-lg hover:bg-primary/5 transition-colors"
            >
              Go to Dashboard
            </Link>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default NotFound;
