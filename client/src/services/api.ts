import axios from 'axios';

export const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Request interceptor to attach JWT token from localStorage if available
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('kyc_flow_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle unauthorized sessions
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clear token on 401 if in staff route
      if (window.location.pathname.startsWith('/staff') && window.location.pathname !== '/staff/login') {
        localStorage.removeItem('kyc_flow_token');
        localStorage.removeItem('kyc_flow_user');
        window.location.href = '/staff/login';
      }
    }
    return Promise.reject(error);
  }
);
