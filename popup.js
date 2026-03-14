const STORAGE_KEY = "gpt_prompt_library_items";
const PREFS_KEY = "gpt_prompt_library_ui_prefs";
const UPDATE_STATE_KEY = "gpt_prompt_library_update_state";
const DISPLAY_MODE_CHATGPT = "chatgpt_only";
const DISPLAY_MODE_ALL = "all_sites";
const CURRENT_VERSION = chrome.runtime.getManifest().version;

const state = {
  items: [],
  prefs: {
    settings: {
      managerVisible: true,
    },
    displayMode: DISPLAY_MODE_CHATGPT,
    autoSave: {
      enabled: false,
      directoryName: "",
      lastSavedAt: 0,
      lastSavedItemCount: 0,
      lastSavedNewestCreatedAt: 0,
      sequence: 0,
    },
  },
  update: {
    configured: false,
    hasUpdate: false,
    latestVersion: "",
    releaseNotes: "",
    downloadUrl: "",
    releasePage: "",
    lastCheckedAt: 0,
    error: "",
  },
};

const elements = {
  autoHideToggle: document.querySelector("#autoHideToggle"),
  autoSaveToggle: document.querySelector("#autoSaveToggle"),
  autoSaveControls: document.querySelector("#autoSaveControls"),
  chooseAutoSaveFolder: document.querySelector("#chooseAutoSaveFolder"),
  autoSaveFolderHint: document.querySelector("#autoSaveFolderHint"),
  displayModeChatgpt: document.querySelector("#displayModeChatgpt"),
  displayModeAll: document.querySelector("#displayModeAll"),
  currentVersion: document.querySelector("#currentVersion"),
  updateSummary: document.querySelector("#updateSummary"),
  updateNotes: document.querySelector("#updateNotes"),
  checkUpdateButton: document.querySelector("#checkUpdateButton"),
  openUpdateButton: document.querySelector("#openUpdateButton"),
  importInput: document.querySelector("#importInput"),
  statusMessage: document.querySelector("#statusMessage"),
};

let statusTimer = null;

init().catch((error) => {
  console.error("PromptDock popup init failed", error);
  showStatus("面板初始化失败，请重新打开扩展。");
});

async function init() {
  bindEvents();
  await loadState();
  render();
}

function bindEvents() {
  elements.autoHideToggle.addEventListener("click", async () => {
    state.prefs.settings.managerVisible = !state.prefs.settings.managerVisible;
    await persistPrefs();
    render();
    showStatus(state.prefs.settings.managerVisible ? "已显示提示词管理器入口。" : "已隐藏提示词管理器入口。");
  });

  elements.autoSaveToggle.addEventListener("click", async () => {
    if (state.prefs.autoSave.enabled) {
      state.prefs.autoSave.enabled = false;
      await persistPrefs();
      render();
      showStatus("已关闭自动保存。");
      return;
    }

    const selected = await ensureAutoSaveDirectory();
    if (!selected) return;

    state.prefs.autoSave.enabled = true;
    await persistPrefs();
    render();
    showStatus("已开启自动保存。");
  });

  elements.chooseAutoSaveFolder.addEventListener("click", async () => {
    const selected = await ensureAutoSaveDirectory(true);
    if (!selected) return;

    await persistPrefs();
    render();
    showStatus("自动保存文件夹已更新。");
  });

  [elements.displayModeChatgpt, elements.displayModeAll].forEach((button) => {
    button.addEventListener("click", async () => {
      const { mode } = button.dataset;
      if (!mode || state.prefs.displayMode === mode) return;
      state.prefs.displayMode = normalizeDisplayMode(mode);
      await persistPrefs();
      render();
      showStatus(
        state.prefs.displayMode === DISPLAY_MODE_ALL
          ? "已切换为全浏览器显示。"
          : "已切换为仅在 ChatGPT 显示。",
      );
    });
  });

  elements.checkUpdateButton.addEventListener("click", async () => {
    await checkForUpdates(true);
  });

  elements.openUpdateButton.addEventListener("click", async () => {
    const targetUrl = state.update.downloadUrl || state.update.releasePage;
    if (!targetUrl) {
      showStatus("当前还没有可打开的更新地址。");
      return;
    }

    await chrome.tabs.create({ url: targetUrl });
  });

  elements.importInput.addEventListener("change", async (event) => {
    await importItems(event);
  });
}

async function loadState() {
  const result = await chrome.storage.local.get([STORAGE_KEY, PREFS_KEY, UPDATE_STATE_KEY]);
  state.items = Array.isArray(result[STORAGE_KEY]) ? result[STORAGE_KEY].map(normalizeItem).filter(Boolean) : [];
  state.prefs = normalizePrefs(result[PREFS_KEY]);
  state.update = normalizeUpdateState(result[UPDATE_STATE_KEY]);
}

