import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import express from "express";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const app = express();
app.use(express.urlencoded({ extended: true }));

// Import storage after dotenv so DB config is available before DB initializes
const { storage } = await import("./storage");

// Simple dev HTML renderer
function renderPage(users: any[], convs: any[]) {
  return `<!doctype html>
  <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width,initial-scale=1" />
      <title>Dev Console</title>
      <script src="https://cdn.tailwindcss.com"></script>
    </head>
    <body class="bg-slate-50 text-slate-900">
      <div class="max-w-6xl mx-auto p-6">
        <header class="flex items-center justify-between mb-6">
          <div>
            <h1 class="text-2xl font-bold">Dev Console</h1>
            <p class="text-sm text-slate-600">Development tools — port 4000</p>
          </div>
          <div class="flex gap-3">
            <a href="http://localhost:5000/" class="px-3 py-2 bg-white rounded shadow text-sm">Open App</a>
            <a href="http://localhost:5000/viewer" class="px-3 py-2 bg-white rounded shadow text-sm">Open Viewer</a>
            <button onclick="location.reload()" class="px-3 py-2 bg-indigo-600 text-white rounded shadow text-sm">Refresh</button>
          </div>
        </header>

        <main class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section class="bg-white rounded-lg shadow p-4">
            <div class="flex items-center justify-between mb-4">
              <h2 class="text-lg font-semibold">Users</h2>
              <div class="text-sm text-slate-500">${users.length} users</div>
            </div>

            <div class="space-y-3">
              ${users.length ? users.map(u => `
                <div id="user-row-${u.id}" class="flex items-center justify-between p-3 border rounded">
                  <div>
                    <div class="font-medium">${u.username}</div>
                    <div class="text-sm text-slate-500">${u.email || '—'}</div>
                  </div>
                  <div class="flex items-center gap-2">
                    <form method="post" action="/delete-user" onsubmit="return confirm('Delete user ${u.username}?')">
                      <input type="hidden" name="id" value="${u.id}" />
                      <button class="px-3 py-1 bg-rose-600 text-white rounded text-sm">Delete</button>
                    </form>
                    <button class="px-3 py-1 bg-slate-100 rounded text-sm" onclick="copyId('${u.id}')">Copy ID</button>
                  </div>
                </div>
              `).join('') : '<div class="text-sm text-slate-500">No users found</div>'}
            </div>
          </section>

          <section class="bg-white rounded-lg shadow p-4">
            <div class="flex items-center justify-between mb-4">
              <h2 class="text-lg font-semibold">Conversations</h2>
              <div class="text-sm text-slate-500">${convs.length} conversations</div>
            </div>

            <div class="space-y-3">
              ${convs.length ? convs.map(c => `
                <div class="p-3 border rounded">
                  <div class="flex justify-between items-start">
                    <div>
                      <div class="font-medium">${c.name || (c.type === 'direct' ? 'Direct' : 'Group')}</div>
                      <div class="text-sm text-slate-500">${c.id}</div>
                      <div class="text-sm mt-2">Participants: ${(c.participants||[]).map((p:any)=>p.user?.username||p.userId).join(', ')}</div>
                    </div>
                    <div class="text-sm text-slate-500">${c.lastActivityAt ? new Date(c.lastActivityAt).toLocaleString() : ''}</div>
                  </div>
                </div>
              `).join('') : '<div class="text-sm text-slate-500">No conversations found</div>'}
            </div>
          </section>
        </main>

        <footer class="mt-6 text-xs text-slate-500">Tip: This console is for development only. Admin actions are irreversible.</footer>
      </div>

      <script>
        function copyId(id) {
          navigator.clipboard?.writeText(id).then(()=>{
            alert('Copied id '+id);
          }).catch(()=>{ prompt('Copy id', id); });
        }
      </script>
    </body>
  </html>`;
}

// GET / -> show users and conversations
app.get("/", async (req, res) => {
  try {
    const users = await storage.getAllUsersAdmin();
    const convs = await storage.getAllConversations();
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(renderPage(users, convs));
  } catch (err) {
    console.error("Dev server error:", err);
    res.status(500).send(String(err));
  }
});

// POST /delete-user -> delete and redirect
app.post("/delete-user", async (req, res) => {
  try {
    const id = req.body.id;
    if (!id) return res.status(400).send("Missing id");
    await storage.deleteUser(id);
    res.redirect("/");
  } catch (err) {
    console.error("Dev server delete error:", err);
    res.status(500).send(String(err));
  }
});

const port = parseInt(process.env.DEV_CONSOLE_PORT || "4000", 10);
app.listen(port, "0.0.0.0", () => {
  console.log(`Dev console running on port ${port}`);
});

// keep process alive
export {};
