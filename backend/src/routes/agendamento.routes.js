const express = require('express');

const agendamentoController = require(
  '../controllers/agendamento.controller'
);

const router = express.Router();

// GET /api/agendamentos
// Filtros opcionais: status, data e prestadorId.
router.get('/', agendamentoController.listar);

// POST /api/agendamentos
router.post('/', agendamentoController.criar);

// PATCH /api/agendamentos/:id/status
router.patch(
  '/:id/status',
  agendamentoController.atualizarStatus
);

module.exports = router;