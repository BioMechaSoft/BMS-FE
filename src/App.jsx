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
import api from "./utils/api";
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
import RequireAuth from "./components/RequireAuth";

const App = () => {
  const { isAuthenticated, setIsAuthenticated, admin, setAdmin } =
    useContext(Context);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await api.get(`/api/v1/user/dashboard/me`);
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
        <Route path="/doctor/addnew" element={
          <RequireAuth allowedRoles={["Admin"]}>
            <AddNewDoctor />
          </RequireAuth>
        } />
        <Route path="/admin/addnew" element={
          <RequireAuth allowedRoles={["Admin","Doctor"]}>
            <AddNewAdmin />
          </RequireAuth>
        } />
        <Route path="/messages" element={
          <RequireAuth allowedRoles={["Admin","Doctor","Compounder"]}>
            <Messages />
          </RequireAuth>
        } />
        <Route path="/prescription" element={
          <RequireAuth allowedRoles={["Admin","Doctor","Compounder"]}>
            <Prescription />
          </RequireAuth>
        } />
        <Route path="/doctors" element={
          <RequireAuth allowedRoles={["Admin","Doctor"]}>
            <Doctors />
          </RequireAuth>
        } />
        <Route path="/settings" element={
          <RequireAuth allowedRoles={["Admin","Doctor"]}>
            <Settings />
          </RequireAuth>
        } />
        <Route path="/settings/medicine" element={
          <RequireAuth allowedRoles={["Admin","Doctor"]}>
            <MedicineSettings />
          </RequireAuth>
        } />
        <Route path="/settings/roles" element={
          <RequireAuth allowedRoles={["Admin"]}>
            <RoleSettings />
          </RequireAuth>
        } />
        <Route path="/settings/theme" element={
          <RequireAuth allowedRoles={["Admin","Doctor"]}>
            <ThemeSettings />
          </RequireAuth>
        } />
        <Route path="/settings/advanced" element={
          <RequireAuth allowedRoles={["Admin"]}>
            <AdvancedSettings />
          </RequireAuth>
        } />
        <Route path="/preview/:patientId" element={<Preview />} />
      </Routes>
      <ToastContainer position="top-center" />
    </Router>
  );
};

export default App;
