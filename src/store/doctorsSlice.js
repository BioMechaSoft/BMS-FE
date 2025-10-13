import { createSlice } from '@reduxjs/toolkit';

const doctorsSlice = createSlice({
  name: 'doctors',
  initialState: { doctors: [], loading: false, error: null },
  reducers: {
    fetchDoctorsRequest(state, action) { state.loading = true; state.error = null; },
    fetchDoctorsSuccess(state, action) { state.loading = false; state.doctors = action.payload; },
    fetchDoctorsFailure(state, action) { state.loading = false; state.error = action.payload; },
  }
});

export const { fetchDoctorsRequest, fetchDoctorsSuccess, fetchDoctorsFailure } = doctorsSlice.actions;
export default doctorsSlice.reducer;
