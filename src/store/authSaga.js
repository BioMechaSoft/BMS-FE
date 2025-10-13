import { call, put, takeLatest } from 'redux-saga/effects';
import api from '../utils/api';
import { toast } from 'react-toastify';
import { loginRequest, loginSuccess, loginFailure, hydrateRequest, hydrateSuccess, hydrateFailure } from './authSlice';

function* loginSaga(action) {
  try {
    const { email, password, role } = action.payload;
    const { data } = yield call(api.post, '/api/v1/user/login', { email, password, role });
    // fetch user object
    try {
      const { data: me } = yield call(api.get, '/api/v1/user/dashboard/me');
      yield put(loginSuccess(me.user));
    } catch (e) {
      // Some backends may not return me; fall back to success without user
      yield put(loginSuccess(null));
    }
    toast.success(data.message || 'Login successful');
  } catch (err) {
    const msg = err?.response?.data?.message || err.message || 'Login failed';
    yield put(loginFailure(msg));
    toast.error(msg);
  }
}

function* hydrateSaga() {
  try {
    const { data } = yield call(api.get, '/api/v1/user/dashboard/me');
    yield put(hydrateSuccess(data.user));
  } catch (err) {
    yield put(hydrateFailure());
  }
}

export default function* authSaga() {
  yield takeLatest(loginRequest.type, loginSaga);
  yield takeLatest(hydrateRequest.type, hydrateSaga);
}
