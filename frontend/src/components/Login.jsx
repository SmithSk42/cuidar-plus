export default function Login({ onLogin }) {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 border border-slate-100">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-sky-50 rounded-2xl flex items-center justify-center mb-4 text-sky-600">
            <span className="material-symbols-outlined text-[32px]">local_hospital</span>
          </div>
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Cuidar<span className="text-sky-500">+</span></h1>
          <p className="text-slate-500 mt-2 text-center text-sm">Acesso restrito a profissionais de saúde.</p>
        </div>
        <form onSubmit={onLogin} className="space-y-5">
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