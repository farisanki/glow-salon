import { getCurrentUser, login } from './auth.js';
import { Store } from './store.js';

const main = document.getElementById('main-content');

export function updateNotiBell() {
    const user = getCurrentUser();
    if (!user) return;
    const notis = Store.getNotifications(user.uid).filter(n => !n.read);
    const btn = document.getElementById('noti-btn');
    const badge = btn.querySelector('.badge');
    if (notis.length > 0) {
        badge.style.display = 'block';
    } else {
        badge.style.display = 'none';
    }
}

export function renderView(viewName) {
    const user = getCurrentUser();
    
    // Simple router handle Salon Detail
    if (viewName.startsWith('salon/')) {
        const id = viewName.split('/')[1];
        renderSalonDetail(id);
        return;
    }

    switch (viewName) {
        case 'login':
            renderLogin();
            break;
        case 'home':
            if (user?.role === 'admin') renderAdminDashboard();
            else if (user?.role === 'owner') renderOwnerDashboard();
            else if (user?.role === 'employee') renderEmployeeDashboard();
            else renderClientHome();
            break;
        case 'bookings':
            renderBookings();
            break;
        case 'profile':
            renderProfile();
            break;
        default:
            main.innerHTML = `<div class="p-4"><h2>Page Not Found</h2></div>`;
    }
}

function renderLogin() {
    main.innerHTML = `
        <div class="glass-card login-card p-4">
            <h1 class="logo mb-4">GLOW</h1>
            <h2>Welcome</h2>
            <p class="text-secondary mb-4">Sign in to your account</p>
            <div class="form-group">
                <label>Email</label>
                <input type="email" id="email" placeholder="john@example.com">
            </div>
             <div class="form-group">
                <label>Role for Testing</label>
                <select id="role">
                    <option value="user">Customer</option>
                    <option value="owner">Shop Owner</option>
                    <option value="employee">Barber</option>
                    <option value="admin">System Admin</option>
                </select>
            </div>
            <button id="login-btn" class="btn-primary">Sign In</button>
        </div>
    `;
    document.getElementById('login-btn').onclick = () => {
        const email = document.getElementById('email').value;
        const role = document.getElementById('role').value;
        if (email) login(email, 'pass', role);
    };
}

function renderAdminDashboard() {
    const owners = Store.getShops();
    main.innerHTML = `
        <div class="p-4">
            <h2>System Admin</h2>
            <div class="glass-card mt-4">
                <h3>Register New Shop & Owner</h3>
                <div class="form-group mt-4">
                    <input type="text" id="shop-name" placeholder="Shop Name">
                </div>
                <div class="form-group">
                    <input type="email" id="owner-email" placeholder="Owner Email">
                </div>
                <button id="add-shop-btn" class="btn-primary">Create Shop Account</button>
            </div>
            <h3 class="mt-4">Active Shops</h3>
            ${owners.map(s => `<div class="glass-card mt-2">${s.name} - ${s.location} <button class="btn-text" style="color:red">Remove</button></div>`).join('')}
        </div>
    `;
    document.getElementById('add-shop-btn').onclick = () => {
        const name = document.getElementById('shop-name').value;
        const email = document.getElementById('owner-email').value;
        if (name && email) {
            Store.addShop({ id: Date.now().toString(), name, location: 'TBD', ownerId: email });
            renderAdminDashboard();
        }
    };
}

function renderOwnerDashboard() {
    const user = getCurrentUser();
    const shop = Store.getShops().find(s => s.ownerId === user.email) || Store.getShops()[0];
    const employees = Store.getEmployees(shop.id);

    main.innerHTML = `
        <div class="p-4">
            <h2>${shop.name} Dashboard</h2>
            <p class="text-secondary">📍 ${shop.location}</p>
            
            <div class="glass-card mt-4">
                <h3>Shop Profile</h3>
                <div class="form-group">
                    <label>Phone</label>
                    <input type="text" value="${shop.phone}" readonly>
                </div>
                 <div class="form-group">
                    <label>Working Hours</label>
                    <input type="text" value="${shop.workingHours.open} - ${shop.workingHours.close}" readonly>
                </div>
                <button class="btn-primary" style="padding:0.5rem">Edit Profile</button>
            </div>

            <div class="glass-card mt-4">
                <h3>Manage Employees</h3>
                <div class="form-group mt-2">
                    <input type="text" id="emp-name" placeholder="Employee Name">
                </div>
                <button id="add-emp-btn" class="btn-primary">Add Barber</button>
                <div class="mt-4">
                    ${employees.map(e => `<div class="text-secondary">${e.name} - ${e.available ? '✅ Online' : '❌ Away'}</div>`).join('')}
                </div>
            </div>
        </div>
    `;

    document.getElementById('add-emp-btn').onclick = () => {
        const name = document.getElementById('emp-name').value;
        if (name) {
            Store.addEmployee({ id: Date.now().toString(), name, shopId: shop.id, available: true });
            renderOwnerDashboard();
        }
    };
}

