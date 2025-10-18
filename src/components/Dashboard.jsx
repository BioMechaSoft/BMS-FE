import React, { useContext, useEffect, useState, useMemo } from "react";
import InvoiceViewer from './InvoiceViewer';
import Reports from './Reports';
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
import { MdOutlineContentPasteSearch } from "react-icons/md";
import { RiCalendarScheduleFill } from "react-icons/ri";
import { FaEye } from "react-icons/fa";
import { IoReceipt } from "react-icons/io5";
// import Doctors from "./Doctors";

const Dashboard = () => {
  const [appointments, setAppointments] = useState([]);
  const [selectedAppointments, setSelectedAppointments] = useState([]);
  const [filterOption, setFilterOption] = useState("All");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();
  const [Doctors, setDoctors] = useState([]);
  // Modal and prescription state
  const [prescriptionModalOpen, setPrescriptionModalOpen] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState(null);
  const [selectedPatientData, setSelectedPatientData] = useState(null);
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [activeInvoice, setActiveInvoice] = useState(null);

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

    const onUpdated = () => fetchAppointments();
    window.addEventListener('appointments:updated', onUpdated);
    return () => window.removeEventListener('appointments:updated', onUpdated);
  }, []);

  const handleUpdatePaymentStatus = async (appointmentId, paymentStatus) => {
    try {
      // send only paymentStatus and let backend harmonize status/payment according to rules
      const body = { paymentStatus };
      const { data } = await api.put(`/api/v1/appointment/status/${appointmentId}`, body);
      const updated = data.appointment || null;
      if (updated) {
        setAppointments((prev) => prev.map(a => a._id === appointmentId ? updated : a));
      } else {
        setAppointments((prev) => prev.map(a => a._id === appointmentId ? { ...a, paymentStatus: paymentStatus } : a));
      }
      toast.success(data.message || 'Payment status updated');
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to update payment status');
    }
  };

  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        if (searchTerm.trim() === "") {
          const { data } = await api.get(`/api/v1/user/doctors`);
          setDoctors(data.doctors);
        } else {
          const { data } = await api.get(
            `/api/v1/user/doctor/search?query=${encodeURIComponent(searchTerm)}`
          );
          setDoctors(data.doctors);
        }
      } catch (error) {
        toast.error(error.response?.data?.message || "Failed to fetch doctors");
      }
    };
    fetchDoctors();
  }, []);

  // Delete single appointment by ID
  const handleDeleteAppointment = async (id) => {
    if (!window.confirm("Delete this appointment?")) return;
    try {
      await api.delete(`/api/v1/appointment/delete/${id}`);
      setAppointments((prev) => prev.filter((a) => a._id !== id));
      setSelectedAppointments((prev) => prev.filter((x) => x !== id));
      toast.success("Appointment deleted");
    } catch (err) {
      toast.error("Delete failed");
    }
  };

  // Bulk delete selected appointments
  const handleBulkDelete = async () => {
    if (selectedAppointments.length === 0)
      return toast.info("No appointments selected");
    if (!window.confirm(`Delete ${selectedAppointments.length} appointments?`))
      return;
    try {
      await api.post(`/api/v1/appointment/bulk-delete`, {
        ids: selectedAppointments,
      });
      setAppointments((prev) =>
        prev.filter((a) => !selectedAppointments.includes(a._id))
      );
      setSelectedAppointments([]);
      toast.success("Bulk delete complete");
    } catch (err) {
      toast.error("Bulk delete failed");
    }
  };

  // Toggle select for bulk delete
  const toggleSelectAppointment = (id) => {
    setSelectedAppointments((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleUpdateStatus = async (appointmentId, status) => {
    try {
      // Let backend enforce rules. When requesting Completed, backend will ensure paymentStatus is Paid.
      const body = { status };
      const { data } = await api.put(`/api/v1/appointment/status/${appointmentId}`, body);
      const updatedAppt = data.appointment || null;
      if (updatedAppt) {
        setAppointments((prev) => prev.map((a) => (a._id === appointmentId ? updatedAppt : a)));
      }
      toast.success(data.message || 'Status updated');
    } catch (error) {
      toast.error(error.response.data.message);
    }
  };

  const [invoicesList, setInvoicesList] = useState([]);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState(null);
  const [showInvoicesModal, setShowInvoicesModal] = useState(false);

  const handleInvoiceClick = async (appointmentId) => {
    try {
      const { data } = await api.get(`/api/v1/invoice/appointment/${appointmentId}`);
      console.log('Invoice API response:', data);
      let invoices = [];
      if (Array.isArray(data.invoices)) {
        invoices = data.invoices;
      } else if (Array.isArray(data.invoice)) {
        invoices = data.invoice;
      } else if (data.invoices) {
        invoices = [data.invoices];
      } else if (data.invoice) {
        invoices = [data.invoice];
      } else if (Array.isArray(data)) {
        invoices = data;
      } else if (data && data._id) {
        invoices = [data];
      }
      console.log('Extracted invoices:', invoices);
      if (!invoices || invoices.length === 0) {
        toast.info('No invoice found for this appointment');
        return;
      }
      setInvoicesList(invoices);
      setShowInvoicesModal(true);
      setSelectedInvoiceId(null);
    } catch (e) {
      console.error('Invoice fetch failed', e);
      toast.error('Failed to fetch invoice for appointment');
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
                Welcome to your dashboard! Here you can manage appointments,
                view patient information, and oversee your medical practice with
                ease. If you have any questions or need assistance, feel free to
                reach out to our support team.{" "}
                <b>Biomechasoft +91 9609436103</b>
              </p>
            </div>
          </div>
          <div className="secondBox">
            <p>Total Appointments</p>
            <h3>{appointments?.length}</h3>
          </div>
          <div className="thirdBox">
            <p>Registered Doctors</p>
            <h3>{Doctors.length}</h3>
          </div>
        </div>
  {/* Reports summary (today/month/total) */}
  <Reports appointments={appointments} />

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
            <MdOutlineContentPasteSearch size={"1.8rem"} color="grey" />
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
            <div className="btn-box">
              <button
                className="btn add-btn"
                onClick={() => navigate("/add-appointment")}
              >
                Book Appointment
              </button>
              <RequirePermission allowedRoles={["Admin"]}>
                <button
                  className="btn remove-btn"
                  onClick={handleBulkDelete}
                  disabled={selectedAppointments.length === 0}
                >
                  Delete Selected ({selectedAppointments.length})
                </button>
              </RequirePermission>
            </div>
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>
                    <input
                      type="checkbox"
                      checked={(() => {
                        const filteredAppointments = (
                          appointments || []
                        ).filter((appointment) => {
                          try {
                            const apptDate = new Date(
                              appointment.appointment_date
                            );
                            const today = new Date();
                            const startOfToday = new Date(
                              today.getFullYear(),
                              today.getMonth(),
                              today.getDate()
                            );
                            if (filterOption === "Today") {
                              const apptYmd = apptDate
                                .toISOString()
                                .slice(0, 10);
                              const todayYmd = startOfToday
                                .toISOString()
                                .slice(0, 10);
                              if (apptYmd !== todayYmd) return false;
                            } else if (filterOption === "Old") {
                              if (apptDate >= startOfToday) return false;
                            } else if (filterOption === "Upcoming") {
                              if (apptDate <= startOfToday) return false;
                            } else if (filterOption === "Custom") {
                              if (customStart && customEnd) {
                                const start = new Date(
                                  customStart + "T00:00:00"
                                );
                                const end = new Date(customEnd + "T23:59:59");
                                if (apptDate < start || apptDate > end)
                                  return false;
                              }
                            }
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
                              const dateStr = (
                                appointment.appointment_date || ""
                              )
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
                        });
                        return (
                          filteredAppointments.length > 0 &&
                          selectedAppointments.length ===
                            filteredAppointments.length
                        );
                      })()}
                      onChange={(e) => {
                        const filteredAppointments = (
                          appointments || []
                        ).filter((appointment) => {
                          try {
                            const apptDate = new Date(
                              appointment.appointment_date
                            );
                            const today = new Date();
                            const startOfToday = new Date(
                              today.getFullYear(),
                              today.getMonth(),
                              today.getDate()
                            );
                            if (filterOption === "Today") {
                              const apptYmd = apptDate
                                .toISOString()
                                .slice(0, 10);
                              const todayYmd = startOfToday
                                .toISOString()
                                .slice(0, 10);
                              if (apptYmd !== todayYmd) return false;
                            } else if (filterOption === "Old") {
                              if (apptDate >= startOfToday) return false;
                            } else if (filterOption === "Upcoming") {
                              if (apptDate <= startOfToday) return false;
                            } else if (filterOption === "Custom") {
                              if (customStart && customEnd) {
                                const start = new Date(
                                  customStart + "T00:00:00"
                                );
                                const end = new Date(customEnd + "T23:59:59");
                                if (apptDate < start || apptDate > end)
                                  return false;
                              }
                            }
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
                              const dateStr = (
                                appointment.appointment_date || ""
                              )
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
                        });
                        setSelectedAppointments(
                          e.target.checked
                            ? filteredAppointments.map((a) => a._id)
                            : []
                        );
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
                  <th>Payment Status</th>
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
                              checked={selectedAppointments.includes(
                                appointment._id
                              )}
                              onChange={() =>
                                toggleSelectAppointment(appointment._id)
                              }
                            />
                          </td>
                          <td>{appointments.indexOf(appointment) + 1}</td>
                          <td>
                            {appointment.name ||
                              `${appointment.firstName} ${appointment.lastName}`}
                          </td>
                          <td>
                            {appointment.appointment_date.substring(0, 10)}
                          </td>
                          <td>{appointment?.booked_by || "You"}</td>
                          <td>{appointment.phone || appointment.mobile}</td>
                          <td>{appointment.gender}</td>
                          <td>{appointment.paymentMode || "Cash"}</td>
                          <td>{appointment.feesAmount || "0"}</td>
                          <td>
                            <select value={appointment.paymentStatus || 'Pending'} onChange={(e) => handleUpdatePaymentStatus(appointment._id, e.target.value)}>
                              <option value="Pending">Pending</option>
                              <option value="Accepted">Accepted</option>
                              <option value="Paid">Paid</option>
                            </select>
                          </td>
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
                              <option
                                value="Completed"
                                className="value-completed" 
                              >
                                Completed
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
                            {appointment.book_by_name
                              ? appointment.book_by_name
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
                            <div className="td-btn-container">
                              {/* TODO:functionalities need to be implemented */}
                              <button style={{background:"none", border:"none", color:"#0859afff"}}><RiCalendarScheduleFill /></button>
                              <button style={{background:"none", border:"none", color:"#5bbe8eff"}}><FaEye /></button>
                              <button style={{background:"none", border:"none", color:"#760692ff"}} onClick={()=>handleInvoiceClick(appointment._id)}><IoReceipt /></button>
                              <RequirePermission allowedRoles={["Admin"]}>
                                <button
                                  onClick={() =>
                                    handleDeleteAppointment(appointment._id)
                                  }
                                  style={{
                                    background: "none",
                                    border: "none",
                                    color: "#b10c0c",
                                  }}
                                >
                                  <FaTrash />
                                </button>
                              </RequirePermission>
                            </div>
                          </td>
                        </tr>
                      ))
                    : "No Appointments Found!";
                })()}
              </tbody>
            </table>
          </div>

          {/* Invoice selection modal for multiple invoices - only opens on IoReceipt click */}
          <Modal
            isOpen={showInvoicesModal}
            onRequestClose={() => { setShowInvoicesModal(false); setInvoicesList([]); setSelectedInvoiceId(null); }}
            contentLabel="Invoices Modal"
            ariaHideApp={false}
            style={{ content: { maxWidth: "600px", margin: "auto" } }}
          >
            <h3>Invoices for Appointment</h3>
            <div>
              {invoicesList.map((inv, idx) => (
                <div key={inv._id || inv.id} style={{ marginBottom: 10, borderBottom: '1px solid #eee', paddingBottom: 8 }}>
                  <div><b>Invoice #:</b> {inv.invoiceNumber || inv._id || inv.id}</div>
                  <div><b>Date:</b> {inv.issuedAt ? String(inv.issuedAt).substring(0,10) : (inv.date ? String(inv.date).substring(0,10) : '-')}</div>
                  <div><b>Total:</b> {inv.total || inv.subtotal || 0}</div>
                  <button className="btn btn-primary" style={{ marginRight: 8 }} onClick={() => setSelectedInvoiceId(inv._id || inv.id)}>View</button>
                  <button className="btn" onClick={() => window.open(`/invoice/${inv._id || inv.id}`, '_blank')}>Open Full Page</button>
                </div>
              ))}
            </div>
            <button className="btn" style={{ marginTop: 12 }} onClick={() => { setShowInvoicesModal(false); setInvoicesList([]); setSelectedInvoiceId(null); }}>Close</button>
            {/* InvoiceViewer for selected invoice inside modal */}
            <InvoiceViewer invoiceId={selectedInvoiceId} isOpen={!!selectedInvoiceId} onClose={() => setSelectedInvoiceId(null)} />
          </Modal>

          {/* Prescription modal - only for prescription */}
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
        </div>
      </section>
    </>
  );
};

export default Dashboard;
