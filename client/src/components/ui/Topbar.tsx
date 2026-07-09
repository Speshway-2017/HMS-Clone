import { Bell, Search } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

export function Topbar() {
  const { user } = useAuth();

  return (
    <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6">
      <div className="flex w-full max-w-md items-center gap-2 rounded-lg bg-slate-100 px-3 py-2">
        <Search className="h-4 w-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search..."
          className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
        />
      </div>

      <div className="flex items-center gap-4">
        <button aria-label="Notifications" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100">
          <Bell className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          {user?.avatarUrl ? (
            <img src={user.avatarUrl} alt={user.name} className="h-9 w-9 rounded-full object-cover" />
          ) : (
            <div className="h-9 w-9 rounded-full bg-navy-100" />
          )}
          <span className="text-sm font-medium text-slate-700">{user?.name}</span>
        </div>
      </div>
    </header>
  );
}
