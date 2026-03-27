import { db, useFirebase } from './firebase-init.js';

const STORAGE_KEY = 'glow_store';

let store = {
    shops: [
        { id: 'salon-1', name: 'Royal Cuts', location: 'City Center, Downtown', phone: '+12345678', ownerId: 'owner-1', description: 'Elite grooming for gentlemen.', workingHours: { open: '09:00', close: '20:00' } }
    ],
    employees: [
        { id: 'emp-1', name: 'Alex', shopId: 'salon-1', available: true, uid: 'emp-uid-1' }
    ],
    appointments: [],
    notifications: []
};

function save() {
    if (!useFirebase) localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

function load() {
    if (!useFirebase) {
        const data = localStorage.getItem(STORAGE_KEY);
        if (data) store = JSON.parse(data);
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
    }
};
