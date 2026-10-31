const { Prestador } = require('../models');

const {
  texto,
  textoOpcional,
} = require('../utils/validacoes');

exports.listar = async (req, res) => {
  const prestadores = await Prestador.find()
    .sort({ nome: 1 })
    .limit(100);

  return res.json(prestadores);
};

exports.criar = async (req, res) => {
  const dados = req.body || {};

  const prestador = await Prestador.create({
    nome: texto(dados.nome, 'Nome', 100),
    descricao: textoOpcional(
      dados.descricao,
      'Descricao',
      500
    ),
  });

  return res.status(201).json(prestador);
};