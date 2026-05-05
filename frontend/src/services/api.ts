/* ============================================
 * EduRAG Frontend — API Client
 * JWT interceptor + auto-refresh + error handling
 * ============================================ */

import type {
  TokenResponse,
  TeacherRegister,
  TeacherLogin,
  TeacherResponse,
  QueryRequest,
  QueryResponse,
  SourceListResponse,
  SourceUploadResponse,
  SourceType,
} from '../types';

const BASE_URL = 'http://localhost:8000/api/v1';

// ── Token Yönetimi ──
export function getAccessToken(): string | null {
  return localStorage.getItem('access_token');
}

export function getRefreshToken(): string | null {
  return localStorage.getItem('refresh_token');
}

export function saveTokens(tokens: TokenResponse): void {
  localStorage.setItem('access_token', tokens.access_token);
  localStorage.setItem('refresh_token', tokens.refresh_token);
}

export function clearTokens(): void {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
}

// ── Hata Sınıfı ──
export class ApiError extends Error {
  status: number;
  detail: string;

  constructor(status: number, detail: string) {
    super(detail);
    this.status = status;
    this.detail = detail;
  }
}

// ── Temel HTTP İstek Fonksiyonu ──
async function request<T>(
  url: string,
  options: RequestInit = {},
  retry = true
): Promise<T> {
  const token = getAccessToken();

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> || {}),
  };

  // Multipart form gönderirken Content-Type'ı browser'a bırak
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${url}`, {
    ...options,
    headers,
  });

  // Token expired → refresh dene
  if (res.status === 401 && retry) {
    const refreshed = await tryRefreshToken();
    if (refreshed) {
      return request<T>(url, options, false);
    }
    clearTokens();
    window.location.href = '/login';
    throw new ApiError(401, 'Oturum süresi doldu');
  }

  if (!res.ok) {
    let detail = 'Bilinmeyen hata';
    try {
      const err = await res.json();
      detail = err.detail || JSON.stringify(err);
    } catch {
      detail = res.statusText;
    }
    throw new ApiError(res.status, detail);
  }

  // 204 No Content
  if (res.status === 204) return undefined as T;

  return res.json();
}

async function tryRefreshToken(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;

  try {
    const res = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!res.ok) return false;

    const tokens: TokenResponse = await res.json();
    saveTokens(tokens);
    return true;
  } catch {
    return false;
  }
}

// ── API Fonksiyonları ──

// Auth
export async function register(data: TeacherRegister): Promise<TeacherResponse> {
  return request<TeacherResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function login(data: TeacherLogin): Promise<TokenResponse> {
  const tokens = await request<TokenResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  saveTokens(tokens);
  return tokens;
}

export function logout(): void {
  clearTokens();
  window.location.href = '/login';
}

// RAG Query
export async function askQuestion(data: QueryRequest): Promise<QueryResponse> {
  return request<QueryResponse>('/query', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// Sources
export async function getSources(skip = 0, limit = 50): Promise<SourceListResponse> {
  return request<SourceListResponse>(`/sources?skip=${skip}&limit=${limit}`);
}

export async function uploadSource(
  file: File,
  title: string,
  sourceType: SourceType
): Promise<SourceUploadResponse> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('title', title);
  formData.append('source_type', sourceType);

  return request<SourceUploadResponse>('/sources/upload', {
    method: 'POST',
    body: formData,
  });
}
