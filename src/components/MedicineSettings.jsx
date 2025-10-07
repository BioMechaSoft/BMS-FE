import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../utils/api";
import "./Settings.css";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
// import {fa-solid fa-pen} from "@fortawesome/free-solid-svg-icons";

const emptyForm = { name: "", symptoms: "", type: "", route: "", desese_description: "" };

const MedicineSettings = () => {
  const navigate = useNavigate();
  const [medicines, setMedicines] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const searchRef = useRef();

  useEffect(() => {
    fetchMedicines();
  }, []);

  useEffect(() => {
    // debounce search
    if (searchRef.current) clearTimeout(searchRef.current);
    searchRef.current = setTimeout(() => {
      if (!search) fetchMedicines();
      else searchMedicines(search);
    }, 400);
    return () => clearTimeout(searchRef.current);
  }, [search]);

  const fetchMedicines = async () => {
    setLoading(true);
    setError("");
    try {
  const { data } = await api.get(`/api/v1/medical/`, { params: { page, limit: 10 } });
      setMedicines(data.advices || []);
      setPage(data.page || 1);
      setTotalPages(data.totalPages || 1);
    } catch (e) {
      setError("Failed to load medicines");
    } finally {
      setLoading(false);
    }
  };

  const searchMedicines = async (q) => {
    setLoading(true);
    try {
  const { data } = await api.get(`/api/v1/medical/search`, { params: { q, page: 1, limit: 10 } });
      setMedicines(data.advices || []);
      setPage(data.page || 1);
      setTotalPages(data.totalPages || 1);
    } catch (e) {
      // if backend returns 404 for no results, clear list
      if (e.response && e.response.status === 404) setMedicines([]);
      else setError("Search failed");
    } finally {
      setLoading(false);
    }
  };

  const goToPage = async (p) => {
    if (p < 1 || p > totalPages) return;
    setPage(p);
    setLoading(true);
    setError("");
    try {
      const params = { page: p, limit: 10 };
      if (search) params.q = search;
  const { data } = await api.get(search ? `/api/v1/medical/search` : `/api/v1/medical/`, { params });
      setMedicines(data.advices || []);
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      setError('Failed to load page');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const payload = {
        name: form.name,
        symptoms: form.symptoms.split(",").map(s => s.trim()).filter(Boolean),
        type: form.type,
        route: form.route,
        desese_description: form.desese_description,
      };
      if (editingId) {
  await api.put(`/api/v1/medical/${editingId}`, payload);
      } else {
  await api.post(`/api/v1/medical/`, payload);
      }
      setForm(emptyForm);
      setEditingId(null);
      await fetchMedicines();
    } catch (err) {
      setError("Failed to save medicine");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (m) => {
    setEditingId(m._id);
    setForm({ name: m.name || "", symptoms: (m.symptoms || []).join(", "), type: m.type || "", route: m.route || "", desese_description: m.desese_description || "" });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this medicine?")) return;
    try {
  await api.delete(`/api/v1/medical/${id}`);
      setMedicines(prev => prev.filter(p => p._id !== id));
    } catch (e) {
      setError("Failed to delete");
    }
  };

  const clearForm = () => { setForm(emptyForm); setEditingId(null); setError(""); };

  return (
    <section className="page">
      <>
        <div className="settings-page medicine-page">
          <div className="settings-header">
            <button onClick={() => navigate(-1)} className="back-btn add-btn">← Go Back</button>
            <h2>Medicine Catalog</h2>
            <p className="muted">Create, search and manage medicines used in prescriptions.</p>
          </div>

          <div className="medicine-grid">
            <div className="medicine-form-card">
              <h3>{editingId ? 'Edit Medicine' : 'Add New Medicine'}</h3>
              <form onSubmit={handleSubmit} className="medicine-form">
                <label>Name</label>
                <input name="name" value={form.name} onChange={handleChange} required />

                <label>Symptoms (comma separated)</label>
                <input name="symptoms" value={form.symptoms} onChange={handleChange} placeholder="fever, cough" />

                <label>Type</label>
                <input name="type" value={form.type} onChange={handleChange} placeholder="Antibiotic, Analgesic..." />

                <label>Route</label>
                <input name="route" value={form.route} onChange={handleChange} placeholder="oral, iv, topical..." />

                <label>Description</label>
                <textarea name="desese_description" value={form.desese_description} onChange={handleChange} rows={4} />

                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                  <button className="add-btn" type="submit" disabled={saving}>{saving ? 'Saving...' : (editingId ? 'Update' : 'Create')}</button>
                  <button type="button" className="clear-btn" onClick={clearForm}>Clear</button>
                </div>
                {error && <div className="error">{error}</div>}
              </form>
            </div>

            <div className="medicine-list-card">
              <div className="list-header">
                <input className="search-input" placeholder="Search by name, symptom or type" value={search} onChange={e => setSearch(e.target.value)} />
                <button className="add-btn" onClick={() => { setForm(emptyForm); setEditingId(null); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>+ New</button>
              </div>

              <div className="list-body">
                {loading ? <div>Loading...</div> : (
                  medicines.length === 0 ? <div className="muted">No medicines found</div> : (
                    <table className="medicine-table">
                      <thead>
                        <tr><th>Name</th><th>Symptoms</th><th>Type</th><th>Route</th><th>Description</th><th>Actions</th></tr>
                      </thead>
                      <tbody>
                        {medicines.map(m => (
                          <tr key={m._id}>
                            <td>{m.name}</td>
                            <td>{(m.symptoms || []).slice(0, 3).join(', ')}</td>
                            <td>{m.type}</td>
                            <td>{m.route}</td>
                            <td title={m.desese_description}>{m.desese_description?.slice(0, 80)}</td>
                            <td className="td-button-box">
                              <button className="secondary" onClick={() => handleEdit(m)}>Edit</button>
                              <button className="remove-btn" onClick={() => handleDelete(m._id)}>Delete</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )
                )}
              </div>
              <div className="list-footer">
                <div className="pagination">
                  <button disabled={page <= 1} onClick={() => goToPage(page - 1)}>Prev</button>
                  {Array.from({ length: totalPages }).slice(0, 7).map((_, idx) => {
                    const p = idx + 1;
                    return (
                      <button key={p} className={p === page ? 'active' : ''} onClick={() => goToPage(p)}>{p}</button>
                    );
                  })}
                  <button disabled={page >= totalPages} onClick={() => goToPage(page + 1)}>Next</button>
                </div>
                <div className="footer-note">Showing page {page} of {totalPages}</div>
              </div>
            </div>
          </div>
        </div>
        <footer className="settings-footer">PathologyLab Dashboard • © {new Date().getFullYear()}</footer>
      </>
    </section>
  );
};

export default MedicineSettings;
