import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 60000,
});

// ── Auth helpers ────────────────────────────────────────────────────────────────
export const loginUser = async (email, password) => {
  const { data } = await api.post('/auth/login', { email, password });
  localStorage.setItem('screenapp_token', data.token);
  localStorage.setItem('screenapp_user', JSON.stringify(data.user));
  return data.user;
};

export const registerUser = async (email, password, name) => {
  const { data } = await api.post('/auth/register', { email, password, name });
  localStorage.setItem('screenapp_token', data.token);
  localStorage.setItem('screenapp_user', JSON.stringify(data.user));
  return data.user;
};

export const logoutUser = () => {
  localStorage.removeItem('screenapp_token');
  localStorage.removeItem('screenapp_user');
};

export const getCurrentUser = () => {
  try {
    return JSON.parse(localStorage.getItem('screenapp_user'));
  } catch {
    return null;
  }
};

export const getToken = () => localStorage.getItem('screenapp_token');

// Attach auth header to all requests
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const uploadRecording = async (blob, filename, duration, source) => {
  const formData = new FormData();
  formData.append('file', blob, filename);
  formData.append('title', filename.replace(/\.[^.]+$/, ''));
  formData.append('duration', duration);
  formData.append('source', source);
  const response = await api.post('/recordings/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

export const getRecordings = async () => {
  const response = await api.get('/recordings');
  return response.data;
};

export const getRecording = async (id) => {
  const response = await api.get(`/recordings/${id}`);
  return response.data;
};

export const deleteRecording = async (id) => {
  const response = await api.delete(`/recordings/${id}`);
  return response.data;
};

export const transcribeRecording = async (id) => {
  const response = await api.post(`/recordings/${id}/transcribe`);
  return response.data;
};

export const summarizeRecording = async (id) => {
  const response = await api.post(`/recordings/${id}/summarize`);
  return response.data;
};

export const chatWithRecording = async (id, message, history) => {
  const response = await api.post(`/recordings/${id}/chat`, { message, history });
  return response.data;
};

export const getFolders = async () => {
  const response = await api.get('/folders');
  return response.data;
};

export const createFolder = async (name) => {
  const response = await api.post('/folders', { name });
  return response.data;
};

export const renameFolder = async (id, name) => {
  const response = await api.put(`/folders/${id}`, { name });
  return response.data;
};

export const deleteFolder = async (id) => {
  const response = await api.delete(`/folders/${id}`);
  return response.data;
};

export const updateRecording = async (id, data) => {
  const response = await api.patch(`/recordings/${id}`, data);
  return response.data;
};

export const updateRecordingStatus = async (id, status) => {
  return updateRecording(id, { status });
};
