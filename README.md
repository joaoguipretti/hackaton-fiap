# Diagnostica IA — Inteligência Artificial para o SUS 🏥 AI

> Solução unificada de apoio à decisão clínica, triagem automatizada e gestão de histórico do paciente para modernização da saúde pública.

---

## 📋 Sobre o Projeto

O **Diagnostica IA** é uma plataforma B2G (Business to Government) desenvolvida para otimizar o fluxo de atendimento em unidades do Sistema Único de Saúde (SUS), reduzindo o tempo de espera e o déficit informacional nas consultas. A plataforma integra a jornada do paciente ao ecossistema institucional através de dois módulos:

1. **Módulo Paciente:** Coleta passiva e ativa de sintomas via chat natural, histórico unificado de saúde e geração do "Modo Consulta" (perguntas estratégicas pré-atendimento).
2. **Módulo Institucional:** Copiloto de triagem com sugestão da classificação de risco (Protocolo de Manchester) com Inteligência Artificial Explicável (XAI) baseada nos sinais vitais e queixas apresentadas.

---

## 🛠️ Tecnologias e Arquitetura

### Stack Tecnológica

* **Frontend:** React.js (Interface responsiva para pacientes e equipes de saúde)
* **Backend Core:** .NET 8 (C#) (Serviços enterprise, autenticação e regras de negócio)
* **Microserviços de IA:** Python FastAPI (Processamento de linguagem natural e inferência)
* **Agentes de IA:** OpenAI API com respostas estruturadas (*JSON Schema*) para garantia de conformidade clínica
* **Banco de Dados:** PostgreSQL (Dados relacionais com suporte a JSONB para históricos dinâmicos)
* **Segurança & Privacidade:** Criptografia ponta a ponta, controle de acesso baseado em funções (RBAC) e conformidade total com a LGPD e HIPAA.

### Arquitetura do Sistema

```text
┌─────────────────────────────────────────────────────────┐
│                    Frontend (React)                     │
└────────────────────────────┬────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────┐
│                 Backend Core (.NET C#)                  │
└──────────────┬───────────────────────────┬──────────────┘
               │                           │
               ▼                           ▼
┌────────────────────────────┐ ┌──────────────────────────┐
│   PostgreSQL + JSONB       │ │ Microserviço Python      │
│   (Dados e Histórico)      │ │ (FastAPI + AI Engine)    │
└────────────────────────────┘ └───────────┬──────────────┘
                                           │
                                           ▼
                               ┌──────────────────────────┐
                               │ OpenAI API (XAI Model)   │
                               └──────────────────────────┘
```

---

## ⚙️ Configuração e Execução

### Pré-requisitos

* **Node.js:** v18.x ou superior
* **.NET SDK:** 8.0 ou superior
* **Python:** 3.10 ou superior
* **PostgreSQL:** 15.x ou superior

### Passo a Passo

#### 1. Clonar o Repositório

```bash
git clone https://github.com/seu-usuario/diagnostica-ia.git
cd diagnostica-ia
```

#### 2. Configurar Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto com base no arquivo `.env.example`:

```env
DATABASE_URL=Host=localhost;Database=diagnostica_ia;Username=postgres;Password=suasenha
OPENAI_API_KEY=sk-sua-chave-aqui
JWT_SECRET=seu-segredo-jwt
```

#### 3. Executar o Backend Core (.NET)

```bash
cd src/backend/DiagnosticaIA.Api
dotnet restore
dotnet run
```

#### 4. Executar o Microserviço de IA (Python FastAPI)

```bash
cd src/ai-service
python -m venv venv
source venv/bin/activate  # No Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

#### 5. Executar o Frontend (React)

```bash
cd src/frontend
npm install
npm start
```

---

## 👥 Integrantes da Equipe

* **João Guilherme Pretti Genari** — Backend Core & Arquitetura (.NET C# / PostgreSQL)
* **João Guilherme Pretti Genari** — Engenharia de IA & Microserviços (Python FastAPI / OpenAI)
* **Lucas Kenji Sasaki Yashima** — Desenvolvimento Frontend & UX/UI (React)
* **Isabela Ribeiro de Oliveira** — Validação Clínica, Regras de Negócio e LGPD

---

## ⚠️ Isenção de Responsabilidade (Disclaimer)

O **Diagnostica IA** opera exclusivamente como sistema de suporte à decisão clínica. O aplicativo **não realiza diagnósticos autônomos** nem prescreve condutas médicas de forma independente. Todas as classificações de risco e resumos sugeridos pela IA devem passar por **validação e revisão obrigatória por profissionais de saúde habilitados**.
