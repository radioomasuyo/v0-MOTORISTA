"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { calculateDistance, estimateArrivalTime } from "@/lib/distance-service"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { ArrowLeft, CheckCircle, XCircle, MapPin, Navigation, LogIn, MessageCircle } from "lucide-react"
import Link from "next/link"
import NotificationControl from "@/components/NotificationControl"
import { notificationService } from "@/services/notificationService"
import { toast } from "@/hooks/use-toast"
import { finalizarCorrida, notificarChegadaMotorista } from "@/services/solicitacaoService"

type Coordenadas = {
  latitude: number
  longitude: number
}

type Cliente = {
  nome: string
  localizacao: string
  coordenadas: Coordenadas | null
  telefone?: string
}

type Solicitacao = {
  id: number
  cliente: Cliente
  destino: string
  distanciaCliente: number
  distanciaDestino: number
  timestamp: string
}

// Coordenadas simuladas para quando a geolocalização não estiver disponível
const COORDENADAS_SIMULADAS: Coordenadas = {
  latitude: -23.5505, // Coordenadas de São Paulo como exemplo
  longitude: -46.6333,
}

// Chave para armazenar a corrida aceita no localStorage
const CORRIDA_ACEITA_KEY = "jamal_express_corrida_aceita"
// Chave para armazenar as corridas recusadas no localStorage
const CORRIDAS_RECUSADAS_KEY = "jamal_express_corridas_recusadas"
// Chave para armazenar o código do motorista no localStorage
const MOTORISTA_CODIGO_KEY = "jamal_express_motorista_codigo"

