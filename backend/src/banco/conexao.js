const mysql = require('mysql2/promise');
const conexao = mysql.createPool({host:process.env.BANCO_HOST || process.env.DB_HOST || 'localhost',port:Number(process.env.BANCO_PORTA || process.env.DB_PORT || 3306),user:process.env.BANCO_USUARIO || process.env.DB_USER || 'root',password:process.env.BANCO_SENHA ?? process.env.DB_PASSWORD ?? '',database:process.env.BANCO_NOME || process.env.DB_NAME || 'cuidar_plus',waitForConnections:true,connectionLimit:10,decimalNumbers:true});
module.exports = conexao;
