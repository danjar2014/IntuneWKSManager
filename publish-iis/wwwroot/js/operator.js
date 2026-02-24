// Operator.js - Secondary Admin Interface (v2 - opT fix for window.top conflict)
const basePath = (document.querySelector('base')?.getAttribute('href') || '/').replace(/\/?$/, '/');

let currentUser = null;
let reportState = { devices: [], apps: [] };

function getLang() {
    const lang = localStorage.getItem('siteLang') || 'fr-FR';
    return (lang === 'en' || lang.startsWith('en-')) ? 'en' : 'fr-FR';
}
const opI18n = {
    'fr-FR': {
        storageLabel: 'Stockage : ', storageNotConnected: 'Stockage : Non connecté', graphOk: 'Graph : OK', graphNotConnected: 'Graph : Non connecté', actionDenied: 'Action non autorisée',
        navGeneral: 'Général', navDashboard: 'Tableau de bord', navIntune: 'Intune', navDevices: 'Appareils', navUsers: 'Utilisateurs', navApps: 'Applications', navSystem: 'Système', navSettings: 'Paramètres',
        signOut: 'Déconnexion', headerDashboard: 'Tableau de bord', headerDevices: 'Appareils', headerUsers: 'Utilisateurs AD', headerApps: 'Applications', headerSettings: 'Paramètres',
        welcome: 'Bienvenue', welcomeSubtitle: 'Portail Opérateur IntuneWksManager', statClients: 'Clients assignés', statDevices: 'Appareils accessibles', statActions: 'Actions autorisées',
        yourPermissions: 'Vos permissions', noPermissions: 'Aucune permission spécifique', loadError: 'Erreur de chargement',
        devicesTitle: 'Appareils', devicesSubtitle: 'Recherche par nom, utilisateur ou OS • Filtre par type', searchPlaceholder: 'Rechercher…', refresh: 'Actualiser',
        thName: 'Nom', thUser: 'Utilisateur', thOS: 'OS', thCompliance: 'Conformité', thLastSync: 'Dernière sync', thActions: 'Actions',
        usersTitle: 'Utilisateurs Azure AD', thUPN: 'UPN', thEmail: 'Email', thDepartment: 'Département',
        appsTitle: 'Applications', appsSubtitle: 'Recherche par nom ou éditeur', thPublisher: 'Éditeur', thType: 'Type', thCreated: 'Date création',
        settingsTitle: 'Paramètres', settingsSubtitle: 'Changer la langue d\'affichage', siteLanguage: 'Langue du site', save: 'Enregistrer',
        modalSetPrimaryUser: 'Définir l\'utilisateur principal', userAzureAd: 'Utilisateur Azure AD', cancel: 'Annuler',
        noAccessTitle: 'Accès non autorisé', noAccessText: 'Vous n\'avez pas la permission d\'accéder à cette fonctionnalité.',
        langSaved: 'Langue enregistrée. Rechargement…', langSavedEn: 'Language saved. Reloading…',
        navReports: 'Rapports', headerReports: 'Rapports', reportsTitle: 'Rapports', reportsSubtitle: 'Tableaux de bord et statistiques',
        reportTabCompliance: 'Rapport de conformité', reportTabDevices: 'Rapport des appareils', reportTabApps: 'Rapport des applications',
        reportCompliant: 'Appareils conformes', reportNonCompliant: 'Appareils non conformes', reportComplianceRate: 'Taux de conformité',
        reportDetailsByDevice: 'Détails par appareil', thDevice: 'Appareil', thComplianceState: 'État de conformité',
        reportTotalDevices: 'Total appareils', reportByOS: 'Répartition par système d\'exploitation', reportOS: 'Système d\'exploitation', reportCount: 'Nombre', reportPercent: 'Pourcentage',
        reportTotalApps: 'Total applications', reportRecentApps: 'Applications récentes', reportCreated: 'Date de création',
        reportLoading: 'Chargement…', reportNoDevices: 'Aucun appareil', reportNoApps: 'Aucune application'
    },
    'en': {
        storageLabel: 'Storage: ', storageNotConnected: 'Storage: Not connected', graphOk: 'Graph: OK', graphNotConnected: 'Graph: Not connected', actionDenied: 'Action not allowed',
        navGeneral: 'General', navDashboard: 'Dashboard', navIntune: 'Intune', navDevices: 'Devices', navUsers: 'Users', navApps: 'Applications', navSystem: 'System', navSettings: 'Settings',
        signOut: 'Sign out', headerDashboard: 'Dashboard', headerDevices: 'Devices', headerUsers: 'Users', headerApps: 'Applications', headerSettings: 'Settings',
        welcome: 'Welcome', welcomeSubtitle: 'Operator Portal IntuneWksManager', statClients: 'Assigned clients', statDevices: 'Accessible devices', statActions: 'Allowed actions',
        yourPermissions: 'Your permissions', noPermissions: 'No specific permissions', loadError: 'Load error',
        devicesTitle: 'Devices', devicesSubtitle: 'Search by name, user or OS • Filter by type', searchPlaceholder: 'Search…', refresh: 'Refresh',
        thName: 'Name', thUser: 'User', thOS: 'OS', thCompliance: 'Compliance', thLastSync: 'Last sync', thActions: 'Actions',
        usersTitle: 'Azure AD Users', thUPN: 'UPN', thEmail: 'Email', thDepartment: 'Department',
        appsTitle: 'Applications', appsSubtitle: 'Search by name or publisher', thPublisher: 'Publisher', thType: 'Type', thCreated: 'Created',
        settingsTitle: 'Settings', settingsSubtitle: 'Change display language', siteLanguage: 'Site language', save: 'Save',
        modalSetPrimaryUser: 'Set primary user', userAzureAd: 'Azure AD user', cancel: 'Cancel',
        noAccessTitle: 'Access denied', noAccessText: 'You do not have permission to access this feature.',
        langSaved: 'Langue enregistrée. Rechargement…', langSavedEn: 'Language saved. Reloading…',
        navReports: 'Reports', headerReports: 'Reports', reportsTitle: 'Reports', reportsSubtitle: 'Dashboards and statistics',
        reportTabCompliance: 'Compliance report', reportTabDevices: 'Devices report', reportTabApps: 'Applications report',
        reportCompliant: 'Compliant devices', reportNonCompliant: 'Non-compliant devices', reportComplianceRate: 'Compliance rate',
        reportDetailsByDevice: 'Details by device', thDevice: 'Device', thComplianceState: 'Compliance state',
        reportTotalDevices: 'Total devices', reportByOS: 'By operating system', reportOS: 'Operating system', reportCount: 'Count', reportPercent: 'Percentage',
        reportTotalApps: 'Total applications', reportRecentApps: 'Recent applications', reportCreated: 'Created',
        reportLoading: 'Loading…', reportNoDevices: 'No devices', reportNoApps: 'No applications'
    }
};
function opT(key) {
    const lang = getLang();
    const dict = opI18n[lang] || opI18n['en'] || opI18n['fr-FR'];
    return dict[key] != null ? dict[key] : key;
}

