
import Link from 'next/link';
import { prisma } from '@/lib/prisma';

export default async function DemoDashboard() {
  // Fetch data
  const campaign = await prisma.campaign.findFirst({
    where: { isActive: true },
    include: { gm: true }
  });

  const demoUser = await prisma.user.findUnique({
    where: { email: 'demo@ai-trpg.com' }
  });

  // Handle missing data (e.g., if seed wasn't run)
  if (!campaign || !demoUser) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-200 flex flex-col items-center justify-center p-4">
        <div className="bg-slate-900 border border-red-500/50 rounded-xl p-8 max-w-md text-center">
          <h1 className="text-2xl font-bold text-red-500 mb-4">⚠️ Database Empty</h1>
          <p className="mb-6 text-slate-400">
            Could not find the Demo Campaign or User. Please run the seed script first.
          </p>
          <div className="bg-slate-800 p-4 rounded-lg font-mono text-sm text-left mb-6">
            <p className="text-green-400">$ npx prisma db seed</p>
          </div>
          <button className="px-6 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
            onClick={() => window.location.reload()}>
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 relative overflow-hidden">

      {/* Background Effects */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-indigo-600/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-amber-600/10 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 w-full max-w-4xl text-center">

        {/* Header */}
        <div className="mb-12">
          <span className="inline-block px-4 py-1.5 rounded-full bg-slate-800/50 border border-slate-700 text-slate-400 text-xs font-bold tracking-wider mb-4">
            DEVELOPER PREVIEW
          </span>
          <h1 className="text-5xl md:text-6xl font-black tracking-tight mb-4 text-transparent bg-clip-text bg-gradient-to-br from-white to-slate-500">
            Demo Dashboard
          </h1>
          <p className="text-xl text-slate-400">
            Test the AI-TRPG Platform capabilities
          </p>
        </div>

        {/* Campaign Info */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 mb-12 backdrop-blur-sm max-w-2xl mx-auto">
          <h2 className="text-sm uppercase tracking-widest text-slate-500 mb-2 font-bold">Active Campaign</h2>
          <div className="text-3xl font-bold text-amber-500 mb-2">{campaign.title}</div>
          <div className="flex items-center justify-center gap-4 text-sm text-slate-400">
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"></path></svg>
              Code: <span className="font-mono text-white bg-slate-800 px-2 py-0.5 rounded ml-1">{campaign.inviteCode}</span>
            </span>
            <span className="w-1 h-1 bg-slate-700 rounded-full"></span>
            <span>GM: {campaign.gm.name}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">

          {/* GM View */}
          <Link
            href={`/campaign/${campaign.id}/board`}
            className="group relative flex flex-col items-center justify-center p-8 h-64 bg-gradient-to-br from-slate-900 to-slate-900 hover:from-indigo-900/40 hover:to-slate-900 border border-slate-800 hover:border-indigo-500/50 rounded-2xl transition-all duration-300 shadow-lg hover:shadow-indigo-500/20"
          >
            <div className="w-16 h-16 bg-indigo-500/20 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
              <span className="text-3xl">🖥️</span>
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">Game Master Board</h3>
            <p className="text-slate-400 group-hover:text-indigo-200 transition-colors">
              Manage the game state, visual board, and AI narration.
            </p>
          </Link>

          {/* Player View */}
          <Link
            href={`/play/${campaign.id}`}
            className="group relative flex flex-col items-center justify-center p-8 h-64 bg-gradient-to-br from-slate-900 to-slate-900 hover:from-amber-900/40 hover:to-slate-900 border border-slate-800 hover:border-amber-500/50 rounded-2xl transition-all duration-300 shadow-lg hover:shadow-amber-500/20"
          >
            <div className="w-16 h-16 bg-amber-500/20 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
              <span className="text-3xl">📱</span>
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">Player Controller</h3>
            <p className="text-slate-400 group-hover:text-amber-200 transition-colors">
              Join as <span className="text-amber-400 font-semibold">{demoUser.name}</span> to roll dice and act.
            </p>
          </Link>
        </div>

        {/* Footer / Debug */}
        <div className="mt-12 text-slate-600 text-sm">
          <p>Debug: Logged in as {demoUser.email} (ID: {demoUser.id.substring(0, 8)}...)</p>
          <p className="mt-2 text-xs opacity-50">Local Dev Environment v0.1.0</p>
        </div>

      </div>
    </div>
  );
}
