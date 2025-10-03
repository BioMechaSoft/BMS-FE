import React from "react";
import { useNavigate } from "react-router-dom";
import "./Settings.css";

const MedicineSettings = () => {
  const navigate = useNavigate();

  return (
    <div className="settings-page">
      <button onClick={() => navigate(-1)} className="back-btn">
        ← Go Back
      </button>
      <h2>Medicine Settings</h2>
      <p>CRUD operations for medicines will be visualized here.</p>

      <div className="settings-grid">
        <div className="settings-card">
          <div className="settings-card-body">
            <h3>Add Medicine</h3>
            <p>Form to add a new medicine (dummy).</p>
          </div>
        </div>
        <div className="settings-card">
          <div className="settings-card-body">
            <h3>Edit Medicine</h3>
            <p>Select a medicine then edit fields (dummy).</p>
          </div>
        </div>
        <div className="settings-card">
          <div className="settings-card-body">
            <h3>Delete Medicine</h3>
            <p>Delete medicine records (dummy).</p>
          </div>
        </div>
        <div className="settings-card">
          <div className="settings-card-body">
            <h3>View Medicines</h3>
            <p>Table showing medicines (dummy).</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MedicineSettings;
