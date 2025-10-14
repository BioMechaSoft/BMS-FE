import { call, put, takeLatest } from 'redux-saga/effects';
import api from '../utils/api';
import { toast } from 'react-toastify';
import { createDoctorRequest, createDoctorSuccess, createDoctorFailure } from './doctorCreateSlice';

function* createDoctorSaga(action) {
  try {
    const formData = action.payload;
    yield call(api.post, '/api/v1/user/doctor/addnew', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    yield put(createDoctorSuccess());
    toast.success('Doctor created successfully');
  } catch (err) {
    const msg = err?.response?.data?.message || err.message || 'Failed to create doctor';
    yield put(createDoctorFailure(msg));
    toast.error(msg);
  }
}

export default function* doctorCreateWatcher() {
  yield takeLatest(createDoctorRequest.type, createDoctorSaga);
}