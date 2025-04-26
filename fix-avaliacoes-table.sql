-- Verificar se a tabela avaliacoes existe e recriá-la se necessário
DROP TABLE IF EXISTS avaliacoes;

-- Criar tabela de avaliações sem restrições de chave estrangeira
CREATE TABLE avaliacoes (
  id SERIAL PRIMARY KEY,
  motorista_id INTEGER NOT NULL,
  estrelas INTEGER NOT NULL CHECK (estrelas >= 1 AND estrelas <= 5),
  comentario TEXT,
  data TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Adicionar coluna avaliacao à tabela drivers se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'drivers' AND column_name = 'avaliacao'
  ) THEN
    ALTER TABLE drivers ADD COLUMN avaliacao NUMERIC(3,1) DEFAULT 5.0;
  END IF;
END $$;

-- Adicionar coluna total_avaliacoes à tabela drivers se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'drivers' AND column_name = 'total_avaliacoes'
  ) THEN
    ALTER TABLE drivers ADD COLUMN total_avaliacoes INTEGER DEFAULT 0;
  END IF;
END $$;
