from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, Text, JSON, ForeignKey, Enum as SQLEnum, TypeDecorator
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid

from app.models.database import Base
from app.models.schemas import (
    InterviewStatus, InterviewDirection, ProgrammingLanguage, 
    Difficulty, TaskType, AntiCheatEventType
)


class EnumToLowercaseString(TypeDecorator):
    """TypeDecorator для автоматической конвертации enum в lowercase строку с поддержкой PostgreSQL enum"""
    impl = SQLEnum
    cache_ok = True
    
    def __init__(self, enum_class, length=None, *args, **kwargs):
        # Используем SQLEnum с native_enum=False для PostgreSQL
        self.enum_class = enum_class
        self.impl = SQLEnum(
            enum_class,
            native_enum=False,
            values_callable=lambda x: [e.value.lower() for e in x],
            length=length,
            *args,
            **kwargs
        )
        super().__init__(*args, **kwargs)
    
    def process_bind_param(self, value, dialect):
        """Конвертируем enum в lowercase строку при сохранении в БД"""
        if value is None:
            return None
        if isinstance(value, self.enum_class):
            return value.value.lower()
        if isinstance(value, str):
            return value.lower()
        return str(value).lower()
    
    def process_result_value(self, value, dialect):
        """Конвертируем строку обратно в enum при чтении из БД"""
        if value is None:
            return None
        try:
            return self.enum_class(value.lower())
        except (ValueError, AttributeError):
            return value
    
    def load_dialect_impl(self, dialect):
        """Используем SQLEnum для PostgreSQL с правильным кастингом"""
        return self.impl


def generate_uuid():
    return str(uuid.uuid4())


class Admin(Base):
    __tablename__ = "admins"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    username = Column(String(100), unique=True, nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True)
    is_superadmin = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_login = Column(DateTime, nullable=True)


class Interview(Base):
    __tablename__ = "interviews"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    candidate_name = Column(String(255), nullable=False)
    candidate_email = Column(String(255), nullable=False, index=True)
    direction = Column(String(50), nullable=False)  # Используем String вместо SQLEnum для совместимости с БД
    language = Column(EnumToLowercaseString(ProgrammingLanguage, 50), nullable=False)
    task_language = Column(String(10), default="ru")
    difficulty = Column(EnumToLowercaseString(Difficulty, 20), nullable=False)
    status = Column(EnumToLowercaseString(InterviewStatus, 20), default=InterviewStatus.PENDING)
    
    # Scores
    overall_score = Column(Float, nullable=True)
    technical_score = Column(Float, nullable=True)
    softskills_score = Column(Float, nullable=True)
    
    # Metrics
    total_tasks = Column(Integer, default=5)
    tasks_completed = Column(Integer, default=0)
    hints_used = Column(Integer, default=0)
    anti_cheat_flags = Column(Integer, default=0)
    use_task_bank = Column(Boolean, default=False)  # Использовать задачи из базы
    
    # AI Assessment
    strengths = Column(JSON, nullable=True)
    areas_for_improvement = Column(JSON, nullable=True)
    recommendation = Column(Text, nullable=True)
    softskills_assessment = Column(JSON, nullable=True)
    technical_feedback = Column(Text, nullable=True)  # Развернутая обратная связь от LLM кодера
    softskills_feedback = Column(Text, nullable=True)  # Развернутая обратная связь от LLM чата
    
    # Timestamps
    started_at = Column(DateTime, nullable=True)
    finished_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    tasks = relationship("InterviewTask", back_populates="interview", cascade="all, delete-orphan")
    chat_messages = relationship("ChatMessage", back_populates="interview", cascade="all, delete-orphan")
    anti_cheat_events = relationship("AntiCheatEvent", back_populates="interview", cascade="all, delete-orphan")
    anti_cheat_metrics = relationship("AntiCheatMetrics", back_populates="interview", cascade="all, delete-orphan")


class InterviewTask(Base):
    __tablename__ = "interview_tasks"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    interview_id = Column(String, ForeignKey("interviews.id"), nullable=False)
    task_number = Column(Integer, nullable=False)
    
    # Task details
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    task_type = Column(EnumToLowercaseString(TaskType, 50), nullable=False)
    difficulty = Column(EnumToLowercaseString(Difficulty, 20), nullable=False)
    examples = Column(JSON, nullable=True)
    constraints = Column(JSON, nullable=True)
    test_cases = Column(JSON, nullable=True)  # For algorithm tasks
    starter_code = Column(JSON, nullable=True)
    
    # Submission
    submitted_code = Column(Text, nullable=True)
    submission_language = Column(EnumToLowercaseString(ProgrammingLanguage, 50), nullable=True)
    
    # Evaluation
    score = Column(Float, nullable=True)
    feedback = Column(Text, nullable=True)
    code_quality = Column(Float, nullable=True)
    efficiency = Column(Float, nullable=True)
    correctness = Column(Float, nullable=True)
    execution_result = Column(JSON, nullable=True)
    
    # Metrics
    hints_used = Column(Integer, default=0)
    time_spent_seconds = Column(Integer, nullable=True)
    submission_attempts = Column(Integer, default=0)  # Количество попыток отправки кода
    test_runs = Column(Integer, default=0)  # Количество запусков тестов (кнопка "Тесты")
    compilation_errors = Column(Integer, default=0)  # Количество ошибок компиляции
    execution_errors = Column(Integer, default=0)  # Количество ошибок выполнения
    
    # Timestamps
    started_at = Column(DateTime, nullable=True)
    submitted_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    interview = relationship("Interview", back_populates="tasks")


