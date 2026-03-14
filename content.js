(function initVoyagerPromptLibrary() {
  if (window.__gptVoyagerPromptLibraryMounted) return;
  window.__gptVoyagerPromptLibraryMounted = true;

  const EXTENSION_VERSION = "2.0.9";
  const STORAGE_KEY = "gpt_prompt_library_items";
  const PREFS_KEY = "gpt_prompt_library_ui_prefs";
  const ROOT_ID = "gpt-voyager-root";
  const FAB_SIZE = 58;
  const SHELL_GAP = 12;
  const DEFAULT_PANEL_SIZE = { width: 420, height: 736 };
  const MIN_PANEL_SIZE = { width: 300, height: 520 };
  const LARGE_TEXT_THRESHOLD = 18000;
  const EDGE_SNAP_THRESHOLD = 24;
  const FAB_DRAG_THRESHOLD = 8;
  const ATTACHMENT_STABILITY_THRESHOLD = 96;
  const CURRENT_HOST = window.location.hostname.toLowerCase();
  const DISPLAY_MODE_CHATGPT = "chatgpt_only";
  const DISPLAY_MODE_ALL = "all_sites";
  const CHATGPT_HOSTS = ["chatgpt.com", "chat.openai.com"];
  const GENERIC_COMPOSER_SELECTORS = [
    "#prompt-textarea",
    '[data-testid="prompt-textarea"]',
    'textarea[placeholder*="Message"]',
    'textarea[placeholder*="message"]',
    "textarea",
    'input[type="text"]',
    'input:not([type])',
    '[contenteditable="true"][id="prompt-textarea"]',
    '[contenteditable="true"][data-testid="prompt-textarea"]',
    '[contenteditable="true"][aria-label*="Message"]',
    '[contenteditable="true"][aria-label*="message"]',
    '[contenteditable="true"]',
    '[contenteditable="plaintext-only"]',
    '[role="textbox"]',
    '[aria-multiline="true"]',
    ".ProseMirror",
    '[data-lexical-editor="true"]',
  ];
  const SITE_COMPOSER_PROFILES = [
    {
      hosts: ["chatgpt.com", "chat.openai.com"],
      selectors: [
        "#prompt-textarea",
        '[data-testid="prompt-textarea"]',
        '[contenteditable="true"][id="prompt-textarea"]',
        '[contenteditable="true"][data-testid="prompt-textarea"]',
      ],
    },
    {
      hosts: ["claude.com"],
      selectors: [
        '[contenteditable="true"][data-is-slate-editor="true"]',
        '[contenteditable="true"][data-slate-editor="true"]',
        '.ProseMirror[contenteditable="true"]',
        '[contenteditable="true"][role="textbox"]',
      ],
    },
    {
      hosts: ["gemini.google.com"],
      selectors: [
        'rich-textarea [contenteditable="true"]',
        'ms-autosize-textarea textarea',
        '[role="textbox"][contenteditable="true"]',
      ],
    },
    {
      hosts: ["grok.com", "x.ai"],
      selectors: [
        'textarea[placeholder*="Ask"]',
        'textarea[placeholder*="Grok"]',
        '[contenteditable="true"][role="textbox"]',
        '[role="textbox"][aria-multiline="true"]',
      ],
    },
    {
      hosts: ["deepseek.com", "deepseek.chat"],
      selectors: [
        'textarea[placeholder*="DeepSeek"]',
        'textarea[placeholder*="发送"]',
        'textarea[placeholder*="Send"]',
        '[contenteditable="true"][role="textbox"]',
        '.ProseMirror[contenteditable="true"]',
      ],
    },
    {
      hosts: ["midjourney.com"],
      selectors: [
        'textarea[placeholder*="Describe"]',
        'textarea[placeholder*="prompt"]',
        '[contenteditable="true"][role="textbox"]',
      ],
    },
    {
      hosts: ["krea.ai"],
      selectors: [
        'textarea[placeholder*="prompt"]',
        'textarea[placeholder*="Prompt"]',
        '[contenteditable="true"][role="textbox"]',
        '.ProseMirror[contenteditable="true"]',
      ],
    },
    {
      hosts: ["lovart.ai"],
      selectors: [
        'textarea[placeholder*="prompt"]',
        'textarea[placeholder*="Prompt"]',
        '[contenteditable="true"][role="textbox"]',
        '[data-lexical-editor="true"]',
      ],
    },
    {
      hosts: ["app.klingai.com"],
      selectors: [
        'textarea[placeholder*="prompt"]',
        'textarea[placeholder*="输入"]',
        'textarea[placeholder*="描述"]',
        '[contenteditable="true"][role="textbox"]',
        '.ProseMirror[contenteditable="true"]',
      ],
    },
  ];

  const state = {
    items: [],
    editingId: null,
    editorOpen: false,
    activeTag: "",
    searchTerm: "",
    panelOpen: true,
    anchorPosition: null,
    anchorAttachment: null,
    panelSize: getDefaultPanelSize(),
    pendingDeleteId: "",
    pendingImportItems: [],
    importModalOpen: false,
    favoritesOnly: false,
    expandedIds: [],
    settingsOpen: false,
    quickPanelOpen: false,
    settings: {
      managerVisible: true,
    },
    displayMode: DISPLAY_MODE_CHATGPT,
    tagSuggestionsOpen: false,
  };

  let statusTimer = null;
  let dragState = null;
  let prefsTimer = null;
  let touchPersistTimer = null;
  let tagSuggestionsTimer = null;
  let suppressFabToggle = false;
  let pendingFabToggle = false;
  let dragPressTimer = null;
  let dragPressCard = null;
  let draggedItemId = "";
  let previousPanelOpen = true;
  let panelResizeState = null;
  let cardTagFitFrame = 0;
  let dragMoveFrame = 0;
  let dragMoveEvent = null;
  let panelResizeFrame = 0;
  let panelResizeEvent = null;
  let closingPanelAnimation = null;

  const ICONS = {
    sparkle:
      `<svg class="__CLASS__" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4.5l1.8 5.2 5.2 1.8-5.2 1.8-1.8 5.2-1.8-5.2-5.2-1.8 5.2-1.8L12 4.5Z" /></svg>`,
    promptLibrary:
      `<svg class="__CLASS__" viewBox="0 0 1024 1024" aria-hidden="true"><path d="M163.79375 123.715625h271.621875a38.803125 38.803125 0 0 1 38.803125 38.803125v271.621875a38.803125 38.803125 0 0 1-38.803125 38.803125H163.79375a38.803125 38.803125 0 0 1-38.803125-38.803125V162.51875a38.803125 38.803125 0 0 1 38.803125-38.803125z m426.834375 0h271.63125A38.803125 38.803125 0 0 1 901.0625 162.51875v271.621875a38.803125 38.803125 0 0 1-38.803125 38.803125H590.628125a38.803125 38.803125 0 0 1-38.803125-38.803125V162.51875a38.803125 38.803125 0 0 1 38.803125-38.803125zM163.79375 550.55h271.621875a38.803125 38.803125 0 0 1 38.803125 38.803125v271.621875a38.803125 38.803125 0 0 1-38.803125 38.803125H163.79375a38.803125 38.803125 0 0 1-38.803125-38.803125V589.353125a38.803125 38.803125 0 0 1 38.803125-38.803125z m426.834375 0h271.63125A38.803125 38.803125 0 0 1 901.0625 589.353125v271.621875a38.803125 38.803125 0 0 1-38.803125 38.803125H590.628125a38.803125 38.803125 0 0 1-38.803125-38.803125V589.353125a38.803125 38.803125 0 0 1 38.803125-38.803125z" fill="currentColor" /></svg>`,
    orca:
      `<svg class="__CLASS__" viewBox="0 0 1000 1000" aria-hidden="true"><path d="M858.86 353.49c-17.6-34.8-59.78-52.44-125.36-52.44-42.35 0-88.14 7.2-125 14.9 18.41-22.02 28.91-43.04 31.27-62.71 2.32-19.28-3.32-37.31-16.3-52.12-12.06-13.77-29.46-20.75-51.7-20.75-39.03 0-93.89 21.74-163.04 64.62-54.2 33.6-114.79 79.38-162.1 122.47-69.14 62.97-87.76 129.98-91.2 175.1-3.5 45.82 7.49 78.9 9.55 84.6 15.27 50.87 49.15 94.12 98.02 125.11 45.08 28.59 100 44.33 154.63 44.33 46.22 0 90.16-11.27 127.05-32.6 60.25-34.84 97.94-86.66 108.98-149.87 5.68-32.54 3.08-61.2.06-78.97 18.43-5.48 48.91-15.27 80.97-28.72 68.46-28.72 110.74-60.08 125.67-93.22 8.85-19.65 8.34-40.31-1.48-59.73Z" fill="#FFFFFF"></path><path d="M224.63 654.94c-16.79 1.65-33.86-32.87-38.13-77.1-4.27-44.23 5.89-81.42 22.68-83.06s33.86 32.87 38.13 77.1c4.27 44.23-5.88 81.42-22.68 83.06Z" fill="#FFFFFF"></path><ellipse cx="401.62" cy="555.26" rx="115.72" ry="116.68" fill="#FFFFFF"></ellipse><path d="M401.62 485.4c-38.27 0-69.29 31.28-69.29 69.86s31.02 69.86 69.29 69.86 69.29-31.28 69.29-69.86-31.02-69.86-69.29-69.86Z" fill="#000000"></path><path d="M842.02 362.01c-44.83-88.64-300.69-9.71-300.69-9.71s117.34-82.36 67.95-138.73c-50.97-58.18-246.53 73.67-349.94 167.85-124.98 113.82-76.44 239.79-76.44 239.79 41.06 138.28 229.93 197.22 352.32 126.45 133.69-77.3 100.45-212.15 96.25-225.82l-.1.03c-.47-1.59-.35-1.51.1-.03 5.47-1.43 257.2-67.6 210.55-159.82ZM224.63 654.94c-16.79 1.65-33.86-32.87-38.13-77.1-4.27-44.23 5.89-81.42 22.68-83.06s33.86 32.87 38.13 77.1c4.27 44.23-5.88 81.42-22.68 83.06Zm177 17c-63.91 0-115.72-52.24-115.72-116.67s51.81-116.68 115.72-116.68 115.72 52.24 115.72 116.68-51.81 116.67-115.72 116.67Z" fill="#000000"></path><path d="M245.75 573.2c-2.38-24.67-11.9-43.92-21.27-43-9.37.92-15.03 21.66-12.65 46.33 2.38 24.67 11.9 43.92 21.27 43 9.37-.92 15.03-21.66 12.65-46.33Z" fill="#000000"></path></svg>`,
    plusCircle:
      `<svg class="__CLASS__" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8.5" /><path d="M12 8.5v7" /><path d="M8.5 12h7" /></svg>`,
    createPrompt:
      `<svg class="__CLASS__" viewBox="0 0 1026 1024" aria-hidden="true"><path d="M190.464 764.928q0 26.624 18.944 45.056t45.568 18.432l254.976 0 0 128-319.488 0q-26.624 0-49.664-10.24t-40.448-27.648-27.648-40.448-10.24-49.664l0-640q0-26.624 10.24-49.664t27.648-40.448 40.448-27.648 49.664-10.24l704.512 0q26.624 0 49.664 10.24t40.448 27.648 27.648 40.448 10.24 49.664l0 253.952-128 3.072 0-64.512q0-26.624-18.944-45.568t-45.568-18.944l-575.488 0q-26.624 0-45.568 18.944t-18.944 45.568l0 384zM799.744 507.904q46.08 0 87.04 17.408t71.68 48.128 48.64 71.68 17.92 88.064-17.92 88.064-48.64 71.68-71.68 48.128-87.04 17.408q-47.104 0-88.064-17.408t-71.68-48.128-48.64-71.68-17.92-88.064 17.92-88.064 48.64-71.68 71.68-48.128 88.064-17.408zM958.464 764.928l0-64.512-128 0 0-128-63.488 0 0 128-128 0 0 64.512 128 0 0 128 63.488 0 0-128 128 0z" fill="currentColor" /></svg>`,
    resizeGrip:
      `<svg class="__CLASS__" viewBox="0 0 16 16" aria-hidden="true" fill="none"><path d="M3 13L13 3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M6.5 13L13 6.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M10 13L13 10" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`,
    chargerPile:
      `<svg class="__CLASS__" viewBox="0 0 1024 1024" aria-hidden="true"><path d="M260.181333 195.584a42.666667 42.666667 0 0 1 42.666667-42.666667h292.906667a42.666667 42.666667 0 0 1 42.666666 42.666667V870.826667H260.181333V195.584z" fill="#79DEB4"></path><path d="M638.464 195.584a42.666667 42.666667 0 0 0-38.357333-42.453333l-4.309334-0.213334v-42.666666a85.333333 85.333333 0 0 1 85.333334 85.333333V913.493333H217.514667V195.584a85.333333 85.333333 0 0 1 85.333333-85.333333v42.666666l-4.352 0.213334a42.666667 42.666667 0 0 0-38.314667 42.453333V870.826667h378.282667V195.584z m-42.666667-85.333333v42.666666H302.848v-42.666666h292.949333z" fill="#3D3D63"></path><path d="M260.181333 799.274667c0 2.133333 10.624 26.154667 42.666667 37.546666 32.085333 11.477333 254.72 10.154667 292.906667 0 38.229333-10.069333 42.666667-35.413333 42.666666-37.546666v71.594666H260.181333v-71.594666z" fill="#62CCA1"></path><path d="M638.464 195.584a42.666667 42.666667 0 0 0-38.357333-42.453333l-4.309334-0.213334v-42.666666a85.333333 85.333333 0 0 1 85.333334 85.333333V913.493333H217.514667V195.584a85.333333 85.333333 0 0 1 85.333333-85.333333v42.666666l-4.352 0.213334a42.666667 42.666667 0 0 0-38.314667 42.453333V870.826667h378.282667V195.584z m-42.666667-85.333333v42.666666H302.848v-42.666666h292.949333z" fill="#3D3D63"></path><path d="M716.8 871.082667a21.333333 21.333333 0 0 1 0 42.666666H181.845333a21.333333 21.333333 0 0 1 0-42.666666H716.8z" fill="#3D3D63"></path><path d="M348.245333 266.666667a21.333333 21.333333 0 0 1 21.333334-21.333334H529.066667a21.333333 21.333333 0 0 1 21.333333 21.333334v123.733333a21.333333 21.333333 0 0 1-21.333333 21.333333H369.578667a21.333333 21.333333 0 0 1-21.333334-21.333333v-123.733333z" fill="#96DDFF"></path><path d="M348.672 394.666667a21.333333 21.333333 0 0 0 16.64 16.64l4.266667 0.426666h159.445333l4.352-0.426666a21.333333 21.333333 0 0 0 16.554667-16.64l0.426666-4.266667v-123.733333a21.333333 21.333333 0 0 0-21.333333-21.333334v-42.666666a64 64 0 0 1 64 64v123.733333a64 64 0 0 1-64 64H369.578667a64 64 0 0 1-64-64v-123.733333a64 64 0 0 1 64-64v42.666666a21.333333 21.333333 0 0 0-21.333334 21.333334v123.733333l0.426667 4.266667z m180.352-192v42.666666H369.578667v-42.666666h159.445333zM427.989333 524.330667a21.333333 21.333333 0 0 1 38.144 19.157333l-37.12 73.728h75.221334a21.333333 21.333333 0 0 1 18.602666 31.786667l-57.173333 101.717333a21.376 21.376 0 0 1-37.205333-20.864l39.296-69.973333h-73.386667a21.333333 21.333333 0 0 1-19.029333-30.933334l52.650666-104.618666zM863.488 681.258667c0 10.496-0.853333 29.866667-10.88 47.104-11.264 19.285333-31.786667 32.128-62.890667 32.128-15.402667 0-28.672-3.456-39.594666-10.026667a64.469333 64.469333 0 0 1-23.338667-24.533333c-9.514667-17.237333-10.581333-36.181333-11.050667-43.264V407.552h-54.741333a21.333333 21.333333 0 0 1 0-42.666667h76.032a21.333333 21.333333 0 0 1 21.333333 21.333334v294.101333c0.512 7.381333 1.450667 17.194667 5.802667 25.045333a21.76 21.76 0 0 0 7.936 8.533334c3.328 1.962667 8.746667 3.925333 17.621333 3.925333 17.664 0 23.296-6.229333 26.026667-10.965333 4.010667-6.826667 5.077333-16.341333 5.077333-25.6V399.104l-24.832-12.970667a21.376 21.376 0 0 1-3.541333-35.498666l18.346667-14.933334-36.522667-38.4a21.333333 21.333333 0 0 1 30.933333-29.44L857.6 323.029333a21.376 21.376 0 0 1 5.888 14.72v343.466667z" fill="#3D3D63"></path><path d="M321.024 163.285333a21.333333 21.333333 0 0 1 8.704 41.770667 27.648 27.648 0 0 0-12.373333 7.082667 27.477333 27.477333 0 0 0-7.509334 10.752 21.333333 21.333333 0 0 1-40.832-12.373334c3.413333-11.264 10.666667-21.632 19.2-29.568 8.533333-7.978667 19.882667-14.933333 32.853334-17.664z" fill="#FFFFFF"></path></svg>`,
    minus:
      `<svg class="__CLASS__" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round"><path d="M7 12h10" /></svg>`,
    closeCircle:
      `<svg class="__CLASS__" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8.5" /><path d="m9.2 9.2 5.6 5.6" /><path d="m14.8 9.2-5.6 5.6" /></svg>`,
    save:
      `<svg class="__CLASS__" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round"><path d="M6.5 4.5h9.4l2.6 2.7V18a1.8 1.8 0 0 1-1.8 1.8H7.3A1.8 1.8 0 0 1 5.5 18V6.3a1.8 1.8 0 0 1 1-1.8Z" /><path d="M8.5 4.8v4.8h6.8V4.8" /><path d="m9.4 14 1.8 1.8 3.6-3.6" /></svg>`,
    export:
      `<svg class="__CLASS__" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4.5v8.5" /><path d="m8.5 10 3.5 3.5 3.5-3.5" /><path d="M7 16.5v2a1.5 1.5 0 0 0 1.5 1.5h7a1.5 1.5 0 0 0 1.5-1.5v-2" /><path d="M5.5 19.5h13" /></svg>`,
    import:
      `<svg class="__CLASS__" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19.5V11" /><path d="m8.5 14 3.5-3.5 3.5 3.5" /><path d="M7 7.5v-2A1.5 1.5 0 0 1 8.5 4h7A1.5 1.5 0 0 1 17 5.5v2" /><path d="M5.5 4.5h13" /></svg>`,
    settings:
      `<svg class="__CLASS__" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4.8 13.7 5a1 1 0 0 1 .8.6l.5 1.2a1 1 0 0 0 1 .6l1.3-.1a1 1 0 0 1 .9.4l1 1.4a1 1 0 0 1 .1 1l-.6 1.2a1 1 0 0 0 0 1l.6 1.2a1 1 0 0 1-.1 1l-1 1.4a1 1 0 0 1-.9.4l-1.3-.1a1 1 0 0 0-1 .6l-.5 1.2a1 1 0 0 1-.8.6l-1.7.2-1.7-.2a1 1 0 0 1-.8-.6l-.5-1.2a1 1 0 0 0-1-.6l-1.3.1a1 1 0 0 1-.9-.4l-1-1.4a1 1 0 0 1-.1-1l.6-1.2a1 1 0 0 0 0-1l-.6-1.2a1 1 0 0 1 .1-1l1-1.4a1 1 0 0 1 .9-.4l1.3.1a1 1 0 0 0 1-.6l.5-1.2a1 1 0 0 1 .8-.6L12 4.8Z" /><circle cx="12" cy="12" r="2.7" /></svg>`,
    archive:
      `<svg class="__CLASS__" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round"><rect x="4.5" y="5" width="15" height="4.2" rx="1.8" /><path d="M6.5 9.5V18a1.8 1.8 0 0 0 1.8 1.8h7.4a1.8 1.8 0 0 0 1.8-1.8V9.5" /><path d="M12 11.5v5.5" /><path d="m9.5 14.5 2.5 2.5 2.5-2.5" /></svg>`,
    trash:
      `<svg class="__CLASS__" viewBox="0 0 1024 1024" aria-hidden="true" fill="currentColor"><path d="M878.54 226.544h-40.717v651.469c0 44.976-36.458 81.434-81.434 81.434H267.787c-44.976 0-81.434-36.458-81.434-81.434V226.544h-40.717c-22.488 0-40.717-18.229-40.717-40.717s18.229-40.717 40.717-40.717h244.301c0-44.976 36.458-81.434 81.434-81.434h81.434c44.976 0 81.434 36.458 81.434 81.434H878.54c22.488 0 40.717 18.229 40.717 40.717s-18.229 40.717-40.717 40.717z m-122.151 0H267.787v651.469h488.602V226.544z m-325.734 81.434c22.488 0 40.717 18.229 40.717 40.717v407.168c0 22.488-18.229 40.717-40.717 40.717s-40.717-18.229-40.717-40.717V348.695c0-22.488 18.229-40.717 40.717-40.717z m162.867 0c22.488 0 40.717 18.229 40.717 40.717v407.168c0 22.488-18.229 40.717-40.717 40.717s-40.717-18.229-40.717-40.717V348.695c0-22.488 18.229-40.717 40.717-40.717z"></path></svg>`,
    resetSize:
      `<svg class="__CLASS__" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round"><path d="M8 4.5H4.5V8" /><path d="m4.5 8 5-5" /><path d="M16 4.5h3.5V8" /><path d="m19.5 8-5-5" /><path d="M8 19.5H4.5V16" /><path d="m4.5 16 5 5" /><path d="M16 19.5h3.5V16" /><path d="m19.5 16-5 5" /></svg>`,
    resetPosition:
      `<svg class="__CLASS__" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="7.5" /><circle cx="12" cy="12" r="2.4" /><path d="M12 3.5V6" /><path d="M12 18v2.5" /><path d="M3.5 12H6" /><path d="M18 12h2.5" /></svg>`,
    star:
      `<svg class="__CLASS__" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round"><path d="m12 4.8 2.2 4.5 5 .7-3.6 3.5.9 4.9-4.5-2.4-4.5 2.4.9-4.9-3.6-3.5 5-.7L12 4.8Z" /></svg>`,
    starFilled:
      `<svg class="__CLASS__" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor" stroke="none"><path d="m12 4.8 2.2 4.5 5 .7-3.6 3.5.9 4.9-4.5-2.4-4.5 2.4.9-4.9-3.6-3.5 5-.7L12 4.8Z" /></svg>`,
    chevronDown:
      `<svg class="__CLASS__" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round"><path d="m7.5 9.5 4.5 4.8 4.5-4.8" /></svg>`,
    chevronUp:
      `<svg class="__CLASS__" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round"><path d="m7.5 14.5 4.5-4.8 4.5 4.8" /></svg>`,
    grip:
      `<svg class="__CLASS__" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><circle cx="8" cy="7" r="1.35" /><circle cx="16" cy="7" r="1.35" /><circle cx="8" cy="12" r="1.35" /><circle cx="16" cy="12" r="1.35" /><circle cx="8" cy="17" r="1.35" /><circle cx="16" cy="17" r="1.35" /></svg>`,
    replace:
      `<svg class="__CLASS__" viewBox="0 0 1024 1024" aria-hidden="true" fill="currentColor"><path d="M827.648 223.445333h91.306667a21.333333 21.333333 0 0 1 15.104 36.437334l-129.536 129.493333a21.333333 21.333333 0 0 1-30.165334 0l-129.536-129.493333a21.333333 21.333333 0 0 1 15.104-36.437334h90.88V64.085333h76.8v159.36zM836.266667 789.333333V469.333333h76.8v320c0 45.952-16.213333 85.162667-48.725334 117.674667A160.341333 160.341333 0 0 1 746.666667 955.733333h-469.333334a160.341333 160.341333 0 0 1-117.674666-48.725333A160.341333 160.341333 0 0 1 110.933333 789.333333V128c0-39.808 19.925333-59.733333 59.733334-59.733333h362.666666v76.8H187.733333v644.266666c0 59.733333 29.866667 89.6 89.6 89.6h469.333334c29.866667 0 52.266667-7.466667 67.2-22.4 14.933333-14.933333 22.4-37.333333 22.4-67.2zM512 550.4H298.666667v-76.8h213.333333v76.8z m85.333333 170.666667H298.666667v-76.8h298.666666v76.8z"></path></svg>`,
    append:
      `<svg class="__CLASS__" viewBox="0 0 1024 1024" aria-hidden="true" fill="currentColor"><path d="M839.68 757.76h-81.92v-81.92h81.92V184.32H348.16v81.92H266.24V184.32c0-45.056 36.864-81.92 81.92-81.92h491.52c45.056 0 81.92 36.864 81.92 81.92v491.52c0 45.056-36.864 81.92-81.92 81.92z"></path><path d="M675.84 348.16v491.52H184.32V348.16h491.52m0-81.92H184.32c-45.056 0-81.92 36.864-81.92 81.92v491.52c0 45.056 36.864 81.92 81.92 81.92h491.52c45.056 0 81.92-36.864 81.92-81.92V348.16c0-45.056-36.864-81.92-81.92-81.92z"></path><path d="M430.08 430.08c-20.48 0-40.96 20.48-40.96 40.96v81.92H307.2c-20.48 0-40.96 20.48-40.96 40.96s20.48 40.96 40.96 40.96h81.92v81.92c0 20.48 20.48 40.96 40.96 40.96s40.96-20.48 40.96-40.96v-81.92h81.92c20.48 0 40.96-20.48 40.96-40.96s-20.48-40.96-40.96-40.96H471.04V471.04c0-20.48-20.48-40.96-40.96-40.96z"></path></svg>`,
    edit:
      `<svg class="__CLASS__" viewBox="0 0 1024 1024" aria-hidden="true" fill="currentColor"><path d="M318.4 768H192a32.064 32.064 0 0 1-32-32V609.6c0-8 3.2-16 9.6-22.4L638.4 118.4a76.16 76.16 0 0 1 54.4-22.4c20.8 0 40 8 54.4 22.4l62.4 62.4c14.4 14.4 22.4 33.6 22.4 54.4 0 20.8-8 40-22.4 54.4L340.8 758.4c-6.4 6.4-14.4 9.6-22.4 9.6zM224 704h80l459.2-459.2c3.2-3.2 3.2-6.4 3.2-8 0-1.6 0-6.4-3.2-9.6l-62.4-62.4c-3.2-3.2-6.4-3.2-9.6-3.2-1.6 0-6.4 0-8 3.2L224 624V704z m704 155.2c-3.2-16-19.2-27.2-36.8-27.2H132.8c-17.6 0-33.6 11.2-36.8 27.2-3.2 19.2 12.8 36.8 35.2 36.8h761.6c20.8 0 38.4-17.6 35.2-36.8z"></path></svg>`,
  };

  function icon(name, className = "gv-svg-icon") {
    return (ICONS[name] || "").replace("__CLASS__", className);
  }

  const root = document.createElement("div");
  root.id = ROOT_ID;
  root.className = "gv-root-host-hidden";
  root.innerHTML = `
    <div class="gv-shell" data-role="shell">
      <div class="gv-panel" data-role="panel">
        <button
          class="gv-panel-resize-handle gv-panel-resize-handle-top-left"
          type="button"
          data-role="resize-top-left"
          aria-label="从左上角调整大小"
          title="调整大小"
        ><span class="gv-panel-resize-grip" aria-hidden="true"></span></button>
        <button
          class="gv-panel-resize-handle gv-panel-resize-handle-bottom-right"
          type="button"
          data-role="resize-bottom-right"
          aria-label="从右下角调整大小"
          title="调整大小"
        ><span class="gv-panel-resize-grip gv-panel-resize-grip-bottom-right" aria-hidden="true"></span></button>
        <div class="gv-header" data-role="drag-handle">
          <div class="gv-header-main">
            <button class="gv-brand-mark gv-brand-trigger" type="button" data-action="toggle-quick-panel" data-role="quick-trigger" title="设置">
              ${icon("promptLibrary")}
            </button>
            <div class="gv-title-stack">
              <div class="gv-title-row">
                <h2>提示库</h2>
                <span class="gv-badge">v${EXTENSION_VERSION}</span>
              </div>
              <p class="gv-summary" data-role="summary">共 0 条提示</p>
            </div>

            <div class="gv-quick-panel gv-hidden" data-role="quick-panel">
              <section class="gv-quick-section">
                <div class="gv-quick-setting-row">
                  <div class="gv-setting-copy">
                    <strong>隐藏提示词管理器</strong>
                  </div>
                  <button class="gv-switch" type="button" data-action="toggle-auto-hide" data-role="quick-auto-hide-toggle"></button>
                </div>
              </section>

              <section class="gv-quick-section">
                <div class="gv-quick-section-head">
                  <strong>显示范围</strong>
                </div>

                <div class="gv-display-mode-group" data-role="display-mode-group"></div>
              </section>

              <section class="gv-quick-section">
                <div class="gv-quick-section-head">
                  <strong>快捷操作</strong>
                </div>

                <div class="gv-quick-action-stack">
                  <label class="gv-file gv-quick-action">
                    <span class="gv-btn-icon">${icon("import", "gv-svg-icon gv-svg-icon-soft")}</span>
                    <span>导入 JSON</span>
                    <input class="gv-file-input" data-role="quick-import-input" type="file" accept="application/json">
                  </label>
                </div>
              </section>
            </div>
          </div>

          <button class="gv-btn gv-btn-primary gv-header-new" type="button" data-action="new" title="新建提示">
            <span class="gv-btn-icon">${icon("createPrompt", "gv-svg-icon gv-svg-icon-soft")}</span>
            <span class="gv-header-new-label">新建</span>
          </button>
        </div>

        <div class="gv-status gv-hidden" data-role="status" aria-live="polite"></div>

        <div class="gv-toolbar">
          <div class="gv-toolbar-top">
            <input class="gv-search" type="search" data-role="search" placeholder="搜索标题、内容、标签">
            <button class="gv-chip gv-chip-filter" type="button" data-action="filter-favorites" data-role="filter-favorite"></button>
          </div>

          <div class="gv-tag-rail">
            <button class="gv-chip gv-tag-anchor" type="button" data-action="filter-tag" data-value="" data-role="all-tags-chip">全部标签</button>
            <div class="gv-tag-scroll" data-role="tag-scroll"></div>
          </div>
        </div>

        <div class="gv-editor gv-hidden" data-role="editor">
          <div class="gv-editor-head">
            <div>
              <h3 data-role="editor-title">新建提示</h3>
            </div>
          </div>

          <form class="gv-form" data-role="form">
            <label class="gv-field">
              <span>标题</span>
              <input class="gv-input" data-role="title" type="text" maxlength="120" placeholder="例如：ZRO2" required>
            </label>

            <label class="gv-field gv-field-tags">
              <span>标签</span>
              <input class="gv-input" data-role="tags" type="text" placeholder="例如：写作, 翻译, 代码, UI">
              <div class="gv-tag-suggestions gv-hidden" data-role="tag-suggestions"></div>
            </label>

            <label class="gv-field gv-field-content">
              <span>内容</span>
              <textarea class="gv-textarea" data-role="content" placeholder="写入完整提示词，之后就可以直接填入或追加到 ChatGPT 输入框。" required></textarea>
            </label>

            <div class="gv-editor-actions">
              <button class="gv-btn" type="button" data-action="cancel-edit">
                <span class="gv-btn-icon">${icon("closeCircle", "gv-svg-icon gv-svg-icon-soft")}</span>
                <span>取消</span>
              </button>
              <button class="gv-btn gv-btn-primary" type="submit">
                <span class="gv-btn-icon">${icon("save", "gv-svg-icon gv-svg-icon-soft")}</span>
                <span>保存</span>
              </button>
            </div>
          </form>
        </div>

        <div class="gv-list-wrap">
          <div class="gv-list" data-role="list"></div>
        </div>

        <div class="gv-footer">
          <div class="gv-footer-actions">
            <button class="gv-btn gv-btn-footer" type="button" data-action="backup-local" data-role="footer-backup">
              <span class="gv-btn-icon">${icon("archive", "gv-svg-icon gv-svg-icon-soft")}</span>
              <span>本地备份</span>
            </button>
            <button class="gv-btn gv-btn-footer gv-btn-footer-manage" type="button" data-action="open-settings">
              <span class="gv-btn-icon">${icon("settings", "gv-svg-icon gv-svg-icon-soft")}</span>
              <span>管理</span>
            </button>
          </div>
        </div>

        <div class="gv-modal gv-hidden" data-role="delete-modal">
          <div class="gv-modal-card">
            <h3>删除提示</h3>
            <p data-role="delete-message"></p>
            <div class="gv-modal-actions">
              <button class="gv-btn gv-btn-danger" type="button" data-action="confirm-delete">
                <span class="gv-btn-icon">${icon("trash", "gv-svg-icon gv-svg-icon-soft")}</span>
                <span>删除</span>
              </button>
              <button class="gv-btn" type="button" data-action="cancel-delete">
                <span class="gv-btn-icon">${icon("closeCircle", "gv-svg-icon gv-svg-icon-soft")}</span>
                <span>取消</span>
              </button>
            </div>
          </div>
        </div>

        <div class="gv-modal gv-hidden" data-role="import-modal">
          <div class="gv-modal-card">
            <h3>导入提示</h3>
            <p data-role="import-message"></p>
            <div class="gv-modal-actions gv-modal-actions-stack">
              <button class="gv-btn gv-btn-primary" type="button" data-action="import-merge">
                <span>合并并去重</span>
              </button>
              <button class="gv-btn" type="button" data-action="import-replace">
                <span>全部替换</span>
              </button>
              <button class="gv-btn" type="button" data-action="cancel-import">
                <span>取消</span>
              </button>
            </div>
          </div>
        </div>

        <div class="gv-modal gv-hidden" data-role="settings-modal">
          <div class="gv-modal-card gv-modal-card-settings">
            <div class="gv-modal-head">
              <div>
                <h3>库管理</h3>
                <p>导入与窗口恢复。</p>
              </div>
              <button class="gv-icon-btn" type="button" data-action="close-settings" title="关闭管理面板">
                ${icon("closeCircle", "gv-svg-icon gv-svg-icon-soft")}
              </button>
            </div>

            <div class="gv-settings-list">
              <section class="gv-settings-group">
                <div class="gv-settings-group-head">
                  <strong>导入提示</strong>
                  <span>导入 JSON 或本地备份文件。</span>
                </div>
                <div class="gv-setting-row gv-setting-row-actions gv-setting-row-compact">
                  <div class="gv-setting-actions">
                    <label class="gv-file">
                      <span class="gv-btn-icon">${icon("import", "gv-svg-icon gv-svg-icon-soft")}</span>
                      <span>导入 JSON</span>
                      <input class="gv-file-input" data-role="import-input" type="file" accept="application/json">
                    </label>
                  </div>
                </div>
              </section>

              <section class="gv-settings-group">
                <div class="gv-settings-group-head">
                  <strong>窗口恢复</strong>
                  <span>恢复面板大小或位置。</span>
                </div>
                <div class="gv-setting-row gv-setting-row-actions gv-setting-row-compact">
                  <div class="gv-setting-actions">
                    <button class="gv-btn" type="button" data-action="reset-size">
                      <span class="gv-btn-icon">${icon("resetSize", "gv-svg-icon gv-svg-icon-soft")}</span>
                      <span>重置大小</span>
                    </button>
                    <button class="gv-btn" type="button" data-action="reset-position">
                      <span class="gv-btn-icon">${icon("resetPosition", "gv-svg-icon gv-svg-icon-soft")}</span>
                      <span>重置位置</span>
                    </button>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>

      <button class="gv-fab" type="button" data-role="fab" title="打开提示库">
        ${icon("orca", "gv-svg-icon gv-svg-icon-fab-logo")}
      </button>
    </div>
  `;

  document.documentElement.appendChild(root);

  const elements = {
    shell: root.querySelector('[data-role="shell"]'),
    panel: root.querySelector('[data-role="panel"]'),
    resizeTopLeft: root.querySelector('[data-role="resize-top-left"]'),
    resizeBottomRight: root.querySelector('[data-role="resize-bottom-right"]'),
    dragHandle: root.querySelector('[data-role="drag-handle"]'),
    quickTrigger: root.querySelector('[data-role="quick-trigger"]'),
    quickPanel: root.querySelector('[data-role="quick-panel"]'),
    quickAutoHideToggle: root.querySelector('[data-role="quick-auto-hide-toggle"]'),
    displayModeGroup: root.querySelector('[data-role="display-mode-group"]'),
    headerNew: root.querySelector('[data-action="new"]'),
    summary: root.querySelector('[data-role="summary"]'),
    filterFavorite: root.querySelector('[data-role="filter-favorite"]'),
    search: root.querySelector('[data-role="search"]'),
    status: root.querySelector('[data-role="status"]'),
    allTagsChip: root.querySelector('[data-role="all-tags-chip"]'),
    tagRail: root.querySelector('.gv-tag-rail'),
    tagScroll: root.querySelector('[data-role="tag-scroll"]'),
    editor: root.querySelector('[data-role="editor"]'),
    editorTitle: root.querySelector('[data-role="editor-title"]'),
    form: root.querySelector('[data-role="form"]'),
    title: root.querySelector('[data-role="title"]'),
    tags: root.querySelector('[data-role="tags"]'),
    tagSuggestions: root.querySelector('[data-role="tag-suggestions"]'),
    content: root.querySelector('[data-role="content"]'),
    list: root.querySelector('[data-role="list"]'),
    importInput: root.querySelector('[data-role="import-input"]'),
    quickImportInput: root.querySelector('[data-role="quick-import-input"]'),
    deleteModal: root.querySelector('[data-role="delete-modal"]'),
    deleteMessage: root.querySelector('[data-role="delete-message"]'),
    importModal: root.querySelector('[data-role="import-modal"]'),
    importMessage: root.querySelector('[data-role="import-message"]'),
    settingsModal: root.querySelector('[data-role="settings-modal"]'),
    footerBackup: root.querySelector('[data-role="footer-backup"]'),
    fab: root.querySelector('[data-role="fab"]'),
  };

  const resizeObserver = typeof ResizeObserver === "function"
    ? new ResizeObserver((entries) => {
      if (!state.panelOpen || panelResizeState) return;
      const entry = entries[0];
      if (!entry) return;
      const observedSize = getObservedPanelSize(entry);
      const nextSize = clampPanelSize(observedSize.width, observedSize.height);
      if (!sameSize(nextSize, state.panelSize)) {
        state.panelSize = nextSize;
        applyShellPosition();
        schedulePrefsPersist();
      }
    })
    : null;

  if (resizeObserver) {
    resizeObserver.observe(elements.panel);
  }

  if (chrome.runtime?.onMessage) {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      handleRuntimeMessage(message)
        .then((result) => sendResponse({ ok: true, result }))
        .catch((error) => {
          console.error("PromptDock runtime message failed", error);
          sendResponse({ ok: false, error: error?.message || String(error) });
        });
      return true;
    });
  }

  if (chrome.storage?.onChanged) {
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== "local") return;

      if (changes[PREFS_KEY]) {
        const wasHidden = !state.settings.managerVisible;
        applyPrefsPayload(changes[PREFS_KEY].newValue, { preserveWindowState: true });
        if (wasHidden && state.settings.managerVisible) {
          state.panelOpen = true;
        }
        render();
      }

      if (changes[STORAGE_KEY] && Array.isArray(changes[STORAGE_KEY].newValue)) {
        state.items = changes[STORAGE_KEY].newValue.map((item, index) => normalizeItem(item, index)).filter(Boolean);
        render();
      }
    });
  }

  bindEvents();
  loadAll().then(render).catch((error) => {
    console.error("Failed to load prompt library", error);
    showStatus("加载提示库失败，请刷新页面后重试。");
  });

  function getObservedPanelSize(entry) {
    const borderBox = Array.isArray(entry.borderBoxSize)
      ? entry.borderBoxSize[0]
      : entry.borderBoxSize;

    if (
      borderBox &&
      typeof borderBox.inlineSize === "number" &&
      typeof borderBox.blockSize === "number"
    ) {
      return {
        width: borderBox.inlineSize,
        height: borderBox.blockSize,
      };
    }

    return {
      width: elements.panel.offsetWidth,
      height: elements.panel.offsetHeight,
    };
  }

  function isHostMatch(host, expectedHost) {
    return host === expectedHost || host.endsWith(`.${expectedHost}`);
  }

  function normalizeDisplayMode(value) {
    return value === DISPLAY_MODE_ALL ? DISPLAY_MODE_ALL : DISPLAY_MODE_CHATGPT;
  }

  function isDisplayModeAllowed(host, displayMode = state.displayMode) {
    if (displayMode === DISPLAY_MODE_ALL) return true;
    return CHATGPT_HOSTS.some((expectedHost) => isHostMatch(host, expectedHost));
  }

  function shouldShowOnCurrentSite() {
    return state.settings.managerVisible && isDisplayModeAllowed(CURRENT_HOST);
  }

  function applyPrefsPayload(prefs = {}, options = {}) {
    const preserveWindowState = Boolean(options.preserveWindowState);

    if (!preserveWindowState || Object.prototype.hasOwnProperty.call(prefs, "panelOpen")) {
      state.panelOpen = prefs.panelOpen !== false;
    }

    if (!preserveWindowState || prefs.panelSize) {
      state.panelSize = normalizeSize(prefs.panelSize) || getDefaultPanelSize();
    }

    if (!preserveWindowState || prefs.anchorPosition || prefs.shellPosition || prefs.anchorAttachment) {
      state.anchorPosition = normalizeAnchorPosition(
        prefs.anchorPosition,
        prefs.shellPosition,
        state.panelSize,
        prefs.anchorAttachment,
      );
    }

    state.anchorAttachment = normalizeAnchorAttachment(prefs.anchorAttachment)
      || createAnchorAttachment(state.anchorPosition, state.anchorAttachment);

    state.settings = {
      managerVisible:
        prefs.settings?.managerVisible ??
        prefs.settings?.autoHideOnOutside ??
        true,
    };
    if (prefs.displayMode || !preserveWindowState) {
      state.displayMode = normalizeDisplayMode(prefs.displayMode);
    }
  }

  async function loadAll() {
    const result = await chrome.storage.local.get([STORAGE_KEY, PREFS_KEY]);
    const items = Array.isArray(result[STORAGE_KEY]) ? result[STORAGE_KEY] : [];
    const prefs = result[PREFS_KEY] || {};

    state.items = items.map((item, index) => normalizeItem(item, index)).filter(Boolean);
    applyPrefsPayload(prefs);
  }

  async function persistItems() {
    await chrome.storage.local.set({ [STORAGE_KEY]: state.items });
  }

  async function persistPrefs() {
    await chrome.storage.local.set({
      [PREFS_KEY]: {
        panelOpen: state.panelOpen,
        anchorPosition: state.anchorPosition,
        anchorAttachment: state.anchorAttachment,
        panelSize: state.panelSize,
        settings: state.settings,
        displayMode: state.displayMode,
      },
    });
  }

  function schedulePrefsPersist() {
    if (prefsTimer) clearTimeout(prefsTimer);
    prefsTimer = window.setTimeout(() => {
      prefsTimer = null;
      persistPrefs().catch(() => {});
    }, 180);
  }

  function scheduleTouchPersist() {
    if (touchPersistTimer) clearTimeout(touchPersistTimer);
    touchPersistTimer = window.setTimeout(() => {
      touchPersistTimer = null;
      persistItems().catch(() => {});
    }, 220);
  }

  function bindEvents() {
    root.addEventListener("click", async (event) => {
      const actionTarget = event.target.closest("[data-action]");
      if (actionTarget) {
        const action = actionTarget.dataset.action;

        if (action === "toggle-panel") {
          if (actionTarget === elements.fab && suppressFabToggle) {
            suppressFabToggle = false;
            return;
          }

          await togglePanelVisibility();
          return;
        }

        if (action === "toggle-quick-panel") {
          state.quickPanelOpen = !state.quickPanelOpen;
          if (state.quickPanelOpen) {
            state.settingsOpen = false;
          }
          renderQuickPanel();
          renderPanelState();
          return;
        }

        if (action === "new") {
          if (state.editorOpen) return;
          if (actionTarget === elements.headerNew && elements.headerNew.disabled) return;
          state.quickPanelOpen = false;
          openEditor();
          return;
        }

        if (action === "cancel-edit") {
          closeEditor();
          return;
        }

        if (action === "backup-local") {
          await backupItems();
          return;
        }

        if (action === "export-json") {
          exportItems();
          return;
        }

        if (action === "open-settings") {
          state.settingsOpen = true;
          state.quickPanelOpen = false;
          renderSettings();
          renderQuickPanel();
          return;
        }

        if (action === "close-settings") {
          state.settingsOpen = false;
          renderSettings();
          return;
        }

        if (action === "toggle-auto-hide") {
          state.settings.managerVisible = !state.settings.managerVisible;
          if (!state.settings.managerVisible) {
            state.quickPanelOpen = false;
            state.settingsOpen = false;
            state.panelOpen = false;
          }
          renderQuickPanel();
          await persistPrefs();
          render();
          return;
        }

        if (action === "select-display-mode") {
          const nextMode = normalizeDisplayMode(actionTarget.dataset.mode);
          if (nextMode === state.displayMode) return;
          state.displayMode = nextMode;
          await persistPrefs();
          renderQuickPanel();
          render();
          showStatus(
            state.displayMode === DISPLAY_MODE_ALL
              ? "已切换为全浏览器显示。"
              : "已切换为仅在 ChatGPT 显示。",
            true,
          );
          return;
        }

        if (action === "reset-size") {
          state.panelSize = getDefaultPanelSize();
          applyPanelSize();
          applyShellPosition();
          state.quickPanelOpen = false;
          renderQuickPanel();
          await persistPrefs();
          showStatus("已恢复默认面板大小。", true);
          return;
        }

        if (action === "reset-position") {
          state.anchorPosition = null;
          state.anchorAttachment = null;
          applyShellPosition();
          state.quickPanelOpen = false;
          renderQuickPanel();
          await persistPrefs();
          showStatus("已恢复默认面板位置。", true);
          return;
        }

        if (action === "filter-favorites") {
          state.favoritesOnly = !state.favoritesOnly;
          render();
          return;
        }

        if (action === "filter-tag") {
          state.activeTag = actionTarget.dataset.value || "";
          render();
          return;
        }

        if (action === "pick-tag") {
          applySuggestedTag(actionTarget.dataset.value || "");
          return;
        }

        if (action === "toggle-lines") {
          const id = actionTarget.dataset.id;
          if (!id) return;
          toggleExpanded(id);
          renderList();
          return;
        }

        if (action === "cancel-delete") {
          hideDeleteModal();
          return;
        }

        if (action === "confirm-delete") {
          await confirmDelete();
          return;
        }

        if (action === "cancel-import") {
          hideImportModal();
          return;
        }

        if (action === "import-merge") {
          await confirmImport("merge");
          return;
        }

        if (action === "import-replace") {
          await confirmImport("replace");
          return;
        }

        const id = actionTarget.dataset.id;
        if (!id) return;
        await handleItemAction(action, id);
        return;
      }

      if (event.target.closest("button, input, textarea, label")) return;
      if (window.getSelection()?.toString().trim()) return;
    });

    elements.dragHandle.addEventListener("mousedown", (event) => {
      if (event.button !== 0) return;
      if (event.target.closest("button, input, textarea, label")) return;
      if (event.target.closest('[data-role="quick-panel"]')) return;
      startShellDrag(event);
    });

    elements.fab.addEventListener("mousedown", (event) => {
      if (event.button !== 0) return;
      pendingFabToggle = true;
      startAnchorDrag(event);
    });

    elements.fab.addEventListener("click", async (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (suppressFabToggle) {
        suppressFabToggle = false;
        return;
      }
    });

    const handleSearchInput = () => {
      state.searchTerm = normalizeSearchText(elements.search.value);
      renderList();
      renderSummary();
    };

    elements.search.addEventListener("input", handleSearchInput);
    elements.search.addEventListener("change", handleSearchInput);
    elements.search.addEventListener("search", handleSearchInput);
    elements.search.addEventListener("compositionend", handleSearchInput);

    elements.tags.addEventListener("focus", () => {
      state.tagSuggestionsOpen = true;
      clearTagSuggestionsTimer();
      renderTagSuggestions();
    });
    elements.tags.addEventListener("input", renderTagSuggestions);
    elements.tags.addEventListener("blur", scheduleHideTagSuggestions);
    elements.tags.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        hideTagSuggestions();
      }
    });

    elements.tagSuggestions.addEventListener("mousedown", (event) => {
      event.preventDefault();
      clearTagSuggestionsTimer();
    });

    elements.form.addEventListener("submit", async (event) => {
      event.preventDefault();
      await saveItem();
    });

    elements.importInput.addEventListener("change", async (event) => {
      await importItems(event);
    });
    elements.quickImportInput.addEventListener("change", async (event) => {
      await importItems(event);
    });

    const handleTagRailWheel = (event) => {
      if (!event.target.closest(".gv-tag-rail")) return;
      if (elements.tagScroll.scrollWidth <= elements.tagScroll.clientWidth + 1) return;
      const dominantDelta = Math.abs(event.deltaY) >= Math.abs(event.deltaX) ? event.deltaY : event.deltaX;
      if (!dominantDelta) return;
      const deltaFactor = event.deltaMode === WheelEvent.DOM_DELTA_LINE ? 16 : event.deltaMode === WheelEvent.DOM_DELTA_PAGE ? 72 : 1;
      elements.tagScroll.scrollLeft += dominantDelta * deltaFactor * 1.4;
      event.preventDefault();
      event.stopPropagation();
    };

    elements.tagRail.addEventListener("wheel", handleTagRailWheel, { passive: false, capture: true });
    elements.tagScroll.addEventListener("wheel", handleTagRailWheel, { passive: false, capture: true });
    elements.resizeTopLeft?.addEventListener("mousedown", (event) => startPanelResize(event, "top-left"));
    elements.resizeBottomRight?.addEventListener("mousedown", (event) => startPanelResize(event, "bottom-right"));

    const handleViewportResize = () => {
      state.panelSize = clampPanelSize(state.panelSize.width, state.panelSize.height);
      applyPanelSize();
      applyShellPosition();
      scheduleCardTagFit();
      schedulePrefsPersist();
    };

    window.addEventListener("resize", handleViewportResize);
    document.addEventListener("fullscreenchange", handleViewportResize);

    document.addEventListener("pointerdown", (event) => {
      if (!event.isPrimary) return;
      const clickedInside = root.contains(event.target);
      if (clickedInside) return;

      let changed = false;

      if (state.panelOpen) {
        state.panelOpen = false;
        state.settingsOpen = false;
        state.quickPanelOpen = false;
        changed = true;
      }

      if (state.quickPanelOpen) {
        state.quickPanelOpen = false;
        changed = true;
      }

      if (changed) {
        hideTagSuggestions();
        hideDeleteModal();
        hideImportModal();
        renderQuickPanel();
        renderPanelState({ animate: true });
        renderSettings();
        schedulePrefsPersist();
      }
    });
  }

  function startShellDrag(event) {
    const rect = elements.shell.getBoundingClientRect();
    elements.shell.classList.add("gv-shell-interacting");
    dragState = {
      kind: "shell",
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
      startX: event.clientX,
      startY: event.clientY,
      moved: false,
      lastPlacement: state.panelOpen
        ? getPanelPlacement(state.anchorPosition || getDefaultAnchorPosition())
        : null,
    };
    document.addEventListener("mousemove", handleDragMove);
    document.addEventListener("mouseup", handleDragEnd, { once: true });
  }

  function startAnchorDrag(event) {
    event.preventDefault();
    event.stopPropagation();
    const anchor = state.anchorPosition || getDefaultAnchorPosition();
    dragState = {
      kind: "anchor",
      offsetX: event.clientX - anchor.x,
      offsetY: event.clientY - anchor.y,
      startX: event.clientX,
      startY: event.clientY,
      moved: false,
      lastPlacement: state.panelOpen
        ? getPanelPlacement(anchor)
        : null,
    };
    document.addEventListener("mousemove", handleDragMove);
    document.addEventListener("mouseup", handleDragEnd, { once: true });
  }

  function handleDragMove(event) {
    if (!dragState) return;

    dragMoveEvent = event;
    if (dragMoveFrame) return;
    dragMoveFrame = window.requestAnimationFrame(() => {
      dragMoveFrame = 0;
      const nextEvent = dragMoveEvent;
      dragMoveEvent = null;
      if (!nextEvent || !dragState) return;
      applyDragMove(nextEvent);
    });
  }

  function applyDragMove(event) {
    if (!dragState) return;

    if (
      Math.abs(event.clientX - dragState.startX) > FAB_DRAG_THRESHOLD ||
      Math.abs(event.clientY - dragState.startY) > FAB_DRAG_THRESHOLD
    ) {
      dragState.moved = true;
    }

    let rawAnchor;
    if (dragState.kind === "shell") {
      const placement = dragState.lastPlacement || getPanelPlacement(state.anchorPosition || getDefaultAnchorPosition());
      const offsets = getShellOffsets(placement);
      rawAnchor = {
        x: event.clientX - dragState.offsetX + offsets.x,
        y: event.clientY - dragState.offsetY + offsets.y,
      };
    } else {
      rawAnchor = {
        x: event.clientX - dragState.offsetX,
        y: event.clientY - dragState.offsetY,
      };
    }

    if (!state.panelOpen) {
      state.anchorPosition = clampAnchorPosition(rawAnchor.x, rawAnchor.y);
      state.anchorAttachment = createAnchorAttachment(state.anchorPosition, state.anchorAttachment);
      applyShellPosition();
      return;
    }

    const previousPlacement = dragState.lastPlacement || getPanelPlacement(state.anchorPosition || getDefaultAnchorPosition());
    const stablePlacement = getStablePanelPlacement(rawAnchor, previousPlacement);
    const bounds = getAnchorBounds(stablePlacement);
    state.anchorPosition = {
      x: Math.min(Math.max(bounds.minX, rawAnchor.x), bounds.maxX),
      y: Math.min(Math.max(bounds.minY, rawAnchor.y), bounds.maxY),
    };
    dragState.lastPlacement = getStablePanelPlacement(state.anchorPosition, stablePlacement);

    const offsets = getShellOffsets(dragState.lastPlacement);
    applyShellPlacement(dragState.lastPlacement);
    elements.shell.style.left = `${state.anchorPosition.x - offsets.x}px`;
    elements.shell.style.top = `${state.anchorPosition.y - offsets.y}px`;
    elements.shell.style.right = "auto";
    elements.shell.style.bottom = "auto";
  }

  async function handleDragEnd() {
    const completedDragState = dragState;
    document.removeEventListener("mousemove", handleDragMove);
    if (dragMoveFrame) {
      cancelAnimationFrame(dragMoveFrame);
      dragMoveFrame = 0;
    }
    dragMoveEvent = null;

    if (completedDragState?.kind === "anchor" && completedDragState.moved) {
      suppressFabToggle = true;
    }

    if (state.anchorPosition) {
      const snappedAnchor = getSnappedAnchorPosition(
        state.anchorPosition,
        state.panelOpen ? completedDragState?.lastPlacement || getPanelPlacement(state.anchorPosition) : null,
      );
      state.anchorPosition = snappedAnchor;
      state.anchorAttachment = createAnchorAttachment(snappedAnchor, state.anchorAttachment);
    }

    dragState = null;
    elements.shell.classList.remove("gv-shell-interacting");
    applyShellPosition();
    if (completedDragState?.kind === "anchor" && !completedDragState.moved && pendingFabToggle) {
      suppressFabToggle = true;
      pendingFabToggle = false;
      await togglePanelVisibility();
      await persistPrefs();
      return;
    }
    pendingFabToggle = false;
    await persistPrefs();
  }

  function startPanelResize(event, cornerName) {
    event.preventDefault();
    event.stopPropagation();

    const placement = getPanelPlacement(state.anchorPosition || getDefaultAnchorPosition());
    const rect = elements.panel.getBoundingClientRect();

    panelResizeState = {
      placement,
      corner: parseResizeCorner(cornerName),
      rect: {
        left: rect.left,
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom,
      },
    };

    elements.panel.classList.add("gv-panel-resizing");
    elements.shell.classList.add("gv-shell-interacting");
    document.addEventListener("mousemove", handlePanelResizeMove);
    document.addEventListener("mouseup", handlePanelResizeEnd, { once: true });
  }

  function handlePanelResizeMove(event) {
    if (!panelResizeState) return;

    panelResizeEvent = event;
    if (panelResizeFrame) return;
    panelResizeFrame = window.requestAnimationFrame(() => {
      panelResizeFrame = 0;
      const nextEvent = panelResizeEvent;
      panelResizeEvent = null;
      if (!nextEvent || !panelResizeState) return;
      applyPanelResizeMove(nextEvent);
    });
  }

  function applyPanelResizeMove(event) {
    if (!panelResizeState) return;

    const { rect, corner, placement } = panelResizeState;
    let width = state.panelSize.width;
    let height = state.panelSize.height;
    let shellLeft = rect.left;
    let shellTop = rect.top;

    if (corner.horizontal === "right") {
      width = event.clientX - rect.left;
      shellLeft = rect.left;
    } else {
      width = rect.right - event.clientX;
      shellLeft = rect.right - width;
    }

    if (corner.vertical === "bottom") {
      height = event.clientY - rect.top;
      shellTop = rect.top;
    } else {
      height = rect.bottom - event.clientY;
      shellTop = rect.bottom - height;
    }

    const nextSize = clampPanelSize(width, height);
    if (corner.horizontal === "left") {
      shellLeft = rect.right - nextSize.width;
    }
    if (corner.vertical === "top") {
      shellTop = rect.bottom - nextSize.height;
    }

    state.panelSize = nextSize;
    const offsets = getShellOffsets(placement, nextSize);
    state.anchorPosition = {
      x: shellLeft + offsets.x,
      y: shellTop + offsets.y,
    };
    state.anchorAttachment = createAnchorAttachment(state.anchorPosition, state.anchorAttachment);
    applyPanelSize();
    applyShellPlacement(placement);
    elements.shell.style.left = `${shellLeft}px`;
    elements.shell.style.top = `${shellTop}px`;
    elements.shell.style.right = "auto";
    elements.shell.style.bottom = "auto";
  }

  async function handlePanelResizeEnd() {
    document.removeEventListener("mousemove", handlePanelResizeMove);
    if (panelResizeFrame) {
      cancelAnimationFrame(panelResizeFrame);
      panelResizeFrame = 0;
    }
    panelResizeEvent = null;
    elements.panel.classList.remove("gv-panel-resizing");
    elements.shell.classList.remove("gv-shell-interacting");
    panelResizeState = null;
    applyShellPosition();
    scheduleCardTagFit();
    await persistPrefs();
  }

  async function togglePanelVisibility() {
    state.panelOpen = !state.panelOpen;
    state.settingsOpen = false;
    state.quickPanelOpen = false;
    hideDeleteModal();
    hideImportModal();
    renderQuickPanel();
    renderSettings();
    renderPanelState({ animate: true });
    if (state.panelOpen) {
      applyShellPosition();
    }
    schedulePrefsPersist();
  }

  function getDefaultAnchorPosition() {
    return clampAnchorPosition(
      window.innerWidth - FAB_SIZE - 18,
      window.innerHeight - FAB_SIZE - 18,
    );
  }

  function getPanelPlacement(anchor) {
    const leftSpace = anchor.x;
    const rightSpace = window.innerWidth - (anchor.x + FAB_SIZE);
    const topSpace = anchor.y;
    const bottomSpace = window.innerHeight - (anchor.y + FAB_SIZE);

    return {
      horizontal: rightSpace >= leftSpace ? "right" : "left",
      vertical: bottomSpace >= topSpace ? "down" : "up",
    };
  }

  function getStablePanelPlacement(anchor, previousPlacement) {
    const fallbackPlacement = previousPlacement || getPanelPlacement(anchor);
    const leftSpace = anchor.x;
    const rightSpace = window.innerWidth - (anchor.x + FAB_SIZE);
    const topSpace = anchor.y;
    const bottomSpace = window.innerHeight - (anchor.y + FAB_SIZE);
    const switchThreshold = 64;

    let horizontal = fallbackPlacement.horizontal;
    let vertical = fallbackPlacement.vertical;

    if (horizontal === "right") {
      if (leftSpace - rightSpace > switchThreshold) {
        horizontal = "left";
      }
    } else if (rightSpace - leftSpace > switchThreshold) {
      horizontal = "right";
    }

    if (vertical === "down") {
      if (topSpace - bottomSpace > switchThreshold) {
        vertical = "up";
      }
    } else if (bottomSpace - topSpace > switchThreshold) {
      vertical = "down";
    }

    return { horizontal, vertical };
  }

  function getShellOffsets(
    placement = getPanelPlacement(state.anchorPosition || getDefaultAnchorPosition()),
    size = state.panelSize,
  ) {
    if (!state.panelOpen) {
      return { x: 0, y: 0 };
    }

    return {
      x: placement.horizontal === "left" ? size.width - FAB_SIZE : 0,
      y: placement.vertical === "up" ? size.height + SHELL_GAP : 0,
    };
  }

  function getAnchorBounds(placement) {
    if (!state.panelOpen) {
      return {
        minX: 8,
        minY: 8,
        maxX: Math.max(8, window.innerWidth - FAB_SIZE - 8),
        maxY: Math.max(8, window.innerHeight - FAB_SIZE - 8),
      };
    }

    const minX = placement.horizontal === "left"
      ? 8 + state.panelSize.width - FAB_SIZE
      : 8;
    const maxX = placement.horizontal === "left"
      ? window.innerWidth - FAB_SIZE - 8
      : window.innerWidth - state.panelSize.width - 8;
    const minY = placement.vertical === "up"
      ? 8 + state.panelSize.height + SHELL_GAP
      : 8;
    const maxY = placement.vertical === "up"
      ? window.innerHeight - FAB_SIZE - 8
      : window.innerHeight - (state.panelSize.height + SHELL_GAP + FAB_SIZE) - 8;

    return {
      minX,
      minY,
      maxX: Math.max(minX, maxX),
      maxY: Math.max(minY, maxY),
    };
  }

  function createAnchorAttachment(anchor, previousAttachment = null) {
    if (!anchor || typeof anchor.x !== "number" || typeof anchor.y !== "number") {
      return null;
    }

    const normalizedPrevious = normalizeAnchorAttachment(previousAttachment);
    const leftOffset = Math.max(0, Math.round(anchor.x));
    const rightOffset = Math.max(0, Math.round(window.innerWidth - FAB_SIZE - anchor.x));
    const topOffset = Math.max(0, Math.round(anchor.y));
    const bottomOffset = Math.max(0, Math.round(window.innerHeight - FAB_SIZE - anchor.y));
    const horizontalDistance = Math.abs(rightOffset - leftOffset);
    const verticalDistance = Math.abs(bottomOffset - topOffset);

    let horizontal = rightOffset < leftOffset ? "right" : "left";
    let vertical = bottomOffset < topOffset ? "bottom" : "top";

    if (normalizedPrevious?.horizontal && horizontalDistance <= ATTACHMENT_STABILITY_THRESHOLD) {
      horizontal = normalizedPrevious.horizontal;
    }

    if (normalizedPrevious?.vertical && verticalDistance <= ATTACHMENT_STABILITY_THRESHOLD) {
      vertical = normalizedPrevious.vertical;
    }

    return {
      horizontal,
      vertical,
      horizontalOffset: horizontal === "right" ? rightOffset : leftOffset,
      verticalOffset: vertical === "bottom" ? bottomOffset : topOffset,
    };
  }

  function normalizeAnchorAttachment(anchorAttachment) {
    if (!anchorAttachment || typeof anchorAttachment !== "object") {
      return null;
    }

    const horizontal = anchorAttachment.horizontal === "right"
      ? "right"
      : anchorAttachment.horizontal === "left"
        ? "left"
        : null;
    const vertical = anchorAttachment.vertical === "bottom"
      ? "bottom"
      : anchorAttachment.vertical === "top"
        ? "top"
        : null;
    const horizontalOffset = Number(anchorAttachment.horizontalOffset);
    const verticalOffset = Number(anchorAttachment.verticalOffset);

    if (!horizontal || !vertical || !Number.isFinite(horizontalOffset) || !Number.isFinite(verticalOffset)) {
      return null;
    }

    return {
      horizontal,
      vertical,
      horizontalOffset: Math.max(0, Math.round(horizontalOffset)),
      verticalOffset: Math.max(0, Math.round(verticalOffset)),
    };
  }

  function getAnchorPositionFromAttachment(anchorAttachment) {
    const normalized = normalizeAnchorAttachment(anchorAttachment);
    if (!normalized) return null;

    return {
      x: normalized.horizontal === "right"
        ? window.innerWidth - FAB_SIZE - normalized.horizontalOffset
        : normalized.horizontalOffset,
      y: normalized.vertical === "bottom"
        ? window.innerHeight - FAB_SIZE - normalized.verticalOffset
        : normalized.verticalOffset,
    };
  }

  function getSnappedAnchorPosition(anchor, placement) {
    const bounds = getAnchorBounds(placement || getPanelPlacement(anchor));
    const nextAnchor = { ...anchor };

    if (Math.abs(nextAnchor.x - bounds.minX) <= EDGE_SNAP_THRESHOLD) {
      nextAnchor.x = bounds.minX;
    } else if (Math.abs(bounds.maxX - nextAnchor.x) <= EDGE_SNAP_THRESHOLD) {
      nextAnchor.x = bounds.maxX;
    }

    if (Math.abs(nextAnchor.y - bounds.minY) <= EDGE_SNAP_THRESHOLD) {
      nextAnchor.y = bounds.minY;
    } else if (Math.abs(bounds.maxY - nextAnchor.y) <= EDGE_SNAP_THRESHOLD) {
      nextAnchor.y = bounds.maxY;
    }

    return nextAnchor;
  }

  function normalizeAnchorPosition(anchorPosition, shellPosition, size, anchorAttachment) {
    const attachedAnchor = getAnchorPositionFromAttachment(anchorAttachment);
    if (attachedAnchor) {
      return attachedAnchor;
    }

    if (
      anchorPosition &&
      typeof anchorPosition.x === "number" &&
      typeof anchorPosition.y === "number"
    ) {
      return anchorPosition;
    }

    if (
      shellPosition &&
      typeof shellPosition.x === "number" &&
      typeof shellPosition.y === "number"
    ) {
      return {
        x: shellPosition.x + size.width - FAB_SIZE,
        y: shellPosition.y + size.height + SHELL_GAP,
      };
    }

    return null;
  }

  function normalizeSize(size) {
    if (
      !size ||
      typeof size.width !== "number" ||
      typeof size.height !== "number"
    ) {
      return null;
    }

    return clampPanelSize(size.width, size.height);
  }

  function getDefaultPanelSize() {
    return clampPanelSize(DEFAULT_PANEL_SIZE.width, DEFAULT_PANEL_SIZE.height);
  }

  function clampPanelSize(width, height) {
    const minWidth = Math.min(MIN_PANEL_SIZE.width, Math.max(280, window.innerWidth - 24));
    const minHeight = Math.min(
      MIN_PANEL_SIZE.height,
      Math.max(420, window.innerHeight - FAB_SIZE - SHELL_GAP - 24),
    );
    const maxWidth = Math.max(minWidth, window.innerWidth - 16);
    const maxHeight = Math.max(
      minHeight,
      window.innerHeight - FAB_SIZE - SHELL_GAP - 16,
    );

    return {
      width: Math.round(Math.min(Math.max(minWidth, width), maxWidth)),
      height: Math.round(Math.min(Math.max(minHeight, height), maxHeight)),
    };
  }

  function clampAnchorPosition(x, y) {
    let anchor = { x, y };
    let placement = getPanelPlacement(anchor);

    for (let i = 0; i < 2; i += 1) {
      const bounds = getAnchorBounds(placement);
      anchor = {
        x: Math.min(Math.max(bounds.minX, anchor.x), bounds.maxX),
        y: Math.min(Math.max(bounds.minY, anchor.y), bounds.maxY),
      };

      const nextPlacement = getPanelPlacement(anchor);
      if (
        nextPlacement.horizontal === placement.horizontal &&
        nextPlacement.vertical === placement.vertical
      ) {
        break;
      }

      placement = nextPlacement;
    }

    return anchor;
  }

  function sameSize(nextSize, prevSize) {
    return nextSize?.width === prevSize?.width && nextSize?.height === prevSize?.height;
  }

  function applyPanelSize() {
    state.panelSize = clampPanelSize(state.panelSize.width, state.panelSize.height);
    elements.panel.style.width = `${state.panelSize.width}px`;
    elements.panel.style.height = `${state.panelSize.height}px`;
  }

  function applyShellPlacement(placement) {
    elements.shell.classList.toggle("gv-shell-expand-left", placement.horizontal === "left");
    elements.shell.classList.toggle("gv-shell-expand-right", placement.horizontal === "right");
    elements.shell.classList.toggle("gv-shell-expand-up", placement.vertical === "up");
    elements.shell.classList.toggle("gv-shell-expand-down", placement.vertical === "down");

    const originX = placement.horizontal === "left" ? "100%" : "0%";
    const originY = placement.vertical === "up" ? "100%" : "0%";
    elements.panel.style.transformOrigin = `${originX} ${originY}`;
  }

  function parseResizeCorner(cornerName) {
    const normalized = String(cornerName || "bottom-right").toLowerCase();
    const [vertical = "bottom", horizontal = "right"] = normalized.split("-");
    return {
      horizontal: horizontal === "left" ? "left" : "right",
      vertical: vertical === "top" ? "top" : "bottom",
    };
  }

  async function handleRuntimeMessage(message) {
    switch (message?.type) {
      case "zro2-open-panel":
        state.panelOpen = true;
        state.quickPanelOpen = false;
        render();
        await persistPrefs();
        return true;
      case "zro2-open-settings":
        state.panelOpen = true;
        state.settingsOpen = true;
        state.quickPanelOpen = false;
        render();
        await persistPrefs();
        return true;
      case "zro2-reset-size":
        state.panelSize = getDefaultPanelSize();
        applyPanelSize();
        applyShellPosition();
        await persistPrefs();
        return true;
      case "zro2-reset-position":
        state.anchorPosition = null;
        state.anchorAttachment = null;
        applyShellPosition();
        await persistPrefs();
        return true;
      case "zro2-sync-prefs":
        if (message.payload) {
          const wasHidden = !state.settings.managerVisible;
          applyPrefsPayload(message.payload, { preserveWindowState: true });
          if (wasHidden && state.settings.managerVisible) {
            state.panelOpen = true;
          }
          render();
        }
        return true;
      case "zro2-sync-items":
        if (Array.isArray(message.payload)) {
          state.items = message.payload.map(normalizeItem).filter(Boolean);
          render();
        }
        return true;
      default:
        return false;
    }
  }

  function animatePanelOpen(placement) {
    if (typeof elements.panel.animate !== "function") return;

    const offsetX = placement.horizontal === "left" ? 18 : -18;
    const offsetY = placement.vertical === "up" ? 18 : -18;

    elements.panel.animate(
      [
        {
          opacity: 0,
          transform: `translate(${offsetX}px, ${offsetY}px) scale(0.985)`,
        },
        {
          opacity: 1,
          transform: "translate(0, 0) scale(1)",
        },
      ],
      {
        duration: 190,
        easing: "cubic-bezier(0.22, 1, 0.36, 1)",
      },
    );
  }

  function animatePanelClose(placement) {
    if (typeof elements.panel.animate !== "function") return null;

    const offsetX = placement.horizontal === "left" ? 12 : -12;
    const offsetY = placement.vertical === "up" ? 12 : -12;

    return elements.panel.animate(
      [
        {
          opacity: 1,
          transform: "translate(0, 0) scale(1)",
        },
        {
          opacity: 0,
          transform: `translate(${offsetX}px, ${offsetY}px) scale(0.99)`,
        },
      ],
      {
        duration: 150,
        easing: "cubic-bezier(0.22, 1, 0.36, 1)",
      },
    );
  }

  function applyShellPosition() {
    const existingAttachment = normalizeAnchorAttachment(state.anchorAttachment);
    const currentAnchor =
      getAnchorPositionFromAttachment(existingAttachment)
      || state.anchorPosition
      || getDefaultAnchorPosition();
    const anchor = clampAnchorPosition(currentAnchor.x, currentAnchor.y);
    const placement = getPanelPlacement(anchor);
    const offsets = getShellOffsets(placement);

    state.anchorPosition = anchor;
    state.anchorAttachment = existingAttachment || createAnchorAttachment(anchor, state.anchorAttachment);
    applyShellPlacement(placement);
    elements.shell.style.left = `${anchor.x - offsets.x}px`;
    elements.shell.style.top = `${anchor.y - offsets.y}px`;
    elements.shell.style.right = "auto";
    elements.shell.style.bottom = "auto";
  }

  function render() {
    root.classList.toggle("gv-root-host-hidden", !shouldShowOnCurrentSite());
    if (!shouldShowOnCurrentSite()) {
      state.quickPanelOpen = false;
      state.settingsOpen = false;
    }
    applyPanelSize();
    renderPanelState();
    renderSummary();
    renderFavoriteFilter();
    renderTagFilters();
    renderSettings();
    renderQuickPanel();
    renderList();
    renderImportModal();
    if (state.tagSuggestionsOpen) {
      renderTagSuggestions();
    } else {
      hideTagSuggestions();
    }
    applyShellPosition();
  }

  function renderPanelState(options = {}) {
    const animate = Boolean(options.animate);
    const wasOpen = previousPanelOpen;
    if (!state.panelOpen) {
      state.quickPanelOpen = false;
    }
    elements.panel.classList.toggle("gv-panel-editor-open", state.editorOpen);
    elements.panel.classList.toggle("gv-panel-with-quick-panel", state.quickPanelOpen);
    renderHeaderPrimaryAction();
    elements.fab.classList.toggle("gv-fab-active", state.panelOpen);
    elements.fab.title = state.panelOpen ? "收起提示库" : "打开提示库";

    syncPanelVisibility({ wasOpen, animate });

    if (state.panelOpen && !wasOpen && !animate) {
      const placement = getPanelPlacement(state.anchorPosition || getDefaultAnchorPosition());
      applyShellPlacement(placement);
    }

    previousPanelOpen = state.panelOpen;
  }

  function syncPanelVisibility({ wasOpen = previousPanelOpen, animate = false } = {}) {
    if (typeof elements.panel.getAnimations === "function") {
      elements.panel.getAnimations().forEach((animation) => animation.cancel());
    }
    if (closingPanelAnimation) {
      closingPanelAnimation.cancel();
      closingPanelAnimation = null;
    }

    elements.panel.style.opacity = "";
    elements.panel.style.transform = "";

    if (state.panelOpen) {
      elements.panel.classList.remove("gv-hidden");
      if (!wasOpen && animate) {
        const placement = getPanelPlacement(state.anchorPosition || getDefaultAnchorPosition());
        applyShellPlacement(placement);
        animatePanelOpen(placement);
      }
      return;
    }

    if (elements.panel.classList.contains("gv-hidden")) {
      return;
    }

    if (!animate || typeof elements.panel.animate !== "function") {
      elements.panel.classList.add("gv-hidden");
      return;
    }

    const placement = getPanelPlacement(state.anchorPosition || getDefaultAnchorPosition());
    const animation = animatePanelClose(placement);
    if (!animation) {
      elements.panel.classList.add("gv-hidden");
      applyShellPosition();
      return;
    }

    closingPanelAnimation = animation;
    animation.finished
      .catch(() => {})
      .then(() => {
        if (state.panelOpen) return;
        elements.panel.style.opacity = "";
        elements.panel.style.transform = "";
        elements.panel.classList.add("gv-hidden");
        closingPanelAnimation = null;
        applyShellPosition();
      });
  }

  function renderHeaderPrimaryAction() {
    const isEmptyOnboarding = state.items.length === 0 && !state.editorOpen;
    const isDisabled = state.editorOpen || isEmptyOnboarding;

    elements.headerNew.disabled = isDisabled;
    elements.headerNew.setAttribute("aria-disabled", String(isDisabled));
    elements.headerNew.classList.toggle("gv-header-new-disabled", isEmptyOnboarding);

    if (state.editorOpen) {
      elements.headerNew.title = "请先保存或取消当前编辑";
      return;
    }

    elements.headerNew.title = isEmptyOnboarding
      ? "请使用中间区域创建第一条提示"
      : "新建提示";
  }

  function renderSummary() {
    const totalCount = state.items.length;
    const favoriteCount = state.items.filter((item) => item.favorite).length;
    elements.summary.textContent = `共 ${totalCount} 条提示，${favoriteCount} 条收藏`;
  }

  function renderFavoriteFilter() {
    elements.filterFavorite.classList.toggle("gv-chip-active", state.favoritesOnly);
    elements.filterFavorite.setAttribute("aria-pressed", String(state.favoritesOnly));
    elements.filterFavorite.innerHTML = `<span class="gv-btn-icon">${
      icon(state.favoritesOnly ? "starFilled" : "star", "gv-svg-icon gv-svg-icon-soft")
    }</span><span>${state.favoritesOnly ? "仅看收藏" : "收藏"}</span>`;
  }

  function renderTagFilters() {
    const tags = [...new Set(state.items.flatMap((item) => item.tags))]
      .sort((a, b) => a.localeCompare(b, "zh-CN"));
    const previousScrollLeft = elements.tagScroll.scrollLeft;

    elements.allTagsChip.className = `gv-chip gv-tag-anchor${
      state.activeTag === "" ? " gv-chip-active" : ""
    }`;
    elements.allTagsChip.textContent = "全部标签";
    elements.tagScroll.replaceChildren(...tags.map((tag) => createTagChip(tag, tag)));

    const maxScrollLeft = Math.max(0, elements.tagScroll.scrollWidth - elements.tagScroll.clientWidth);
    const nextScrollLeft = Math.min(previousScrollLeft, maxScrollLeft);
    elements.tagScroll.scrollLeft = nextScrollLeft;
    window.requestAnimationFrame(() => {
      elements.tagScroll.scrollLeft = nextScrollLeft;
    });
  }

  function renderSettings() {
    elements.settingsModal.classList.toggle("gv-hidden", !state.settingsOpen);
  }

  function renderQuickPanel() {
    elements.quickPanel.classList.toggle("gv-hidden", !state.quickPanelOpen);
    syncSwitchButton(elements.quickAutoHideToggle, state.settings.managerVisible);
    elements.displayModeGroup.replaceChildren(
      createDisplayModeButton("仅在 ChatGPT 显示", DISPLAY_MODE_CHATGPT),
      createDisplayModeButton("全浏览器显示", DISPLAY_MODE_ALL),
    );
  }

  function syncSwitchButton(element, isActive) {
    if (!element) return;
    element.textContent = isActive ? "开启" : "关闭";
    element.classList.toggle("gv-switch-active", isActive);
    element.setAttribute("aria-pressed", String(isActive));
    element.setAttribute("aria-checked", String(isActive));
    element.setAttribute("role", "switch");
  }

  function createDisplayModeButton(label, mode) {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.action = "select-display-mode";
    button.dataset.mode = mode;
    button.className = `gv-display-mode-button${state.displayMode === mode ? " gv-display-mode-button-active" : ""}`;
    button.textContent = label;
    button.setAttribute("aria-pressed", String(state.displayMode === mode));
    return button;
  }

  function renderImportModal() {
    elements.importModal.classList.toggle("gv-hidden", !state.importModalOpen);
    if (!state.importModalOpen) {
      elements.importMessage.textContent = "";
      return;
    }

    const count = state.pendingImportItems.length;
    elements.importMessage.textContent =
      `检测到 ${count} 条可导入提示。请选择保留现有内容还是直接替换。`;
  }

  function createTagChip(label, value) {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.action = "filter-tag";
    button.dataset.value = value;
    button.className = `gv-chip${state.activeTag === value ? " gv-chip-active" : ""}`;
    button.textContent = label;
    return button;
  }

  function getKnownTags() {
    return [...new Set(state.items.flatMap((item) => item.tags))]
      .sort((a, b) => a.localeCompare(b, "zh-CN"));
  }

  function renderTagSuggestions() {
    if (!state.editorOpen || !state.tagSuggestionsOpen) {
      hideTagSuggestions();
      return;
    }

    const knownTags = getKnownTags();
    if (!knownTags.length) {
      hideTagSuggestions();
      return;
    }

    const selectedTags = normalizeTags(elements.tags.value);
    const rawValue = elements.tags.value;
    const segments = rawValue.split(/[,，;；、]/);
    const keyword = normalizeSearchText(segments[segments.length - 1] || "");
    const suggestions = knownTags.filter((tag) => {
      if (selectedTags.includes(tag)) return false;
      if (!keyword) return true;
      return normalizeSearchText(tag).includes(keyword);
    });

    if (!suggestions.length) {
      hideTagSuggestions();
      return;
    }

    const options = suggestions.map((tag) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "gv-tag-option";
      button.dataset.action = "pick-tag";
      button.dataset.value = tag;
      button.textContent = tag;
      return button;
    });

    elements.tagSuggestions.replaceChildren(...options);
    elements.tagSuggestions.classList.remove("gv-hidden");
  }

  function applySuggestedTag(tag) {
    if (!tag) return;

    const rawValue = elements.tags.value;
    const hasTrailingDelimiter = /[,，;；、]\s*$/.test(rawValue);
    const segments = rawValue.split(/[,，;；、]/).map((segment) => segment.trim());
    const lastSegment = segments[segments.length - 1] || "";
    const shouldReplaceLast = !hasTrailingDelimiter &&
      Boolean(lastSegment) &&
      normalizeSearchText(tag).includes(normalizeSearchText(lastSegment)) &&
      normalizeSearchText(tag) !== normalizeSearchText(lastSegment);
    const baseSegments = shouldReplaceLast ? segments.slice(0, -1) : segments;
    const nextTags = normalizeTags([...baseSegments, tag].join(","));

    elements.tags.value = nextTags.length ? `${nextTags.join(", ")}, ` : "";
    state.tagSuggestionsOpen = true;
    renderTagSuggestions();
    elements.tags.focus();
    elements.tags.setSelectionRange(elements.tags.value.length, elements.tags.value.length);
  }

  function clearTagSuggestionsTimer() {
    if (tagSuggestionsTimer) {
      clearTimeout(tagSuggestionsTimer);
      tagSuggestionsTimer = null;
    }
  }

  function scheduleHideTagSuggestions() {
    clearTagSuggestionsTimer();
    tagSuggestionsTimer = window.setTimeout(() => {
      state.tagSuggestionsOpen = false;
      hideTagSuggestions();
    }, 120);
  }

  function hideTagSuggestions() {
    clearTagSuggestionsTimer();
    elements.tagSuggestions.classList.add("gv-hidden");
    elements.tagSuggestions.replaceChildren();
  }

  function renderList() {
    const items = getFilteredItems();
    elements.list.innerHTML = "";
    elements.list.classList.toggle("gv-list-empty-state", state.items.length === 0);

    if (!items.length) {
      if (state.items.length) {
        const empty = document.createElement("div");
        empty.className = "gv-empty";
        empty.innerHTML = `
          <strong>没有匹配结果</strong>
          <span>试试切换搜索词、收藏筛选或标签条件。</span>
        `;
        elements.list.appendChild(empty);
      } else {
        const emptyAction = document.createElement("button");
        emptyAction.type = "button";
        emptyAction.className = "gv-empty gv-empty-action";
        emptyAction.dataset.action = "new";
        emptyAction.setAttribute("aria-label", "创建第一条提示");
        emptyAction.innerHTML = `
          <span class="gv-empty-inner">
            <span class="gv-empty-icon">${icon("chargerPile", "gv-svg-icon")}</span>
            <strong>你的提示词 值得一个编制</strong>
            <span>给他上岸转正吧，以后就别在外面灵活就业了。</span>
          </span>
        `;
        elements.list.appendChild(emptyAction);
      }
      return;
    }

    items.forEach((item) => {
      elements.list.appendChild(createCard(item));
    });

    scheduleCardTagFit();
  }

  function createCard(item) {
    const card = document.createElement("article");
    card.className = `gv-card gv-card-clickable${item.favorite ? " gv-card-favorite" : ""}`;
    card.dataset.cardId = item.id;

    const tags = item.tags
      .map((tag) => `<span class="gv-chip gv-chip-tag">${escapeHtml(tag)}</span>`)
      .join("");
    const expanded = state.expandedIds.includes(item.id);
        card.innerHTML = `
      <div class="gv-card-head">
        <div class="gv-card-title-wrap">
          <div class="gv-card-title-line">
            <h3 class="gv-card-title">${escapeHtml(item.title)}</h3>
          </div>
        </div>
        <div class="gv-card-top-actions">
          <button class="gv-card-icon-btn${
      item.favorite ? " gv-card-icon-btn-favorite" : ""
    }" type="button" data-action="toggle-favorite" data-id="${item.id}" title="${
      item.favorite ? "取消收藏" : "加入收藏"
    }">
            ${icon(item.favorite ? "starFilled" : "star", "gv-svg-icon gv-svg-icon-soft")}
          </button>
          <button class="gv-card-icon-btn" type="button" data-action="toggle-lines" data-id="${item.id}" title="${
      expanded ? "收起全文" : "展开全文"
    }">
            ${icon(expanded ? "chevronUp" : "chevronDown", "gv-svg-icon gv-svg-icon-soft")}
          </button>
        </div>
      </div>

      <p class="gv-card-text${expanded ? " gv-card-text-expanded" : ""}">${escapeHtml(item.content)}</p>

      <div class="gv-card-footer">
        <div class="gv-tags">${tags || '<span class="gv-card-no-tag">未分类</span>'}</div>
      </div>

      <div class="gv-card-actions">
        <button class="gv-btn gv-btn-primary gv-card-action-btn" type="button" data-action="use-replace" data-id="${item.id}">
          <span class="gv-btn-icon gv-card-action-icon">${icon("replace", "gv-svg-icon gv-svg-icon-soft")}</span>
          <span class="gv-card-action-label">填入</span>
        </button>
        <button class="gv-inline-btn gv-card-action-btn" type="button" data-action="edit" data-id="${item.id}">
          <span class="gv-btn-icon gv-card-action-icon gv-card-action-icon-secondary">${icon("edit", "gv-svg-icon gv-svg-icon-soft")}</span>
          <span class="gv-card-action-label">编辑</span>
        </button>
        <button class="gv-inline-btn gv-inline-btn-danger gv-card-action-btn" type="button" data-action="delete" data-id="${item.id}">
          <span class="gv-btn-icon gv-card-action-icon gv-card-action-icon-danger">${icon("trash", "gv-svg-icon gv-svg-icon-soft")}</span>
          <span class="gv-card-action-label">删除</span>
        </button>
      </div>
    `;

    bindCardReorder(card, item.id);
    return card;
  }

  function scheduleCardTagFit() {
    if (cardTagFitFrame) {
      cancelAnimationFrame(cardTagFitFrame);
    }

    cardTagFitFrame = window.requestAnimationFrame(() => {
      cardTagFitFrame = 0;
      fitVisibleCardTags();
    });
  }

  function fitVisibleCardTags() {
    elements.list.querySelectorAll(".gv-tags").forEach((tagContainer) => {
      const tagNodes = [...tagContainer.querySelectorAll(".gv-chip-tag")];
      if (!tagNodes.length) return;

      tagNodes.forEach((tagNode) => {
        tagNode.classList.remove("gv-chip-tag-hidden");
      });

      const maxVisibleCount = tagNodes.length;
      let visibleCount = 0;

      for (let index = 0; index < maxVisibleCount; index += 1) {
        const tagNode = tagNodes[index];
        const containerWidth = Math.floor(tagContainer.clientWidth);
        const nextRight = Math.ceil(tagNode.offsetLeft + tagNode.offsetWidth);
        if (nextRight <= containerWidth) {
          visibleCount = index + 1;
          continue;
        }
        break;
      }

      if (visibleCount === 0) {
        visibleCount = 1;
      }

      tagNodes.forEach((tagNode, index) => {
        tagNode.classList.toggle("gv-chip-tag-hidden", index >= visibleCount);
      });
    });
  }

  function toggleExpanded(id) {
    const index = state.expandedIds.indexOf(id);
    if (index >= 0) {
      state.expandedIds.splice(index, 1);
    } else {
      state.expandedIds.push(id);
    }
  }

  function getFilteredItems() {
    return getItemsInOrder(state.items)
      .filter((item) => {
        if (state.favoritesOnly && !item.favorite) {
          return false;
        }

        if (state.activeTag && !item.tags.includes(state.activeTag)) {
          return false;
        }

        if (!state.searchTerm) {
          return true;
        }

        const haystack = normalizeSearchText(
          [item.title, item.content, item.tags.join(" ")].join(" "),
        );
        return haystack.includes(state.searchTerm);
      });
  }

  function openEditor(item = null) {
    state.editingId = item ? item.id : null;
    state.editorOpen = true;
    state.tagSuggestionsOpen = false;
    state.settingsOpen = false;
    state.quickPanelOpen = false;
    elements.editor.classList.remove("gv-hidden");
    elements.panel.classList.add("gv-panel-editor-open");
    renderPanelState();
    renderSettings();
    renderQuickPanel();
    elements.editorTitle.textContent = item ? "编辑提示" : "新建提示";
    elements.title.value = item ? item.title : "";
    elements.tags.value = item ? item.tags.join(", ") : "";
    elements.content.value = item ? item.content : "";
    elements.editor.scrollTop = 0;
    hideTagSuggestions();
    elements.title.focus();

    if (!state.panelOpen) {
      state.panelOpen = true;
      render();
      schedulePrefsPersist();
    }
  }

  function closeEditor() {
    state.editingId = null;
    state.editorOpen = false;
    state.tagSuggestionsOpen = false;
    elements.editor.classList.add("gv-hidden");
    elements.panel.classList.remove("gv-panel-editor-open");
    renderPanelState();
    renderQuickPanel();
    elements.form.reset();
    hideTagSuggestions();
  }

  async function saveItem() {
    const title = elements.title.value.trim();
    const content = elements.content.value.trim();
    const tags = normalizeTags(elements.tags.value);

    if (!title || !content) {
      showStatus("标题和内容不能为空。");
      return;
    }

    const now = Date.now();

    if (state.editingId) {
      state.items = state.items.map((item) => (
        item.id === state.editingId
          ? { ...item, title, content, tags, updatedAt: now }
          : item
      ));
      showStatus("提示已更新。", true);
    } else {
      state.items.push({
        id: crypto.randomUUID(),
        title,
        content,
        tags,
        favorite: false,
        order: getTopOrder(),
        createdAt: now,
        updatedAt: now,
        lastUsedAt: 0,
      });
      showStatus("提示已创建。", true);
    }

    closeEditor();
    refreshListView();
    await persistItems();
  }

  function refreshListView() {
    renderSummary();
    renderFavoriteFilter();
    renderTagFilters();
    renderList();
  }

  function normalizeTags(rawValue) {
    if (typeof rawValue !== "string") return [];

    return [
      ...new Set(
        rawValue
          .split(/[,，;；、]/)
          .map((tag) => tag.trim())
          .filter(Boolean),
      ),
    ];
  }

  function normalizeSearchText(value) {
    return String(value || "")
      .normalize("NFKC")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  function normalizeItem(item, fallbackOrder = 0) {
    if (
      !item ||
      typeof item.title !== "string" ||
      typeof item.content !== "string"
    ) {
      return null;
    }

    const now = Date.now();

    return {
      id: typeof item.id === "string" && item.id ? item.id : crypto.randomUUID(),
      title: item.title.trim(),
      content: item.content.trim(),
      tags: Array.isArray(item.tags) ? normalizeTags(item.tags.join(",")) : [],
      favorite: Boolean(item.favorite),
      order: Number.isFinite(Number(item.order)) ? Number(item.order) : fallbackOrder,
      createdAt: Number(item.createdAt) || now,
      updatedAt: Number(item.updatedAt) || now,
      lastUsedAt: Number(item.lastUsedAt) || 0,
    };
  }

  async function handleItemAction(action, id) {
    const item = state.items.find((entry) => entry.id === id);
    if (!item) return;

    if (action === "use-replace") {
      const mode = getComposerInsertMode();
      const inserted = insertIntoComposer(item.content, mode);

      if (inserted) {
        touchItem(id);
        showStatus(mode === "append" ? "已追加到输入框。" : "已填入输入框。", true);
      } else {
        showStatus("没有找到 ChatGPT 输入框，请先激活一个聊天输入区域。");
      }
      return;
    }

    if (action === "toggle-favorite") {
      const nextFavorite = !item.favorite;
      state.items = state.items.map((entry) => (
        entry.id === id
          ? { ...entry, favorite: nextFavorite, updatedAt: Date.now() }
          : entry
      ));
      await persistItems();
      render();
      showStatus(nextFavorite ? "已加入收藏。" : "已取消收藏。", true);
      return;
    }

    if (action === "edit") {
      openEditor(item);
      return;
    }

    if (action === "delete") {
      state.pendingDeleteId = id;
      elements.deleteMessage.textContent = `确认删除提示“${item.title}”吗？删除后无法恢复。`;
      elements.deleteModal.classList.remove("gv-hidden");
    }
  }

  async function copyItem(item, quiet) {
    try {
      await navigator.clipboard.writeText(item.content);
      touchItem(item.id);
      showStatus(`已复制「${item.title}」。`, quiet);
    } catch (error) {
      console.error("Copy failed", error);
      showStatus("复制失败，请检查浏览器权限。");
    }
  }

  function touchItem(id) {
    const item = state.items.find((entry) => entry.id === id);
    if (!item) return;
    item.lastUsedAt = Date.now();
    scheduleTouchPersist();
  }

  function hideDeleteModal() {
    state.pendingDeleteId = "";
    elements.deleteModal.classList.add("gv-hidden");
    elements.deleteMessage.textContent = "";
  }

  function hideImportModal() {
    state.pendingImportItems = [];
    state.importModalOpen = false;
    renderImportModal();
  }

  async function confirmDelete() {
    if (!state.pendingDeleteId) return;

    state.items = state.items.filter((entry) => entry.id !== state.pendingDeleteId);
    await persistItems();
    hideDeleteModal();
    render();
    showStatus("提示已删除。", true);
  }

  function exportItems() {
    const blob = new Blob([JSON.stringify(state.items, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `gpt-prompt-library-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    showStatus("已导出 JSON。", true);
  }

  async function backupItems() {
    const now = new Date();
    const timestamp = now.toISOString().replace(/[:.]/g, "-");
    const payload = {
      schema: "gpt-prompt-library-backup",
      version: EXTENSION_VERSION,
      exportedAt: now.toISOString(),
      itemCount: state.items.length,
      favoritesCount: state.items.filter((item) => item.favorite).length,
      tags: [...new Set(state.items.flatMap((item) => item.tags))]
        .sort((a, b) => a.localeCompare(b, "zh-CN")),
      items: state.items,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `gpt-prompt-library_backup_${now.getFullYear()}-${
      String(now.getMonth() + 1).padStart(2, "0")
    }_${timestamp}_${state.items.length}items.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    showStatus("已生成本地备份。", true);
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

      state.pendingImportItems = normalized;
      state.importModalOpen = true;
      renderImportModal();
    } catch (error) {
      console.error("Import failed", error);
      showStatus("导入失败，请确认 JSON 格式正确，并且每条数据至少包含标题和内容。");
    } finally {
      event.target.value = "";
    }
  }

  async function confirmImport(mode) {
    if (!state.pendingImportItems.length) {
      hideImportModal();
      return;
    }

    const importedCount = state.pendingImportItems.length;
    state.items = mode === "replace"
      ? dedupeItems(state.pendingImportItems)
      : mergeItems(state.items, state.pendingImportItems);

    await persistItems();
    hideImportModal();
    state.settingsOpen = false;
    renderSettings();
    render();
    showStatus(
      mode === "replace"
        ? `已替换为 ${state.items.length} 条提示。`
        : `已导入 ${importedCount} 条提示，并自动完成去重。`,
      true,
    );
  }

  function mergeItems(existingItems, importedItems) {
    return dedupeItems([...importedItems, ...existingItems]);
  }

  function dedupeItems(items) {
    const seen = new Map();

    items.forEach((item) => {
      const key = `${item.title}::${item.content}`;
      const previous = seen.get(key);

      if (!previous) {
        seen.set(key, item);
        return;
      }

      const preferred = previous.updatedAt >= item.updatedAt ? previous : item;
      seen.set(key, {
        ...preferred,
        favorite: previous.favorite || item.favorite,
        order: Math.min(
          Number.isFinite(previous.order) ? previous.order : Number.MAX_SAFE_INTEGER,
          Number.isFinite(item.order) ? item.order : Number.MAX_SAFE_INTEGER,
        ),
        tags: normalizeTags([...previous.tags, ...item.tags].join(",")),
        createdAt: Math.min(previous.createdAt, item.createdAt),
        updatedAt: Math.max(previous.updatedAt, item.updatedAt),
        lastUsedAt: Math.max(previous.lastUsedAt, item.lastUsedAt),
      });
    });

    return [...seen.values()];
  }

  function getItemsInOrder(items) {
    return [...items].sort((a, b) => {
      const aOrder = Number.isFinite(a.order) ? a.order : Number.MAX_SAFE_INTEGER;
      const bOrder = Number.isFinite(b.order) ? b.order : Number.MAX_SAFE_INTEGER;
      if (aOrder !== bOrder) {
        return aOrder - bOrder;
      }
      return a.createdAt - b.createdAt;
    });
  }

  function getNextOrder() {
    if (!state.items.length) return 0;
    return Math.max(...state.items.map((item) => Number.isFinite(item.order) ? item.order : 0)) + 1;
  }

  function getTopOrder() {
    if (!state.items.length) return 0;
    return Math.min(...state.items.map((item) => Number.isFinite(item.order) ? item.order : 0)) - 1;
  }

  function bindCardReorder(card, itemId) {
    card.draggable = false;

    const clearPress = () => {
      if (dragPressTimer) {
        clearTimeout(dragPressTimer);
        dragPressTimer = null;
      }

      if (dragPressCard === card && draggedItemId !== itemId) {
        card.draggable = false;
        card.classList.remove("gv-card-drag-armed");
        dragPressCard = null;
      }
    };

    card.addEventListener("pointerdown", (event) => {
      if (event.button !== 0) return;
      if (event.target.closest("button, input, textarea, label, a")) return;
      clearPress();
      dragPressCard = card;
      dragPressTimer = window.setTimeout(() => {
        card.draggable = true;
        card.classList.add("gv-card-drag-armed");
      }, 220);
    });

    card.addEventListener("pointerup", clearPress);
    card.addEventListener("pointercancel", clearPress);
    card.addEventListener("pointerleave", () => {
      if (!card.classList.contains("gv-card-drag-armed")) {
        clearPress();
      }
    });

    card.addEventListener("click", async (event) => {
      if (event.button !== 0) return;
      if (event.target.closest("button, input, textarea, label, a")) return;
      if (window.getSelection()?.toString().trim()) return;
      if (card.classList.contains("gv-card-drag-armed") || card.classList.contains("gv-card-dragging")) return;

      const item = state.items.find((entry) => entry.id === itemId);
      if (!item) return;
      await copyItem(item, true);
    });

    card.addEventListener("dragstart", (event) => {
      if (!card.draggable) {
        event.preventDefault();
        return;
      }

      draggedItemId = itemId;
      card.classList.add("gv-card-dragging");
      if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", itemId);
      }
    });

    card.addEventListener("dragover", (event) => {
      if (!draggedItemId || draggedItemId === itemId) return;
      event.preventDefault();
      const rect = card.getBoundingClientRect();
      const after = event.clientY > rect.top + rect.height / 2;
      card.dataset.dropPosition = after ? "after" : "before";
      card.classList.add("gv-card-drop-target");
      card.classList.toggle("gv-card-drop-after", after);
    });

    card.addEventListener("dragleave", () => {
      card.classList.remove("gv-card-drop-target", "gv-card-drop-after");
      delete card.dataset.dropPosition;
    });

    card.addEventListener("drop", async (event) => {
      if (!draggedItemId || draggedItemId === itemId) return;
      event.preventDefault();
      const after = card.dataset.dropPosition === "after";
      card.classList.remove("gv-card-drop-target", "gv-card-drop-after");
      delete card.dataset.dropPosition;
      await reorderItems(draggedItemId, itemId, after);
    });

    card.addEventListener("dragend", () => {
      card.classList.remove("gv-card-drag-armed", "gv-card-dragging");
      card.draggable = false;
      dragPressCard = null;
      draggedItemId = "";
      document.querySelectorAll("#gpt-voyager-root .gv-card-drop-target").forEach((node) => {
        node.classList.remove("gv-card-drop-target", "gv-card-drop-after");
        delete node.dataset.dropPosition;
      });
    });
  }

  async function reorderItems(sourceId, targetId, placeAfter) {
    const ordered = getItemsInOrder(state.items);
    const sourceIndex = ordered.findIndex((item) => item.id === sourceId);
    const targetIndex = ordered.findIndex((item) => item.id === targetId);

    if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) {
      return;
    }

    const [movedItem] = ordered.splice(sourceIndex, 1);
    let insertionIndex = ordered.findIndex((item) => item.id === targetId);
    if (placeAfter) {
      insertionIndex += 1;
    }
    ordered.splice(insertionIndex, 0, movedItem);

    state.items = ordered.map((item, index) => ({
      ...item,
      order: index,
    }));

    await persistItems();
    render();
    showStatus("已更新提示排序。", true);
  }

  function findComposer() {
    const activeComposer = getActiveComposer();
    if (activeComposer) {
      return activeComposer;
    }

    const unique = new Set();
    const candidates = [];
    const siteSelectors = getSiteComposerSelectors();

    if (siteSelectors.length) {
      collectComposerCandidates(document, siteSelectors, unique, candidates, "site");
    }

    collectComposerCandidates(document, GENERIC_COMPOSER_SELECTORS, unique, candidates, "generic");

    return candidates.sort((a, b) => getComposerScore(b) - getComposerScore(a))[0] || null;
  }

  function getComposerInsertMode() {
    const composer = findComposer();
    if (!composer) return "replace";
    return hasComposerContent(composer) ? "append" : "replace";
  }

  function getComposerScore(node) {
    let score = 0;
    if (node === getDeepActiveElement()) score += 240;
    if (node.matches(':focus, :focus-within')) score += 180;
    if (node.id === "prompt-textarea") score += 100;
    if (node.getAttribute("data-testid") === "prompt-textarea") score += 80;
    if (node.matches("textarea")) score += 50;
    if (node.matches('input[type="text"], input:not([type])')) score += 42;
    if (node.getAttribute("contenteditable") === "true") score += 40;
    if (node.getAttribute("contenteditable") === "plaintext-only") score += 40;
    if (node.getAttribute("role") === "textbox") score += 36;
    if (node.getAttribute("aria-multiline") === "true") score += 28;
    if (node.matches(".ProseMirror, [data-lexical-editor='true']")) score += 24;
    if (node.closest("form")) score += 20;
    if (node.closest('main, [role="main"]')) score += 10;
    if (node.dataset.gptVoyagerComposerSource === "site") score += 120;
    if (node.matches('textarea[placeholder*="prompt"], textarea[placeholder*="Prompt"], textarea[placeholder*="Ask"], textarea[placeholder*="Describe"]')) score += 32;
    if (node.matches('textarea[placeholder*="输入"], textarea[placeholder*="发送"], textarea[placeholder*="描述"]')) score += 32;
    return score;
  }

  function isVisible(node) {
    const rect = node.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  function insertIntoComposer(text, mode) {
    const composer = findComposer();
    if (!composer) return false;

    const shouldAppend = mode === "append";
    const textToInsert = shouldAppend ? `\n\n${text}` : text;
    const expectedText = shouldAppend ? "" : text;
    const isLargePayload = textToInsert.length >= LARGE_TEXT_THRESHOLD;
    const useFastAppendPath = shouldAppend && shouldUseFastAppendPath(composer, textToInsert);

    let success = false;

    if (composer instanceof HTMLTextAreaElement || composer instanceof HTMLInputElement) {
      success = writeToTextInput(composer, textToInsert, shouldAppend ? "append" : "replace", isLargePayload);
    } else if (composer.isContentEditable) {
      success = writeToContentEditable(composer, textToInsert, shouldAppend ? "append" : "replace", isLargePayload);
    }

    if (!success) return false;

    if (!useFastAppendPath && expectedText) {
      const actualText = normalizeComposerText(readComposerText(composer));
      const normalizedExpectedText = normalizeComposerText(expectedText);
      if (normalizedExpectedText && actualText !== normalizedExpectedText) {
        return false;
      }
    }

    if (!useFastAppendPath && shouldAppend) {
      const actualText = normalizeComposerText(readComposerText(composer));
      if (!actualText.endsWith(normalizeComposerText(textToInsert))) {
        return false;
      }
    }

    if (useFastAppendPath && !isComposerVisiblyActive(composer)) {
      return false;
    }

    composer.focus({ preventScroll: true });
    if (!isLargePayload) {
      placeCaretAtEnd(composer);
    }
    return true;
  }

  function readComposerText(node) {
    if (node instanceof HTMLTextAreaElement || node instanceof HTMLInputElement) {
      return node.value || "";
    }

    return node.innerText || node.textContent || "";
  }

  function hasComposerContent(node) {
    if (node instanceof HTMLTextAreaElement || node instanceof HTMLInputElement) {
      return Boolean(node.value && node.value.trim().length);
    }

    if (node.childNodes.length > 1) return true;
    const directText = (node.textContent || "").trim();
    if (directText.length > 0) return true;
    return node.querySelector("p, div, span, br") !== null;
  }

  function writeToTextInput(node, value, mode = "replace", isLargePayload = false) {
    const prototype = Object.getPrototypeOf(node);
    const descriptor = Object.getOwnPropertyDescriptor(prototype, "value") ||
      Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value") ||
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");

    node.focus({ preventScroll: true });

    if (mode === "append") {
      const insertionStart = node.value.length;
      if (typeof node.setSelectionRange === "function") {
        node.setSelectionRange(insertionStart, insertionStart);
      }

      if (typeof node.setRangeText === "function") {
        node.setRangeText(value, insertionStart, insertionStart, "end");
      } else if (descriptor?.set) {
        descriptor.set.call(node, `${node.value}${value}`);
      } else {
        node.value += value;
      }
    } else if (descriptor?.set) {
      descriptor.set.call(node, value);
    } else {
      node.value = value;
    }

    node.dispatchEvent(new InputEvent("beforeinput", {
      bubbles: true,
      inputType: "insertText",
      data: value,
    }));
    node.dispatchEvent(new Event("input", { bubbles: true }));
    if (!isLargePayload) {
      node.dispatchEvent(new Event("change", { bubbles: true }));
    }
    return mode === "append"
      ? normalizeComposerText(node.value).endsWith(normalizeComposerText(value))
      : normalizeComposerText(node.value) === normalizeComposerText(value);
  }

  function writeToContentEditable(node, value, mode = "replace", isLargePayload = false) {
    node.focus({ preventScroll: true });

    if (shouldUseDirectContentEditableWrite(node, value, mode, isLargePayload)) {
      const nextText = mode === "append"
        ? `${readComposerText(node)}${value}`
        : value;
      node.replaceChildren(document.createTextNode(nextText));
      node.dispatchEvent(new InputEvent("input", {
        bubbles: true,
        inputType: mode === "append" ? "insertText" : "insertReplacementText",
        data: value,
      }));
      return normalizeComposerText(readComposerText(node)) === normalizeComposerText(nextText);
    }

    const selection = window.getSelection();
    if (!selection) return false;

    if (mode === "append") {
      placeCaretAtEnd(node);
    } else {
      const range = document.createRange();
      range.selectNodeContents(node);
      selection.removeAllRanges();
      selection.addRange(range);
    }

    let inserted = false;

    try {
      inserted = document.execCommand("insertText", false, value);
    } catch (error) {
      inserted = false;
    }

    if (!inserted) {
      if (mode === "append") {
        node.append(document.createTextNode(value));
      } else {
        node.replaceChildren(document.createTextNode(value));
      }
      node.dispatchEvent(new InputEvent("input", {
        bubbles: true,
        inputType: "insertText",
        data: value,
      }));
    }

    if (!isLargePayload) {
      node.dispatchEvent(new Event("change", { bubbles: true }));
    }

    const normalizedValue = normalizeComposerText(value);
    const normalizedNodeText = normalizeComposerText(readComposerText(node));
    return mode === "append"
      ? normalizedNodeText.endsWith(normalizedValue)
      : normalizedNodeText === normalizedValue;
  }

  function shouldUseFastAppendPath(node, textToInsert) {
    return isHostMatch(CURRENT_HOST, "chatgpt.com")
      || isHostMatch(CURRENT_HOST, "chat.openai.com")
      || (
        node.isContentEditable &&
        textToInsert.length >= LARGE_TEXT_THRESHOLD
      );
  }

  function shouldUseDirectContentEditableWrite(node, value, mode, isLargePayload) {
    if (!node.isContentEditable) return false;
    if (isHostMatch(CURRENT_HOST, "chatgpt.com") || isHostMatch(CURRENT_HOST, "chat.openai.com")) {
      return isLargePayload || value.length >= 6000 || mode === "append";
    }
    return isLargePayload && value.length >= LARGE_TEXT_THRESHOLD;
  }

  function isComposerVisiblyActive(node) {
    return document.contains(node) && isVisible(node);
  }

  function placeCaretAtEnd(node) {
    if (node instanceof HTMLTextAreaElement || node instanceof HTMLInputElement) {
      const length = node.value.length;
      node.setSelectionRange(length, length);
      return;
    }

    const selection = window.getSelection();
    if (!selection) return;

    const range = document.createRange();
    range.selectNodeContents(node);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
  }

  function getActiveComposer() {
    const activeElement = getDeepActiveElement();
    if (!(activeElement instanceof HTMLElement)) return null;
    if (root.contains(activeElement)) return null;

    const composer = resolveComposerCandidate(activeElement);
    if (!composer || !isVisible(composer)) return null;
    return composer;
  }

  function getDeepActiveElement(currentRoot = document) {
    const activeElement = currentRoot?.activeElement;
    if (!(activeElement instanceof HTMLElement)) return activeElement || null;
    if (activeElement.shadowRoot) {
      const nestedActiveElement = getDeepActiveElement(activeElement.shadowRoot);
      if (nestedActiveElement instanceof HTMLElement) {
        return nestedActiveElement;
      }
    }
    return activeElement;
  }

  function collectComposerCandidates(searchRoot, selectors, unique, candidates, source = "generic") {
    if (!searchRoot || typeof searchRoot.querySelectorAll !== "function") return;

    selectors.forEach((selector) => {
      searchRoot.querySelectorAll(selector).forEach((node) => {
        const composer = resolveComposerCandidate(node);
        if (!composer) return;
        if (root.contains(composer)) return;
        if (!isVisible(composer)) return;
        if (unique.has(composer)) return;
        unique.add(composer);
        composer.dataset.gptVoyagerComposerSource = source;
        candidates.push(composer);
      });
    });

    searchRoot.querySelectorAll("*").forEach((node) => {
      if (node instanceof HTMLElement && node.shadowRoot) {
        collectComposerCandidates(node.shadowRoot, selectors, unique, candidates, source);
      }
    });
  }

  function getSiteComposerSelectors() {
    return SITE_COMPOSER_PROFILES
      .filter((profile) => profile.hosts.some((expectedHost) => isHostMatch(CURRENT_HOST, expectedHost)))
      .flatMap((profile) => profile.selectors);
  }

  function resolveComposerCandidate(node) {
    if (!(node instanceof HTMLElement)) return null;
    if (node instanceof HTMLTextAreaElement) return node;
    if (node instanceof HTMLInputElement) {
      const type = (node.type || "text").toLowerCase();
      if (["text", "search", "url", "email", ""].includes(type)) {
        return node;
      }
      return null;
    }
    if (node.isContentEditable) return node;
    if (node.matches('[contenteditable="true"], [contenteditable="plaintext-only"], [role="textbox"], [aria-multiline="true"], .ProseMirror, [data-lexical-editor="true"]')) {
      return node;
    }
    const closestComposer = node.closest('textarea, input[type="text"], input:not([type]), [contenteditable="true"], [contenteditable="plaintext-only"], [role="textbox"], [aria-multiline="true"], .ProseMirror, [data-lexical-editor="true"]');
    return closestComposer instanceof HTMLElement ? closestComposer : null;
  }

  function normalizeComposerText(value) {
    return String(value || "")
      .replace(/\u200B/g, "")
      .replace(/\r\n?/g, "\n")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  function formatTime(timestamp) {
    return new Date(timestamp).toLocaleString("zh-CN");
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  function showStatus(message, quiet) {
    elements.status.textContent = message;
    elements.status.classList.remove("gv-hidden");
    elements.status.classList.toggle("gv-status-quiet", Boolean(quiet));

    if (statusTimer) {
      clearTimeout(statusTimer);
    }

    statusTimer = window.setTimeout(() => {
      elements.status.classList.add("gv-hidden");
      elements.status.textContent = "";
      elements.status.classList.remove("gv-status-quiet");
    }, quiet ? 1500 : 2600);
  }
})();

