import { Bell, Check, Trash2, ShieldAlert } from "lucide-react";
import {
  useReceptionNotifications,
  useMarkNotificationRead
} from "../../features/receptionist";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";

export function NotificationsPage() {
  const { data: notifications, isLoading, refetch } = useReceptionNotifications();
  const markReadMutation = useMarkNotificationRead();

  const handleMarkRead = async (id: string) => {
    try {
      await markReadMutation.mutateAsync(id);
      refetch();
    } catch {
      alert("Failed to mark notification read.");
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Notifications Inbox</h1>
        <p className="text-sm text-slate-500">Review system warnings, doctor IP admission requests, and billing alerts.</p>
      </div>

      <Card className="divide-y divide-slate-100">
        {isLoading ? (
          <div className="py-8 text-center text-slate-400">Loading notifications...</div>
        ) : notifications && notifications.length > 0 ? (
          notifications.map((item) => (
            <div
              key={item._id}
              className={`flex justify-between items-start p-4 transition-colors ${
                item.isRead ? "bg-white" : "bg-navy-50/15"
              }`}
            >
              <div className="flex gap-3">
                <div className={`mt-0.5 rounded-lg p-2 ${
                  item.type === "admission_request"
                    ? "bg-red-50 text-red-600"
                    : "bg-blue-50 text-blue-600"
                }`}>
                  {item.type === "admission_request" ? (
                    <ShieldAlert className="h-4.5 w-4.5" />
                  ) : (
                    <Bell className="h-4.5 w-4.5" />
                  )}
                </div>
                <div>
                  <h3 className={`text-xs font-semibold ${item.isRead ? "text-slate-700" : "text-slate-900 font-bold"}`}>
                    {item.title}
                  </h3>
                  <p className="text-xs text-slate-600 mt-0.5">{item.message}</p>
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    {new Date(item.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>

              {!item.isRead && (
                <Button
                  onClick={() => handleMarkRead(item._id)}
                  variant="ghost"
                  className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-700 text-xs flex items-center gap-1.5"
                >
                  <Check className="h-4 w-4" /> Mark Read
                </Button>
              )}
            </div>
          ))
        ) : (
          <div className="py-12 text-center text-slate-400 space-y-2">
            <Bell className="mx-auto h-12 w-12 text-slate-200" />
            <p>Your notifications inbox is clean.</p>
          </div>
        )}
      </Card>
    </div>
  );
}
