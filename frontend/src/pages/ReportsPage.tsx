import React from "react";
import { Card } from "../components/ui/Card.js";

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
        Analytics & Performance Reports
      </h1>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card>
          <h3 className="mb-2 text-lg font-bold text-gray-800 dark:text-gray-200">
            Revenue Generation
          </h3>
          <p className="text-sm text-gray-500">
            Monthly revenue targets vs actual deal closures.
          </p>
          <div className="mt-6 flex h-40 items-center justify-center rounded border border-dashed border-gray-300 text-gray-400 dark:border-gray-700">
            [ Monthly Chart Visualization ]
          </div>
        </Card>

        <Card>
          <h3 className="mb-2 text-lg font-bold text-gray-800 dark:text-gray-200">
            Conversion Funnel
          </h3>
          <p className="text-sm text-gray-500">
            Lead to Qualified Deal ratio across team members.
          </p>
          <div className="mt-6 flex h-40 items-center justify-center rounded border border-dashed border-gray-300 text-gray-400 dark:border-gray-700">
            [ Funnel Chart Metrics ]
          </div>
        </Card>
      </div>
    </div>
  );
}
