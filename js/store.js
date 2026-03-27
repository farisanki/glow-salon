import { firebaseServices, useFirebase } from './firebase-init.js';

const STORAGE_KEY = 'glow_store';

let store = {
    shops: [
        { id: 'salon-1', name: 'Royal Cuts', location: 'City Center, Downtown', phone: '+12345678', ownerId: 'owner-1', description: 'Elite grooming for gentlemen.', schedule: { mon: { open: '09:00', close: '20:00', off: false }, tue: { open: '09:00', close: '20:00', off: false }, wed: { open: '09:00', close: '20:00', off: false }, thu: { open: '09:00', close: '20:00', off: false }, fri: { open: '09:00', close: '20:00', off: false }, sat: { open: '10:00', close: '18:00', off: false }, sun: { open: '10:00', close: '18:00', off: true } }, photos: [] }
    ],
    employees: [
        { id: 'emp-1', name: 'Alex', shopId: 'salon-1', available: true, uid: 'emp-uid-1' }
    ],
    services: [
        { id: 'svc-1', shopId: 'salon-1', name: 'Haircut', price: 7.000, duration: 30 },
        { id: 'svc-2', shopId: 'salon-1', name: 'Beard Trim', price: 4.500, duration: 20 },
        { id: 'svc-3', shopId: 'salon-1', name: 'Haircut & Beard', price: 10.000, duration: 45 }
    ],
    appointments: [],
    notifications: [],
    users: [
        { uid: 'mock-admin', name: 'Admin', email: 'admin@glow.com', role: 'admin' }
    ]
};

function save() {
    if (!useFirebase) localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

function load() {
    if (!useFirebase) {
        const data = localStorage.getItem(STORAGE_KEY);
        // Merge with defaults so new fields (e.g. services) are present even in old stored data
        if (data) store = { ...store, ...JSON.parse(data) };
    }
}

load();

export const Store = {
    getShops: async () => {
        return store.shops;
    },
    getShop: async (id) => {
        return store.shops.find(s => s.id === id);
    },
    addShop: async (salon) => {
        store.shops.push(salon);
        save();
    },
    updateShop: async (id, data) => {
        if (useFirebase) {
            const { doc, updateDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
            await updateDoc(doc(firebaseServices.db, 'shops', id), data);
        } else {
            const shop = store.shops.find(s => s.id === id);
            if (shop) { Object.assign(shop, data); save(); }
        }
    },
    addShopPhoto: async (shopId, base64) => {
        const shop = store.shops.find(s => s.id === shopId);
        if (shop) {
            if (!shop.photos) shop.photos = [];
            shop.photos.push(base64);
            save();
        }
    },
    deleteShopPhoto: async (shopId, index) => {
        const shop = store.shops.find(s => s.id === shopId);
        if (shop && shop.photos) {
            shop.photos.splice(index, 1);
            save();
        }
    },
    
    getEmployees: async (shopId) => {
        return store.employees.filter(e => e.shopId === shopId);
    },
    addEmployee: async (emp) => {
        store.employees.push(emp);
        save();
    },
    updateEmployeeStatus: async (id, status) => {
        const emp = store.employees.find(e => e.id === id);
        if (emp) emp.available = status;
        save();
    },

    getAppointments: async (filter = {}) => {
        return store.appointments.filter(a => {
            if (filter.shopId && a.shopId !== filter.shopId) return false;
            if (filter.employeeId && a.employeeId !== filter.employeeId) return false;
            return true;
        });
    },
    addAppointment: async (appt) => {
        store.appointments.push(appt);
        save();
    },

    getNotifications: (uid) => {
        return store.notifications.filter(n => n.recipientId === uid);
    },
    addNotification: async (noti) => {
        store.notifications.push(noti);
        save();
    },

    getServices: async (shopId) => {
        return (store.services || []).filter(s => s.shopId === shopId);
    },
    addService: async (svc) => {
        if (!store.services) store.services = [];
        store.services.push(svc);
        save();
    },
    deleteService: async (id) => {
        store.services = (store.services || []).filter(s => s.id !== id);
        save();
    },

    // User management (used by admin)
    getUsers: async () => {
        if (useFirebase) {
            const { collection, getDocs } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
            const snap = await getDocs(collection(firebaseServices.db, 'users'));
            return snap.docs.map(d => ({ uid: d.id, ...d.data() }));
        }
        return store.users || [];
    },
    addUser: async (user) => {
        if (!store.users) store.users = [];
        // Avoid duplicates
        if (!store.users.find(u => u.uid === user.uid)) {
            store.users.push(user);
            save();
        }
    },
    setUserRole: async (uid, role) => {
        if (useFirebase) {
            const { doc, updateDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
            await updateDoc(doc(firebaseServices.db, 'users', uid), { role });
        } else {
            const u = (store.users || []).find(u => u.uid === uid);
            if (u) { u.role = role; save(); }
        }
    }
};
