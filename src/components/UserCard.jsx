import React from 'react';
import RequirePermission from './RequirePermission';
import { FaTrashAlt, FaEdit, FaEye } from './DoctorIcons';

const UserCard = ({ user, extraLines = [], onView, onEdit, onDelete, allowAdminActions = true }) => {
  return (
    <div className="doc-card pro-card" style={{ boxShadow: '0 4px 24px rgba(39,23,118,0.12)', borderRadius: '18px', background: '#fff', margin: '1rem', padding: '1.5rem', maxWidth: '340px', display: 'flex', flexDirection: 'column', alignItems: 'center', transition: 'box-shadow 0.2s', border: '1px solid #ececec', position: 'relative' }}>
      <div style={{ width: 90, height: 90, borderRadius: '50%', overflow: 'hidden', boxShadow: '0 2px 8px #eee', marginBottom: '1rem', background: '#f7f7fa' }}>
        <img src={user.docAvatar && user.docAvatar.url ? user.docAvatar.url : './doc1.jpg'} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>
      <h3 style={{ fontWeight: 700, fontSize: '1.25rem', margin: '0.5rem 0', color: '#271776' }}>{`${user.firstName} ${user.lastName}`}</h3>
      <div style={{ fontSize: '0.95rem', color: '#555', marginBottom: '0.5rem' }}>NIC: <span style={{ fontWeight: 500 }}>{user.nic}</span></div>
      {user.doctorDepartment && <div style={{ fontSize: '0.95rem', color: '#555', marginBottom: '0.5rem' }}>Department: <span style={{ fontWeight: 500 }}>{user.doctorDepartment}</span></div>}
      <div style={{ fontSize: '0.95rem', color: '#555', marginBottom: '0.5rem' }}>Gender: <span style={{ fontWeight: 500 }}>{user.gender}</span></div>
      <div style={{ width: '100%', margin: '0.5rem 0', borderTop: '1px solid #ececec' }}></div>
      <div style={{ width: '100%', textAlign: 'left', fontSize: '0.92rem', color: '#444', marginBottom: '0.5rem' }}>
        <div><span style={{ fontWeight: 600 }}>Email:</span> {user.email}</div>
        <div><span style={{ fontWeight: 600 }}>Phone:</span> {user.phone}</div>
        <div><span style={{ fontWeight: 600 }}>DOB:</span> {user.dob ? (user.dob.substring ? user.dob.substring(0,10) : user.dob) : ''}</div>
        {extraLines.map((line, idx) => <div key={idx}>{line}</div>)}
      </div>
      {allowAdminActions ? (
        <RequirePermission allowedRoles={["Admin"]}>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
            <button title="View" onClick={() => onView && onView(user)} style={{ background: '#f7f7fa', border: 'none', color: '#271776', fontSize: '1.2rem', borderRadius: '8px', padding: '0.5rem 0.7rem', boxShadow: '0 1px 4px #eee', cursor: 'pointer' }}><FaEye /></button>
            <button title="Edit" onClick={() => onEdit && onEdit(user)} style={{ background: '#f7f7fa', border: 'none', color: '#271776', fontSize: '1.2rem', borderRadius: '8px', padding: '0.5rem 0.7rem', boxShadow: '0 1px 4px #eee', cursor: 'pointer' }}><FaEdit /></button>
            <button title="Delete" onClick={() => onDelete && onDelete(user)} style={{ background: '#fff0f0', border: 'none', color: '#d32f2f', fontSize: '1.2rem', borderRadius: '8px', padding: '0.5rem 0.7rem', boxShadow: '0 1px 4px #eee', cursor: 'pointer' }}><FaTrashAlt /></button>
          </div>
        </RequirePermission>
      ) : null}
    </div>
  );
};

export default UserCard;
