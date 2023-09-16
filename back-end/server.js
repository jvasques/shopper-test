const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { APP_PORT } = require('./config/env');
const productRoutes = require('./routes/productRoutes');

const app = express();

app.use(cors());
app.use(bodyParser.json());

// Rotas
app.use('/', productRoutes);

app.listen(APP_PORT, () => {
  console.log(`Servidor em execução na porta ${APP_PORT}`);
});