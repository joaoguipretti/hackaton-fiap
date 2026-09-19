from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    gemini_api_key: str
    backend_dotnet_url: str = "http://localhost:5101"
    gemini_model: str = "google:gemini-3.5-flash-lite"
    gemini_fallback_models: list[str] = [
        "google:gemini-3.5-flash-lite",
        "google:gemini-3.5-flash",
        "google:gemini-2.5-flash",
    ]
    gemini_max_retries: int = 3
    gemini_retry_backoff_seconds: float = 1.5
    cors_origins: list[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
    ]


settings = Settings()  # type: ignore[call-arg]
