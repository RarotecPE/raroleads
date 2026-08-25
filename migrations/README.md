# Database Migrations

Esta pasta guarda o historico das alteracoes feitas no banco de dados da aplicacao.

## Convencao

- Cada alteracao que afete o banco deve criar um novo arquivo `.sql` nesta pasta.
- Use numeracao sequencial com tres digitos: `001_...sql`, `002_...sql`, `003_...sql`.
- A primeira migration, `001_initial_schema.sql`, foi iniciada a partir do arquivo `raroleads.sql` anexado.
- Nao altere migrations antigas depois que elas forem compartilhadas ou aplicadas; crie uma nova migration corrigindo ou evoluindo o schema.
