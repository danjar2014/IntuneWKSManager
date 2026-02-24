// Admin.js - Primary Admin Interface
const basePath = (document.querySelector('base')?.getAttribute('href') || '/').replace(/\/?$/, '/');

const state = {
    currentUser: null,
    requests: [],
    admins: [],
    roles: [],
    permissions: [],
    features: [],
    devices: [],
    intuneUsers: [],
    apps: [],
    settings: null
};

const api = {
    async get(endpoint) {
        const res = await fetch(`${basePath}api/${endpoint}`);
        if (res.status === 401) { window.location.href = `${basePath}`; return; }
        if (res.status === 403) { showToast(t('accessDenied'), 'error'); return null; }
        if (!res.ok) throw new Error(`API Error: ${res.status}`);
        return res.json();
    },
    async post(endpoint, data) {
        const res = await fetch(`${basePath}api/${endpoint}`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
        });
        if (!res.ok) {
            let msg = `API Error: ${res.status}`;
            try { const j = await res.json(); if (j?.message) msg = j.message; } catch (_) {}
            throw new Error(msg);
        }
        return res.json();
    },
    async put(endpoint, data) {
        const res = await fetch(`${basePath}api/${endpoint}`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
        });
        if (!res.ok) throw new Error(`API Error: ${res.status}`);
        return res.json();
    },
    async delete(endpoint) {
        const res = await fetch(`${basePath}api/${endpoint}`, { method: 'DELETE' });
        if (!res.ok) throw new Error(`API Error: ${res.status}`);
        return true;
    }
};

