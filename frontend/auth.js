const Auth = {
    // Pridobi token iz localStorage
    getToken() {
        return localStorage.getItem('authToken');
    },

    // Shrani token v localStorage
    setToken(token) {
        localStorage.setItem('authToken', token);
    },

    // Odstrani token iz localStorage
    removeToken() {
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
    },

    // Dobi user informacije iz localStorage
    getUser() {
        const userStr = localStorage.getItem('user');
        return userStr ? JSON.parse(userStr) : null;
    },

    // Shrani uporabniške informacije
    setUser(user) {
        localStorage.setItem('user', JSON.stringify(user));
    },

    // Preveri če je prijavljen
    isAuthenticated() {
        return this.getToken() !== null;
    },

    // Preveri veljavnost tokena
    async verifyToken() {
        const token = this.getToken();
        if (!token) return false;

        try {
            const response = await fetch(`${API_BASE}/auth/verify`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                if (data.authenticated && data.user) {
                    this.setUser(data.user);
                    return true;
                }
            }

            // Če ni veljaven se odstrani
            this.removeToken();
            return false;
        } catch (error) {
            console.error('Error verifying token:', error);
            this.removeToken();
            return false;
        }
    },

    // Login preusmeritev
    redirectToLogin() {
        window.location.href = 'login.html';
    },

    // Home page preusmeritev
    redirectToHome() {
        window.location.href = 'index.html';
    }
};

// Prikaži sporočilo (alert)
function showAlert(message, type = 'info') {
    const alertContainer = document.getElementById('alertContainer');
    if (!alertContainer) return;

    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
    alertDiv.role = 'alert';
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;

    alertContainer.innerHTML = '';
    alertContainer.appendChild(alertDiv);

    // Da samo izgine po 5 sekundah
    setTimeout(() => {
        alertDiv.classList.remove('show');
        setTimeout(() => alertDiv.remove(), 150);
    }, 5000);
}

document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('login.html')) {
        const loginForm = document.getElementById('loginForm');

        // Prikaz/skrij geslo
        const togglePassword = (toggleId, inputId) => {
            const toggle = document.getElementById(toggleId);
            const input = document.getElementById(inputId);
            
            if (toggle && input) {
                toggle.addEventListener('click', () => {
                    const type = input.type === 'password' ? 'text' : 'password';
                    input.type = type;
                    toggle.classList.toggle('bi-eye');
                    toggle.classList.toggle('bi-eye-slash');
                });
            }
        };

        togglePassword('toggleLoginPassword', 'loginPassword');

        // Obdelava prijave
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const username = document.getElementById('loginUsername').value.trim();
            const password = document.getElementById('loginPassword').value;

            if (!username || !password) {
                showAlert('Prosim vnesite uporabniško ime in geslo!', 'warning');
                return;
            }

            try {
                const response = await fetch(`${API_BASE}/auth/login`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ username, password })
                });

                const data = await response.json();

                if (response.ok && data.success) {
                    // Shrani token in uporabnika
                    Auth.setToken(data.token);
                    Auth.setUser(data.user);

                    showAlert('Prijava uspešna! Preusmerjanje...', 'success');
                    
                    // Preusmeri na glavno stran
                    setTimeout(() => {
                        Auth.redirectToHome();
                    }, 1000);
                } else {
                    showAlert(data.message || 'Napaka pri prijavi!', 'danger');
                }
            } catch (error) {
                console.error('Login error:', error);
                showAlert('Napaka pri povezavi s strežnikom!', 'danger');
            }
        });
    }
});

// Odjava uporabnika
async function logout() {
    try {
        const token = Auth.getToken();
        
        if (token) {
            await fetch(`${API_BASE}/auth/logout`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
        }
    } catch (error) {
        console.error('Logout error:', error);
    } finally {
        // Odstrani token in preusmeri
        Auth.removeToken();
        Auth.redirectToLogin();
    }
}

// S klicem tega na html strani preveriš če je uporabnik log-inan
async function requireAuth() {
    if (!Auth.isAuthenticated()) {
        Auth.redirectToLogin();
        return false;
    }

    const valid = await Auth.verifyToken();
    if (!valid) {
        Auth.redirectToLogin();
        return false;
    }

    return true;
}

// Prikaži uporabniške informacije
function displayUserInfo() {
    const user = Auth.getUser();
    if (!user) return;

    const userDisplay = document.getElementById('userDisplay');
    if (userDisplay) {
        userDisplay.innerHTML = `
            <div class="dropdown">
                <button class="btn btn-outline-light dropdown-toggle" type="button" id="userDropdown" data-bs-toggle="dropdown">
                    <i class="bi bi-person-circle"></i> ${user.name} ${user.surname}
                </button>
                <ul class="dropdown-menu dropdown-menu-end">
                    <li><a class="dropdown-item" href="#">
                        <i class="bi bi-person"></i> Profil
                    </a></li>
                    <li><hr class="dropdown-divider"></li>
                    <li><a class="dropdown-item" href="#" onclick="logout()">
                        <i class="bi bi-box-arrow-right"></i> Odjava
                    </a></li>
                </ul>
            </div>
        `;
    }
}
