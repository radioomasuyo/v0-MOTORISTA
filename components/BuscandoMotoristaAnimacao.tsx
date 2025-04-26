"use client"

interface BuscandoMotoristaAnimacaoProps {
  motoristasOnline?: number
}

export default function BuscandoMotoristaAnimacao({ motoristasOnline = 0 }: BuscandoMotoristaAnimacaoProps) {
  // Cores para os carros (serão usadas em sequência)
  const carColors = ["#3B82F6", "#EF4444", "#10B981", "#F59E0B", "#8B5CF6", "#EC4899"]

  // Garantir que temos pelo menos 1 carro para mostrar a animação
  const numCars = Math.max(1, motoristasOnline)

  // Gerar os carros com base na quantidade de motoristas online
  const renderCars = () => {
    const cars = []
    for (let i = 0; i < numCars; i++) {
      // Usar o índice para determinar a cor do carro (com loop)
      const colorIndex = i % carColors.length
      const color = carColors[colorIndex]

      // Calcular o atraso da animação para cada carro
      const animationDelay = `${i * 0.5}s`

      cars.push(
        <div
          key={i}
          className="car-animation"
          style={{
            animationDelay,
            top: `${20 + i * 15}px`, // Posicionar os carros em diferentes alturas
          }}
        >
          <svg width="40" height="20" viewBox="0 0 40 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="5" y="10" width="30" height="10" rx="2" fill={color} />
            <rect x="7" y="5" width="20" height="5" rx="1" fill={color} />
            <circle cx="10" cy="20" r="3" fill="#1F2937" />
            <circle cx="30" cy="20" r="3" fill="#1F2937" />
          </svg>
        </div>,
      )
    }
    return cars
  }

  return (
    <div className="flex flex-col items-center justify-center py-6">
      {/* Texto movido para cima */}
      <div className="mb-4 text-center">
        <p className="text-blue-600 font-medium">
          {motoristasOnline > 0
            ? `${motoristasOnline} motorista${motoristasOnline > 1 ? "s" : ""} disponíve${motoristasOnline > 1 ? "is" : "l"}`
            : "Buscando motoristas..."}
        </p>
      </div>

      {/* Área de animação dos carros */}
      <div className="relative w-80 h-40 bg-gray-100 rounded-lg overflow-hidden">
        {/* Estrada */}
        <div className="absolute bottom-0 w-full h-10 bg-gray-300">
          {/* Faixas da estrada */}
          <div className="road-lines"></div>
        </div>

        {/* Carros */}
        {renderCars()}
      </div>

      {/* Estilos para as animações */}
      <style jsx>{`
        .car-animation {
          position: absolute;
          animation: carMove 8s linear infinite;
          z-index: 10;
        }
        
        @keyframes carMove {
          0% {
            transform: translateX(-50px);
          }
          100% {
            transform: translateX(330px);
          }
        }
        
        .road-lines {
          position: absolute;
          top: 50%;
          width: 100%;
          height: 2px;
          background: repeating-linear-gradient(
            to right,
            white,
            white 10px,
            transparent 10px,
            transparent 20px
          );
          animation: roadLineMove 0.5s linear infinite;
        }
        
        @keyframes roadLineMove {
          0% {
            background-position: 0 0;
          }
          100% {
            background-position: -20px 0;
          }
        }
      `}</style>
    </div>
  )
}
