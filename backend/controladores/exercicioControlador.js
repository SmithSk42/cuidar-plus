const banco = require('../banco/conexao');

// 1. Função para vincular exercício (Já estava a funcionar)
const vincularExercicio = async (requisicao, resposta) => {
    try {
        const paciente_id = requisicao.params.id; 
        const { exercicio_id } = requisicao.body;

        const verificarPaciente = await banco.query('SELECT id FROM pacientes WHERE id = $1', [paciente_id]);
        
        if (verificarPaciente.rows.length === 0) {
            return resposta.status(404).json({ erro: "Paciente não encontrado no sistema." });
        }

        const comandoSql = 'INSERT INTO paciente_exercicios (paciente_id, exercicio_id) VALUES ($1, $2) RETURNING *';
        const valores = [paciente_id, exercicio_id];
        
        const resultado = await banco.query(comandoSql, valores);
        
        return resposta.status(201).json(resultado.rows[0]);
    } catch (erro) {
        console.error('Erro ao vincular exercício:', erro);
        return resposta.status(500).json({ erro: "Erro ao associar o exercício ao paciente." });
    }
};

// 2. NOVA FUNÇÃO: Listar exercícios de um paciente
const listarExerciciosPaciente = async (requisicao, resposta) => {
    try {
        const paciente_id = requisicao.params.id;
        
        // Usamos o JOIN para cruzar a tabela intermediária com o catálogo de exercícios.
        // Assim, o Front-end recebe o nome e a descrição da atividade, e não apenas números.
        const comandoSql = `
            SELECT pe.id AS id_vinculo, e.nome, e.descricao, pe.data_atribuicao
            FROM paciente_exercicios pe
            JOIN exercicios e ON pe.exercicio_id = e.id
            WHERE pe.paciente_id = $1
        `;
        const resultado = await banco.query(comandoSql, [paciente_id]);
        
        // 200 OK
        return resposta.status(200).json(resultado.rows);
    } catch (erro) {
        console.error('Erro ao listar exercícios:', erro);
        return resposta.status(500).json({ erro: "Erro ao buscar a lista de exercícios." });
    }
};

// Exportando as DUAS funções
module.exports = {
    vincularExercicio,
    listarExerciciosPaciente
};