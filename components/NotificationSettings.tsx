"use client"

import { useState, useEffect } from "react"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { notificationService } from "@/services/notificationService"
import VolumeControl from "@/components/VolumeControl"
import TesteSomNotificacao from "@/components/TesteSomNotificacao"

export default function NotificationSettings() {
  const [soundsEnabled, setSoundsEnabled] = useState(true)
  const [vibrationEnabled, setVibrationEnabled] = useState(true)
  const [notificationsSupported, setNotificationsSupported] = useState(true)

  // Carregar configurações quando o componente montar
  useEffect(() => {
    if (typeof window !== "undefined") {
      // Verificar se o navegador suporta notificações
      if (!("Notification" in window)) {
        setNotificationsSupported(false)
      }

      // Carregar configurações do serviço
      setSoundsEnabled(notificationService.areSoundsEnabled())
      setVibrationEnabled(notificationService.isVibrationEnabled())
    }
  }, [])

  // Atualizar configurações quando os switches mudarem
  const handleSoundsToggle = (enabled: boolean) => {
    setSoundsEnabled(enabled)
    notificationService.setSoundsEnabled(enabled)
  }

  const handleVibrationToggle = (enabled: boolean) => {
    setVibrationEnabled(enabled)
    notificationService.setVibrationEnabled(enabled)
  }

  if (!notificationsSupported) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-md p-4">
        <p className="text-amber-800">
          Seu navegador não suporta notificações. Algumas funcionalidades podem não estar disponíveis.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium">Configurações de Notificação</h3>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="sounds">Sons de Notificação</Label>
            <p className="text-sm text-gray-500">Reproduzir sons quando receber notificações</p>
          </div>
          <Switch id="sounds" checked={soundsEnabled} onCheckedChange={handleSoundsToggle} />
        </div>

        {soundsEnabled && (
          <div className="ml-6 border-l-2 border-gray-100 pl-4 space-y-4">
            <VolumeControl />
            <TesteSomNotificacao />
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="vibration">Vibração</Label>
            <p className="text-sm text-gray-500">Vibrar o dispositivo quando receber notificações</p>
          </div>
          <Switch id="vibration" checked={vibrationEnabled} onCheckedChange={handleVibrationToggle} />
        </div>
      </div>
    </div>
  )
}
