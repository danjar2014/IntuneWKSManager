// Fluent UI Icons (Intune style) - SVG icons
const Icons = {
    dashboard: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 3h6v6H3V3zm8 0h6v6h-6V3zM3 11h6v6H3v-6zm8 0h6v6h-6v-6z" fill="currentColor"/></svg>`,
    requests: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M10 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16zm0 14a6 6 0 1 1 0-12 6 6 0 0 1 0 12zm-1-5h2v2H9v-2zm0-4h2v2H9V7z" fill="currentColor"/></svg>`,
    admins: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M10 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM5 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6zm10 0a3 3 0 1 0 0 6 3 3 0 0 0 0-6zm-5 5a5 5 0 0 0-4.5 2.85.5.5 0 0 0 .9.43 4 4 0 0 1 7.2 0 .5.5 0 1 0 .9-.43A5 5 0 0 0 10 14z" fill="currentColor"/></svg>`,
    roles: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M10 2L3 6v2c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V6l-7-4z" fill="currentColor"/></svg>`,
    features: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M10 2L3 7v11h4v-6h6v6h4V7l-7-5z" fill="currentColor"/></svg>`,
    clients: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 3h14v14H3V3zm1 1v12h12V4H4zm2 2h8v1H6V6zm0 2h8v1H6V8zm0 2h5v1H6v-1z" fill="currentColor"/></svg>`,
    devices: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 3h12a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zm1 1v12h10V4H5zm2 1h6v8H7V5zm1 1v6h4V6H8z" fill="currentColor"/></svg>`,
    users: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M10 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6zm-5 7a3 3 0 1 0 0 6 3 3 0 0 0 0-6zm10 0a3 3 0 1 0 0 6 3 3 0 0 0 0-6zm-5 5a5 5 0 0 0-4.5 2.85.5.5 0 0 0 .9.43 4 4 0 0 1 7.2 0 .5.5 0 1 0 .9-.43A5 5 0 0 0 10 14z" fill="currentColor"/></svg>`,
    apps: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 3h4v4H4V3zm8 0h4v4h-4V3zM4 13h4v4H4v-4zm8 0h4v4h-4v-4z" fill="currentColor"/></svg>`,
    settings: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M10 12a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm7.5-2.5a7.5 7.5 0 0 1-1.5 4.5l-1.5-1.5a5.5 5.5 0 0 0 0-6l1.5-1.5a7.5 7.5 0 0 1 1.5 4.5zM2.5 9.5a7.5 7.5 0 0 1 1.5-4.5l1.5 1.5a5.5 5.5 0 0 0 0 6L4 14a7.5 7.5 0 0 1-1.5-4.5zm12.5 0a2.5 2.5 0 0 1-1.5 2.3v3.2a5.5 5.5 0 0 0 3-3l-1.5-1.5zm-5 0a2.5 2.5 0 0 1 1.5-2.3V4a5.5 5.5 0 0 0-3 3l1.5 1.5z" fill="currentColor"/></svg>`,
    setup: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 4h4v2H4V4zm0 4h4v2H4V8zm0 4h4v2H4v-2zm6-8h4v2h-4V4zm0 4h4v2h-4V8zm0 4h4v2h-4v-2zm2-10H2v14h16V2h-6zm-2 12H4V4h6v8z" fill="currentColor"/></svg>`,
    backup: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M15 8a3.5 3.5 0 0 0-2.9-1.5 4 4 0 0 0-7.5 1 3.5 3.5 0 0 0-2 6.3V14h12v-1.2A3.5 3.5 0 0 0 15 8zm-5 6.5l-3-3h2V7h2v4.5h2l-3 3z" fill="currentColor"/></svg>`,
    audit: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 3h14v2H3V3zm0 4h14v2H3V7zm0 4h10v2H3v-2zm0 4h8v2H3v-2z" fill="currentColor"/></svg>`,
    chart: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 3h6v6H3V3zm8 0h6v6h-6V3zM3 11h6v6H3v-6zm8 0h6v6h-6v-6z" fill="currentColor"/></svg>`,
    sync: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8 2a6 6 0 0 0-5.2 9l1.4-1.4A4.5 4.5 0 1 1 8 3.5V5h2V2H8zm0 12a6 6 0 0 0 5.2-9l-1.4 1.4A4.5 4.5 0 1 1 8 12.5V11H6v3h2z" fill="currentColor"/></svg>`,
    restart: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8 2a6 6 0 1 0 6 6h-2a4 4 0 1 1-4-4V2z" fill="currentColor"/></svg>`,
    user: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6zm-2 7a3 3 0 0 0-3 3v2h10v-2a3 3 0 0 0-3-3H6z" fill="currentColor"/></svg>`,
    wipe: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8 2L2 5v9h12V5l-6-3zm0 1.5L12 6v7H4V6l4-2.5z" fill="currentColor"/></svg>`,
    refresh: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8 2a6 6 0 0 0-5.2 9l1.4-1.4A4.5 4.5 0 1 1 8 3.5V5h2V2H8zm0 12a6 6 0 0 0 5.2-9l-1.4 1.4A4.5 4.5 0 1 1 8 12.5V11H6v3h2z" fill="currentColor"/></svg>`,
    add: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8 2v12M2 8h12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,
    edit: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M11.5 2.5l2 2-8 8H3.5v-2l8-8z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    delete: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 4h8M6 4V3a1 1 0 0 1 1-1h2 a1 1 0 0 1 1 1v1M5 4v9a1 1 0 0 0 1 1h4 a1 1 0 0 0 1-1V4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`,
    toggle: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 8h8M8 4v8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`,
    theme: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M10 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16zm0 14V4a6 6 0 0 1 0 12z" fill="currentColor"/></svg>`,
    themeLight: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="10" cy="10" r="4" fill="currentColor"/><path d="M10 2v2M10 16v2M18 10h-2M4 10H2m14.14-4.24l-1.41 1.41M5.27 14.73l-1.41 1.41m11.32 0l-1.41-1.41M5.27 5.27l-1.41-1.41" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`,
    statRequests: `<svg width="48" height="48" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M10 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16zm0 14a6 6 0 1 1 0-12 6 6 0 0 1 0 12zm-1-5h2v2H9v-2zm0-4h2v2H9V7z" fill="currentColor"/></svg>`,
    statAdmins: `<svg width="48" height="48" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M10 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM5 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6zm10 0a3 3 0 1 0 0 6 3 3 0 0 0 0-6zm-5 5a5 5 0 0 0-4.5 2.85.5.5 0 0 0 .9.43 4 4 0 0 1 7.2 0 .5.5 0 1 0 .9-.43A5 5 0 0 0 10 14z" fill="currentColor"/></svg>`,
    statDevices: `<svg width="48" height="48" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 3h12a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zm1 1v12h10V4H5zm2 1h6v8H7V5zm1 1v6h4V6H8z" fill="currentColor"/></svg>`,
    statClients: `<svg width="48" height="48" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 3h14v14H3V3zm1 1v12h12V4H4zm2 2h8v1H6V6zm0 2h8v1H6V8zm0 2h5v1H6v-1z" fill="currentColor"/></svg>`,
    // Feature icons (mapping from features.json Icon names)
    laptop: `<svg width="24" height="24" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 3h12a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zm1 1v12h10V4H5zm2 1h6v8H7V5zm1 1v6h4V6H8z" fill="currentColor"/></svg>`,
    grid: `<svg width="24" height="24" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 3h4v4H4V3zm8 0h4v4h-4V3zM4 13h4v4H4v-4zm8 0h4v4h-4v-4z" fill="currentColor"/></svg>`,
    shield: `<svg width="24" height="24" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M10 2L3 6v2c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V6l-7-4z" fill="currentColor"/></svg>`,
    chart: `<svg width="24" height="24" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 3h6v6H3V3zm8 0h6v6h-6V3zM3 11h6v6H3v-6zm8 0h6v6h-6v-6z" fill="currentColor"/></svg>`
};

// Mapping pour les noms d'icônes des features
const IconMapping = {
    laptop: 'devices',
    grid: 'apps',
    shield: 'roles',
    chart: 'chart' // chart existe déjà dans Icons
};

function getIcon(name) {
    // Si le nom est dans le mapping, utiliser le nom mappé
    const mappedName = IconMapping[name] || name;
    return Icons[mappedName] || Icons[name] || '';
}
