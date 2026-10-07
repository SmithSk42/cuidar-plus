import { useState, useEffect } from 'react';
import Login from './components/Login';
import PatientTable from './components/PatientTable';
import PatientModal from './components/PatientModal';
import './App.css';

const API_URL = 'http://localhost:3000';

function App() {
  const [token, setToken] = useState(localStorage.getItem('cuidar_token') || null);
  const [pacientes, setPacientes] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    nome: '', dataNascimento: '', diagnostico: '', familiar: '', parentesco: '', telefone: '', email: ''
  });

  useEffect(() => {
    if (token) buscarPacientes();
  }, [token]);

  const showToast = (message, type = 'success') => {
    setToast({ visible: true, message, type });
    setTimeout(() => setToast({ visible: false, message: '', type: 'success' }), 3000);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    const email = e.target.email.value;
    try {
      const res = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (res.ok && data.token) {
        localStorage.setItem('cuidar_token', data.token);
        setToken(data.token);
        showToast('Sessão iniciada com sucesso!');
      } else alert(data.erro || 'Falha na autenticação');
    } catch (err) { alert("API Offline!"); }
  };

  const logout = () => {
    localStorage.removeItem('cuidar_token');
    setToken(null);
  };

  const buscarPacientes = async () => {
    try {
      const res = await fetch(`${API_URL}/pacientes`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (res.status === 401 || res.status === 403) return logout();
      if (res.ok) setPacientes(await res.json());
    } catch (error) { console.error(error); }
  };

  const cadastrarPaciente = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    const payload = {
      profissional_id: '11111111-1111-1111-1111-111111111111', 
      nome_paciente: formData.nome,
      data_nascimento_paciente: formData.dataNascimento,
      diagnostico_condicao: formData.diagnostico,
      nome_familiar: formData.familiar,
      grau_parentesco: formData.parentesco,
      telefone_familiar: formData.telefone,
      email_familiar: formData.email
    };

    try {
      const res = await fetch(`${API_URL}/pacientes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        showToast("Paciente gravado!");
        setIsModalOpen(false);
        setFormData({ nome: '', dataNascimento: '', diagnostico: '', familiar: '', parentesco: '', telefone: '', email: '' });
        buscarPacientes();
      } else showToast("Erro ao gravar", "error");
    } catch (err) { showToast("Erro de API", "error"); }
    finally { setIsSubmitting(false); }
  };

  const adicionarTarefa = async (idPaciente, nomePaciente) => {
    const titulo = window.prompt(`Tarefa para ${nomePaciente}:`, "Exercício de Mobilidade");
    if (!titulo) return;
    try {
      const res = await fetch(`${API_URL}/pacientes/${idPaciente}/cuidados`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          data_programada: new Date().toISOString().split('T')[0],
          titulo_tarefa: titulo,
          instrucoes_fisioterapeuta: "Seguir orientações.",
          link_video_referencia: "https://youtube.com"
        })
      });
      if (res.ok) showToast("Tarefa sincronizada!");
      else showToast("Falha ao gravar", "error");
    } catch (err) { showToast("Erro de API", "error"); }
  };

  if (!token) return <Login onLogin={handleLogin} />;

  return (
    <div className="flex min-h-screen bg-slate-50">
      <main className="flex-1 p-8">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Painel Clínico</h1>
            <p className="text-slate-500">Gere pacientes em tempo real.</p>
          </div>
          <div className="flex gap-4">
            <button onClick={() => setIsModalOpen(true)} className="bg-sky-600 text-white px-5 py-2.5 rounded-xl">
              Novo Paciente
            </button>
            <button onClick={logout} className="bg-rose-500 text-white px-5 py-2.5 rounded-xl">Sair</button>
          </div>
        </header>

        <PatientTable pacientes={pacientes} onAddTask={adicionarTarefa} />
        
        <PatientModal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
          onSubmit={cadastrarPaciente}
          formData={formData}
          setFormData={setFormData}
          isSubmitting={isSubmitting}
        />
      </main>

      {toast.visible && (
        <div className={`fixed bottom-8 right-8 z-50 px-6 py-4 rounded-2xl text-white shadow-xl ${toast.type === 'error' ? 'bg-rose-600' : 'bg-slate-800'}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}

export default App;