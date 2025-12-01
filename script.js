const API_URL = "https://info-cuy-backend.vercel.app";
let map, markersLayer;
let redIcon, blueIcon;

// --- DEFINISI CUSTOM ICON ---
if (typeof L !== 'undefined') {
    redIcon = new L.Icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
    });

    blueIcon = new L.Icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
    });
}

// ==========================================
// 1. LOGIC PETA (Index.html)
// ==========================================

function initMap() {
    if (!document.getElementById('map')) return; 

    map = L.map('map').setView([-6.914744, 107.609810], 13);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    markersLayer = L.layerGroup().addTo(map);
    loadMapLocations();

    if (localStorage.getItem('user_email')) {
        map.on('click', function(e) {
            const lat = e.latlng.lat;
            const lng = e.latlng.lng;
            // Popup HTML Leaflet (Tetap dipertahankan karena berfungsi baik)
            const popupContent = `
                <div style="text-align:center; min-width: 150px;">
                    <b style="color:var(--primary)">Tambah Lokasi Baru?</b><br>
                    <small>Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}</small><br>
                    <button onclick="redirectToAdd('${lat}', '${lng}')" 
                        class="btn-primary" style="padding:5px 10px; margin-top:8px; font-size:0.8rem;">
                        Ya, Tambah Disini
                    </button>
                </div>`;
            L.popup().setLatLng(e.latlng).setContent(popupContent).openOn(map);
        });
    }
}

function redirectToAdd(lat, lng) {
    window.location.href = `form.html?lat=${lat}&lng=${lng}`;
}

async function loadMapLocations() {
    try {
        const res = await fetch(`${API_URL}/locations`);
        const data = await res.json();
        renderMarkers(data);
    } catch (err) { console.error("Gagal ambil data:", err); }
}

function renderMarkers(locations) {
    if (!markersLayer) return;
    markersLayer.clearLayers();
    
    // Cek elemen filter agar tidak error di halaman selain index
    const categoryList = document.getElementById('categoryList');
    if (!categoryList) return; 

    const checkedBoxes = categoryList.querySelectorAll('input:checked');
    const selectedCats = Array.from(checkedBoxes).map(cb => cb.value);
    const currentUserEmail = localStorage.getItem('user_email');

    locations.forEach(loc => {
        // Safety check untuk kategori
        const category = loc.category || "";
        
        if (selectedCats.includes(category)) {
            const circleColor = getCategoryColor(category);
            let myIcon = (loc.created_by === currentUserEmail) ? blueIcon : redIcon;
            
            L.circle([loc.coordinates.lat, loc.coordinates.lng], {
                color: circleColor, fillColor: circleColor, fillOpacity: 0.2, radius: 150
            }).addTo(markersLayer);

            L.marker([loc.coordinates.lat, loc.coordinates.lng], { icon: myIcon })
            .bindPopup(`
                <b>${loc.name}</b><br>${loc.address || '-'}<br>
                <i style="color:${circleColor}; font-weight:bold;">${formatCategory(category)}</i>
            `).addTo(markersLayer);
        }
    });
}

function getCategoryColor(cat) {
    if(cat === 'pendidikan') return 'blue';
    if(cat === 'pusat_perbelanjaan') return 'red';
    if(cat === 'museum_sejarah') return 'orange';
    return 'green'; 
}

function formatCategory(cat) { 
    if(!cat) return "";
    return cat.replace('_', ' ').toUpperCase(); 
}

function applyFilter() { loadMapLocations(); }

// ==========================================
// 2. UI & SIDEBAR
// ==========================================

function toggleSidebar(side) {
    const el = document.getElementById(side === 'left' ? 'sidebarLeft' : 'sidebarRight');
    if (el) el.classList.toggle('active');
}

// ==========================================
// 3. AUTHENTICATION (LOGIN & REGISTER - SweetAlert)
// ==========================================

function showRegister() {
    document.getElementById('loginContainer').classList.add('hidden');
    document.getElementById('registerContainer').classList.remove('hidden');
    document.getElementById('authTitle').innerText = "Daftar Akun";
}

function showLogin() {
    document.getElementById('registerContainer').classList.add('hidden');
    document.getElementById('loginContainer').classList.remove('hidden');
    document.getElementById('authTitle').innerText = "Login";
}

