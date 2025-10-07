import React, { useEffect, useState } from 'react';
import "./preview.css";
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useParams } from 'react-router-dom';
import api from '../utils/api';

const Preview = () => {
    const { patientId } = useParams();
    const [patient, setPatient] = useState(null);
    const [doctor, setDoctor] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!patientId) return;
        const fetchPatient = async () => {
            try {
                const { data: ad } = await api.get(`/api/v1/appointment/patient/${patientId}`);
                const appts = ad.appointments || [];
                if (appts.length > 0) {
                    appts.sort((a, b) => new Date(b.appointment_date) - new Date(a.appointment_date));
                    const latest = appts[0];
                    const fetched = {
                        _id: latest.patientId || patientId,
                        firstName: latest.firstName || latest.patientName || '',
                        lastName: latest.lastName || '',
                        nic: latest.nic || latest.NIC || '',
                        email: latest.email || '',
                        phone: latest.phone || latest.contact || '',
                        dob: latest.dob || latest.DOB || null,
                        gender: latest.gender || '',
                        updatedAt: latest.updatedAt || latest.appointment_date,
                        weight: latest.result && latest.result[0] && latest.result[0].diagnosys ? latest.result[0].diagnosys.Weight : latest.weight,
                        report: latest.result || [],
                        appointmentId: latest._id,
                        appointment_date: latest.appointment_date,
                        examinedBy: latest.examinedBy || latest.doctorName || '',
                        reportdate: latest.reportdate || ''
                    };
                    setPatient(fetched);
                    if (latest.doctorId) {
                        try {
                            const { data: dd } = await api.get(`/api/v1/user/doctor/${latest.doctorId}`);
                            if (dd && dd.doctor) setDoctor(dd.doctor);
                        } catch (e) {
                            // ignore doctor fetch error but keep patient
                            setDoctor(null);
                        }
                    }
                } else {
                    setPatient(null);
                }
            } catch (e) {
                console.error('Preview fetch error', e);
                setPatient(null);
            } finally {
                setLoading(false);
            }
        };
        fetchPatient();
    }, [patientId]);

    const downLoadPDF = async () => {
        const input = document.getElementById('pdfDownload');
        if (!input) return;
        const canvas = await html2canvas(input, { scale: 2, useCORS: true });
        // slice the canvas into A4 pages to avoid duplicate rendering
        const imgWidthPx = canvas.width;
        const imgHeightPx = canvas.height;

        const pdf = new jsPDF('p', 'mm', 'a4');
        const pageWidthMm = pdf.internal.pageSize.getWidth();
        const pageHeightMm = pdf.internal.pageSize.getHeight();
        const marginMm = 8;

        // convert pixels to mm (approx, assuming 96dpi)
        const pxToMm = (px) => (px * 0.2645833333);
        const imgWidthMm = pxToMm(imgWidthPx);
        const imgHeightMm = pxToMm(imgHeightPx);

        const scale = (pageWidthMm - marginMm * 2) / imgWidthMm;
        const scaledImgHeightMm = imgHeightMm * scale;

        // height of one PDF page content area in mm
        const pageContentHeightMm = pageHeightMm - marginMm * 2;
        const totalPages = Math.ceil(scaledImgHeightMm / pageContentHeightMm);

        // create an offscreen canvas to extract slices
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

            // clear and draw slice
            tctx.clearRect(0, 0, tmpCanvas.width, tmpCanvas.height);
            tctx.drawImage(canvas, sx, sy, sw, sh, 0, 0, sw, sh);
            const imgData = tmpCanvas.toDataURL('image/png');

            const w = pageWidthMm - marginMm * 2;
            const h = (sh * 0.2645833333) * scale; // mm

            if (page > 0) pdf.addPage();
            pdf.addImage(imgData, 'PNG', marginMm, marginMm, w, h);
        }

        const fileName = `${(patient?.firstName || 'prescription')}.pdf`;
        pdf.save(fileName);
    };

    if (loading) return <div className='prescription'><div>Loading...</div></div>;
    if (!patient) return <div className='prescription'><div>Patient not found.</div></div>;

    const report = Array.isArray(patient.report) && patient.report.length > 0 ? patient.report[0] : null;

    const clinic = {
        name: doctor?.clinicName || doctor?.hospital || '',
        address: doctor?.address || '',
        contact: doctor?.phone || doctor?.email || ''
    };

    const medicines = Array.isArray(report?.medicineAdvice) ? report.medicineAdvice : (report?.medicineAdvice ? [report.medicineAdvice] : []);

    return (
        <section className='page'>
            <div className='prescription'>
                <div className='presdownload' id='pdfDownload'>
                    <div className='content'>
                        <header className="header">
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

                        <section className="pDetails">
                            <div className="outer-data-box">
                                <div className="pdata">
                                    <div className="lCol">
                                        <p><strong>ID:</strong> {patient._id}</p>
                                        <p><strong>Name:</strong> {patient.firstName} {patient.lastName}</p>
                                        {patient.nic && <p><strong>NIC:</strong> {patient.nic}</p>}
                                        {patient.email && <p><strong>Email:</strong> {patient.email}</p>}
                                        {patient.phone && <p><strong>Phone:</strong> {patient.phone}</p>}
                                        {patient.gender && <p><strong>Gender:</strong> {patient.gender}</p>}
                                        {patient.dob && <p><strong>DOB:</strong> {new Date(patient.dob).toLocaleDateString()}</p>}
                                    </div>
                                    <div className="rightCol">
                                        <p><strong>Date:</strong> {patient.updatedAt ? new Date(patient.updatedAt).toLocaleDateString() : ''}</p>
                                        {patient.weight && <p><strong>Weight:</strong> {patient.weight}</p>}
                                        {patient.appointmentId && <p><strong>Appointment:</strong> {patient.appointmentId}</p>}
                                    </div>
                                </div>
                            </div>

                            <div className="mdata outer-data-box">
                                {report?.initialComplain && (
                                    <div className='complaints'>
                                        <h4>Presenting Complaints</h4>
                                        <p><strong>Initial Complaint:</strong> {report.initialComplain}</p>
                                        {report.medicalHistory && <p><strong>Medical History:</strong> {report.medicalHistory}</p>}
                                    </div>
                                )}

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
                            </div>

                            <div className="auth-box">
                                {patient.reportdate && <h4 className='follow-up-date'>Next Follow-up Date: {patient.reportdate}</h4>}
                                {patient.examinedBy && <h4 className='sign'>Examined By: {patient.examinedBy}</h4>}
                            </div>
                        </section>

                        <footer className="footer">
                            <p>For any concerns please contact the clinic.</p>
                            {clinic.contact && <p>Contact: {clinic.contact}</p>}
                        </footer>
                    </div>
                </div>

                <div className='pdf-down-btn' onClick={downLoadPDF}>
                    Download
                </div>
            </div>
        </section>
    );
};

export default Preview;
