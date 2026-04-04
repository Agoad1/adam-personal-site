import { createServiceClient } from '@/lib/supabase/server'
import DoordashManager from './components/DoordashManager'

export const dynamic = 'force-dynamic'

export default async function AdminDashboard() {
  const supabase = await createServiceClient()
  
  // Fetch latest Doordash logs
  const { data: logs, error } = await supabase
    .from('doordash_logs')
    .select('*')
    .order('date', { ascending: false })
    .limit(10)

  return (
    <div className="space-y-8 pb-12">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Command Center Dashboard</h1>
        <p className="text-zinc-400">Manage your daily progress metrics and site overviews from this panel.</p>
      </div>

      {error ? (
        <div className="p-4 bg-red-900/20 border border-red-900/50 rounded-xl text-red-400">
          Failed to load Doordash data. Ensure the database connection is working.
        </div>
      ) : (
        <DoordashManager initialLogs={logs || []} />
      )}
    </div>
  )
}
