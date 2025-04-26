-- Adicionar a coluna avaliacoes_total à tabela drivers se ela não existir
ALTER TABLE drivers 
ADD COLUMN IF NOT EXISTS avaliacoes_total INTEGER DEFAULT 0;
