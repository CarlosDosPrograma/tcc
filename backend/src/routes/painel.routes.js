const express = require('express');

const painelController = require(
  '../controllers/painel.controller'
);

const router = express.Router();

// GET /api/painel/servicos
// Filtros opcionais: ativo e prestadorId.
// Área demonstrativa local, sem autenticação.
router.get('/servicos', painelController.listarServicos);

module.exports = router;