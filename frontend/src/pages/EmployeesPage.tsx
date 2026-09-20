import React, { useState } from "react";
import { Card } from "../components/ui/Card.js";
import { Badge } from "../components/ui/Badge.js";
import { Button } from "../components/ui/Button.js";

interface Employee {
  id: string;
  name: string;
  role: string;
  email: string;
  department: string;
  status: "ACTIVE" | "ON_LEAVE";
}

export default function EmployeesPage() {
  const [employees] = useState<Employee[]>([
    {
      id: "1",
      name: "Alex Rivera",
      role: "Sales Lead",
      email: "alex@crm.com",
      department: "Sales",
      status: "ACTIVE",
    },
    {
      id: "2",
      name: "Priya Sharma",
      role: "Account Manager",
      email: "priya@crm.com",
      department: "Customer Success",
      status: "ACTIVE",
    },
    {
      id: "3",
      name: "David Miller",
      role: "CRM Admin",
      email: "david@crm.com",
      department: "IT",
      status: "ON_LEAVE",
    },
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Employee Directory
        </h1>
        <Button>+ Add Member</Button>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {employees.map((emp) => (
          <Card key={emp.id} className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-900 dark:text-white">
                {emp.name}
              </h3>
              <Badge variant={emp.status === "ACTIVE" ? "green" : "amber"}>
                {emp.status}
              </Badge>
            </div>
            <p className="text-sm text-indigo-600 dark:text-indigo-400">
              {emp.role}
            </p>
            <p className="text-xs text-gray-500">
              {emp.department} • {emp.email}
            </p>
          </Card>
        ))}
      </div>
    </div>
  );
}
