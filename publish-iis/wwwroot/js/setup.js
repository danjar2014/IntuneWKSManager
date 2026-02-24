// Setup.js - Configuration page
const basePath = document.querySelector('base')?.getAttribute('href') || '/';

const api = {
    async get(endpoint) {
        const res = await fetch(`${basePath}api/${endpoint}`);
        if (res.status === 401) { 
            window.location.href = `${basePath}`; 
            return null; 
        }
        if (res.status === 403) { 
            throw new Error('Accès refusé'); 
        }
        if (!res.ok) {
            const error = await res.json().catch(() => ({ message: `HTTP ${res.status}` }));
            throw new Error(error.message || `HTTP ${res.status}`);
        }
        return res.json();
    },
    async post(endpoint, data) {
        const res = await fetch(`${basePath}api/${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!res.ok) {
            const error = await res.json().catch(() => ({ message: `HTTP ${res.status}` }));
            throw new Error(error.message || `HTTP ${res.status}`);
        }
        return res.json();
    },
    async put(endpoint, data) {
        const res = await fetch(`${basePath}api/${endpoint}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!res.ok) {
            const error = await res.json().catch(() => ({ message: `HTTP ${res.status}` }));
            throw new Error(error.message || `HTTP ${res.status}`);
        }
        return res.json();
    },
    async delete(endpoint) {
        const res = await fetch(`${basePath}api/${endpoint}`, { method: 'DELETE' });
        if (!res.ok) {
            const error = await res.json().catch(() => ({ message: `HTTP ${res.status}` }));
            throw new Error(error.message || `HTTP ${res.status}`);
        }
        return res.json();
    }
};

// Load Azure AD configuration
async function loadAzureAdConfig() {
    try {
        const config = await api.get('setup/azuread');
        document.getElementById('tenant-id').value = config.tenantId || '';
        document.getElementById('client-id').value = config.clientId || '';
        if (config.isConfigured) {
            showStatus('azuread-status', 'Configuration actuelle chargée. Laissez le secret vide pour le conserver.', 'info');
        }
    } catch (err) {
        console.error('Error loading Azure AD config:', err);
        showStatus('azuread-status', `Erreur: ${err.message}`, 'error');
    }
}

// Save Azure AD configuration
document.getElementById('azuread-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const statusEl = document.getElementById('azuread-status');
    
    try {
        const data = {
            tenantId: document.getElementById('tenant-id').value.trim(),
            clientId: document.getElementById('client-id').value.trim(),
            clientSecret: document.getElementById('client-secret').value.trim() || undefined
        };

        if (!data.tenantId || !data.clientId) {
            showStatus('azuread-status', 'Tenant ID et Client ID sont requis', 'error');
            return;
        }

        showStatus('azuread-status', 'Sauvegarde en cours...', 'info');
        await api.post('setup/azuread', data);
        showStatus('azuread-status', 'Configuration sauvegardée avec succès', 'success');
        document.getElementById('client-secret').value = '';
    } catch (err) {
        console.error('Error saving Azure AD config:', err);
        showStatus('azuread-status', `Erreur: ${err.message}`, 'error');
    }
});

// Load primary admins
async function loadPrimaryAdmins() {
    try {
        const admins = await api.get('setup/primary-admins');
        renderPrimaryAdmins(admins);
    } catch (err) {
        console.error('Error loading primary admins:', err);
        const tbody = document.getElementById('primary-admins-tbody');
        tbody.innerHTML = `<tr><td colspan="6" class="text-center text-error">Erreur: ${err.message}</td></tr>`;
    }
}

