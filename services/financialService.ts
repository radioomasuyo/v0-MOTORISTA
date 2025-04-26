import { supabase } from "@/lib/supabase"

export type Payment = {
  id: number
  motorista_id: number
  motorista_nome: string
  total_corridas: number
  valor_bruto: number
  comissao_app: number
  valor_liquido: number
  data_inicio: string
  data_fim: string
  status: string
  data_pagamento?: string
  metodo_pagamento?: string
  observacoes?: string
  created_at: string
}

// Calcular o valor da corrida
export const calcularValorCorrida = (distanciaKm: number, tempoMinutos: number): number => {
  // Valores base
  const taxaBase = 5.0 // Taxa base em reais
  const valorPorKm = 2.0 // Valor por km em reais
  const valorPorMinuto = 0.5 // Valor por minuto em reais

  // Cálculo do valor
  const valorDistancia = distanciaKm * valorPorKm
  const valorTempo = tempoMinutos * valorPorMinuto
  const valorTotal = taxaBase + valorDistancia + valorTempo

  // Arredondar para duas casas decimais
  return Math.round(valorTotal * 100) / 100
}

// Calcular a comissão da plataforma
export const calcularComissao = (valorTotal: number): number => {
  // Comissão de 15%
  const comissao = valorTotal * 0.15

  // Arredondar para duas casas decimais
  return Math.round(comissao * 100) / 100
}

// Calcular o valor líquido para o motorista
export const calcularValorLiquido = (valorTotal: number): number => {
  const comissao = calcularComissao(valorTotal)
  const valorLiquido = valorTotal - comissao

  // Arredondar para duas casas decimais
  return Math.round(valorLiquido * 100) / 100
}

// Gerar pagamento para o motorista
export const gerarPagamento = async (
  motoristaId: number,
  corridas: any[],
  valorTotal: number,
  comissao: number,
  valorLiquido: number,
): Promise<{
  sucesso: boolean
  mensagem?: string
  pagamentoId?: number
}> => {
  try {
    const { data, error } = await supabase
      .from("pagamentos")
      .insert({
        motorista_id: motoristaId,
        corridas: corridas,
        valor_total: valorTotal,
        comissao: comissao,
        valor_liquido: valorLiquido,
        status: "pendente",
        data_geracao: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      console.error("Erro ao gerar pagamento:", error)
      return { sucesso: false, mensagem: "Erro ao gerar pagamento" }
    }

    return { sucesso: true, pagamentoId: data.id }
  } catch (error) {
    console.error("Erro em gerarPagamento:", error)
    return { sucesso: false, mensagem: "Erro ao processar pagamento" }
  }
}

// Obter pagamentos de um motorista
export const obterPagamentosMotorista = async (motoristaId: number): Promise<any[]> => {
  try {
    const { data, error } = await supabase
      .from("pagamentos")
      .select("*")
      .eq("motorista_id", motoristaId)
      .order("data_geracao", { ascending: false })

    if (error) {
      console.error("Erro ao obter pagamentos:", error)
      return []
    }

    return data || []
  } catch (error) {
    console.error("Erro em obterPagamentosMotorista:", error)
    return []
  }
}

// Obter todos os pagamentos
export const obterTodosPagamentos = async (): Promise<any[]> => {
  try {
    const { data, error } = await supabase
      .from("pagamentos")
      .select("*, motorista:motorista_id(id, nome, codigo)")
      .order("data_geracao", { ascending: false })

    if (error) {
      console.error("Erro ao obter todos os pagamentos:", error)
      return []
    }

    return data || []
  } catch (error) {
    console.error("Erro em obterTodosPagamentos:", error)
    return []
  }
}

// Atualizar status de pagamento
export const atualizarStatusPagamento = async (
  pagamentoId: number,
  novoStatus: string,
): Promise<{
  sucesso: boolean
  mensagem?: string
}> => {
  try {
    const { error } = await supabase
      .from("pagamentos")
      .update({
        status: novoStatus,
        data_atualizacao: new Date().toISOString(),
      })
      .eq("id", pagamentoId)

    if (error) {
      console.error("Erro ao atualizar status do pagamento:", error)
      return { sucesso: false, mensagem: "Erro ao atualizar status" }
    }

    return { sucesso: true }
  } catch (error) {
    console.error("Erro em atualizarStatusPagamento:", error)
    return { sucesso: false, mensagem: "Erro ao processar atualização" }
  }
}

// Gerar pagamento mensal para o motorista
export const gerarPagamentoMensal = async (motoristaId: number, mes: number, ano: number): Promise<Payment | null> => {
  try {
    // Calcular data de início e fim do mês
    const dataInicio = new Date(ano, mes - 1, 1)
    const dataFim = new Date(ano, mes, 0)

    // Buscar corridas finalizadas do motorista no período
    const { data: corridas, error: corridasError } = await supabase
      .from("solicitacoes")
      .select("*")
      .eq("status", "finalizada")
      .filter("motorista->>id", "eq", String(motoristaId))
      .gte("timestamp", dataInicio.toISOString())
      .lte("timestamp", dataFim.toISOString())

    if (corridasError) {
      console.error("Erro ao buscar corridas:", corridasError)
      return null
    }

    if (!corridas || corridas.length === 0) {
      return null
    }

    // Calcular valores financeiros
    const valorBruto = corridas.reduce((acc, corrida) => acc + (corrida.valor || 0), 0)
    const comissaoApp = calcularComissao(valorBruto)
    const valorLiquido = calcularValorLiquido(valorBruto)

    // Buscar dados do motorista
    const { data: motorista, error: motoristaError } = await supabase
      .from("drivers")
      .select("nome")
      .eq("id", motoristaId)
      .single()

    if (motoristaError) {
      console.error("Erro ao buscar dados do motorista:", motoristaError)
      return null
    }

    // Criar pagamento
    const { data: pagamento, error: pagamentoError } = await supabase
      .from("pagamentos")
      .insert({
        motorista_id: motoristaId,
        motorista_nome: motorista.nome,
        total_corridas: corridas.length,
        valor_bruto: valorBruto,
        comissao_app: comissaoApp,
        valor_liquido: valorLiquido,
        data_inicio: dataInicio.toISOString(),
        data_fim: dataFim.toISOString(),
        status: "pendente",
      })
      .select()
      .single()

    if (pagamentoError) {
      console.error("Erro ao criar pagamento:", pagamentoError)
      return null
    }

    return pagamento as Payment
  } catch (error) {
    console.error("Erro em gerarPagamentoMensal:", error)
    return null
  }
}
