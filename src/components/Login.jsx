import React, { useContext, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { Context } from "../main";
import axios from "axios";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState("Admin");

  const { isAuthenticated, setIsAuthenticated } = useContext(Context);

  const navigateTo = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const baseUrl = import.meta.env.VITE_BASE_URL || "http://localhost:5000";
      await axios.post(
        `${baseUrl}/api/v1/user/login`,
        { email, password, confirmPassword, role },
        { withCredentials: true, headers: { "Content-Type": "application/json" } }
      )
        .then((res) => {
          toast.success(res.data.message);
          setIsAuthenticated(true);
          navigateTo("/");
          setEmail("");
          setPassword("");
          setConfirmPassword("");
        });
    } catch (error) {
      toast.error(error.response.data.message);
    }
  };

  if (isAuthenticated) {
    return <Navigate to={"/"} />;
  }

  return (
    <>
      <section className="container form-component">
        <img src="/logo.png" alt="logo" className="logo" style={{ width: "150px", borderRadius: "50%"}} />
        <h1 className="form-title">WELCOME TO BIOMECASOFT</h1>
  <p>Dashboard access for Admins and Doctors. Choose role then login.</p>
        <form onSubmit={handleLogin}>
          <input
            type="text"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <input
            type="password"
            placeholder="Confirm Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
          <div style={{ margin: '0.5rem 0' }}>
            <label style={{ marginRight: '1rem' }}>
              <input type="radio" name="role" value="Admin" checked={role === 'Admin'} onChange={() => setRole('Admin')} /> Admin
            </label>
            <label>
              <input type="radio" name="role" value="Doctor" checked={role === 'Doctor'} onChange={() => setRole('Doctor')} /> Doctor
            </label>
            <label style={{ marginLeft: '1rem' }}>
              <input type="radio" name="role" value="Compounder" checked={role === 'Compounder'} onChange={() => setRole('Compounder')} /> Compounder
            </label>
          </div>
          <div style={{ justifyContent: "center", alignItems: "center" }}>
            <button type="submit">Login</button>
          </div>
        </form>
      </section>
    </>
  );
};

export default Login;
