import { supabase } from "@/lib/supabase"
import { notificationService } from "./notificationService"

// Enviar uma solicitação de corrida
export const enviarSolicitacao = async (dados: {
  cliente: { nome: string; localizacao: { lat: number; lon: number } }
  motorista: any
  destino?: string
}): Promise<number> => {
  try {
    const novaSolicitacao = {
      cliente: dados.cliente,
      motorista: dados.motorista,
      destino: dados.destino || null,
      status: "pendente",
      timestamp: new Date().toISOString(),
    }

    const { data, error } = await supabase.from("solicitacoes").insert(novaSolicitacao).select().single()

    if (error) {
      console.error("Error creating solicitacao:", error)
      throw error
    }

    // Dispatch event to notify the driver
    if (typeof window !== "undefined") {
      const evento = new CustomEvent("nova_solicitacao", {
        detail: { id: data.id, solicitacao: data },
      })
      window.dispatchEvent(evento)
    }

    return data.id
  } catch (error) {
    console.error("Error in enviarSolicitacao:", error)
    throw error
  }
}

// Verificar o status de uma solicitação
export const verificarStatusSolicitacao = async (
  id: number,
): Promise<{
  status: string
  motorista?: any
}> => {
  try {
    const { data, error } = await supabase.from("solicitacoes").select("*").eq("id", id).single()

    if (error) {
      console.error("Error checking solicitacao status:", error)
      return { status: "não encontrada" }
    }

    return {
      status: data.status,
      motorista: data.motorista,
    }
  } catch (error) {
    console.error("Error in verificarStatusSolicitacao:", error)
    return { status: "erro" }
  }
}

// Responder a uma solicitação (aceitar ou recusar)
export const responderSolicitacao = async (
  id: number,
  resposta: "aceito" | "recusado",
  dadosMotorista: any = null,
): Promise<{ sucesso: boolean; mensagem?: string }> => {
  try {
    const updates: any = { status: resposta }

    if (dadosMotorista) {
      // Get current solicitacao
      const { data: currentData } = await supabase.from("solicitacoes").select("motorista").eq("id", id).single()

      if (currentData) {
        updates.motorista = {
          ...currentData.motorista,
          ...dadosMotorista,
        }
      }
    }

    const { error } = await supabase.from("solicitacoes").update(updates).eq("id", id)

    if (error) {
      console.error("Error responding to solicitacao:", error)
      return { sucesso: false, mensagem: "Erro ao responder solicitação" }
    }

    // Disparar evento para notificar o cliente quando a corrida for aceita
    if (resposta === "aceito" && typeof window !== "undefined") {
      const evento = new CustomEvent("corrida_aceita", {
        detail: { id, motorista: dadosMotorista },
      })
      window.dispatchEvent(evento)
    }

    return { sucesso: true }
  } catch (error) {
    console.error("Error in responderSolicitacao:", error)
    return { sucesso: false, mensagem: "Erro ao processar resposta" }
  }
}

// Cancelar uma solicitação
export const cancelarSolicitacao = async (
  id: number,
): Promise<{
  sucesso: boolean
  mensagem?: string
}> => {
  try {
    const { error } = await supabase.from("solicitacoes").delete().eq("id", id)

    if (error) {
      console.error("Error canceling solicitacao:", error)
      return { sucesso: false, mensagem: "Erro ao cancelar solicitação" }
    }

    // Dispatch event to notify the driver of cancellation
    if (typeof window !== "undefined") {
      const evento = new CustomEvent("solicitacao_cancelada", {
        detail: { id },
      })
      window.dispatchEvent(evento)
    }

    return { sucesso: true }
  } catch (error) {
    console.error("Error in cancelarSolicitacao:", error)
    return { sucesso: false, mensagem: "Erro ao processar cancelamento" }
  }
}

// Obter solicitações pendentes para um motorista
export const obterSolicitacoesPendentes = async (motoristaId: number): Promise<any[]> => {
  try {
    const { data, error } = await supabase
      .from("solicitacoes")
      .select("*")
      .eq("status", "pendente")
      .filter("motorista->id", "eq", motoristaId)

    if (error) {
      console.error("Error fetching pending solicitacoes:", error)
      return []
    }

    return data || []
  } catch (error) {
    console.error("Error in obterSolicitacoesPendentes:", error)
    return []
  }
}

