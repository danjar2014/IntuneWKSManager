// Theme Management
(function() {
    const THEME_KEY = 'intune-wks-theme';
    const defaultTheme = 'dark';
    
    function getTheme() {
        return localStorage.getItem(THEME_KEY) || defaultTheme;
    }
    
    function setTheme(theme) {
        localStorage.setItem(THEME_KEY, theme);
        document.documentElement.setAttribute('data-theme', theme);
        updateThemeIcon(theme);
    }
    
    function updateThemeIcon(theme) {
        const toggle = document.getElementById('theme-toggle');
        if (!toggle) return;
        toggle.innerHTML = theme === 'dark' ? getIcon('themeLight') : getIcon('theme');
    }
    
    function initTheme() {
        const theme = getTheme();
        setTheme(theme);
    }
    
    function toggleTheme() {
        const current = getTheme();
        const newTheme = current === 'dark' ? 'light' : 'dark';
        setTheme(newTheme);
    }
    
    // Initialize on load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initTheme);
    } else {
        initTheme();
    }
    
    // Expose globally
    window.toggleTheme = toggleTheme;
    window.getTheme = getTheme;
    window.setTheme = setTheme;
})();
