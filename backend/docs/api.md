# ServiçoJá — Documentação da API

## 1. Sobre esta API

A API do ServiçoJá pertence a um protótipo acadêmico para
divulgação e agendamento de serviços locais.

Ela permite:

- Cadastrar e consultar prestadores.
- Cadastrar, consultar e editar serviços.
- Desativar e reativar serviços.
- Consultar horários disponíveis.
- Criar e consultar agendamentos.
- Alterar o status dos agendamentos.
- Consultar serviços ativos e inativos no painel demonstrativo.

Esta versão não possui autenticação ou autorização.

Os termos “público” e “painel” representam a finalidade das
telas, não uma proteção de acesso implementada.

Utilize somente localmente e com dados fictícios.

## 2. Endereço base

```text
http://127.0.0.1:3001/api
```

Todos os caminhos deste documento são relativos ao endereço base.

Exemplo:

```text
GET /servicos
```

Corresponde a:

```text
GET http://127.0.0.1:3001/api/servicos
```

## 3. Formato das requisições

Requisições com corpo devem enviar JSON:

```http
Content-Type: application/json
```

Exemplo:

```json
{
  "nome": "Profissional de demonstracao",
  "descricao": "Atendimento de beleza."
}
```

O limite configurado para o corpo JSON é de 20 KB.

Não é necessário enviar token de autenticação nesta versão.

## 4. Convenções dos dados

### IDs

Os IDs são strings ObjectId do MongoDB.

Utilize o campo `_id` retornado pela API.

Quando um exemplo apresentar `ID_REAL`, substitua pelo ID
de um registro existente antes de enviar a requisição.

### Preço

O preço é um número em reais:

```json
{
  "preco": 40.5
}
```

Não envie:

```json
{
  "preco": "R$ 40,50"
}
```

### Duração

A duração é um número inteiro em minutos, entre 15 e 480.

```json
{
  "duracao": 30
}
```

### Valores booleanos

No corpo JSON, use booleanos sem aspas:

```json
{
  "ativo": false
}
```

Nos filtros da URL, use:

```text
?ativo=false
```

### Datas e horários

- Data: `AAAA-MM-DD`.
- Horário: `HH:MM`, em formato de 24 horas.
- Deslocamento fixo da agenda: UTC-03:00.

Exemplo:

```json
{
  "data": "2026-11-10",
  "horario": "10:00"
}
```

Escolha uma data futura ao executar testes.

Datas persistidas podem retornar em UTC, com `Z` no final.

Exemplo:

```text
2026-11-10T13:00:00.000Z
```

Esse instante corresponde a 10:00 no deslocamento UTC-03:00.

### Listagens

As listagens retornam arrays diretamente:

```json
[]
```

ou:

```json
[
  {
    "_id": "ID_REAL",
    "nome": "Profissional de demonstracao"
  }
]
```

Elas têm limite de 100 registros, sem paginação.

## 5. Resumo dos endpoints

| Método | Caminho | Finalidade |
|---|---|---|
| GET | /health | Verificar conexão com o banco |
| POST | /prestadores | Cadastrar prestador |
| GET | /prestadores | Listar prestadores |
| POST | /servicos | Cadastrar serviço |
| GET | /servicos | Listar serviços ativos |
| GET | /servicos/:id | Consultar serviço ativo |
| PATCH | /servicos/:id | Editar, desativar ou reativar |
| GET | /servicos/:id/disponibilidade | Consultar horários livres |
| POST | /agendamentos | Criar agendamento |
| GET | /agendamentos | Listar e filtrar agendamentos |
| PATCH | /agendamentos/:id/status | Alterar status |
| GET | /painel/servicos | Listar ativos e inativos |

Não existem endpoints de login, pagamento, exclusão,
edição de prestador ou reagendamento nesta versão.

## 6. Saúde da API

### GET /health

Não recebe corpo.

Com o banco conectado, retorna HTTP 200:

```json
{
  "status": "ok"
}
```

Se o servidor estiver respondendo, mas o banco estiver
desconectado, retorna HTTP 503:

```json
{
  "status": "sem_banco"
}
```

Se a conexão inicial com o MongoDB falhar, o servidor não
chega a abrir a porta. Nesse caso, o cliente pode receber
uma falha de conexão em vez de uma resposta JSON.

## 7. Prestadores

### POST /prestadores

Cadastra um prestador.

| Campo | Tipo | Obrigatório | Regra |
|---|---|---|---|
| nome | string | Sim | Não vazio, até 100 caracteres após trim |
| descricao | string | Não | Até 500 caracteres |

