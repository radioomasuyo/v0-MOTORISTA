-- Tabela para armazenar as avaliações dos motoristas
CREATE TABLE IF NOT EXISTS avaliacoes (
  id SERIAL PRIMARY KEY,
  motorista_id INTEGER NOT NULL REFERENCES drivers(id),
  estrelas INTEGER NOT NULL CHECK (estrelas BETWEEN 1 AND 5),
  comentario TEXT,
  data TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  solicitacao_id INTEGER REFERENCES solicitacoes(id)
);

-- Adicionar índices para melhorar a performance das consultas
CREATE INDEX IF NOT EXISTS idx_avaliacoes_motorista_id ON avaliacoes(motorista_id);
CREATE INDEX IF NOT EXISTS idx_avaliacoes_data ON avaliacoes(data);
