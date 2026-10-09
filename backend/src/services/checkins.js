const { pool } = require('../db');

// O seu motor para registar check-ins
exports.registrarCheckin = async (pacienteId, dadosCheckin) => {
    const { statusAtividades, nivelDor, observacoes } = dadosCheckin;
    
    const [insertResult] = await pool.execute(
        `INSERT INTO checkins (paciente_id, status_atividades, nivel_dor, observacoes)
         VALUES (?, ?, ?, ?)`,
        [pacienteId, statusAtividades, nivelDor, observacoes]
    );

    const [checkins] = await pool.execute(
        `SELECT id, paciente_id, data_registro, status_atividades, nivel_dor, observacoes
         FROM checkins WHERE id = ?`,
        [insertResult.insertId]
    );

    if (!checkins.length) {
        throw new Error('O check-in foi inserido, mas não foi possível recuperá-lo.');
    }
    
    return checkins[0];
};

// O seu motor para listar check-ins
exports.listarMeusCheckins = async (pacienteId) => {
    const [checkins] = await pool.execute(
        `SELECT id, paciente_id, data_registro, status_atividades, nivel_dor, observacoes
         FROM checkins WHERE paciente_id = ?
         ORDER BY data_registro DESC, id DESC
         LIMIT 30`,
        [pacienteId]
    );
    
    return checkins;
};