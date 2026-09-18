# Database Migrations

Esta pasta guarda o historico das alteracoes feitas no banco de dados da aplicacao.

## Convencao

- Cada alteracao que afete o banco deve criar um novo arquivo `.sql` nesta pasta.
- Use numeracao sequencial com tres digitos: `001_...sql`, `002_...sql`, `003_...sql`.
- A primeira migration, `001_initial_schema.sql`, foi iniciada a partir do arquivo `raroleads.sql` anexado.
- Nao altere migrations antigas depois que elas forem compartilhadas ou aplicadas; crie uma nova migration corrigindo ou evoluindo o schema.

`015_add_base_superior.sql` adiciona a hierarquia opcional de bases. Ela integra `npm run db:schema` e deixa as bases existentes sem superior.

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
