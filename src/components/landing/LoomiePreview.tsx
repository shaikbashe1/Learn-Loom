export function LoomiePreview() {
  return (
    <section className="border-y border-outline-variant/30 bg-surface-container-lowest py-2xl overflow-hidden relative">
      <div className="absolute right-0 top-0 w-1/2 h-full bg-secondary/5 blur-[150px] -z-10 pointer-events-none"></div>
      <div className="max-w-[1440px] mx-auto px-gutter grid grid-cols-1 lg:grid-cols-2 gap-xl items-center">
        
        <div className="order-2 lg:order-1 relative h-[400px] bg-surface-container border border-outline-variant/60 rounded-xl p-md flex flex-col shadow-lg">
          {/* AI Chat interface mockup */}
          <div className="flex-grow overflow-y-auto space-y-md pr-sm scrollbar-hide">
            <div className="flex gap-sm">
              <div className="w-8 h-8 rounded bg-surface-container-highest flex-shrink-0 flex items-center justify-center text-on-surface font-label-sm">U</div>
              <div className="bg-surface-container-high rounded-lg p-sm border border-outline-variant/30 font-body-md text-body-md text-on-surface">
                Can you explain why this Rust borrow checker error is occurring in my graph implementation?
              </div>
            </div>
            <div className="flex gap-sm">
              <div className="w-8 h-8 rounded bg-secondary/20 flex-shrink-0 flex items-center justify-center text-secondary font-label-sm">
                <span className="material-symbols-outlined text-[16px]">smart_toy</span>
              </div>
              <div className="bg-surface-container-low rounded-lg p-sm border border-secondary/30 font-body-md text-body-md text-on-surface">
                <p className="mb-sm">The issue is that you're trying to maintain multiple mutable references to a node.</p>
                <div className="bg-surface-container-lowest p-sm rounded border border-outline-variant/30 font-mono text-label-sm text-on-surface-variant mt-sm">
                  <span className="text-error">// Error: cannot borrow `*node` as mutable more than once at a time</span><br/>
                  node.neighbors.push(&amp;mut other_node);
                </div>
                <p className="mt-sm">Consider using <code className="text-primary bg-primary/10 px-xs rounded">Rc&lt;RefCell&lt;Node&gt;&gt;</code> or an arena allocator like <code className="text-primary bg-primary/10 px-xs rounded">petgraph</code>.</p>
              </div>
            </div>
          </div>
          
          <div className="mt-md relative">
            <input className="w-full bg-surface-container-lowest border border-outline-variant/60 rounded-full py-sm pl-md pr-xl focus:border-secondary focus:ring-1 focus:ring-secondary text-on-surface placeholder:text-on-surface-variant font-body-md outline-none transition-all" placeholder="Ask Loomie AI..." type="text"/>
            <button className="absolute right-sm top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-secondary bg-secondary/10 rounded-full hover:bg-secondary/20 transition-colors">
              <span className="material-symbols-outlined text-[18px]">send</span>
            </button>
          </div>
        </div>
        
        <div className="order-1 lg:order-2 space-y-md z-10">
          <h2 className="font-headline-lg text-headline-lg text-on-surface">Unblock yourself instantly with <span className="text-secondary drop-shadow-[0_0_10px_rgba(221,183,255,0.3)]">Loomie AI</span>.</h2>
          <p className="font-body-lg text-body-lg text-on-surface-variant">
            Your personalized coding mentor, context-aware of the curriculum and your current project state. It doesn't just give answers; it guides you to understanding.
          </p>
          <ul className="space-y-sm font-body-md text-body-md text-on-surface-variant pt-sm">
            <li className="flex items-start gap-sm"><span className="material-symbols-outlined text-secondary text-[20px] mt-xs">check_circle</span> Contextual code explanations</li>
            <li className="flex items-start gap-sm"><span className="material-symbols-outlined text-secondary text-[20px] mt-xs">check_circle</span> Architecture pattern suggestions</li>
            <li className="flex items-start gap-sm"><span className="material-symbols-outlined text-secondary text-[20px] mt-xs">check_circle</span> Real-time debugging assistance</li>
          </ul>
        </div>
        
      </div>
    </section>
  );
}
