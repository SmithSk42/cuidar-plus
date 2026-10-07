const pool = require('../banco/conexao');
const jwt = require('jsonwebtoken');

const login = async (req, res) => {
    const { email } = req.body; 

    try {
        // Verifica se o email existe na sua base de dados real
        const resultado = await pool.query('SELECT * FROM profissionais WHERE email = $1', [email]);

        if (resultado.rows.length === 0) {
            return res.status(404).json({ erro: 'Profissional não encontrado.' });
        }

        const profissional = resultado.rows[0];

        // Gera o Token JWT válido por 2 horas
        const token = jwt.sign(
            { id: profissional.id, nome: profissional.nome },
            'senha_super_secreta_cuidar_plus',
            { expiresIn: '2h' }
        );

        res.status(200).json({
            mensagem: 'Login bem-sucedido!',
            token: token,
            profissional: { nome: profissional.nome, email: profissional.email }
        });
    } catch (erro) {
        console.error(erro);
        res.status(500).json({ erro: 'Erro ao tentar fazer login.' });
    }
};

module.exports = { login };