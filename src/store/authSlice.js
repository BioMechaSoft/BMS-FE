import { createSlice } from '@reduxjs/toolkit';

const authSlice = createSlice({
  name: 'auth',
  initialState: { isAuthenticated: false, admin: null, loading: false, error: null },
  reducers: {
    loginRequest(state, action) { state.loading = true; state.error = null; },
    loginSuccess(state, action) { state.loading = false; state.isAuthenticated = true; state.admin = action.payload; },
    loginFailure(state, action) { state.loading = false; state.error = action.payload; },
    hydrateRequest(state) { state.loading = true; state.error = null; },
    hydrateSuccess(state, action) { state.loading = false; state.isAuthenticated = true; state.admin = action.payload; },
    hydrateFailure(state) { state.loading = false; state.isAuthenticated = false; state.admin = null; },
    logout(state) { state.isAuthenticated = false; state.admin = null; },
  }
});

export const { loginRequest, loginSuccess, loginFailure, hydrateRequest, hydrateSuccess, hydrateFailure, logout } = authSlice.actions;
export default authSlice.reducer;
