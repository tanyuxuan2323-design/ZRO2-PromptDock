const STORAGE_KEY = "gpt_prompt_library_items";
const PREFS_KEY = "gpt_prompt_library_ui_prefs";
const UPDATE_STATE_KEY = "gpt_prompt_library_update_state";
const AUTO_SAVE_ALARM = "zro2-promptdock-autosave";
const UPDATE_CHECK_ALARM = "zro2-promptdock-update-check";
const AUTO_SAVE_INTERVAL_MINUTES = 60;
const UPDATE_CHECK_INTERVAL_MINUTES = 60 * 24;
const OFFSCREEN_URL = "offscreen.html";

const UPDATE_MANIFEST_URL = "https://raw.githubusercontent.com/tanyuxuan2323-design/ZRO2-PromptDock/main/version.json";

chrome.runtime.onInstalled.addListener(() => {
  void initializeRuntime();
});

chrome.runtime.onStartup.addListener(() => {
  void initializeRuntime();
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === "autosave-config-updated") {
    reconcileAutoSave()
      .then(() => sendResponse({ ok: true }))
      .catch((error) => {
        console.error("Auto save config sync failed", error);
        sendResponse({ ok: false, error: error?.message || String(error) });
      });
    return true;
  }

  if (message?.type === "check-for-updates") {
    checkForUpdates({ manual: Boolean(message.manual) })
      .then((result) => sendResponse(result))
      .catch((error) => {
        console.error("Update check failed", error);
        sendResponse(createUpdateState({
          configured: Boolean(UPDATE_MANIFEST_URL),
          error: error?.message || String(error),
        }));
      });
    return true;
  }

  return false;
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === AUTO_SAVE_ALARM) {
    void runAutoSaveIfNeeded();
    return;
  }

  if (alarm.name === UPDATE_CHECK_ALARM) {
    void checkForUpdates({ manual: false });
  }
});

async function initializeRuntime() {
  await reconcileAutoSave();
  await reconcileUpdateChecks();
}

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

async function reconcileUpdateChecks() {
  if (!UPDATE_MANIFEST_URL) {
    await chrome.alarms.clear(UPDATE_CHECK_ALARM);
    await chrome.storage.local.set({
      [UPDATE_STATE_KEY]: createUpdateState({ configured: false }),
    });
    return;
  }

  await chrome.alarms.create(UPDATE_CHECK_ALARM, {
    periodInMinutes: UPDATE_CHECK_INTERVAL_MINUTES,
  });

  const existing = await chrome.storage.local.get(UPDATE_STATE_KEY);
  const updateState = normalizeUpdateState(existing[UPDATE_STATE_KEY]);
  const elapsed = Date.now() - updateState.lastCheckedAt;
  if (!updateState.lastCheckedAt || elapsed >= UPDATE_CHECK_INTERVAL_MINUTES * 60 * 1000) {
    await checkForUpdates({ manual: false });
  }
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

async function checkForUpdates({ manual }) {
  if (!UPDATE_MANIFEST_URL) {
    const state = createUpdateState({ configured: false });
    await chrome.storage.local.set({ [UPDATE_STATE_KEY]: state });
    return state;
  }

  const response = await fetch(UPDATE_MANIFEST_URL, { cache: manual ? "no-store" : "default" });
  if (!response.ok) {
    throw new Error(`更新信息获取失败：HTTP ${response.status}`);
  }

  const payload = await response.json();
  const manifestVersion = chrome.runtime.getManifest().version;
  const latestVersion = pickLatestVersion(payload);
  const hasUpdate = latestVersion ? compareVersions(latestVersion, manifestVersion) > 0 : false;

  const state = createUpdateState({
    configured: true,
    hasUpdate,
    latestVersion,
    releaseNotes: pickReleaseNotes(payload),
    downloadUrl: pickDownloadUrl(payload),
    releasePage: pickReleasePage(payload),
    lastCheckedAt: Date.now(),
    error: latestVersion ? "" : "远程更新信息里没有找到可用版本号。",
  });

  await chrome.storage.local.set({ [UPDATE_STATE_KEY]: state });
  return state;
}

function pickLatestVersion(payload) {
  const rawVersion =
    payload?.latestVersion ??
    payload?.version ??
    payload?.tag_name ??
    payload?.name ??
    "";
  return String(rawVersion).trim().replace(/^v/i, "");
}

function pickReleaseNotes(payload) {
  return String(
    payload?.releaseNotes ??
    payload?.notes ??
    payload?.changelog ??
    payload?.body ??
    "",
  ).trim();
}

function pickDownloadUrl(payload) {
  if (typeof payload?.downloadUrl === "string" && payload.downloadUrl.trim()) {
    return payload.downloadUrl.trim();
  }

  if (typeof payload?.browser_download_url === "string" && payload.browser_download_url.trim()) {
    return payload.browser_download_url.trim();
  }

  if (Array.isArray(payload?.assets)) {
    const zipAsset = payload.assets.find((asset) => typeof asset?.browser_download_url === "string" && /\.zip($|\?)/i.test(asset.browser_download_url));
    if (zipAsset) return zipAsset.browser_download_url.trim();
  }

  return "";
}

function pickReleasePage(payload) {
  return String(
    payload?.releasePage ??
    payload?.html_url ??
    payload?.url ??
    "",
  ).trim();
}

function createUpdateState(overrides = {}) {
  return {
    configured: false,
    hasUpdate: false,
    latestVersion: "",
    releaseNotes: "",
    downloadUrl: "",
    releasePage: "",
    lastCheckedAt: 0,
    error: "",
    ...overrides,
  };
}

function normalizeUpdateState(value) {
  return createUpdateState({
    configured: Boolean(value?.configured),
    hasUpdate: Boolean(value?.hasUpdate),
    latestVersion: typeof value?.latestVersion === "string" ? value.latestVersion : "",
    releaseNotes: typeof value?.releaseNotes === "string" ? value.releaseNotes : "",
    downloadUrl: typeof value?.downloadUrl === "string" ? value.downloadUrl : "",
    releasePage: typeof value?.releasePage === "string" ? value.releasePage : "",
    lastCheckedAt: Number(value?.lastCheckedAt) || 0,
    error: typeof value?.error === "string" ? value.error : "",
  });
}

function compareVersions(left, right) {
  const leftParts = String(left).split(".").map((part) => Number.parseInt(part, 10) || 0);
  const rightParts = String(right).split(".").map((part) => Number.parseInt(part, 10) || 0);
  const length = Math.max(leftParts.length, rightParts.length);

  for (let index = 0; index < length; index += 1) {
    const leftValue = leftParts[index] || 0;
    const rightValue = rightParts[index] || 0;
    if (leftValue > rightValue) return 1;
    if (leftValue < rightValue) return -1;
  }

  return 0;
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
