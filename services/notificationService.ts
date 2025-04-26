import { toast } from "@/hooks/use-toast"

// Variável para armazenar o volume atual (0 a 1)
let volumeLevel = 0.5
let soundsEnabled = true
let vibrationEnabled = true

// Contexto de áudio para Web Audio API
let audioContext: AudioContext | null = null

// Lista de sons disponíveis
const availableSounds = ["success", "warning", "error", "notification"]

// Função para inicializar o contexto de áudio
const initAudioContext = () => {
  if (typeof window === "undefined") return null

  try {
    if (!audioContext) {
      // @ts-ignore - Alguns navegadores podem usar webkitAudioContext
      const AudioContextClass = window.AudioContext || window.webkitAudioContext
      if (AudioContextClass) {
        audioContext = new AudioContextClass()
      }
    }
    return audioContext
  } catch (error) {
    console.warn("Web Audio API não suportada:", error)
    return null
  }
}

// Função para gerar um beep
const generateBeep = (
  frequency: number,
  duration: number,
  type: OscillatorType = "sine",
  volume: number = volumeLevel,
) => {
  if (!audioContext) return false

  try {
    // Cria um oscilador
    const oscillator = audioContext.createOscillator()
    oscillator.type = type
    oscillator.frequency.value = frequency

    // Cria um nó de ganho para controlar o volume
    const gainNode = audioContext.createGain()
    gainNode.gain.value = volume

    // Conecta o oscilador ao nó de ganho e o nó de ganho à saída
    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)

    // Reproduz o beep
    oscillator.start()

    // Para o beep após a duração especificada
    setTimeout(() => {
      oscillator.stop()
    }, duration)

    return true
  } catch (error) {
    console.error("Erro ao gerar beep:", error)
    return false
  }
}

// Função para gerar um som de sucesso
const generateSuccessSound = () => {
  if (!audioContext) return false

  try {
    // Sequência de beeps ascendentes
    generateBeep(440, 100, "sine")
    setTimeout(() => generateBeep(554, 100, "sine"), 100)
    setTimeout(() => generateBeep(659, 150, "sine"), 200)
    return true
  } catch (error) {
    console.error("Erro ao gerar som de sucesso:", error)
    return false
  }
}

// Função para gerar um som de alerta
const generateWarningSound = () => {
  if (!audioContext) return false

  try {
    // Dois beeps médios
    generateBeep(440, 200, "square")
    setTimeout(() => generateBeep(440, 200, "square"), 250)
    return true
  } catch (error) {
    console.error("Erro ao gerar som de alerta:", error)
    return false
  }
}

// Função para gerar um som de erro
const generateErrorSound = () => {
  if (!audioContext) return false

  try {
    // Sequência de beeps descendentes
    generateBeep(659, 100, "sawtooth")
    setTimeout(() => generateBeep(554, 100, "sawtooth"), 100)
    setTimeout(() => generateBeep(440, 200, "sawtooth"), 200)
    return true
  } catch (error) {
    console.error("Erro ao gerar som de erro:", error)
    return false
  }
}

// Função para gerar um som de notificação
const generateNotificationSound = () => {
  if (!audioContext) return false

  try {
    // Dois beeps curtos
    generateBeep(659, 80, "sine")
    setTimeout(() => generateBeep(880, 80, "sine"), 100)
    return true
  } catch (error) {
    console.error("Erro ao gerar som de notificação:", error)
    return false
  }
}

// Função para definir o volume
export const setVolume = (volume: number) => {
  volumeLevel = Math.max(0, Math.min(1, volume))
  if (typeof window !== "undefined") {
    localStorage.setItem("jamal_express_volume", volumeLevel.toString())
  }
}

// Função para obter o volume atual
export const getVolume = (): number => {
  if (typeof window === "undefined") return volumeLevel

  const savedVolume = localStorage.getItem("jamal_express_volume")
  return savedVolume ? Number.parseFloat(savedVolume) : volumeLevel
}

