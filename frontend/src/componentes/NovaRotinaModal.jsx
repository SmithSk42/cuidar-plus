import {useCallback, useEffect, useMemo, useState} from 'react';
import {apiRequest} from '../servicos/api.js';
import Modal from './Modal.jsx';

const DIAS=['Seg','Ter','Qua','Qui','Sex','Sab','Dom'];
const classesCampo='mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-100';
const classesLabel='block text-sm font-semibold text-slate-700';
const dataHoje=()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');};
const estadoInicial=()=>({titulo:'',data_inicio:dataHoje(),data_fim:'',itens:[],medicamentos:[]});
const medicamentoInicial=id=>({medicamento_id:id, prescrito_nome:'', prescritor_nome:'', referencia_prescricao:'', dose_informada:'',via_administracao:'',frequencia_texto:'', orientacao_prescrita:'',horarios:['08:00'],dias_semana:[...DIAS]});

function Dias({valor, aoAlterar}) {
  return <fieldset className="mt-2"><legend className="mb-1 text-xs font-semibold text-slate-600">Dias da semana</legend><div className="flex flex-wrap gap-1.5">{DIAS.map(d => <label key={d} className={`cursor-pointer rounded-lg border px-2.5 py-2 text-xs font-semibold ${valor.includes(d)?'border-teal-700 bg-teal-50 text-teal-900':'border-slate-200 text-slate-500'}`}><input className="sr-only" type="checkbox" checked={valor.includes(d)} onChange={()=>{const proximos=valor.includes(d)?valor.filter(x=>x!==d):DIAS.filter(x=>valor.includes(x)||x===d);if(proximos.length)aoAlterar(proximos);}}/>{d}</label>)}</div></fieldset>;
}

