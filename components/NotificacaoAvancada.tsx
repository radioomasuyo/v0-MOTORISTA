"use client"

import { useState, useEffect } from "react"
import { notificationService } from "@/services/notificationService"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Bell, BellOff, Volume2, Vibrate } from "lucide-react"
import { toast } from "@/hooks/use-toast"

export default function NotificacaoAvancada() {
  const [notificationsEnabled, setNotificationsEnabled] = useState(false)
  const [soundsEnabled, setSoundsEnabled] = useState(true)
  const [vibrationEnabled, setVibrationEnabled] = useState(true)
  const [permissionState, setPermissionState] = useState<string>("default")

  // Carregar configurações quando o componente montar
  useEffect(() => {
    if (typeof window !== "undefined") {
      if ("Notification" in window) {
        setPermissionState(Notification.permission)
        setNotificationsEnabled(Notification.permission === "granted")
      }

      setSoundsEnabled(notificationService.areSoundsEnabled())
      setVibrationEnabled(notificationService.isVibrationEnabled())
    }
  }, [])

  const requestNotificationPermission = async () => {
    try {
      const granted = await notificationService.requestPermission()
      setNotificationsEnabled(granted)
      setPermissionState(Notification.permission)

      if (granted) {
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
      }
    } catch (error) {
      console.error("Erro ao solicitar permissão:", error)
      toast({
        title: "Erro",
        description: "Não foi possível solicitar permissão para notificações",
        variant: "destructive",
      })
    }
  }

  const toggleSounds = (enabled: boolean) => {
    setSoundsEnabled(enabled)
    notificationService.setSoundsEnabled(enabled)
    toast({
      title: enabled ? "Sons ativados" : "Sons desativados",
      description: enabled ? "Você ouvirá sons de notificação" : "Você não ouvirá sons de notificação",
      variant: "default",
    })
  }

  const toggleVibration = (enabled: boolean) => {
    setVibrationEnabled(enabled)
    notificationService.setVibrationEnabled(enabled)
    toast({
      title: enabled ? "Vibração ativada" : "Vibração desativada",
      description: enabled
        ? "Seu dispositivo vibrará com notificações"
        : "Seu dispositivo não vibrará com notificações",
      variant: "default",
    })
  }

  const testNotification = () => {
    if (Notification.permission === "granted") {
      const notification = new Notification("Teste de notificação", {
        body: "Esta é uma notificação de teste do Jamal Express",
        icon: "/favicon.ico",
        badge: "/images/cliente-marker.png",
        requireInteraction: true,
        vibrate: vibrationEnabled ? [200, 100, 200] : undefined,
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

      if (soundsEnabled) {
        notificationService.playSound("notification")
      }

      if (vibrationEnabled && navigator.vibrate) {
        navigator.vibrate(200)
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
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Configurações de Notificação</CardTitle>
        <CardDescription>Configure como você deseja receber notificações do aplicativo</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {notificationsEnabled ? (
                <Bell className="h-5 w-5 text-green-500" />
              ) : (
                <BellOff className="h-5 w-5 text-gray-500" />
              )}
              <Label htmlFor="notifications" className="font-medium">
                Notificações do sistema
              </Label>
            </div>
            {permissionState === "granted" ? (
              <span className="text-sm text-green-500">Ativadas</span>
            ) : (
              <Button
                onClick={requestNotificationPermission}
                variant="outline"
                size="sm"
                disabled={permissionState === "denied"}
              >
                {permissionState === "denied" ? "Permissão negada" : "Ativar"}
              </Button>
            )}
          </div>

          {permissionState === "denied" && (
            <div className="text-sm text-red-500 pl-7">
              Você negou as permissões de notificação. Para ativar, altere as configurações do seu navegador.
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Volume2 className="h-5 w-5 text-gray-500" />
              <Label htmlFor="sounds" className="font-medium">
                Sons de notificação
              </Label>
            </div>
            <Switch id="sounds" checked={soundsEnabled} onCheckedChange={toggleSounds} />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Vibrate className="h-5 w-5 text-gray-500" />
              <Label htmlFor="vibration" className="font-medium">
                Vibração
              </Label>
            </div>
            <Switch id="vibration" checked={vibrationEnabled} onCheckedChange={toggleVibration} />
          </div>
        </div>

        <div className="pt-4 border-t">
          <h3 className="text-sm font-medium mb-2">Tipos de notificação</h3>
          <ul className="space-y-2 text-sm">
            <li className="flex items-center justify-between">
              <span>Chegada do motorista</span>
              <span className="text-green-500">Ativado</span>
            </li>
            <li className="flex items-center justify-between">
              <span>Finalização de corrida</span>
              <span className="text-green-500">Ativado</span>
            </li>
            <li className="flex items-center justify-between">
              <span>Solicitação de corrida</span>
              <span className="text-green-500">Ativado</span>
            </li>
          </ul>
        </div>
      </CardContent>
      <CardFooter>
        <Button onClick={testNotification} disabled={!notificationsEnabled} className="w-full">
          Testar notificação
        </Button>
      </CardFooter>
    </Card>
  )
}
