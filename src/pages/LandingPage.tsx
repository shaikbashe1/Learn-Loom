import { Link } from 'react-router-dom';

export default function LandingPage() {
  return (
    <div className="bg-background text-on-surface font-body-md antialiased overflow-x-hidden selection:bg-primary/30 selection:text-primary min-h-screen">
      {/* TopAppBar */}
      <header className="bg-background/80 backdrop-blur-md fixed top-0 w-full z-50 border-b border-outline-variant/30 shadow-[0_0_20px_rgba(128,131,255,0.1)]">
        <div className="flex justify-between items-center px-gutter py-md max-w-[1440px] mx-auto">
          <div className="font-headline-md text-headline-md font-bold text-primary tracking-tight">LearnLoom</div>
          
          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center space-x-lg font-label-md text-label-md">
            <Link className="text-primary border-b-2 border-primary pb-1" to="/courses">Curriculum</Link>
            <a className="text-on-surface-variant hover:text-primary hover:bg-primary/10 transition-all duration-200 px-sm py-xs rounded" href="#features">Features</a>
            <a className="text-on-surface-variant hover:text-primary hover:bg-primary/10 transition-all duration-200 px-sm py-xs rounded" href="#enterprise">Enterprise</a>
            <Link className="text-on-surface-variant hover:text-primary hover:bg-primary/10 transition-all duration-200 px-sm py-xs rounded" to="/pricing">Pricing</Link>
          </nav>
          
          <div className="hidden md:flex items-center space-x-md font-label-md text-label-md">
            <Link className="text-on-surface-variant hover:text-primary transition-colors" to="/login">Sign In</Link>
            <Link className="bg-primary text-on-primary px-lg py-sm rounded hover:scale-95 duration-100 font-bold shadow-[0_0_8px_rgba(192,193,255,0.5)]" to="/signup">
              Get Started
            </Link>
          </div>
          
          {/* Mobile Menu Toggle */}
          <button className="md:hidden text-primary">
            <span className="material-symbols-outlined text-[24px]">menu</span>
          </button>
        </div>
      </header>

      {/* Main Canvas */}
      <main className="pt-[80px] min-h-screen">
        
        {/* Hero Section */}
        <section className="relative px-gutter py-2xl lg:py-[120px] max-w-[1440px] mx-auto overflow-hidden">
          {/* Decorative Background Elements */}
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-primary/10 rounded-full blur-[120px] -z-10 pointer-events-none"></div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-xl items-center">
            {/* Hero Content */}
            <div className="space-y-lg z-10">
              <div className="inline-flex items-center px-sm py-xs rounded-full bg-surface-container-high border border-outline-variant/60 font-label-sm text-label-sm text-primary mb-sm">
                <span className="material-symbols-outlined text-[16px] mr-xs" style={{ fontVariationSettings: "'FILL' 1" }}>rocket_launch</span>
                LearnLoom v2.0 is Live
              </div>
              <h1 className="font-display text-display text-on-surface">Master the <span className="text-primary">Deep End</span> of Tech.</h1>
              <p className="font-body-lg text-body-lg text-on-surface-variant max-w-[600px]">
                Engineered for high-performance learners. Elevate your engineering skills with interactive environments, expert-led curriculum, and AI-driven insights. Stop tutorial hunting. Start building.
              </p>
              <div className="flex flex-col sm:flex-row gap-md pt-md">
                <Link to="/signup" className="bg-primary text-on-primary font-label-md text-label-md font-bold px-xl py-md rounded-lg shadow-[0_0_16px_rgba(192,193,255,0.4)] hover:shadow-[0_0_24px_rgba(192,193,255,0.6)] transition-all flex items-center justify-center">
                  Get Started
                  <span className="material-symbols-outlined ml-sm text-[20px]">arrow_forward</span>
                </Link>
                <button className="bg-surface-container-high text-on-surface border border-outline-variant/60 font-label-md text-label-md px-xl py-md rounded-lg hover:bg-surface-container-highest transition-all flex items-center justify-center">
                  <span className="material-symbols-outlined mr-sm text-[20px]">play_circle</span>
                  Watch Demo
                </button>
              </div>
            </div>
            
            {/* Hero Interactive Preview */}
            <div className="relative w-full aspect-[4/3] lg:aspect-square max-h-[500px] rounded-xl border border-outline-variant/60 bg-surface-container-lowest overflow-hidden shadow-2xl z-10 group cursor-default">
              <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
              {/* Faux Mac Header */}
              <div className="h-8 bg-surface-container flex items-center px-md border-b border-outline-variant/30 gap-xs">
                <div className="w-3 h-3 rounded-full bg-error"></div>
                <div className="w-3 h-3 rounded-full bg-tertiary-container"></div>
                <div className="w-3 h-3 rounded-full bg-primary"></div>
                <div className="ml-auto font-label-sm text-label-sm text-on-surface-variant flex items-center gap-xs">
                  <span className="material-symbols-outlined text-[14px]">terminal</span> bash
                </div>
              </div>
              <div className="p-md font-label-md text-label-md font-mono text-on-surface-variant overflow-hidden h-[calc(100%-2rem)] flex flex-col relative">
                <div className="mb-sm"><span className="text-primary">user@learnloom</span>:~$ npm run dev</div>
                <div className="mb-sm text-secondary">&gt; learnloom-kernel@2.0.4 dev</div>
                <div className="mb-sm text-secondary">&gt; starting local environment...</div>
                <div className="mt-md text-tertiary">Compiling advanced_concurrency.rs [===================&gt;] 100%</div>
                <div className="mt-sm text-on-surface">Successfully compiled in 0.42s</div>
                
                {/* Floating snippet */}
                <div className="absolute bottom-md right-md bg-surface-container-high border border-outline-variant/60 rounded-lg p-sm shadow-lg max-w-[200px]">
                  <div className="text-label-sm font-label-sm text-primary mb-xs flex justify-between"><span>Status</span> <span>Active</span></div>
                  <div className="h-1 bg-surface-lowest rounded-full overflow-hidden">
                    <div className="h-full bg-primary w-3/4 shadow-[0_0_8px_rgba(192,193,255,0.8)]"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Social Proof */}
        <section className="border-y border-outline-variant/30 bg-surface-container-lowest/50 py-lg">
          <div className="max-w-[1440px] mx-auto px-gutter flex flex-col items-center">
            <p className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest mb-md">Trusted by engineers at</p>
            <div className="flex flex-wrap justify-center gap-xl md:gap-2xl opacity-60 grayscale hover:grayscale-0 transition-all duration-500">
              <div className="flex items-center gap-sm text-on-surface font-headline-md text-headline-md"><span className="material-symbols-outlined text-[32px]">code</span> Google</div>
              <div className="flex items-center gap-sm text-on-surface font-headline-md text-headline-md"><span className="material-symbols-outlined text-[32px]">hub</span> Meta</div>
              <div className="flex items-center gap-sm text-on-surface font-headline-md text-headline-md"><span className="material-symbols-outlined text-[32px]">change_history</span> Vercel</div>
              <div className="flex items-center gap-sm text-on-surface font-headline-md text-headline-md"><span className="material-symbols-outlined text-[32px]">widgets</span> Stripe</div>
            </div>
          </div>
        </section>

        {/* Feature Grid (Bento) */}
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

        {/* Loomie AI Preview */}
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
                  <div className="bg-surface-low rounded-lg p-sm border border-secondary/30 font-body-md text-body-md text-on-surface">
                    <p className="mb-sm">The issue is that you're trying to maintain multiple mutable references to a node.</p>
                    <div className="bg-surface-lowest p-sm rounded border border-outline-variant/30 font-mono text-label-sm text-on-surface-variant mt-sm">
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

        {/* Pricing */}
        <section id="enterprise" className="px-gutter py-2xl max-w-[1440px] mx-auto">
          <div className="text-center mb-xl">
            <h2 className="font-headline-lg text-headline-lg text-on-surface mb-sm">Invest in your trajectory</h2>
            <p className="font-body-md text-body-md text-on-surface-variant">Simple, transparent pricing for individuals and teams.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-lg max-w-[1000px] mx-auto">
            {/* Pro Plan */}
            <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-xl p-lg flex flex-col hover:border-outline transition-colors">
              <h3 className="font-headline-md text-headline-md text-on-surface mb-xs">Pro</h3>
              <p className="font-body-md text-body-md text-on-surface-variant mb-md h-12">For individual developers upgrading their skills.</p>
              <div className="mb-lg">
                <span className="font-display text-[40px] text-on-surface font-bold">$29</span>
                <span className="font-body-md text-on-surface-variant">/mo</span>
              </div>
              <ul className="space-y-sm font-body-md text-body-md text-on-surface-variant flex-grow mb-lg">
                <li className="flex items-center gap-sm"><span className="material-symbols-outlined text-primary text-[18px]">done</span> Full Curriculum Access</li>
                <li className="flex items-center gap-sm"><span className="material-symbols-outlined text-primary text-[18px]">done</span> Interactive Environments</li>
                <li className="flex items-center gap-sm"><span className="material-symbols-outlined text-primary text-[18px]">done</span> Community Discord</li>
              </ul>
              <button className="w-full bg-surface-container-high text-on-surface border border-outline-variant/60 font-label-md text-label-md py-sm rounded hover:bg-surface-container-highest transition-all">Start Free Trial</button>
            </div>
            
            {/* Premium Plan (Highlighted) */}
            <div className="bg-surface-container border-2 border-primary rounded-xl p-lg flex flex-col relative transform lg:-translate-y-4 shadow-[0_10px_30px_rgba(192,193,255,0.1)]">
              <div className="absolute inset-0 bg-gradient-to-t from-primary/5 to-transparent pointer-events-none rounded-xl"></div>
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-on-primary font-label-sm text-label-sm px-md py-xs rounded-full font-bold">Most Popular</div>
              <h3 className="font-headline-md text-headline-md text-primary mb-xs mt-sm relative z-10">Elite</h3>
              <p className="font-body-md text-body-md text-on-surface-variant mb-md h-12 relative z-10">For senior engineers seeking mastery with AI support.</p>
              <div className="mb-lg relative z-10">
                <span className="font-display text-[40px] text-on-surface font-bold">$49</span>
                <span className="font-body-md text-on-surface-variant">/mo</span>
              </div>
              <ul className="space-y-sm font-body-md text-body-md text-on-surface-variant flex-grow mb-lg relative z-10">
                <li className="flex items-center gap-sm"><span className="material-symbols-outlined text-primary text-[18px]">done</span> Everything in Pro</li>
                <li className="flex items-center gap-sm"><span className="material-symbols-outlined text-secondary text-[18px]">done</span> Unlimited Loomie AI Access</li>
                <li className="flex items-center gap-sm"><span className="material-symbols-outlined text-primary text-[18px]">done</span> Project Code Reviews</li>
                <li className="flex items-center gap-sm"><span className="material-symbols-outlined text-primary text-[18px]">done</span> Early Access to Modules</li>
              </ul>
              <button className="w-full bg-primary text-on-primary font-label-md text-label-md font-bold py-sm rounded hover:shadow-[0_0_12px_rgba(192,193,255,0.6)] transition-all relative z-10">Go Elite</button>
            </div>
            
            {/* Team Plan */}
            <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-xl p-lg flex flex-col hover:border-outline transition-colors lg:col-span-1 md:col-span-2 md:w-1/2 lg:w-full md:mx-auto">
              <h3 className="font-headline-md text-headline-md text-on-surface mb-xs">Enterprise</h3>
              <p className="font-body-md text-body-md text-on-surface-variant mb-md h-12">Scale engineering excellence across your team.</p>
              <div className="mb-lg">
                <span className="font-headline-lg text-[32px] text-on-surface font-bold">Custom</span>
              </div>
              <ul className="space-y-sm font-body-md text-body-md text-on-surface-variant flex-grow mb-lg">
                <li className="flex items-center gap-sm"><span className="material-symbols-outlined text-primary text-[18px]">done</span> Team Analytics Dashboard</li>
                <li className="flex items-center gap-sm"><span className="material-symbols-outlined text-primary text-[18px]">done</span> SSO &amp; SAML</li>
                <li className="flex items-center gap-sm"><span className="material-symbols-outlined text-primary text-[18px]">done</span> Custom Learning Paths</li>
              </ul>
              <button className="w-full bg-surface-container-high text-on-surface border border-outline-variant/60 font-label-md text-label-md py-sm rounded hover:bg-surface-container-highest transition-all">Contact Sales</button>
            </div>
          </div>
        </section>

      </main>

      {/* Footer */}
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
    </div>
  );
}
