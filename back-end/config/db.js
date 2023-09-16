const mysql = require('mysql2');
const { DB_HOST, DB_USER, DB_PASS, DB_NAME, DB_PORT } = require('./env');

const db = mysql.createConnection({
  host: DB_HOST,
  user: DB_USER,
  password: DB_PASS,
  database: DB_NAME,
  port: DB_PORT,
});

db.connect((err) => {
  if (err) {
    console.error('Erro ao conectar ao banco de dados:', err);
    return;
  }
  console.log('Conexão ao banco de dados MySQL estabelecida com sucesso!');
});

module.exports = db;