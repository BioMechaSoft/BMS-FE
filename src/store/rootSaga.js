import { all } from 'redux-saga/effects';
import authSaga from './authSaga';
import appointmentSaga from './appointmentSaga';
import doctorsSaga from './doctorsSaga';
import messagesSaga from './messagesSaga';

export default function* rootSaga() {
  yield all([
    authSaga(),
    appointmentSaga(),
    doctorsSaga(),
    messagesSaga(),
  ]);
}
