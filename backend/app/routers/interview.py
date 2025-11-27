from datetime import datetime
import json
import logging
import random
from typing import Dict

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError, DBAPIError

from app.models.database import get_db
from app.models.schemas import (
    StartInterviewRequest, GenerateTaskRequest, SubmitCodeRequest,
    ChatMessageRequest, HintRequest, AntiCheatEventRequest,
    FinishInterviewRequest, TaskResponse, CodeExecutionResult,
    CodeEvaluationResult, HintResponse, InterviewFeedback,
    InterviewStatusResponse, InterviewStatus, TaskType, AntiCheatEventType,
    InterviewDirection, ProgrammingLanguage, Difficulty
)
from app.models.entities import Interview, InterviewTask, ChatMessage, AntiCheatEvent, AntiCheatMetrics, TaskBank
from app.services.scibox_client import scibox_client
from app.services.code_executor import code_executor
from app.services.anti_cheat import anti_cheat_service

router = APIRouter(prefix="/api/interview", tags=["interview"])

# Helper function for safe DB operations
async def safe_db_operation(operation, error_message="Database operation failed"):
    """Safely execute database operations with error handling"""
    try:
        return await operation()
    except (SQLAlchemyError, DBAPIError) as e:
        logging.error(f"{error_message}: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"{error_message}: {str(e)}"
        )
    except Exception as e:
        logging.error(f"Unexpected error in {error_message}: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Unexpected error: {str(e)}"
        )


@router.post("/start")
async def start_interview(
    request: StartInterviewRequest,
    db: AsyncSession = Depends(get_db)
):
    """Start a new interview session"""
    # Адаптивное количество задач: начнем с 5, будет корректироваться по производительности
    initial_task_count = 5
    
    # Ensure Enum values are converted to strings for database storage
    direction_value = request.direction.value if isinstance(request.direction, InterviewDirection) else str(request.direction).lower()
    
    # Для language и difficulty передаем Enum напрямую - SQLAlchemy сам конвертирует в значение через SQLEnum
    interview = Interview(
        candidate_name=request.candidate_name,
        candidate_email=request.candidate_email,
        direction=direction_value,  # Используем строку напрямую, т.к. в БД колонка String
        language=request.language,  # Передаем Enum напрямую - SQLAlchemy конвертирует в значение
        task_language=request.task_language.value,
        difficulty=request.difficulty,  # Передаем Enum напрямую - SQLAlchemy конвертирует в значение
        status=InterviewStatus.IN_PROGRESS,
        total_tasks=initial_task_count,
        use_task_bank=request.use_task_bank,
        started_at=datetime.utcnow()
    )
    
    db.add(interview)
    await db.commit()
    await db.refresh(interview)
    
    return {
        "interview_id": interview.id,
        "status": interview.status.value,
        "total_tasks": interview.total_tasks,
        "direction": interview.direction,  # direction теперь строка, не Enum
        "language": interview.language.value,
        "difficulty": interview.difficulty.value,
        "started_at": interview.started_at.isoformat(),
        "task_language": interview.task_language,
        "use_task_bank": interview.use_task_bank
    }


