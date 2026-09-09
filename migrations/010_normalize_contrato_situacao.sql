UPDATE "contratos"
SET "situacao" = CASE "situacao"
  WHEN 'Recebido sem assinatura' THEN 'recebido_sem_assinatura'
  WHEN 'Aguardando assinatura' THEN 'aguardando_assinatura'
  WHEN 'Vigente' THEN 'vigente'
  WHEN 'Encerrado' THEN 'encerrado'
  WHEN 'Cancelado' THEN 'cancelado'
  ELSE "situacao"
END
WHERE "situacao" IN (
  'Recebido sem assinatura',
  'Aguardando assinatura',
  'Vigente',
  'Encerrado',
  'Cancelado'
);
