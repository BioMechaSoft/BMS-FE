import React, { useState } from 'react';

const fmt = (v) => (Number(v) || 0).toLocaleString();

const ReportRow = ({ entry, onAction }) => {
  const [editing, setEditing] = useState(false);
  const [notes, setNotes] = useState(entry.notes || '');

  const doctorLabel = entry.doctorId && (entry.doctorId.firstName || entry.doctorId.name) ? `${entry.doctorId.firstName||entry.doctorId.name} ${entry.doctorId.lastName||''}` : (entry.doctorId || '');

  return (
    <tr>
      <td style={{maxWidth:140, overflow:'hidden', textOverflow:'ellipsis'}}>{entry.appointmentId}</td>
      <td>{entry.appointmentDate ? String(entry.appointmentDate).slice(0,10) : ''}</td>
      <td>{doctorLabel}</td>
      <td>{fmt(entry.amount)}</td>
      <td>{fmt(entry.revenue)}</td>
      <td>{fmt(entry.due)}</td>
      <td>{entry.status}</td>
      <td style={{display:'flex',gap:8}}>
        <button onClick={()=>{ if(entry.status === 'Paid') return; onAction('markPaid'); }} className="btn" disabled={entry.status === 'Paid'}>{entry.status === 'Paid' ? 'Paid' : 'Mark Paid'}</button>
        <button onClick={()=>{ if(!editing) setEditing(true); else { onAction('edit', { notes }); setEditing(false); } }} className="btn">{editing ? 'Save' : 'Edit'}</button>
        <button onClick={()=>{ if(window.confirm('Delete this report entry? This cannot be undone.')) onAction('delete'); }} className="btn" style={{background:'#d9534f'}}>Delete</button>
        {editing && <input style={{marginLeft:8}} value={notes} onChange={(e)=>setNotes(e.target.value)} />}
      </td>
    </tr>
  );
};

export default ReportRow;
