import { createClient } from "@/lib/supabase/server"
import StaffPageClient from "./StaffPageClient"

export default async function StaffPage() {
  const supabase = createClient()
  
  // Obtenemos los puestos una sola vez desde el servidor para pasarlos al cliente
  const { data: positions } = await supabase
    .from('positions')
    .select('id, name')
    .order('name')

  return <StaffPageClient positions={positions || []} />
}
