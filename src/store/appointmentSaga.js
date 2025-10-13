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
      yield put(createAppointmentSuccess(data));
      toast.success(data.message || 'Appointment created');
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
