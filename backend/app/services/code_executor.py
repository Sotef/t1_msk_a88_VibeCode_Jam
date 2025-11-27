import asyncio
import json
import os
import shutil
import subprocess
import tempfile
from typing import Optional

try:
    import docker  # type: ignore
    from docker.errors import DockerException  # type: ignore
except Exception:  # pragma: no cover - docker SDK unavailable in some environments
    docker = None
    DockerException = Exception

from app.config import get_settings
from app.models.schemas import ProgrammingLanguage

settings = get_settings()


class CodeExecutor:
    """Execute code in Docker containers"""
    
    DOCKER_IMAGES = {
        ProgrammingLanguage.PYTHON: "python:3.11-slim",
        ProgrammingLanguage.JAVASCRIPT: "node:20-slim",
        ProgrammingLanguage.CPP: "gcc:13"
    }
    
    FILE_EXTENSIONS = {
        ProgrammingLanguage.PYTHON: "py",
        ProgrammingLanguage.JAVASCRIPT: "js",
        ProgrammingLanguage.CPP: "cpp"
    }
    
    def __init__(self):
        self.timeout = settings.docker_timeout
        self.memory_limit = settings.docker_memory_limit
        self.cpu_limit = settings.docker_cpu_limit
        self.docker_available = False
        self.client = None
        self.use_cli = False

        if docker is None:
            self._enable_cli_fallback("Docker SDK is not installed")
            return

        endpoint = os.getenv("DOCKER_HOST", "unix://var/run/docker.sock")
        # Нормализуем все неподдерживаемые схемы к unix socket
        # Обрабатываем все варианты: http+docker://, npipe://, http://, https://, и любые комбинации
        if (endpoint.startswith("http+docker://") or 
            endpoint.startswith("npipe://") or 
            endpoint.startswith("http://") or
            endpoint.startswith("https://") or
            "http+docker" in endpoint.lower() or
            "http://" in endpoint or
            "https://" in endpoint):
            endpoint = "unix://var/run/docker.sock"
        os.environ["DOCKER_HOST"] = endpoint
        print(f"[code-executor] Attempting to connect to Docker via {endpoint}")

        try:
            self.client = docker.DockerClient(base_url=endpoint)
            self.client.ping()
            self.docker_available = True
            print(f"[code-executor] Docker client connected via {endpoint}")
        except (DockerException, Exception) as exc:
            print(f"[code-executor] Docker unavailable via SDK: {exc}")
            self.client = None
            self._enable_cli_fallback(str(exc))
    
    async def execute(
        self,
        code: str,
        language: ProgrammingLanguage,
        test_cases: Optional[list] = None,
        stdin: Optional[str] = None
    ) -> dict:
        """Execute code and return results"""
        if not self.docker_available:
            return {
                "success": False,
                "error": "Code execution service is disabled because Docker is unavailable in this environment.",
                "output": None,
                "execution_time_ms": 0,
                "memory_used_mb": 0
            }
        try:
            # Create temp directory for code
            with tempfile.TemporaryDirectory() as tmpdir:
                # Write code to file
                ext = self.FILE_EXTENSIONS[language]
                code_file = os.path.join(tmpdir, f"solution.{ext}")
                with open(code_file, "w") as f:
                    f.write(code)
                
                # Prepare execution command
                cmd = self._get_command(language)
                
                # If test cases provided, run each
                if test_cases:
                    return await self._run_tests(tmpdir, cmd, language, test_cases)
                else:
                    # Single execution with optional stdin
                    return await self._run_single(tmpdir, cmd, language, stdin)
        
        except docker.errors.ContainerError as e:
            return {
                "success": False,
                "error": str(e),
                "output": None,
                "execution_time_ms": 0,
                "memory_used_mb": 0
            }
        except Exception as e:
            return {
                "success": False,
                "error": f"Execution error: {str(e)}",
                "output": None,
                "execution_time_ms": 0,
                "memory_used_mb": 0
            }
    
    def _get_command(self, language: ProgrammingLanguage) -> list:
        """Get execution command for language"""
        if language == ProgrammingLanguage.PYTHON:
            return ["python", "/code/solution.py"]
        elif language == ProgrammingLanguage.JAVASCRIPT:
            return ["node", "/code/solution.js"]
        elif language == ProgrammingLanguage.CPP:
            return ["sh", "-c", "g++ -o /code/solution /code/solution.cpp && /code/solution"]
        return []
    
    async def _run_single(
        self,
        tmpdir: str,
        cmd: list,
        language: ProgrammingLanguage,
        stdin: Optional[str] = None
    ) -> dict:
        """Run single execution"""
        image = self.DOCKER_IMAGES[language]
        
        try:
            # Run in thread to not block
            loop = asyncio.get_event_loop()
            result = await loop.run_in_executor(
                None,
                lambda: self._docker_run(image, cmd, tmpdir, stdin)
            )
            return result
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "output": None,
                "execution_time_ms": 0,
                "memory_used_mb": 0
            }
    
    def _docker_run(self, image: str, cmd: list, tmpdir: str, stdin: Optional[str] = None) -> dict:
        """Synchronous Docker run"""
        import time

        if self.use_cli:
            return self._docker_run_cli(image, cmd, tmpdir, stdin)

        start_time = time.time()

        try:
            if not self.client:
                raise RuntimeError("Docker client is not available.")
            container = self.client.containers.run(
                image,
                cmd,
                volumes={tmpdir: {"bind": "/code", "mode": "rw"}},
                mem_limit=self.memory_limit,
                cpu_quota=int(float(self.cpu_limit) * 100000),  # Convert to microseconds
                cpu_period=100000,  # 100ms period
                network_disabled=True,
                remove=True,
                detach=False,
                stdout=True,
                stderr=True,
                stdin_open=stdin is not None,
                timeout=self.timeout,
            )

            execution_time = int((time.time() - start_time) * 1000)
            output = container.decode("utf-8") if isinstance(container, bytes) else str(container)

            return {
                "success": True,
                "output": output.strip(),
                "error": None,
                "execution_time_ms": execution_time,
                "memory_used_mb": 0,
            }
        except docker.errors.ContainerError as e:
            execution_time = int((time.time() - start_time) * 1000)
            error_msg = e.stderr.decode("utf-8") if e.stderr else str(e)
            # Проверяем на превышение лимитов
            if "out of memory" in error_msg.lower() or "killed" in error_msg.lower():
                error_msg = "Memory limit exceeded"
            return {
                "success": False,
                "output": None,
                "error": error_msg,
                "execution_time_ms": execution_time,
                "memory_used_mb": 0,
            }
        except Exception as e:
            execution_time = int((time.time() - start_time) * 1000)
            error_msg = str(e)
            # Проверяем на таймаут
            if "timeout" in error_msg.lower() or "timed out" in error_msg.lower():
                error_msg = "Time limit exceeded"
            return {
                "success": False,
                "output": None,
                "error": error_msg,
                "execution_time_ms": execution_time,
                "memory_used_mb": 0,
            }
    
    async def _run_tests(
        self,
        tmpdir: str,
        cmd: list,
        language: ProgrammingLanguage,
        test_cases: list
    ) -> dict:
        """Run multiple test cases"""
        image = self.DOCKER_IMAGES[language]
        results = []
        total_time = 0
        all_passed = True
        
        for i, test in enumerate(test_cases):
            # Modify code to use test input
            test_input = test.get("input", "")
            expected_output = test.get("output", "")
            
            # Write input to file
            input_file = os.path.join(tmpdir, "input.txt")
            with open(input_file, "w") as f:
                f.write(str(test_input))
            
            # Run with input
            loop = asyncio.get_event_loop()
            test_cmd = self._wrap_command_with_input(cmd)
            result = await loop.run_in_executor(
                None,
                lambda: self._docker_run(image, test_cmd, tmpdir)
            )
            
            total_time += result.get("execution_time_ms", 0)
            
            # Check output
            actual_output = result.get("output", "").strip()
            expected = str(expected_output).strip()
            passed = actual_output == expected
            
            if not passed:
                all_passed = False
            
            results.append({
                "test_number": i + 1,
                "passed": passed,
                "input": test_input,
                "expected": expected,
                "actual": actual_output,
                "error": result.get("error"),
                "execution_time_ms": result.get("execution_time_ms", 0)
            })
        
        return {
            "success": all_passed,
            "output": f"Passed {sum(1 for r in results if r['passed'])}/{len(results)} tests",
            "error": None if all_passed else "Some tests failed",
            "execution_time_ms": total_time,
            "memory_used_mb": 0,
            "test_results": results
        }

    def _docker_run_cli(self, image: str, cmd: list, tmpdir: str, stdin: Optional[str] = None) -> dict:
        """Fallback execution using docker CLI"""
        import time

        start_time = time.time()
        docker_cmd = [
            "docker",
            "run",
            "--rm",
            "-v",
            f"{tmpdir}:/code",
            "-m",
            str(self.memory_limit),
            "--cpus",
            str(self.cpu_limit),
            "--network",
            "none",
        ]
        if stdin:
            docker_cmd.append("-i")
        docker_cmd.append(image)
        docker_cmd.extend(cmd)

        try:
            process = subprocess.run(
                docker_cmd,
                input=stdin.encode() if stdin else None,
                capture_output=True,
                timeout=self.timeout,
            )
            execution_time = int((time.time() - start_time) * 1000)

            if process.returncode == 0:
                return {
                    "success": True,
                    "output": process.stdout.decode("utf-8").strip(),
                    "error": None,
                    "execution_time_ms": execution_time,
                    "memory_used_mb": 0,
                }
            else:
                return {
                    "success": False,
                    "output": process.stdout.decode("utf-8").strip(),
                    "error": process.stderr.decode("utf-8").strip(),
                    "execution_time_ms": execution_time,
                    "memory_used_mb": 0,
                }
        except subprocess.TimeoutExpired:
            return {
                "success": False,
                "output": None,
                "error": "Time limit exceeded",
                "execution_time_ms": self.timeout * 1000,
                "memory_used_mb": 0,
            }
        except Exception as exc:
            error_msg = str(exc)
            # Проверяем на превышение лимитов
            if "out of memory" in error_msg.lower() or "killed" in error_msg.lower():
                error_msg = "Memory limit exceeded"
            elif "cpu" in error_msg.lower() and "limit" in error_msg.lower():
                error_msg = "CPU limit exceeded"
            return {
                "success": False,
                "output": None,
                "error": error_msg,
                "execution_time_ms": 0,
                "memory_used_mb": 0,
            }

    def _wrap_command_with_input(self, base_cmd: list, input_path: str = "/code/input.txt") -> list:
        """Pipe the test input file into the execution command"""
        import shlex

        cmd_str = " ".join(shlex.quote(part) for part in base_cmd)
        return ["sh", "-c", f"cat {input_path} | {cmd_str}"]

    def _enable_cli_fallback(self, reason: str) -> None:
        """Enable docker CLI execution when SDK is unavailable."""
        if shutil.which("docker"):
            print(f"[code-executor] Falling back to docker CLI ({reason}).")
            self.use_cli = True
            self.docker_available = True
        else:
            print(f"[code-executor] Docker CLI is unavailable ({reason}). Execution disabled.")
            self.use_cli = False
            self.docker_available = False


# Singleton
code_executor = CodeExecutor()
