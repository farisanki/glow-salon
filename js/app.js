import { initAuth, onAuthStateChanged, logout } from './auth.js';
import { renderView } from './ui.js';

document.addEventListener('DOMContentLoaded', async () => {
    console.log("App Starting...");
    // Initialize Firebase and Auth
    await initAuth();
    console.log("Auth Init Complete");

    // Listen for Auth changes
    onAuthStateChanged(user => {
        if (user) {
            document.getElementById('logout-btn').style.display = 'block';
            document.getElementById('noti-btn').style.display = 'block';
            document.getElementById('bottom-nav').style.display = 'flex';
            // Redirect based on role or show home
            updateNotiBell();
            renderView('home');
        } else {
            document.getElementById('logout-btn').style.display = 'none';
            document.getElementById('noti-btn').style.display = 'none';
            document.getElementById('bottom-nav').style.display = 'none';
            renderView('login');
        }
    });

    // Handle Nav Clicks
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const view = item.getAttribute('data-view');
            document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            renderView(view);
        });
    });

    // Logout Click
    document.getElementById('logout-btn').addEventListener('click', logout);

    // Register Service Worker
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js')
            .then(() => console.log('Service Worker Registered'));
    }
});
