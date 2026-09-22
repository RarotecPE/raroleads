# Database Migrations

Esta pasta guarda o historico das alteracoes feitas no banco de dados da aplicacao.

## Convencao

- Cada alteracao que afete o banco deve criar um novo arquivo `.sql` nesta pasta.
- Use numeracao sequencial com tres digitos: `001_...sql`, `002_...sql`, `003_...sql`.
- A primeira migration, `001_initial_schema.sql`, foi iniciada a partir do arquivo `raroleads.sql` anexado.
- Nao altere migrations antigas depois que elas forem compartilhadas ou aplicadas; crie uma nova migration corrigindo ou evoluindo o schema.

`015_add_base_superior.sql` adiciona a hierarquia opcional de bases. Ela integra `npm run db:schema` e deixa as bases existentes sem superior.

`016_add_base_desabilitacao.sql` registra a data, o motivo e a origem das desabilitações em cascata de bases e módulos. Ela também integra `npm run db:schema`.

`017_create_central_propostas.sql` cria o ciclo comercial de propostas, itens estruturados, documentos versionados e histórico dedicado. Ela integra `npm run db:schema` e normaliza propostas legadas.

`018_add_proposta_base_duplicidade.sql` preserva a confirmação explícita para criar uma base de tipo já cadastrado durante a conversão de uma proposta. Ela integra `npm run db:schema`.

`019_add_proposta_cancelamento_exclusao.sql` registra cancelamento e exclusão lógica de propostas, preservando seus dados para auditoria. Ela integra `npm run db:schema`.

## Limpeza dos dados de homologacao

O arquivo `014_cleanup_homologacao.sql` e um script manual, destrutivo e destinado
exclusivamente a preparacao do banco para producao. Ele nao faz parte do comando
`npm run db:schema` e nao deve ser executado novamente depois que o sistema comecar
a receber dados reais.

Antes da execucao, confirme que a conexao configurada aponta para o banco correto e
que existe um backup valido. Para executar a limpeza manualmente:

```sh
node scripts/db-apply-sql.mjs migrations/014_cleanup_homologacao.sql
```

O script limpa somente as tabelas PostgreSQL. Arquivos enviados ao Cloudflare R2
permanecem armazenados. Nao execute `003_seed_data.sql` no banco de producao.
