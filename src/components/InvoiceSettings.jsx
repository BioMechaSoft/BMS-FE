import React, { useEffect, useMemo, useState } from 'react';
import api from '../utils/api';
import './Settings.css';

const InvoiceSettings = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState({ patient:'', doctor:'', appointment:'', status:'' });
  const [form, setForm] = useState({ invoiceNumber: '', patient: '', appointment: '', doctor:'', items: [], tax:0, discount:0, dueDate: '', status: 'Pending' });
  const [editing, setEditing] = useState(null);

  const fetchInvoices = async (opts={}) => {
    setLoading(true);
    try {
      const params = { page: opts.page || page, limit: opts.limit || limit, q: query, ...filters };
      const { data } = await api.get('/api/v1/invoice', { params });
      setInvoices(data.invoices || []);
      setTotal(data.total || (data.invoices || []).length);
    } catch (e) { console.error(e); alert('Failed to load invoices'); }
    finally { setLoading(false); }
  };

  useEffect(()=>{ fetchInvoices({ page:1 }); }, []);

  const handleSearch = async () => { setPage(1); fetchInvoices({ page:1 }); };

  const handleCreateOrUpdate = async () => {
    try {
      const payload = { ...form };
      if (editing) {
        const { data } = await api.put(`/api/v1/invoice/${editing}`, payload);
        setInvoices(prev => prev.map(i => (i._id === data.invoice._id ? data.invoice : i)));
        setEditing(null);
        alert('Invoice updated');
      } else {
        const { data } = await api.post('/api/v1/invoice', payload);
        setInvoices(prev => [data.invoice, ...prev]);
        alert('Invoice created');
      }
      setForm({ invoiceNumber: '', patient: '', appointment: '', doctor:'', items: [], tax:0, discount:0, dueDate: '', status: 'Pending' });
    } catch (e) { console.error(e); alert('Failed to save invoice'); }
  };

  const handleEdit = (inv) => {
    setEditing(inv._id || inv.id);
    setForm({ invoiceNumber: inv.invoiceNumber || '', patient: inv.patient?._id || inv.patient || '', appointment: inv.appointment?._id || inv.appointment || '', doctor: inv.doctor?._id || inv.doctor || '', items: inv.items || [], tax: inv.tax||0, discount: inv.discount||0, dueDate: inv.dueDate||'', status: inv.status||'Pending' });
    window.scrollTo({ top:0, behavior:'smooth' });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete invoice?')) return;
    try { await api.delete(`/api/v1/invoice/${id}`); setInvoices(prev => prev.filter(i => i._id !== id && i.id !== id)); alert('Deleted'); } catch(e){ console.error(e); alert('Delete failed'); }
  };

  const fetchByAppointment = async (appointmentId) => {
    try { const { data } = await api.get(`/api/v1/invoice/appointment/${appointmentId}`); return data.invoices || data.invoice || data; } catch(e){ console.error(e); alert('Fetch by appointment failed'); return null; }
  };

  const handleUpdateByAppointment = async (appointmentId, partial) => {
    try { const { data } = await api.put(`/api/v1/invoice/appointment/${appointmentId}`, partial); alert(`Updated ${data.updatedCount} invoices`); return data; } catch(e){ console.error(e); alert('Update by appointment failed'); }
  };

  const stats = useMemo(()=>({}), []);

  return (
    <section className="page">
      <div className="settings-header">
        <h2>Invoice Settings</h2>
        <p>Manage invoices: create, search, edit, delete and view stats.</p>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 2fr', gap:20 }}>
        <div>
          <h3>{editing ? 'Edit Invoice' : 'Create Invoice'}</h3>
          <div style={{ display:'grid', gap:8 }}>
            <input placeholder="Invoice Number" value={form.invoiceNumber} onChange={e=>setForm({...form, invoiceNumber: e.target.value})} />
            <input placeholder="Patient ID" value={form.patient} onChange={e=>setForm({...form, patient: e.target.value})} />
            <input placeholder="Appointment ID (optional)" value={form.appointment} onChange={e=>setForm({...form, appointment: e.target.value})} />
            <input placeholder="Doctor ID (optional)" value={form.doctor} onChange={e=>setForm({...form, doctor: e.target.value})} />
            <textarea placeholder="Items JSON" value={JSON.stringify(form.items)} onChange={e=>{ try { setForm({...form, items: JSON.parse(e.target.value)}); } catch(err){} }} rows={4} />
            <div style={{ display:'grid',gridTemplateColumns:'150px 100px 100px', gap:8, width:'100%' }}>
              <input placeholder="Due Date" type='date' value={form.dueDate} onChange={e=>setForm({...form, dueDate: e.target.value})} />
              <input placeholder="Tax" value={form.tax} onChange={e=>setForm({...form, tax: Number(e.target.value)})} />
              <input placeholder="Discount" value={form.discount} onChange={e=>setForm({...form, discount: Number(e.target.value)})} />
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={handleCreateOrUpdate}>{editing ? 'Update' : 'Create'}</button>
              {editing && <button onClick={()=>{ setEditing(null); setForm({ invoiceNumber: '', patient: '', appointment: '', doctor:'', items: [], tax:0, discount:0, dueDate: '', status: 'Pending' }); }}>Cancel</button>}
            </div>
          </div>
        </div>

        <div>
          <h3>Search & List</h3>
          <div style={{ display:'flex', gap:8, marginBottom:8 }}>
            <input placeholder="Search q" value={query} onChange={e=>setQuery(e.target.value)} />
            <input placeholder="Patient ID" value={filters.patient} onChange={e=>setFilters({...filters, patient: e.target.value})} />
            <input placeholder="Doctor ID" value={filters.doctor} onChange={e=>setFilters({...filters, doctor: e.target.value})} />
            <button onClick={handleSearch}>Search</button>
          </div>
          <div style={{ maxHeight: '60vh', overflowY: 'auto', border: '1px solid #eee', padding:8 }}>
            {loading ? <div>Loading...</div> : (
              invoices.map(inv => (
                <div key={inv._id || inv.id} style={{ borderBottom:'1px solid #f0f0f0', padding:8, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <div>
                    <div style={{ fontWeight:700 }}>{inv.invoiceNumber}</div>
                    <div style={{ color:'#666' }}>Patient: {inv.patient?._id || inv.patient}</div>
                    <div style={{ color:'#666' }}>Amount: {inv.total}</div>
                  </div>
                  <div style={{ display:'flex', gap:8 }}>
                    <button onClick={()=>handleEdit(inv)}>Edit</button>
                    <button onClick={()=>navigator.clipboard.writeText(inv._id || inv.id)}>Copy ID</button>
                    <button onClick={()=>handleDelete(inv._id || inv.id)}>Delete</button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default InvoiceSettings;
