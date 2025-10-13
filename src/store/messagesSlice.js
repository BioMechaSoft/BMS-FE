import { createSlice } from '@reduxjs/toolkit';

const messagesSlice = createSlice({
  name: 'messages',
  initialState: { messages: [], counts: { total:0, read:0, unread:0 }, page:1, totalPages:1, loading:false, error:null },
  reducers: {
    fetchMessagesRequest(state, action) { state.loading = true; state.error = null; },
    fetchMessagesSuccess(state, action) { state.loading = false; Object.assign(state, action.payload); },
    fetchMessagesFailure(state, action) { state.loading = false; state.error = action.payload; },
  }
});

export const { fetchMessagesRequest, fetchMessagesSuccess, fetchMessagesFailure } = messagesSlice.actions;
export default messagesSlice.reducer;
