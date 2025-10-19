import { call, put, takeLatest } from 'redux-saga/effects';
import api from '../utils/api';
import { fetchPreviewRequest, fetchPreviewSuccess, fetchPreviewFailure } from './previewSlice';

function* fetchPreviewSaga(action) {
  try {
    const { patientId } = action.payload;
  const { data: ad } = yield call(api.get, `/api/v1/appointment/patient/${patientId}`);
    const appts = ad.appointments || [];
    let patient = null;
    let doctor = null;
  // fetched appointments (if any)
    if (appts.length > 0) {
      appts.sort((a, b) => new Date(b.appointment_date) - new Date(a.appointment_date));
      const latest = appts[0];
      patient = {
        _id: latest.patientId || patientId,
        firstName: latest.firstName || latest.patientName || '',
        lastName: latest.lastName || '',
        name: latest?.name,
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
        reportdate: latest.reportdate || '',
        address: latest.address || '',
        department: latest.department || '',
        price: latest.price || 0,
        paymentStatus: latest.paymentStatus || '',
      };
      if (latest.doctorId) {
        try {
          const { data: dd } = yield call(api.get, `/api/v1/user/doctor/${latest.doctorId}`);
          if (dd && dd.doctor) doctor = dd.doctor;
        } catch (e) {
          doctor = null;
        }
      }
    }
    // If no appointments returned, try fetching patient directly (fallback)
    if (!patient && appts.length === 0) {
      try {
        const { data: ud } = yield call(api.get, `/api/v1/user/patient/${patientId}`);
        const u = ud.patient || ud.user || null;
        if (u) {
          patient = {
            _id: u._id,
            firstName: u.firstName || '',
            lastName: u.lastName || '',
            name: u.name || `${u.firstName || ''} ${u.lastName || ''}`.trim(),
            nic: u.nic || u.NIC || '',
            email: u.email || '',
            phone: u.phone || u.contact || '',
            dob: u.dob || null,
            gender: u.gender || '',
            updatedAt: u.updatedAt || null,
            weight: u.weight || null,
            report: u.report || [],
            appointmentId: '',
            appointment_date: '',
            examinedBy: '',
            reportdate: '',
            address: u.address || '',
            department: u.department || '',
            price: 0,
            paymentStatus: '',
          };
        }
      } catch (e) {
        // fallback patient fetch failed - swallow to allow saga to continue
      }
    }
    yield put(fetchPreviewSuccess({ patient, doctor }));
  } catch (e) {
    yield put(fetchPreviewFailure(e?.response?.data?.message || e.message || 'Failed to load preview'));
  }
}

export default function* previewWatcher() {
  yield takeLatest(fetchPreviewRequest.type, fetchPreviewSaga);
}