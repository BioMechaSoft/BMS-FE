import axios from "axios";
import React, { useContext, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { Context } from "../main";
import { Navigate } from "react-router-dom";

const Messages = () => {
  const [messages, setMessages] = useState([]);
  const [selected, setSelected] = useState([]);
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [counts, setCounts] = useState({ total: 0, read: 0, unread: 0 });
  const { isAuthenticated } = useContext(Context);

  const fetchMessages = async (search = '', p = 1) => {
    try {
      const params = { limit: 10, page: p };
      if (search) params.q = search;
      const { data } = await axios.get(
        "http://localhost:5000/api/v1/message/getall",
        { params, withCredentials: true }
      );
      setMessages(data.messages || []);
      setCounts({ total: data.total || 0, read: data.readCount || 0, unread: data.unreadCount || 0 });
      setPage(data.page || 1);
      setTotalPages(data.totalPages || 1);
    } catch (error) {
      console.error(error?.response?.data || error.message);
      toast.error('Failed to load messages');
    }
  };

  useEffect(() => { fetchMessages('', page); }, []);

  if (!isAuthenticated) {
    return <Navigate to={"/login"} />;
  }

  const toggleSelect = (id) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const markAsRead = async (id, val = true) => {
    try {
      await axios.put(`http://localhost:5000/api/v1/message/${id}`, { read: val }, { withCredentials: true });
      fetchMessages(q);
    } catch (err) { toast.error('Failed to update'); }
  };

  const deleteOne = async (id) => {
    if (!confirm('Delete this message?')) return;
    try {
      await axios.delete(`http://localhost:5000/api/v1/message/${id}`, { withCredentials: true });
      toast.success('Deleted');
      fetchMessages(q);
    } catch (err) { toast.error('Delete failed'); }
  };

  const bulkDelete = async () => {
    if (selected.length === 0) return toast.info('No messages selected');
    if (!confirm(`Delete ${selected.length} messages?`)) return;
    try {
      await axios.post(`http://localhost:5000/api/v1/message/bulk-delete`, { ids: selected }, { withCredentials: true });
      toast.success('Bulk delete complete');
      setSelected([]);
      fetchMessages(q, page);
    } catch (err) { toast.error('Bulk delete failed'); }
  };

  const doSearch = async () => {
    await fetchMessages(q, 1);
  };

  const goToPage = (p) => {
    if (p < 1 || p > totalPages) return;
    setPage(p);
    fetchMessages(q, p);
  };

  return (
    <section className="page messages">
      <h1>Messages</h1>
      <div style={{ display:'flex', gap: '1rem', alignItems:'center', marginBottom: '1rem' }}>
        <div>All: {counts.total} • Read: {counts.read} • Unread: {counts.unread}</div>
        <input placeholder="Search by message, email or phone" value={q} onChange={e => setQ(e.target.value)} />
        <button onClick={doSearch}>Search</button>
        <button onClick={() => { setQ(''); fetchMessages(); }}>Clear</button>
        <div style={{ marginLeft: 'auto' }}>
          <button onClick={bulkDelete} disabled={selected.length===0}>Delete Selected ({selected.length})</button>
        </div>
      </div>

      <div className="banner">
        {messages && messages.length > 0 ? (
          <>
          {messages.map((m) => (
            <div key={m._id} className="card" style={{ borderLeft: m.read ? '4px solid #e2e8f0' : '4px solid #0ea5a6' }}>
              <div style={{ display:'flex', gap:'1rem', alignItems:'flex-start' }}>
                <input type="checkbox" checked={selected.includes(m._id)} onChange={() => toggleSelect(m._id)} />
                <div className="details" style={{ flex: 1 }}>
                  <p>From: <strong>{m.firstName} {m.lastName}</strong></p>
                  <p>Email: <span>{m.email}</span> • Phone: <span>{m.phone}</span></p>
                  <p>Message: <span>{m.message}</span></p>
                  <p style={{ color:'#94a3b8', fontSize:'0.85rem' }}>Sent: {new Date(m.sentAt || m.createdAt).toLocaleString()}</p>
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:'0.5rem' }}>
                  <button onClick={() => markAsRead(m._id, !m.read)}>{m.read ? 'Mark Unread' : 'Mark Read'}</button>
                  <button onClick={() => deleteOne(m._id)} style={{ color: '#b91c1c' }}>Delete</button>
                </div>
              </div>
            </div>
          ))}
          <div style={{ display:'flex', gap:'0.5rem', justifyContent:'center', marginTop: '0.75rem' }}>
            <button onClick={() => goToPage(page-1)} disabled={page<=1}>Prev</button>
            {Array.from({ length: totalPages }).map((_, i) => (
              <button key={i} onClick={() => goToPage(i+1)} style={{ fontWeight: i+1===page ? '700' : '400' }}>{i+1}</button>
            ))}
            <button onClick={() => goToPage(page+1)} disabled={page>=totalPages}>Next</button>
          </div>
          </>
        ) : (
          <h1>No Messages!</h1>
        )}
      </div>
    </section>
  );
};

export default Messages;
