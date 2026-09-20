import React from "react";
import { Card } from "../components/ui/Card.js";
import { Button } from "../components/ui/Button.js";
import { Input } from "../components/ui/Input.js";
import { useAuth } from "../context/AuthContext.js";

export default function ProfilePage() {
  const { user } = useAuth();

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
        User Profile
      </h1>

      <Card>
        <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
          <Input label="Name" defaultValue={user?.name || "Administrator"} />
          <Input
            label="Email Address"
            type="email"
            defaultValue={user?.email || "admin@smartcrm.com"}
            disabled
          />
          <Input
            label="Role"
            defaultValue={user?.role || "SYSTEM_ADMIN"}
            disabled
          />
          <div className="pt-2">
            <Button type="submit">Update Profile</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