function render() {
  renderSwitch(elements.autoHideToggle, state.prefs.settings.managerVisible);
  renderSwitch(elements.autoSaveToggle, state.prefs.autoSave.enabled);
  elements.autoSaveControls.classList.toggle("hidden", !state.prefs.autoSave.enabled);
  elements.autoSaveFolderHint.textContent = state.prefs.autoSave.directoryName
    ? `当前文件夹：${state.prefs.autoSave.directoryName}`
    : "还没有选择文件夹";
  elements.chooseAutoSaveFolder.textContent = state.prefs.autoSave.directoryName
    ? "更换保存文件夹"
    : "选择保存文件夹";
  renderDisplayModeButtons();
  renderUpdateSection();
}

function renderSwitch(element, isActive) {
  element.textContent = isActive ? "开启" : "关闭";
  element.classList.toggle("active", isActive);
  element.setAttribute("aria-pressed", String(isActive));
  element.setAttribute("aria-checked", String(isActive));
  element.setAttribute("role", "switch");
}

function renderDisplayModeButtons() {
  const activeMode = state.prefs.displayMode;
  [elements.displayModeChatgpt, elements.displayModeAll].forEach((button) => {
    const isActive = button.dataset.mode === activeMode;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-checked", String(isActive));
    button.setAttribute("aria-pressed", String(isActive));
  });
}

function renderUpdateSection() {
  elements.currentVersion.textContent = `当前版本 v${CURRENT_VERSION}`;

  if (!state.update.configured) {
    elements.updateSummary.textContent = "还没有配置 GitHub 更新地址。";
    elements.updateNotes.textContent = "先把远程 version.json 链接填进 background.js 里的 UPDATE_MANIFEST_URL。";
    elements.openUpdateButton.classList.add("hidden");
    return;
  }

  if (state.update.error) {
    elements.updateSummary.textContent = "更新检查失败";
    elements.updateNotes.textContent = state.update.error;
    elements.openUpdateButton.classList.toggle("hidden", !state.update.releasePage);
    return;
  }

  if (state.update.hasUpdate) {
    elements.updateSummary.textContent = `发现新版本 v${state.update.latestVersion}`;
    elements.updateNotes.textContent = state.update.releaseNotes || "已有新版本可下载。";
    elements.openUpdateButton.classList.remove("hidden");
    return;
  }

  if (state.update.lastCheckedAt) {
    elements.updateSummary.textContent = "当前已是最新版本";
    elements.updateNotes.textContent = `上次检查：${formatTimestamp(state.update.lastCheckedAt)}`;
  } else {
    elements.updateSummary.textContent = "还没有检查更新";
    elements.updateNotes.textContent = "点击下方按钮，从 GitHub 检查是否有新版本。";
  }

  elements.openUpdateButton.classList.toggle("hidden", !state.update.releasePage && !state.update.downloadUrl);
}

async function persistPrefs() {
  await chrome.storage.local.set({ [PREFS_KEY]: state.prefs });
  await syncAutoSaveRuntime();
}

async function checkForUpdates(manual = false) {
  elements.checkUpdateButton.disabled = true;
  const previousLabel = elements.checkUpdateButton.textContent;
  elements.checkUpdateButton.textContent = "检查中...";

  try {
    const response = await chrome.runtime.sendMessage({ type: "check-for-updates", manual });
    state.update = normalizeUpdateState(response);
    await chrome.storage.local.set({ [UPDATE_STATE_KEY]: state.update });
    render();

    if (!state.update.configured) {
      showStatus("更新地址还没有配置。");
      return;
    }

    if (state.update.error) {
      showStatus("更新检查失败。");
      return;
    }

    showStatus(state.update.hasUpdate ? `发现新版本 v${state.update.latestVersion}` : "当前已是最新版本。");
  } catch (error) {
    console.error("Manual update check failed", error);
    showStatus("检查更新失败。");
  } finally {
    elements.checkUpdateButton.disabled = false;
    elements.checkUpdateButton.textContent = previousLabel;
  }
}

