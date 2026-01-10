const Auth = {
    // Helper funkcija za upravljanje piškotkov
    setCookie(name, value, days = 7) {
        const expires = new Date();
        expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
        document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;SameSite=Lax`;
    },

    getCookie(name) {
        const nameEQ = name + "=";
        const ca = document.cookie.split(';');
        for (let i = 0; i < ca.length; i++) {
            let c = ca[i];
            while (c.charAt(0) === ' ') c = c.substring(1, c.length);
            if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
        }
        return null;
    },

    deleteCookie(name) {
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`;
    },

    // Pridobi token iz cookies
    getToken() {
        // Najprej poskusi firefox način potem pa chrome način
        const cookieToken = this.getCookie('authToken');
        const localToken = localStorage.getItem('authToken');
        const token = cookieToken || localToken;
        console.log('Retrieved token:', token, '(cookie:', cookieToken, 'local:', localToken, ')');
        return token;
    },

    // Shrani token v cookies in localStorage
    setToken(token) {
        this.setCookie('authToken', token, 7);
        localStorage.setItem('authToken', token);
    },

    // Odstrani token iz cookies in localStorage
    removeToken() {
        this.deleteCookie('authToken');
        this.deleteCookie('user');
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
    },

    // Dobi user informacije iz cookies ali localStorage
    getUser() {
        const cookieUser = this.getCookie('user');
        const localUser = localStorage.getItem('user');
        
        if (cookieUser) {
            return JSON.parse(decodeURIComponent(cookieUser));
        } else if (localUser) {
            return JSON.parse(localUser);
        }
        return null;
    },

    // Shrani uporabniške informacije in cookies in localStorage
    setUser(user) {
        this.setCookie('user', encodeURIComponent(JSON.stringify(user)), 7);
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
                console.log('Login response:', data);

                if (response.ok && data.success) {
                    console.log('Token from server:', data.token);
                    
                    // Shrani token in uporabnika
                    Auth.setToken(data.token);
                    Auth.setUser(data.user);

                    // Verify cookie write completed
                    const savedToken = Auth.getToken();
                    console.log('Token saved:', savedToken);
                    
                    if (!savedToken) {
                        showAlert('Napaka pri shranjevanju. Poskusite znova.', 'danger');
                        return;
                    }

                    showAlert('Prijava uspešna! Preusmerjanje...', 'success');
                    
                    // Redirect immediately since cookies are synchronous
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
