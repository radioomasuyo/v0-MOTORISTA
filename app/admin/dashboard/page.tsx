"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import {
  ArrowLeft,
  BarChart3,
  Download,
  Users,
  CheckCircle,
  TrendingUp,
  DollarSign,
  CreditCard,
  Wallet,
  Star,
} from "lucide-react"
import { getSupabaseClient } from "@/lib/supabase"
import { format, subDays, parseISO } from "date-fns"
import { ptBR } from "date-fns/locale"
import { toast } from "@/hooks/use-toast"

// Componente para o gráfico de barras
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
} from "chart.js"
import { Bar, Pie, Line } from "react-chartjs-2"

// Registrar componentes do Chart.js
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, PointElement, LineElement)

// Tipos para os dados
type SolicitacaoStatus = "pendente" | "aceito" | "recusado_por_motorista" | "cancelado" | "finalizada"

type Solicitacao = {
  id: number
  cliente: {
    nome: string
    telefone: string
  }
  motorista: {
    id: number
    nome: string
  }
  destino: string
  status: SolicitacaoStatus
  timestamp: string
  tempo_resposta?: number // em segundos
  valor?: number // Valor da corrida em R$
  distancia?: number // Distância em km
  avaliacao?: number // Avaliação de 1 a 5 estrelas
  comentario?: string // Comentário do cliente
}

type MotoristaEstatisticas = {
  id: number
  nome: string
  corridas_totais: number
  corridas_finalizadas: number
  corridas_canceladas: number
  tempo_medio_resposta: number
  avaliacao_media: number
  faturamento_total: number // Adicionado para relatórios financeiros
  comissao_app: number // Comissão retida pelo aplicativo
  pagamento_motorista: number // Valor pago ao motorista
}

type EstatisticasGerais = {
  total_solicitacoes: number
  solicitacoes_aceitas: number
  solicitacoes_recusadas: number
  solicitacoes_canceladas: number
  solicitacoes_finalizadas: number
  tempo_medio_resposta: number
  motoristas_ativos: number
  // Dados financeiros
  faturamento_total: number
  comissao_total: number
  pagamento_motoristas_total: number
  ticket_medio: number
}

// Dados financeiros por período
type DadosPorPeriodo = {
  periodo: string
  faturamento: number
  comissao: number
  pagamento: number
}

