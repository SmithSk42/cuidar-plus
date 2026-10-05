import { useState, useMemo, useEffect, useRef } from "react";

/* =========================================================
 * PAINEL DA FISIO — React (front) / Node (back)
 * Telas: Dashboard, Novo Paciente, Modal de Atribuição de Tarefas
 *
 * Os dados são MOCKS. Toda a comunicação está isolada em `api`:
 * quando o back em Node estiver pronto, troque cada função
 * por um fetch (os endpoints sugeridos estão nos comentários).
 * ========================================================= */

// ---------- MOCKS ----------
const MOCK_PACIENTES = [
  { id: 1, nome: "Marina Albuquerque", idade: 34, diagnostico: "Lombalgia crônica", ultimoAcesso: "Hoje", adesao: 82, tarefas: 3 },
  { id: 2, nome: "Carlos Eduardo Reis", idade: 58, diagnostico: "Pós-op. de joelho (LCA)", ultimoAcesso: "Ontem", adesao: 64, tarefas: 5 },
  { id: 3, nome: "Joana Prado", idade: 27, diagnostico: "Tendinite no ombro", ultimoAcesso: "Há 4 dias", adesao: 31, tarefas: 2 },
  { id: 4, nome: "Roberto Matos", idade: 71, diagnostico: "Reabilitação de AVC", ultimoAcesso: "Hoje", adesao: 90, tarefas: 4 },
];

const MOCK_EXERCICIOS = [
  { id: "e1", nome: "Ponte glútea", area: "Lombar", duracao: "5 min" },
  { id: "e2", nome: "Gato-camelo", area: "Lombar", duracao: "3 min" },
  { id: "e3", nome: "Elevação de perna reta", area: "Joelho", duracao: "6 min" },
  { id: "e4", nome: "Agachamento na parede", area: "Joelho", duracao: "4 min" },
  { id: "e5", nome: "Rotação externa com faixa", area: "Ombro", duracao: "5 min" },
  { id: "e6", nome: "Pêndulo de Codman", area: "Ombro", duracao: "3 min" },
  { id: "e7", nome: "Transferência de peso em pé", area: "Neuro", duracao: "8 min" },
  { id: "e8", nome: "Alongamento de isquiotibiais", area: "Geral", duracao: "4 min" },
];

const FREQUENCIAS = ["Diária", "3x por semana", "2x por semana", "Semanal"];

// ---------- CAMADA DE API (troque por fetch ao Node) ----------
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const api = {
  // GET /api/pacientes
  async listarPacientes() { await wait(300); return structuredClone(MOCK_PACIENTES); },
  // POST /api/pacientes
  async criarPaciente(dados) {
    await wait(600);
    return { id: Date.now(), ultimoAcesso: "Nunca", adesao: 0, tarefas: 0, diagnostico: dados.diagnostico || "Em avaliação", idade: calcIdade(dados.nascimento), ...dados };
  },
  // GET /api/exercicios
  async listarExercicios() { await wait(200); return structuredClone(MOCK_EXERCICIOS); },
  // POST /api/pacientes/:id/tarefas
  async atribuirTarefas(pacienteId, payload) { await wait(600); return { ok: true, pacienteId, ...payload }; },
};

// ---------- UTILITÁRIOS ----------
const soDigitos = (v) => v.replace(/\D/g, "");
const maskCPF = (v) =>
  soDigitos(v).slice(0, 11).replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2");
const maskTel = (v) =>
  soDigitos(v).slice(0, 11).replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d{1,4})$/, "$1-$2");
