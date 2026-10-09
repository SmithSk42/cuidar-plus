const { pool } = require('../db');

// O seu motor que fala com o MySQL
exports.criarPaciente = async (dadosPaciente) => {
    const { fisioterapeuta_id, nome, data_nascimento, telefone, email, senha_hash } = dadosPaciente;
    
    const sql = `
        INSERT INTO pacientes (
            fisioterapeuta_id, nome, data_nascimento, telefone, email, senha_hash
        ) VALUES (?, ?, ?, ?, ?, ?)
    `;

    const valores = [
        fisioterapeuta_id || null, 
        nome, 
        data_nascimento || null, 
        telefone || null, 
        email || null, 
        senha_hash || null
    ];

    const [resultado] = await pool.execute(sql, valores);
    return resultado.insertId; // Devolve o ID do paciente que acabou de nascer no banco
};

exports.listarPacientes = async () => {
    const [linhas] = await pool.execute('SELECT id, nome, telefone, email FROM pacientes');
    return linhas;
};