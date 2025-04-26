import TestNotificacaoChegada from "@/components/TestNotificacaoChegada"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function TesteNotificacaoChegadaPage() {
  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-blue-500 p-4 text-white flex items-center shadow-md">
        <Link href="/" className="mr-4">
          <ArrowLeft size={24} />
        </Link>
        <h1 className="text-xl font-bold">Teste de Notificação de Chegada</h1>
      </header>

      <main className="container mx-auto p-4 py-8">
        <TestNotificacaoChegada />
      </main>
    </div>
  )
}
