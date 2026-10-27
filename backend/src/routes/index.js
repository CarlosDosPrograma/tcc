const express = require('express');
const mongoose = require('mongoose');

const {
  Prestador,
  Servico,
  Agendamento,
} = require('../models');

const router = express.Router();

// ======================================================
// FUNÇÕES AUXILIARES
// ======================================================

function falhar(status, mensagem) {
  const erro = new Error(mensagem);
  erro.status = status;
  throw erro;
}

function validarId(id) {
  if (!mongoose.isObjectIdOrHexString(id)) {
    falhar(400, 'ID invalido.');
  }
}

function texto(valor, campo, maximo) {
  if (
    typeof valor !== 'string' ||
    !valor.trim() ||
    valor.trim().length > maximo
  ) {
    falhar(400, `${campo} invalido.`);
  }

  return valor.trim();
}

function textoOpcional(valor, campo, maximo) {
  if (valor === undefined) {
    return '';
  }

  if (
    typeof valor !== 'string' ||
    valor.length > maximo
  ) {
    falhar(400, `${campo} invalido.`);
  }

  return valor.trim();
}

function validarData(data) {
  if (
    typeof data !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(data)
  ) {
    falhar(400, 'Informe a data no formato AAAA-MM-DD.');
  }

  const dataCalendario = new Date(`${data}T00:00:00Z`);

  if (
    Number.isNaN(dataCalendario.getTime()) ||
    dataCalendario.toISOString().slice(0, 10) !== data
  ) {
    falhar(400, 'Data inexistente.');
  }

  return dataCalendario;
}

// Bloqueio local: funciona somente nesta instância do servidor.
const reservasEmProcessamento = new Set();

// ======================================================
// SAÚDE DA API
// ======================================================

// GET /api/health
router.get('/health', (req, res) => {
  const conectado = mongoose.connection.readyState === 1;

  res.status(conectado ? 200 : 503).json({
    status: conectado ? 'ok' : 'sem_banco',
  });
});

// ======================================================
// PRESTADORES
// ======================================================

// POST /api/prestadores
router.post('/prestadores', async (req, res) => {
  const dados = req.body || {};

  const prestador = await Prestador.create({
    nome: texto(dados.nome, 'Nome', 100),
    descricao: textoOpcional(
      dados.descricao,
      'Descricao',
      500
    ),
  });

  res.status(201).json(prestador);
});

// GET /api/prestadores
router.get('/prestadores', async (req, res) => {
  const prestadores = await Prestador.find()
    .sort({ nome: 1 })
    .limit(100);

  res.json(prestadores);
});

// ======================================================
// SERVIÇOS
// ======================================================

// POST /api/servicos
router.post('/servicos', async (req, res) => {
  const {
    prestadorId,
    titulo,
    descricao,
    categoria,
    preco,
    duracao,
  } = req.body || {};

  validarId(prestadorId);

  const prestadorExiste = await Prestador.exists({
    _id: prestadorId,
  });

  if (!prestadorExiste) {
    falhar(404, 'Prestador nao encontrado.');
  }

  if (
    typeof preco !== 'number' ||
    !Number.isFinite(preco) ||
    preco < 0
  ) {
    falhar(400, 'Preco deve ser um numero maior ou igual a zero.');
  }

  if (
    !Number.isInteger(duracao) ||
    duracao < 15 ||
    duracao > 480
  ) {
    falhar(400, 'Duracao deve ser um inteiro de 15 a 480 minutos.');
  }

  const servico = await Servico.create({
    prestador: prestadorId,
    titulo: texto(titulo, 'Titulo', 100),
    descricao: textoOpcional(descricao, 'Descricao', 1000),
    categoria: texto(categoria, 'Categoria', 60),
    preco,
    duracao,
  });

  res.status(201).json(servico);
});

// GET /api/servicos
// Exemplos:
// /api/servicos?categoria=Beleza
// /api/servicos?q=cabelo
router.get('/servicos', async (req, res) => {
  const filtro = { ativo: true };

  if (req.query.categoria !== undefined) {
    filtro.categoria = texto(
      req.query.categoria,
      'Categoria',
      60
    );
  }

  if (req.query.q !== undefined) {
    const termo = texto(req.query.q, 'Busca', 100);

    const escapado = termo.replace(
      /[.*+?^${}()|[\]\\]/g,
      '\\$&'
    );

    filtro.titulo = {
      $regex: escapado,
      $options: 'i',
    };
  }

  const servicos = await Servico.find(filtro)
    .populate('prestador', 'nome descricao')
    .sort({ titulo: 1 })
    .limit(100);

  res.json(servicos);
});

