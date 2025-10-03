import React from "react";
import { useNavigate } from "react-router-dom";
import "./Settings.css";


const themes = [
  { key: "theme-cyberpunk", name: "Cyberpunk" },
  { key: "theme-blackpink", name: "Black Pink" },
  { key: "theme-retro", name: "Retro" },
  { key: "theme-darkgreen", name: "Dark Green" },
];

const ThemeSettings = () => {
  const navigate = useNavigate();
  const [selected, setSelected] = React.useState(() => localStorage.getItem("dashboard-theme") || "");

  React.useEffect(() => {
    if (selected) {
      document.body.classList.remove(...themes.map(t => t.key));
      document.body.classList.add(selected);
      localStorage.setItem("dashboard-theme", selected);
    }
  }, [selected]);

  return (
    <div className="settings-page">
      <button onClick={() => navigate(-1)} className="back-btn">
        ← Go Back
      </button>
      <h2>Theme Settings</h2>
      <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap", marginTop: "2rem" }}>
        {themes.map(theme => (
          <button
            key={theme.key}
            style={{
              padding: "1rem 2rem",
              borderRadius: "10px",
              border: selected === theme.key ? "2px solid #0b74ff" : "1px solid #ccc",
              background: selected === theme.key ? "var(--btn-gradient)" : "var(--bg-card)",
              color: selected === theme.key ? "var(--text-accent)" : "var(--text-main)",
              fontWeight: "bold",
              cursor: "pointer",
              fontSize: "1.1rem"
            }}
            onClick={() => setSelected(theme.key)}
          >
            {theme.name}
          </button>
        ))}
      </div>
    </div>
  );
};

export default ThemeSettings;
