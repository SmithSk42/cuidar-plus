import { useState, useEffect } from 'react';
import './App.css';

const API_URL = 'http://localhost:3000';

function App() {
  // === ESTADOS DO SISTEMA ===
  const [token, setToken] = useState(localStorage.getItem('cuidar_token') || null);
  const [pacientes, setPacientes] = useState([]);
  
  // === ESTADOS DA INTERFACE ===
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // === ESTADOS DO FORMULÁRIO ===
  const [formData, setFormData] = useState({
    nome: '', diagnostico: '', familiar: '', telefone: '', email: ''
  });

  useEffect(() => {
    if (token) buscarPacientes();
  }, [token]);

  const showToast = (message, type = 'success') => {
    setToast({ visible: true, message, type });
    setTimeout(() => setToast({ visible: false, message: '', type: 'success' }), 3000);
  };

  // === COMUNICAÇÃO COM A API (O SEU BACK-END) ===

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
      } else {
        alert(data.erro || 'Falha na autenticação');
      }
    } catch (err) {
      alert("A API no localhost:3000 está desligada!");
    }
  };

  const logout = () => {
    localStorage.removeItem('cuidar_token');
    setToken(null);
  };

  const buscarPacientes = async () => {
    try {
      const res = await fetch(`${API_URL}/pacientes`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (res.status === 401 || res.status === 403) return logout();
      if (res.ok) {
        const data = await res.json();
        setPacientes(data);
      }
    } catch (error) {
      console.error("Erro de conexão:", error);
    }
  };

  const cadastrarPaciente = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    const payload = {
      profissional_id: '11111111-1111-1111-1111-111111111111',
      nome_paciente: formData.nome,
      data_nascimento_paciente: '1980-01-01',
      diagnostico_condicao: formData.diagnostico,
      nome_familiar: formData.familiar,
      grau_parentesco: 'Familiar Responsável',
      telefone_familiar: formData.telefone || '77000000000',
      email_familiar: formData.email || 'familiar@email.com'
    };

    try {
      const res = await fetch(`${API_URL}/pacientes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        showToast(`Paciente ${formData.nome} gravado no PostgreSQL!`);
        setIsModalOpen(false);
        setFormData({ nome: '', diagnostico: '', familiar: '', telefone: '', email: '' });
        buscarPacientes();
      } else {
        showToast("Erro ao gravar paciente.", "error");
      }
    } catch (err) {
      showToast("Erro de ligação à API.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const adicionarTarefa = async (idPaciente, nomePaciente) => {
    const titulo = window.prompt(`Registar tarefa no diário de ${nomePaciente}:`, "Exercício de Mobilidade");
    if (!titulo) return;

    try {
      const res = await fetch(`${API_URL}/pacientes/${idPaciente}/cuidados`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          data_programada: new Date().toISOString().split('T')[0],
          titulo_tarefa: titulo,
          instrucoes_fisioterapeuta: "Realizar conforme as orientações clínicas.",
          link_video_referencia: "https://youtube.com"
        })
      });

      if (res.ok) showToast("Tarefa sincronizada com sucesso!");
      else showToast("Falha ao gravar tarefa.", "error");
    } catch (err) {
      showToast("Erro na API.", "error");
    }
  };

  // === RENDERIZAÇÃO: ECRÃ DE LOGIN ===
  if (!token) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 border border-slate-100">
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-sky-50 rounded-2xl flex items-center justify-center mb-4 text-sky-600">
              <span className="material-symbols-outlined text-[32px]">local_hospital</span>
            </div>
            <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Cuidar<span className="text-sky-500">+</span></h1>
            <p className="text-slate-500 mt-2 text-center text-sm">Acesso restrito a profissionais de saúde. A sua ligação é protegida por JWT.</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">E-mail de Acesso</label>
              <input name="email" type="email" defaultValue="carlos.fisio@email.com" required className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none transition-all" />
            </div>
            <button type="submit" className="w-full py-3 bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-xl transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2">
              <span className="material-symbols-outlined text-[20px]">login</span> Entrar no Sistema
            </button>
          </form>
        </div>
      </div>
    );
  }

  // === RENDERIZAÇÃO: DASHBOARD COMPLETO ===
  return (
    <div className="flex min-h-screen bg-slate-50">
      
      {/* SIDEBAR ESQUERDA */}
      <aside className="w-64 bg-white border-r border-slate-200 fixed h-full z-40 hidden md:flex flex-col justify-between">
        <div>
          <div className="h-20 flex items-center px-6 gap-3 border-b border-slate-100">
            <div className="w-10 h-10 bg-sky-100 text-sky-600 rounded-xl flex items-center justify-center">
              <span className="material-symbols-outlined text-[24px]">local_hospital</span>
            </div>
            <span className="text-xl font-bold text-slate-800">Cuidar<span className="text-sky-500">+</span></span>
          </div>
          <nav className="p-4 space-y-1">
            <a href="#" className="flex items-center gap-3 px-4 py-3 bg-sky-50 text-sky-700 rounded-xl font-semibold transition-colors">
              <span className="material-symbols-outlined">grid_view</span> Dashboard
            </a>
            <a href="#" className="flex items-center gap-3 px-4 py-3 text-slate-500 hover:bg-slate-50 hover:text-slate-700 rounded-xl font-medium transition-colors">
              <span className="material-symbols-outlined">group</span> Pacientes
            </a>
            <a href="#" className="flex items-center gap-3 px-4 py-3 text-slate-500 hover:bg-slate-50 hover:text-slate-700 rounded-xl font-medium transition-colors">
              <span className="material-symbols-outlined">assessment</span> Relatórios
            </a>
          </nav>
        </div>
        <div className="p-4">
          <button onClick={logout} className="w-full flex items-center gap-3 px-4 py-3 text-rose-500 hover:bg-rose-50 rounded-xl font-medium transition-colors">
            <span className="material-symbols-outlined">logout</span> Terminar Sessão
          </button>
        </div>
      </aside>

      {/* ÁREA PRINCIPAL */}
      <main className="flex-1 md:ml-64 p-8">
        
        {/* CABEÇALHO */}
        <header className="flex flex-col lg:flex-row justify-between lg:items-center gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Servidor PostgreSQL Online</span>
            </div>
            <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Painel Clínico</h1>
            <p className="text-slate-500 text-sm mt-1">Gere pacientes, protocolos e alertas em tempo real.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-400">search</span>
              <input type="text" placeholder="Buscar paciente..." className="pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl outline-none focus:border-sky-500 bg-white w-64" />
            </div>
            <button onClick={() => setIsModalOpen(true)} className="bg-sky-600 hover:bg-sky-700 text-white px-5 py-2.5 rounded-xl shadow-md font-medium transition-colors flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px]">person_add</span> Novo Paciente
            </button>
          </div>
        </header>

        {/* CARTÕES DE KPI */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Pacientes Ativos</p>
              <h3 className="text-3xl font-bold text-slate-800 mt-1">{pacientes.length}</h3>
            </div>
            <div className="w-12 h-12 bg-sky-50 text-sky-600 rounded-xl flex items-center justify-center">
              <span className="material-symbols-outlined text-[28px]">groups</span>
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Check-ins Hoje</p>
              <h3 className="text-3xl font-bold text-slate-800 mt-1">4 <span className="text-xl text-slate-400 font-normal">/ {pacientes.length}</span></h3>
            </div>
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
              <span className="material-symbols-outlined text-[28px]">verified</span>
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Alertas Críticos</p>
              <h3 className="text-3xl font-bold text-rose-600 mt-1">2</h3>
            </div>
            <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center">
              <span className="material-symbols-outlined text-[28px]">warning</span>
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Adesão Média</p>
              <h3 className="text-3xl font-bold text-slate-800 mt-1">82%</h3>
            </div>
            <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
              <span className="material-symbols-outlined text-[28px]">insights</span>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* COLUNA ESQUERDA: ALERTAS */}
          <section className="lg:col-span-1 space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <span className="material-symbols-outlined text-rose-500">notifications_active</span> Alertas Recentes
              </h2>
            </div>
            
            {/* Mock Alerta 1 */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border-l-4 border-rose-500">
              <div className="flex justify-between items-start mb-2">
                <span className="font-semibold text-slate-800">Maria Alice</span>
                <span className="text-xs bg-rose-100 text-rose-700 px-2 py-1 rounded-full font-bold">Há 25 min</span>
              </div>
              <p className="text-sm text-slate-600">Paciente relatou queda durante exercícios de marcha no diário.</p>
              <button className="mt-3 text-sm text-sky-600 font-semibold hover:underline">Abrir Prontuário</button>
            </div>

            {/* Mock Alerta 2 */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border-l-4 border-amber-400">
              <div className="flex justify-between items-start mb-2">
                <span className="font-semibold text-slate-800">João Silva</span>
                <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full font-bold">Há 2 horas</span>
              </div>
              <p className="text-sm text-slate-600">3 dias consecutivos sem realizar a rotina de fortalecimento.</p>
              <button className="mt-3 text-sm text-sky-600 font-semibold hover:underline">Contactar Familiar</button>
            </div>
          </section>

          {/* COLUNA DIREITA: TABELA DE PACIENTES */}
          <section className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white">
                <h2 className="text-lg font-bold text-slate-800">Tabela de Pacientes ({pacientes.length})</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="py-4 px-6 font-semibold text-slate-500 text-sm uppercase">Paciente / Familiar</th>
                      <th className="py-4 px-6 font-semibold text-slate-500 text-sm uppercase">Patologia</th>
                      <th className="py-4 px-6 font-semibold text-slate-500 text-sm uppercase text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pacientes.map((paciente) => (
                      <tr key={paciente.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center font-bold text-sm">
                              {paciente.nome_paciente.substring(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <span className="font-semibold text-slate-800 block">{paciente.nome_paciente}</span>
                              <span className="text-xs text-slate-500">Fam: {paciente.nome_familiar}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <span className="text-sm font-medium text-slate-700 bg-slate-100 px-3 py-1 rounded-full">
                            {paciente.diagnostico_condicao}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-right">
                          <button 
                            onClick={() => adicionarTarefa(paciente.id, paciente.nome_paciente)}
                            className="bg-sky-50 text-sky-600 hover:bg-sky-600 hover:text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors flex items-center gap-1 inline-flex"
                          >
                            <span className="material-symbols-outlined text-[18px]">add_box</span> Diário
                          </button>
                        </td>
                      </tr>
                    ))}
                    {pacientes.length === 0 && (
                      <tr>
                        <td colSpan="3" className="py-10 text-center text-slate-500">
                          Nenhum paciente cadastrado. A sua base de dados PostgreSQL está à espera.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* MODAL CADASTRAR PACIENTE */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden transform transition-all">
            <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-sky-600 text-white rounded-xl flex items-center justify-center">
                  <span className="material-symbols-outlined">person_add</span>
                </div>
                <h3 className="font-bold text-xl text-slate-800">Novo Paciente</h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-rose-500 transition-colors">
                <span className="material-symbols-outlined text-[24px]">close</span>
              </button>
            </div>
            
            <form onSubmit={cadastrarPaciente} className="p-8 space-y-5">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Nome Completo do Paciente *</label>
                <input required type="text" value={formData.nome} onChange={(e) => setFormData({...formData, nome: e.target.value})} className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Diagnóstico Clínico *</label>
                <input required type="text" value={formData.diagnostico} onChange={(e) => setFormData({...formData, diagnostico: e.target.value})} className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Familiar Responsável *</label>
                <input required type="text" value={formData.familiar} onChange={(e) => setFormData({...formData, familiar: e.target.value})} className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Telefone</label>
                  <input type="text" value={formData.telefone} onChange={(e) => setFormData({...formData, telefone: e.target.value})} placeholder="77900000000" className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">E-mail</label>
                  <input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} placeholder="email@exemplo.com" className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 outline-none" />
                </div>
              </div>
              
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-3 text-slate-600 hover:bg-slate-100 font-semibold rounded-xl transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={isSubmitting} className="bg-sky-600 hover:bg-sky-700 text-white px-6 py-3 rounded-xl font-semibold transition-colors disabled:opacity-50 flex items-center gap-2">
                  {isSubmitting ? 'A Gravar...' : <><span className="material-symbols-outlined text-[20px]">save</span> Gravar Registo</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TOAST FLUTUANTE */}
      {toast.visible && (
        <div className={`fixed bottom-8 right-8 z-50 flex items-center gap-3 px-6 py-4 rounded-2xl text-white shadow-2xl animate-bounce ${toast.type === 'error' ? 'bg-rose-600' : 'bg-slate-800'}`}>
          <span className="material-symbols-outlined text-[24px]">{toast.type === 'error' ? 'error' : 'check_circle'}</span>
          <span className="font-semibold">{toast.message}</span>
        </div>
      )}
    </div>
  );
}

export default App;