Requisição:

```json
{
  "nome": "Profissional de demonstracao",
  "descricao": "Atendimento de beleza."
}
```

Sucesso: HTTP 201.

A resposta é o documento criado diretamente, incluindo:

- `_id`.
- `nome`.
- `descricao`.
- Metadados do documento.

Guarde `_id` para cadastrar serviços.

Erros:

- 400: dados inválidos.

Não existe verificação de duplicidade por nome.
Repetir o cadastro pode criar outro prestador.

### GET /prestadores

Lista até 100 prestadores, ordenados por nome.

Não possui filtros implementados.

Sucesso: HTTP 200.

Sem resultados:

```json
[]
```

## 8. Serviços

### POST /servicos

Cadastra um serviço para um prestador existente.

| Campo | Tipo | Obrigatório | Regra |
|---|---|---|---|
| prestadorId | string | Sim | ID de prestador existente |
| titulo | string | Sim | Não vazio, até 100 caracteres após trim |
| descricao | string | Não | Até 1.000 caracteres |
| categoria | string | Sim | Não vazia, até 60 caracteres após trim |
| preco | number | Sim | Finito e maior ou igual a zero |
| duracao | number | Sim | Inteiro de 15 a 480 minutos |

Requisição:

```json
{
  "prestadorId": "ID_REAL",
  "titulo": "Corte de cabelo",
  "descricao": "Servico demonstrativo.",
  "categoria": "Beleza",
  "preco": 40,
  "duracao": 30
}
```

Sucesso: HTTP 201.

Retorna o documento criado diretamente.

O campo de relacionamento na resposta é `prestador`.
O serviço começa com `ativo: true`.

Erros:

- 400: ID ou campos inválidos.
- 404: prestador inexistente.

### GET /servicos

Lista somente serviços ativos, até 100 registros,
ordenados por título.

Filtros opcionais:

| Filtro | Comportamento |
|---|---|
| categoria | Igualdade exata da categoria |
| q | Busca parcial no título, sem diferenciar maiúsculas e minúsculas |

Exemplos:

```text
/servicos
/servicos?categoria=Beleza
/servicos?q=cabelo
/servicos?categoria=Beleza&q=cabelo
```

A categoria diferencia maiúsculas e minúsculas.

A busca `q` não pesquisa na descrição nem no nome do prestador.

Sucesso: HTTP 200, com um array.

O campo `prestador` vem preenchido com `_id`, `nome`
e `descricao`.

Filtros reconhecidos com valores inválidos retornam 400.
Filtros desconhecidos são ignorados nesta rota.

### GET /servicos/:id

Consulta um serviço ativo.

Sucesso: HTTP 200, com o documento diretamente.

O campo `prestador` vem preenchido com seus dados básicos.

Erros:

- 400: ID inválido.
- 404: serviço inexistente ou inativo.

### PATCH /servicos/:id

Edita, desativa ou reativa um serviço.

Envie um objeto JSON não vazio com pelo menos um campo:

- `titulo`.
- `descricao`.
- `categoria`.
- `preco`.
- `duracao`.
- `ativo`.

As regras dos campos são as mesmas do cadastro.
O campo `ativo` deve ser booleano.

Não é permitido alterar o prestador ou enviar outros campos.

Exemplo de edição:

```json
{
  "preco": 45,
  "descricao": "Descricao atualizada."
}
```

Desativação:

```json
{
  "ativo": false
}
```

Reativação:

```json
{
  "ativo": true
}
```

Sucesso: HTTP 200.

Formato da resposta:

```json
{
  "mensagem": "Servico atualizado com sucesso.",
  "servico": {}
}
```

O objeto `servico` contém o documento atualizado.

Erros:

- 400: corpo vazio, campos inválidos ou não permitidos.
- 404: serviço inexistente.

Regras importantes:

- Um serviço inativo pode ser editado e reativado.
- Desativar não apaga o documento.
- Desativar não cancela agendamentos existentes.
- Editar preço ou duração não recalcula agendamentos existentes.
- Nesta resposta, `prestador` não vem preenchido com nome;
  normalmente será o ID.

## 9. Disponibilidade

### GET /servicos/:id/disponibilidade

Recebe o filtro obrigatório `data`.

Exemplo:

```text
/servicos/ID_REAL/disponibilidade?data=2026-11-10
```

Formato de resposta ilustrativo:

