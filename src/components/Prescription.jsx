import React, { useEffect, useState, useMemo } from "react";
import AutoSuggestInput from "./AutoSuggestInput";
import useSymptomSuggestions from "./useSymptomSuggestions";
import useMedicineSuggestions from "./useMedicineSuggestions";
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
  const medSuggestions = useMedicineSuggestions();
  // server-driven complaint suggestions while typing
  const [complaintQuery, setComplaintQuery] = useState("");
  const [complaintSuggestions, setComplaintSuggestions] = useState([]);
  const [selectedComplaints, setSelectedComplaints] = useState([]);
  const [selectedSymptoms, setSelectedSymptoms] = useState([]);
  const [isFetchingComplaints, setIsFetchingComplaints] = useState(false);
  const [analyzeResult, setAnalyzeResult] = useState(null);
  const complainDebounceRef = React.useRef(null);

  // Derived test suggestions (flatten testAdvice from advices)
  const testSuggestions = useMemo(() => {
    const map = new Map();
    (symptomSuggestions || []).forEach((a) => {
      if (Array.isArray(a.testAdvice)) {
        a.testAdvice.forEach((t) => {
          const key = (t.testName || "").trim();
          if (!key) return;
          if (!map.has(key)) map.set(key, { name: key, ...t });
        });
      }
    });
    return Array.from(map.values());
  }, [symptomSuggestions]);
  const [medicalHistory, setMedicalHistory] = useState("");
  const [diagnosys, setDiagnosys] = useState({
    BP: "",
    Diabetics: "",
    SPO2: "",
    Height: "",
    Weight: "",
    Others: "",
  });
  const [medicineAdvice, setMedicineAdvice] = useState([]);
  const [autoPopulating, setAutoPopulating] = useState(false);
  const [selectedTestTypes, setSelectedTestTypes] = useState([]);
  const [testAdviceRows, setTestAdviceRows] = useState([
    { testName: "", testType: "", precautions: "", testDate: "" },
  ]);
  const [medicationAdvice, setMedicationAdvice] = useState("");
  const [dietAdvice, setDietAdvice] = useState("");
  // helper: dedupe (case-insensitive) and sort lines alphabetically (case-insensitive)
  const dedupeAndSortLines = (text) => {
    if (!text) return "";
    const lines = String(text)
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    const map = new Map();
    lines.forEach((l) => {
      const key = l.toLowerCase();
      if (!map.has(key)) map.set(key, l);
    });
    // sort by lowercase key
    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([k, v]) => v)
      .join("\n");
  };
  const [originalPayload, setOriginalPayload] = useState(null);
  const [isDirty, setIsDirty] = useState(false);
  // Checkbox toggle for advice types
  const handleCheckboxToggle = (e, testType) => {
    setSelectedTestTypes((prev) =>
      e.target.checked
        ? [...prev, testType]
        : prev.filter((t) => t !== testType)
    );
  };

  // Add new test advice row
  const addNewTestAdviceRow = () => {
    setTestAdviceRows((prev) => [
      ...prev,
      { testName: "", testType: "", precautions: "", testDate: "" },
    ]);
  };

  // Update test advice row
  const handleTestAdviceChange = (idx, field, value) => {
    setTestAdviceRows((prev) =>
      prev.map((row, i) => (i === idx ? { ...row, [field]: value } : row))
    );
  };
  const [doctorId, setDoctorId] = useState("");
  const [doctorContact, setDoctorContact] = useState("");
  const [doctorsList, setDoctorsList] = useState([]);

  const steps = ["Complain & Medicines", "Medical History"];
  const rootRef = React.useRef(null);
  const keysPressed = React.useRef(new Set());

  useEffect(() => {
    const fetchLatestAppointment = async () => {
      try {
        const { data } = await api.get(
          `/api/v1/appointment/patient/${patientId}`
        );
        const appointments = data.appointments || [];
        if (!appointments.length) return setLoading(false);
        appointments.sort(
          (a, b) => new Date(b.appointment_date) - new Date(a.appointment_date)
        );
        const latest = appointments[0];
        setAppointmentId(latest._id);
        setNic(latest.nic || "");
        setBookedBy(latest.bookedBy || "");
        setDoctorId(latest.doctorId || "");
        if (latest.result && latest.result.length) {
          const r = latest.result[0];
          setInitialComplain(r.initialComplain || "");
          setMedicalHistory(r.medicalHistory || "");
          setDiagnosys(
            r.diagnosys || {
              BP: "",
              Diabetics: "",
              SPO2: "",
              Height: "",
              Weight: "",
              Others: "",
            }
          );
          setMedicineAdvice(
            Array.isArray(r.medicineAdvice)
              ? r.medicineAdvice
              : r.medicineAdvice
              ? [r.medicineAdvice]
              : []
          );

          // load structured advice if present (backwards compatible with string)
          const adv = r.advice;
          if (!adv) {
            // nothing
          } else if (typeof adv === "string") {
            // legacy: treat as medication advice text
            setMedicationAdvice(adv);
            setSelectedTestTypes(["Medication"]);
          } else if (typeof adv === "object") {
            if (Array.isArray(adv.testAdvice))
              setTestAdviceRows(adv.testAdvice);
            if (adv.medication) setMedicationAdvice(adv.medication);
            if (adv.diet) setDietAdvice(adv.diet);
            const sel = [];
            if (adv.testAdvice && adv.testAdvice.length)
              sel.push("Test Advice");
            if (adv.medication) sel.push("Medication");
            if (adv.diet) sel.push("Diet");
            setSelectedTestTypes(sel);
          }
          // capture original payload for dirty-check
          const initialAdviceObj = (() => {
            if (!r.advice) return {};
            if (typeof r.advice === "string") return { medication: r.advice };
            return r.advice;
          })();
          const payloadSnap = {
            initialComplain: r.initialComplain || "",
            medicalHistory: r.medicalHistory || "",
            diagnosys: r.diagnosys || {},
            medicineAdvice: Array.isArray(r.medicineAdvice)
              ? r.medicineAdvice
              : r.medicineAdvice
              ? [r.medicineAdvice]
              : [],
            advice: initialAdviceObj,
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
      if (selectedTestTypes.includes("Test Advice"))
        currentAdvice.testAdvice = testAdviceRows.filter(
          (r) => r.testName && r.testName.trim() !== ""
        );
      if (selectedTestTypes.includes("Medication"))
        currentAdvice.medication = medicationAdvice;
      if (selectedTestTypes.includes("Diet")) currentAdvice.diet = dietAdvice;
      const currentSnap = {
        initialComplain: initialComplain || "",
        medicalHistory: medicalHistory || "",
        diagnosys: diagnosys || {},
        medicineAdvice: medicineAdvice || [],
        advice: currentAdvice,
      };
      const dirty =
        JSON.stringify(originalPayload) !== JSON.stringify(currentSnap);
      setIsDirty(Boolean(dirty));
    } catch (e) {
      setIsDirty(false);
    }
  }, [
    initialComplain,
    medicalHistory,
    diagnosys,
    medicineAdvice,
    selectedTestTypes,
    testAdviceRows,
    medicationAdvice,
    dietAdvice,
    originalPayload,
  ]);

  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        const { data } = await api.get(`/api/v1/user/doctors/list`);
        setDoctorsList(data.doctors || []);
      } catch (e) {
        toast.error(
          e?.response?.data?.message || "Failed to save prescription"
        );
      }
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
    const selector =
      "input:not([type=hidden]):not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled])";

    const getFocusable = (container) => {
      if (!container) return [];
      return Array.from(container.querySelectorAll(selector)).filter(
        (el) => el.offsetParent !== null
      );
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
      const slides = Array.from(container.querySelectorAll(".step-slide"));
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
        if (tag === "TEXTAREA") return true;
        if (tag === "BUTTON" || tag === "A" || tag === "SELECT") return true;
        if (tag === "INPUT" && (type === "checkbox" || type === "radio"))
          return true;
      }

      const { ctrlOrMeta = false, tab = false, p = false } = modifiers;

      // Ctrl/Cmd+P or Enter+P -> save & print
      if (p || keysPressed.current.has("p") || keysPressed.current.has("P")) {
        e.preventDefault();
        handleSave(true);
        return true;
      }

      // Ctrl/Cmd+Tab or Enter+Tab -> next step
      if (tab) {
        e.preventDefault();
        setCurrentStep((s) => {
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
        setCurrentStep((s) => {
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
      if (active && active.tagName === "BUTTON") {
        // don't intercept Enter/Tab when a button is focused
        if (e.key === "Enter" || e.key === "Tab") return;
      }
      if (isCtrl && (e.key === "p" || e.key === "P")) {
        // override browser print
        e.preventDefault();
        handleSave(true);
        return;
      }
      if (isCtrl && e.key === "Tab") {
        e.preventDefault();
        handleEnterActions(e, { ctrlOrMeta: true, tab: true });
        return;
      }
      if (isCtrl && e.key === "Enter") {
        e.preventDefault();
        handleEnterActions(e, { ctrlOrMeta: true });
        return;
      }

      // Arrow keys: navigate fields/steps
      if (e.key === "ArrowRight") {
        // go to next step (only if not inside editing text in middle)
        const active = document.activeElement;
        let allow = true;
        if (
          active &&
          (active.tagName === "INPUT" || active.tagName === "TEXTAREA")
        ) {
          const val = active.value || "";
          try {
            // only navigate step if caret is at end
            allow = active.selectionEnd === val.length;
          } catch (err) {
            allow = false;
          }
        }
        if (allow) {
          e.preventDefault();
          setCurrentStep((s) => {
            const next = Math.min(s + 1, steps.length - 1);
            setTimeout(() => {
              const slides = Array.from(
                rootRef.current.querySelectorAll(".step-slide")
              );
              const stepEl = slides[next];
              if (stepEl) {
                const focusables = Array.from(
                  stepEl.querySelectorAll("input, select, textarea, button")
                ).filter((el) => el.offsetParent !== null);
                if (focusables.length) focusables[0].focus();
              }
            }, 80);
            return next;
          });
          return;
        }
      }
      if (e.key === "ArrowLeft") {
        const active = document.activeElement;
        let allow = true;
        if (
          active &&
          (active.tagName === "INPUT" || active.tagName === "TEXTAREA")
        ) {
          try {
            allow = active.selectionStart === 0;
          } catch (err) {
            allow = false;
          }
        }
        if (allow) {
          e.preventDefault();
          setCurrentStep((s) => {
            const prev = Math.max(s - 1, 0);
            setTimeout(() => {
              const slides = Array.from(
                rootRef.current.querySelectorAll(".step-slide")
              );
              const stepEl = slides[prev];
              if (stepEl) {
                const focusables = Array.from(
                  stepEl.querySelectorAll("input, select, textarea, button")
                ).filter((el) => el.offsetParent !== null);
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
      if (e.key === "Enter") {
        // delegate to handler which checks pressed keys for Tab or P
        const set = keysPressed.current;
        // Enter+P
        if (set.has("p") || set.has("P")) {
          e.preventDefault();
          handleSave(true);
          return;
        }
        // Enter+Tab
        if (set.has("Tab")) {
          e.preventDefault();
          handleEnterActions(e, { tab: true });
          return;
        }
        // plain Enter
        handleEnterActions(e, {});
      }

      // ArrowDown: next focusable field (if caret at end or not an input/textarea)
      if (e.key === "ArrowDown") {
        const active = document.activeElement;
        let doNavigate = true;
        if (
          active &&
          (active.tagName === "INPUT" || active.tagName === "TEXTAREA")
        ) {
          const val = active.value || "";
          try {
            doNavigate = active.selectionEnd === val.length;
          } catch (err) {
            doNavigate = false;
          }
        }
        if (doNavigate) {
          e.preventDefault();
          const moved = (function () {
            const container = rootRef.current;
            if (!container) return false;
            const selector =
              "input:not([type=hidden]):not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled])";
            const focusables = Array.from(
              container.querySelectorAll(selector)
            ).filter((el) => el.offsetParent !== null);
            const idx = focusables.indexOf(document.activeElement);
            if (idx >= 0 && idx < focusables.length - 1) {
              focusables[idx + 1].focus();
              return true;
            }
            return false;
          })();
          if (!moved) {
            setCurrentStep((s) => Math.min(s + 1, steps.length - 1));
          }
        }
      }

      // ArrowUp: previous focusable field (if caret at start or not an input/textarea)
      if (e.key === "ArrowUp") {
        const active = document.activeElement;
        let doNavigate = true;
        if (
          active &&
          (active.tagName === "INPUT" || active.tagName === "TEXTAREA")
        ) {
          try {
            doNavigate = active.selectionStart === 0;
          } catch (err) {
            doNavigate = false;
          }
        }
        if (doNavigate) {
          e.preventDefault();
          const moved = (function () {
            const container = rootRef.current;
            if (!container) return false;
            const selector =
              "input:not([type=hidden]):not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled])";
            const focusables = Array.from(
              container.querySelectorAll(selector)
            ).filter((el) => el.offsetParent !== null);
            const idx = focusables.indexOf(document.activeElement);
            if (idx > 0) {
              focusables[idx - 1].focus();
              return true;
            }
            return false;
          })();
          if (!moved) {
            setCurrentStep((s) => Math.max(s - 1, 0));
          }
        }
      }
    };

    const onKeyUp = (e) => {
      keysPressed.current.delete(e.key);
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
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

  // improved scoring: count token matches, prefer advices matching ALL tokens, add bonuses for symptom matches and exact name match
  const scoreAdvice = (adviceObj, q) => {
    const text = (
      (adviceObj.name || "") +
      " " +
      (adviceObj.desese_description || "") +
      " " +
      (adviceObj.type || "") +
      " " +
      (adviceObj.route || "") +
      " " +
      (adviceObj.symptoms || []).join(" ")
    ).toLowerCase();
    const tokens = (q || "").toLowerCase().split(/\W+/).filter(Boolean);
    if (!tokens.length) return { score: 0, matches: 0, matchedAll: false };
    let matches = 0;
    tokens.forEach((t) => {
      if (!t) return;
      if (text.includes(t)) matches += 1;
    });
    // bonus: symptoms match weight
    let symptomBonus = 0;
    if (Array.isArray(adviceObj.symptoms)) {
      const lowerSymptoms = adviceObj.symptoms.map((s) =>
        (s || "").toLowerCase()
      );
      tokens.forEach((t) => {
        if (lowerSymptoms.some((s) => s.includes(t))) symptomBonus += 1;
      });
    }
    // bonus for exact name match of whole query
    const exactName = (adviceObj.name || "").toLowerCase() === tokens.join(" ");
    let score = matches + symptomBonus;
    if (exactName) score += 2;
    const matchedAll = matches === tokens.length;
    // final score accentuates matchedAll
    if (matchedAll) score += 2;
    return { score, matches, matchedAll };
  };

  // Accept either a string query or an object (selected advice) to populate medicines/tests/advice
  // append: when true, merge into existing lists (used when multiple complaints selected)
  const autoPopulateFromComplaint = async (
    queryOrObject,
    force = false,
    append = false
  ) => {
    if (!queryOrObject || (!force && medicineAdvice.length > 0 && !append))
      return;
    setAutoPopulating(true);
    try {
      let advices = [];
      if (typeof queryOrObject === "object" && queryOrObject !== null) {
        advices = [queryOrObject];
      } else {
        const { data } = await api.get(`/api/v1/medical/search`, {
          params: { q: queryOrObject },
        });
        advices = data.advices || [];
      }
      if (!advices.length) return;
      // scoring if string query
      let selected = advices;
      if (typeof queryOrObject === "string") {
        const scored = advices.map((a) => ({
          a,
          ...scoreAdvice(a, queryOrObject),
        }));
        scored.sort((x, y) => {
          if (x.matchedAll && !y.matchedAll) return -1;
          if (!x.matchedAll && y.matchedAll) return 1;
          return (y.score || 0) - (x.score || 0);
        });
        selected = scored
          .filter((s) => s.score > 0)
          .slice(0, 12)
          .map((s) => ({
            ...s.a,
            _score: s.score,
            _matches: s.matches,
            _matchedAll: s.matchedAll,
          }));
        if (!selected.length) selected = advices.slice(0, 6);
      }

      // build medicines
      const meds = [];
      selected.forEach((t) => {
        if (Array.isArray(t.medicines) && t.medicines.length) {
          t.medicines.forEach((m) => {
            meds.push({
              name: m.name || m.label || t.name || "",
              type: m.type || t.type || "",
              dose: m.dose || t.dose || "",
              frequency: m.frequency || t.frequency || "",
              route: m.route || "mouth",
              duration: m.duration || "",
            });
          });
        } else {
          meds.push({
            name: t.name || "",
            type: t.type || "",
            dose: t.dose || "",
            frequency: t.frequency || "",
            route: t.route || "mouth",
            duration: t.duration || "",
          });
        }
      });

      if (append) {
        setMedicineAdvice((prev) => {
          const map = new Map();
          (prev || []).forEach((p) => {
            if (p && p.name) map.set(p.name, p);
          });
          meds.forEach((m) => {
            if (m && m.name) map.set(m.name, m);
          });
          return Array.from(map.values());
        });
      } else if (force) {
        setMedicineAdvice(meds);
      } else {
        setMedicineAdvice((prev) => (prev && prev.length ? prev : meds));
      }

      const tests = [];
      const medsText = [];
      let diet = "";
      selected.forEach((t) => {
        if (Array.isArray(t.testAdvice) && t.testAdvice.length)
          t.testAdvice.forEach((x) => tests.push(x));
        if (t.medication) medsText.push(t.medication);
        if (t.diet) diet = diet ? diet + "\n" + t.diet : t.diet;
      });

      if (tests.length) {
        setTestAdviceRows((prev) => {
          if (append) {
            const map = new Map();
            (prev || []).forEach((r) => {
              if (r && r.testName) map.set(r.testName, r);
            });
            tests.forEach((t) => {
              if (t && t.testName) map.set(t.testName, t);
            });
            return Array.from(map.values());
          }
          if (prev && prev.length && prev.some((r) => r.testName)) return prev;
          return tests;
        });
        setSelectedTestTypes((prev) =>
          Array.from(new Set([...(prev || []), "Test Advice", "Medication"]))
        );
      }
      if (medsText.length)
        setMedicationAdvice((prev) =>
          prev ? prev + "\n" + medsText.join("\n") : medsText.join("\n")
        );
      if (diet) setDietAdvice((prev) => (prev ? prev + "\n" + diet : diet));
    } catch (e) {
      // ignore
    } finally {
      setAutoPopulating(false);
    }
  };

  async function handleSave(printAfter = false) {
    try {
      if (!appointmentId)
        return alert("No appointment found to attach the prescription to.");
      // Build structured advice
      const adviceToSave = {};
      if (selectedTestTypes.includes("Test Advice")) {
        adviceToSave.testAdvice = testAdviceRows.filter(
          (r) => r.testName && r.testName.trim() !== ""
        );
      }
      if (selectedTestTypes.includes("Medication")) {
        adviceToSave.medication = medicationAdvice;
      }
      if (selectedTestTypes.includes("Diet")) {
        adviceToSave.diet = dietAdvice;
      }
      // validation: ensure something meaningful is present
      const diagnosysHasContent =
        diagnosys &&
        Object.keys(diagnosys).some(
          (k) => (diagnosys[k] || "").toString().trim() !== ""
        );
      const hasContent =
        (initialComplain && initialComplain.trim()) ||
        (Array.isArray(medicineAdvice) && medicineAdvice.length > 0) ||
        Object.keys(adviceToSave).length > 0 ||
        diagnosysHasContent;
      if (!hasContent) {
        toast.error(
          "Please add at least one of: initial complaint, medicines or advice before saving."
        );
        return;
      }
      await api.put(`/api/v1/appointment/patient/update/${patientId}`, {
        result: [
          {
            initialComplain,
            medicalHistory,
            diagnosys,
            medicineAdvice,
            advice: adviceToSave,
          },
        ],
        status: "Completed",
        doctorId: doctorId || undefined,
      });
      if (doctorContact) {
        await api.post(`/api/v1/message/send`, {
          firstName: "System",
          lastName: "Notification",
          email: doctorContact.includes("@") ? doctorContact : "",
          phone: doctorContact.includes("@") ? "01234567891" : doctorContact,
          message: `Prescription completed for patient NIC: ${nic}`,
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
        advice: advSaved,
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
      toast.error("Failed to save prescription or notify doctor.");
    }
  }

  const handleClose = () => {
    if (isDirty) {
      if (!window.confirm("You have unsaved changes. Discard and close?"))
        return;
    }
    if (onClose) onClose();
  };

  if (loading) return <div>Loading...</div>;

  const nextStep = () =>
    setCurrentStep((s) => Math.min(s + 1, steps.length - 1));
  const prevStep = () => setCurrentStep((s) => Math.max(s - 1, 0));
  const goToStep = (i) => setCurrentStep(i);

  return (
    // <section className="main">
    <div className=" content-box" ref={rootRef}>
      <div className="header pres-header">Prescription</div>

      <ul className="progressbar">
        {steps.map((label, idx) => (
          <li
            key={label}
            className={`${idx < currentStep ? "completed" : ""} ${
              idx === currentStep ? "active" : ""
            }`}
            onClick={() => goToStep(idx)}
          >
            <span className="step-label">{label}</span>
          </li>
        ))}
      </ul>

      <div
        className="shortcuts-hint"
        style={{
          margin: "0.5rem 0 1rem 0",
          color: "#334155",
          fontSize: "0.9rem",
          opacity: 0.4,
        }}
      >
        Shortcuts: <kbd>Enter</kbd>=next field, <kbd>Enter</kbd>+<kbd>Tab</kbd>
        =next step, <kbd>Enter</kbd>+<kbd>P</kbd>=Save & Print,{" "}
        <kbd>Ctrl/⌘</kbd>+<kbd>Enter</kbd>=next field, <kbd>Ctrl/⌘</kbd>+
        <kbd>P</kbd>=Save & Print
      </div>

      <div className="form-main">
        <div className="steps-slider">
          <div
            className="slides"
            style={{
              display: "flex",
              width: `${steps.length * 100}%`,
              transform: `translateX(-${currentStep * (100 / steps.length)}%)`,
              transition: "transform 320ms ease",
            }}
          >
            {/* 0 - Complain & Advice */}
            <div
              className="step-slide"
              style={{ flex: `0 0 ${100 / steps.length}%` }}
            >
              <div className={`form-step ${currentStep === 0 ? "active" : ""}`}>
                <div className="form-group full-width">
                  <label>Initial Complain</label>
                  <div
                    style={{
                      display: "flex",
                      gap: "0.5rem",
                      flexDirection: "column",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        width: "100%",
                        gap: "0.5rem",
                        alignItems: "center",
                      }}
                    >
                      <AutoSuggestInput
                        style={{ flex: 1 }}
                        value={initialComplain}
                        onChange={(e) => {
                          // allow manual typing to show in the input
                          setInitialComplain(e.target.value);
                          setComplaintQuery(e.target.value);
                          // debounce server query (only for last token after last comma)
                          if (complainDebounceRef.current)
                            clearTimeout(complainDebounceRef.current);
                          complainDebounceRef.current = setTimeout(async () => {
                            const val = e.target.value || "";
                            // Token to search is the last part of the string after a comma, or the whole string if no comma.
                            const lastToken = (
                              val.split(",").pop() || ""
                            ).trim();
                            if (!lastToken) {
                              setComplaintSuggestions([]);
                              return;
                            }
                            try {
                              setIsFetchingComplaints(true);
                              const { data } = await api.get(
                                `/api/v1/medical/suggestions/advices`,
                                { params: { q: lastToken, limit: 100 } }
                              );
                              // server returns advices
                              setComplaintSuggestions(
                                (data.advices || []).map((a) => ({
                                  ...a,
                                  label: a.name,
                                }))
                              );
                            } catch (err) {
                              setComplaintSuggestions([]);
                            } finally {
                              setIsFetchingComplaints(false);
                            }
                          }, 280);
                        }}
                        suggestions={
                          complaintSuggestions.length
                            ? complaintSuggestions
                            : symptomSuggestions
                        }
                        placeholder="Type to search complaints or symptoms..."
                        onSelect={(item, newVal) => {
                          // determine label
                          const label =
                            item && typeof item === "object"
                              ? item.name ||
                                (typeof newVal === "string" ? newVal : "")
                              : typeof newVal === "string"
                              ? newVal
                              : item || "";
                          // Replace last partial token (if present) or append selected label as a new token.
                          // AutoSuggestInput already updated the value via onChange. Just ensure trailing comma and space.
                          setInitialComplain(newVal.trim() + ", ");
                          setComplaintSuggestions([]);
                          // track selected complaints list (preserve old behavior)
                          setSelectedComplaints((prev) => {
                            const names = new Set(
                              (prev || []).map((p) => p.name || p)
                            );
                            if (item && typeof item === "object") {
                              if (names.has(item.name)) return prev || [];
                              return [...(prev || []), item];
                            }
                            if (names.has(label)) return prev || [];
                            return [...(prev || []), label];
                          });
                          // append mapped items to medicines/tests/diet if item is object
                          if (item && typeof item === "object")
                            autoPopulateFromComplaint(item, true, true);
                          else autoPopulateFromComplaint(label, false, true);
                        }}
                      />
                      <button
                        type="button"
                        className="icon-btn"
                        title={
                          autoPopulating ? "Populating..." : "Auto-populate"
                        }
                        style={{ minWidth: "fit-content", overflowY: "hidden" }}
                        onClick={() =>
                          autoPopulateFromComplaint(initialComplain, true)
                        }
                        disabled={
                          !initialComplain || initialComplain.trim().length < 2
                        }
                      >
                        {autoPopulating ? "⏳" : "⚡"}
                      </button>
                      <button
                        type="button"
                        className="icon-btn secondary"
                        title="Analyze"
                        style={{ minWidth: "fit-content", overflowY: "hidden" }}
                        onClick={async () => {
                          // call analyze on selected complaints/symptoms
                          const symptoms = selectedComplaints.length
                            ? selectedComplaints.flatMap(
                                (c) =>
                                  c.symptoms ||
                                  (typeof c === "string" ? [c] : [])
                              )
                            : initialComplain
                            ? [initialComplain]
                            : [];
                          try {
                            const { data } = await api.post(
                              `/api/v1/medical/analyze`,
                              { symptoms }
                            );
                            setAnalyzeResult(data.suggested || null);
                            if (data.suggested) {
                              // apply suggested aggregated results (merge + normalize + dedupe)
                              // medicines: normalize names and dedupe (case-insensitive)
                              if (
                                Array.isArray(data.suggested.medicines) &&
                                data.suggested.medicines.length
                              ) {
                                setMedicineAdvice((prev) => {
                                  const seen = new Map();
                                  // add existing
                                  (prev || []).forEach((p) => {
                                    if (!p || !p.name) return;
                                    const key = (p.name || "")
                                      .toLowerCase()
                                      .trim();
                                    if (!seen.has(key)) {
                                      seen.set(key, {
                                        name: (p.name || "").trim(),
                                        type: p.type || "",
                                        dose: p.dose || "",
                                        frequency: p.frequency || "",
                                        route: p.route || "",
                                        duration: p.duration || "",
                                      });
                                    }
                                  });
                                  // add suggested
                                  data.suggested.medicines.forEach((m) => {
                                    if (!m || !m.name) return;
                                    const nm =
                                      typeof m === "string" ? m : m.name || "";
                                    const key = (nm || "").toLowerCase().trim();
                                    if (!seen.has(key)) {
                                      seen.set(key, {
                                        name: nm.trim(),
                                        type: m.type || "",
                                        dose: m.dose || "",
                                        frequency: m.frequency || "",
                                        route: m.route || "",
                                        duration: m.duration || "",
                                      });
                                    }
                                  });
                                  return Array.from(seen.values());
                                });
                              }
                              // test advice: dedupe by testName
                              if (
                                Array.isArray(data.suggested.testAdvice) &&
                                data.suggested.testAdvice.length
                              ) {
                                setTestAdviceRows((prev) => {
                                  const seen = new Map();
                                  (prev || []).forEach((p) => {
                                    if (p && p.testName)
                                      seen.set(
                                        (p.testName || "").toLowerCase().trim(),
                                        p
                                      );
                                  });
                                  data.suggested.testAdvice.forEach((t) => {
                                    if (t && t.testName)
                                      seen.set(
                                        (t.testName || "").toLowerCase().trim(),
                                        {
                                          testName: (t.testName || "").trim(),
                                          testType: t.testType || "",
                                          precautions: t.precautions || "",
                                          testDate: t.testDate || "",
                                        }
                                      );
                                  });
                                  return Array.from(seen.values());
                                });
                                setSelectedTestTypes((prev) =>
                                  Array.from(
                                    new Set([...(prev || []), "Test Advice"])
                                  )
                                );
                              }
                              // medication advice (string): split lines, dedupe
                              if (data.suggested.medication) {
                                setMedicationAdvice((prev) =>
                                  dedupeAndSortLines(
                                    (prev || "") +
                                      "\n" +
                                      data.suggested.medication
                                  )
                                );
                                setSelectedTestTypes((prev) =>
                                  Array.from(
                                    new Set([...(prev || []), "Medication"])
                                  )
                                );
                              }
                              // diet advice (string): split lines, dedupe
                              if (data.suggested.diet) {
                                setDietAdvice((prev) =>
                                  dedupeAndSortLines(
                                    (prev || "") + "\n" + data.suggested.diet
                                  )
                                );
                                setSelectedTestTypes((prev) =>
                                  Array.from(new Set([...(prev || []), "Diet"]))
                                );
                              }
                            }
                          } catch (err) {
                            toast.error("Analysis failed");
                          }
                        }}
                      >
                        🔬
                      </button>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        gap: 8,
                        marginTop: 8,
                        flexWrap: "wrap",
                      }}
                    >
                      {(selectedComplaints || []).map((c, i) => (
                        <div
                          key={i}
                          style={{
                            padding: "6px 10px",
                            background: "#eef2ff",
                            borderRadius: 6,
                          }}
                        >
                          <span>{typeof c === "string" ? c : c.name}</span>
                          <button
                            style={{ marginLeft: 8 }}
                            className="remove-btn"
                            onClick={() =>
                              setSelectedComplaints((prev) =>
                                prev.filter((_, idx) => idx !== i)
                              )
                            }
                          >
                            x
                          </button>
                        </div>
                      ))}
                      {analyzeResult && (
                        <div
                          style={{
                            padding: "6px 10px",
                            background: "#ecfdf5",
                            borderRadius: 6,
                          }}
                        >
                          <strong>Analyze applied</strong>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <br />
              <br />
              <div
                className={`form-step ${
                  currentStep === 1 ? "active full-step" : ""
                }`}
              >
                <div className="form-group full-width medicine-section">
                  <label>Medicine Advice</label>
                  <div className="medicines-list">
                    {medicineAdvice.map((m, idx) => (
                      <div className="medicine-row" key={idx}>
                        <AutoSuggestInput
                          single
                          placeholder="Name"
                          value={m.name || ""}
                          suggestions={medSuggestions.medicines}
                          onChange={(e) => {
                            const copy = [...medicineAdvice];
                            copy[idx] = { ...copy[idx], name: e.target.value };
                            setMedicineAdvice(copy);
                          }}
                          onSelect={(item, label) => {
                            // item can be medicine object (from useMedicineSuggestions) or string
                            const copy = [...medicineAdvice];
                            if (item && typeof item === "object") {
                              copy[idx] = {
                                ...copy[idx],
                                name: item.name || label || copy[idx].name,
                                type: item.type || copy[idx].type,
                                dose: item.dose || copy[idx].dose,
                                frequency:
                                  item.frequency || copy[idx].frequency,
                                route: item.route || copy[idx].route,
                                duration: item.duration || copy[idx].duration,
                              };
                            } else {
                              copy[idx] = { ...copy[idx], name: label || item };
                            }
                            setMedicineAdvice(copy);
                          }}
                        />
                        <AutoSuggestInput
                          single
                          placeholder="Type"
                          value={m.type || ""}
                          suggestions={medSuggestions.lists.types}
                          onChange={(e) => {
                            const copy = [...medicineAdvice];
                            copy[idx] = { ...copy[idx], type: e.target.value };
                            setMedicineAdvice(copy);
                          }}
                        />
                        <AutoSuggestInput
                          single
                          placeholder="Dose"
                          value={m.dose || ""}
                          suggestions={medSuggestions.lists.doses}
                          onChange={(e) => {
                            const copy = [...medicineAdvice];
                            copy[idx] = { ...copy[idx], dose: e.target.value };
                            setMedicineAdvice(copy);
                          }}
                        />
                        <AutoSuggestInput
                          single
                          placeholder="Frequency"
                          value={m.frequency || ""}
                          suggestions={medSuggestions.lists.frequencies}
                          onChange={(e) => {
                            const copy = [...medicineAdvice];
                            copy[idx] = {
                              ...copy[idx],
                              frequency: e.target.value,
                            };
                            setMedicineAdvice(copy);
                          }}
                        />
                        <AutoSuggestInput
                          single
                          placeholder="Route"
                          value={m.route || ""}
                          suggestions={medSuggestions.lists.routes}
                          onChange={(e) => {
                            const copy = [...medicineAdvice];
                            copy[idx] = { ...copy[idx], route: e.target.value };
                            setMedicineAdvice(copy);
                          }}
                        />
                        <AutoSuggestInput
                          single
                          placeholder="Duration"
                          value={m.duration || ""}
                          suggestions={medSuggestions.lists.durations}
                          onChange={(e) => {
                            const copy = [...medicineAdvice];
                            copy[idx] = {
                              ...copy[idx],
                              duration: e.target.value,
                            };
                            setMedicineAdvice(copy);
                          }}
                        />
                        <button
                          type="button"
                          className="remove-btn"
                          onClick={() => {
                            const copy = [...medicineAdvice];
                            copy.splice(idx, 1);
                            setMedicineAdvice(copy);
                          }}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                    <div className="medicine-actions">
                      <button
                        type="button"
                        className="add-btn"
                        onClick={() =>
                          setMedicineAdvice([
                            ...medicineAdvice,
                            {
                              name: "",
                              type: "",
                              dose: "",
                              frequency: "",
                              route: "",
                              duration: "",
                            },
                          ])
                        }
                      >
                        Add Medicine
                      </button>
                      <button
                        type="button"
                        className="clear-btn"
                        onClick={() => setMedicineAdvice([])}
                      >
                        Clear All
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              <br />
              <br />
              <div
                className={`form-step ${
                  currentStep === 2 ? "active full-step" : ""
                }`}
              >
                <div className="form-row" style={{ marginBottom: 12 }}>
                  {["Test Advice", "Medication", "Diet"].map(
                    (testType, index) => (
                      <label key={index} style={{ marginRight: "1rem" }}>
                        <input
                          type="checkbox"
                          value={testType}
                          checked={selectedTestTypes.includes(testType)}
                          onChange={(e) => handleCheckboxToggle(e, testType)}
                        />{" "}
                        {testType}
                      </label>
                    )
                  )}
                </div>
                {/* Test Advice Table */}
                {selectedTestTypes.includes("Test Advice") && (
                  <div
                    className="form-group full-width"
                    style={{ overflowX: "auto" }}
                  >
                    <label>Test Advice</label>
                    <table className="test-advice-table">
                      <thead>
                        <tr>
                          <th style={{ minWidth: "9rem" }}>Test Name</th>
                          <th>Test Type</th>
                          <th>Precautions</th>
                          <th>Test Date</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {testAdviceRows.map((row, idx) => (
                          <tr key={idx}>
                            <td>
                              <AutoSuggestInput
                                single
                                placeholder="Test Name"
                                value={row.testName}
                                suggestions={testSuggestions}
                                onChange={(e) =>
                                  handleTestAdviceChange(
                                    idx,
                                    "testName",
                                    e.target.value
                                  )
                                }
                                onSelect={(item, label) => {
                                  // item will be test object with name and possibly testType/precautions/testDate
                                  if (item && typeof item === "object") {
                                    handleTestAdviceChange(
                                      idx,
                                      "testName",
                                      item.name || label
                                    );
                                    handleTestAdviceChange(
                                      idx,
                                      "testType",
                                      item.testType || ""
                                    );
                                    handleTestAdviceChange(
                                      idx,
                                      "precautions",
                                      item.precautions || ""
                                    );
                                    handleTestAdviceChange(
                                      idx,
                                      "testDate",
                                      item.testDate || ""
                                    );
                                  } else {
                                    handleTestAdviceChange(
                                      idx,
                                      "testName",
                                      label || item
                                    );
                                  }
                                }}
                              />
                            </td>
                            <td>
                              <input
                                type="text"
                                value={row.testType}
                                onChange={(e) =>
                                  handleTestAdviceChange(
                                    idx,
                                    "testType",
                                    e.target.value
                                  )
                                }
                              />
                            </td>
                            <td>
                              <input
                                type="text"
                                value={row.precautions}
                                onChange={(e) =>
                                  handleTestAdviceChange(
                                    idx,
                                    "precautions",
                                    e.target.value
                                  )
                                }
                              />
                            </td>
                            <td>
                              <input
                                type="date"
                                value={row.testDate}
                                onChange={(e) =>
                                  handleTestAdviceChange(
                                    idx,
                                    "testDate",
                                    e.target.value
                                  )
                                }
                              />
                            </td>
                            <td>
                              <button
                                type="button"
                                className="remove-btn"
                                onClick={() =>
                                  setTestAdviceRows((prev) =>
                                    prev.filter((_, i) => i !== idx)
                                  )
                                }
                              >
                                Remove
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <button
                      type="button"
                      className="add-btn"
                      onClick={addNewTestAdviceRow}
                      style={{ marginTop: 8 }}
                    >
                      Add Test Row
                    </button>
                  </div>
                )}
                {/* Medication Advice Textarea */}
                {selectedTestTypes.includes("Medication") && (
                  <div className="form-group full-width">
                    <label>Medication Advice</label>
                    <textarea
                      value={medicationAdvice}
                      onChange={(e) => setMedicationAdvice(e.target.value)}
                      placeholder="Enter medication advice..."
                      rows={2}
                    />
                  </div>
                )}
                {/* Diet Advice Textarea */}
                {selectedTestTypes.includes("Diet") && (
                  <div className="form-group full-width">
                    <label>Diet Advice</label>
                    <textarea
                      value={dietAdvice}
                      onChange={(e) => setDietAdvice(e.target.value)}
                      placeholder="Enter diet advice..."
                      rows={2}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* 1 - Medical History */}
            <div
              className="step-slide"
              style={{ flex: `0 0 ${100 / steps.length}%` }}
            >
              <div className="form-group full-width">
                <label>Medical History</label>
                <input
                  value={medicalHistory}
                  onChange={(e) => setMedicalHistory(e.target.value)}
                />
              </div>
              <br />
              <div className="form-row">
                <div className="form-group">
                  <label>BP (mmHg)</label>
                  <input
                    type="text"
                    placeholder="BP (e.g., 120/80 mmHg)"
                    maxLength={7}
                    value={diagnosys.BP}
                    onChange={(e) =>
                      setDiagnosys({ ...diagnosys, BP: e.target.value })
                    }
                  />
                </div>
                <div className="form-group">
                  <label>Diabetics (mg/dL)</label>
                  <input
                    type="text"
                    placeholder="Diabetes (mg/dL)"
                    min="20"
                    max="600"
                    value={diagnosys.Diabetics}
                    onChange={(e) =>{
                      const v = e.target.value;
                      setDiagnosys({ ...diagnosys, Diabetics: v && v>600? 600:v })
                    }}
                  />
                </div>
                <div className="form-group">
                  <label>SPO2 (%)</label>
                  <input
                    type="number"
                    placeholder="SPO2 (%)"
                    min="0"
                    max="100"
                    inputMode="numeric"
                    value={diagnosys.SPO2}
                    onChange={(e) =>{
                      const v = e.target.value;
                      setDiagnosys({ ...diagnosys, SPO2: v && v>100? 100:v })
                    }}
                  />
                </div>
                <div className="form-group">
                  <label>Height (cm)</label>
                  <input
                    type="number"
                    placeholder="Height (cm)"
                    min="30"
                    max="250"
                    value={diagnosys.Height}
                    onChange={(e) =>{
                      const v = e.target.value;
                      setDiagnosys({ ...diagnosys, Height: v && v>250? 250:v })
                    }}
                  />
                </div>
                <div className="form-group">
                  <label>Weight (kg)</label>
                  <input
                    type="number"
                    placeholder="Weight (kg)"
                    min="1"
                    max="300"
                    value={diagnosys.Weight}
                    onChange={(e) =>{
                      const v = e.target.value;
                      setDiagnosys({ ...diagnosys, Weight: v && v>300? 300:v })
                    }}
                  />
                </div>
                <div className="form-group">
                  <label>Others</label>
                  <input
                    value={diagnosys.Others}
                    onChange={(e) =>
                      setDiagnosys({ ...diagnosys, Others: e.target.value })
                    }
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="wizard-footer">
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {currentStep > 0 && (
            <button className="btn secondary" onClick={prevStep}>
              Back
            </button>
          )}
          {currentStep < steps.length - 1 && (
            <button className="btn secondary" onClick={nextStep}>
              Next
            </button>
          )}
          {currentStep === steps.length - 1 && (
            <>
              <button
                className="btn btn-primary"
                onClick={() => handleSave(false)}
                disabled={!isDirty}
              >
                Save
              </button>
              <button
                className="btn btn-primary"
                onClick={() => handleSave(true)}
                disabled={!isDirty}
              >
                Save & Print
              </button>
            </>
          )}
        </div>
        <div className="cross-box">
          {isDirty ? (
            <span style={{ color: "#b45309" }}>Unsaved changes</span>
          ) : (
            <span style={{ color: "#0f766e" }}>Saved</span>
          )}
          <button className="btn clear-btn" onClick={handleClose}>
            Close
          </button>
        </div>
      </div>
    </div>
    // </section>
  );
};

export default Prescription;
