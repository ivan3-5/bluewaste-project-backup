"use client";

import { useState } from "react";
import Link from "next/link";
import {
  useNotifications,
  useMarkAsRead,
  useMarkAllAsRead,
} from "@/hooks/useNotifications";
import { Button } from "@/components/ui/button";
import { timeAgo } from "@/lib/utils";
import { Bell, ChevronLeft, ChevronRight } from "lucide-react";
import {
  NotificationListSkeleton,
  PageHeadingSkeleton,
} from "@/components/skeletons/page-skeletons";

const typeIcons: Record<string, string> = {
  NEW_REPORT: "📋",
  STATUS_CHANGE: "🔄",
  ASSIGNMENT: "👷",
  SYSTEM: "⚙️",
};

export default function CitizenNotificationsPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useNotifications(page);
  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();

  const notifications = data?.data || [];
  const pagination = data?.pagination;
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeadingSkeleton />
        <NotificationListSkeleton rows={6} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
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

      {notifications.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border">
          <Bell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm font-medium">
            No notifications yet
          </p>
          <p className="text-gray-400 text-xs mt-1">
            We will alert you when your reports are updated.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border divide-y">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`flex items-start gap-4 px-5 py-4 transition-colors ${
                n.isRead ? "" : "bg-blue-50/50"
              }`}
            >
              <span className="text-lg mt-0.5 flex-shrink-0">
                {typeIcons[n.type] || "🔔"}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <h3
                    className={`text-sm ${
                      n.isRead ? "text-gray-700" : "font-semibold text-gray-900"
                    }`}
                  >
                    {n.title}
                  </h3>
                  <span className="shrink-0 text-xs text-gray-400 whitespace-nowrap">
                    {timeAgo(n.createdAt)}
                  </span>
                </div>
                <p className="mt-0.5 text-sm text-gray-500">{n.message}</p>
                <div className="mt-3 flex items-center gap-2">
                  {n.reportId && (
                    <Link href="/citizen/my-reports">
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
          ))}
        </div>
      )}

      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-500">
            Page {pagination.page} of {pagination.totalPages}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= pagination.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