// i18n - Langue du site (fr-FR / en)
const i18n = {
    'fr-FR': {
        nav: { sectionGeneral: 'Général', sectionAccess: 'Gestion des accès', sectionConfig: 'Configuration', sectionIntune: 'Intune', sectionSystem: 'Système',
            dashboard: 'Tableau de bord', requests: 'Demandes d\'accès', admins: 'Admins secondaires', roles: 'Rôles & Permissions',
            devices: 'Appareils', intuneUsers: 'Utilisateurs AD', apps: 'Applications', reports: 'Rapports', setup: 'Configuration système', backup: 'Sauvegarde', settings: 'Paramètres', audit: 'Journal d\'audit' },
        titles: { dashboard: 'Tableau de bord', requests: 'Demandes d\'accès', admins: 'Admins Secondaires', roles: 'Rôles & Permissions',
            devices: 'Appareils Intune', 'intune-users': 'Utilisateurs AD', apps: 'Applications', reports: 'Rapports', setup: 'Configuration système', backup: 'Sauvegarde', settings: 'Paramètres', audit: 'Journal d\'audit' },
        settings: { title: 'Paramètres', language: 'Langue du site', languageSubtitle: 'Changer la langue et le titre du portail', sidebarTitle: 'Titre de la barre latérale', langFr: 'Français', langEn: 'English', save: 'Enregistrer' },
        msg: { saved: 'Paramètres sauvegardés', error: 'Erreur', loadError: 'Erreur de chargement', unknown: 'inconnue', errorPrefix: 'Erreur : ', statusUpdated: 'Statut modifié' },
        storage: { activeLabel: 'Stockage actif : ', sqlServer: 'SQL Server', jsonFiles: 'Fichiers JSON (Config/)', noticeRestart: 'Le stockage affiché est celui chargé au démarrage. Après modification, redémarrez le pool d\'applications IIS (ou le site web).', saving: 'Enregistrement...', savedRestartIIS: 'Configuration enregistrée. Redémarrez le pool d\'applications IIS (ou le site web) pour appliquer.', savedToast: 'Stockage enregistré. Redémarrez le pool IIS pour appliquer.', testing: 'Test en cours...', connectionOk: 'Connexion réussie.', tablesCreating: 'Création des tables...', tablesCreated: 'Tables créées.', jsonActivating: 'Création des fichiers et passage en mode JSON...', jsonActivated: 'Mode Fichiers JSON activé. Redémarrez l\'application.', failure: 'Échec : ', loading: 'Chargement...', notConnected: 'Stockage : Non connecté', graphOk: 'Graph : OK', graphNotConnected: 'Graph : Non connecté' },
        setup: { azureadLoaded: 'Configuration actuelle chargée. Laissez le secret vide pour conserver.', tenantClientRequired: 'Tenant ID et Client ID sont requis', azureadSaving: 'Sauvegarde en cours...', azureadSaved: 'Configuration sauvegardée avec succès', adminAdd: 'Ajouter un administrateur principal', adminEdit: 'Modifier un administrateur principal', adminSaved: 'Administrateur enregistré', adminDeleted: 'Administrateur supprimé', adminNotFound: 'Administrateur non trouvé', confirmDeleteAdmin: 'Êtes-vous sûr de vouloir supprimer cet administrateur principal ?', secretEnterPlain: 'Saisissez d\'abord le secret en clair', secretGenerated: 'Valeur chiffrée générée. Copiez-la dans appsettings.json → AzureAd:ClientSecret', copied: 'Copié dans le presse-papiers', copyFailed: 'Copie échouée', noAdmins: 'Aucun administrateur principal', active: 'Actif', inactive: 'Inactif', edit: 'Modifier', delete: 'Supprimer', emailRequired: 'L\'email est requis' },
        requests: { none: 'Aucune demande en attente', approve: 'Approuver cette demande?', approved: 'Demande approuvée', rejected: 'Demande rejetée', rejectPrompt: 'Raison du refus (optionnel):' },
        admins: { none: 'Aucun admin secondaire', newAdmin: 'Nouvel Admin Secondaire', adminCreated: 'Admin créé', adminModified: 'Admin modifié', disable: 'Désactiver', enable: 'Activer', searchPlaceholder: 'Tapez les premières lettres du nom ou de l\'email...', noUserFound: 'Aucun utilisateur trouvé' },
        backup: { generating: 'Génération en cours...', downloaded: 'Sauvegarde téléchargée', keyCopied: 'Clé copiée dans le presse-papiers', restoreConfirm: 'Remplacer toute la configuration actuelle par celle du fichier ? Redémarrage recommandé après restauration.', restoring: 'Restauration en cours...', chooseFile: 'Choisissez un fichier.', keyWarning: 'Cette clé ne sera plus affichée. Copiez-la et conservez-la en lieu sûr ; elle sera exigée pour restaurer cette sauvegarde.', restored: 'Configuration restaurée' },
        graph: { connectionOk: 'Connexion réussie!', connectionFailed: 'Connexion échouée', error: 'Erreur de connexion' },
        devices: { loadUsersError: 'Erreur chargement utilisateurs', chooseUser: 'Choisir un utilisateur', primaryUserSet: 'Utilisateur principal défini', syncLaunched: 'Sync lancée', restartConfirm: 'Redémarrer?', restartLaunched: 'Redémarrage lancé' },
        reports: { apiError: 'Erreur API lors du chargement des rapports (vérifiez la configuration Graph).', accessDenied: 'Accès refusé aux données (permissions devices.read / apps.read).', loadError: 'Erreur lors du chargement des rapports' },
        accessDenied: 'Accès refusé',
        setupPage: { subtitle: 'Stockage, Azure AD, administrateurs principaux', storageTitle: 'Stockage des données', storageSubtitle: 'Connexion base de données ou fichiers JSON. Après modification, redémarrer le pool d\'applications IIS (ou le site web).', sqlTitle: 'Connexion SQL Server', serverLabel: 'Serveur (instance)', serverPlaceholder: 'localhost ou .\\SQLEXPRESS', portLabel: 'Port', portHint: '(défaut 1433)', databaseLabel: 'Base de données', databasePlaceholder: 'IntuneWksManager', databaseTitle: 'Le nom doit correspondre à une base existante (ex. IntuneWksManager).', dbMustExist: 'La base doit exister sur le serveur et le compte IIS APPPOOL\\IntuneWksManager doit y avoir accès (voir aide ci‑dessous).', integratedAuth: 'Authentification Windows', integratedHint: 'La connexion SQL utilisera le compte Windows de l\'utilisateur connecté (session), pas le pool IIS. Activez l\'authentification Windows dans IIS pour cette application : le navigateur enverra alors les identifiants Windows et SQL Server verra votre compte (ex. DOMAINE\\utilisateur). Accordez à votre compte les droits sur la base.', sqlUserLabel: 'Utilisateur SQL', passwordLabel: 'Mot de passe', passwordHint: '(vide = ne pas modifier)', btnTest: 'Tester la connexion', btnSetupTables: 'Créer les tables', btnSaveSql: 'Enregistrer et utiliser SQL Server', sqlDetailsSummary: 'Commandes SQL pour créer la base et accorder l\'accès (Authentification Windows)', sqlDetailsText: 'À exécuter dans SQL Server Management Studio (ou sqlcmd) en tant qu\'administrateur. Adaptez le nom de la base si besoin. Le login doit être le compte du pool IIS.', jsonTitle: 'Fichiers JSON', jsonDesc: 'Crée le dossier Config/ et les fichiers nécessaires, puis active ce mode. Les fichiers créés sont vides ; les données en SQL ne sont pas copiées. Redémarrez ensuite le pool IIS.', btnJson: 'Utiliser les fichiers JSON', azureAdTitle: 'Configuration Azure AD', tenantIdLabel: 'Tenant ID', clientIdLabel: 'Client ID', clientSecretLabel: 'Client Secret', clientSecretPlaceholder: 'Laisser vide pour conserver', encryptedHint: 'Chiffré automatiquement', btnSave: 'Sauvegarder', encryptedSectionTitle: 'Valeur chiffrée pour appsettings.json', encryptedSectionDesc: 'Saisissez le secret en clair puis cliquez sur Générer. Copiez la valeur ENC:... dans appsettings.json → AzureAd:ClientSecret.', secretPlainLabel: 'Secret en clair', secretPlainPlaceholder: 'Votre Client Secret Azure AD', btnGenerate: 'Générer valeur chiffrée', valueToPasteLabel: 'Valeur à coller dans appsettings.json', btnCopy: 'Copier', primaryAdminsTitle: 'Administrateurs Principaux', btnAdd: 'Ajouter', tableEmail: 'Email', tableName: 'Nom', tableObjectId: 'Object ID', tableStatus: 'Statut', tableActions: 'Actions', modalEmail: 'Email *', modalDisplayName: 'Nom d\'affichage', modalObjectId: 'Azure Object ID', modalActive: 'Actif', modalCancel: 'Annuler', modalSave: 'Sauvegarder', backupKeyTitle: 'Clé de restauration', backupKeyCopied: 'J\'ai copié la clé' }
    },
    'en': {
        nav: { sectionGeneral: 'General', sectionAccess: 'Access management', sectionConfig: 'Configuration', sectionIntune: 'Intune', sectionSystem: 'System',
            dashboard: 'Dashboard', requests: 'Access requests', admins: 'Secondary admins', roles: 'Roles & Permissions',
            devices: 'Devices', intuneUsers: 'AD Users', apps: 'Applications', reports: 'Reports', setup: 'System configuration', backup: 'Backup', settings: 'Settings', audit: 'Audit log' },
        titles: { dashboard: 'Dashboard', requests: 'Access requests', admins: 'Secondary Admins', roles: 'Roles & Permissions',
            devices: 'Intune devices', 'intune-users': 'AD Users', apps: 'Applications', reports: 'Reports', setup: 'System configuration', backup: 'Backup', settings: 'Settings', audit: 'Audit log' },
        settings: { title: 'Settings', language: 'Site language', languageSubtitle: 'Change the portal language and title', sidebarTitle: 'Sidebar title', langFr: 'Français', langEn: 'English', save: 'Save' },
        msg: { saved: 'Settings saved', error: 'Error', loadError: 'Load error', unknown: 'unknown', errorPrefix: 'Error: ', statusUpdated: 'Status updated' },
        storage: { activeLabel: 'Active storage: ', sqlServer: 'SQL Server', jsonFiles: 'JSON files (Config/)', noticeRestart: 'The storage shown is the one loaded at startup. After any change, restart the IIS application pool (or the website).', saving: 'Saving...', savedRestartIIS: 'Settings saved. Restart the IIS application pool (or website) to apply.', savedToast: 'Storage saved. Restart IIS pool to apply.', testing: 'Testing...', connectionOk: 'Connection successful.', tablesCreating: 'Creating tables...', tablesCreated: 'Tables created.', jsonActivating: 'Creating files and switching to JSON mode...', jsonActivated: 'JSON mode enabled. Restart the application.', failure: 'Failure: ', loading: 'Loading...', notConnected: 'Storage: Not connected', graphOk: 'Graph: OK', graphNotConnected: 'Graph: Not connected' },
        setup: { azureadLoaded: 'Current configuration loaded. Leave secret empty to keep.', tenantClientRequired: 'Tenant ID and Client ID are required', azureadSaving: 'Saving...', azureadSaved: 'Configuration saved successfully', adminAdd: 'Add primary administrator', adminEdit: 'Edit primary administrator', adminSaved: 'Administrator saved', adminDeleted: 'Administrator deleted', adminNotFound: 'Administrator not found', confirmDeleteAdmin: 'Are you sure you want to remove this primary administrator?', secretEnterPlain: 'Enter the secret in plain text first', secretGenerated: 'Encrypted value generated. Copy it to appsettings.json → AzureAd:ClientSecret', copied: 'Copied to clipboard', copyFailed: 'Copy failed', noAdmins: 'No primary administrators', active: 'Active', inactive: 'Inactive', edit: 'Edit', delete: 'Delete', emailRequired: 'Email is required' },
        requests: { none: 'No pending requests', approve: 'Approve this request?', approved: 'Request approved', rejected: 'Request rejected', rejectPrompt: 'Reason for rejection (optional):' },
        admins: { none: 'No secondary admins', newAdmin: 'New Secondary Admin', adminCreated: 'Admin created', adminModified: 'Admin modified', disable: 'Disable', enable: 'Enable', searchPlaceholder: 'Type the first letters of the name or email...', noUserFound: 'No user found' },
        backup: { generating: 'Generating...', downloaded: 'Backup downloaded', keyCopied: 'Key copied to clipboard', restoreConfirm: 'Replace all current configuration with the file? Restart recommended after restore.', restoring: 'Restoring...', chooseFile: 'Choose a file.', keyWarning: 'This key will not be shown again. Copy and store it safely; it will be required to restore this backup.', restored: 'Configuration restored' },
        graph: { connectionOk: 'Connection successful!', connectionFailed: 'Connection failed', error: 'Connection error' },
        devices: { loadUsersError: 'Error loading users', chooseUser: 'Choose a user', primaryUserSet: 'Primary user set', syncLaunched: 'Sync launched', restartConfirm: 'Restart?', restartLaunched: 'Restart launched' },
        reports: { apiError: 'API error loading reports (check Graph configuration).', accessDenied: 'Access denied to data (devices.read / apps.read permissions).', loadError: 'Error loading reports' },
        accessDenied: 'Access denied',
        setupPage: { subtitle: 'Storage, Azure AD, primary administrators', storageTitle: 'Data storage', storageSubtitle: 'Database connection or JSON files. After any change, restart the IIS application pool (or website).', sqlTitle: 'SQL Server connection', serverLabel: 'Server (instance)', serverPlaceholder: 'localhost or .\\SQLEXPRESS', portLabel: 'Port', portHint: '(default 1433)', databaseLabel: 'Database', databasePlaceholder: 'IntuneWksManager', databaseTitle: 'Name must match an existing database (e.g. IntuneWksManager).', dbMustExist: 'The database must exist on the server and the IIS APPPOOL\\IntuneWksManager account must have access (see help below).', integratedAuth: 'Windows Authentication', integratedHint: 'The SQL connection will use the logged-in user\'s Windows account (session), not the IIS pool. Enable Windows Authentication in IIS for this app so the browser sends Windows credentials and SQL Server sees your account (e.g. DOMAIN\\user). Grant your account rights on the database.', sqlUserLabel: 'SQL user', passwordLabel: 'Password', passwordHint: '(empty = do not change)', btnTest: 'Test connection', btnSetupTables: 'Create tables', btnSaveSql: 'Save and use SQL Server', sqlDetailsSummary: 'SQL commands to create the database and grant access (Windows Authentication)', sqlDetailsText: 'Run in SQL Server Management Studio (or sqlcmd) as administrator. Adjust the database name if needed. The login must be the IIS pool account.', jsonTitle: 'JSON files', jsonDesc: 'Creates the Config/ folder and required files, then enables this mode. Created files are empty; data in SQL is not copied. Then restart the IIS pool.', btnJson: 'Use JSON files', azureAdTitle: 'Azure AD configuration', tenantIdLabel: 'Tenant ID', clientIdLabel: 'Client ID', clientSecretLabel: 'Client Secret', clientSecretPlaceholder: 'Leave empty to keep', encryptedHint: 'Encrypted automatically', btnSave: 'Save', encryptedSectionTitle: 'Encrypted value for appsettings.json', encryptedSectionDesc: 'Enter the secret in plain text then click Generate. Copy the ENC:... value into appsettings.json → AzureAd:ClientSecret.', secretPlainLabel: 'Secret in plain text', secretPlainPlaceholder: 'Your Azure AD Client Secret', btnGenerate: 'Generate encrypted value', valueToPasteLabel: 'Value to paste into appsettings.json', btnCopy: 'Copy', primaryAdminsTitle: 'Primary Administrators', btnAdd: 'Add', tableEmail: 'Email', tableName: 'Name', tableObjectId: 'Object ID', tableStatus: 'Status', tableActions: 'Actions', modalEmail: 'Email *', modalDisplayName: 'Display name', modalObjectId: 'Azure Object ID', modalActive: 'Active', modalCancel: 'Cancel', modalSave: 'Save', backupKeyTitle: 'Restoration key', backupKeyCopied: 'I have copied the key' }
    }
};

