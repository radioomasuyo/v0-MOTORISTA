"use client"

import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import NotificationSettings from "@/components/NotificationSettings"

export default function ConfiguracoesPage() {
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <header className="bg-gray-800 p-4 text-white flex items-center shadow-md">
        <Link href="/" className="mr-4">
          <ArrowLeft size={24} />
        </Link>
        <h1 className="text-xl font-bold">Configurações</h1>
      </header>

      <main className="flex-1 p-4">
        <Card>
          <CardHeader>
            <CardTitle>Configurações do Aplicativo</CardTitle>
            <CardDescription>Personalize sua experiência no Jamal Express</CardDescription>
          </CardHeader>
          <CardContent>
            <NotificationSettings />
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
