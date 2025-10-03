import React from "react";
import { useNavigate } from "react-router-dom";
import "./Settings.css";

const RoleSettings = () => {
  const navigate = useNavigate();

  return (
    <div className="settings-page">
      <button onClick={() => navigate(-1)} className="back-btn">
        ← Go Back
      </button>
      <h2>Role Management</h2>
      <p>CRUD operations for roles will be visualized here.</p>

      <div className="settings-grid">
        <div className="settings-card">
          <div className="settings-card-body">
            <h3>Add Role</h3>
            <p>Create new roles and assign permissions (dummy).</p>
          </div>
        </div>
        <div className="settings-card">
          <div className="settings-card-body">
            <h3>Edit Role</h3>
            <p>Edit existing role permissions (dummy).</p>
          </div>
        </div>
        <div className="settings-card">
          <div className="settings-card-body">
            <h3>Delete Role</h3>
            <p>Remove unused roles (dummy).</p>
          </div>
        </div>
        <div className="settings-card">
          <div className="settings-card-body">
            <h3>View Roles</h3>
            <p>List of roles and assigned users (dummy).</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoleSettings;
