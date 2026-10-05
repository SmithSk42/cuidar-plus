const banco = require('../banco/conexao');

const vincularMedicamento = async (requisicao, resposta) => {
    try {
        const paciente_id = requisicao.params.id;
        const { medicamento_id, horario } = requisicao.body;

        // Validação: Exige que o horário seja enviado
        if (!horario) {
            return resposta.status(400).json({ erro: "O horário é obrigatório." });
        }

        const verificarPaciente = await banco.query('SELECT id FROM pacientes WHERE id = $1', [paciente_id]);
        if (verificarPaciente.rows.length === 0) {
            return resposta.status(404).json({ erro: "Paciente não encontrado." });
        }

        const comandoSql = 'INSERT INTO paciente_medicamentos (paciente_id, medicamento_id, horario) VALUES ($1, $2, $3) RETURNING *';
        const resultado = await banco.query(comandoSql, [paciente_id, medicamento_id, horario]);
        
        return resposta.status(201).json(resultado.rows[0]);
    } catch (erro) {
        console.error('Erro ao vincular medicamento:', erro);
        return resposta.status(500).json({ erro: "Erro ao vincular medicamento." });
    }
};

const listarMedicamentosPaciente = async (requisicao, resposta) => {
    try {
        const paciente_id = requisicao.params.id;
        
        const comandoSql = `
            SELECT pm.id AS id_vinculo, m.nome, m.dosagem, pm.horario
            FROM paciente_medicamentos pm
            JOIN medicamentos m ON pm.medicamento_id = m.id
            WHERE pm.paciente_id = $1
        `;
        const resultado = await banco.query(comandoSql, [paciente_id]);
        
        return resposta.status(200).json(resultado.rows);
    } catch (erro) {
        console.error('Erro ao listar medicamentos:', erro);
        return resposta.status(500).json({ erro: "Erro ao listar medicamentos." });
    }
};

module.exports = { vincularMedicamento, listarMedicamentosPaciente };