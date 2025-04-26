-- Tabela de pagamentos aos motoristas
CREATE TABLE IF NOT EXISTS pagamentos (
  id SERIAL PRIMARY KEY,
  motorista_id INTEGER NOT NULL REFERENCES drivers(id),
  motorista_nome TEXT NOT NULL,
  total_corridas INTEGER NOT NULL,
  valor_bruto DECIMAL(10,2) NOT NULL,
  comissao_app DECIMAL(10,2) NOT NULL,
  valor_liquido DECIMAL(10,2) NOT NULL,
  data_inicio TIMESTAMP WITH TIME ZONE NOT NULL,
  data_fim TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente', -- pendente, processando, pago, cancelado
  data_pagamento TIMESTAMP WITH TIME ZONE,
  metodo_pagamento TEXT,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Adicionar campos financeiros à tabela de solicitações
ALTER TABLE solicitacoes 
ADD COLUMN IF NOT EXISTS valor DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS distancia DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS comissao DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS pagamento_motorista DECIMAL(10,2);

-- Índices para consultas financeiras
CREATE INDEX IF NOT EXISTS idx_pagamentos_motorista ON pagamentos(motorista_id);
CREATE INDEX IF NOT EXISTS idx_pagamentos_status ON pagamentos(status);
CREATE INDEX IF NOT EXISTS idx_pagamentos_data ON pagamentos(data_inicio, data_fim);
CREATE INDEX IF NOT EXISTS idx_solicitacoes_valor ON solicitacoes(valor);
