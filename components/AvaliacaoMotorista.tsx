"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Star } from "lucide-react"
import { avaliarMotorista } from "@/services/solicitacaoService"
import { toast } from "@/hooks/use-toast"

interface AvaliacaoMotoristaProps {
  codigoMotorista: string
  nomeMotorista: string
  onAvaliacaoCompleta: () => void
}

export default function AvaliacaoMotorista({
  codigoMotorista,
  nomeMotorista,
  onAvaliacaoCompleta,
}: AvaliacaoMotoristaProps) {
  const [avaliacao, setAvaliacao] = useState(5)
  const [comentario, setComentario] = useState("")
  const [enviando, setEnviando] = useState(false)

  const handleSubmit = async () => {
    if (avaliacao < 1 || avaliacao > 5) {
      toast({
        title: "Avaliação inválida",
        description: "Por favor, selecione uma avaliação entre 1 e 5 estrelas",
        variant: "destructive",
      })
      return
    }

    setEnviando(true)

    try {
      await avaliarMotorista(codigoMotorista, avaliacao, comentario)

      toast({
        title: "Avaliação enviada",
        description: "Obrigado por avaliar o motorista!",
        variant: "success",
      })

      onAvaliacaoCompleta()
    } catch (error: any) {
      console.error("Erro ao enviar avaliação:", error)

      toast({
        title: "Erro ao enviar avaliação",
        description: error.message || "Não foi possível enviar sua avaliação. Tente novamente.",
        variant: "destructive",
      })
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Avalie sua viagem</CardTitle>
        <CardDescription>Como foi sua experiência com {nomeMotorista}?</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-center">
          <div className="flex space-x-1">
            {[1, 2, 3, 4, 5].map((estrela) => (
              <button key={estrela} type="button" onClick={() => setAvaliacao(estrela)} className="focus:outline-none">
                <Star
                  size={32}
                  className={`${
                    estrela <= avaliacao ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
                  } transition-colors`}
                />
              </button>
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="comentario" className="block text-sm font-medium text-gray-700 mb-1">
            Comentário (opcional)
          </label>
          <Textarea
            id="comentario"
            placeholder="Deixe um comentário sobre sua experiência..."
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            rows={4}
          />
        </div>
      </CardContent>
      <CardFooter className="flex justify-end">
        <Button onClick={handleSubmit} disabled={enviando}>
          {enviando ? "Enviando..." : "Enviar Avaliação"}
        </Button>
      </CardFooter>
    </Card>
  )
}
