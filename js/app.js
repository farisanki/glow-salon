import { initAuth, onAuthStateChanged, logout } from './auth.js';
import { renderView, updateNotiBell } from './ui.js';

async function initApp() {
    console.log("App Initializing...");
    try {
        await initAuth();
        console.log("Auth Initialized");

        onAuthStateChanged(user => {
            console.log("Auth State Changed:", user ? user.role : 'Guest');
            if (user) {
                document.getElementById('logout-btn').style.display = 'block';
                document.getElementById('noti-btn').style.display = 'block';
                document.getElementById('bottom-nav').style.display = 'flex';
                updateNotiBell();
                renderView('home');
            } else {
                document.getElementById('logout-btn').style.display = 'none';
                document.getElementById('noti-btn').style.display = 'none';
                document.getElementById('bottom-nav').style.display = 'none';
                renderView('login');
            }
        });

        // Event Listeners
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const view = item.getAttribute('data-view');
                document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
                item.classList.add('active');
                renderView(view);
            });
        });

        document.getElementById('logout-btn').addEventListener('click', logout);

        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('./sw.js').then(() => console.log('SW Registered'));
        }
    } catch (err) {
        console.error("Initialization Failed:", err);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}
