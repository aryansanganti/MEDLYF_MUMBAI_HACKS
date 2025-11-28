import { useEffect, useState } from "react";
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
        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
          <Activity className="w-5 h-5 text-primary" />
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
              className={`h-full ${occupancy > 80
                ? "bg-error"
                : occupancy > 60
                  ? "bg-warning"
                  : "bg-success"
                }`}
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
              className={`h-full ${oxygenLevel < 30
                ? "bg-error"
                : oxygenLevel < 50
                  ? "bg-warning"
                  : "bg-success"
                }`}
              style={{ width: `${oxygenLevel}%` }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function Dashboard() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [refreshTime, setRefreshTime] = useState<string>(
    new Date().toLocaleTimeString(),
  );

  const toggleLanguage = () => {
    const langs = ["en", "hi", "mr", "te"];
    const currentIndex = langs.indexOf(i18n.language);
    const nextIndex = (currentIndex + 1) % langs.length;
    i18n.changeLanguage(langs[nextIndex]);
  };

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }

    // Simulate loading
    setTimeout(() => setIsLoading(false), 800);

    // Auto-refresh timestamp every second
    const interval = setInterval(() => {
      setRefreshTime(new Date().toLocaleTimeString());
    }, 1000);

    return () => clearInterval(interval);
  }, [user, navigate]);

  if (isLoading) {
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

  const metrics: DashboardMetric[] = []; // Metrics are now rendered individually with charts

  // Mock Data for Charts
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

  const alerts: DashboardAlert[] = [
    {
      id: "1",
      hospital: "City Medical Center, Pune",
      message:
        "ICU occupancy approaching critical capacity. Recommend activating surge protocol.",
      severity: "critical",
      timestamp: "5 mins ago",
      language: "en",
    },
    {
      id: "2",
      hospital: "District Hospital, Nagpur",
      message: "अक्सीजन का स्टॉक 72 घंटे तक सीमित। तुरंत रीफिल का अनुरोध।",
      severity: "warning",
      timestamp: "12 mins ago",
      language: "hi",
    },
    {
      id: "3",
      hospital: "Rural Medical Complex, Aurangabad",
      message: "Nuevo envío de suministros llegará en 4 horas. Sistema listo.",
      severity: "info",
      timestamp: "30 mins ago",
      language: "es",
    },
  ];

  const hospitals = [
    {
      name: "City Medical Center",
      city: "Pune",
      icuBeds: 120,
      occupancy: 85,
      oxygenLevel: 45,
    },
    {
      name: "District Hospital",
      city: "Nagpur",
      icuBeds: 85,
      occupancy: 72,
      oxygenLevel: 38,
    },
    {
      name: "Rural Medical Complex",
      city: "Aurangabad",
      icuBeds: 60,
      occupancy: 56,
      oxygenLevel: 68,
    },
    {
      name: "Community Health Center",
      city: "Solapur",
      icuBeds: 40,
      occupancy: 48,
      oxygenLevel: 82,
    },
  ];

  return (
    <Layout authenticated={true} onLogout={logout}>
      <div className="min-h-screen bg-background">
        {/* Dashboard Header */}
        <div className="border-b border-border bg-card/50">
          <div className="container mx-auto px-4 py-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold">{t("dashboard")}</h1>
                <p className="text-muted-foreground mt-1">
                  {t("welcome", { name: user?.name })}
                </p>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                <button
                  onClick={toggleLanguage}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border hover:bg-muted transition-colors text-sm font-medium"
                >
                  <Languages className="w-4 h-4" />
                  {i18n.language.toUpperCase()}
                </button>

                <button className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border hover:bg-muted transition-colors text-sm font-medium">
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
                  <Activity className="w-5 h-5 text-success" />
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

          {/* Two Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Alerts Column */}
            <div className="lg:col-span-1">
              <div className="rounded-xl border border-border p-6 bg-card">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-warning" />
                  {t("active_alerts")}
                </h2>

                <div className="space-y-4">
                  {alerts.map((alert) => (
                    <AlertItem key={alert.id} alert={alert} />
                  ))}
                </div>

                <button className="w-full mt-4 px-4 py-2 text-center text-sm font-medium text-primary border border-primary rounded-lg hover:bg-primary/5 transition-colors">
                  {t("view_all_alerts")}
                </button>
              </div>
            </div>

            {/* Hospital Network Column */}
            <div className="lg:col-span-2">
              <div className="rounded-xl border border-border p-6 bg-card">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  {t("hospital_network_status")}
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {hospitals.map((hospital) => (
                    <HospitalNetworkCard key={hospital.name} {...hospital} />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Predictions Section */}
          <div className="mt-8 rounded-xl border border-border p-6 bg-card">
            <h2 className="text-xl font-bold mb-4">
              {t("ai_predictions")}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                {
                  day: t("tomorrow"),
                  icuBeds: "890",
                  oxygen: "2450",
                  confidence: "92%",
                },
                {
                  day: t("day_3"),
                  icuBeds: "920",
                  oxygen: "2580",
                  confidence: "88%",
                },
                {
                  day: t("day_4"),
                  icuBeds: "850",
                  oxygen: "2380",
                  confidence: "85%",
                },
                {
                  day: t("day_7"),
                  icuBeds: "780",
                  oxygen: "2200",
                  confidence: "78%",
                },
              ].map((pred, i) => (
                <div
                  key={i}
                  className="p-4 rounded-lg bg-gradient-to-br from-primary/5 to-secondary/5 border border-primary/20"
                >
                  <p className="text-sm font-semibold text-muted-foreground mb-3">
                    {pred.day}
                  </p>
                  <div className="space-y-2 mb-4">
                    <div>
                      <p className="text-xs text-muted-foreground">ICU Beds</p>
                      <p className="text-2xl font-bold">{pred.icuBeds}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Oxygen (cyl/day)
                      </p>
                      <p className="text-2xl font-bold">{pred.oxygen}</p>
                    </div>
                  </div>
                  <div className="px-2 py-1 bg-success/20 rounded text-xs font-semibold text-success inline-block">
                    {pred.confidence} {t("confidence")}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recommendations */}
          <div className="mt-8 rounded-xl border border-border p-6 bg-gradient-to-r from-primary/10 to-secondary/10">
            <h2 className="text-xl font-bold mb-4">
              {t("actionable_recommendations")}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                {
                  title: t("increase_oxygen_supply"),
                  description: t("increase_oxygen_desc"),
                  action: t("request_supplies"),
                },
                {
                  title: t("optimize_staff"),
                  description: t("optimize_staff_desc"),
                  action: t("schedule_shifts"),
                },
                {
                  title: t("activate_surge"),
                  description: t("activate_surge_desc"),
                  action: t("review_procedures"),
                },
              ].map((rec, i) => (
                <div
                  key={i}
                  className="bg-white/50 dark:bg-white/5 p-4 rounded-lg"
                >
                  <h3 className="font-semibold text-sm mb-2">{rec.title}</h3>
                  <p className="text-xs text-muted-foreground mb-3">
                    {rec.description}
                  </p>
                  <button className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors">
                    {rec.action} →
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
