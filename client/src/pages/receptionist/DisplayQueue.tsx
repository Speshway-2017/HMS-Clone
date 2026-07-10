import { useReceptionQueue } from "../../features/receptionist";
import { Activity, BellRing } from "lucide-react";

export function DisplayQueuePage() {
  const { data: tokens, isLoading } = useReceptionQueue();

  const calledTokens = tokens?.filter((t) => t.status === "called") || [];
  const waitingTokens = tokens?.filter((t) => t.status === "waiting") || [];

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900 text-slate-400">
        <div className="text-center space-y-4">
          <Activity className="mx-auto h-12 w-12 animate-pulse text-indigo-500" />
          <h1 className="text-xl font-semibold">Loading Queue Board...</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans p-8 flex flex-col justify-between">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-slate-800 pb-4">
        <h1 className="text-3xl font-extrabold tracking-wider text-indigo-400 flex items-center gap-2">
          <BellRing className="h-8 w-8 text-indigo-500 animate-bounce" /> SUNRISE CLINIC QUEUE
        </h1>
        <div className="text-slate-400 text-sm font-semibold tracking-wide uppercase">
          {new Date().toLocaleDateString("en-US", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>

      {/* Main Board */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 my-8 flex-1">
        {/* Left 2 Cols: NOW SERVING */}
        <div className="lg:col-span-2 bg-slate-900 rounded-2xl border border-indigo-500/20 p-8 flex flex-col justify-between shadow-lg shadow-indigo-500/5">
          <h2 className="text-indigo-400 font-extrabold text-sm uppercase tracking-widest border-b border-slate-800 pb-3">
            NOW SERVING / CALLING
          </h2>

          {calledTokens.length > 0 ? (
            <div className="divide-y divide-slate-800 flex-1 flex flex-col justify-center">
              {calledTokens.slice(0, 2).map((item) => (
                <div key={item._id} className="py-8 flex justify-between items-center animate-pulse">
                  <div>
                    <div className="text-7xl font-black text-emerald-400 tracking-wider font-mono">
                      {item.tokenNumber}
                    </div>
                    <div className="text-sm text-slate-400 mt-2">
                      Patient: <span className="font-semibold text-white">{item.patient?.name}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-slate-200">
                      {item.doctor?.name}
                    </div>
                    <div className="text-xs text-slate-500 uppercase font-semibold mt-1">
                      {item.department?.name || "Consultant"}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-550 py-16">
              <Activity className="h-16 w-16 text-slate-700 mb-4" />
              <div className="text-2xl font-bold text-slate-600">No tokens active.</div>
              <p className="text-xs text-slate-700 mt-1">Consultants are not calling any patients currently.</p>
            </div>
          )}
        </div>

        {/* Right Col: UP NEXT */}
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-8 flex flex-col justify-between">
          <div>
            <h2 className="text-slate-400 font-extrabold text-xs uppercase tracking-widest border-b border-slate-800 pb-3 mb-4">
              UP NEXT (WAITING LINE)
            </h2>

            {waitingTokens.length > 0 ? (
              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                {waitingTokens.slice(0, 6).map((item) => (
                  <div key={item._id} className="flex justify-between items-center bg-slate-950 border border-slate-800 rounded-xl p-4">
                    <div className="text-2xl font-bold text-amber-400 font-mono">
                      {item.tokenNumber}
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-semibold text-slate-300">{item.doctor?.name}</div>
                      <div className="text-[10px] text-slate-500">{item.department?.name}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-slate-600">
                <p className="text-sm font-semibold">Queue line is empty.</p>
              </div>
            )}
          </div>

          <div className="border-t border-slate-800 pt-4 text-center text-xs text-slate-500">
            Please proceed to your doctor's desk when your token is called.
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-slate-800 pt-4 flex justify-between items-center text-xs text-slate-500">
        <span>Powered by HMS Enterprise</span>
        <span className="flex items-center gap-1.5 font-semibold text-emerald-500 animate-pulse">
          <span className="h-2 w-2 rounded-full bg-emerald-500"></span> Live Queue Syncing
        </span>
      </div>
    </div>
  );
}
