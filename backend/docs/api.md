## Listar serviços no painel demonstrativo

GET /api/painel/servicos

Retorna até 100 serviços, incluindo ativos e inativos.
Ordenação: registros criados mais recentemente primeiro.

### Filtros opcionais

- ativo: true ou false.
- prestadorId: ID de um prestador cadastrado.

Os filtros podem ser combinados.

### Exemplos

GET /api/painel/servicos
GET /api/painel/servicos?ativo=false
GET /api/painel/servicos?ativo=true&prestadorId=ID_DO_PRESTADOR

### Respostas

- 200: lista de serviços; pode estar vazia.
- 400: filtro ou ID inválido.
- 404: prestador informado não encontrado.

### Limitação de acesso

Rota sem autenticação, destinada exclusivamente à demonstração
local com dados fictícios. O caminho /painel não fornece
proteção de acesso.

### Editar, desativar ou reativar

Utilizar PATCH /api/servicos/:id.

Para desativar:
{ "ativo": false }

Para reativar:
{ "ativo": true }