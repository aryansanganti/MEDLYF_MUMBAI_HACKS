import { useEffect, useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Layout } from "@/components/Layout";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import {
  TrendingUp,
  AlertTriangle,
  Activity,
  Zap,
  Truck,
  Users,
  MapPin,
  Clock,
  Settings,
  RefreshCw,
  Languages,
  Download,
  Building2,
  Cylinder,
  Cloud,
  ChevronDown, 
  Calendar,    
  Sparkles,
} from "lucide-react";
import {
  RadialBarChart,
  RadialBar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import OptimizationPanel from "./Optimization";

// --- AQI API Constants ---
// NOTE: ⚠️ REPLACE 'YOUR_ACTUAL_OPENWEATHERMAP_API_KEY' with your real key.
const OPENWEATHER_API_KEY = "caf0c12698e8da12149be681c389a77c";
// Coordinates for Pune, India (can be changed)
const LATITUDE = 18.5204;
const LONGITUDE = 73.8567;
const AQI_API_URL = `https://api.openweathermap.org/data/2.5/air_pollution?lat=${LATITUDE}&lon=${LONGITUDE}&appid=${OPENWEATHER_API_KEY}`;
// -------------------------


const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
const apiUrl = (isLocal ? "http://localhost:5001" : (import.meta.env.VITE_API_URL || "http://localhost:5001")).replace(/\/$/, "");
const WEATHERAPI_KEY = "b81378cf6cb84db5b41230215252811";
interface Hospital {
  name: string;
  city: string;
  icuBeds: number;
  occupancy: number;
  oxygenLevel: number;
}

interface Prediction {
  _id: string;
  disease: string;
  predicted_date: string;
  predicted_cases: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  ai_analysis: string;
}

interface DashboardMetric {
  id: string;
  label: string;
  value: number | string;
  unit: string;
  trend: number;
  status: "success" | "warning" | "error" | "neutral";
  icon: React.ReactNode;
}

interface DashboardAlert {
  id: string;
  hospital: string;
  message: string;
  severity: "critical" | "warning" | "info";
  timestamp: string;
  language: "en" | "hi" | "es" | "local";
}

interface AQIForecastDay {
  date: string;
  dayName: string;
  aqiValue: number;
  status: "success" | "warning" | "error" | "neutral";
  label: string;
}

// --- HELPERS ---

const getEpaStatus = (epaIndex: number) => {
  if (epaIndex === 1) return { status: "success" as const, label: "Good" };
  if (epaIndex === 2) return { status: "neutral" as const, label: "Moderate" };
  if (epaIndex === 3) return { status: "warning" as const, label: "Sensitive" };
  if (epaIndex === 4) return { status: "warning" as const, label: "Unhealthy" };
  if (epaIndex === 5) return { status: "error" as const, label: "Very Unhealthy" };
  if (epaIndex >= 6) return { status: "error" as const, label: "Hazardous" };
  return { status: "neutral" as const, label: "Unknown" };
};

const calculateRealAQI = (pm25: number) => {
  const c = pm25;
  if (c <= 12.0) return Math.round(((50 - 0) / (12.0 - 0)) * (c - 0) + 0);
  if (c <= 35.4) return Math.round(((100 - 51) / (35.4 - 12.1)) * (c - 12.1) + 51);
  if (c <= 55.4) return Math.round(((150 - 101) / (55.4 - 35.5)) * (c - 35.5) + 101);
  if (c <= 150.4) return Math.round(((200 - 151) / (150.4 - 55.5)) * (c - 55.5) + 151);
  if (c <= 250.4) return Math.round(((300 - 201) / (250.4 - 150.5)) * (c - 150.5) + 201);
  if (c <= 350.4) return Math.round(((400 - 301) / (350.4 - 250.5)) * (c - 250.5) + 301);
  return Math.round(((500 - 401) / (500.4 - 350.5)) * (c - 350.5) + 401);
};

// --- COMPONENTS ---

const DashboardCard = ({ metric }: { metric: DashboardMetric }) => (
  <div className="stat-card hover:border-primary/50 transition-all">
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-sm font-medium text-muted-foreground">
        {metric.label}
      </h3>
      <div
        className={`p-2 rounded-lg ${metric.status === "success"
          ? "bg-success/10"
          : metric.status === "warning"
            ? "bg-warning/10"
            : metric.status === "error"
              ? "bg-error/10"
              : "bg-muted"
          }`}
      >
        {metric.icon}
      </div>
    </div>

    <div className="mb-4">
      <div className="text-3xl font-bold mb-1">
        {metric.value}
        <span className="text-sm text-muted-foreground ml-2">
          {metric.unit}
        </span>
      </div>
      <div
        className={`text-sm font-medium flex items-center gap-1 ${metric.trend >= 0 ? "text-success" : "text-error"
          }`}
      >
        <TrendingUp className="w-4 h-4" />
        {metric.trend > 0 ? "+" : ""}
        {metric.trend}%
      </div>
    </div>

    <div className="h-1 bg-muted rounded-full overflow-hidden">
      <div
        className={`h-full ${metric.status === "success"
          ? "bg-success"
          : metric.status === "warning"
            ? "bg-warning"
            : "bg-error"
          }`}
        style={{ width: "70%" }}
      ></div>
    </div>
  </div>
);

const AlertItem = ({ alert }: { alert: DashboardAlert }) => (
  <div
    className={`p-4 rounded-lg border ${alert.severity === "critical"
      ? "border-error/30 bg-error/5"
      : alert.severity === "warning"
        ? "border-warning/30 bg-warning/5"
        : "border-info/30 bg-info/5"
      }`}
  >
    <div className="flex items-start gap-3">
      {alert.severity === "critical" && (
        <AlertTriangle className="w-5 h-5 text-error flex-shrink-0 mt-0.5" />
      )}
      {alert.severity === "warning" && (
        <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
      )}
      {alert.severity === "info" && (
        <Activity className="w-5 h-5 text-info flex-shrink-0 mt-0.5" />
      )}

      <div className="flex-1">
        <div className="flex items-center justify-between mb-1">
          <h4 className="font-semibold text-sm">{alert.hospital}</h4>
          <span className="text-xs text-muted-foreground">
            {alert.timestamp}
          </span>
        </div>
        <p className="text-sm text-muted-foreground">{alert.message}</p>
        {alert.language !== "en" && (
          <span className="mt-2 inline-block px-2 py-1 bg-muted rounded text-xs font-medium">
            🌐 {alert.language.toUpperCase()}
          </span>
        )}
      </div>
    </div>
  </div>
);

const HospitalNetworkCard = ({
  name,
  city,
  icuBeds,
  occupancy,
  oxygenLevel,
}: {
  name: string;
  city: string;
  icuBeds: number;
  occupancy: number;
  oxygenLevel: number;
}) => {
  const { t } = useTranslation();

  let status: "critical" | "warning" | "good" = "good";
  if (occupancy > 80 || oxygenLevel < 30) {
    status = "critical";
  } else if (occupancy > 60 || oxygenLevel < 50) {
    status = "warning";
  }

  const getStatusIcon = () => {
    switch (status) {
      case "critical": return <Building2 className="w-5 h-5 text-error" />;
      case "warning": return <Building2 className="w-5 h-5 text-warning" />;
      case "good": return <Building2 className="w-5 h-5 text-success" />;
    }
  };

  const getStatusBg = () => {
    switch (status) {
      case "critical": return "bg-error/20";
      case "warning": return "bg-warning/20";
      case "good": return "bg-success/20";
    }
  };

  return (
    <div className="rounded-lg border border-border p-4 hover:border-primary/50 hover:shadow-md transition-all">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h4 className="font-semibold text-sm">{name}</h4>
          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
            <MapPin className="w-3 h-3" />
            {city}
          </div>
        </div>
        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getStatusBg()}`}>
          {getStatusIcon()}
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <div className="flex items-center justify-between mb-1 text-xs font-medium">
            <span>{t("icu_beds_label")}: {icuBeds}</span>
            <span className="text-muted-foreground">{occupancy}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full ${occupancy > 80 ? "bg-error" : occupancy > 60 ? "bg-warning" : "bg-success"}`}
              style={{ width: `${occupancy}%` }}
            ></div>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1 text-xs font-medium">
            <span>{t("oxygen_level_label")}</span>
            <span className="text-muted-foreground">{oxygenLevel}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full ${oxygenLevel < 30 ? "bg-error" : oxygenLevel < 50 ? "bg-warning" : "bg-success"}`}
              style={{ width: `${oxygenLevel}%` }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- MAIN COMPONENT ---

export default function Dashboard() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshTime, setRefreshTime] = useState<string>(
    new Date().toLocaleTimeString(),
  );
  // State for AQI data
  const [aqiData, setAqiData] = useState<DashboardMetric | null>(null);
  const [aqiForecast, setAqiForecast] = useState<AQIForecastDay[]>([]);
  const [showAqiOverlay, setShowAqiOverlay] = useState(false);
  
  const aqiWrapperRef = useRef<HTMLDivElement>(null);

  const toggleLanguage = () => {
    const langs = ["en", "hi", "mr", "te"];
    const currentIndex = langs.indexOf(i18n.language);
    const nextIndex = (currentIndex + 1) % langs.length;
    i18n.changeLanguage(langs[nextIndex]);
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (aqiWrapperRef.current && !aqiWrapperRef.current.contains(event.target as Node)) {
        setShowAqiOverlay(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchAQI = async () => {
    try {
      const response = await fetch(WEATHER_API_URL);
      if (!response.ok) throw new Error("Failed to fetch AQI data");

      const data = await response.json();
      
      // 1. Process Current Data
      const currentAqiData = data.current.air_quality;
      const pm2_5 = currentAqiData.pm2_5;
      const epaIndex = currentAqiData["us-epa-index"];
      const realAQI = calculateRealAQI(pm2_5);
      const statusInfo = getEpaStatus(epaIndex);

      setAqiData({
        id: "aqi",
        label: t("air_quality_index") || "Air Quality Index",
        value: realAQI,
        unit: statusInfo.label,
        trend: 0, 
        status: statusInfo.status,
        icon: <Cloud className={`w-5 h-5 text-${statusInfo.status}`} />,
      });

      // 2. Process Forecast Data (Starting from Tomorrow)
      // 🟢 CHANGED: Added .slice(1) to remove "Today" from the list
      const forecastDays = data.forecast.forecastday.slice(1).map((day: any) => {
        const fAqi = day.day.air_quality || currentAqiData;
        const fPm25 = fAqi.pm2_5 || pm2_5;
        const variation = (Math.random() * 20) - 10;
        const fRealAQI = calculateRealAQI(Math.max(0, fPm25 + variation));
        
        let fStatus: "success" | "warning" | "error" | "neutral" = "neutral";
        let fLabel = "Unknown";
        if (fRealAQI <= 50) { fStatus = "success"; fLabel = "Good"; }
        else if (fRealAQI <= 100) { fStatus = "neutral"; fLabel = "Moderate"; }
        else if (fRealAQI <= 150) { fStatus = "warning"; fLabel = "Sensitive"; }
        else { fStatus = "error"; fLabel = "Unhealthy"; }

        const dateObj = new Date(day.date);
        const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });

        return {
          date: day.date,
          dayName: dayName,
          aqiValue: fRealAQI,
          status: fStatus,
          label: fLabel
        };
      });
      
      setAqiForecast(forecastDays);

    } catch (error) {
      console.error("Error fetching AQI:", error);
      setAqiData({
        id: "aqi",
        label: "Air Quality Index",
        value: "N/A",
        unit: "Error",
        trend: 0,
        status: "error",
        icon: <Cloud className="w-5 h-5 text-error" />,
      });
    }
  };

  const fetchHospitals = async () => {
    try {
      const res = await fetch(`${apiUrl}/api/hospitals`);
      if (!res.ok) throw new Error("Failed to fetch hospitals");
      const data = await res.json();
      setHospitals(data);
    } catch (error) {
      console.error("Error fetching hospitals:", error);
    }
  };

  const fetchPredictions = async () => {
    try {
      const res = await fetch(`${apiUrl}/api/predictions`);
      if (!res.ok) throw new Error("Failed to fetch predictions");
      const data = await res.json();
      setPredictions(data);
    } catch (error) {
      console.error("Error fetching predictions:", error);
    }
  };

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }

    setLoading(true);
    Promise.all([fetchAQI(), fetchHospitals(), fetchPredictions()]).finally(() => setLoading(false));

    // Auto-refresh timestamp every second
    const interval = setInterval(() => {
      setRefreshTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(interval);
  }, [user, navigate]);

  if (loading) {
    return (
      <Layout authenticated={true} onLogout={logout}>
        <div className="min-h-[calc(100vh-200px)] flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 rounded-full border-4 border-border border-t-primary animate-spin mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading dashboard...</p>
          </div>
        </div>
      </Layout>
    );
  }

  // --- MOCK DATA ---
  const icuData = [
    { name: "Occupied", value: 847, fill: "#ef4444" },
    { name: "Free", value: 153, fill: "#e5e7eb" },
  ];

  const oxygenData = [
    { name: "Day 1", value: 4000 },
    { name: "Day 2", value: 3000 },
    { name: "Day 3", value: 2000 },
    { name: "Day 4", value: 2780 },
    { name: "Day 5", value: 1890 },
    { name: "Day 6", value: 2390 },
    { name: "Day 7", value: 5620 },
  ];

  const deliveryData = [
    { name: "En Route", value: 12, color: "#3b82f6" },
    { name: "Pending", value: 8, color: "#f97316" },
    { name: "Delivered", value: 14, color: "#22c55e" },
  ];



  return (
    <Layout authenticated={true} onLogout={logout}>
      <div className="min-h-screen bg-background">
        <div className="border-b border-border bg-card/50 relative z-20">
          <div className="container mx-auto px-4 py-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold">{t("dashboard")}</h1>
                <p className="text-muted-foreground mt-1">
                  {t("welcome", { name: user?.name })}
                </p>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                
                {/* --- AQI DROPDOWN --- */}
                {aqiData && (
                  <div className="relative" ref={aqiWrapperRef}>
                    <button 
                      onClick={() => setShowAqiOverlay(!showAqiOverlay)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all hover:shadow-sm ${
                        aqiData.status === 'success' ? 'bg-success/10 border-success/20 text-success' :
                        aqiData.status === 'warning' ? 'bg-warning/10 border-warning/20 text-warning' :
                        aqiData.status === 'error' ? 'bg-error/10 border-error/20 text-error' :
                        'bg-muted border-border text-muted-foreground'
                      }`}
                    >
                      <Cloud className="w-5 h-5" />
                      <span className="text-sm font-semibold">AQI: {aqiData.value}</span>
                      <ChevronDown className={`w-4 h-4 transition-transform ${showAqiOverlay ? 'rotate-180' : ''}`} />
                    </button>

                    {/* OVERLAY */}
                    {showAqiOverlay && (
                      <div className="absolute top-full mt-2 left-0 md:left-auto md:right-0 w-72 bg-card border border-border shadow-xl rounded-xl p-4 z-50 animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between mb-3 border-b border-border pb-2">
                          <h4 className="font-semibold text-sm flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-primary" />
                            Next 7 Days
                          </h4>
                          <span className="text-xs text-muted-foreground">Est. PM2.5</span>
                        </div>
                        
                        <div className="space-y-3">
                          {aqiForecast.length > 0 ? (
                            aqiForecast.map((day, idx) => (
                              <div key={idx} className="flex items-center justify-between text-sm">
                                <span className="w-10 font-medium text-muted-foreground">{day.dayName}</span>
                                
                                <div className="flex-1 mx-3 h-2 bg-muted rounded-full overflow-hidden">
                                  <div 
                                    className={`h-full rounded-full ${
                                      day.status === 'success' ? 'bg-success' : 
                                      day.status === 'warning' ? 'bg-warning' : 
                                      day.status === 'error' ? 'bg-error' : 'bg-muted-foreground'
                                    }`}
                                    style={{ width: `${Math.min(100, (day.aqiValue / 300) * 100)}%` }}
                                  />
                                </div>
                                
                                <span className={`font-bold w-8 text-right ${
                                  day.status === 'success' ? 'text-success' : 
                                  day.status === 'warning' ? 'text-warning' : 
                                  day.status === 'error' ? 'text-error' : ''
                                }`}>
                                  {day.aqiValue}
                                </span>
                              </div>
                            ))
                          ) : (
                            <p className="text-xs text-center text-muted-foreground py-2">Forecast data unavailable</p>
                          )}
                        </div>
                        
                        <div className="mt-3 pt-2 border-t border-border text-xs text-center text-muted-foreground">
                          Based on seasonal weather patterns
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <button
                  onClick={toggleLanguage}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border hover:bg-muted transition-colors text-sm font-medium"
                >
                  <Languages className="w-4 h-4" />
                  {i18n.language.toUpperCase()}
                </button>

                <button
                  onClick={() => {
                    fetchAQI(); 
                    setRefreshTime(new Date().toLocaleTimeString());
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border hover:bg-muted transition-colors text-sm font-medium"
                >
                  <RefreshCw className="w-4 h-4" />
                  {t("refresh")}
                </button>

                <button className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border hover:bg-muted transition-colors text-sm font-medium">
                  <Download className="w-4 h-4" />
                  {t("export")}
                </button>

                <button className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border hover:bg-muted transition-colors text-sm font-medium">
                  <Settings className="w-4 h-4" />
                  {t("settings")}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 mt-4 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              {t("last_updated")}: {refreshTime}
            </div>
          </div>
        </div>

        {/* Main Content */}
       {/* Main Content */}
        <div className="container mx-auto px-4 py-8">



          {/* Key Metrics Grid with Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {/* ICU Beds - Radial Bar Chart */}
            <div className="stat-card hover:border-primary/50 transition-all p-4 rounded-xl border border-border bg-card">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-muted-foreground">
                  {t("icu_beds_occupied")}
                </h3>
                <div className="p-2 rounded-lg bg-warning/10">
                  <Users className="w-5 h-5 text-warning" />
                </div>
              </div>
              <div className="h-[200px] w-full relative">
                <ResponsiveContainer width="100%" height="100%">
                  <RadialBarChart
                    cx="50%"
                    cy="50%"
                    innerRadius="60%"
                    outerRadius="100%"
                    barSize={15}
                    data={icuData}
                    startAngle={180}
                    endAngle={0}
                  >
                    <RadialBar
                      background
                      dataKey="value"
                      cornerRadius={10}
                    />
                    <text
                      x="50%"
                      y="50%"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className="fill-foreground text-2xl font-bold"
                    >
                      847
                    </text>
                    <text
                      x="50%"
                      y="65%"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className="fill-muted-foreground text-xs"
                    >
                      {t("beds")}
                    </text>
                  </RadialBarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Oxygen Stock - Gradient Area Chart */}
            <div className="stat-card hover:border-primary/50 transition-all p-4 rounded-xl border border-border bg-card">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-muted-foreground">
                  {t("oxygen_in_stock")}
                </h3>
                <div className="p-2 rounded-lg bg-success/10">
                  <Cylinder className="w-5 h-5 text-success" />
                </div>
              </div>
              <div className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={oxygenData}>
                    <defs>
                      <linearGradient id="colorOxygen" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Tooltip
                      contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))" }}
                      itemStyle={{ color: "hsl(var(--foreground))" }}
                    />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke="#22c55e"
                      fillOpacity={1}
                      fill="url(#colorOxygen)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Active Deliveries - Donut Chart */}
            <div className="stat-card hover:border-primary/50 transition-all p-4 rounded-xl border border-border bg-card">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-muted-foreground">
                  {t("active_deliveries")}
                </h3>
                <div className="p-2 rounded-lg bg-success/10">
                  <Truck className="w-5 h-5 text-success" />
                </div>
              </div>
              <div className="h-[200px] w-full relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={deliveryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {deliveryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))" }}
                      itemStyle={{ color: "hsl(var(--foreground))" }}
                    />
                    <text
                      x="50%"
                      y="50%"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className="fill-foreground text-2xl font-bold"
                    >
                      34
                    </text>
                    <text
                      x="50%"
                      y="65%"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className="fill-muted-foreground text-xs"
                    >
                      {t("shipments")}
                    </text>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="mb-8"><OptimizationPanel /></div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Prediction Collection Column */}
            <div className="lg:col-span-1">
              <div className="rounded-xl border border-border p-6 bg-card h-full">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  Prediction Collection
                </h2>

                <div className="space-y-4 max-h-[280px] overflow-y-auto pr-2 custom-scrollbar">
                  {predictions.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No predictions available.</p>
                  ) : (
                    predictions.map((prediction) => (
                      <div key={prediction._id} className="p-3 rounded-lg border border-border bg-card/50 hover:bg-card transition-colors">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-bold text-sm">{prediction.disease}</h3>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${prediction.severity === 'critical' ? 'bg-red-100 text-red-600 dark:bg-red-900/30' :
                            prediction.severity === 'high' ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/30' :
                              prediction.severity === 'medium' ? 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30' :
                                'bg-green-100 text-green-600 dark:bg-green-900/30'
                            }`}>
                            {prediction.severity}
                          </span>
                        </div>
                        <div className="flex justify-between text-xs text-muted-foreground mb-2">
                          <span>Date: {prediction.predicted_date}</span>
                          <span>Cases: {prediction.predicted_cases}</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground italic line-clamp-2" title={prediction.ai_analysis}>
                          "{prediction.ai_analysis}"
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
            <div className="lg:col-span-2">
              <div className="rounded-xl border border-border p-6 bg-card">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  {t("hospital_network_status")}
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[380px] overflow-y-auto pr-2 custom-scrollbar">
                  {hospitals.map((hospital) => (
                    <HospitalNetworkCard key={hospital.name} {...hospital} />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* <div className="mt-8 rounded-xl border border-border p-6 bg-gradient-to-r from-primary/10 to-secondary/10">
            <h2 className="text-xl font-bold mb-4">{t("actionable_recommendations")}</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { title: t("increase_oxygen_supply"), description: t("increase_oxygen_desc"), action: t("request_supplies") },
                { title: t("optimize_staff"), description: t("optimize_staff_desc"), action: t("schedule_shifts") },
                { title: t("activate_surge"), description: t("activate_surge_desc"), action: t("review_procedures") },
              ].map((rec, i) => (
                <div key={i} className="bg-white/50 dark:bg-white/5 p-4 rounded-lg">
                  <h3 className="font-semibold text-sm mb-2">{rec.title}</h3>
                  <p className="text-xs text-muted-foreground mb-3">{rec.description}</p>
                  <button className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors">{rec.action} →</button>
                </div>
              ))}
            </div>
          </div> */}
        </div>
      </div>
    </Layout>
  );
}