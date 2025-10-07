import axios from 'axios';

const baseUrl = import.meta.env.VITE_BASE_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: baseUrl,
  withCredentials: true,
});

export default api;
