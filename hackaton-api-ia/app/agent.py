"""Agents PydanticAI para conduzir e extrair a anamnese."""
from __future__ import annotations

from google import genai
from pydantic_ai import Agent
from pydantic_ai.messages import ModelMessage
from pydantic_ai.models.google import GoogleModel
from pydantic_ai.providers.google import GoogleProvider

from .config import settings
from .schemas import AnamneseResult


def _build_model() -> GoogleModel:
    """Build a GoogleModel with a manually-configured google-genai Client.

    Bypass PydanticAI's default http_options wiring — its httpx2 async client
    doesn't authenticate correctly with the new AI Studio API key format.
    """
    _, _, model_name = settings.gemini_model.partition(":")
    if not model_name:
        model_name = settings.gemini_model
    client = genai.Client(api_key=settings.gemini_api_key)
    provider = GoogleProvider(client=client)
    return GoogleModel(model_name, provider=provider)


_model = _build_model()


COMPLETION_MARKER = "[ANAMNESE_COMPLETA]"


INTERVIEW_SYSTEM_PROMPT = f"""\
Você é um assistente de triagem em uma unidade de pronto atendimento. Seu papel é
conduzir uma ANAMNESE inicial breve e empática com o paciente, coletando informações
que permitam classificar o risco pelo protocolo de Manchester.

## Como conduzir a entrevista

- Fale em português brasileiro, tom acolhedor e claro. Use linguagem simples (evite
  jargão médico com o paciente).
- Faça UMA pergunta por vez, na ordem clínica adequada:
  1. Queixa principal (o que trouxe ele hoje)
  2. Início e evolução dos sintomas (quando começou, piorou/melhorou)
  3. Características (ex: dor — tipo, localização, irradiação, intensidade 0-10)
  4. Sintomas associados (febre, náusea, falta de ar, sudorese, alteração de consciência etc)
  5. Comorbidades conhecidas (hipertensão, diabetes, cardiopatia, etc)
  6. Medicações em uso
  7. Alergias
- Se o paciente mencionar SINAIS DE ALARME (dor torácica típica, dispneia intensa,
  déficit neurológico agudo, sangramento importante, alteração de consciência,
  trauma grave, sinais de choque), reconheça, tranquilize e priorize essas perguntas.
- NUNCA dê diagnóstico. NUNCA prescreva. Se o paciente pedir, oriente que a avaliação
  médica virá em seguida.

## Quando encerrar

Quando você julgar que tem informação suficiente para uma classificação Manchester
inicial (geralmente após 5-10 turnos), agradeça, avise que a triagem foi concluída e
que um profissional confirmará em seguida, e ao FINAL da sua última mensagem inclua
exatamente esta tag em uma linha isolada:

{COMPLETION_MARKER}

Não inclua a tag antes disso. Não repita a tag.
"""


EXTRACTOR_SYSTEM_PROMPT = """\
Você extrai o resultado estruturado de uma anamnese de triagem em pronto-socorro
a partir do histórico da conversa com o paciente.

Preencha TODOS os campos exigidos pelo schema. Regras:

- `queixa_principal`: uma frase curta com o motivo da procura.
- `historia_doenca_atual` (HDA): parágrafo com evolução temporal.
- `sintomas`: lista objetiva (ex: "febre 38.5C", "dor abdominal em cólica").
- `intensidade_dor`: só preencha se o paciente relatou dor com escala.
- `sinais_alarme`: liste bandeiras vermelhas encontradas; deixe vazio se nenhuma.
- `severidade_sugerida`: cor do protocolo de Manchester, use o critério:
    * VERMELHO (0): risco de vida imediato (PCR, dispneia grave, choque, coma).
    * LARANJA (3): risco alto (dor torácica típica, déficit neuro agudo, febre + sinais toxêmicos).
    * AMARELO (2): sinais/sintomas moderados que exigem atendimento em até 60 min.
    * VERDE (1): quadros de menor gravidade, estáveis.
    * AZUL (0): queixas não urgentes / administrativas.
  NOTA sobre o enum: os valores int são AZUL=0, VERDE=1, AMARELO=2, LARANJA=3, VERMELHO=4.
- `justificativa_severidade`: cite objetivamente os achados que justificam a cor.
- `resumo`: texto corrido curto (3-6 linhas) para constar no prontuário.

Se algum dado não foi coletado, use listas vazias / strings vazias / null — não invente.
"""


interview_agent = Agent(
    _model,
    system_prompt=INTERVIEW_SYSTEM_PROMPT,
)

extractor_agent = Agent(
    _model,
    output_type=AnamneseResult,
    system_prompt=EXTRACTOR_SYSTEM_PROMPT,
)


async def run_interview_turn(
    history: list[ModelMessage],
    user_message: str,
) -> tuple[str, list[ModelMessage], bool]:
    """Envia mensagem do usuário e obtém a próxima fala do agent.

    Retorna: (reply_para_usuario, nova_history_completa, is_complete)
    """
    result = await interview_agent.run(user_message, message_history=history)
    raw = result.output

    is_complete = COMPLETION_MARKER in raw
    reply = raw.replace(COMPLETION_MARKER, "").strip()

    return reply, list(result.all_messages()), is_complete


async def start_interview() -> tuple[str, list[ModelMessage]]:
    """Primeiro turno: o agent abre a conversa sem input do usuário."""
    result = await interview_agent.run(
        "Inicie a triagem cumprimentando o paciente e perguntando qual é a queixa principal."
    )
    return result.output, list(result.all_messages())


async def extract_anamnese(history: list[ModelMessage]) -> AnamneseResult:
    """Consolida o histórico da conversa num AnamneseResult estruturado."""
    transcript_parts: list[str] = []
    for msg in history:
        for part in msg.parts:
            kind = getattr(part, "part_kind", None)
            content = getattr(part, "content", None)
            if content is None:
                continue
            if kind == "user-prompt":
                transcript_parts.append(f"PACIENTE: {content}")
            elif kind == "text":
                transcript_parts.append(f"ASSISTENTE: {content}")

    transcript = "\n".join(transcript_parts) or "(sem histórico)"

    result = await extractor_agent.run(
        f"Extraia a anamnese estruturada da conversa abaixo.\n\n---\n{transcript}\n---"
    )
    return result.output
