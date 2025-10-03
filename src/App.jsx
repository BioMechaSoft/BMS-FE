import React, { useContext, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import Dashboard from "./components/Dashboard";
import Login from "./components/Login";
import AddNewDoctor from "./components/AddNewDoctor";
import Messages from "./components/Messages";
import Doctors from "./components/Doctors";
import { Context } from "./main";
import axios from "axios";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Sidebar from "./components/Sidebar";
import AddNewAdmin from "./components/AddNewAdmin";
import "./App.css";
import Prescription from "./components/Prescription";
import Preview from "./components/Preview";
import Settings from "./components/Settings";
import MedicineSettings from "./components/MedicineSettings";
import RoleSettings from "./components/RoleSettings";
import ThemeSettings from "./components/ThemeSettings";
import AdvancedSettings from "./components/AdvancedSettings";

const App = () => {
  const { isAuthenticated, setIsAuthenticated, admin, setAdmin } =
    useContext(Context);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await axios.get(
          "http://localhost:5000/api/v1/user/admin/me",
          {
            withCredentials: true,
          }
        );
        setIsAuthenticated(true);
        setAdmin(response.data.user);
      } catch (error) {
        setIsAuthenticated(false);
        setAdmin({});
      }
    };
    fetchUser();
  }, [isAuthenticated]);

  return (
    <Router>
      <Sidebar />
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/login" element={<Login />} />
        <Route path="/doctor/addnew" element={<AddNewDoctor />} />
        <Route path="/admin/addnew" element={<AddNewAdmin />} />
        <Route path="/messages" element={<Messages />} />
        <Route path="/prescription" element={<Prescription />} />
        <Route path="/doctors" element={<Doctors />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/settings/medicine" element={<MedicineSettings />} />
        <Route path="/settings/roles" element={<RoleSettings />} />
        <Route path="/settings/theme" element={<ThemeSettings />} />
        <Route path="/settings/advanced" element={<AdvancedSettings />} />
        <Route path="/preview/:patientId" element={<Preview />} />
      </Routes>
      <ToastContainer position="top-center" />
    </Router>
  );
};

export default App;