/** Usa o mesmo endpoint de prescrição já utilizado pelo painel. */
export default function NovaRotinaModal({aberto, aoFechar, token, pacienteInicial=null, onSalvo}) {
  const [pacientes,setPacientes]=useState([]);
  const [exercicios,setExercicios]=useState([]);
  const [medicamentos,setMedicamentos]=useState([]);
  const [pacienteId,setPacienteId]=useState('');
  const [form,setForm]=useState(estadoInicial);
  const [secao,setSecao]=useState('exercicios');
  const [busca,setBusca]=useState('');
  const [erro,setErro]=useState('');
  const [carregando,setCarregando]=useState(false);
  const [salvando,setSalvando]=useState(false);
  const carregar=useCallback(async()=>{
    const [resPac,resEx,resMed]=await Promise.all([
      apiRequest('/api/pacientes',{token}),apiRequest('/api/rotinas/exercicios',{token}),apiRequest('/api/rotinas/medicamentos',{token})
    ]);
    setPacientes(resPac.pacientes||[]);setExercicios(resEx.exercicios||[]);setMedicamentos(resMed.medicamentos||[]);
    const alvo=Number(pacienteInicial);
    setPacienteId(String((resPac.pacientes||[]).find(p=>Number(p.id)===alvo)?.id||resPac.pacientes?.[0]?.id||''));
  },[token,pacienteInicial]);
  useEffect(()=>{
    if(!aberto)return undefined;
    let ativo=true;
    setForm(estadoInicial());setErro('');setBusca('');setSecao('exercicios');setCarregando(true);
    carregar().catch(e=>{if(ativo)setErro(e.message);}).finally(()=>{if(ativo)setCarregando(false);});
    return()=>{ativo=false;};
  },[aberto,carregar]);
  const filtrados=useMemo(()=> (secao==='exercicios'?exercicios:medicamentos).filter(x=>x.nome.toLocaleLowerCase('pt-BR').includes(busca.toLocaleLowerCase('pt-BR'))),[secao,exercicios,medicamentos,busca]);
  function campo(chave,valor){setForm(p=>({...p,[chave]:valor}));}
  function alternarExercicio(id){setForm(p=>({...p,itens:p.itens.some(i=>i.exercicio_id===id)?p.itens.filter(i=>i.exercicio_id!==id):[...p.itens,{exercicio_id:id,series:1,repeticoes:10,observacoes:'',dias_semana:[...DIAS]}]}));}
  function alternarMedicamento(id){setForm(p=>({...p,medicamentos:p.medicamentos.some(m=>m.medicamento_id===id)?p.medicamentos.filter(m=>m.medicamento_id!==id):[...p.medicamentos,medicamentoInicial(id)]}));}
  function atualizarItem(tipo,id,chave,valor){const campo=tipo==='exercicios'?'itens':'medicamentos',identificador=tipo==='exercicios'?'exercicio_id':'medicamento_id';setForm(p=>({...p,[campo]:p[campo].map(i=>i[identificador]===id?{...i,[chave]:valor}:i)}));}
  async function salvar(evento){
    evento.preventDefault();setErro('');
    if(!pacienteId||(!form.itens.length&&!form.medicamentos.length)){setErro('Selecione um paciente e pelo menos uma atividade.');return;}
    if(form.data_fim&&form.data_fim<form.data_inicio){setErro('A data final deve ser posterior à inicial.');return;}
    setSalvando(true);
    try{
      const resposta=await apiRequest('/api/rotinas',{method:'POST',token,body:{...form,paciente_id:Number(pacienteId),data_fim:form.data_fim||null}});
      onSalvo?.(Number(pacienteId),resposta.id);
      aoFechar();
    }catch(e){setErro(e.message);}finally{setSalvando(false);}
  }
  return <Modal aberto={aberto} aoFechar={aoFechar} bloqueado={salvando} titulo="Nova rotina domiciliar" largura="max-w-4xl">
    <form onSubmit={salvar} className="space-y-5">
      <p className="text-sm text-slate-600">Crie a programação do paciente sem sair da tela atual. Medicamentos devem reproduzir uma prescrição existente.</p>
      {erro&&<p className="rounded-xl bg-red-50 p-3 text-sm text-red-800" role="alert">{erro}</p>}
      {carregando?<p role="status" className="text-sm text-slate-500">Carregando catálogo e pacientes...</p>:<>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className={classesLabel}>Paciente<select className={classesCampo} value={pacienteId} required onChange={e=>setPacienteId(e.target.value)}>{!pacientes.length&&<option value="">Nenhum paciente disponível</option>}{pacientes.map(p=><option key={p.id} value={p.id}>{p.nome}</option>)}</select></label>
          <label className={classesLabel}>Título da rotina<input className={classesCampo} maxLength={100} required value={form.titulo} onChange={e=>campo('titulo',e.target.value)} placeholder="Ex.: Rotina domiciliar semanal"/></label>
          <label className={classesLabel}>Início<input className={classesCampo} type="date" required value={form.data_inicio} onChange={e=>campo('data_inicio',e.target.value)}/></label>
          <label className={classesLabel}>Fim (opcional)<input className={classesCampo} type="date" min={form.data_inicio} value={form.data_fim} onChange={e=>campo('data_fim',e.target.value)}/></label>
        </div>
        <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
          <button type="button" onClick={()=>{setSecao('exercicios');setBusca('');}} className={`rounded-lg px-4 py-2 text-sm font-semibold ${secao==='exercicios'?'bg-teal-800 text-white':'bg-slate-100 text-slate-700'}`}>Exercícios ({form.itens.length})</button>
          <button type="button" onClick={()=>{setSecao('medicamentos');setBusca('');}} className={`rounded-lg px-4 py-2 text-sm font-semibold ${secao==='medicamentos'?'bg-teal-800 text-white':'bg-slate-100 text-slate-700'}`}>Medicamentos ({form.medicamentos.length})</button>
        </div>
        <label className={classesLabel}>Buscar {secao==='exercicios'?'exercício':'medicamento'} existente<input value={busca} className={classesCampo} placeholder="Digite para filtrar o catálogo" onChange={e=>setBusca(e.target.value)}/></label>
        <div className="max-h-80 space-y-3 overflow-auto rounded-xl border border-slate-200 bg-slate-50 p-3">
          {!filtrados.length&&<p className="text-sm text-slate-500">Nenhum item encontrado. Cadastre-o no catálogo antes de prescrever.</p>}
          {filtrados.map(item=>{
            const selecionado=secao==='exercicios'?form.itens.find(i=>i.exercicio_id===item.id):form.medicamentos.find(i=>i.medicamento_id===item.id);
            return <div key={item.id} className="rounded-xl border border-slate-200 bg-white p-3">
              <label className="flex cursor-pointer items-center gap-2 font-semibold text-slate-900"><input type="checkbox" className="size-4 accent-teal-800" checked={Boolean(selecionado)} onChange={()=>secao==='exercicios'?alternarExercicio(item.id):alternarMedicamento(item.id)}/>{item.nome}</label>
              {item.descricao&&<p className="mt-1 text-xs text-slate-500">{item.descricao}</p>}
              {selecionado&&secao==='exercicios'&&<div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
                <div className="grid gap-3 sm:grid-cols-3">
                  <label className={classesLabel}>Séries<input className={classesCampo} type="number" min="1" max="50" required value={selecionado.series} onChange={e=>atualizarItem('exercicios',item.id,'series',Number(e.target.value))}/></label>
                  <label className={classesLabel}>Repetições<input className={classesCampo} type="number" min="1" max="1000" required value={selecionado.repeticoes} onChange={e=>atualizarItem('exercicios',item.id,'repeticoes',Number(e.target.value))}/></label>
                  <label className={classesLabel}>Observações<input className={classesCampo} maxLength={150} value={selecionado.observacoes} onChange={e=>atualizarItem('exercicios',item.id,'observacoes',e.target.value)}/></label>
                </div><Dias valor={selecionado.dias_semana} aoAlterar={d=>atualizarItem('exercicios',item.id,'dias_semana',d)}/>
              </div>}
              {selecionado&&secao==='medicamentos'&&<div className="mt-3 space-y-3 border-t border-slate-100 pt-3">
                <p className="text-xs text-amber-800">Copie somente os dados de uma prescrição válida; o aplicativo não define doses.</p>
                <div className="grid gap-3 sm:grid-cols-2">{[
                  ['prescritor_nome','Nome do prescritor',150],['referencia_prescricao','Referência da prescrição',200],
                  ['dose_informada','Dose informada',100],['via_administracao','Via de administração',80],
                  ['frequencia_texto','Frequência prescrita',120],['orientacao_prescrita','Orientação registrada',500]
                ].map(([campo,rotulo,limite])=><label key={campo} className={classesLabel}>{rotulo}<input className={classesCampo} required maxLength={limite} value={selecionado[campo]} onChange={e=>atualizarItem('medicamentos',item.id,campo,e.target.value)}/></label>)}</div>
                <div><p className="text-sm font-semibold">Horários programados</p><div className="mt-1 flex flex-wrap gap-2">{selecionado.horarios.map((h,i)=><div className="flex items-center gap-1" key={i}><input type="time" className="rounded-lg border border-slate-300 p-2 text-sm" required value={h} onChange={e=>atualizarItem('medicamentos',item.id,'horarios',selecionado.horarios.map((x,k)=>i===k?e.target.value:x))}/><button type="button" className="rounded-lg px-2 py-1 text-sm text-red-700" disabled={selecionado.horarios.length===1} onClick={()=>atualizarItem('medicamentos',item.id,'horarios',selecionado.horarios.filter((_,k)=>k!==i))}>×</button></div>)}</div><button type="button" disabled={selecionado.horarios.length>=12} onClick={()=>atualizarItem('medicamentos',item.id,'horarios',[...selecionado.horarios,'12:00'])} className="mt-2 text-sm font-semibold text-teal-800">+ Adicionar horário</button></div>
                <Dias valor={selecionado.dias_semana} aoAlterar={d=>atualizarItem('medicamentos',item.id,'dias_semana',d)}/>
              </div>}
            </div>;
          })}
        </div>
      </>}
      <footer className="flex flex-wrap justify-end gap-3 border-t border-slate-200 pt-4">
        <button type="button" disabled={salvando} className="rounded-xl border border-slate-300 px-4 py-2.5 font-semibold" onClick={aoFechar}>Cancelar</button>
        <button type="submit" disabled={carregando||salvando||!pacienteId||(!form.itens.length&&!form.medicamentos.length)} className="rounded-xl bg-teal-800 px-5 py-2.5 font-semibold text-white hover:bg-teal-900 disabled:opacity-50">{salvando?'Salvando...':'Salvar rotina completa'}</button>
      </footer>
    </form>
  </Modal>;
}
