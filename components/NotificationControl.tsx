"use client"

import { useState, useEffect } from "react"
import { Bell, BellOff } from "lucide-react"
import { notificationService } from "@/services/notificationService"
import { toast } from "@/hooks/use-toast"

export default function NotificationControl() {
  const [notificationsEnabled, setNotificationsEnabled] = useState(false)
  const [permissionState, setPermissionState] = useState<string>("default")

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
        } else {
          toast({
            title: "Permissão negada",
            description: "Você precisa permitir notificações nas configurações do navegador",
            variant: "destructive",
          })
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

  return (
    <button
      onClick={toggleNotifications}
      className={`p-2 rounded-full ${notificationsEnabled ? "bg-green-500 text-white" : "bg-gray-200 text-gray-600"}`}
      title={notificationsEnabled ? "Desativar notificações" : "Ativar notificações"}
    >
      {notificationsEnabled ? <Bell size={20} /> : <BellOff size={20} />}
    </button>
  )
}
