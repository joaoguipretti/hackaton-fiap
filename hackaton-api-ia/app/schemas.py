from datetime import datetime
from enum import Enum, IntEnum
from typing import Literal

from pydantic import BaseModel, Field


class SeveridadeManchester(IntEnum):
    AZUL = 0
    VERDE = 1
    AMARELO = 2
    LARANJA = 3
    VERMELHO = 4


SEVERIDADE_LABELS: dict[SeveridadeManchester, str] = {
    SeveridadeManchester.AZUL: "Azul — não urgente (atendimento em até 240 min)",
    SeveridadeManchester.VERDE: "Verde — pouco urgente (atendimento em até 120 min)",
    SeveridadeManchester.AMARELO: "Amarelo — urgente (atendimento em até 60 min)",
    SeveridadeManchester.LARANJA: "Laranja — muito urgente (atendimento em até 10 min)",
    SeveridadeManchester.VERMELHO: "Vermelho — emergência (atendimento imediato)",
}


class EspecialidadeConsultorio(str, Enum):
    """Espelha o enum EspecialidadeConsultorio do backend .NET."""

    CLINICA_GERAL = "ClinicaGeral"
    ODONTOLOGIA = "Odontologia"
    OFTALMOLOGIA = "Oftalmologia"
    PSICOLOGIA = "Psicologia"
    OUTROS = "Outros"


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class StartChatRequest(BaseModel):
    cpf: str = Field(..., description="CPF do paciente (somente números ou formatado)")
    nome_completo: str | None = Field(
        default=None,
        description="Se o paciente ainda não estiver cadastrado, o backend usa este nome",
    )
    endereco: str | None = Field(
        default=None,
        description="Endereço para cadastro caso paciente seja novo",
    )
    alergias: str | None = None
    condicoes_previas: str | None = None
    medicamentos_uso: str | None = None


class StartChatResponse(BaseModel):
    session_id: str
    assistant_message: str


class SendMessageRequest(BaseModel):
    content: str


class SendMessageResponse(BaseModel):
    assistant_message: str
    is_complete: bool = Field(
        ...,
        description="Sinaliza que o agent julgou já ter dados suficientes pra finalizar",
    )


class AnamneseResult(BaseModel):
    """Documento estruturado que o LLM extrai da conversa ao final."""

    queixa_principal: str = Field(..., description="Motivo principal da procura pelo atendimento")
    historia_doenca_atual: str = Field(
        ..., description="HDA: descrição temporal e evolutiva do quadro"
    )
    sintomas: list[str] = Field(default_factory=list, description="Sintomas relatados")
    duracao_sintomas: str | None = Field(
        default=None, description="Tempo aproximado desde o início"
    )
    intensidade_dor: int | None = Field(
        default=None, ge=0, le=10, description="Escala de 0 a 10, se houver dor"
    )
    comorbidades: list[str] = Field(default_factory=list)
    medicacoes_em_uso: list[str] = Field(default_factory=list)
    alergias: list[str] = Field(default_factory=list)
    sinais_alarme: list[str] = Field(
        default_factory=list,
        description="Bandeiras vermelhas identificadas (ex: dor torácica, dispneia, alteração de consciência)",
    )
    severidade_sugerida: SeveridadeManchester = Field(
        ..., description="Cor Manchester sugerida com base na conversa"
    )
    justificativa_severidade: str = Field(
        ..., description="Por que essa cor — cite os critérios objetivos"
    )
    especialidade_sugerida: EspecialidadeConsultorio = Field(
        default=EspecialidadeConsultorio.CLINICA_GERAL,
        description="Especialidade de consultório mais adequada para o quadro relatado",
    )
    resumo: str = Field(
        ..., description="Impressão clínica e conduta sugerida, sem repetir os demais campos"
    )


class FinalizeResponse(BaseModel):
    session_id: str
    anamnese: AnamneseResult


class ConsultorioOption(BaseModel):
    id: str
    nome: str
    endereco: str
    especialidade: str


class ConsultoriosSugeridosResponse(BaseModel):
    especialidade_sugerida: EspecialidadeConsultorio
    consultorios: list[ConsultorioOption]


class ConfirmRequest(BaseModel):
    severidade_confirmada: SeveridadeManchester
    observacoes_extras: str | None = None
    endereco: str | None = Field(
        default=None,
        description="Se paciente novo e endereço ainda não foi coletado",
    )
    consultorio_id: str | None = Field(
        default=None,
        description="Consultório escolhido pelo paciente dentre as opções sugeridas pela especialidade",
    )


class ConfirmResponse(BaseModel):
    consulta_id: str
    paciente_cpf: str
    severidade: SeveridadeManchester
    data_consulta: datetime
