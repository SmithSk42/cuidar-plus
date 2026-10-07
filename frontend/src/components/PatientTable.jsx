export default function PatientTable({ pacientes, onAddTask }) {
  return (
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
                    onClick={() => onAddTask(paciente.id, paciente.nome_paciente)}
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
                  Nenhum paciente cadastrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}