function getLang() {
    const lang = (state.settings?.portal?.defaultLanguage || localStorage.getItem('siteLang') || 'fr-FR');
    return (lang === 'en' || lang === 'fr-FR') ? lang : 'fr-FR';
}

function t(key, langOverride) {
    const lang = langOverride || getLang();
    const dict = i18n[lang] || i18n['fr-FR'];
    const parts = key.split('.');
    let v = dict;
    for (const p of parts) { v = v?.[p]; }
    return (typeof v === 'string') ? v : key;
}

function applyLanguage(lang) {
    const L = (lang === 'en' || lang === 'fr-FR') ? lang : 'fr-FR';
    localStorage.setItem('siteLang', L);
    if (state.settings?.portal) state.settings.portal.defaultLanguage = L;
    document.documentElement.lang = L.startsWith('fr') ? 'fr' : 'en';
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (key) el.textContent = t(key, L);
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        if (key) el.placeholder = t(key, L);
    });
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
        const key = el.getAttribute('data-i18n-title');
        if (key) el.title = t(key, L);
    });
    const activePage = document.querySelector('.nav-item.active')?.dataset?.page;
    if (activePage) document.getElementById('header-title').textContent = t('titles.' + activePage, L) || activePage;
}

function getPageTitle(page) {
    return t('titles.' + page) || page;
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 5000);
}

function openModal(id) { document.getElementById(id).classList.add('active'); }
function closeModal(id) { document.getElementById(id).classList.remove('active'); }

function navigate(page) {
    document.querySelectorAll('.nav-item').forEach(i => i.classList.toggle('active', i.dataset.page === page));
    document.querySelectorAll('.page-content').forEach(c => c.classList.toggle('hidden', c.id !== `page-${page}`));
    loadPageData(page);
    document.getElementById('header-title').textContent = getPageTitle(page);
}

async function loadPageData(page) {
    try {
        const loaders = { 'dashboard': loadDashboard, 'requests': loadRequests, 'admins': loadAdmins, 'roles': loadRoles, 'devices': loadDevices, 'intune-users': loadIntuneUsers, 'apps': loadApps, 'reports': loadReports, 'settings': loadSettings, 'setup': loadSetup, 'backup': loadBackup, 'audit': loadAudit };
        if (loaders[page]) await loaders[page]();
    } catch (e) { console.error(e); showToast(t('msg.loadError'), 'error'); }
}

async function loadDashboard() {
    const [requests, admins] = await Promise.all([api.get('access/requests'), api.get('admins')]);
    state.requests = requests || []; state.admins = admins || [];
    
    document.getElementById('stat-requests').textContent = state.requests.length;
    document.getElementById('stat-admins').textContent = state.admins.length;
    
    const badge = document.getElementById('requests-badge');
    if (state.requests.length > 0) { badge.textContent = state.requests.length; badge.classList.remove('hidden'); }
    else { badge.classList.add('hidden'); }
    
    try {
        const devices = await api.get('graph/devices');
        document.getElementById('stat-devices').textContent = devices?.length || 0;
        updateConnectionStatus(true);
    } catch { document.getElementById('stat-devices').textContent = '-'; updateConnectionStatus(false); }
    updateStorageStatus();
}

function updateConnectionStatus(connected) {
    const el = document.getElementById('connection-status');
    if (!el) return;
    el.className = `connection-badge ${connected ? 'connected' : 'disconnected'}`;
    el.innerHTML = `<span class="status-dot ${connected ? 'online' : 'offline'}"></span>${connected ? t('storage.graphOk') : t('storage.graphNotConnected')}`;
}

async function updateStorageStatus() {
    const badge = document.getElementById('storage-status-badge');
    if (!badge) return;
    try {
        const data = await api.get('storage/status?lang=' + encodeURIComponent(getLang()));
        const connected = data?.connected === true;
        badge.className = `connection-badge ${connected ? 'connected' : 'disconnected'}`;
        const dotClass = connected ? 'online' : 'offline';
        const modeText = data?.modeLabel || (data?.mode === 'SqlServer' ? t('storage.sqlServer') : data?.mode === 'Json' ? t('storage.jsonFiles') : '—');
        const label = connected ? (t('storage.activeLabel') + modeText) : t('storage.notConnected');
        badge.innerHTML = `<span class="status-dot ${dotClass}"></span>${label}`;
    } catch (_) {
        badge.className = 'connection-badge disconnected';
        badge.innerHTML = '<span class="status-dot offline"></span>' + t('storage.notConnected');
    }
}

async function testGraphConnection() {
    try {
        const result = await api.get('graph/test');
        showToast(result?.connected ? t('graph.connectionOk') : t('graph.connectionFailed'), result?.connected ? 'success' : 'error');
        updateConnectionStatus(result?.connected);
    } catch { showToast(t('graph.error'), 'error'); }
}

