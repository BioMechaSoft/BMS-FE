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
    if (appts.length > 0) {
      appts.sort((a, b) => new Date(b.appointment_date) - new Date(a.appointment_date));
      const latest = appts[0];
      patient = {
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
    yield put(fetchPreviewSuccess({ patient, doctor }));
  } catch (e) {
    yield put(fetchPreviewFailure(e?.response?.data?.message || e.message || 'Failed to load preview'));
  }
}

export default function* previewWatcher() {
  yield takeLatest(fetchPreviewRequest.type, fetchPreviewSaga);
}