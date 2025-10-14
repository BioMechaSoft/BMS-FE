import { createSlice } from '@reduxjs/toolkit';

const adminCreateSlice = createSlice({
  name: 'adminCreate',
  initialState: { creating: false, error: null, success: false },
  reducers: {
    createAdminRequest(state) { state.creating = true; state.error = null; state.success = false; },
    createAdminSuccess(state) { state.creating = false; state.success = true; },
    createAdminFailure(state, action) { state.creating = false; state.error = action.payload; state.success = false; },
    resetAdminCreate(state) { state.creating = false; state.error = null; state.success = false; },
  }
});

export const { createAdminRequest, createAdminSuccess, createAdminFailure, resetAdminCreate } = adminCreateSlice.actions;
export default adminCreateSlice.reducer;