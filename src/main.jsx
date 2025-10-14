import React, { createContext, useState } from "react";
import ReactDOM from "react-dom/client";
import { Provider } from 'react-redux';
import App from "./App.jsx";
import store from './store';
import { useSelector, useDispatch } from 'react-redux';
import { hydrateTheme } from './store/themeSlice';

// Apply saved theme on initial load
const savedTheme = localStorage.getItem("dashboard-theme");
if (savedTheme) {
  document.body.classList.add(savedTheme);
}

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
    // Remove all theme classes, then add current
    document.body.classList.remove('light', 'dark', 'theme-cyberpunk', 'theme-blackpink', 'theme-retro', 'theme-darkgreen', 'theme-custom');
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
