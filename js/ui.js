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
                    <input type="email" id="owner-email-input" placeholder="${t('ownerEmailPlaceholder')}" autocomplete="off">
                </div>
                <div class="form-group">
                    <label style="font-size:0.85rem;color:var(--text-secondary)">${t('openedOn')}</label>
                    <input type="date" id="shop-joined-date">
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
                ${shops.map(s => `
                    <div class="mt-2" style="padding:0.5rem 0;border-bottom:1px solid var(--glass-border)">
                        <strong>${s.name}</strong> &mdash; ${s.location}
                        ${s.joinedDate ? `<div class="text-secondary" style="font-size:0.78rem;margin-top:2px">${t('openedOn')}: ${s.joinedDate}</div>` : ''}
                    </div>`).join('') || `<p class="text-secondary">${t('noShopsMsg')}</p>`}
            </div>
        </div>
    `;

    document.getElementById('add-shop-btn').onclick = async () => {
        const name       = document.getElementById('shop-name').value.trim();
        const location   = document.getElementById('shop-location').value.trim();
        const ownerEmail = document.getElementById('owner-email-input').value.trim().toLowerCase();
        const joinedDate = document.getElementById('shop-joined-date').value;
        const errEl      = document.getElementById('admin-shop-error');
        if (!name || !location || !ownerEmail) {
            errEl.textContent = t('fillShopFields');
            errEl.style.display = 'block'; return;
        }
        const owner = allUsers.find(u => (u.email || '').toLowerCase() === ownerEmail);
        if (!owner) {
            errEl.textContent = t('ownerNotFound');
            errEl.style.display = 'block'; return;
        }
        errEl.style.display = 'none';
        await Store.setUserRole(owner.uid, 'owner');
        await Store.addShop({
            id: Date.now().toString(),
            name,
            location,
            ownerId: owner.uid,
            ownerEmail: owner.email || '',
            phone: '',
            description: '',
            joinedDate: joinedDate || new Date().toISOString().slice(0,10),
            schedule: { mon: { open: '09:00', close: '20:00', off: false }, tue: { open: '09:00', close: '20:00', off: false }, wed: { open: '09:00', close: '20:00', off: false }, thu: { open: '09:00', close: '20:00', off: false }, fri: { open: '09:00', close: '20:00', off: false }, sat: { open: '10:00', close: '18:00', off: false }, sun: { open: '10:00', close: '18:00', off: true } },
            photos: []
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
        main.innerHTML = `<div class="p-4"><div class="glass-card"><h2>${t('noShopFound')}</h2><p class="text-secondary mt-2">${t('noShopMsg')}</p></div></div>`;
        return;
    }

    const employees = await Store.getEmployees(shop.id);
    const services = await Store.getServices(shop.id);
    const days = ['mon','tue','wed','thu','fri','sat','sun'];
    const sched = shop.schedule || {};
    const photos = shop.photos || [];

    main.innerHTML = `
        <div class="p-4">
            <h2>${shop.name} ${t('dashboard')}</h2>
            <p class="text-secondary">📍 ${shop.location}</p>
            ${shop.joinedDate ? `<p class="text-secondary" style="font-size:0.8rem">📅 ${t('memberSince')} ${shop.joinedDate}</p>` : ''}

            <!-- Shop Profile -->
            <div class="glass-card mt-4">
                <h3>${t('shopProfile')}</h3>
                <div class="form-group mt-2">
                    <label>${t('shopName')}</label>
                    <input type="text" id="prof-shopname" value="${shop.name || ''}" placeholder="${t('shopNamePlaceholder')}">
                </div>
                <div class="form-group">
                    <label>${t('shopLocation')}</label>
                    <input type="text" id="prof-location" value="${shop.location || ''}" placeholder="${t('shopLocationPlaceholder')}">
                </div>
                <div class="form-group">
                    <label>${t('phone')}</label>
                    <input type="text" id="prof-phone" value="${shop.phone || ''}">
                </div>
                <div class="form-group">
                    <label>${t('descriptionPlaceholder').replace('…','')}</label>
                    <input type="text" id="prof-desc" value="${shop.description || ''}" placeholder="${t('descriptionPlaceholder')}">
                </div>
                <div id="prof-msg" style="color:var(--accent);font-size:0.85rem;margin-bottom:0.5rem;display:none">${t('profileSaved')}</div>
                <button id="save-prof-btn" class="btn-primary">${t('saveProfile')}</button>
            </div>

            <!-- Weekly Schedule -->
            <div class="glass-card mt-4">
                <h3>${t('schedule')}</h3>
                <div class="schedule-grid mt-2">
                    <div class="schedule-header">
                        <span>${t('mon').substring(0,3)}</span>
                        <span>${t('openTime')}</span>
                        <span>${t('closeTime')}</span>
                        <span>${t('dayOff')}</span>
                    </div>
                    ${days.map(d => {
                        const day = sched[d] || { open: '09:00', close: '20:00', off: false };
                        return `
                        <div class="day-row${day.off ? ' day-off-row' : ''}">
                            <span class="day-label">${t(d)}</span>
                            <input type="time" class="sched-open" data-day="${d}" value="${day.open}" ${day.off ? 'disabled' : ''}>
                            <input type="time" class="sched-close" data-day="${d}" value="${day.close}" ${day.off ? 'disabled' : ''}>
                            <label class="toggle-label">
                                <input type="checkbox" class="sched-off" data-day="${d}" ${day.off ? 'checked' : ''}>
                                <span class="toggle-track"></span>
                            </label>
                        </div>`;
                    }).join('')}
                </div>
                <div id="sched-msg" style="color:var(--accent);font-size:0.85rem;margin-top:0.5rem;display:none">${t('scheduleSaved')}</div>
                <button id="save-sched-btn" class="btn-primary mt-2">${t('saveSchedule')}</button>
            </div>

            <!-- Shop Photos -->
            <div class="glass-card mt-4">
                <h3>${t('shopPhotos')}</h3>
                <div class="photo-gallery mt-2" id="photo-gallery">
                    ${photos.length === 0
                        ? `<p class="text-secondary" id="no-photos-msg">${t('noPhotos')}</p>`
                        : photos.map((src, i) => `
                            <div class="photo-thumb">
                                <img src="${src}" alt="shop photo">
                                <button class="photo-del-btn" onclick="deleteShopPhoto('${shop.id}', ${i})">✕</button>
                            </div>`).join('')}
                </div>
                <label class="btn-primary mt-2" style="display:inline-block;cursor:pointer">
                    ${t('uploadPhoto')}
                    <input type="file" id="photo-input" accept="image/*" multiple style="display:none">
                </label>
            </div>

            <!-- Manage Employees -->
            <div class="glass-card mt-4">
                <h3>${t('manageEmployees')}</h3>
                <div class="form-group mt-2">
                    <input type="email" id="emp-email" placeholder="${t('empNamePlaceholder')}" autocomplete="off">
                </div>
                <div id="emp-error" style="color:var(--error);font-size:0.85rem;margin-bottom:0.5rem;display:none"></div>
                <div id="emp-success" style="color:var(--accent);font-size:0.85rem;margin-bottom:0.5rem;display:none">${t('barberAdded')}</div>
                <button id="add-emp-btn" class="btn-primary">${t('addBarber')}</button>
                <div class="mt-4">
                    ${employees.map(e => `<div class="text-secondary">${e.name} <span style="font-size:0.78rem;opacity:0.6">${e.email || ''}</span> - ${e.available ? t('statusOnline') : t('statusAway')}</div>`).join('')}
                </div>
            </div>

            <!-- Services & Prices -->
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

    // Save profile
    document.getElementById('save-prof-btn').onclick = async () => {
        const name        = document.getElementById('prof-shopname').value.trim();
        const location    = document.getElementById('prof-location').value.trim();
        const phone       = document.getElementById('prof-phone').value.trim();
        const description = document.getElementById('prof-desc').value.trim();
        await Store.updateShop(shop.id, { ...(name && { name }), ...(location && { location }), phone, description });
        // Update page heading live
        if (name) document.querySelector('.p-4 h2').textContent = `${name} ${t('dashboard')}`;
        if (location) document.querySelector('.p-4 > p.text-secondary').textContent = `📍 ${location}`;
        const msg = document.getElementById('prof-msg');
        msg.style.display = 'block';
        setTimeout(() => { msg.style.display = 'none'; }, 2000);
    };

    // Day-off toggle wires: enable/disable time inputs live
    document.querySelectorAll('.sched-off').forEach(cb => {
        cb.addEventListener('change', () => {
            const day = cb.dataset.day;
            const row = cb.closest('.day-row');
            row.classList.toggle('day-off-row', cb.checked);
            row.querySelector('.sched-open').disabled = cb.checked;
            row.querySelector('.sched-close').disabled = cb.checked;
        });
    });

    // Save schedule
    document.getElementById('save-sched-btn').onclick = async () => {
        const newSchedule = {};
        days.forEach(d => {
            const off = document.querySelector(`.sched-off[data-day="${d}"]`).checked;
            const open = document.querySelector(`.sched-open[data-day="${d}"]`).value || '09:00';
            const close = document.querySelector(`.sched-close[data-day="${d}"]`).value || '20:00';
            newSchedule[d] = { open, close, off };
        });
        await Store.updateShop(shop.id, { schedule: newSchedule });
        const msg = document.getElementById('sched-msg');
        msg.style.display = 'block';
        setTimeout(() => { msg.style.display = 'none'; }, 2000);
    };

    // Photo upload
    document.getElementById('photo-input').addEventListener('change', async (e) => {
        for (const file of e.target.files) {
            const base64 = await new Promise(res => {
                const reader = new FileReader();
                reader.onload = ev => res(ev.target.result);
                reader.readAsDataURL(file);
            });
            await Store.addShopPhoto(shop.id, base64);
        }
        renderOwnerDashboard();
    });

    window.deleteShopPhoto = async (shopId, index) => {
        await Store.deleteShopPhoto(shopId, index);
        renderOwnerDashboard();
    };

    // Add employee — search by email, promote role to 'employee'
    document.getElementById('add-emp-btn').onclick = async () => {
        const email = document.getElementById('emp-email').value.trim().toLowerCase();
        const errEl = document.getElementById('emp-error');
        const okEl  = document.getElementById('emp-success');
        errEl.style.display = 'none';
        okEl.style.display  = 'none';
        if (!email) return;

        const allUsers = await Store.getUsers();
        const match = allUsers.find(u => (u.email || '').toLowerCase() === email);

        if (!match) {
            errEl.textContent = t('barberNotFound');
            errEl.style.display = 'block';
            return;
        }

        const existing = await Store.getEmployees(shop.id);
        if (existing.find(e => e.uid === match.uid)) {
            errEl.textContent = t('barberAlreadyAdded');
            errEl.style.display = 'block';
            return;
        }

        await Store.setUserRole(match.uid, 'employee');
        await Store.addEmployee({ id: Date.now().toString(), uid: match.uid, name: match.name || match.email, email: match.email, shopId: shop.id, available: true });
        document.getElementById('emp-email').value = '';
        okEl.style.display = 'block';
        setTimeout(() => renderOwnerDashboard(), 1200);
    };

    // Add service
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

    const days = ['mon','tue','wed','thu','fri','sat','sun'];
    const sched = shop.schedule || {};
    const photos = shop.photos || [];

    main.innerHTML = `
        <div class="p-4">
            <button class="btn-text mb-2" onclick="renderView('home')">${t('back')}</button>
            <h2>${shop.name}</h2>
            <p class="text-secondary">${shop.description || ''}</p>

            ${photos.length > 0 ? `
            <div class="photo-gallery mt-4">
                ${photos.map(src => `<div class="photo-thumb"><img src="${src}" alt="shop photo"></div>`).join('')}
            </div>` : ''}

            <div class="glass-card mt-4">
                <h3>${t('schedule')}</h3>
                <div class="mt-2">
                    ${days.map(d => {
                        const day = sched[d] || { open: '09:00', close: '20:00', off: false };
                        return `<div style="display:flex;justify-content:space-between;padding:0.3rem 0;border-bottom:1px solid var(--glass-border);${day.off ? 'opacity:0.45' : ''}">
                            <span>${t(d)}</span>
                            <span style="color:${day.off ? 'var(--text-secondary)' : 'var(--accent)'};font-weight:600">
                                ${day.off ? t('dayOff') : `${day.open} – ${day.close}`}
                            </span>
                        </div>`;
                    }).join('')}
                </div>
            </div>

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