function renderEmployeeDashboard() {
    const user = getCurrentUser();
    const emp = Store.getEmployees().find(e => e.name === 'Alex'); // Mock find
    main.innerHTML = `
        <div class="p-4">
            <h2>Welcome Barber</h2>
            <div class="glass-card mt-4">
                <h3>My Status</h3>
                <button id="toggle-avail" class="btn-primary mt-2">${emp?.available ? 'Go Away' : 'Go Online'}</button>
            </div>
            <h3 class="mt-4">Today's Schedule</h3>
            <div class="glass-card">No appointments yet.</div>
        </div>
    `;
    document.getElementById('toggle-avail').onclick = () => {
         Store.updateEmployeeStatus(emp.id, !emp.available);
         renderEmployeeDashboard();
    };
}

function renderClientHome() {
    const salons = Store.getShops();
    main.innerHTML = `
        <div class="p-4">
            <h2 class="mb-4">Find a Salon</h2>
            ${salons.map(s => `
                <div class="glass-card" onclick="renderView('salon/${s.id}')">
                    <h3>${s.name}</h3>
                    <p class="text-secondary">📍 ${s.location}</p>
                    <button class="btn-primary mt-4">View Services</button>
                </div>
            `).join('')}
        </div>
    `;
}

function renderSalonDetail(id) {
    const shop = Store.getShop(id);
    const employees = Store.getEmployees(id).filter(e => e.available);

    main.innerHTML = `
        <div class="p-4">
            <button class="btn-text mb-2" onclick="renderView('home')">← Back</button>
            <h2>${shop.name}</h2>
            <p class="text-secondary">${shop.description}</p>
            
            <h3 class="mt-4">1. Choose Barber</h3>
            <div style="display:flex; gap:10px; overflow-x:auto" class="pb-2">
                ${employees.map(e => `
                    <div class="glass-card text-center" style="min-width:100px; cursor:pointer" onclick="selectEmployee('${e.id}')">
                        <div class="avatar" style="font-size:2rem">🧔</div>
                        <p>${e.name}</p>
                    </div>
                `).join('')}
            </div>

            <div id="booking-slots" class="mt-4 hidden">
                 <h3>2. Select Time</h3>
                 <div class="slot-grid mt-2" style="display:grid; grid-template-columns: repeat(3, 1fr); gap:10px">
                    ${['09:00', '09:30', '10:00', '10:30', '11:00', '11:30'].map(t => `
                        <button class="glass-card slot-btn" style="padding:0.5rem" onclick="book('${shop.id}', '${t}')">${t}</button>
                    `).join('')}
                 </div>
            </div>
        </div>
    `;

    window.selectEmployee = (eid) => {
        document.getElementById('booking-slots').classList.remove('hidden');
    };

    window.book = (sid, time) => {
        const user = getCurrentUser();
        const shop = Store.getShop(sid);
        
        // Add booking
        Store.addAppointment({ sid, time, userId: user.uid });
        
        // Notify owner
        Store.addNotification({
            id: Date.now().toString(),
            recipientId: shop.ownerId, // For mock, ownerId is email
            title: 'New Booking!',
            body: `Appointment at ${time}`,
            read: false
        });

        alert('Booking confirmed for ' + time);
        renderView('bookings');
        updateNotiBell();
    };
}

function renderBookings() {
    main.innerHTML = `<div class="p-4"><h2>My Bookings</h2><div class="glass-card">You have 1 upcoming appointment at 09:30.</div></div>`;
}

function renderProfile() {
    main.innerHTML = `<div class="p-4"><h2>My Profile</h2><button class="btn-primary mt-4" onclick="location.reload()">Reload App</button></div>`;
}
