import React, { useEffect, useState } from "react";
import AutoSuggestInput from "./AutoSuggestInput";
import useSymptomSuggestions from "./useSymptomSuggestions";
import useMedicineSuggestions from './useMedicineSuggestions';
import api from "../utils/api";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
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
  const symptomSuggestions = useSymptomSuggestions();
  const medHook = useMedicineSuggestions();
  const [medicalHistory, setMedicalHistory] = useState("");
  const [diagnosys, setDiagnosys] = useState({ BP: "", Diabetics: "", SPO2: "", Height: "", Weight: "", Others: "" });
  const [medicineAdvice, setMedicineAdvice] = useState([]);
  const [autoPopulating, setAutoPopulating] = useState(false);
  const [selectedTestTypes, setSelectedTestTypes] = useState([]);
  const [testAdviceRows, setTestAdviceRows] = useState([{ testName: "", testType: "", precautions: "", testDate: "" }]);
  const [medicationAdvice, setMedicationAdvice] = useState("");
  const [dietAdvice, setDietAdvice] = useState("");
  const [originalPayload, setOriginalPayload] = useState(null);
  const [isDirty, setIsDirty] = useState(false);
  // Checkbox toggle for advice types
  const handleCheckboxToggle = (e, testType) => {
    setSelectedTestTypes(prev =>
      e.target.checked
        ? [...prev, testType]
        : prev.filter(t => t !== testType)
    );
  };

  // Add new test advice row
  const addNewTestAdviceRow = () => {
    setTestAdviceRows(prev => [...prev, { testName: "", testType: "", precautions: "", testDate: "" }]);
  };

  // Update test advice row
  const handleTestAdviceChange = (idx, field, value) => {
    setTestAdviceRows(prev => prev.map((row, i) => (i === idx ? { ...row, [field]: value } : row)));
  };
  const [doctorId, setDoctorId] = useState("");
  const [doctorContact, setDoctorContact] = useState("");
  const [doctorsList, setDoctorsList] = useState([]);

  const steps = ["Patient", "Vitals & History", "Medicines", "Advice", "Review"];
  const rootRef = React.useRef(null);
  const keysPressed = React.useRef(new Set());

  useEffect(() => {
    const fetchLatestAppointment = async () => {
      try {
  const { data } = await api.get(`/api/v1/appointment/patient/${patientId}`);
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
          // load structured advice if present (backwards compatible with string)
          const adv = r.advice;
          if (!adv) {
            // nothing
          } else if (typeof adv === 'string') {
            // legacy: treat as medication advice text
            setMedicationAdvice(adv);
            setSelectedTestTypes(["Medication"]);
          } else if (typeof adv === 'object') {
            if (Array.isArray(adv.testAdvice)) setTestAdviceRows(adv.testAdvice);
            if (adv.medication) setMedicationAdvice(adv.medication);
            if (adv.diet) setDietAdvice(adv.diet);
            const sel = [];
            if (adv.testAdvice && adv.testAdvice.length) sel.push("Test Advice");
            if (adv.medication) sel.push("Medication");
            if (adv.diet) sel.push("Diet");
            setSelectedTestTypes(sel);
          }
          // capture original payload for dirty-check
          const initialAdviceObj = (() => {
            if (!r.advice) return {};
            if (typeof r.advice === 'string') return { medication: r.advice };
            return r.advice;
          })();
          const payloadSnap = {
            initialComplain: r.initialComplain || "",
            medicalHistory: r.medicalHistory || "",
            diagnosys: r.diagnosys || {},
            medicineAdvice: Array.isArray(r.medicineAdvice) ? r.medicineAdvice : (r.medicineAdvice ? [r.medicineAdvice] : []),
            advice: initialAdviceObj
          };
          setOriginalPayload(payloadSnap);
        }
      } catch (e) {
        // ignore
      } finally {
        setLoading(false);
      }
    };

    if (patientId) fetchLatestAppointment();
  }, [patientId]);

  // compute dirty state whenever key fields change
  useEffect(() => {
    try {
      const currentAdvice = {};
      if (selectedTestTypes.includes("Test Advice")) currentAdvice.testAdvice = testAdviceRows.filter(r => r.testName && r.testName.trim() !== "");
      if (selectedTestTypes.includes("Medication")) currentAdvice.medication = medicationAdvice;
      if (selectedTestTypes.includes("Diet")) currentAdvice.diet = dietAdvice;
      const currentSnap = {
        initialComplain: initialComplain || "",
        medicalHistory: medicalHistory || "",
        diagnosys: diagnosys || {},
        medicineAdvice: medicineAdvice || [],
        advice: currentAdvice
      };
      const dirty = JSON.stringify(originalPayload) !== JSON.stringify(currentSnap);
      setIsDirty(Boolean(dirty));
    } catch (e) {
      setIsDirty(false);
    }
  }, [initialComplain, medicalHistory, diagnosys, medicineAdvice, selectedTestTypes, testAdviceRows, medicationAdvice, dietAdvice, originalPayload]);

  useEffect(() => {
    const fetchDoctors = async () => {
      try {
  const { data } = await api.get(`/api/v1/user/doctors/list`);
        setDoctorsList(data.doctors || []);
      } catch (e) {}
    };
    fetchDoctors();
  }, []);

  useEffect(() => {
    if (!doctorId) return;
    (async () => {
      try {
  const { data } = await api.get(`/api/v1/user/doctor/${doctorId}`);
        setDoctorContact(data.doctor?.email || data.doctor?.phone || "");
      } catch (e) {}
    })();
  }, [doctorId]);

  // keyboard navigation handlers (supports Enter combos and Ctrl/Cmd equivalents)
  useEffect(() => {
    const selector = 'input:not([type=hidden]):not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled])';

    const getFocusable = (container) => {
      if (!container) return [];
      return Array.from(container.querySelectorAll(selector)).filter(el => el.offsetParent !== null);
    };

    const focusNext = (current) => {
      const container = rootRef.current;
      if (!container) return;
      const focusables = getFocusable(container);
      const idx = focusables.indexOf(current);
      if (idx >= 0 && idx < focusables.length - 1) {
        focusables[idx + 1].focus();
        return true;
      }
      return false;
    };

    const focusFirstInStep = (stepIndex) => {
      const container = rootRef.current;
      if (!container) return;
      const slides = Array.from(container.querySelectorAll('.step-slide'));
      const stepEl = slides[stepIndex];
      if (!stepEl) return;
      const focusables = getFocusable(stepEl);
      if (focusables.length) {
        focusables[0].focus();
      }
    };

    const handleEnterActions = (e, modifiers = {}) => {
      // keep textareas normal
      const active = document.activeElement;
      // let native controls (textareas, buttons, links, selects, checkboxes/radios) handle Enter
      if (active) {
        const tag = active.tagName;
        const type = active.type || "";
        if (tag === 'TEXTAREA') return true;
        if (tag === 'BUTTON' || tag === 'A' || tag === 'SELECT') return true;
        if (tag === 'INPUT' && (type === 'checkbox' || type === 'radio')) return true;
      }

      const { ctrlOrMeta=false, tab=false, p=false } = modifiers;

      // Ctrl/Cmd+P or Enter+P -> save & print
      if (p || (keysPressed.current.has('p') || keysPressed.current.has('P'))) {
        e.preventDefault();
        handleSave(true);
        return true;
      }

      // Ctrl/Cmd+Tab or Enter+Tab -> next step
      if (tab) {
        e.preventDefault();
        setCurrentStep(s => {
          const next = Math.min(s + 1, steps.length - 1);
          setTimeout(() => focusFirstInStep(next), 120);
          return next;
        });
        return true;
      }

      // plain Enter or Ctrl/Cmd+Enter -> focus next field
      e.preventDefault();
      const moved = focusNext(active);
      if (!moved) {
        setCurrentStep(s => {
          const next = Math.min(s + 1, steps.length - 1);
          setTimeout(() => focusFirstInStep(next), 120);
          return next;
        });
      }
      return true;
    };

    const onKeyDown = (e) => {
      // handle Ctrl/Cmd shortcuts first
      const isCtrl = e.ctrlKey || e.metaKey;
      const active = document.activeElement;
      if (active && active.tagName === 'BUTTON') {
        // don't intercept Enter/Tab when a button is focused
        if (e.key === 'Enter' || e.key === 'Tab') return;
      }
      if (isCtrl && (e.key === 'p' || e.key === 'P')) {
        // override browser print
        e.preventDefault();
        handleSave(true);
        return;
      }
      if (isCtrl && e.key === 'Tab') {
        e.preventDefault();
        handleEnterActions(e, { ctrlOrMeta: true, tab: true });
        return;
      }
      if (isCtrl && e.key === 'Enter') {
        e.preventDefault();
        handleEnterActions(e, { ctrlOrMeta: true });
        return;
      }

      // Arrow keys: navigate fields/steps
      if (e.key === 'ArrowRight') {
        // go to next step (only if not inside editing text in middle)
        const active = document.activeElement;
        let allow = true;
        if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) {
          const val = active.value || '';
          try {
            // only navigate step if caret is at end
            allow = active.selectionEnd === val.length;
          } catch (err) { allow = false; }
        }
        if (allow) {
          e.preventDefault();
          setCurrentStep(s => {
            const next = Math.min(s + 1, steps.length - 1);
            setTimeout(() => {
              const slides = Array.from(rootRef.current.querySelectorAll('.step-slide'));
              const stepEl = slides[next];
              if (stepEl) {
                const focusables = Array.from(stepEl.querySelectorAll('input, select, textarea, button')).filter(el => el.offsetParent !== null);
                if (focusables.length) focusables[0].focus();
              }
            }, 80);
            return next;
          });
          return;
        }
      }
      if (e.key === 'ArrowLeft') {
        const active = document.activeElement;
        let allow = true;
        if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) {
          try { allow = active.selectionStart === 0; } catch (err) { allow = false; }
        }
        if (allow) {
          e.preventDefault();
          setCurrentStep(s => {
            const prev = Math.max(s - 1, 0);
            setTimeout(() => {
              const slides = Array.from(rootRef.current.querySelectorAll('.step-slide'));
              const stepEl = slides[prev];
              if (stepEl) {
                const focusables = Array.from(stepEl.querySelectorAll('input, select, textarea, button')).filter(el => el.offsetParent !== null);
                if (focusables.length) focusables[0].focus();
              }
            }, 80);
            return prev;
          });
          return;
        }
      }

      // keep track for Enter+P and Enter+Tab combos
      keysPressed.current.add(e.key);
      if (e.key === 'Enter') {
        // delegate to handler which checks pressed keys for Tab or P
        const set = keysPressed.current;
        // Enter+P
        if (set.has('p') || set.has('P')) {
          e.preventDefault();
          handleSave(true);
          return;
        }
        // Enter+Tab
        if (set.has('Tab')) {
          e.preventDefault();
          handleEnterActions(e, { tab: true });
          return;
        }
        // plain Enter
        handleEnterActions(e, {});
      }

      // ArrowDown: next focusable field (if caret at end or not an input/textarea)
      if (e.key === 'ArrowDown') {
        const active = document.activeElement;
        let doNavigate = true;
        if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) {
          const val = active.value || '';
          try { doNavigate = active.selectionEnd === val.length; } catch (err) { doNavigate = false; }
        }
        if (doNavigate) {
          e.preventDefault();
          const moved = (function() {
            const container = rootRef.current;
            if (!container) return false;
            const selector = 'input:not([type=hidden]):not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled])';
            const focusables = Array.from(container.querySelectorAll(selector)).filter(el => el.offsetParent !== null);
            const idx = focusables.indexOf(document.activeElement);
            if (idx >= 0 && idx < focusables.length - 1) { focusables[idx+1].focus(); return true; }
            return false;
          })();
          if (!moved) { setCurrentStep(s => Math.min(s+1, steps.length-1)); }
        }
      }

      // ArrowUp: previous focusable field (if caret at start or not an input/textarea)
      if (e.key === 'ArrowUp') {
        const active = document.activeElement;
        let doNavigate = true;
        if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) {
          try { doNavigate = active.selectionStart === 0; } catch (err) { doNavigate = false; }
        }
        if (doNavigate) {
          e.preventDefault();
          const moved = (function() {
            const container = rootRef.current;
            if (!container) return false;
            const selector = 'input:not([type=hidden]):not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled])';
            const focusables = Array.from(container.querySelectorAll(selector)).filter(el => el.offsetParent !== null);
            const idx = focusables.indexOf(document.activeElement);
            if (idx > 0) { focusables[idx-1].focus(); return true; }
            return false;
          })();
          if (!moved) { setCurrentStep(s => Math.max(s-1, 0)); }
        }
      }
    };

    const onKeyUp = (e) => {
      keysPressed.current.delete(e.key);
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [steps.length, handleSave]);

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
  const { data } = await api.get(`/api/v1/medical/search`, { params: { q: query } });
      const advices = data.advices || [];
      if (!advices.length) return;
      const scored = advices.map(a => ({ a, score: scoreAdvice(a, query) }));
      scored.sort((x, y) => y.score - x.score);
      const top = scored.filter(s => s.score > 0).slice(0, 6).map(s => s.a);
      if (!top.length) return;
      const meds = top.map(t => ({
        name: t?.name || "",
        type: t?.type || "",
        dose: t?.dose||"0",
        frequency: t?.frequency||"0",
        route: t?.route || "mouth",
        duration:t?.duration|| "0",
      }));
      if (force) setMedicineAdvice(meds);
      else setMedicineAdvice(prev => (prev && prev.length ? prev : meds));
    } catch (e) {
      // ignore
    } finally {
      setAutoPopulating(false);
    }
  };

  async function handleSave(printAfter = false) {
    try {
      if (!appointmentId) return alert("No appointment found to attach the prescription to.");
      // Build structured advice
      const adviceToSave = {};
      if (selectedTestTypes.includes("Test Advice")) {
        adviceToSave.testAdvice = testAdviceRows.filter(r => r.testName && r.testName.trim() !== "");
      }
      if (selectedTestTypes.includes("Medication")) {
        adviceToSave.medication = medicationAdvice;
      }
      if (selectedTestTypes.includes("Diet")) {
        adviceToSave.diet = dietAdvice;
      }
      // validation: ensure something meaningful is present
      const hasContent = (initialComplain && initialComplain.trim()) || (Array.isArray(medicineAdvice) && medicineAdvice.length > 0) || (Object.keys(adviceToSave).length > 0);
      if (!hasContent) {
        toast.error("Please add at least one of: initial complaint, medicines or advice before saving.");
        return;
      }
      await api.put(`/api/v1/appointment/patient/update/${patientId}`, {
        result: [{ initialComplain, medicalHistory, diagnosys, medicineAdvice, advice: adviceToSave }],
        status: "Completed",
        doctorId: doctorId || undefined
      });
      if (doctorContact) {
        await api.post(`/api/v1/message/send`, {
          firstName: "System",
          lastName: "Notification",
          email: doctorContact.includes("@") ? doctorContact : "",
          phone: doctorContact.includes("@") ? "01234567891" : doctorContact,
          message: `Prescription completed for patient NIC: ${nic}`
        });
      }
      toast.success("Prescription saved");
      // refresh original snapshot to current state
      const advSaved = adviceToSave;
      const newSnap = {
        initialComplain: initialComplain || "",
        medicalHistory: medicalHistory || "",
        diagnosys: diagnosys || {},
        medicineAdvice: medicineAdvice || [],
        advice: advSaved
      };
      setOriginalPayload(newSnap);
      setIsDirty(false);
      if (printAfter) {
        if (onClose) onClose();
        navigate(`/preview/${patientId}`);
      } else {
        if (onClose) onClose();
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to save prescription or notify doctor.");
    }
  }

  const handleClose = () => {
    if (isDirty) {
      if (!window.confirm("You have unsaved changes. Discard and close?")) return;
    }
    if (onClose) onClose();
  };

  if (loading) return <div>Loading...</div>;

  // Build unique lists for smart suggestions (do not break UI)
  const medicineSuggestions = medHook.medicines || [];
  const medicineNames = Array.from(new Set(medicineSuggestions.map(m => m.name).filter(Boolean)));
  const typeSuggestions = Array.from(new Set(medicineSuggestions.map(m => m.type).filter(Boolean)));
  const doseSuggestions = Array.from(new Set(medicineSuggestions.map(m => m.dose).filter(Boolean)));
  const freqSuggestions = Array.from(new Set(medicineSuggestions.map(m => m.frequency).filter(Boolean)));
  const routeSuggestions = Array.from(new Set(medicineSuggestions.map(m => m.route).filter(Boolean)));
  const durationSuggestions = Array.from(new Set(medicineSuggestions.map(m => m.duration).filter(Boolean)));

  // Handlers to autofill medicine fields when a medicine is selected or Enter is pressed
  const handleMedicineNameSelect = (idx, name) => {
    if (!name) return;
    const med = medHook.findByName ? medHook.findByName(name) : (medicineSuggestions.find(m => (m.name || '').toLowerCase() === (name || '').toLowerCase()));
    const filled = {
      name: med?.name || name || '',
      type: med?.type || '',
      dose: med?.dose || '',
      frequency: med?.frequency || '',
      route: med?.route || '',
      duration: med?.duration || '',
    };
    const copy = [...medicineAdvice];
    copy[idx] = { ...(copy[idx] || {}), ...filled };
    setMedicineAdvice(copy);
    // move focus to Add Medicine button (fast entry)
    setTimeout(() => {
      const btn = document.querySelector('.medicine-actions .add-btn');
      if (btn) btn.focus();
    }, 40);
  };

  const handleMedicineNameEnter = (idx) => {
    const current = (medicineAdvice[idx] && medicineAdvice[idx].name) || '';
    if (!current) return;
    // try exact match first, fallback to first contains
    let med = medHook.findByName ? medHook.findByName(current) : null;
    if (!med) med = medicineSuggestions.find(m => (m.name || '').toLowerCase().includes(current.toLowerCase()));
    const filled = {
      name: med?.name || current || '',
      type: med?.type || '',
      dose: med?.dose || '',
      frequency: med?.frequency || '',
      route: med?.route || '',
      duration: med?.duration || '',
    };
    const copy = [...medicineAdvice];
    copy[idx] = { ...(copy[idx] || {}), ...filled };
    setMedicineAdvice(copy);
    setTimeout(() => {
      const btn = document.querySelector('.medicine-actions .add-btn');
      if (btn) btn.focus();
    }, 40);
  };

  const nextStep = () => setCurrentStep(s => Math.min(s + 1, steps.length - 1));
  const prevStep = () => setCurrentStep(s => Math.max(s - 1, 0));
  const goToStep = i => setCurrentStep(i);

  return (
    // <section className="main">
      <div className=" content-box" ref={rootRef}>
        <div className="header pres-header">Prescription</div>

        <ul className="progressbar">
          {steps.map((label, idx) => (
            <li key={label} className={`${idx < currentStep ? 'completed' : ''} ${idx === currentStep ? 'active' : ''}`} onClick={() => goToStep(idx)}>
              <span className="step-label">{label}</span>
            </li>
          ))}
        </ul>

        <div className="shortcuts-hint" style={{ margin: '0.5rem 0 1rem 0', color:'#334155', fontSize:'0.9rem',opacity:0.4 }}>
          Shortcuts: <kbd>Enter</kbd>=next field, <kbd>Enter</kbd>+<kbd>Tab</kbd>=next step, <kbd>Enter</kbd>+<kbd>P</kbd>=Save & Print, <kbd>Ctrl/⌘</kbd>+<kbd>Enter</kbd>=next field, <kbd>Ctrl/⌘</kbd>+<kbd>P</kbd>=Save & Print
        </div>

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
                      <AutoSuggestInput
                        style={{ flex: 1 }}
                        value={initialComplain}
                        onChange={e => setInitialComplain(e.target.value)}
                        suggestions={symptomSuggestions}
                        placeholder="Type to search symptoms..."
                      />
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
                        <MedicineRow
                          key={idx}
                          index={idx}
                          value={m}
                          // update parent row
                          onChange={(newVal) => { const copy = [...medicineAdvice]; copy[idx] = { ...copy[idx], ...newVal }; setMedicineAdvice(copy); }}
                          onRemove={() => { const copy = [...medicineAdvice]; copy.splice(idx, 1); setMedicineAdvice(copy); }}
                          onAdd={() => setMedicineAdvice([...medicineAdvice, { name: '', type: '', dose: '', frequency: '', route: '', duration: '' }])}
                          // pass central suggestion lists and handlers
                          medicineNames={medicineNames}
                          typeSuggestions={typeSuggestions}
                          doseSuggestions={doseSuggestions}
                          freqSuggestions={freqSuggestions}
                          routeSuggestions={routeSuggestions}
                          durationSuggestions={durationSuggestions}
                          onSuggestionSelect={(name) => handleMedicineNameSelect(idx, name)}
                          onSuggestionEnter={() => handleMedicineNameEnter(idx)}
                        />
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
                  <div className="form-row" style={{ marginBottom: 12 }}>
                    {["Test Advice", "Medication", "Diet"].map((testType, index) => (
                      <label key={index} style={{ marginRight: "1rem" }}>
                        <input
                          type="checkbox"
                          value={testType}
                          checked={selectedTestTypes.includes(testType)}
                          onChange={e => handleCheckboxToggle(e, testType)}
                        /> {testType}
                      </label>
                    ))}
                  </div>
                  {/* Test Advice Table */}
                  {selectedTestTypes.includes("Test Advice") && (
                    <div className="form-group full-width">
                      <label>Test Advice</label>
                      <table className="test-advice-table">
                        <thead>
                          <tr>
                            <th>Test Name</th>
                            <th>Test Type</th>
                            <th>Precautions</th>
                            <th>Test Date</th>
                            <th></th>
                          </tr>
                        </thead>
                        <tbody>
                          {testAdviceRows.map((row, idx) => (
                            <tr key={idx}>
                              <td><input type="text" value={row.testName} onChange={e => handleTestAdviceChange(idx, "testName", e.target.value)} /></td>
                              <td><input type="text" value={row.testType} onChange={e => handleTestAdviceChange(idx, "testType", e.target.value)} /></td>
                              <td><input type="text" value={row.precautions} onChange={e => handleTestAdviceChange(idx, "precautions", e.target.value)} /></td>
                              <td><input type="date" value={row.testDate} onChange={e => handleTestAdviceChange(idx, "testDate", e.target.value)} /></td>
                              <td><button type="button" className="remove-btn" onClick={() => setTestAdviceRows(prev => prev.filter((_, i) => i !== idx))}>Remove</button></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <button type="button" className="add-btn" onClick={addNewTestAdviceRow} style={{ marginTop: 8 }}>Add Test Row</button>
                    </div>
                  )}
                  {/* Medication Advice Textarea */}
                  {selectedTestTypes.includes("Medication") && (
                    <div className="form-group full-width">
                      <label>Medication Advice</label>
                      <textarea value={medicationAdvice} onChange={e => setMedicationAdvice(e.target.value)} placeholder="Enter medication advice..." rows={2} />
                    </div>
                  )}
                  {/* Diet Advice Textarea */}
                  {selectedTestTypes.includes("Diet") && (
                    <div className="form-group full-width">
                      <label>Diet Advice</label>
                      <textarea value={dietAdvice} onChange={e => setDietAdvice(e.target.value)} placeholder="Enter diet advice..." rows={2} />
                    </div>
                  )}
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
                    {(() => {
                      const reviewAdvice = {};
                      if (selectedTestTypes.includes("Test Advice")) reviewAdvice.testAdvice = testAdviceRows.filter(r => r.testName && r.testName.trim() !== "");
                      if (selectedTestTypes.includes("Medication")) reviewAdvice.medication = medicationAdvice;
                      if (selectedTestTypes.includes("Diet")) reviewAdvice.diet = dietAdvice;
                      return (
                        <>
                          {reviewAdvice.testAdvice && reviewAdvice.testAdvice.length > 0 && (
                            <div>
                              <h4>Test Advice</h4>
                              <table className="test-advice-table">
                                <thead>
                                  <tr>
                                    <th>Test Name</th>
                                    <th>Test Type</th>
                                    <th>Precautions</th>
                                    <th>Test Date</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {reviewAdvice.testAdvice.map((row, idx) => (
                                    <tr key={idx}>
                                      <td>{row.testName}</td>
                                      <td>{row.testType}</td>
                                      <td>{row.precautions}</td>
                                      <td>{row.testDate}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                          {reviewAdvice.medication && (
                            <div>
                              <h4>Medication Advice</h4>
                              <p>{reviewAdvice.medication}</p>
                            </div>
                          )}
                          {reviewAdvice.diet && (
                            <div>
                              <h4>Diet Advice</h4>
                              <p>{reviewAdvice.diet}</p>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>

        <div className="wizard-footer">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {currentStep > 0 && <button className="btn secondary" onClick={prevStep}>Back</button>}
            {currentStep < steps.length - 1 && <button className="btn secondary" onClick={nextStep}>Next</button>}
            {currentStep === steps.length - 1 && (
              <>
                <button className="btn btn-primary" onClick={() => handleSave(false)} disabled={!isDirty}>Save</button>
                <button className="btn btn-primary" onClick={() => handleSave(true)} disabled={!isDirty}>Save & Print</button>
              </>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button className="btn clear-btn" onClick={handleClose}>Close</button>
            {isDirty ? <span style={{ color: '#b45309' }}>Unsaved changes</span> : <span style={{ color: '#0f766e' }}>Saved</span>}
          </div>
        </div>

      </div>
    // </section>
  );
};

// MedicineRow: single medicine entry with autosuggest and autofill
function MedicineRow({ index, value = {}, onChange, onRemove, onAdd, medicineNames = [], typeSuggestions = [], doseSuggestions = [], freqSuggestions = [], routeSuggestions = [], durationSuggestions = [], onSuggestionSelect, onSuggestionEnter }) {
  const [localName, setLocalName] = useState(value.name || '');

  useEffect(() => { setLocalName(value.name || ''); }, [value.name]);

  const applySuggestion = (name) => {
    // find suggestion from parent lists
    const medName = name || localName;
    // try to find a matching medicine from medHook's data is not available here; parent will handle filling when suggestion is selected
    const filled = { ...value, name: medName };
    onChange(filled);
    // focus add button for quick entry
    setTimeout(() => {
      const btn = document.querySelector('.medicine-actions .add-btn');
      if (btn) btn.focus();
    }, 40);
  };

  const handleKey = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (medicineNames && medicineNames.length) {
        applySuggestion(medicineNames[0]);
      } else {
        applySuggestion(localName);
      }
    }
  };

  return (
    <div className="medicine-row">
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', width: '100%' }}>
        <div style={{ flex: 2 }}>
          <AutoSuggestInput
            placeholder="Name"
            value={localName}
            onChange={e => { const v = (e.target && e.target.value) || ''; if (v.includes(',')) return; setLocalName(v); onChange({ ...value, name: v }); }}
            suggestions={medicineNames}
            onKeyDown={handleKey}
            onSelect={(s) => { if (onSuggestionSelect) onSuggestionSelect(s); else applySuggestion(s); }}
            single
          />
        </div>
        <AutoSuggestInput
          placeholder="Type"
          value={value.type || ''}
          onChange={e => onChange({ ...value, type: e.target.value })}
          suggestions={typeSuggestions}
        />
        <AutoSuggestInput
          placeholder="Dose"
          value={value.dose || ''}
          onChange={e => onChange({ ...value, dose: e.target.value })}
          suggestions={doseSuggestions}
        />
        <AutoSuggestInput
          placeholder="Frequency"
          value={value.frequency || ''}
          onChange={e => onChange({ ...value, frequency: e.target.value })}
          suggestions={freqSuggestions}
        />
        <AutoSuggestInput
          placeholder="Route"
          value={value.route || ''}
          onChange={e => onChange({ ...value, route: e.target.value })}
          suggestions={routeSuggestions}
        />
        <AutoSuggestInput
          placeholder="Duration"
          value={value.duration || ''}
          onChange={e => onChange({ ...value, duration: e.target.value })}
          suggestions={durationSuggestions}
        />
        <button type="button" className="remove-btn" onClick={onRemove}>Remove</button>
      </div>
    </div>
  );
}

export default Prescription;
