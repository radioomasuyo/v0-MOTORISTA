"use client"
import { Bike, User, ChevronRight } from "lucide-react"

interface PaginaInicialProps {
  onSelectRole: (role: string) => void
}

export default function PaginaInicial({ onSelectRole }: PaginaInicialProps) {
  // Add a safety check for the onSelectRole prop
  const handleRoleSelect = (role: string) => {
    console.log("Selecting role:", role)
    if (typeof onSelectRole === "function") {
      onSelectRole(role)
    } else {
      console.error("onSelectRole is not a function", onSelectRole)
    }
  }

  return (
    <div className="max-w-md mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Bem-vindo ao Jamal Express</h2>
        <p className="text-gray-600">Selecione como deseja continuar</p>
      </div>

      <div className="space-y-4">
        <button
          onClick={() => handleRoleSelect("cliente")}
          className="w-full bg-white hover:bg-gray-50 transition-colors p-4 rounded-lg shadow-md flex items-center justify-between"
        >
          <div className="flex items-center">
            <div className="bg-rose-100 p-3 rounded-full">
              <User className="w-6 h-6 text-rose-600" />
            </div>
            <div className="ml-4 text-left">
              <h3 className="font-medium text-gray-800">Sou Cliente</h3>
              <p className="text-sm text-gray-500">Solicitar uma corrida</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400" />
        </button>

        <button
          onClick={() => handleRoleSelect("motorista")}
          className="w-full bg-white hover:bg-gray-50 transition-colors p-4 rounded-lg shadow-md flex items-center justify-between"
        >
          <div className="flex items-center">
            <div className="bg-green-100 p-3 rounded-full">
              <Bike className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4 text-left">
              <h3 className="font-medium text-gray-800">Sou Motorista</h3>
              <p className="text-sm text-gray-500">Receber corridas</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400" />
        </button>
      </div>

      <div className="mt-8 text-center text-sm text-gray-500">
        <p>
          Jamal Express - Transporte rápido e seguro
          <br />
          Versão 1.0.0
        </p>
      </div>
    </div>
  )
}
