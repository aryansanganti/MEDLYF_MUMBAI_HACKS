import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Brain, Truck, Calendar, ArrowRight, RefreshCw, Loader2 } from "lucide-react";

interface OptimizationPlan {
    recommendedActions: {
        type: string;
        from: string;
        to: string;
        amount: number;
        reason: string;
    }[];
    forecast: {
        hospitalName: string;
        days: {
            day: string;
            predictedPatients: number;
            status: "GOOD" | "WARNING" | "CRITICAL";
        }[];
    }[];
}

export default function OptimizationPanel() {
    const [data, setData] = useState<OptimizationPlan | null>(null);
    const [loading, setLoading] = useState(true);
    const [regenerating, setRegenerating] = useState(false);

    const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
    const apiUrl = (isLocal ? "http://localhost:5001" : (import.meta.env.VITE_API_URL || "http://localhost:5001")).replace(/\/$/, "");

    const fetchPlan = async () => {
        try {
            const res = await fetch(`${apiUrl}/api/optimization/plan`);
            if (!res.ok) throw new Error("Failed to fetch");
            const jsonData = await res.json();
            setData(jsonData);
        } catch (error) {
            console.error("Error fetching plan:", error);
        } finally {
            setLoading(false);
        }
    };

    const regeneratePlan = async () => {
        setRegenerating(true);
        try {
            const res = await fetch(`${apiUrl}/api/optimization/generate`, { method: "POST" });
            if (!res.ok) throw new Error("Failed to generate");
            const jsonData = await res.json();
            setData(jsonData);
        } catch (error) {
            console.error("Error regenerating plan:", error);
        } finally {
            setRegenerating(false);
        }
    };

    useEffect(() => {
        fetchPlan();
    }, []);

    if (loading) return <div className="p-4 text-center text-muted-foreground">Loading AI insights...</div>;
    if (!data) return <div className="p-4 text-destructive">Failed to load optimization plan.</div>;

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Brain className="w-5 h-5 text-primary" />
                    <h2 className="text-lg font-bold">AI Resource Optimization</h2>
                    {regenerating && (
                        <Loader2 className="w-4 h-4 text-muted-foreground animate-spin ml-2" />
                    )}
                </div>
                <button
                    onClick={regeneratePlan}
                    disabled={regenerating}
                    className="p-1.5 rounded-md hover:bg-muted transition-colors disabled:opacity-50"
                    title="Regenerate Plan"
                >
                    <RefreshCw className={`w-4 h-4 ${regenerating ? 'animate-spin' : ''}`} />
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Recommended Actions */}
                <div className="lg:col-span-1 space-y-3">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Recommended Actions</h3>
                    {data.recommendedActions.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No actions needed currently.</p>
                    ) : (
                        data.recommendedActions.map((action, idx) => (
                            <div key={idx} className="p-3 rounded-lg border border-border bg-card/50 hover:bg-card transition-colors">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className={`p-1.5 rounded-full ${action.type === 'OXYGEN_TRANSFER' ? 'bg-blue-100 text-blue-600' :
                                            action.type === 'PATIENT_TRANSFER' ? 'bg-orange-100 text-orange-600' :
                                                'bg-purple-100 text-purple-600'
                                        }`}>
                                        <Truck className="w-3 h-3" />
                                    </div>
                                    <span className="text-xs font-bold">
                                        {action.type.replace('_', ' ')}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                                    <span>{action.from}</span>
                                    <ArrowRight className="w-3 h-3" />
                                    <span>{action.to}</span>
                                </div>
                                <p className="text-xs font-medium mb-1">
                                    Transfer: {action.amount} units
                                </p>
                                <p className="text-[10px] text-muted-foreground italic">
                                    "{action.reason}"
                                </p>
                            </div>
                        ))
                    )}
                </div>

                {/* 7-Day Forecast */}
                <div className="lg:col-span-2 space-y-3">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">7-Day Demand Forecast</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {data.forecast.map((hospital, idx) => (
                            <div key={idx} className="p-3 rounded-lg border border-border bg-card/50">
                                <div className="flex items-center gap-2 mb-3">
                                    <Calendar className="w-3 h-3 text-muted-foreground" />
                                    <h4 className="text-xs font-bold truncate">{hospital.hospitalName}</h4>
                                </div>
                                <div className="flex justify-between gap-1 overflow-x-auto pb-1">
                                    {hospital.days.map((day, dIdx) => (
                                        <div key={dIdx} className="flex flex-col items-center min-w-[30px]">
                                            <span className="text-[10px] text-muted-foreground mb-1">{day.day}</span>
                                            <div
                                                className={`w-full h-12 rounded-t-sm relative group ${day.status === 'CRITICAL' ? 'bg-red-400' :
                                                        day.status === 'WARNING' ? 'bg-orange-400' :
                                                            'bg-green-400'
                                                    }`}
                                                style={{ height: `${Math.min(day.predictedPatients, 60)}px` }}
                                            >
                                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block bg-popover text-popover-foreground text-[10px] px-1 py-0.5 rounded shadow-sm whitespace-nowrap z-10">
                                                    {day.predictedPatients} patients
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}