function applyOperatorLanguage() {
    const lang = getLang();
    const isEn = lang === 'en' || lang.startsWith('en-');
    document.documentElement.lang = isEn ? 'en' : 'fr';
    document.title = isEn ? 'IntuneWksManager - Operator' : 'IntuneWksManager - Opérateur';
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (key && opT(key)) el.textContent = opT(key);
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        if (key && opT(key)) el.placeholder = opT(key);
    });
    const headerTitle = document.getElementById('header-title');
    if (headerTitle && headerTitle.dataset.i18nPage) headerTitle.textContent = opT(headerTitle.dataset.i18nPage);
}

const api = {
    async get(endpoint) {
        const res = await fetch(`${basePath}api/${endpoint}`, { credentials: 'include' });
        if (res.status === 401) { window.location.href = `${basePath}`; return null; }
        if (res.status === 403) { return null; }
        if (!res.ok) throw new Error(`API Error: ${res.status}`);
        return res.json();
    },
    async post(endpoint, data) {
        const res = await fetch(`${basePath}api/${endpoint}`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data || {}), credentials: 'include'
        });
        if (res.status === 403) { showToast(opT('actionDenied'), 'error'); return null; }
        if (!res.ok) throw new Error(`API Error: ${res.status}`);
        return res.ok;
    }
};