// Requests
async function loadRequests() {
    state.requests = await api.get('access/requests') || [];
    const tbody = document.getElementById('requests-table-body');
    if (!state.requests.length) { tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">' + t('requests.none') + '</td></tr>'; return; }
    tbody.innerHTML = state.requests.map(r => `<tr>
        <td><strong>${r.displayName}</strong></td>
        <td>${r.email}</td>
        <td class="text-sm">${r.message || '-'}</td>
        <td>${new Date(r.requestedAt).toLocaleDateString('fr-FR')}</td>
        <td><button class="btn btn-success btn-sm" onclick="approveRequest('${r.id}')">✓ Approuver</button> <button class="btn btn-danger btn-sm" onclick="rejectRequest('${r.id}')">✗ Rejeter</button></td>
    </tr>`).join('');
}

async function approveRequest(id) {
    if (!confirm(t('requests.approve'))) return;
    try {
        await api.post(`access/requests/${id}/approve`, { note: '' });
        showToast(t('requests.approved'), 'success');
        loadRequests(); loadDashboard();
    } catch { showToast(t('msg.error'), 'error'); }
}

async function rejectRequest(id) {
    const note = prompt(t('requests.rejectPrompt'));
    if (note === null) return;
    try {
        await api.post(`access/requests/${id}/reject`, { note });
        showToast(t('requests.rejected'), 'success');
        loadRequests(); loadDashboard();
    } catch { showToast(t('msg.error'), 'error'); }
}

// Admins
async function loadAdmins() {
    const [admins, roles, features, permissions] = await Promise.all([
        api.get('admins'), api.get('roles'), api.get('features'), api.get('permissions')
    ]);
    state.admins = admins || []; state.roles = roles || [];
    state.features = features || []; state.permissions = Array.isArray(permissions) ? permissions : [];
    
    const tbody = document.getElementById('admins-table-body');
    if (!tbody) return;
    if (!state.admins.length) { tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">' + t('admins.none') + '</td></tr>'; return; }
    const esc = s => (s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');
    tbody.innerHTML = state.admins.map(a => {
        const id = esc(a.id);
        const statut = a.isActive && a.isApproved ? t('setup.active') : t('setup.inactive');
        const badgeClass = a.isActive && a.isApproved ? 'badge-success' : 'badge-secondary';
        return '<tr><td><strong>' + esc(a.displayName) + '</strong></td><td>' + esc(a.email) + '</td><td><span class="badge badge-primary">' + esc(a.role) + '</span></td><td><span class="badge ' + badgeClass + '">' + statut + '</span></td><td><button class="btn btn-ghost btn-sm" onclick="editAdmin(\'' + id + '\')" title="' + t('setup.edit') + '">' + getIcon('edit') + '</button><button class="btn btn-ghost btn-sm" onclick="toggleAdmin(\'' + id + '\')" title="' + (a.isActive ? t('admins.disable') : t('admins.enable')) + '">' + getIcon('toggle') + '</button><button class="btn btn-ghost btn-sm" onclick="deleteAdmin(\'' + id + '\')" title="' + t('setup.delete') + '">' + getIcon('delete') + '</button></td></tr>';
    }).join('');
}

async function ensureModalData() {
    if (state.permissions?.length && state.roles?.length) return;
    try {
        const [roles, permissions] = await Promise.all([
            api.get('roles'), api.get('permissions')
        ]);
        state.roles = roles || [];
        state.permissions = Array.isArray(permissions) ? permissions : [];
    } catch (e) { console.error(e); }
}

// Quand une de ces permissions est cochée, la permission « lecture » associée est cochée automatiquement
const PERMISSION_REQUIRES_READ = {
    'devices.write': 'devices.read', 'devices.wipe': 'devices.read', 'devices.sync': 'devices.read',
    'devices.restart': 'devices.read', 'devices.retire': 'devices.read', 'devices.setPrimaryUser': 'devices.read',
    'apps.assign': 'apps.read',
    'reports.compliance': 'devices.read', 'reports.devices': 'devices.read',
    'reports.apps': 'apps.read', 'reports.export': 'reports.read'
};

/** Dérive les fonctionnalités (pour le backend) à partir des permissions cochées. */
function derivedFeaturesFromActions(actions) {
    const list = Array.isArray(actions) ? actions : [];
    const out = [];
    if (list.some(a => (a || '').startsWith('devices.'))) out.push('device-management');
    if (list.includes('users.read')) out.push('user-management');
    if (list.some(a => a === 'apps.read' || a === 'apps.assign')) out.push('app-management');
    if (list.includes('policies.read')) out.push('policy-management');
    if (list.some(a => (a || '').startsWith('reports.'))) out.push('reporting');
    return out;
}

let adminUserSearchTimer = null;

async function showAddAdminModal() {
    document.getElementById('admin-form').reset();
    document.getElementById('admin-id').value = '';
    document.getElementById('admin-active').checked = true;
    document.getElementById('admin-modal-title').textContent = t('admins.newAdmin');
    const searchEl = document.getElementById('admin-user-search');
    const resultsEl = document.getElementById('admin-user-search-results');
    if (searchEl) { searchEl.value = ''; searchEl.placeholder = t('admins.searchPlaceholder'); }
    if (resultsEl) { resultsEl.innerHTML = ''; resultsEl.classList.add('hidden'); }
    await ensureModalData();
    populateAdminModal(null);
    applyRoleToActions();
    openModal('admin-modal');
    if (searchEl) searchEl.focus();
}

function onAdminUserSearchInput() {
    const searchEl = document.getElementById('admin-user-search');
    const resultsEl = document.getElementById('admin-user-search-results');
    if (!searchEl || !resultsEl) return;
    const q = searchEl.value.trim();
    clearTimeout(adminUserSearchTimer);
    if (q.length < 2) {
        resultsEl.innerHTML = '';
        resultsEl.classList.add('hidden');
        return;
    }
    resultsEl.innerHTML = '<div class="admin-search-loading">' + (t('storage.loading') || 'Chargement...') + '</div>';
    resultsEl.classList.remove('hidden');
    adminUserSearchTimer = setTimeout(async () => {
        try {
            const users = await api.get('graph/users/search?q=' + encodeURIComponent(q) + '&top=20');
            if (!Array.isArray(users) || users.length === 0) {
                resultsEl.innerHTML = '<div class="admin-search-empty">' + t('admins.noUserFound') + '</div>';
                return;
            }
            resultsEl.innerHTML = users.map(u => {
                const email = u.mail || u.userPrincipalName || u.Mail || u.UserPrincipalName || '';
                const name = u.displayName || u.DisplayName || '-';
                return '<button type="button" class="admin-search-item" data-email="' + (email || '').replace(/"/g, '&quot;') + '" data-name="' + (name || '').replace(/"/g, '&quot;') + '"><strong>' + (name || '').replace(/</g, '&lt;') + '</strong><small>' + (email || '').replace(/</g, '&lt;') + '</small></button>';
            }).join('');
            resultsEl.querySelectorAll('.admin-search-item').forEach(btn => {
                btn.addEventListener('click', () => {
                    const email = btn.getAttribute('data-email') || '';
                    const name = btn.getAttribute('data-name') || '';
                    document.getElementById('admin-email').value = email;
                    document.getElementById('admin-displayname').value = name;
                    searchEl.value = '';
                    resultsEl.innerHTML = '';
                    resultsEl.classList.add('hidden');
                });
            });
        } catch (err) {
            resultsEl.innerHTML = '<div class="admin-search-empty">' + (err && err.message ? err.message : t('msg.error')) + '</div>';
        }
    }, 300);
}

function populateAdminModal(admin) {
    const rn = r => r.name ?? r.Name ?? '';
    const rd = r => r.description ?? r.Description ?? '';
    const ci = c => c.id ?? c.Id ?? '';
    const cn = c => c.name ?? c.Name ?? '';
    const fi = f => f.id ?? f.Id ?? '';
    const fn = f => f.name ?? f.Name ?? '';
    // Roles (onchange pré-remplit les Actions selon le rôle, sauf Custom)
    document.getElementById('admin-role').innerHTML = state.roles.map(r => 
        `<option value="${rn(r)}" ${admin?.role === rn(r) ? 'selected' : ''}>${rn(r)} - ${rd(r)}</option>`
    ).join('');
    
    // Actions (permissions) — les fonctionnalités sont dérivées automatiquement des permissions à l'enregistrement
    const perms = state.permissions || [];
    const actionEl = document.getElementById('admin-actions');
    if (!actionEl) return;
    if (!perms.length) {
        actionEl.innerHTML = '<p class="text-muted text-sm">Aucune permission. Vérifiez Config/users.json (AvailablePermissions).</p>';
    } else {
        actionEl.innerHTML = perms.map(p => {
            const c = p.code ?? p.Code ?? '';
            const n = p.name ?? p.Name ?? '';
            const checked = admin?.allowedActions?.includes(c) ? 'checked' : '';
            return `<label class="permission-item"><input type="checkbox" name="admin-actions" value="${(c || '').replace(/"/g, '&quot;')}" ${checked}/> ${escapeHtml(n)}</label>`;
        }).join('');
    }
    // Auto-sélection des permissions "lecture" quand une permission liée est cochée
    document.querySelectorAll('input[name="admin-actions"]').forEach(cb => {
        cb.onchange = null;
        cb.onchange = function () {
            if (!this.checked) return;
            const required = PERMISSION_REQUIRES_READ[this.value];
            if (required) {
                const readCb = document.querySelector(`input[name="admin-actions"][value="${required}"]`);
                if (readCb && !readCb.checked) readCb.checked = true;
            }
        };
    });
    // Types d'appareils autorisés (vide = tous)
    const deviceTypes = [{ v: 'windows', n: 'Windows' }, { v: 'macos', n: 'macOS' }, { v: 'android', n: 'Android' }, { v: 'ios', n: 'iOS' }, { v: 'linux', n: 'Linux' }];
    const dtEl = document.getElementById('admin-device-types');
    if (dtEl) dtEl.innerHTML = deviceTypes.map(t => {
        const checked = admin?.allowedDeviceTypes?.includes(t.v) ? 'checked' : '';
        return `<label class="permission-item"><input type="checkbox" name="admin-device-types" value="${t.v}" ${checked}/> ${t.n}</label>`;
    }).join('');
    
    const sel = document.getElementById('admin-role');
    if (sel) { sel.onchange = null; sel.onchange = applyRoleToActions; }
}

function escapeHtml(s) {
    if (!s) return '';
    const d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
}

function applyRoleToActions() {
    const roleName = document.getElementById('admin-role').value;
    const role = state.roles.find(r => (r.name ?? r.Name) === roleName);
    if (!role || roleName === 'Custom') return;
    const perms = role.permissions ?? role.Permissions ?? [];
    const permsSet = new Set(perms);
    Object.entries(PERMISSION_REQUIRES_READ).forEach(([p, readP]) => {
        if (permsSet.has(p) && !permsSet.has(readP)) permsSet.add(readP);
    });
    document.querySelectorAll('input[name="admin-actions"]').forEach(cb => {
        cb.checked = permsSet.has(cb.value);
    });
}

async function editAdmin(id) {
    const admin = state.admins.find(a => a.id === id);
    if (!admin) return;
    await ensureModalData();
    document.getElementById('admin-id').value = admin.id;
    document.getElementById('admin-email').value = admin.email;
    document.getElementById('admin-displayname').value = admin.displayName;
    document.getElementById('admin-active').checked = admin.isActive;
    document.getElementById('admin-modal-title').textContent = 'Modifier Admin';
    populateAdminModal(admin);
    openModal('admin-modal');
}

async function saveAdmin(e) {
    e.preventDefault();
    const id = document.getElementById('admin-id').value;
    const allowedActions = [...document.querySelectorAll('input[name="admin-actions"]:checked')].map(c => c.value);
    const admin = {
        email: document.getElementById('admin-email').value,
        displayName: document.getElementById('admin-displayname').value,
        role: document.getElementById('admin-role').value,
        isActive: document.getElementById('admin-active').checked,
        isApproved: true,
        allowedFeatures: derivedFeaturesFromActions(allowedActions),
        allowedActions: allowedActions,
        allowedDeviceTypes: [...document.querySelectorAll('input[name="admin-device-types"]:checked')].map(c => c.value)
    };
    try {
        if (id) await api.put(`admins/${id}`, admin);
        else await api.post('admins', admin);
        showToast(id ? t('admins.adminModified') : t('admins.adminCreated'), 'success');
        closeModal('admin-modal');
        loadAdmins();
    } catch { showToast(t('msg.error'), 'error'); }
}

async function toggleAdmin(id) {
    try {
        await api.post(`admins/${id}/toggle`);
        showToast(t('msg.statusUpdated'), 'success');
        loadAdmins();
    } catch { showToast(t('msg.error'), 'error'); }
}

async function deleteAdmin(id) {
    if (!confirm(t('setup.delete') + ' ?')) return;
    try {
        await api.delete(`admins/${id}`);
        showToast(t('setup.adminDeleted'), 'success');
        loadAdmins();
    } catch { showToast(t('msg.error'), 'error'); }
}

// Roles
async function loadRoles() {
    const [roles, permissions] = await Promise.all([api.get('roles'), api.get('permissions')]);
    state.roles = roles || []; state.permissions = permissions || [];
    
    document.getElementById('roles-table-body').innerHTML = state.roles.map(r => `<tr>
        <td><strong>${r.name}</strong></td>
        <td class="text-muted">${r.description}</td>
        <td>${r.permissions.length} permission(s)</td>
    </tr>`).join('');
    
    const grouped = {};
    state.permissions.forEach(p => { if (!grouped[p.category]) grouped[p.category] = []; grouped[p.category].push(p); });
    document.getElementById('permissions-list').innerHTML = Object.entries(grouped).map(([cat, perms]) => `
        <div class="mb-4"><h4 class="text-sm font-medium mb-2">${cat}</h4>
        <div class="permissions-grid">${perms.map(p => `<div class="permission-item"><strong>${p.code}</strong><br/><span class="text-xs text-muted">${p.description || p.name}</span></div>`).join('')}</div></div>
    `).join('');
}

// Sauvegarde (page statique, pas de chargement de données)
function loadBackup() {
    const page = document.getElementById('page-backup');
    if (page) page.querySelectorAll('.btn-icon[data-icon]').forEach(iconEl => {
        const name = iconEl.dataset.icon;
        if (typeof getIcon === 'function' && getIcon(name)) { iconEl.textContent = ''; iconEl.insertAdjacentHTML('beforeend', getIcon(name)); }
    });
}

async function downloadBackup() {
    const statusEl = document.getElementById('backup-download-status');
    if (statusEl) { statusEl.textContent = t('backup.generating'); statusEl.className = 'text-muted'; }
    try {
        const basePath = document.querySelector('base')?.getAttribute('href') || '/';
        const res = await fetch(`${basePath}api/backup/download`, { credentials: 'include' });
        if (!res.ok) throw new Error(res.status === 401 ? t('msg.error') : await res.json().then(b => b.message || t('msg.error')).catch(() => t('msg.error')));
        const restoreKey = res.headers.get('X-Restore-Key');
        const blob = await res.blob();
        const disp = res.headers.get('Content-Disposition');
        let fileName = 'IntuneWksManager-backup.enc';
        if (disp) { const m = disp.match(/filename="?([^";]+)"?/); if (m) fileName = m[1].trim(); }
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(a.href);
        if (statusEl) { statusEl.textContent = t('backup.downloaded') + '.'; statusEl.className = 'text-success'; }
        showToast(t('backup.downloaded'), 'success');
        if (restoreKey) {
            const keyInput = document.getElementById('backup-key-value');
            const modal = document.getElementById('backup-key-modal');
            if (keyInput && modal) {
                keyInput.value = restoreKey;
                modal.classList.add('active');
            }
        }
    } catch (e) {
        if (statusEl) { statusEl.textContent = t('msg.errorPrefix') + (e.message || e); statusEl.className = 'text-error'; }
        showToast(t('msg.errorPrefix') + (e.message || e), 'error');
    }
}

function copyBackupKeyToClipboard() {
    const el = document.getElementById('backup-key-value');
    if (!el || !el.value) return;
    navigator.clipboard.writeText(el.value).then(() => showToast(t('backup.keyCopied'), 'success')).catch(() => showToast(t('setup.copyFailed'), 'error'));
}

function bindBackupPageEvents() {
    const form = document.getElementById('restore-form');
    if (!form) return;
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const fileInput = document.getElementById('restore-file');
        const statusEl = document.getElementById('backup-restore-status');
        if (!fileInput?.files?.length) { if (statusEl) statusEl.textContent = t('backup.chooseFile'); return; }
        const restoreKeyEl = document.getElementById('restore-key');
        const restoreKey = restoreKeyEl ? restoreKeyEl.value.trim() : '';
        if (!confirm(t('backup.restoreConfirm'))) return;
        if (statusEl) { statusEl.textContent = t('backup.restoring'); statusEl.className = 'text-muted'; }
        try {
            const basePath = document.querySelector('base')?.getAttribute('href') || '/';
            const fd = new FormData();
            fd.append('file', fileInput.files[0]);
            if (restoreKey) fd.append('restoreKey', restoreKey);
            const res = await fetch(`${basePath}api/backup/restore`, { method: 'POST', credentials: 'include', body: fd });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.message || t('msg.error'));
            if (statusEl) { statusEl.textContent = data.message || t('backup.restored') + '.'; statusEl.className = 'text-success'; }
            showToast(data.message || t('backup.restored'), 'success');
            form.reset();
        } catch (e) {
            if (statusEl) { statusEl.textContent = t('msg.errorPrefix') + (e.message || e); statusEl.className = 'text-error'; }
            showToast(t('msg.errorPrefix') + (e.message || e), 'error');
        }
    });
}

