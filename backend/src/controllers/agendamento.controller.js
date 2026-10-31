const {
  Prestador,
  Servico,
  Agendamento,
} = require('../models');

const {
  falhar,
  validarId,
  texto,
  textoOpcional,
  validarData,
} = require('../utils/validacoes');

const agendaService = require('../services/agenda.service');

exports.criar = async (req, res) => {
  const {
    servicoId,
    nomeCliente,
    telefoneCliente,
    data,
    horario,
    observacoes,
  } = req.body || {};

  validarId(servicoId);

  const nome = texto(
    nomeCliente,
    'Nome do cliente',
    100
  );

  const telefone = texto(
    telefoneCliente,
    'Telefone',
    30
  );

  const observacao = textoOpcional(
    observacoes,
    'Observacoes',
    500
  );

  const servico = await Servico.findOne({
    _id: servicoId,
    ativo: true,
  });

  if (!servico) {
    falhar(404, 'Servico nao encontrado.');
  }

  const agendamento = await agendaService.criarReserva({
    servico,
    nomeCliente: nome,
    telefoneCliente: telefone,
    data,
    horario,
    observacoes: observacao,
  });

  return res.status(201).json({
    mensagem: 'Agendamento criado com sucesso.',
    agendamento,
  });
};

exports.listar = async (req, res) => {
  const filtro = {};

  const camposPermitidos = [
    'status',
    'data',
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

  if (req.query.status !== undefined) {
    const statusPermitidos = [
      'pendente',
      'confirmado',
      'concluido',
      'cancelado',
    ];

    if (
      typeof req.query.status !== 'string' ||
      !statusPermitidos.includes(req.query.status)
    ) {
      falhar(400, 'Status de filtro invalido.');
    }

    filtro.status = req.query.status;
  }

  if (req.query.prestadorId !== undefined) {
    const { prestadorId } = req.query;

    if (typeof prestadorId !== 'string') {
      falhar(400, 'ID do prestador invalido.');
    }

    validarId(prestadorId);

    const existe = await Prestador.exists({
      _id: prestadorId,
    });

    if (!existe) {
      falhar(404, 'Prestador nao encontrado.');
    }

    filtro.prestador = prestadorId;
  }

  if (req.query.data !== undefined) {
    const { data } = req.query;

    validarData(data);

    const inicioDia = new Date(
      `${data}T00:00:00-03:00`
    );

    const fimDia = new Date(
      inicioDia.getTime() + 24 * 60 * 60 * 1000
    );

    filtro.inicio = {
      $gte: inicioDia,
      $lt: fimDia,
    };
  }

  const agendamentos = await Agendamento.find(filtro)
    .populate('servico', 'titulo categoria')
    .populate('prestador', 'nome')
    .sort({ inicio: 1, _id: 1 })
    .limit(100);

  return res.json(agendamentos);
};

exports.atualizarStatus = async (req, res) => {
  validarId(req.params.id);

  const transicoes = {
    confirmado: ['pendente'],
    concluido: ['confirmado'],
    cancelado: ['pendente', 'confirmado'],
  };

  const status = req.body?.status;

  if (
    typeof status !== 'string' ||
    !Object.hasOwn(transicoes, status)
  ) {
    falhar(400, 'Status invalido.');
  }

  const atualizado = await Agendamento.findOneAndUpdate(
    {
      _id: req.params.id,
      status: {
        $in: transicoes[status],
      },
    },
    {
      $set: { status },
    },
    {
      new: true,
      runValidators: true,
    }
  );

  if (!atualizado) {
    const existe = await Agendamento.exists({
      _id: req.params.id,
    });

    if (!existe) {
      falhar(404, 'Agendamento nao encontrado.');
    }

    falhar(
      409,
      'Esta alteracao de status nao e permitida.'
    );
  }

  return res.json(atualizado);
};