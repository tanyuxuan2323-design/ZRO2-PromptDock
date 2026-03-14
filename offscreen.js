const AUTO_SAVE_PREFIX = "ZRO2_PromptDock_AutoSave_";
const MAX_AUTO_SAVE_FILES = 10;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type !== "autosave-perform") {
    return false;
  }

  performAutoSave(message.payload)
    .then((result) => sendResponse({ ok: true, ...result }))
    .catch((error) => {
      console.error("Offscreen auto save failed", error);
      sendResponse({ ok: false, error: error?.message || String(error) });
    });

  return true;
});

async function performAutoSave(payload) {
  const directoryHandle = await loadDirectoryHandle();
  if (!directoryHandle) {
    throw new Error("No auto save directory selected");
  }

  const permission = await directoryHandle.queryPermission({ mode: "readwrite" });
  if (permission !== "granted") {
    throw new Error("Directory permission is no longer granted");
  }

  const nextSequence = (Number(payload.sequence) || 0) + 1;
  const fileName = `${AUTO_SAVE_PREFIX}${String(nextSequence).padStart(2, "0")}.json`;
  const fileHandle = await directoryHandle.getFileHandle(fileName, { create: true });
  const writable = await fileHandle.createWritable();

  const items = Array.isArray(payload.items) ? payload.items : [];
  const backupPayload = {
    schema: "gpt-prompt-library-autosave",
    version: payload.version,
    exportedAt: payload.exportedAt,
    itemCount: items.length,
    favoritesCount: items.filter((item) => item?.favorite).length,
    tags: [...new Set(items.flatMap((item) => Array.isArray(item?.tags) ? item.tags : []))]
      .sort((a, b) => String(a).localeCompare(String(b), "zh-CN")),
    items,
  };

  await writable.write(JSON.stringify(backupPayload, null, 2));
  await writable.close();

  await pruneAutoSaveFiles(directoryHandle);

  return { sequence: nextSequence, fileName };
}

async function pruneAutoSaveFiles(directoryHandle) {
  const files = [];

  for await (const entry of directoryHandle.values()) {
    if (entry.kind !== "file" || !entry.name.startsWith(AUTO_SAVE_PREFIX) || !entry.name.endsWith(".json")) {
      continue;
    }

    const match = entry.name.match(/(\d+)\.json$/);
    const sequence = match ? Number(match[1]) : Number.MAX_SAFE_INTEGER;
    files.push({ name: entry.name, sequence });
  }

  const filesToDelete = files
    .sort((a, b) => a.sequence - b.sequence)
    .slice(0, Math.max(0, files.length - MAX_AUTO_SAVE_FILES));

  for (const file of filesToDelete) {
    await directoryHandle.removeEntry(file.name);
  }
}

function openAutoSaveDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("zro2-promptdock-autosave", 1);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains("handles")) {
        database.createObjectStore("handles");
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function loadDirectoryHandle() {
  const database = await openAutoSaveDb();
  const handle = await new Promise((resolve, reject) => {
    const transaction = database.transaction("handles", "readonly");
    const request = transaction.objectStore("handles").get("autosave-directory");
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
  database.close();
  return handle;
}
