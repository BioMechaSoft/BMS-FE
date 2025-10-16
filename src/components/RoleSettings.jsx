import React, { useEffect, useState } from "react";
import { FaTrashAlt } from "./RoleIcons";
import { useNavigate } from "react-router-dom";
import api from "../utils/api";
import { toast } from "react-toastify";
import "./Settings.css";

const ROLE_OPTIONS = ["Admin", "Doctor", "Compounder", "Patient"];

const RoleSettings = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const perPage = 20;

  const fetchUsers = async () => {
    setLoading(true);
    try {
  const { data } = await api.get(`/api/v1/user/all`);
      setUsers(data.users || []);
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const filtered = users.filter(u => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (`${u.firstName || ''} ${u.lastName || ''}`.toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q) || (u.role || '').toLowerCase().includes(q));
  });

  const pageCount = Math.max(1, Math.ceil(filtered.length / perPage));
  const pageData = filtered.slice((page - 1) * perPage, page * perPage);

  const handleRoleChange = async (userId, newRole) => {
    try {
  await api.put(`/api/v1/user/role/${userId}`, { role: newRole });
      toast.success("Role updated");
      setUsers((prev) => prev.map(u => u._id === userId ? { ...u, role: newRole } : u));
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to update role');
    }
  };

  return (
    <section className="page">
      <div className="settings-page">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button onClick={() => navigate(-1)} className="back-btn add-btn">← Go Back</button>
          <h2 style={{ margin: 0 }}>Role Management</h2>
        </div>

        <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <input placeholder="Search users by name, email or role" value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} style={{ padding: '0.5rem', flex: 1 }} />
          <button onClick={fetchUsers} style={{ padding: '0.5rem 1rem' }}>Refresh</button>
        </div>

        <div style={{ marginTop: '1.25rem', background: '#fff', padding: '1rem', borderRadius: '8px', overflowX: 'auto' }}>
          {loading ? (
            <div>Loading users...</div>
          ) : (
            <>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ textAlign: 'left', borderBottom: '1px solid #eee' }}>
                    <th style={{ padding: '0.5rem' }}>Name</th>
                    <th style={{ padding: '0.5rem' }}>Email</th>
                    <th style={{ padding: '0.5rem' }}>Role</th>
                    <th style={{ padding: '0.5rem' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pageData.map((u) => (
                    <tr key={u._id} style={{ borderBottom: '1px solid #f5f5f5' }}>
                      <td style={{ padding: '0.75rem' }}>{`${u.firstName || ''} ${u.lastName || ''}`}</td>
                      <td style={{ padding: '0.75rem' }}>{u.email}</td>
                      <td style={{ padding: '0.75rem' }}>
                        <select value={u.role} onChange={(e) => handleRoleChange(u._id, e.target.value)}>
                          {ROLE_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                      </td>
                      <td style={{ padding: '0.75rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <button onClick={() => navigator.clipboard?.writeText(u._id)} style={{ marginRight: '0.5rem' }}>Copy ID</button>
                        <button
                          title="Delete User"
                          style={{ background: 'none', border: 'none', color: '#d32f2f', fontSize: '1.2rem', cursor: 'pointer' }}
                          onClick={async () => {
                            if(window.confirm('Are you sure you want to delete this user?')) {
                              try {
                                await api.delete(`/api/v1/user/user/${u._id}`);
                                toast.success('User deleted');
                                setUsers(users.filter(user => user._id !== u._id));
                              } catch (err) {
                                toast.error('Delete failed');
                              }
                            }
                          }}
                        >
                          <FaTrashAlt />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
                <div>Showing {filtered.length} users</div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <button disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>Prev</button>
                  <div>Page {page} / {pageCount}</div>
                  <button disabled={page >= pageCount} onClick={() => setPage(p => Math.min(pageCount, p + 1))}>Next</button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
};

export default RoleSettings;