function renderPrimaryAdmins(admins) {
    const tbody = document.getElementById('primary-admins-tbody');
    if (!admins || admins.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">Aucun administrateur principal</td></tr>';
        return;
    }

    // Clear existing rows
    tbody.innerHTML = '';

    admins.forEach(admin => {
        const createdDate = admin.createdAt ? new Date(admin.createdAt).toLocaleDateString('fr-FR') : '-';
        const row = document.createElement('tr');
        
        row.innerHTML = `
            <td><strong>${escapeHtml(admin.email)}</strong></td>
            <td>${escapeHtml(admin.displayName || '-')}</td>
            <td><code class="text-xs">${escapeHtml(admin.azureObjectId || '-')}</code></td>
            <td><span class="badge ${admin.isActive ? 'badge-success' : 'badge-secondary'}">${admin.isActive ? 'Actif' : 'Inactif'}</span></td>
            <td>${createdDate}</td>
            <td>
                <button class="btn btn-ghost btn-sm" onclick="editPrimaryAdmin('${escapeHtml(admin.id)}')" title="Modifier">
                    <span class="btn-icon" data-icon="edit"></span>
                </button>
                <button class="btn btn-ghost btn-sm" onclick="deletePrimaryAdmin('${escapeHtml(admin.id)}')" title="Supprimer">
                    <span class="btn-icon" data-icon="delete"></span>
                </button>
            </td>
        `;
        
        tbody.appendChild(row);
    });

    // Initialize icons after DOM is created - use insertAdjacentHTML for safer SVG injection
    tbody.querySelectorAll('.btn-icon[data-icon]').forEach(iconEl => {
        const iconName = iconEl.dataset.icon;
        if (typeof getIcon === 'function') {
            const iconHtml = getIcon(iconName);
            if (iconHtml) {
                // Clear first, then insert SVG safely
                iconEl.textContent = '';
                try {
                    iconEl.insertAdjacentHTML('beforeend', iconHtml);
                } catch (e) {
                    console.warn('Failed to insert icon:', iconName, e);
                }
            }
        }
    });
}

// Show add admin modal
function showAddAdminModal() {
    const modal = document.getElementById('admin-modal');
    if (modal) {
        document.getElementById('admin-modal-title').textContent = 'Ajouter un administrateur principal';
        document.getElementById('admin-form').reset();
        document.getElementById('admin-id').value = '';
        document.getElementById('admin-active').checked = true;
        modal.classList.add('active');
    }
}

// Edit primary admin
async function editPrimaryAdmin(id) {
    try {
        const admins = await api.get('setup/primary-admins');
        const admin = admins.find(a => a.id === id);
        if (!admin) {
            alert('Administrateur non trouvé');
            return;
        }

        const modal = document.getElementById('admin-modal');
        if (modal) {
            document.getElementById('admin-modal-title').textContent = 'Modifier un administrateur principal';
            document.getElementById('admin-id').value = admin.id;
            document.getElementById('admin-email').value = admin.email;
            document.getElementById('admin-display-name').value = admin.displayName || '';
            document.getElementById('admin-object-id').value = admin.azureObjectId || '';
            document.getElementById('admin-active').checked = admin.isActive;
            modal.classList.add('active');
        }
    } catch (err) {
        console.error('Error loading admin:', err);
        alert(`Erreur: ${err.message}`);
    }
}

// Delete primary admin
async function deletePrimaryAdmin(id) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet administrateur principal ?')) {
        return;
    }

    try {
        await api.delete(`setup/primary-admins/${id}`);
        await loadPrimaryAdmins();
    } catch (err) {
        console.error('Error deleting admin:', err);
        alert(`Erreur: ${err.message}`);
    }
}

// Save admin form
document.getElementById('admin-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const id = document.getElementById('admin-id').value;
    const data = {
        email: document.getElementById('admin-email').value.trim(),
        displayName: document.getElementById('admin-display-name').value.trim() || undefined,
        azureObjectId: document.getElementById('admin-object-id').value.trim() || undefined,
        isActive: document.getElementById('admin-active').checked
    };

    if (!data.email) {
        alert('L\'email est requis');
        return;
    }

    try {
        if (id) {
            await api.put(`setup/primary-admins/${id}`, data);
        } else {
            await api.post('setup/primary-admins', data);
        }
        closeAdminModal();
        await loadPrimaryAdmins();
    } catch (err) {
        console.error('Error saving admin:', err);
        alert(`Erreur: ${err.message}`);
    }
});

// Close admin modal
function closeAdminModal() {
    const modal = document.getElementById('admin-modal');
    if (modal) {
        modal.classList.remove('active');
    }
}