function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 5000);
}

function hasPermission(permission) {
    if (!currentUser) return false;
    return currentUser.permissions?.includes('*') || currentUser.permissions?.includes(permission)
        || currentUser.allowedActions?.includes('*') || currentUser.allowedActions?.includes(permission);
}

function openModal(id) {
    document.getElementById(id)?.classList.add('active');
}
function closeModal(id) {
    document.getElementById(id)?.classList.remove('active');
}

function hasFeature(featureId) {
    if (!currentUser) return false;
    return currentUser.allowedFeatures?.includes('*') || currentUser.allowedFeatures?.includes(featureId);
}

function navigate(page) {
    // Check permission for the page
    const navItem = document.querySelector(`[data-page="${page}"]`);
    const requiredPermission = navItem?.dataset.permission;
    
    if (requiredPermission && !hasPermission(requiredPermission)) {
        document.querySelectorAll('.page-content').forEach(c => c.classList.add('hidden'));
        document.getElementById('page-noaccess').classList.remove('hidden');
        return;
    }
    
    document.querySelectorAll('.nav-item').forEach(i => i.classList.toggle('active', i.dataset.page === page));
    document.querySelectorAll('.page-content').forEach(c => c.classList.toggle('hidden', c.id !== `page-${page}`));
    
    loadPageData(page);
    
    const titleKeys = { 'dashboard': 'headerDashboard', 'devices': 'headerDevices', 'users': 'headerUsers', 'apps': 'headerApps', 'reports': 'headerReports', 'settings': 'headerSettings' };
    const headerTitle = document.getElementById('header-title');
    if (headerTitle) headerTitle.textContent = opT(titleKeys[page]) || page;
}

async function loadPageData(page) {
    try {
        switch (page) {
            case 'dashboard': await loadDashboard(); break;
            case 'devices': await loadDevices(); break;
            case 'users': await loadUsers(); break;
            case 'apps': await loadApps(); break;
            case 'reports': await loadReports(); break;
            case 'settings': loadOperatorSettings(); break;
        }
    } catch (e) {
        console.error(e);
        showToast(opT('loadError'), 'error');
    }
}

async function loadDashboard() {
    document.getElementById('stat-actions').textContent = currentUser.allowedActions?.length || 0;
    
    // Show permissions
    const permContainer = document.getElementById('my-permissions');
    if (currentUser.allowedActions?.length) {
        permContainer.innerHTML = `
            <div class="permissions-grid">
                ${currentUser.allowedActions.map(p => `<span class="badge badge-primary">${p}</span>`).join('')}
            </div>
        `;
    } else {
        permContainer.innerHTML = '<p class="text-muted">' + opT('noPermissions') + '</p>';
    }
    
    // Try to load devices count
    if (hasPermission('devices.read')) {
        try {
            const devices = await api.get('graph/devices');
            document.getElementById('stat-devices').textContent = devices?.length || 0;
            updateConnectionStatus(true);
        } catch {
            document.getElementById('stat-devices').textContent = '-';
            updateConnectionStatus(false);
        }
    }
    updateStorageStatus();
}

function updateConnectionStatus(connected) {
    const el = document.getElementById('connection-status');
    if (!el) return;
    el.className = `connection-badge ${connected ? 'connected' : 'disconnected'}`;
    el.innerHTML = `<span class="status-dot ${connected ? 'online' : 'offline'}"></span>${connected ? opT('graphOk') : opT('graphNotConnected')}`;
}

function loadOperatorSettings() {
    const lang = getLang();
    const el = document.getElementById('operator-setting-language');
    if (el) el.value = (lang === 'en' || lang === 'fr-FR') ? lang : 'fr-FR';
}

function saveOperatorSettings(e) {
    if (e) e.preventDefault();
    const el = document.getElementById('operator-setting-language');
    const lang = el ? (el.value === 'en' ? 'en' : 'fr-FR') : 'fr-FR';
    localStorage.setItem('siteLang', lang);
    showToast(lang === 'en' ? opT('langSavedEn') : opT('langSaved'), 'success');
    setTimeout(() => document.location.reload(), 800);
}

