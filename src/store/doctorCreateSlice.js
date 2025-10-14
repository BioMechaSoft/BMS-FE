import { createSlice } from '@reduxjs/toolkit';

const doctorCreateSlice = createSlice({
  name: 'doctorCreate',
  initialState: { creating: false, error: null, success: false },
  reducers: {
    createDoctorRequest(state) { state.creating = true; state.error = null; state.success = false; },
    createDoctorSuccess(state) { state.creating = false; state.success = true; },
    createDoctorFailure(state, action) { state.creating = false; state.error = action.payload; state.success = false; },
    resetDoctorCreate(state) { state.creating = false; state.error = null; state.success = false; },
  }
});

export const { createDoctorRequest, createDoctorSuccess, createDoctorFailure, resetDoctorCreate } = doctorCreateSlice.actions;
export default doctorCreateSlice.reducer;