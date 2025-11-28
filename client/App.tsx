// App.tsx - Router configuration (no createRoot here, that's in main.tsx)
import { Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import Maps from "./pages/Maps";
import NotFound from "./pages/NotFound";
import DataBaseAlert from "./pages/DataBaseAlert";

export const App = () => (
  <Routes>
    <Route path="/" element={<Index />} />
    <Route path="/login" element={<Login />} />
    <Route path="/dashboard" element={<Dashboard />} />
    <Route path="/reports" element={<Reports />} />
    <Route path="/settings" element={<Settings />} />
    <Route path="/maps" element={<Maps/>} />
    <Route path="/database-alert" element={<DataBaseAlert />} />
    <Route path="*" element={<NotFound />} />
  </Routes>
);
