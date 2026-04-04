import BlogEditor from '@/app/admin/components/BlogEditor'

export default function NewBlogPostPage() {
  return (
    <div className="space-y-8 pb-12">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Write New Post</h1>
        <p className="text-zinc-400">Craft a new article or how-to guide.</p>
      </div>

      <BlogEditor />
    </div>
  )
}
