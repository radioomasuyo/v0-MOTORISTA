-- Criar tabela de avaliações se não existir
CREATE TABLE IF NOT EXISTS avaliacoes (
  id SERIAL PRIMARY KEY,
  motorista_id INTEGER NOT NULL,
  estrelas NUMERIC(3,1) NOT NULL CHECK (estrelas >= 1 AND estrelas <= 5),
  comentario TEXT,
  data TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  FOREIGN KEY (motorista_id) REFERENCES drivers(id) ON DELETE CASCADE
);

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
