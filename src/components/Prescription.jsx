import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./Prescription.css";

// Clean, single-component Prescription (5-step slider)
const Prescription = ({ patientId, onClose }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);
  const [appointmentId, setAppointmentId] = useState("");
  const [nic, setNic] = useState("");
  const [bookedBy, setBookedBy] = useState("");
  const [initialComplain, setInitialComplain] = useState("");
  const [medicalHistory, setMedicalHistory] = useState("");
  const [diagnosys, setDiagnosys] = useState({ BP: "", Diabetics: "", SPO2: "", Height: "", Weight: "", Others: "" });
  const [medicineAdvice, setMedicineAdvice] = useState([]);
  const [autoPopulating, setAutoPopulating] = useState(false);
  const [advice, setAdvice] = useState("");
  const [doctorId, setDoctorId] = useState("");
  const [doctorContact, setDoctorContact] = useState("");
  const [doctorsList, setDoctorsList] = useState([]);

  const steps = ["Patient", "Vitals & History", "Medicines", "Advice", "Review"];

  useEffect(() => {
    const fetchLatestAppointment = async () => {
      try {
        const { data } = await axios.get(`http://localhost:5000/api/v1/appointment/patient/${patientId}`);
        const appointments = data.appointments || [];
        if (!appointments.length) return setLoading(false);
        appointments.sort((a, b) => new Date(b.appointment_date) - new Date(a.appointment_date));
        const latest = appointments[0];
        setAppointmentId(latest._id);
        setNic(latest.nic || "");
        setBookedBy(latest.bookedBy || "");
        setDoctorId(latest.doctorId || "");
        if (latest.result && latest.result.length) {
          const r = latest.result[0];
          setInitialComplain(r.initialComplain || "");
          setMedicalHistory(r.medicalHistory || "");
          setDiagnosys(r.diagnosys || { BP: "", Diabetics: "", SPO2: "", Height: "", Weight: "", Others: "" });
          setMedicineAdvice(Array.isArray(r.medicineAdvice) ? r.medicineAdvice : (r.medicineAdvice ? [r.medicineAdvice] : []));
          setAdvice(r.advice || "");
        }
      } catch (e) {
        // ignore
      } finally {
        setLoading(false);
      }
    };

    if (patientId) fetchLatestAppointment();
  }, [patientId]);

  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        const { data } = await axios.get("http://localhost:5000/api/v1/user/doctors/list");
        setDoctorsList(data.doctors || []);
      } catch (e) {}
    };
    fetchDoctors();
  }, []);

  useEffect(() => {
    if (!doctorId) return;
    (async () => {
      try {
        const { data } = await axios.get(`http://localhost:5000/api/v1/user/doctor/${doctorId}`);
        setDoctorContact(data.doctor?.email || data.doctor?.phone || "");
      } catch (e) {}
    })();
  }, [doctorId]);

  // Auto-populate medicines when initialComplain changes (debounced)
  useEffect(() => {
    if (!initialComplain || initialComplain.trim().length < 3) return; // wait for meaningful input
    // don't overwrite manual medicines
    if (medicineAdvice && medicineAdvice.length > 0) return;

    const id = setTimeout(() => {
      autoPopulateFromComplaint(initialComplain);
    }, 600);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialComplain]);

  // score results to pick the most relevant medicines
  const scoreAdvice = (adviceObj, q) => {
    const text = ((adviceObj.name || "") + " " + (adviceObj.desese_description || "") + " " + (adviceObj.type || "") + " " + (adviceObj.route || "") + " " + (adviceObj.symptoms || []).join(" ")).toLowerCase();
    const tokens = (q || "").toLowerCase().split(/\W+/).filter(Boolean);
    let score = 0;
    tokens.forEach(t => {
      if (!t) return;
      if (text.includes(t)) score += 1;
      if ((adviceObj.symptoms || []).some(s => s.toLowerCase().includes(t))) score += 2;
      if ((adviceObj.name || "").toLowerCase() === t) score += 2;
    });
    return score;
  };

  const autoPopulateFromComplaint = async (query, force = false) => {
    if (!query || (!force && medicineAdvice.length > 0)) return;
    setAutoPopulating(true);
    try {
      const { data } = await axios.get(`http://localhost:5000/api/v1/medical/search`, { params: { q: query } });
      const advices = data.advices || [];
      if (!advices.length) return;
      const scored = advices.map(a => ({ a, score: scoreAdvice(a, query) }));
      scored.sort((x, y) => y.score - x.score);
      const top = scored.filter(s => s.score > 0).slice(0, 6).map(s => s.a);
      if (!top.length) return;
      const meds = top.map(t => ({
        name: t.name || "",
        type: t.type || "",
        dose: "",
        frequency: "",
        route: t.route || "",
        duration: "",
      }));
      if (force) setMedicineAdvice(meds);
      else setMedicineAdvice(prev => (prev && prev.length ? prev : meds));
    } catch (e) {
      // ignore
    } finally {
      setAutoPopulating(false);
    }
  };

  const handleSave = async (printAfter = false) => {
    try {
      if (!appointmentId) return alert("No appointment found to attach the prescription to.");
      await axios.put(`http://localhost:5000/api/v1/appointment/patient/update/${patientId}`, {
        result: [{ initialComplain, medicalHistory, diagnosys, medicineAdvice, advice }],
        status: "Completed",
        doctorId: doctorId || undefined
      });
      if (doctorContact) {
        await axios.post("http://localhost:5000/api/v1/message/send", {
          firstName: "System",
          lastName: "Notification",
          email: doctorContact.includes("@") ? doctorContact : "",
          phone: doctorContact.includes("@") ? "01234567891" : doctorContact,
          message: `Prescription completed for patient NIC: ${nic}`
        });
      }
      if (printAfter) {
        if (onClose) onClose();
        navigate(`/preview/${patientId}`);
      } else {
        if (onClose) onClose();
      }
    } catch (e) {
      alert("Failed to save prescription or notify doctor.");
    }
  };

  if (loading) return <div>Loading...</div>;

  const nextStep = () => setCurrentStep(s => Math.min(s + 1, steps.length - 1));
  const prevStep = () => setCurrentStep(s => Math.max(s - 1, 0));
  const goToStep = i => setCurrentStep(i);

  return (
    <section className="page">
      <div className="container">
        <div className="header">Prescription</div>

        <ul className="progressbar">
          {steps.map((label, idx) => (
            <li key={label} className={`${idx < currentStep ? 'completed' : ''} ${idx === currentStep ? 'active' : ''}`} onClick={() => goToStep(idx)}>
              <span className="step-label">{label}</span>
            </li>
          ))}
        </ul>

        <div className="form-main">
          <div className="steps-slider">
            <div className="slides" style={{ display: 'flex', width: `${steps.length * 100}%`, transform: `translateX(-${currentStep * (100/steps.length)}%)`, transition: 'transform 320ms ease' }}>

              {/* 0 - Patient */}
              <div className="step-slide" style={{ flex: `0 0 ${100/steps.length}%` }}>
                <div className={`form-step ${currentStep === 0 ? 'active' : ''}`}>
                  <div className="form-group"><label>NIC</label><input value={nic} readOnly disabled /></div>
                  <div className="form-group"><label>Patient ID</label><input value={patientId} readOnly disabled /></div>
                  <div className="form-group"><label>Booked By</label><input value={bookedBy} readOnly disabled /></div>
                  <div className="form-group">
                    <label>Doctor</label>
                    <select value={doctorId} onChange={e => setDoctorId(e.target.value)}>
                      <option value="">-- Select Doctor --</option>
                      {doctorsList.map(d => <option key={d._id || d.id} value={d._1 || d.id}>{d.name || d.fullName || d.displayName}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* 1 - Vitals & History */}
              <div className="step-slide" style={{ flex: `0 0 ${100/steps.length}%` }}>
                <div className={`form-step ${currentStep === 1 ? 'active' : ''}`}>
                  <div className="form-group full-width"><label>Initial Complain</label>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <input style={{ flex: 1 }} value={initialComplain} onChange={e => setInitialComplain(e.target.value)} />
                      <button type="button" className="add-btn" onClick={() => autoPopulateFromComplaint(initialComplain, true)} disabled={!initialComplain || initialComplain.trim().length < 2}>{autoPopulating ? 'Populating...' : 'Auto-populate'}</button>
                    </div>
                  </div>
                  <div className="form-group full-width"><label>Medical History</label><input value={medicalHistory} onChange={e => setMedicalHistory(e.target.value)} /></div>
                  <div className="form-row">
                    <div className="form-group"><label>BP</label><input value={diagnosys.BP} onChange={e => setDiagnosys({ ...diagnosys, BP: e.target.value })} /></div>
                    <div className="form-group"><label>Diabetics</label><input value={diagnosys.Diabetics} onChange={e => setDiagnosys({ ...diagnosys, Diabetics: e.target.value })} /></div>
                    <div className="form-group"><label>SPO2</label><input value={diagnosys.SPO2} onChange={e => setDiagnosys({ ...diagnosys, SPO2: e.target.value })} /></div>
                    <div className="form-group"><label>Height</label><input value={diagnosys.Height} onChange={e => setDiagnosys({ ...diagnosys, Height: e.target.value })} /></div>
                    <div className="form-group"><label>Weight</label><input value={diagnosys.Weight} onChange={e => setDiagnosys({ ...diagnosys, Weight: e.target.value })} /></div>
                    <div className="form-group"><label>Others</label><input value={diagnosys.Others} onChange={e => setDiagnosys({ ...diagnosys, Others: e.target.value })} /></div>
                  </div>
                </div>
              </div>

              {/* 2 - Medicines */}
              <div className="step-slide" style={{ flex: `0 0 ${100/steps.length}%` }}>
                <div className={`form-step ${currentStep === 2 ? 'active full-step' : ''}`}>
                  <div className="form-group full-width medicine-section">
                    <label>Medicine Advice</label>
                    <div className="medicines-list">
                      {medicineAdvice.map((m, idx) => (
                        <div className="medicine-row" key={idx}>
                          <input placeholder="Name" value={m.name || ''} onChange={e => { const copy = [...medicineAdvice]; copy[idx] = { ...copy[idx], name: e.target.value }; setMedicineAdvice(copy); }} />
                          <input placeholder="Type" value={m.type || ''} onChange={e => { const copy = [...medicineAdvice]; copy[idx] = { ...copy[idx], type: e.target.value }; setMedicineAdvice(copy); }} />
                          <input placeholder="Dose" value={m.dose || ''} onChange={e => { const copy = [...medicineAdvice]; copy[idx] = { ...copy[idx], dose: e.target.value }; setMedicineAdvice(copy); }} />
                          <input placeholder="Frequency" value={m.frequency || ''} onChange={e => { const copy = [...medicineAdvice]; copy[idx] = { ...copy[idx], frequency: e.target.value }; setMedicineAdvice(copy); }} />
                          <input placeholder="Route" value={m.route || ''} onChange={e => { const copy = [...medicineAdvice]; copy[idx] = { ...copy[idx], route: e.target.value }; setMedicineAdvice(copy); }} />
                          <input placeholder="Duration" value={m.duration || ''} onChange={e => { const copy = [...medicineAdvice]; copy[idx] = { ...copy[idx], duration: e.target.value }; setMedicineAdvice(copy); }} />
                          <button type="button" className="remove-btn" onClick={() => { const copy = [...medicineAdvice]; copy.splice(idx, 1); setMedicineAdvice(copy); }}>Remove</button>
                        </div>
                      ))}
                      <div className="medicine-actions">
                        <button type="button" className="add-btn" onClick={() => setMedicineAdvice([...medicineAdvice, { name: '', type: '', dose: '', frequency: '', route: '', duration: '' }])}>Add Medicine</button>
                        <button type="button" className="clear-btn" onClick={() => setMedicineAdvice([])}>Clear All</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 3 - Advice */}
              <div className="step-slide" style={{ flex: `0 0 ${100/steps.length}%` }}>
                <div className={`form-step ${currentStep === 3 ? 'active full-step' : ''}`}>
                  <div className="form-group full-width"><label>Advice</label><input value={advice} onChange={e => setAdvice(e.target.value)} /></div>
                </div>
              </div>

              {/* 4 - Review */}
              <div className="step-slide" style={{ flex: `0 0 ${100/steps.length}%` }}>
                <div className={`form-step ${currentStep === 4 ? 'active' : ''}`}>
                  <div className="review-card full-width">
                    <h4>Review Prescription</h4>
                    <p><strong>NIC:</strong> {nic}</p>
                    <p><strong>Patient ID:</strong> {patientId}</p>
                    <p><strong>Booked By:</strong> {bookedBy}</p>
                    <p><strong>Doctor:</strong> {doctorsList.find(d => (d._id || d.id) === doctorId)?.name || doctorContact}</p>
                    <p><strong>Initial Complain:</strong> {initialComplain}</p>
                    <p><strong>Medical History:</strong> {medicalHistory}</p>
                    <p><strong>Diagnosys:</strong></p>
                    <ul>{Object.entries(diagnosys).map(([k, v]) => <li key={k}><strong>{k}:</strong> {v}</li>)}</ul>
                    <p><strong>Medicines:</strong></p>
                    {medicineAdvice.length === 0 ? <p className="muted">No medicines added</p> : (
                      <ul>{medicineAdvice.map((m, i) => <li key={i}>{m.name} — {m.dose} — {m.frequency} — {m.duration}</li>)}</ul>
                    )}
                    <p><strong>Advice:</strong> {advice}</p>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>

        <div className="wizard-footer">
          {currentStep > 0 && <button className="btn secondary" onClick={prevStep}>Back</button>}
          {currentStep < steps.length - 1 && <button className="btn" onClick={nextStep}>Next</button>}
          {currentStep === steps.length - 1 && (
            <>
              <button className="btn btn-primary" onClick={() => handleSave(false)}>Save</button>
              <button className="btn btn-primary" onClick={() => handleSave(true)}>Save & Print</button>
            </>
          )}
        </div>

      </div>
    </section>
  );
};

export default Prescription;
