import api from "../utils/api";
import Modal from "react-modal";
import React, { useContext, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { Context } from "../main";
import { Navigate } from "react-router-dom";
import { FaSearch, FaTrashAlt, FaEdit, FaEye } from "./DoctorIcons";
import RequirePermission from "./RequirePermission";

const Doctors = () => {
  const [doctors, setDoctors] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [updateFields, setUpdateFields] = useState({});
  const { isAuthenticated } = useContext(Context);

  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        if (searchTerm.trim() === "") {
          const { data } = await api.get(`/api/v1/user/doctors`);
          setDoctors(data.doctors);
        } else {
          const { data } = await api.get(`/api/v1/user/doctor/search?query=${encodeURIComponent(searchTerm)}`);
          setDoctors(data.doctors);
        }
      } catch (error) {
        toast.error(error.response?.data?.message || "Failed to fetch doctors");
      }
    };
    fetchDoctors();
  }, [searchTerm]);

  const handleSearch = (e) => {
    e.preventDefault();
    // No need to manually fetch, searchTerm change triggers useEffect
  };

  if (!isAuthenticated) {
    return <Navigate to={"/login"} />;
  }
  return (
    <>
      <section className="page doctors">
        <h1>DOCTORS</h1>
        <form onSubmit={handleSearch} style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem', gap: '0.5rem' }}>
          <input
            type="text"
            placeholder="Search by name, phone, department, NIC..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid #ccc', width: '250px' }}
          />
          <button type="submit" style={{ background: '#271776ca', color: '#fff', border: 'none', borderRadius: '6px', padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FaSearch /> Search
          </button>
        </form>
        <div className="banner">
          {doctors && doctors.length > 0 ? (
            doctors.map((element) => {
              return (
                <div class="doc-card pro-card" key={element._id} style={{
                  boxShadow: '0 4px 24px rgba(39,23,118,0.12)',
                  borderRadius: '18px',
                  background: '#fff',
                  margin: '1rem',
                  padding: '1.5rem',
                  maxWidth: '340px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  transition: 'box-shadow 0.2s',
                  border: '1px solid #ececec',
                  position: 'relative'
                }}>
                  <div style={{ width: 90, height: 90, borderRadius: '50%', overflow: 'hidden', boxShadow: '0 2px 8px #eee', marginBottom: '1rem', background: '#f7f7fa' }}>
                    <img src={element.docAvatar && element.docAvatar.url ? element.docAvatar.url : './doc1.jpg'} alt="doctor avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                  <h3 style={{ fontWeight: 700, fontSize: '1.25rem', margin: '0.5rem 0', color: '#271776' }}>{`${element.firstName} ${element.lastName}`}</h3>
                  <div style={{ fontSize: '0.95rem', color: '#555', marginBottom: '0.5rem' }}>NIC: <span style={{ fontWeight: 500 }}>{element.nic}</span></div>
                  <div style={{ fontSize: '0.95rem', color: '#555', marginBottom: '0.5rem' }}>Department: <span style={{ fontWeight: 500 }}>{element.doctorDepartment}</span></div>
                  <div style={{ fontSize: '0.95rem', color: '#555', marginBottom: '0.5rem' }}>Gender: <span style={{ fontWeight: 500 }}>{element.gender}</span></div>
                  <div style={{ width: '100%', margin: '0.5rem 0', borderTop: '1px solid #ececec' }}></div>
                  <div style={{ width: '100%', textAlign: 'left', fontSize: '0.92rem', color: '#444', marginBottom: '0.5rem' }}>
                    <div><span style={{ fontWeight: 600 }}>Email:</span> {element.email}</div>
                    <div><span style={{ fontWeight: 600 }}>Phone:</span> {element.phone}</div>
                    <div><span style={{ fontWeight: 600 }}>DOB:</span> {element.dob.substring(0, 10)}</div>
                  </div>
                  <RequirePermission allowedRoles={["Admin"]}>
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                    <button title="View" onClick={() => setSelectedDoctor(element)} style={{ background: '#f7f7fa', border: 'none', color: '#271776', fontSize: '1.2rem', borderRadius: '8px', padding: '0.5rem 0.7rem', boxShadow: '0 1px 4px #eee', cursor: 'pointer' }}><FaEye /></button>
                    <button title="Edit" onClick={() => {
                      setSelectedDoctor(element);
                      setUpdateFields({
                        firstName: element.firstName,
                        lastName: element.lastName,
                        email: element.email,
                        phone: element.phone,
                        nic: element.nic,
                        dob: element.dob ? element.dob.substring(0,10) : '',
                        gender: element.gender,
                        doctorDepartment: element.doctorDepartment,
                        consultationFee: element.consultationFee || 100
                      });
                      setShowUpdateModal(true);
                    }} style={{ background: '#f7f7fa', border: 'none', color: '#271776', fontSize: '1.2rem', borderRadius: '8px', padding: '0.5rem 0.7rem', boxShadow: '0 1px 4px #eee', cursor: 'pointer' }}><FaEdit /></button>
                    <button title="Delete" onClick={async () => {
                      if(window.confirm('Are you sure you want to delete this doctor?')) {
                        try {
                          await api.delete(`/api/v1/user/user/${element._id}`);
                          toast.success('Doctor deleted');
                          setDoctors(doctors.filter(d => d._id !== element._id));
                          await api.post('/api/v1/message/send', {
                            firstName: element.firstName,
                            lastName: element.lastName,
                            email: 'Sohel.Islam@gmail.com',
                            phone: element.phone,
                            message: `Doctor ${element.firstName} ${element.lastName} deleted.`
                          });
                        } catch (err) {
                          toast.error('Delete failed');
                        }
                      }
                    }} style={{ background: '#fff0f0', border: 'none', color: '#d32f2f', fontSize: '1.2rem', borderRadius: '8px', padding: '0.5rem 0.7rem', boxShadow: '0 1px 4px #eee', cursor: 'pointer' }}><FaTrashAlt /></button>
                  </div>
                  </RequirePermission>
                </div>
              );
            })
          ) : (
            <h1>No Registered Doctors Found!</h1>
          )}
        </div>
      </section>
      <Modal
        isOpen={showUpdateModal}
        onRequestClose={() => setShowUpdateModal(false)}
        contentLabel="Update Doctor"
        style={{ overlay: { zIndex: 1000 }, content: { maxWidth: '500px', margin: 'auto', borderRadius: '12px', padding: '2rem' } }}
      >
        <h2>Update Doctor</h2>
        {selectedDoctor && (
          <form onSubmit={async e => {
            e.preventDefault();
            try {
              await api.put(`/api/v1/user/user/${selectedDoctor._id}`, updateFields);
              toast.success('Doctor updated');
              setShowUpdateModal(false);
              // Send message to Sohel.Islam@gmail.com
              await api.post('/api/v1/message/send', {
                firstName: updateFields.firstName,
                lastName: updateFields.lastName,
                email: 'Sohel.Islam@gmail.com',
                phone: updateFields.phone,
                message: `Doctor ${updateFields.firstName} ${updateFields.lastName} updated.`
              });
              // Optionally refresh doctors list
            } catch (err) {
              toast.error('Update failed');
            }
          }}>
            <label>First Name: <input type="text" value={updateFields.firstName} onChange={e => setUpdateFields(f => ({ ...f, firstName: e.target.value }))} /></label><br/>
            <label>Last Name: <input type="text" value={updateFields.lastName} onChange={e => setUpdateFields(f => ({ ...f, lastName: e.target.value }))} /></label><br/>
            <label>Email: <input type="email" value={updateFields.email} onChange={e => setUpdateFields(f => ({ ...f, email: e.target.value }))} /></label><br/>
            <label>Phone: <input type="text" value={updateFields.phone} onChange={e => setUpdateFields(f => ({ ...f, phone: e.target.value }))} /></label><br/>
            <label>NIC: <input type="text" value={updateFields.nic} onChange={e => setUpdateFields(f => ({ ...f, nic: e.target.value }))} /></label><br/>
            <label>DOB: <input type="date" value={updateFields.dob} onChange={e => setUpdateFields(f => ({ ...f, dob: e.target.value }))} /></label><br/>
            <label>Gender: <select value={updateFields.gender} onChange={e => setUpdateFields(f => ({ ...f, gender: e.target.value }))}><option value="Male">Male</option><option value="Female">Female</option></select></label><br/>
            <label>Department: <input type="text" value={updateFields.doctorDepartment} onChange={e => setUpdateFields(f => ({ ...f, doctorDepartment: e.target.value }))} /></label><br/>
            <label>Consultation Fee: <input type="number" value={updateFields.consultationFee} onChange={e => setUpdateFields(f => ({ ...f, consultationFee: Number(e.target.value) }))} /></label><br/>
            <button type="submit">Update</button>
            <button type="button" onClick={() => setShowUpdateModal(false)}>Cancel</button>
          </form>
        )}
      </Modal>
    </>
  );
};

export default Doctors;
