from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic_ai.exceptions import ModelHTTPError

from .config import settings
from .routes.chat import router as chat_router
from .services.backend_client import shutdown_backend_client


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    await shutdown_backend_client()


app = FastAPI(
    title="Anamnese AI Agent",
    version="0.1.0",
    description="Agent conversacional que conduz anamnese e integra com o backend .NET",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat_router)


@app.exception_handler(ModelHTTPError)
async def handle_model_error(_, exc: ModelHTTPError) -> JSONResponse:
    if exc.status_code == 429:
        return JSONResponse(
            status_code=429,
            content={
                "detail": "A cota da API Gemini foi excedida. Aguarde a renovação da cota ou use uma chave/projeto com faturamento habilitado."
            },
        )
    return JSONResponse(
        status_code=502,
        content={"detail": f"O provedor Gemini recusou a solicitação ({exc.status_code})."},
    )


@app.get("/health", tags=["meta"])
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/", tags=["meta"])
def root() -> dict[str, str]:
    return {
        "service": "Anamnese AI Agent",
        "docs": "/docs",
        "health": "/health",
    }
