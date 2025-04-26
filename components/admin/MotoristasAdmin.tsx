"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowRight } from "lucide-react"

export default function MotoristasAdmin() {
  const router = useRouter()

  return (
    <>
      <CardHeader>
        <CardTitle>Gerenciamento de Motoristas</CardTitle>
        <CardDescription>Cadastre, edite e gerencie os motoristas disponíveis no sistema</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <p className="text-gray-600">
            Nesta seção você pode gerenciar todos os motoristas cadastrados no sistema, incluindo:
          </p>

          <ul className="list-disc list-inside space-y-2 text-gray-600 ml-4">
            <li>Cadastrar novos motoristas</li>
            <li>Editar informações de motoristas existentes</li>
            <li>Ativar ou desativar motoristas</li>
            <li>Monitorar status online/offline</li>
            <li>Visualizar estatísticas de corridas</li>
          </ul>

          <Button onClick={() => router.push("/admin/motoristas")} className="w-full mt-4">
            Acessar Cadastro de Motoristas
            <ArrowRight size={16} className="ml-2" />
          </Button>
        </div>
      </CardContent>
    </>
  )
}
