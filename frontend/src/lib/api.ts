import axios from 'axios';
import Cookies from 'js-cookie';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export const api = axios.create({
  baseURL: `${BASE_URL}/api`,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT to every request if present
api.interceptors.request.use((config) => {
  const token = Cookies.get('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Redirect to login on 401
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      const path = window.location.pathname;
      if (path.startsWith('/admin') && path !== '/admin/login') {
        Cookies.remove('token');
        window.location.href = '/admin/login';
      }
    }
    return Promise.reject(err);
  }
);

// ── Posts ──────────────────────────────────────────────────────────────────

export const getPosts = (params?: Record<string, string | number>) =>
  api.get('/posts', { params }).then((r) => r.data);

export const getPost = (slug: string) =>
  api.get(`/posts/${slug}`).then((r) => r.data);

export const createPost = (data: unknown) =>
  api.post('/posts', data).then((r) => r.data);

export const updatePost = (id: number, data: unknown) =>
  api.put(`/posts/${id}`, data).then((r) => r.data);

export const deletePost = (id: number) =>
  api.delete(`/posts/${id}`).then((r) => r.data);

// ── Categories ─────────────────────────────────────────────────────────────

export const getCategories = () =>
  api.get('/categories').then((r) => r.data);

export const createCategory = (data: unknown) =>
  api.post('/categories', data).then((r) => r.data);

export const updateCategory = (id: number, data: unknown) =>
  api.put(`/categories/${id}`, data).then((r) => r.data);

export const deleteCategory = (id: number) =>
  api.delete(`/categories/${id}`).then((r) => r.data);

// ── Auth ───────────────────────────────────────────────────────────────────

export const login = (username: string, password: string) =>
  api.post('/auth/login', { username, password }).then((r) => r.data);

export const getMe = () =>
  api.get('/auth/me').then((r) => r.data);

// ── Stats ──────────────────────────────────────────────────────────────────

export const getStats = () =>
  api.get('/stats').then((r) => r.data);

// ── Upload ─────────────────────────────────────────────────────────────────

export const uploadFile = (file: File) => {
  const form = new FormData();
  form.append('file', file);
  return api.post('/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then((r) => r.data);
};

export const getImageUrl = (path: string) => {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  return `${BASE_URL}${path}`;
};
