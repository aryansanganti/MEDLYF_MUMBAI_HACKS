import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import {
  FileText,
  Download,
  RefreshCw,
  Activity,
  Users,
  Truck,
  AlertTriangle,
  TrendingUp,
  Loader2,
  Sparkles,
  CheckCircle2,
} from "lucide-react";

// --- PDF Generation Imports ---
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
// ------------------------------

// Base URL for your backend server
const API_BASE_URL = "http://localhost:5001";

interface ReportData {
  timestamp: string;
  patients: {
    total: number;
    active: number;
    totalBeds: number;
    occupancyRate: number;
    recentAdmissions: number;
  };
  oxygen: {
    capacity: number;
    totalUsed: number;
    remaining: number;
    percentageRemaining: number;
  };
  jobs: {
    total: number;
    pending: number;
    assigned: number;
    completed: number;
  };
  vehicles: {
    total: number;
  };
}

export default function Reports() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [aiSummary, setAiSummary] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [generatingSummary, setGeneratingSummary] = useState(false);
  const [downloadingPDF, setDownloadingPDF] = useState(false);
  const [error, setError] = useState<string>("");

  // Load data on component mount
  useEffect(() => {
    fetchReportData();
  }, []);

  if (!user) {
    navigate("/login");
    return null;
  }

  // --- 1. Fetch report data from backend ---
  const fetchReportData = async () => {
    setLoading(true);
    setError("");
    setAiSummary(""); // Reset summary when new data is fetched
    try {
      const response = await fetch(`${API_BASE_URL}/api/reports/data`);
      if (!response.ok) {
        // Attempt to read error message from backend
        const errorText = await response.text();
        throw new Error(`[${response.status}] ${errorText || 'Server error.'}`);
      }
      const data: ReportData = await response.json();
      setReportData(data);
    } catch (err) {
      setError(err instanceof Error ? `Data Load Failed: ${err.message}` : "Failed to load data");
      console.error("Error fetching report data:", err);
    } finally {
      setLoading(false);
    }
  };

  // --- 2. Generate AI summary using Gemini ---
  const generateAISummary = async () => {
    if (!reportData) {
      setError("Please load report data first.");
      return;
    }

    setGeneratingSummary(true);
    setError("");
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/reports/generate-summary`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data: reportData }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`[${response.status}] ${errorText || 'Server error during summary generation.'}`);
      }

      const result = await response.json();

      // Clean markdown formatting from summary
      const cleanMarkdown = (text: string): string => {
        return text
          .replace(/^#{1,6}\s+/gm, '') // Remove headers
          .replace(/\*\*(.+?)\*\*/g, '$1') // Remove bold
          .replace(/__(.+?)__/g, '$1')
          .replace(/\*(.+?)\*/g, '$1') // Remove italic
          .replace(/_(.+?)_/g, '$1')
          .replace(/^\s*[-*+]\s+/gm, '• ') // Convert bullet points
          .replace(/^\s*\d+\.\s+/gm, '') // Remove numbered lists
          .replace(/^---+$/gm, '') // Remove horizontal rules
          .replace(/```[\s\S]*?```/g, '') // Remove code blocks
          .replace(/`(.+?)`/g, '$1')
          .replace(/\n{3,}/g, '\n\n') // Clean up extra whitespace
          .trim();
      };

      // Ensure the summary is a string, clean it, then trim surrounding quotes if present
      const summaryText = typeof result.summary === 'string'
        ? cleanMarkdown(result.summary.trim().replace(/^\"|\"$/g, ''))
        : String(result.summary);

      setAiSummary(summaryText);
    } catch (err) {
      setError(
        err instanceof Error
          ? `AI Summary Failed: ${err.message}`
          : "Failed to generate AI summary. Check backend logs."
      );
      console.error("Error generating summary:", err);
    } finally {
      setGeneratingSummary(false);
    }
  };

  // --- 3. Backend PDF Download Attempt (Original Logic) ---
  const downloadBackendPDF = async () => {
    if (!reportData) return;

    setDownloadingPDF(true);
    setError("");
    try {
      const response = await fetch(`${API_BASE_URL}/api/reports/download`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: reportData,
          summary: aiSummary,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`[${response.status}] Backend PDF generation failed: ${errorText || 'Server error.'}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `medlyf-backend-report-${new Date().toISOString()}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      console.log("PDF downloaded successfully via backend.");

    } catch (err) {
      setError(err instanceof Error ? `PDF Download Failed: ${err.message}. Trying client-side fallback...` : "Failed to download PDF");
      console.error("Error downloading PDF from backend:", err);
      // Fallback to client-side generation
      downloadClientPDF();
    } finally {
      // setDownloadingPDF(false) moved to end of client-side logic
    }
  };

  // --- 4. Client-Side PDF Generation (Fallback) ---
  const downloadClientPDF = () => {
    setDownloadingPDF(true);
    const input = document.getElementById('report-content-area');

    if (!input) {
      setError("Cannot find report content area for PDF generation.");
      setDownloadingPDF(false);
      return;
    }

    // Capture the HTML content using html2canvas
    html2canvas(input, { scale: 2, logging: false }).then((canvas) => {
      const imgData = canvas.toDataURL('image/jpeg', 0.9);
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();

      // Calculate image dimensions to fit the PDF page while maintaining aspect ratio
      const imgProps = pdf.getImageProperties(imgData);
      const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;
      const pdfHeight = pdf.internal.pageSize.getHeight();

      let heightLeft = imgHeight;
      let position = 0;

      // Add first page content
      pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, imgHeight);
      heightLeft -= pdfHeight;

      // Handle multiple pages if the content is long
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, imgHeight);
        heightLeft -= pdfHeight;
      }

      pdf.save(`medlyf-client-report-${new Date().toISOString()}.pdf`);
      console.log("PDF downloaded successfully via client-side fallback.");
      setDownloadingPDF(false);
      setError(""); // Clear error if client-side succeeded after backend failure
    });
  };

  // Choose which PDF function to call from the button
  const handlePDFDownload = () => {
    // Always attempt the robust backend method first
    downloadBackendPDF();
  };
  // --------------------------------------------------

  return (
    <Layout authenticated={true} onLogout={logout}>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="border-b border-border bg-card/50">
          <div className="container mx-auto px-4 py-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold flex items-center gap-3">
                  <FileText className="w-8 h-8 text-primary" />
                  System Reports
                </h1>
                <p className="text-muted-foreground mt-1">
                  Comprehensive analytics and AI-powered insights
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={fetchReportData}
                  disabled={loading}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white font-semibold rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                  {loading ? "Loading..." : "Load Data"}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="container mx-auto px-4 py-8" id="report-content-area">
          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-error/10 border border-error/30 rounded-lg flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-error flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-error">Error</h3>
                <p className="text-sm text-error/80">{error}</p>
                <p className="text-xs text-error/60 mt-1">
                  Check your browser console and ensure the backend server is running and API keys are correct.
                </p>
              </div>
            </div>
          )}

          {/* Empty State */}
          {!reportData && !loading && (
            <div className="text-center py-16">
              <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                <FileText className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold mb-2">No Report Data</h2>
              <p className="text-muted-foreground mb-6">
                Click "Load Data" to fetch the latest hospital system data
              </p>
            </div>
          )}

          {/* Report Data Display */}
          {reportData && (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {/* Patients Card */}
                <div className="stat-card hover:border-primary/50 transition-all">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-medium text-muted-foreground">
                      Patient Status
                    </h3>
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Users className="w-5 h-5 text-primary" />
                    </div>
                  </div>
                  <div className="mb-2">
                    <div className="text-3xl font-bold">
                      {reportData.patients.active}
                      <span className="text-sm text-muted-foreground ml-2">
                        / {reportData.patients.totalBeds}
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {reportData.patients.occupancyRate}% Occupancy
                    </div>
                  </div>
                  <div className={`text-sm font-medium flex items-center gap-1 ${reportData.patients.recentAdmissions > 0 ? 'text-success' : 'text-neutral'}`}>
                    <TrendingUp className="w-4 h-4" />
                    {reportData.patients.recentAdmissions} recent admissions
                  </div>
                </div>

                {/* Oxygen Card */}
                <div className="stat-card hover:border-primary/50 transition-all">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-medium text-muted-foreground">
                      Oxygen Status
                    </h3>
                    <div className="p-2 rounded-lg bg-success/10">
                      <Activity className="w-5 h-5 text-success" />
                    </div>
                  </div>
                  <div className="mb-2">
                    <div className="text-3xl font-bold">
                      {reportData.oxygen.percentageRemaining.toFixed(1)}%
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {reportData.oxygen.remaining.toLocaleString()} L remaining
                    </div>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full ${reportData.oxygen.percentageRemaining < 30
                        ? "bg-error"
                        : reportData.oxygen.percentageRemaining < 50
                          ? "bg-warning"
                          : "bg-success"
                        }`}
                      style={{
                        width: `${reportData.oxygen.percentageRemaining}%`,
                      }}
                    ></div>
                  </div>
                </div>

                {/* Jobs Card */}
                <div className="stat-card hover:border-primary/50 transition-all">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-medium text-muted-foreground">
                      Logistics Jobs
                    </h3>
                    <div className="p-2 rounded-lg bg-warning/10">
                      <Truck className="w-5 h-5 text-warning" />
                    </div>
                  </div>
                  <div className="mb-2">
                    <div className="text-3xl font-bold">
                      {reportData.jobs.total}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Total Jobs
                    </div>
                  </div>
                  <div className="text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Pending:</span>
                      <span className="font-medium">{reportData.jobs.pending}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Completed:</span>
                      <span className="font-medium text-success">
                        {reportData.jobs.completed}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Vehicles Card */}
                <div className="stat-card hover:border-primary/50 transition-all">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-medium text-muted-foreground">
                      Fleet Status
                    </h3>
                    <div className="p-2 rounded-lg bg-info/10">
                      <Truck className="w-5 h-5 text-info" />
                    </div>
                  </div>
                  <div className="mb-2">
                    <div className="text-3xl font-bold">
                      {reportData.vehicles.total}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Active Vehicles
                    </div>
                  </div>
                  <div className="text-sm font-medium text-success flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" />
                    Fleet operational
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-4 mb-8">
                <button
                  onClick={generateAISummary}
                  disabled={generatingSummary}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary to-secondary text-white font-semibold rounded-lg hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {generatingSummary ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Sparkles className="w-5 h-5" />
                  )}
                  {generatingSummary
                    ? "Generating AI Summary..."
                    : "Generate AI Summary"}
                </button>

                <button
                  onClick={handlePDFDownload}
                  disabled={downloadingPDF}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-success text-white font-semibold rounded-lg hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {downloadingPDF ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Download className="w-5 h-5" />
                  )}
                  {downloadingPDF ? "Generating PDF..." : "Download PDF Report"}
                </button>
              </div>

              {/* AI Summary Display */}
              {aiSummary && (
                <div className="rounded-xl border border-border p-6 bg-gradient-to-br from-primary/5 to-secondary/5 mb-8">
                  <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <Sparkles className="w-6 h-6 text-primary" />
                    AI-Generated Insights
                  </h2>
                  <div className="prose prose-sm max-w-none">
                    {/* Render the summary text, preserving whitespace/newlines */}
                    <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-foreground bg-transparent border-none p-0 m-0">
                      {aiSummary}
                    </pre>
                  </div>
                </div>
              )}

              {/* Detailed Statistics */}
              <div className="rounded-xl border border-border p-6 bg-card">
                <h2 className="text-xl font-bold mb-4">Detailed Statistics</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-semibold mb-3 text-primary">
                      Patient Metrics
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Total Patients:
                        </span>
                        <span className="font-medium">
                          {reportData.patients.total}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Active Patients:
                        </span>
                        <span className="font-medium">
                          {reportData.patients.active}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Available Beds:
                        </span>
                        <span className="font-medium">
                          {reportData.patients.totalBeds -
                            reportData.patients.active}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-3 text-primary">
                      Oxygen Metrics
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Total Capacity:
                        </span>
                        <span className="font-medium">
                          {reportData.oxygen.capacity.toLocaleString()} L
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Total Used:
                        </span>
                        <span className="font-medium">
                          {reportData.oxygen.totalUsed.toLocaleString()} L
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Remaining:</span>
                        <span className="font-medium">
                          {reportData.oxygen.remaining.toLocaleString()} L
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-border">
                  <p className="text-xs text-muted-foreground">
                    Report generated on:{" "}
                    {new Date(reportData.timestamp).toLocaleString()}
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}