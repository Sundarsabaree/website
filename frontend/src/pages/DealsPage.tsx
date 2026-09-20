import React, { useState } from "react";
import { Card } from "../components/ui/Card.js";
import { Badge } from "../components/ui/Badge.js";
import { Button } from "../components/ui/Button.js";

interface Deal {
  id: string;
  title: string;
  company: string;
  amount: number;
  stage: "PROSPECT" | "PROPOSAL" | "NEGOTIATION" | "CLOSED_WON" | "CLOSED_LOST";
}

export default function DealsPage() {
  const [deals] = useState<Deal[]>([
    {
      id: "1",
      title: "Enterprise CRM Migration",
      company: "Acme Corp",
      amount: 50000,
      stage: "PROPOSAL",
    },
    {
      id: "2",
      title: "Cloud Infrastructure Setup",
      company: "Global Tech",
      amount: 120000,
      stage: "NEGOTIATION",
    },
    {
      id: "3",
      title: "SaaS License Renewal",
      company: "Apex Systems",
      amount: 18000,
      stage: "CLOSED_WON",
    },
    {
      id: "4",
      title: "Security Audit Service",
      company: "Fintech Inc",
      amount: 35000,
      stage: "PROSPECT",
    },
  ]);

  const stages: Deal["stage"][] = [
    "PROSPECT",
    "PROPOSAL",
    "NEGOTIATION",
    "CLOSED_WON",
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Deals Pipeline
        </h1>
        <Button>+ New Deal</Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        {stages.map((stage) => {
          const stageDeals = deals.filter((d) => d.stage === stage);
          const totalStageValue = stageDeals.reduce(
            (acc, d) => acc + d.amount,
            0,
          );

          return (
            <div
              key={stage}
              className="rounded-xl bg-gray-100 p-4 dark:bg-gray-800"
            >
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-bold text-gray-700 dark:text-gray-200">
                  {stage.replace("_", " ")}
                </h3>
                <Badge variant="cyan">{stageDeals.length}</Badge>
              </div>
              <p className="mb-4 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                Total: ${totalStageValue.toLocaleString()}
              </p>

              <div className="space-y-3">
                {stageDeals.map((deal) => (
                  <Card
                    key={deal.id}
                    className="cursor-pointer border border-gray-200 hover:shadow-md dark:border-gray-700"
                  >
                    <h4 className="font-semibold text-gray-900 dark:text-white">
                      {deal.title}
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {deal.company}
                    </p>
                    <p className="mt-2 font-bold text-indigo-600 dark:text-indigo-400">
                      ${deal.amount.toLocaleString()}
                    </p>
                  </Card>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
