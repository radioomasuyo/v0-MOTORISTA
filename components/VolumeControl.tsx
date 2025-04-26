"use client"

import { useState, useEffect } from "react"
import { Slider } from "@/components/ui/slider"
import { notificationService } from "@/services/notificationService"

export default function VolumeControl() {
  const [volume, setVolume] = useState(1)

  // Carregar o volume atual quando o componente montar
  useEffect(() => {
    setVolume(notificationService.getVolume())
  }, [])

  // Atualizar o volume no serviço quando o slider mudar
  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0]
    setVolume(newVolume)
    notificationService.setVolume(newVolume)
  }

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <label htmlFor="volume" className="text-sm font-medium">
          Volume
        </label>
        <span className="text-xs text-gray-500">{Math.round(volume * 100)}%</span>
      </div>
      <Slider id="volume" min={0} max={1} step={0.1} value={[volume]} onValueChange={handleVolumeChange} />
    </div>
  )
}
