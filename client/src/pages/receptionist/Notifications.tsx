import { useState } from "react";
import { Bell, Check, Trash2, ShieldAlert, AlertTriangle, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import {
  useReceptionNotifications,
  useMarkNotificationRead
} from "../../features/receptionist";
import { useDeleteNotification } from "../../features/notifications";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";

function NotificationRowItem({
  item,
  onMarkRead,
  onDelete
}: {
  item: any;
  onMarkRead: (id: string) => void;
  onDelete: (id: string) => Promise<void>;
}) {
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete(item._id || item.id);
      toast.success("Notification deleted successfully!");
    } catch {
      toast.error("Failed to delete notification.");
    } finally {
      setIsDeleting(false);
      setShowConfirmDelete(false);
    }
  };

  return (
    <div
      className={`p-4 transition-colors border-b border-slate-100 ${
        item.isRead ? "bg-white" : "bg-emerald-50/15"
      }`}
    >
      {showConfirmDelete ? (
        /* On-Screen Inline Confirmation Box */
        <div className="p-3 bg-rose-50 border-l-4 border-rose-600 rounded-lg animate-in fade-in duration-200">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0 animate-pulse" />
              <div>
                <p className="text-xs font-black text-rose-950">Confirm Deletion</p>
                <p className="text-[11px] text-rose-800 font-medium">Are you sure you want to delete this notification?</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-lg shadow-sm flex items-center gap-1 transition-all cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                Confirm
              </button>
              <button
                onClick={() => setShowConfirmDelete(false)}
                className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 font-bold text-xs rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex justify-between items-start">
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

          <div className="flex items-center gap-2 shrink-0">
            {!item.isRead ? (
              <Button
                onClick={() => onMarkRead(item._id)}
                variant="ghost"
                className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-700 text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="h-4 w-4" /> Mark Read
              </Button>
            ) : (
              <button
                onClick={() => setShowConfirmDelete(true)}
                className="px-2.5 py-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                title="Delete Notification"
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function NotificationsPage() {
  const { data: notifications, isLoading, refetch } = useReceptionNotifications();
  const markReadMutation = useMarkNotificationRead();
  const deleteMutation = useDeleteNotification();

  const handleMarkRead = async (id: string) => {
    try {
      await markReadMutation.mutateAsync(id);
      refetch();
    } catch {
      toast.error("Failed to mark notification as read.");
    }
  };

  const handleDelete = async (id: string) => {
    await deleteMutation.mutateAsync(id);
    refetch();
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Notifications Inbox</h1>
        <p className="text-sm text-slate-500">Review system warnings, doctor IP admission requests, and billing alerts.</p>
      </div>

      <Card className="divide-y divide-slate-100 overflow-hidden">
        {isLoading ? (
          <div className="py-8 text-center text-slate-400">Loading notifications...</div>
        ) : notifications && notifications.length > 0 ? (
          notifications.map((item) => (
            <NotificationRowItem
              key={item._id}
              item={item}
              onMarkRead={handleMarkRead}
              onDelete={handleDelete}
            />
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
