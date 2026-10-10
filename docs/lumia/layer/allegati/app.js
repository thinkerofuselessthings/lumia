/* ───────────────────────────────────────
   Lumia — Chromeless Interaction Layer
   No sidebar. No dock. Only tabs + command palette.
   ─────────────────────────────────────── */

const SECTIONS = [
  { id: 'dashboard',    label: 'Dashboard',     icon: 'grid',  desc: 'Overview and key metrics' },
  { id: 'analytics',    label: 'Analytics',     icon: 'chart', desc: 'Traffic, funnels, insights' },
  { id: 'users',        label: 'Users',         icon: 'user',  desc: 'Accounts and permissions' },
  { id: 'products',     label: 'Products',      icon: 'box',   desc: 'Catalog and inventory' },
  { id: 'orders',       label: 'Orders',        icon: 'list',  desc: 'Processing and fulfillment' },
  { id: 'messages',     label: 'Messages',      icon: 'chat',  desc: 'Inbox and conversations' },
  { id: 'calendar',     label: 'Calendar',      icon: 'cal',   desc: 'Events and scheduling' },
  { id: 'documents',    label: 'Documents',     icon: 'file',  desc: 'Files, folders, sharing' },
  { id: 'reports',      label: 'Reports',       icon: 'doc',   desc: 'Generated reports and exports' },
  { id: 'integrations', label: 'Integrations',  icon: 'plug',  desc: 'Third-party connections' },
  { id: 'billing',      label: 'Billing',       icon: 'card',  desc: 'Plans, invoices, payments' },
  { id: 'settings',     label: 'Settings',      icon: 'gear',  desc: 'Configuration and preferences' },
];

// SVG icons (small, 16x16 for palette)
const ICONS = {
  grid:  '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>',
  chart: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="M7 16l4-8 4 4 6-8"/></svg>',
  user:  '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 0 0-16 0"/></svg>',
  box:   '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>',
  list:  '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M16 3H8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2Z"/><path d="M10 7h4"/><path d="M10 11h4"/><path d="M10 15h2"/></svg>',
  chat:  '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/></svg>',
  cal:   '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/></svg>',
  file:  '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/></svg>',
  doc:   '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>',
  plug:  '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 1v4"/><path d="M12 19v4"/><path d="M1 12h4"/><path d="M19 12h4"/></svg>',
  card:  '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>',
  gear:  '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>',
  close: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>',
  lib:   '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/><path d="M8 7h6"/></svg>',
};

// Default launcher actions (always shown, not module sections)
const LAUNCHER_ACTIONS = [
  { id: '_close_layer', label: 'Close Layer',   icon: 'close', desc: 'Close the current layer' },
  { id: '_library',     label: 'Library',        icon: 'lib',   desc: 'Open the module library' },
];

// ─── State ────────────────────────────

const state = {
  openTabs: [],      // array of section ids
  activeTab: null,   // current section id
  paletteOpen: false,
  paletteIndex: 0,
};

// ─── DOM refs ─────────────────────────

const $ = (sel) => document.querySelector(sel);

const dom = {
  tabStripTabs:    $('#tabStripTabs'),
  tabStrip:        $('#tabStrip'),
  content:         $('#content'),
  emptyState:      $('#emptyState'),
  emptyTrigger:    $('#emptyStateTrigger'),
  openPaletteBtn:  $('#openPaletteBtn'),
  launcherOverlay: $('#launcherOverlay'),
  launcherGrid:    $('#launcherGrid'),
};

// ─── Open / Activate / Close tabs ─────

function openSection(sectionId) {
  if (!state.openTabs.includes(sectionId)) {
    state.openTabs.push(sectionId);
    createSectionPanel(sectionId);
  }
  activateTab(sectionId);
}

function activateTab(sectionId) {
  state.activeTab = sectionId;
  // Panels
  dom.content.querySelectorAll('.section-panel').forEach(p => {
    p.classList.toggle('is-active', p.dataset.section === sectionId);
  });
  // Empty state
  dom.emptyState.style.display = state.openTabs.length ? 'none' : '';
  renderTabs();
}

function closeTab(sectionId) {
  const idx = state.openTabs.indexOf(sectionId);
  if (idx === -1) return;

  state.openTabs.splice(idx, 1);

  // Remove panel
  const panel = dom.content.querySelector(`.section-panel[data-section="${sectionId}"]`);
  if (panel) panel.remove();

  // If we closed the active tab, activate neighbor
  if (state.activeTab === sectionId) {
    if (state.openTabs.length) {
      const nextIdx = Math.min(idx, state.openTabs.length - 1);
      activateTab(state.openTabs[nextIdx]);
    } else {
      state.activeTab = null;
      dom.emptyState.style.display = '';
    }
  }

  renderTabs();
}

// ─── Render tab strip ─────────────────

