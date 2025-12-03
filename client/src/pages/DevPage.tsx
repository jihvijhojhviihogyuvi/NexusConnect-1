import React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

async function fetchJson(url: string, opts: RequestInit = {}) {
  const res = await fetch(url, { credentials: "include", ...opts });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export default function DevPage() {
  const qc = useQueryClient();

  const { data: users, isLoading: usersLoading } = useQuery(["admin-users"], () => fetchJson("/api/admin/users"), { retry: false });
  const { data: convs, isLoading: convsLoading } = useQuery(["admin-convs"], () => fetchJson("/api/admin/conversations"), { retry: false });

  const deleteUser = async (id: string) => {
    if (!confirm("Delete user and anonymize their account? This cannot be undone via the UI.")) return;
    await fetch(`/api/admin/users/${id}`, { method: "DELETE", credentials: "include" });
    qc.invalidateQueries(["admin-users"]);
    qc.invalidateQueries(["admin-convs"]);
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Dev Console</h1>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-2">Users</h2>
        {usersLoading ? (
          <p>Loading users...</p>
        ) : (
          <div className="space-y-2">
            {users?.length ? (
              users.map((u: any) => (
                <div key={u.id} className="flex items-center justify-between p-2 border rounded">
                  <div>
                    <div className="font-medium">{u.username}</div>
                    <div className="text-sm text-muted-foreground">{u.email || "—"}</div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      className="px-2 py-1 bg-red-600 text-white rounded"
                      onClick={() => deleteUser(u.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <p>No users found</p>
            )}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-2">Conversations</h2>
        {convsLoading ? (
          <p>Loading conversations...</p>
        ) : (
          <div className="space-y-2">
            {convs?.length ? (
              convs.map((c: any) => (
                <div key={c.id} className="p-2 border rounded">
                  <div className="flex justify-between">
                    <div>
                      <div className="font-medium">{c.name || (c.type === "direct" ? "Direct" : "Group")}</div>
                      <div className="text-sm text-muted-foreground">{c.id}</div>
                      <div className="text-sm mt-1">Participants: {c.participants?.map((p: any) => p.user?.username).join(", ")}</div>
                    </div>
                    <div className="text-sm text-muted-foreground">Last activity: {new Date(c.lastActivityAt).toLocaleString()}</div>
                  </div>
                </div>
              ))
            ) : (
              <p>No conversations found</p>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
