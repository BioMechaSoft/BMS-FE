import { call, put, takeLatest } from 'redux-saga/effects';
import api from '../utils/api';
import { toast } from 'react-toastify';
import { createAdminRequest, createAdminSuccess, createAdminFailure } from './adminCreateSlice';

function* createAdminSaga(action) {
  try {
    const payload = action.payload;
    yield call(api.post, '/api/v1/user/compounder/addnew', payload, {
      headers: { 'Content-Type': 'application/json' },
    });
    yield put(createAdminSuccess());
    toast.success('Compounder created successfully');
  } catch (err) {
    const msg = err?.response?.data?.message || err.message || 'Failed to create compounder';
    yield put(createAdminFailure(msg));
    toast.error(msg);
  }
}

export default function* adminCreateWatcher() {
  yield takeLatest(createAdminRequest.type, createAdminSaga);
}