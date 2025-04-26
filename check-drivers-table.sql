-- Verificar a estrutura da tabela drivers
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'drivers';
