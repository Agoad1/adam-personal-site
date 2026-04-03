export default function Footer() {
  return (
    <footer className="border-t border-border py-6 mt-auto">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between text-sm text-text-secondary">
        <span>&copy; {new Date().getFullYear()} Adam Goad</span>
        <a
          href="https://github.com/Agoad1"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-text-primary transition-colors"
        >
          GitHub
        </a>
      </div>
    </footer>
  );
}
