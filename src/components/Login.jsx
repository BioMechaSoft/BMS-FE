import React, { useContext, useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from 'react-redux';
import { toast } from "react-toastify";
import { Context } from "../main";
import { loginRequest } from "../store/authSlice";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState("Admin");

  const { isAuthenticated, setIsAuthenticated } = useContext(Context);
  const dispatch = useDispatch();
  const auth = useSelector(state => state.auth);

  const navigateTo = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    // dispatch redux login
    dispatch(loginRequest({ email, password, role }));
  };

  useEffect(() => {
    if (auth.isAuthenticated) {
      setIsAuthenticated(true);
      navigateTo('/');
    }
    if (auth.error) {
      toast.error(auth.error);
    }
  }, [auth.isAuthenticated, auth.error]);

  if (isAuthenticated || auth.isAuthenticated) {
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
          {/* <input
            type="password"
            placeholder="Confirm Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          /> */}
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
