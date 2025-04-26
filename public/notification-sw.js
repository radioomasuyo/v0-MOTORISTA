// Service Worker para lidar com notificações

self.addEventListener("install", (event) => {
  console.log("Service Worker instalado com sucesso")
  self.skipWaiting()
})

self.addEventListener("activate", (event) => {
  console.log("Service Worker ativado com sucesso")
  return self.clients.claim()
})

// Lidar com notificações push
self.addEventListener("push", (event) => {
  console.log("Notificação push recebida", event)

  if (!event.data) {
    console.log("Nenhum dado recebido na notificação push")
    return
  }

  try {
    const data = event.data.json()
    console.log("Dados da notificação push:", data)

    const title = data.title || "Jamal Express"
    const options = {
      body: data.body || "Nova notificação",
      icon: data.icon || "/favicon.ico",
      badge: data.badge || "/images/motorista-marker.png",
      vibrate: data.vibrate || [200, 100, 200],
      tag: data.tag,
      requireInteraction: data.requireInteraction || false,
      actions: data.actions || [],
    }

    event.waitUntil(self.registration.showNotification(title, options))
  } catch (error) {
    console.error("Erro ao processar notificação push:", error)
  }
})

// Lidar com cliques em notificações
self.addEventListener("notificationclick", (event) => {
  console.log("Notificação clicada", event)

  const notification = event.notification
  const action = event.action
  const notificationData = notification.data || {}

  notification.close()

  if (action) {
    console.log("Ação de notificação clicada:", action)

    // Lidar com ações específicas
    switch (action) {
      case "accept":
        // Lógica para aceitar corrida
        console.log("Corrida aceita")
        break
      case "reject":
        // Lógica para recusar corrida
        console.log("Corrida recusada")
        break
      case "avaliar":
        // Lógica para abrir tela de avaliação
        console.log("Abrir avaliação")
        break
      default:
        console.log("Ação desconhecida:", action)
    }
  }

  // Abrir ou focar na janela do aplicativo quando a notificação for clicada
  event.waitUntil(
    clients.matchAll({ type: "window" }).then((clientList) => {
      // Verificar se já existe uma janela aberta
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          return client.focus()
        }
      }
      // Se não houver janela aberta, abrir uma nova
      if (clients.openWindow) {
        return clients.openWindow("/")
      }
    }),
  )
})

// Lidar com o fechamento de notificações
self.addEventListener("notificationclose", (event) => {
  console.log("Notificação fechada", event)
})
