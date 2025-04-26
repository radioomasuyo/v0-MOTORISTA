"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { ArrowLeft, LogIn, Users, MapPin, Settings, LayoutDashboard, DollarSign } from "lucide-react"
import Link from "next/link"

export default function AdminLoginPage() {
  const router = useRouter()
  const [senha, setSenha] = useState("")
  const [erro, setErro] = useState("")
  const [carregando, setCarregando] = useState(false)
  const [autenticado, setAutenticado] = useState(false)

  // Verificar se já está autenticado
  useEffect(() => {
    if (typeof window !== "undefined") {
      const adminAutenticado = localStorage.getItem("adminAutenticado")
      const adminAutenticadoEm = localStorage.getItem("adminAutenticadoEm")

      if (adminAutenticado === "true" && adminAutenticadoEm) {
        const dataAutenticacao = new Date(adminAutenticadoEm)
        const agora = new Date()
        const diferencaHoras = (agora.getTime() - dataAutenticacao.getTime()) / (1000 * 60 * 60)

        if (diferencaHoras < 24) {
          setAutenticado(true)
        }
      }
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErro("")
    setCarregando(true)

    // Verificar a senha (em uma aplicação real, isso seria feito no servidor)
    if (senha === "admin123") {
      // Armazenar o estado de autenticação no localStorage
      if (typeof window !== "undefined") {
        localStorage.setItem("adminAutenticado", "true")
        localStorage.setItem("adminAutenticadoEm", new Date().toISOString())
      }

      // Mostrar opções de admin
      setAutenticado(true)
    } else {
      setErro("Senha incorreta. Tente novamente.")
    }

    setCarregando(false)
  }

  const navigateTo = (path: string) => {
    router.push(path)
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <header className="bg-gray-800 p-4 text-white flex items-center shadow-md">
        <Link href="/" className="mr-4">
          <ArrowLeft size={24} />
        </Link>
        <h1 className="text-xl font-bold">Acesso Administrativo</h1>
      </header>

      <main className="flex-1 flex items-center justify-center p-4">
        {!autenticado ? (
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Login Administrativo</CardTitle>
              <CardDescription>Digite a senha para acessar o painel administrativo</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="senha" className="block text-sm font-medium text-gray-700 mb-1">
                    Senha
                  </label>
                  <Input
                    id="senha"
                    type="password"
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    placeholder="Digite a senha de administrador"
                    required
                  />
                </div>

                {erro && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">{erro}</div>
                )}

                <Button type="submit" className="w-full" disabled={carregando}>
                  {carregando ? "Verificando..." : "Entrar"}
                  {!carregando && <LogIn size={16} className="ml-2" />}
                </Button>
              </form>
            </CardContent>
          </Card>
        ) : (
          <div className="w-full max-w-2xl">
            <h2 className="text-2xl font-bold text-center mb-6">Painel Administrativo</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardContent
                  className="flex flex-col items-center justify-center p-6"
                  onClick={() => navigateTo("/admin/motoristas")}
                >
                  <div className="bg-blue-100 p-4 rounded-full mb-4">
                    <Users size={32} className="text-blue-600" />
                  </div>
                  <h2 className="text-xl font-semibold text-center">Cadastro de Motoristas</h2>
                  <p className="text-gray-500 text-center mt-2">Gerencie os motoristas do sistema</p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardContent
                  className="flex flex-col items-center justify-center p-6"
                  onClick={() => navigateTo("/admin/destinos")}
                >
                  <div className="bg-green-100 p-4 rounded-full mb-4">
                    <MapPin size={32} className="text-green-600" />
                  </div>
                  <h2 className="text-xl font-semibold text-center">Cadastro de Destinos</h2>
                  <p className="text-gray-500 text-center mt-2">Gerencie os destinos disponíveis</p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardContent
                  className="flex flex-col items-center justify-center p-6"
                  onClick={() => navigateTo("/admin/dashboard")}
                >
                  <div className="bg-purple-100 p-4 rounded-full mb-4">
                    <LayoutDashboard size={32} className="text-purple-600" />
                  </div>
                  <h2 className="text-xl font-semibold text-center">Dashboard</h2>
                  <p className="text-gray-500 text-center mt-2">Visualize relatórios e estatísticas</p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardContent
                  className="flex flex-col items-center justify-center p-6"
                  onClick={() => navigateTo("/admin/financeiro")}
                >
                  <div className="bg-green-100 p-4 rounded-full mb-4">
                    <DollarSign size={32} className="text-green-600" />
                  </div>
                  <h2 className="text-xl font-semibold text-center">Financeiro</h2>
                  <p className="text-gray-500 text-center mt-2">Gerenciar pagamentos aos motoristas</p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardContent
                  className="flex flex-col items-center justify-center p-6"
                  onClick={() => navigateTo("/admin")}
                >
                  <div className="bg-gray-100 p-4 rounded-full mb-4">
                    <Settings size={32} className="text-gray-600" />
                  </div>
                  <h2 className="text-xl font-semibold text-center">Configurações</h2>
                  <p className="text-gray-500 text-center mt-2">Ajuste as configurações do sistema</p>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