async function handleRegister(e) {
    e.preventDefault();
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;

    try {
        const res = await fetch(`${API_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();

        if (res.ok) {
            Swal.fire({ icon: 'success', title: 'Berhasil', text: 'Registrasi sukses! Silakan login.' });
            showLogin();
            document.getElementById('loginEmail').value = email;
        } else {
            Swal.fire({ icon: 'error', title: 'Gagal', text: data.error });
        }
    } catch (err) { Swal.fire({ icon: 'error', title: 'Error', text: 'Gagal koneksi ke server' }); }
}

async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    try {
        const res = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        
        if (res.ok) {
            localStorage.setItem('user_email', data.user.email);
            localStorage.setItem('user_role', data.user.role);
            localStorage.setItem('user_name', data.user.email.split('@')[0]);
            
            Swal.fire({ icon: 'success', title: 'Login Berhasil!', timer: 1000, showConfirmButton: false })
                .then(() => window.location.reload());
        } else {
            Swal.fire({ icon: 'error', title: 'Gagal', text: data.error });
        }
    } catch (err) { Swal.fire({ icon: 'error', title: 'Error', text: 'Gagal koneksi ke server' }); }
}

function handleLogout() {
    Swal.fire({
        title: 'Yakin ingin keluar?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Ya, Keluar',
        cancelButtonText: 'Batal'
    }).then((result) => {
        if (result.isConfirmed) {
            localStorage.clear();
            window.location.href = 'index.html';
        }
    });
}

function updateAuthUI() {
    const email = localStorage.getItem('user_email');
    const role = localStorage.getItem('user_role');
    const name = localStorage.getItem('user_name');
    
    // Cek elemen agar tidak error di halaman lain
    const loginCont = document.getElementById('loginContainer');
    const loginBtnSide = document.getElementById('btnLoginSide');

    if (!loginCont) return; 

    if (email) {
        loginCont.classList.add('hidden');
        document.getElementById('registerContainer').classList.add('hidden');
        document.getElementById('userMenu').classList.remove('hidden');
        
        document.getElementById('authTitle').innerText = "Profil";
        document.getElementById('userNameDisplay').innerText = name;
        document.getElementById('userRoleBadge').innerText = role ? role.toUpperCase() : "USER";
        
        if(loginBtnSide) loginBtnSide.innerHTML = `<span class="material-symbols-outlined">person</span> ${name}`;

        if(role === 'admin' && document.getElementById('adminMenu')){
            document.getElementById('adminMenu').classList.remove('hidden');
        }
    } else {
        loginCont.classList.remove('hidden');
        document.getElementById('userMenu').classList.add('hidden');
        document.getElementById('authTitle').innerText = "Login";
        if(loginBtnSide) loginBtnSide.innerHTML = `<span class="material-symbols-outlined">login</span> Login`;
    }
}

function checkAuth() {
    if (!localStorage.getItem('user_email')) {
        Swal.fire({
            icon: 'warning',
            title: 'Akses Dibatasi',
            text: 'Silakan login terlebih dahulu.',
            allowOutsideClick: false
        }).then(() => {
            window.location.href = 'index.html';
        });
        throw new Error("Unauthorized"); // Hentikan eksekusi script selanjutnya
    }
}

// ==========================================
// 4. FORM LOGIC (ADD/EDIT)
// ==========================================

function initFormPage() {
    try {
        checkAuth();
        const urlParams = new URLSearchParams(window.location.search);
        const id = urlParams.get('id');
        const lat = urlParams.get('lat');
        const lng = urlParams.get('lng');

        if (lat && lng) {
            document.getElementById('formTitle').innerText = "Tambah Lokasi Baru";
            document.getElementById('lat').value = lat;
            document.getElementById('lng').value = lng;
        } else if (id) {
            document.getElementById('formTitle').innerText = "Edit Lokasi";
            loadLocationDetail(id);
        } else {
            window.location.href = 'index.html';
        }
    } catch(e) {}
}

async function handleFormSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('locId').value;
    const email = localStorage.getItem('user_email');
    
    const payload = {
        name: document.getElementById('name').value,
        category: document.getElementById('category').value,
        address: document.getElementById('address').value,
        coordinates: {
            lat: parseFloat(document.getElementById('lat').value),
            lng: parseFloat(document.getElementById('lng').value)
        }
    };

    let url = `${API_URL}/locations`;
    let method = 'POST';
    if (id) { url += `/${id}`; method = 'PUT'; }

    try {
        const res = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json', 'X-User-Email': email },
            body: JSON.stringify(payload)
        });

        if(res.ok) {
            Swal.fire({ icon: 'success', title: 'Berhasil', text: 'Data tersimpan.' })
                .then(() => window.location.href = 'dashboard.html');
        } else {
            const err = await res.json();
            Swal.fire({ icon: 'error', title: 'Gagal', text: err.error });
        }
    } catch(err) { Swal.fire({ icon: 'error', title: 'Error', text: 'Gagal koneksi server' }); }
}

async function loadLocationDetail(id) {
    const res = await fetch(`${API_URL}/locations`);
    const data = await res.json();
    const loc = data.find(l => l.id === id || l._id === id); 
    if(loc) {
        document.getElementById('locId').value = id; 
        document.getElementById('name').value = loc.name;
        document.getElementById('category').value = loc.category;
        document.getElementById('address').value = loc.address;
        document.getElementById('lat').value = loc.coordinates.lat;
        document.getElementById('lng').value = loc.coordinates.lng;
    }
}

// ==========================================
// 5. DASHBOARD & ADMIN LOGIC
// ==========================================

async function loadTableData() {
    const userEmail = localStorage.getItem('user_email');
    const userRole = localStorage.getItem('user_role');
    const tbody = document.getElementById('tableBody');
    if(document.getElementById('roleBadge')) document.getElementById('roleBadge').innerText = (userRole || 'USER').toUpperCase();

    try {
        const res = await fetch(`${API_URL}/locations`);
        const data = await res.json();
        
        tbody.innerHTML = '';
        data.forEach(loc => {
            if (userRole === 'admin' || loc.created_by === userEmail) {
                const realId = loc.id || loc._id; 
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${loc.name}</td>
                    <td>${formatCategory(loc.category)}</td>
                    <td>${loc.address ? loc.address.substring(0, 30)+'...' : '-'}</td>
                    <td>
                        <a href="form.html?id=${realId}" class="action-btn btn-edit"><span class="material-symbols-outlined">edit</span> Edit</a>
                        <a href="#" onclick="deleteData('${realId}')" class="action-btn btn-delete"><span class="material-symbols-outlined">delete</span> Hapus</a>
                    </td>
                `;
                tbody.appendChild(tr);
            }
        });
    } catch (err) { console.error(err); }
}

