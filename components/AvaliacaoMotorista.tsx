"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Star } from "lucide-react"
import { avaliarMotorista } from "@/services/solicitacaoService"
import { toast } from "@/hooks/use-toast"

interface AvaliacaoMotoristaProps {
  motorista: {
    id: number
    nome: string
    foto: string
  }
  onAvaliacaoConcluida: () => void
}

export default function AvaliacaoMotorista({ motorista, onAvaliacaoConcluida }: AvaliacaoMotoristaProps) {
  const [estrelas, setEstrelas] = useState(5)
  const [comentario, setComentario] = useState("")
  const [enviando, setEnviando] = useState(false)

  const handleSubmit = async () => {
    if (estrelas < 1) {
      toast({
        title: "Avaliação inválida",
        description: "Por favor, selecione pelo menos 1 estrela",
        variant: "destructive",
      })
      return
    }

    setEnviando(true)

    try {
      console.log("Enviando avaliação para motorista ID:", motorista.id)

      const { sucesso, mensagem } = await avaliarMotorista(motorista.id, {
        estrelas,
        comentario,
      })

      if (sucesso) {
        toast({
          title: "Avaliação enviada",
          description: "Obrigado por avaliar sua corrida!",
          variant: "success",
        })
        onAvaliacaoConcluida()
      } else {
        toast({
          title: "Erro",
          description: mensagem || "Não foi possível enviar sua avaliação",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Erro ao enviar avaliação:", error)
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao enviar sua avaliação",
        variant: "destructive",
      })
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle>Avalie sua corrida</CardTitle>
        <CardDescription>Conte-nos como foi sua experiência</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col items-center">
          <img
            src={motorista.foto || "/placeholder.svg?height=150&width=150&query=profile"}
            alt={motorista.nome}
            className="w-24 h-24 rounded-full object-cover mb-2"
          />
          <h3 className="font-medium text-lg">{motorista.nome}</h3>
        </div>

        <div className="flex justify-center space-x-1">
          {[1, 2, 3, 4, 5].map((valor) => (
            <button key={valor} type="button" onClick={() => setEstrelas(valor)} className="focus:outline-none">
              <Star
                size={32}
                className={`${
                  valor <= estrelas ? "text-yellow-400 fill-yellow-400" : "text-gray-300"
                } hover:text-yellow-400 transition-colors`}
              />
            </button>
          ))}
        </div>

        <div>
          <label htmlFor="comentario" className="block text-sm font-medium text-gray-700 mb-1">
            Comentário (opcional)
          </label>
          <Textarea
            id="comentario"
            placeholder="Conte-nos mais sobre sua experiência..."
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            rows={4}
          />
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={onAvaliacaoConcluida} disabled={enviando}>
          Pular
        </Button>
        <Button onClick={handleSubmit} disabled={enviando}>
          {enviando ? "Enviando..." : "Enviar Avaliação"}
        </Button>
      </CardFooter>
    </Card>
  )
}
