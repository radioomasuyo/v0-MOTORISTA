"use client"

import type React from "react"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Send, MapPin, Search, Loader2, Phone, X, Users, Car } from "lucide-react"
import Link from "next/link"
import { geocodeAddress } from "@/lib/distance-service"
import NotificationControl from "@/components/NotificationControl"
import { notificationService } from "@/services/notificationService"
import { toast } from "@/hooks/use-toast"
import BuscandoMotoristaAnimacao from "@/components/BuscandoMotoristaAnimacao"
import MotoristaChegouAnimacao from "@/components/MotoristaChegouAnimacao"
import AvaliacaoMotorista from "@/components/AvaliacaoMotorista"
import { supabase } from "@/lib/supabase"

type Destino = {
  id: number
  nome: string
  endereco: string
}

type MotoristaAceito = {
  id: number
  nome: string
  foto: string
  veiculo: string
  placa: string
  tempoEspera: number
  telefone?: string
}

type Coordenadas = {
  latitude: number
  longitude: number
}

type CorridaFinalizadaType = {
  id: number
  motorista: {
    id: number
    nome: string
    foto: string
  }
} | null

// Coordenadas simuladas para quando a geolocalização não estiver disponível
const COORDENADAS_SIMULADAS: Coordenadas = {
  latitude: -23.5505, // Coordenadas de São Paulo como exemplo
  longitude: -46.6333,
}

// Chave para armazenar a solicitação no localStorage
const SOLICITACAO_KEY = "jamal_express_solicitacao_cliente"

