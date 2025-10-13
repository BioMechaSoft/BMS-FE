import React, { createContext, useState } from "react";
import ReactDOM from "react-dom/client";
import { Provider } from 'react-redux';
import App from "./App.jsx";
import store from './store';

// Apply saved theme on initial load
const savedTheme = localStorage.getItem("dashboard-theme");
if (savedTheme) {
  document.body.classList.add(savedTheme);
}

export const Context = createContext({ isAuthenticated: false });

const AppWrapper = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [admin, setAdmin] = useState({});

  return (
    <Provider store={store}>
      <Context.Provider
        value={{ isAuthenticated, setIsAuthenticated, admin, setAdmin }}
      >
        <App />
      </Context.Provider>
    </Provider>
  );
};

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AppWrapper />
  </React.StrictMode>
);
