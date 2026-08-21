// Every visitor needs a stable id so a view only counts once per person,
// even if they're not logged in. Logged-in users use their real auth id;
// everyone else gets a random id stashed in localStorage.

function uuid() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function getAnonViewerId(): string {
  if (typeof window === "undefined") return "server";
  const key = "spooktube_anon_id";
  let id = localStorage.getItem(key);
  if (!id) {
    id = uuid();
    localStorage.setItem(key, id);
  }
  return id;
}
