import { call, put, takeLatest, debounce } from 'redux-saga/effects';
import api from '../utils/api';
import { fetchDoctorsRequest, fetchDoctorsSuccess, fetchDoctorsFailure } from './doctorsSlice';

function* fetchDoctorsSaga(action) {
  try {
    const { query } = action.payload || {};
    if (query && query.trim() !== '') {
      const { data } = yield call(api.get, `/api/v1/user/doctor/search?query=${encodeURIComponent(query)}`);
      yield put(fetchDoctorsSuccess(data.doctors || []));
    } else {
      const { data } = yield call(api.get, `/api/v1/user/doctors`);
      yield put(fetchDoctorsSuccess(data.doctors || []));
    }
  } catch (err) {
    yield put(fetchDoctorsFailure(err?.response?.data?.message || err.message || 'Failed to fetch doctors'));
  }
}

export default function* doctorsSaga() {
  // debounce search inputs to avoid flooding the API
  yield debounce(300, fetchDoctorsRequest.type, fetchDoctorsSaga);
}