async function importItems(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  try {
    const text = await file.text();
    const imported = JSON.parse(text);
    const importedItems = Array.isArray(imported)
      ? imported
      : Array.isArray(imported?.items)
        ? imported.items
        : null;

    if (!Array.isArray(importedItems)) {
      throw new Error("Imported file is not an array");
    }

    const normalized = importedItems.map(normalizeItem).filter(Boolean);
    if (!normalized.length) {
      throw new Error("Imported file contains no valid prompts");
    }

    state.items = mergeItems(state.items, normalized);
    await chrome.storage.local.set({ [STORAGE_KEY]: state.items });
    showStatus(`已导入 ${normalized.length} 条提示。`);
  } catch (error) {
    console.error("Popup import failed", error);
    showStatus("导入失败，请确认 JSON 格式正确。");
  } finally {
    event.target.value = "";
  }
}

function mergeItems(existingItems, importedItems) {
  const seen = new Map();
  [...importedItems, ...existingItems].forEach((item) => {
    const key = `${item.title}::${item.content}`;
    const previous = seen.get(key);
    if (!previous || previous.updatedAt < item.updatedAt) {
      seen.set(key, item);
    }
  });
  return [...seen.values()];
}

function normalizePrefs(value) {
  return {
    ...value,
    settings: {
      managerVisible:
        value?.settings?.managerVisible ??
        value?.settings?.autoHideOnOutside ??
        true,
    },
    displayMode: normalizeDisplayMode(value?.displayMode),
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

function normalizeUpdateState(value) {
  return {
    configured: Boolean(value?.configured),
    hasUpdate: Boolean(value?.hasUpdate),
    latestVersion: typeof value?.latestVersion === "string" ? value.latestVersion : "",
    releaseNotes: typeof value?.releaseNotes === "string" ? value.releaseNotes : "",
    downloadUrl: typeof value?.downloadUrl === "string" ? value.downloadUrl : "",
    releasePage: typeof value?.releasePage === "string" ? value.releasePage : "",
    lastCheckedAt: Number(value?.lastCheckedAt) || 0,
    error: typeof value?.error === "string" ? value.error : "",
  };
}

function normalizeDisplayMode(value) {
  return value === DISPLAY_MODE_ALL ? DISPLAY_MODE_ALL : DISPLAY_MODE_CHATGPT;
}

function normalizeItem(item) {
  if (!item || typeof item.title !== "string" || typeof item.content !== "string") {
    return null;
  }

  const now = Date.now();
  return {
    id: typeof item.id === "string" && item.id ? item.id : crypto.randomUUID(),
    title: item.title.trim(),
    content: item.content.trim(),
    tags: Array.isArray(item.tags) ? item.tags : [],
    favorite: Boolean(item.favorite),
    order: Number.isFinite(Number(item.order)) ? Number(item.order) : 0,
    createdAt: Number(item.createdAt) || now,
    updatedAt: Number(item.updatedAt) || now,
    lastUsedAt: Number(item.lastUsedAt) || 0,
  };
}

function formatTimestamp(timestamp) {
  try {
    return new Intl.DateTimeFormat("zh-CN", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(timestamp);
  } catch {
    return "";
  }
}

function showStatus(message) {
  elements.statusMessage.textContent = message;
  elements.statusMessage.classList.remove("hidden");
  if (statusTimer) clearTimeout(statusTimer);
  statusTimer = window.setTimeout(() => {
    elements.statusMessage.classList.add("hidden");
    elements.statusMessage.textContent = "";
  }, 2400);
}

async function ensureAutoSaveDirectory(forcePick = false) {
  if (typeof window.showDirectoryPicker !== "function") {
    showStatus("当前浏览器环境不支持选择自动保存文件夹。");
    return false;
  }

  try {
    let directoryHandle = null;
    if (!forcePick) {
      directoryHandle = await loadDirectoryHandle();
    }

    if (!directoryHandle) {
      directoryHandle = await window.showDirectoryPicker({ mode: "readwrite" });
    }

    if (!directoryHandle) return false;

    const permission = await directoryHandle.requestPermission({ mode: "readwrite" });
    if (permission !== "granted") {
      showStatus("没有获得文件夹写入权限。");
      return false;
    }

    await saveDirectoryHandle(directoryHandle);
    state.prefs.autoSave.directoryName = directoryHandle.name || "";
    return true;
  } catch (error) {
    if (error?.name !== "AbortError") {
      console.error("Choose auto save folder failed", error);
      showStatus("选择自动保存文件夹失败。");
    }
    return false;
  }
}

async function syncAutoSaveRuntime() {
  try {
    await chrome.runtime.sendMessage({ type: "autosave-config-updated" });
  } catch (error) {
    console.warn("Auto save runtime sync skipped", error);
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

async function saveDirectoryHandle(handle) {
  const database = await openAutoSaveDb();
  await new Promise((resolve, reject) => {
    const transaction = database.transaction("handles", "readwrite");
    transaction.objectStore("handles").put(handle, "autosave-directory");
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
  database.close();
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
