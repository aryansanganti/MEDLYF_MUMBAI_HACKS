import React, { useState, useEffect } from 'react';
import moment from 'moment';
import './DatabaseAlert.css'; // Assuming existing CSS for basic styling

// Assuming your server is running on this port
const API_BASE_URL = 'http://localhost:5001/api';

function DatabaseAlert() {
  const [patients, setPatients] = useState([]);
  const [alertStatus, setAlertStatus] = useState(null);
  const [oxygenStatus, setOxygenStatus] = useState(null); // <--- NEW STATE
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      // The /api/patients route now returns alertStatus AND oxygenStatus
      const response = await fetch(`${API_BASE_URL}/patients`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();

      setPatients(data.patients);
      setAlertStatus(data.alertStatus);
      setOxygenStatus(data.oxygenStatus); // <--- SET NEW STATE
    } catch (err) {
      console.error(err);
      setError("Failed to fetch data from the unified server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Poll every 30 seconds to update the status and patients
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const getBadgeStyle = (color) => ({
    padding: "10px 18px",
    color: "#fff",
    fontWeight: "bold",
    borderRadius: "8px",
    backgroundColor:
      color === "red"
        ? "#dc3545" // Critical
        : color === "orange"
          ? "#ff9800" // Warning
          : "#28a745", // Normal
  });

  // Helper to format large numbers
  const formatLitres = (litres) => new Intl.NumberFormat().format(litres);

  if (loading) return <div className="loading-message">Loading...</div>;
  if (error) return <div className="error-message">❌ {error}</div>;

  return (
    <div className="database-alert-container">
      <h1>🚨 Patient & Logistics Monitoring Dashboard</h1>

      {/* ===================== OXYGEN ALERT BOX (NEW SECTION) ===================== */}
      {oxygenStatus && (
        <>
          <h2>🌬️ Oxygen Inventory Status</h2>
          <div
            className="status-box oxygen-status-box"
            style={{
              border: `3px solid ${oxygenStatus.statusColor}`,
              background: "#e3f2fd", // Light blue background for inventory
              padding: "20px",
              borderRadius: "12px",
              marginBottom: "25px"
            }}
          >
            <div style={getBadgeStyle(oxygenStatus.statusColor)}>
              {oxygenStatus.alertMessage || "Oxygen level is normal."}
            </div>

            <p style={{ marginTop: "15px", fontSize: "1.1rem" }}>
              <strong>Total Capacity:</strong> {formatLitres(oxygenStatus.totalCapacity)} L <br />
              <strong>Remaining Oxygen:</strong> {formatLitres(oxygenStatus.remainingOxygen)} L <br />
              <strong>Threshold for Alert:</strong> {formatLitres(oxygenStatus.thresholdLitres)} L (20%)
            </p>

            {oxygenStatus.statusColor === "red" && (
              <p style={{ color: "#dc3545", fontWeight: "bold" }}>
                A CRITICAL OXYGEN refill job has been created and alert sent.
              </p>
            )}
          </div>
        </>
      )}

      {/* --- Separator --- */}
      <hr style={{ marginBottom: "30px" }} />

      {/* ===================== BED/OUTBREAK ALERT BOX (EXISTING) ===================== */}
      <h2>🛏️ Hospital Capacity & Patient Alert Status</h2>
      <div
        className="status-box patient-status-box"
        style={{
          border: `3px solid ${alertStatus.statusColor}`,
          background: "#f8f9fa",
          padding: "20px",
          borderRadius: "12px",
          marginBottom: "25px"
        }}
      >
        <div style={getBadgeStyle(alertStatus.statusColor)}>
          {alertStatus.message || "System normal"}
        </div>

        <p style={{ marginTop: "15px", fontSize: "1.1rem" }}>
          <strong>Active Patients:</strong> {alertStatus.activePatients} <br />
          <strong>Beds Left:</strong> {alertStatus.bedsLeft} <br />
          <strong>Entries (Last Hour):</strong> {alertStatus.lastHourCount}
        </p>

        {alertStatus.statusColor === "red" && (
          <p style={{ color: "#dc3545", fontWeight: "bold" }}>
            A WhatsApp alert has been sent regarding patient intake/capacity.
          </p>
        )}
      </div>

      {/* --- Separator --- */}
      <hr style={{ marginBottom: "30px" }} />

      {/* ===================== PATIENT TABLE ===================== */}
      <h2>Recent Patient Entries ({patients.length})</h2>

      <table className="patient-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Reason</th>
            <th>Injury</th>
            <th>Condition</th>
            <th>In Hospital</th>
            <th>Admit Time</th>
          </tr>
        </thead>
        <tbody>
          {patients.map((p) => (
            <tr key={p._id}>
              <td>{p.name}</td>
              <td>{p.reason}</td>
              <td>{p.injury || "-"}</td>
              <td>{p.condition || "-"}</td>
              <td style={{ color: p.inHospital === "yes" ? "green" : "red" }}>
                {p.inHospital}
              </td>
              <td>{moment(p.timeOfAdmit).format("MMM D, YYYY HH:mm:ss")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default DatabaseAlert;