@router.post("/generate-task", response_model=TaskResponse)
async def generate_task(
    request: GenerateTaskRequest,
    db: AsyncSession = Depends(get_db)
):
    """Generate the next task for the interview"""
    # Get interview
    result = await db.execute(select(Interview).where(Interview.id == request.interview_id))
    interview = result.scalar_one_or_none()
    
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")
    
    if interview.status != InterviewStatus.IN_PROGRESS:
        raise HTTPException(status_code=400, detail="Interview is not in progress")
    
    # Адаптивное количество задач на основе производительности
    if request.previous_performance is not None:
        # Если справляется хорошо (score > 80%), уменьшаем до минимума 4
        # Если не справляется (score < 40%), увеличиваем до максимума 8
        if request.previous_performance > 80 and interview.total_tasks > 4:
            interview.total_tasks = max(4, interview.total_tasks - 1)
        elif request.previous_performance < 40 and interview.total_tasks < 8:
            interview.total_tasks = min(8, interview.total_tasks + 1)
        await db.commit()
    
    # Выбираем задачу из базы или генерируем
    if interview.use_task_bank:
        # Получаем задачи из базы
        # Преобразуем строку direction в Enum для сравнения с TaskBank
        direction_enum = InterviewDirection(interview.direction) if isinstance(interview.direction, str) else interview.direction
        task_bank_query = select(TaskBank).where(
            TaskBank.direction == direction_enum,
            TaskBank.difficulty == interview.difficulty
        )
        
        # Получаем уже использованные задачи
        used_tasks_result = await db.execute(
            select(InterviewTask.task_number)
            .where(InterviewTask.interview_id == interview.id)
        )
        used_numbers = {t[0] for t in used_tasks_result.all()}
        
        # Исключаем уже использованные задачи
        task_bank_result = await db.execute(task_bank_query)
        available_tasks = [t for t in task_bank_result.scalars().all() if t.times_used < 10]  # Ограничение использования
        
        if not available_tasks:
            # Если нет доступных задач в базе, генерируем
            task_data = await scibox_client.generate_task(
                direction=interview.direction,  # direction теперь строка
                difficulty=interview.difficulty.value,
                language=interview.language.value,
                task_number=request.task_number,
                previous_performance=request.previous_performance,
                response_language=interview.task_language
            )
        else:
            # Выбираем задачу (можно добавить логику выбора по эмбеддингам)
            bank_task = random.choice(available_tasks)
            
            # Обновляем счетчик использования
            bank_task.times_used = (bank_task.times_used or 0) + 1
            await db.commit()
            
            task_data = {
                "title": bank_task.title,
                "description": bank_task.description,
                "task_type": bank_task.task_type.value,
                "examples": bank_task.examples or [],
                "constraints": bank_task.constraints or [],
                "test_cases": bank_task.test_cases or [],
                "starter_code": bank_task.starter_code or {},
            }
    else:
        # Generate task using LLM
        try:
            task_data = await scibox_client.generate_task(
                direction=interview.direction,  # direction теперь строка
                difficulty=interview.difficulty.value,
                language=interview.language.value,
                task_number=request.task_number,
                previous_performance=request.previous_performance,
                response_language=interview.task_language
            )
            # Логируем успешную генерацию для отладки
            logging.info(
                f"Task generated successfully: id={task_data.get('title', 'N/A')}, "
                f"has_description={bool(task_data.get('description'))}, "
                f"has_examples={bool(task_data.get('examples'))}, "
                f"has_test_cases={bool(task_data.get('test_cases'))}"
            )
        except Exception as e:
            logging.error(f"Error generating task: {e}", exc_info=True)
            # Не выбрасываем ошибку, а возвращаем дефолтную задачу
            task_data = {
                "title": f"Task {request.task_number}",
                "description": f"Произошла ошибка при генерации задачи. Пожалуйста, попробуйте еще раз или обратитесь к администратору. Ошибка: {str(e)[:100]}",
                "task_type": "practical",
                "examples": [],
                "constraints": [],
                "test_cases": [],
                "starter_code": {},
            }
    
    # Create task in database
    task = InterviewTask(
        interview_id=interview.id,
        task_number=request.task_number,
        title=task_data.get("title", f"Task {request.task_number}"),
        description=task_data.get("description", ""),
        task_type=TaskType(task_data.get("task_type", "practical")),
        difficulty=interview.difficulty,
        examples=task_data.get("examples", []),
        constraints=task_data.get("constraints", []),
        test_cases=task_data.get("test_cases", []),
        starter_code=task_data.get("starter_code", {}),
        started_at=datetime.utcnow()
    )
    
    db.add(task)
    await db.commit()
    await db.refresh(task)
    
    # Логируем финальный ответ для отладки
    logging.info(
        f"Returning task response: id={task.id}, title={task.title}, "
        f"description_length={len(task.description)}, "
        f"examples_count={len(task.examples or [])}, "
        f"has_starter_code={bool(task.starter_code)}"
    )
    
    return TaskResponse(
        id=task.id,
        title=task.title,
        description=task.description,
        task_type=task.task_type,
        difficulty=task.difficulty,
        examples=task.examples or [],
        constraints=task.constraints,
        time_limit_minutes=15,
        starter_code=task.starter_code
    )


