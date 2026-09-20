import React from "react";
import { Card } from "../components/ui/Card.js";
import { Badge } from "../components/ui/Badge.js";

export default function NotificationsPage() {
  const notifications = [
    {
      id: "1",
      title: "New Lead Assigned",
      detail: "Sarah Jenkins was assigned to your pipeline.",
      time: "10 mins ago",
      type: "info",
    },
    {
      id: "2",
      title: "Deal Closed",
      detail: "Apex Systems license renewal marked as Won.",
      time: "1 hour ago",
      type: "success",
    },
    {
      id: "3",
      title: "Task Reminder",
      detail: "Contract review due today at 5 PM.",
      time: "3 hours ago",
      type: "warning",
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
        Notifications Center
      </h1>

      <Card>
        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {notifications.map((n) => (
            <div key={n.id} className="py-4 first:pt-0 last:pb-0">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-gray-900 dark:text-white">
                  {n.title}
                </h4>
                <span className="text-xs text-gray-400">{n.time}</span>
              </div>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                {n.detail}
              </p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
