"use client"

import { useState, useEffect } from "react"
import { Bell, BellOff, AlertCircle } from "lucide-react"
import { notificationService } from "@/services/notificationService"
import { toast } from "@/hooks/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export default function NotificationControl() {
  const [notificationsEnabled, setNotificationsEnabled] = useState(false)
  const [permissionState, setPermissionState] = useState<string>("default")
  const [showDialog, setShowDialog] = useState(false)

  // Verificar o estado atual das notificações quando o componente montar
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setPermissionState(Notification.permission)
      setNotificationsEnabled(Notification.permission === "granted")
    }
  }, [])

  const toggleNotifications = async () => {
    try {
      if (notificationsEnabled) {
        // Não podemos revogar permissões, mas podemos desativar os sons
        notificationService.setSoundsEnabled(false)
        setNotificationsEnabled(false)
        toast({
          title: "Notificações desativadas",
          description: "Os sons de notificação foram desativados",
          variant: "default",
        })
      } else {
        if (permissionState === "denied") {
          // Se as permissões foram negadas, mostrar diálogo explicativo
          setShowDialog(true)
        } else {
          // Solicitar permissão
          const granted = await notificationService.requestPermission()
          setNotificationsEnabled(granted)
          setPermissionState(Notification.permission)

          if (granted) {
            notificationService.setSoundsEnabled(true)
            toast({
              title: "Notificações ativadas",
              description: "Você receberá notificações sobre suas corridas",
              variant: "success",
            })

            // Enviar uma notificação de teste
            setTimeout(() => {
              new Notification("Notificações ativadas!", {
                body: "Você receberá notificações sobre suas corridas mesmo quando o app estiver em segundo plano.",
                icon: "/favicon.ico",
                badge: "/images/cliente-marker.png",
                requireInteraction: false,
              })
            }, 1000)
          } else {
            toast({
              title: "Permissão negada",
              description: "Você precisa permitir notificações nas configurações do navegador",
              variant: "destructive",
            })
            setShowDialog(true)
          }
        }
      }
    } catch (error) {
      console.error("Erro ao alternar notificações:", error)
      toast({
        title: "Erro",
        description: "Não foi possível alterar as configurações de notificação",
        variant: "destructive",
      })
    }
  }

  const testNotification = () => {
    if (Notification.permission === "granted") {
      const notification = new Notification("Teste de notificação", {
        body: "Esta é uma notificação de teste do Jamal Express",
        icon: "/favicon.ico",
        badge: "/images/cliente-marker.png",
        requireInteraction: true,
        vibrate: [200, 100, 200],
        actions: [
          {
            action: "test",
            title: "Testar",
          },
        ],
      })

      notification.onclick = () => {
        window.focus()
        notification.close()
        toast({
          title: "Notificação clicada",
          description: "Você clicou na notificação de teste",
          variant: "success",
        })
      }
    } else {
      toast({
        title: "Permissão negada",
        description: "Você precisa permitir notificações para ver este teste",
        variant: "destructive",
      })
    }
  }

  return (
    <>
      <button
        onClick={toggleNotifications}
        className={`p-2 rounded-full ${notificationsEnabled ? "bg-green-500 text-white" : "bg-gray-200 text-gray-600"}`}
        title={notificationsEnabled ? "Desativar notificações" : "Ativar notificações"}
      >
        {notificationsEnabled ? <Bell size={20} /> : <BellOff size={20} />}
      </button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Permissões de notificação</DialogTitle>
            <DialogDescription>
              Para receber notificações mesmo quando o aplicativo estiver fechado ou em segundo plano, você precisa
              permitir notificações no seu navegador.
            </DialogDescription>
          </DialogHeader>

          <Alert variant="warning" className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Atenção</AlertTitle>
            <AlertDescription>
              Você negou as permissões de notificação anteriormente. Para ativar as notificações, você precisa alterar
              as configurações do seu navegador.
            </AlertDescription>
          </Alert>

          <div className="mt-4">
            <p className="text-sm text-gray-500">Como ativar notificações:</p>
            <ol className="list-decimal pl-5 mt-2 text-sm text-gray-500">
              <li>Clique no ícone de cadeado ou informações na barra de endereço</li>
              <li>Encontre as configurações de "Notificações" ou "Permissões"</li>
              <li>Altere a configuração para "Permitir"</li>
              <li>Recarregue esta página</li>
            </ol>
          </div>

          <DialogFooter className="mt-4">
            <Button onClick={() => setShowDialog(false)}>Entendi</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {notificationsEnabled && (
        <div className="mt-2">
          <Button variant="outline" size="sm" onClick={testNotification} className="text-xs">
            Testar notificação
          </Button>
        </div>
      )}
    </>
  )
}
