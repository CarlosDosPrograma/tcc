const express = require('express');

const servicoController = require(
  '../controllers/agenda.service.js'
);

const router = express.Router();

// GET /api/servicos
router.get('/', servicoController.listar);

// POST /api/servicos
router.post('/', servicoController.criar);

// GET /api/servicos/:id/disponibilidade?data=AAAA-MM-DD
router.get(
  '/:id/disponibilidade',
  servicoController.disponibilidade
);

// GET /api/servicos/:id
router.get('/:id', servicoController.buscarPorId);

// PATCH /api/servicos/:id
router.patch('/:id', servicoController.atualizar);

module.exports = router;