import { getCurrentUser, login, signup } from './auth.js';
import { Store } from './store.js';
import { useFirebase } from './firebase-config.js';
import { t, getLang, setLang } from './i18n.js';
import { sendNotification } from './notify.js';

const main = document.getElementById('main-content');

// Track current view for re-render when language is switched
let _currentView = 'login';

// Expose renderView globally so inline onclick handlers in dynamic HTML can call it
window.renderView = renderView;

// Language toggle — called by the header lang-btn
window.toggleLang = () => {
    const newLang = getLang() === 'en' ? 'ar' : 'en';
    setLang(newLang);
    document.documentElement.lang = newLang;
    document.documentElement.dir = newLang === 'ar' ? 'rtl' : 'ltr';
    const btn = document.getElementById('lang-btn');
    if (btn) btn.textContent = newLang === 'en' ? 'عربي' : 'English';
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn && logoutBtn.style.display !== 'none') logoutBtn.textContent = t('logout');
    renderView(_currentView);
};

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

export async function renderView(viewName) {
    _currentView = viewName;
    const user = getCurrentUser();

    // Simple router handle Salon Detail
    if (viewName.startsWith('salon/')) {
        const id = viewName.split('/')[1];
        await renderSalonDetail(id);
        return;
    }

    switch (viewName) {
        case 'login':
            renderLogin();
            break;
        case 'signup':
            renderSignup();
            break;
        case 'home':
            if (user?.role === 'admin') await renderAdminDashboard();
            else if (user?.role === 'owner') await renderOwnerDashboard();
            else if (user?.role === 'employee') await renderEmployeeDashboard();
            else await renderClientHome();
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
            <h1 class="logo mb-4">${t('appName')}</h1>
            <h2>${t('welcome')}</h2>
            <p class="text-secondary mb-4">${t('signInSub')}</p>
            <div class="form-group">
                <label>${t('email')}</label>
                <input type="email" id="email" placeholder="john@example.com" autocomplete="email">
            </div>
            <div class="form-group">
                <label>${t('password')}</label>
                <input type="password" id="password" placeholder="••••••••" autocomplete="current-password">
            </div>
            ${!useFirebase ? `
            <div class="form-group">
                <label style="color:var(--text-secondary);font-size:0.8rem">${t('roleLabel')}</label>
                <select id="role">
                    <option value="user">Customer</option>
                    <option value="owner">Shop Owner</option>
                    <option value="employee">Barber</option>
                    <option value="admin">System Admin</option>
                </select>
            </div>` : ''}
            <div id="login-error" style="color:var(--error);font-size:0.875rem;margin-bottom:0.5rem;display:none"></div>
            <button id="login-btn" class="btn-primary">${t('signIn')}</button>
            <p style="text-align:center;margin-top:1rem;color:var(--text-secondary);font-size:0.9rem">
                ${t('noAccount')}
                <button class="btn-text" onclick="renderView('signup')" style="color:var(--accent)">${t('createOne')}</button>
            </p>
        </div>
    `;
    document.getElementById('login-btn').onclick = async () => {
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const role = !useFirebase ? document.getElementById('role').value : 'user';
        const errEl = document.getElementById('login-error');
        if (!email || !password) {
            errEl.textContent = t('enterEmailPwd');
            errEl.style.display = 'block';
            return;
        }
        errEl.style.display = 'none';
        const btn = document.getElementById('login-btn');
        btn.textContent = t('signingIn');
        btn.disabled = true;
        try {
            await login(email, password, role);
        } catch (e) {
            errEl.textContent = e.message || t('loginFailed');
            errEl.style.display = 'block';
            btn.textContent = t('signIn');
            btn.disabled = false;
        }
    };
}

function renderSignup() {
    main.innerHTML = `
        <div class="glass-card login-card p-4">
            <h1 class="logo mb-4">${t('appName')}</h1>
            <h2>${t('createAccount')}</h2>
            <p class="text-secondary mb-4">${t('signUpSub')}</p>
            <div class="form-group">
                <label>${t('fullName')}</label>
                <input type="text" id="signup-name" placeholder="${t('namePlaceholder')}" autocomplete="name">
            </div>
            <div class="form-group">
                <label>${t('email')}</label>
                <input type="email" id="signup-email" placeholder="john@example.com" autocomplete="email">
            </div>
            <div class="form-group">
                <label>${t('password')}</label>
                <input type="password" id="signup-password" placeholder="${t('passwordHint')}" autocomplete="new-password">
            </div>
            <div class="form-group">
                <label>${t('confirmPassword')}</label>
                <input type="password" id="signup-confirm" placeholder="${t('confirmHint')}" autocomplete="new-password">
            </div>
            <div id="signup-error" style="color:var(--error);font-size:0.875rem;margin-bottom:0.5rem;display:none"></div>
            <button id="signup-btn" class="btn-primary">${t('createAccount')}</button>
            <p style="text-align:center;margin-top:1rem;color:var(--text-secondary);font-size:0.9rem">
                ${t('haveAccount')}
                <button class="btn-text" onclick="renderView('login')" style="color:var(--accent)">${t('signInLink')}</button>
            </p>
        </div>
    `;

    document.getElementById('signup-btn').onclick = async () => {
        const name     = document.getElementById('signup-name').value.trim();
        const email    = document.getElementById('signup-email').value.trim();
        const password = document.getElementById('signup-password').value;
        const confirm  = document.getElementById('signup-confirm').value;
        const errEl    = document.getElementById('signup-error');

        if (!name || !email || !password || !confirm) {
            errEl.textContent = t('fillAllFields');
            errEl.style.display = 'block'; return;
        }
        if (password.length < 6) {
            errEl.textContent = t('passwordTooShort');
            errEl.style.display = 'block'; return;
        }
        if (password !== confirm) {
            errEl.textContent = t('passwordMismatch');
            errEl.style.display = 'block'; return;
        }

        errEl.style.display = 'none';
        const btn = document.getElementById('signup-btn');
        btn.textContent = t('creatingAccount');
        btn.disabled = true;
        try {
            await signup(name, email, password);
        } catch (e) {
            errEl.textContent = e.message || t('signupFailed');
            errEl.style.display = 'block';
            btn.textContent = t('createAccount');
            btn.disabled = false;
        }
    };
}

async function renderAdminDashboard() {
    const shops = await Store.getShops();
    const allUsers = await Store.getUsers();
    const nonAdmins = allUsers.filter(u => u.role !== 'admin');

    main.innerHTML = `
        <div class="p-4">
            <h2>${t('systemAdmin')}</h2>

            <div class="glass-card mt-4">
                <h3>${t('registerNewShop')}</h3>
                <p class="text-secondary" style="font-size:0.85rem;margin-top:0.25rem">${t('registerShopDesc')}</p>
                <div class="form-group mt-4">
                    <input type="text" id="shop-name" placeholder="${t('shopNamePlaceholder')}">
                </div>
                <div class="form-group">
                    <input type="text" id="shop-location" placeholder="${t('shopLocationPlaceholder')}">
                </div>
                <div class="form-group">
                    <label style="font-size:0.85rem;color:var(--text-secondary)">${t('assignOwner')}</label>
                    <select id="owner-select">
                        <option value="">${t('selectUserOption')}</option>
                        ${nonAdmins.map(u => `<option value="${u.uid}">${u.name || u.email} &lt;${u.email}&gt;</option>`).join('')}
                    </select>
                </div>
                <div id="admin-shop-error" style="color:var(--error);font-size:0.85rem;margin-bottom:0.5rem;display:none"></div>
                <button id="add-shop-btn" class="btn-primary">${t('createShop')}</button>
            </div>

            <div class="glass-card mt-4">
                <h3>${t('promoteTitle')}</h3>
                <p class="text-secondary" style="font-size:0.85rem;margin-top:0.25rem">${t('promoteDesc')}</p>
                <div class="form-group mt-2">
                    <select id="promote-select">
                        <option value="">${t('selectUserPromote')}</option>
                        ${nonAdmins.filter(u => u.role === 'user').map(u => `<option value="${u.uid}">${u.name || u.email} &lt;${u.email}&gt;</option>`).join('')}
                    </select>
                </div>
                <button id="promote-btn" class="btn-primary">${t('makeOwner')}</button>
            </div>

            <div class="glass-card mt-4">
                <h3>${t('allUsersLabel')} (${allUsers.length})</h3>
                <div class="mt-2">
                    ${allUsers.map(u => `
                        <div style="display:flex;justify-content:space-between;align-items:center;padding:0.5rem 0;border-bottom:1px solid var(--glass-border)">
                            <div>
                                <strong>${u.name || '—'}</strong>
                                <div class="text-secondary" style="font-size:0.8rem">${u.email}</div>
                            </div>
                            <span style="font-size:0.8rem;padding:2px 10px;border-radius:1rem;background:var(--card-bg);border:1px solid var(--glass-border)">${u.role}</span>
                        </div>
                    `).join('')}
                </div>
            </div>

            <div class="glass-card mt-4">
                <h3>${t('activeShopsLabel')} (${shops.length})</h3>
                ${shops.map(s => `<div class="mt-2" style="padding:0.5rem 0;border-bottom:1px solid var(--glass-border)">${s.name} &mdash; ${s.location}</div>`).join('') || `<p class="text-secondary">${t('noShopsMsg')}</p>`}
            </div>
        </div>
    `;

    document.getElementById('add-shop-btn').onclick = async () => {
        const name     = document.getElementById('shop-name').value.trim();
        const location = document.getElementById('shop-location').value.trim();
        const ownerUid = document.getElementById('owner-select').value;
        const errEl    = document.getElementById('admin-shop-error');
        if (!name || !location || !ownerUid) {
            errEl.textContent = t('fillShopFields');
            errEl.style.display = 'block'; return;
        }
        errEl.style.display = 'none';
        const owner = allUsers.find(u => u.uid === ownerUid);
        await Store.setUserRole(ownerUid, 'owner');
        await Store.addShop({
            id: Date.now().toString(),
            name,
            location,
            ownerId: ownerUid,
            ownerEmail: owner?.email || '',
            phone: '',
            description: '',
            workingHours: { open: '09:00', close: '20:00' }
        });
        renderAdminDashboard();
    };

    document.getElementById('promote-btn').onclick = async () => {
        const uid = document.getElementById('promote-select').value;
        if (!uid) return;
        await Store.setUserRole(uid, 'owner');
        renderAdminDashboard();
    };
}

async function renderOwnerDashboard() {
    const user = getCurrentUser();
    const shops = await Store.getShops();
    const shop = shops.find(s => s.ownerId === user.uid || s.ownerEmail === user.email) || shops[0];

    if (!shop) {
        main.innerHTML = `<div class="p-4"><div class="glass-card"><h2>No Shop Found</h2><p class="text-secondary mt-2">No shop has been assigned to your account yet. Contact admin.</p></div></div>`;
        return;
    }

    const employees = await Store.getEmployees(shop.id);
    const services = await Store.getServices(shop.id);

    main.innerHTML = `
        <div class="p-4">
            <h2>${shop.name} ${t('dashboard')}</h2>
            <p class="text-secondary">📍 ${shop.location}</p>

            <div class="glass-card mt-4">
                <h3>${t('shopProfile')}</h3>
                <div class="form-group">
                    <label>${t('phone')}</label>
                    <input type="text" value="${shop.phone || ''}" readonly>
                </div>
                <div class="form-group">
                    <label>${t('workingHours')}</label>
                    <input type="text" value="${shop.workingHours?.open || '9:00'} - ${shop.workingHours?.close || '20:00'}" readonly>
                </div>
                <button class="btn-primary" style="padding:0.5rem">${t('editProfile')}</button>
            </div>

            <div class="glass-card mt-4">
                <h3>${t('manageEmployees')}</h3>
                <div class="form-group mt-2">
                    <input type="text" id="emp-name" placeholder="${t('empNamePlaceholder')}">
                </div>
                <button id="add-emp-btn" class="btn-primary">${t('addBarber')}</button>
                <div class="mt-4">
                    ${employees.map(e => `<div class="text-secondary">${e.name} - ${e.available ? t('statusOnline') : t('statusAway')}</div>`).join('')}
                </div>
            </div>

            <div class="glass-card mt-4">
                <h3>${t('servicesAndPrices')}</h3>
                <div class="form-group mt-2">
                    <input type="text" id="svc-name" placeholder="${t('svcNamePlaceholder')}">
                </div>
                <div style="display:flex;gap:8px;align-items:center" class="form-group">
                    <input type="number" id="svc-price" placeholder="${t('pricePlaceholder')}" min="0" step="0.001" style="flex:1">
                    <span style="font-weight:600;color:var(--accent);white-space:nowrap;padding-bottom:0.25rem">JOD</span>
                </div>
                <div class="form-group">
                    <input type="number" id="svc-duration" placeholder="${t('durationPlaceholder')}" min="5" step="5">
                </div>
                <button id="add-svc-btn" class="btn-primary">${t('addService')}</button>
                <div class="mt-4">
                    ${services.length === 0
                        ? `<p class="text-secondary">${t('noServicesAdded')}</p>`
                        : services.map(s => `
                            <div style="display:flex;justify-content:space-between;align-items:center;padding:0.6rem 0;border-bottom:1px solid var(--glass-border)">
                                <div>
                                    <strong>${s.name}</strong>
                                    <span class="text-secondary" style="font-size:0.8rem;margin-left:8px">${s.duration} ${t('min')}</span>
                                </div>
                                <div style="display:flex;align-items:center;gap:12px">
                                    <span style="color:var(--accent);font-weight:600">${Number(s.price).toFixed(3)} JOD</span>
                                    <button class="btn-text" style="color:var(--error);font-size:1.1rem;line-height:1" onclick="deleteSvc('${s.id}')">✕</button>
                                </div>
                            </div>
                        `).join('')}
                </div>
            </div>
        </div>
    `;

    document.getElementById('add-emp-btn').onclick = async () => {
        const name = document.getElementById('emp-name').value.trim();
        if (name) {
            await Store.addEmployee({ id: Date.now().toString(), name, shopId: shop.id, available: true });
            renderOwnerDashboard();
        }
    };

    document.getElementById('add-svc-btn').onclick = async () => {
        const name = document.getElementById('svc-name').value.trim();
        const price = parseFloat(document.getElementById('svc-price').value);
        const duration = parseInt(document.getElementById('svc-duration').value, 10);
        if (name && !isNaN(price) && price >= 0 && !isNaN(duration) && duration > 0) {
            await Store.addService({ id: Date.now().toString(), shopId: shop.id, name, price, duration });
            renderOwnerDashboard();
        }
    };

    window.deleteSvc = async (id) => {
        await Store.deleteService(id);
        renderOwnerDashboard();
    };
}

async function renderEmployeeDashboard() {
    const emps = await Store.getEmployees();
    const emp = emps.find(e => e.name === 'Alex') || emps[0];
    main.innerHTML = `
        <div class="p-4">
            <h2>${t('welcomeBarber')}</h2>
            <div class="glass-card mt-4">
                <h3>${t('myStatus')}</h3>
                <button id="toggle-avail" class="btn-primary mt-2">${emp?.available ? t('goAway') : t('goOnline')}</button>
            </div>
            <h3 class="mt-4">${t('todaySchedule')}</h3>
            <div class="glass-card">${t('noAppointments')}</div>
        </div>
    `;
    document.getElementById('toggle-avail').onclick = async () => {
         await Store.updateEmployeeStatus(emp.id, !emp.available);
         renderEmployeeDashboard();
    };
}

async function renderClientHome() {
    const salons = await Store.getShops();
    main.innerHTML = `
        <div class="p-4">
            <h2 class="mb-4">${t('findSalon')}</h2>
            ${salons.length === 0
                ? `<p class="text-secondary">${t('noShopsAvail')}</p>`
                : salons.map(s => `
                <div class="glass-card" onclick="renderView('salon/${s.id}')">
                    <h3>${s.name}</h3>
                    <p class="text-secondary">📍 ${s.location}</p>
                    <button class="btn-primary mt-4">${t('viewServices')}</button>
                </div>
            `).join('')}
        </div>
    `;
}

async function renderSalonDetail(id) {
    const shop = await Store.getShop(id);
    const employees = (await Store.getEmployees(id)).filter(e => e.available);
    const services = await Store.getServices(id);

    let selectedServiceId = null;

    main.innerHTML = `
        <div class="p-4">
            <button class="btn-text mb-2" onclick="renderView('home')">${t('back')}</button>
            <h2>${shop.name}</h2>
            <p class="text-secondary">${shop.description || ''}</p>

            <h3 class="mt-4">${t('step1Service')}</h3>
            <div id="service-list" class="mt-2">
                ${services.length === 0
                    ? `<p class="text-secondary">${t('noServicesListed')}</p>`
                    : services.map(s => `
                        <div class="glass-card" id="svc-card-${s.id}"
                             style="display:flex;justify-content:space-between;align-items:center;padding:0.75rem 1rem;cursor:pointer;border:2px solid transparent;margin-bottom:0.5rem"
                             onclick="selectService('${s.id}')">
                            <div>
                                <strong>${s.name}</strong>
                                <div class="text-secondary" style="font-size:0.85rem">${s.duration} ${t('min')}</div>
                            </div>
                            <span style="color:var(--accent);font-weight:600">${Number(s.price).toFixed(3)} JOD</span>
                        </div>
                    `).join('')}
            </div>

            <div id="choose-barber-section" class="hidden mt-4">
                <h3>${t('step2Barber')}</h3>
                <div style="display:flex;gap:10px;overflow-x:auto" class="pb-2 mt-2">
                    ${employees.length === 0
                        ? `<p class="text-secondary">${t('noBarbersAvail')}</p>`
                        : employees.map(e => `
                            <div class="glass-card text-center" style="min-width:100px;cursor:pointer" onclick="selectEmployee('${e.id}')">
                                <div style="font-size:2rem">🧔</div>
                                <p>${e.name}</p>
                            </div>
                        `).join('')}
                </div>
            </div>

            <div id="booking-slots" class="mt-4 hidden">
                <h3>${t('step3Time')}</h3>
                <div class="slot-grid mt-2" style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px">
                    ${['09:00','09:30','10:00','10:30','11:00','11:30','13:00','13:30','14:00','14:30','15:00','15:30'].map(slot => `
                        <button class="glass-card slot-btn" style="padding:0.5rem" onclick="book('${shop.id}','${slot}')">${slot}</button>
                    `).join('')}
                </div>
            </div>
        </div>
    `;

    window.selectService = (svcId) => {
        services.forEach(s => {
            const c = document.getElementById(`svc-card-${s.id}`);
            if (c) c.style.borderColor = 'transparent';
        });
        const sel = document.getElementById(`svc-card-${svcId}`);
        if (sel) sel.style.borderColor = 'var(--accent)';
        selectedServiceId = svcId;
        document.getElementById('choose-barber-section').classList.remove('hidden');
    };

    window.selectEmployee = () => {
        document.getElementById('booking-slots').classList.remove('hidden');
    };

    window.book = async (sid, time) => {
        if (!selectedServiceId && services.length > 0) {
            alert(t('chooseServiceFirst'));
            return;
        }
        const user = getCurrentUser();
        const shopData = await Store.getShop(sid);
        const service = services.find(s => s.id === selectedServiceId);

        await Store.addAppointment({
            id: Date.now().toString(),
            shopId: sid,
            serviceId: selectedServiceId || null,
            serviceName: service?.name || 'Appointment',
            time,
            userId: user.uid
        });

        await Store.addNotification({
            id: Date.now().toString(),
            recipientId: shopData.ownerId,
            title: t('newBookingTitle'),
            body: `${service?.name || 'Appointment'} ${t('at')} ${time}`,
            read: false
        });

        // Trigger browser notification (shows as a pop-up if the owner/barber has
        // the app open on their device and has granted notification permission)
        sendNotification(t('newBookingTitle'), `${service?.name || 'Appointment'} ${t('at')} ${time}`);

        alert(`${t('bookingConfirmed')}\n${service ? service.name + ' — ' : ''}${time}`);
        renderView('bookings');
        updateNotiBell();
    };
}

function renderBookings() {
    main.innerHTML = `<div class="p-4"><h2>${t('myBookings')}</h2><div class="glass-card">${t('upcomingAppt')}</div></div>`;
}

function renderProfile() {
    main.innerHTML = `<div class="p-4"><h2>${t('myProfile')}</h2><button class="btn-primary mt-4" onclick="location.reload()">${t('reloadApp')}</button></div>`;
}
