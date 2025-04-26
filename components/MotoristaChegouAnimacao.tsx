export default function MotoristaChegouAnimacao() {
  return (
    <div className="flex flex-col items-center justify-center py-4 mb-4">
      <div className="relative w-full max-w-md h-32 mb-2">
        {/* Fundo da estrada */}
        <div className="absolute inset-0 bg-gray-800 rounded-lg overflow-hidden">
          {/* Faixa central da estrada */}
          <div className="absolute top-1/2 left-0 right-0 h-2 bg-yellow-400 transform -translate-y-1/2"></div>

          {/* Carro parado */}
          <div className="absolute top-1/2 left-1/2 transform -translate-y-1/2 -translate-x-1/2">
            <div className="relative">
              {/* Corpo do carro */}
              <div className="w-24 h-10 bg-green-500 rounded-lg relative">
                {/* Teto do carro */}
                <div className="absolute top-0 left-4 right-4 h-4 bg-green-600 rounded-t-lg transform -translate-y-3"></div>

                {/* Faróis piscando */}
                <div className="absolute bottom-1 left-0 w-2 h-2 bg-yellow-300 rounded-full animate-pulse"></div>
                <div className="absolute bottom-1 right-0 w-2 h-2 bg-yellow-300 rounded-full animate-pulse"></div>

                {/* Rodas */}
                <div className="absolute -bottom-2 left-3 w-4 h-4 bg-gray-900 rounded-full"></div>
                <div className="absolute -bottom-2 right-3 w-4 h-4 bg-gray-900 rounded-full"></div>
              </div>

              {/* Indicador de localização pulsante */}
              <div className="absolute -top-8 left-1/2 transform -translate-x-1/2">
                <div className="relative">
                  <div className="absolute inset-0 bg-red-500 rounded-full animate-ping opacity-75 w-6 h-6"></div>
                  <div className="relative bg-red-600 rounded-full w-6 h-6 flex items-center justify-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Círculo pulsante com ícone de check */}
      <div className="relative w-16 h-16 mb-2">
        <div className="absolute inset-0 rounded-full bg-green-500 opacity-20 animate-pulse"></div>
        <div className="absolute inset-2 rounded-full bg-green-500 flex items-center justify-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-8 w-8 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
      </div>

      <div className="text-center">
        <p className="text-green-600 font-bold text-xl">Motorista no local!</p>
        <p className="text-green-600 text-sm">Seu motorista está aguardando</p>
      </div>
    </div>
  )
}
