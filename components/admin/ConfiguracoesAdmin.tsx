"use client"

import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import NotificationSettings from "@/components/NotificationSettings"
import { Separator } from "@/components/ui/separator"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { toast } from "@/hooks/use-toast"
import { Trash2, RefreshCw, Database } from "lucide-react"

export default function ConfiguracoesAdmin() {
  const [limpandoCache, setLimpandoCache] = useState(false)
  const [resetandoConfig, setResetandoConfig] = useState(false)

  const limparCache = () => {
    if (!confirm("Tem certeza que deseja limpar o cache do aplicativo? Isso não afetará os dados salvos.")) {
      return
    }

    setLimpandoCache(true)

    // Simulação de limpeza de cache
    setTimeout(() => {
      setLimpandoCache(false)
      toast({
        title: "Cache limpo",
        description: "O cache do aplicativo foi limpo com sucesso",
        variant: "success",
      })
    }, 1500)
  }

  const resetarConfiguracoes = () => {
    if (!confirm("Tem certeza que deseja resetar todas as configurações para os valores padrão?")) {
      return
    }

    setResetandoConfig(true)

    // Simulação de reset de configurações
    setTimeout(() => {
      // Limpar configurações do localStorage
      if (typeof window !== "undefined") {
        localStorage.removeItem("jamal_express_sounds_enabled")
        localStorage.removeItem("jamal_express_volume")
        localStorage.removeItem("jamal_express_vibration_enabled")
      }

      setResetandoConfig(false)
      toast({
        title: "Configurações resetadas",
        description: "Todas as configurações foram restauradas para os valores padrão",
        variant: "success",
      })

      // Recarregar a página para aplicar as mudanças
      window.location.reload()
    }, 1500)
  }

  return (
    <>
      <CardHeader>
        <CardTitle>Configurações do Sistema</CardTitle>
        <CardDescription>Personalize as configurações de notificação e do sistema</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <NotificationSettings />

          <Separator className="my-6" />

          <div className="space-y-4">
            <h3 className="text-lg font-medium">Manutenção do Sistema</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button
                variant="outline"
                className="w-full flex items-center justify-center gap-2"
                onClick={limparCache}
                disabled={limpandoCache}
              >
                {limpandoCache ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                {limpandoCache ? "Limpando..." : "Limpar Cache"}
              </Button>

              <Button
                variant="outline"
                className="w-full flex items-center justify-center gap-2"
                onClick={resetarConfiguracoes}
                disabled={resetandoConfig}
              >
                {resetandoConfig ? <RefreshCw className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                {resetandoConfig ? "Resetando..." : "Resetar Configurações"}
              </Button>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-md p-4 mt-4">
              <div className="flex items-start">
                <Database className="h-5 w-5 text-amber-600 mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <h4 className="text-sm font-medium text-amber-800">Banco de Dados</h4>
                  <p className="text-sm text-amber-700 mt-1">
                    As operações de banco de dados como backup e restauração estão disponíveis apenas para
                    administradores com acesso direto ao Supabase.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </>
  )
}
