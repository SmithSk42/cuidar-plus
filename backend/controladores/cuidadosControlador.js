const pool = require('../banco/conexao');

const adicionarTarefaDiario = async (req, res) => {
    const { id } = req.params; // ID do paciente vindo da URL (agora é um UUID)
    const { 
        data_programada, titulo_tarefa, 
        instrucoes_fisioterapeuta, link_video_referencia 
    } = req.body;

    try {
        const query = `
            INSERT INTO diario_de_cuidados (
                paciente_id, data_programada, titulo_tarefa, 
                instrucoes_fisioterapeuta, link_video_referencia
            ) 
            VALUES ($1, $2, $3, $4, $5) 
            RETURNING *;
        `;
        const valores = [
            id, data_programada, titulo_tarefa, 
            instrucoes_fisioterapeuta, link_video_referencia
        ];

        const resultado = await pool.query(query, valores);
        res.status(201).json(resultado.rows[0]);
    } catch (erro) {
        console.error(erro);
        res.status(500).json({ erro: 'Erro ao registrar tarefa no diário de cuidados.' });
    }
};

module.exports = {
    adicionarTarefaDiario
};