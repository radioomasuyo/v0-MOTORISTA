// Tipos para coordenadas geográficas
export type Coordenadas = {
  latitude: number
  longitude: number
}

// Função para calcular a distância entre dois pontos usando a fórmula de Haversine
export const calculateDistance = async (origem: Coordenadas, destino: Coordenadas): Promise<number> => {
  // Implementação da fórmula de Haversine para calcular distância entre coordenadas
  const R = 6371 // Raio da Terra em km
  const dLat = deg2rad(destino.latitude - origem.latitude)
  const dLon = deg2rad(destino.longitude - origem.longitude)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(origem.latitude)) * Math.cos(deg2rad(destino.latitude)) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  const distance = R * c // Distância em km

  // Arredondar para uma casa decimal
  return Math.round(distance * 10) / 10
}

// Função auxiliar para converter graus em radianos
function deg2rad(deg: number): number {
  return deg * (Math.PI / 180)
}

// Função para estimar o tempo de chegada com base na distância
export const estimateArrivalTime = async (distanciaKm: number): Promise<number> => {
  // Velocidade média estimada em km/h para uma moto em área urbana
  const velocidadeMediaKmh = 30

  // Calcular tempo em minutos
  const tempoHoras = distanciaKm / velocidadeMediaKmh
  const tempoMinutos = Math.ceil(tempoHoras * 60)

  // Adicionar um tempo mínimo de 5 minutos e máximo de 30 minutos
  return Math.max(5, Math.min(30, tempoMinutos))
}

// Função para geocodificar um endereço (converter endereço em coordenadas)
export const geocodeAddress = async (endereco: string): Promise<Coordenadas | null> => {
  try {
    // Em uma implementação real, aqui você usaria uma API como Google Maps Geocoding
    // Para este exemplo, vamos simular com coordenadas aleatórias próximas a São Paulo

    // Coordenadas base de São Paulo
    const baseLat = -23.55
    const baseLon = -46.63

    // Adicionar uma variação aleatória pequena
    const randomLat = (Math.random() - 0.5) * 0.1
    const randomLon = (Math.random() - 0.5) * 0.1

    return {
      latitude: baseLat + randomLat,
      longitude: baseLon + randomLon,
    }
  } catch (error) {
    console.error("Erro ao geocodificar endereço:", error)
    return null
  }
}
