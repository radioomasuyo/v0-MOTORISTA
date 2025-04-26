"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { notificationService } from "@/services/notificationService"
import { toast } from "@/hooks/use-toast"
import { supabase } from "@/lib/supabase"
import { notificarChegadaMotorista } from "@/services/solicitacaoService"
import MotoristaChegouAnimacao from "@/components/MotoristaChegouAnimacao"

export default function TestNotificacaoChegada() {
  const [solicitacaoId, setSolicitacaoId] = useState<number | null>(null)
  const [motoristaNome, setMotoristaNome] = useState("João Motorista")
  const [clienteNome, setClienteNome] = useState("Maria Cliente")
  const [status, setStatus] = useState<string>("inicial")
  const [loading, setLoading] = useState(false)
  const [motoristaChegou, setMotoristaChegou] = useState(false)
  const [logs, setLogs] = useState<string[]>([])

  // Adicionar log
  const addLog = (message: string) => {
    setLogs((prevLogs) => [...prevLogs, `${new Date().toLocaleTimeString()}: ${message}`])
  }

  // Limpar logs
  const clearLogs = () => {
    setLogs([])
  }

  // Inicializar notificações
  useEffect(() => {
    notificationService.requestPermission().then(() => {
      addLog("Permissões de notificação solicitadas")
    })

    // Adicionar listener para o evento de chegada do motorista
    const handleMotoristaChegou = (event: CustomEvent) => {
      const { id } = event.detail
      addLog(`Evento motorista_chegou recebido para solicitação ${id}`)
      setMotoristaChegou(true)

      // Notificar o cliente
      notificationService.notifyDriverArrived(motoristaNome)
      addLog("Notificação de chegada do motorista enviada")
    }

    window.addEventListener("motorista_chegou", handleMotoristaChegou as EventListener)

    return () => {
      window.removeEventListener("motorista_chegou", handleMotoristaChegou as EventListener)
    }
  }, [motoristaNome])

  // Criar uma solicitação de teste
  const criarSolicitacao = async () => {
    setLoading(true)
    clearLogs()
    setMotoristaChegou(false)
    setStatus("criando")
    addLog("Criando solicitação de teste...")

    try {
      // Criar cliente de teste
      const cliente = {
        nome: clienteNome,
        telefone: "(11)99999-9999",
        localizacao: "Rua de Teste, 123",
        coordenadas: {
          latitude: -23.5505,
          longitude: -46.6333,
        },
      }

      // Criar solicitação
      const { data, error } = await supabase
        .from("solicitacoes")
        .insert([
          {
            cliente,
            motorista: {},
            destino: "Destino de Teste",
            status: "pendente",
            timestamp: new Date().toISOString(),
          },
        ])
        .select()

      if (error) {
        throw error
      }

      if (data && data.length > 0) {
        const id = data[0].id
        setSolicitacaoId(id)
        setStatus("criada")
        addLog(`Solicitação criada com ID: ${id}`)

        // Aceitar a solicitação automaticamente
        aceitarSolicitacao(id)
      }
    } catch (error) {
      console.error("Erro ao criar solicitação:", error)
      addLog(`Erro ao criar solicitação: ${error}`)
      toast({
        title: "Erro",
        description: "Não foi possível criar a solicitação de teste",
        variant: "destructive",
      })
      setStatus("erro")
    } finally {
      setLoading(false)
    }
  }

  // Aceitar a solicitação
  const aceitarSolicitacao = async (id: number) => {
    setLoading(true)
    setStatus("aceitando")
    addLog("Aceitando solicitação...")

    try {
      // Informações do motorista
      const motoristaInfo = {
        id: 999,
        nome: motoristaNome,
        foto: "/delivery-driver-city.png",
        veiculo: "Carro Teste",
        placa: "ABC-1234",
        telefone: "(11)88888-8888",
        tempoEspera: 5,
        coordenadas: {
          latitude: -23.5605,
          longitude: -46.6433,
        },
      }

      // Atualizar solicitação
      const { error } = await supabase
        .from("solicitacoes")
        .update({
          motorista: motoristaInfo,
          status: "aceito",
        })
        .eq("id", id)

      if (error) {
        throw error
      }

      setStatus("aceita")
      addLog("Solicitação aceita pelo motorista")

      // Disparar evento para notificar o cliente
      if (typeof window !== "undefined") {
        const evento = new CustomEvent("corrida_aceita", {
          detail: {
            id,
            motorista: motoristaInfo,
            tempoEstimado: 5,
          },
        })
        window.dispatchEvent(evento)
        addLog("Evento corrida_aceita disparado")
      }

      toast({
        title: "Solicitação aceita",
        description: "A solicitação foi aceita pelo motorista",
        variant: "success",
      })
    } catch (error) {
      console.error("Erro ao aceitar solicitação:", error)
      addLog(`Erro ao aceitar solicitação: ${error}`)
      toast({
        title: "Erro",
        description: "Não foi possível aceitar a solicitação",
        variant: "destructive",
      })
      setStatus("erro")
    } finally {
      setLoading(false)
    }
  }

  // Notificar chegada do motorista
  const notificarChegada = async () => {
    if (!solicitacaoId) return

    setLoading(true)
    setStatus("notificando")
    addLog("Notificando chegada do motorista...")

    try {
      // Usar o serviço para notificar a chegada
      const { sucesso, mensagem } = await notificarChegadaMotorista(solicitacaoId)

      if (!sucesso) {
        throw new Error(mensagem || "Erro ao notificar chegada")
      }

      setStatus("chegou")
      addLog("Notificação de chegada enviada com sucesso")

      toast({
        title: "Motorista chegou",
        description: "A notificação de chegada foi enviada com sucesso",
        variant: "success",
      })
    } catch (error) {
      console.error("Erro ao notificar chegada:", error)
      addLog(`Erro ao notificar chegada: ${error}`)
      toast({
        title: "Erro",
        description: "Não foi possível notificar a chegada do motorista",
        variant: "destructive",
      })
      setStatus("erro")
    } finally {
      setLoading(false)
    }
  }

  // Finalizar a corrida
  const finalizarCorrida = async () => {
    if (!solicitacaoId) return

    setLoading(true)
    setStatus("finalizando")
    addLog("Finalizando corrida...")

    try {
      const { error } = await supabase.from("solicitacoes").update({ status: "finalizada" }).eq("id", solicitacaoId)

      if (error) {
        throw error
      }

      // Disparar evento para notificar o cliente
      if (typeof window !== "undefined") {
        const evento = new CustomEvent("corrida_finalizada", {
          detail: {
            id: solicitacaoId,
            motorista: {
              id: 999,
              nome: motoristaNome,
              foto: "/delivery-driver-city.png",
            },
          },
        })
        window.dispatchEvent(evento)
        addLog("Evento corrida_finalizada disparado")
      }

      setSolicitacaoId(null)
      setStatus("finalizada")
      setMotoristaChegou(false)
      addLog("Corrida finalizada com sucesso")

      toast({
        title: "Corrida finalizada",
        description: "A corrida foi finalizada com sucesso",
        variant: "success",
      })
    } catch (error) {
      console.error("Erro ao finalizar corrida:", error)
      addLog(`Erro ao finalizar corrida: ${error}`)
      toast({
        title: "Erro",
        description: "Não foi possível finalizar a corrida",
        variant: "destructive",
      })
      setStatus("erro")
    } finally {
      setLoading(false)
    }
  }

  // Limpar tudo
  const limparTudo = async () => {
    if (solicitacaoId) {
      try {
        await supabase.from("solicitacoes").delete().eq("id", solicitacaoId)
        addLog(`Solicitação ${solicitacaoId} removida do banco de dados`)
      } catch (error) {
        console.error("Erro ao limpar solicitação:", error)
        addLog(`Erro ao limpar solicitação: ${error}`)
      }
    }

    setSolicitacaoId(null)
    setStatus("inicial")
    setMotoristaChegou(false)
    clearLogs()
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Teste de Notificação de Chegada do Motorista</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Motorista</label>
              <input
                type="text"
                value={motoristaNome}
                onChange={(e) => setMotoristaNome(e.target.value)}
                className="w-full p-2 border rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Cliente</label>
              <input
                type="text"
                value={clienteNome}
                onChange={(e) => setClienteNome(e.target.value)}
                className="w-full p-2 border rounded"
              />
            </div>
          </div>

          <div className="bg-gray-100 p-3 rounded">
            <p className="font-medium">
              Status atual: <span className="font-bold">{status}</span>
            </p>
            {solicitacaoId && (
              <p className="text-sm mt-1">
                ID da solicitação: <span className="font-mono">{solicitacaoId}</span>
              </p>
            )}
          </div>

          {motoristaChegou && (
            <div className="border border-green-200 rounded-lg overflow-hidden">
              <MotoristaChegouAnimacao />
            </div>
          )}
        </CardContent>
        <CardFooter className="flex flex-col space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full">
            <Button
              onClick={criarSolicitacao}
              disabled={loading || status === "criada" || status === "aceita" || status === "chegou"}
            >
              1. Criar Solicitação
            </Button>
            <Button
              onClick={() => solicitacaoId && notificarChegada()}
              disabled={loading || !solicitacaoId || status !== "aceita"}
              className="bg-green-600 hover:bg-green-700"
            >
              2. Notificar Chegada
            </Button>
            <Button
              onClick={() => solicitacaoId && finalizarCorrida()}
              disabled={loading || !solicitacaoId || status !== "chegou"}
              className="bg-blue-600 hover:bg-blue-700"
            >
              3. Finalizar Corrida
            </Button>
            <Button onClick={limparTudo} variant="outline" className="border-red-300 text-red-600 hover:bg-red-50">
              Limpar Tudo
            </Button>
          </div>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Logs de Teste</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-gray-900 text-gray-100 p-4 rounded font-mono text-sm h-64 overflow-y-auto">
            {logs.length === 0 ? (
              <p className="text-gray-500">Nenhum log disponível. Inicie o teste para ver os logs.</p>
            ) : (
              logs.map((log, index) => (
                <div key={index} className="mb-1">
                  {log}
                </div>
              ))
            )}
          </div>
        </CardContent>
        <CardFooter>
          <Button variant="outline" onClick={clearLogs} size="sm">
            Limpar Logs
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
