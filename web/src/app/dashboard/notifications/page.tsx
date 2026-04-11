"use client";

import {
  useNotifications,
  useMarkAsRead,
  useMarkAllAsRead,
} from "@/hooks/useNotifications";
import { Button } from "@/components/ui/button";
import { formatDateTime, timeAgo } from "@/lib/utils";
import Link from "next/link";

export default function NotificationsPage() {
  const { data, isLoading } = useNotifications();
  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();

  const notifications = data?.data || [];
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const typeIcons: Record<string, string> = {
    NEW_REPORT: "📋",
    STATUS_CHANGE: "🔄",
    ASSIGNMENT: "👷",
    SYSTEM: "⚙️",
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Notifications</h1>
          <p className="text-sm text-gray-500 mt-1">
            {unreadCount} unread notification{unreadCount !== 1 ? "s" : ""}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => markAllAsRead.mutate()}
            disabled={markAllAsRead.isPending}
          >
            Mark All as Read
          </Button>
        )}
      </div>

      <div className="space-y-2">
        {isLoading ? (
          <div className="py-10 text-center text-gray-400">Loading...</div>
        ) : notifications.length === 0 ? (
          <div className="py-10 text-center text-gray-400">
            No notifications yet
          </div>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              className={`flex items-start gap-4 rounded-lg border p-4 transition-colors ${
                n.isRead ? "bg-white" : "border-blue-200 bg-blue-50"
              }`}
            >
              <span className="text-xl">{typeIcons[n.type] || "🔔"}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <h3
                    className={`text-sm ${n.isRead ? "text-gray-700" : "font-semibold text-gray-800"}`}
                  >
                    {n.title}
                  </h3>
                  <span className="shrink-0 text-xs text-gray-400">
                    {timeAgo(n.createdAt)}
                  </span>
                </div>
                <p className="mt-0.5 text-sm text-gray-500">{n.message}</p>
                <div className="mt-3 flex items-center gap-2">
                  {n.reportId && (
                    <Link href={`/dashboard/report?id=${n.reportId}`}>
                      <Button
                        size="sm"
                        variant="default"
                        className="h-7 text-xs"
                      >
                        View Report
                      </Button>
                    </Link>
                  )}
                  {!n.isRead && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      onClick={() => markAsRead.mutate(n.id)}
                      disabled={markAsRead.isPending}
                    >
                      Mark as Read
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
