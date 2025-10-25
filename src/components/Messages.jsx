import api from "../utils/api";
import React, { useContext, useEffect, useState, useMemo } from "react";
import { toast } from "react-toastify";
import { Context } from "../main";
import { Navigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { fetchMessagesRequest, setMessages } from "../store/messagesSlice";
import useSound from "use-sound";
import {
  FaSearch,
  FaTrash,
  FaEnvelope,
  FaEnvelopeOpen,
  FaRedo,
} from "react-icons/fa";
import {
  MdOutlineMarkEmailRead,
  MdOutlineMarkEmailUnread,
} from "react-icons/md";
import { IoIosArrowBack, IoIosArrowForward } from "react-icons/io";

const Messages = () => {
  const [selected, setSelected] = useState([]);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const dispatch = useDispatch();
  const messagesState = useSelector((s) => s.messages);
  const messages = messagesState.messages || [];
  const totalPages = messagesState.totalPages || 1;
  const counts = messagesState.counts || { total:0, read:0, unread:0 };
  const { isAuthenticated, user } = useContext(Context);

  // Note: Sound file should be in the `public` directory.
  const [playDeleteSound] = useSound("../delete.mp3");

  const messageIdsOnPage = useMemo(() => messages.map((m) => m._id), [messages]);

  useEffect(() => {
    dispatch(fetchMessagesRequest({ q, page }));
  }, [page, dispatch]);

  const doSearch = () => {
    dispatch(fetchMessagesRequest({ q, page: 1 }));
  };

  if (!isAuthenticated) {
    return <Navigate to={"/login"} />;
  }

  const toggleSelect = (id) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selected.length === messageIdsOnPage.length) {
      setSelected([]);
    } else {
      setSelected(messageIdsOnPage);
    }
  };

  const markAsRead = async (id, val = true) => {
    try {
      await api.put(`/api/v1/message/${id}`, { read: val });
      // Optimistic UI update
      const updatedMessages = messages.map((m) =>
        m._id === id ? { ...m, read: val } : m
      );
      dispatch(setMessages({ messages: updatedMessages, totalPages, counts: { ...counts, read: val ? counts.read + 1 : counts.read - 1, unread: val ? counts.unread - 1 : counts.unread + 1 } }));
    } catch (err) {
      toast.error("Failed to update");
    }
  };

  const bulkMarkAsRead = async (val = true) => {
    if (selected.length === 0) return toast.info("No messages selected");
    try {
      await api.post(`/api/v1/message/bulk-update`, { ids: selected, read: val });
      setSelected([]);
      dispatch(fetchMessagesRequest({ q, page })); // Full refresh
    } catch (err) {
      toast.error("Failed to update");
    }
  };

  const deleteOne = async (id) => {
    if (!confirm("Delete this message?")) return;
    try {
      await api.delete(`/api/v1/message/${id}`);
      toast.success("Deleted");
      playDeleteSound?.();
      // Optimistic UI update
      const updatedMessages = messages.filter((m) => m._id !== id);
      dispatch(setMessages({ messages: updatedMessages, totalPages, counts: { ...counts, total: counts.total - 1 } }));
    } catch (err) {
      toast.error("Delete failed");
    }
  };

  const bulkDelete = async () => {
    if (selected.length === 0) return toast.info("No messages selected");
    if (!confirm(`Delete ${selected.length} messages?`)) return;
    try {
      await api.post(`/api/v1/message/bulk-delete`, { ids: selected });
      toast.success("Bulk delete complete");
      playDeleteSound?.();
      setSelected([]);
      dispatch(fetchMessagesRequest({ q, page }));
    } catch (err) {
      toast.error("Bulk delete failed");
    }
  };

  const clearSearch = () => {
    setQ("");
    setPage(1);
  };

  const goToPage = (p) => {
    if (p < 1 || p > totalPages) return;
    setPage(p);
    dispatch(fetchMessagesRequest({ q, page: p }));
  };

  return (
    <section className="page messages">
      <h1>Messages</h1>
      {user && user.role !== "admin" && (
        <p>You are viewing messages you have sent.</p>
      )}
      <div className="info-section">
        <div>All: {counts.total} • Read: {counts.read} • Unread: {counts.unread}</div>
        <div className="search-section">
          <input placeholder="Search by email or phone" value={q} onChange={e => setQ(e.target.value)} style={{border:'none', borderRadius:'0.175rem', padding:'3px 5px', minWidth:'12rem', cursor:'pointer'}}/>
          <button className="add-btn" onClick={doSearch} style={{border:'none', borderRadius:'0.175rem', padding:'3px 5px', cursor:'pointer'}}>Search</button>
          <button onClick={clearSearch} style={{border:'1px solid #666', borderRadius:'0.175rem', padding:'3px 5px', cursor:'pointer'}}>Clear</button>
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <input type="checkbox" checked={selected.length > 0 && selected.length === messageIdsOnPage.length} onChange={toggleSelectAll} style={{marginRight: '1rem'}}/>
          <button onClick={() => bulkMarkAsRead(true)} disabled={selected.length===0} className="secondary">
            Mark Read ({selected.length})
          </button>
          <button onClick={() => bulkMarkAsRead(false)} disabled={selected.length===0} className="secondary" style={{marginLeft: '0.5rem'}}>
            Mark Unread ({selected.length})
          </button>
          <button onClick={bulkDelete} disabled={selected.length===0} className="remove-btn" style={{backgroundColor: "#ffbcc4ff",color:'#b10c0cff', marginLeft: '0.5rem'}}>Delete Selected ({selected.length})</button>
        </div>
      </div>

      <div className="banner">
        {messages && messages.length > 0 ? (
          <>
          {messages.map((m) => (
            <div key={m._id} className="card" style={{ borderLeft: m.read ? '4px solid #e2e8f0' : '4px solid #0ea5a6' }}>
              <div style={{ display:'flex', padding: '5px', gap:'1rem', alignItems:'flex-start' }}>
                <input type="checkbox" checked={selected.includes(m._id)} onChange={() => toggleSelect(m._id)} />
                <div className="details" style={{ flex: 1 }}>
                  <p>From: <strong>{m.firstName} {m.lastName}</strong></p>
                  <p>Email: <span>{m.email}</span> • Phone: <span>{m.phone}</span></p>
                  <p>Message: <span>{m.message}</span></p>
                  <p style={{ color:'#94a3b8', fontSize:'0.85rem' }}>Sent: {new Date(m.createdAt).toLocaleString()}</p>
                </div>
                {user && user.role === 'admin' && (
                  <div style={{ display:'flex', flexDirection:'row', gap:'0.5rem' }}>
                    <button className="secondary" onClick={() => markAsRead(m._id, !m.read)}>{m.read ? 'Mark Unread' : 'Mark Read'}</button>
                    <button className="remove-btn" onClick={() => deleteOne(m._id)} style={{ color: '#b91c1c' }}>Delete</button>
                  </div>
                )}
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
