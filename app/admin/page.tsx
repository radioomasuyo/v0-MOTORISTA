"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Users, MapPin, ArrowLeft, Settings, LayoutDashboard } from "lucide-react"
import MotoristasAdmin from "@/components/admin/MotoristasAdmin"
import DestinosAdmin from "@/components/admin/DestinosAdmin"
import ConfiguracoesAdmin from "@/components/admin/ConfiguracoesAdmin"

export default function AdminPage() {
  const router = useRouter()
  const [autenticado, setAutenticado] = useState(false)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    // Verificar autenticação
    const verificarAutenticacao = () => {
      if (typeof window !== "undefined") {
        const adminAutenticado = localStorage.getItem("adminAutenticado")
        const adminAutenticadoEm = localStorage.getItem("adminAutenticadoEm")

        // Verificar se está autenticado e se a autenticação não expirou (24 horas)
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

        // Se não estiver autenticado ou a autenticação expirou, redirecionar para login
        router.push("/admin/login")
      }
    }

    verificarAutenticacao()
  }, [router])

  if (carregando) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-800"></div>
      </div>
    )
  }

  if (!autenticado) {
    return null // Não renderizar nada enquanto redireciona
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <header className="bg-gray-800 p-4 text-white flex items-center shadow-md">
        <Link href="/" className="mr-4">
          <ArrowLeft size={24} />
        </Link>
        <h1 className="text-xl font-bold">Painel Administrativo</h1>
      </header>

      <main className="flex-1 p-4">
        <Tabs defaultValue="motoristas" className="w-full">
          <TabsList className="grid grid-cols-4 mb-4">
            <TabsTrigger value="motoristas" className="flex items-center gap-2">
              <Users size={16} />
              <span className="hidden sm:inline">Motoristas</span>
            </TabsTrigger>
            <TabsTrigger value="destinos" className="flex items-center gap-2">
              <MapPin size={16} />
              <span className="hidden sm:inline">Destinos</span>
            </TabsTrigger>
            <TabsTrigger value="configuracoes" className="flex items-center gap-2">
              <Settings size={16} />
              <span className="hidden sm:inline">Configurações</span>
            </TabsTrigger>
            <TabsTrigger value="dashboard" className="flex items-center gap-2" disabled>
              <LayoutDashboard size={16} />
              <span className="hidden sm:inline">Dashboard</span>
              <span className="bg-blue-100 text-blue-800 text-xs px-1.5 py-0.5 rounded-full">Em breve</span>
            </TabsTrigger>
          </TabsList>

          <Card className="border-t-0 rounded-tl-none">
            <TabsContent value="motoristas" className="mt-0">
              <MotoristasAdmin />
            </TabsContent>

            <TabsContent value="destinos" className="mt-0">
              <DestinosAdmin />
            </TabsContent>

            <TabsContent value="configuracoes" className="mt-0">
              <ConfiguracoesAdmin />
            </TabsContent>

            <TabsContent value="dashboard" className="mt-0">
              <div className="p-6 text-center">
                <LayoutDashboard size={48} className="mx-auto text-gray-300 mb-4" />
                <h3 className="text-xl font-bold text-gray-700 mb-2">Dashboard em desenvolvimento</h3>
                <p className="text-gray-500">
                  Esta funcionalidade estará disponível em breve. Fique atento às atualizações!
                </p>
              </div>
            </TabsContent>
          </Card>
        </Tabs>
      </main>
    </div>
  )
}
