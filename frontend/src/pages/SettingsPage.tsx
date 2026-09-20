import React from "react";
import { Card } from "../components/ui/Card.js";
import { Button } from "../components/ui/Button.js";
import { useTheme } from "../context/ThemeContext.js";

export default function SettingsPage() {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
        System Settings
      </h1>

      <Card className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Appearance Settings
          </h3>
          <p className="text-sm text-gray-500">
            Customize visual mode preferences.
          </p>
          <div className="mt-3 flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Dark Mode
            </span>
            <Button variant="secondary" onClick={toggleTheme}>
              Current: {theme.toUpperCase()}
            </Button>
          </div>
        </div>

        <hr className="border-gray-200 dark:border-gray-800" />

        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Email & System Alerts
          </h3>
          <p className="text-sm text-gray-500">
            Configure default notification preferences.
          </p>
          <div className="mt-3 space-y-2">
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                defaultChecked
                className="rounded border-gray-300 text-indigo-600"
              />
              Receive instant updates on deal updates
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                defaultChecked
                className="rounded border-gray-300 text-indigo-600"
              />
              Daily summary report digest
            </label>
          </div>
        </div>
      </Card>
    </div>
  );
}
