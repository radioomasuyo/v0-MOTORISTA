-- Adicionar colunas de avaliação à tabela drivers
ALTER TABLE drivers 
ADD COLUMN IF NOT EXISTS avaliacao DECIMAL(3,2) DEFAULT 5.0,
ADD COLUMN IF NOT EXISTS avaliacoes_total INTEGER DEFAULT 0;