// Devices
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

async function loadDevices() {
    try {
        state.devices = await api.get('graph/devices') || [];
        const q = document.getElementById('devices-search');
        if (q) q.value = '';
        const typeEl = document.getElementById('devices-type-filter');
        if (typeEl) typeEl.value = '';
        filterDevices();
    } catch { document.getElementById('devices-table-body').innerHTML = '<tr><td colspan="6" class="text-center text-muted">Erreur de connexion Graph API</td></tr>'; }
}

function filterDevices() {
    const searchEl = document.getElementById('devices-search');
    const typeEl = document.getElementById('devices-type-filter');
    const q = (searchEl?.value || '').trim().toLowerCase();
    const typeFilter = (typeEl?.value || '').trim().toLowerCase();
    renderDevicesTable(q, typeFilter);
}

function renderDevicesTable(search, typeFilter) {
    const tbody = document.getElementById('devices-table-body');
    if (!tbody) return;
    let list = state.devices || [];
    list = list.filter(d => deviceMatchesOs(typeFilter, d.operatingSystem));
    if (search) {
        list = list.filter(d => {
            const dn = (d.deviceName || '').toLowerCase();
            const upn = (d.userPrincipalName || '').toLowerCase();
            const os = (d.operatingSystem || '').toLowerCase();
            const ver = (d.osVersion || '').toLowerCase();
            return dn.includes(search) || upn.includes(search) || os.includes(search) || ver.includes(search);
        });
    }
    if (!list.length) { tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">Aucun appareil</td></tr>'; return; }
    const escape = s => (s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    tbody.innerHTML = list.map(d => {
        const id = escape(d.id);
        return `<tr>
            <td><strong>${escape(d.deviceName)}</strong></td>
            <td>${escape(d.userPrincipalName || '-')}</td>
            <td>${escape(d.operatingSystem)} ${escape(d.osVersion)}</td>
            <td><span class="badge ${d.complianceState === 'compliant' ? 'badge-success' : 'badge-warning'}">${escape(d.complianceState)}</span></td>
            <td>${d.lastSyncDateTime ? new Date(d.lastSyncDateTime).toLocaleDateString('fr-FR') : '-'}</td>
            <td>
                <button class="btn btn-sm btn-secondary" onclick="syncDevice('${id}')" title="Synchroniser">${getIcon('sync')}</button>
                <button class="btn btn-sm btn-secondary" onclick="restartDevice('${id}')" title="Redémarrer">${getIcon('restart')}</button>
                <button class="btn btn-sm btn-secondary" onclick="openSetPrimaryUserModal('${id}')" title="Définir utilisateur principal">${getIcon('user')}</button>
            </td>
        </tr>`;
    }).join('');
}

async function openSetPrimaryUserModal(deviceId) {
    document.getElementById('set-primary-user-device-id').value = deviceId;
    const sel = document.getElementById('set-primary-user-select');
    try {
        const users = await api.get('graph/users') || [];
        sel.innerHTML = '<option value="">-- Choisir un utilisateur --</option>' +
            users.map(u => `<option value="${(u.id||'').replace(/"/g,'&quot;')}">${escapeHtml(u.displayName || u.userPrincipalName || u.id)} (${escapeHtml(u.userPrincipalName||'')})</option>`).join('');
        openModal('set-primary-user-modal');
    } catch { showToast(t('devices.loadUsersError'), 'error'); }
}

async function submitSetPrimaryUser() {
    const deviceId = document.getElementById('set-primary-user-device-id').value;
    const userId = document.getElementById('set-primary-user-select').value;
    if (!userId) { showToast(t('devices.chooseUser'), 'error'); return; }
    try {
        await api.post(`graph/devices/${deviceId}/set-primary-user`, { userId });
        showToast(t('devices.primaryUserSet'), 'success');
        closeModal('set-primary-user-modal');
        loadDevices();
    } catch { showToast(t('msg.error'), 'error'); }
}

async function syncDevice(id) { try { await api.post(`graph/devices/${id}/sync`); showToast(t('devices.syncLaunched'), 'success'); loadDevices(); } catch { showToast(t('msg.error'), 'error'); } }
async function restartDevice(id) { if (!confirm(t('devices.restartConfirm'))) return; try { await api.post(`graph/devices/${id}/restart`); showToast(t('devices.restartLaunched'), 'success'); loadDevices(); } catch { showToast(t('msg.error'), 'error'); } }

// Intune Users
async function loadIntuneUsers() {
    try {
        state.intuneUsers = await api.get('graph/users') || [];
        const tbody = document.getElementById('intune-users-table-body');
        if (!state.intuneUsers.length) { tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">Aucun utilisateur</td></tr>'; return; }
        tbody.innerHTML = state.intuneUsers.map(u => `<tr><td>${u.displayName}</td><td>${u.userPrincipalName}</td><td>${u.mail || '-'}</td><td>${u.department || '-'}</td></tr>`).join('');
    } catch { document.getElementById('intune-users-table-body').innerHTML = '<tr><td colspan="4" class="text-center text-muted">Erreur</td></tr>'; }
}

// Apps
async function loadApps() {
    try {
        state.apps = await api.get('graph/apps') || [];
        const q = document.getElementById('apps-search');
        if (q) q.value = '';
        renderAppsTable('');
    } catch { document.getElementById('apps-table-body').innerHTML = '<tr><td colspan="4" class="text-center text-muted">Erreur</td></tr>'; }
}

function filterApps() {
    const el = document.getElementById('apps-search');
    const q = (el?.value || '').trim().toLowerCase();
    renderAppsTable(q);
}

function renderAppsTable(search) {
    const tbody = document.getElementById('apps-table-body');
    if (!tbody) return;
    let list = state.apps || [];
    if (search) {
        list = list.filter(a =>
            (a.displayName || '').toLowerCase().includes(search) ||
            (a.publisher || '').toLowerCase().includes(search)
        );
    }
    if (!list.length) { tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">Aucune application</td></tr>'; return; }
    const escape = s => (s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    tbody.innerHTML = list.map(a => `<tr>
        <td>${escape(a.displayName)}</td>
        <td>${escape(a.publisher || '-')}</td>
        <td>${(a.appType || '').replace('#microsoft.graph.', '') || '-'}</td>
        <td>${a.createdDateTime ? new Date(a.createdDateTime).toLocaleDateString('fr-FR') : '-'}</td>
    </tr>`).join('');
}

function applyPortalBranding() {
    const portal = state.settings?.portal;
    const titleEl = document.getElementById('sidebar-title');
    if (titleEl) titleEl.textContent = (portal?.title || '').trim() || 'IntuneWksManager';
}

// Settings (langue, titre sidebar)
async function loadSettings() {
    state.settings = await api.get('settings');
    if (state.settings) {
        const lang = (state.settings.portal?.defaultLanguage || 'fr-FR');
        const langEl = document.getElementById('setting-language');
        if (langEl) langEl.value = (lang === 'en' || lang === 'fr-FR') ? lang : 'fr-FR';
        const titleEl = document.getElementById('setting-sidebar-title');
        if (titleEl) titleEl.value = (state.settings.portal?.title || '').trim();
        applyPortalBranding();
    }
}

async function saveSettings(e) {
    e.preventDefault();
    if (!state.settings) state.settings = { portal: {}, graphApi: {}, notifications: {}, maintenance: {} };
    if (!state.settings.portal) state.settings.portal = {};
    const langEl = document.getElementById('setting-language');
    const lang = langEl ? (langEl.value === 'en' ? 'en' : 'fr-FR') : 'fr-FR';
    const titleEl = document.getElementById('setting-sidebar-title');
    state.settings.portal.defaultLanguage = lang;
    state.settings.portal.title = titleEl ? titleEl.value.trim() : (state.settings.portal.title || '');
    try {
        await api.put('settings', state.settings);
        applyLanguage(lang);
        applyPortalBranding();
        showToast(t('msg.saved'), 'success');
    } catch (err) {
        showToast(err?.message || t('msg.error'), 'error');
    }
}

// ---------- Configuration système (page Setup intégrée) ----------
function showSetupStatus(elementId, message, type) {
    const el = document.getElementById(elementId);
    if (!el) return;
    el.className = `alert alert-${type === 'error' ? 'danger' : type === 'success' ? 'success' : 'info'}`;
    el.textContent = message;
    el.style.display = 'block';
    // Ne pas masquer automatiquement les messages de succès pour le stockage (redémarrage requis)
    const isStorageStatus = elementId === 'storage-status' && type === 'success';
    if ((type === 'success' || type === 'info') && !isStorageStatus) setTimeout(() => { el.style.display = 'none'; }, 5000);
}

function getStorageFormData() {
    const port = document.getElementById('storage-port')?.value?.trim();
    return {
        provider: 'SqlServer',
        server: document.getElementById('storage-server')?.value?.trim() || '',
        port: port ? parseInt(port, 10) : undefined,
        database: document.getElementById('storage-database')?.value?.trim() || 'IntuneWksManager',
        integratedSecurity: document.getElementById('storage-integrated')?.checked || false,
        userId: document.getElementById('storage-user')?.value?.trim() || undefined,
        password: document.getElementById('storage-password')?.value || undefined
    };
}

function toggleStorageSqlAuth() {
    const integrated = document.getElementById('storage-integrated');
    const sqlAuth = document.getElementById('storage-sql-auth');
    const integratedHint = document.getElementById('storage-integrated-hint');
    if (sqlAuth && integrated) sqlAuth.style.display = integrated.checked ? 'none' : 'block';
    if (integratedHint && integrated) integratedHint.style.display = integrated.checked ? 'block' : 'none';
}

async function loadSetup() {
    const tbody = document.getElementById('primary-admins-tbody');
    if (tbody) tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">' + t('storage.loading') + '</td></tr>';

    try {
        const [storageConfig, azureadConfig, primaryAdmins] = await Promise.all([
            api.get('setup/storage?lang=' + encodeURIComponent(getLang())).catch(() => null),
            api.get('setup/azuread').catch(() => null),
            api.get('setup/primary-admins').catch(() => [])
        ]);

        updateStorageStatus();
        if (storageConfig) {
            const provider = (storageConfig.provider || 'Json').toLowerCase();
            const modeEl = document.getElementById('storage-current-mode');
            const noticeEl = document.getElementById('storage-notice-restart');
            const badgeEl = document.getElementById('storage-active-badge');
            if (modeEl) modeEl.textContent = t('storage.activeLabel') + (storageConfig.currentModeDescription || (provider === 'sqlserver' ? t('storage.sqlServer') : t('storage.jsonFiles')));
            if (noticeEl) noticeEl.textContent = storageConfig.noticeRestart || t('storage.noticeRestart');
            if (badgeEl) badgeEl.classList.add('visible');
            const server = document.getElementById('storage-server');
            const port = document.getElementById('storage-port');
            const database = document.getElementById('storage-database');
            const integrated = document.getElementById('storage-integrated');
            const user = document.getElementById('storage-user');
            if (server) server.value = storageConfig.server || '';
            if (port) port.value = storageConfig.port || '';
            if (database) database.value = storageConfig.database || 'IntuneWksManager';
            if (integrated) integrated.checked = !!storageConfig.integratedSecurity;
            if (user) user.value = storageConfig.userId || '';
            toggleStorageSqlAuth();
        }

        if (azureadConfig) {
            document.getElementById('tenant-id').value = azureadConfig.tenantId || '';
            document.getElementById('client-id').value = azureadConfig.clientId || '';
            if (azureadConfig.isConfigured) showSetupStatus('azuread-status', t('setup.azureadLoaded'), 'info');
        }

        renderPrimaryAdminsSetup(Array.isArray(primaryAdmins) ? primaryAdmins : []);
    } catch (e) {
        console.error('loadSetup:', e);
        if (tbody) tbody.innerHTML = `<tr><td colspan="5" class="text-center text-error">${t('msg.errorPrefix')}${e.message || t('storage.loading')}</td></tr>`;
    }

    injectIconsInPageSetup();
}

function renderPrimaryAdminsSetup(admins) {
    const tbody = document.getElementById('primary-admins-tbody');
    if (!tbody) return;
    if (!admins || admins.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">' + t('setup.noAdmins') + '</td></tr>';
        return;
    }
    const esc = s => (s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');
    tbody.innerHTML = admins.map(a => {
        const id = esc(a.id);
        return `<tr>
            <td><strong>${esc(a.email)}</strong></td>
            <td>${esc(a.displayName || '-')}</td>
            <td><code class="text-xs">${esc(a.azureObjectId || '-')}</code></td>
            <td><span class="badge ${a.isActive ? 'badge-success' : 'badge-secondary'}">${a.isActive ? t('setup.active') : t('setup.inactive')}</span></td>
            <td>
                <button class="btn btn-ghost btn-sm" onclick="editSetupPrimaryAdmin('${id}')" title="${t('setup.edit')}"><span class="btn-icon" data-icon="edit"></span></button>
                <button class="btn btn-ghost btn-sm" onclick="deleteSetupPrimaryAdmin('${id}')" title="${t('setup.delete')}"><span class="btn-icon" data-icon="delete"></span></button>
            </td>
        </tr>`;
    }).join('');
    tbody.querySelectorAll('.btn-icon[data-icon]').forEach(iconEl => {
        const name = iconEl.dataset.icon;
        if (typeof getIcon === 'function' && getIcon(name)) { iconEl.textContent = ''; iconEl.insertAdjacentHTML('beforeend', getIcon(name)); }
    });
}

function injectIconsInPageSetup() {
    const page = document.getElementById('page-setup');
    if (!page) return;
    page.querySelectorAll('.btn-icon[data-icon]').forEach(iconEl => {
        const name = iconEl.dataset.icon;
        if (typeof getIcon === 'function' && getIcon(name)) { iconEl.textContent = ''; iconEl.insertAdjacentHTML('beforeend', getIcon(name)); }
    });
}

function showSetupAdminModal() {
    const modal = document.getElementById('setup-admin-modal');
    if (!modal) return;
    document.getElementById('setup-admin-modal-title').textContent = t('setup.adminAdd');
    document.getElementById('setup-admin-form').reset();
    document.getElementById('setup-admin-id').value = '';
    document.getElementById('setup-admin-active').checked = true;
    modal.classList.add('active');
}

async function editSetupPrimaryAdmin(id) {
    try {
        const admins = await api.get('setup/primary-admins');
        const admin = admins.find(a => a.id === id);
        if (!admin) { showToast(t('setup.adminNotFound'), 'error'); return; }
        const modal = document.getElementById('setup-admin-modal');
        if (!modal) return;
        document.getElementById('setup-admin-modal-title').textContent = t('setup.adminEdit');
        document.getElementById('setup-admin-id').value = admin.id;
        document.getElementById('setup-admin-email').value = admin.email;
        document.getElementById('setup-admin-display-name').value = admin.displayName || '';
        document.getElementById('setup-admin-object-id').value = admin.azureObjectId || '';
        document.getElementById('setup-admin-active').checked = admin.isActive;
        modal.classList.add('active');
    } catch (e) {
        console.error(e);
        showToast(t('msg.errorPrefix') + (e.message || t('storage.loading')), 'error');
    }
}

async function deleteSetupPrimaryAdmin(id) {
    if (!confirm(t('setup.confirmDeleteAdmin'))) return;
    try {
        await api.delete(`setup/primary-admins/${id}`);
        showToast(t('setup.adminDeleted'), 'success');
        loadSetup();
    } catch (e) {
        showToast(t('msg.errorPrefix') + (e.message || t('msg.unknown')), 'error');
    }
}

async function generateEncryptedSecretForAppsettings() {
    const plainEl = document.getElementById('encrypt-secret-plain');
    const resultEl = document.getElementById('encrypted-secret-result');
    const valueEl = document.getElementById('encrypted-secret-value');
    if (!plainEl || !resultEl || !valueEl) return;
    const plain = (plainEl.value || '').trim();
    if (!plain) {
        showToast(t('setup.secretEnterPlain'), 'error');
        return;
    }
    try {
        const res = await api.post('setup/encrypt-client-secret', { clientSecret: plain });
        const encrypted = res?.encrypted;
        if (!encrypted) { showToast(t('msg.error'), 'error'); return; }
        valueEl.textContent = encrypted;
        resultEl.classList.remove('hidden');
        showToast(t('setup.secretGenerated'), 'success');
    } catch (e) {
        showToast(t('msg.errorPrefix') + (e.message || t('msg.unknown')), 'error');
    }
}

function copyEncryptedSecretToClipboard() {
    const valueEl = document.getElementById('encrypted-secret-value');
    if (!valueEl || !valueEl.textContent) return;
    navigator.clipboard.writeText(valueEl.textContent).then(() => showToast(t('setup.copied'), 'success')).catch(() => showToast(t('setup.copyFailed'), 'error'));
}

function bindSetupPageEvents() {
    const storageForm = document.getElementById('storage-form');
    const azureadForm = document.getElementById('azuread-form');
    const setupAdminForm = document.getElementById('setup-admin-form');

    if (storageForm) {
        storageForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            try {
                const data = getStorageFormData();
                data.lang = getLang();
                showSetupStatus('storage-status', t('storage.saving'), 'info');
                const result = await api.post('setup/storage', data);
                const msg = result?.message || t('storage.savedRestartIIS');
                showSetupStatus('storage-status', msg, 'success');
                if (typeof showToast === 'function') showToast(t('storage.savedToast'), 'success');
                loadSetup();
            } catch (err) {
                const errMsg = err.message || t('msg.unknown');
                showSetupStatus('storage-status', t('msg.errorPrefix') + errMsg, 'error');
                if (typeof showToast === 'function') showToast(t('msg.errorPrefix') + errMsg, 'error');
            }
        });
    }

    const storageBtnTest = document.getElementById('storage-btn-test');
    if (storageBtnTest) {
        storageBtnTest.addEventListener('click', async () => {
            const data = getStorageFormData();
            data.lang = getLang();
            try {
                showSetupStatus('storage-status', t('storage.testing'), 'info');
                const res = await api.post('setup/storage/test', data);
                showSetupStatus('storage-status', res?.message || t('storage.connectionOk'), 'success');
            } catch (err) {
                const msg = err.response?.data?.message || err.message || t('msg.unknown');
                showSetupStatus('storage-status', t('storage.failure') + msg, 'error');
            }
        });
    }
    const storageBtnSetupTables = document.getElementById('storage-btn-setup-tables');
    if (storageBtnSetupTables) {
        storageBtnSetupTables.addEventListener('click', async () => {
            const data = getStorageFormData();
            data.lang = getLang();
            try {
                showSetupStatus('storage-status', t('storage.tablesCreating'), 'info');
                const res = await api.post('setup/storage/setup-tables', data);
                showSetupStatus('storage-status', res?.message || t('storage.tablesCreated'), 'success');
            } catch (err) {
                const msg = err.response?.data?.message || err.message || t('msg.unknown');
                showSetupStatus('storage-status', t('storage.failure') + msg, 'error');
            }
        });
    }
    const storageBtnEnsureJson = document.getElementById('storage-btn-ensure-json');
    if (storageBtnEnsureJson) {
        storageBtnEnsureJson.addEventListener('click', async () => {
            try {
                showSetupStatus('storage-status', t('storage.jsonActivating'), 'info');
                const res = await api.post('setup/storage/ensure-json?lang=' + encodeURIComponent(getLang()), {});
                showSetupStatus('storage-status', res?.message || t('storage.jsonActivated'), 'success');
                loadSetup();
            } catch (err) {
                const msg = err.response?.data?.message || err.message || t('msg.unknown');
                showSetupStatus('storage-status', t('msg.errorPrefix') + msg, 'error');
            }
        });
    }

    if (azureadForm) {
        azureadForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const tenantId = document.getElementById('tenant-id').value.trim();
            const clientId = document.getElementById('client-id').value.trim();
            if (!tenantId || !clientId) {
                showSetupStatus('azuread-status', t('setup.tenantClientRequired'), 'error');
                return;
            }
            try {
                showSetupStatus('azuread-status', t('setup.azureadSaving'), 'info');
                await api.post('setup/azuread', { tenantId, clientId, clientSecret: document.getElementById('client-secret').value.trim() || undefined });
                showSetupStatus('azuread-status', t('setup.azureadSaved'), 'success');
                document.getElementById('client-secret').value = '';
            } catch (err) {
                showSetupStatus('azuread-status', t('msg.errorPrefix') + (err.message || t('msg.unknown')), 'error');
            }
        });
    }

    const storageIntegrated = document.getElementById('storage-integrated');
    if (storageIntegrated) storageIntegrated.addEventListener('change', toggleStorageSqlAuth);

    if (setupAdminForm) {
        setupAdminForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = document.getElementById('setup-admin-id').value;
            const data = {
                email: document.getElementById('setup-admin-email').value.trim(),
                displayName: document.getElementById('setup-admin-display-name').value.trim() || undefined,
                azureObjectId: document.getElementById('setup-admin-object-id').value.trim() || undefined,
                isActive: document.getElementById('setup-admin-active').checked
            };
            if (!data.email) { showToast(t('setup.emailRequired'), 'error'); return; }
            try {
                if (id) await api.put(`setup/primary-admins/${id}`, data);
                else await api.post('setup/primary-admins', data);
                closeModal('setup-admin-modal');
                showToast(t('setup.adminSaved'), 'success');
                loadSetup();
            } catch (err) {
                showToast(t('msg.errorPrefix') + (err.message || t('msg.unknown')), 'error');
            }
        });
    }
}

