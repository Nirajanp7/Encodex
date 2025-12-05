import axios, { AxiosError } from 'axios';
import type { UserRecord, EncryptedFileMeta, VaultCategory, DocType } from './types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add JWT token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      window.location.hash = 'login';
    }
    return Promise.reject(error);
  }
);

// Token management
export const setAuthToken = (token: string) => {
  localStorage.setItem('access_token', token);
};

export const getAuthToken = () => {
  return localStorage.getItem('access_token');
};

export const clearAuthToken = () => {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
};

// Auth API
export const authAPI = {
  async register(data: {
    email: string;
    name: string;
    saltB64: string;
    kdfIterations: number;
    verifierB64: string;
    verifierIvB64: string;
  }) {
    const response = await api.post('/api/auth/register', data);
    if (response.data.access_token) {
      setAuthToken(response.data.access_token);
      if (response.data.refresh_token) {
        localStorage.setItem('refresh_token', response.data.refresh_token);
      }
    }
    return response.data;
  },

  async login(email: string) {
    // Step 1: Get user data for client-side verification
    const response = await api.post('/api/auth/login', { email });
    return response.data;
  },

  async verify(email: string, verified: boolean) {
    // Step 2: Verify password and get tokens
    const response = await api.post('/api/auth/verify', { email, verified });
    if (response.data.access_token) {
      setAuthToken(response.data.access_token);
      if (response.data.refresh_token) {
        localStorage.setItem('refresh_token', response.data.refresh_token);
      }
    }
    return response.data;
  },

  async getCurrentUser() {
    const response = await api.get('/api/auth/me');
    return response.data;
  },
};

// Files API
export const filesAPI = {
  async upload(
    encryptedFile: Blob,
    metadata: {
      filename: string;
      size: number;
      category: VaultCategory;
      docType: DocType;
      ivB64: string;
    }
  ) {
    const formData = new FormData();
    formData.append('file', encryptedFile, 'encrypted');
    formData.append('filename', metadata.filename);
    formData.append('size', metadata.size.toString());
    formData.append('category', metadata.category);
    formData.append('docType', metadata.docType);
    formData.append('ivB64', metadata.ivB64);

    const response = await api.post('/api/files/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  async list(category?: string, search?: string) {
    const params = new URLSearchParams();
    if (category && category !== 'All') params.append('category', category);
    if (search) params.append('search', search);

    const response = await api.get(`/api/files?${params.toString()}`);
    return response.data;
  },

  async download(fileId: string) {
    const response = await api.get(`/api/files/${fileId}`, {
      responseType: 'blob',
    });
    return response.data;
  },

  async delete(fileId: string) {
    const response = await api.delete(`/api/files/${fileId}`);
    return response.data;
  },

  async getMetadata(fileId: string) {
    const response = await api.get(`/api/files/${fileId}/metadata`);
    return response.data;
  },
};

// Shares API
export const sharesAPI = {
  async create(fileId: string, expiresDays: number = 7) {
    const response = await api.post('/api/shares', { fileId, expiresDays });
    return response.data;
  },

  async get(token: string) {
    // Public endpoint - no auth required
    const response = await axios.get(`${API_BASE_URL}/api/shares/${token}`);
    return response.data;
  },

  async download(token: string) {
    // Public endpoint - no auth required
    const response = await axios.get(`${API_BASE_URL}/api/shares/${token}/download`, {
      responseType: 'blob',
    });
    return response.data;
  },

  async revoke(shareId: string) {
    const response = await api.delete(`/api/shares/${shareId}`);
    return response.data;
  },

  async listForFile(fileId: string) {
    const response = await api.get(`/api/shares/file/${fileId}`);
    return response.data;
  },
};

// Error handler utility
export const handleAPIError = (error: any): string => {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.error || error.message || 'An error occurred';
  }
  return error?.message || 'An unknown error occurred';
};

