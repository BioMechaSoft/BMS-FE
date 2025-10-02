import React, { useEffect, useState } from 'react';
import "./preview.css";
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useParams } from 'react-router-dom';
import axios from 'axios';

const Preview = () => {
    const { patientId } = useParams();
    const [patient, setPatient] = useState(null);
    const [doctor, setDoctor] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!patientId) return;
        const fetchPatient = async () => {
            try {
                console.log("Preview: fetching appointments for patientId", patientId);
                const { data: ad } = await axios.get(`http://localhost:5000/api/v1/appointment/patient/${patientId}`);
                const appts = ad.appointments || [];
                if (appts.length > 0) {
                    appts.sort((a, b) => new Date(b.appointment_date) - new Date(a.appointment_date));
                    const latest = appts[0];
                    const fetched = {
                        _id: latest.patientId || patientId,
                        firstName: latest.firstName || "",
                        lastName: latest.lastName || "",
                        nic: latest.nic || "",
                        email: latest.email || "",
                        phone: latest.phone || "",
                        dob: latest.dob || null,
                        gender: latest.gender || "",
                        updatedAt: latest.updatedAt || latest.appointment_date,
                        weight: latest.result && latest.result[0] && latest.result[0].diagnosys ? latest.result[0].diagnosys.Weight : undefined,
                        report: latest.result || [],
                        appointmentId: latest._id,
                        appointment_date: latest.appointment_date,
                    };
                    setPatient(fetched);
                    if (latest.doctorId) {
                        try {
                            console.log("Preview: fetching doctor", latest.doctorId);
                            const { data: dd } = await axios.get(`http://localhost:5000/api/v1/user/doctor/${latest.doctorId}`);
                            if (dd && dd.doctor) setDoctor(dd.doctor);
                        } catch (e) {
                            console.error("Failed to fetch doctor", e);
                        }
                    }
                } else {
                    console.warn("Preview: no appointments found for", patientId);
                    setPatient(null);
                }
            } catch (e) {
                console.error("Preview: failed to fetch appointments", e);
                setPatient(null);
            } finally {
                setLoading(false);
            }
        };
        fetchPatient();
    }, [patientId]);

    const downLoadPDF = async () => {
        const input = document.getElementById("pdfDownload");
        const canvas = await html2canvas(input, { scale: 2 });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const imgProps = pdf.getImageProperties(imgData);
        const imgWidth = pageWidth - 16; // 8mm margin
        const imgHeight = (imgProps.height * imgWidth) / imgProps.width;

        let heightLeft = imgHeight;
        let position = 8; // start at 8mm from top

        pdf.addImage(imgData, 'PNG', 8, position, imgWidth, imgHeight);
        heightLeft -= pageHeight - 16;

        while (heightLeft > 0) {
            pdf.addPage();
            pdf.addImage(imgData, 'PNG', 8, 8 - heightLeft, imgWidth, imgHeight);
            heightLeft -= pageHeight - 16;
        }

        pdf.save(`${patient?.firstName || 'prescription'}.pdf`);
    };

    //   if (loading) {
    //     return <div className='prescription'><div>Loading...</div></div>;
    //   }

    if (!patient) {
        return <div className='prescription'><div>Patient not found.</div></div>;
    }

    // pick latest report (first) if exists
    const report = Array.isArray(patient.report) && patient.report.length > 0 ? patient.report[0] : null;

    return (
        <section className='page'>
            <div className='prescription'>
                <div className='presdownload' id='pdfDownload'>
                    <div className='content' >
                        <div className="header">
                            {/* DOC DETAILS */}
                            <div className="Dr-details">
                                <h1>{doctor ? `Dr. ${doctor.firstName} ${doctor.lastName}` : 'Dr. Golam Jakaria'}</h1>
                                <p className='speciality'>{doctor?.doctorDepartment || 'General Physician & Child\'s Doctor'}</p>
                                <p>{doctor?.qualification || 'M.B.B.S (Kolkata Medical Collage)'}</p>
                                <p>{doctor?.designation || 'House Physician (Pediatric Medicine)'}</p>
                                <p>{doctor?.extra || ''}</p>
                                <p>Helpline: {doctor?.phone || doctor?.email || '87875775876'}</p>
                            </div>
                            <div className="logo">
                                <img src={'/logo.png'} alt="logo" />
                                <p>ON REQUEST</p>
                            </div>
                            {/* DOC DETAILS in benagali */}

                            <div className="Dr-details-bng">
                                <h1>ডাঃ গোলাম জাকারিয়া</h1>
                                <p className='speciality'>জেনারেল ফিজিসিয়ান ও শিশু চিকিৎসক</p>
                                <p>এম.বি.বি.এস (কলকাতা মেডিক্যাল কলেজ)</p>
                                <p>হাউস ফিজিসিয়ান (পেডিয়াট্রিক মেডিসিন)</p>
                                <p>হাউস ফিজিসিয়ান (চৌষ্ট মেডিসিন)</p>
                                <p>মেডিক্যাল অফিসার, বেদরাবাদ রুলাল হাসপাতাল</p>
                            </div>
                        </div>

                        <div className="pDetails">
                            <div className="outer-data-box">
                                <div className="pdata">
                                    <div className="lCol">
                                        <p>ID : {patient._id}</p>
                                        <p>Name: {patient.firstName} {patient.lastName}</p>
                                        <p>NIC: {patient.nic || ''}</p>
                                        <p>Email: {patient.email || ''}</p>
                                        <p>Phone No: {patient.phone || ''}</p>
                                        <p>Gender: {patient.gender || ''}</p>
                                        <p>DOB: {patient.dob ? new Date(patient.dob).toLocaleDateString() : ''}</p>
                                    </div>
                                    <div className="rightCol">
                                        <p>Date: {patient.updatedAt ? new Date(patient.updatedAt).toLocaleDateString() : ''}</p>
                                        <p>Weight: {report?.diagnosys?.Weight || patient.weight || ''}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="mdata outer-data-box">
                                <div className='mdata-1r'>
                                    <p>GIP0</p>
                                    <p>LMP- {"2025-05-17"}</p>
                                    <p>EDD- {"2026-02-24"}</p>
                                </div>
                                <section>Presenting Complaints:</section>
                                <div style={{ padding: '0.5rem 0' }}>
                                    <p><strong>Initial Complain:</strong> {report?.initialComplain || ''}</p>
                                    <p><strong>Medical History:</strong> {report?.medicalHistory || ''}</p>
                                </div>
                                <div className='medic-details'>
                                    <div className="medic-header">
                                        <h4>Sl No</h4>
                                        <h4>Medicine Name</h4>
                                        <h4>Dose</h4>
                                        <h4>Rout</h4>
                                        <h4>Frequecy</h4>
                                        <h4>Duration</h4>
                                    </div>
                                    <div className="medic-data">
                                        {Array.isArray(report?.medicineAdvice) ? (
                                            report.medicineAdvice.map((med, idx) => (
                                                <div className="data-row" key={idx}>
                                                    <p>{idx + 1}</p>
                                                    <p>{med.Medicine || med.MedicineName || med.name || ''}</p>
                                                    <p>{med.Dose || med.dose || ''}</p>
                                                    <p>{med.Rout || med.Route || med.rout || 'Oral'}</p>
                                                    <p>{med.Interval || med.Frequency || med.frequency || ''}</p>
                                                    <p>{med.Duration || med.duration || ''}</p>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="data-row">
                                                <p>{"1"}</p>
                                                <p>{report?.medicineAdvice?.Medicine || ''}</p>
                                                <p>{report?.medicineAdvice?.Dose || ''}</p>
                                                <p>{report?.medicineAdvice?.Rout || report?.medicineAdvice?.Route || 'Oral'}</p>
                                                <p>{report?.medicineAdvice?.Interval || report?.medicineAdvice?.Frequency || ''}</p>
                                                <p>{report?.medicineAdvice?.Duration || ''}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="auth-box">
                                <h4 className='follow-up-date'>Next Follow-up Date: {patient.reportdate || ''}</h4>
                                <h4 className='sign'>{patient.examinedBy || ''}</h4>
                            </div>
                        </div>
                        <div className="footer">
                            <p>
                                রুগীর অসুবিধা হলে ফোন করুন অথবা জরুরী অবস্থায় হাসপাতালে যোগাযোগ করুন।
                            </p>
                            <p>
                                যোগাযোগের সময় সকাল ৬টা থেকে রাত্রি ১০টা পর্যন্ত। M.-8906805818/8327402232/7718704318
                            </p>
                        </div>
                    </div>
                </div>
                <div className='pdf-down-btn' onClick={downLoadPDF}>
                    Download
                </div>
            </div>
        </section>
    );
}

export default Preview;
