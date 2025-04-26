import { supabase, type Driver, type Notification } from "@/lib/supabase"

// Initialize storage with default drivers if empty
export const initializeDriversStorage = async (): Promise<void> => {
  try {
    // Check if we have any drivers in the database
    const { data: existingDrivers, error: checkError } = await supabase.from("drivers").select("id").limit(1)

    // If there's an error about the relation not existing, the table hasn't been created yet
    if (checkError && checkError.message.includes("relation") && checkError.message.includes("does not exist")) {
      console.error("Drivers table doesn't exist yet. Please initialize the database first.")
      return
    }

    if (checkError) {
      console.error("Error checking drivers:", checkError)
      return
    }

    // If no drivers exist, add default ones
    if (!existingDrivers || existingDrivers.length === 0) {
      const defaultDrivers: Omit<Driver, "id" | "created_at">[] = [
        {
          codigo: "1234",
          nome: "Carlos Silva",
          telefone: "11999990000",
          avaliacao: 4.8,
          veiculo: "Honda CG 160",
          placa: "ABC-1234",
          foto: "/placeholder.svg?height=100&width=100",
          corridas: 145,
          status: "online",
          ativo: true,
        },
        {
          codigo: "5678",
          nome: "Ana Santos",
          telefone: "11988880000",
          avaliacao: 4.9,
          veiculo: "Yamaha Factor 150",
          placa: "XYZ-5678",
          foto: "/placeholder.svg?height=100&width=100",
          corridas: 89,
          status: "offline",
          ativo: true,
        },
        {
          codigo: "9012",
          nome: "Roberto Oliveira",
          telefone: "11977770000",
          avaliacao: 4.7,
          veiculo: "Honda PCX 150",
          placa: "DEF-9012",
          foto: "/placeholder.svg?height=100&width=100",
          corridas: 212,
          status: "online",
          ativo: true,
        },
      ]

      const { error: insertError } = await supabase.from("drivers").insert(defaultDrivers)

      if (insertError) {
        console.error("Error initializing drivers:", insertError)
      }
    }
  } catch (error) {
    console.error("Error in initializeDriversStorage:", error)
  }
}

// Get all drivers
export const getAllDrivers = async (): Promise<Driver[]> => {
  try {
    const { data, error } = await supabase.from("drivers").select("*").order("id")

    if (error) {
      console.error("Error fetching drivers:", error)
      return []
    }

    return data || []
  } catch (error) {
    console.error("Error in getAllDrivers:", error)
    return []
  }
}

// Get driver by code
export const getDriverByCode = async (code: string): Promise<Driver | null> => {
  try {
    const { data, error } = await supabase.from("drivers").select("*").eq("codigo", code).eq("ativo", true).single()

    if (error) {
      console.error("Error fetching driver by code:", error)
      return null
    }

    return data
  } catch (error) {
    console.error("Error in getDriverByCode:", error)
    return null
  }
}

// Get active drivers
export const getActiveDrivers = async (): Promise<Driver[]> => {
  try {
    const { data, error } = await supabase.from("drivers").select("*").eq("ativo", true)

    if (error) {
      console.error("Error fetching active drivers:", error)
      return []
    }

    return data || []
  } catch (error) {
    console.error("Error in getActiveDrivers:", error)
    return []
  }
}

// Add new driver
export const addDriver = async (driver: Omit<Driver, "id" | "created_at">): Promise<Driver> => {
  // Check if code already exists
  const { data: existingDriver } = await supabase.from("drivers").select("id").eq("codigo", driver.codigo).single()

  if (existingDriver) {
    throw new Error("Driver code already exists")
  }

  const { data, error } = await supabase
    .from("drivers")
    .insert({
      ...driver,
      avaliacao: driver.avaliacao || 5.0,
      corridas: driver.corridas || 0,
      status: driver.status || "offline",
      ativo: driver.ativo !== undefined ? driver.ativo : true,
    })
    .select()
    .single()

  if (error) {
    console.error("Error adding driver:", error)
    throw new Error("Failed to add driver")
  }

  return data
}

// Update driver
export const updateDriver = async (driverId: number, updates: Partial<Driver>): Promise<Driver> => {
  const { data, error } = await supabase.from("drivers").update(updates).eq("id", driverId).select().single()

  if (error) {
    console.error("Error updating driver:", error)
    throw new Error("Failed to update driver")
  }

  return data
}

// Delete driver
export const deleteDriver = async (driverId: number): Promise<void> => {
  const { error } = await supabase.from("drivers").delete().eq("id", driverId)

  if (error) {
    console.error("Error deleting driver:", error)
    throw new Error("Failed to delete driver")
  }
}

// Save notification
export const saveNotification = async (notification: Omit<Notification, "created_at">): Promise<void> => {
  try {
    const { error } = await supabase.from("notifications").insert({
      ...notification,
      tempo: new Date(notification.tempo).toISOString(),
      // Use the correct column name
      driver_code: notification.driver_code,
    })

    if (error) {
      console.error("Error saving notification:", error)
    }
  } catch (error) {
    console.error("Error in saveNotification:", error)
  }
}

// Get notifications for a driver
export const getDriverNotifications = async (driverCode: string): Promise<Notification[]> => {
  try {
    // Instead of using a filter on a column that might not exist,
    // we'll fetch all notifications and filter them in the code
    const { data, error } = await supabase.from("notifications").select("*").order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching notifications:", error)
      return []
    }

    // Filter notifications for this driver or global notifications (null driver_code)
    return (data || []).filter(
      (notification) => notification.driver_code === driverCode || notification.driver_code === null,
    )
  } catch (error) {
    console.error("Error in getDriverNotifications:", error)
    return []
  }
}

// Mark notification as read
export const markNotificationAsRead = async (notificationId: string): Promise<void> => {
  try {
    const { error } = await supabase.from("notifications").update({ lida: true }).eq("id", notificationId)

    if (error) {
      console.error("Error marking notification as read:", error)
    }
  } catch (error) {
    console.error("Error in markNotificationAsRead:", error)
  }
}
