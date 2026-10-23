const mongoose = require('mongoose');

const { Schema, model } = mongoose;

const prestadorSchema = new Schema(
  {
    nome: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    descricao: {
      type: String,
      default: '',
      maxlength: 500,
    },
  },
  { timestamps: true }
);

const servicoSchema = new Schema(
  {
    prestador: {
      type: Schema.Types.ObjectId,
      ref: 'Prestador',
      required: true,
    },
    titulo: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    descricao: {
      type: String,
      default: '',
      maxlength: 1000,
    },
    categoria: {
      type: String,
      required: true,
      trim: true,
      maxlength: 60,
    },
    preco: {
      type: Number,
      required: true,
      min: 0,
    },
    duracao: {
      type: Number,
      required: true,
      min: 15,
      max: 480,
      validate: Number.isInteger,
    },
    ativo: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

const agendamentoSchema = new Schema(
  {
    servico: {
      type: Schema.Types.ObjectId,
      ref: 'Servico',
      required: true,
    },
    prestador: {
      type: Schema.Types.ObjectId,
      ref: 'Prestador',
      required: true,
    },
    nomeCliente: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    telefoneCliente: {
      type: String,
      required: true,
      trim: true,
      maxlength: 30,
    },
    inicio: {
      type: Date,
      required: true,
    },
    fim: {
      type: Date,
      required: true,
    },
    preco: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ['pendente', 'confirmado', 'concluido', 'cancelado'],
      default: 'pendente',
    },
    observacoes: {
      type: String,
      default: '',
      maxlength: 500,
    },
  },
  { timestamps: true }
);

agendamentoSchema.index({ prestador: 1, inicio: 1, fim: 1 });

module.exports = {
  Prestador: model('Prestador', prestadorSchema),
  Servico: model('Servico', servicoSchema),
  Agendamento: model('Agendamento', agendamentoSchema),
};