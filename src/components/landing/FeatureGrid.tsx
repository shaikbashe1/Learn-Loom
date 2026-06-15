export function FeatureGrid() {
  return (
    <section id="features" className="px-gutter py-2xl max-w-[1440px] mx-auto">
      <div className="text-center mb-xl">
        <h2 className="font-headline-lg text-headline-lg text-on-surface mb-sm">Curriculum for Senior Engineers</h2>
        <p className="font-body-md text-body-md text-on-surface-variant max-w-[500px] mx-auto">Deep-dive modules that go beyond the basics. Built by industry veterans.</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-md md:grid-rows-2">
        {/* Feature 1: Large Span */}
        <div className="md:col-span-2 bg-surface-container-low border border-outline-variant/60 rounded-xl p-xl flex flex-col justify-between hover:border-outline transition-colors group relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="relative z-10">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center text-primary mb-md group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-[28px]" style={{ fontVariationSettings: "'FILL' 1" }}>architecture</span>
            </div>
            <h3 className="font-headline-md text-headline-md text-on-surface mb-sm">System Design Mastery</h3>
            <p className="font-body-md text-body-md text-on-surface-variant max-w-[400px]">Architect scalable, fault-tolerant systems. Learn trade-offs between microservices, event-driven architectures, and distributed databases.</p>
          </div>
          <div className="mt-lg h-32 bg-surface-lowest rounded-lg border border-outline-variant/30 flex items-center justify-center relative overflow-hidden z-10">
            <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle at 2px 2px, #c0c1ff 1px, transparent 0)", backgroundSize: "16px 16px" }}></div>
            <div className="flex gap-md z-10">
              <div className="w-16 h-16 bg-surface-container rounded border border-primary/50 shadow-[0_0_10px_rgba(192,193,255,0.2)]"></div>
              <div className="w-16 h-16 bg-surface-container rounded border border-primary/50 shadow-[0_0_10px_rgba(192,193,255,0.2)] translate-y-4"></div>
              <div className="w-16 h-16 bg-surface-container rounded border border-primary/50 shadow-[0_0_10px_rgba(192,193,255,0.2)] -translate-y-4"></div>
            </div>
          </div>
        </div>
        
        {/* Feature 2 */}
        <div className="bg-surface-container-low border border-outline-variant/60 rounded-xl p-xl flex flex-col hover:border-outline transition-colors group">
          <div className="w-12 h-12 bg-secondary/10 rounded-lg flex items-center justify-center text-secondary mb-md group-hover:scale-110 transition-transform">
            <span className="material-symbols-outlined text-[28px]" style={{ fontVariationSettings: "'FILL' 1" }}>memory</span>
          </div>
          <h3 className="font-headline-md text-headline-md text-on-surface mb-sm text-[20px]">Advanced Concurrency</h3>
          <p className="font-body-md text-body-md text-on-surface-variant flex-grow">Master multithreading, mutexes, and channels in Rust and Go.</p>
          <div className="mt-md">
            <div className="h-2 bg-surface-lowest rounded-full overflow-hidden mb-xs"><div className="h-full bg-secondary w-[80%]"></div></div>
            <div className="text-right font-label-sm text-label-sm text-on-surface-variant">Module 4/5</div>
          </div>
        </div>
        
        {/* Feature 3 */}
        <div className="bg-surface-container-low border border-outline-variant/60 rounded-xl p-xl flex flex-col hover:border-outline transition-colors group">
          <div className="w-12 h-12 bg-tertiary/10 rounded-lg flex items-center justify-center text-tertiary mb-md group-hover:scale-110 transition-transform">
            <span className="material-symbols-outlined text-[28px]" style={{ fontVariationSettings: "'FILL' 1" }}>security</span>
          </div>
          <h3 className="font-headline-md text-headline-md text-on-surface mb-sm text-[20px]">Zero-Trust Security</h3>
          <p className="font-body-md text-body-md text-on-surface-variant">Implement robust authentication, authorization, and secure communication protocols.</p>
        </div>
        
        {/* Feature 4: Medium Span */}
        <div className="md:col-span-2 bg-surface-container-low border border-outline-variant/60 rounded-xl p-xl flex items-center justify-between hover:border-outline transition-colors group">
          <div className="max-w-[300px]">
            <div className="inline-flex items-center px-sm py-xs rounded bg-surface-container-high border border-outline-variant/60 font-label-sm text-label-sm text-primary mb-sm">
              <span className="material-symbols-outlined text-[14px] mr-xs">new_releases</span> New Module
            </div>
            <h3 className="font-headline-md text-headline-md text-on-surface mb-sm text-[20px]">WASM &amp; Edge Computing</h3>
            <p className="font-body-md text-body-md text-on-surface-variant">Deploy high-performance WebAssembly modules to the edge.</p>
          </div>
          <div className="hidden sm:block w-24 h-24 rounded-full border-4 border-surface-container-highest border-t-primary animate-[spin_3s_linear_infinite]"></div>
        </div>
      </div>
    </section>
  );
}
