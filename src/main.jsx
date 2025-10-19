import React, { createContext, useState } from "react";
import ReactDOM from "react-dom/client";
import { Provider } from 'react-redux';
import App from "./App.jsx";
import store from './store';
import { useSelector, useDispatch } from 'react-redux';
import { hydrateTheme } from './store/themeSlice';

// Apply saved theme on initial load (normalize legacy keys)
const _raw = localStorage.getItem("dashboard-theme");
const _normalize = (t) => {
  if (!t) return 'theme-light';
  if (t === 'light') return 'theme-light';
  if (t === 'dark') return 'theme-dark';
  return t;
};
const savedTheme = _normalize(_raw);
if (savedTheme) document.body.classList.add(savedTheme);

export const Context = createContext({ isAuthenticated: false });


const AppWrapper = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [admin, setAdmin] = useState({});
  const theme = useSelector(state => state.theme.theme);
  const dispatch = useDispatch();

  React.useEffect(() => {
    dispatch(hydrateTheme());
  }, []);

  React.useEffect(() => {
  // Remove known theme classes, then add current normalized theme
  document.body.classList.remove('theme-light', 'theme-dark', 'theme-cyberpunk', 'theme-blackpink', 'theme-retro', 'theme-darkgreen', 'theme-custom');
  document.body.classList.add(theme);
    document.body.style.transition = 'background 0.3s, color 0.3s';

    // If custom theme, apply variables globally
    if (theme === 'theme-custom') {
      const custom = store.getState().theme.custom;
      const root = document.documentElement;
      root.style.setProperty('--btn-radius', custom.btnRadius + 'px');
      root.style.setProperty('--btn-opacity', custom.btnOpacity);
      root.style.setProperty('--text-size', custom.textSize + 'px');
      root.style.setProperty('--bg-main', custom.bgMain);
      root.style.setProperty('--accent', custom.accent);
    } else {
      // Remove custom overrides
      const root = document.documentElement;
      root.style.removeProperty('--btn-radius');
      root.style.removeProperty('--btn-opacity');
      root.style.removeProperty('--text-size');
      root.style.removeProperty('--bg-main');
      root.style.removeProperty('--accent');
    }
    // Apply theme-specific font families for visibility
    const root = document.documentElement;
    if (theme === 'theme-dark') {
      root.style.setProperty('--app-font', 'Inter, system-ui, -apple-system, sans-serif');
      root.style.setProperty('--sidebar-bg', 'var(--bg-card)');
    } else if (theme === 'theme-light') {
      root.style.setProperty('--app-font', 'Montserrat, system-ui, -apple-system, sans-serif');
      root.style.setProperty('--sidebar-bg', 'transparent');
    } else if (theme === 'theme-cyberpunk') {
      root.style.setProperty('--app-font', 'Orbitron, sans-serif');
      root.style.setProperty('--sidebar-bg', 'rgba(20,15,40,0.6)');
    } else if (theme === 'theme-blackpink') {
      root.style.setProperty('--app-font', 'Poppins, sans-serif');
      root.style.setProperty('--sidebar-bg', 'rgba(20,0,20,0.6)');
    } else {
      root.style.setProperty('--app-font', 'Montserrat, system-ui, -apple-system, sans-serif');
      root.style.setProperty('--sidebar-bg', 'transparent');
    }
  }, [theme]);

  return (
    <Context.Provider
      value={{ isAuthenticated, setIsAuthenticated, admin, setAdmin }}
    >
      <App />
    </Context.Provider>
  );
};

ReactDOM.createRoot(document.getElementById("root")).render(
  <Provider store={store}>
    <React.StrictMode>
      <AppWrapper />
    </React.StrictMode>
  </Provider>
);
