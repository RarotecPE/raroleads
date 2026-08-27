-- Seed data based on src/db/seed.ts.
-- Dates mirror the seed helper d(offsetDays) using CURRENT_DATE.

INSERT INTO "clientes" (
  "id",
  "cliente_nome",
  "municipio",
  "uf",
  "codigo_ibge",
  "populacao",
  "situacao",
  "dados_administrativos",
  "observacoes"
) VALUES
  (
    'municipio_tacaratu',
    'Prefeitura Municipal de Tacaratu',
    'Tacaratu',
    'PE',
    '2612508',
    24151,
    'cliente_ativo',
    'Gestão 2025-2028. Contato principal com o gabinete.',
    'Cliente histórico; relação iniciada por indicação regional.'
  ),
  (
    'municipio_paulista',
    'Prefeitura Municipal de Paulista',
    'Paulista',
    'PE',
    '2610700',
    334376,
    'cliente_ativo',
    'Prefeitura com secretarias descentralizadas.',
    NULL
  ),
  (
    'municipio_vitoria',
    'Prefeitura Municipal de Vitoria de Santo Antao',
    'Vitória de Santo Antão',
    'PE',
    '2616400',
    134688,
    'em_negociacao',
    NULL,
    NULL
  ),
  (
    'municipio_carpina',
    'Prefeitura Municipal de Carpina',
    'Carpina',
    'PE',
    '2604009',
    86241,
    'prospect',
    NULL,
    'Primeiro contato em evento da AMUPE.'
  )
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "bases" (
  "id",
  "municipio_id",
  "nome",
  "tipo",
  "cnpj"
) VALUES
  ('base_tacaratu_prefeitura', 'municipio_tacaratu', 'Prefeitura', 'Prefeitura', '07.954.965/0001-26'),
  ('base_tacaratu_saude', 'municipio_tacaratu', 'Secretaria de Saúde', 'Saúde', '07.954.965/0002-07'),
  ('base_tacaratu_camara', 'municipio_tacaratu', 'Câmara Municipal', 'Câmara', NULL),
  ('base_paulista_prefeitura', 'municipio_paulista', 'Prefeitura', 'Prefeitura', '10.709.764/0001-03'),
  ('base_paulista_saude', 'municipio_paulista', 'Saúde', 'Saúde', '10.709.764/0002-94'),
  ('base_paulista_educacao', 'municipio_paulista', 'Educação', 'Educação', '10.709.764/0003-75'),
  ('base_vitoria_prefeitura', 'municipio_vitoria', 'Prefeitura', 'Prefeitura', '08.309.615/0001-43')
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "base_modules" (
  "id",
  "base_id",
  "nome",
  "observacoes",
  "solicitante",
  "solicitacao_at",
  "solicitacao_origem",
  "habilitado_at",
  "migracao_inicio",
  "migracao_fim",
  "implantacao_status",
  "execucao_inicio"
) VALUES
  (
    'mod_tacaratu_pref_contabilidade',
    'base_tacaratu_prefeitura',
    'Contabilidade',
    NULL,
    'Contador responsável',
    CURRENT_DATE - INTERVAL '32 days',
    'contrato',
    CURRENT_DATE - INTERVAL '30 days',
    CURRENT_DATE - INTERVAL '30 days',
    CURRENT_DATE - INTERVAL '11 days',
    'concluida',
    CURRENT_DATE - INTERVAL '10 days'
  ),
  (
    'mod_tacaratu_pref_rh',
    'base_tacaratu_prefeitura',
    'RH',
    'Habilitado por solicitação verbal - formalizar origem.',
    NULL,
    NULL,
    NULL,
    CURRENT_DATE - INTERVAL '14 days',
    NULL,
    NULL,
    'em_andamento',
    NULL
  ),
  (
    'mod_tacaratu_pref_tributos',
    'base_tacaratu_prefeitura',
    'Tributos',
    NULL,
    NULL,
    CURRENT_DATE - INTERVAL '5 days',
    'email',
    NULL,
    NULL,
    NULL,
    'nao_iniciada',
    NULL
  ),
  (
    'mod_tacaratu_pref_portal',
    'base_tacaratu_prefeitura',
    'Portal',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    'nao_iniciada',
    NULL
  ),
  (
    'mod_tacaratu_saude_contabilidade',
    'base_tacaratu_saude',
    'Contabilidade',
    NULL,
    NULL,
    CURRENT_DATE - INTERVAL '8 days',
    'reuniao',
    CURRENT_DATE - INTERVAL '7 days',
    NULL,
    NULL,
    'nao_iniciada',
    NULL
  ),
  (
    'mod_tacaratu_saude_almoxarifado',
    'base_tacaratu_saude',
    'Almoxarifado',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    'nao_iniciada',
    NULL
  ),
  (
    'mod_tacaratu_camara_contabilidade',
    'base_tacaratu_camara',
    'Contabilidade',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    'nao_iniciada',
    NULL
  ),
  (
    'mod_paulista_pref_contabilidade',
    'base_paulista_prefeitura',
    'Contabilidade',
    NULL,
    NULL,
    CURRENT_DATE - INTERVAL '62 days',
    'contrato',
    CURRENT_DATE - INTERVAL '60 days',
    NULL,
    NULL,
    'concluida',
    CURRENT_DATE - INTERVAL '40 days'
  ),
  (
    'mod_paulista_pref_portal',
    'base_paulista_prefeitura',
    'Portal',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    'nao_iniciada',
    NULL
  ),
  (
    'mod_paulista_saude_almoxarifado',
    'base_paulista_saude',
    'Almoxarifado',
    'Habilitado a pedido do secretário via WhatsApp.',
    NULL,
    NULL,
    NULL,
    CURRENT_DATE - INTERVAL '6 days',
    NULL,
    NULL,
    'nao_iniciada',
    NULL
  )
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "propostas" (
  "id",
  "municipio_id",
  "tipo",
  "data",
  "situacao",
  "bases_envolvidas",
  "modulos_envolvidos",
  "observacoes"
) VALUES
  (
    'proposta_tacaratu_2025',
    'municipio_tacaratu',
    'formal',
    CURRENT_DATE - INTERVAL '75 days',
    'convertida',
    'Prefeitura, Saúde',
    'Contabilidade, RH, Tributos, Portal',
    'Proposta apresentada ao prefeito e ao contador.'
  ),
  (
    'proposta_vitoria_pregao',
    'municipio_vitoria',
    'pregao',
    CURRENT_DATE - INTERVAL '9 days',
    'apresentada',
    'Prefeitura',
    'Contabilidade, RH, Frota, Compras',
    'Pregão eletrônico - aguardando resultado.'
  )
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "contratos" (
  "id",
  "municipio_id",
  "proposta_id",
  "numero",
  "modalidade",
  "processo",
  "data_assinatura",
  "data_inicio",
  "data_fim",
  "situacao",
  "observacoes"
) VALUES
  (
    'contrato_tacaratu_014_2025',
    'municipio_tacaratu',
    'proposta_tacaratu_2025',
    '014/2025',
    'dispensa',
    '2025.014.0001-9',
    CURRENT_DATE - INTERVAL '40 days',
    CURRENT_DATE - INTERVAL '40 days',
    CURRENT_DATE + INTERVAL '35 days',
    'vigente',
    'Vigência de 12 meses com prorrogação automática se acordado.'
  ),
  (
    'contrato_paulista_203_2023',
    'municipio_paulista',
    NULL,
    '203/2023',
    'licitacao',
    'PL 089/2023',
    CURRENT_DATE - INTERVAL '400 days',
    CURRENT_DATE - INTERVAL '400 days',
    CURRENT_DATE - INTERVAL '35 days',
    'vigente',
    'Vencido - aguardando renovação formal.'
  ),
  (
    'contrato_paulista_118_2026',
    'municipio_paulista',
    NULL,
    '118/2026',
    'adesao',
    'AR 012/2026',
    NULL,
    CURRENT_DATE + INTERVAL '5 days',
    CURRENT_DATE + INTERVAL '370 days',
    'aguardando_assinatura',
    'Ata de registro de preços - minuta enviada.'
  )
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "contrato_modulos" (
  "contrato_id",
  "base_module_id"
) VALUES
  ('contrato_tacaratu_014_2025', 'mod_tacaratu_pref_contabilidade'),
  ('contrato_tacaratu_014_2025', 'mod_tacaratu_pref_rh'),
  ('contrato_tacaratu_014_2025', 'mod_tacaratu_pref_tributos'),
  ('contrato_tacaratu_014_2025', 'mod_tacaratu_saude_contabilidade'),
  ('contrato_paulista_203_2023', 'mod_paulista_pref_contabilidade'),
  ('contrato_paulista_203_2023', 'mod_paulista_pref_portal')
