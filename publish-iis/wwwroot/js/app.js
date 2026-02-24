// IntuneWksManager - Main JavaScript

// Detect base path from <base> tag or default to '/'
const basePath = document.querySelector('base')?.getAttribute('href') || '/';

const state = {
    currentPage: 'dashboard',
    users: [],
    roles: [],
    permissions: [],
    features: [],
    clients: [],
    settings: null,
    devices: [],
    intuneUsers: [],
    apps: [],
    auditLogs: [],
    isConnected: false
};

const api = {
    async get(endpoint) {
        const res = await fetch(`${basePath}api/${endpoint}`);
        if (!res.ok) throw new Error(`API Error: ${res.status}`);
        return res.json();
    },
    async post(endpoint, data) {
        const res = await fetch(`${basePath}api/${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!res.ok) throw new Error(`API Error: ${res.status}`);
        return res.json();
    },
    async put(endpoint, data) {
        const res = await fetch(`${basePath}api/${endpoint}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!res.ok) throw new Error(`API Error: ${res.status}`);
        return res.json();
    },
    async delete(endpoint) {
        const res = await fetch(`${basePath}api/${endpoint}`, { method: 'DELETE' });
        if (!res.ok) throw new Error(`API Error: ${res.status}`);
        return res.ok;
    }
};