async function updateStorageStatus() {
    const badge = document.getElementById('storage-status-badge');
    if (!badge) return;
    try {
        const data = await api.get('storage/status?lang=' + encodeURIComponent(getLang()));
        const connected = data?.connected === true;
        badge.className = `connection-badge ${connected ? 'connected' : 'disconnected'}`;
        const dotClass = connected ? 'online' : 'offline';
        const modeText = data?.modeLabel || (data?.mode === 'SqlServer' ? 'SQL Server' : data?.mode === 'Json' ? 'JSON files' : '—');
        const label = connected ? (opT('storageLabel') + modeText) : opT('storageNotConnected');
        badge.innerHTML = `<span class="status-dot ${dotClass}"></span>${label}`;
    } catch (_) {
        badge.className = 'connection-badge disconnected';
        badge.innerHTML = '<span class="status-dot offline"></span>' + opT('storageNotConnected');
    }
}

const DEVICE_TYPES = [{ v: 'windows', n: 'Windows' }, { v: 'macos', n: 'macOS' }, { v: 'android', n: 'Android' }, { v: 'ios', n: 'iOS' }, { v: 'linux', n: 'Linux' }];

let devicesList = [];

function deviceMatchesOs(osLabel, operatingSystem) {
    const os = (operatingSystem || '').toLowerCase();
    if (!osLabel) return true;
    switch (osLabel) {
        case 'windows': return os.includes('windows');
        case 'macos': return os.includes('mac') || os.includes('macos') || os.includes('mac os');
        case 'android': return os.includes('android');
        case 'ios': return os.includes('ios') || os.includes('ipados');
        case 'linux': return os.includes('linux');
        default: return true;
    }
}

function renderDevicesTypeFilter() {
    const sel = document.getElementById('devices-type-filter');
    if (!sel) return;
    const allowed = currentUser?.allowedDeviceTypes || [];
    const allAllowed = !allowed.length || allowed.includes('*');
    const options = ['<option value="">Tous</option>'];
    DEVICE_TYPES.forEach(t => {
        if (allAllowed || allowed.includes(t.v)) options.push(`<option value="${t.v}">${t.n}</option>`);
    });
    sel.innerHTML = options.join('');
}

async function loadDevices() {
    if (!hasPermission('devices.read')) {
        document.getElementById('devices-table-body').innerHTML = '<tr><td colspan="6" class="text-center text-muted">Accès non autorisé</td></tr>';
        return;
    }
    try {
        devicesList = await api.get('graph/devices') || [];
        const q = document.getElementById('devices-search');
        if (q) q.value = '';
        renderDevicesTypeFilter();
        const typeEl = document.getElementById('devices-type-filter');
        if (typeEl) typeEl.value = '';
        filterDevices();
    } catch {
        document.getElementById('devices-table-body').innerHTML = '<tr><td colspan="6" class="text-center text-muted">Erreur de connexion</td></tr>';
    }
}

