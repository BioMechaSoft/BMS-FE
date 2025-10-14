
import React, { useEffect, useState, useContext } from 'react';
import "./preview.css";
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchPreviewRequest, resetPreview } from '../store/previewSlice';
import { Context } from '../main';

// Helper: format date
const formatDate = (date) => date ? new Date(date).toLocaleDateString() : '';

const Preview = () => {
    const { patientId } = useParams();
    const dispatch = useDispatch();
    const preview = useSelector(s => s.preview);
    const patient = preview.patient;
    const doctor = preview.doctor;
    const loading = preview.loading;
    const error = preview.error;
    const [editMode, setEditMode] = useState(false);
    const { isAuthenticated, admin } = useContext(Context);

    // Role check
    const canEdit = isAuthenticated && ["Admin", "Doctor"].includes(admin?.role);


    useEffect(() => {
        if (!patientId) return;
        dispatch(fetchPreviewRequest({ patientId }));
        return () => { dispatch(resetPreview()); };
    }, [patientId]);


    // PDF Download (A4, margin)
    const downLoadPDF = async () => {
        const input = document.getElementById('pdfDownload');
        if (!input) return;
        const canvas = await html2canvas(input, { scale: 2, useCORS: true });
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

    // --- UI ---
    return (
        <section className='page modern-preview'>
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
                            </div>
                        </header>

                        {/* Patient Details Section */}
                        <section className="pDetails modern-section">
                            <div className="outer-data-box patient-box">
                                <div className="pdata">
                                    <div className="lCol">
                                        <p><strong>ID:</strong> {patient._id}</p>
                                        <p><strong>Name:</strong> {patient.firstName} {patient.lastName}</p>
                                        {patient.nic && <p><strong>NIC:</strong> {patient.nic}</p>}
                                        {patient.email && <p><strong>Email:</strong> {patient.email}</p>}
                                        {patient.phone && <p><strong>Phone:</strong> {patient.phone}</p>}
                                        {patient.gender && <p><strong>Gender:</strong> {patient.gender}</p>}
                                        {patient.dob && <p><strong>DOB:</strong> {formatDate(patient.dob)}</p>}
                                        {patient.address && <p><strong>Address:</strong> {patient.address}</p>}
                                    </div>
                                    <div className="rightCol">
                                        <p><strong>Date:</strong> {formatDate(patient.updatedAt)}</p>
                                        {patient.weight && <p><strong>Weight:</strong> {patient.weight}</p>}
                                        {patient.appointmentId && <p><strong>Appointment:</strong> {patient.appointmentId}</p>}
                                        {patient.department && <p><strong>Department:</strong> {patient.department}</p>}
                                        <p><strong>Payment:</strong> {patient.price} ({patient.paymentStatus})</p>
                                    </div>
                                </div>
                            </div>

                            {/* Prescription Info Section */}
                            <div className="mdata outer-data-box prescription-box">
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
                                <div className='diagnosis-box'>
                                    <h4>Diagnosis</h4>
                                    {report?.diagnosys && (
                                        <ul className="diagnosis-list">
                                            {Object.entries(report.diagnosys).map(([k, v]) => v && <li key={k}><strong>{k}:</strong> {v}</li>)}
                                        </ul>
                                    )}
                                </div>
                                <div className='medic-details'>
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
                                                                                                {report?.advice && (() => {
                                                                                                        const adv = report.advice;
                                                                                                        if (!adv) return null;
                                                                                                        // legacy string -> show as medication text
                                                                                                        if (typeof adv === 'string') {
                                                                                                            return (
                                                                                                                <div className="advice-box">
                                                                                                                    <h4 className="advice-title">Doctor's Advice</h4>
                                                                                                                    <div className="advice-content">
                                                                                                                        <p style={{ whiteSpace: 'pre-wrap' }}>{adv}</p>
                                                                                                                    </div>
                                                                                                                </div>
                                                                                                            );
                                                                                                        }

                                                                                                        // structured object
                                                                                                        const hasTest = Array.isArray(adv.testAdvice) && adv.testAdvice.length > 0;
                                                                                                        const hasMed = adv.medication && String(adv.medication).trim() !== '';
                                                                                                        const hasDiet = adv.diet && String(adv.diet).trim() !== '';
                                                                                                        if (!hasTest && !hasMed && !hasDiet) return null;

                                                                                                        return (
                                                                                                            <div className="advice-box">
                                                                                                                <h4 className="advice-title">Doctor's Advice</h4>
                                                                                                                <div className="advice-grid">
                                                                                                                    {hasTest && (
                                                                                                                        <section className="advice-section test-advice">
                                                                                                                            <h5 className="section-title">Test Advice ({adv.testAdvice.length})</h5>
                                                                                                                            <table className="test-advice-table modern-table">
                                                                                                                                <thead>
                                                                                                                                    <tr>
                                                                                                                                        <th>Test Name</th>
                                                                                                                                        <th>Type</th>
                                                                                                                                        <th>Precautions</th>
                                                                                                                                        <th>Date</th>
                                                                                                                                    </tr>
                                                                                                                                </thead>
                                                                                                                                <tbody>
                                                                                                                                    {adv.testAdvice.map((t, i) => (
                                                                                                                                        <tr key={i}>
                                                                                                                                            <td>{t.testName}</td>
                                                                                                                                            <td>{t.testType}</td>
                                                                                                                                            <td style={{ maxWidth: 240, whiteSpace: 'pre-wrap' }}>{t.precautions}</td>
                                                                                                                                            <td>{t.testDate ? formatDate(t.testDate) : '-'}</td>
                                                                                                                                        </tr>
                                                                                                                                    ))}
                                                                                                                                </tbody>
                                                                                                                            </table>
                                                                                                                        </section>
                                                                                                                    )}

                                                                                                                    <div className="advice-section vertical-stack">
                                                                                                                        {hasMed && (
                                                                                                                            <section className="advice-section medication-advice">
                                                                                                                                <h5 className="section-title">Medication Advice</h5>
                                                                                                                                <div className="advice-content"><p style={{ whiteSpace: 'pre-wrap' }}>{adv.medication}</p></div>
                                                                                                                            </section>
                                                                                                                        )}

                                                                                                                        {hasDiet && (
                                                                                                                            <section className="advice-section diet-advice">
                                                                                                                                <h5 className="section-title">Diet Advice</h5>
                                                                                                                                <div className="advice-content"><p style={{ whiteSpace: 'pre-wrap' }}>{adv.diet}</p></div>
                                                                                                                            </section>
                                                                                                                        )}
                                                                                                                    </div>
                                                                                                                </div>
                                                                                                            </div>
                                                                                                        );
                                                                                                })()}
                            </div>

                            {/* Doctor's Notes & Follow-up */}
                            <div className="auth-box modern-auth-box">
                                {patient.reportdate && <h4 className='follow-up-date'>Next Follow-up Date: {patient.reportdate}</h4>}
                                {patient.examinedBy && <h4 className='sign'>Examined By: {patient.examinedBy}</h4>}
                            </div>
                        </section>

                        {/* Edit Button for Doctor/Admin */}
                        {canEdit && (
                            <div className="edit-btn-bar">
                                <button className="edit-btn" onClick={() => setEditMode((v) => !v)}>
                                    {editMode ? 'Cancel Edit' : 'Edit Prescription'}
                                </button>
                                {editMode && <span className="edit-hint">(Fields will be editable here in next step)</span>}
                            </div>
                        )}

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
