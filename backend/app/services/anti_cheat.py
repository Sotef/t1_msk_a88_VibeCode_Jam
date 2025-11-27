from typing import List, Optional
import numpy as np
from datetime import datetime, timedelta
from collections import defaultdict

from app.models.schemas import AntiCheatEventType
from app.services.scibox_client import scibox_client


class AntiCheatService:
    """Server-side anti-cheat detection and aggregation"""
    
    # Severity weights for different events
    EVENT_SEVERITY = {
        AntiCheatEventType.TAB_SWITCH: 0.1,
        AntiCheatEventType.COPY_PASTE: 0.2,
        AntiCheatEventType.DEVTOOLS_OPEN: 0.3,
        AntiCheatEventType.FOCUS_LOSS: 0.05,
        AntiCheatEventType.LARGE_PASTE: 0.5,
        AntiCheatEventType.SUSPICIOUS_TYPING: 0.4
    }
    
    # Thresholds
    LARGE_PASTE_THRESHOLD = 200  # characters
    TAB_SWITCH_WARNING_COUNT = 5
    CRITICAL_SCORE_THRESHOLD = 0.7
    
    def __init__(self):
        self.event_history: dict[str, List[dict]] = defaultdict(list)
    
    def record_event(
        self,
        interview_id: str,
        event_type: AntiCheatEventType,
        details: Optional[dict] = None
    ) -> dict:
        """Record an anti-cheat event and return severity assessment"""
        event = {
            "type": event_type,
            "details": details or {},
            "timestamp": datetime.utcnow(),
            "severity": self._calculate_event_severity(event_type, details)
        }
        
        self.event_history[interview_id].append(event)
        
        # Calculate aggregate metrics
        metrics = self._aggregate_metrics(interview_id)
        
        return {
            "event_recorded": True,
            "severity": event["severity"],
            "aggregate_score": metrics["aggregate_score"],
            "warning": metrics.get("warning"),
            "flags_count": metrics["flags_count"]
        }
    
    def _calculate_event_severity(
        self,
        event_type: AntiCheatEventType,
        details: Optional[dict]
    ) -> str:
        """Calculate severity level for an event"""
        base_weight = self.EVENT_SEVERITY.get(event_type, 0.1)
        
        # Adjust based on details
        if event_type == AntiCheatEventType.LARGE_PASTE and details:
            chars = details.get("characters", 0)
            if chars > 500:
                return "critical"
            elif chars > 300:
                return "high"
            elif chars > self.LARGE_PASTE_THRESHOLD:
                return "medium"
        
        if base_weight >= 0.4:
            return "high"
        elif base_weight >= 0.2:
            return "medium"
        return "low"
    
    def _aggregate_metrics(self, interview_id: str) -> dict:
        """Aggregate all events for an interview into metrics"""
        events = self.event_history.get(interview_id, [])
        
        if not events:
            return {
                "aggregate_score": 0,
                "flags_count": 0,
                "warning": None
            }
        
        # Count events by type
        event_counts = defaultdict(int)
        for event in events:
            event_counts[event["type"]] += 1
        
        # Calculate weighted score
        total_score = 0
        for event_type, count in event_counts.items():
            weight = self.EVENT_SEVERITY.get(event_type, 0.1)
            total_score += weight * min(count, 10)  # Cap at 10 per type
        
        # Normalize to 0-1
        aggregate_score = min(total_score / 5, 1.0)
        
        # Count high/critical flags
        flags_count = sum(1 for e in events if e["severity"] in ["high", "critical"])
        
        # Generate warning if needed
        warning = None
        if aggregate_score >= self.CRITICAL_SCORE_THRESHOLD:
            warning = "Critical: Multiple suspicious activities detected"
        elif event_counts[AntiCheatEventType.TAB_SWITCH] >= self.TAB_SWITCH_WARNING_COUNT:
            warning = "Warning: Frequent tab switching detected"
        elif event_counts[AntiCheatEventType.LARGE_PASTE] >= 2:
            warning = "Warning: Multiple large code pastes detected"
        
        return {
            "aggregate_score": round(aggregate_score, 2),
            "flags_count": flags_count,
            "warning": warning,
            "event_counts": dict(event_counts)
        }
    
    async def analyze_code_submission(
        self,
        interview_id: str,
        code: str,
        typing_patterns: Optional[dict] = None,
        previous_submissions: Optional[List[str]] = None,
        code_change_history: Optional[List[dict]] = None
    ) -> dict:
        """Analyze code submission for AI-generation patterns"""
        results = {
            "is_suspicious": False,
            "ai_detection": None,
            "pattern_analysis": None,
            "style_analysis": None,
            "code_change_analysis": None
        }
        
        # 1. AI detection via LLM
        ai_detection = await scibox_client.detect_ai_code(code)
        results["ai_detection"] = ai_detection
        
        if ai_detection.get("is_suspicious") and ai_detection.get("confidence", 0) > 0.7:
            self.record_event(
                interview_id,
                AntiCheatEventType.SUSPICIOUS_TYPING,
                {"reason": "AI-generated code detected", "confidence": ai_detection["confidence"]}
            )
            results["is_suspicious"] = True
        
        # 2. Analyze typing patterns if provided
        if typing_patterns:
            pattern_result = self._analyze_typing_patterns(typing_patterns)
            results["pattern_analysis"] = pattern_result
            
            if pattern_result.get("is_suspicious"):
                self.record_event(
                    interview_id,
                    AntiCheatEventType.SUSPICIOUS_TYPING,
                    pattern_result
                )
                results["is_suspicious"] = True
        
        # 3. Analyze code style (too perfect detection)
        style_analysis = await scibox_client.analyze_code_style(code, previous_submissions)
        results["style_analysis"] = style_analysis
        
        if style_analysis.get("is_too_perfect"):
            self.record_event(
                interview_id,
                AntiCheatEventType.SUSPICIOUS_TYPING,
                {
                    "reason": "Code is too perfect - likely AI-generated",
                    "style_consistency": style_analysis.get("style_consistency_score"),
                    "indicators": style_analysis.get("indicators", [])
                }
            )
            results["is_suspicious"] = True
        
        # 4. Analyze code change patterns
        if code_change_history:
            change_analysis = self._analyze_code_changes(code_change_history)
            results["code_change_analysis"] = change_analysis
            
            if change_analysis.get("is_suspicious"):
                self.record_event(
                    interview_id,
                    AntiCheatEventType.LARGE_CODE_CHANGE,
                    change_analysis
                )
                results["is_suspicious"] = True
        
        return results
    
    def _analyze_code_changes(self, change_history: List[dict]) -> dict:
        """Анализ временных меток изменений кода"""
        if not change_history or len(change_history) < 2:
            return {"is_suspicious": False}
        
        # Анализ больших изменений за короткое время
        large_changes = []
        for i in range(len(change_history) - 1):
            change = change_history[i]
            next_change = change_history[i + 1]
            time_diff = next_change.get("timestamp", 0) - change.get("timestamp", 0)
            lines_changed = abs(change.get("lines", 0))
            
            # >50 строк за <5 секунд = подозрительно
            if lines_changed > 50 and time_diff < 5000:
                large_changes.append({
                    "lines": lines_changed,
                    "time_ms": time_diff
                })
        
        is_suspicious = len(large_changes) > 0
        
        return {
            "is_suspicious": is_suspicious,
            "large_changes_count": len(large_changes),
            "large_changes": large_changes,
            "reason": "Large code blocks added too quickly" if is_suspicious else None
        }
    
    def _analyze_typing_patterns(self, patterns: dict) -> dict:
        """Расширенный анализ паттернов печати для резюме интервью"""
        keystroke_intervals = patterns.get("keystroke_intervals", [])
        backspace_count = patterns.get("backspace_count", 0)
        total_chars = patterns.get("total_characters", 0)
        
        if not keystroke_intervals or len(keystroke_intervals) < 10:
            return {
                "is_suspicious": False,
                "wpm": None,
                "coefficient_of_variation": None,
                "mean_interval_ms": None,
                "backspace_ratio": None,
                "pause_count": None
            }
        
        intervals = np.array(keystroke_intervals)
        std_dev = np.std(intervals)
        mean_interval = np.mean(intervals)
        cv = std_dev / mean_interval if mean_interval > 0 else 0
        
        # WPM calculation (average 5 chars per word)
        total_time = np.sum(intervals) / 1000  # seconds
        wpm = (total_chars / 5) / (total_time / 60) if total_time > 0 else 0
        
        # Backspace ratio
        backspace_ratio = backspace_count / total_chars if total_chars > 0 else 0
        
        # Pause detection (intervals > 2 seconds)
        pause_count = int(np.sum(intervals > 2000))
        
        # Suspicious indicators
        is_suspicious = (
            cv < 0.1 or  # Too consistent
            wpm > 100 or  # Too fast
            (backspace_ratio < 0.05 and total_chars > 100) or  # Too few corrections
            pause_count < len(intervals) * 0.1  # Too few pauses
        )
        
        return {
            "is_suspicious": is_suspicious,
            "wpm": round(wpm, 1),
            "coefficient_of_variation": round(cv, 3),
            "mean_interval_ms": round(mean_interval, 1),
            "backspace_ratio": round(backspace_ratio, 3),
            "pause_count": pause_count,
            "reason": "Unnatural typing pattern detected" if is_suspicious else None
        }
    
    def get_interview_summary(self, interview_id: str) -> dict:
        """Get anti-cheat summary for an interview"""
        metrics = self._aggregate_metrics(interview_id)
        events = self.event_history.get(interview_id, [])
        
        # Извлекаем метрики из событий для резюме
        typing_patterns = None
        code_style_analysis = None
        network_activity = []
        clipboard_analysis = []
        
        for event in events:
            if event.get("details"):
                if "wpm" in event["details"]:
                    typing_patterns = event["details"]
                if "style_consistency_score" in event["details"]:
                    code_style_analysis = event["details"]
                if event["type"] in [AntiCheatEventType.EXTERNAL_SERVICE_REQUEST, 
                                     AntiCheatEventType.AI_SERVICE_REQUEST,
                                     AntiCheatEventType.CALL_SERVICE_REQUEST]:
                    network_activity.append({
                        "type": event["type"].value,
                        "timestamp": event["timestamp"].isoformat(),
                        "details": event["details"]
                    })
                if event["type"] in [AntiCheatEventType.LARGE_PASTE, AntiCheatEventType.FREQUENT_PASTE]:
                    clipboard_analysis.append({
                        "type": event["type"].value,
                        "timestamp": event["timestamp"].isoformat(),
                        "details": event["details"]
                    })
        
        return {
            "total_events": len(events),
            "flags_count": metrics["flags_count"],
            "aggregate_score": metrics["aggregate_score"],
            "is_flagged": metrics["aggregate_score"] >= 0.5,
            "events_by_type": metrics.get("event_counts", {}),
            "typing_patterns": typing_patterns,
            "code_style_analysis": code_style_analysis,
            "network_activity": network_activity,
            "clipboard_analysis": clipboard_analysis,
            "timeline": [
                {
                    "type": e["type"].value,
                    "severity": e["severity"],
                    "timestamp": e["timestamp"].isoformat()
                }
                for e in events[-20:]  # Last 20 events
            ]
        }


# Singleton
anti_cheat_service = AntiCheatService()