// GET /api/servicos/:id/disponibilidade?data=AAAA-MM-DD
router.get('/servicos/:id/disponibilidade', async (req, res) => {
  validarId(req.params.id);

  const { data } = req.query;
  const dataCalendario = validarData(data);

  const servico = await Servico.findOne({
    _id: req.params.id,
    ativo: true,
  });

  if (!servico) {
    falhar(404, 'Servico nao encontrado.');
  }

  const resposta = {
    servicoId: servico._id,
    data,
    deslocamentoUTC: '-03:00',
    duracao: servico.duracao,
    intervaloSugestoes: 30,
    horarios: [],
  };

  const diaSemana = dataCalendario.getUTCDay();

  if (diaSemana === 0 || diaSemana === 6) {
    return res.json(resposta);
  }

  const inicioExpediente = new Date(`${data}T08:00:00-03:00`);
  const fimExpediente = new Date(`${data}T18:00:00-03:00`);
  const agora = new Date();

  if (fimExpediente <= agora) {
    return res.json(resposta);
  }

  const ocupados = await Agendamento.find({
    prestador: servico.prestador,
    status: {
      $in: ['pendente', 'confirmado'],
    },
    inicio: {
      $lt: fimExpediente,
    },
    fim: {
      $gt: inicioExpediente,
    },
  })
    .select('inicio fim -_id')
    .lean();

  const abertura = 8 * 60;
  const fechamento = 18 * 60;
  const intervalo = 30;

  for (
    let minutos = abertura;
    minutos + servico.duracao <= fechamento;
    minutos += intervalo
  ) {
    const hora = String(
      Math.floor(minutos / 60)
    ).padStart(2, '0');

    const minuto = String(
      minutos % 60
    ).padStart(2, '0');

    const horario = `${hora}:${minuto}`;

    const inicio = new Date(
      `${data}T${horario}:00-03:00`
    );

    const fim = new Date(
      inicio.getTime() + servico.duracao * 60_000
    );

    if (inicio <= agora) {
      continue;
    }

    const possuiConflito = ocupados.some((agendamento) => {
      return (
        inicio < agendamento.fim &&
        fim > agendamento.inicio
      );
    });

    if (!possuiConflito) {
      resposta.horarios.push(horario);
    }
  }

  return res.json(resposta);
});

// GET /api/servicos/:id
router.get('/servicos/:id', async (req, res) => {
  validarId(req.params.id);

  const servico = await Servico.findOne({
    _id: req.params.id,
    ativo: true,
  }).populate('prestador', 'nome descricao');

  if (!servico) {
    falhar(404, 'Servico nao encontrado.');
  }

  res.json(servico);
});

