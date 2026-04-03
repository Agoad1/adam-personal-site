import Link from "next/link";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center gap-6 mb-8 border-b border-border pb-4 flex-wrap">
        <Link
          href="/admin/posts"
          className="text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
        >
          Posts
        </Link>
        <Link
          href="/admin/portfolio"
          className="text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
        >
          Portfolio
        </Link>
        <Link
          href="/admin/dashboard"
          className="text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
        >
          Dashboard
        </Link>
      </div>
      {children}
    </div>
  );
}
