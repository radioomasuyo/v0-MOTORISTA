"use client"

import type React from "react"

// Implementação simplificada do hook useToast
import { useState, useEffect, useCallback } from "react"

type ToastType = {
  id: string
  title?: string
  description?: string
  duration?: number
  variant?: "default" | "destructive" | "success" | "info" | "warning"
}

type ToastActionType = {
  altText: string
  onClick: () => void
  children: React.ReactNode
}

export type ToastProps = {
  title?: string
  description?: string
  action?: ToastActionType
  duration?: number
  variant?: "default" | "destructive" | "success" | "info" | "warning"
}

// Armazenamento global para toasts
let toasts: ToastType[] = []
let listeners: Function[] = []

// Função para notificar os listeners sobre mudanças
const notifyListeners = () => {
  listeners.forEach((listener) => listener(toasts))
}

// Função para adicionar um toast
export const toast = (props: ToastProps) => {
  const id = Math.random().toString(36).substring(2, 9)
  const newToast = {
    id,
    title: props.title,
    description: props.description,
    duration: props.duration || 5000,
    variant: props.variant || "default",
  }

  toasts = [...toasts, newToast]
  notifyListeners()

  // Remover o toast após a duração
  setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== id)
    notifyListeners()
  }, newToast.duration)

  return {
    id,
    dismiss: () => {
      toasts = toasts.filter((t) => t.id !== id)
      notifyListeners()
    },
    update: (props: Partial<ToastProps>) => {
      toasts = toasts.map((t) => {
        if (t.id === id) {
          return { ...t, ...props }
        }
        return t
      })
      notifyListeners()
    },
  }
}

// Hook para usar os toasts
export const useToast = () => {
  const [localToasts, setLocalToasts] = useState<ToastType[]>(toasts)

  useEffect(() => {
    // Adicionar listener
    const listener = (updatedToasts: ToastType[]) => {
      setLocalToasts([...updatedToasts])
    }

    listeners.push(listener)

    // Remover listener ao desmontar
    return () => {
      listeners = listeners.filter((l) => l !== listener)
    }
  }, [])

  const dismiss = useCallback((id: string) => {
    toasts = toasts.filter((t) => t.id !== id)
    notifyListeners()
  }, [])

  return {
    toast,
    toasts: localToasts,
    dismiss,
  }
}
