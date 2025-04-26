"use client"

import { useEffect, useRef, useState } from "react"
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import type { Coordenadas } from "@/lib/distance-service"

// Componente para atualizar a visualização do mapa
function MapViewUpdater({ center }: { center: [number, number] }) {
  const map = useMap()

  useEffect(() => {
    if (center) {
      map.setView(center, map.getZoom())
    }
  }, [center, map])

  return null
}

// Ícones personalizados
const motoristaIcon = new L.Icon({
  iconUrl: "/images/motorista-marker.png",
  iconSize: [40, 40],
  iconAnchor: [20, 40],
  popupAnchor: [0, -40],
})

const clienteIcon = new L.Icon({
  iconUrl: "/images/cliente-marker.png",
  iconSize: [40, 40],
  iconAnchor: [20, 40],
  popupAnchor: [0, -40],
})

interface MapaLocalizacaoProps {
  motoristaCoords: Coordenadas | null
  clienteCoords: Coordenadas | null
  clienteNome?: string
  clienteEndereco?: string
  altura?: string
  mostrarControles?: boolean
  mostrarPopups?: boolean
  zoom?: number
  className?: string
}

export default function MapaLocalizacao({
  motoristaCoords,
  clienteCoords,
  clienteNome = "Cliente",
  clienteEndereco = "Localização do cliente",
  altura = "300px",
  mostrarControles = true,
  mostrarPopups = true,
  zoom = 13,
  className = "",
}: MapaLocalizacaoProps) {
  // Estado para armazenar o centro do mapa
  const [centro, setCentro] = useState<[number, number]>([-23.5505, -46.6333]) // São Paulo como padrão
  const mapRef = useRef<L.Map | null>(null)
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  // Corrigir o problema dos ícones do Leaflet no Next.js
  useEffect(() => {
    // Apenas execute no lado do cliente
    if (isClient) {
      // Corrigir os ícones do Leaflet
      delete (L.Icon.Default.prototype as any)._getIconUrl

      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "/images/marker-icon-2x.png",
        iconUrl: "/images/marker-icon.png",
        shadowUrl: "/images/marker-shadow.png",
      })
    }
  }, [isClient])

  // Atualizar o centro do mapa quando as coordenadas mudarem
  useEffect(() => {
    if (clienteCoords && clienteCoords.latitude && clienteCoords.longitude) {
      setCentro([clienteCoords.latitude, clienteCoords.longitude])
    } else if (motoristaCoords && motoristaCoords.latitude && motoristaCoords.longitude) {
      setCentro([motoristaCoords.latitude, motoristaCoords.longitude])
    }
  }, [clienteCoords, motoristaCoords])

  // Ajustar o zoom para mostrar ambos os marcadores
  useEffect(() => {
    if (mapRef.current && motoristaCoords && clienteCoords) {
      const bounds = L.latLngBounds(
        [motoristaCoords.latitude, motoristaCoords.longitude],
        [clienteCoords.latitude, clienteCoords.longitude],
      )
      mapRef.current.fitBounds(bounds, { padding: [50, 50] })
    }
  }, [motoristaCoords, clienteCoords])

  return (
    <div className={`relative rounded-lg overflow-hidden ${className}`} style={{ height: altura }}>
      <MapContainer
        center={centro}
        zoom={zoom}
        style={{ height: "100%", width: "100%" }}
        zoomControl={mostrarControles}
        attributionControl={mostrarControles}
        whenCreated={(map) => {
          mapRef.current = map
        }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapViewUpdater center={centro} />

        {motoristaCoords && motoristaCoords.latitude && motoristaCoords.longitude && (
          <Marker position={[motoristaCoords.latitude, motoristaCoords.longitude]} icon={motoristaIcon}>
            {mostrarPopups && (
              <Popup>
                <div className="text-center">
                  <strong>Você está aqui</strong>
                </div>
              </Popup>
            )}
          </Marker>
        )}

        {clienteCoords && clienteCoords.latitude && clienteCoords.longitude && (
          <Marker position={[clienteCoords.latitude, clienteCoords.longitude]} icon={clienteIcon}>
            {mostrarPopups && (
              <Popup>
                <div>
                  <strong>{clienteNome}</strong>
                  <p className="text-sm">{clienteEndereco}</p>
                </div>
              </Popup>
            )}
          </Marker>
        )}
      </MapContainer>
    </div>
  )
}
