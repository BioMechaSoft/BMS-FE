import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./Prescription.css";

const Prescription = ({ patientId, onClose }) => {
	const navigate = useNavigate();
	const [loading, setLoading] = useState(true);
	const [appointmentId, setAppointmentId] = useState("");
	const [nic, setNic] = useState("");
	const [bookedBy, setBookedBy] = useState("");
	const [initialComplain, setInitialComplain] = useState("");
	const [medicalHistory, setMedicalHistory] = useState("");
	const [diagnosys, setDiagnosys] = useState({ BP: "", Diabetics: "", SPO2: "", Height: "", Weight: "", Others: "" });
	const [medicineAdvice, setMedicineAdvice] = useState("");
	const [advice, setAdvice] = useState("");
	const [doctorId, setDoctorId] = useState("");
	const [doctorContact, setDoctorContact] = useState("");
	const [doctorsList, setDoctorsList] = useState([]);

	useEffect(() => {
		const fetchLatestAppointment = async () => {
			try {
				const { data } = await axios.get(`http://localhost:5000/api/v1/appointment/patient/${patientId}`);
				const appointments = data.appointments || [];
				if (appointments.length === 0) {
					setLoading(false);
					return;
				}
				// pick latest by appointment_date just in case
				appointments.sort((a, b) => new Date(b.appointment_date) - new Date(a.appointment_date));
				const latest = appointments[0];
				setAppointmentId(latest._id);
				setNic(latest.nic || "");
				setBookedBy(latest.bookedBy || "");
				setDoctorId(latest.doctorId || "");
				if (latest.result && latest.result.length > 0) {
					const r = latest.result[0];
					setInitialComplain(r.initialComplain || "");
					setMedicalHistory(r.medicalHistory || "");
					setDiagnosys(r.diagnosys || { BP: "", Diabetics: "", SPO2: "", Height: "", Weight: "", Others: "" });
					setMedicineAdvice(r.medicineAdvice || "");
					setAdvice(r.advice || "");
				}
				// fetch doctor contact via doctor details API
				if (latest.doctorId) {
					try {
						const { data: dd } = await axios.get(`http://localhost:5000/api/v1/user/doctor/${latest.doctorId}`);
						setDoctorContact(dd.doctor?.email || dd.doctor?.phone || "");
					} catch (e) {
						// ignore
					}
				}
			} catch (err) {
				// ignore
			} finally {
				setLoading(false);
			}
		};
		if (patientId) fetchLatestAppointment();
	}, [patientId]);

	// fetch doctors list for selection
	useEffect(() => {
		const fetchDoctors = async () => {
			try {
				const { data } = await axios.get("http://localhost:5000/api/v1/user/doctors/list");
				setDoctorsList(data.doctors || []);
			} catch (e) {
				// ignore
			}
		};
		fetchDoctors();
	}, []);

	// when doctorId changes, fetch contact info
	useEffect(() => {
		if (!doctorId) return;
		const fetchDoctor = async () => {
			try {
				const { data } = await axios.get(`http://localhost:5000/api/v1/user/doctor/${doctorId}`);
				setDoctorContact(data.doctor?.email || data.doctor?.phone || "");
			} catch (e) {
				// ignore
			}
		};
		fetchDoctor();
	}, [doctorId]);

	const handleSave = async (printAfter = false) => {
		try {
			if (!appointmentId) {
				alert("No appointment found to attach the prescription to.");
				return;
			}
			await axios.put(`http://localhost:5000/api/v1/appointment/patient/update/${patientId}`, {
				result: [{ initialComplain, medicalHistory, diagnosys, medicineAdvice, advice }],
				status: "Completed",
				doctorId: doctorId || undefined
			});
			// send message to doctor
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
		} catch (err) {
			alert("Failed to save prescription or notify doctor.");
		}
	};

	if (loading) return <div>Loading...</div>;

	return (
		<section className="page">
			<div className="container">
				<div className="header">Prescription</div>
				<div className="form-step active">
					<div className="form-group">
						<label>NIC</label>
						<input type="text" value={nic} readOnly disabled />
					</div>
					<div className="form-group">
						<label>Patient ID</label>
						<input type="text" value={patientId} readOnly disabled />
					</div>
					<div className="form-group">
						<label>Booked By</label>
						<input type="text" value={bookedBy} readOnly disabled />
					</div>

					<div className="form-group">
						<label>Doctor</label>
						<select value={doctorId} onChange={e => setDoctorId(e.target.value)}>
							<option value="">-- Select Doctor --</option>
							{doctorsList.map(d => (
								<option key={d.id} value={d.id}>{d.name}</option>
							))}
						</select>
					</div>

					<div className="form-group">
						<label>Initial Complain</label>
						<input type="text" value={initialComplain} onChange={e => setInitialComplain(e.target.value)} />
					</div>

					<div className="form-group">
						<label>Medical History</label>
						<input type="text" value={medicalHistory} onChange={e => setMedicalHistory(e.target.value)} />
					</div>

					<div className="form-group">
						<label>BP</label>
						<input type="text" value={diagnosys.BP} onChange={e => setDiagnosys({ ...diagnosys, BP: e.target.value })} />
					</div>
					<div className="form-group">
						<label>Diabetics</label>
						<input type="text" value={diagnosys.Diabetics} onChange={e => setDiagnosys({ ...diagnosys, Diabetics: e.target.value })} />
					</div>
					<div className="form-group">
						<label>SPO2</label>
						<input type="text" value={diagnosys.SPO2} onChange={e => setDiagnosys({ ...diagnosys, SPO2: e.target.value })} />
					</div>
					<div className="form-group">
						<label>Height</label>
						<input type="text" value={diagnosys.Height} onChange={e => setDiagnosys({ ...diagnosys, Height: e.target.value })} />
					</div>
					<div className="form-group">
						<label>Weight</label>
						<input type="text" value={diagnosys.Weight} onChange={e => setDiagnosys({ ...diagnosys, Weight: e.target.value })} />
					</div>
					<div className="form-group">
						<label>Others</label>
						<input type="text" value={diagnosys.Others} onChange={e => setDiagnosys({ ...diagnosys, Others: e.target.value })} />
					</div>

					<div className="form-group">
						<label>Medicine Advice</label>
						<input type="text" value={medicineAdvice} onChange={e => setMedicineAdvice(e.target.value)} />
					</div>

					<div className="form-group">
						<label>Advice</label>
						<input type="text" value={advice} onChange={e => setAdvice(e.target.value)} />
					</div>

					<div className="step-footer">
						<button className="btn btn-primary" onClick={() => handleSave(false)}>Save</button>
						<button className="btn btn-primary" onClick={() => handleSave(true)}>Save & Print</button>
					</div>
				</div>
			</div>
		</section>
	);
};

export default Prescription;



