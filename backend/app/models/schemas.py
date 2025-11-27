from pydantic import BaseModel, Field
from typing import Optional, List, Literal
from datetime import datetime
from enum import Enum


# Enums
class ProgrammingLanguage(str, Enum):
    PYTHON = "python"
    JAVASCRIPT = "javascript"
    CPP = "cpp"


class ContentLanguage(str, Enum):
    RU = "ru"
    EN = "en"


class Difficulty(str, Enum):
    EASY = "easy"
    MEDIUM = "medium"
    HARD = "hard"


class InterviewDirection(str, Enum):
    FRONTEND = "frontend"
    BACKEND = "backend"
    FULLSTACK = "fullstack"
    DATA_SCIENCE = "data_science"
    DEVOPS = "devops"


class TaskType(str, Enum):
    ALGORITHM = "algorithm"  # Requires code execution
    SYSTEM_DESIGN = "system_design"  # LLM evaluation only
    CODE_REVIEW = "code_review"  # LLM evaluation only
    DEBUGGING = "debugging"  # LLM evaluation only
    PRACTICAL = "practical"  # LLM evaluation only


class InterviewStatus(str, Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    TERMINATED = "terminated"


class AntiCheatEventType(str, Enum):
    TAB_SWITCH = "tab_switch"
    COPY_PASTE = "copy_paste"
    DEVTOOLS_OPEN = "devtools_open"
    FOCUS_LOSS = "focus_loss"
    LARGE_PASTE = "large_paste"
    SUSPICIOUS_TYPING = "suspicious_typing"
    CODE_CHANGE_TIMESTAMP = "code_change_timestamp"
    LARGE_CODE_CHANGE = "large_code_change"
    EXTERNAL_SERVICE_REQUEST = "external_service_request"
    AI_SERVICE_REQUEST = "ai_service_request"
    CALL_SERVICE_REQUEST = "call_service_request"
    FREQUENT_PASTE = "frequent_paste"
    CODE_PASTE = "code_paste"


# Request schemas
class StartInterviewRequest(BaseModel):
    candidate_name: str
    candidate_email: str
    direction: InterviewDirection
    language: ProgrammingLanguage
    difficulty: Difficulty = Difficulty.MEDIUM
    task_language: ContentLanguage = ContentLanguage.RU
    use_task_bank: bool = False  # Использовать задачи из базы вместо генерации


class GenerateTaskRequest(BaseModel):
    interview_id: str
    task_number: int
    previous_performance: Optional[float] = None


class SubmitCodeRequest(BaseModel):
    interview_id: str
    task_id: str
    code: str
    language: ProgrammingLanguage


class ChatMessageRequest(BaseModel):
    interview_id: str
    message: str
    context: Literal["softskills", "task_discussion"] = "softskills"
    task_id: Optional[str] = None


class HintRequest(BaseModel):
    interview_id: str
    task_id: str
    code: str


class AntiCheatEventRequest(BaseModel):
    interview_id: str
    event_type: AntiCheatEventType
    details: Optional[dict] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class FinishInterviewRequest(BaseModel):
    interview_id: str


# Response schemas
class TaskResponse(BaseModel):
    id: str
    title: str
    description: str
    task_type: TaskType
    difficulty: Difficulty
    examples: List[dict]
    constraints: Optional[List[str]] = None
    time_limit_minutes: int = 15
    starter_code: Optional[dict] = None  # {language: code}
    total_tasks: Optional[int] = None  # Адаптивное количество задач


class CodeExecutionResult(BaseModel):
    success: bool
    output: Optional[str] = None
    error: Optional[str] = None
    execution_time_ms: int = 0
    memory_used_mb: float = 0
    test_results: Optional[List[dict]] = None
    feedback: Optional[str] = None  # Фидбэк от LLM о том, что можно улучшить


class CodeEvaluationResult(BaseModel):
    score: float  # 0-100
    feedback: str
    strengths: List[str]
    improvements: List[str]
    code_quality: float
    efficiency: float
    correctness: float


class HintResponse(BaseModel):
    hint: str
    hint_number: int
    hints_remaining: int


class InterviewFeedback(BaseModel):
    interview_id: str
    candidate_name: str
    overall_score: float
    technical_score: float
    softskills_score: float
    tasks_completed: int
    total_tasks: int
    hints_used: int
    anti_cheat_flags: int
    strengths: List[str]
    areas_for_improvement: List[str]
    recommendation: str
    detailed_task_results: List[dict]
    softskills_assessment: dict
    created_at: datetime
    # Дополнительные метрики
    total_time_seconds: Optional[int] = None  # Общее время интервью
    average_task_time_seconds: Optional[int] = None  # Среднее время на задачу
    total_submission_attempts: Optional[int] = None  # Общее количество попыток отправки
    total_test_runs: Optional[int] = None  # Общее количество запусков тестов
    total_compilation_errors: Optional[int] = None  # Общее количество ошибок компиляции
    total_execution_errors: Optional[int] = None  # Общее количество ошибок выполнения
    technical_feedback: Optional[str] = None  # Развернутая обратная связь от LLM кодера
    softskills_feedback: Optional[str] = None  # Развернутая обратная связь от LLM чата


class InterviewStatusResponse(BaseModel):
    interview_id: str
    status: InterviewStatus
    current_task: int
    total_tasks: int
    time_remaining_seconds: int
    tasks_completed: List[str]