// Audit
let auditLogsCache = [];

async function loadAudit() {
    try {
        auditLogsCache = await api.get('audit?limit=500') || [];
        filterAudit();
    } catch {
        const tbody = document.getElementById('audit-table-body');
        if (tbody) tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">Erreur de chargement</td></tr>';
    }
}

function filterAudit() {
    const tbody = document.getElementById('audit-table-body');
    const filterEl = document.getElementById('audit-filter-actor');
    const onlySecondary = filterEl?.value === 'secondary';
    let logs = auditLogsCache;
    if (onlySecondary)
        logs = logs.filter(l => (l.userType || '').toLowerCase().includes('secondary'));
    if (!tbody) return;
    if (!logs.length) { tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">Aucun log</td></tr>'; return; }
    const esc = s => (s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    tbody.innerHTML = logs.map(l => {
        const typeBadge = (l.userType || '').toLowerCase().includes('secondary') ? 'badge-warning' : 'badge-secondary';
        return `<tr>
            <td>${new Date(l.timestamp).toLocaleString('fr-FR')}</td>
            <td>${esc(l.userEmail || '-')}</td>
            <td><span class="badge ${typeBadge}">${esc(l.userType || '-')}</span></td>
            <td><span class="badge badge-primary">${esc(l.action || '-')}</span></td>
            <td class="text-sm">${esc(l.details || '-')}</td>
        </tr>`;
    }).join('');
}

// Reports
let currentReportTab = 'compliance';

function showReportTab(tab) {
    currentReportTab = tab;
    document.querySelectorAll('.report-section').forEach(s => s.classList.add('hidden'));
    document.querySelectorAll('[id^="tab-"]').forEach(b => b.classList.remove('active'));
    document.getElementById(`report-${tab}`).classList.remove('hidden');
    document.getElementById(`tab-${tab}`).classList.add('active');
}

async function loadReports() {
    const el = (id) => document.getElementById(id);
    try {
        // Mettre à jour l'interface immédiatement (chargement)
        const loadingIds = ['report-compliant-count', 'report-noncompliant-count', 'report-compliant-percent',
            'report-devices-total', 'report-devices-windows', 'report-devices-macos', 'report-devices-mobile',
            'report-apps-total', 'report-apps-store', 'report-apps-lob'];
        loadingIds.forEach(id => { const e = el(id); if (e) e.textContent = '…'; });
        if (el('compliance-table-body')) el('compliance-table-body').innerHTML = '<tr><td colspan="5" class="text-center text-muted">Chargement…</td></tr>';
        if (el('devices-os-table-body')) el('devices-os-table-body').innerHTML = '<tr><td colspan="3" class="text-center text-muted">Chargement…</td></tr>';
        if (el('apps-report-table-body')) el('apps-report-table-body').innerHTML = '<tr><td colspan="4" class="text-center text-muted">Chargement…</td></tr>';

        let devices = null;
        let apps = null;
        try {
            [devices, apps] = await Promise.all([
                api.get('graph/devices'),
                api.get('graph/apps')
            ]);
        } catch (apiErr) {
            console.error('Reports API error:', apiErr);
            showToast(t('reports.apiError'), 'error');
            devices = [];
            apps = [];
        }
        state.devices = Array.isArray(devices) ? devices : [];
        state.apps = Array.isArray(apps) ? apps : [];
        if (devices === null && apps === null) {
            showToast(t('reports.accessDenied'), 'error');
        }

        renderComplianceReport();
        renderDevicesReport();
        renderAppsReport();
    } catch (err) {
        console.error('Error loading reports:', err);
        showToast(t('reports.loadError'), 'error');
        renderComplianceReport();
        renderDevicesReport();
        renderAppsReport();
    }
}

function renderComplianceReport() {
    const devices = state.devices || [];
    const compliant = devices.filter(d => (d.complianceState || '').toLowerCase() === 'compliant').length;
    const nonCompliant = devices.length - compliant;
    const percent = devices.length > 0 ? Math.round((compliant / devices.length) * 100) : 0;

    const set = (id, text) => { const e = document.getElementById(id); if (e) e.textContent = text; };
    set('report-compliant-count', compliant);
    set('report-noncompliant-count', nonCompliant);
    set('report-compliant-percent', `${percent}%`);

    const tbody = document.getElementById('compliance-table-body');
    if (!tbody) return;

    if (!devices.length) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">Aucun appareil</td></tr>';
        return;
    }

    const esc = s => (s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    tbody.innerHTML = devices.map(d => {
        const complianceBadge = (d.complianceState || '').toLowerCase() === 'compliant'
            ? 'badge-success'
            : 'badge-warning';
        const lastSync = d.lastSyncDateTime ? new Date(d.lastSyncDateTime).toLocaleString('fr-FR') : '-';
        return `<tr>
            <td><strong>${esc(d.deviceName || '-')}</strong></td>
            <td>${esc(d.userPrincipalName || '-')}</td>
            <td>${esc(d.operatingSystem || '-')}</td>
            <td><span class="badge ${complianceBadge}">${esc(d.complianceState || '-')}</span></td>
            <td>${lastSync}</td>
        </tr>`;
    }).join('');
}

function renderDevicesReport() {
    const devices = state.devices || [];
    const total = devices.length;
    const windows = devices.filter(d => (d.operatingSystem || '').toLowerCase().includes('windows')).length;
    const macos = devices.filter(d => {
        const os = (d.operatingSystem || '').toLowerCase();
        return os.includes('mac') || os.includes('macos') || os.includes('mac os');
    }).length;
    const mobile = devices.filter(d => {
        const os = (d.operatingSystem || '').toLowerCase();
        return os.includes('android') || os.includes('ios') || os.includes('iphone');
    }).length;

    const set = (id, text) => { const e = document.getElementById(id); if (e) e.textContent = text; };
    set('report-devices-total', total);
    set('report-devices-windows', windows);
    set('report-devices-macos', macos);
    set('report-devices-mobile', mobile);

    const tbody = document.getElementById('devices-os-table-body');
    if (!tbody) return;

    if (!devices.length) {
        tbody.innerHTML = '<tr><td colspan="3" class="text-center text-muted">Aucun appareil</td></tr>';
        return;
    }

    const osCounts = {};
    devices.forEach(d => {
        const os = d.operatingSystem || 'Inconnu';
        osCounts[os] = (osCounts[os] || 0) + 1;
    });
    const esc = s => (s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    tbody.innerHTML = Object.entries(osCounts)
        .sort((a, b) => b[1] - a[1])
        .map(([os, count]) => {
            const percent = total > 0 ? Math.round((count / total) * 100) : 0;
            return `<tr>
                <td><strong>${esc(os)}</strong></td>
                <td>${count}</td>
                <td>${percent}%</td>
            </tr>`;
        }).join('');
}

function renderAppsReport() {
    const apps = state.apps || [];
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
        tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">Aucune application</td></tr>';
        return;
    }

    const esc = s => (s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    const sortedApps = [...apps].sort((a, b) => {
        const dateA = a.createdDateTime ? new Date(a.createdDateTime).getTime() : 0;
        const dateB = b.createdDateTime ? new Date(b.createdDateTime).getTime() : 0;
        return dateB - dateA;
    }).slice(0, 20);

    tbody.innerHTML = sortedApps.map(a => {
        const createdDate = a.createdDateTime ? new Date(a.createdDateTime).toLocaleDateString('fr-FR') : '-';
        return `<tr>
            <td><strong>${esc(a.displayName || '-')}</strong></td>
            <td>${esc(a.publisher || '-')}</td>
            <td><span class="badge badge-primary">${esc(a.appType || '-')}</span></td>
            <td>${createdDate}</td>
        </tr>`;
    }).join('');
}

// Délégation recherche (devices + apps)
function onSearchInput(e) {
    const id = e.target?.id;
    if (id === 'devices-search' || id === 'devices-type-filter') filterDevices();
    if (id === 'apps-search') filterApps();
}

// Init
document.addEventListener('DOMContentLoaded', async () => {
    try {
        state.currentUser = await api.get('auth/me');
        if (!state.currentUser?.isPrimaryAdmin) { window.location.href = `${basePath}`; return; }
        document.getElementById('current-user-name').textContent = state.currentUser.displayName;
        document.getElementById('user-avatar').textContent = state.currentUser.displayName?.charAt(0) || 'A';
    } catch { window.location.href = `${basePath}`; return; }
    
    try {
        state.settings = await api.get('settings');
        if (state.settings?.portal?.defaultLanguage) applyLanguage(state.settings.portal.defaultLanguage);
        applyPortalBranding();
    } catch { applyLanguage(getLang()); }
    
    document.addEventListener('input', onSearchInput);
    document.addEventListener('change', onSearchInput);
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            const page = item.dataset.page;
            if (page) {
                e.preventDefault();
                navigate(page);
            }
        });
    });
    
    if (document.getElementById('tab-compliance')) showReportTab('compliance');
    bindSetupPageEvents();
    bindBackupPageEvents();
    const adminSearchInput = document.getElementById('admin-user-search');
    if (adminSearchInput) {
        adminSearchInput.addEventListener('input', onAdminUserSearchInput);
        adminSearchInput.addEventListener('blur', () => {
            setTimeout(() => {
                const res = document.getElementById('admin-user-search-results');
                if (res) { res.innerHTML = ''; res.classList.add('hidden'); }
            }, 150);
        });
    }
    updateStorageStatus();
    navigate('dashboard');
});
