import api from "../utils/api";
import Modal from "react-modal";
import React, { useContext, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { Context } from "../main";
import { Navigate } from "react-router-dom";
import { FaSearch, FaTrashAlt, FaEdit, FaEye } from "./DoctorIcons";

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
        const { data } = await api.get(`/api/v1/user/doctors`);
        setDoctors(data.doctors);
      } catch (error) {
        toast.error(error.response.data.message);
      }
    };
    fetchDoctors();
  }, []);

  const handleSearch = async (e) => {
    e.preventDefault();
    try {
      const { data } = await api.get(`/api/v1/user/doctor/search?q=${encodeURIComponent(searchTerm)}`);
      setDoctors(data.doctors);
    } catch (error) {
      toast.error("Search failed");
    }
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
            placeholder="Search by name, ID, NIC, or email"
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
                <div class="doc-card" key={element._id}>
                  <div class="doc-card__inner">
                    <div class="doc-card__avatar">
                      <img src={element.docAvatar && element.docAvatar.url?element.docAvatar && element.docAvatar.url:'./doc1.jpg'}
                      alt="doctor avatar" />
                    </div>

                    <h3 class="doc-card__name">{`${element.firstName} ${element.lastName}`}</h3>
                    <p class="doc-card__role">NIC: {element.nic}</p>

                    <div class="doc-card__info">
                      <p>
                        <span class="label">Email:</span> {element.email}
                      </p>
                      <p>
                        <span class="label">Phone:</span> {element.phone}
                      </p>
                      <p>
                        <span class="label">DOB:</span> {element.dob.substring(0, 10)}
                      </p>
                    </div>

                    <div class="doc-card__actions">
                      <div class="doc-btn btn--primary">{element.doctorDepartment}</div>
                      <div class="doc-btn btn--ghost">{element.gender}</div>
                      <button class="doc-btn btn--view" title="View" onClick={() => setSelectedDoctor(element)} style={{ background: 'none', border: 'none', color: '#271776ca', fontSize: '1.2rem', marginRight: '0.5rem' }}><FaEye /></button>
                      <button class="doc-btn btn--update" title="Edit" onClick={() => {
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
                      }} style={{ background: 'none', border: 'none', color: '#271776ca', fontSize: '1.2rem', marginRight: '0.5rem' }}><FaEdit /></button>
                      <button class="doc-btn btn--delete" title="Delete" onClick={async () => {
                        if(window.confirm('Are you sure you want to delete this doctor?')) {
                          try {
                            await api.delete(`/api/v1/user/doctor/${element._id}`);
                            toast.success('Doctor deleted');
                            setDoctors(doctors.filter(d => d._id !== element._id));
                            // Send message to Sohel.Islam@gmail.com
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
                      }} style={{ background: 'none', border: 'none', color: '#d32f2f', fontSize: '1.2rem' }}><FaTrashAlt /></button>
                    </div>
                  </div>
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
