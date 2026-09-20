import React from "react";
import { Card } from "../components/ui/Card.js";
import { Button } from "../components/ui/Button.js";

export default function CalendarPage() {
  const events = [
    { time: "09:00 AM", title: "Team Sync & Daily Standup", type: "Internal" },
    { time: "11:30 AM", title: "Client Demo: Global Tech", type: "Meeting" },
    {
      time: "02:00 PM",
      title: "Quarterly Sales Pipeline Review",
      type: "Review",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Schedule Calendar
        </h1>
        <Button>+ Schedule Event</Button>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <Card className="md:col-span-2">
          <h2 className="mb-4 text-lg font-semibold text-gray-800 dark:text-gray-200">
            Today's Agenda
          </h2>
          <div className="space-y-4">
            {events.map((ev, idx) => (
              <div
                key={idx}
                className="flex items-start gap-4 border-l-4 border-indigo-500 bg-gray-50 p-4 dark:bg-gray-800"
              >
                <div className="font-semibold text-indigo-600 dark:text-indigo-400">
                  {ev.time}
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 dark:text-white">
                    {ev.title}
                  </h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {ev.type}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h2 className="mb-4 text-lg font-semibold text-gray-800 dark:text-gray-200">
            Upcoming Reminders
          </h2>
          <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
            <li className="rounded bg-indigo-50 p-2 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300">
              📌 Call with Acme procurement at 4:00 PM tomorrow.
            </li>
            <li className="rounded bg-indigo-50 p-2 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300">
              📌 Renewal follow-up with Apex on Friday.
            </li>
          </ul>
        </Card>
      </div>
    </div>
  );
}
