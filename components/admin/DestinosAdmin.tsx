"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowRight } from "lucide-react"

export default function DestinosAdmin() {
  const router = useRouter()

  return (
    <>
      <CardHeader>
        <CardTitle>Gerenciamento de Destinos</CardTitle>
        <CardDescription>Cadastre, edite e gerencie os destinos disponíveis para os clientes</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <p className="text-gray-600">
            Nesta seção você pode gerenciar todos os destinos cadastrados no sistema, incluindo:
          </p>

          <ul className="list-disc list-inside space-y-2 text-gray-600 ml-4">
            <li>Cadastrar novos destinos</li>
            <li>Editar informações de destinos existentes</li>
            <li>Ativar ou desativar destinos</li>
            <li>Gerenciar endereços e coordenadas</li>
            <li>Organizar destinos por categorias</li>
          </ul>

          <Button onClick={() => router.push("/admin/destinos")} className="w-full mt-4">
            Acessar Cadastro de Destinos
            <ArrowRight size={16} className="ml-2" />
          </Button>
        </div>
      </CardContent>
    </>
  )
}