ON CONFLICT ("contrato_id", "base_module_id") DO NOTHING;

INSERT INTO "aditivos" (
  "id",
  "contrato_id",
  "tipo",
  "data",
  "descricao"
) VALUES
  (
    'aditivo_tacaratu_tributos',
    'contrato_tacaratu_014_2025',
    'inclusao_modulo',
    CURRENT_DATE - INTERVAL '20 days',
    'Inclusão do módulo de Tributos na base Prefeitura.'
  )
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "documentos" (
  "id",
  "municipio_id",
  "contrato_id",
  "tipo",
  "nome",
  "referencia"
) VALUES
  (
    'documento_tacaratu_contrato_014_2025',
    'municipio_tacaratu',
    'contrato_tacaratu_014_2025',
    'contrato_assinado',
    'contrato_014_2025_assinado.pdf',
    '/arquivos/tacaratu/contrato_014_2025_assinado.pdf'
  ),
  (
    'documento_tacaratu_aditivo_tributos',
    'municipio_tacaratu',
    'contrato_tacaratu_014_2025',
    'aditivo',
    'aditivo_tributos.pdf',
    '/arquivos/tacaratu/aditivo_tributos.pdf'
  ),
  (
    'documento_paulista_minuta_118_2026',
    'municipio_paulista',
    'contrato_paulista_118_2026',
    'contrato_sem_assinatura',
    'minuta_118_2026.pdf',
    '/arquivos/paulista/minuta_118_2026.pdf'
  )
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "eventos" (
  "id",
  "municipio_id",
  "base_id",
  "base_module_id",
  "contrato_id",
  "tipo",
  "descricao",
  "data",
  "usuario"
) VALUES
  (
    'evento_tacaratu_municipio_criado',
    'municipio_tacaratu',
    NULL,
    NULL,
    NULL,
    'municipio_criado',
    'Município Tacaratu criado.',
    CURRENT_DATE - INTERVAL '75 days',
    'Equipe Interna'
  ),
  (
    'evento_tacaratu_base_prefeitura_criada',
    'municipio_tacaratu',
    'base_tacaratu_prefeitura',
    NULL,
    NULL,
    'base_criada',
    'Base Prefeitura criada.',
    CURRENT_DATE - INTERVAL '75 days',
    'Equipe Interna'
  ),
  (
    'evento_tacaratu_proposta_aceita',
    'municipio_tacaratu',
    NULL,
    NULL,
    NULL,
    'proposta_situacao',
    'Proposta aceita pelo município.',
    CURRENT_DATE - INTERVAL '60 days',
    'Equipe Interna'
  ),
  (
    'evento_tacaratu_contabilidade_solicitada',
    'municipio_tacaratu',
    NULL,
    'mod_tacaratu_pref_contabilidade',
    NULL,
    'habilitacao_solicitada',
    'Solicitada habilitação da Contabilidade.',
    CURRENT_DATE - INTERVAL '32 days',
    'Equipe Interna'
  ),
  (
    'evento_tacaratu_contabilidade_habilitada',
    'municipio_tacaratu',
    NULL,
    'mod_tacaratu_pref_contabilidade',
    NULL,
    'habilitado',
    'Contabilidade habilitada.',
    CURRENT_DATE - INTERVAL '30 days',
    'Equipe Interna'
  ),
  (
    'evento_tacaratu_contrato_criado',
    'municipio_tacaratu',
    NULL,
    NULL,
    'contrato_tacaratu_014_2025',
    'contrato_criado',
    'Contrato 014/2025 recebido.',
    CURRENT_DATE - INTERVAL '42 days',
    'Equipe Interna'
  ),
  (
    'evento_tacaratu_contrato_vigente',
    'municipio_tacaratu',
    NULL,
    NULL,
    'contrato_tacaratu_014_2025',
    'contrato_situacao',
    'Contrato 014/2025 assinado e vigente.',
    CURRENT_DATE - INTERVAL '40 days',
    'Equipe Interna'
  ),
  (
    'evento_paulista_almoxarifado_habilitado',
    'municipio_paulista',
    NULL,
    'mod_paulista_saude_almoxarifado',
    NULL,
    'habilitado',
    'Almoxarifado habilitado na Saúde (pedido via WhatsApp).',
    CURRENT_DATE - INTERVAL '6 days',
    'Equipe Interna'
  )
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "pendencias" (
  "id",
  "tipo",
  "descricao",
  "origem",
  "situacao",
  "municipio_id"
) VALUES
  (
    'pendencia_manual_vitoria_dados_gestao',
    'manual',
    'Confirmar dados administrativos da nova gestão em Vitória de Santo Antão.',
    'manual',
    'aberta',
    'municipio_vitoria'
  )
ON CONFLICT ("id") DO NOTHING;