// Show status message
function showStatus(elementId, message, type) {
    const el = document.getElementById(elementId);
    el.className = `alert alert-${type === 'error' ? 'danger' : type === 'success' ? 'success' : 'info'}`;
    el.textContent = message;
    el.style.display = 'block';
    
    if (type === 'success' || type === 'info') {
        setTimeout(() => {
            el.style.display = 'none';
        }, 5000);
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ==================== Stockage des données ====================

const storagePanel = () => document.getElementById('storage-sql-panel');
const storageCardJson = () => document.getElementById('storage-card-json');
const storageCardSql = () => document.getElementById('storage-card-sql');

function updateStorageChoiceUI() {
    const sqlChecked = document.querySelector('input[name="storage-provider"]:checked')?.value === 'SqlServer';
    const panel = storagePanel();
    const cardJson = storageCardJson();
    const cardSql = storageCardSql();
    if (panel) {
        if (sqlChecked) {
            panel.classList.remove('hidden');
            panel.style.display = '';
        } else {
            panel.classList.add('hidden');
        }
    }
    if (cardJson) cardJson.classList.toggle('selected', !sqlChecked);
    if (cardSql) cardSql.classList.toggle('selected', sqlChecked);
    toggleStorageSqlAuth();
}

async function loadStorageConfig() {
    const form = document.getElementById('storage-form');
    if (!form) return;
    try {
        const config = await api.get('setup/storage');
        const provider = (config?.provider || 'Json').toLowerCase();
        const jsonRadio = document.getElementById('storage-opt-json');
        const sqlRadio = document.getElementById('storage-opt-sql');
        if (jsonRadio && sqlRadio) {
            if (provider === 'sqlserver') {
                sqlRadio.checked = true;
                if (storagePanel()) storagePanel().classList.remove('hidden');
                const server = document.getElementById('storage-server');
                const port = document.getElementById('storage-port');
                const database = document.getElementById('storage-database');
                const integrated = document.getElementById('storage-integrated');
                const user = document.getElementById('storage-user');
                if (server) server.value = config.server || '';
                if (port) port.value = config.port || '';
                if (database) database.value = config.database || 'IntuneWksManager';
                if (integrated) integrated.checked = !!config.integratedSecurity;
                if (user) user.value = config.userId || '';
            } else {
                jsonRadio.checked = true;
                if (storagePanel()) storagePanel().classList.add('hidden');
            }
            updateStorageChoiceUI();
        }
    } catch (err) {
        console.error('Error loading storage config:', err);
    }
}

function toggleStorageSqlAuth() {
    const integrated = document.getElementById('storage-integrated');
    const sqlAuth = document.getElementById('storage-sql-auth');
    if (sqlAuth && integrated) sqlAuth.style.display = integrated.checked ? 'none' : 'block';
}

document.querySelectorAll('input[name="storage-provider"]').forEach(r => {
    r.addEventListener('change', updateStorageChoiceUI);
});
const storageIntegrated = document.getElementById('storage-integrated');
if (storageIntegrated) storageIntegrated.addEventListener('change', toggleStorageSqlAuth);

document.getElementById('storage-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const statusEl = document.getElementById('storage-status');
    try {
        const provider = document.querySelector('input[name="storage-provider"]:checked')?.value || 'Json';
        const data = { provider };
        if (provider === 'SqlServer') {
            data.server = document.getElementById('storage-server').value.trim();
            const port = document.getElementById('storage-port').value.trim();
            if (port) data.port = parseInt(port, 10);
            data.database = document.getElementById('storage-database').value.trim() || 'IntuneWksManager';
            data.integratedSecurity = document.getElementById('storage-integrated').checked;
            if (!data.integratedSecurity) {
                data.userId = document.getElementById('storage-user').value.trim();
                const pwd = document.getElementById('storage-password').value;
                if (pwd) data.password = pwd;
            }
        }
        showStatus('storage-status', 'Enregistrement...', 'info');
        const result = await api.post('setup/storage', data);
        showStatus('storage-status', result?.message || 'Configuration enregistrée. Redémarrez l\'application.', 'success');
    } catch (err) {
        console.error('Error saving storage:', err);
        showStatus('storage-status', 'Erreur: ' + (err.message || 'inconnue'), 'error');
    }
});

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    updateStorageChoiceUI();
    // Clic sur les cartes : afficher le panneau SQL quand on clique sur la carte SQL
    const cardSql = document.getElementById('storage-card-sql');
    const cardJson = document.getElementById('storage-card-json');
    if (cardSql) cardSql.addEventListener('click', () => setTimeout(updateStorageChoiceUI, 10));
    if (cardJson) cardJson.addEventListener('click', () => setTimeout(updateStorageChoiceUI, 10));
    loadStorageConfig();
    loadAzureAdConfig();
    loadPrimaryAdmins();
});
