import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export const getSupabaseClient = () => {
  return supabase
}

export type Driver = {
  id: number
  created_at?: string
  codigo: string
  nome: string
  telefone: string
  avaliacao: number
  veiculo: string
  placa: string
  foto: string
  corridas: number
  status: "online" | "offline" | "busy"
  ativo: boolean
}

export type Notification = {
  id: string
  titulo: string
  mensagem: string
  tempo: string
  lida: boolean
  driver_code: string | null
  created_at: string
}
