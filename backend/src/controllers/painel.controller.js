const {
  Prestador,
  Servico,
} = require('../models');

const {
  falhar,
  validarId,
} = require('../utils/validacoes');

exports.listarServicos = async (req, res) => {
  const filtro = {};

  const camposPermitidos = [
    'ativo',
    'prestadorId',
  ];

  const camposInvalidos = Object.keys(req.query).filter(
    (campo) => !camposPermitidos.includes(campo)
  );

  if (camposInvalidos.length > 0) {
    falhar(
      400,
      `Filtros nao permitidos: ${camposInvalidos.join(', ')}.`
    );
  }

  if (req.query.ativo !== undefined) {
    const { ativo } = req.query;

    if (
      typeof ativo !== 'string' ||
      !['true', 'false'].includes(ativo)
    ) {
      falhar(400, 'O filtro ativo deve ser true ou false.');
    }

    filtro.ativo = ativo === 'true';
  }

  if (req.query.prestadorId !== undefined) {
    const { prestadorId } = req.query;

    if (typeof prestadorId !== 'string') {
      falhar(400, 'ID do prestador invalido.');
    }

    validarId(prestadorId);

    const prestadorExiste = await Prestador.exists({
      _id: prestadorId,
    });

    if (!prestadorExiste) {
      falhar(404, 'Prestador nao encontrado.');
    }

    filtro.prestador = prestadorId;
  }

  const servicos = await Servico.find(filtro)
    .populate('prestador', 'nome descricao')
    .sort({ createdAt: -1, _id: -1 })
    .limit(100);

  return res.json(servicos);
};