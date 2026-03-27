// For now, this is a placeholder. 
// REAL Firebase integration requires the user to provide their config.
// I will implement a "Store" that handles either localStorage or Firebase.

let currentUser = null;

export async function initAuth() {
    console.log("Auth Initialized");
    // Check local storage for session
    const saved = localStorage.getItem('glow_user');
    if (saved) currentUser = JSON.parse(saved);
}

export function onAuthStateChanged(callback) {
    // Simple mock: notify after a delay
    setTimeout(() => callback(currentUser), 500);
}

export function login(email, password, role = 'user') {
    // Mock login logic
    currentUser = { email, role, uid: Date.now().toString() };
    localStorage.setItem('glow_user', JSON.stringify(currentUser));
    location.reload();
}

export function logout() {
    currentUser = null;
    localStorage.removeItem('glow_user');
    location.reload();
}

export function getCurrentUser() {
    return currentUser;
}
