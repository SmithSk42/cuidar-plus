export default function PatientModal({ isOpen, onClose, onSubmit, formData, setFormData, isSubmitting }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-sky-600 text-white rounded-xl flex items-center justify-center">
              <span className="material-symbols-outlined">person_add</span>
            </div>
            <h3 className="font-bold text-xl text-slate-800">Novo Paciente</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-rose-500 transition-colors">
            <span className="material-symbols-outlined text-[24px]">close</span>
          </button>
        </div>
        
        <form onSubmit={onSubmit} className="p-8 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Nome do Paciente *</label>
              <input required type="text" value={formData.nome} onChange={(e) => setFormData({...formData, nome: e.target.value})} className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Data Nasc. *</label>
              <input required type="date" value={formData.dataNascimento} onChange={(e) => setFormData({...formData, dataNascimento: e.target.value})} className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 outline-none" />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Diagnóstico Clínico *</label>
            <input required type="text" value={formData.diagnostico} onChange={(e) => setFormData({...formData, diagnostico: e.target.value})} className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 outline-none" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Familiar *</label>
              <input required type="text" value={formData.familiar} onChange={(e) => setFormData({...formData, familiar: e.target.value})} className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Parentesco</label>
              <select value={formData.parentesco} onChange={(e) => setFormData({...formData, parentesco: e.target.value})} className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 outline-none bg-white">
                <option value="">Selecione...</option>
                <option value="Filho(a)">Filho(a)</option>
                <option value="Cônjuge">Cônjuge</option>
                <option value="Outro">Outro</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Telefone *</label>
              <input required type="text" value={formData.telefone} onChange={(e) => setFormData({...formData, telefone: e.target.value})} placeholder="77900000000" className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">E-mail</label>
              <input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 outline-none" />
            </div>
          </div>
          
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button type="button" onClick={onClose} className="px-6 py-3 text-slate-600 hover:bg-slate-100 font-semibold rounded-xl transition-colors">Cancelar</button>
            <button type="submit" disabled={isSubmitting} className="bg-sky-600 hover:bg-sky-700 text-white px-6 py-3 rounded-xl font-semibold transition-colors disabled:opacity-50 flex items-center gap-2">
              {isSubmitting ? 'A Gravar...' : 'Gravar Registo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}