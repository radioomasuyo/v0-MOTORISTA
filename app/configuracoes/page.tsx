import type { Metadata } from "next"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft } from "lucide-react"
import VolumeControl from "@/components/VolumeControl"
import TesteSomNotificacao from "@/components/TesteSomNotificacao"
import NotificacaoAvancada from "@/components/NotificacaoAvancada"

export const metadata: Metadata = {
  title: "Configurações | Jamal Express",
  description: "Configurações do aplicativo Jamal Express",
}

export default function ConfiguracoesPage() {
  return (
    <div className="container mx-auto py-4">
      <div className="flex items-center mb-4">
        <Link href="/">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold ml-2">Configurações</h1>
      </div>

      <Tabs defaultValue="notificacoes" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="notificacoes">Notificações</TabsTrigger>
          <TabsTrigger value="som">Som</TabsTrigger>
          <TabsTrigger value="sistema">Sistema</TabsTrigger>
        </TabsList>
        <TabsContent value="notificacoes" className="space-y-4 mt-4">
          <NotificacaoAvancada />
        </TabsContent>
        <TabsContent value="som" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Volume</CardTitle>
              <CardDescription>Ajuste o volume das notificações</CardDescription>
            </CardHeader>
            <CardContent>
              <VolumeControl />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Teste de Som</CardTitle>
              <CardDescription>Teste os diferentes sons de notificação</CardDescription>
            </CardHeader>
            <CardContent>
              <TesteSomNotificacao />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="sistema" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Informações do Sistema</CardTitle>
              <CardDescription>Detalhes sobre o aplicativo</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="font-medium">Versão</span>
                  <span>1.0.0</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Plataforma</span>
                  <span>Web</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Última atualização</span>
                  <span>10/05/2023</span>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Manutenção</CardTitle>
              <CardDescription>Opções de manutenção do aplicativo</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button variant="outline" className="w-full">
                Limpar cache
              </Button>
              <Button variant="outline" className="w-full">
                Resetar configurações
              </Button>
              <Button variant="destructive" className="w-full">
                Sair da conta
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
