-- Criar tabela de avaliações se não existir
CREATE TABLE IF NOT EXISTS avaliacoes (
  id SERIAL PRIMARY KEY,
  motorista_id INTEGER NOT NULL,
  estrelas INTEGER NOT NULL CHECK (estrelas BETWEEN 1 AND 5),
  comentario TEXT,
  data TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Adicionar índice para melhorar a performance
CREATE INDEX IF NOT EXISTS idx_avaliacoes_motorista_id ON avaliacoes(motorista_id);
