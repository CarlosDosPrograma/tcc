const express = require('express');

const prestadorController = require(
  '../controllers/prestador.controller'
);

const router = express.Router();

// GET /api/prestadores
router.get('/', prestadorController.listar);

// POST /api/prestadores
router.post('/', prestadorController.criar);

module.exports = router;