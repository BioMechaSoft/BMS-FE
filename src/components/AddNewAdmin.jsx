import React, { useContext, useEffect, useState } from "react";
import { Context } from "../main";
import { Navigate, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import api from "../utils/api";

const AddNewAdmin = () => {
  const { isAuthenticated, setIsAuthenticated, admin } = useContext(Context);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [nic, setNic] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState("");
  const [password, setPassword] = useState("");
  const [availableDoctors, setAvailableDoctors] = useState([]);
  const [assignedDoctors, setAssignedDoctors] = useState([]);
  const role = admin?.role || admin?.userRole || 'Admin';

  useEffect(() => {
    const fetchDoctors = async () => {
      if (role !== 'Admin') return;
      try {
  const { data } = await api.get('/api/v1/user/doctors');
        setAvailableDoctors(data.doctors || []);
      } catch (err) {
        console.error('Failed to fetch doctors for assignment', err);
      }
    };
    if (role === 'Doctor' && admin?._id) {
      setAssignedDoctors([admin._id]);
    }
    fetchDoctors();
  }, [role, admin]);

  const navigateTo = useNavigate();

  const handleAddNewAdmin = async (e) => {
    e.preventDefault();
    try {
  const payload = { firstName, lastName, email, phone, nic, dob, gender, password, assignedDoctors };
  await api.post('/api/v1/user/compounder/addnew', payload, { headers: { 'Content-Type': 'application/json' } })
        .then((res) => {
          toast.success(res.data.message);
          setIsAuthenticated(true);
          navigateTo('/');
          setFirstName('');
          setLastName('');
          setEmail('');
          setPhone('');
          setNic('');
          setDob('');
          setGender('');
          setPassword('');
          setAssignedDoctors([]);
        });
    } catch (error) {
      toast.error(error.response.data.message);
    }
  };

  if (!isAuthenticated) {
    return <Navigate to={"/login"} />;
  }

  return (
    <section className="page">
      <section className="container form-component add-admin-form">
      <img src="/logo.png" alt="logo" className="logo" style={{ width: "150px", borderRadius: "50%"}}/>
  <h1 className="form-title">CREATE COMPOUNDER</h1>
        <form onSubmit={handleAddNewAdmin}>
          <div>
            <input
              type="text"
              placeholder="First Name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
            <input
              type="text"
              placeholder="Last Name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
          </div>
          <div>
            <input
              type="text"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <input
              type="number"
              placeholder="Mobile Number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          <div>
            <input
              type="number"
              placeholder="NIC"
              value={nic}
              onChange={(e) => setNic(e.target.value)}
            />
            <input
              type={"date"}
              placeholder="Date of Birth"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
            />
          </div>
          <div>
            <select value={gender} onChange={(e) => setGender(e.target.value)}>
              <option value="">Select Gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {/* If Admin creating a compounder, allow assignment to multiple doctors. If doctor creating, assign to themselves */}
            {role === 'Admin' ? (
              <div style={{ marginTop: '0.75rem' }}>
                <label style={{ fontWeight: 700 }}>Assign to doctors (multiple):</label>
                <div style={{ maxHeight: '220px', overflowY: 'auto', marginTop: '0.5rem' }}>
                  {availableDoctors.map((d) => (
                    <label key={d._id} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', padding: '0.25rem 0' }}>
                      <input type="checkbox" checked={assignedDoctors.includes(d._id)} onChange={(e) => {
                        if (e.target.checked) setAssignedDoctors((s) => [...s, d._id]);
                        else setAssignedDoctors((s) => s.filter((id) => id !== d._id));
                      }} />
                      <span>{`${d.firstName || ''} ${d.lastName || ''} (${d.doctorDepartment || 'General'})`}</span>
                    </label>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ marginTop: '0.75rem' }}>
                <label style={{ fontWeight: 700 }}>Assigned Doctor:</label>
                <div>{admin?.firstName ? `${admin.firstName} ${admin.lastName}` : 'You'}</div>
              </div>
            )}
          </div>
          <div style={{ justifyContent: "center", alignItems: "center" }}>
            <button type="submit">CREATE COMPOUNDER</button>
          </div>
        </form>
      </section>
    </section>
  );
};

export default AddNewAdmin;