// Função para tocar um som
export const playSound = async (soundName: string) => {
  if (!soundsEnabled || typeof window === "undefined") return

  // Verifica se o nome do som é válido
  if (!availableSounds.includes(soundName)) {
    console.warn(`Som não reconhecido: ${soundName}`)
    return
  }

  // Inicializa o contexto de áudio se necessário
  if (!audioContext) {
    audioContext = initAudioContext()
  }

  // Se o contexto de áudio estiver suspenso (política de autoplay), tenta retomá-lo
  if (audioContext && audioContext.state === "suspended") {
    try {
      await audioContext.resume()
    } catch (error) {
      console.warn("Não foi possível retomar o contexto de áudio:", error)
    }
  }

  try {
    // Gera o som apropriado
    let success = false

    switch (soundName) {
      case "success":
        success = generateSuccessSound()
        break
      case "warning":
        success = generateWarningSound()
        break
      case "error":
        success = generateErrorSound()
        break
      case "notification":
        success = generateNotificationSound()
        break
      default:
        // Som padrão
        success = generateBeep(440, 200, "sine")
    }

    // Se não conseguiu gerar o som, tenta um fallback simples
    if (!success) {
      console.warn(`Não foi possível gerar o som ${soundName}, usando fallback`)
      generateBeep(440, 200, "sine")
    }
  } catch (error) {
    console.error(`Erro ao reproduzir som ${soundName}:`, error)

    // Último recurso: tenta usar o elemento Audio com um beep gerado por data URI
    try {
      const audio = new Audio("data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU9vT18AAAAA")
      audio.volume = volumeLevel
      audio.play().catch((e) => console.error("Erro no fallback de áudio:", e))
    } catch (audioError) {
      console.error("Erro no fallback de áudio:", audioError)
    }
  }
}

// Função para vibrar o dispositivo
export const vibrate = () => {
  if (!vibrationEnabled || typeof window === "undefined") return

  if (navigator.vibrate) {
    navigator.vibrate(200)
  }
}

// Tipos de notificação
export type NotificationType = "success" | "warning" | "error" | "info" | "notification"

// Interface para opções de notificação
export interface NotificationOptions {
  title?: string
  body: string
  type?: NotificationType
  sound?: boolean
  vibrate?: boolean
  duration?: number
}

// Função para mostrar uma notificação
export const notify = ({
  title,
  body,
  type = "info",
  sound = true,
  vibrate: shouldVibrate = true,
  duration = 5000,
}: NotificationOptions) => {
  if (sound) {
    // Mapeia "info" para "notification" para reprodução de som
    const soundType = type === "info" ? "notification" : type
    if (availableSounds.includes(soundType)) {
      playSound(soundType)
    }
  }

  if (shouldVibrate) {
    vibrate()
  }

  toast({
    title: title,
    description: body,
    duration: duration,
  })
}

// Função para solicitar permissão para notificações
export const requestPermission = async (): Promise<boolean> => {
  if (typeof window !== "undefined" && "Notification" in window) {
    if (Notification.permission === "granted") {
      return true
    } else if (Notification.permission !== "denied") {
      const permission = await Notification.requestPermission()
      return permission === "granted"
    }
  }
  return false
}

// Função para verificar se os sons estão habilitados
export const areSoundsEnabled = (): boolean => {
  if (typeof window === "undefined") return soundsEnabled

  const savedSoundsEnabled = localStorage.getItem("jamal_express_sounds_enabled")
  return savedSoundsEnabled ? savedSoundsEnabled === "true" : soundsEnabled
}

// Função para definir se os sons estão habilitados
export const setSoundsEnabled = (enabled: boolean) => {
  soundsEnabled = enabled
  if (typeof window !== "undefined") {
    localStorage.setItem("jamal_express_sounds_enabled", enabled.toString())
  }
}

// Função para verificar se a vibração está habilitada
export const isVibrationEnabled = (): boolean => {
  if (typeof window === "undefined") return vibrationEnabled

  const savedVibrationEnabled = localStorage.getItem("jamal_express_vibration_enabled")
  return savedVibrationEnabled ? savedVibrationEnabled === "true" : vibrationEnabled
}

// Função para definir se a vibração está habilitada
export const setVibrationEnabled = (enabled: boolean) => {
  vibrationEnabled = enabled
  if (typeof window !== "undefined") {
    localStorage.setItem("jamal_express_vibration_enabled", enabled.toString())
  }
}

// Função para testar o som
export const testSound = (soundName: string) => {
  playSound(soundName)
}

// Função para mostrar notificação de nova solicitação de corrida
export const notifyNewRideRequest = (clientName: string, destination: string, requestId: number) => {
  notify({
    title: "Nova solicitação de corrida",
    body: `Cliente: ${clientName}, Destino: ${destination}`,
    type: "notification",
    sound: true,
    vibrate: true,
  })
}

// Função para mostrar notificação de corrida aceita
export const notifyRideAccepted = (driverName: string, tempoEstimado: number) => {
  notify({
    title: "Corrida aceita",
    body: `Sua corrida foi aceita por ${driverName}. Tempo estimado: ${tempoEstimado} minutos.`,
    type: "success",
    sound: true,
    vibrate: true,
  })
}

// Função para mostrar notificação de solicitação enviada
export const notifyRideRequested = () => {
  notify({
    title: "Solicitação enviada",
    body: "Sua solicitação foi enviada. Aguarde enquanto buscamos um motorista próximo.",
    type: "info",
    sound: true,
    vibrate: true,
  })
}