function renderTabs() {
  dom.tabStripTabs.innerHTML = '';

  state.openTabs.forEach((id, idx) => {
    const section = SECTIONS.find(s => s.id === id);
    const tab = document.createElement('button');
    tab.className = 'tab' + (id === state.activeTab ? ' is-active' : '');
    tab.dataset.section = id;

    const icon = document.createElement('span');
    icon.className = 'tab-icon';
    icon.innerHTML = ICONS[section.icon] || '';

    const label = document.createElement('span');
    label.className = 'tab-label';
    label.textContent = section.label;

    const close = document.createElement('button');
    close.className = 'tab-close';
    close.innerHTML = '×';
    close.addEventListener('click', (e) => {
      e.stopPropagation();
      closeTab(id);
    });

    tab.appendChild(icon);
    tab.appendChild(label);
    tab.appendChild(close);
    tab.addEventListener('click', () => activateTab(id));
    dom.tabStripTabs.appendChild(tab);
  });
}

// ─── Create section panel (demo content)

function createSectionPanel(sectionId) {
  const section = SECTIONS.find(s => s.id === sectionId);
  const panel = document.createElement('div');
  panel.className = 'section-panel is-active';
  panel.dataset.section = sectionId;

  panel.innerHTML = `
    <h1>${section.label}</h1>
    <p>This is the ${section.label.toLowerCase()} section. Content and components go here.</p>
    <div class="section-cards">
      ${generateDemoCards(sectionId)}
    </div>
  `;

  dom.content.appendChild(panel);
}

function generateDemoCards(sectionId) {
  const cardData = {
    dashboard:    [['Users', '2,841'], ['Revenue', '$48.2k'], ['Sessions', '12.4k'], ['Bounce', '24%']],
    analytics:    [['Page Views', '84.2k'], ['Unique', '31.5k'], ['Avg. Time', '4m 12s'], ['Conv.', '3.2%']],
    users:        [['Total', '2,841'], ['Active', '1,204'], ['New (7d)', '142'], ['Churn', '2.1%']],
    products:     [['Active', '326'], ['Draft', '18'], ['Archived', '45'], ['Categories', '12']],
    orders:       [['Today', '84'], ['Pending', '12'], ['Shipped', '68'], ['Revenue', '$12.4k']],
    messages:     [['Inbox', '24'], ['Unread', '8'], ['Sent', '142'], ['Archived', '1,204']],
    calendar:     [['Events', '12'], ['Today', '3'], ['This Week', '8'], ['Reminders', '5']],
    documents:    [['Total', '1,842'], ['Shared', '326'], ['Recent', '24'], ['Starred', '18']],
    reports:      [['Generated', '48'], ['Scheduled', '6'], ['Templates', '12'], ['Exports', '142']],
    integrations: [['Active', '8'], ['Available', '42'], ['Pending', '2'], ['Errors', '0']],
    billing:      [['Plan', 'Pro'], ['MRR', '$2.4k'], ['Next Bill', 'May 1'], ['Cards', '2']],
    settings:     [['Users', '8'], ['Roles', '3'], ['API Keys', '4'], ['Webhooks', '2']],
  };

  return (cardData[sectionId] || [['—', '—']]).map(([title, value]) => `
    <div class="section-card">
      <div class="section-card-title">${title}</div>
      <div class="section-card-value">${value}</div>
    </div>
  `).join('');
}

// ─── Launcher Grid ────────────────────

const GRID_COLS = 4;

function openLauncher() {
  state.paletteOpen = true;
  state.paletteIndex = 0;
  renderLauncherGrid();
  dom.launcherOverlay.classList.add('is-open');
}

function closeLauncher() {
  state.paletteOpen = false;
  dom.launcherOverlay.classList.remove('is-open');
}

function getAllLauncherItems() {
  return [...SECTIONS, ...LAUNCHER_ACTIONS];
}

function renderLauncherGrid() {
  const allItems = getAllLauncherItems();

  // Section cards
  const sectionCards = SECTIONS.map((s, i) => {
    const isOpen = state.openTabs.includes(s.id);
    const selected = i === state.paletteIndex ? ' is-selected' : '';
    const open = isOpen ? ' is-open' : '';
    const num = String(i + 1).padStart(2, '0');
    return `
      <div class="launcher-card${selected}${open}" data-section="${s.id}" data-index="${i}">
        <div class="launcher-card-head">
          <span class="launcher-card-num">${num}</span>
          <span class="launcher-card-icon">${ICONS[s.icon] || ''}</span>
        </div>
        <span class="launcher-card-name">${s.label}</span>
        <span class="launcher-card-desc">${s.desc}</span>
      </div>
    `;
  }).join('');

  // Separator + default action cards
  const actionCards = LAUNCHER_ACTIONS.map((a, j) => {
    const idx = SECTIONS.length + j;
    const selected = idx === state.paletteIndex ? ' is-selected' : '';
    return `
      <div class="launcher-card launcher-card--action${selected}" data-action="${a.id}" data-index="${idx}">
        <div class="launcher-card-head">
          <span class="launcher-card-icon">${ICONS[a.icon] || ''}</span>
        </div>
        <span class="launcher-card-name">${a.label}</span>
        <span class="launcher-card-desc">${a.desc}</span>
      </div>
    `;
  }).join('');

  dom.launcherGrid.innerHTML =
    sectionCards
    + '<div class="launcher-separator"></div>'
    + actionCards;

  // Bind section cards
  dom.launcherGrid.querySelectorAll('.launcher-card[data-section]').forEach(el => {
    el.addEventListener('click', () => {
      openSection(el.dataset.section);
      closeLauncher();
    });
    el.addEventListener('mouseenter', () => {
      state.paletteIndex = parseInt(el.dataset.index);
      updateGridSelection();
    });
  });

  // Bind action cards
  dom.launcherGrid.querySelectorAll('.launcher-card[data-action]').forEach(el => {
    el.addEventListener('click', () => {
      handleLauncherAction(el.dataset.action);
    });
    el.addEventListener('mouseenter', () => {
      state.paletteIndex = parseInt(el.dataset.index);
      updateGridSelection();
    });
  });
}

