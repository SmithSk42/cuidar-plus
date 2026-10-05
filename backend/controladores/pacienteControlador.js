const banco = require('../banco/conexao');

// 1. Função para cadastrar um novo paciente (Já estava aqui)
const cadastrarPaciente = async (requisicao, resposta) => {
    try {
        const { nome, idade, patologia } = requisicao.body;

        if (!nome) {
            return resposta.status(400).json({ erro: "O nome do paciente é obrigatório." });
        }

        const comandoSql = 'INSERT INTO pacientes (nome, idade, patologia) VALUES ($1, $2, $3) RETURNING *';
        const valores = [nome, idade, patologia];
        
        const resultado = await banco.query(comandoSql, valores);
        
        return resposta.status(201).json(resultado.rows[0]); 
    } catch (erro) {
        console.error('Erro ao cadastrar paciente:', erro);
        return resposta.status(500).json({ erro: "Erro ao cadastrar o paciente." });
    }
};

// 2. NOVA FUNÇÃO: Listar todos os pacientes
const listarPacientes = async (requisicao, resposta) => {
    try {
        // O mesmo comando que você testou no pgAdmin
        const comandoSql = 'SELECT * FROM pacientes'; 
        const resultado = await banco.query(comandoSql);

        // 200 é o código HTTP de sucesso padrão (OK)
        // resultado.rows contém os registros (linhas) que vieram do banco
        return resposta.status(200).json(resultado.rows);
    } catch (erro) {
        console.error('Erro ao listar pacientes:', erro);
        return resposta.status(500).json({ erro: "Erro ao buscar a lista de pacientes." });
    }
};

// Exportando as DUAS funções agora
module.exports = {
    cadastrarPaciente,
    listarPacientes
};