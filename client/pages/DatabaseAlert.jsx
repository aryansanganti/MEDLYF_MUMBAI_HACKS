import React, { useState, useEffect } from 'react';
import moment from 'moment';
import './DatabaseAlert.css';

const API_BASE_URL = 'http://localhost:5001/api';

function DatabaseAlert() {
  const [patients, setPatients] = useState([]);
  const [alertStatus, setAlertStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/patients`);
      const data = await response.json();

      setPatients(data.patients);
      setAlertStatus(data.alertStatus);
    } catch (err) {
      console.error(err);
      setError("Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
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
        ? "#dc3545"
        : color === "orange"
        ? "#ff9800"
        : "#28a745",
  });

  if (loading) return <div>Loading...</div>;
  if (error) return <div>❌ {error}</div>;

  return (
    <div className="database-alert-container">
      <h1>🚨 Patient Monitoring Dashboard</h1>

      {/* ===================== ALERT BOX ===================== */}
      <div
        className="status-box"
        style={{
          border: `3px solid ${alertStatus.statusColor}`,
          background: "#f8f9fa",
          padding: "20px",
          borderRadius: "12px",
          marginBottom: "25px"
        }}
      >
        <h2>Alert Status</h2>

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
            A WhatsApp alert has been sent to the admin.
          </p>
        )}
      </div>

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