```json
{
  "servicoId": "ID_REAL",
  "data": "2026-11-10",
  "deslocamentoUTC": "-03:00",
  "duracao": 30,
  "intervaloSugestoes": 30,
  "horarios": [
    "08:00",
    "08:30",
    "09:00"
  ]
}
```

A lista real depende da duração, da data e das reservas existentes.

Regras:

1. Atendimento de segunda a sexta.
2. Expediente das 08:00 às 18:00.
3. Não existe pausa de almoço configurada.
4. Sugestões de início a cada 30 minutos.
5. A duração inteira precisa caber no expediente.
6. Horários passados não são sugeridos.
7. Pendentes e confirmados bloqueiam o intervalo.
8. Conflitos consideram todos os serviços do mesmo prestador.

Sucesso: HTTP 200.

Datas passadas, fins de semana e dias sem vagas retornam:

```json
{
  "servicoId": "ID_REAL",
  "data": "2026-11-10",
  "deslocamentoUTC": "-03:00",
  "duracao": 30,
  "intervaloSugestoes": 30,
  "horarios": []
}
```

A data do exemplo é ilustrativa.

Erros:

- 400: ID ou data inválidos.
- 404: serviço inexistente ou inativo.

Consultar disponibilidade não reserva o horário.
A criação do agendamento verifica os conflitos novamente.

O POST aceita horários fora da grade, como 10:15,
desde que respeitem as demais regras.

## 10. Agendamentos

### POST /agendamentos

Cria uma solicitação de atendimento.

| Campo | Tipo | Obrigatório | Regra |
|---|---|---|---|
| servicoId | string | Sim | Serviço existente e ativo |
| nomeCliente | string | Sim | Não vazio, até 100 caracteres após trim |
| telefoneCliente | string | Sim | Não vazio, até 30 caracteres após trim |
| data | string | Sim | Data existente no formato AAAA-MM-DD |
| horario | string | Sim | HH:MM, futuro e dentro do expediente |
| observacoes | string | Não | Até 500 caracteres |

O telefone possui apenas validação básica de texto.
Não há confirmação de número real, DDD ou WhatsApp.

Requisição:

```json
{
  "servicoId": "ID_REAL",
  "nomeCliente": "Cliente de demonstracao",
  "telefoneCliente": "11999999999",
  "data": "2026-11-10",
  "horario": "10:00",
  "observacoes": "Teste academico."
}
```

Use uma data futura no momento do teste.

O backend define:

- Prestador.
- Preço.
- Início e fim.
- Status inicial.

Sucesso: HTTP 201.

Formato da resposta:

```json
{
  "mensagem": "Agendamento criado com sucesso.",
  "agendamento": {}
}
```

O objeto `agendamento` contém:

- `_id`.
- `servico`.
- `prestador`.
- `nomeCliente`.
- `telefoneCliente`.
- `inicio`.
- `fim`.
- `preco`.
- `status`.
- `observacoes`.
- Metadados.

Status inicial: `pendente`.

Erros:

- 400: dados, ID, data ou horário inválidos.
- 400: data passada ou atendimento fora do expediente.
- 404: serviço inexistente ou inativo.
- 409: conflito de horário ou reserva em processamento.

Um atendimento pode começar exatamente quando outro termina.

### GET /agendamentos

Lista até 100 agendamentos, por início crescente.

Filtros opcionais:

| Filtro | Regra |
|---|---|
| status | pendente, confirmado, concluido ou cancelado |
| data | AAAA-MM-DD, considerando o início no dia em UTC-03:00 |
| prestadorId | ID de prestador existente |

Exemplos:

```text
/agendamentos
/agendamentos?status=pendente
/agendamentos?data=2026-11-10
/agendamentos?status=pendente&data=2026-11-10
```

Os filtros são combinados por E.

Sucesso: HTTP 200, com um array.

Relacionamentos preenchidos:

- `servico`: `_id`, `titulo`, `categoria`.
- `prestador`: `_id`, `nome`.

O título do serviço reflete seu cadastro atual.
O preço e o intervalo do agendamento permanecem os registrados
na criação da reserva.

Sem resultados:

```json
[]
```

Erros:

- 400: filtro inválido ou desconhecido.
- 404: prestador informado não encontrado.

Esta rota retorna contatos e não tem proteção de acesso.
Use somente com dados fictícios na demonstração local.

### PATCH /agendamentos/:id/status

Requisição:

```json
{
  "status": "confirmado"
}
```

Transições permitidas:

| Origem | Destino |
|---|---|
| pendente | confirmado |
| pendente | cancelado |
| confirmado | concluido |
| confirmado | cancelado |

