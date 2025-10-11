import axios from "axios";
import React, { useEffect, useState, useRef } from "react";
import { toast } from "react-toastify";
import "./Appointment.css";

const Appointment = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [nic, setNic] = useState("");
  const [dob, setDob] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [appointmentDate, setAppointmentDate] = useState("");
  const [department, setDepartment] = useState("Pediatrics");
  const [doctorFirstName, setDoctorFirstName] = useState("");
  const [doctorLastName, setDoctorLastName] = useState("");
  const [address, setAddress] = useState("");
  const [_id, set_id] = useState("");
  const [hasVisited, setHasVisited] = useState(false);
  const [price, setPrice] = useState(0);
  // const [diagnosys, setDiagnosys] = useState("N/A");
  const [BP, setBP] = useState("");
  const [SPO2, setSPO2] = useState("");
  const [diabetes, setDiabetes] = useState("");
  const [height, setHeight] = useState("");
  const [width, setWidth] = useState("");
  const [others, setOthers] = useState("");
  const [downloadInvoice, setDownloadInvoice] = useState(false);
  const [step, setStep] = useState(1);
  const [doctorSearch, setDoctorSearch] = useState("");
  const [departmentSearch, setDepartmentSearch] = useState("");
  const [searchNameOrPhone, setSearchNameOrPhone] = useState("");
  const formRef = useRef(null);

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

  const [doctors, setDoctors] = useState([]);
  const [dashboardUser, setDashboardUser] = useState(null);
  const [canBook, setCanBook] = useState(false);
  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        const { data } = await axios.get(
          "https://pathologylab-backend-new-project.onrender.com/api/v1/user/doctors",
          { withCredentials: true }
        );
        setDoctors(data.doctors || []);
      } catch (err) {
        console.error("Failed to fetch doctors", err);
      }
    };
    fetchDoctors();
    // check dashboard session
    const checkDashboard = async () => {
      try {
        const res = await axios.get(
          "https://pathologylab-backend-new-project.onrender.com/api/v1/user/dashboard/me",
          { withCredentials: true }
        );
        setDashboardUser(res.data.user);
        setCanBook(
          ["Admin", "Doctor", "Compounder"].includes(res.data.user.role)
        );
      } catch (e) {
        setDashboardUser(null);
        setCanBook(false);
      }
    };
    checkDashboard();
  }, []);

  // keyboard: Ctrl/Cmd+P => submit & download, global for this form
  useEffect(() => {
    const handler = async (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "p") {
        e.preventDefault();
        setDownloadInvoice(true);
        // submit after setting state (give React a tick)
        setTimeout(() => {
          handleAppointment();
        }, 50);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  // set default appointment date to today (yyyy-mm-dd)
  useEffect(() => {
    if (!appointmentDate) {
      const d = new Date();
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      setAppointmentDate(`${yyyy}-${mm}-${dd}`);
    }
  }, []);

  // auto-generate NIC if missing when phone changes
  useEffect(() => {
    if (!nic && phone) {
      const base = (phone + Date.now().toString()).replace(/\D/g, "");
      setNic(base.slice(0, 13).padEnd(13, "0"));
    }
  }, [phone]);

  // when department or doctorSearch changes, auto-select first doctor
  useEffect(() => {
    const list = doctors.filter(
      (d) =>
        d.doctorDepartment === department &&
        (!doctorSearch ||
          `${d.firstName} ${d.lastName}`
            .toLowerCase()
            .includes(doctorSearch.toLowerCase()))
    );
    if (list.length > 0) {
      const first = list[0];
      set_id(first._id);
      setDoctorFirstName(first.firstName);
      setDoctorLastName(first.lastName);
      setPrice(Math.round((first.consultationFee || 100) * 0.2));
    } else {
      set_id("");
      setDoctorFirstName("");
      setDoctorLastName("");
      setPrice(0);
    }
  }, [department, doctors, doctorSearch]);

  useEffect(() => {
    if (_id) {
      const d = doctors.find((doc) => doc._id === _id);
      if (d) {
        setDoctorFirstName(d.firstName);
        setDoctorLastName(d.lastName);
        setPrice(Math.round((d.consultationFee || 100) * 0.2));
      }
    }
  }, [_id, doctors]);

  const handleAppointment = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    try {
      const hasVisitedBool = Boolean(hasVisited);
      const payload = {
        name,
        email: email || undefined,
        phone,
        nic: nic || undefined,
        dob: dob || undefined,
        age: age || undefined,
        gender,
        appointment_date: appointmentDate
          ? new Date(appointmentDate).toISOString()
          : undefined,
        department,
        doctorId: _id || undefined,
        hasVisited: hasVisitedBool,
        address,
        price,
        paymentStatus: "Pending",
        // diagnosys,
        BP: BP || undefined,
        SPO2: SPO2 || undefined,
        diabetes: diabetes || undefined,
        height: height || undefined,
        weight: width || undefined,
        others: others || undefined,
      };
      console.log("Appointment JSON payload:", payload);
      if (!canBook)
        return toast.error(
          "Only Admin/Doctor/Compounder may create appointments. Please login to dashboard."
        );
      const url = `https://pathologylab-backend-new-project.onrender.com/api/v1/appointment/post${
        downloadInvoice ? "?download=true" : ""
      }`;
      const axiosConfig = {
        withCredentials: true,
        headers: { "Content-Type": "application/json" },
      };
      if (downloadInvoice) axiosConfig.responseType = "blob";
      const response = await axios.post(url, payload, axiosConfig);
      let data = response.data;
      if (downloadInvoice && response.data) {
        const blob = new Blob([response.data], {
          type: response.headers["content-type"] || "text/html",
        });
        const link = document.createElement("a");
        const filename = response.headers["content-disposition"]
          ? response.headers["content-disposition"].split("filename=")[1]
          : `appointment-invoice.html`;
        link.href = window.URL.createObjectURL(blob);
        link.download = filename.replace(/\"/g, "");
        document.body.appendChild(link);
        link.click();
        link.remove();
        toast.success("Appointment created and invoice downloaded");
      } else {
        data = response.data;
        toast.success(data.message);
      }

      // Reset form fields after successful submission
      setName("");
      setEmail("");
      setPhone("");
      setNic("");
      setDob("");
      setAge("");
      setGender("");
      setAppointmentDate("");
      setDepartment("Pediatrics");
      setDoctorFirstName("");
      setDoctorLastName("");
      setHasVisited(false);
      setAddress("");
      set_id("");
      setPrice(0);
      // setDiagnosys("N/A");
      setBP("");
      setSPO2("");
      setDiabetes("");
      setHeight("");
      setWidth("");
      setOthers("");
      setDownloadInvoice(false);
      setStep(1);
    } catch (error) {
      console.error(error);
      toast.error(
        error.response && error.response.data.message
          ? error.response.data.message
          : "An error occurred. Please try again."
      );
    }
  };

  const handlePrefillFromVisited = async () => {
    if (!searchNameOrPhone) return toast.error("Enter name or phone to search");
    try {
      const q = encodeURIComponent(searchNameOrPhone);
      const url = `https://pathologylab-backend-new-project.onrender.com/api/v1/appointment/search?q=${q}`;
      const { data } = await axios.get(url);
      const appt = data.appointments[0];
      if (appt) {
        setName(
          appt.name || `${appt.firstName || ""} ${appt.lastName || ""}`.trim()
        );
        setEmail(appt.email || "");
        setPhone(appt.phone || "");
        setNic(appt.nic || "");
        if (appt.dob) setDob(new Date(appt.dob).toISOString().slice(0, 10));
        if (appt.age) setAge(appt.age);
        setAddress(appt.address || "");
        setDepartment(appt.department || department);
        if (appt.doctorId) set_id(appt.doctorId);
        toast.success("Prefilled from previous appointment");
      }
    } catch (err) {
      toast.error(
        err?.response?.data?.message || "No previous appointment found"
      );
    }
  };

  // simple focus navigation: Enter -> next focusable, Shift+Enter -> previous
  const handleKeyNavigation = (e) => {
    if (e.key === "Enter" && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      const form = formRef.current;
      if (!form) return;
      const focusable = Array.from(
        form.querySelectorAll("input,select,textarea,button")
      ).filter((el) => !el.disabled && el.type !== "hidden");
      const idx = focusable.indexOf(document.activeElement);
      if (e.shiftKey) {
        const prev = focusable[Math.max(0, idx - 1)];
        if (prev) prev.focus();
      } else {
        const next = focusable[Math.min(focusable.length - 1, idx + 1)];
        if (next) {
          // if next is a button to change step, trigger step change
          if (next.dataset && next.dataset.step) {
            setStep(Number(next.dataset.step));
            next.focus();
          } else {
            next.focus();
          }
        }
      }
    }
  };

  return (
    <>
      <section className="page">
        <div className="  appointment-form">
          <h2>Appointment</h2>
          <div style={{ marginBottom: "0.5rem" }}>
            <small>Step {step} of 3</small>
            <div style={{ float: "right" }}>
              <small>Shortcut: Ctrl/Cmd+P to submit & download</small>
            </div>
          </div>
          <form
            ref={formRef}
            onKeyDown={handleKeyNavigation}
            onSubmit={handleAppointment}
          >
            <div className="has-visited-box ">
              <div className="checkbox-container">
                <p style={{ marginBottom: 0, fontSize: "1rem" }}>
                  Have you visited before?
                </p>
                <input
                  type="checkbox"
                  checked={hasVisited}
                  onChange={(e) => setHasVisited(e.target.checked)}
                />
              </div>
              {hasVisited && (
                <div className="search-container">
                  <input
                    type="search"
                    placeholder="Search by name or phone"
                    value={searchNameOrPhone}
                    onChange={(e) => setSearchNameOrPhone(e.target.value)}
                  />
                  <button type="button" onClick={handlePrefillFromVisited}>
                    Search
                  </button>
                </div>
              )}
            </div>
            {step === 1 && (
              <div>
                <div className="lnr-input-box">
                  <input
                    type="text"
                    placeholder="Full Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                  <input
                    type="number"
                    placeholder="Age"
                    value={age}
                    onChange={(e) => {
                      setAge(e.target.value);
                      if (e.target.value) {
                        const now = new Date();
                        const y = now.getFullYear() - Number(e.target.value);
                        const mm = String(now.getMonth() + 1).padStart(2, "0");
                        const dd = String(now.getDate()).padStart(2, "0");
                        setDob(`${y}-${mm}-${dd}`);
                      }
                    }}
                  />
                </div>
                <div className="lnr-input-box">
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
                <div className="btn-container">
                  <button
                    type="button"
                    data-step="2"
                    onClick={() => setStep(2)}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div>
                <div className="lnr-input-box">
                  <input
                    type="number"
                    placeholder="NIC"
                    value={nic}
                    onChange={(e) => setNic(e.target.value)}
                  />
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                  >
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
                <div className="lnr-input-box">
                  <input
                    type="date"
                    placeholder="Date of Birth"
                    value={dob}
                    onChange={(e) => {
                      setDob(e.target.value);
                      if (e.target.value) {
                        const diff =
                          Date.now() - new Date(e.target.value).getTime();
                        const computed = Math.floor(
                          diff / (1000 * 60 * 60 * 24 * 365.25)
                        );
                        setAge(computed);
                      }
                    }}
                  />
                  <input
                    type="date"
                    placeholder="Appointment Date"
                    value={appointmentDate}
                    onChange={(e) => setAppointmentDate(e.target.value)}
                  />
                </div>
                <div className="btn-container">
                  <button type="button" onClick={() => setStep(1)}>
                    Back
                  </button>
                  <button
                    type="button"
                    data-step="3"
                    onClick={() => setStep(3)}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div>
                <div className="dep-doc-tarea-container">
                  <div className="dep-and-doc-container">
                    <div className="dep-doc-container">
                      <input
                        placeholder="Search Departments"
                        value={departmentSearch}
                        onChange={(e) => setDepartmentSearch(e.target.value)}
                      />
                      <select
                        value={department}
                        onChange={(e) => setDepartment(e.target.value)}
                      >
                        {departmentsArray
                          .filter(
                            (d) =>
                              !departmentSearch ||
                              d
                                .toLowerCase()
                                .includes(departmentSearch.toLowerCase())
                          )
                          .map((depart, index) => (
                            <option value={depart} key={index}>
                              {depart}
                            </option>
                          ))}
                      </select>
                    </div>

                    <div className="dep-doc-container">
                      <input
                        placeholder="Search Doctor"
                        value={doctorSearch}
                        onChange={(e) => setDoctorSearch(e.target.value)}
                      />
                      <select
                        value={_id}
                        onChange={(e) => {
                          const selectedDoctor = doctors.find(
                            (doctor) => doctor._id === e.target.value
                          );
                          if (selectedDoctor) {
                            set_id(selectedDoctor._id);
                            setDoctorFirstName(selectedDoctor.firstName);
                            setDoctorLastName(selectedDoctor.lastName);
                            setPrice(
                              Math.round(
                                (selectedDoctor.consultationFee || 100) * 0.2
                              )
                            );
                          } else {
                            set_id("");
                            setDoctorFirstName("");
                            setDoctorLastName("");
                            setPrice(0);
                          }
                        }}
                        disabled={!department}
                      >
                        <option value="">Select Doctor</option>
                        {doctors
                          .filter(
                            (doctor) => doctor.doctorDepartment === department
                          )
                          .filter(
                            (d) =>
                              !doctorSearch ||
                              `${d.firstName} ${d.lastName}`
                                .toLowerCase()
                                .includes(doctorSearch.toLowerCase())
                          )
                          .map((doctor) => (
                            <option key={doctor._id} value={doctor._id}>
                              {doctor.firstName} {doctor.lastName}
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>
                  <textarea
                    rows="4"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Address"
                  />
                </div>
                <div
                  style={{
                    padding: "10px",
                    color: "#271776ca",
                    fontWeight: "500",
                    textDecoration: "underline",
                  }}
                >
                  Price: {price} Rs
                </div>
                <div className="diagnosis-grid">
                  <div className="diagnosis-grid-col">
                    <div>
                      {/* <label htmlFor="">BP: </label> */}
                      <input
                        type="text"
                        placeholder="BP"
                        value={BP}
                        onChange={(e) => setBP(e.target.value)}
                      />
                    </div>
                    <div>
                      {/* <label htmlFor="">Diabetes: </label> */}
                      <input
                        type="text"
                        placeholder="Diabetes"
                        value={diabetes}
                        onChange={(e) => setDiabetes(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="diagnosis-grid-col">
                    <div>
                      {/* <label htmlFor="">SPO2: </label> */}
                      <input
                        type="text"
                        placeholder="SPO2"
                        value={SPO2}
                        onChange={(e) => setSPO2(e.target.value)}
                      />
                    </div>
                    <div>
                      {/* <label htmlFor="">Height: </label> */}
                      <input
                        type="text"
                        placeholder="Height"
                        value={height}
                        onChange={(e) => setHeight(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="diagnosis-grid-col">
                    <div>
                      {/* <label htmlFor="">Width: </label> */}
                      <input
                        type="text"
                        placeholder="Weight"
                        value={width}
                        onChange={(e) => setWidth(e.target.value)}
                      />
                    </div>
                    <div>
                      {/* <label htmlFor="">Others: </label> */}
                      <textarea
                        rows="1"
                        value={others}
                        onChange={(e) => setOthers(e.target.value)}
                        placeholder="Others"
                      />
                    </div>
                  </div>
                </div>
                <div
                  className="checkbox-container"
                  style={{ marginTop: "2rem" }}
                >
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      paddingRight: "1rem",
                    }}
                  >
                    Download invoice after booking
                    <input
                      type="checkbox"
                      checked={downloadInvoice}
                      onChange={(e) => setDownloadInvoice(e.target.checked)}
                    />
                  </label>
                </div>

                <div className="btn-container">
                  <button type="button" onClick={() => setStep(2)}>
                    Back
                  </button>
                  <button type="submit">GET APPOINTMENT</button>
                </div>
              </div>
            )}
          </form>
        </div>
      </section>
    </>
  );
};

export default Appointment;
