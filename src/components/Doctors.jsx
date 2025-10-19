import api from "../utils/api";
import Modal from "react-modal";
import React, { useContext, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { Context } from "../main";
import { Navigate } from "react-router-dom";
import { FaSearch } from "./DoctorIcons";
import UserCard from './UserCard';
import RequirePermission from "./RequirePermission";
import { useDispatch, useSelector } from 'react-redux';
import { fetchDoctorsRequest } from '../store/doctorsSlice';

const Doctors = () => {
  const [doctors, setDoctors] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [updateFields, setUpdateFields] = useState({});
  const { isAuthenticated } = useContext(Context);
  const dispatch = useDispatch();
  const storeDoctors = useSelector(s => s.doctors.doctors || []);
  const doctorsLoading = useSelector(s => s.doctors.loading);

  useEffect(() => {
    // fetch on mount
    dispatch(fetchDoctorsRequest({ query: '' }));
  }, []);

  useEffect(() => {
    // dispatch search request; saga debounces
    dispatch(fetchDoctorsRequest({ query: searchTerm }));
  }, [searchTerm]);

  // sync local doctors state from store to allow local filtering after fetch
  useEffect(() => {
    setDoctors(storeDoctors);
  }, [storeDoctors]);

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
            doctors.map((element) => (
              <UserCard
                key={element._id}
                user={element}
                extraLines={[<div key="dept"><strong>Dept:</strong> {element.doctorDepartment}</div>]}
                onView={(u) => setSelectedDoctor(u)}
                onEdit={(u) => {
                  setSelectedDoctor(u);
                  setUpdateFields({
                    firstName: u.firstName,
                    lastName: u.lastName,
                    email: u.email,
                    phone: u.phone,
                    nic: u.nic,
                    dob: u.dob ? u.dob.substring(0,10) : '',
                    gender: u.gender,
                    doctorDepartment: u.doctorDepartment,
                    consultationFee: u.consultationFee || 100
                  });
                  setShowUpdateModal(true);
                }}
                onDelete={async (u) => {
                  if(window.confirm('Are you sure you want to delete this doctor?')) {
                    try {
                      await api.delete(`/api/v1/user/user/${u._id}`);
                      toast.success('Doctor deleted');
                      // refresh doctors list from server
                      dispatch(fetchDoctorsRequest({ query: searchTerm }));
                      await api.post('/api/v1/message/send', {
                        firstName: u.firstName,
                        lastName: u.lastName,
                        email: 'Sohel.Islam@gmail.com',
                        phone: u.phone,
                        message: `Doctor ${u.firstName} ${u.lastName} deleted.`
                      });
                    } catch (err) {
                      toast.error('Delete failed');
                    }
                  }
                }}
              />
            ))
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