export default function DashboardPage() {
  const router = useRouter()
  const [autenticado, setAutenticado] = useState(false)
  const [carregando, setCarregando] = useState(true)
  const [solicitacoes, setSolicitacoes] = useState<Solicitacao[]>([])
  const [estatisticasMotoristas, setEstatisticasMotoristas] = useState<MotoristaEstatisticas[]>([])
  const [estatisticasGerais, setEstatisticasGerais] = useState<EstatisticasGerais>({
    total_solicitacoes: 0,
    solicitacoes_aceitas: 0,
    solicitacoes_recusadas: 0,
    solicitacoes_canceladas: 0,
    solicitacoes_finalizadas: 0,
    tempo_medio_resposta: 0,
    motoristas_ativos: 0,
    faturamento_total: 0,
    comissao_total: 0,
    pagamento_motoristas_total: 0,
    ticket_medio: 0,
  })
  const [periodoFiltro, setPeriodoFiltro] = useState("7dias")
  const [carregandoDados, setCarregandoDados] = useState(false)
  const [dadosMensais, setDadosMensais] = useState<DadosPorPeriodo[]>([])
  const [motoristaFiltro, setMotoristFiltro] = useState("todos")

  // Adicionar novos estados para paginação e filtros
  // Adicione junto com os outros estados no início do componente
  const [paginaAtual, setPaginaAtual] = useState(1)
  const [itensPorPagina, setItensPorPagina] = useState(10)
  const [filtroStatus, setFiltroStatus] = useState<string>("todos")

  // Verificar autenticação
  useEffect(() => {
    const verificarAutenticacao = () => {
      if (typeof window !== "undefined") {
        const adminAutenticado = localStorage.getItem("adminAutenticado")
        const adminAutenticadoEm = localStorage.getItem("adminAutenticadoEm")

        if (adminAutenticado === "true" && adminAutenticadoEm) {
          const dataAutenticacao = new Date(adminAutenticadoEm)
          const agora = new Date()
          const diferencaHoras = (agora.getTime() - dataAutenticacao.getTime()) / (1000 * 60 * 60)

          if (diferencaHoras < 24) {
            setAutenticado(true)
            setCarregando(false)
            return
          }
        }

        router.push("/admin/login")
      }
    }

    verificarAutenticacao()
  }, [router])

  // Carregar dados quando o período do filtro mudar
  useEffect(() => {
    if (autenticado) {
      carregarDados()
    }
  }, [autenticado, periodoFiltro])

  // Função para calcular o valor da corrida com base na distância
  const calcularValorCorrida = (distancia: number): number => {
    // Valor base: R$ 5,00 + R$ 2,50 por km
    return 5 + distancia * 2.5
  }

  // Função para calcular a comissão do aplicativo
  const calcularComissao = (valorTotal: number): number => {
    // Comissão de 20% sobre o valor total
    return valorTotal * 0.2
  }

  // Função para carregar os dados
  const carregarDados = async () => {
    setCarregandoDados(true)

    try {
      const supabase = getSupabaseClient()

      // Determinar a data de início com base no filtro
      let dataInicio = new Date()
      switch (periodoFiltro) {
        case "7dias":
          dataInicio = subDays(new Date(), 7)
          break
        case "30dias":
          dataInicio = subDays(new Date(), 30)
          break
        case "90dias":
          dataInicio = subDays(new Date(), 90)
          break
        case "365dias":
          dataInicio = subDays(new Date(), 365)
          break
      }

      const dataInicioStr = dataInicio.toISOString()

      // Buscar solicitações
      const { data: solicitacoesData, error: solicitacoesError } = await supabase
        .from("solicitacoes")
        .select("*")
        .gte("timestamp", dataInicioStr)
        .order("timestamp", { ascending: false })

      if (solicitacoesError) {
        console.error("Erro ao buscar solicitações:", solicitacoesError)
        toast({
          title: "Erro",
          description: "Não foi possível carregar os dados das solicitações",
          variant: "destructive",
        })
        return
      }

      // Buscar motoristas
      const { data: motoristasData, error: motoristasError } = await supabase.from("drivers").select("*")

      if (motoristasError) {
        console.error("Erro ao buscar motoristas:", motoristasError)
        toast({
          title: "Erro",
          description: "Não foi possível carregar os dados dos motoristas",
          variant: "destructive",
        })
        return
      }

      // Processar dados das solicitações
      const solicitacoesProcessadas: Solicitacao[] = solicitacoesData.map((sol) => {
        // Converter cliente e motorista de string para objeto se necessário
        const cliente = typeof sol.cliente === "string" ? JSON.parse(sol.cliente) : sol.cliente
        const motorista = typeof sol.motorista === "string" ? JSON.parse(sol.motorista) : sol.motorista

        // Gerar distância simulada entre 1 e 20 km se não existir
        const distancia = sol.distancia || Math.round((1 + Math.random() * 19) * 10) / 10

        // Calcular valor da corrida com base na distância
        const valor = sol.valor || calcularValorCorrida(distancia)

        return {
          id: sol.id,
          cliente,
          motorista,
          destino: sol.destino,
          status: sol.status,
          timestamp: sol.timestamp,
          tempo_resposta: sol.tempo_resposta || 0,
          valor,
          distancia,
          avaliacao: sol.avaliacao || 0,
        }
      })

      setSolicitacoes(solicitacoesProcessadas)

      // Calcular estatísticas gerais
      const estatisticas: EstatisticasGerais = {
        total_solicitacoes: solicitacoesProcessadas.length,
        solicitacoes_aceitas: solicitacoesProcessadas.filter((s) => s.status === "aceito").length,
        solicitacoes_recusadas: solicitacoesProcessadas.filter((s) => s.status === "recusado_por_motorista").length,
        solicitacoes_canceladas: solicitacoesProcessadas.filter((s) => s.status === "cancelado").length,
        solicitacoes_finalizadas: solicitacoesProcessadas.filter((s) => s.status === "finalizada").length,
        tempo_medio_resposta: 0,
        motoristas_ativos: motoristasData.filter((m) => m.ativo).length,
        faturamento_total: 0,
        comissao_total: 0,
        pagamento_motoristas_total: 0,
        ticket_medio: 0,
      }

      // Calcular valores financeiros
      const corridasFinalizadas = solicitacoesProcessadas.filter((s) => s.status === "finalizada")
      if (corridasFinalizadas.length > 0) {
        const faturamentoTotal = corridasFinalizadas.reduce((acc, s) => acc + (s.valor || 0), 0)
        const comissaoTotal = corridasFinalizadas.reduce((acc, s) => acc + calcularComissao(s.valor || 0), 0)
        const pagamentoMotoristas = faturamentoTotal - comissaoTotal

        estatisticas.faturamento_total = faturamentoTotal
        estatisticas.comissao_total = comissaoTotal
        estatisticas.pagamento_motoristas_total = pagamentoMotoristas
        estatisticas.ticket_medio = faturamentoTotal / corridasFinalizadas.length
      }

      // Calcular tempo médio de resposta
      const solicitacoesComTempo = solicitacoesProcessadas.filter((s) => s.tempo_resposta && s.tempo_resposta > 0)
      if (solicitacoesComTempo.length > 0) {
        const somaTempos = solicitacoesComTempo.reduce((acc, s) => acc + (s.tempo_resposta || 0), 0)
        estatisticas.tempo_medio_resposta = Math.round(somaTempos / solicitacoesComTempo.length)
      }

      setEstatisticasGerais(estatisticas)

      // Calcular estatísticas por motorista
      const estatisticasPorMotorista: Record<number, MotoristaEstatisticas> = {}

      // Inicializar estatísticas para cada motorista
      motoristasData.forEach((motorista) => {
        estatisticasPorMotorista[motorista.id] = {
          id: motorista.id,
          nome: motorista.nome,
          corridas_totais: 0,
          corridas_finalizadas: 0,
          corridas_canceladas: 0,
          tempo_medio_resposta: 0,
          avaliacao_media: motorista.avaliacao || 0,
          faturamento_total: 0,
          comissao_app: 0,
          pagamento_motorista: 0,
        }
      })

      // Calcular estatísticas com base nas solicitações
      solicitacoesProcessadas.forEach((sol) => {
        if (sol.motorista && sol.motorista.id) {
          const motoristaId = sol.motorista.id
          if (estatisticasPorMotorista[motoristaId]) {
            estatisticasPorMotorista[motoristaId].corridas_totais++

            if (sol.status === "finalizada") {
              estatisticasPorMotorista[motoristaId].corridas_finalizadas++

              // Calcular valores financeiros
              const valorCorrida = sol.valor || 0
              const comissao = calcularComissao(valorCorrida)
              const pagamentoMotorista = valorCorrida - comissao

              estatisticasPorMotorista[motoristaId].faturamento_total += valorCorrida
              estatisticasPorMotorista[motoristaId].comissao_app += comissao
              estatisticasPorMotorista[motoristaId].pagamento_motorista += pagamentoMotorista
            } else if (sol.status === "cancelado") {
              estatisticasPorMotorista[motoristaId].corridas_canceladas++
            }

            // Adicionar tempo de resposta para cálculo da média
            if (sol.tempo_resposta && sol.tempo_resposta > 0) {
              const tempoAtual = estatisticasPorMotorista[motoristaId].tempo_medio_resposta
              const corridasComTempo = estatisticasPorMotorista[motoristaId].corridas_totais
              estatisticasPorMotorista[motoristaId].tempo_medio_resposta =
                (tempoAtual * (corridasComTempo - 1) + sol.tempo_resposta) / corridasComTempo
            }
          }
        }
      })

      // Converter para array e ordenar por número de corridas
      const estatisticasMotoristaArray = Object.values(estatisticasPorMotorista)
        .filter((m) => m.corridas_totais > 0)
        .sort((a, b) => b.corridas_totais - a.corridas_totais)

      setEstatisticasMotoristas(estatisticasMotoristaArray)

      // Calcular dados financeiros por mês
      if (periodoFiltro === "365dias" || periodoFiltro === "90dias") {
        // Criar um mapa para agrupar por mês
        const dadosPorMes = new Map<string, DadosPorPeriodo>()

        // Se temos solicitações finalizadas
        if (corridasFinalizadas.length > 0) {
          // Agrupar por mês
          corridasFinalizadas.forEach((sol) => {
            const data = parseISO(sol.timestamp)
            const mesAno = format(data, "yyyy-MM")
            const nomeMes = format(data, "MMM/yyyy", { locale: ptBR })

            if (!dadosPorMes.has(mesAno)) {
              dadosPorMes.set(mesAno, {
                periodo: nomeMes,
                faturamento: 0,
                comissao: 0,
                pagamento: 0,
              })
            }

            const valorCorrida = sol.valor || 0
            const comissao = calcularComissao(valorCorrida)
            const pagamento = valorCorrida - comissao

            const dadosMes = dadosPorMes.get(mesAno)!
            dadosMes.faturamento += valorCorrida
            dadosMes.comissao += comissao
            dadosMes.pagamento += pagamento
          })
        }

        // Converter mapa para array e ordenar por data
        const dadosMensaisArray = Array.from(dadosPorMes.entries())
          .map(([key, value]) => value)
          .sort((a, b) => {
            const dateA = new Date(a.periodo.split("/")[1] + "-" + a.periodo.split("/")[0])
            const dateB = new Date(b.periodo.split("/")[1] + "-" + b.periodo.split("/")[0])
            return dateA.getTime() - dateB.getTime()
          })

        setDadosMensais(dadosMensaisArray)
      }
    } catch (error) {
      console.error("Erro ao carregar dados:", error)
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao carregar os dados do dashboard",
        variant: "destructive",
      })
    } finally {
      setCarregandoDados(false)
    }
  }

  // Adicionar função para filtrar solicitações
  // Adicione esta função antes do return do componente
  const solicitacoesFiltradas = useMemo(() => {
    let filtradas = [...solicitacoes]

    // Aplicar filtro de status
    if (filtroStatus !== "todos") {
      filtradas = filtradas.filter((s) => s.status === filtroStatus)
    }

    return filtradas
  }, [solicitacoes, filtroStatus])

  // Adicionar função para paginar solicitações
  // Adicione esta função após a função de filtrar
  const solicitacoesPaginadas = useMemo(() => {
    if (itensPorPagina === 0) {
      return solicitacoesFiltradas // Mostrar todos
    }

    const inicio = (paginaAtual - 1) * itensPorPagina
    const fim = inicio + itensPorPagina

    return solicitacoesFiltradas.slice(inicio, fim)
  }, [solicitacoesFiltradas, paginaAtual, itensPorPagina])

  // Calcular o número total de páginas
  const totalPaginas = useMemo(() => {
    if (itensPorPagina === 0) return 1
    return Math.ceil(solicitacoesFiltradas.length / itensPorPagina)
  }, [solicitacoesFiltradas.length, itensPorPagina])

  // Função para exportar dados
  const exportarDados = () => {
    try {
      // Criar objeto para exportação
      const dadosExportacao = {
        data_exportacao: new Date().toISOString(),
        periodo: periodoFiltro,
        estatisticas_gerais: estatisticasGerais,
        estatisticas_motoristas: estatisticasMotoristas,
        solicitacoes: solicitacoes,
        dados_financeiros: {
          faturamento_total: estatisticasGerais.faturamento_total,
          comissao_total: estatisticasGerais.comissao_total,
          pagamento_motoristas: estatisticasGerais.pagamento_motoristas_total,
          ticket_medio: estatisticasGerais.ticket_medio,
          dados_mensais: dadosMensais,
        },
      }

      // Converter para JSON
      const jsonString = JSON.stringify(dadosExportacao, null, 2)
      const blob = new Blob([jsonString], { type: "application/json" })
      const url = URL.createObjectURL(blob)

      // Criar link para download
      const a = document.createElement("a")
      a.href = url
      a.download = `relatorio_jamal_express_${format(new Date(), "yyyy-MM-dd")}.json`
      document.body.appendChild(a)
      a.click()

      // Limpar
      setTimeout(() => {
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      }, 0)

      toast({
        title: "Exportação concluída",
        description: "Os dados foram exportados com sucesso",
        variant: "success",
      })
    } catch (error) {
      console.error("Erro ao exportar dados:", error)
      toast({
        title: "Erro",
        description: "Não foi possível exportar os dados",
        variant: "destructive",
      })
    }
  }

  // Dados para o gráfico de status das solicitações
  const dadosGraficoStatus = {
    labels: ["Aceitas", "Finalizadas", "Recusadas", "Canceladas", "Pendentes"],
    datasets: [
      {
        label: "Quantidade",
        data: [
          estatisticasGerais.solicitacoes_aceitas,
          estatisticasGerais.solicitacoes_finalizadas,
          estatisticasGerais.solicitacoes_recusadas,
          estatisticasGerais.solicitacoes_canceladas,
          estatisticasGerais.total_solicitacoes -
            (estatisticasGerais.solicitacoes_aceitas +
              estatisticasGerais.solicitacoes_finalizadas +
              estatisticasGerais.solicitacoes_recusadas +
              estatisticasGerais.solicitacoes_canceladas),
        ],
        backgroundColor: ["#4ade80", "#3b82f6", "#f97316", "#ef4444", "#a3a3a3"],
      },
    ],
  }

  // Dados para o gráfico de corridas por motorista
  const dadosGraficoMotoristas = {
    labels: estatisticasMotoristas.slice(0, 5).map((m) => m.nome),
    datasets: [
      {
        label: "Corridas Finalizadas",
        data: estatisticasMotoristas.slice(0, 5).map((m) => m.corridas_finalizadas),
        backgroundColor: "#3b82f6",
      },
      {
        label: "Corridas Canceladas",
        data: estatisticasMotoristas.slice(0, 5).map((m) => m.corridas_canceladas),
        backgroundColor: "#ef4444",
      },
    ],
  }

  // Dados para o gráfico de tempo médio de resposta
  const dadosGraficoTempoResposta = {
    labels: estatisticasMotoristas.slice(0, 5).map((m) => m.nome),
    datasets: [
      {
        label: "Tempo Médio (segundos)",
        data: estatisticasMotoristas.slice(0, 5).map((m) => Math.round(m.tempo_medio_resposta)),
        borderColor: "#8b5cf6",
        backgroundColor: "rgba(139, 92, 246, 0.2)",
        tension: 0.4,
      },
    ],
  }

  // Dados para o gráfico de faturamento por motorista
  const dadosGraficoFaturamento = {
    labels: estatisticasMotoristas.slice(0, 5).map((m) => m.nome),
    datasets: [
      {
        label: "Faturamento (R$)",
        data: estatisticasMotoristas.slice(0, 5).map((m) => m.faturamento_total),
        backgroundColor: "#22c55e",
      },
    ],
  }

  // Dados para o gráfico de distribuição de receita
  const dadosGraficoDistribuicaoReceita = {
    labels: ["Comissão App", "Pagamento aos Motoristas"],
    datasets: [
      {
        data: [estatisticasGerais.comissao_total, estatisticasGerais.pagamento_motoristas_total],
        backgroundColor: ["#8b5cf6", "#3b82f6"],
      },
    ],
  }

  // Dados para o gráfico de faturamento mensal
  const dadosGraficoFaturamentoMensal = {
    labels: dadosMensais.map((d) => d.periodo),
    datasets: [
      {
        label: "Faturamento Total",
        data: dadosMensais.map((d) => d.faturamento),
        backgroundColor: "rgba(34, 197, 94, 0.5)",
        borderColor: "#22c55e",
        borderWidth: 2,
      },
      {
        label: "Comissão App",
        data: dadosMensais.map((d) => d.comissao),
        backgroundColor: "rgba(139, 92, 246, 0.5)",
        borderColor: "#8b5cf6",
        borderWidth: 2,
      },
      {
        label: "Pagamento Motoristas",
        data: dadosMensais.map((d) => d.pagamento),
        backgroundColor: "rgba(59, 130, 246, 0.5)",
        borderColor: "#3b82f6",
        borderWidth: 2,
      },
    ],
  }

  // Opções para os gráficos
  const opcoesGrafico = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top" as const,
      },
    },
  }

  if (carregando) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    )
  }

  if (!autenticado) {
    return null // Não renderizar nada enquanto redireciona
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <header className="bg-purple-600 p-4 text-white flex items-center justify-between shadow-md">
        <div className="flex items-center">
          <Link href="/admin/login" className="mr-4">
            <ArrowLeft size={24} />
          </Link>
          <h1 className="text-xl font-bold">Dashboard</h1>
        </div>

        <div className="flex items-center space-x-2">
          <Select value={periodoFiltro} onValueChange={setPeriodoFiltro}>
            <SelectTrigger className="w-[180px] bg-white/10 border-white/20 text-white">
              <SelectValue placeholder="Selecione o período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7dias">Últimos 7 dias</SelectItem>
              <SelectItem value="30dias">Últimos 30 dias</SelectItem>
              <SelectItem value="90dias">Últimos 90 dias</SelectItem>
              <SelectItem value="365dias">Último ano</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" className="bg-white/10 border-white/20 text-white" onClick={exportarDados}>
            <Download size={16} className="mr-2" />
            Exportar
          </Button>
        </div>
      </header>

      <main className="flex-1 p-4">
        {carregandoDados ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Cards de estatísticas gerais */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Total de Solicitações</p>
                      <p className="text-3xl font-bold">{estatisticasGerais.total_solicitacoes}</p>
                    </div>
                    <div className="bg-blue-100 p-3 rounded-full">
                      <BarChart3 className="h-6 w-6 text-blue-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Corridas Finalizadas</p>
                      <p className="text-3xl font-bold">{estatisticasGerais.solicitacoes_finalizadas}</p>
                    </div>
                    <div className="bg-green-100 p-3 rounded-full">
                      <CheckCircle className="h-6 w-6 text-green-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Faturamento Total</p>
                      <p className="text-3xl font-bold">
                        R$ {estatisticasGerais.faturamento_total.toFixed(2).replace(".", ",")}
                      </p>
                    </div>
                    <div className="bg-green-100 p-3 rounded-full">
                      <DollarSign className="h-6 w-6 text-green-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Ticket Médio</p>
                      <p className="text-3xl font-bold">
                        R$ {estatisticasGerais.ticket_medio.toFixed(2).replace(".", ",")}
                      </p>
                    </div>
                    <div className="bg-purple-100 p-3 rounded-full">
                      <CreditCard className="h-6 w-6 text-purple-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Tabs para diferentes relatórios */}
            <Tabs defaultValue="visao-geral" className="w-full">
              <TabsList className="grid grid-cols-5 mb-4">
                <TabsTrigger value="visao-geral">Visão Geral</TabsTrigger>
                <TabsTrigger value="motoristas">Motoristas</TabsTrigger>
                <TabsTrigger value="solicitacoes">Solicitações</TabsTrigger>
                <TabsTrigger value="financeiro">Financeiro</TabsTrigger>
                <TabsTrigger value="tendencias">Tendências</TabsTrigger>
              </TabsList>

              <Card className="border-t-0 rounded-tl-none">
                {/* Visão Geral */}
                <TabsContent value="visao-geral" className="mt-0">
                  <CardHeader>
                    <CardTitle>Visão Geral do Sistema</CardTitle>
                    <CardDescription>
                      Resumo das principais métricas do período de{" "}
                      {periodoFiltro === "7dias"
                        ? "7 dias"
                        : periodoFiltro === "30dias"
                          ? "30 dias"
                          : periodoFiltro === "90dias"
                            ? "90 dias"
                            : "1 ano"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="h-80">
                        <h3 className="text-lg font-medium mb-4">Status das Solicitações</h3>
                        <Pie data={dadosGraficoStatus} options={opcoesGrafico} />
                      </div>
                      <div className="h-80">
                        <h3 className="text-lg font-medium mb-4">Top 5 Motoristas</h3>
                        <Bar data={dadosGraficoMotoristas} options={opcoesGrafico} />
                      </div>
                    </div>
                  </CardContent>
                </TabsContent>

                {/* Motoristas */}
                <TabsContent value="motoristas" className="mt-0">
                  <CardHeader>
                    <CardTitle>Desempenho dos Motoristas</CardTitle>
                    <CardDescription>Estatísticas detalhadas por motorista</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-6 h-80">
                      <h3 className="text-lg font-medium mb-4">Tempo Médio de Resposta (Top 5)</h3>
                      <Line data={dadosGraficoTempoResposta} options={opcoesGrafico} />
                    </div>

                    <h3 className="text-lg font-medium mb-4">Lista de Motoristas</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="bg-gray-100">
                            <th className="border p-2 text-left">Motorista</th>
                            <th className="border p-2 text-center">Corridas Totais</th>
                            <th className="border p-2 text-center">Finalizadas</th>
                            <th className="border p-2 text-center">Canceladas</th>
                            <th className="border p-2 text-center">Tempo Médio (seg)</th>
                            <th className="border p-2 text-center">Avaliação</th>
                          </tr>
                        </thead>
                        <tbody>
                          {estatisticasMotoristas.map((motorista) => (
                            <tr key={motorista.id} className="hover:bg-gray-50">
                              <td className="border p-2">{motorista.nome}</td>
                              <td className="border p-2 text-center">{motorista.corridas_totais}</td>
                              <td className="border p-2 text-center">{motorista.corridas_finalizadas}</td>
                              <td className="border p-2 text-center">{motorista.corridas_canceladas}</td>
                              <td className="border p-2 text-center">{Math.round(motorista.tempo_medio_resposta)}</td>
                              <td className="border p-2 text-center">{motorista.avaliacao_media.toFixed(1)}</td>
                            </tr>
                          ))}
                          {estatisticasMotoristas.length === 0 && (
                            <tr>
                              <td colSpan={6} className="border p-4 text-center text-gray-500">
                                Nenhum dado disponível para o período selecionado
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </TabsContent>

                {/* Solicitações */}

                <TabsContent value="solicitacoes" className="mt-0">
                  <CardHeader>
                    <CardTitle>Histórico de Solicitações</CardTitle>
                    <CardDescription>Detalhes de todas as solicitações no período</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
                      <div className="flex flex-col sm:flex-row gap-2">
                        <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                          <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Filtrar por status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="todos">Todos os status</SelectItem>
                            <SelectItem value="pendente">Pendentes</SelectItem>
                            <SelectItem value="aceito">Aceitas</SelectItem>
                            <SelectItem value="finalizada">Finalizadas</SelectItem>
                            <SelectItem value="recusado_por_motorista">Recusadas</SelectItem>
                            <SelectItem value="cancelado">Canceladas</SelectItem>
                          </SelectContent>
                        </Select>

                        <Select
                          value={itensPorPagina.toString()}
                          onValueChange={(value) => {
                            setPaginaAtual(1) // Resetar para a primeira página ao mudar itens por página
                            setItensPorPagina(Number.parseInt(value))
                          }}
                        >
                          <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Itens por página" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="10">10 por página</SelectItem>
                            <SelectItem value="20">20 por página</SelectItem>
                            <SelectItem value="30">30 por página</SelectItem>
                            <SelectItem value="0">Mostrar todos</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="text-sm text-gray-500">
                        Mostrando {itensPorPagina === 0 ? "todos os" : solicitacoesPaginadas.length} de{" "}
                        {solicitacoesFiltradas.length} resultados
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="bg-gray-100">
                            <th className="border p-2 text-left">ID</th>
                            <th className="border p-2 text-left">Cliente</th>
                            <th className="border p-2 text-left">Motorista</th>
                            <th className="border p-2 text-left">Destino</th>
                            <th className="border p-2 text-center">Status</th>
                            <th className="border p-2 text-center">Valor (R$)</th>
                            <th className="border p-2 text-center">Data/Hora</th>
                            <th className="border p-2 text-center">Avaliação</th>
                          </tr>
                        </thead>
                        <tbody>
                          {solicitacoesPaginadas.map((solicitacao) => (
                            <tr key={solicitacao.id} className="hover:bg-gray-50">
                              <td className="border p-2">{solicitacao.id}</td>
                              <td className="border p-2">{solicitacao.cliente?.nome || "N/A"}</td>
                              <td className="border p-2">{solicitacao.motorista?.nome || "N/A"}</td>
                              <td className="border p-2">{solicitacao.destino || "N/A"}</td>
                              <td className="border p-2 text-center">
                                <span
                                  className={`px-2 py-1 rounded text-xs ${
                                    solicitacao.status === "aceito"
                                      ? "bg-blue-100 text-blue-800"
                                      : solicitacao.status === "finalizada"
                                        ? "bg-green-100 text-green-800"
                                        : solicitacao.status === "recusado_por_motorista"
                                          ? "bg-orange-100 text-orange-800"
                                          : solicitacao.status === "cancelado"
                                            ? "bg-red-100 text-red-800"
                                            : "bg-gray-100 text-gray-800"
                                  }`}
                                >
                                  {solicitacao.status === "aceito"
                                    ? "Aceita"
                                    : solicitacao.status === "finalizada"
                                      ? "Finalizada"
                                      : solicitacao.status === "recusado_por_motorista"
                                        ? "Recusada"
                                        : solicitacao.status === "cancelado"
                                          ? "Cancelada"
                                          : "Pendente"}
                                </span>
                              </td>
                              <td className="border p-2 text-center">
                                {solicitacao.valor ? `R$ ${solicitacao.valor.toFixed(2).replace(".", ",")}` : "N/A"}
                              </td>
                              <td className="border p-2 text-center">
                                {format(new Date(solicitacao.timestamp), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                              </td>
                              <td className="border p-2 text-center">
                                {solicitacao.avaliacao ? (
                                  <div className="flex items-center justify-center">
                                    <span className="font-bold mr-1">{solicitacao.avaliacao}</span>
                                    <Star size={16} className="text-yellow-400 fill-yellow-400" />
                                  </div>
                                ) : (
                                  <span className="text-gray-400">N/A</span>
                                )}
                              </td>
                            </tr>
                          ))}
                          {solicitacoesPaginadas.length === 0 && (
                            <tr>
                              <td colSpan={8} className="border p-4 text-center text-gray-500">
                                Nenhuma solicitação encontrada para o período selecionado
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Paginação */}
                    {itensPorPagina > 0 && totalPaginas > 1 && (
                      <div className="flex justify-between items-center mt-4">
                        <Button
                          variant="outline"
                          onClick={() => setPaginaAtual((p) => Math.max(1, p - 1))}
                          disabled={paginaAtual === 1}
                        >
                          Anterior
                        </Button>

                        <div className="flex items-center gap-1">
                          {Array.from({ length: totalPaginas }, (_, i) => i + 1).map((pagina) => (
                            <Button
                              key={pagina}
                              variant={paginaAtual === pagina ? "default" : "outline"}
                              size="sm"
                              className="w-8 h-8 p-0"
                              onClick={() => setPaginaAtual(pagina)}
                            >
                              {pagina}
                            </Button>
                          ))}
                        </div>

                        <Button
                          variant="outline"
                          onClick={() => setPaginaAtual((p) => Math.min(totalPaginas, p + 1))}
                          disabled={paginaAtual === totalPaginas}
                        >
                          Próxima
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </TabsContent>

                {/* Financeiro - Nova aba */}
                <TabsContent value="financeiro" className="mt-0">
                  <CardHeader>
                    <CardTitle>Relatório Financeiro</CardTitle>
                    <CardDescription>Análise detalhada de faturamento e pagamentos</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {/* Cards com métricas financeiras */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                      <Card>
                        <CardContent className="pt-6">
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="text-sm font-medium text-gray-500">Faturamento Total</p>
                              <p className="text-3xl font-bold">
                                R$ {estatisticasGerais.faturamento_total.toFixed(2).replace(".", ",")}
                              </p>
                              <p className="text-xs text-gray-500 mt-1">
                                {estatisticasGerais.solicitacoes_finalizadas} corridas finalizadas
                              </p>
                            </div>
                            <div className="bg-green-100 p-3 rounded-full">
                              <DollarSign className="h-6 w-6 text-green-600" />
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardContent className="pt-6">
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="text-sm font-medium text-gray-500">Comissão do App</p>
                              <p className="text-3xl font-bold">
                                R$ {estatisticasGerais.comissao_total.toFixed(2).replace(".", ",")}
                              </p>
                              <p className="text-xs text-gray-500 mt-1">
                                {estatisticasGerais.faturamento_total > 0
                                  ? (
                                      (estatisticasGerais.comissao_total / estatisticasGerais.faturamento_total) *
                                      100
                                    ).toFixed(1)
                                  : 0}
                                % do faturamento
                              </p>
                            </div>
                            <div className="bg-purple-100 p-3 rounded-full">
                              <Wallet className="h-6 w-6 text-purple-600" />
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardContent className="pt-6">
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="text-sm font-medium text-gray-500">Pagamentos aos Motoristas</p>
                              <p className="text-3xl font-bold">
                                R$ {estatisticasGerais.pagamento_motoristas_total.toFixed(2).replace(".", ",")}
                              </p>
                              <p className="text-xs text-gray-500 mt-1">
                                {estatisticasGerais.faturamento_total > 0
                                  ? (
                                      (estatisticasGerais.pagamento_motoristas_total /
                                        estatisticasGerais.faturamento_total) *
                                      100
                                    ).toFixed(1)
                                  : 0}
                                % do faturamento
                              </p>
                            </div>
                            <div className="bg-blue-100 p-3 rounded-full">
                              <Users className="h-6 w-6 text-blue-600" />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Gráficos financeiros */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                      <div className="h-80">
                        <h3 className="text-lg font-medium mb-4">Distribuição de Receita</h3>
                        <Pie data={dadosGraficoDistribuicaoReceita} options={opcoesGrafico} />
                      </div>
                      <div className="h-80">
                        <h3 className="text-lg font-medium mb-4">Top 5 Motoristas por Faturamento</h3>
                        <Bar data={dadosGraficoFaturamento} options={opcoesGrafico} />
                      </div>
                    </div>

                    {/* Faturamento mensal */}
                    {dadosMensais.length > 0 && (
                      <div className="mb-6">
                        <h3 className="text-lg font-medium mb-4">Evolução Mensal</h3>
                        <div className="h-80">
                          <Bar data={dadosGraficoFaturamentoMensal} options={opcoesGrafico} />
                        </div>
                      </div>
                    )}

                    {/* Tabela de pagamentos por motorista */}
                    <h3 className="text-lg font-medium mb-4">Relatório de Pagamentos por Motorista</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="bg-gray-100">
                            <th className="border p-2 text-left">Motorista</th>
                            <th className="border p-2 text-center">Corridas Finalizadas</th>
                            <th className="border p-2 text-center">Faturamento (R$)</th>
                            <th className="border p-2 text-center">Comissão App (R$)</th>
                            <th className="border p-2 text-center">Pagamento (R$)</th>
                            <th className="border p-2 text-center">Média por Corrida (R$)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {estatisticasMotoristas
                            .filter((m) => m.corridas_finalizadas > 0)
                            .sort((a, b) => b.faturamento_total - a.faturamento_total)
                            .map((motorista) => (
                              <tr key={motorista.id} className="hover:bg-gray-50">
                                <td className="border p-2">{motorista.nome}</td>
                                <td className="border p-2 text-center">{motorista.corridas_finalizadas}</td>
                                <td className="border p-2 text-center">
                                  R$ {motorista.faturamento_total.toFixed(2).replace(".", ",")}
                                </td>
                                <td className="border p-2 text-center">
                                  R$ {motorista.comissao_app.toFixed(2).replace(".", ",")}
                                </td>
                                <td className="border p-2 text-center">
                                  R$ {motorista.pagamento_motorista.toFixed(2).replace(".", ",")}
                                </td>
                                <td className="border p-2 text-center">
                                  R${" "}
                                  {(motorista.faturamento_total / motorista.corridas_finalizadas)
                                    .toFixed(2)
                                    .replace(".", ",")}
                                </td>
                              </tr>
                            ))}
                          {estatisticasMotoristas.filter((m) => m.corridas_finalizadas > 0).length === 0 && (
                            <tr>
                              <td colSpan={6} className="border p-4 text-center text-gray-500">
                                Nenhum dado disponível para o período selecionado
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </TabsContent>

                {/* Tendências */}
                <TabsContent value="tendencias" className="mt-0">
                  <CardHeader>
                    <CardTitle>Análise de Tendências</CardTitle>
                    <CardDescription>Visualize tendências e padrões ao longo do tempo</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-lg">Taxa de Aceitação</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-3xl font-bold">
                                {estatisticasGerais.total_solicitacoes > 0
                                  ? Math.round(
                                      (estatisticasGerais.solicitacoes_aceitas /
                                        estatisticasGerais.total_solicitacoes) *
                                        100,
                                    )
                                  : 0}
                                %
                              </p>
                              <p className="text-sm text-gray-500">
                                {estatisticasGerais.solicitacoes_aceitas} de {estatisticasGerais.total_solicitacoes}{" "}
                                solicitações
                              </p>
                            </div>
                            <div
                              className={`p-3 rounded-full ${
                                estatisticasGerais.total_solicitacoes > 0 &&
                                (estatisticasGerais.solicitacoes_aceitas / estatisticasGerais.total_solicitacoes) *
                                  100 >
                                  70
                                  ? "bg-green-100"
                                  : "bg-amber-100"
                              }`}
                            >
                              <TrendingUp
                                className={`h-6 w-6 ${
                                  estatisticasGerais.total_solicitacoes > 0 &&
                                  (estatisticasGerais.solicitacoes_aceitas / estatisticasGerais.total_solicitacoes) *
                                    100 >
                                    70
                                    ? "text-green-600"
                                    : "text-amber-600"
                                }`}
                              />
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-lg">Taxa de Conclusão</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-3xl font-bold">
                                {estatisticasGerais.solicitacoes_aceitas > 0
                                  ? Math.round(
                                      (estatisticasGerais.solicitacoes_finalizadas /
                                        estatisticasGerais.solicitacoes_aceitas) *
                                        100,
                                    )
                                  : 0}
                                %
                              </p>
                              <p className="text-sm text-gray-500">
                                {estatisticasGerais.solicitacoes_finalizadas} de{" "}
                                {estatisticasGerais.solicitacoes_aceitas} aceitas
                              </p>
                            </div>
                            <div
                              className={`p-3 rounded-full ${
                                estatisticasGerais.solicitacoes_aceitas > 0 &&
                                (estatisticasGerais.solicitacoes_finalizadas /
                                  estatisticasGerais.solicitacoes_aceitas) *
                                  100 >
                                  80
                                  ? "bg-green-100"
                                  : "bg-amber-100"
                              }`}
                            >
                              <CheckCircle
                                className={`h-6 w-6 ${
                                  estatisticasGerais.solicitacoes_aceitas > 0 &&
                                  (estatisticasGerais.solicitacoes_finalizadas /
                                    estatisticasGerais.solicitacoes_aceitas) *
                                    100 >
                                    80
                                    ? "text-green-600"
                                    : "text-amber-600"
                                }`}
                              />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </CardContent>
                </TabsContent>
              </Card>
            </Tabs>
          </div>
        )}
      </main>
    </div>
  )
}