@router.post("/submit-code")
async def submit_code(
    request: SubmitCodeRequest,
    db: AsyncSession = Depends(get_db)
):
    """Submit code for execution and evaluation"""
    try:
        # Get task
        result = await safe_db_operation(
            lambda: db.execute(select(InterviewTask).where(InterviewTask.id == request.task_id)),
            "Failed to fetch task"
        )
        task = result.scalar_one_or_none()
        
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")
        
        # Store submitted code
        task.submitted_code = request.code
        # Убеждаемся, что передаем Enum объект, SQLAlchemy сам конвертирует через SQLEnum
        task.submission_language = request.language
        task.submitted_at = datetime.utcnow()
        task.submission_attempts = (task.submission_attempts or 0) + 1
        
        interview_result = await safe_db_operation(
            lambda: db.execute(select(Interview).where(Interview.id == request.interview_id)),
            "Failed to fetch interview"
        )
        interview = interview_result.scalar_one_or_none()
        if not interview:
            raise HTTPException(status_code=404, detail="Interview not found")
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error in submit_code: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

    execution_result = None
    
    # Execute code only for algorithm tasks
    if task.task_type == TaskType.ALGORITHM and task.test_cases:
        execution_result = await code_executor.execute(
            code=request.code,
            language=request.language,
            test_cases=task.test_cases
        )
        task.execution_result = execution_result
        
        # Track errors
        if execution_result and not execution_result.get("success"):
            error = execution_result.get("error", "")
            if "syntax" in error.lower() or "compile" in error.lower() or "parse" in error.lower():
                task.compilation_errors = (task.compilation_errors or 0) + 1
            else:
                task.execution_errors = (task.execution_errors or 0) + 1
    
    evaluation = None
    starter_code_for_lang = (task.starter_code or {}).get(request.language.value)
    normalized_submission = _normalize_code(request.code)
    if starter_code_for_lang:
        starter_normalized = _normalize_code(starter_code_for_lang)
        if not normalized_submission or normalized_submission == starter_normalized:
            evaluation = {
                "score": 0,
                "feedback": _localized_message("unchanged_code", interview.task_language),
                "strengths": [],
                "improvements": [],
                "code_quality": 0,
                "efficiency": 0,
                "correctness": 0,
            }

    if evaluation is None:
        evaluation = await scibox_client.evaluate_code(
            code=request.code,
            task={
                "title": task.title,
                "description": task.description,
                "task_type": task.task_type.value
            },
            language=request.language.value,
            execution_result=execution_result,
            response_language=interview.task_language
        )
    
    # Update task with evaluation
    task.score = evaluation.get("score", 0)
    task.feedback = evaluation.get("feedback", "")
    task.code_quality = evaluation.get("code_quality", 0)
    task.efficiency = evaluation.get("efficiency", 0)
    task.correctness = evaluation.get("correctness", 0)
    
    # Check for AI-generated code
    anti_cheat_result = await anti_cheat_service.analyze_code_submission(
        interview_id=request.interview_id,
        code=request.code
    )
    
    try:
        await safe_db_operation(
            lambda: db.commit(),
            "Failed to commit task submission"
        )
    except HTTPException:
        # Rollback on error
        await db.rollback()
        raise
    
    return {
        "task_id": task.id,
        "execution_result": execution_result,
        "evaluation": evaluation,
        "anti_cheat": anti_cheat_result
    }


