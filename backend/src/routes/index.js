const express = require('express');
const mongoose = require('mongoose');

const prestadorRoutes = require('./prestador.routes');
const servicoRoutes = require('./servico.routes');
const agendamentoRoutes = require('./agendamento.routes');
const painelRoutes = require('./painel.routes');

const router = express.Router();

// GET /api/health
router.get('/health', (req, res) => {
  const conectado = mongoose.connection.readyState === 1;

  return res.status(conectado ? 200 : 503).json({
    status: conectado ? 'ok' : 'sem_banco',
  });
});

// Módulos da API.
router.use('/prestadores', prestadorRoutes);
router.use('/servicos', servicoRoutes);
router.use('/agendamentos', agendamentoRoutes);
router.use('/painel', painelRoutes);

module.exports = router;