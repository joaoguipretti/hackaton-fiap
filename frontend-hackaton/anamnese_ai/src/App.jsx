import { useEffect, useRef, useState } from 'react';
import { 
  Heart, 
  Send, 
  Bot, 
  User, 
  FileText, 
  ArrowRight, 
  Activity, 
  ShieldCheck, 
  Sparkles,
  ClipboardList,
  RefreshCw,
  Search,
  Clock3,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  CalendarDays,
  Plus,
  Eye,
  EyeOff
} from 'lucide-react';
import './App.css';

function PasswordField({ id, label, value, onChange, required, minLength, autoComplete }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="form-group">
      <label htmlFor={id}>{label}</label>
      <div className="password-field">
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          required={required}
          minLength={minLength}
          autoComplete={autoComplete}
          value={value}
          onChange={onChange}
        />
        <button
          type="button"
          className="password-toggle"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}
          tabIndex={-1}
        >
          {visible ? <EyeOff size={17} /> : <Eye size={17} />}
        </button>
      </div>
    </div>
  );
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5101';
const CHATBOT_URL = import.meta.env.VITE_CHATBOT_URL || '';

const STATUS_OPTIONS = [
  { value: 0, name: 'AguardandoAtendimento', label: 'Aguardando atendimento' },
  { value: 1, name: 'EmAtendimento', label: 'Em atendimento' },
  { value: 2, name: 'Finalizada', label: 'Finalizada' },
  { value: 3, name: 'Cancelada', label: 'Cancelada' },
];
const STATUS_VALUE_BY_NAME = Object.fromEntries(STATUS_OPTIONS.map((option) => [option.name, option.value]));

const SEVERIDADE_OPTIONS = [
  { value: 0, name: 'Azul', label: 'Azul — não urgente' },
  { value: 1, name: 'Verde', label: 'Verde — pouco urgente' },
  { value: 2, name: 'Amarelo', label: 'Amarelo — urgente' },
  { value: 3, name: 'Laranja', label: 'Laranja — muito urgente' },
  { value: 4, name: 'Vermelho', label: 'Vermelho — emergência' },
];
const SEVERIDADE_VALUE_BY_NAME = Object.fromEntries(SEVERIDADE_OPTIONS.map((option) => [option.name, option.value]));

