import { firebaseConfig, useFirebase } from './firebase-config.js';

let db = null;
let auth = null;

export async function initFirebase() {
    if (!useFirebase) {
        console.warn("Using LocalStorage mode.");
        return { db: null, auth: null };
    }

    const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js');
    const { getFirestore } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
    const { getAuth } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');

    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);

    return { db, auth };
}

export { db, auth, useFirebase };