@router.post("/run-tests")
async def run_tests(
    request: SubmitCodeRequest,
    db: AsyncSession = Depends(get_db)
):
    """Run visible tests without final evaluation"""
    try:
        result = await safe_db_operation(
            lambda: db.execute(select(InterviewTask).where(InterviewTask.id == request.task_id)),
            "Failed to fetch task"
        )
        task = result.scalar_one_or_none()
        
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")
        
        if task.task_type != TaskType.ALGORITHM:
            return {"message": "Tests only available for algorithm tasks"}
        
        # Increment test runs counter
        task.test_runs = (task.test_runs or 0) + 1
        
        # Run only visible test cases (first 2-3)
        visible_tests = (task.test_cases or [])[:3]
        
        execution_result = await code_executor.execute(
            code=request.code,
            language=request.language,
            test_cases=visible_tests
        )
        
        # Track errors during test runs
        if execution_result and not execution_result.get("success"):
            error = execution_result.get("error", "")
            if "syntax" in error.lower() or "compile" in error.lower() or "parse" in error.lower():
                task.compilation_errors = (task.compilation_errors or 0) + 1
            else:
                task.execution_errors = (task.execution_errors or 0) + 1
        
        await safe_db_operation(
            lambda: db.commit(),
            "Failed to commit test run"
        )
        
        return execution_result
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error in run_tests: {e}", exc_info=True)
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/hint", response_model=HintResponse)
async def get_hint(
    request: HintRequest,
    db: AsyncSession = Depends(get_db)
):
    """Get a hint for the current task (counts against score)"""
    result = await db.execute(select(InterviewTask).where(InterviewTask.id == request.task_id))
    task = result.scalar_one_or_none()
    
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Get interview first
    interview_result = await db.execute(
        select(Interview).where(Interview.id == request.interview_id)
    )
    interview = interview_result.scalar_one_or_none()
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")
    
    # Increment hint counter
    task.hints_used = (task.hints_used or 0) + 1
    hint_number = task.hints_used
    
    # Max 3 hints per task
    if hint_number > 3:
        raise HTTPException(status_code=400, detail="Maximum hints reached")
    
    # Generate hint
    hint = await scibox_client.generate_hint(
        code=request.code,
        task={"title": task.title, "description": task.description},
        hint_number=hint_number,
        response_language=interview.task_language
    )
    
    # Update interview hints counter
    interview.hints_used = (interview.hints_used or 0) + 1
    
    await db.commit()
    
    return HintResponse(
        hint=hint,
        hint_number=hint_number,
        hints_remaining=3 - hint_number
    )


@router.post("/chat")
async def chat(request: ChatMessageRequest, db: AsyncSession = Depends(get_db)):
    """Chat with AI interviewer (soft skills) - streaming response"""
    try:
        # Get interview
        result = await safe_db_operation(
            lambda: db.execute(select(Interview).where(Interview.id == request.interview_id)),
            "Failed to fetch interview"
        )
        interview = result.scalar_one_or_none()
        
        if not interview:
            raise HTTPException(status_code=404, detail="Interview not found")
        
        # Get chat history
        history_result = await safe_db_operation(
            lambda: db.execute(
                select(ChatMessage)
                .where(ChatMessage.interview_id == request.interview_id)
                .where(ChatMessage.context == request.context)
                .order_by(ChatMessage.created_at)
            ),
            "Failed to fetch chat history"
        )
        history = history_result.scalars().all()
        
        # Save user message
        user_message = ChatMessage(
            interview_id=interview.id,
            role="user",
            content=request.message,
            context=request.context
        )
        db.add(user_message)
        await safe_db_operation(
            lambda: db.commit(),
            "Failed to save user message"
        )
        
        # Prepare messages for LLM
        messages = [{"role": m.role, "content": m.content} for m in history]
        messages.append({"role": "user", "content": request.message})
        
        # Stream response
        task_context = None
        if request.task_id:
            task_query = await safe_db_operation(
                lambda: db.execute(
                    select(InterviewTask).where(
                        InterviewTask.id == request.task_id,
                        InterviewTask.interview_id == interview.id
                    )
                ),
                "Failed to fetch task"
            )
            task_entity = task_query.scalar_one_or_none()
            if task_entity:
                task_context = {
                    "task_number": task_entity.task_number,
                    "title": task_entity.title,
                    "description": task_entity.description
                }
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error in chat: {e}", exc_info=True)
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

    async def generate():
        full_response = ""
        async for chunk in scibox_client.chat_softskills(
            messages=messages,
            interview_context={
                "candidate_name": interview.candidate_name,
                "direction": interview.direction,  # direction теперь строка
                "task_language": interview.task_language,
                "current_task": task_context
            },
            response_language=interview.task_language
        ):
            full_response += chunk
            yield f"data: {json.dumps({'content': chunk})}\n\n"
        
        # Save assistant message
        try:
            assistant_message = ChatMessage(
                interview_id=interview.id,
                role="assistant",
                content=full_response,
                context=request.context
            )
            db.add(assistant_message)
            await safe_db_operation(
                lambda: db.commit(),
                "Failed to save assistant message"
            )
        except Exception as e:
            logging.error(f"Error saving assistant message: {e}", exc_info=True)
            await db.rollback()
        
        yield "data: [DONE]\n\n"
    
    return StreamingResponse(generate(), media_type="text/event-stream")


