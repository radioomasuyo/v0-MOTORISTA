"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { getSupabaseClient } from "@/lib/supabase"
import { geocodeAddress } from "@/lib/distance-service"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Switch } from "@/components/ui/switch"
import { ArrowLeft, Plus, Edit, Trash2, MapPin } from "lucide-react"
import Link from "next/link"

type Destino = {
  id: number
  nome: string
  endereco: string
  latitude: number | null
  longitude: number | null
  ativo: boolean
}

export default function DestinosPage() {
  const router = useRouter()
  const [autenticado, setAutenticado] = useState(false)
  const [carregandoAuth, setCarregandoAuth] = useState(true)
  const [destinos, setDestinos] = useState<Destino[]>([])
  const [novoDestino, setNovoDestino] = useState({
    nome: "",
    endereco: "",
  })
  const [editandoId, setEditandoId] = useState<number | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [processandoGeo, setProcessandoGeo] = useState(false)
  const [erro, setErro] = useState("")

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

        router.push("/admin/login")
      }
    }

    verificarAutenticacao()
  }, [router])

  // Buscar destinos
  useEffect(() => {
    if (!autenticado) return

    const fetchDestinos = async () => {
      // Verificar se a importação está correta
      const supabase = getSupabaseClient()
      const { data, error } = await supabase.from("destinos").select("*").order("nome")

      if (error) {
        console.error("Erro ao buscar destinos:", error)
        setErro("Não foi possível carregar os destinos. Tente novamente.")
      } else {
        setDestinos(data || [])
      }
      setCarregando(false)
    }

    fetchDestinos()
  }, [autenticado])

  if (carregandoAuth) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    )
  }

  if (!autenticado) {
    return null // Não renderizar nada enquanto redireciona
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setNovoDestino({ ...novoDestino, [name]: value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!novoDestino.nome || !novoDestino.endereco) {
      setErro("Por favor, preencha todos os campos obrigatórios.")
      return
    }

    setCarregando(true)
    setProcessandoGeo(true)
    setErro("")

    try {
      // Geocodificar o endereço
      const coordenadas = await geocodeAddress(novoDestino.endereco)

      const supabase = getSupabaseClient()

      if (editandoId) {
        // Atualizar destino existente
        const { error } = await supabase
          .from("destinos")
          .update({
            nome: novoDestino.nome,
            endereco: novoDestino.endereco,
            latitude: coordenadas?.latitude || null,
            longitude: coordenadas?.longitude || null,
          })
          .eq("id", editandoId)

        if (error) throw error

        // Atualizar lista local
        setDestinos(
          destinos.map((d) =>
            d.id === editandoId
              ? {
                  ...d,
                  ...novoDestino,
                  latitude: coordenadas?.latitude || null,
                  longitude: coordenadas?.longitude || null,
                }
              : d,
          ),
        )

        setEditandoId(null)
      } else {
        // Adicionar novo destino
        const { data, error } = await supabase
          .from("destinos")
          .insert([
            {
              ...novoDestino,
              latitude: coordenadas?.latitude || null,
              longitude: coordenadas?.longitude || null,
              ativo: true,
            },
          ])
          .select()

        if (error) throw error

        if (data) {
          setDestinos([...destinos, data[0]])
        }
      }

      // Limpar formulário
      setNovoDestino({
        nome: "",
        endereco: "",
      })
    } catch (error) {
      console.error("Erro ao salvar destino:", error)
      setErro("Ocorreu um erro ao salvar o destino. Tente novamente.")
    } finally {
      setCarregando(false)
      setProcessandoGeo(false)
    }
  }

  const handleEdit = (destino: Destino) => {
    setNovoDestino({
      nome: destino.nome,
      endereco: destino.endereco,
    })
    setEditandoId(destino.id)
  }

  const handleDelete = async (id: number) => {
    if (!confirm("Tem certeza que deseja excluir este destino?")) return

    try {
      const supabase = getSupabaseClient()
      const { error } = await supabase.from("destinos").delete().eq("id", id)

      if (error) throw error

      // Atualizar lista local
      setDestinos(destinos.filter((d) => d.id !== id))
    } catch (error) {
      console.error("Erro ao excluir destino:", error)
      setErro("Ocorreu um erro ao excluir o destino. Tente novamente.")
    }
  }

  const handleToggleAtivo = async (id: number, ativo: boolean) => {
    try {
      const supabase = getSupabaseClient()
      const { error } = await supabase.from("destinos").update({ ativo: !ativo }).eq("id", id)

      if (error) throw error

      // Atualizar lista local
      setDestinos(destinos.map((d) => (d.id === id ? { ...d, ativo: !ativo } : d)))
    } catch (error) {
      console.error("Erro ao atualizar status do destino:", error)
      setErro("Ocorreu um erro ao atualizar o status do destino. Tente novamente.")
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <header className="bg-green-600 p-4 text-white flex items-center shadow-md">
        <Link href="/admin" className="mr-4">
          <ArrowLeft size={24} />
        </Link>
        <h1 className="text-xl font-bold">Cadastro de Destinos</h1>
      </header>

      <main className="flex-1 p-4">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{editandoId ? "Editar Destino" : "Novo Destino"}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="nome" className="block text-sm font-medium text-gray-700 mb-1">
                  Nome do Local
                </label>
                <Input
                  id="nome"
                  name="nome"
                  value={novoDestino.nome}
                  onChange={handleInputChange}
                  placeholder="Ex: Shopping Center"
                  required
                />
              </div>

              <div>
                <label htmlFor="endereco" className="block text-sm font-medium text-gray-700 mb-1">
                  Endereço Completo
                </label>
                <Textarea
                  id="endereco"
                  name="endereco"
                  value={novoDestino.endereco}
                  onChange={handleInputChange}
                  placeholder="Ex: Av. Paulista, 1000, São Paulo, SP"
                  required
                  rows={3}
                />
                <p className="text-xs text-gray-500 mt-1">
                  O endereço será usado para calcular distâncias e tempos de viagem.
                </p>
              </div>

              {erro && <p className="text-red-500 text-sm">{erro}</p>}

              <div className="flex justify-end space-x-2">
                {editandoId && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setEditandoId(null)
                      setNovoDestino({
                        nome: "",
                        endereco: "",
                      })
                    }}
                  >
                    Cancelar
                  </Button>
                )}
                <Button type="submit" disabled={carregando}>
                  {processandoGeo
                    ? "Processando endereço..."
                    : carregando
                      ? "Salvando..."
                      : editandoId
                        ? "Atualizar"
                        : "Adicionar"}
                  {!carregando && !processandoGeo && !editandoId && <Plus size={16} className="ml-2" />}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Destinos Cadastrados</CardTitle>
          </CardHeader>
          <CardContent>
            {carregando && destinos.length === 0 ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-500 mx-auto"></div>
                <p className="mt-2 text-gray-500">Carregando destinos...</p>
              </div>
            ) : destinos.length === 0 ? (
              <p className="text-center py-4 text-gray-500">Nenhum destino cadastrado.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Endereço</TableHead>
                      <TableHead>Coordenadas</TableHead>
                      <TableHead>Ativo</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {destinos.map((destino) => (
                      <TableRow key={destino.id}>
                        <TableCell className="font-medium">{destino.nome}</TableCell>
                        <TableCell>{destino.endereco}</TableCell>
                        <TableCell>
                          {destino.latitude && destino.longitude ? (
                            <div className="flex items-center text-xs text-gray-600">
                              <MapPin size={14} className="mr-1 text-green-600" />
                              {destino.latitude.toFixed(6)}, {destino.longitude.toFixed(6)}
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">Não disponível</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={destino.ativo}
                            onCheckedChange={() => handleToggleAtivo(destino.id, destino.ativo)}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button variant="ghost" size="icon" onClick={() => handleEdit(destino)}>
                              <Edit size={16} />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(destino.id)}>
                              <Trash2 size={16} />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