// Notificar que o motorista chegou ao local
export const notificarChegadaMotorista = async (
  id: number,
): Promise<{
  sucesso: boolean
  mensagem?: string
}> => {
  try {
    console.log("Notificando chegada do motorista para solicitação:", id)

    // Primeiro, obter a solicitação atual para acessar o objeto motorista
    const { data: solicitacao, error: fetchError } = await supabase
      .from("solicitacoes")
      .select("*")
      .eq("id", id)
      .single()

    if (fetchError) {
      console.error("Error fetching solicitacao:", fetchError)
      return { sucesso: false, mensagem: "Erro ao buscar solicitação" }
    }

    // Extrair o objeto motorista atual
    let motorista = solicitacao.motorista
    if (typeof motorista === "string") {
      try {
        motorista = JSON.parse(motorista)
      } catch (e) {
        console.error("Error parsing motorista JSON:", e)
        motorista = {}
      }
    }

    // Atualizar o objeto motorista com as informações de chegada
    const motoristaAtualizado = {
      ...motorista,
      status: "chegou",
      chegou_timestamp: new Date().toISOString(),
    }

    // Atualizar a solicitação com o objeto motorista modificado
    const { error: updateError } = await supabase
      .from("solicitacoes")
      .update({
        motorista: motoristaAtualizado,
      })
      .eq("id", id)

    if (updateError) {
      console.error("Error notifying arrival:", updateError)
      return { sucesso: false, mensagem: "Erro ao notificar chegada" }
    }

    // Disparar evento para notificar o cliente
    if (typeof window !== "undefined") {
      console.log("Disparando evento motorista_chegou para ID:", id)

      // Usar setTimeout para garantir que o evento seja disparado após a atualização do banco de dados
      setTimeout(() => {
        try {
          const evento = new CustomEvent("motorista_chegou", {
            detail: { id },
          })
          window.dispatchEvent(evento)
          console.log("Motorista: Evento motorista_chegou disparado com sucesso")
        } catch (e) {
          console.error("Erro ao disparar evento motorista_chegou:", e)
        }
      }, 100)
    }

    return { sucesso: true }
  } catch (error) {
    console.error("Error in notificarChegadaMotorista:", error)
    return { sucesso: false, mensagem: "Erro ao processar notificação de chegada" }
  }
}

// Finalizar uma corrida e notificar o cliente
export const finalizarCorrida = async (
  id: number,
): Promise<{
  sucesso: boolean
  mensagem?: string
}> => {
  try {
    // Primeiro, obter a solicitação atual para acessar os dados do motorista
    const { data: solicitacao, error: fetchError } = await supabase
      .from("solicitacoes")
      .select("*")
      .eq("id", id)
      .single()

    if (fetchError) {
      console.error("Error fetching solicitacao:", fetchError)
      return { sucesso: false, mensagem: "Erro ao buscar solicitação" }
    }

    // Atualizar o status da solicitação para finalizada
    const { data, error } = await supabase.from("solicitacoes").update({ status: "finalizada" }).eq("id", id).select()

    if (error) {
      console.error("Error finalizing corrida:", error)
      return { sucesso: false, mensagem: "Erro ao finalizar corrida" }
    }

    // Extrair o objeto motorista
    let motorista = solicitacao.motorista
    if (typeof motorista === "string") {
      try {
        motorista = JSON.parse(motorista)
      } catch (e) {
        console.error("Error parsing motorista JSON:", e)
        motorista = {}
      }
    }

    // Dispatch event to notify the client of completion
    if (typeof window !== "undefined" && data && data[0]) {
      const evento = new CustomEvent("corrida_finalizada", {
        detail: { id, motorista, solicitacao: data[0] },
      })
      window.dispatchEvent(evento)

      // Notificar o cliente sobre a finalização da corrida
      if (motorista && motorista.nome) {
        notificationService.notifyRideCompleted(motorista.nome)
      }
    }

    return { sucesso: true }
  } catch (error) {
    console.error("Error in finalizarCorrida:", error)
    return { sucesso: false, mensagem: "Erro ao processar finalização" }
  }
}

// Adicionar função para salvar avaliação do motorista
export const avaliarMotorista = async (
  motoristaId: number,
  avaliacao: {
    estrelas: number
    comentario: string
  },
): Promise<{
  sucesso: boolean
  mensagem?: string
}> => {
  try {
    // Buscar avaliação atual do motorista
    const { data: motoristaDados, error: motoristaError } = await supabase
      .from("drivers")
      .select("id, avaliacao, avaliacoes_total")
      .eq("id", motoristaId)
      .single()

    if (motoristaError) {
      console.error("Error fetching driver data:", motoristaError)
      return { sucesso: false, mensagem: "Erro ao buscar dados do motorista" }
    }

    // Calcular nova avaliação média
    const avaliacoesTotal = (motoristaDados.avaliacoes_total || 0) + 1
    const avaliacaoAtual = motoristaDados.avaliacao || 5
    const novaAvaliacao = (avaliacaoAtual * (avaliacoesTotal - 1) + avaliacao.estrelas) / avaliacoesTotal

    // Atualizar avaliação do motorista
    const { error: driverUpdateError } = await supabase
      .from("drivers")
      .update({
        avaliacao: novaAvaliacao,
        avaliacoes_total: avaliacoesTotal,
      })
      .eq("id", motoristaId)

    if (driverUpdateError) {
      console.error("Error updating driver rating:", driverUpdateError)
      return { sucesso: false, mensagem: "Erro ao atualizar avaliação do motorista" }
    }

    // Registrar a avaliação no histórico
    const { error: avaliacaoError } = await supabase.from("avaliacoes").insert([
      {
        motorista_id: motoristaId,
        estrelas: avaliacao.estrelas,
        comentario: avaliacao.comentario,
        data: new Date().toISOString(),
      },
    ])

    if (avaliacaoError) {
      console.error("Error saving rating:", avaliacaoError)
      // Não retornar erro aqui, pois a avaliação já foi atualizada no motorista
      // Apenas registrar o erro
    }

    return { sucesso: true }
  } catch (error) {
    console.error("Error in avaliarMotorista:", error)
    return { sucesso: false, mensagem: "Erro ao processar avaliação" }
  }
}
