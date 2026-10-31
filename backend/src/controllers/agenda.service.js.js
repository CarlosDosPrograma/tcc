const {
  Prestador,
  Servico,
} = require('../models');

const {
  falhar,
  validarId,
  texto,
  textoOpcional,
  validarData,
} = require('../utils/validacoes');

const agendaService = require('../services/agenda.service');

exports.listar = async (req, res) => {
  const filtro = {
    ativo: true,
  };

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

  return res.json(servicos);
};

exports.criar = async (req, res) => {
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
    falhar(
      400,
      'Preco deve ser um numero maior ou igual a zero.'
    );
  }

  if (
    !Number.isInteger(duracao) ||
    duracao < 15 ||
    duracao > 480
  ) {
    falhar(
      400,
      'Duracao deve ser um inteiro de 15 a 480 minutos.'
    );
  }

  const servico = await Servico.create({
    prestador: prestadorId,
    titulo: texto(titulo, 'Titulo', 100),
    descricao: textoOpcional(
      descricao,
      'Descricao',
      1000
    ),
    categoria: texto(categoria, 'Categoria', 60),
    preco,
    duracao,
  });

  return res.status(201).json(servico);
};

exports.buscarPorId = async (req, res) => {
  validarId(req.params.id);

  const servico = await Servico.findOne({
    _id: req.params.id,
    ativo: true,
  }).populate('prestador', 'nome descricao');

  if (!servico) {
    falhar(404, 'Servico nao encontrado.');
  }

  return res.json(servico);
};

exports.atualizar = async (req, res) => {
  validarId(req.params.id);

  const dados = req.body;

  if (
    !dados ||
    typeof dados !== 'object' ||
    Array.isArray(dados)
  ) {
    falhar(
      400,
      'Envie um objeto JSON com os campos para atualizar.'
    );
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
      falhar(
        400,
        'Preco deve ser um numero maior ou igual a zero.'
      );
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
};

exports.disponibilidade = async (req, res) => {
  validarId(req.params.id);

  const { data } = req.query;

  validarData(data);

  const servico = await Servico.findOne({
    _id: req.params.id,
    ativo: true,
  });

  if (!servico) {
    falhar(404, 'Servico nao encontrado.');
  }

  const disponibilidade =
    await agendaService.consultarDisponibilidade(
      servico,
      data
    );

  return res.json(disponibilidade);
};