function handleLauncherAction(actionId) {
  switch (actionId) {
    case '_close_layer':
      closeLauncher();
      if (state.activeTab) closeTab(state.activeTab);
      break;
    case '_library':
      // TODO: hook up library when available
      closeLauncher();
      break;
  }
}

function updateGridSelection() {
  dom.launcherGrid.querySelectorAll('.launcher-card').forEach((el, i) => {
    el.classList.toggle('is-selected', i === state.paletteIndex);
  });
}

// Grid keyboard navigation (2D: arrows)
document.addEventListener('keydown', (e) => {
  if (!state.paletteOpen) return;

  const allItems = getAllLauncherItems();
  const count = allItems.length;

  if (e.key === 'ArrowRight') {
    e.preventDefault();
    state.paletteIndex = (state.paletteIndex + 1) % count;
    updateGridSelection();
  } else if (e.key === 'ArrowLeft') {
    e.preventDefault();
    state.paletteIndex = (state.paletteIndex - 1 + count) % count;
    updateGridSelection();
  } else if (e.key === 'ArrowDown') {
    e.preventDefault();
    const next = state.paletteIndex + GRID_COLS;
    state.paletteIndex = next < count ? next : Math.min(state.paletteIndex, count - 1);
    updateGridSelection();
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    const prev = state.paletteIndex - GRID_COLS;
    state.paletteIndex = prev >= 0 ? prev : state.paletteIndex;
    updateGridSelection();
  } else if (e.key === 'Enter') {
    e.preventDefault();
    const card = dom.launcherGrid.querySelector(`.launcher-card[data-index="${state.paletteIndex}"]`);
    if (card) {
      if (card.dataset.action) {
        handleLauncherAction(card.dataset.action);
      } else if (card.dataset.section) {
        openSection(card.dataset.section);
        closeLauncher();
      }
    }
  } else if (e.key === 'Escape') {
    closeLauncher();
  }
});

// Close launcher on overlay click
dom.launcherOverlay.addEventListener('click', (e) => {
  if (e.target === dom.launcherOverlay) closeLauncher();
});

// ─── UI Triggers ──────────────────────

// "+" button in tab strip
dom.openPaletteBtn.addEventListener('click', openLauncher);

// Dropdown button in tab strip
$('#tabDropdownBtn').addEventListener('click', openLauncher);

// Close module button in tab strip
$('#tabCloseModuleBtn').addEventListener('click', () => {
  if (state.activeTab) closeTab(state.activeTab);
});

// Empty state search bar (clickable)
dom.emptyTrigger.addEventListener('click', openLauncher);

// Right-click anywhere → open launcher
document.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  state.paletteOpen ? closeLauncher() : openLauncher();
});

// ─── Global keyboard shortcuts ────────

document.addEventListener('keydown', (e) => {
  // Ctrl+K → Launcher
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault();
    state.paletteOpen ? closeLauncher() : openLauncher();
    return;
  }

  // Escape → close launcher
  if (e.key === 'Escape' && state.paletteOpen) {
    closeLauncher();
    return;
  }

  // Ctrl+W → close active tab
  if ((e.ctrlKey || e.metaKey) && e.key === 'w') {
    e.preventDefault();
    if (state.activeTab) closeTab(state.activeTab);
    return;
  }

  // Ctrl+Tab → next tab
  if (e.ctrlKey && e.key === 'Tab') {
    e.preventDefault();
    if (state.openTabs.length > 1) {
      const idx = state.openTabs.indexOf(state.activeTab);
      const nextIdx = e.shiftKey
        ? (idx - 1 + state.openTabs.length) % state.openTabs.length
        : (idx + 1) % state.openTabs.length;
      activateTab(state.openTabs[nextIdx]);
    }
    return;
  }

  // Ctrl+1..9 → activate tab by position
  if ((e.ctrlKey || e.metaKey) && e.key >= '1' && e.key <= '9') {
    e.preventDefault();
    const tabIdx = parseInt(e.key) - 1;
    if (tabIdx < state.openTabs.length) {
      activateTab(state.openTabs[tabIdx]);
    }
    return;
  }
});

// ─── Init ─────────────────────────────

renderTabs();
