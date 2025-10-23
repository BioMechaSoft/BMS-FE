import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../utils/api";
import "./Settings.css";
import MedicineCard from "./MedicineCard";
import { FaEye, FaPen } from "react-icons/fa";
import { FaTrash } from "react-icons/fa6";

const emptyForm = {
  name: "",
  symptoms: "",
  type: "",
  route: "",
  desese_description: "",
  // nested structured fields
  medicines: [], // { name,type,dose,frequency,route,duration,notes }
  testAdvice: [], // { testName,testType,precautions,testDate }
  medication: "",
  diet: "",
  aliases: "",
  tags: "",
  followupDays: "",
  followupNote: "",
  dose: "",
  frequency: "",
  duration: "",
};

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
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [focusedMedicineIndex, setFocusedMedicineIndex] = useState(null);
  const drawerContentRef = useRef();
  const medicineRowRefs = useRef({});
  const [filterType, setFilterType] = useState('');
  const [filterTag, setFilterTag] = useState('');
  const [filterHasTest, setFilterHasTest] = useState('');
  const [viewingAdvice, setViewingAdvice] = useState(null);

  useEffect(() => {
    fetchMedicines();
  }, []);

  // When drawer opens and a focused medicine index exists, scroll it into view
  useEffect(() => {
    if (!drawerOpen) return;
    if (focusedMedicineIndex === null || focusedMedicineIndex === undefined) return;
    // small timeout to wait for drawer mount/render
    setTimeout(() => {
      const el = medicineRowRefs.current && medicineRowRefs.current[focusedMedicineIndex];
      if (el && typeof el.scrollIntoView === 'function') {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // try focusing first input inside the row
        const input = el.querySelector('input, textarea');
        if (input) input.focus();
      }
    }, 120);
  }, [drawerOpen, focusedMedicineIndex]);

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
        // nested
        medicines: Array.isArray(form.medicines) ? form.medicines.map(m => ({
          name: m.name || "",
          type: m.type || "",
          dose: m.dose || "",
          frequency: m.frequency || "",
          route: m.route || "",
          duration: m.duration || "",
          notes: m.notes || "",
        })) : [],
        testAdvice: Array.isArray(form.testAdvice) ? form.testAdvice.map(t => ({
          testName: t.testName || "",
          testType: t.testType || "",
          precautions: t.precautions || "",
          testDate: t.testDate || "",
        })) : [],
        medication: form.medication || "",
        diet: form.diet || "",
        aliases: form.aliases.split(",").map(s => s.trim()).filter(Boolean),
        tags: form.tags.split(",").map(s => s.trim()).filter(Boolean),
        followup: {
          days: form.followupDays ? parseInt(form.followupDays, 10) : undefined,
          note: form.followupNote || "",
        },
        dose: form.dose || "",
        frequency: form.frequency || "",
        duration: form.duration || "",
      };
      if (editingId) {
  await api.put(`/api/v1/medical/${editingId}`, payload);
      } else {
  await api.post(`/api/v1/medical/`, payload);
      }
      setForm(emptyForm);
  setEditingId(null);
  // clear focused medicine selection and refs after save
  setFocusedMedicineIndex(null);
  medicineRowRefs.current = {};
      await fetchMedicines();
    } catch (err) {
      setError("Failed to save medicine");
    } finally {
      setSaving(false);
    }
  };

  // Nested handlers for medicines
  const addMedicineRow = () => setForm(prev => ({ ...prev, medicines: [ ...(prev.medicines || []), { name: '', type: '', dose: '', frequency: '', route: '', duration: '', notes: '' } ] }));
  const updateMedicineRow = (idx, field, value) => setForm(prev => ({ ...prev, medicines: prev.medicines.map((m, i) => i===idx ? { ...m, [field]: value } : m) }));
  const removeMedicineRow = (idx) => setForm(prev => ({ ...prev, medicines: prev.medicines.filter((_, i) => i !== idx) }));

  // Nested handlers for testAdvice
  const addTestRow = () => setForm(prev => ({ ...prev, testAdvice: [ ...(prev.testAdvice || []), { testName: '', testType: '', precautions: '', testDate: '' } ] }));
  const updateTestRow = (idx, field, value) => setForm(prev => ({ ...prev, testAdvice: prev.testAdvice.map((t, i) => i===idx ? { ...t, [field]: value } : t) }));
  const removeTestRow = (idx) => setForm(prev => ({ ...prev, testAdvice: prev.testAdvice.filter((_, i) => i !== idx) }));

  const handleEdit = (m) => {
    setEditingId(m._1 || m._id || m.id || null);
    setForm({
      name: m.name || "",
      symptoms: (m.symptoms || []).join(", "),
      type: m.type || "",
      route: m.route || "",
      desese_description: m.desese_description || "",
      medicines: Array.isArray(m.medicines) ? m.medicines.map(x => ({ ...x })) : [],
      testAdvice: Array.isArray(m.testAdvice) ? m.testAdvice.map(x => ({ ...x })) : [],
      medication: m.medication || "",
      diet: m.diet || "",
      aliases: (m.aliases || []).join(', '),
      tags: (m.tags || []).join(', '),
      followupDays: m.followup?.days ? String(m.followup.days) : "",
      followupNote: m.followup?.note || "",
      dose: m.dose || "",
      frequency: m.frequency || "",
      duration: m.duration || "",
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Open drawer and focus a specific medicine row inside form
  const handleEditMedicineRow = (medicineOwner, medIndex) => {
    // medicineOwner is the parent advice object; medIndex is the index inside its medicines array
    const id = medicineOwner._1 || medicineOwner._id || medicineOwner.id || null;
    handleEdit(medicineOwner);
    setFocusedMedicineIndex(medIndex);
    setDrawerOpen(true);
    // scroll/focus will be handled after drawer mounts via useEffect
  };

  const handleOpenEditDrawer = (advice) => {
    handleEdit(advice);
    setDrawerOpen(true);
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

  // Helper to get a consistent color for a given string (e.g., medicine type)
  const getColorForString = (str) => {
    if (!str) return '#d1d5db'; // gray for empty
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = hash % 360;
    return `hsl(${hue}, 60%, 88%)`;
  };


  return (
    <section className="page">
      <>
  <div className="settings-page medicine-page" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button onClick={() => navigate(-1)} className="back-btn">←</button>
              <div>
                <h2 style={{ margin: 0 }}>Medicine Catalog</h2>
                <div className="muted">Create, search and manage medicines used in prescriptions.</div>
              </div>
            </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input className="search-input" placeholder="Search by name, symptom or type" value={search} onChange={e => setSearch(e.target.value)} style={{ minWidth: 280 }} />
              <button className="add-btn" onClick={() => { setForm(emptyForm); setEditingId(null); setDrawerOpen(true); }}>Create Medical Advice</button>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="filter-bar">
            <div className="filter-group">
              <label className="muted">Type</label>
              <select onChange={e => setFilterType(e.target.value)} value={filterType}>
                <option value="">All Types</option>
                {Array.from(new Set((medicines || []).map(m => m.type).filter(Boolean))).sort().map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="filter-group">
              <label className="muted">Tag</label>
              <input placeholder="Filter by tag" value={filterTag || ''} onChange={e => setFilterTag(e.target.value)} />
            </div>
            <div className="filter-group">
              <label className="muted">Has Tests</label>
              <select value={filterHasTest || ''} onChange={e => setFilterHasTest(e.target.value)}>
                <option value="">Either</option>
                <option value="yes">With Tests</option>
                <option value="no">No Tests</option>
              </select>
            </div>
            <button className="clear-btn" onClick={() => { setFilterTag(''); setFilterType(''); setFilterHasTest(''); }}>Reset Filters</button>
          </div>

          {/* Main content: list and pagination */}
          <main style={{ flex: 1, marginTop: '1rem' }}>
            <div className="medicine-list-container">
              {loading ? (
                Array.from({ length: 6 }).map((_, idx) => (
                  <div key={`ph-${idx}`} className="medicine-list-item-skeleton">
                    <div className="muted">Loading...</div>
                  </div>
                ))
              ) : (
                (medicines || [])
                  .filter(m => !filterType || m.type === filterType)
                  .filter(m => !filterTag || (m.tags || []).some(t => t.toLowerCase().includes(filterTag.toLowerCase())))
                  .filter(m => !filterHasTest || (filterHasTest === 'yes' ? (m.testAdvice && m.testAdvice.length > 0) : !(m.testAdvice && m.testAdvice.length > 0)))
                  .map((m, idx) => (
                    <div key={m._id || idx} className="medicine-list-item" onClick={() => { handleEdit(m); setDrawerOpen(true); }}>
                      <div className="medicine-info">
                        <span className="medicine-name">{m.name || '—'}</span>
                        <span className="medicine-symptoms muted">{(m.symptoms || []).slice(0, 4).join(', ')}</span>
                      </div>
                      <div className="medicine-type-badge" style={{ backgroundColor: getColorForString(m.type) }}>
                        {m.type || 'N/A'}
                      </div>
                      <div className="medicine-actions">
                        <div style={{ fontWeight: 600, minWidth: '120px' }}>
                          {(m.medicines || []).length > 0 ? `${m.medicines.length} medicine(s)` : 'No medicines'}
                        </div>
                        <div style={{ minWidth: '100px' }}>
                          {(m.testAdvice || []).length > 0 ? `${m.testAdvice.length} test(s)` : 'No tests'}
                        </div>
                        <div className="action-buttons">
                          <FaEye title="View Details" className="icon-btn" onClick={(e) => { e.stopPropagation(); setViewingAdvice(m); }} />
                          <FaPen title="Edit" className="icon-btn secondary" onClick={(e) => { e.stopPropagation(); handleOpenEditDrawer(m); }} />
                          <FaTrash title="Delete" className="icon-btn remove-btn" onClick={(e) => { e.stopPropagation(); handleDelete(m._id); }}/>
                        </div>
                      </div>
                    </div>
                  ))
              )}
            </div>

            <div style={{ marginTop: 12 }}>
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
          </main>
        </div>

        {/* View Details Modal */}
        {viewingAdvice && (
          <MedicineCard
            advice={viewingAdvice}
            onClose={() => setViewingAdvice(null)}
            onEdit={handleOpenEditDrawer}
          />
        )}
        {/* Drawer for create/edit */}
        {drawerOpen && (
          <div className="edit-drawer">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0 }}>{editingId ? 'Edit Medicine' : 'Add New Medicine'}</h3>
              <div>
                <button className="clear-btn" onClick={() => { setDrawerOpen(false); setForm(emptyForm); setEditingId(null); setFocusedMedicineIndex(null); medicineRowRefs.current = {}; }}>Close</button>
              </div>
            </div>
            <div style={{ marginTop: 12 }}>
              {/* Insert original form fields here by reusing the form JSX: */}
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

                {/* Structured nested fields */}
                <h4>Structured Medicines (optional)</h4>
                {(form.medicines || []).map((m, idx) => (
                  <div
                    key={idx}
                    ref={el => { medicineRowRefs.current[idx] = el; }}
                    style={{
                      display: 'flex',
                      gap: 8,
                      marginBottom: 6,
                      alignItems: 'center',
                      padding: focusedMedicineIndex === idx ? 8 : 0,
                      borderRadius: focusedMedicineIndex === idx ? 6 : 0,
                      background: focusedMedicineIndex === idx ? '#fff7ed' : 'transparent',
                    }}
                  >
                    <input placeholder="Name" value={m.name} onChange={e => updateMedicineRow(idx, 'name', e.target.value)} />
                    <input placeholder="Type" value={m.type} onChange={e => updateMedicineRow(idx, 'type', e.target.value)} />
                    <input placeholder="Dose" value={m.dose} onChange={e => updateMedicineRow(idx, 'dose', e.target.value)} />
                    <input placeholder="Freq" value={m.frequency} onChange={e => updateMedicineRow(idx, 'frequency', e.target.value)} />
                    <input placeholder="Route" value={m.route} onChange={e => updateMedicineRow(idx, 'route', e.target.value)} />
                    <input placeholder="Duration" value={m.duration} onChange={e => updateMedicineRow(idx, 'duration', e.target.value)} />
                    <input placeholder="Notes" value={m.notes} onChange={e => updateMedicineRow(idx, 'notes', e.target.value)} />
                    <button type="button" className="remove-btn" onClick={() => removeMedicineRow(idx)}>Remove</button>
                  </div>
                ))}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="button" className="add-btn" onClick={addMedicineRow}>Add Medicine Row</button>
                </div>

                <h4>Structured Test Advice (optional)</h4>
                {(form.testAdvice || []).map((t, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: 8, marginBottom: 6, alignItems: 'center' }}>
                    <input placeholder="Test Name" value={t.testName} onChange={e => updateTestRow(idx, 'testName', e.target.value)} />
                    <input placeholder="Type" value={t.testType} onChange={e => updateTestRow(idx, 'testType', e.target.value)} />
                    <input placeholder="Precautions" value={t.precautions} onChange={e => updateTestRow(idx, 'precautions', e.target.value)} />
                    <input placeholder="Date" type="date" value={t.testDate} onChange={e => updateTestRow(idx, 'testDate', e.target.value)} />
                    <button type="button" className="remove-btn" onClick={() => removeTestRow(idx)}>Remove</button>
                  </div>
                ))}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="button" className="add-btn" onClick={addTestRow}>Add Test Row</button>
                </div>

                <label>Medication (text)</label>
                <textarea name="medication" value={form.medication} onChange={handleChange} rows={2} />

                <label>Diet (text)</label>
                <textarea name="diet" value={form.diet} onChange={handleChange} rows={2} />

                <label>Aliases (comma separated)</label>
                <input name="aliases" value={form.aliases} onChange={handleChange} />

                <label>Tags (comma separated)</label>
                <input name="tags" value={form.tags} onChange={handleChange} />

                <label>Follow-up days</label>
                <input name="followupDays" value={form.followupDays} onChange={handleChange} type="number" />

                <label>Follow-up note</label>
                <input name="followupNote" value={form.followupNote} onChange={handleChange} />

                <label>Default Dose</label>
                <input name="dose" value={form.dose} onChange={handleChange} />

                <label>Default Frequency</label>
                <input name="frequency" value={form.frequency} onChange={handleChange} />

                <label>Default Duration</label>
                <input name="duration" value={form.duration} onChange={handleChange} />

                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                  <button className="add-btn" type="submit" disabled={saving}>{saving ? 'Saving...' : (editingId ? 'Update' : 'Create')}</button>
                  <button type="button" className="clear-btn" onClick={clearForm}>Clear</button>
                </div>
                {error && <div className="error">{error}</div>}
              </form>
            </div>
          </div>
        )}
        <footer className="settings-footer">PathologyLab Dashboard • © {new Date().getFullYear()}</footer>
      </>
    </section>
  );
};

export default MedicineSettings;
