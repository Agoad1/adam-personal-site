import { createServiceClient } from '@/lib/supabase/server'
import PortfolioManager from '@/app/admin/components/PortfolioManager'

export const dynamic = 'force-dynamic'

export default async function PortfolioAdminPage() {
  const supabase = await createServiceClient()
  
  const { data: portfolioItems, error } = await supabase
    .from('portfolio')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-8 pb-12">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Portfolio Work</h1>
        <p className="text-zinc-400">Manage your projects, workflows, and resume references here.</p>
      </div>

      {error ? (
        <div className="p-4 bg-red-900/20 border border-red-900/50 rounded-xl text-red-400">
          Failed to load portfolio items.
        </div>
      ) : (
        <PortfolioManager initialItems={portfolioItems || []} />
      )}
    </div>
  )
}