function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icons = {
        success: '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>',
        error: '<circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>',
        info: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>'
    };
    toast.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${icons[type] || icons.info}</svg>
        <span>${message}</span>
    `;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 5000);
}

function openModal(id) { document.getElementById(id).classList.add('active'); }
function closeModal(id) { document.getElementById(id).classList.remove('active'); }

function navigate(page) {
    state.currentPage = page;
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.page === page);
    });
    document.querySelectorAll('.page-content').forEach(content => {
        content.classList.toggle('hidden', content.id !== `page-${page}`);
    });
    loadPageData(page);
    const titles = {
        'dashboard': 'Tableau de bord', 'users': 'Gestion des Utilisateurs', 'roles': 'Rôles & Permissions',
        'features': 'Fonctionnalités', 'clients': 'Clients', 'devices': 'Appareils Intune',
        'intune-users': 'Utilisateurs Intune', 'apps': 'Applications', 'settings': 'Paramètres', 'audit': 'Journal d\'audit'
    };
    document.getElementById('header-title').textContent = titles[page] || 'IntuneWksManager';
}

async function loadPageData(page) {
    try {
        const loaders = {
            'dashboard': loadDashboard, 'users': loadUsers, 'roles': loadRoles, 'features': loadFeatures,
            'clients': loadClients, 'devices': loadDevices, 'intune-users': loadIntuneUsers, 'apps': loadApps,
            'settings': loadSettings, 'audit': loadAuditLogs
        };
        if (loaders[page]) await loaders[page]();
    } catch (error) {
        console.error('Error loading page:', error);
        showToast('Erreur lors du chargement', 'error');
    }
}

async function loadDashboard() {
    const [users, features, clients] = await Promise.all([
        api.get('users'), api.get('features'), api.get('clients')
    ]);
    state.users = users; state.features = features; state.clients = clients;
    
    document.getElementById('stat-users').textContent = users.length;
    document.getElementById('stat-clients').textContent = clients.length;
    document.getElementById('stat-features').textContent = features.filter(f => f.isEnabled).length;
    
    try {
        const devices = await api.get('graph/devices');
        state.devices = devices;
        document.getElementById('stat-devices').textContent = devices.length;
        state.isConnected = true;
        updateConnectionStatus(true);
    } catch {
        document.getElementById('stat-devices').textContent = '-';
        state.isConnected = false;
        updateConnectionStatus(false);
    }
}

function updateConnectionStatus(connected) {
    const el = document.getElementById('connection-status');
    el.className = `connection-badge ${connected ? 'connected' : 'disconnected'}`;
    el.innerHTML = `<span class="status-dot ${connected ? 'online' : 'offline'}"></span>${connected ? 'Connecté à Graph API' : 'Non connecté'}`;
}

async function loadUsers() {
    const config = await api.get('users');
    state.users = config;
    state.roles = await api.get('roles');
    renderUsersTable();
}

function renderUsersTable() {
    const tbody = document.getElementById('users-table-body');
    tbody.innerHTML = state.users.map(user => `
        <tr>
            <td><div class="flex items-center gap-3">
                <div class="user-avatar">${user.displayName.charAt(0)}</div>
                <div><div class="font-medium">${user.displayName}</div><div class="text-xs text-muted">${user.username}</div></div>
            </div></td>
            <td>${user.email}</td>
            <td><span class="badge badge-primary">${user.role}</span></td>
            <td><span class="badge ${user.isActive ? 'badge-success' : 'badge-secondary'}">${user.isActive ? 'Actif' : 'Inactif'}</span></td>
            <td>${user.lastLogin ? new Date(user.lastLogin).toLocaleDateString('fr-FR') : 'Jamais'}</td>
            <td><div class="flex gap-2">
                <button class="btn btn-ghost btn-sm" onclick="editUser('${user.id}')">✏️</button>
                <button class="btn btn-ghost btn-sm" onclick="deleteUser('${user.id}')">🗑️</button>
            </div></td>
        </tr>
    `).join('');
}

function showAddUserModal() {
    document.getElementById('user-form').reset();
    document.getElementById('user-id').value = '';
    document.getElementById('user-modal-title').textContent = 'Nouvel Utilisateur';
    const roleSelect = document.getElementById('user-role');
    roleSelect.innerHTML = state.roles.map(r => `<option value="${r.name}">${r.name}</option>`).join('');
    openModal('user-modal');
}

async function editUser(id) {
    const user = state.users.find(u => u.id === id);
    if (!user) return;
    document.getElementById('user-id').value = user.id;
    document.getElementById('user-username').value = user.username;
    document.getElementById('user-displayname').value = user.displayName;
    document.getElementById('user-email').value = user.email;
    const roleSelect = document.getElementById('user-role');
    roleSelect.innerHTML = state.roles.map(r => `<option value="${r.name}" ${r.name === user.role ? 'selected' : ''}>${r.name}</option>`).join('');
    document.getElementById('user-active').checked = user.isActive;
    document.getElementById('user-modal-title').textContent = 'Modifier Utilisateur';
    openModal('user-modal');
}

async function saveUser(event) {
    event.preventDefault();
    const id = document.getElementById('user-id').value;
    const user = {
        username: document.getElementById('user-username').value,
        displayName: document.getElementById('user-displayname').value,
        email: document.getElementById('user-email').value,
        role: document.getElementById('user-role').value,
        isActive: document.getElementById('user-active').checked
    };
    try {
        if (id) { await api.put(`users/${id}`, user); showToast('Utilisateur modifié', 'success'); }
        else { await api.post('users', user); showToast('Utilisateur créé', 'success'); }
        closeModal('user-modal');
        await loadUsers();
    } catch (error) { showToast('Erreur lors de la sauvegarde', 'error'); }
}

async function deleteUser(id) {
    if (!confirm('Supprimer cet utilisateur ?')) return;
    try {
        await api.delete(`users/${id}`);
        showToast('Utilisateur supprimé', 'success');
        await loadUsers();
    } catch (error) { showToast('Erreur lors de la suppression', 'error'); }
}

async function loadRoles() {
    state.roles = await api.get('roles');
    state.permissions = await api.get('permissions');
    renderRolesTable();
}

function renderRolesTable() {
    const tbody = document.getElementById('roles-table-body');
    tbody.innerHTML = state.roles.map(role => `
        <tr>
            <td><span class="font-medium">${role.name}</span></td>
            <td class="text-muted">${role.description}</td>
            <td>${role.permissions.includes('*') ? '<span class="badge badge-warning">Toutes</span>' : 
                `<span class="badge badge-secondary">${role.permissions.length} permissions</span>`}</td>
            <td><div class="flex gap-2">
                <button class="btn btn-ghost btn-sm" onclick="editRole('${role.name}')">✏️</button>
                ${role.name !== 'SuperAdmin' ? `<button class="btn btn-ghost btn-sm" onclick="deleteRole('${role.name}')">🗑️</button>` : ''}
            </div></td>
        </tr>
    `).join('');
}

function showAddRoleModal() {
    document.getElementById('role-form').reset();
    document.getElementById('role-original-name').value = '';
    document.getElementById('role-modal-title').textContent = 'Nouveau Rôle';
    renderPermissionsCheckboxes([]);
    openModal('role-modal');
}

function renderPermissionsCheckboxes(selected) {
    const container = document.getElementById('permissions-container');
    const grouped = {};
    state.permissions.forEach(p => {
        if (!grouped[p.category]) grouped[p.category] = [];
        grouped[p.category].push(p);
    });
    container.innerHTML = Object.entries(grouped).map(([cat, perms]) => `
        <div class="mb-4"><h4 class="text-sm font-medium mb-2">${cat}</h4>
        <div class="permissions-grid">${perms.map(p => `
            <label class="permission-item"><input type="checkbox" name="permissions" value="${p.code}" 
                ${selected.includes(p.code) || selected.includes('*') ? 'checked' : ''}/>${p.name}</label>
        `).join('')}</div></div>
    `).join('');
}

async function editRole(name) {
    const role = state.roles.find(r => r.name === name);
    if (!role) return;
    document.getElementById('role-original-name').value = role.name;
    document.getElementById('role-name').value = role.name;
    document.getElementById('role-description').value = role.description;
    renderPermissionsCheckboxes(role.permissions);
    document.getElementById('role-modal-title').textContent = 'Modifier Rôle';
    openModal('role-modal');
}

async function saveRole(event) {
    event.preventDefault();
    const originalName = document.getElementById('role-original-name').value;
    const role = {
        name: document.getElementById('role-name').value,
        description: document.getElementById('role-description').value,
        permissions: Array.from(document.querySelectorAll('input[name="permissions"]:checked')).map(cb => cb.value)
    };
    try {
        if (originalName) { await api.put(`roles/${originalName}`, role); showToast('Rôle modifié', 'success'); }
        else { await api.post('roles', role); showToast('Rôle créé', 'success'); }
        closeModal('role-modal');
        await loadRoles();
    } catch (error) { showToast('Erreur lors de la sauvegarde', 'error'); }
}

async function deleteRole(name) {
    if (!confirm('Supprimer ce rôle ?')) return;
    try {
        await api.delete(`roles/${name}`);
        showToast('Rôle supprimé', 'success');
        await loadRoles();
    } catch (error) { showToast(error.message || 'Erreur lors de la suppression', 'error'); }
}

async function loadFeatures() {
    state.features = await api.get('features');
    renderFeaturesList();
}

function renderFeaturesList() {
    const container = document.getElementById('features-list');
    container.innerHTML = state.features.map(feature => `
        <div class="card mb-4">
            <div class="card-header">
                <div class="flex items-center gap-3">
                    <div class="feature-icon">${getFeatureIcon(feature.icon)}</div>
                    <div><div class="font-medium">${feature.name}</div><div class="text-xs text-muted">${feature.description}</div></div>
                </div>
                <div class="flex items-center gap-3">
                    <span class="text-sm text-muted">Permission: ${feature.requiredPermission}</span>
                    <div class="toggle ${feature.isEnabled ? 'active' : ''}" onclick="toggleFeature('${feature.id}', ${!feature.isEnabled})"></div>
                </div>
            </div>
            <div class="card-body">
                <div class="feature-list">${feature.subFeatures.map(sub => `
                    <div class="feature-item">
                        <div class="feature-info">
                            <span class="font-medium">${sub.name}</span>
                            <span class="badge badge-secondary ml-2">${sub.requiredPermission}</span>
                        </div>
                        <div class="toggle ${sub.isEnabled ? 'active' : ''}" onclick="toggleSubFeature('${feature.id}', '${sub.id}', ${!sub.isEnabled})"></div>
                    </div>
                `).join('')}</div>
            </div>
        </div>
    `).join('');
}

function getFeatureIcon(icon) {
    const icons = {
        laptop: '💻', users: '👥', grid: '📱', shield: '🛡️', chart: '📊'
    };
    return icons[icon] || '📦';
}

async function toggleFeature(id, enabled) {
    const feature = state.features.find(f => f.id === id);
    if (!feature) return;
    feature.isEnabled = enabled;
    try {
        await api.put(`features/${id}`, feature);
        showToast(`Fonctionnalité ${enabled ? 'activée' : 'désactivée'}`, 'success');
        renderFeaturesList();
    } catch (error) { showToast('Erreur', 'error'); }
}

async function toggleSubFeature(featureId, subId, enabled) {
    const feature = state.features.find(f => f.id === featureId);
    const sub = feature?.subFeatures.find(s => s.id === subId);
    if (!sub) return;
    sub.isEnabled = enabled;
    try {
        await api.put(`features/${featureId}/subfeatures/${subId}`, sub);
        showToast(`Sous-fonctionnalité ${enabled ? 'activée' : 'désactivée'}`, 'success');
        renderFeaturesList();
    } catch (error) { showToast('Erreur', 'error'); }
}

async function loadClients() {
    const config = await api.get('clients');
    state.clients = config;
    state.features = await api.get('features');
    renderClientsTable();
}

function renderClientsTable() {
    const tbody = document.getElementById('clients-table-body');
    tbody.innerHTML = state.clients.map(client => `
        <tr>
            <td><span class="font-medium">${client.name}</span></td>
            <td class="text-muted text-sm">${client.tenantId || 'Non configuré'}</td>
            <td><span class="badge badge-primary">${client.enabledFeatures.length} fonctionnalités</span></td>
            <td><span class="badge ${client.isActive ? 'badge-success' : 'badge-secondary'}">${client.isActive ? 'Actif' : 'Inactif'}</span></td>
            <td><div class="flex gap-2">
                <button class="btn btn-ghost btn-sm" onclick="editClient('${client.id}')">✏️</button>
                <button class="btn btn-ghost btn-sm" onclick="deleteClient('${client.id}')">🗑️</button>
            </div></td>
        </tr>
    `).join('');
}

function showAddClientModal() {
    document.getElementById('client-form').reset();
    document.getElementById('client-id').value = '';
    document.getElementById('client-modal-title').textContent = 'Nouveau Client';
    renderClientFeatures([]);
    openModal('client-modal');
}

function renderClientFeatures(enabled) {
    const container = document.getElementById('client-features');
    container.innerHTML = state.features.map(f => `
        <label class="checkbox-label"><input type="checkbox" name="client-features" value="${f.id}" ${enabled.includes(f.id) ? 'checked' : ''}/>${f.name}</label>
    `).join('');
}

async function editClient(id) {
    const client = state.clients.find(c => c.id === id);
    if (!client) return;
    document.getElementById('client-id').value = client.id;
    document.getElementById('client-name').value = client.name;
    document.getElementById('client-tenant').value = client.tenantId;
    document.getElementById('client-active').checked = client.isActive;
    renderClientFeatures(client.enabledFeatures);
    document.getElementById('client-modal-title').textContent = 'Modifier Client';
    openModal('client-modal');
}

async function saveClient(event) {
    event.preventDefault();
    const id = document.getElementById('client-id').value;
    const client = {
        name: document.getElementById('client-name').value,
        tenantId: document.getElementById('client-tenant').value,
        isActive: document.getElementById('client-active').checked,
        enabledFeatures: Array.from(document.querySelectorAll('input[name="client-features"]:checked')).map(cb => cb.value),
        disabledSubFeatures: []
    };
    try {
        if (id) { await api.put(`clients/${id}`, client); showToast('Client modifié', 'success'); }
        else { await api.post('clients', client); showToast('Client créé', 'success'); }
        closeModal('client-modal');
        await loadClients();
    } catch (error) { showToast('Erreur', 'error'); }
}

async function deleteClient(id) {
    if (!confirm('Supprimer ce client ?')) return;
    try {
        await api.delete(`clients/${id}`);
        showToast('Client supprimé', 'success');
        await loadClients();
    } catch (error) { showToast('Erreur', 'error'); }
}

async function loadDevices() {
    try {
        state.devices = await api.get('graph/devices');
        renderDevicesTable();
    } catch (error) {
        document.getElementById('devices-table-body').innerHTML = '<tr><td colspan="7" class="text-center text-muted">Erreur de connexion à Graph API</td></tr>';
    }
}

function renderDevicesTable() {
    const tbody = document.getElementById('devices-table-body');
    if (!state.devices.length) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">Aucun appareil trouvé</td></tr>';
        return;
    }
    tbody.innerHTML = state.devices.map(device => `
        <tr>
            <td><span class="font-medium">${device.deviceName}</span></td>
            <td>${device.userPrincipalName || '-'}</td>
            <td>${device.operatingSystem} ${device.osVersion}</td>
            <td><span class="badge ${getComplianceBadge(device.complianceState)}">${device.complianceState}</span></td>
            <td>${device.lastSyncDateTime ? new Date(device.lastSyncDateTime).toLocaleDateString('fr-FR') : '-'}</td>
            <td>${device.serialNumber || '-'}</td>
            <td><div class="flex gap-2">
                <button class="btn btn-sm btn-secondary" onclick="syncDevice('${device.id}')" title="Synchroniser">🔄</button>
                <button class="btn btn-sm btn-secondary" onclick="restartDevice('${device.id}')" title="Redémarrer">🔁</button>
            </div></td>
        </tr>
    `).join('');
}

function getComplianceBadge(state) {
    const badges = { compliant: 'badge-success', noncompliant: 'badge-danger', unknown: 'badge-secondary' };
    return badges[state?.toLowerCase()] || 'badge-secondary';
}

async function syncDevice(id) {
    try {
        await api.post(`graph/devices/${id}/sync`);
        showToast('Synchronisation lancée', 'success');
    } catch (error) { showToast('Erreur', 'error'); }
}

async function restartDevice(id) {
    if (!confirm('Redémarrer cet appareil ?')) return;
    try {
        await api.post(`graph/devices/${id}/restart`);
        showToast('Redémarrage lancé', 'success');
    } catch (error) { showToast('Erreur', 'error'); }
}

async function loadIntuneUsers() {
    try {
        state.intuneUsers = await api.get('graph/users');
        renderIntuneUsersTable();
    } catch (error) {
        document.getElementById('intune-users-table-body').innerHTML = '<tr><td colspan="5" class="text-center text-muted">Erreur de connexion</td></tr>';
    }
}

function renderIntuneUsersTable() {
    const tbody = document.getElementById('intune-users-table-body');
    if (!state.intuneUsers.length) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">Aucun utilisateur</td></tr>';
        return;
    }
    tbody.innerHTML = state.intuneUsers.map(user => `
        <tr>
            <td><div class="flex items-center gap-3">
                <div class="user-avatar">${user.displayName?.charAt(0) || '?'}</div>
                <span class="font-medium">${user.displayName}</span>
            </div></td>
            <td>${user.userPrincipalName}</td>
            <td>${user.mail || '-'}</td>
            <td>${user.department || '-'}</td>
            <td><button class="btn btn-sm btn-secondary" onclick="viewUserDevices('${user.id}')">Voir appareils</button></td>
        </tr>
    `).join('');
}

async function viewUserDevices(userId) {
    try {
        const devices = await api.get(`graph/users/${userId}/devices`);
        alert(`Appareils: ${devices.length > 0 ? devices.map(d => d.deviceName).join(', ') : 'Aucun'}`);
    } catch (error) { showToast('Erreur', 'error'); }
}

async function loadApps() {
    try {
        state.apps = await api.get('graph/apps');
        renderAppsTable();
    } catch (error) {
        document.getElementById('apps-table-body').innerHTML = '<tr><td colspan="5" class="text-center text-muted">Erreur de connexion</td></tr>';
    }
}

function renderAppsTable() {
    const tbody = document.getElementById('apps-table-body');
    if (!state.apps.length) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">Aucune application</td></tr>';
        return;
    }
    tbody.innerHTML = state.apps.map(app => `
        <tr>
            <td><span class="font-medium">${app.displayName}</span></td>
            <td>${app.publisher || '-'}</td>
            <td><span class="badge badge-secondary">${app.appType?.replace('#microsoft.graph.', '') || '-'}</span></td>
            <td>${app.createdDateTime ? new Date(app.createdDateTime).toLocaleDateString('fr-FR') : '-'}</td>
            <td>${app.isFeatured ? '⭐' : '-'}</td>
        </tr>
    `).join('');
}

async function loadSettings() {
    state.settings = await api.get('settings');
    renderSettings();
}

function renderSettings() {
    const s = state.settings;
    document.getElementById('setting-portal-name').value = s.portal.name;
    document.getElementById('setting-portal-title').value = s.portal.title;
    document.getElementById('setting-session-timeout').value = s.portal.sessionTimeout;
    document.getElementById('setting-max-attempts').value = s.portal.maxLoginAttempts;
    document.getElementById('setting-primary-color').value = s.portal.theme.primaryColor;
    document.getElementById('setting-dark-mode').checked = s.portal.theme.darkMode;
    document.getElementById('setting-maintenance').checked = s.maintenance.isEnabled;
    document.getElementById('setting-maintenance-msg').value = s.maintenance.message;
    document.getElementById('setting-graph-timeout').value = s.graphApi.requestTimeout;
    document.getElementById('setting-beta-endpoint').checked = s.graphApi.useBetaEndpoint;
}

async function saveSettings(event) {
    event.preventDefault();
    const s = state.settings;
    s.portal.name = document.getElementById('setting-portal-name').value;
    s.portal.title = document.getElementById('setting-portal-title').value;
    s.portal.sessionTimeout = parseInt(document.getElementById('setting-session-timeout').value);
    s.portal.maxLoginAttempts = parseInt(document.getElementById('setting-max-attempts').value);
    s.portal.theme.primaryColor = document.getElementById('setting-primary-color').value;
    s.portal.theme.darkMode = document.getElementById('setting-dark-mode').checked;
    s.maintenance.isEnabled = document.getElementById('setting-maintenance').checked;
    s.maintenance.message = document.getElementById('setting-maintenance-msg').value;
    s.graphApi.requestTimeout = parseInt(document.getElementById('setting-graph-timeout').value);
    s.graphApi.useBetaEndpoint = document.getElementById('setting-beta-endpoint').checked;
    try {
        await api.put('settings', s);
        showToast('Paramètres sauvegardés', 'success');
    } catch (error) { showToast('Erreur', 'error'); }
}

async function testGraphConnection() {
    try {
        const result = await api.get('graph/test');
        showToast(result.connected ? 'Connexion réussie!' : 'Connexion échouée', result.connected ? 'success' : 'error');
        updateConnectionStatus(result.connected);
    } catch (error) { showToast('Erreur de connexion', 'error'); updateConnectionStatus(false); }
}

async function loadAuditLogs() {
    state.auditLogs = await api.get('audit?limit=100');
    renderAuditTable();
}

function renderAuditTable() {
    const tbody = document.getElementById('audit-table-body');
    if (!state.auditLogs.length) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">Aucun log</td></tr>';
        return;
    }
    tbody.innerHTML = state.auditLogs.map(log => `
        <tr>
            <td>${new Date(log.timestamp).toLocaleString('fr-FR')}</td>
            <td>${log.username}</td>
            <td><span class="badge badge-primary">${log.action}</span></td>
            <td>${log.resource}</td>
            <td class="text-sm">${log.details}</td>
            <td><span class="badge ${log.success ? 'badge-success' : 'badge-danger'}">${log.success ? 'Succès' : 'Échec'}</span></td>
        </tr>
    `).join('');
}

// Init
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => navigate(item.dataset.page));
    });
    navigate('dashboard');
});