async function deleteData(id) {
    const result = await Swal.fire({
        title: 'Hapus data?',
        text: "Data tidak bisa dikembalikan!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Ya, Hapus',
        cancelButtonText: 'Batal'
    });

    if (result.isConfirmed) {
        const email = localStorage.getItem('user_email');
        await fetch(`${API_URL}/locations/${id}`, {
            method: 'DELETE',
            headers: { 'X-User-Email': email }
        });
        Swal.fire('Terhapus!', 'Data berhasil dihapus.', 'success');
        loadTableData(); 
    }
}

async function loadAllUsers() {
    const email = localStorage.getItem('user_email');
    const tbody = document.getElementById('userTableBody');
    if (!tbody) return;

    try {
        const res = await fetch(`${API_URL}/users`, {
            method: 'GET',
            headers: { 'X-User-Email': email } 
        });
        const users = await res.json();
        tbody.innerHTML = '';

        users.forEach(u => {
            const realId = u.id || u._id; 
            let deleteBtn = '';
            if (u.email !== email) {
                deleteBtn = `<button onclick="deleteUser('${realId}', '${u.email}')" class="action-btn btn-delete"><span class="material-symbols-outlined">delete</span></button>`;
            }

            const isUser = u.role === 'user' ? 'selected' : '';
            const isAdmin = u.role === 'admin' ? 'selected' : '';

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${u.email}</td>
                <td><span style="font-weight:bold;">${u.role.toUpperCase()}</span></td>
                <td>
                    <select onchange="updateUserRole('${realId}', this.value)" style="padding:5px; border-radius:5px;">
                        <option value="user" ${isUser}>User Biasa</option>
                        <option value="admin" ${isAdmin}>Admin</option>
                    </select>
                </td>
                <td class="text-center">${deleteBtn}</td>
            `;
            tbody.appendChild(tr);
        });
    } catch (err) { console.error(err); }
}

async function updateUserRole(id, newRole) {
    const result = await Swal.fire({
        title: `Ubah role jadi ${newRole.toUpperCase()}?`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Ya, Ubah',
        cancelButtonText: 'Batal'
    });

    if (result.isConfirmed) {
        const email = localStorage.getItem('user_email');
        await fetch(`${API_URL}/users/${id}/role`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'X-User-Email': email },
            body: JSON.stringify({ role: newRole })
        });
        Swal.fire('Sukses', 'Role berhasil diubah', 'success');
        loadAllUsers();
    } else {
        loadAllUsers();
    }
}

// --- PERBAIKAN UTAMA: HAPUS USER TANPA KETIK ---
async function deleteUser(id, userEmail) {
    const result = await Swal.fire({
        title: 'Hapus User?',
        text: `Yakin ingin menghapus ${userEmail}?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Ya, Hapus',
        cancelButtonText: 'Batal'
    });

    if (result.isConfirmed) {
        const email = localStorage.getItem('user_email');
        const res = await fetch(`${API_URL}/users/${id}`, {
            method: 'DELETE',
            headers: { 'X-User-Email': email }
        });
        
        if (res.ok) {
            Swal.fire('Terhapus', 'User berhasil dihapus', 'success');
            loadAllUsers();
        } else {
            Swal.fire('Gagal', 'Gagal menghapus user', 'error');
        }
    }
}

// AUTO INIT
document.addEventListener('DOMContentLoaded', () => {
    updateAuthUI();

    if (document.getElementById('map')) {
        initMap();
    }

    if (window.location.pathname.includes('form.html')) {
        initFormPage();
    }

    if (window.location.pathname.includes('dashboard.html')) {
        try {
            checkAuth();
            loadTableData();
        } catch(e) {}
    }

    if (window.location.pathname.includes('admin_users.html')) {
        try {
            checkAuth();
            loadAllUsers();
        } catch(e) {}
    }
});