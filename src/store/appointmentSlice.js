import { createSlice } from '@reduxjs/toolkit';

const appointmentSlice = createSlice({
  name: 'appointment',
  initialState: { creating: false, error: null, lastCreated: null },
  reducers: {
    createAppointmentRequest(state, action) { state.creating = true; state.error = null; },
    createAppointmentSuccess(state, action) { state.creating = false; state.lastCreated = action.payload; },
    createAppointmentFailure(state, action) { state.creating = false; state.error = action.payload; },
  }
});

export const { createAppointmentRequest, createAppointmentSuccess, createAppointmentFailure } = appointmentSlice.actions;
export default appointmentSlice.reducer;
