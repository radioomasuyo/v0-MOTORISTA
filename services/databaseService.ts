import { supabase } from "@/lib/supabase"

// Function to initialize the database schema
export const initializeDatabase = async (): Promise<{ success: boolean; error?: string }> => {
  try {
    // Check if the drivers table exists
    const { error: checkError } = await supabase.from("drivers").select("id").limit(1).maybeSingle()

    // If we get a "relation does not exist" error, we need to create the tables
    if (checkError && checkError.message.includes("relation") && checkError.message.includes("does not exist")) {
      console.log("Database tables don't exist. Manual creation required.")

      // Instead of trying to create tables via RPC, return instructions for manual creation
      return {
        success: false,
        error: "Database tables need to be created manually. Please use the SQL script provided in the UI.",
      }
    }

    // If we didn't get an error or it's not a "relation does not exist" error,
    // then the tables probably already exist
    return { success: true }
  } catch (error) {
    console.error("Error initializing database:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error initializing database",
    }
  }
}

// Function to get SQL instructions for manual table creation
export const getInitializationInstructions = (): string => {
  return `-- Run this SQL in the Supabase SQL Editor to create the necessary tables

-- Drivers table
CREATE TABLE IF NOT EXISTS drivers (
  id SERIAL PRIMARY KEY,
  codigo TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  telefone TEXT NOT NULL,
  avaliacao DECIMAL(3,1) NOT NULL DEFAULT 5.0,
  veiculo TEXT NOT NULL,
  placa TEXT NOT NULL,
  foto TEXT,
  corridas INTEGER DEFAULT 0,
  status TEXT DEFAULT 'offline',
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  titulo TEXT NOT NULL,
  mensagem TEXT NOT NULL,
  tempo TIMESTAMP WITH TIME ZONE NOT NULL,
  lida BOOLEAN DEFAULT FALSE,
  driver_code TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Solicitacoes (ride requests) table
CREATE TABLE IF NOT EXISTS solicitacoes (
  id SERIAL PRIMARY KEY,
  cliente JSONB NOT NULL,
  motorista JSONB NOT NULL,
  destino TEXT,
  status TEXT NOT NULL DEFAULT 'pendente',
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_drivers_codigo ON drivers(codigo);
CREATE INDEX IF NOT EXISTS idx_drivers_status ON drivers(status);
CREATE INDEX IF NOT EXISTS idx_notifications_driver ON notifications(driver_code);
CREATE INDEX IF NOT EXISTS idx_solicitacoes_status ON solicitacoes(status);`
}

// Alias for backward compatibility
export const getInitializationSQL = getInitializationInstructions
