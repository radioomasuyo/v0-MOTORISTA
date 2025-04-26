// Este arquivo é um fallback para reprodução de sons
// Ele é usado quando os arquivos de áudio não podem ser carregados

// Função para gerar um beep usando Web Audio API
function generateBeep(frequency, duration, volume, type) {
  if (typeof window === "undefined") return

  try {
    // Cria um contexto de áudio
    const AudioContext = window.AudioContext || window.webkitAudioContext
    if (!AudioContext) return

    const audioContext = new AudioContext()

    // Cria um oscilador
    const oscillator = audioContext.createOscillator()
    oscillator.type = type || "sine"
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
      audioContext.close()
    }, duration)

    return true
  } catch (error) {
    console.error("Erro ao gerar beep:", error)
    return false
  }
}

// Exporta a função para o escopo global
if (typeof window !== "undefined") {
  window.generateBeep = generateBeep
}
