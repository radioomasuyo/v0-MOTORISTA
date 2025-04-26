"use client"
import { Settings } from "lucide-react"
import Link from "next/link"
import { User, Car } from "lucide-react"
import { useRouter } from "next/navigation"

export default function Home() {
  const router = useRouter()

  const handleAdminAccess = () => {
    // Redirecionar para a página de login de admin
    router.push("/admin/login")
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <header className="bg-yellow-500 p-4 text-white text-center shadow-md">
        <h1 className="text-2xl font-bold">Jamal Express</h1>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="text-center mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Bem-vindo ao Jamal Express</h2>
          <p className="text-gray-600">Escolha como deseja continuar:</p>
        </div>

        <div className="grid grid-cols-2 gap-6 max-w-md w-full mb-8">
          <Link
            href="/cliente"
            className="flex flex-col items-center p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow"
          >
            <div className="bg-blue-100 p-4 rounded-full mb-3">
              <User size={32} className="text-blue-600" />
            </div>
            <span className="font-medium text-gray-800">Cliente</span>
          </Link>

          <Link
            href="/motorista"
            className="flex flex-col items-center p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow"
          >
            <div className="bg-green-100 p-4 rounded-full mb-3">
              <Car size={32} className="text-green-600" />
            </div>
            <span className="font-medium text-gray-800">Motorista</span>
          </Link>
        </div>

        <button
          onClick={handleAdminAccess}
          className="flex items-center p-3 bg-gray-200 rounded-full hover:bg-gray-300 transition-colors"
        >
          <Settings size={24} className="text-gray-700" />
        </button>
      </main>

      <footer className="bg-gray-800 text-white text-center p-3 text-sm">
        &copy; {new Date().getFullYear()} Jamal Express. Todos os direitos reservados.
      </footer>
    </div>
  )
}