export default function ClientePage() {
  const router = useRouter()
  const [nome, setNome] = useState("")
  const [telefone, setTelefone] = useState("")
  const [rua, setRua] = useState("")
  const [numero, setNumero] = useState("")
  const [cep, setCep] = useState("")
  const [coordenadas, setCoordenadas] = useState<Coordenadas>(COORDENADAS_SIMULADAS)
  const [destinoId, setDestinoId] = useState("")
  const [destinos, setDestinos] = useState<Destino[]>([])
  const [solicitacaoEnviada, setSolicitacaoEnviada] = useState(false)
  const [solicitacaoId, setSolicitacaoId] = useState<number | null>(null)
  const [motoristaAceito, setMotoristaAceito] = useState<MotoristaAceito | null>(null)
  const [carregando, setCarregando] = useState(false)
  const [carregandoCep, setCarregandoCep] = useState(false)
  const [cancelando, setCancelando] = useState(false)
  const [erro, setErro] = useState("")
  const [motoristasOnline, setMotoristasOnline] = useState(0)
  const [motoristasVerificados, setMotoristasVerificados] = useState(false)
  const [mostrarAvaliacao, setMostrarAvaliacao] = useState(false)
  const [corridaFinalizada, setCorridaFinalizada] = useState<CorridaFinalizadaType>(null)
  const [motoristaChegou, setMotoristaChegou] = useState(false)
  const [notificationsInitialized, setNotificationsInitialized] = useState(false)
  const [isMounted, setIsMounted] = useState(false)

  // Função para obter o primeiro nome
  const getPrimeiroNome = (nomeCompleto: string) => {
    return nomeCompleto.split(" ")[0]
  }

  // Verificar status da solicitação periodicamente
  const checkSolicitacao = useCallback(async () => {
    if (!solicitacaoId || typeof window === "undefined") return

    try {
      const { data, error } = await supabase.from("solicitacoes").select("*").eq("id", solicitacaoId).single()

      if (error) {
        console.error("Erro ao verificar solicitação:", error)
        return
      }

      if (data && data.status === "aceito" && data.motorista) {
        // Motorista aceitou a corrida
        const motorista = typeof data.motorista === "string" ? JSON.parse(data.motorista) : data.motorista

        // Verificar se já temos um motorista aceito (para evitar notificações duplicadas)
        if (!motoristaAceito && notificationsInitialized) {
          notificationService.notifyRideAccepted(motorista.nome, motorista.tempoEspera || 5)
        }

        setMotoristaAceito({
          id: motorista.id,
          nome: motorista.nome,
          foto: motorista.foto || "/placeholder.svg?height=100&width=100",
          veiculo: motorista.veiculo,
          placa: motorista.placa,
          tempoEspera: motorista.tempoEspera || 5, // Tempo padrão se não for fornecido
          telefone: motorista.telefone,
        })

        // Verificar se o motorista chegou - verificando o status dentro do objeto motorista
        if (motorista.status === "chegou" && !motoristaChegou) {
          console.log("Cliente: Motorista chegou (verificação periódica)", motorista)
          setMotoristaChegou(true)

          // Notificar o cliente
          if (notificationsInitialized) {
            console.log("Cliente: Enviando notificação de chegada")
            notificationService.notify({
              title: "Motorista chegou!",
              body: `${getPrimeiroNome(motorista.nome)} chegou ao local de embarque.`,
              type: "success",
              sound: true,
              vibrate: true,
            })

            // Também chamar a função específica para notificação de chegada
            notificationService.notifyDriverArrived(getPrimeiroNome(motorista.nome))
          }
        }
      } else if (data && data.status === "recusado_por_motorista") {
        // Se todos os motoristas recusaram, permitir nova solicitação
        setSolicitacaoEnviada(false)
        setSolicitacaoId(null)
        localStorage.removeItem(SOLICITACAO_KEY)
        setErro("Todos os motoristas estão ocupados no momento. Por favor, tente novamente.")
      }
    } catch (error) {
      console.error("Erro ao verificar solicitação:", error)
    }
  }, [solicitacaoId, motoristaAceito, notificationsInitialized, motoristaChegou])

  // Marcar componente como montado para evitar problemas de hidratação
  useEffect(() => {
    setIsMounted(true)
    console.log("Componente montado")
  }, [])

  // Inicializar notificações
  useEffect(() => {
    if (!notificationsInitialized && typeof window !== "undefined") {
      // Solicitar permissão para notificações quando a página carregar
      notificationService.requestPermission().then(() => {
        setNotificationsInitialized(true)
        console.log("Notificações inicializadas")
      })
    }
  }, [notificationsInitialized])

  // Verificar se há uma solicitação salva no localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const solicitacaoSalva = localStorage.getItem(SOLICITACAO_KEY)
      if (solicitacaoSalva) {
        try {
          const solicitacaoData = JSON.parse(solicitacaoSalva)
          // Verificar se a solicitação ainda está ativa
          verificarSolicitacaoSalva(solicitacaoData.id)
        } catch (error) {
          console.error("Erro ao carregar solicitação salva:", error)
          localStorage.removeItem(SOLICITACAO_KEY)
        }
      }
    }
  }, [])

  // Verificar quantos motoristas estão online
  const verificarMotoristasOnline = useCallback(async () => {
    if (typeof window === "undefined") return

    try {
      // Simplificar a consulta para evitar problemas com o cliente simulado
      const { data, error } = await supabase.from("drivers").select("id").eq("status", "online")

      if (error) {
        console.error("Erro ao verificar motoristas online:", error)
        return
      }

      setMotoristasOnline(data?.length || 0)
      setMotoristasVerificados(true)
    } catch (error) {
      console.error("Erro ao verificar motoristas online:", error)
    }
  }, [])

  // Buscar motoristas online ao carregar a página
  useEffect(() => {
    if (typeof window === "undefined") return

    verificarMotoristasOnline()

    // Verificar periodicamente
    const interval = setInterval(verificarMotoristasOnline, 30000) // a cada 30 segundos

    return () => clearInterval(interval)
  }, [verificarMotoristasOnline])

  // Verificar se uma solicitação salva ainda está ativa
  const verificarSolicitacaoSalva = async (id: number) => {
    if (typeof window === "undefined") return

    try {
      const { data, error } = await supabase.from("solicitacoes").select("*").eq("id", id).single()

      if (error || !data) {
        // Solicitação não encontrada ou não está mais ativa
        localStorage.removeItem(SOLICITACAO_KEY)
        return
      }

      // Verificar se a solicitação foi cancelada ou finalizada
      if (data.status === "cancelado" || data.status === "finalizada" || data.status === "recusado_por_motorista") {
        localStorage.removeItem(SOLICITACAO_KEY)
        return
      }

      // Restaurar o estado da solicitação
      setSolicitacaoId(data.id)
      setSolicitacaoEnviada(true)

      // Se a solicitação foi aceita por um motorista
      if (data.status === "aceito" && data.motorista) {
        const motorista = typeof data.motorista === "string" ? JSON.parse(data.motorista) : data.motorista
        setMotoristaAceito({
          id: motorista.id,
          nome: motorista.nome,
          foto: motorista.foto || "/placeholder.svg?height=100&width=100",
          veiculo: motorista.veiculo,
          placa: motorista.placa,
          tempoEspera: motorista.tempoEspera || 5,
          telefone: motorista.telefone,
        })

        // Verificar se o motorista já chegou
        if (data.motorista_chegou) {
          console.log("Motorista já chegou (verificação inicial)")
          setMotoristaChegou(true)

          // Notificar o cliente se ainda não foi notificado
          if (notificationsInitialized && !motoristaChegou) {
            notificationService.notify({
              title: "Motorista chegou!",
              body: `${getPrimeiroNome(motorista.nome)} chegou ao local de embarque.`,
              type: "success",
              sound: true,
            })
          }
        }
      }
    } catch (error) {
      console.error("Erro ao verificar solicitação salva:", error)
      localStorage.removeItem(SOLICITACAO_KEY)
    }
  }

  // Buscar destinos do banco de dados
  useEffect(() => {
    if (typeof window === "undefined") return

    const fetchDestinos = async () => {
      try {
        const { data, error } = await supabase
          .from("destinos")
          .select("id, nome, endereco")
          .eq("ativo", true)
          .order("nome")

        if (error) {
          console.error("Erro ao buscar destinos:", error)
          setErro("Não foi possível carregar os destinos. Tente novamente.")
        } else {
          setDestinos(data || [])
        }
      } catch (error) {
        console.error("Erro ao buscar destinos:", error)
        setErro("Não foi possível carregar os destinos. Tente novamente.")
      }
    }

    fetchDestinos()
  }, [])

  // Adicionar listeners para eventos do motorista
  useEffect(() => {
    if (typeof window === "undefined") return

    // Evento quando o motorista aceita a corrida
    const handleCorridaAceita = (event: CustomEvent) => {
      const { id, motorista, tempoEstimado } = event.detail

      // Verificar se a solicitação é para este cliente
      if (solicitacaoId && id === solicitacaoId) {
        setMotoristaAceito({
          id: motorista.id,
          nome: motorista.nome,
          foto: motorista.foto || "/placeholder.svg?height=100&width=100",
          veiculo: motorista.veiculo,
          placa: motorista.placa,
          tempoEspera: tempoEstimado,
          telefone: motorista.telefone,
        })

        // Notificar o cliente
        if (notificationsInitialized) {
          notificationService.notifyRideAccepted(motorista.nome, tempoEstimado)
        }
      }
    }

    // Evento quando o motorista chega ao local
    const handleMotoristaChegou = (event: CustomEvent) => {
      const { id } = event.detail
      console.log("Cliente: Evento motorista_chegou recebido", id, solicitacaoId)

      // Verificar se a solicitação é para este cliente
      if (solicitacaoId && id === solicitacaoId) {
        console.log("Cliente: Motorista chegou! Atualizando estado...")

        // Atualizar o estado para mostrar que o motorista chegou
        setMotoristaChegou(true)

        // Notificar o cliente
        if (notificationsInitialized && motoristaAceito) {
          try {
            console.log("Cliente: Enviando notificação de chegada do motorista")

            // Usar ambos os métodos de notificação para garantir que pelo menos um funcione
            notificationService.notify({
              title: "Motorista chegou!",
              body: `${getPrimeiroNome(motoristaAceito.nome)} chegou ao local de embarque.`,
              type: "success",
              sound: true,
              vibrate: true,
            })

            notificationService.notifyDriverArrived(getPrimeiroNome(motoristaAceito.nome))
            console.log("Cliente: Notificação enviada com sucesso")
          } catch (error) {
            console.error("Cliente: Erro ao enviar notificação:", error)
          }
        }

        // Forçar uma atualização da interface
        setTimeout(() => {
          console.log("Cliente: Estado atualizado, motoristaChegou =", true)
        }, 100)
      }
    }

    // Evento quando o motorista finaliza a corrida
    const handleCorridaFinalizada = (event: CustomEvent) => {
      const { id, motorista } = event.detail

      // Verificar se a solicitação é para este cliente
      if (solicitacaoId && id === solicitacaoId) {
        setCorridaFinalizada({
          id: id,
          motorista: {
            id: motorista.id,
            nome: motorista.nome,
            foto: motorista.foto || "/placeholder.svg?height=100&width=100",
          },
        })

        setMostrarAvaliacao(true)

        // Notificar o cliente
        if (notificationsInitialized) {
          notificationService.notify({
            title: "Corrida finalizada",
            body: "Sua corrida foi finalizada. Por favor, avalie o motorista.",
            type: "success",
            sound: true,
          })
        }

        // Limpar solicitação
        setSolicitacaoEnviada(false)
        setSolicitacaoId(null)
        setMotoristaAceito(null)
        setMotoristaChegou(false)

        // Remover do localStorage
        localStorage.removeItem(SOLICITACAO_KEY)
      }
    }

    // Adicionar listeners para os eventos
    window.addEventListener("corrida_aceita", handleCorridaAceita as EventListener)
    window.addEventListener("motorista_chegou", handleMotoristaChegou as EventListener)
    window.addEventListener("corrida_finalizada", handleCorridaFinalizada as EventListener)

    // Log para confirmar que os listeners foram adicionados
    console.log("Cliente: Listeners de eventos adicionados", { solicitacaoId })

    // Remover listeners quando o componente for desmontado
    return () => {
      window.removeEventListener("corrida_aceita", handleCorridaAceita as EventListener)
      window.removeEventListener("motorista_chegou", handleMotoristaChegou as EventListener)
      window.removeEventListener("corrida_finalizada", handleCorridaFinalizada as EventListener)
      console.log("Cliente: Listeners de eventos removidos")
    }
  }, [solicitacaoId, notificationsInitialized, motoristaAceito, getPrimeiroNome])

  // Verificar status da solicitação periodicamente
  useEffect(() => {
    if (!solicitacaoId || typeof window === "undefined") return

    console.log("Cliente: Iniciando verificação periódica da solicitação", solicitacaoId)

    // Verificar imediatamente
    checkSolicitacao()

    const interval = setInterval(checkSolicitacao, 3000) // Verificar a cada 3 segundos
    return () => clearInterval(interval)
  }, [solicitacaoId, checkSolicitacao])

  // Função para buscar endereço por CEP
  const buscarEnderecoPorCep = async () => {
    if (!cep || cep.length < 8) {
      setErro("Por favor, informe um CEP válido.")
      return
    }

    setCarregandoCep(true)
    setErro("")

    try {
      // Remover caracteres não numéricos do CEP
      const cepLimpo = cep.replace(/\D/g, "")

      // Buscar endereço na API ViaCEP
      const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`)
      const data = await response.json()

      if (data.erro) {
        setErro("CEP não encontrado. Verifique o número e tente novamente.")
      } else {
        // Preencher os campos com os dados retornados
        setRua(data.logradouro || "")

        // Tentar obter coordenadas do endereço para cálculo de distância
        const endereco = `${data.logradouro}, ${data.localidade} - ${data.uf}, ${data.cep}`
        const coords = await geocodeAddress(endereco)
        if (coords) {
          setCoordenadas(coords)
        }
      }
    } catch (error) {
      console.error("Erro ao buscar CEP:", error)
      setErro("Ocorreu um erro ao buscar o CEP. Tente novamente.")
    } finally {
      setCarregandoCep(false)
    }
  }

  // Função para enviar solicitação
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!nome || !telefone || !rua || !numero || !destinoId) {
      setErro("Por favor, preencha todos os campos obrigatórios.")
      return
    }

    setCarregando(true)
    setErro("")

    try {
      // Encontrar o destino selecionado
      const destino = destinos.find((d) => d.id.toString() === destinoId)
      if (!destino) throw new Error("Destino não encontrado")

      // Montar o endereço completo
      const enderecoCompleto = `${rua}, ${numero}${cep ? `, CEP: ${cep}` : ""}`

      // Criar objeto cliente com coordenadas
      const cliente = {
        nome,
        telefone,
        localizacao: enderecoCompleto,
        coordenadas: coordenadas,
      }

      // Buscar motoristas online
      const { data: motoristasOnline } = await supabase
        .from("drivers")
        .select("*")
        .eq("status", "online")
        .eq("ativo", true)

      if (!motoristasOnline || motoristasOnline.length === 0) {
        setErro("Não há motoristas disponíveis no momento. Tente novamente mais tarde.")
        setCarregando(false)
        return
      }

      // Criar solicitação
      const { data, error } = await supabase
        .from("solicitacoes")
        .insert([
          {
            cliente: cliente,
            motorista: {}, // Será preenchido quando um motorista aceitar
            destino: destino.nome, // Armazenar apenas o nome do destino
            status: "pendente",
            timestamp: new Date().toISOString(),
          },
        ])
        .select()

      if (error) throw error

      if (data && data.length > 0) {
        const solicitacaoId = data[0].id
        setSolicitacaoId(solicitacaoId)
        setSolicitacaoEnviada(true)

        // Salvar no localStorage
        if (typeof window !== "undefined") {
          localStorage.setItem(
            SOLICITACAO_KEY,
            JSON.stringify({
              id: solicitacaoId,
              timestamp: new Date().toISOString(),
            }),
          )
        }

        // Enviar notificação de solicitação enviada
        if (notificationsInitialized) {
          notificationService.notifyRideRequested()
        }
      }
    } catch (error) {
      console.error("Erro ao enviar solicitação:", error)
      setErro("Ocorreu um erro ao enviar sua solicitação. Tente novamente.")
    } finally {
      setCarregando(false)
    }
  }

  // Função para cancelar a solicitação
  const handleCancelarSolicitacao = async () => {
    if (!solicitacaoId) return

    setCancelando(true)
    setErro("")

    try {
      const { error } = await supabase.from("solicitacoes").update({ status: "cancelado" }).eq("id", solicitacaoId)

      if (error) throw error

      // Limpar estados
      setSolicitacaoEnviada(false)
      setSolicitacaoId(null)
      setMotoristaAceito(null)
      setMotoristaChegou(false)

      // Remover do localStorage
      if (typeof window !== "undefined") {
        localStorage.removeItem(SOLICITACAO_KEY)
      }

      toast({
        title: "Solicitação cancelada",
        description: "Sua solicitação foi cancelada com sucesso",
        variant: "info",
      })
    } catch (error) {
      console.error("Erro ao cancelar solicitação:", error)
      setErro("Ocorreu um erro ao cancelar sua solicitação. Tente novamente.")
    } finally {
      setCancelando(false)
    }
  }

  // Função para formatar o CEP enquanto o usuário digita
  const formatarCep = (valor: string) => {
    // Remove caracteres não numéricos
    valor = valor.replace(/\D/g, "")

    // Limita a 8 dígitos
    valor = valor.slice(0, 8)

    // Formata como 00000-000
    if (valor.length > 5) {
      valor = `${valor.slice(0, 5)}-${valor.slice(5)}`
    }

    setCep(valor)
  }

  // Função para formatar o telefone enquanto o usuário digita
  const formatarTelefone = (valor: string) => {
    // Remove caracteres não numéricos
    valor = valor.replace(/\D/g, "")

    // Limita a 11 dígitos (DDD + número)
    valor = valor.slice(0, 11)

    // Formata como (11)00000-0000
    if (valor.length > 0) {
      // Adiciona parênteses no DDD
      if (valor.length <= 2) {
        valor = `(${valor}`
      } else {
        valor = `(${valor.slice(0, 2)})${valor.slice(2)}`
      }

      // Adiciona o hífen
      if (valor.length > 8) {
        if (valor.length <= 13) {
          // (XX)XXXXX-XXXX
          valor = `${valor.slice(0, 9)}-${valor.slice(9)}`
        }
      }
    }

    setTelefone(valor)
  }

  // Função para abrir o WhatsApp do motorista
  const abrirWhatsApp = (telefone: string) => {
    if (typeof window === "undefined") return

    // Remover caracteres não numéricos
    const numeroLimpo = telefone.replace(/\D/g, "")

    // Criar URL do WhatsApp
    const url = `https://wa.me/55${numeroLimpo}`

    // Abrir em nova aba
    window.open(url, "_blank")
  }

  // Adicionar função para lidar com a conclusão da avaliação
  const handleAvaliacaoCompleta = () => {
    setMostrarAvaliacao(false)
    setCorridaFinalizada(null)
    router.push("/")
  }

  // Modificar o return do componente para incluir a tela de avaliação
  // Adicione esta condição antes do return principal
  if (mostrarAvaliacao && corridaFinalizada) {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col">
        <header className="bg-blue-500 p-4 text-white flex items-center justify-between shadow-md">
          <div className="flex items-center">
            <Link href="/" className="mr-4">
              <ArrowLeft size={24} />
            </Link>
            <h1 className="text-xl font-bold">Avaliação da Corrida</h1>
          </div>
          <NotificationControl />
        </header>

        <main className="flex-1 p-4 flex items-center justify-center">
          <AvaliacaoMotorista motorista={corridaFinalizada.motorista} onAvaliacaoConcluida={handleAvaliacaoCompleta} />
        </main>
      </div>
    )
  }

  // Verificar se o componente está montado para evitar problemas de hidratação
  if (!isMounted) {
    return null
  }

  console.log("Estado atual:", { motoristaChegou, motoristaAceito })

  // Modificar a renderização condicional para garantir que a animação de chegada seja exibida
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <header className="bg-blue-500 p-4 text-white flex items-center justify-between shadow-md">
        <div className="flex items-center">
          <Link href="/" className="mr-4">
            <ArrowLeft size={24} />
          </Link>
          <h1 className="text-xl font-bold">Solicitar Corrida</h1>
        </div>
        <NotificationControl />
      </header>

      <main className="flex-1 p-4">
        {!solicitacaoEnviada ? (
          <Card>
            <CardHeader>
              <CardTitle>Informe seus dados</CardTitle>
              <CardDescription>Preencha os campos abaixo para solicitar uma corrida</CardDescription>
            </CardHeader>
            <CardContent>
              {motoristasVerificados && (
                <div
                  className={`flex items-center justify-center p-2 mb-4 rounded-lg ${
                    motoristasOnline > 0 ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"
                  }`}
                >
                  <Users size={18} className="mr-2" />
                  <span className="font-medium">
                    {motoristasOnline > 0
                      ? `${motoristasOnline} motorista${motoristasOnline > 1 ? "s" : ""} online agora`
                      : "Nenhum motorista online no momento"}
                  </span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="nome" className="block text-sm font-medium text-gray-700 mb-1">
                    Seu Nome
                  </label>
                  <Input
                    id="nome"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Digite seu nome"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="telefone" className="block text-sm font-medium text-gray-700 mb-1">
                    Telefone
                  </label>
                  <Input
                    id="telefone"
                    value={telefone}
                    onChange={(e) => formatarTelefone(e.target.value)}
                    placeholder="(11)00000-0000"
                    maxLength={14}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="cep" className="block text-sm font-medium text-gray-700">
                    CEP
                  </label>
                  <div className="flex space-x-2">
                    <Input
                      id="cep"
                      value={cep}
                      onChange={(e) => formatarCep(e.target.value)}
                      placeholder="00000-000"
                      maxLength={9}
                      className="w-40"
                    />
                    <Button
                      type="button"
                      onClick={buscarEnderecoPorCep}
                      disabled={carregandoCep || cep.length < 8}
                      className="whitespace-nowrap"
                    >
                      {carregandoCep ? (
                        <Loader2 size={16} className="mr-2 animate-spin" />
                      ) : (
                        <Search size={16} className="mr-2" />
                      )}
                      Buscar CEP
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="rua" className="block text-sm font-medium text-gray-700 mb-1">
                      Rua
                    </label>
                    <Input
                      id="rua"
                      value={rua}
                      onChange={(e) => setRua(e.target.value)}
                      placeholder="Nome da rua"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="numero" className="block text-sm font-medium text-gray-700 mb-1">
                      Número
                    </label>
                    <Input
                      id="numero"
                      value={numero}
                      onChange={(e) => setNumero(e.target.value)}
                      placeholder="Nº"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="destino" className="block text-sm font-medium text-gray-700 mb-1">
                    Destino
                  </label>
                  <Select value={destinoId} onValueChange={setDestinoId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o destino" />
                    </SelectTrigger>
                    <SelectContent>
                      {destinos.map((destino) => (
                        <SelectItem key={destino.id} value={destino.id.toString()}>
                          <div>
                            <div className="font-medium">{destino.nome}</div>
                            <div className="text-xs text-gray-500">{destino.endereco}</div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {coordenadas && (
                  <div className="text-xs text-gray-500 flex items-center">
                    <MapPin size={12} className="mr-1" />
                    Localização para GPS: {coordenadas.latitude.toFixed(6)}, {coordenadas.longitude.toFixed(6)}
                  </div>
                )}

                {erro && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">{erro}</div>
                )}

                <Button type="submit" className="w-full" disabled={carregando || motoristasOnline === 0}>
                  {carregando ? "Enviando..." : "Solicitar Corrida"}
                  {!carregando && <Send size={16} className="ml-2" />}
                </Button>
              </form>
            </CardContent>
          </Card>
        ) : motoristaAceito ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-center">
                {motoristaChegou ? <span className="text-green-600">Motorista CHEGOU!</span> : "Motorista a caminho!"}
              </CardTitle>
              <CardDescription className="text-center">
                {motoristaChegou
                  ? "Seu motorista está aguardando no local de embarque"
                  : `Tempo estimado: ${motoristaAceito.tempoEspera} minutos`}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {motoristaChegou ? (
                <>
                  <MotoristaChegouAnimacao />

                  <div className="flex flex-col md:flex-row items-center gap-4 mt-4 bg-green-50 p-4 rounded-lg border border-green-200">
                    <div className="flex-shrink-0">
                      <img
                        src={motoristaAceito.foto || "/placeholder.svg?height=150&width=150"}
                        alt={motoristaAceito.nome}
                        className="w-24 h-24 rounded-full object-cover border-4 border-green-500"
                      />
                    </div>
                    <div className="flex-grow text-center md:text-left">
                      <h3 className="font-bold text-xl">{motoristaAceito.nome}</h3>
                      <div className="flex flex-col md:flex-row md:gap-4 mt-2">
                        <div className="flex items-center justify-center md:justify-start">
                          <Car size={18} className="text-gray-600 mr-2" />
                          <span className="text-gray-800 font-medium">{motoristaAceito.veiculo}</span>
                        </div>
                        <div className="font-bold text-gray-600">{motoristaAceito.placa}</div>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center">
                  <img
                    src={motoristaAceito.foto || "/placeholder.svg?height=150&width=150"}
                    alt={motoristaAceito.nome}
                    className="w-32 h-32 rounded-full object-cover mb-4 border-4 border-blue-500"
                  />
                  <h3 className="font-bold text-xl text-center">{getPrimeiroNome(motoristaAceito.nome)}</h3>
                  <div className="bg-gray-100 px-4 py-2 rounded-full mt-2 text-center">
                    <p className="text-gray-800 font-medium">{motoristaAceito.veiculo}</p>
                    <p className="text-gray-600 font-bold">{motoristaAceito.placa}</p>
                  </div>
                </div>
              )}

              {!motoristaChegou && (
                <div className="bg-blue-50 p-4 rounded-lg text-center">
                  <p className="text-blue-800 text-lg">
                    <span className="font-bold">Tempo estimado de chegada:</span>
                  </p>
                  <p className="text-blue-800 text-2xl font-bold">{motoristaAceito.tempoEspera} minutos</p>
                </div>
              )}

              {motoristaAceito.telefone && (
                <Button
                  variant="outline"
                  className="w-full flex items-center justify-center gap-2 bg-green-50 text-green-700 border-green-300 hover:bg-green-100"
                  onClick={() => abrirWhatsApp(motoristaAceito.telefone || "")}
                >
                  <Phone size={18} />
                  Contatar via WhatsApp
                </Button>
              )}

              <Button
                variant="destructive"
                className="w-full flex items-center justify-center gap-2"
                onClick={handleCancelarSolicitacao}
                disabled={cancelando}
              >
                <X size={18} />
                {cancelando ? "Cancelando..." : "Cancelar Corrida"}
              </Button>

              <Button variant="outline" className="w-full" onClick={() => router.push("/")}>
                Voltar ao Início
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Buscando motorista...</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-center">
              <p className="text-gray-600">Estamos procurando um motorista próximo à sua localização.</p>

              {/* Animação centralizada */}
              <BuscandoMotoristaAnimacao motoristasOnline={motoristasOnline} />

              <p className="text-sm text-gray-500">Aguarde enquanto conectamos você a um motorista...</p>

              {erro && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mt-4">{erro}</div>
              )}
            </CardContent>
            <CardFooter>
              <Button
                variant="destructive"
                className="w-full flex items-center justify-center gap-2"
                onClick={handleCancelarSolicitacao}
                disabled={cancelando}
              >
                <X size={18} />
                {cancelando ? "Cancelando..." : "Cancelar Solicitação"}
              </Button>
            </CardFooter>
          </Card>
        )}
      </main>
    </div>
  )
}
