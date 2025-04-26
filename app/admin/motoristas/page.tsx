"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { getSupabaseClient } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Switch } from "@/components/ui/switch"
import {
  ArrowLeft,
  Plus,
  Edit,
  Trash2,
  AlertCircle,
  Upload,
  ImageIcon,
  X,
  Loader2,
  Filter,
  CheckCircle,
  XCircle,
  RefreshCw,
  Star,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"

// Adicione a importação do toast no topo do arquivo
import { toast } from "@/hooks/use-toast"

type Motorista = {
  id: number
  codigo: string
  nome: string
  telefone: string
  veiculo: string
  placa: string
  foto: string
  avaliacao: number
  corridas: number
  status: string
  ativo: boolean
}

// Tipo para os filtros disponíveis
type FiltroStatus = "todos" | "online" | "offline"

export default function MotoristasPage() {
  const router = useRouter()
  const [autenticado, setAutenticado] = useState(false)
  const [carregandoAuth, setCarregandoAuth] = useState(true)
  const [motoristas, setMotoristas] = useState<Motorista[]>([])
  const [novoMotorista, setNovoMotorista] = useState({
    codigo: "",
    nome: "",
    telefone: "",
    veiculo: "",
    placa: "",
    foto: "",
  })
  const [editandoId, setEditandoId] = useState<number | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState("")
  const [codigoExistente, setCodigoExistente] = useState(false)
  const [fotoPreview, setFotoPreview] = useState<string | null>(null)
  const [uploadingFoto, setUploadingFoto] = useState(false)
  const [gerandoCodigo, setGerandoCodigo] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Estado para o diálogo de avaliação
  const [avaliacaoDialogOpen, setAvaliacaoDialogOpen] = useState(false)
  const [motoristaAvaliacao, setMotoristaAvaliacao] = useState<Motorista | null>(null)
  const [novaAvaliacao, setNovaAvaliacao] = useState<number>(5)
  const [atualizandoAvaliacao, setAtualizandoAvaliacao] = useState(false)

  // Adicionar estado para o filtro de status
  const [filtroStatus, setFiltroStatus] = useState<FiltroStatus>("todos")

  // Adicionar estado para contagem de motoristas por status
  const [contagemStatus, setContagemStatus] = useState({
    total: 0,
    online: 0,
    offline: 0,
  })

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
            setCarregandoAuth(false)
            return
          }
        }

        // Para fins de demonstração, vamos autenticar automaticamente
        localStorage.setItem("adminAutenticado", "true")
        localStorage.setItem("adminAutenticadoEm", new Date().toISOString())
        setAutenticado(true)
        setCarregandoAuth(false)
      }
    }

    verificarAutenticacao()
  }, [router])

  // Buscar motoristas
  useEffect(() => {
    if (!autenticado) return

    const fetchMotoristas = async () => {
      try {
        const supabase = getSupabaseClient()
        const { data, error } = await supabase.from("drivers").select("*").order("nome")

        if (error) {
          console.error("Erro ao buscar motoristas:", error)
          setErro("Não foi possível carregar os motoristas. Tente novamente.")
        } else {
          setMotoristas(data || [])

          // Calcular contagem de motoristas por status
          if (data) {
            const online = data.filter((m) => m.status === "online").length
            const offline = data.filter((m) => m.status === "offline").length

            setContagemStatus({
              total: data.length,
              online,
              offline,
            })
          }
        }
      } catch (error) {
        console.error("Erro ao buscar motoristas:", error)
        setErro("Ocorreu um erro ao carregar os motoristas. Tente novamente.")
      } finally {
        setCarregando(false)
      }
    }

    fetchMotoristas()
  }, [autenticado])

  // Filtrar motoristas com base no status selecionado
  const motoristasFiltrados = motoristas.filter((motorista) => {
    if (filtroStatus === "todos") return true
    return motorista.status === filtroStatus
  })

  if (carregandoAuth) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (!autenticado) {
    return null // Não renderizar nada enquanto redireciona
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setNovoMotorista({ ...novoMotorista, [name]: value })

    // Limpar erro de código existente quando o usuário altera o código
    if (name === "codigo") {
      setCodigoExistente(false)
    }
  }

  // Função para gerar um código único para o motorista
  const gerarCodigoUnico = async () => {
    setGerandoCodigo(true)
    setErro("")
    setCodigoExistente(false)

    try {
      const supabase = getSupabaseClient()

      // Buscar todos os códigos existentes
      const { data, error } = await supabase.from("drivers").select("codigo")

      if (error) {
        throw error
      }

      // Verificar se data existe antes de usar map
      // Converter códigos existentes para números (se possível)
      const codigosExistentes = new Set(
        (data || []).map((d) => Number.parseInt(d.codigo, 10)).filter((codigo) => !isNaN(codigo)),
      )

      // Encontrar o próximo código disponível entre 0000 e 9999
      let novoCodigo = 0
      for (let i = 0; i <= 9999; i++) {
        if (!codigosExistentes.has(i)) {
          novoCodigo = i
          break
        }
      }

      // Formatar o código com zeros à esquerda (0000, 0001, etc.)
      const codigoFormatado = novoCodigo.toString().padStart(4, "0")

      // Atualizar o estado
      setNovoMotorista({ ...novoMotorista, codigo: codigoFormatado })

      toast({
        title: "Código gerado",
        description: `Código ${codigoFormatado} gerado com sucesso`,
        variant: "success",
      })
    } catch (error) {
      console.error("Erro ao gerar código:", error)
      setErro("Ocorreu um erro ao gerar o código. Tente novamente.")

      toast({
        title: "Erro",
        description: "Não foi possível gerar um código único",
        variant: "destructive",
      })
    } finally {
      setGerandoCodigo(false)
    }
  }

  // Função para lidar com o upload de foto
  const handleFotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Verificar se é uma imagem
    if (!file.type.startsWith("image/")) {
      setErro("Por favor, selecione um arquivo de imagem válido.")
      return
    }

    // Verificar tamanho (limitar a 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setErro("A imagem deve ter no máximo 5MB.")
      return
    }

    setUploadingFoto(true)
    setErro("")

    try {
      // Criar preview da imagem usando FileReader
      const reader = new FileReader()
      reader.onload = (event) => {
        const base64String = event.target?.result as string
        setFotoPreview(base64String)
        // Armazenar a string base64 diretamente
        setNovoMotorista({ ...novoMotorista, foto: base64String })
      }
      reader.readAsDataURL(file)
    } catch (error) {
      console.error("Erro ao processar a foto:", error)
      setErro("Ocorreu um erro ao processar a foto. Tente novamente.")
      setFotoPreview(null)
    } finally {
      setUploadingFoto(false)
    }
  }

  // Função para remover a foto
  const handleRemoverFoto = () => {
    setFotoPreview(null)
    setNovoMotorista({ ...novoMotorista, foto: "" })
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  // Verificar se o código já existe
  const verificarCodigoExistente = async (codigo: string): Promise<boolean> => {
    // Se estiver editando, ignorar o próprio registro
    if (editandoId) {
      const motoristaAtual = motoristas.find((m) => m.id === editandoId)
      if (motoristaAtual && motoristaAtual.codigo === codigo) {
        return false
      }
    }

    try {
      const supabase = getSupabaseClient()
      const { data, error } = await supabase.from("drivers").select("codigo").eq("codigo", codigo).limit(1)

      if (error) {
        console.error("Erro ao verificar código:", error)
        return false
      }

      return data ? data.length > 0 : false
    } catch (error) {
      console.error("Erro ao verificar código:", error)
      return false
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (
      !novoMotorista.codigo ||
      !novoMotorista.nome ||
      !novoMotorista.telefone ||
      !novoMotorista.veiculo ||
      !novoMotorista.placa
    ) {
      setErro("Por favor, preencha todos os campos obrigatórios.")
      return
    }

    setCarregando(true)
    setErro("")
    setCodigoExistente(false)

    try {
      // Verificar se o código já existe
      const codigoJaExiste = await verificarCodigoExistente(novoMotorista.codigo)

      if (codigoJaExiste) {
        setCodigoExistente(true)
        throw new Error("Este código já está em uso por outro motorista.")
      }

      const supabase = getSupabaseClient()

      // Se não tiver foto, usar placeholder
      const foto = novoMotorista.foto || "/placeholder.svg?height=100&width=100"

      if (editandoId) {
        // Atualizar motorista existente
        const { error } = await supabase
          .from("drivers")
          .update({
            codigo: novoMotorista.codigo,
            nome: novoMotorista.nome,
            telefone: novoMotorista.telefone,
            veiculo: novoMotorista.veiculo,
            placa: novoMotorista.placa,
            foto: foto,
          })
          .eq("id", editandoId)

        if (error) throw error

        // Atualizar lista local
        const motoristaAtualizado = motoristas.find((m) => m.id === editandoId)
        const novoMotoristaObj = {
          ...motoristaAtualizado,
          ...novoMotorista,
          foto,
        } as Motorista

        setMotoristas(motoristas.map((m) => (m.id === editandoId ? novoMotoristaObj : m)))

        setEditandoId(null)

        toast({
          title: "Motorista atualizado",
          description: `Os dados de ${novoMotorista.nome} foram atualizados com sucesso`,
          variant: "success",
        })
      } else {
        // Adicionar novo motorista
        const { data, error } = await supabase
          .from("drivers")
          .insert([
            {
              ...novoMotorista,
              foto: foto,
              avaliacao: 5.0,
              corridas: 0,
              status: "offline",
              ativo: true,
            },
          ])
          .select()

        if (error) throw error

        if (data) {
          setMotoristas([...motoristas, data[0]])

          // Atualizar contagem
          setContagemStatus((prev) => ({
            ...prev,
            total: prev.total + 1,
            offline: prev.offline + 1,
          }))

          toast({
            title: "Motorista adicionado",
            description: `${novoMotorista.nome} foi adicionado com sucesso`,
            variant: "success",
          })
        }
      }

      // Limpar formulário
      setNovoMotorista({
        codigo: "",
        nome: "",
        telefone: "",
        veiculo: "",
        placa: "",
        foto: "",
      })
      setFotoPreview(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    } catch (error: any) {
      console.error("Erro ao salvar motorista:", error)
      setErro(error.message || "Ocorreu um erro ao salvar o motorista. Tente novamente.")

      toast({
        title: "Erro",
        description: error.message || "Ocorreu um erro ao salvar o motorista",
        variant: "destructive",
      })
    } finally {
      setCarregando(false)
    }
  }

  const handleEdit = (motorista: Motorista) => {
    setNovoMotorista({
      codigo: motorista.codigo,
      nome: motorista.nome,
      telefone: motorista.telefone,
      veiculo: motorista.veiculo,
      placa: motorista.placa,
      foto: motorista.foto,
    })
    setFotoPreview(motorista.foto)
    setEditandoId(motorista.id)
    setCodigoExistente(false)
    setErro("")
  }

  const handleDelete = async (id: number) => {
    if (!confirm("Tem certeza que deseja excluir este motorista?")) return

    try {
      const supabase = getSupabaseClient()
      const { error } = await supabase.from("drivers").delete().eq("id", id)

      if (error) throw error

      // Obter o motorista antes de remover da lista
      const motoristaRemovido = motoristas.find((m) => m.id === id)

      // Atualizar lista local
      setMotoristas(motoristas.filter((m) => m.id !== id))

      // Atualizar contagem
      if (motoristaRemovido) {
        setContagemStatus((prev) => ({
          total: prev.total - 1,
          online: motoristaRemovido.status === "online" ? prev.online - 1 : prev.online,
          offline: motoristaRemovido.status === "offline" ? prev.offline - 1 : prev.offline,
        }))

        toast({
          title: "Motorista removido",
          description: `${motoristaRemovido.nome} foi removido com sucesso`,
          variant: "success",
        })
      }
    } catch (error) {
      console.error("Erro ao excluir motorista:", error)
      setErro("Ocorreu um erro ao excluir o motorista. Tente novamente.")

      toast({
        title: "Erro",
        description: "Ocorreu um erro ao excluir o motorista",
        variant: "destructive",
      })
    }
  }

  const handleToggleAtivo = async (id: number, ativo: boolean) => {
    try {
      const supabase = getSupabaseClient()
      const { error } = await supabase.from("drivers").update({ ativo: !ativo }).eq("id", id)

      if (error) throw error

      // Atualizar lista local
      setMotoristas(motoristas.map((m) => (m.id === id ? { ...m, ativo: !ativo } : m)))

      // Obter o motorista atualizado
      const motorista = motoristas.find((m) => m.id === id)
      if (motorista) {
        toast({
          title: "Status atualizado",
          description: `${motorista.nome} agora está ${!ativo ? "ativo" : "inativo"}`,
          variant: "success",
        })
      }
    } catch (error) {
      console.error("Erro ao atualizar status do motorista:", error)
      setErro("Ocorreu um erro ao atualizar o status do motorista. Tente novamente.")

      toast({
        title: "Erro",
        description: "Ocorreu um erro ao atualizar o status do motorista",
        variant: "destructive",
      })
    }
  }

  // Função para formatar o telefone
  const formatarTelefone = (telefone: string) => {
    if (!telefone) return ""

    // Remove caracteres não numéricos
    const numeroLimpo = telefone.replace(/\D/g, "")

    // Formata como (11)00000-0000
    if (numeroLimpo.length === 11) {
      return `(${numeroLimpo.slice(0, 2)})${numeroLimpo.slice(2, 7)}-${numeroLimpo.slice(7)}`
    } else if (numeroLimpo.length === 10) {
      return `(${numeroLimpo.slice(0, 2)})${numeroLimpo.slice(2, 6)}-${numeroLimpo.slice(6)}`
    }

    return telefone
  }

  // Adicionar uma nova função para alternar o status online/offline do motorista
  const handleToggleStatus = async (id: number, status: string) => {
    try {
      const supabase = getSupabaseClient()
      const novoStatus = status === "online" ? "offline" : "online"

      const { error } = await supabase.from("drivers").update({ status: novoStatus }).eq("id", id)

      if (error) throw error

      // Atualizar lista local
      setMotoristas(motoristas.map((m) => (m.id === id ? { ...m, status: novoStatus } : m)))

      // Atualizar contagem
      setContagemStatus((prev) => ({
        ...prev,
        online: prev.online + (novoStatus === "online" ? 1 : -1),
        offline: prev.offline + (novoStatus === "offline" ? 1 : -1),
      }))

      // Mostrar notificação de sucesso
      const motorista = motoristas.find((m) => m.id === id)
      if (motorista) {
        toast({
          title: "Status atualizado",
          description: `${motorista.nome} agora está ${novoStatus === "online" ? "online" : "offline"}`,
          variant: "success",
        })
      }

      setErro("")
    } catch (error) {
      console.error("Erro ao atualizar status do motorista:", error)
      setErro("Ocorreu um erro ao atualizar o status do motorista. Tente novamente.")

      toast({
        title: "Erro",
        description: "Não foi possível atualizar o status do motorista",
        variant: "destructive",
      })
    }
  }

  // Função para abrir o diálogo de avaliação
  const handleOpenAvaliacaoDialog = (motorista: Motorista) => {
    setMotoristaAvaliacao(motorista)
    setNovaAvaliacao(motorista.avaliacao || 5)
    setAvaliacaoDialogOpen(true)
  }

  // Função para atualizar a avaliação do motorista
  const handleAtualizarAvaliacao = async () => {
    if (!motoristaAvaliacao) return

    setAtualizandoAvaliacao(true)

    try {
      const supabase = getSupabaseClient()
      const { error } = await supabase
        .from("drivers")
        .update({ avaliacao: novaAvaliacao })
        .eq("id", motoristaAvaliacao.id)

      if (error) throw error

      // Atualizar lista local
      setMotoristas(motoristas.map((m) => (m.id === motoristaAvaliacao.id ? { ...m, avaliacao: novaAvaliacao } : m)))

      toast({
        title: "Avaliação atualizada",
        description: `A avaliação de ${motoristaAvaliacao.nome} foi atualizada para ${novaAvaliacao.toFixed(1)}`,
        variant: "success",
      })

      setAvaliacaoDialogOpen(false)
    } catch (error) {
      console.error("Erro ao atualizar avaliação:", error)
      toast({
        title: "Erro",
        description: "Não foi possível atualizar a avaliação do motorista",
        variant: "destructive",
      })
    } finally {
      setAtualizandoAvaliacao(false)
    }
  }

  // Função para renderizar as estrelas de avaliação
  const renderEstrelas = (avaliacao: number) => {
    const estrelas = []
    const avaliacaoArredondada = Math.round(avaliacao * 2) / 2 // Arredonda para 0.5 mais próximo

    for (let i = 1; i <= 5; i++) {
      if (i <= avaliacaoArredondada) {
        // Estrela cheia
        estrelas.push(<Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />)
      } else if (i - 0.5 === avaliacaoArredondada) {
        // Meia estrela (não implementada aqui, mas poderia ser com um SVG personalizado)
        estrelas.push(<Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400 opacity-50" />)
      } else {
        // Estrela vazia
        estrelas.push(<Star key={i} className="w-4 h-4 text-gray-300" />)
      }
    }

    return (
      <div className="flex items-center">
        {estrelas}
        <span className="ml-1 text-sm font-medium">{avaliacao.toFixed(1)}</span>
      </div>
    )
  }

  // Função para voltar para a página inicial do admin
  const handleVoltar = () => {
    // Redirecionar para a página inicial do admin
    router.push("/")
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <header className="bg-blue-600 p-4 text-white flex items-center shadow-md">
        {/* Corrigido: Agora usando o router para voltar para a página inicial */}
        <Button variant="ghost" className="mr-4 p-0 hover:bg-transparent" onClick={handleVoltar}>
          <ArrowLeft size={24} className="text-white" />
        </Button>
        <h1 className="text-xl font-bold">Cadastro de Motoristas</h1>
      </header>

      <main className="flex-1 p-4">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{editandoId ? "Editar Motorista" : "Novo Motorista"}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="codigo" className="block text-sm font-medium text-gray-700 mb-1">
                    Código
                  </label>
                  <div className="flex space-x-2">
                    <Input
                      id="codigo"
                      name="codigo"
                      value={novoMotorista.codigo}
                      onChange={handleInputChange}
                      placeholder="Código do motorista"
                      required
                      className={codigoExistente ? "border-red-500 focus:ring-red-500" : ""}
                      readOnly={gerandoCodigo}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={gerarCodigoUnico}
                      disabled={gerandoCodigo || editandoId !== null}
                      className="whitespace-nowrap"
                    >
                      {gerandoCodigo ? (
                        <Loader2 size={16} className="mr-2 animate-spin" />
                      ) : (
                        <RefreshCw size={16} className="mr-2" />
                      )}
                      Gerar Código
                    </Button>
                  </div>
                  {codigoExistente && (
                    <div className="flex items-center mt-1 text-red-500 text-sm">
                      <AlertCircle size={14} className="mr-1" />
                      Este código já está em uso por outro motorista
                    </div>
                  )}
                </div>

                <div>
                  <label htmlFor="nome" className="block text-sm font-medium text-gray-700 mb-1">
                    Nome
                  </label>
                  <Input
                    id="nome"
                    name="nome"
                    value={novoMotorista.nome}
                    onChange={handleInputChange}
                    placeholder="Nome completo"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="telefone" className="block text-sm font-medium text-gray-700 mb-1">
                    Telefone
                  </label>
                  <Input
                    id="telefone"
                    name="telefone"
                    value={novoMotorista.telefone}
                    onChange={handleInputChange}
                    placeholder="(00)00000-0000"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="veiculo" className="block text-sm font-medium text-gray-700 mb-1">
                    Veículo
                  </label>
                  <Input
                    id="veiculo"
                    name="veiculo"
                    value={novoMotorista.veiculo}
                    onChange={handleInputChange}
                    placeholder="Modelo do veículo"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="placa" className="block text-sm font-medium text-gray-700 mb-1">
                    Placa
                  </label>
                  <Input
                    id="placa"
                    name="placa"
                    value={novoMotorista.placa}
                    onChange={handleInputChange}
                    placeholder="ABC-1234"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Foto</label>
                  <div className="mt-1 flex items-center">
                    {fotoPreview ? (
                      <div className="relative">
                        <img
                          src={fotoPreview || "/placeholder.svg"}
                          alt="Preview"
                          className="h-24 w-24 object-cover rounded-md"
                        />
                        <button
                          type="button"
                          onClick={handleRemoverFoto}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <div className="h-24 w-24 border-2 border-dashed border-gray-300 rounded-md flex items-center justify-center">
                        <ImageIcon className="h-8 w-8 text-gray-400" />
                      </div>
                    )}
                    <div className="ml-4">
                      <input
                        type="file"
                        id="foto"
                        ref={fileInputRef}
                        accept="image/*"
                        onChange={handleFotoChange}
                        className="hidden"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingFoto}
                        className="flex items-center"
                      >
                        {uploadingFoto ? (
                          <>
                            <Loader2 size={16} className="mr-2 animate-spin" />
                            Enviando...
                          </>
                        ) : (
                          <>
                            <Upload size={16} className="mr-2" />
                            {fotoPreview ? "Trocar foto" : "Selecionar foto"}
                          </>
                        )}
                      </Button>
                      <p className="mt-1 text-xs text-gray-500">JPG, PNG ou GIF. Máximo 5MB.</p>
                    </div>
                  </div>
                </div>
              </div>

              {erro && !codigoExistente && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md flex items-start">
                  <AlertCircle size={18} className="mr-2 mt-0.5 flex-shrink-0" />
                  <p>{erro}</p>
                </div>
              )}

              <div className="flex justify-end space-x-2">
                {editandoId && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setEditandoId(null)
                      setNovoMotorista({
                        codigo: "",
                        nome: "",
                        telefone: "",
                        veiculo: "",
                        placa: "",
                        foto: "",
                      })
                      setFotoPreview(null)
                      setCodigoExistente(false)
                      setErro("")
                      if (fileInputRef.current) {
                        fileInputRef.current.value = ""
                      }
                    }}
                  >
                    Cancelar
                  </Button>
                )}
                <Button type="submit" disabled={carregando || codigoExistente || uploadingFoto || gerandoCodigo}>
                  {carregando ? "Salvando..." : editandoId ? "Atualizar" : "Adicionar"}
                  {!carregando && !editandoId && <Plus size={16} className="ml-2" />}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <CardTitle>Motoristas Cadastrados</CardTitle>

              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="text-gray-700 bg-gray-100">
                  Total: {contagemStatus.total}
                </Badge>
                <Badge variant="outline" className="text-green-700 bg-green-100">
                  <CheckCircle size={14} className="mr-1" />
                  Online: {contagemStatus.online}
                </Badge>
                <Badge variant="outline" className="text-gray-700 bg-gray-100">
                  <XCircle size={14} className="mr-1" />
                  Offline: {contagemStatus.offline}
                </Badge>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            <Tabs
              defaultValue="todos"
              className="mb-6"
              onValueChange={(value) => setFiltroStatus(value as FiltroStatus)}
            >
              <div className="flex items-center mb-4">
                <Filter size={16} className="mr-2 text-gray-500" />
                <span className="text-sm font-medium text-gray-700 mr-4">Filtrar por status:</span>
                <TabsList>
                  <TabsTrigger value="todos" className="data-[state=active]:bg-gray-200">
                    Todos ({contagemStatus.total})
                  </TabsTrigger>
                  <TabsTrigger
                    value="online"
                    className="data-[state=active]:bg-green-100 data-[state=active]:text-green-800"
                  >
                    Online ({contagemStatus.online})
                  </TabsTrigger>
                  <TabsTrigger value="offline" className="data-[state=active]:bg-gray-100">
                    Offline ({contagemStatus.offline})
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="todos">{renderTabelaMotoristas(motoristasFiltrados)}</TabsContent>
              <TabsContent value="online">{renderTabelaMotoristas(motoristasFiltrados)}</TabsContent>
              <TabsContent value="offline">{renderTabelaMotoristas(motoristasFiltrados)}</TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </main>

      {/* Diálogo para editar avaliação */}
      <Dialog open={avaliacaoDialogOpen} onOpenChange={setAvaliacaoDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Avaliação do Motorista</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {motoristaAvaliacao && (
              <div className="flex items-center space-x-4">
                <img
                  src={motoristaAvaliacao.foto || "/placeholder.svg?height=50&width=50"}
                  alt={motoristaAvaliacao.nome}
                  className="h-12 w-12 rounded-full object-cover"
                />
                <div>
                  <p className="font-medium">{motoristaAvaliacao.nome}</p>
                  <p className="text-sm text-gray-500">Código: {motoristaAvaliacao.codigo}</p>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="avaliacao">Avaliação (1-5)</Label>
              <div className="flex items-center space-x-2">
                <Input
                  id="avaliacao"
                  type="number"
                  min="1"
                  max="5"
                  step="0.1"
                  value={novaAvaliacao}
                  onChange={(e) => setNovaAvaliacao(Number.parseFloat(e.target.value))}
                  className="w-24"
                />
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((valor) => (
                    <Star
                      key={valor}
                      className={`w-6 h-6 cursor-pointer ${
                        valor <= novaAvaliacao ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
                      }`}
                      onClick={() => setNovaAvaliacao(valor)}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setAvaliacaoDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAtualizarAvaliacao} disabled={atualizandoAvaliacao}>
              {atualizandoAvaliacao ? (
                <>
                  <Loader2 size={16} className="mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                "Salvar Avaliação"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )

  // Função para renderizar a tabela de motoristas
  function renderTabelaMotoristas(motoristas: Motorista[]) {
    if (carregando && motoristas.length === 0) {
      return (
        <div className="text-center py-4">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-2 text-gray-500">Carregando motoristas...</p>
        </div>
      )
    }

    if (motoristas.length === 0) {
      return (
        <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
          <div className="mx-auto w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-4">
            <Filter size={24} className="text-gray-400" />
          </div>
          <p className="text-gray-500 font-medium">Nenhum motorista encontrado</p>
          <p className="text-gray-400 text-sm mt-1">
            {filtroStatus === "todos"
              ? "Não há motoristas cadastrados."
              : `Não há motoristas ${filtroStatus === "online" ? "online" : "offline"} no momento.`}
          </p>
        </div>
      )
    }

    return (
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Foto</TableHead>
              <TableHead>Código</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>Veículo</TableHead>
              <TableHead>Placa</TableHead>
              <TableHead>Avaliação</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Online/Offline</TableHead>
              <TableHead>Ativo</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {motoristas.map((motorista) => (
              <TableRow key={motorista.id}>
                <TableCell>
                  <img
                    src={motorista.foto || "/placeholder.svg?height=40&width=40"}
                    alt={motorista.nome}
                    className="h-10 w-10 rounded-full object-cover"
                  />
                </TableCell>
                <TableCell>{motorista.codigo}</TableCell>
                <TableCell>{motorista.nome}</TableCell>
                <TableCell>{formatarTelefone(motorista.telefone)}</TableCell>
                <TableCell>{motorista.veiculo}</TableCell>
                <TableCell>{motorista.placa}</TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-0 hover:bg-transparent"
                    onClick={() => handleOpenAvaliacaoDialog(motorista)}
                  >
                    {renderEstrelas(motorista.avaliacao || 5)}
                  </Button>
                </TableCell>
                <TableCell>
                  <span
                    className={`px-2 py-1 rounded text-xs ${
                      motorista.status === "online" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {motorista.status === "online" ? "Online" : "Offline"}
                  </span>
                </TableCell>
                <TableCell>
                  <Switch
                    checked={motorista.status === "online"}
                    onCheckedChange={() => handleToggleStatus(motorista.id, motorista.status)}
                  />
                </TableCell>
                <TableCell>
                  <Switch
                    checked={motorista.ativo}
                    onCheckedChange={() => handleToggleAtivo(motorista.id, motorista.ativo)}
                  />
                </TableCell>
                <TableCell>
                  <div className="flex space-x-2">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(motorista)}>
                      <Edit size={16} />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(motorista.id)}>
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    )
  }
}
