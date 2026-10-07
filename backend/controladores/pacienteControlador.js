const pool = require('../banco/conexao');

const listarPacientes = async (req, res) => {
    try {
        const resultado = await pool.query(`
            SELECT p.*, prof.nome AS nome_profissional 
            FROM pacientes p
            LEFT JOIN profissionais prof ON p.profissional_id = prof.id
            ORDER BY p.nome_paciente
        `);
        res.status(200).json(resultado.rows);
    } catch (erro) {
        console.error(erro);
        res.status(500).json({ erro: 'Erro ao buscar pacientes.' });
    }
};

const criarPaciente = async (req, res) => {
    const { 
        profissional_id, nome_paciente, data_nascimento_paciente, 
        diagnostico_condicao, nome_familiar, grau_parentesco, 
        telefone_familiar, email_familiar 
    } = req.body;

    try {
        const query = `
            INSERT INTO pacientes (
                profissional_id, nome_paciente, data_nascimento_paciente, 
                diagnostico_condicao, nome_familiar, grau_parentesco, 
                telefone_familiar, email_familiar
            ) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
            RETURNING *;
        `;
        const valores = [
            profissional_id, nome_paciente, data_nascimento_paciente, 
            diagnostico_condicao, nome_familiar, grau_parentesco, 
            telefone_familiar, email_familiar
        ];
        
        const resultado = await pool.query(query, valores);
        res.status(201).json(resultado.rows[0]);
    } catch (erro) {
        console.error(erro);
        res.status(500).json({ erro: 'Erro ao cadastrar paciente.' });
    }
};

module.exports = {
    listarPacientes,
    criarPaciente
};