document.addEventListener('DOMContentLoaded', () => {
    const themeToggle = document.getElementById('theme-toggle');
    const htmlElement = document.documentElement;

    const applyTheme = (theme) => {
        htmlElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);        
        themeToggle.checked = theme === 'dark';
    };

    const savedTheme = localStorage.getItem('theme');
    const initialTheme = savedTheme || 'dark';
    applyTheme(initialTheme);
    
    themeToggle.addEventListener('change', () => {
        const newTheme = themeToggle.checked ? 'dark' : 'light';
        applyTheme(newTheme);
    });
});