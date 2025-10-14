import { createSlice } from '@reduxjs/toolkit';

const previewSlice = createSlice({
  name: 'preview',
  initialState: { loading: false, error: null, patient: null, doctor: null },
  reducers: {
    fetchPreviewRequest(state) { state.loading = true; state.error = null; },
    fetchPreviewSuccess(state, action) {
      state.loading = false;
      state.patient = action.payload.patient;
      state.doctor = action.payload.doctor;
    },
    fetchPreviewFailure(state, action) { state.loading = false; state.error = action.payload; },
    resetPreview(state) { state.loading = false; state.error = null; state.patient = null; state.doctor = null; },
  }
});

export const { fetchPreviewRequest, fetchPreviewSuccess, fetchPreviewFailure, resetPreview } = previewSlice.actions;
export default previewSlice.reducer;