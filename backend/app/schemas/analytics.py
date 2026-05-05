"""Analytics Pydantic Şemaları."""

from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel


class TimeSeriesPoint(BaseModel):
    date: str
    session_count: int
    accuracy_rate: float
    avg_response_time_ms: Optional[float] = None


class StudentAnalyticsResponse(BaseModel):
    student_id: UUID
    student_name: str
    disability_type: str
    total_sessions: int = 0
    overall_accuracy: float = 0.0
    trend: str = "stable"
    time_series: List[TimeSeriesPoint] = []


class StudentSummary(BaseModel):
    id: UUID
    name: str
    disability_type: str
    sessions_count: int = 0
    accuracy_trend: str = "stable"


class SourceStats(BaseModel):
    total_sources: int
    total_chunks: int
    total_queries: int


class DashboardResponse(BaseModel):
    total_students: int
    total_sessions: int
    avg_accuracy_all: float
    students_summary: List[StudentSummary]
    source_stats: SourceStats
