import React from "react";
import { useNavigate } from "react-router-dom";
import "./Settings.css";

const settings = [
  {
    id: "medicine",
    name: "Medicine Settings",
    icon: "💊",
    description: "Manage medicines: add, edit or delete medicine records.",
    route: "/settings/medicine",
  },
  {
    id: "roles",
    name: "Role Management",
    icon: "🛡️",
    description: "Assign roles, permissions and manage users.",
    route: "/settings/roles",
  },
  {
    id: "theme",
    name: "Theme Settings",
    icon: "🎨",
    description: "Customize the dashboard appearance and theme.",
    route: "/settings/theme",
  },
  {
    id: "advanced",
    name: "Advanced Settings",
    icon: "⚙️",
    description: "Configure advanced options and system preferences.",
    route: "/settings/advanced",
  },
];

const Settings = () => {
  const navigate = useNavigate();

  return (
    <section className="page">
      <div className="settings-page">
        <div className="settings-header">
          <h2>Settings</h2>
          <p>Select a setting to configure</p>
        </div>

        <div className="settings-grid">
          {settings.map((s) => (
            <div
              key={s.id}
              className="settings-card"
              onClick={() => navigate(s.route)}
              role="button"
              tabIndex={0}
            >
              <div className="settings-card-icon">{s.icon}</div>
              <div className="settings-card-body">
                <h3>{s.name}</h3>
                <p>{s.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Settings;
