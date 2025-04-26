-- Verificar se a tabela drivers existe e tem a coluna avaliacao
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'drivers';
