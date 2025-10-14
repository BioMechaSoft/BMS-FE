import React, { useContext, useState, useEffect } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { Context } from "../main";
import { dobToAge, ageToDob } from '../utils/ageUtils';
import { makeNIC } from '../utils/nicMaker';
import { useDispatch, useSelector } from 'react-redux';
import { createDoctorRequest, resetDoctorCreate } from '../store/doctorCreateSlice';

const AddNewDoctor = () => {
  const { isAuthenticated, setIsAuthenticated } = useContext(Context);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [nic, setNic] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState("");
  const [password, setPassword] = useState("");
  const [doctorDepartment, setDoctorDepartment] = useState("");
  const [docAvatar, setDocAvatar] = useState("");
  const [docAvatarPreview, setDocAvatarPreview] = useState("");
  const [age, setAge] = useState("");

  const navigateTo = useNavigate();
  const dispatch = useDispatch();
  const doctorCreate = useSelector(s => s.doctorCreate);

  const departmentsArray = [
    "Pediatrics",
    "Orthopedics",
    "Cardiology",
    "Neurology",
    "Oncology",
    "Radiology",
    "Physical Therapy",
    "Dermatology",
    "ENT",
  ];

  const handleAvatar = (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      setDocAvatarPreview(reader.result);
      setDocAvatar(file);
    };
  };

  const handleAddNewDoctor = async (e) => {
    e.preventDefault();
    // Always recalculate NIC from phone and age
    const calculatedNic = makeNIC(phone, age);
    setNic(calculatedNic);
    // Always recalculate DOB from age
    const calculatedDob = ageToDob(age);
    setDob(calculatedDob);
    const formData = new FormData();
    formData.append("firstName", firstName);
    formData.append("lastName", lastName);
    formData.append("email", email);
    formData.append("phone", phone);
    formData.append("password", password);
    formData.append("nic", calculatedNic);
    formData.append("dob", calculatedDob);
    formData.append("gender", gender);
    formData.append("doctorDepartment", doctorDepartment);
    formData.append("docAvatar", docAvatar);
    dispatch(createDoctorRequest(formData));
  };

  // Reset form and redirect on success
  useEffect(() => {
    if (doctorCreate.success) {
      setFirstName("");
      setLastName("");
      setEmail("");
      setPhone("");
      setNic("");
      setDob("");
      setAge("");
      setGender("");
      setPassword("");
      setDoctorDepartment("");
      setDocAvatar("");
      setDocAvatarPreview("");
      dispatch(resetDoctorCreate());
      setIsAuthenticated(true);
      navigateTo("/");
    }
  }, [doctorCreate.success]);

  if (!isAuthenticated) {
    return <Navigate to={"/login"} />;
  }
  return (
    <section className="page">
      <section className="container add-doctor-form">
        <img src="/logo.png" alt="logo" className="logo" style={{ width: "150px", borderRadius: "50%"}}/>
        <h1 className="form-title">REGISTER A NEW DOCTOR</h1>
        <form onSubmit={handleAddNewDoctor}>
          <div className="first-wrapper">
            <div>
              <img
                src={
                  docAvatarPreview ? `${docAvatarPreview}` : "/docHolder.jpg"
                }
                alt="Doctor Avatar"
              />
              <input type="file" onChange={handleAvatar} />
            </div>
            <div>
              <input
                type="text"
                placeholder="First Name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                disabled={doctorCreate.creating}
              />
              <input
                type="text"
                placeholder="Last Name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                disabled={doctorCreate.creating}
              />
              <input
                type="text"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={doctorCreate.creating}
              />

              {/* Age and DOB fields, sync both ways. NIC is always readonly and auto-populated. */}
              <input
                type="number"
                placeholder="Mobile Number"
                value={phone}
                onChange={e => {
                  setPhone(e.target.value);
                  if (e.target.value && age) setNic(makeNIC(e.target.value, age));
                }}
                disabled={doctorCreate.creating}
              />
              <input
                type="number"
                placeholder="Age (years)"
                value={age}
                min={0}
                max={120}
                onChange={e => {
                  const val = e.target.value;
                  setAge(val);
                  setDob(ageToDob(val));
                  if (phone && val) setNic(makeNIC(phone, val));
                }}
                disabled={doctorCreate.creating}
              />
              <input
                type="date"
                placeholder="Date of Birth"
                value={dob}
                onChange={e => {
                  setDob(e.target.value);
                  const newAge = dobToAge(e.target.value);
                  setAge(newAge);
                  if (phone && newAge) setNic(makeNIC(phone, newAge));
                }}
                readOnly
                style={{ background: '#f4f4f4', color: '#888' }}
                disabled={doctorCreate.creating}
              />
              <input
                type="text"
                placeholder="NIC (auto)"
                value={nic}
                readOnly
                style={{ background: '#f4f4f4', color: '#888' }}
                disabled={doctorCreate.creating}
              />
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                disabled={doctorCreate.creating}
              >
                <option value="">Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={doctorCreate.creating}
              />
              <select
                value={doctorDepartment}
                onChange={(e) => {
                  setDoctorDepartment(e.target.value);
                }}
                disabled={doctorCreate.creating}
              >
                <option value="">Select Department</option>
                {departmentsArray.map((depart, index) => {
                  return (
                    <option value={depart} key={index}>
                      {depart}
                    </option>
                  );
                })}
              </select>
              <button type="submit" disabled={doctorCreate.creating}>
                {doctorCreate.creating ? 'Registering...' : 'Register New Doctor'}
              </button>
              {doctorCreate.error && <div className="error-message" style={{ color: 'red', marginTop: 8 }}>{doctorCreate.error}</div>}
            </div>
          </div>
        </form>
      </section>
    </section>
  );
};

export default AddNewDoctor;