@router.post("/anti-cheat-event")
async def record_anti_cheat_event(
    request: AntiCheatEventRequest,
    db: AsyncSession = Depends(get_db)
):
    """Record an anti-cheat event"""
    try:
        # Record in service
        result = anti_cheat_service.record_event(
            interview_id=request.interview_id,
            event_type=request.event_type,
            details=request.details
        )
        
        # Extract extended metrics from details
        typing_patterns = request.details.get("typing_patterns") if request.details else None
        code_change_timestamps = request.details.get("changes") if request.details else None
        code_style_analysis = request.details.get("style_analysis") if request.details else None
        network_activity = request.details if request.event_type in [
            AntiCheatEventType.EXTERNAL_SERVICE_REQUEST,
            AntiCheatEventType.AI_SERVICE_REQUEST,
            AntiCheatEventType.CALL_SERVICE_REQUEST
        ] else None
        clipboard_analysis = request.details if request.event_type in [
            AntiCheatEventType.LARGE_PASTE,
            AntiCheatEventType.FREQUENT_PASTE,
            AntiCheatEventType.CODE_PASTE
        ] else None
        
        # Store in database
        event = AntiCheatEvent(
            interview_id=request.interview_id,
            event_type=request.event_type,
            details=request.details,
            severity=result["severity"],
            typing_patterns=typing_patterns,
            code_change_timestamps=code_change_timestamps,
            code_style_analysis=code_style_analysis,
            network_activity=network_activity,
            clipboard_analysis=clipboard_analysis
        )
        db.add(event)
        
        # Update interview flags count
        interview_result = await safe_db_operation(
            lambda: db.execute(select(Interview).where(Interview.id == request.interview_id)),
            "Failed to fetch interview"
        )
        interview = interview_result.scalar_one_or_none()
        if interview:
            interview.anti_cheat_flags = result["flags_count"]
        
        await safe_db_operation(
            lambda: db.commit(),
            "Failed to commit anti-cheat event"
        )
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error in record_anti_cheat_event: {e}", exc_info=True)
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/finish")
async def finish_interview(
    request: FinishInterviewRequest,
    db: AsyncSession = Depends(get_db)
):
    """Finish the interview and generate final assessment"""
    try:
        # Get interview with all related data
        result = await safe_db_operation(
            lambda: db.execute(select(Interview).where(Interview.id == request.interview_id)),
            "Failed to fetch interview"
        )
        interview = result.scalar_one_or_none()
        
        if not interview:
            raise HTTPException(status_code=404, detail="Interview not found")
        
        # Get tasks
        tasks_result = await safe_db_operation(
            lambda: db.execute(select(InterviewTask).where(InterviewTask.interview_id == interview.id)),
            "Failed to fetch tasks"
        )
        tasks = tasks_result.scalars().all()
        
        # Get chat history
        chat_result = await safe_db_operation(
            lambda: db.execute(
                select(ChatMessage)
                .where(ChatMessage.interview_id == interview.id)
                .where(ChatMessage.context == "softskills")
            ),
            "Failed to fetch chat history"
        )
        chat_history = chat_result.scalars().all()
        
        # Prepare data for assessment
        interview_data = {
            "candidate_name": interview.candidate_name,
            "direction": interview.direction,  # direction теперь строка
            "difficulty": interview.difficulty.value,
            "tasks_completed": len([t for t in tasks if t.submitted_code]),
            "total_tasks": interview.total_tasks,
            "hints_used": interview.hints_used or 0,
            "anti_cheat_flags": interview.anti_cheat_flags or 0,
            "task_results": [
                {
                    "title": t.title,
                    "score": t.score,
                    "feedback": t.feedback,
                    "hints_used": t.hints_used
                }
                for t in tasks
            ],
            "chat_history": [
                {"role": m.role, "content": m.content}
                for m in chat_history
            ]
        }
        
        # Get anti-cheat events from database
        events_result = await safe_db_operation(
            lambda: db.execute(
                select(AntiCheatEvent)
                .where(AntiCheatEvent.interview_id == interview.id)
                .order_by(AntiCheatEvent.created_at)
            ),
            "Failed to fetch anti-cheat events"
        )
        events = events_result.scalars().all()
        
        # Get anti-cheat metrics from service (uses in-memory cache)
        anti_cheat_summary = anti_cheat_service.get_interview_summary(interview.id)
        
        # Aggregate metrics from database events for long-term storage
        typing_wpm = None
        typing_cv = None
        backspace_ratio = None
        pause_count = None
        code_changes_count = 0
        large_changes_count = 0
        style_consistency_score = None
        is_too_perfect = False
        external_requests_count = 0
        ai_service_detected = False
        call_service_detected = False
        clipboard_operations_count = 0
        large_clipboard_pastes = 0
        
        for event in events:
            if event.typing_patterns:
                typing_wpm = event.typing_patterns.get("wpm")
                typing_cv = event.typing_patterns.get("coefficient_of_variation")
                backspace_ratio = event.typing_patterns.get("backspace_ratio")
                pause_count = event.typing_patterns.get("pause_count")
            if event.code_change_timestamps:
                code_changes_count += len(event.code_change_timestamps)
                large_changes = [c for c in event.code_change_timestamps if abs(c.get("lines", 0)) > 50]
                large_changes_count += len(large_changes)
            if event.code_style_analysis:
                style_consistency_score = event.code_style_analysis.get("style_consistency_score")
                is_too_perfect = event.code_style_analysis.get("is_too_perfect", False)
            if event.network_activity:
                external_requests_count += 1
                if event.event_type in [AntiCheatEventType.AI_SERVICE_REQUEST]:
                    ai_service_detected = True
                if event.event_type in [AntiCheatEventType.CALL_SERVICE_REQUEST]:
                    call_service_detected = True
            if event.clipboard_analysis:
                clipboard_operations_count += 1
                if event.event_type == AntiCheatEventType.LARGE_PASTE:
                    large_clipboard_pastes += 1
        
        # Save aggregated metrics to AntiCheatMetrics table
        metrics = AntiCheatMetrics(
            interview_id=interview.id,
            typing_wpm=typing_wpm,
            typing_cv=typing_cv,
            backspace_ratio=backspace_ratio,
            pause_count=pause_count,
            code_changes_count=code_changes_count,
            large_changes_count=large_changes_count,
            style_consistency_score=style_consistency_score,
            is_too_perfect=is_too_perfect,
            external_requests_count=external_requests_count,
            ai_service_detected=ai_service_detected,
            call_service_detected=call_service_detected,
            clipboard_operations_count=clipboard_operations_count,
            large_clipboard_pastes=large_clipboard_pastes,
            aggregate_score=anti_cheat_summary.get("aggregate_score", 0),
            flags_count=anti_cheat_summary.get("flags_count", 0)
        )
        db.add(metrics)
        
        # Add anti-cheat metrics to interview data
        interview_data["anti_cheat_metrics"] = {
            "aggregate_score": anti_cheat_summary.get("aggregate_score", 0),
            "flags_count": anti_cheat_summary.get("flags_count", 0),
            "total_events": anti_cheat_summary.get("total_events", 0),
            "events_by_type": anti_cheat_summary.get("events_by_type", {}),
            "is_flagged": anti_cheat_summary.get("is_flagged", False),
            "typing_patterns": anti_cheat_summary.get("typing_patterns"),
            "code_style_analysis": anti_cheat_summary.get("code_style_analysis"),
            "network_activity": anti_cheat_summary.get("network_activity", []),
            "clipboard_analysis": anti_cheat_summary.get("clipboard_analysis", [])
        }
        
        # Generate final assessment from technical LLM (coder)
        assessment = await scibox_client.generate_final_assessment(
            interview_data,
            response_language=interview.task_language
        )
        
        # Generate soft skills feedback from chat LLM
        softskills_feedback = await scibox_client.generate_softskills_feedback(
            chat_history=[
                {"role": m.role, "content": m.content}
                for m in chat_history
            ],
            interview_context={
                "candidate_name": interview.candidate_name,
                "direction": interview.direction,
                "difficulty": interview.difficulty.value,
            },
            response_language=interview.task_language
        )
        
        # Update interview
        interview.status = InterviewStatus.COMPLETED
        interview.finished_at = datetime.utcnow()
        interview.overall_score = assessment.get("overall_score", 0)
        interview.technical_score = assessment.get("technical_score", 0)
        interview.softskills_score = assessment.get("softskills_score", 0)
        interview.strengths = assessment.get("strengths", [])
        interview.areas_for_improvement = assessment.get("areas_for_improvement", [])
        interview.recommendation = assessment.get("recommendation", "")
        interview.softskills_assessment = assessment.get("softskills_assessment", {})
        interview.technical_feedback = assessment.get("technical_feedback", "")
        interview.softskills_feedback = softskills_feedback
        interview.tasks_completed = len([t for t in tasks if t.submitted_code])
        interview.anti_cheat_flags = anti_cheat_summary.get("flags_count", 0)
        
        await safe_db_operation(
            lambda: db.commit(),
            "Failed to commit interview completion"
        )
        
        return {
            "interview_id": interview.id,
            "status": "completed",
            "assessment": assessment
        }
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error in finish_interview: {e}", exc_info=True)
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/feedback/{interview_id}", response_model=InterviewFeedback)
async def get_feedback(interview_id: str, db: AsyncSession = Depends(get_db)):
    """Get the final interview feedback report"""
    try:
        result = await safe_db_operation(
            lambda: db.execute(select(Interview).where(Interview.id == interview_id)),
            "Failed to fetch interview"
        )
        interview = result.scalar_one_or_none()
        
        if not interview:
            raise HTTPException(status_code=404, detail="Interview not found")
        
        if interview.status != InterviewStatus.COMPLETED:
            raise HTTPException(status_code=400, detail="Interview not completed")
        
        # Get tasks
        tasks_result = await safe_db_operation(
            lambda: db.execute(select(InterviewTask).where(InterviewTask.interview_id == interview.id)),
            "Failed to fetch tasks"
        )
        tasks = tasks_result.scalars().all()
        
        # Calculate additional metrics
        total_time_seconds = None
        if interview.started_at and interview.finished_at:
            total_time_seconds = int((interview.finished_at - interview.started_at).total_seconds())
        
        # Calculate average task time
        completed_tasks_with_time = [t for t in tasks if t.submitted_at and t.started_at]
        average_task_time_seconds = None
        if completed_tasks_with_time:
            total_task_time = sum(
                int((t.submitted_at - t.started_at).total_seconds())
                for t in completed_tasks_with_time
            )
            average_task_time_seconds = int(total_task_time / len(completed_tasks_with_time))
        
        # Aggregate task metrics
        total_submission_attempts = sum(t.submission_attempts or 0 for t in tasks)
        total_test_runs = sum(t.test_runs or 0 for t in tasks)
        total_compilation_errors = sum(t.compilation_errors or 0 for t in tasks)
        total_execution_errors = sum(t.execution_errors or 0 for t in tasks)
    
        return InterviewFeedback(
            interview_id=interview.id,
            candidate_name=interview.candidate_name,
            overall_score=interview.overall_score or 0,
            technical_score=interview.technical_score or 0,
            softskills_score=interview.softskills_score or 0,
            tasks_completed=interview.tasks_completed or 0,
            total_tasks=interview.total_tasks,
            hints_used=interview.hints_used or 0,
            anti_cheat_flags=interview.anti_cheat_flags or 0,
            strengths=interview.strengths or [],
            areas_for_improvement=interview.areas_for_improvement or [],
            recommendation=interview.recommendation or "",
            detailed_task_results=[
                {
                    "title": t.title,
                    "score": t.score,
                    "feedback": t.feedback,
                    "code_quality": t.code_quality,
                    "efficiency": t.efficiency,
                    "correctness": t.correctness,
                    "hints_used": t.hints_used,
                    "time_spent_seconds": t.time_spent_seconds,
                    "submission_attempts": t.submission_attempts or 0,
                    "test_runs": t.test_runs or 0,
                    "compilation_errors": t.compilation_errors or 0,
                    "execution_errors": t.execution_errors or 0,
                }
                for t in tasks
            ],
            softskills_assessment=interview.softskills_assessment or {},
            created_at=interview.finished_at or interview.created_at,
            total_time_seconds=total_time_seconds,
            average_task_time_seconds=average_task_time_seconds,
            total_submission_attempts=total_submission_attempts,
            total_test_runs=total_test_runs,
            total_compilation_errors=total_compilation_errors,
            total_execution_errors=total_execution_errors,
            technical_feedback=interview.technical_feedback,
            softskills_feedback=interview.softskills_feedback,
        )
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error in get_feedback: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/status/{interview_id}", response_model=InterviewStatusResponse)
async def get_status(interview_id: str, db: AsyncSession = Depends(get_db)):
    """Get current interview status"""
    try:
        result = await safe_db_operation(
            lambda: db.execute(select(Interview).where(Interview.id == interview_id)),
            "Failed to fetch interview"
        )
        interview = result.scalar_one_or_none()
        
        if not interview:
            raise HTTPException(status_code=404, detail="Interview not found")
        
        tasks_result = await safe_db_operation(
            lambda: db.execute(select(InterviewTask).where(InterviewTask.interview_id == interview.id)),
            "Failed to fetch tasks"
        )
        tasks = tasks_result.scalars().all()
    
        completed_tasks = [t.id for t in tasks if t.submitted_code]
        current_task = len(completed_tasks) + 1
        
        # Calculate time remaining (60 min total)
        time_remaining = 3600
        if interview.started_at:
            elapsed = (datetime.utcnow() - interview.started_at).total_seconds()
            time_remaining = max(0, 3600 - int(elapsed))
        
        return InterviewStatusResponse(
            interview_id=interview.id,
            status=interview.status,
            current_task=current_task,
            total_tasks=interview.total_tasks,
            time_remaining_seconds=time_remaining,
            tasks_completed=completed_tasks
        )
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error in get_status: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


def _normalize_code(code: str) -> str:
    code = code or ""
    stripped = code.strip()
    if not stripped:
        return ""
    return "\n".join(line.rstrip() for line in stripped.splitlines())


def _localized_message(key: str, lang: str) -> str:
    translations: Dict[str, Dict[str, str]] = {
        "unchanged_code": {
            "ru": "Вы отправили стартовый шаблон без изменений. Пожалуйста, реализуйте решение перед отправкой.",
            "en": "You submitted the starter template without changes. Please implement a solution before submitting.",
        }
    }
    lang = lang or "en"
    return translations.get(key, {}).get(lang, translations.get(key, {}).get("en", ""))
