"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowLeft, Users, MapPin, Settings, LayoutDashboard } from "lucide-react"

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
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8">Painel Administrativo</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Card de Motoristas */}
            <Card className="hover:shadow-lg transition-shadow">
              <Link href="/admin/motoristas">
                <CardContent className="p-6 flex flex-col items-center text-center">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                    <Users className="h-8 w-8 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">Cadastro de Motoristas</h3>
                  <p className="text-gray-600">Gerencie os motoristas do sistema</p>
                </CardContent>
              </Link>
            </Card>

            {/* Card de Destinos */}
            <Card className="hover:shadow-lg transition-shadow">
              <Link href="/admin/destinos">
                <CardContent className="p-6 flex flex-col items-center text-center">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                    <MapPin className="h-8 w-8 text-green-600" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">Cadastro de Destinos</h3>
                  <p className="text-gray-600">Gerencie os destinos disponíveis</p>
                </CardContent>
              </Link>
            </Card>

            {/* Card de Configurações */}
            <Card className="hover:shadow-lg transition-shadow">
              <Link href="/admin/configuracoes">
                <CardContent className="p-6 flex flex-col items-center text-center">
                  <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mb-4">
                    <Settings className="h-8 w-8 text-purple-600" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">Configurações</h3>
                  <p className="text-gray-600">Ajuste as configurações do sistema</p>
                </CardContent>
              </Link>
            </Card>

            {/* Card de Dashboard (Em breve) */}
            <Card className="hover:shadow-lg transition-shadow opacity-70">
              <CardContent className="p-6 flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <LayoutDashboard className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-xl font-bold mb-2">Dashboard</h3>
                <p className="text-gray-600">Visualize estatísticas e relatórios</p>
                <span className="mt-2 bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">Em breve</span>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
