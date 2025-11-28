// App.tsx - Router configuration (no createRoot here, that's in main.tsx)
import { Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Reports from "./pages/Reports";
import Maps from "./pages/Maps";
import NotFound from "./pages/NotFound";
import DataBaseAlert from "./pages/DataBaseAlert";
import OptimizationPanel from "./pages/Optimization";

export const App = () => (
  <Routes>
    <Route path="/" element={<Index />} />
    <Route path="/login" element={<Login />} />
    <Route path="/dashboard" element={<Dashboard />} />
    <Route path="/reports" element={<Reports />} />
    <Route path="/maps" element={<Maps />} />
    <Route path="/database-alert" element={<DataBaseAlert />} />
    <Route path="/optimization" element={<OptimizationPanel />} />
    <Route path="*" element={<NotFound />} />
  </Routes>
);