function filterDevices() {
    const searchEl = document.getElementById('devices-search');
    const typeEl = document.getElementById('devices-type-filter');
    const q = (searchEl?.value || '').trim().toLowerCase();
    const typeFilter = (typeEl?.value || '').trim().toLowerCase();
    let list = devicesList.filter(d => deviceMatchesOs(typeFilter, d.operatingSystem));
    if (q) {
        list = list.filter(d => {
            const dn = (d.deviceName || '').toLowerCase();
            const upn = (d.userPrincipalName || '').toLowerCase();
            const os = (d.operatingSystem || '').toLowerCase();
            const ver = (d.osVersion || '').toLowerCase();
            return dn.includes(q) || upn.includes(q) || os.includes(q) || ver.includes(q);
        });
    }
    const tbody = document.getElementById('devices-table-body');
    if (!tbody) return;
    if (!list.length) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">Aucun appareil</td></tr>';
        return;
    }
    const esc = s => (s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');
    const canSetUser = hasPermission('devices.setPrimaryUser');
    tbody.innerHTML = list.map(d => {
        const id = esc(d.id);
        const canSync = hasPermission('devices.sync');
        const canRestart = hasPermission('devices.restart');
        const canWipe = hasPermission('devices.wipe');
        const btns = [
            canSync ? `<button class="btn btn-sm btn-secondary" onclick="syncDevice('${id}')" title="Synchroniser">${getIcon('sync')}</button>` : '',
            canRestart ? `<button class="btn btn-sm btn-secondary" onclick="restartDevice('${id}')" title="Redémarrer">${getIcon('restart')}</button>` : '',
            canWipe ? `<button class="btn btn-sm btn-danger" onclick="wipeDevice('${id}')" title="Effacer">${getIcon('wipe')}</button>` : '',
            canSetUser ? `<button class="btn btn-sm btn-secondary" onclick="openSetPrimaryUserModal('${id}')" title="Définir utilisateur principal">${getIcon('user')}</button>` : ''
        ].filter(Boolean).join(' ');
        return `<tr>
            <td><strong>${esc(d.deviceName)}</strong></td>
            <td>${esc(d.userPrincipalName || '-')}</td>
            <td>${esc(d.operatingSystem)} ${d.osVersion || ''}</td>
            <td><span class="badge ${d.complianceState === 'compliant' ? 'badge-success' : 'badge-warning'}">${esc(d.complianceState || '-')}</span></td>
            <td>${d.lastSyncDateTime ? new Date(d.lastSyncDateTime).toLocaleDateString('fr-FR') : '-'}</td>
            <td>${btns || '<span class="text-muted">-</span>'}</td>
        </tr>`;
    }).join('');
}

async function syncDevice(id) {
    try {
        await api.post(`graph/devices/${id}/sync`);
        showToast('Synchronisation lancée', 'success');
        loadDevices();
    } catch {
        showToast('Erreur', 'error');
    }
}

async function restartDevice(id) {
    if (!confirm('Voulez-vous vraiment redémarrer cet appareil?')) return;
    try {
        await api.post(`graph/devices/${id}/restart`);
        showToast('Redémarrage lancé', 'success');
        loadDevices();
    } catch {
        showToast('Erreur', 'error');
    }
}