Sucesso: HTTP 200.

Retorna o documento atualizado diretamente, sem wrapper.
Os relacionamentos não vêm preenchidos nessa resposta.

Erros:

- 400: ID ou status inválidos.
- 404: agendamento inexistente.
- 409: transição não permitida.

Repetir o status atual também retorna conflito.

Não é possível reabrir um cancelado ou concluído.
Para uma nova reserva, crie outro agendamento.

A implementação permite concluir antes do horário do atendimento.
Como concluídos não bloqueiam a agenda, não conclua antecipadamente
durante testes em que o intervalo deva permanecer ocupado.

## 11. Painel demonstrativo

### GET /painel/servicos

Lista serviços ativos e inativos.

Retorna até 100 documentos, por criação mais recente primeiro.

Filtros opcionais:

| Filtro | Regra |
|---|---|
| ativo | true ou false na URL |
| prestadorId | ID de prestador existente |

Exemplos:

```text
/painel/servicos
/painel/servicos?ativo=false
/painel/servicos?ativo=true&prestadorId=ID_REAL
```

Sucesso: HTTP 200, com um array.

O campo `prestador` vem preenchido com `_id`, `nome`
e `descricao`.

Erros:

- 400: filtros inválidos ou desconhecidos.
- 404: prestador inexistente.

Para editar ou reativar, utilize:

```text
PATCH /servicos/:id
```

A URL `/painel` não implementa login ou autorização.

## 12. Formato de erros

Formato geral:

```json
{
  "erro": "Mensagem explicando o problema."
}
```

| Código | Significado |
|---|---|
| 400 | Requisição, JSON, campos ou filtros inválidos |
| 404 | Rota ou recurso não encontrado |
| 409 | Conflito de agenda ou alteração de status não permitida |
| 413 | Corpo acima do limite de 20 KB |
| 500 | Erro interno |
| 503 | Banco desconectado no health |

O tratamento de 413 depende do errorHandler atualizado.

O frontend deve verificar o status HTTP e apresentar o campo
`erro` quando disponível.

## 13. Exemplo de integração com JavaScript

```js
const API_URL = 'http://127.0.0.1:3001/api';

async function listarServicos() {
  const resposta = await fetch(`${API_URL}/servicos`);
  const dados = await resposta.json();

  if (!resposta.ok) {
    throw new Error(
      dados.erro || 'Falha ao consultar servicos.'
    );
  }

  return dados;
}
```

Para enviar JSON:

```js
async function criarAgendamento(dadosAgendamento) {
  const resposta = await fetch(`${API_URL}/agendamentos`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(dadosAgendamento),
  });

  const dados = await resposta.json();

  if (!resposta.ok) {
    throw new Error(
      dados.erro || 'Falha ao criar agendamento.'
    );
  }

  return dados;
}
```

Trate também falhas de conexão com try/catch na interface.

Para filtros, utilize URLSearchParams.

Configure FRONTEND_ORIGIN para a origem exata das páginas.
localhost e 127.0.0.1 são origens diferentes.

Abra o frontend por um servidor local, não pelo duplo clique
no arquivo HTML.

CORS não é uma proteção de acesso às operações da API.

## 14. Roteiro de testes

- Verificar health.
- Cadastrar prestador e serviço.
- Consultar lista pública e detalhes.
- Consultar disponibilidade em dia útil futuro.
- Criar agendamento.
- Repetir o horário e verificar 409.
- Testar sobreposição parcial.
- Testar conflitos entre serviços do mesmo prestador.
- Confirmar e cancelar.
- Verificar liberação do horário cancelado.
- Testar datas passadas e inexistentes.
- Testar fora do expediente.
- Editar, desativar e reativar serviço.
- Conferir filtros do painel e dos agendamentos.
- Reiniciar o backend e conferir persistência.

Não existe suíte automatizada definida nesta versão.
Este roteiro serve para testes manuais.

## 15. Limitações

- Sem autenticação e autorização.
- Sem pagamentos.
- Sem configuração individual de expediente.
- Sem paginação.
- Limite de 100 registros nas listagens.
- Deslocamento fixo UTC-03:00.
- Bloqueio de criação simultânea limitado a uma instância.
- Sem proteção completa contra alterações concorrentes
  de serviços ou status.
- Sem validação completa de telefone.
- Sem testes automatizados.

A documentação descreve o código construído durante o projeto.
Confira diferenças caso a implementação local seja alterada.