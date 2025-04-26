-- Verificar se a coluna avaliacao existe na tabela drivers
ALTER TABLE IF EXISTS drivers 
ADD COLUMN IF NOT EXISTS avaliacao DECIMAL DEFAULT 5.0;
