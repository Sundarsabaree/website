import React, { useState } from "react";
import { Card } from "../components/ui/Card.js";
import { Button } from "../components/ui/Button.js";
import { Badge } from "../components/ui/Badge.js";

interface Task {
  id: string;
  title: string;
  dueDate: string;
  priority: "LOW" | "MEDIUM" | "HIGH";
  completed: boolean;
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([
    {
      id: "1",
      title: "Send contract to Acme Corp",
      dueDate: "2026-09-18",
      priority: "HIGH",
      completed: false,
    },
    {
      id: "2",
      title: "Schedule product demo with Apex",
      dueDate: "2026-09-20",
      priority: "MEDIUM",
      completed: false,
    },
    {
      id: "3",
      title: "Review Q3 sales objectives",
      dueDate: "2026-09-25",
      priority: "LOW",
      completed: true,
    },
  ]);

  const toggleTask = (id: string) => {
    setTasks(
      tasks.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)),
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Tasks & Activities
        </h1>
        <Button>+ Add Task</Button>
      </div>

      <Card>
        <div className="space-y-3">
          {tasks.map((task) => (
            <div
              key={task.id}
              className="flex items-center justify-between rounded-lg border border-gray-100 p-4 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800/50"
            >
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={task.completed}
                  onChange={() => toggleTask(task.id)}
                  className="h-5 w-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span
                  className={`text-sm font-medium ${task.completed ? "line-through text-gray-400" : "text-gray-900 dark:text-white"}`}
                >
                  {task.title}
                </span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-xs text-gray-500">
                  Due: {task.dueDate}
                </span>
                <Badge
                  variant={
                    task.priority === "HIGH"
                      ? "red"
                      : task.priority === "MEDIUM"
                        ? "amber"
                        : "cyan"
                  }
                >
                  {task.priority}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
