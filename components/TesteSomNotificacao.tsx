"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { notificationService } from "@/services/notificationService"
import { toast } from "@/hooks/use-toast"

export default function TesteSomNotificacao() {
  const [testando, setTestando] = useState(false)

  const handleTestarSom = (tipo: "success" | "warning" | "error" | "notification") => {
    setTestando(true)

    try {
      // Testar o som
      notificationService.testSound(tipo)

      // Mostrar toast
      toast({
        title: "Som testado",
        description: `O som de ${getTipoNome(tipo)} foi reproduzido`,
        variant: "info",
      })
    } catch (error) {
      console.error("Erro ao testar som:", error)
      toast({
        title: "Erro",
        description: "Não foi possível reproduzir o som de teste",
        variant: "destructive",
      })
    } finally {
      setTimeout(() => setTestando(false), 1000)
    }
  }

  // Função para obter o nome do tipo de som
  const getTipoNome = (tipo: string): string => {
    switch (tipo) {
      case "success":
        return "sucesso"
      case "warning":
        return "alerta"
      case "error":
        return "erro"
      case "notification":
        return "notificação"
      default:
        return tipo
    }
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Testar Sons</h3>
      <div className="grid grid-cols-2 gap-3">
        <Button
          variant="outline"
          onClick={() => handleTestarSom("success")}
          disabled={testando}
          className="bg-green-50 text-green-700 border-green-200 hover:bg-green-100 hover:text-green-800"
        >
          Som de Sucesso
        </Button>

        <Button
          variant="outline"
          onClick={() => handleTestarSom("warning")}
          disabled={testando}
          className="bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 hover:text-amber-800"
        >
          Som de Alerta
        </Button>

        <Button
          variant="outline"
          onClick={() => handleTestarSom("error")}
          disabled={testando}
          className="bg-red-50 text-red-700 border-red-200 hover:bg-red-100 hover:text-red-800"
        >
          Som de Erro
        </Button>

        <Button
          variant="outline"
          onClick={() => handleTestarSom("notification")}
          disabled={testando}
          className="bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 hover:text-blue-800"
        >
          Som de Notificação
        </Button>
      </div>
    </div>
  )
}
