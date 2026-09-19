"""Endpoints do chat de anamnese."""
from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status

from ..agent import extract_anamnese, run_interview_turn, start_interview
from ..schemas import (
    ConfirmRequest,
    ConfirmResponse,
    ConsultorioOption,
    ConsultoriosSugeridosResponse,
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
    session = store.create(
        req.cpf,
        req.nome_completo,
        req.endereco,
        req.alergias,
        req.condicoes_previas,
        req.medicamentos_uso,
    )
    patient_context = "\n".join(
        [
            f"Nome: {req.nome_completo or 'não informado'}",
            f"Alergias a medicamentos: {req.alergias or 'não informado'}",
            f"Condições prévias: {req.condicoes_previas or 'não informado'}",
            f"Medicamentos em uso: {req.medicamentos_uso or 'não informado'}",
        ]
    )
    reply, history = await start_interview(patient_context)
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


@router.get("/{session_id}/consultorios", response_model=ConsultoriosSugeridosResponse)
async def listar_consultorios_sugeridos(
    session_id: str,
    store: SessionStore = Depends(get_store),
    backend: BackendClient = Depends(get_backend_client),
) -> ConsultoriosSugeridosResponse:
    session = store.get(session_id)
    if session is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Sessão não encontrada")
    if session.anamnese is None:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "Chame /finalize antes de listar os consultórios",
        )

    especialidade = session.anamnese.especialidade_sugerida
    consultorios = await backend.listar_consultorios()
    opcoes = [
        ConsultorioOption(
            id=c["id"],
            nome=c["nome"],
            endereco=c["endereco"],
            especialidade=c["especialidade"],
        )
        for c in consultorios
        if c.get("especialidade") == especialidade.value
    ]

    return ConsultoriosSugeridosResponse(especialidade_sugerida=especialidade, consultorios=opcoes)


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

    # 1. O endpoint público é idempotente: cria o paciente ou retorna 409 se já existir.
    nome = session.nome_completo or "Paciente Não Identificado"
    endereco = req.endereco or session.endereco or "Não informado"
    await backend.criar_paciente(session.cpf, nome, endereco)

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
    linhas.append(f"Impressão clínica / conduta: {a.resumo}")
    if req.observacoes_extras:
        linhas.append("")
        linhas.append(f"Observações do triador: {req.observacoes_extras}")

    observacoes = "\n".join(linhas)

    # 3. usa o consultório escolhido pelo paciente; se não veio, cai no auto-match por especialidade
    consultorio_id = req.consultorio_id
    if not consultorio_id:
        consultorios = await backend.listar_consultorios()
        for c in consultorios:
            if c.get("especialidade") == a.especialidade_sugerida.value:
                consultorio_id = c.get("id")
                break

    # 4. criar a consulta com a severidade CONFIRMADA pelo humano
    consulta = await backend.criar_consulta(
        paciente_cpf=session.cpf,
        severidade=req.severidade_confirmada,
        observacoes=observacoes,
        consultorio_id=consultorio_id,
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
