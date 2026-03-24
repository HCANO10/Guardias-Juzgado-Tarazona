import { SupabaseClient } from '@supabase/supabase-js'

/**
 * Reads a setting from app_settings key/value table.
 * Returns the value as string, or defaultValue if not found.
 */
export async function getSetting(
  supabase: SupabaseClient,
  key: string,
  defaultValue: string
): Promise<string> {
  const { data } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', key)
    .single()

  return data?.value || defaultValue
}

/**
 * Reads all settings as a key-value map.
 */
export async function getAllSettings(
  supabase: SupabaseClient
): Promise<Record<string, string>> {
  const { data } = await supabase
    .from('app_settings')
    .select('key, value')

  const map: Record<string, string> = {}
  if (data) {
    for (const row of data) {
      map[row.key] = row.value
    }
  }
  return map
}

/**
 * Updates a setting value by key. Creates it if it doesn't exist.
 */
export async function setSetting(
  supabase: SupabaseClient,
  key: string,
  value: string,
  description?: string
): Promise<void> {
  const { error } = await supabase
    .from('app_settings')
    .upsert(
      { key, value, description, updated_at: new Date().toISOString() },
      { onConflict: 'key' }
    )

  if (error) throw error
}
