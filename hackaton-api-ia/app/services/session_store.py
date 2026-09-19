"""Armazenamento em memória das sessões de anamnese ativas.

MVP hackaton: dict em memória protegido por lock. Se derrubar o processo,
sessões em curso são perdidas — aceitável pra demo.
"""
from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from datetime import datetime
from threading import Lock

from pydantic_ai.messages import ModelMessage

from ..schemas import AnamneseResult


@dataclass
class Session:
    id: str
    cpf: str
    nome_completo: str | None
    endereco: str | None
    alergias: str | None
    condicoes_previas: str | None
    medicamentos_uso: str | None
    messages: list[ModelMessage] = field(default_factory=list)
    anamnese: AnamneseResult | None = None
    is_complete: bool = False
    created_at: datetime = field(default_factory=datetime.utcnow)


class SessionStore:
    def __init__(self) -> None:
        self._sessions: dict[str, Session] = {}
        self._lock = Lock()

    def create(
        self,
        cpf: str,
        nome_completo: str | None,
        endereco: str | None,
        alergias: str | None = None,
        condicoes_previas: str | None = None,
        medicamentos_uso: str | None = None,
    ) -> Session:
        session = Session(
            id=str(uuid.uuid4()),
            cpf=cpf,
            nome_completo=nome_completo,
            endereco=endereco,
            alergias=alergias,
            condicoes_previas=condicoes_previas,
            medicamentos_uso=medicamentos_uso,
        )
        with self._lock:
            self._sessions[session.id] = session
        return session

    def get(self, session_id: str) -> Session | None:
        with self._lock:
            return self._sessions.get(session_id)

    def delete(self, session_id: str) -> None:
        with self._lock:
            self._sessions.pop(session_id, None)


_store = SessionStore()


def get_store() -> SessionStore:
    return _store