export default function App() {
  const [profile, setProfile] = useState(() => {
    const saved = localStorage.getItem('diagnostica_user');
    if (!saved) return null;
    const user = JSON.parse(saved);
    return user.tipo === 1 || user.tipo === 'Recepcionista' ? 'attendant' : 'patient';
  });
  const [authToken, setAuthToken] = useState(() => localStorage.getItem('diagnostica_token'));
  const [authUser, setAuthUser] = useState(() => {
    const saved = localStorage.getItem('diagnostica_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [authData, setAuthData] = useState({ email: '', senha: '' });
  const [authError, setAuthError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [clinicData, setClinicData] = useState({ nome: '', endereco: '', especialidade: '0', especialidadeOutros: '', email: '', senha: '', confirmarSenha: '' });
  const [forgotData, setForgotData] = useState({ email: '' });
  const [resetData, setResetData] = useState({ token: '', novaSenha: '', confirmarSenha: '' });
  const [forgotMessage, setForgotMessage] = useState('');
  const [isSendingForgot, setIsSendingForgot] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
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
    email: '',
    senha: '',
    confirmarSenha: '',
  });

  const [inputMsg, setInputMsg] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [consultations, setConsultations] = useState([]);
  const [selectedConsultation, setSelectedConsultation] = useState(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [statusUpdateError, setStatusUpdateError] = useState('');
  const [pendingStatus, setPendingStatus] = useState(0);
  const [pendingSeveridade, setPendingSeveridade] = useState(0);
  const [consultationFilter, setConsultationFilter] = useState('Todas');
  const [consultationSearch, setConsultationSearch] = useState('');
  const [isLoadingConsultations, setIsLoadingConsultations] = useState(false);
  const [consultationError, setConsultationError] = useState('');
  const [patientCpf, setPatientCpf] = useState(() => authUser?.cpf || '');
  const [patientConsultations, setPatientConsultations] = useState([]);
  const [patientLookupError, setPatientLookupError] = useState('');
  const [isLoadingPatientConsultations, setIsLoadingPatientConsultations] = useState(false);
  const [chatbotSession, setChatbotSession] = useState(null);
  const [isFinalizingTriage, setIsFinalizingTriage] = useState(false);
  const [triageResult, setTriageResult] = useState(null);
  const [pendingAnamnese, setPendingAnamnese] = useState(null);
  const [clinicOptions, setClinicOptions] = useState([]);
  const [selectedClinicId, setSelectedClinicId] = useState('');
  const [isConfirmingConsulta, setIsConfirmingConsulta] = useState(false);
  const [showPatientConsultations, setShowPatientConsultations] = useState(false);
  const [showPatientHistoryView, setShowPatientHistoryView] = useState(false);
  const [hasInitializedLoggedPatientChat, setHasInitializedLoggedPatientChat] = useState(false);
  const [isCheckingCadastro, setIsCheckingCadastro] = useState(() => {
    const saved = localStorage.getItem('diagnostica_user');
    if (!saved) return false;
    const savedUser = JSON.parse(saved);
    return !(savedUser.tipo === 1 || savedUser.tipo === 'Recepcionista');
  });

  const authHeaders = authToken ? { Authorization: `Bearer ${authToken}` } : {};

  const consultorioNomeCache = useRef(new Map());

  const enrichWithConsultorioNome = async (list) => {
    const idsFaltando = [...new Set(list.map((c) => c.consultorioId).filter(Boolean))]
      .filter((id) => !consultorioNomeCache.current.has(id));

    await Promise.all(idsFaltando.map(async (id) => {
      try {
        const response = await fetch(`${API_URL}/consultorios/${encodeURIComponent(id)}`, { headers: authHeaders });
        const consultorio = response.ok ? await response.json() : null;
        consultorioNomeCache.current.set(id, consultorio?.nome || null);
      } catch {
        consultorioNomeCache.current.set(id, null);
      }
    }));

    return list.map((consultation) => ({
      ...consultation,
      consultorioNome: consultation.consultorioId
        ? consultorioNomeCache.current.get(consultation.consultorioId) || 'Consultório não identificado'
        : 'Não atribuído',
    }));
  };

  useEffect(() => {
    if (!selectedConsultation) return;
    setPendingStatus(STATUS_VALUE_BY_NAME[selectedConsultation.status] ?? 0);
    setPendingSeveridade(SEVERIDADE_VALUE_BY_NAME[selectedConsultation.severidade] ?? 0);
    setStatusUpdateError('');
  }, [selectedConsultation]);

  useEffect(() => {
    if (!authToken || !authUser || profile !== 'patient' || hasInitializedLoggedPatientChat) {
      return;
    }

    const initializeLoggedPatientChat = async () => {
      setHasInitializedLoggedPatientChat(true);

      try {
        const patientCpfValue = authUser.cpf || patientCpf || '';
        let patient = null;

        if (patientCpfValue) {
          const patientResponse = await fetch(`${API_URL}/pacientes/${encodeURIComponent(patientCpfValue)}`, {
            headers: { Authorization: `Bearer ${authToken}` },
          });
          if (patientResponse.ok) {
            patient = await patientResponse.json();
          }
        }

        const basePatient = patient || {
          cpf: patientCpfValue,
          nomeCompleto: authUser.nomeCompleto || authUser.nome || '',
          endereco: authUser.endereco || '',
          alergias: authUser.alergias || '',
          condicoesPrevias: authUser.condicoesPrevias || '',
          medicamentosUso: authUser.medicamentosUso || '',
        };

        setPatientCpf(patientCpfValue);
        setFormData((current) => ({
          ...current,
          nome: basePatient.nomeCompleto || current.nome || '',
          cpf: basePatient.cpf || current.cpf || '',
          endereco: basePatient.endereco || current.endereco || '',
          cartaoSus: basePatient.cartaoSus || current.cartaoSus || '',
          idade: basePatient.idade ? String(basePatient.idade) : current.idade || '',
          genero: basePatient.genero || current.genero || '',
          alergias: basePatient.alergias || current.alergias || '',
          condicoesPrevias: basePatient.condicoesPrevias || current.condicoesPrevias || '',
          medicamentosUso: basePatient.medicamentosUso || current.medicamentosUso || '',
          email: authUser.email || current.email || '',
        }));

        // Só retoma o chat automaticamente se o cadastro inicial já foi concluído antes.
        if (patient?.cadastroInicialConcluido) {
          await startChat(basePatient);
        } else {
          setStep('form');
        }
      } catch {
        setStep('form');
      } finally {
        setIsCheckingCadastro(false);
      }
    };

    void initializeLoggedPatientChat();
  }, [authToken, authUser, profile, hasInitializedLoggedPatientChat, patientCpf]);

  const loadPatientConsultations = async (token = authToken) => {
    if (!token) return;

    setIsLoadingPatientConsultations(true);
    setPatientLookupError('');
    try {
      const response = await fetch(`${API_URL}/consultas/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Não foi possível carregar suas consultas.');
      const data = await response.json();
      setPatientConsultations(await enrichWithConsultorioNome(data));
    } catch (error) {
      setPatientLookupError(error instanceof TypeError
        ? 'Não foi possível conectar ao backend.'
        : error.message);
    } finally {
      setIsLoadingPatientConsultations(false);
    }
  };

  const startChat = async (patient) => {
    setFormData((current) => ({
      ...current,
      nome: patient.nomeCompleto || current.nome,
      cpf: patient.cpf || current.cpf,
      endereco: patient.endereco || '',
      cartaoSus: patient.cartaoSus || '',
      idade: patient.idade ? String(patient.idade) : '',
      genero: patient.genero || '',
      alergias: patient.alergias || '',
      condicoesPrevias: patient.condicoesPrevias || '',
      medicamentosUso: patient.medicamentosUso || '',
    }));

    if (CHATBOT_URL) {
      const chatbotResponse = await fetch(`${CHATBOT_URL}/chat/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cpf: patient.cpf,
          nome_completo: patient.nomeCompleto,
          endereco: patient.endereco || null,
          alergias: patient.alergias || null,
          condicoes_previas: patient.condicoesPrevias || null,
          medicamentos_uso: patient.medicamentosUso || null,
        }),
      });
      if (!chatbotResponse.ok) {
        const detail = await chatbotResponse.text();
        throw new Error(detail || `Não foi possível iniciar o chatbot (${chatbotResponse.status}).`);
      }
      const chatbotData = await chatbotResponse.json();
      setChatbotSession(chatbotData.session_id);
      setTriageResult(null);
      setPendingAnamnese(null);
      setClinicOptions([]);
      setSelectedClinicId('');
      setChatHistory([{ sender: 'ai', text: chatbotData.assistant_message }]);
    } else {
      setChatHistory([{ sender: 'ai', text: `Olá, ${patient.nomeCompleto?.split(' ')[0] || 'paciente'}! Como você está se sentindo agora?` }]);
    }
    setStep('chat');
  };

  const handleNewChat = async () => {
    setIsFinalizingTriage(false);
    setPendingAnamnese(null);
    setClinicOptions([]);
    setSelectedClinicId('');
    await startChat({
      cpf: formData.cpf || authUser?.cpf,
      nomeCompleto: formData.nome,
      endereco: formData.endereco,
      alergias: formData.alergias,
      condicoesPrevias: formData.condicoesPrevias,
      medicamentosUso: formData.medicamentosUso,
    });
  };

  const handleLogin = async (event) => {
    event.preventDefault();
    setIsLoggingIn(true);
    setAuthError('');
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(authData),
      });
      if (!response.ok) throw new Error('Email ou senha inválidos.');

      const data = await response.json();
      const user = data.usuario;
      const nextProfile = user.tipo === 1 || user.tipo === 'Recepcionista' ? 'attendant' : 'patient';
      localStorage.setItem('diagnostica_token', data.token);
      localStorage.setItem('diagnostica_user', JSON.stringify(user));
      setAuthToken(data.token);
      setAuthUser(user);
      setProfile(nextProfile);
      if (nextProfile === 'attendant') {
        await loadConsultations(data.token);
      } else {
        // Evita que o efeito de retomada de sessão rode de novo por cima do fluxo de login.
        setHasInitializedLoggedPatientChat(true);
        let patient = data.paciente;
        if (!patient && user.cpf) {
          const patientResponse = await fetch(`${API_URL}/pacientes/${encodeURIComponent(user.cpf)}`, {
            headers: { Authorization: `Bearer ${data.token}` },
          });
          if (!patientResponse.ok) throw new Error('Não foi possível carregar seus dados de paciente.');
          patient = await patientResponse.json();
        }
        if (!patient) throw new Error('Usuário não está vinculado a um paciente.');
        setPatientCpf(patient.cpf || user.cpf || '');
        await loadPatientConsultations(data.token);
        const patientFormData = {
          ...formData,
          nome: patient.nomeCompleto || '',
          cpf: patient.cpf || user.cpf,
          endereco: patient.endereco || '',
          cartaoSus: patient.cartaoSus || '',
          idade: patient.idade ? String(patient.idade) : '',
          genero: patient.genero || '',
          alergias: patient.alergias || '',
          condicoesPrevias: patient.condicoesPrevias || '',
          medicamentosUso: patient.medicamentosUso || '',
          email: user.email,
        };
        setFormData(patientFormData);
        if (patient.cadastroInicialConcluido) {
          try {
            await startChat({ ...patient, cpf: patient.cpf || user.cpf });
          } catch {
            setChatHistory([{
              sender: 'ai',
              text: 'Login realizado, mas não foi possível conectar à IA. Verifique a chave Gemini e tente iniciar o atendimento novamente.',
            }]);
            setStep('chat');
            setAuthError('Login realizado. A IA está indisponível no momento.');
          }
        } else {
          setStep('form');
        }
      }
    } catch (error) {
      setAuthError(error instanceof TypeError ? 'Não foi possível conectar à API.' : error.message);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('diagnostica_token');
    localStorage.removeItem('diagnostica_user');
    setAuthToken(null);
    setAuthUser(null);
    setProfile(null);
    setConsultations([]);
    setHasInitializedLoggedPatientChat(false);
    setStep('form');
    setAuthMode('login');
  };

  const handleClinicRegister = async (event) => {
    event.preventDefault();
    if (clinicData.senha !== clinicData.confirmarSenha) {
      setAuthError('As senhas não coincidem.');
      return;
    }
    setIsLoggingIn(true);
    setAuthError('');
    try {
      const response = await fetch(`${API_URL}/auth/register-consultorio`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: clinicData.email,
          senha: clinicData.senha,
          nomeConsultorio: clinicData.nome,
          enderecoConsultorio: clinicData.endereco,
          especialidadeConsultorio: Number(clinicData.especialidade),
          especialidadeOutros: clinicData.especialidade === '14' ? clinicData.especialidadeOutros : null,
        }),
      });
      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || 'Não foi possível cadastrar o consultório.');
      }

      const data = await response.json();
      localStorage.setItem('diagnostica_token', data.token);
      localStorage.setItem('diagnostica_user', JSON.stringify(data.usuario));
      setAuthToken(data.token);
      setAuthUser(data.usuario);
      setProfile('attendant');
      await loadConsultations(data.token);
    } catch (error) {
      setAuthError(error instanceof TypeError ? 'Não foi possível conectar à API.' : error.message);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleForgotPassword = async (event) => {
    event.preventDefault();
    setIsSendingForgot(true);
    setAuthError('');
    setForgotMessage('');
    try {
      const response = await fetch(`${API_URL}/auth/esqueci-senha`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotData.email }),
      });
      if (!response.ok) throw new Error('Não foi possível processar a solicitação.');
      const data = await response.json();
      setForgotMessage(data.mensagem);
      setResetData({ token: data.token || '', novaSenha: '', confirmarSenha: '' });
      setAuthMode('reset');
    } catch (error) {
      setAuthError(error instanceof TypeError ? 'Não foi possível conectar à API.' : error.message);
    } finally {
      setIsSendingForgot(false);
    }
  };

  const handleResetPassword = async (event) => {
    event.preventDefault();
    if (resetData.novaSenha !== resetData.confirmarSenha) {
      setAuthError('As senhas não coincidem.');
      return;
    }
    setIsResettingPassword(true);
    setAuthError('');
    try {
      const response = await fetch(`${API_URL}/auth/redefinir-senha`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: resetData.token, novaSenha: resetData.novaSenha }),
      });
      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || 'Não foi possível redefinir a senha.');
      }
      setForgotMessage('Senha redefinida com sucesso. Faça login com a nova senha.');
      setResetData({ token: '', novaSenha: '', confirmarSenha: '' });
      setAuthMode('login');
    } catch (error) {
      setAuthError(error instanceof TypeError ? 'Não foi possível conectar à API.' : error.message);
    } finally {
      setIsResettingPassword(false);
    }
  };

  const loadConsultations = async (token = authToken) => {
    setIsLoadingConsultations(true);
    setConsultationError('');

    try {
      const response = await fetch(`${API_URL}/consultas/`, { headers: token ? { Authorization: `Bearer ${token}` } : authHeaders });
      if (!response.ok) throw new Error('Não foi possível carregar as consultas.');

      const data = await response.json();
      const withPatientNames = data.map((consultation) => ({
        ...consultation,
        patientName: consultation.pacienteNome || consultation.pacienteCpf,
      }));
      const enrichedConsultations = await enrichWithConsultorioNome(withPatientNames);

      setConsultations(enrichedConsultations);
      setSelectedConsultation((current) => current
        ? enrichedConsultations.find((consultation) => consultation.id === current.id) || current
        : enrichedConsultations[0] || null);
    } catch (error) {
      setConsultationError(error instanceof TypeError
        ? 'Não foi possível conectar à API. Verifique se o backend está em execução.'
        : error.message);
    } finally {
      setIsLoadingConsultations(false);
    }
  };

  const formatDate = (value) => new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
  }).format(new Date(value));

  const filteredConsultations = consultations.filter((consultation) => {
    const matchesFilter = consultationFilter === 'Todas' || consultation.severidade === consultationFilter;
    const searchableText = `${consultation.patientName} ${consultation.pacienteCpf}`.toLowerCase();
    return matchesFilter && searchableText.includes(consultationSearch.toLowerCase());
  });

  const severityConfig = {
    Vermelho: { label: 'Emergência', className: 'severity-red', icon: AlertTriangle },
    Laranja: { label: 'Muito urgente', className: 'severity-orange', icon: AlertTriangle },
    Amarelo: { label: 'Urgente', className: 'severity-yellow', icon: Clock3 },
    Verde: { label: 'Pouco urgente', className: 'severity-green', icon: CheckCircle2 },
    Azul: { label: 'Não urgente', className: 'severity-blue', icon: CheckCircle2 },
  };

  const getSeverity = (severity) => severityConfig[severity] || {
    label: severity || 'Sem classificação', className: 'severity-neutral', icon: Clock3
  };

  const handleUpdateStatus = async () => {
    if (!selectedConsultation) return;
    setIsUpdatingStatus(true);
    setStatusUpdateError('');
    try {
      const response = await fetch(`${API_URL}/consultas/${selectedConsultation.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({ status: Number(pendingStatus), severidade: Number(pendingSeveridade) }),
      });
      if (!response.ok) throw new Error('Não foi possível confirmar a consulta.');
      const updated = await response.json();
      setConsultations((current) => current.map((c) => (c.id === updated.id ? { ...c, ...updated } : c)));
      setSelectedConsultation((current) => (current?.id === updated.id ? { ...current, ...updated } : current));
    } catch (error) {
      setStatusUpdateError(error instanceof TypeError ? 'Não foi possível conectar à API.' : error.message);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const openPatientHistoryView = async () => {
    setShowPatientConsultations(false);
    await loadPatientConsultations();
    setShowPatientHistoryView(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    const isLoggedPatientCheck = Boolean(authToken && authUser?.cpf);
    if (!isLoggedPatientCheck && formData.senha !== formData.confirmarSenha) {
      setSubmitError('As senhas não coincidem.');
      return;
    }
    setIsSubmitting(true);
    setSubmitError('');

    try {
      const requestBody = {
        email: formData.email,
        senha: formData.senha,
        tipo: 0,
        cpf: formData.cpf,
        nomeCompleto: formData.nome,
        endereco: formData.endereco || null,
        cartaoSus: formData.cartaoSus || null,
        idade: Number(formData.idade),
        genero: formData.genero,
        alergias: formData.alergias || null,
        condicoesPrevias: formData.condicoesPrevias || null,
        medicamentosUso: formData.medicamentosUso || null,
      };
      const isLoggedPatient = Boolean(authToken && authUser?.cpf);
      const response = await fetch(
        isLoggedPatient
          ? `${API_URL}/pacientes/${encodeURIComponent(authUser.cpf)}`
          : `${API_URL}/auth/register`,
        {
          method: isLoggedPatient ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeaders },
          body: JSON.stringify(isLoggedPatient ? {
            endereco: requestBody.endereco,
            cartaoSus: requestBody.cartaoSus,
            idade: requestBody.idade,
            genero: requestBody.genero,
            alergias: requestBody.alergias,
            condicoesPrevias: requestBody.condicoesPrevias,
            medicamentosUso: requestBody.medicamentosUso,
          } : requestBody),
        },
      );

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || 'Não foi possível salvar seus dados.');
      }

      if (!isLoggedPatient) {
        const loginData = await response.json();
        const user = loginData.usuario;
        localStorage.setItem('diagnostica_token', loginData.token);
        localStorage.setItem('diagnostica_user', JSON.stringify(user));
        setAuthToken(loginData.token);
        setAuthUser(user);
        setProfile('patient');
        setPatientCpf(user.cpf);
        // Evita que o efeito de retomada de sessão rode por cima do cadastro recém-criado.
        setHasInitializedLoggedPatientChat(true);
        setStep('form');
        return;
      }

      const updatedPatient = isLoggedPatient ? await response.json() : requestBody;
      await startChat({
        ...updatedPatient,
        cpf: updatedPatient.cpf || formData.cpf,
        nomeCompleto: updatedPatient.nomeCompleto || formData.nome,
        endereco: updatedPatient.endereco || formData.endereco,
      });
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

  const enviarConfirmacao = async (anamnese, consultorioId) => {
    const confirmResponse = await fetch(`${CHATBOT_URL}/chat/${chatbotSession}/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        severidade_confirmada: anamnese.severidade_sugerida,
        endereco: formData.endereco || null,
        consultorio_id: consultorioId || null,
      }),
    });
    if (!confirmResponse.ok) {
      const detail = await confirmResponse.text();
      throw new Error(`Não foi possível registrar a consulta (${confirmResponse.status}): ${detail || 'erro na API'}`);
    }
    const confirmed = await confirmResponse.json();
    setTriageResult({ anamnese, confirmed });
    setPendingAnamnese(null);
    setClinicOptions([]);
    setSelectedClinicId('');
    await loadPatientConsultations();
    setChatHistory((current) => [
      ...current,
      {
        sender: 'ai',
        text: 'Consulta registrada. As informações de sintomas, alergias, medicamentos e condições foram registradas para avaliação da equipe.',
      },
    ]);
  };

  const handleConfirmClinicSelection = async () => {
    if (!pendingAnamnese || !selectedClinicId) return;
    setIsConfirmingConsulta(true);
    try {
      await enviarConfirmacao(pendingAnamnese, selectedClinicId);
    } catch (error) {
      setChatHistory((current) => [
        ...current,
        {
          sender: 'ai',
          text: error instanceof Error
            ? `Não consegui registrar a consulta: ${error.message}`
            : 'Não consegui registrar a consulta.',
        },
      ]);
    } finally {
      setIsConfirmingConsulta(false);
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
      const response = await fetch(chatbotSession ? `${CHATBOT_URL}/chat/${chatbotSession}/msg` : `${API_URL}/chat/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(chatbotSession ? { content: userPrompt } : {
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
        let detail = errorText;
        try {
          detail = JSON.parse(errorText).detail || errorText;
        } catch {
        }
        throw new Error(detail || `Não foi possível receber a resposta (${response.status}).`);
      }

      const data = await response.json();
      const nextHistory = [
        ...updatedHistory,
        {
          sender: 'ai',
          text: data.assistant_message || data.resposta || 'Não consegui processar sua mensagem no momento.'
        }
      ];
      setChatHistory(nextHistory);

      if (chatbotSession && data.is_complete) {
        setIsFinalizingTriage(true);
        try {
          const finalizeResponse = await fetch(`${CHATBOT_URL}/chat/${chatbotSession}/finalize`, {
            method: 'POST',
          });
          if (!finalizeResponse.ok) {
            const detail = await finalizeResponse.text();
            throw new Error(`Não foi possível consolidar a triagem (${finalizeResponse.status}): ${detail || 'erro na API'}`);
          }
          const finalized = await finalizeResponse.json();
          const anamnese = finalized.anamnese;

          const consultoriosResponse = await fetch(`${CHATBOT_URL}/chat/${chatbotSession}/consultorios`);
          const consultoriosSugeridos = consultoriosResponse.ok ? await consultoriosResponse.json() : null;
          const opcoes = consultoriosSugeridos?.consultorios || [];

          if (opcoes.length > 0) {
            setPendingAnamnese(anamnese);
            setClinicOptions(opcoes);
            setSelectedClinicId(opcoes[0].id);
            setChatHistory((current) => [
              ...current,
              {
                sender: 'ai',
                text: `Triagem concluída. Encontrei ${opcoes.length === 1 ? 'uma clínica' : `${opcoes.length} clínicas`} de ${consultoriosSugeridos.especialidade_sugerida} para você escolher. Selecione abaixo e confirme.`,
              },
            ]);
          } else {
            await enviarConfirmacao(anamnese, null);
          }
        } catch (error) {
          setChatHistory((current) => [
            ...current,
            {
              sender: 'ai',
              text: error instanceof Error
                ? `A triagem foi concluída, mas não consegui buscar as clínicas disponíveis: ${error.message}`
                : 'A triagem foi concluída, mas não consegui buscar as clínicas disponíveis.',
            },
          ]);
        } finally {
          setIsFinalizingTriage(false);
        }
      }
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

  if (!authToken || !authUser) {
    const authTitles = {
      login: 'Entrar no Diagnostica IA',
      clinic: 'Cadastrar consultório',
      register: 'Cadastrar paciente',
      forgot: 'Esqueci minha senha',
      reset: 'Redefinir senha',
    };
    const authSubtitles = {
      login: 'Acesse suas consultas ou o painel da recepção.',
      clinic: 'Crie o consultório e o acesso da recepção.',
      register: 'Crie seu acesso para iniciar a triagem.',
      forgot: 'Informe seu email para gerar um código de redefinição.',
      reset: 'Informe o código recebido e defina uma nova senha.',
    };
    return (
      <main className="container-center px-4 sm:px-8">
        <div className="form-card auth-card">
          <div className="card-header">
            <img className="auth-brand-logo" src="/Design%20sem%20nome%20(7)%20(1).svg" alt="Diagnostica IA" />
            <h2>{authTitles[authMode]}</h2>
            <p>{authSubtitles[authMode]}</p>
          </div>
          {authMode === 'login' ? (
            <form onSubmit={handleLogin} className="patient-form">
              <div className="form-group"><label>Email</label><input type="email" required value={authData.email} onChange={(event) => setAuthData({ ...authData, email: event.target.value })} /></div>
              <PasswordField id="login-senha" label="Senha" required autoComplete="current-password" value={authData.senha} onChange={(event) => setAuthData({ ...authData, senha: event.target.value })} />
              {authError && <p className="form-error" role="alert">{authError}</p>}
              <button type="submit" className="btn-primary w-full" disabled={isLoggingIn}>{isLoggingIn ? 'Entrando...' : 'Entrar'}</button>
              <button type="button" className="text-button" onClick={() => { setAuthError(''); setAuthMode('forgot'); }}>Esqueci minha senha</button>
              <button type="button" className="text-button" onClick={() => setAuthMode('register')}>Ainda não sou paciente</button>
              <button type="button" className="text-button" onClick={() => setAuthMode('clinic')}>Cadastrar um consultório</button>
            </form>
          ) : authMode === 'forgot' ? (
            <form onSubmit={handleForgotPassword} className="patient-form">
              <div className="form-group"><label>Email</label><input type="email" required value={forgotData.email} onChange={(event) => setForgotData({ email: event.target.value })} /></div>
              {authError && <p className="form-error" role="alert">{authError}</p>}
              {forgotMessage && <p className="form-success" role="status">{forgotMessage}</p>}
              <button type="submit" className="btn-primary w-full" disabled={isSendingForgot}>{isSendingForgot ? 'Enviando...' : 'Gerar código de redefinição'}</button>
              <button type="button" className="text-button" onClick={() => { setAuthError(''); setAuthMode('login'); }}>Voltar para o login</button>
            </form>
          ) : authMode === 'reset' ? (
            <form onSubmit={handleResetPassword} className="patient-form">
              <div className="form-group"><label>Código de redefinição</label><input required value={resetData.token} onChange={(event) => setResetData({ ...resetData, token: event.target.value })} /></div>
              <PasswordField id="reset-nova-senha" label="Nova senha" required minLength={6} autoComplete="new-password" value={resetData.novaSenha} onChange={(event) => setResetData({ ...resetData, novaSenha: event.target.value })} />
              <PasswordField id="reset-confirmar-senha" label="Confirmar nova senha" required minLength={6} autoComplete="new-password" value={resetData.confirmarSenha} onChange={(event) => setResetData({ ...resetData, confirmarSenha: event.target.value })} />
              {authError && <p className="form-error" role="alert">{authError}</p>}
              {forgotMessage && <p className="form-success" role="status">{forgotMessage}</p>}
              <button type="submit" className="btn-primary w-full" disabled={isResettingPassword}>{isResettingPassword ? 'Redefinindo...' : 'Redefinir senha'}</button>
              <button type="button" className="text-button" onClick={() => { setAuthError(''); setAuthMode('login'); }}>Voltar para o login</button>
            </form>
          ) : authMode === 'clinic' ? (
            <form onSubmit={handleClinicRegister} className="patient-form">
              <div className="form-group"><label>Nome do consultório</label><input required value={clinicData.nome} onChange={(event) => setClinicData({ ...clinicData, nome: event.target.value })} /></div>
              <div className="form-group"><label>Endereço</label><input required value={clinicData.endereco} onChange={(event) => setClinicData({ ...clinicData, endereco: event.target.value })} /></div>
              <div className="form-group">
                <label>Especialidade</label>
                <select value={clinicData.especialidade} onChange={(event) => setClinicData({ ...clinicData, especialidade: event.target.value })}>
                  <option value="0">Clínica Geral</option>
                  <option value="1">Odontologia</option>
                  <option value="2">Oftalmologia</option>
                  <option value="3">Psicologia</option>
                  <option value="4">Cardiologia</option>
                  <option value="5">Dermatologia</option>
                  <option value="6">Ginecologia</option>
                  <option value="7">Ortopedia</option>
                  <option value="8">Pediatria</option>
                  <option value="9">Psiquiatria</option>
                  <option value="10">Otorrinolaringologia</option>
                  <option value="11">Urologia</option>
                  <option value="12">Neurologia</option>
                  <option value="13">Endocrinologia</option>
                  <option value="14">Outros</option>
                </select>
              </div>
              {clinicData.especialidade === '14' && (
                <div className="form-group">
                  <label>Qual especialidade?</label>
                  <input required value={clinicData.especialidadeOutros} onChange={(event) => setClinicData({ ...clinicData, especialidadeOutros: event.target.value })} />
                </div>
              )}
              <div className="form-group"><label>Email da recepção</label><input type="email" required value={clinicData.email} onChange={(event) => setClinicData({ ...clinicData, email: event.target.value })} /></div>
              <PasswordField id="clinic-senha" label="Senha" required minLength={6} autoComplete="new-password" value={clinicData.senha} onChange={(event) => setClinicData({ ...clinicData, senha: event.target.value })} />
              <PasswordField id="clinic-confirmar-senha" label="Confirmar senha" required minLength={6} autoComplete="new-password" value={clinicData.confirmarSenha} onChange={(event) => setClinicData({ ...clinicData, confirmarSenha: event.target.value })} />
              {authError && <p className="form-error" role="alert">{authError}</p>}
              <button type="submit" className="btn-primary w-full" disabled={isLoggingIn}>{isLoggingIn ? 'Cadastrando...' : 'Criar consultório'}</button>
              <button type="button" className="text-button" onClick={() => setAuthMode('login')}>Voltar para o login</button>
            </form>
          ) : (
            <form onSubmit={handleFormSubmit} className="patient-form">
              <div className="form-group"><label>Nome completo</label><input required value={formData.nome} onChange={(event) => setFormData({ ...formData, nome: event.target.value })} /></div>
              <div className="form-group"><label>CPF</label><input required value={formData.cpf} onChange={(event) => setFormData({ ...formData, cpf: event.target.value })} /></div>
              <div className="form-group"><label>Email</label><input type="email" required value={formData.email} onChange={(event) => setFormData({ ...formData, email: event.target.value })} /></div>
              <PasswordField id="register-senha" label="Senha" required minLength={6} autoComplete="new-password" value={formData.senha} onChange={(event) => setFormData({ ...formData, senha: event.target.value })} />
              <PasswordField id="register-confirmar-senha" label="Confirmar senha" required minLength={6} autoComplete="new-password" value={formData.confirmarSenha} onChange={(event) => setFormData({ ...formData, confirmarSenha: event.target.value })} />
              {submitError && <p className="form-error" role="alert">{submitError}</p>}
              <button type="submit" className="btn-primary w-full" disabled={isSubmitting}>{isSubmitting ? 'Cadastrando...' : 'Criar acesso'}</button>
              <button type="button" className="text-button" onClick={() => setAuthMode('login')}>Já tenho uma conta</button>
              <button type="button" className="text-button" onClick={() => setAuthMode('clinic')}>Cadastrar um consultório</button>
            </form>
          )}
        </div>
      </main>
    );
  }

  if (profile === 'patient') {
    if (isCheckingCadastro) {
      return (
        <main className="container-center px-4 sm:px-8">
          <div className="empty-state"><RefreshCw className="spin" size={25} /><p>Carregando seus dados...</p></div>
        </main>
      );
    }

    if (showPatientHistoryView) {
      return (
        <div className="patient-app">
          <header className="patient-header px-5 sm:px-8">
            <div className="logo-area">
              <Heart className="logo-icon" size={26} />
              <span className="logo-text">Diagnostica <span className="logo-highlight">IA</span></span>
            </div>
            <div className="header-actions">
              <div className="profile-switcher" aria-label="Perfil autenticado">
                <span className="active"><><User size={15} /> Paciente</></span>
              </div>
              <button type="button" className="text-button" onClick={() => setShowPatientHistoryView(false)}>Voltar ao chat</button>
              <button type="button" className="text-button" onClick={logout}>Sair</button>
            </div>
          </header>

          <main className="patient-portal" style={{ padding: '2.5rem 1.5rem' }}>
            <section className="portal-card">
              <div className="portal-card-heading">
                <div className="portal-icon"><CalendarDays size={22} /></div>
                <div><h2>Minhas consultas</h2><p>Histórico do paciente e informações da sua triagem.</p></div>
              </div>

              {isLoadingPatientConsultations && <div className="empty-state"><RefreshCw className="spin" size={25} /><p>Carregando consultas...</p></div>}
              {!isLoadingPatientConsultations && patientConsultations.length === 0 && (
                <div className="empty-state"><ClipboardList size={28} /><p>Nenhuma consulta registrada.</p><span>Seu histórico aparecerá aqui assim que houver atendimentos.</span></div>
              )}

              {!isLoadingPatientConsultations && patientConsultations.length > 0 && (
                <div className="patient-history">
                  <div className="history-heading">
                    <div>
                      <span className="eyebrow">Histórico encontrado</span>
                      <h2>{patientConsultations.length} {patientConsultations.length === 1 ? 'consulta registrada' : 'consultas registradas'}</h2>
                    </div>
                    <span className="cpf-label">CPF {patientCpf}</span>
                  </div>
                  <div className="patient-history-list">
                    {patientConsultations.map((consultation) => {
                      const severity = getSeverity(consultation.severidade);
                      const SeverityIcon = severity.icon;
                      return <article className="patient-history-item" key={consultation.id}>
                        <div className={`severity-icon ${severity.className}`}><SeverityIcon size={18} /></div>
                        <div className="history-item-content"><strong>Consulta realizada</strong><span><CalendarDays size={14} /> {formatDate(consultation.dataConsulta)}</span><span>{consultation.consultorioNome}</span>{consultation.observacoes && <p>{consultation.observacoes}</p>}</div>
                        <span className={`severity-badge ${severity.className}`}>{severity.label}</span>
                      </article>;
                    })}
                  </div>
                </div>
              )}

              <div className="portal-card-footer" style={{ marginTop: '1.5rem' }}>
                <button type="button" className="text-button" onClick={() => setShowPatientHistoryView(false)}>Voltar para o chat <ArrowRight size={15} /></button>
              </div>
            </section>
          </main>
        </div>
      );
    }

    if (step === 'chat') {
    return (
      <div className="patient-app">
        <header className="patient-header px-5 sm:px-8">
          <div className="logo-area">
            <Heart className="logo-icon" size={26} />
            <span className="logo-text">Diagnostica <span className="logo-highlight">IA</span></span>
          </div>
          <div className="header-actions">
            <div className="profile-switcher" aria-label="Perfil autenticado">
              <span className="active"><><User size={15} /> Paciente</></span>
            </div>
            <div className="header-badge">
              <ShieldCheck size={16} />
              <span>Portal do Paciente</span>
            </div>
            <button type="button" className="text-button" onClick={logout}>Sair</button>
          </div>
        </header>

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

            <div className="patient-consultations-panel">
              <button
                type="button"
                className="consultations-toggle"
                onClick={openPatientHistoryView}
              >
                <span><CalendarDays size={15} /> Minhas consultas</span>
                <ChevronRight size={16} />
              </button>
            </div>

            <button type="button" className="new-triage-button" onClick={handleNewChat} disabled={isFinalizingTriage}>
              <Plus size={15} /> Nova triagem
            </button>

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

            {clinicOptions.length > 0 && !triageResult && (
              <div className="clinic-selection">
                <p>Escolha a cl&iacute;nica para sua consulta:</p>
                <div className="clinic-options">
                  {clinicOptions.map((clinic) => (
                    <label key={clinic.id} className={`clinic-option ${selectedClinicId === clinic.id ? 'selected' : ''}`}>
                      <input
                        type="radio"
                        name="clinicOption"
                        value={clinic.id}
                        checked={selectedClinicId === clinic.id}
                        onChange={() => setSelectedClinicId(clinic.id)}
                      />
                      <span><strong>{clinic.nome}</strong><small>{clinic.endereco}</small></span>
                    </label>
                  ))}
                </div>
                <button type="button" className="btn-primary" onClick={handleConfirmClinicSelection} disabled={!selectedClinicId || isConfirmingConsulta}>
                  {isConfirmingConsulta ? 'Registrando...' : 'Confirmar consulta'}
                </button>
              </div>
            )}
            {triageResult && (
              <div className="ai-notice">
                <CheckCircle2 size={16} />
                <p>Consulta registrada. A equipe receberá o resumo da triagem e confirmará a prioridade no atendimento.</p>
              </div>
            )}
            {isFinalizingTriage && <div className="ai-notice"><RefreshCw className="spin" size={16} /><p>Consolidando a triagem e registrando a consulta...</p></div>}
            <form onSubmit={handleSendMessage} className="chat-input-bar">
              <input
                type="text"
                placeholder="Descreva o que está sentindo..."
                value={inputMsg}
                onChange={(e) => setInputMsg(e.target.value)}
                disabled={isFinalizingTriage || Boolean(triageResult) || clinicOptions.length > 0}
              />
              <button type="submit" className="send-button" disabled={!inputMsg.trim() || isFinalizingTriage || Boolean(triageResult) || clinicOptions.length > 0}>
                <Send size={18} />
              </button>
            </form>
          </section>
        </main>
      </div>
    );
    }
  }

  return (
    <div className={`patient-app ${profile === 'attendant' ? 'attendant-app' : ''}`}>
      {/* --- HEADER --- */}
      <header className="patient-header px-5 sm:px-8">
        <div className="logo-area">
          <Heart className="logo-icon" size={26} />
          <span className="logo-text">Diagnostica <span className="logo-highlight">IA</span></span>
        </div>
        <div className="header-actions">
          <div className="profile-switcher" aria-label="Perfil autenticado">
            <span className="active">{profile === 'patient' ? <><User size={15} /> Paciente</> : <><ClipboardList size={15} /> Recepção</>}</span>
          </div>
          <div className="header-badge">
            {profile === 'patient' ? <ShieldCheck size={16} /> : <ClipboardList size={16} />}
            <span>{profile === 'patient' ? 'Portal do Paciente' : 'Painel da Recepção'}</span>
          </div>
          <button type="button" className="text-button" onClick={logout}>Sair</button>
        </div>
      </header>

      {profile === 'attendant' && (
        <main className="attendant-dashboard">
          <section className="dashboard-heading">
            <div>
              <span className="eyebrow">Central de atendimento</span>
              <h1>Consultas em acompanhamento</h1>
              <p>Visualize a fila e identifique rapidamente a prioridade de cada paciente.</p>
            </div>
            <button className="refresh-button" onClick={() => loadConsultations()} disabled={isLoadingConsultations} title="Atualizar consultas">
              <RefreshCw size={17} className={isLoadingConsultations ? 'spin' : ''} />
              Atualizar
            </button>
          </section>

          <section className="dashboard-stats" aria-label="Resumo da fila">
            <div className="stat-card"><span>Total na fila</span><strong>{consultations.length}</strong><ClipboardList size={20} /></div>
            <div className="stat-card stat-card-alert"><span>Prioridade alta</span><strong>{consultations.filter(({ severidade }) => ['Vermelho', 'Laranja'].includes(severidade)).length}</strong><AlertTriangle size={20} /></div>
            <div className="stat-card stat-card-calm"><span>Não urgentes</span><strong>{consultations.filter(({ severidade }) => ['Verde', 'Azul'].includes(severidade)).length}</strong><CheckCircle2 size={20} /></div>
          </section>

          <section className="consultations-workspace">
            <div className="consultations-list-panel">
              <div className="list-toolbar">
                <div className="search-field"><Search size={16} /><input value={consultationSearch} onChange={(event) => setConsultationSearch(event.target.value)} placeholder="Buscar por nome ou CPF" /></div>
                <select value={consultationFilter} onChange={(event) => setConsultationFilter(event.target.value)} aria-label="Filtrar por classificação">
                  <option>Todas</option><option>Vermelho</option><option>Laranja</option><option>Amarelo</option><option>Verde</option><option>Azul</option>
                </select>
              </div>

              {consultationError && <p className="form-error" role="alert">{consultationError}</p>}
              {isLoadingConsultations && <div className="empty-state"><RefreshCw className="spin" size={25} /><p>Carregando consultas...</p></div>}
              {!isLoadingConsultations && !consultationError && filteredConsultations.length === 0 && <div className="empty-state"><ClipboardList size={28} /><p>Nenhuma consulta encontrada.</p><span>As novas classificações aparecerão aqui.</span></div>}
              {!isLoadingConsultations && filteredConsultations.length > 0 && <div className="consultation-items">
                {filteredConsultations.map((consultation) => {
                  const severity = getSeverity(consultation.severidade);
                  const SeverityIcon = severity.icon;
                  return <button key={consultation.id} className={`consultation-item ${selectedConsultation?.id === consultation.id ? 'selected' : ''}`} onClick={() => setSelectedConsultation(consultation)}>
                    <div className={`severity-icon ${severity.className}`}><SeverityIcon size={18} /></div>
                    <div className="consultation-item-info"><strong>{consultation.patientName}</strong><span>CPF {consultation.pacienteCpf}</span><small>{consultation.consultorioNome} · {formatDate(consultation.dataConsulta)}</small></div>
                    <div className="item-side"><span className={`severity-badge ${severity.className}`}>{severity.label}</span><ChevronRight size={17} /></div>
                  </button>;
                })}
              </div>}
            </div>

            <aside className="consultation-detail">
              {selectedConsultation ? (() => {
                const severity = getSeverity(selectedConsultation.severidade);
                const SeverityIcon = severity.icon;
                const hasPendingChanges = pendingStatus !== (STATUS_VALUE_BY_NAME[selectedConsultation.status] ?? 0)
                  || pendingSeveridade !== (SEVERIDADE_VALUE_BY_NAME[selectedConsultation.severidade] ?? 0);
                return <>
                  <div className="detail-topline"><span className="eyebrow">Detalhes da consulta</span><span className="detail-id">#{selectedConsultation.id.slice(0, 8)}</span></div>
                  <div className="detail-patient"><div className="detail-avatar"><User size={24} /></div><div><h2>{selectedConsultation.patientName}</h2><p>CPF {selectedConsultation.pacienteCpf}</p></div></div>
                  <div className={`classification-card ${severity.className}`}><div className="classification-icon"><SeverityIcon size={22} /></div><div><span>Classificação Manchester</span><strong>{severity.label}</strong><small>Nível {selectedConsultation.severidade}</small></div></div>
                  <div className="detail-info">
                    <div><span>Data de entrada</span><strong>{formatDate(selectedConsultation.dataConsulta)}</strong></div>
                    <div>
                      <span>Classificação</span>
                      <select
                        className="status-select"
                        value={pendingSeveridade}
                        onChange={(event) => setPendingSeveridade(Number(event.target.value))}
                        disabled={isUpdatingStatus}
                      >
                        {SEVERIDADE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <span>Status</span>
                      <select
                        className="status-select"
                        value={pendingStatus}
                        onChange={(event) => setPendingStatus(Number(event.target.value))}
                        disabled={isUpdatingStatus}
                      >
                        {STATUS_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="detail-action"
                    onClick={handleUpdateStatus}
                    disabled={isUpdatingStatus || !hasPendingChanges}
                  >
                    <CheckCircle2 size={17} /> {isUpdatingStatus ? 'Confirmando...' : 'Confirmar consulta'}
                  </button>
                  {statusUpdateError && <p className="form-error" role="alert">{statusUpdateError}</p>}
                  <div className="detail-info"><div><span>Consultório</span><strong>{selectedConsultation.consultorioNome}</strong></div></div>
                  <div className="observations"><span>Observações da triagem</span><p>{selectedConsultation.observacoes || 'Nenhuma observação registrada.'}</p></div>
                </>;
              })() : <div className="empty-state detail-empty"><ClipboardList size={30} /><p>Selecione uma consulta</p><span>Os detalhes da classificação serão exibidos aqui.</span></div>}
            </aside>
          </section>
        </main>
      )}

      {/* --- ETAPA 1: FORMULÁRIO DE CADASTRO --- */}
      {profile === 'patient' && step === 'form' && (
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
      {profile === 'patient' && step === 'chat' && (
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

            <div className="patient-consultations-panel">
              <button
                type="button"
                className="consultations-toggle"
                onClick={() => setShowPatientConsultations((current) => !current)}
              >
                <span><CalendarDays size={15} /> Minhas consultas</span>
                <ChevronRight size={16} className={showPatientConsultations ? 'rotate-90' : ''} />
              </button>
              {showPatientConsultations && (
                <div className="patient-chat-history">
                  {isLoadingPatientConsultations && <p className="history-status">Carregando consultas...</p>}
                  {patientLookupError && <p className="history-status form-error">{patientLookupError}</p>}
                  {!isLoadingPatientConsultations && !patientLookupError && patientConsultations.length === 0 && (
                    <p className="history-status">Nenhuma consulta registrada.</p>
                  )}
                  {patientConsultations.map((consultation) => {
                    const severity = getSeverity(consultation.severidade);
                    return (
                      <article className="patient-chat-consultation" key={consultation.id}>
                        <div>
                          <strong>{severity.label}</strong>
                          <span>{formatDate(consultation.dataConsulta)}</span>
                        </div>
                        <span className="history-status">{consultation.consultorioNome}</span>
                        <p>{consultation.observacoes || 'Sem observações registradas.'}</p>
                      </article>
                    );
                  })}
                  <button
                    type="button"
                    className="refresh-history-button"
                    onClick={() => loadPatientConsultations()}
                    disabled={isLoadingPatientConsultations}
                  >
                    <RefreshCw size={14} className={isLoadingPatientConsultations ? 'spin' : ''} /> Atualizar
                  </button>
                </div>
              )}
            </div>

            <button type="button" className="new-triage-button" onClick={handleNewChat} disabled={isFinalizingTriage}>
              <Plus size={15} /> Nova triagem
            </button>

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

            {clinicOptions.length > 0 && !triageResult && (
              <div className="clinic-selection">
                <p>Escolha a cl&iacute;nica para sua consulta:</p>
                <div className="clinic-options">
                  {clinicOptions.map((clinic) => (
                    <label key={clinic.id} className={`clinic-option ${selectedClinicId === clinic.id ? 'selected' : ''}`}>
                      <input
                        type="radio"
                        name="clinicOption"
                        value={clinic.id}
                        checked={selectedClinicId === clinic.id}
                        onChange={() => setSelectedClinicId(clinic.id)}
                      />
                      <span><strong>{clinic.nome}</strong><small>{clinic.endereco}</small></span>
                    </label>
                  ))}
                </div>
                <button type="button" className="btn-primary" onClick={handleConfirmClinicSelection} disabled={!selectedClinicId || isConfirmingConsulta}>
                  {isConfirmingConsulta ? 'Registrando...' : 'Confirmar consulta'}
                </button>
              </div>
            )}
            {triageResult && (
              <div className="ai-notice">
                <CheckCircle2 size={16} />
                <p>Consulta registrada. A equipe receberá o resumo da triagem e confirmará a prioridade no atendimento.</p>
              </div>
            )}
            {isFinalizingTriage && <div className="ai-notice"><RefreshCw className="spin" size={16} /><p>Consolidando a triagem e registrando a consulta...</p></div>}
            <form onSubmit={handleSendMessage} className="chat-input-bar">
              <input
                type="text"
                placeholder="Descreva o que está sentindo..."
                value={inputMsg}
                onChange={(e) => setInputMsg(e.target.value)}
                disabled={isFinalizingTriage || Boolean(triageResult) || clinicOptions.length > 0}
              />
              <button type="submit" className="send-button" disabled={!inputMsg.trim() || isFinalizingTriage || Boolean(triageResult) || clinicOptions.length > 0}>
                <Send size={18} />
              </button>
            </form>
          </section>
        </main>
      )}
    </div>
  );
}