const express = require('express');
const cors = require('cors');

const routes = require('./routes');
const errorHandler = require('./middlewares/errorHandler');

const app = express();

app.use(
  cors({
    origin:
      process.env.FRONTEND_ORIGIN ||
      'http://127.0.0.1:5500',
  })
);

app.use(express.json({ limit: '20kb' }));

app.use('/api', routes);

app.use((req, res) => {
  res.status(404).json({
    erro: 'Rota não encontrada.',
  });
});

app.use(errorHandler);

module.exports = app;