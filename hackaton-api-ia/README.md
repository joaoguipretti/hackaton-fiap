# Anamnese AI Agent

Agent conversacional (FastAPI + PydanticAI + Gemini) que conduz uma anamnese com o paciente
e envia a consulta classificada para o backend .NET (`Anaminese.API`).

## Arquitetura

```
React ──► FastAPI (este projeto) ──► Backend .NET ──► Firestore
                │
                └──► Google Gemini (LLM)
```

## Setup

### 1. Instalar `uv` (se ainda não tiver)

```powershell
# Windows PowerShell
irm https://astral.sh/uv/install.ps1 | iex
```

### 2. Pegar API key do Gemini

1. Acesse https://aistudio.google.com/apikey (logue com uma conta Google)
2. Clique em **Create API key** → **Create API key in new project**
3. Copie a chave (formato `AIza...`) — gratuito, sem cartão

### 3. Criar `.env`

Copie `.env.example` para `.env` e preencha:

```env
GEMINI_API_KEY=AIza...sua_chave_aqui
BACKEND_DOTNET_URL=http://localhost:5101
GEMINI_MODEL=google:gemini-flash-lite-latest
```

> Ajuste `BACKEND_DOTNET_URL` conforme a porta do seu backend .NET
> (ver `Properties/launchSettings.json` no repo `backend-hackaton`).

### 4. Instalar dependências e rodar

```powershell
uv sync
uv run uvicorn app.main:app --reload --port 8000
```

API sobe em http://localhost:8000. Docs interativas em http://localhost:8000/docs.

## Fluxo de uso (endpoints)

Todos sob `/chat`.

| Método | Rota                        | O que faz                                                     |
| ------ | --------------------------- | ------------------------------------------------------------- |
| POST   | `/chat/start`               | Cria sessão, retorna 1ª mensagem do bot                       |
| POST   | `/chat/{session_id}/msg`    | Envia msg do paciente, retorna resposta e flag `is_complete`  |
| POST   | `/chat/{session_id}/finalize` | Consolida anamnese estruturada (severidade Manchester sugerida) |
| POST   | `/chat/{session_id}/confirm`  | Triador confirma severidade → grava consulta no backend .NET  |

### Exemplo de fluxo

```bash
# 1. Iniciar
curl -X POST http://localhost:8000/chat/start \
  -H "Content-Type: application/json" \
  -d '{"cpf": "12345678900", "nome_completo": "João Silva", "endereco": "Rua X, 123"}'
# → { "session_id": "...", "assistant_message": "Olá! Sou..." }

# 2. Enviar mensagens
curl -X POST http://localhost:8000/chat/{session_id}/msg \
  -H "Content-Type: application/json" \
  -d '{"content": "tô com dor no peito há 2 horas"}'
# repetir até is_complete=true

# 3. Finalizar (extrai AnamneseResult estruturado)
curl -X POST http://localhost:8000/chat/{session_id}/finalize
# → { "anamnese": { "queixa_principal": ..., "severidade_sugerida": 3, ... } }

# 4. Triador confirma
curl -X POST http://localhost:8000/chat/{session_id}/confirm \
  -H "Content-Type: application/json" \
  -d '{"severidade_confirmada": 3, "observacoes_extras": "PA 180/110 aferida na triagem"}'
# → cria Paciente (se não existir) + Consulta no backend .NET
```

## Estrutura de pastas

```
app/
├── main.py              # FastAPI app + CORS + lifespan
├── config.py            # Settings via pydantic-settings (.env)
├── schemas.py           # Modelos Pydantic (requests, responses, AnamneseResult)
├── agent.py             # Agents PydanticAI (entrevista + extração)
├── routes/
│   └── chat.py          # Endpoints /chat/*
└── services/
    ├── session_store.py # Sessões em memória
    └── backend_client.py# httpx client pro backend .NET
```

## Notas do MVP

- **Sessões em memória**: reiniciou o processo, perdeu as sessões em curso. Suficiente pra demo.
- **Severidade Manchester**: LLM sugere no `/finalize`; humano confirma no `/confirm` antes de gravar.
- **Segurança**: `verify=False` no httpx client pra facilitar dev com Kestrel self-signed.
  Remover em produção.
- **CORS**: já configurado pra `localhost:3000` (CRA) e `localhost:5173` (Vite).
