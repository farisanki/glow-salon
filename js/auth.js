import { firebaseServices, initFirebase, useFirebase } from './firebase-init.js';
import { Store } from './store.js';

let currentUser = null;

export async function initAuth() {
    await initFirebase();
    if (!useFirebase) {
        const saved = localStorage.getItem('glow_user');
        if (saved) currentUser = JSON.parse(saved);
    }
}

/**
 * Registers a callback that fires whenever auth state changes.
 * - Firebase mode: uses Firebase onAuthStateChanged (fires on page load from persisted session)
 * - Mock mode: fires once after a short delay
 */
export function onAuthStateChanged(callback) {
    if (useFirebase) {
        import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js')
            .then(({ onAuthStateChanged: fbListen }) => {
                fbListen(firebaseServices.auth, async (fbUser) => {
                    if (fbUser) {
                        // Fetch role from Firestore users collection
                        let role = 'user';
                        let name = fbUser.displayName || '';
                        try {
                            const { doc, getDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
                            const snap = await getDoc(doc(firebaseServices.db, 'users', fbUser.uid));
                            if (snap.exists()) {
                                role = snap.data().role || 'user';
                                name = snap.data().name || name;
                            }
                        } catch (e) { /* role stays 'user' if Firestore read fails */ }
                        currentUser = { name, email: fbUser.email, uid: fbUser.uid, role };
                    } else {
                        currentUser = null;
                    }
                    callback(currentUser);
                });
            });
    } else {
        setTimeout(() => callback(currentUser), 100);
    }
}

export async function signup(name, email, password) {
    if (useFirebase) {
        const { createUserWithEmailAndPassword, updateProfile } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
        const { doc, setDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
        // Create the Firebase Auth account
        const cred = await createUserWithEmailAndPassword(firebaseServices.auth, email, password);
        // Set display name
        await updateProfile(cred.user, { displayName: name });
        // Create the Firestore user document with default role 'user'
        await setDoc(doc(firebaseServices.db, 'users', cred.user.uid), {
            name,
            email,
            role: 'user',
            createdAt: Date.now()
        });
        // Firebase onAuthStateChanged fires automatically — no reload needed
    } else {
        // Mock mode: create a user in localStorage
        const newUser = { name, email, role: 'user', uid: Date.now().toString() };
        currentUser = newUser;
        localStorage.setItem('glow_user', JSON.stringify(currentUser));
        await Store.addUser(newUser);
        location.reload();
    }
}

export async function login(email, password, role = 'user') {
    if (useFirebase) {
        const { signInWithEmailAndPassword } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
        // Throws on wrong credentials — error propagates to the login form
        await signInWithEmailAndPassword(firebaseServices.auth, email, password);
        // Firebase onAuthStateChanged fires automatically — no reload needed
    } else {
        currentUser = { email, role, uid: Date.now().toString() };
        localStorage.setItem('glow_user', JSON.stringify(currentUser));
        location.reload();
    }
}

export async function logout() {
    if (useFirebase) {
        const { signOut } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
        await signOut(firebaseServices.auth);
        currentUser = null;
        // Firebase onAuthStateChanged fires automatically — no reload needed
    } else {
        currentUser = null;
        localStorage.removeItem('glow_user');
        location.reload();
    }
}

export function getCurrentUser() {
    return currentUser;
}
