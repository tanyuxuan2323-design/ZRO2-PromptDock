const STORAGE_KEY = "gpt_prompt_library_items";
const PREFS_KEY = "gpt_prompt_library_ui_prefs";
const AUTO_SAVE_ALARM = "zro2-promptdock-autosave";
const AUTO_SAVE_INTERVAL_MINUTES = 60;
const OFFSCREEN_URL = "offscreen.html";

chrome.runtime.onInstalled.addListener(() => {
  void reconcileAutoSave();
});

chrome.runtime.onStartup.addListener(() => {
  void reconcileAutoSave();
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type !== "autosave-config-updated") {
    return false;
  }

  reconcileAutoSave()
    .then(() => sendResponse({ ok: true }))
    .catch((error) => {
      console.error("Auto save config sync failed", error);
      sendResponse({ ok: false, error: error?.message || String(error) });
    });

  return true;
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name !== AUTO_SAVE_ALARM) return;
  void runAutoSaveIfNeeded();
});

async function reconcileAutoSave() {
  const prefs = await getPrefs();
  if (prefs.autoSave.enabled) {
    await chrome.alarms.create(AUTO_SAVE_ALARM, {
      periodInMinutes: AUTO_SAVE_INTERVAL_MINUTES,
    });
    return;
  }

  await chrome.alarms.clear(AUTO_SAVE_ALARM);
  await closeOffscreenDocument();
}

async function runAutoSaveIfNeeded() {
  const result = await chrome.storage.local.get([STORAGE_KEY, PREFS_KEY]);
  const prefs = normalizePrefs(result[PREFS_KEY]);
  const items = Array.isArray(result[STORAGE_KEY]) ? result[STORAGE_KEY] : [];

  if (!prefs.autoSave.enabled || !prefs.autoSave.directoryName) return;

  const itemCount = items.length;
  const newestCreatedAt = items.reduce((maxValue, item) => Math.max(maxValue, Number(item?.createdAt) || 0), 0);

  if (
    itemCount <= prefs.autoSave.lastSavedItemCount &&
    newestCreatedAt <= prefs.autoSave.lastSavedNewestCreatedAt
  ) {
    return;
  }

  await ensureOffscreenDocument();

  const response = await chrome.runtime.sendMessage({
    type: "autosave-perform",
    payload: {
      items,
      sequence: prefs.autoSave.sequence,
      version: chrome.runtime.getManifest().version,
      exportedAt: new Date().toISOString(),
    },
  });

  if (!response?.ok) {
    console.warn("Auto save skipped", response?.error || "Unknown error");
    return;
  }

  const nextPrefs = {
    ...prefs,
    autoSave: {
      ...prefs.autoSave,
      lastSavedAt: Date.now(),
      lastSavedItemCount: itemCount,
      lastSavedNewestCreatedAt: newestCreatedAt,
      sequence: Number(response.sequence) || prefs.autoSave.sequence,
    },
  };

  await chrome.storage.local.set({ [PREFS_KEY]: nextPrefs });
}

async function getPrefs() {
  const result = await chrome.storage.local.get(PREFS_KEY);
  return normalizePrefs(result[PREFS_KEY]);
}

function normalizePrefs(value) {
  return {
    ...value,
    autoSave: {
      enabled: Boolean(value?.autoSave?.enabled),
      directoryName: typeof value?.autoSave?.directoryName === "string" ? value.autoSave.directoryName : "",
      lastSavedAt: Number(value?.autoSave?.lastSavedAt) || 0,
      lastSavedItemCount: Number(value?.autoSave?.lastSavedItemCount) || 0,
      lastSavedNewestCreatedAt: Number(value?.autoSave?.lastSavedNewestCreatedAt) || 0,
      sequence: Number(value?.autoSave?.sequence) || 0,
    },
  };
}

async function ensureOffscreenDocument() {
  if (await hasOffscreenDocument()) return;

  await chrome.offscreen.createDocument({
    url: OFFSCREEN_URL,
    reasons: ["WORKERS"],
    justification: "Need a hidden document to write prompt library auto-save backups into the user selected folder.",
  });
}

async function closeOffscreenDocument() {
  if (!(await hasOffscreenDocument())) return;
  await chrome.offscreen.closeDocument();
}

async function hasOffscreenDocument() {
  if (typeof chrome.runtime.getContexts !== "function") {
    return false;
  }

  const contexts = await chrome.runtime.getContexts({
    contextTypes: ["OFFSCREEN_DOCUMENT"],
    documentUrls: [chrome.runtime.getURL(OFFSCREEN_URL)],
  });

  return contexts.length > 0;
}