// PATCH /api/servicos/:id
router.patch('/servicos/:id', async (req, res) => {
  validarId(req.params.id);

  const dados = req.body;

  if (
    !dados ||
    typeof dados !== 'object' ||
    Array.isArray(dados)
  ) {
    falhar(400, 'Envie um objeto JSON com os campos para atualizar.');
  }

  const camposPermitidos = [
    'titulo',
    'descricao',
    'categoria',
    'preco',
    'duracao',
    'ativo',
  ];

  const camposRecebidos = Object.keys(dados);

  if (camposRecebidos.length === 0) {
    falhar(400, 'Informe pelo menos um campo para atualizar.');
  }

  const camposInvalidos = camposRecebidos.filter(
    (campo) => !camposPermitidos.includes(campo)
  );

  if (camposInvalidos.length > 0) {
    falhar(
      400,
      `Campos nao permitidos: ${camposInvalidos.join(', ')}.`
    );
  }

  const atualizacoes = {};

  if (Object.hasOwn(dados, 'titulo')) {
    atualizacoes.titulo = texto(
      dados.titulo,
      'Titulo',
      100
    );
  }

  if (Object.hasOwn(dados, 'descricao')) {
    atualizacoes.descricao = textoOpcional(
      dados.descricao,
      'Descricao',
      1000
    );
  }

  if (Object.hasOwn(dados, 'categoria')) {
    atualizacoes.categoria = texto(
      dados.categoria,
      'Categoria',
      60
    );
  }

  if (Object.hasOwn(dados, 'preco')) {
    if (
      typeof dados.preco !== 'number' ||
      !Number.isFinite(dados.preco) ||
      dados.preco < 0
    ) {
      falhar(400, 'Preco deve ser um numero maior ou igual a zero.');
    }

    atualizacoes.preco = dados.preco;
  }

  if (Object.hasOwn(dados, 'duracao')) {
    if (
      !Number.isInteger(dados.duracao) ||
      dados.duracao < 15 ||
      dados.duracao > 480
    ) {
      falhar(
        400,
        'Duracao deve ser um inteiro de 15 a 480 minutos.'
      );
    }

    atualizacoes.duracao = dados.duracao;
  }

  if (Object.hasOwn(dados, 'ativo')) {
    if (typeof dados.ativo !== 'boolean') {
      falhar(400, 'Ativo deve ser true ou false.');
    }

    atualizacoes.ativo = dados.ativo;
  }

  const servico = await Servico.findByIdAndUpdate(
    req.params.id,
    {
      $set: atualizacoes,
    },
    {
      new: true,
      runValidators: true,
    }
  );

  if (!servico) {
    falhar(404, 'Servico nao encontrado.');
  }

  return res.json({
    mensagem: 'Servico atualizado com sucesso.',
    servico,
  });
});

// ======================================================
// AGENDAMENTOS
// ======================================================

// POST /api/agendamentos
router.post('/agendamentos', async (req, res) => {
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

  const dataCalendario = validarData(data);

  if (
    typeof horario !== 'string' ||
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(horario)
  ) {
    falhar(400, 'Informe o horario no formato HH:MM.');
  }

  const inicio = new Date(
    `${data}T${horario}:00-03:00`
  );

  if (
    Number.isNaN(inicio.getTime()) ||
    inicio <= new Date()
  ) {
    falhar(400, 'Escolha uma data e um horario futuros.');
  }

  const servico = await Servico.findOne({
    _id: servicoId,
    ativo: true,
  });

  if (!servico) {
    falhar(404, 'Servico nao encontrado.');
  }

  const diaSemana = dataCalendario.getUTCDay();
  const [hora, minuto] = horario.split(':').map(Number);
  const minutosInicio = hora * 60 + minuto;

  if (
    diaSemana === 0 ||
    diaSemana === 6 ||
    minutosInicio < 8 * 60 ||
    minutosInicio + servico.duracao > 18 * 60
  ) {
    falhar(
      400,
      'Atendimento de segunda a sexta, das 8h as 18h.'
    );
  }

  const chave = String(servico.prestador);

  if (reservasEmProcessamento.has(chave)) {
    falhar(409, 'Agenda em atualizacao. Tente novamente.');
  }

  reservasEmProcessamento.add(chave);

  try {
    const fim = new Date(
      inicio.getTime() + servico.duracao * 60_000
    );

    const conflito = await Agendamento.exists({
      prestador: servico.prestador,
      status: {
        $in: ['pendente', 'confirmado'],
      },
      inicio: {
        $lt: fim,
      },
      fim: {
        $gt: inicio,
      },
    });

    if (conflito) {
      falhar(
        409,
        'O prestador ja possui atendimento nesse horario.'
      );
    }

    const agendamento = await Agendamento.create({
      servico: servico._id,
      prestador: servico.prestador,
      nomeCliente: nome,
      telefoneCliente: telefone,
      inicio,
      fim,
      preco: servico.preco,
      observacoes: observacao,
    });

    return res.status(201).json({
      mensagem: 'Agendamento criado com sucesso.',
      agendamento,
    });
  } finally {
    reservasEmProcessamento.delete(chave);
  }
});

// GET /api/agendamentos
// Filtros opcionais: status, data e prestadorId.
router.get('/agendamentos', async (req, res) => {
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
});

// PATCH /api/agendamentos/:id/status
router.patch('/agendamentos/:id/status', async (req, res) => {
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
});

// ======================================================
// PAINEL DEMONSTRATIVO — SERVIÇOS
// ======================================================

// GET /api/painel/servicos
// Filtros opcionais: ativo e prestadorId.
router.get('/painel/servicos', async (req, res) => {
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
});

module.exports = router;