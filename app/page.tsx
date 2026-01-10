import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 overflow-hidden relative">
      {/* Background Ambience */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-[100px] animate-float" style={{ animationDuration: '15s' }}></div>
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[120px] animate-float" style={{ animationDelay: '5s', animationDuration: '20s' }}></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center justify-center min-h-screen text-center">

        {/* Hero Section */}
        <div className="mb-12 animate-fade-in">
          <div className="inline-block mb-4 px-4 py-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-400 text-sm font-medium tracking-wide">
            AI-POWERED TABLETOP RPG
          </div>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 bg-gradient-to-r from-amber-200 via-yellow-100 to-amber-200 bg-clip-text text-transparent drop-shadow-sm">
            Forged in Code,<br />Bound by Imagination.
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Experience the next evolution of TTRPGs. An intelligent Game Master, immersive real-time visuals, and a marketplace of endless possibilities.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link href="/marketplace"
              className="px-8 py-4 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold transition-all shadow-[0_0_20px_rgba(245,158,11,0.3)] hover:shadow-[0_0_30px_rgba(245,158,11,0.5)] transform hover:-translate-y-1">
              Explore Marketplace
            </Link>
            <Link href="/play/demo"
              className="px-8 py-4 rounded-lg border border-slate-700 hover:border-slate-500 bg-slate-900/50 hover:bg-slate-800 text-slate-300 font-medium transition-all backdrop-blur-sm">
              Join Demo Session
            </Link>
          </div>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl mt-8 animate-slide-up" style={{ animationDelay: '0.2s' }}>
          {/* Card 1 */}
          <div className="p-6 rounded-xl border border-slate-800 bg-slate-900/40 backdrop-blur-md hover:border-amber-500/50 transition-colors group text-left">
            <div className="w-12 h-12 mb-4 rounded-lg bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30 group-hover:bg-indigo-500/30 transition-colors">
              <span className="text-2xl">🤖</span>
            </div>
            <h3 className="text-xl font-bold text-slate-100 mb-2">AI Game Master</h3>
            <p className="text-slate-400 text-sm">
              An intelligent GM that adapts to your actions, narrates combat, and manages rules in real-time.
            </p>
          </div>

          {/* Card 2 */}
          <div className="p-6 rounded-xl border border-slate-800 bg-slate-900/40 backdrop-blur-md hover:border-amber-500/50 transition-colors group text-left">
            <div className="w-12 h-12 mb-4 rounded-lg bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30 group-hover:bg-emerald-500/30 transition-colors">
              <span className="text-2xl">⚔️</span>
            </div>
            <h3 className="text-xl font-bold text-slate-100 mb-2">Immersive Combat</h3>
            <p className="text-slate-400 text-sm">
              Visual battlemaps, automated turn tracking, and dynamic dice rolls with D&D 5e mechanics.
            </p>
          </div>

          {/* Card 3 */}
          <div className="p-6 rounded-xl border border-slate-800 bg-slate-900/40 backdrop-blur-md hover:border-amber-500/50 transition-colors group text-left">
            <div className="w-12 h-12 mb-4 rounded-lg bg-rose-500/20 flex items-center justify-center border border-rose-500/30 group-hover:bg-rose-500/30 transition-colors">
              <span className="text-2xl">💎</span>
            </div>
            <h3 className="text-xl font-bold text-slate-100 mb-2">Creator Economy</h3>
            <p className="text-slate-400 text-sm">
              Buy and sell unique character portraits, campaign modules, and map assets in the marketplace.
            </p>
          </div>
        </div>

        <footer className="mt-20 text-slate-600 text-sm">
          © 2024 AI-TRPG Platform. Built with Next.js & OpenAI.
        </footer>
      </div>
    </div>
  );
}
