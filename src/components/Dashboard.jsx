import React, { useContext, useEffect, useState, useMemo } from "react";
import { Context } from "../main";
import { Navigate, useNavigate } from "react-router-dom";
import api from "../utils/api";
import { toast } from "react-toastify";
import { GoCheckCircleFill } from "react-icons/go";
import { AiFillCloseCircle } from "react-icons/ai";
import Prescription from "./Prescription";
import Modal from "react-modal";
import { FaTrash } from "react-icons/fa";
import RequirePermission from "./RequirePermission";

const Dashboard = () => {
  const [appointments, setAppointments] = useState([]);
  const [selectedAppointments, setSelectedAppointments] = useState([]);
  const [filterOption, setFilterOption] = useState("All");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();
  // Modal and prescription state
  const [prescriptionModalOpen, setPrescriptionModalOpen] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState(null);
  const [selectedPatientData, setSelectedPatientData] = useState(null);

  useEffect(() => {
    const fetchAppointments = async () => {
      try {
        const { data } = await api.get(`/api/v1/appointment/getall`);
        setAppointments(data.appointments);
      } catch (error) {
        setAppointments([]);
      }
    };
    fetchAppointments();
  }, []);

  // Delete single appointment by ID
  const handleDeleteAppointment = async (id) => {
    if (!window.confirm("Delete this appointment?")) return;
    try {
      await api.delete(`/api/v1/appointment/delete/${id}`);
      setAppointments(prev => prev.filter(a => a._id !== id));
      setSelectedAppointments(prev => prev.filter(x => x !== id));
      toast.success("Appointment deleted");
    } catch (err) {
      toast.error("Delete failed");
    }
  };

  // Bulk delete selected appointments
  const handleBulkDelete = async () => {
    if (selectedAppointments.length === 0) return toast.info("No appointments selected");
    if (!window.confirm(`Delete ${selectedAppointments.length} appointments?`)) return;
    try {
      await api.post(`/api/v1/appointment/bulk-delete`, { ids: selectedAppointments });
      setAppointments(prev => prev.filter(a => !selectedAppointments.includes(a._id)));
      setSelectedAppointments([]);
      toast.success("Bulk delete complete");
    } catch (err) {
      toast.error("Bulk delete failed");
    }
  };

  // Toggle select for bulk delete
  const toggleSelectAppointment = (id) => {
    setSelectedAppointments(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleUpdateStatus = async (appointmentId, status) => {
    try {
      const { data } = await api.put(
        `/api/v1/appointment/status/${appointmentId}`,
        { status }
      );
      setAppointments((prevAppointments) =>
        prevAppointments.map((appointment) =>
          appointment._id === appointmentId
            ? { ...appointment, status }
            : appointment
        )
      );
      toast.success(data.message);
    } catch (error) {
      toast.error(error.response.data.message);
    }
  };

  const handlePrescriptionClick = async (patientId) => {
    setSelectedPatientId(patientId);
    // Fetch patient data
    try {
      const { data } = await api.get(`/api/v1/user/patient/${patientId}`);
      setSelectedPatientData(data.patient);
      setPrescriptionModalOpen(true);
    } catch (error) {
      setSelectedPatientData(null);
      toast.error("Failed to fetch patient data");
    }
  };

  const closePrescriptionModal = () => {
    setPrescriptionModalOpen(false);
    setSelectedPatientId(null);
    setSelectedPatientData(null);
  };

  const { isAuthenticated, admin } = useContext(Context);
  if (!isAuthenticated) {
    return <Navigate to={"/login"} />;
  }

  return (
    <>
      <section className="dashboard page">
        <div className="banner">
          <div className="firstBox">
            <img src="/doc.png" alt="docImg" />
            <div className="content">
              <div>
                <p>Hello ,</p>
                <h5>{admin && `${admin.firstName} ${admin.lastName}`} </h5>
              </div>
              <p>
                Lorem ipsum dolor sit, amet consectetur adipisicing elit.
                Facilis, nam molestias. Eaque molestiae ipsam commodi neque.
                Assumenda repellendus necessitatibus itaque.
              </p>
            </div>
          </div>
          <div className="secondBox">
            <p>Total Appointments</p>
            <h3>{appointments?.length}</h3>
          </div>
          <div className="thirdBox">
            <p>Registered Doctors</p>
            <h3>{10}</h3>
          </div>
        </div>

        {/* Middle banner / navbar-like filter area */}
        <div className="banner middle-banner">
          <div className="filter-box">
            <select
              value={filterOption}
              onChange={(e) => setFilterOption(e.target.value)}
            >
              <option value="All">All</option>
              <option value="Today">Today's</option>
              <option value="Old">Old</option>
              <option value="Upcoming">Upcoming</option>
              <option value="Custom">Custom</option>
            </select>

            {filterOption === "Custom" && (
              <div className="custom-dates">
                <input
                  type="date"
                  placeholder="Start date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                />
                <input
                  type="date"
                  placeholder="End date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                />
              </div>
            )}
          </div>

          <div className="search-box">
            <label>Search</label>
            <input
              type="text"
              placeholder="Search by name/phone/date"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="banner table-banner">
          <div className="heading-box">
            <h5>Appointments</h5>
            <button
              className="btn add-btn"
              onClick={() => navigate("/add-appointment")}
            >
              Add new
            </button>
            <RequirePermission allowedRoles={["Admin"]}>
              <button
                className="btn remove-btn"
                onClick={handleBulkDelete}
                disabled={selectedAppointments.length === 0}
                style={{marginLeft:'1rem'}}
              >
                Delete Selected ({selectedAppointments.length})
              </button>
            </RequirePermission>
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                    <th>
                      <input
                        type="checkbox"
                        checked={(() => {
                          const filteredAppointments = (appointments || []).filter(
                            (appointment) => {
                              try {
                                const apptDate = new Date(appointment.appointment_date);
                                const today = new Date();
                                const startOfToday = new Date(
                                  today.getFullYear(),
                                  today.getMonth(),
                                  today.getDate()
                                );
                                if (filterOption === "Today") {
                                  const apptYmd = apptDate.toISOString().slice(0, 10);
                                  const todayYmd = startOfToday.toISOString().slice(0, 10);
                                  if (apptYmd !== todayYmd) return false;
                                } else if (filterOption === "Old") {
                                  if (apptDate >= startOfToday) return false;
                                } else if (filterOption === "Upcoming") {
                                  if (apptDate <= startOfToday) return false;
                                } else if (filterOption === "Custom") {
                                  if (customStart && customEnd) {
                                    const start = new Date(customStart + "T00:00:00");
                                    const end = new Date(customEnd + "T23:59:59");
                                    if (apptDate < start || apptDate > end) return false;
                                  }
                                }
                                if (searchTerm && searchTerm.trim() !== "") {
                                  const q = searchTerm.toLowerCase();
                                  const name = `${appointment.firstName || ""} ${appointment.lastName || ""}`.toLowerCase();
                                  const phone = (appointment.phone || appointment.mobile || appointment.patientPhone || "").toString().toLowerCase();
                                  const dateStr = (appointment.appointment_date || "").toString().toLowerCase();
                                  if (!name.includes(q) && !phone.includes(q) && !dateStr.includes(q)) {
                                    return false;
                                  }
                                }
                                return true;
                              } catch (err) {
                                return true;
                              }
                            }
                          );
                          return filteredAppointments.length > 0 && selectedAppointments.length === filteredAppointments.length;
                        })()}
                        onChange={e => {
                          const filteredAppointments = (appointments || []).filter(
                            (appointment) => {
                              try {
                                const apptDate = new Date(appointment.appointment_date);
                                const today = new Date();
                                const startOfToday = new Date(
                                  today.getFullYear(),
                                  today.getMonth(),
                                  today.getDate()
                                );
                                if (filterOption === "Today") {
                                  const apptYmd = apptDate.toISOString().slice(0, 10);
                                  const todayYmd = startOfToday.toISOString().slice(0, 10);
                                  if (apptYmd !== todayYmd) return false;
                                } else if (filterOption === "Old") {
                                  if (apptDate >= startOfToday) return false;
                                } else if (filterOption === "Upcoming") {
                                  if (apptDate <= startOfToday) return false;
                                } else if (filterOption === "Custom") {
                                  if (customStart && customEnd) {
                                    const start = new Date(customStart + "T00:00:00");
                                    const end = new Date(customEnd + "T23:59:59");
                                    if (apptDate < start || apptDate > end) return false;
                                  }
                                }
                                if (searchTerm && searchTerm.trim() !== "") {
                                  const q = searchTerm.toLowerCase();
                                  const name = `${appointment.firstName || ""} ${appointment.lastName || ""}`.toLowerCase();
                                  const phone = (appointment.phone || appointment.mobile || appointment.patientPhone || "").toString().toLowerCase();
                                  const dateStr = (appointment.appointment_date || "").toString().toLowerCase();
                                  if (!name.includes(q) && !phone.includes(q) && !dateStr.includes(q)) {
                                    return false;
                                  }
                                }
                                return true;
                              } catch (err) {
                                return true;
                              }
                            }
                          );
                          setSelectedAppointments(e.target.checked ? filteredAppointments.map(a => a._id) : []);
                        }}
                      />
                    </th>
                  <th>Sr. No.</th>
                  <th>Patient Name</th>
                  <th>Appointment Date</th>
                  <th>Created By</th>
                  <th>Phone</th>
                  <th>Gender</th>
                  <th>Payment Mode</th>
                  <th>Fees Amount</th>
                  <th>Status</th>
                  <th>Doctor</th>
                  <th>Department</th>
                  <th>Visited</th>
                  <th>Booked By</th>
                  <th>Prescription</th>
                    <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  // derive filtered appointments based on filterOption, custom dates and search term
                  const filteredAppointments = (appointments || []).filter(
                    (appointment) => {
                      try {
                        const apptDate = new Date(appointment.appointment_date);
                        const today = new Date();
                        const startOfToday = new Date(
                          today.getFullYear(),
                          today.getMonth(),
                          today.getDate()
                        );

                        // Filter by dropdown
                        if (filterOption === "Today") {
                          const apptYmd = apptDate.toISOString().slice(0, 10);
                          const todayYmd = startOfToday
                            .toISOString()
                            .slice(0, 10);
                          if (apptYmd !== todayYmd) return false;
                        } else if (filterOption === "Old") {
                          if (apptDate >= startOfToday) return false;
                        } else if (filterOption === "Upcoming") {
                          // future (strictly greater than today)
                          if (apptDate <= startOfToday) return false;
                        } else if (filterOption === "Custom") {
                          if (customStart && customEnd) {
                            const start = new Date(customStart + "T00:00:00");
                            const end = new Date(customEnd + "T23:59:59");
                            if (apptDate < start || apptDate > end)
                              return false;
                          }
                        }

                        // Search term across name, phone and date
                        if (searchTerm && searchTerm.trim() !== "") {
                          const q = searchTerm.toLowerCase();
                          const name = `${appointment.firstName || ""} ${
                            appointment.lastName || ""
                          }`.toLowerCase();
                          const phone = (
                            appointment.phone ||
                            appointment.mobile ||
                            appointment.patientPhone ||
                            ""
                          )
                            .toString()
                            .toLowerCase();
                          const dateStr = (appointment.appointment_date || "")
                            .toString()
                            .toLowerCase();
                          if (
                            !name.includes(q) &&
                            !phone.includes(q) &&
                            !dateStr.includes(q)
                          ) {
                            return false;
                          }
                        }

                        return true;
                      } catch (err) {
                        return true;
                      }
                    }
                  );

                  return filteredAppointments && filteredAppointments.length > 0
                    ? filteredAppointments.map((appointment) => (
                        <tr key={appointment._id}>
                            <td>
                              <input
                                type="checkbox"
                                checked={selectedAppointments.includes(appointment._id)}
                                onChange={() => toggleSelectAppointment(appointment._id)}
                              />
                            </td>
                          <td>{appointments.indexOf(appointment) + 1}</td>
                          <td>{appointment.name||`${appointment.firstName} ${appointment.lastName}`}</td>
                          <td>
                            {appointment.appointment_date.substring(0, 16)}
                          </td>
                          <td>{appointment.bookedBy||"You"}</td>
                          <td>{appointment.phone || appointment.mobile}</td>
                          <td>{appointment.gender}</td>
                          <td>{appointment.paymentMode || "Cash"}</td>
                          <td>{appointment.feesAmount || "0"}</td>
                          <td>
                            <select
                              className={
                                appointment.status === "Pending"
                                  ? "value-pending"
                                  : appointment.status === "Accepted"
                                  ? "value-accepted"
                                  : "value-rejected"
                              }
                              value={appointment.status}
                              onChange={(e) =>
                                handleUpdateStatus(
                                  appointment._id,
                                  e.target.value
                                )
                              }
                            >
                              <option value="Pending" className="value-pending">
                                Pending
                              </option>
                              <option
                                value="Accepted"
                                className="value-accepted"
                              >
                                Accepted
                              </option>
                              <option
                                value="Rejected"
                                className="value-rejected"
                              >
                                Rejected
                              </option>
                            </select>
                          </td>
                          <td>{`${appointment.doctor.firstName} ${appointment.doctor.lastName}`}</td>
                          <td>{appointment.department}</td>
                          <td>
                            {appointment.hasVisited === true ? (
                              <GoCheckCircleFill className="green" />
                            ) : (
                              <AiFillCloseCircle className="red" />
                            )}
                          </td>
                          <td>
                            {appointment.bookedBy
                              ? appointment.bookedBy
                              : appointment.patientId || "-"}
                          </td>
                          <td>
                            <button
                              className="btn btn-primary"
                              onClick={() =>
                                handlePrescriptionClick(appointment.patientId)
                              }
                            >
                              Prescription
                            </button>
                          </td>
                            <td>
                              <RequirePermission allowedRoles={["Admin"]}>
                              <button
                                className="btn remove-btn"
                                onClick={() => handleDeleteAppointment(appointment._id)}
                                style={{background:'none',border:'none',color:'#b10c0c'}}
                              >
                                <FaTrash />
                              </button>
                              </RequirePermission>
                            </td>
                        </tr>
                      ))
                    : "No Appointments Found!";
                })()}
              </tbody>
            </table>
          </div>

          <Modal
            isOpen={prescriptionModalOpen}
            onRequestClose={closePrescriptionModal}
            contentLabel="Prescription Modal"
            ariaHideApp={false}
            style={{ content: { maxWidth: "700px", margin: "auto" } }}
          >
            <Prescription
              patientId={selectedPatientId}
              patientData={selectedPatientData}
              onClose={closePrescriptionModal}
            />
          </Modal>
          <Modal
            isOpen={prescriptionModalOpen}
            onRequestClose={closePrescriptionModal}
            contentLabel="Prescription Modal"
            ariaHideApp={false}
            style={{ content: { maxWidth: "100%", margin: "auto" } }}
          >
            <Prescription
              patientId={selectedPatientId}
              patientData={selectedPatientData}
              onClose={closePrescriptionModal}
            />
          </Modal>

          {}
        </div>
      </section>
    </>
  );
};

export default Dashboard;
