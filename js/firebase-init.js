import { firebaseConfig, useFirebase } from './firebase-config.js';
export { useFirebase };

let db = null;
let auth = null;

export async function initFirebase() {
    if (!useFirebase) {
        console.warn("Using LocalStorage mode. Fill js/firebase-config.js to enable Real-time persistence.");
        return { db: null, auth: null };
    }

    // Dynamic Import of Firebase SDKs to keep app fast
    const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js');
    const { getFirestore } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
    const { getAuth } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');

    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);

    console.log("Firebase Initialized Successfully");
    return { db, auth };
}

export { db, auth };
