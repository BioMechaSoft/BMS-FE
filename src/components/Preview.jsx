
import React, { useEffect, useState, useContext } from 'react';
import "./preview.css";
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchPreviewRequest, resetPreview } from '../store/previewSlice';
import { dobToAge } from '../utils/ageUtils';
import { Context } from '../main';

// Helper: format date
const formatDate = (date) => date ? new Date(date).toISOString().slice(0,10) : '';
const Preview = () => {
    const { patientId: routePatientId } = useParams();
    const location = useLocation();
    // Preview may receive either a patientId route param or an appointmentId via query or props
    const qs = new URLSearchParams(location.search);
    const appointmentIdFromQuery = qs.get('appointmentId') || qs.get('apptId') || null;
    const patientId = routePatientId || appointmentIdFromQuery;
    const dispatch = useDispatch();
    const preview = useSelector(s => s.preview);
    const patient = preview.patient;
    const doctor = preview.doctor;
    const loading = preview.loading;
    const error = preview.error;
    const [editMode, setEditMode] = useState(false);
    const { isAuthenticated, admin } = useContext(Context);
    const navigate = useNavigate()

    // Role check
    const canEdit = isAuthenticated && ["Admin", "Doctor"].includes(admin?.role);


    useEffect(() => {
        if (!patientId) return;
        // try to detect whether this is an appointment id (24 hex chars) or a patient id
        const isMongoId = /^[0-9a-fA-F]{24}$/.test(patientId);
        dispatch(fetchPreviewRequest({ patientId }));
        return () => { dispatch(resetPreview()); };
    }, [patientId, dispatch]);
    


    // PDF Download (A4, margin)
    const downLoadPDF = async () => {
        const input = document.getElementById('pdfDownload');
        if (!input) return;

        // prepare a clean A4 surface for capture
        const originalClass = input.className;
        const originalStyle = { width: input.style.width, minHeight: input.style.minHeight, boxShadow: input.style.boxShadow, borderRadius: input.style.borderRadius };
        input.classList.add('a4-paper');

        // use a higher scale to improve text clarity in PDF
        const canvas = await html2canvas(input, { scale: 3, useCORS: true, logging: false });

        // restore
        input.className = originalClass;
        input.style.width = originalStyle.width || '';
        input.style.minHeight = originalStyle.minHeight || '';
        input.style.boxShadow = originalStyle.boxShadow || '';
        input.style.borderRadius = originalStyle.borderRadius || '';

        const imgWidthPx = canvas.width;
        const imgHeightPx = canvas.height;
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pageWidthMm = pdf.internal.pageSize.getWidth();
        const pageHeightMm = pdf.internal.pageSize.getHeight();
        const marginMm = 12;
        const pxToMm = (px) => (px * 0.2645833333);
        const imgWidthMm = pxToMm(imgWidthPx);
        const imgHeightMm = pxToMm(imgHeightPx);
        const scale = (pageWidthMm - marginMm * 2) / imgWidthMm;
        const scaledImgHeightMm = imgHeightMm * scale;
        const pageContentHeightMm = pageHeightMm - marginMm * 2;
        const totalPages = Math.ceil(scaledImgHeightMm / pageContentHeightMm);
        const sliceHeightPx = Math.floor((pageContentHeightMm / scale) / 0.2645833333);
        const tmpCanvas = document.createElement('canvas');
        tmpCanvas.width = imgWidthPx;
        tmpCanvas.height = sliceHeightPx;
        const tctx = tmpCanvas.getContext('2d');
        for (let page = 0; page < totalPages; page++) {
            const sx = 0;
            const sy = page * sliceHeightPx;
            const sw = imgWidthPx;
            const sh = Math.min(sliceHeightPx, imgHeightPx - sy);
            tctx.clearRect(0, 0, tmpCanvas.width, tmpCanvas.height);
            tctx.drawImage(canvas, sx, sy, sw, sh, 0, 0, sw, sh);
            const imgData = tmpCanvas.toDataURL('image/png');
            const w = pageWidthMm - marginMm * 2;
            const h = (sh * 0.2645833333) * scale;
            if (page > 0) pdf.addPage();
            pdf.addImage(imgData, 'PNG', marginMm, marginMm, w, h);
        }
        const fileName = `${(patient?.firstName || 'prescription')}.pdf`;
        pdf.save(fileName);
    };


    if (loading) return <div className='prescription'><div>Loading...</div></div>;
    if (error) return <div className='prescription'><div style={{ color: 'red' }}>{error}</div></div>;
    if (!patient) return <div className='prescription'><div>Patient not found.</div></div>;

    const report = Array.isArray(patient.report) && patient.report.length > 0 ? patient.report[0] : null;
    const clinic = {
        name: doctor?.clinicName || doctor?.hospital || '',
        address: doctor?.address || '',
        contact: doctor?.phone || doctor?.email || ''
    };
    const medicines = Array.isArray(report?.medicineAdvice) ? report.medicineAdvice : (report?.medicineAdvice ? [report?.medicineAdvice] : []);
    const previewFollowup = (report && report.advice && report.advice.followup_date) || patient.reportdate || '';

    // --- UI ---
    return (
        <section className='page modern-preview'>
            <div className="back-btn-box" style={{width:"100%"}}>
          <button className="back-btn add-btn" onClick={() => navigate("/")}>
            ← Go Back
          </button>
        </div>
            <div className='prescription'>
                <div className='presdownload' id='pdfDownload'>
                    <div className='content'>
                        {/* Header Section */}
                        <header className="header modern-header">
                            <div className="Dr-details">
                                <h1>{doctor ? `Dr. ${doctor.firstName || ''} ${doctor.lastName || ''}` : (clinic.name || 'Doctor')}</h1>
                                {doctor?.doctorDepartment && <p className='speciality'>{doctor.doctorDepartment}</p>}
                                {doctor?.qualification && <p>{doctor.qualification}</p>}
                                {doctor?.designation && <p>{doctor.designation}</p>}
                                {doctor?.extra && <p>{doctor.extra}</p>}
                                {clinic.contact && <p>Contact: {clinic.contact}</p>}
                            </div>
                            <div className="logo">
                                <img src={'/logo.png'} alt="logo" />
                                {clinic.name && <p className='clinic-name'>{clinic.name}</p>}
                            </div>
                            <div className="clinic-details">
                                {clinic.address && <p>{clinic.address}</p>}
                                {doctor?.visitingHours && <p>{doctor.visitingHours}</p>}
                                {patient.appointmentId && <p className="hide-on-print"><strong>Appointment:</strong> {patient.appointmentId}</p>}
                            </div>
                        </header>

                        {/* Patient Details Section */}
                        <div className="pDetails modern-section">
                            <div className="prescription-body">
                                {/* Top Section */}
                                <div className="top-section">
                                    <div className="outer-data-box patient-box">
                                        <div className="pdata">
                                            <div className="lCol">
                                                <p><strong>Name:</strong> {patient.name ? patient.name : `${patient?.firstName} ${patient?.lastName}`}</p>
                                                {patient.phone && <p><strong>Phone:</strong> {patient.phone}</p>}
                                                {patient.gender && <p><strong>Gender:</strong> {patient.gender}</p>}
                                                {(patient.dob || patient.age) && (
                                                    <p><strong>Age:</strong> {patient.dob ? dobToAge(patient.dob) : (patient.age ? `${patient.age} years` : '')}</p>
                                                )}
                                                {patient.address && <p><strong>Address:</strong> {patient.address}</p>}
                                            </div>
                                            <div className="rightCol">
                                                <p><strong>Date:</strong> {formatDate(patient.updatedAt)}</p>
                                                {patient.weight && <p><strong>Weight:</strong> {patient.weight}</p>}
                                                {patient.department && <p><strong>Department:</strong> {patient.department}</p>}
                                            </div>
                                        </div>
                                    </div>
                                    <div className='diagnosis-box'>
                                        <h4>{"Vitals"}</h4>
                                        {report?.diagnosys && (
                                            <ul className="diagnosis-list">
                                                {Object.entries(report?.diagnosys).map(([k, v]) => v && <li key={k}><strong>{k}:</strong> {v}</li>)}
                                            </ul>
                                        )}
                                    </div>
                                    {report?.initialComplain && (
                                        <div className='complaints'>
                                            <div className="fixed-area-block">
                                                <strong>Initial Complaint:</strong>
                                                <div className="fixed-area">{report.initialComplain}</div>
                                            </div>
                                            {report.medicalHistory && (
                                                <div className="fixed-area-block">
                                                    <strong>Medical History:</strong>
                                                    <div className="fixed-area">{report.medicalHistory}</div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Middle Section (Left/Right) */}
                                <div className="middle-section">
                                    <div className="left-section">
                                        {report?.advice?.testAdvice?.length > 0 && (
                                            <section className="advice-section test-advice">
                                                <h5 className="section-title">Test Advice ({report.advice.testAdvice.length})</h5>
                                                <div className="test-advice-list">
                                                    {report.advice.testAdvice.map((t, i) => (
                                                        <div key={i} className="test-advice-item">
                                                            <div className="test-name">
                                                                {t.testName}
                                                                {t.testType && <span className="test-type">({t.testType})</span>}
                                                            </div>
                                                            {t.precautions && <div className="test-precautions" style={{ whiteSpace: 'pre-wrap' }}>
                                                                <strong>Precautions:</strong> {t.precautions}
                                                            </div>}
                                                        </div>
                                                    ))}
                                                </div>
                                            </section>
                                        )}
                                    </div>
                                    <div className="right-section">
                                        <div className='medic-details'>
                                            <h4>{"Medicines Prescribed"}</h4>
                                            <div className="medic-header">
                                                <div>Sl</div>
                                                <div>Medicine</div>
                                                <div>Dose</div>
                                                <div>Route</div>
                                                <div>Frequency</div>
                                                <div>Duration</div>
                                            </div>
                                            <div className="medic-data">
                                                {medicines.length > 0 ? medicines.map((med, idx) => (
                                                    <div className="data-row" key={med._id || idx}>
                                                        <div>{idx + 1}</div>
                                                        <div>{med.Medicine || med.MedicineName || med.name || med.medicine || ''}</div>
                                                        <div>{med.Dose || med.dose || med.dosage || ''}</div>
                                                        <div>{med.Rout || med.Route || med.rout || med.route || 'Oral'}</div>
                                                        <div>{med.Interval || med.Frequency || med.frequency || med.interval || ''}</div>
                                                        <div>{med.Duration || med.duration || ''}</div>
                                                    </div>
                                                )) : (
                                                    <div className="no-meds">No medicines prescribed.</div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Bottom Section */}
                                <div className="bottom-section">
                                    {report?.advice && (typeof report.advice === 'string' || report.advice.medication || report.advice.diet) && (
                                        <div className="advice-box">
                                            <div className="advice-section vertical-stack">
                                                {typeof report.advice === 'string' && <p style={{ whiteSpace: 'pre-wrap' }}>{report.advice}</p>}
                                                {report.advice.medication && (
                                                    <section className="advice-section medication-advice">
                                                        <h5 className="section-title">Medication Advice</h5>
                                                        <div className="advice-content"><p style={{ whiteSpace: 'pre-wrap' }}>{report.advice.medication}</p></div>
                                                    </section>
                                                )}
                                                {report.advice.diet && (
                                                    <section className="advice-section diet-advice">
                                                        <h5 className="section-title">Diet Advice</h5>
                                                        <div className="advice-content"><p style={{ whiteSpace: 'pre-wrap' }}>{report.advice.diet}</p></div>
                                                    </section>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Doctor's Notes & Follow-up */}
                            <div className="auth-box modern-auth-box">
                                {previewFollowup && <h4 className='follow-up-date'>Next Follow-up Date: {previewFollowup}</h4>}
                                {patient.examinedBy && <h4 className='sign'>Examined By: {patient.examinedBy}</h4>}
                            </div>
                        </div>

                     

                        {/* Footer */}
                        <footer className="footer modern-footer">
                            <p>For any concerns please contact the clinic.</p>
                            {clinic.contact && <p>Contact: {clinic.contact}</p>}
                        </footer>
                    </div>
                </div>
                <div className='pdf-down-btn' onClick={downLoadPDF}>
                    Download PDF
                </div>
            </div>
        </section>
    );


};

export default Preview;