// Função para notificar o cliente quando o motorista chega
export const notifyDriverArrived = (motoristaNome: string): void => {
  try {
    console.log("NotificationService: Iniciando notificação de chegada do motorista", motoristaNome)

    // Reproduzir som de notificação
    console.log("NotificationService: Reproduzindo som de chegada")
    playSound("success")

    // Vibrar o dispositivo se disponível
    if (navigator.vibrate) {
      console.log("NotificationService: Vibrando dispositivo")
      navigator.vibrate([200, 100, 200])
    }

    // Mostrar notificação no navegador
    if (typeof Notification !== "undefined" && Notification.permission === "granted") {
      console.log("NotificationService: Criando notificação do navegador")
      try {
        const notification = new Notification("Motorista chegou!", {
          body: `${motoristaNome} chegou ao local de embarque.`,
          icon: "/favicon.ico",
          tag: "motorista-chegou",
        })

        // Focar na janela quando a notificação for clicada
        notification.onclick = () => {
          window.focus()
          notification.close()
        }
      } catch (e) {
        console.error("Erro ao criar notificação do navegador:", e)
      }
    }

    // Mostrar toast na interface
    console.log("NotificationService: Mostrando toast na interface")
    try {
      toast({
        title: "Motorista chegou!",
        description: `${motoristaNome} chegou ao local de embarque.`,
        variant: "success",
      })
    } catch (e) {
      console.error("Erro ao mostrar toast:", e)
    }

    console.log("NotificationService: Notificação de chegada concluída com sucesso")
  } catch (error) {
    console.error("Erro ao notificar chegada do motorista:", error)

    // Fallback para garantir que pelo menos o toast seja mostrado
    try {
      toast({
        title: "Motorista chegou!",
        description: `${motoristaNome} chegou ao local de embarque.`,
        variant: "success",
      })
    } catch (e) {
      console.error("Erro no fallback de notificação:", e)
    }
  }
}

// Função para notificar o cliente quando a corrida for finalizada
export const notifyRideCompleted = (motoristaNome: string): void => {
  try {
    console.log("NotificationService: Iniciando notificação de corrida finalizada", motoristaNome)

    // Reproduzir som de notificação
    console.log("NotificationService: Reproduzindo som de finalização")
    playSound("success")

    // Vibrar o dispositivo se disponível
    if (navigator.vibrate) {
      console.log("NotificationService: Vibrando dispositivo")
      navigator.vibrate([200, 100, 200, 100, 200])
    }

    // Mostrar notificação no navegador
    if (typeof Notification !== "undefined" && Notification.permission === "granted") {
      console.log("NotificationService: Criando notificação do navegador")
      try {
        const notification = new Notification("Corrida finalizada!", {
          body: `Sua corrida com ${motoristaNome} foi finalizada. Por favor, avalie o motorista.`,
          icon: "/favicon.ico",
          tag: "corrida-finalizada",
        })

        // Focar na janela quando a notificação for clicada
        notification.onclick = () => {
          window.focus()
          notification.close()
        }
      } catch (e) {
        console.error("Erro ao criar notificação do navegador:", e)
      }
    }

    // Mostrar toast na interface
    console.log("NotificationService: Mostrando toast na interface")
    try {
      toast({
        title: "Corrida finalizada!",
        description: `Sua corrida com ${motoristaNome} foi finalizada. Por favor, avalie o motorista.`,
        variant: "success",
      })
    } catch (e) {
      console.error("Erro ao mostrar toast:", e)
    }

    console.log("NotificationService: Notificação de finalização concluída com sucesso")
  } catch (error) {
    console.error("Erro ao notificar finalização da corrida:", error)

    // Fallback para garantir que pelo menos o toast seja mostrado
    try {
      toast({
        title: "Corrida finalizada!",
        description: `Sua corrida com ${motoristaNome} foi finalizada. Por favor, avalie o motorista.`,
        variant: "success",
      })
    } catch (e) {
      console.error("Erro no fallback de notificação:", e)
    }
  }
}

// Inicializa o serviço
if (typeof window !== "undefined") {
  // Carrega as configurações salvas
  soundsEnabled = areSoundsEnabled()
  vibrationEnabled = isVibrationEnabled()
  volumeLevel = getVolume()

  // Inicializa o contexto de áudio quando o documento estiver pronto
  if (document.readyState === "complete") {
    initAudioContext()
  } else {
    window.addEventListener("load", initAudioContext)
  }
}

export const notificationService = {
  setVolume,
  getVolume,
  playSound,
  vibrate,
  notify,
  requestPermission,
  areSoundsEnabled,
  setSoundsEnabled,
  isVibrationEnabled,
  setVibrationEnabled,
  testSound,
  notifyNewRideRequest,
  notifyRideAccepted,
  notifyRideRequested,
  notifyDriverArrived,
  notifyRideCompleted,
}