class ChatMessage(Base):
    __tablename__ = "chat_messages"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    interview_id = Column(String, ForeignKey("interviews.id"), nullable=False)
    
    role = Column(String(20), nullable=False)  # user, assistant
    content = Column(Text, nullable=False)
    context = Column(String(50), default="softskills")  # softskills, task_discussion
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    interview = relationship("Interview", back_populates="chat_messages")


class AntiCheatEvent(Base):
    __tablename__ = "anti_cheat_events"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    interview_id = Column(String, ForeignKey("interviews.id"), nullable=False)
    
    event_type = Column(EnumToLowercaseString(AntiCheatEventType, 50), nullable=False)
    details = Column(JSON, nullable=True)
    severity = Column(String(20), default="low")  # low, medium, high, critical
    
    # Расширенные метрики
    typing_patterns = Column(JSON, nullable=True)  # WPM, intervals, backspace ratio
    code_change_timestamps = Column(JSON, nullable=True)  # История изменений кода
    code_style_analysis = Column(JSON, nullable=True)  # Анализ стиля кода
    network_activity = Column(JSON, nullable=True)  # Сетевые запросы
    clipboard_analysis = Column(JSON, nullable=True)  # Анализ буфера обмена
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    interview = relationship("Interview", back_populates="anti_cheat_events")


class AntiCheatMetrics(Base):
    """Долгосрочное хранение метрик античита для анализа"""
    __tablename__ = "anti_cheat_metrics"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    interview_id = Column(String, ForeignKey("interviews.id"), nullable=False, index=True)
    
    # Паттерны печати
    typing_wpm = Column(Float, nullable=True)  # Words per minute
    typing_cv = Column(Float, nullable=True)  # Coefficient of variation
    backspace_ratio = Column(Float, nullable=True)
    pause_count = Column(Integer, nullable=True)
    
    # Временные метки изменений
    code_changes_count = Column(Integer, nullable=True)
    large_changes_count = Column(Integer, nullable=True)  # >50 строк за <5 сек
    average_change_size = Column(Float, nullable=True)
    
    # Анализ стиля
    style_consistency_score = Column(Float, nullable=True)  # 0-1
    is_too_perfect = Column(Boolean, nullable=True)
    style_change_detected = Column(Boolean, nullable=True)
    
    # Сетевая активность
    external_requests_count = Column(Integer, nullable=True)
    ai_service_detected = Column(Boolean, nullable=True)
    call_service_detected = Column(Boolean, nullable=True)
    
    # Буфер обмена
    clipboard_operations_count = Column(Integer, nullable=True)
    large_clipboard_pastes = Column(Integer, nullable=True)
    
    # Агрегированные метрики
    aggregate_score = Column(Float, nullable=True)
    flags_count = Column(Integer, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    interview = relationship("Interview", back_populates="anti_cheat_metrics")


class TaskBank(Base):
    """Банк задач для использования в интервью"""
    __tablename__ = "task_bank"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    
    # Task details
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    task_type = Column(EnumToLowercaseString(TaskType, 50), nullable=False)
    difficulty = Column(EnumToLowercaseString(Difficulty, 20), nullable=False)
    direction = Column(EnumToLowercaseString(InterviewDirection, 50), nullable=False)  # Направление интервью
    examples = Column(JSON, nullable=True)
    constraints = Column(JSON, nullable=True)
    test_cases = Column(JSON, nullable=True)  # Для алгоритмических задач
    starter_code = Column(JSON, nullable=True)  # Стартовый код по языкам
    expected_solution = Column(Text, nullable=True)  # Ожидаемое решение (опционально)
    
    # Embedding для поиска похожих задач
    embedding = Column(JSON, nullable=True)  # Вектор эмбеддинга от bge-m3
    
    # Metadata
    tags = Column(JSON, nullable=True)  # Теги для категоризации
    topic = Column(String(255), nullable=True)  # Тема задачи (алгоритмы, структуры данных и т.д.)
    language = Column(EnumToLowercaseString(ProgrammingLanguage, 50), nullable=True)  # Предпочтительный язык
    
    # Usage tracking
    times_used = Column(Integer, default=0)  # Сколько раз использовалась
    average_score = Column(Float, nullable=True)  # Средний балл кандидатов
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = Column(String, ForeignKey("admins.id"), nullable=True)  # Кто создал
