const jwt = require('jsonwebtoken');

const verificarToken = (req, res, next) => {
    // Procura o token no cabeçalho da requisição
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Formato: Bearer <token>

    if (!token) {
        return res.status(401).json({ erro: 'Acesso negado. Token não fornecido.' });
    }

    try {
        // A chave secreta que destranca o token (em produção ficaria num ficheiro .env)
        const decodificado = jwt.verify(token, 'senha_super_secreta_cuidar_plus');
        req.usuario = decodificado;
        next(); // Token válido! Deixa passar para o controlador.
    } catch (erro) {
        res.status(403).json({ erro: 'Token inválido ou expirado.' });
    }
};

module.exports = verificarToken;