export function Footer() {
  return (
    <footer className="bg-surface-container-lowest w-full py-xl border-t border-outline-variant mt-2xl">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-lg px-gutter max-w-[1440px] mx-auto">
        <div className="col-span-1 md:col-span-4 flex justify-between items-center mb-md border-b border-outline-variant/30 pb-md">
          <div className="font-headline-sm text-headline-sm text-on-surface font-bold">LearnLoom</div>
          <div className="flex space-x-md text-on-surface-variant">
            <span className="material-symbols-outlined text-[20px] hover:text-primary transition-colors cursor-pointer">public</span>
            <span className="material-symbols-outlined text-[20px] hover:text-primary transition-colors cursor-pointer">mail</span>
          </div>
        </div>
        <div className="col-span-1 md:col-span-3 flex flex-wrap gap-x-lg gap-y-sm font-label-sm text-label-sm">
          <a className="text-on-surface-variant hover:text-on-surface hover:text-primary transition-colors" href="#">Privacy Policy</a>
          <a className="text-on-surface-variant hover:text-on-surface hover:text-primary transition-colors" href="#">Terms of Service</a>
          <a className="text-on-surface-variant hover:text-on-surface hover:text-primary transition-colors" href="#">Security</a>
          <a className="text-on-surface-variant hover:text-on-surface hover:text-primary transition-colors" href="#">Status</a>
          <a className="text-on-surface-variant hover:text-on-surface hover:text-primary transition-colors" href="#">Github</a>
        </div>
        <div className="col-span-1 md:col-span-1 text-right font-label-sm text-label-sm text-on-surface-variant">
          © {new Date().getFullYear()} LearnLoom. Engineered for high-performance learners.
        </div>
      </div>
    </footer>
  );
}
