import { firebaseConfig, useFirebase } from './firebase-config.js';

// Mutable object — properties are set by initFirebase() after async imports
export const firebaseServices = { db: null, auth: null };

export async function initFirebase() {
    if (!useFirebase) {
        console.warn("Using LocalStorage mode.");
        return;
    }

    const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js');
    const { getFirestore } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
    const { getAuth } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');

    const app = initializeApp(firebaseConfig);
    firebaseServices.db = getFirestore(app);
    firebaseServices.auth = getAuth(app);
}

export { useFirebase };
