import React from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from 'react-redux';
import { setTheme, setCustomTheme } from '../store/themeSlice';
import "./Settings.css";


const themes = [
  { key: "theme-light", name: "Light" },
  { key: "theme-dark", name: "Dark" },
  { key: "theme-cyberpunk", name: "Cyberpunk" },
  { key: "theme-blackpink", name: "Black Pink" },
  { key: "theme-retro", name: "Retro" },
  { key: "theme-darkgreen", name: "Dark Green" },
];

const ThemeSettings = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const selected = useSelector(state => state.theme.theme);
  const custom = useSelector(state => state.theme.custom);

  // Handlers for custom theme settings
  const handleCustom = (key, value) => {
    dispatch(setCustomTheme({ [key]: value }));
  };

  // Live preview for custom theme
  React.useEffect(() => {
    if (selected === 'theme-custom') {
      const root = document.documentElement;
      root.style.setProperty('--btn-radius', custom.btnRadius + 'px');
      root.style.setProperty('--btn-opacity', custom.btnOpacity);
      root.style.setProperty('--text-size', custom.textSize + 'px');
      root.style.setProperty('--bg-main', custom.bgMain);
      root.style.setProperty('--accent', custom.accent);
    } else {
      // Reset to default for non-custom themes
      const root = document.documentElement;
      root.style.removeProperty('--btn-radius');
      root.style.removeProperty('--btn-opacity');
      root.style.removeProperty('--text-size');
      root.style.removeProperty('--bg-main');
      root.style.removeProperty('--accent');
    }
  }, [selected, custom]);

  return (
    <section className="page">
      <div className="settings-page">
        <button onClick={() => navigate(-1)} className="back-btn add-btn">
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
              onClick={() => dispatch(setTheme(theme.key))}
            >
              {theme.name}
            </button>
          ))}
          <button
            key="theme-custom"
            style={{
              padding: "1rem 2rem",
              borderRadius: "10px",
              border: selected === 'theme-custom' ? "2px solid #0b74ff" : "1px solid #ccc",
              background: selected === 'theme-custom' ? "var(--btn-gradient)" : "var(--bg-card)",
              color: selected === 'theme-custom' ? "var(--text-accent)" : "var(--text-main)",
              fontWeight: "bold",
              cursor: "pointer",
              fontSize: "1.1rem"
            }}
            onClick={() => dispatch(setTheme('theme-custom'))}
          >
            Custom
          </button>
        </div>
        {selected === 'theme-custom' && (
          <div style={{ marginTop: '2.5rem', maxWidth: 500 }}>
            <h3>Customize Theme</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <label>
                Button Radius: <input type="range" min={0} max={32} value={custom.btnRadius} onChange={e => handleCustom('btnRadius', Number(e.target.value))} /> {custom.btnRadius}px
              </label>
              <label>
                Button Opacity: <input type="range" min={0.2} max={1} step={0.01} value={custom.btnOpacity} onChange={e => handleCustom('btnOpacity', Number(e.target.value))} /> {custom.btnOpacity}
              </label>
              <label>
                Text Size: <input type="range" min={12} max={32} value={custom.textSize} onChange={e => handleCustom('textSize', Number(e.target.value))} /> {custom.textSize}px
              </label>
              <label>
                Background Color: <input type="color" value={custom.bgMain} onChange={e => handleCustom('bgMain', e.target.value)} /> {custom.bgMain}
              </label>
              <label>
                Accent Color: <input type="color" value={custom.accent} onChange={e => handleCustom('accent', e.target.value)} /> {custom.accent}
              </label>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default ThemeSettings;
