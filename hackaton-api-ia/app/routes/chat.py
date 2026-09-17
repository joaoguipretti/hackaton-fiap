"""Endpoints do chat de anamnese."""
from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status

from ..agent import extract_anamnese, run_interview_turn, start_interview
from ..schemas import (
    ConfirmRequest,
    ConfirmResponse,
    FinalizeResponse,
    SendMessageRequest,
    SendMessageResponse,
    StartChatRequest,
    StartChatResponse,
)
from ..services.backend_client import BackendClient, get_backend_client
from ..services.session_store import SessionStore, get_store

router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("/start", response_model=StartChatResponse)
async def start_chat(
    req: StartChatRequest,
    store: SessionStore = Depends(get_store),
) -> StartChatResponse:
    session = store.create(req.cpf, req.nome_completo, req.endereco)
    reply, history = await start_interview()
    session.messages = history
    return StartChatResponse(session_id=session.id, assistant_message=reply)


@router.post("/{session_id}/msg", response_model=SendMessageResponse)
async def send_message(
    session_id: str,
    req: SendMessageRequest,
    store: SessionStore = Depends(get_store),
) -> SendMessageResponse:
    session = store.get(session_id)
    if session is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Sessão não encontrada")
    if session.is_complete:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "Anamnese já concluída — chame /finalize",
        )

    reply, history, is_complete = await run_interview_turn(session.messages, req.content)
    session.messages = history
    session.is_complete = is_complete

    return SendMessageResponse(assistant_message=reply, is_complete=is_complete)


@router.post("/{session_id}/finalize", response_model=FinalizeResponse)
async def finalize(
    session_id: str,
    store: SessionStore = Depends(get_store),
) -> FinalizeResponse:
    session = store.get(session_id)
    if session is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Sessão não encontrada")
    if not session.messages:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "Nenhuma mensagem trocada nessa sessão",
        )

    anamnese = await extract_anamnese(session.messages)
    session.anamnese = anamnese
    session.is_complete = True

    return FinalizeResponse(session_id=session.id, anamnese=anamnese)


@router.post("/{session_id}/confirm", response_model=ConfirmResponse)
async def confirm(
    session_id: str,
    req: ConfirmRequest,
    store: SessionStore = Depends(get_store),
    backend: BackendClient = Depends(get_backend_client),
) -> ConfirmResponse:
    session = store.get(session_id)
    if session is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Sessão não encontrada")
    if session.anamnese is None:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "Chame /finalize antes de confirmar",
        )

    # 1. garantir que o paciente existe no backend .NET
    paciente = await backend.buscar_paciente(session.cpf)
    if paciente is None:
        nome = session.nome_completo or "Paciente Não Identificado"
        endereco = req.endereco or session.endereco or "Não informado"
        paciente = await backend.criar_paciente(session.cpf, nome, endereco)

    # 2. montar observações estruturadas a partir da anamnese
    a = session.anamnese
    linhas = [
        f"Queixa principal: {a.queixa_principal}",
        "",
        f"HDA: {a.historia_doenca_atual}",
        "",
        f"Sintomas: {', '.join(a.sintomas) if a.sintomas else 'não relatados'}",
    ]
    if a.duracao_sintomas:
        linhas.append(f"Duração: {a.duracao_sintomas}")
    if a.intensidade_dor is not None:
        linhas.append(f"Intensidade dor (0-10): {a.intensidade_dor}")
    if a.sinais_alarme:
        linhas.append(f"Sinais de alarme: {', '.join(a.sinais_alarme)}")
    if a.comorbidades:
        linhas.append(f"Comorbidades: {', '.join(a.comorbidades)}")
    if a.medicacoes_em_uso:
        linhas.append(f"Medicações em uso: {', '.join(a.medicacoes_em_uso)}")
    if a.alergias:
        linhas.append(f"Alergias: {', '.join(a.alergias)}")
    linhas.append("")
    linhas.append(f"Severidade sugerida pela IA: {a.severidade_sugerida.name}")
    linhas.append(f"Justificativa: {a.justificativa_severidade}")
    linhas.append("")
    linhas.append(f"Resumo: {a.resumo}")
    if req.observacoes_extras:
        linhas.append("")
        linhas.append(f"Observações do triador: {req.observacoes_extras}")

    observacoes = "\n".join(linhas)

    # 3. criar a consulta com a severidade CONFIRMADA pelo humano
    consulta = await backend.criar_consulta(
        paciente_cpf=session.cpf,
        severidade=req.severidade_confirmada,
        observacoes=observacoes,
    )

    # 4. limpar sessão (opcional — MVP mantém pra debug)
    return ConfirmResponse(
        consulta_id=consulta["id"],
        paciente_cpf=session.cpf,
        severidade=req.severidade_confirmada,
        data_consulta=datetime.fromisoformat(consulta["dataConsulta"].replace("Z", "+00:00"))
        if isinstance(consulta.get("dataConsulta"), str)
        else datetime.utcnow(),
    )