export default function MotoristaPage() {
  const router = useRouter()
  const [codigo, setCodigo] = useState("")
  const [codigoInput, setCodigoInput] = useState("")
  const [motorista, setMotorista] = useState<any>(null)
  const [motoristaCoords, setMotoristaCoords] = useState<Coordenadas | null>(null)
  const [online, setOnline] = useState(false)
  const [solicitacoes, setSolicitacoes] = useState<Solicitacao[]>([])
  const [corridaAceita, setCorridaAceita] = useState<Solicitacao | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [verificandoCodigo, setVerificandoCodigo] = useState(false)
  const [atualizandoLocalizacao, setAtualizandoLocalizacao] = useState(false)
  const [erro, setErro] = useState("")
  const [geoDisponivel, setGeoDisponivel] = useState(false) // Começamos assumindo que não está disponível
  const [geoErro, setGeoErro] = useState("")
  const [geoVerificada, setGeoVerificada] = useState(false)
  const [corridasRecusadas, setCorridasRecusadas] = useState<number[]>([])
  const [mostrarLogin, setMostrarLogin] = useState(false)
  const [chegouAoLocal, setChegouAoLocal] = useState(false)
  const [notificandoChegada, setNotificandoChegada] = useState(false)

  // Adicionar estado para controlar notificações
  const [notificationsInitialized, setNotificationsInitialized] = useState(false)

  // Use refs to track previous state values to prevent infinite loops
  const prevSolicitacoesRef = useRef<number[]>([])
  const fetchIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Função para carregar dados do localStorage com tratamento de erro
  const getLocalStorageItem = useCallback((key: string): string | null => {
    try {
      if (typeof window !== "undefined") {
        return localStorage.getItem(key)
      }
      return null
    } catch (error) {
      console.warn(`Erro ao acessar localStorage para a chave ${key}:`, error)
      return null
    }
  }, [])

  // Função para salvar dados no localStorage com tratamento de erro
  const setLocalStorageItem = useCallback((key: string, value: string): boolean => {
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem(key, value)
        return true
      }
      return false
    } catch (error) {
      console.warn(`Erro ao salvar no localStorage para a chave ${key}:`, error)
      return false
    }
  }, [])

  // Função para remover dados do localStorage com tratamento de erro
  const removeLocalStorageItem = useCallback((key: string): boolean => {
    try {
      if (typeof window !== "undefined") {
        localStorage.removeItem(key)
        return true
      }
      return false
    } catch (error) {
      console.warn(`Erro ao remover do localStorage para a chave ${key}:`, error)
      return false
    }
  }, [])

  // Inicializar notificações
  useEffect(() => {
    try {
      if (!notificationsInitialized && typeof window !== "undefined") {
        // Solicitar permissão para notificações quando a página carregar
        notificationService
          .requestPermission()
          .then(() => {
            setNotificationsInitialized(true)
          })
          .catch((error) => {
            console.warn("Erro ao inicializar notificações:", error)
            // Mesmo com erro, marcamos como inicializado para evitar tentativas repetidas
            setNotificationsInitialized(true)
          })
      }
    } catch (error) {
      console.warn("Erro ao inicializar notificações:", error)
      setNotificationsInitialized(true)
    }
  }, [notificationsInitialized])

  // Verificar se a geolocalização está disponível de forma segura
  useEffect(() => {
    // Função para usar coordenadas simuladas
    const usarCoordenadasSimuladas = () => {
      setGeoDisponivel(false)
      setGeoErro("Geolocalização não disponível. Usando localização simulada.")
      setMotoristaCoords(COORDENADAS_SIMULADAS)
      setGeoVerificada(true)
    }

    try {
      // Verificar se a API de geolocalização existe
      if (typeof navigator === "undefined" || !navigator.geolocation) {
        usarCoordenadasSimuladas()
        return
      }

      // Tentar verificar permissões de forma segura
      try {
        // Definir um timeout para capturar erros de bloqueio de política
        const timeoutId = setTimeout(() => {
          // Se demorar muito, assumimos que está bloqueado
          usarCoordenadasSimuladas()
        }, 3000)

        navigator.geolocation.getCurrentPosition(
          (position) => {
            // Sucesso - geolocalização está disponível
            clearTimeout(timeoutId)
            setGeoDisponivel(true)
            setGeoVerificada(true)
            setMotoristaCoords({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            })
          },
          (error) => {
            // Erro - geolocalização não está disponível
            clearTimeout(timeoutId)
            console.warn("Erro ao verificar geolocalização:", error)
            usarCoordenadasSimuladas()
          },
          { timeout: 5000, maximumAge: 0 },
        )
      } catch (error) {
        console.warn("Erro ao acessar geolocalização:", error)
        usarCoordenadasSimuladas()
      }
    } catch (error) {
      console.warn("Erro ao verificar geolocalização:", error)
      usarCoordenadasSimuladas()
    }
  }, [])

  // Carregar corridas recusadas do localStorage
  useEffect(() => {
    try {
      const recusadasSalvas = getLocalStorageItem(CORRIDAS_RECUSADAS_KEY)
      if (recusadasSalvas) {
        try {
          setCorridasRecusadas(JSON.parse(recusadasSalvas))
        } catch (error) {
          console.warn("Erro ao carregar corridas recusadas:", error)
          removeLocalStorageItem(CORRIDAS_RECUSADAS_KEY)
        }
      }

      // Verificar se há um código de motorista salvo
      const codigoSalvo = getLocalStorageItem(MOTORISTA_CODIGO_KEY)
      if (codigoSalvo) {
        setCodigo(codigoSalvo)
      } else {
        // Se não houver código salvo, mostrar tela de login
        setMostrarLogin(true)
        setCarregando(false)
      }
    } catch (error) {
      console.warn("Erro ao carregar dados do localStorage:", error)
      setMostrarLogin(true)
      setCarregando(false)
    }
  }, [getLocalStorageItem, removeLocalStorageItem])

  // Buscar dados do motorista quando o código estiver disponível
  useEffect(() => {
    if (!codigo) return

    const fetchMotorista = async () => {
      setCarregando(true)
      setErro("")

      try {
        const { data, error } = await supabase.from("drivers").select("*").eq("codigo", codigo).single()

        if (error) {
          console.warn("Erro ao buscar motorista:", error)
          setErro("Motorista não encontrado. Verifique o código.")
          setCarregando(false)
          setMostrarLogin(true)
          // Limpar código salvo se não for válido
          removeLocalStorageItem(MOTORISTA_CODIGO_KEY)
          return
        }

        setMotorista(data)
        setOnline(data.status === "online")
        setCarregando(false)
        setMostrarLogin(false)

        // Verificar se há uma corrida aceita salva no localStorage
        const corridaSalva = getLocalStorageItem(CORRIDA_ACEITA_KEY)
        if (corridaSalva) {
          try {
            const corridaData = JSON.parse(corridaSalva)
            // Verificar se a corrida salva pertence a este motorista
            if (corridaData.motoristaId === data.id) {
              // Verificar se a corrida ainda está ativa no banco de dados
              verificarCorridaSalva(corridaData.solicitacaoId)
            } else {
              // Limpar localStorage se a corrida não pertence a este motorista
              removeLocalStorageItem(CORRIDA_ACEITA_KEY)
            }
          } catch (error) {
            console.warn("Erro ao carregar corrida salva:", error)
            removeLocalStorageItem(CORRIDA_ACEITA_KEY)
          }
        }
      } catch (error) {
        console.warn("Erro ao buscar motorista:", error)
        setErro("Ocorreu um erro ao buscar os dados do motorista.")
        setCarregando(false)
        setMostrarLogin(true)
      }
    }

    fetchMotorista()
  }, [codigo, removeLocalStorageItem, getLocalStorageItem])

  // Verificar se uma corrida salva ainda está ativa
  const verificarCorridaSalva = useCallback(
    async (solicitacaoId: number) => {
      try {
        const { data, error } = await supabase
          .from("solicitacoes")
          .select("*")
          .eq("id", solicitacaoId)
          .eq("status", "aceito")
          .single()

        if (error || !data) {
          // Corrida não encontrada ou não está mais ativa
          removeLocalStorageItem(CORRIDA_ACEITA_KEY)
          return
        }

        // Reconstruir o objeto de solicitação
        const cliente = typeof data.cliente === "string" ? JSON.parse(data.cliente) : data.cliente

        const solicitacao: Solicitacao = {
          id: data.id,
          cliente,
          destino: data.destino,
          distanciaCliente: 0,
          distanciaDestino: 0,
          timestamp: data.timestamp,
        }

        // Calcular distância se possível
        if (motoristaCoords && cliente.coordenadas) {
          try {
            const distancia = await calculateDistance(motoristaCoords, cliente.coordenadas)
            solicitacao.distanciaCliente = distancia
          } catch (error) {
            console.warn("Erro ao calcular distância:", error)
          }
        }

        setCorridaAceita(solicitacao)

        // Verificar se o motorista já chegou (usando o campo no objeto motorista)
        const motorista = typeof data.motorista === "string" ? JSON.parse(data.motorista) : data.motorista
        if (
          motorista &&
          (motorista.status === "chegou" || motorista.chegou_timestamp || data.motorista_notificou_chegada)
        ) {
          setChegouAoLocal(true)
        }
      } catch (error) {
        console.warn("Erro ao verificar corrida salva:", error)
        removeLocalStorageItem(CORRIDA_ACEITA_KEY)
      }
    },
    [motoristaCoords, removeLocalStorageItem],
  )

  // Verificar se há alguma corrida em andamento
  useEffect(() => {
    if (!motorista) return

    const verificarCorridaEmAndamento = async () => {
      try {
        const { data, error } = await supabase
          .from("solicitacoes")
          .select("*")
          .eq("status", "aceito")
          .filter("motorista->id", "eq", motorista.id)
          .order("timestamp", { ascending: false })
          .limit(1)
          .single()

        if (error) {
          if (error.code !== "PGRST116") {
            // Código para "nenhum resultado encontrado"
            console.warn("Erro ao verificar corrida em andamento:", error)
          }
          return
        }

        if (data) {
          // Reconstruir o objeto de solicitação
          const cliente = typeof data.cliente === "string" ? JSON.parse(data.cliente) : data.cliente

          const solicitacao: Solicitacao = {
            id: data.id,
            cliente,
            destino: data.destino,
            distanciaCliente: 0, // Será calculado abaixo
            distanciaDestino: 0,
            timestamp: data.timestamp,
          }

          setCorridaAceita(solicitacao)

          // Salvar no localStorage
          setLocalStorageItem(
            CORRIDA_ACEITA_KEY,
            JSON.stringify({
              solicitacaoId: data.id,
              motoristaId: motorista.id,
              timestamp: new Date().toISOString(),
            }),
          )

          // Calcular distância se possível
          if (motoristaCoords && cliente.coordenadas) {
            try {
              const distancia = await calculateDistance(motoristaCoords, cliente.coordenadas)
              setCorridaAceita((prev) => (prev ? { ...prev, distanciaCliente: distancia } : null))
            } catch (error) {
              console.warn("Erro ao calcular distância:", error)
            }
          }

          // Verificar se o motorista já chegou (usando o campo no objeto motorista)
          const motoristaData = typeof data.motorista === "string" ? JSON.parse(data.motorista) : data.motorista
          if (
            motoristaData &&
            (motoristaData.status === "chegou" || motoristaData.chegou_timestamp || data.motorista_notificou_chegada)
          ) {
            setChegouAoLocal(true)
          }
        }
      } catch (error) {
        console.warn("Erro ao verificar corrida em andamento:", error)
      }
    }

    verificarCorridaEmAndamento()
  }, [motorista, motoristaCoords, setLocalStorageItem])

  // Obter localização atual do motorista - versão segura
  const obterLocalizacaoAtual = useCallback(() => {
    // Se já sabemos que a geolocalização não está disponível, usamos coordenadas simuladas
    if (!geoDisponivel) {
      setGeoErro("Geolocalização não disponível. Usando localização simulada.")
      setMotoristaCoords(COORDENADAS_SIMULADAS)
      return
    }

    setAtualizandoLocalizacao(true)
    setGeoErro("")

    try {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords
          setMotoristaCoords({ latitude, longitude })
          setAtualizandoLocalizacao(false)

          // Atualizar coordenadas no banco de dados (em uma aplicação real)
          if (motorista) {
            try {
              supabase
                .from("drivers")
                .update({
                  latitude,
                  longitude,
                  ultima_atualizacao_localizacao: new Date().toISOString(),
                })
                .eq("id", motorista.id)
                .then(({ error }) => {
                  if (error) console.warn("Erro ao atualizar localização do motorista:", error)
                })
            } catch (error) {
              console.warn("Erro ao atualizar localização no banco de dados:", error)
            }
          }
        },
        (error) => {
          console.warn("Erro ao obter localização:", error)
          setGeoDisponivel(false) // Marcar como indisponível para futuras tentativas
          setGeoErro("Geolocalização não disponível. Usando localização simulada.")
          setAtualizandoLocalizacao(false)

          // Usar coordenadas simuladas
          setMotoristaCoords(COORDENADAS_SIMULADAS)
        },
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0,
        },
      )
    } catch (error) {
      console.warn("Erro ao acessar geolocalização:", error)
      setGeoDisponivel(false)
      setGeoErro("Geolocalização não disponível. Usando localização simulada.")
      setAtualizandoLocalizacao(false)

      // Usar coordenadas simuladas
      setMotoristaCoords(COORDENADAS_SIMULADAS)
    }
  }, [geoDisponivel, motorista])

  // Atualizar localização periodicamente quando online
  useEffect(() => {
    if (!online || !motorista || !geoVerificada) return

    // Se não temos coordenadas ainda, obter inicialmente
    if (!motoristaCoords) {
      if (geoDisponivel) {
        obterLocalizacaoAtual()
      } else {
        setMotoristaCoords(COORDENADAS_SIMULADAS)
      }
    }

    // Configurar atualização periódica apenas se geolocalização estiver disponível
    if (geoDisponivel) {
      const interval = setInterval(obterLocalizacaoAtual, 60000) // Atualizar a cada min  {
      return () => clearInterval(interval)
    }
  }, [online, motorista, geoDisponivel, geoVerificada, motoristaCoords, obterLocalizacaoAtual])

  // Atualizar status do motorista (online/offline)
  useEffect(() => {
    if (!motorista) return

    const updateStatus = async () => {
      try {
        const { error } = await supabase
          .from("drivers")
          .update({ status: online ? "online" : "offline" })
          .eq("id", motorista.id)

        if (error) {
          console.warn("Erro ao atualizar status:", error)
        }
      } catch (error) {
        console.warn("Erro ao atualizar status do motorista:", error)
      }
    }

    updateStatus()
  }, [online, motorista])

  // Modifique a função handleToggleStatus para incluir notificações
  const handleToggleStatus = useCallback(() => {
    try {
      const newStatus = !online
      setOnline(newStatus)

      // Notificar sobre a mudança de status
      if (notificationsInitialized) {
        if (newStatus) {
          notificationService.notify({
            title: "Status alterado",
            body: "Você está online e disponível para receber corridas",
            type: "success",
            sound: true,
          })
        } else {
          notificationService.notify({
            title: "Status alterado",
            body: "Você está offline e não receberá novas corridas",
            type: "info",
            sound: true,
          })
        }
      }
    } catch (error) {
      console.warn("Erro ao alternar status:", error)
      toast({
        title: "Erro",
        description: "Não foi possível alterar seu status",
        variant: "destructive",
      })
    }
  }, [online, notificationsInitialized])

  // Function to fetch ride requests
  const fetchSolicitacoes = useCallback(async () => {
    if (!motorista || !online || !motoristaCoords || corridaAceita) {
      setSolicitacoes([])
      return
    }

    try {
      const { data, error } = await supabase
        .from("solicitacoes")
        .select("*")
        .eq("status", "pendente")
        .order("timestamp", { ascending: true })

      if (error) {
        console.warn("Erro ao buscar solicitações:", error)
        return
      }

      if (data && data.length > 0) {
        // Filtrar solicitações já recusadas
        const solicitacoesFiltradas = data.filter((sol) => !corridasRecusadas.includes(sol.id))

        // Get current solicitation IDs
        const currentIds = solicitacoesFiltradas.map((sol) => sol.id)

        // Check for new solicitations by comparing with previous IDs
        const previousIds = prevSolicitacoesRef.current
        const newSolicitacoes = solicitacoesFiltradas.filter((sol) => !previousIds.includes(sol.id))

        // Update the ref with current IDs
        prevSolicitacoesRef.current = currentIds

        // Notify about new ride requests
        if (newSolicitacoes.length > 0 && notificationsInitialized) {
          newSolicitacoes.forEach((sol) => {
            try {
              const cliente = typeof sol.cliente === "string" ? JSON.parse(sol.cliente) : sol.cliente
              notificationService.notifyNewRideRequest(cliente.nome, sol.destino || "destino não especificado", sol.id)
            } catch (error) {
              console.warn("Erro ao notificar nova solicitação:", error)
            }
          })
        }

        // Process solicitations and calculate distances
        const solicitacoesProcessadasPromises = solicitacoesFiltradas.map(async (sol) => {
          try {
            // Extract client and coordinates
            const cliente = typeof sol.cliente === "string" ? JSON.parse(sol.cliente) : sol.cliente

            // Calculate distance to client if both coordinates are available
            let distanciaCliente = 0
            if (motoristaCoords && cliente.coordenadas) {
              try {
                distanciaCliente = await calculateDistance(motoristaCoords, cliente.coordenadas)
              } catch (error) {
                console.warn("Erro ao calcular distância:", error)
                // Fallback to random value if coordinates are not available
                distanciaCliente = Math.round(Math.random() * 50) / 10 // 0.0 to 5.0 km
              }
            } else {
              // Fallback to random value if coordinates are not available
              distanciaCliente = Math.round(Math.random() * 50) / 10 // 0.0 to 5.0 km
            }

            // Calculate distance to destination - using simulated value since we don't have destination coordinates
            const distanciaDestino = Math.round(Math.random() * 100 + 10) / 10 // 1.0 to 11.0 km

            return {
              id: sol.id,
              cliente,
              destino: sol.destino,
              distanciaCliente,
              distanciaDestino,
              timestamp: sol.timestamp,
            }
          } catch (error) {
            console.warn("Erro ao processar solicitação:", error)
            return null
          }
        })

        try {
          // Resolve all promises
          const solicitacoesProcessadas = await Promise.all(solicitacoesProcessadasPromises)

          // Filter out null solicitations (that had errors in processing)
          const solicitacoesValidas = solicitacoesProcessadas.filter((sol): sol is Solicitacao => sol !== null)

          // Sort by proximity (closest drivers first)
          solicitacoesValidas.sort((a, b) => a.distanciaCliente - b.distanciaCliente)

          setSolicitacoes(solicitacoesValidas)
        } catch (error) {
          console.warn("Erro ao processar solicitações:", error)
        }
      } else {
        setSolicitacoes([])
      }
    } catch (error) {
      console.warn("Erro ao buscar solicitações:", error)
    }
  }, [motorista, online, motoristaCoords, corridaAceita, corridasRecusadas, notificationsInitialized])

  // Set up interval to fetch ride requests
  useEffect(() => {
    // Clear any existing interval
    if (fetchIntervalRef.current) {
      clearInterval(fetchIntervalRef.current)
      fetchIntervalRef.current = null
    }

    // Only set up the interval if we should be fetching
    if (motorista && online && motoristaCoords && !corridaAceita) {
      // Fetch immediately
      fetchSolicitacoes()

      // Then set up interval
      fetchIntervalRef.current = setInterval(fetchSolicitacoes, 5000)

      // Clean up on unmount or when dependencies change
      return () => {
        if (fetchIntervalRef.current) {
          clearInterval(fetchIntervalRef.current)
          fetchIntervalRef.current = null
        }
      }
    }
  }, [motorista, online, motoristaCoords, corridaAceita, fetchSolicitacoes])

  // Função atualizada para aceitar corrida e calcular tempo estimado corretamente
  const handleAceitarCorrida = useCallback(
    async (solicitacao: Solicitacao) => {
      if (!motorista || !motoristaCoords) return

      setCarregando(true)

      try {
        // Calcular tempo estimado baseado na distância até o cliente
        let tempoEstimado = 10 // Valor padrão em minutos

        if (solicitacao.cliente.coordenadas) {
          try {
            // Calcular distância precisa
            const distancia = await calculateDistance(motoristaCoords, solicitacao.cliente.coordenadas)

            // Calcular tempo estimado baseado na distância
            tempoEstimado = await estimateArrivalTime(distancia)

            // Atualizar a distância na solicitação
            solicitacao.distanciaCliente = distancia
          } catch (error) {
            console.warn("Erro ao calcular distância/tempo:", error)
          }
        }

        // Adicionar informações do motorista e tempo estimado
        const motoristaInfo = {
          id: motorista.id,
          nome: motorista.nome || "Motorista",
          foto: motorista.foto || "/placeholder.svg?height=100&width=100",
          veiculo: motorista.veiculo || "Veículo",
          placa: motorista.placa || "Placa",
          telefone: motorista.telefone,
          tempoEspera: tempoEstimado,
          coordenadas: motoristaCoords,
        }

        // Atualizar solicitação
        const { error } = await supabase
          .from("solicitacoes")
          .update({
            motorista: motoristaInfo,
            status: "aceito",
          })
          .eq("id", solicitacao.id)

        if (error) throw error

        // Definir corrida aceita
        setCorridaAceita(solicitacao)
        setChegouAoLocal(false) // Resetar o estado de chegada ao local

        // Salvar no localStorage
        setLocalStorageItem(
          CORRIDA_ACEITA_KEY,
          JSON.stringify({
            solicitacaoId: solicitacao.id,
            motoristaId: motorista.id,
            timestamp: new Date().toISOString(),
          }),
        )

        // Remover solicitação da lista
        setSolicitacoes(solicitacoes.filter((s) => s.id !== solicitacao.id))

        // Incrementar contador de corridas do motorista
        await supabase
          .from("drivers")
          .update({ corridas: (motorista.corridas || 0) + 1 })
          .eq("id", motorista.id)

        // Notificar o motorista
        toast({
          title: "Corrida aceita",
          description: "Você aceitou a corrida com sucesso",
          variant: "success",
        })

        // Disparar evento para notificar o cliente
        if (typeof window !== "undefined") {
          const evento = new CustomEvent("corrida_aceita", {
            detail: {
              id: solicitacao.id,
              motorista: motoristaInfo,
              tempoEstimado: tempoEstimado,
            },
          })
          window.dispatchEvent(evento)
        }
      } catch (error) {
        console.warn("Erro ao aceitar corrida:", error)
        setErro("Ocorreu um erro ao aceitar a corrida. Tente novamente.")
        toast({
          title: "Erro",
          description: "Não foi possível aceitar a corrida",
          variant: "destructive",
        })
      } finally {
        setCarregando(false)
      }
    },
    [motorista, motoristaCoords, setLocalStorageItem, solicitacoes],
  )

  const handleRecusarCorrida = useCallback(
    async (solicitacaoId: number) => {
      try {
        // Adicionar à lista de corridas recusadas
        const novasCorridasRecusadas = [...corridasRecusadas, solicitacaoId]
        setCorridasRecusadas(novasCorridasRecusadas)

        // Salvar no localStorage
        setLocalStorageItem(CORRIDAS_RECUSADAS_KEY, JSON.stringify(novasCorridasRecusadas))

        // Remover da lista local
        setSolicitacoes(solicitacoes.filter((s) => s.id !== solicitacaoId))

        // Atualizar status no banco de dados para "recusado_por_motorista"
        try {
          const { error } = await supabase
            .from("solicitacoes")
            .update({
              status: "recusado_por_motorista",
            })
            .eq("id", solicitacaoId)

          if (error) {
            console.warn("Erro ao recusar corrida no banco de dados:", error)
          }
        } catch (error) {
          console.warn("Erro ao atualizar status da corrida:", error)
        }
      } catch (error) {
        console.warn("Erro ao recusar corrida:", error)
        toast({
          title: "Erro",
          description: "Não foi possível recusar a corrida",
          variant: "destructive",
        })
      }
    },
    [corridasRecusadas, setLocalStorageItem, solicitacoes],
  )

  // Função atualizada para notificar o cliente quando o motorista chegar ao local
  const handleChegouAoLocal = useCallback(async () => {
    if (!corridaAceita) return

    try {
      // Evitar múltiplos cliques
      if (notificandoChegada) return
      setNotificandoChegada(true)

      // Atualizar estado local primeiro para feedback imediato
      setChegouAoLocal(true)

      console.log("Motorista: Notificando chegada para solicitação:", corridaAceita.id)

      // Usar o serviço dedicado para notificar a chegada
      const { sucesso, mensagem } = await notificarChegadaMotorista(corridaAceita.id)

      if (!sucesso) {
        throw new Error(mensagem || "Erro ao notificar chegada")
      }

      // Mostrar toast de sucesso
      toast({
        title: "Cliente notificado",
        description: "O cliente foi notificado que você chegou ao local",
        variant: "success",
      })
    } catch (error) {
      console.error("Erro ao notificar chegada:", error)

      // Reverter o estado local em caso de erro
      setChegouAoLocal(false)

      toast({
        title: "Erro",
        description: "Não foi possível notificar o cliente",
        variant: "destructive",
      })
    } finally {
      setNotificandoChegada(false)
    }
  }, [corridaAceita])

  // Função atualizada para finalizar a corrida e notificar o cliente para avaliação
  const handleFinalizarCorrida = useCallback(async () => {
    if (!corridaAceita || !motorista) return

    setCarregando(true)

    try {
      const { sucesso, mensagem } = await finalizarCorrida(corridaAceita.id)

      if (!sucesso) throw new Error(mensagem)

      // Disparar evento para notificar o cliente sobre a finalização e avaliação
      if (typeof window !== "undefined") {
        const evento = new CustomEvent("corrida_finalizada", {
          detail: {
            id: corridaAceita.id,
            motorista: {
              id: motorista.id,
              nome: motorista.nome,
              foto: motorista.foto,
            },
          },
        })
        window.dispatchEvent(evento)
      }

      setCorridaAceita(null)
      setChegouAoLocal(false)

      // Remover do localStorage
      removeLocalStorageItem(CORRIDA_ACEITA_KEY)

      toast({
        title: "Corrida finalizada",
        description: "A corrida foi finalizada com sucesso",
        variant: "success",
      })
    } catch (error) {
      console.warn("Erro ao finalizar corrida:", error)
      setErro("Ocorreu um erro ao finalizar a corrida. Tente novamente.")
      toast({
        title: "Erro",
        description: "Não foi possível finalizar a corrida",
        variant: "destructive",
      })
    } finally {
      setCarregando(false)
    }
  }, [corridaAceita, motorista, removeLocalStorageItem])

  // Função para abrir o GPS padrão do dispositivo com o endereço do cliente
  const dirigirAteCliente = useCallback((coordenadas: Coordenadas | null, localizacao: string) => {
    console.log("Abrindo navegação para o cliente:", { coordenadas, localizacao })

    // Verificar e converter coordenadas se necessário
    let coordenadasValidas: Coordenadas | null = null

    if (coordenadas) {
      // Verificar se as coordenadas estão no formato esperado
      if ("latitude" in coordenadas && "longitude" in coordenadas) {
        coordenadasValidas = coordenadas
      }
      // Verificar se as coordenadas estão em outro formato (lat/lon)
      else if ("lat" in coordenadas && "lon" in coordenadas) {
        coordenadasValidas = {
          latitude: (coordenadas as any).lat,
          longitude: (coordenadas as any).lon,
        }
        console.log("Convertendo formato de coordenadas lat/lon para latitude/longitude:", coordenadasValidas)
      }
      // Verificar se as coordenadas estão em formato de array [longitude, latitude]
      else if (Array.isArray(coordenadas) && coordenadas.length === 2) {
        coordenadasValidas = {
          latitude: coordenadas[1],
          longitude: coordenadas[0],
        }
        console.log("Convertendo formato de array para latitude/longitude:", coordenadasValidas)
      }
    }

    if (!coordenadasValidas) {
      console.warn(
        "Coordenadas do cliente não disponíveis ou em formato inválido, tentando usar a localização como texto",
      )

      // Se não temos coordenadas, tentar usar o endereço como texto
      try {
        // Codificar o endereço para URL
        const enderecoEncoded = encodeURIComponent(localizacao)

        // Verificar se é dispositivo móvel
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)

        if (isMobile) {
          // No mobile, tenta abrir o app nativo de mapas com endereço
          if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) {
            window.location.href = `maps://maps.apple.com/?q=${enderecoEncoded}`
          } else {
            window.location.href = `geo:0,0?q=${enderecoEncoded}`
          }

          // Fallback para Google Maps
          setTimeout(() => {
            window.open(`https://www.google.com/maps/search/?api=1&query=${enderecoEncoded}`, "_blank")
          }, 500)
        } else {
          // No desktop, abre o Google Maps diretamente com o endereço
          window.open(`https://www.google.com/maps/search/?api=1&query=${enderecoEncoded}`, "_blank")
        }
        return
      } catch (error) {
        console.warn("Erro ao abrir navegação com endereço:", error)
        toast({
          title: "Erro",
          description: "Coordenadas não disponíveis e não foi possível usar o endereço",
          variant: "destructive",
        })
        return
      }
    }

    try {
      const { latitude, longitude } = coordenadasValidas
      console.log("Usando coordenadas para navegação:", latitude, longitude)

      // Verificar se é dispositivo móvel
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)

      // Criar URL para o aplicativo de mapas
      let url = ""

      if (isMobile) {
        // No mobile, tenta abrir o app nativo de mapas
        if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) {
          // iOS usa o formato maps://
          url = `maps://maps.apple.com/?daddr=${latitude},${longitude}&dirflg=d`
          window.location.href = url
        } else {
          // Android e outros usam o formato geo:
          url = `google.navigation:q=${latitude},${longitude}`
          window.location.href = url
        }

        // Fallback para Google Maps se o app nativo não abrir
        setTimeout(() => {
          window.open(
            `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}&travelmode=driving`,
            "_blank",
          )
        }, 500)
      } else {
        // No desktop, abre o Google Maps diretamente
        url = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}&travelmode=driving`
        window.open(url, "_blank")
      }
    } catch (error) {
      console.warn("Erro ao abrir navegação:", error)
      toast({
        title: "Erro",
        description: "Não foi possível abrir a navegação",
        variant: "destructive",
      })
    }
  }, [])

  // Função para abrir o WhatsApp do cliente
  const abrirWhatsAppCliente = useCallback((telefone: string | undefined) => {
    if (!telefone) {
      toast({
        title: "Erro",
        description: "Telefone do cliente não disponível",
        variant: "destructive",
      })
      return
    }

    try {
      // Remover caracteres não numéricos
      const numeroLimpo = telefone.replace(/\D/g, "")

      // Criar URL do WhatsApp
      const url = `https://wa.me/55${numeroLimpo}`

      // Abrir em nova aba
      window.open(url, "_blank")
    } catch (error) {
      console.warn("Erro ao abrir WhatsApp:", error)
      toast({
        title: "Erro",
        description: "Não foi possível abrir o WhatsApp",
        variant: "destructive",
      })
    }
  }, [])

  // Função para verificar o código do motorista
  const handleVerificarCodigo = async () => {
    if (!codigoInput.trim()) {
      setErro("Por favor, digite o código do motorista.")
      return
    }

    setVerificandoCodigo(true)
    setErro("")

    try {
      const { data, error } = await supabase.from("drivers").select("*").eq("codigo", codigoInput).single()

      if (error) {
        console.warn("Erro ao verificar código:", error)
        setErro("Código inválido. Motorista não encontrado.")
        setVerificandoCodigo(false)
        return
      }

      // Salvar código no localStorage
      setLocalStorageItem(MOTORISTA_CODIGO_KEY, codigoInput)

      // Definir código e carregar motorista
      setCodigo(codigoInput)

      toast({
        title: "Login realizado",
        description: "Bem-vindo ao Jamal Express",
        variant: "success",
      })
    } catch (error) {
      console.warn("Erro ao verificar código:", error)
      setErro("Ocorreu um erro ao verificar o código. Tente novamente.")
      toast({
        title: "Erro",
        description: "Não foi possível verificar o código",
        variant: "destructive",
      })
    } finally {
      setVerificandoCodigo(false)
    }
  }

  // Renderizar tela de login
  if (mostrarLogin) {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col">
        <header className="bg-green-500 p-4 text-white flex items-center shadow-md">
          <Link href="/" className="mr-4">
            <ArrowLeft size={24} />
          </Link>
          <h1 className="text-xl font-bold">Área do Motorista</h1>
        </header>

        <main className="flex-1 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Login do Motorista</CardTitle>
              <CardDescription>Digite seu código de motorista para acessar o sistema</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label htmlFor="codigo" className="block text-sm font-medium text-gray-700 mb-1">
                    Código do Motorista
                  </label>
                  <Input
                    id="codigo"
                    value={codigoInput}
                    onChange={(e) => setCodigoInput(e.target.value)}
                    placeholder="Digite seu código"
                    required
                  />
                </div>

                {erro && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">{erro}</div>
                )}

                <Button type="button" className="w-full" onClick={handleVerificarCodigo} disabled={verificandoCodigo}>
                  {verificandoCodigo ? "Verificando..." : "Entrar"}
                  {!verificandoCodigo && <LogIn size={16} className="ml-2" />}
                </Button>
              </div>
            </CardContent>
            <CardFooter className="flex justify-center">
              <p className="text-sm text-gray-500">Não tem um código? Entre em contato com o administrador.</p>
            </CardFooter>
          </Card>
        </main>
      </div>
    )
  }

  if (carregando && !motorista) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    )
  }

  if (!motorista) {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <p className="text-red-500 text-center">{erro || "Motorista não encontrado"}</p>
            <Button
              className="w-full mt-4"
              onClick={() => {
                setMostrarLogin(true)
                setErro("")
              }}
            >
              Tentar Novamente
            </Button>
            <Button variant="outline" className="w-full mt-2" onClick={() => router.push("/")}>
              Voltar ao Início
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Modifique a renderização condicional para verificar se motorista existe e tem as propriedades necessárias
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <header className="bg-green-500 p-4 text-white flex items-center justify-between shadow-md">
        <div className="flex items-center">
          <Link href="/" className="mr-4">
            <ArrowLeft size={24} />
          </Link>
          <h1 className="text-xl font-bold">Área do Motorista</h1>
        </div>
        <NotificationControl />
      </header>

      <main className="flex-1 p-4">
        {motorista && (
          <Card className="mb-4">
            <CardContent className="pt-6">
              <div className="flex items-center space-x-4">
                <img
                  src={motorista.foto || "/placeholder.svg?height=100&width=100"}
                  alt={motorista.nome || "Motorista"}
                  className="w-16 h-16 rounded-full object-cover"
                />
                <div>
                  <h2 className="font-bold text-lg">{motorista.nome || "Motorista"}</h2>
                  <p className="text-gray-600">
                    {motorista.veiculo || "Veículo não especificado"} - {motorista.placa || "Placa não especificada"}
                  </p>
                  <div className="mt-3 flex items-center">
                    <div className="bg-gray-100 p-2 rounded-lg flex items-center justify-between w-full">
                      <span className="text-sm font-medium">Status de disponibilidade:</span>
                      <div className="flex items-center">
                        <Switch
                          checked={online}
                          onCheckedChange={handleToggleStatus}
                          id="status"
                          className={online ? "bg-green-500" : ""}
                        />
                        <label
                          htmlFor="status"
                          className={`ml-2 text-sm font-medium ${online ? "text-green-600" : "text-gray-500"}`}
                        >
                          {online ? "Online (Disponível)" : "Offline (Indisponível)"}
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {corridaAceita ? (
          <Card className="border-green-500">
            <CardHeader className="bg-green-50">
              <CardTitle className="flex items-center">
                <CheckCircle size={20} className="text-green-600 mr-2" />
                Corrida em Andamento
              </CardTitle>
              <CardDescription>Aceita em {new Date(corridaAceita.timestamp).toLocaleTimeString()}</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="bg-blue-100 p-2 rounded-full">
                    <MapPin size={20} className="text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Cliente:</p>
                    <p className="font-medium">{corridaAceita.cliente.nome}</p>
                  </div>
                </div>

                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-sm text-gray-500 mb-1">Localização do cliente:</p>
                  <p className="font-medium">{corridaAceita.cliente.localizacao}</p>
                </div>

                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-sm text-gray-500 mb-1">Destino:</p>
                  <p className="font-medium">{corridaAceita.destino}</p>
                </div>

                {corridaAceita.distanciaCliente > 0 && (
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <p className="text-blue-800">
                      <span className="font-bold">Distância até o cliente:</span> {corridaAceita.distanciaCliente} km
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-3">
              <Button
                className="w-full bg-blue-600 hover:bg-blue-700"
                onClick={() => {
                  console.log("Botão IR ATÉ O CLIENTE clicado")
                  console.log("Coordenadas do cliente:", corridaAceita?.cliente.coordenadas)
                  console.log("Localização do cliente:", corridaAceita?.cliente.localizacao)
                  dirigirAteCliente(corridaAceita?.cliente.coordenadas, corridaAceita?.cliente.localizacao)
                }}
              >
                <Navigation size={18} className="mr-2" /> IR ATÉ O CLIENTE
              </Button>

              <Button
                variant="outline"
                className={`w-full mt-3 ${chegouAoLocal ? "bg-green-100 text-green-700 border-green-300" : "bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100"}`}
                onClick={handleChegouAoLocal}
                disabled={chegouAoLocal || notificandoChegada}
              >
                <CheckCircle size={18} className="mr-2" />
                {notificandoChegada ? "NOTIFICANDO..." : chegouAoLocal ? "CLIENTE NOTIFICADO" : "JÁ CHEGUEI AO LOCAL"}
              </Button>

              {corridaAceita.cliente.telefone && (
                <Button
                  variant="outline"
                  className="w-full flex items-center justify-center gap-2 bg-green-50 text-green-700 border-green-300 hover:bg-green-100"
                  onClick={() => abrirWhatsAppCliente(corridaAceita?.cliente.telefone)}
                >
                  <MessageCircle size={18} className="mr-2" />
                  CONTATAR VIA WHATSAPP
                </Button>
              )}

              <Button variant="destructive" className="w-full" onClick={handleFinalizarCorrida} disabled={carregando}>
                FINALIZAR CORRIDA
              </Button>
            </CardFooter>
          </Card>
        ) : online ? (
          <>
            <h2 className="text-lg font-semibold mb-3">Solicitações de Corrida</h2>

            {solicitacoes.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center">
                  <p className="text-gray-500">Nenhuma solicitação disponível no momento.</p>
                  <p className="text-sm text-gray-400 mt-2">As solicitações aparecerão aqui quando disponíveis.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {solicitacoes.map((solicitacao) => (
                  <Card key={solicitacao.id}>
                    <CardHeader>
                      <CardTitle>{solicitacao.cliente.nome}</CardTitle>
                      <CardDescription>
                        Solicitado em {new Date(solicitacao.timestamp).toLocaleTimeString()}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div>
                          <p className="text-sm text-gray-500">Localização do cliente:</p>
                          <p className="font-medium">{solicitacao.cliente.localizacao}</p>
                        </div>

                        <div>
                          <p className="text-sm text-gray-500">Destino:</p>
                          <p className="font-medium">{solicitacao.destino}</p>
                        </div>

                        <div className="flex justify-between text-sm">
                          <div className="bg-blue-50 px-3 py-1 rounded">
                            <span className="text-blue-800">
                              Distância até o cliente: <strong>{solicitacao.distanciaCliente} km</strong>
                            </span>
                          </div>
                          <div className="bg-purple-50 px-3 py-1 rounded">
                            <span className="text-purple-800">
                              Distância até o destino: <strong>{solicitacao.distanciaDestino} km</strong>
                            </span>
                          </div>
                        </div>

                        <div className="flex space-x-2 pt-2">
                          <Button
                            className="flex-1"
                            onClick={() => handleAceitarCorrida(solicitacao)}
                            disabled={carregando}
                          >
                            <CheckCircle size={18} className="mr-1" /> Aceitar
                          </Button>
                          <Button
                            variant="outline"
                            className="flex-1"
                            onClick={() => handleRecusarCorrida(solicitacao.id)}
                            disabled={carregando}
                          >
                            <XCircle size={18} className="mr-1" /> Recusar
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        ) : (
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-gray-500">Você está offline. Altere seu status para receber solicitações.</p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}
