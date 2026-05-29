"use client";

import {
  useNotifications,
  useMarkAsRead,
  useMarkAllAsRead,
} from "@/hooks/useNotifications";
import { Button } from "@/components/ui/button";
import { formatDateTime, timeAgo } from "@/lib/utils";
import Link from "next/link";
import {
  NotificationListSkeleton,
  PageHeadingSkeleton,
} from "@/components/skeletons/page-skeletons";

export default function NotificationsPage() {
  const { data, isLoading } = useNotifications();
  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();

  const notifications = data?.data || [];
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeadingSkeleton />
        <NotificationListSkeleton rows={6} />
      </div>
    );
  }

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
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gray-100">
              <svg
                className="h-10 w-10 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                />
              </svg>
              <span className="absolute flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-gray-300 opacity-75" />
                <span className="relative inline-flex h-3 w-3 rounded-full bg-gray-400" />
              </span>
            </div>
            <h3 className="text-lg font-semibold text-gray-600">
              No notifications yet
            </h3>
            <p className="mt-2 max-w-sm text-sm text-gray-400">
              You're all caught up! When new reports are submitted or your waste
              reports get updates, you'll see them here.
            </p>
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
