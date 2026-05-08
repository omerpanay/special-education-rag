/* ============================================
 * EduRAG Frontend — TypeScript Type Definitions
 * Mirror of backend Pydantic schemas
 * ============================================ */

// ── Auth ──
export interface TeacherRegister {
  email: string;
  password: string;
  full_name: string;
  institution?: string;
  branch?: string;
}

export interface TeacherLogin {
  email: string;
  password: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface TeacherResponse {
  id: string;
  email: string;
  full_name: string;
  institution?: string;
  branch?: string;
  created_at: string;
}

// ── RAG Query ──
export interface QueryRequest {
  query: string;
  student_id?: string;
  disability_type?: string;
  grade_level?: number;
  conversation_id?: string;
}

export interface Citation {
  source_id: string;
  source_title: string;
  source_type: string;
  page_numbers: number[];
  similarity_score: number;
}

export interface QueryResponse {
  id: string;
  answer: string;
  citations: Citation[];
  is_fallback: boolean;
  total_latency_ms?: number;
  created_at: string;
  conversation_id?: string;
}

// ── Sources ──
export type SourceType = 'MEB' | 'YOK_TEZ' | 'MAKALE' | 'SAGLIK_BAK';

export interface AcademicSource {
  id: string;
  title: string;
  source_type: SourceType;
  file_name: string;
  file_hash: string;
  page_count?: number;
  is_indexed: boolean;
  created_at: string;
}

export interface SourceUploadResponse {
  message: string;
  source: AcademicSource;
}

export interface SourceListResponse {
  sources: AcademicSource[];
  total: number;
}

// ── Students (Phase 4) ──
export type DisabilityType = 'disleksi' | 'zihin_yetersizligi' | 'otizm';

export interface Student {
  id: string;
  teacher_id: string;
  name: string;
  disability_type: DisabilityType;
  grade_level: number;
  competency_notes?: string;
  is_active: boolean;
  created_at: string;
}

export interface StudentCreate {
  name: string;
  disability_type: DisabilityType;
  grade_level: number;
  competency_notes?: string;
}

// ── Analytics (Phase 4) ──
export interface TimeSeriesPoint {
  date: string;
  session_count: number;
  accuracy_rate: number;
  avg_response_time_ms: number;
}

export interface StudentAnalytics {
  student_id: string;
  student_name: string;
  disability_type: string;
  total_sessions: number;
  overall_accuracy: number;
  trend: 'improving' | 'stable' | 'declining';
  time_series: TimeSeriesPoint[];
}

// ── Feedback ──
export interface FeedbackCreate {
  response_id: string;
  is_helpful: boolean;
}
