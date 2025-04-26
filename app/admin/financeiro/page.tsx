"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import {
  ArrowLeft,
  Calendar,
  Download,
  Users,
  CheckCircle,
  Clock,
  DollarSign,
  FileText,
  CreditCard,
  AlertTriangle,
} from "lucide-react"
import Link from "next/link"
import { format, subMonths } from "date-fns"
import { ptBR } from "date-fns/locale"
import { toast } from "@/hooks/use-toast"
import { getSupabaseClient } from "@/lib/supabase"
import {
  type Payment,
  obterPagamentosMotorista,
  gerarPagamentoMensal,
  atualizarStatusPagamento,
} from "@/services/financialService"

export default function FinanceiroPage() {
  const router = useRouter()
  const [autenticado, setAutenticado] = useState(false)
  const [carregando, setCarregando] = useState(true)
  const [pagamentos, setPagamentos] = useState<Payment[]>([])
  const [motoristas, setMotoristas] = useState<{ id: number; nome: string }[]>([])
  const [motoristaFiltro, setMotoristaFiltro] = useState<string>("todos")
  const [mesFiltro, setMesFiltro] = useState<string>(format(new Date(), "yyyy-MM"))
  const [tabAtiva, setTabAtiva] = useState<string>("pagamentos")
  const [carregandoPagamentos, setCarregandoPagamentos] = useState(false)
  const [processandoPagamento, setProcessandoPagamento] = useState(false)

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
            carregarMotoristas()
            return
          }
        }

        router.push("/admin/login")
      }
    }

    verificarAutenticacao()
  }, [router])

  // Carregar lista de motoristas
  const carregarMotoristas = async () => {
    try {
      const supabase = getSupabaseClient()
      const { data, error } = await supabase.from("drivers").select("id, nome").eq("ativo", true).order("nome")

      if (error) {
        console.error("Erro ao buscar motoristas:", error)
        throw error
      }

      setMotoristas(data || [])

      // Após carregar motoristas, carregar pagamentos
      await carregarPagamentos()
    } catch (error) {
      console.error("Erro ao carregar motoristas:", error)
      toast({
        title: "Erro",
        description: "Não foi possível carregar a lista de motoristas",
        variant: "destructive",
      })
    }
  }

  // Carregar pagamentos com base nos filtros
  const carregarPagamentos = async () => {
    setCarregandoPagamentos(true)

    try {
      const supabase = getSupabaseClient()

      // Se um motorista específico for selecionado
      if (motoristaFiltro !== "todos") {
        const motoristaId = Number.parseInt(motoristaFiltro)
        const pagamentosMotorista = await obterPagamentosMotorista(motoristaId)
        setPagamentos(pagamentosMotorista)
      } else {
        // Buscar todos os pagamentos
        const { data, error } = await supabase.from("pagamentos").select("*").order("data_fim", { ascending: false })

        if (error) {
          console.error("Erro ao buscar pagamentos:", error)
          throw error
        }

        setPagamentos(data || [])
      }
    } catch (error) {
      console.error("Erro ao carregar pagamentos:", error)
      toast({
        title: "Erro",
        description: "Não foi possível carregar os pagamentos",
        variant: "destructive",
      })
    } finally {
      setCarregandoPagamentos(false)
    }
  }

  // Efeito para recarregar pagamentos quando os filtros mudarem
  useEffect(() => {
    if (autenticado) {
      carregarPagamentos()
    }
  }, [autenticado, motoristaFiltro, mesFiltro])

  // Função para gerar pagamento
  const handleGerarPagamento = async () => {
    if (motoristaFiltro === "todos") {
      toast({
        title: "Selecione um motorista",
        description: "Você precisa selecionar um motorista específico para gerar o pagamento",
        variant: "destructive",
      })
      return
    }

    setProcessandoPagamento(true)

    try {
      const motoristaId = Number.parseInt(motoristaFiltro)
      const [ano, mes] = mesFiltro.split("-").map(Number)

      const pagamento = await gerarPagamentoMensal(motoristaId, mes, ano)

      if (pagamento) {
        toast({
          title: "Pagamento gerado",
          description: `Pagamento para ${pagamento.motorista_nome} gerado com sucesso`,
          variant: "success",
        })

        // Recarregar pagamentos
        await carregarPagamentos()
      } else {
        toast({
          title: "Sem corridas no período",
          description: "Não há corridas finalizadas neste período para gerar pagamento",
          variant: "info",
        })
      }
    } catch (error) {
      console.error("Erro ao gerar pagamento:", error)
      toast({
        title: "Erro",
        description: "Não foi possível gerar o pagamento",
        variant: "destructive",
      })
    } finally {
      setProcessandoPagamento(false)
    }
  }

  // Função para atualizar status de pagamento
  const handleAtualizarStatus = async (
    pagamentoId: number,
    novoStatus: "pendente" | "processando" | "pago" | "cancelado",
  ) => {
    try {
      await atualizarStatusPagamento(pagamentoId, novoStatus)

      toast({
        title: "Status atualizado",
        description: `Status do pagamento atualizado para ${novoStatus}`,
        variant: "success",
      })

      // Recarregar pagamentos
      await carregarPagamentos()
    } catch (error) {
      console.error("Erro ao atualizar status:", error)
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o status do pagamento",
        variant: "destructive",
      })
    }
  }

  // Função para exportar pagamentos
  const exportarPagamentos = () => {
    try {
      // Criar objeto para exportação
      const dadosExportacao = {
        data_exportacao: new Date().toISOString(),
        filtros: {
          motorista:
            motoristaFiltro === "todos"
              ? "Todos os motoristas"
              : motoristas.find((m) => m.id.toString() === motoristaFiltro)?.nome,
          mes: mesFiltro,
        },
        pagamentos: pagamentos,
      }

      // Converter para CSV
      let csv = "ID,Motorista,Total Corridas,Valor Bruto,Comissão,Valor Líquido,Período,Status,Data Pagamento\n"

      pagamentos.forEach((p) => {
        const dataInicio = format(new Date(p.data_inicio), "dd/MM/yyyy")
        const dataFim = format(new Date(p.data_fim), "dd/MM/yyyy")
        const dataPagamento = p.data_pagamento ? format(new Date(p.data_pagamento), "dd/MM/yyyy") : "-"

        csv += `${p.id},${p.motorista_nome},${p.total_corridas},${p.valor_bruto.toFixed(2)},${p.comissao_app.toFixed(2)},${p.valor_liquido.toFixed(2)},${dataInicio} a ${dataFim},${p.status},${dataPagamento}\n`
      })

      // Criar arquivo para download
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `pagamentos_jamal_express_${format(new Date(), "yyyy-MM-dd")}.csv`
      document.body.appendChild(a)
      a.click()

      // Limpar
      setTimeout(() => {
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      }, 0)

      toast({
        title: "Exportação concluída",
        description: "Os pagamentos foram exportados com sucesso",
        variant: "success",
      })
    } catch (error) {
      console.error("Erro ao exportar pagamentos:", error)
      toast({
        title: "Erro",
        description: "Não foi possível exportar os pagamentos",
        variant: "destructive",
      })
    }
  }

  if (carregando) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    )
  }

  if (!autenticado) {
    return null // Não renderizar nada enquanto redireciona
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <header className="bg-green-600 p-4 text-white flex items-center justify-between shadow-md">
        <div className="flex items-center">
          <Link href="/admin/login" className="mr-4">
            <ArrowLeft size={24} />
          </Link>
          <h1 className="text-xl font-bold">Gestão Financeira</h1>
        </div>

        <div className="flex items-center space-x-2">
          <Button variant="outline" className="bg-white/10 border-white/20 text-white" onClick={exportarPagamentos}>
            <Download size={16} className="mr-2" />
            Exportar
          </Button>
        </div>
      </header>

      <main className="flex-1 p-4">
        <Tabs defaultValue="pagamentos" className="w-full" onValueChange={setTabAtiva}>
          <TabsList className="grid grid-cols-2 mb-4">
            <TabsTrigger value="pagamentos" className="flex items-center gap-2">
              <CreditCard size={16} />
              <span>Pagamentos aos Motoristas</span>
            </TabsTrigger>
            <TabsTrigger value="relatorios" className="flex items-center gap-2">
              <FileText size={16} />
              <span>Relatórios Financeiros</span>
            </TabsTrigger>
          </TabsList>

          <Card className="border-t-0 rounded-tl-none">
            {/* Aba de Pagamentos aos Motoristas */}
            <TabsContent value="pagamentos" className="mt-0">
              <CardHeader>
                <CardTitle>Pagamentos aos Motoristas</CardTitle>
                <CardDescription>Gerencie pagamentos e visualize histórico de pagamentos</CardDescription>
              </CardHeader>
              <CardContent>
                {/* Filtros */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Motorista</label>
                    <Select value={motoristaFiltro} onValueChange={setMotoristaFiltro}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um motorista" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos os motoristas</SelectItem>
                        {motoristas.map((motorista) => (
                          <SelectItem key={motorista.id} value={motorista.id.toString()}>
                            {motorista.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Período</label>
                    <Select value={mesFiltro} onValueChange={setMesFiltro}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um mês" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 12 }).map((_, i) => {
                          const data = subMonths(new Date(), i)
                          const valor = format(data, "yyyy-MM")
                          const label = format(data, "MMMM yyyy", { locale: ptBR })
                          return (
                            <SelectItem key={valor} value={valor}>
                              {label}
                            </SelectItem>
                          )
                        })}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-end">
                    <Button
                      onClick={handleGerarPagamento}
                      disabled={motoristaFiltro === "todos" || processandoPagamento}
                      className="w-full"
                    >
                      {processandoPagamento ? (
                        <>
                          <Clock size={16} className="mr-2 animate-spin" />
                          Processando...
                        </>
                      ) : (
                        <>
                          <DollarSign size={16} className="mr-2" />
                          Gerar Pagamento
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {/* Tabela de pagamentos */}
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border p-2 text-left">ID</th>
                        <th className="border p-2 text-left">Motorista</th>
                        <th className="border p-2 text-center">Período</th>
                        <th className="border p-2 text-center">Corridas</th>
                        <th className="border p-2 text-center">Valor Bruto</th>
                        <th className="border p-2 text-center">Comissão App</th>
                        <th className="border p-2 text-center">Valor Líquido</th>
                        <th className="border p-2 text-center">Status</th>
                        <th className="border p-2 text-center">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {carregandoPagamentos ? (
                        <tr>
                          <td colSpan={9} className="border p-4 text-center">
                            <div className="flex items-center justify-center">
                              <Clock className="animate-spin h-5 w-5 mr-2 text-gray-500" />
                              <span>Carregando pagamentos...</span>
                            </div>
                          </td>
                        </tr>
                      ) : pagamentos.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="border p-4 text-center text-gray-500">
                            Nenhum pagamento encontrado para os filtros selecionados
                          </td>
                        </tr>
                      ) : (
                        pagamentos.map((pagamento) => (
                          <tr key={pagamento.id} className="hover:bg-gray-50">
                            <td className="border p-2">{pagamento.id}</td>
                            <td className="border p-2">{pagamento.motorista_nome}</td>
                            <td className="border p-2 text-center">
                              {format(new Date(pagamento.data_inicio), "dd/MM/yyyy")} a{" "}
                              {format(new Date(pagamento.data_fim), "dd/MM/yyyy")}
                            </td>
                            <td className="border p-2 text-center">{pagamento.total_corridas}</td>
                            <td className="border p-2 text-center">
                              R$ {pagamento.valor_bruto.toFixed(2).replace(".", ",")}
                            </td>
                            <td className="border p-2 text-center">
                              R$ {pagamento.comissao_app.toFixed(2).replace(".", ",")}
                            </td>
                            <td className="border p-2 text-center">
                              R$ {pagamento.valor_liquido.toFixed(2).replace(".", ",")}
                            </td>
                            <td className="border p-2 text-center">
                              <span
                                className={`px-2 py-1 rounded text-xs ${
                                  pagamento.status === "pago"
                                    ? "bg-green-100 text-green-800"
                                    : pagamento.status === "processando"
                                      ? "bg-blue-100 text-blue-800"
                                      : pagamento.status === "cancelado"
                                        ? "bg-red-100 text-red-800"
                                        : "bg-amber-100 text-amber-800"
                                }`}
                              >
                                {pagamento.status === "pago"
                                  ? "Pago"
                                  : pagamento.status === "processando"
                                    ? "Em processamento"
                                    : pagamento.status === "cancelado"
                                      ? "Cancelado"
                                      : "Pendente"}
                              </span>
                            </td>
                            <td className="border p-2 text-center">
                              <div className="flex justify-center space-x-1">
                                {pagamento.status !== "pago" && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 px-2 text-xs text-green-600 border-green-200 hover:bg-green-50"
                                    onClick={() => handleAtualizarStatus(pagamento.id, "pago")}
                                  >
                                    <CheckCircle size={14} className="mr-1" />
                                    Pagar
                                  </Button>
                                )}
                                {pagamento.status === "pendente" && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 px-2 text-xs text-blue-600 border-blue-200 hover:bg-blue-50"
                                    onClick={() => handleAtualizarStatus(pagamento.id, "processando")}
                                  >
                                    <Clock size={14} className="mr-1" />
                                    Processar
                                  </Button>
                                )}
                                {pagamento.status !== "cancelado" && pagamento.status !== "pago" && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 px-2 text-xs text-red-600 border-red-200 hover:bg-red-50"
                                    onClick={() => handleAtualizarStatus(pagamento.id, "cancelado")}
                                  >
                                    <AlertTriangle size={14} className="mr-1" />
                                    Cancelar
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </TabsContent>

            {/* Aba de Relatórios Financeiros */}
            <TabsContent value="relatorios" className="mt-0">
              <CardHeader>
                <CardTitle>Relatórios Financeiros</CardTitle>
                <CardDescription>Visualize relatórios e análises financeiras detalhadas</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Relatório de Faturamento</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-col items-center">
                        <DollarSign className="h-10 w-10 text-green-500 mb-2" />
                        <p className="text-sm text-gray-600 mb-4">
                          Visualize o faturamento total, comissões e receita líquida por período
                        </p>
                        <Button className="w-full" onClick={() => router.push("/admin/dashboard?tab=financeiro")}>
                          Ver Relatório
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Relatório de Motoristas</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-col items-center">
                        <Users className="h-10 w-10 text-blue-500 mb-2" />
                        <p className="text-sm text-gray-600 mb-4">
                          Analise o desempenho financeiro de cada motorista e suas estatísticas
                        </p>
                        <Button className="w-full" onClick={() => router.push("/admin/dashboard?tab=motoristas")}>
                          Ver Relatório
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Calendário de Pagamentos</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-col items-center">
                        <Calendar className="h-10 w-10 text-purple-500 mb-2" />
                        <p className="text-sm text-gray-600 mb-4">
                          Visualize os pagamentos programados e histórico de pagamentos
                        </p>
                        <Button className="w-full" onClick={() => setTabAtiva("pagamentos")}>
                          Ver Calendário
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-md p-4 mt-4">
                  <div className="flex">
                    <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 mr-3 flex-shrink-0" />
                    <div>
                      <h4 className="text-sm font-medium text-amber-800">Em Desenvolvimento</h4>
                      <p className="text-sm text-amber-700 mt-1">
                        Estamos trabalhando para expandir os relatórios financeiros com mais métricas e visualizações.
                        No momento, você pode acessar as principais métricas financeiras no Dashboard.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </TabsContent>
          </Card>
        </Tabs>
      </main>
    </div>
  )
}
