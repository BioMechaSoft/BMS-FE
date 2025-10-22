import { call, put, takeLatest } from 'redux-saga/effects';
import api from '../utils/api';
import { toast } from 'react-toastify';
import { createAppointmentRequest, createAppointmentSuccess, createAppointmentFailure } from './appointmentSlice';
import { saveBlobFromResponse } from '../utils/download';

function* createAppointmentSaga(action) {
  try {
    const { payload, download } = action.payload;
    const config = { withCredentials: true };
    if (download) config.responseType = 'blob';
    const url = '/api/v1/appointment/post' + (download ? '?download=true' : '');
    const response = yield call(api.post, url, payload, config);
    if (download) {
      yield call(saveBlobFromResponse, response);
      yield put(createAppointmentSuccess({ message: 'Appointment created (downloaded)' }));
      toast.success('Appointment created and invoice downloaded');
    } else {
      const data = response.data;
      // prefer the server-returned appointment object as the canonical created record
      const payload = { appointment: data.appointment || data, message: data.message };
      yield put(createAppointmentSuccess(payload));
      toast.success(data.message || 'Appointment created');
      // Invoice creation is handled by the backend now; no client-side auto-create.
      // If client requested appointment to be marked Paid on creation, settle invoices now so payments are recorded
      try {
        if (action.payload && action.payload.payload && action.payload.payload.paymentStatus === 'Paid') {
          const apptId = (data.appointment && data.appointment._id) || (data.appointment && data.appointment.id) || (data._id || data.id);
          if (apptId) {
            yield call(api.post, `/api/v1/invoice/appointment/${apptId}/settle`);
            // refresh or notify user
            toast.success('Appointment invoices settled');
          }
        }
      } catch (e) {
        console.warn('Failed to auto-settle invoices after appointment creation', e.message || e);
      }
    }
  } catch (err) {
    const msg = err?.response?.data?.message || err.message || 'Appointment failed';
    yield put(createAppointmentFailure(msg));
    toast.error(msg);
  }
}

export default function* appointmentSaga() {
  yield takeLatest(createAppointmentRequest.type, createAppointmentSaga);
}
