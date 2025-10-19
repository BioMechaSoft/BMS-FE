import { createSlice } from '@reduxjs/toolkit';

const defaultCustom = {
  btnRadius: 8,
  btnOpacity: 1,
  textSize: 16,
  bgMain: '#e5e5e5',
  accent: '#3939d9f2',
};

const normalize = (t) => {
  if (!t) return 'theme-light';
  if (t === 'light') return 'theme-light';
  if (t === 'dark') return 'theme-dark';
  return t;
};

const getInitial = () => {
  const themeRaw = localStorage.getItem('dashboard-theme');
  const theme = normalize(themeRaw || 'theme-light');
  let custom = defaultCustom;
  try {
    const stored = localStorage.getItem('dashboard-theme-custom');
    if (stored) custom = { ...defaultCustom, ...JSON.parse(stored) };
  } catch {}
  return { theme, custom };
};

const themeSlice = createSlice({
  name: 'theme',
  initialState: getInitial(),
  reducers: {
    setTheme(state, action) {
      // Accept both legacy and new values; normalize before storing
      const t = normalize(action.payload);
      state.theme = t;
      localStorage.setItem('dashboard-theme', t);
    },
    setCustomTheme(state, action) {
      state.custom = { ...state.custom, ...action.payload };
      localStorage.setItem('dashboard-theme-custom', JSON.stringify(state.custom));
    },
    hydrateTheme(state) {
      const stored = localStorage.getItem('dashboard-theme');
      if (stored) state.theme = stored;
      try {
        const custom = localStorage.getItem('dashboard-theme-custom');
        if (custom) state.custom = { ...defaultCustom, ...JSON.parse(custom) };
      } catch {}
    }
  }
});

export const { setTheme, setCustomTheme, hydrateTheme } = themeSlice.actions;
export default themeSlice.reducer;