async function openSetPrimaryUserModal(deviceId) {
    document.getElementById('set-primary-user-device-id').value = deviceId;
    const sel = document.getElementById('set-primary-user-select');
    try {
        const users = await api.get('graph/users') || [];
        const esc = s => (s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');
        sel.innerHTML = '<option value="">-- Choisir un utilisateur --</option>' +
            users.map(u => `<option value="${esc(u.id)}">${esc(u.displayName || u.userPrincipalName || '')} (${esc(u.userPrincipalName || '')})</option>`).join('');
        openModal('set-primary-user-modal');
    } catch {
        showToast('Erreur chargement utilisateurs', 'error');
    }
}

function closeSetPrimaryUserModal() {
    closeModal('set-primary-user-modal');
}

async function submitSetPrimaryUser() {
    const deviceId = document.getElementById('set-primary-user-device-id').value;
    const userId = document.getElementById('set-primary-user-select').value;
    if (!userId) {
        showToast('Choisir un utilisateur', 'error');
        return;
    }
    try {
        await api.post(`graph/devices/${deviceId}/set-primary-user`, { userId });
        showToast('Utilisateur principal défini', 'success');
        closeSetPrimaryUserModal();
        loadDevices();
    } catch {
        showToast('Erreur', 'error');
    }
}

async function wipeDevice(id) {
    if (!confirm('⚠️ ATTENTION: Cette action va EFFACER toutes les données de l\'appareil. Continuer?')) return;
    if (!confirm('Êtes-vous VRAIMENT sûr? Cette action est irréversible!')) return;
    
    try {
        await api.post(`graph/devices/${id}/wipe`);
        showToast('Effacement lancé', 'success');
    } catch {
        showToast('Erreur', 'error');
    }
}

async function loadUsers() {
    if (!hasPermission('users.read')) {
        document.getElementById('users-table-body').innerHTML = '<tr><td colspan="4" class="text-center text-muted">Accès non autorisé</td></tr>';
        return;
    }
    try {
        const users = await api.get('graph/users') || [];
        const tbody = document.getElementById('users-table-body');
        if (!users.length) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">Aucun utilisateur</td></tr>';
            return;
        }
        const esc = s => (s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');
        tbody.innerHTML = users.map(u => `<tr>
            <td>${esc(u.displayName)}</td>
            <td>${esc(u.userPrincipalName)}</td>
            <td>${esc(u.mail || '-')}</td>
            <td>${esc(u.department || '-')}</td>
        </tr>`).join('');
    } catch {
        document.getElementById('users-table-body').innerHTML = '<tr><td colspan="4" class="text-center text-muted">Erreur</td></tr>';
    }
}

let appsList = [];

async function loadApps() {
    if (!hasPermission('apps.read')) {
        document.getElementById('apps-table-body').innerHTML = '<tr><td colspan="4" class="text-center text-muted">Accès non autorisé</td></tr>';
        return;
    }
    try {
        appsList = await api.get('graph/apps') || [];
        const q = document.getElementById('apps-search');
        if (q) q.value = '';
        filterApps();
    } catch {
        document.getElementById('apps-table-body').innerHTML = '<tr><td colspan="4" class="text-center text-muted">Erreur</td></tr>';
    }
}

function filterApps() {
    const el = document.getElementById('apps-search');
    const q = (el?.value || '').trim().toLowerCase();
    let list = appsList;
    if (q) {
        list = list.filter(a =>
            (a.displayName || '').toLowerCase().includes(q) ||
            (a.publisher || '').toLowerCase().includes(q)
        );
    }
    const tbody = document.getElementById('apps-table-body');
    if (!tbody) return;
    if (!list.length) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">Aucune application</td></tr>';
        return;
    }
    const esc = s => (s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');
    tbody.innerHTML = list.map(a => `<tr>
        <td>${esc(a.displayName)}</td>
        <td>${esc(a.publisher || '-')}</td>
        <td>${(a.appType || '').replace('#microsoft.graph.', '') || '-'}</td>
        <td>${a.createdDateTime ? new Date(a.createdDateTime).toLocaleDateString('fr-FR') : '-'}</td>
    </tr>`).join('');
}

function showReportTab(tab) {
    document.querySelectorAll('[id^="tab-"]').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.report-section').forEach(s => s.classList.add('hidden'));
    const tabEl = document.getElementById('tab-' + tab);
    const sectionEl = document.getElementById('report-' + tab);
    if (tabEl) tabEl.classList.add('active');
    if (sectionEl) sectionEl.classList.remove('hidden');
}

async function loadReports() {
    const el = (id) => document.getElementById(id);
    const loadingMsg = opT('reportLoading');
    const showCompliance = canShowReportCompliance();
    const showDevices = canShowReportDevices();
    const showApps = canShowReportApps();
    ['tab-compliance', 'tab-devices', 'tab-apps'].forEach((tid, i) => {
        const t = el(tid);
        if (!t) return;
        const visible = [showCompliance, showDevices, showApps][i];
        t.style.display = visible ? '' : 'none';
    });
    ['report-compliance', 'report-devices', 'report-apps'].forEach((sid, i) => {
        const s = el(sid);
        if (!s) return;
        const visible = [showCompliance, showDevices, showApps][i];
        s.classList.toggle('hidden', !visible);
    });
    try {
        ['report-compliant-count', 'report-noncompliant-count', 'report-compliant-percent',
            'report-devices-total', 'report-devices-windows', 'report-devices-macos', 'report-devices-mobile',
            'report-apps-total', 'report-apps-store', 'report-apps-lob'].forEach(id => { const e = el(id); if (e) e.textContent = '…'; });
        if (el('compliance-table-body')) el('compliance-table-body').innerHTML = '<tr><td colspan="5" class="text-center text-muted">' + loadingMsg + '</td></tr>';
        if (el('devices-os-table-body')) el('devices-os-table-body').innerHTML = '<tr><td colspan="3" class="text-center text-muted">' + loadingMsg + '</td></tr>';
        if (el('apps-report-table-body')) el('apps-report-table-body').innerHTML = '<tr><td colspan="4" class="text-center text-muted">' + loadingMsg + '</td></tr>';

        let devices = [];
        let apps = [];
        if ((showCompliance || showDevices) && hasPermission('devices.read')) {
            try { devices = await api.get('graph/devices') || []; } catch (_) {}
        }
        if (showApps && hasPermission('apps.read')) {
            try { apps = await api.get('graph/apps') || []; } catch (_) {}
        }
        reportState.devices = Array.isArray(devices) ? devices : [];
        reportState.apps = Array.isArray(apps) ? apps : [];

        if (showCompliance) renderComplianceReport();
        if (showDevices) renderDevicesReport();
        if (showApps) renderAppsReport();
        const firstTab = showCompliance ? 'compliance' : (showDevices ? 'devices' : (showApps ? 'apps' : null));
        if (firstTab && el('tab-' + firstTab)) showReportTab(firstTab);
    } catch (err) {
        console.error('Reports load error:', err);
        if (showCompliance) renderComplianceReport();
        if (showDevices) renderDevicesReport();
        if (showApps) renderAppsReport();
    }
}

function renderComplianceReport() {
    const devices = reportState.devices || [];
    const compliant = devices.filter(d => (d.complianceState || '').toLowerCase() === 'compliant').length;
    const nonCompliant = devices.length - compliant;
    const percent = devices.length > 0 ? Math.round((compliant / devices.length) * 100) : 0;
    const set = (id, text) => { const e = document.getElementById(id); if (e) e.textContent = text; };
    set('report-compliant-count', compliant);
    set('report-noncompliant-count', nonCompliant);
    set('report-compliant-percent', percent + '%');
    const tbody = document.getElementById('compliance-table-body');
    if (!tbody) return;
    if (!devices.length) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">' + opT('reportNoDevices') + '</td></tr>';
        return;
    }
    const esc = s => (s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    tbody.innerHTML = devices.map(d => {
        const complianceBadge = (d.complianceState || '').toLowerCase() === 'compliant' ? 'badge-success' : 'badge-warning';
        const lastSync = d.lastSyncDateTime ? new Date(d.lastSyncDateTime).toLocaleString(getLang().startsWith('en') ? 'en-GB' : 'fr-FR') : '-';
        return '<tr><td><strong>' + esc(d.deviceName || '-') + '</strong></td><td>' + esc(d.userPrincipalName || '-') + '</td><td>' + esc(d.operatingSystem || '-') + '</td><td><span class="badge ' + complianceBadge + '">' + esc(d.complianceState || '-') + '</span></td><td>' + lastSync + '</td></tr>';
    }).join('');
}

function renderDevicesReport() {
    const devices = reportState.devices || [];
    const total = devices.length;
    const windows = devices.filter(d => (d.operatingSystem || '').toLowerCase().includes('windows')).length;
    const macos = devices.filter(d => { const os = (d.operatingSystem || '').toLowerCase(); return os.includes('mac') || os.includes('macos') || os.includes('mac os'); }).length;
    const mobile = devices.filter(d => { const os = (d.operatingSystem || '').toLowerCase(); return os.includes('android') || os.includes('ios') || os.includes('iphone'); }).length;
    const set = (id, text) => { const e = document.getElementById(id); if (e) e.textContent = text; };
    set('report-devices-total', total);
    set('report-devices-windows', windows);
    set('report-devices-macos', macos);
    set('report-devices-mobile', mobile);
    const tbody = document.getElementById('devices-os-table-body');
    if (!tbody) return;
    if (!devices.length) {
        tbody.innerHTML = '<tr><td colspan="3" class="text-center text-muted">' + opT('reportNoDevices') + '</td></tr>';
        return;
    }
    const osCounts = {};
    devices.forEach(d => { const os = d.operatingSystem || 'Inconnu'; osCounts[os] = (osCounts[os] || 0) + 1; });
    const esc = s => (s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    tbody.innerHTML = Object.entries(osCounts).sort((a, b) => b[1] - a[1]).map(([os, count]) => {
        const pct = total > 0 ? Math.round((count / total) * 100) : 0;
        return '<tr><td><strong>' + esc(os) + '</strong></td><td>' + count + '</td><td>' + pct + '%</td></tr>';
    }).join('');
}

function renderAppsReport() {
    const apps = reportState.apps || [];
    const total = apps.length;
    const storeApps = apps.filter(a => (a.appType || '').toLowerCase().includes('store')).length;
    const lobApps = apps.filter(a => (a.appType || '').toLowerCase().includes('lob') || (a.appType || '').toLowerCase().includes('line')).length;
    const set = (id, text) => { const e = document.getElementById(id); if (e) e.textContent = text; };
    set('report-apps-total', total);
    set('report-apps-store', storeApps);
    set('report-apps-lob', lobApps);
    const tbody = document.getElementById('apps-report-table-body');
    if (!tbody) return;
    if (!apps.length) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">' + opT('reportNoApps') + '</td></tr>';
        return;
    }
    const esc = s => (s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    const sorted = [...apps].sort((a, b) => (new Date(b.createdDateTime || 0)).getTime() - (new Date(a.createdDateTime || 0)).getTime());
    tbody.innerHTML = sorted.slice(0, 50).map(a => '<tr><td>' + esc(a.displayName || '-') + '</td><td>' + esc(a.publisher || '-') + '</td><td>' + esc((a.appType || '').replace('#microsoft.graph.', '')) + '</td><td>' + (a.createdDateTime ? new Date(a.createdDateTime).toLocaleDateString(getLang().startsWith('en') ? 'en-GB' : 'fr-FR') : '-') + '</td></tr>').join('');
}

function hasReportAccess() {
    return hasPermission('reports.read') || hasPermission('reports.compliance') || hasPermission('reports.devices') || hasPermission('reports.apps');
}
function canShowReportCompliance() { return hasPermission('reports.read') || hasPermission('reports.compliance'); }
function canShowReportDevices() { return hasPermission('reports.read') || hasPermission('reports.devices'); }
function canShowReportApps() { return hasPermission('reports.read') || hasPermission('reports.apps'); }

function setupNavigation() {
    document.querySelectorAll('.nav-item').forEach(item => {
        if (item.dataset.permissionReports) {
            const list = (item.dataset.permissionReports || '').split(',').map(s => s.trim()).filter(Boolean);
            item.style.display = list.some(p => hasPermission(p)) ? '' : 'none';
        } else if (item.dataset.permission) {
            if (!hasPermission(item.dataset.permission)) item.style.display = 'none';
        }
    });
}

function onSearchInput(e) {
    const id = e.target?.id;
    if (id === 'devices-search' || id === 'devices-type-filter') filterDevices();
    if (id === 'apps-search') filterApps();
}

// Init
document.addEventListener('DOMContentLoaded', async () => {
    try {
        currentUser = await api.get('auth/me');
        
        if (!currentUser) {
            window.location.href = `${basePath}`;
            return;
        }
        
        if (currentUser.isPrimaryAdmin) {
            window.location.href = basePath + 'Admin';
            return;
        }
        
        if (!currentUser.isApproved) {
            window.location.href = basePath + 'AccessRequest';
            return;
        }
        
        document.getElementById('current-user-name').textContent = currentUser.displayName || currentUser.email || 'Opérateur';
        document.getElementById('current-user-role').textContent = currentUser.role || '-';
        document.getElementById('user-role-display').textContent = currentUser.role || 'Opérateur';
        document.getElementById('user-avatar').textContent = (currentUser.displayName || currentUser.email || 'O').charAt(0).toUpperCase();
        document.getElementById('welcome-msg').textContent = opT('welcome') + ' ' + (currentUser.displayName || currentUser.email || '');
        applyOperatorLanguage();
        // Masquer Stockage et Graph pour l'opérateur (réservé à l'admin)
        const storageBadge = document.getElementById('storage-status-badge');
        const graphBadge = document.getElementById('connection-status');
        if (storageBadge) storageBadge.style.display = 'none';
        if (graphBadge) graphBadge.style.display = 'none';
        
        setupNavigation();
        document.addEventListener('input', onSearchInput);
        document.addEventListener('change', onSearchInput);
        
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', () => navigate(item.dataset.page));
        });
        
        const settingsForm = document.getElementById('operator-settings-form');
        if (settingsForm) settingsForm.addEventListener('submit', saveOperatorSettings);
        
        navigate('dashboard');
        
    } catch (e) {
        console.error(e);
        window.location.href = `${basePath}`;
    }
});
