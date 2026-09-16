import { useState } from 'react';
import { 
  Heart, 
  Send, 
  Bot, 
  User, 
  FileText, 
  ArrowRight, 
  Activity, 
  ShieldCheck, 
  Sparkles 
} from 'lucide-react';
import './App.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5101';

export default function App() {
  const [step, setStep] = useState('form');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const [formData, setFormData] = useState({
    nome: '',
    cpf: '',
    cartaoSus: '',
    endereco: '',
    idade: '',
    genero: '',
    alergias: '',
    condicoesPrevias: '',
    medicamentosUso: '',
  });

  const [inputMsg, setInputMsg] = useState('');
  const [chatHistory, setChatHistory] = useState([]);

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError('');

    try {
      const response = await fetch(`${API_URL}/pacientes/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cpf: formData.cpf,
          nomeCompleto: formData.nome,
          endereco: formData.endereco || null,
          cartaoSus: formData.cartaoSus || null,
          idade: Number(formData.idade),
          genero: formData.genero,
          alergias: formData.alergias || null,
          condicoesPrevias: formData.condicoesPrevias || null,
          medicamentosUso: formData.medicamentosUso || null,
        }),
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || 'Não foi possível salvar seus dados.');
      }

      setChatHistory([
        {
          sender: 'ai',
          text: `Olá, ${formData.nome.split(' ')[0]}! Seus dados foram cadastrados com sucesso. Sou o assistente **Diagnostica IA**.\n\nComo você está se sentindo agora? Descreva em detalhes os sintomas que está apresentando.`
        }
      ]);
      setStep('chat');
    } catch (error) {
      setSubmitError(
        error instanceof TypeError
          ? 'Não foi possível conectar à API. Inicie o backend em http://localhost:5101 e tente novamente.'
          : error.message || 'Não foi possível salvar seus dados.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputMsg.trim()) return;

    const userPrompt = inputMsg.trim();
    const updatedHistory = [...chatHistory, { sender: 'user', text: userPrompt }];
    setChatHistory(updatedHistory);
    setInputMsg('');

    try {
      const response = await fetch(`${API_URL}/chat/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mensagem: userPrompt,
          nome: formData.nome,
          idade: Number(formData.idade) || null,
          genero: formData.genero || null,
          historicoMedico: [
            formData.alergias,
            formData.condicoesPrevias,
            formData.medicamentosUso,
          ].filter(Boolean).join('; '),
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Não foi possível receber a resposta do assistente.');
      }

      const data = await response.json();
      setChatHistory([
        ...updatedHistory,
        {
          sender: 'ai',
          text: data.resposta || 'Não consegui processar sua mensagem no momento.'
        }
      ]);
    } catch (error) {
      setChatHistory([
        ...updatedHistory,
        {
          sender: 'ai',
          text: error instanceof Error
            ? `Não consegui responder agora: ${error.message}`
            : 'Não consegui responder agora. Tente novamente.'
        }
      ]);
    }
  };

  return (
    <div className="patient-app">
      {/* --- HEADER --- */}
      <header className="patient-header px-5 sm:px-8">
        <div className="logo-area">
          <Heart className="logo-icon" size={26} />
          <span className="logo-text">Diagnostica <span className="logo-highlight">IA</span></span>
        </div>
        <div className="header-badge">
          <ShieldCheck size={16} />
          <span>Portal do Paciente</span>
        </div>
      </header>

      {/* --- ETAPA 1: FORMULÁRIO DE CADASTRO --- */}
      {step === 'form' && (
        <main className="container-center px-4 sm:px-8">
          <div className="form-card motion-safe:animate-[fade-in_500ms_ease-out]">
            <div className="card-header">
              <div className="icon-wrapper">
                <FileText size={24} />
              </div>
              <h2>Cadastro Inicial de Saúde</h2>
              <p>Preencha seus dados para iniciarmos a pré-triagem médica inteligente.</p>
            </div>

            <form onSubmit={handleFormSubmit} className="patient-form">
              <div className="form-group">
                <label>Nome Completo</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Ana Maria Silva"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                />
              </div>

              {/* Nova linha: CPF e Cartão SUS */}
              <div className="form-row">
                <div className="form-group">
                  <label>CPF</label>
                  <input
                    type="text"
                    required
                    placeholder="000.000.000-00"
                    value={formData.cpf}
                    onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Cartão do SUS</label>
                  <input
                    type="text"
                    placeholder="000 0000 0000 0000"
                    value={formData.cartaoSus}
                    onChange={(e) => setFormData({ ...formData, cartaoSus: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Idade</label>
                  <input
                    type="number"
                    required
                    placeholder="Ex: 34"
                    value={formData.idade}
                    onChange={(e) => setFormData({ ...formData, idade: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Sexo Biológico</label>
                  <select
                    required
                    value={formData.genero}
                    onChange={(e) => setFormData({ ...formData, genero: e.target.value })}
                  >
                    <option value="" disabled hidden>Selecione...</option>
                    <option value="Feminino">Feminino</option>
                    <option value="Masculino">Masculino</option>
                    <option value="Outro">Outro / Prefiro não informar</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Endereço</label>
                <input
                  type="text"
                  placeholder="Ex: Rua das Flores, 123 - Centro"
                  value={formData.endereco}
                  onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Alergias Conhecidas</label>
                <input
                  type="text"
                  placeholder="Ex: Dipirona, Penicilina (deixe em branco se nenhuma)"
                  value={formData.alergias}
                  onChange={(e) => setFormData({ ...formData, alergias: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Condições Médicas / Doenças Prévias</label>
                <input
                  type="text"
                  placeholder="Ex: Hipertensão, Diabetes, Asma"
                  value={formData.condicoesPrevias}
                  onChange={(e) => setFormData({ ...formData, condicoesPrevias: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Medicamentos em Uso Contínuo</label>
                <input
                  type="text"
                  placeholder="Ex: Losartana 50mg, Metformina"
                  value={formData.medicamentosUso}
                  onChange={(e) => setFormData({ ...formData, medicamentosUso: e.target.value })}
                />
              </div>

              {submitError && <p className="form-error" role="alert">{submitError}</p>}

              <button type="submit" className="btn-primary w-full" disabled={isSubmitting}>
                <span>{isSubmitting ? 'Salvando dados...' : 'Ir para a Triagem Virtual'}</span>
                {!isSubmitting && <ArrowRight size={18} />}
              </button>
            </form>
          </div>
        </main>
      )}

      {/* --- ETAPA 2: CHATBOT DE SINTOMAS --- */}
      {step === 'chat' && (
        <main className="chat-layout bg-[#eef6f3]">
          <aside className="patient-summary-sidebar">
            <div className="patient-card-small">
              <div className="avatar-circle">
                <User size={20} />
              </div>
              <div className="summary-info">
                <h3>{formData.nome}</h3>
                <p>{formData.idade} anos • {formData.genero}</p>
                {formData.cpf && <span className="doc-badge">CPF: {formData.cpf}</span>}
              </div>
            </div>

            <div className="summary-details">
              <h4>
                <Activity size={15} /> 
                Histórico Informado
              </h4>
              <ul>
                <li><strong>Endereço:</strong> {formData.endereco || 'Não informado'}</li>
                <li><strong>Cartão SUS:</strong> {formData.cartaoSus || 'Não informado'}</li>
                <li><strong>Alergias:</strong> {formData.alergias || 'Nenhuma informada'}</li>
                <li><strong>Condições:</strong> {formData.condicoesPrevias || 'Nenhuma informada'}</li>
                <li><strong>Remédios:</strong> {formData.medicamentosUso || 'Nenhum informado'}</li>
              </ul>
            </div>

            <div className="ai-notice">
              <Sparkles size={16} />
              <p>As informações relatadas aqui serão sintetizadas em um prontuário estruturado para seu médico.</p>
            </div>
          </aside>

          <section className="chat-container">
            <div className="chat-messages">
              {chatHistory.map((msg, index) => (
                <div 
                  key={index} 
                  className={`message-row ${msg.sender === 'user' ? 'row-user' : 'row-ai'}`}
                >
                  <div className="message-avatar">
                    {msg.sender === 'user' ? <User size={16} /> : <Bot size={16} />}
                  </div>
                  <div className="message-bubble">
                    <p>{msg.text}</p>
                  </div>
                </div>
              ))}
            </div>

            <form onSubmit={handleSendMessage} className="chat-input-bar">
              <input
                type="text"
                placeholder="Descreva o que está sentindo..."
                value={inputMsg}
                onChange={(e) => setInputMsg(e.target.value)}
              />
              <button type="submit" className="send-button" disabled={!inputMsg.trim()}>
                <Send size={18} />
              </button>
            </form>
          </section>
        </main>
      )}
    </div>
  );
}