import { prisma } from "@/lib/db";
import { currentUser } from "@clerk/nextjs/server";
import AddRoundForm from '@/components/AddRoundForm';
import AICoachButton from '@/components/AICoachButton';

export default async function Home() {
  // 1. Get the current logged-in user from Clerk
  const user = await currentUser();

  // If not logged in, the Middleware should catch this, but just in case:
  if (!user) return <div>Please Sign In</div>;

  // 2. Fetch ONLY this user's data from our Postgres database
  const dbUser = await prisma.user.findUnique({
    where: { email: user.emailAddresses[0].emailAddress },
    include: {
      rounds: {
        orderBy: { date: 'desc' },
        include: { holes: { orderBy: { holeNumber: 'asc' } } },
      },
    }
  });

  // 3. Handle "First Time User" (User is in Clerk, but not in our DB yet)
  if (!dbUser) {
    return (
      <main className="min-h-screen bg-slate-50 p-8 font-sans text-slate-900">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-extrabold tracking-tight mb-4 text-emerald-800">
            Welcome, {user.firstName}! ⛳️
          </h1>
          <p className="text-slate-600 mb-8 text-lg">
            This is your personal AI Caddie. Log your first round below to initialize your dashboard.
          </p>
          
          {/* This form submission will automatically create the user in the DB */}
          <AddRoundForm />
        </div>
      </main>
    );
  }

  // 4. Main Dashboard View
  return (
    <main className="min-h-screen bg-slate-50 p-8 font-sans text-slate-900">
      <div className="max-w-4xl mx-auto">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight text-emerald-800">
              {dbUser.name}'s Dashboard
            </h1>
            <p className="text-slate-500 mt-2">
              Tracking {dbUser.rounds.length} rounds
            </p>
          </div>
        </div>

        {/* Input Form */}
        <AddRoundForm />

        {/* Rounds Grid */}
        <div className="grid gap-6 mt-8">
          {dbUser.rounds.length === 0 ? (
            <div className="text-center p-12 bg-white rounded-xl border border-dashed border-slate-300">
              <p className="text-slate-500">No rounds logged yet. Go play some golf! 🏌️‍♂️</p>
            </div>
          ) : (
            dbUser.rounds.map((round) => (
              <div key={round.id} className="bg-white rounded-xl shadow-md p-6 border border-slate-200 hover:shadow-lg transition-shadow">
                
                {/* Round Header */}
                <div className="flex justify-between items-start border-b border-slate-100 pb-4 mb-4">
                  <div>
                    <h3 className="font-bold text-xl text-slate-800">{round.courseName}</h3>
                    <p className="text-xs text-slate-400 uppercase tracking-wide font-semibold">
                      {new Date(round.date).toLocaleDateString()}
                      {round.holes.length > 0 && (
                        <span className="ml-2 text-emerald-600">
                          · {round.holes.length} holes logged
                        </span>
                      )}
                      {round.coursePar != null && (
                        <span className="ml-1">· Par {round.coursePar}</span>
                      )}
                    </p>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-3xl font-black text-emerald-700">{round.totalScore}</span>
                    <span className="text-xs text-slate-400 font-medium">TOTAL</span>
                  </div>
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-4 gap-4 text-sm mb-6">
                  <div className="text-center p-2 bg-slate-50 rounded-lg">
                    <div className="text-slate-400 text-xs font-bold uppercase mb-1">Fairways</div>
                    <div className="font-bold text-slate-700">{round.fairwaysHit}</div>
                  </div>
                  <div className="text-center p-2 bg-slate-50 rounded-lg">
                    <div className="text-slate-400 text-xs font-bold uppercase mb-1">GIR</div>
                    <div className="font-bold text-slate-700">{round.greensInReg}</div>
                  </div>
                  <div className="text-center p-2 bg-slate-50 rounded-lg">
                    <div className="text-slate-400 text-xs font-bold uppercase mb-1">Putts</div>
                    <div className="font-bold text-slate-700">{round.totalPutts}</div>
                  </div>
                  <div className="text-center p-2 bg-slate-50 rounded-lg">
                    <div className="text-slate-400 text-xs font-bold uppercase mb-1">Penalties</div>
                    <div className="font-bold text-slate-700">{round.penaltyStrokes}</div>
                  </div>
                </div>

                {/* AI Section */}
                <div className="pt-4 border-t border-slate-100">
                  {round.aiFeedback ? (
                    <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-lg">
                      <h4 className="font-bold text-indigo-900 text-sm mb-2 flex items-center gap-2">
                        <span>🤖</span> AI Coach Analysis
                      </h4>
                      <p className="text-indigo-800 text-sm leading-relaxed">
                        {round.aiFeedback}
                      </p>
                    </div>
                  ) : (
                    <AICoachButton roundId={round.id} />
                  )}
                </div>

              </div>
            ))
          )}
        </div>

      </div>
    </main>
  );
}