const emailOk = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
function calcIdade(iso) {
  if (!iso) return null;
  const n = new Date(iso), h = new Date();
  let i = h.getFullYear() - n.getFullYear();
  if (h < new Date(h.getFullYear(), n.getMonth(), n.getDate())) i--;
  return i;
}
function cpfValido(cpf) {
  const d = soDigitos(cpf);
  if (d.length !== 11 || /^(\d)\1+$/.test(d)) return false;
  const dv = (len) => {
    let s = 0;
    for (let i = 0; i < len; i++) s += +d[i] * (len + 1 - i);
    const r = (s * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return dv(9) === +d[9] && dv(10) === +d[10];
}

// ---------- ESTILOS ----------
const css = `
:root{
  --bg:#f2f6f6; --surface:#ffffff; --ink:#15303a; --muted:#5f7680; --line:#d7e2e4;
  --brand:#0d6c70; --brand-ink:#ffffff; --brand-soft:#dcefef;
  --warn:#b9770e; --warn-soft:#fbefd9; --bad:#b4412f; --bad-soft:#f9e1dc; --ok:#2b7a4b; --ok-soft:#dff1e6;
}
.pf *{box-sizing:border-box}
.pf{font-family:"Figtree","Segoe UI",system-ui,sans-serif;background:var(--bg);color:var(--ink);min-height:100vh;display:flex;line-height:1.45}
.pf button,.pf input,.pf select,.pf textarea{font:inherit;color:inherit}
.pf :focus-visible{outline:3px solid #6bb7ba;outline-offset:2px}
.pf-side{width:220px;background:var(--ink);color:#dbe8ea;padding:24px 16px;display:flex;flex-direction:column;gap:6px;flex-shrink:0}
.pf-brand{font-size:20px;font-weight:700;color:#fff;margin:0 8px 20px}
.pf-nav{background:none;border:0;text-align:left;padding:10px 12px;border-radius:8px;color:inherit;cursor:pointer}
.pf-nav:hover{background:rgba(255,255,255,.08)}
.pf-nav[aria-current=page]{background:var(--brand);color:#fff}
.pf-main{flex:1;padding:32px;max-width:1100px;min-width:0}
.pf h1{font-size:28px;margin:0 0 4px;letter-spacing:-.01em}
.pf-sub{color:var(--muted);margin:0 0 24px}
.pf-head{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;flex-wrap:wrap}
.btn{border:1px solid var(--line);background:var(--surface);padding:9px 16px;border-radius:8px;cursor:pointer;font-weight:600}
.btn:hover{border-color:var(--brand)}
.btn.primary{background:var(--brand);border-color:var(--brand);color:var(--brand-ink)}
.btn.primary:hover{filter:brightness(1.1)}
.btn:disabled{opacity:.55;cursor:not-allowed}
.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px;margin-bottom:24px}
.stat{background:var(--surface);border:1px solid var(--line);border-radius:10px;padding:14px 16px}
.stat b{display:block;font-size:26px}
.stat span{color:var(--muted);font-size:14px}
.panel{background:var(--surface);border:1px solid var(--line);border-radius:12px;overflow:hidden}
.tbl-wrap{overflow-x:auto}
table{width:100%;border-collapse:collapse;min-width:640px}
th{text-align:left;font-size:13px;color:var(--muted);font-weight:600;padding:12px 16px;border-bottom:1px solid var(--line)}
td{padding:14px 16px;border-bottom:1px solid var(--line);vertical-align:middle}
tr:last-child td{border-bottom:0}
.pname{font-weight:600}.pdx{color:var(--muted);font-size:14px}
.bar{height:8px;border-radius:99px;background:var(--line);width:110px;overflow:hidden}
.bar i{display:block;height:100%;border-radius:99px}
.chip{display:inline-block;padding:2px 10px;border-radius:99px;font-size:13px;font-weight:600}
.empty{padding:40px;text-align:center;color:var(--muted)}
/* formulário */
.form{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px 20px;padding:24px}
.full{grid-column:1/-1}
.field label{display:block;font-weight:600;margin-bottom:6px;font-size:14px}
.field input,.field select,.field textarea{width:100%;padding:10px 12px;border:1px solid var(--line);border-radius:8px;background:#fff}
.field textarea{min-height:84px;resize:vertical}
.field.err input,.field.err select{border-color:var(--bad)}
.msg-err{color:var(--bad);font-size:13px;margin-top:4px}
.hint{color:var(--muted);font-size:13px;margin-top:4px}
.fieldset-t{font-weight:700;font-size:16px;margin:4px 0 -6px}
.actions{display:flex;gap:10px;justify-content:flex-end;padding:16px 24px;border-top:1px solid var(--line);background:#fafcfc}
/* modal */
.overlay{position:fixed;inset:0;background:rgba(15,35,42,.55);display:flex;align-items:center;justify-content:center;padding:16px;z-index:50}
.modal{background:var(--surface);border-radius:14px;width:min(720px,100%);max-height:92vh;display:flex;flex-direction:column;box-shadow:0 24px 60px rgba(0,0,0,.3);animation:pop .16s ease-out}
@keyframes pop{from{transform:scale(.97);opacity:0}to{transform:none;opacity:1}}
@media (prefers-reduced-motion:reduce){.modal{animation:none}}
.m-head{padding:20px 24px 12px;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;gap:12px}
.m-head h2{margin:0;font-size:20px}
.m-body{padding:18px 24px;overflow-y:auto;display:grid;gap:16px}
.x{border:0;background:none;font-size:24px;line-height:1;cursor:pointer;color:var(--muted);padding:4px 8px;border-radius:6px}
.filters{display:flex;gap:8px;flex-wrap:wrap}
.pill{border:1px solid var(--line);background:#fff;border-radius:99px;padding:5px 12px;cursor:pointer;font-size:14px}
.pill[aria-pressed=true]{background:var(--brand);border-color:var(--brand);color:#fff}
.exlist{display:grid;gap:8px;max-height:230px;overflow-y:auto}
.ex{display:flex;align-items:center;gap:12px;border:1px solid var(--line);border-radius:10px;padding:10px 12px;cursor:pointer}
.ex:hover{border-color:var(--brand)}
.ex.on{background:var(--brand-soft);border-color:var(--brand)}
.ex input{width:18px;height:18px;accent-color:var(--brand)}
.ex small{color:var(--muted);margin-left:auto}
.row2{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.toast{position:fixed;bottom:24px;right:24px;background:var(--ink);color:#fff;padding:12px 18px;border-radius:10px;z-index:60;box-shadow:0 10px 30px rgba(0,0,0,.3)}
@media (max-width:760px){
  .pf{flex-direction:column}.pf-side{width:100%;flex-direction:row;overflow-x:auto;padding:12px}
  .pf-brand{margin:0 12px 0 4px;align-self:center}.pf-main{padding:20px 16px}
  .form,.row2{grid-template-columns:1fr}
}
`;

// ---------- COMPONENTES ----------
function Campo({ id, label, erro, dica, children, className = "" }) {
  return (
    <div className={`field ${erro ? "err" : ""} ${className}`}>
      <label htmlFor={id}>{label}</label>
      {children}
      {erro ? <div className="msg-err" role="alert">{erro}</div> : dica ? <div className="hint">{dica}</div> : null}
    </div>
  );
}

function corAdesao(v) {
  if (v >= 70) return { bar: "var(--ok)", bg: "var(--ok-soft)", fg: "var(--ok)" };
  if (v >= 45) return { bar: "var(--warn)", bg: "var(--warn-soft)", fg: "var(--warn)" };
  return { bar: "var(--bad)", bg: "var(--bad-soft)", fg: "var(--bad)" };
}

/* ---------- DASHBOARD ---------- */
function Dashboard({ pacientes, carregando, onNovo, onAtribuir }) {
  const media = pacientes.length ? Math.round(pacientes.reduce((s, p) => s + p.adesao, 0) / pacientes.length) : 0;
  const emRisco = pacientes.filter((p) => p.adesao < 45).length;

  return (
    <>
      <div className="pf-head">
        <div>
          <h1>Meus pacientes</h1>
          <p className="pf-sub">Acompanhe a adesão e atribua novas tarefas de reabilitação.</p>
        </div>
        <button className="btn primary" onClick={onNovo}>Novo paciente</button>
      </div>

      <div className="stats">
        <div className="stat"><b>{pacientes.length}</b><span>Pacientes ativos</span></div>
        <div className="stat"><b>{media}%</b><span>Adesão média</span></div>
        <div className="stat"><b>{emRisco}</b><span>Com adesão baixa</span></div>
      </div>

      <div className="panel">
        <div className="tbl-wrap">
          <table>
            <thead>
              <tr><th>Paciente</th><th>Adesão</th><th>Tarefas ativas</th><th>Último acesso</th><th /></tr>
            </thead>
            <tbody>
              {carregando && <tr><td colSpan={5} className="empty">Carregando pacientes…</td></tr>}
              {!carregando && pacientes.length === 0 && (
                <tr><td colSpan={5} className="empty">Nenhum paciente ainda. Cadastre o primeiro em “Novo paciente”.</td></tr>
              )}
              {pacientes.map((p) => {
                const c = corAdesao(p.adesao);
                return (
                  <tr key={p.id}>
                    <td>
                      <div className="pname">{p.nome}</div>
                      <div className="pdx">{p.idade ? `${p.idade} anos · ` : ""}{p.diagnostico}</div>
                    </td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div className="bar" aria-hidden="true"><i style={{ width: `${p.adesao}%`, background: c.bar }} /></div>
                        <span className="chip" style={{ background: c.bg, color: c.fg }}>{p.adesao}%</span>
                      </div>
                    </td>
                    <td>{p.tarefas}</td>
                    <td>{p.ultimoAcesso}</td>
                    <td style={{ textAlign: "right" }}>
                      <button className="btn" onClick={() => onAtribuir(p)}>Atribuir tarefas</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

/* ---------- TELA: NOVO PACIENTE ---------- */
const FORM_VAZIO = { nome: "", nascimento: "", cpf: "", telefone: "", email: "", sexo: "", diagnostico: "", observacoes: "" };

function NovoPaciente({ onSalvo, onCancelar }) {
  const [f, setF] = useState(FORM_VAZIO);
  const [erros, setErros] = useState({});
  const [enviando, setEnviando] = useState(false);
  const [erroGeral, setErroGeral] = useState("");

  const set = (k, mask) => (e) => setF((s) => ({ ...s, [k]: mask ? mask(e.target.value) : e.target.value }));

  function validar() {
    const e = {};
    if (f.nome.trim().split(/\s+/).length < 2) e.nome = "Informe nome e sobrenome.";
    if (!f.nascimento) e.nascimento = "Informe a data de nascimento.";
    else if (new Date(f.nascimento) > new Date()) e.nascimento = "A data não pode estar no futuro.";
    if (!cpfValido(f.cpf)) e.cpf = "CPF inválido. Confira os 11 dígitos.";
    if (soDigitos(f.telefone).length < 10) e.telefone = "Informe DDD e número.";
    if (!emailOk(f.email)) e.email = "Informe um e-mail válido, ex.: nome@email.com.";
    if (!f.sexo) e.sexo = "Selecione uma opção.";
    return e;
  }

  async function salvar(ev) {
    ev.preventDefault();
    const e = validar();
    setErros(e);
    if (Object.keys(e).length) return;
    setEnviando(true);
    setErroGeral("");
    try {
      const novo = await api.criarPaciente({ ...f, nome: f.nome.trim() });
      onSalvo(novo);
    } catch {
      setErroGeral("Não foi possível salvar o paciente. Verifique a conexão e tente de novo.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <>
      <h1>Novo paciente</h1>
      <p className="pf-sub">Preencha os dados abaixo. O paciente receberá o acesso ao app por e-mail.</p>
      <form className="panel" onSubmit={salvar} noValidate>
        <div className="form">
          <div className="fieldset-t full">Dados pessoais</div>
          <Campo id="nome" label="Nome completo" erro={erros.nome} className="full">
            <input id="nome" value={f.nome} onChange={set("nome")} autoComplete="off" />
          </Campo>
          <Campo id="nasc" label="Data de nascimento" erro={erros.nascimento}>
            <input id="nasc" type="date" value={f.nascimento} onChange={set("nascimento")} />
          </Campo>
          <Campo id="sexo" label="Sexo" erro={erros.sexo}>
            <select id="sexo" value={f.sexo} onChange={set("sexo")}>
              <option value="">Selecione</option>
              <option>Feminino</option><option>Masculino</option><option>Outro</option>
            </select>
          </Campo>
          <Campo id="cpf" label="CPF" erro={erros.cpf}>
            <input id="cpf" inputMode="numeric" placeholder="000.000.000-00" value={f.cpf} onChange={set("cpf", maskCPF)} />
          </Campo>
          <Campo id="tel" label="Telefone" erro={erros.telefone}>
            <input id="tel" inputMode="tel" placeholder="(77) 90000-0000" value={f.telefone} onChange={set("telefone", maskTel)} />
          </Campo>
          <Campo id="email" label="E-mail" erro={erros.email} dica="Usado para enviar o convite de acesso." className="full">
            <input id="email" type="email" value={f.email} onChange={set("email")} />
          </Campo>

          <div className="fieldset-t full">Informações clínicas</div>
          <Campo id="dx" label="Diagnóstico (opcional)" className="full">
            <input id="dx" placeholder="Ex.: Lombalgia crônica" value={f.diagnostico} onChange={set("diagnostico")} />
          </Campo>
          <Campo id="obs" label="Observações (opcional)" className="full">
            <textarea id="obs" value={f.observacoes} onChange={set("observacoes")} />
          </Campo>
          {erroGeral && <div className="msg-err full" role="alert">{erroGeral}</div>}
        </div>
        <div className="actions">
          <button type="button" className="btn" onClick={onCancelar}>Cancelar</button>
          <button type="submit" className="btn primary" disabled={enviando}>{enviando ? "Salvando…" : "Salvar paciente"}</button>
        </div>
      </form>
    </>
  );
}

/* ---------- MODAL: ATRIBUIÇÃO DE TAREFAS ---------- */
function ModalAtribuicao({ paciente, onFechar, onAtribuido }) {
  const [exercicios, setExercicios] = useState([]);
  const [area, setArea] = useState("Todas");
  const [sel, setSel] = useState([]);
  const [freq, setFreq] = useState(FREQUENCIAS[0]);
  const [inicio, setInicio] = useState(new Date().toISOString().slice(0, 10));
  const [fim, setFim] = useState("");
  const [obs, setObs] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);
  const caixa = useRef(null);

  useEffect(() => { api.listarExercicios().then(setExercicios); }, []);
  useEffect(() => {
    caixa.current?.focus();
    const esc = (e) => e.key === "Escape" && onFechar();
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [onFechar]);

  const areas = useMemo(() => ["Todas", ...new Set(exercicios.map((e) => e.area))], [exercicios]);
  const visiveis = exercicios.filter((e) => area === "Todas" || e.area === area);
  const toggle = (id) => setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  async function enviar() {
    if (!sel.length) return setErro("Selecione ao menos um exercício.");
    if (fim && fim < inicio) return setErro("A data final deve ser depois da data de início.");
    setErro("");
    setEnviando(true);
    try {
      await api.atribuirTarefas(paciente.id, { exercicios: sel, frequencia: freq, inicio, fim: fim || null, observacoes: obs });
      onAtribuido(paciente, sel.length);
    } catch {
      setErro("Não foi possível atribuir as tarefas. Tente novamente.");
      setEnviando(false);
    }
  }

  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onFechar()}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="mt" tabIndex={-1} ref={caixa}>
        <div className="m-head">
          <div>
            <h2 id="mt">Atribuir tarefas</h2>
            <div className="pdx">{paciente.nome} · {paciente.diagnostico}</div>
          </div>
          <button className="x" onClick={onFechar} aria-label="Fechar">×</button>
        </div>

        <div className="m-body">
          <div>
            <div className="fieldset-t" style={{ marginBottom: 8 }}>Exercícios</div>
            <div className="filters" role="group" aria-label="Filtrar por área">
              {areas.map((a) => (
                <button key={a} className="pill" aria-pressed={area === a} onClick={() => setArea(a)}>{a}</button>
              ))}
            </div>
          </div>

          <div className="exlist">
            {!exercicios.length && <div className="empty">Carregando exercícios…</div>}
            {visiveis.map((e) => (
              <label key={e.id} className={`ex ${sel.includes(e.id) ? "on" : ""}`}>
                <input type="checkbox" checked={sel.includes(e.id)} onChange={() => toggle(e.id)} />
                <span>{e.nome}</span>
                <small>{e.area} · {e.duracao}</small>
              </label>
            ))}
          </div>

          <div className="row2">
            <Campo id="freq" label="Frequência">
              <select id="freq" value={freq} onChange={(e) => setFreq(e.target.value)}>
                {FREQUENCIAS.map((x) => <option key={x}>{x}</option>)}
              </select>
            </Campo>
            <div />
            <Campo id="ini" label="Início">
              <input id="ini" type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} />
            </Campo>
            <Campo id="fim" label="Término (opcional)">
              <input id="fim" type="date" min={inicio} value={fim} onChange={(e) => setFim(e.target.value)} />
            </Campo>
          </div>

          <Campo id="mobs" label="Orientações ao paciente (opcional)">
            <textarea id="mobs" value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Ex.: pare se sentir dor aguda." />
          </Campo>
          {erro && <div className="msg-err" role="alert">{erro}</div>}
        </div>

        <div className="actions">
          <span className="hint" style={{ marginRight: "auto", alignSelf: "center" }}>
            {sel.length} {sel.length === 1 ? "exercício selecionado" : "exercícios selecionados"}
          </span>
          <button className="btn" onClick={onFechar}>Cancelar</button>
          <button className="btn primary" onClick={enviar} disabled={enviando}>{enviando ? "Atribuindo…" : "Atribuir tarefas"}</button>
        </div>
      </div>
    </div>
  );
}

/* ---------- APP ---------- */
export default function PainelFisio() {
  const [tela, setTela] = useState("dashboard"); // "dashboard" | "novo"
  const [pacientes, setPacientes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [alvo, setAlvo] = useState(null); // paciente do modal
  const [toast, setToast] = useState("");

  useEffect(() => {
    api.listarPacientes().then((l) => { setPacientes(l); setCarregando(false); });
  }, []);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  return (
    <div className="pf">
      <style>{css}</style>
      <aside className="pf-side">
        <p className="pf-brand">Painel da Fisio</p>
        <button className="pf-nav" aria-current={tela === "dashboard" ? "page" : undefined} onClick={() => setTela("dashboard")}>Pacientes</button>
        <button className="pf-nav" aria-current={tela === "novo" ? "page" : undefined} onClick={() => setTela("novo")}>Novo paciente</button>
      </aside>

      <main className="pf-main">
        {tela === "dashboard" ? (
          <Dashboard pacientes={pacientes} carregando={carregando} onNovo={() => setTela("novo")} onAtribuir={setAlvo} />
        ) : (
          <NovoPaciente
            onCancelar={() => setTela("dashboard")}
            onSalvo={(p) => {
              setPacientes((l) => [p, ...l]);
              setTela("dashboard");
              setToast(`${p.nome} foi cadastrado(a).`);
              setAlvo(p); // já abre a atribuição de tarefas
            }}
          />
        )}
      </main>

      {alvo && (
        <ModalAtribuicao
          paciente={alvo}
          onFechar={() => setAlvo(null)}
          onAtribuido={(p, n) => {
            setPacientes((l) => l.map((x) => (x.id === p.id ? { ...x, tarefas: x.tarefas + n } : x)));
            setAlvo(null);
            setToast(`${n} ${n === 1 ? "tarefa atribuída" : "tarefas atribuídas"} a ${p.nome}.`);
          }}
        />
      )}
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}
