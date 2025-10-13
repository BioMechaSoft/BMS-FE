import { call, put, takeLatest } from 'redux-saga/effects';
import api from '../utils/api';
import { fetchMessagesRequest, fetchMessagesSuccess, fetchMessagesFailure } from './messagesSlice';

function* fetchMessagesSaga(action) {
  try {
    const { q = '', page = 1, limit = 10 } = action.payload || {};
    const params = { limit, page };
    if (q) params.q = q;
    const { data } = yield call(api.get, '/api/v1/message/getall', { params });
    const payload = {
      messages: data.messages || [],
      counts: { total: data.total || 0, read: data.readCount || 0, unread: data.unreadCount || 0 },
      page: data.page || 1,
      totalPages: data.totalPages || 1
    };
    yield put(fetchMessagesSuccess(payload));
  } catch (err) {
    yield put(fetchMessagesFailure(err?.response?.data?.message || err.message || 'Failed to load messages'));
  }
}

export default function* messagesSaga() {
  yield takeLatest(fetchMessagesRequest.type, fetchMessagesSaga);
}
