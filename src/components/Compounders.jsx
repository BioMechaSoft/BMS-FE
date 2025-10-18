import api from "../utils/api";
import Modal from "react-modal";
import React, { useContext, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { Context } from "../main";
import { Navigate } from "react-router-dom";
import { FaSearch } from "./DoctorIcons";
import RequirePermission from "./RequirePermission";
import UserCard from './UserCard';
import { useDispatch, useSelector } from 'react-redux';
import { fetchDoctorsRequest } from '../store/doctorsSlice';

const Compounders = () => {
  const [compounders, setCompounders] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selected, setSelected] = useState(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [updateFields, setUpdateFields] = useState({});
  const { isAuthenticated } = useContext(Context);
  const dispatch = useDispatch();

  useEffect(() => {
    const fetchCompounders = async () => {
      try {
        const { data } = await api.get('/api/v1/user/compounders');
        setCompounders(data.compounders || []);
      } catch (err) {
        console.error('Failed to fetch compounders', err);
      }
    };
    fetchCompounders();
  }, []);

  useEffect(() => {
    if (!searchTerm) return; // simple local filter - backend has limited search for compounders
    const q = searchTerm.toLowerCase();
    setCompounders(prev => prev.filter(c => (`${c.firstName} ${c.lastName}`.toLowerCase().includes(q) || (c.phone || '').includes(q) || (c.email || '').toLowerCase().includes(q))));
  }, [searchTerm]);

  if (!isAuthenticated) return <Navigate to={'/login'} />;

  return (
    <>
      <section className="page doctors">
        <h1>COMPOUNDERS</h1>
        <form style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem', gap: '0.5rem' }} onSubmit={e => e.preventDefault()}>
          <input
            type="text"
            placeholder="Search by name, phone, email..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid #ccc', width: '250px' }}
          />
          <button type="button" style={{ background: '#271776ca', color: '#fff', border: 'none', borderRadius: '6px', padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FaSearch /> Search
          </button>
        </form>

        <div className="banner">
          {compounders && compounders.length > 0 ? (
            compounders.map((el) => (
              <UserCard
                key={el._id}
                user={el}
                onView={(u) => setSelected(u)}
                onEdit={(u) => {
                  setSelected(u);
                  setUpdateFields({
                    firstName: u.firstName,
                    lastName: u.lastName,
                    email: u.email,
                    phone: u.phone,
                    nic: u.nic,
                    dob: u.dob ? u.dob.substring(0,10) : '',
                    gender: u.gender,
                  });
                  setShowUpdateModal(true);
                }}
                onDelete={async (u) => {
                  if(window.confirm('Are you sure you want to delete this compounder?')) {
                    try {
                      await api.delete(`/api/v1/user/user/${u._id}`);
                      toast.success('Compounder deleted');
                      // refetch
                      const { data } = await api.get('/api/v1/user/compounders');
                      setCompounders(data.compounders || []);
                    } catch (err) {
                      toast.error('Delete failed');
                    }
                  }
                }}
              />
            ))
          ) : (
            <h1>No Registered Compounders Found!</h1>
          )}
        </div>
      </section>

      <Modal isOpen={showUpdateModal} onRequestClose={() => setShowUpdateModal(false)} contentLabel="Update Compounder" style={{ overlay: { zIndex: 1000 }, content: { maxWidth: '500px', margin: 'auto', borderRadius: '12px', padding: '2rem' } }}>
        <h2>Update Compounder</h2>
        {selected && (
          <form onSubmit={async e => {
            e.preventDefault();
            try {
              await api.put(`/api/v1/user/user/${selected._id}`, updateFields);
              toast.success('Compounder updated');
              setShowUpdateModal(false);
              const { data } = await api.get('/api/v1/user/compounders');
              setCompounders(data.compounders || []);
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
            <button type="submit">Update</button>
            <button type="button" onClick={() => setShowUpdateModal(false)}>Cancel</button>
          </form>
        )}
      </Modal>
    </>
  );
};

export default Compounders;
