// Override native alert to custom centered alert
window.alert = function(message) {
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.backgroundColor = 'rgba(0,0,0,0.5)';
    overlay.style.display = 'flex';
    overlay.style.justifyContent = 'center';
    overlay.style.alignItems = 'center';
    overlay.style.zIndex = '999999';

    const modal = document.createElement('div');
    modal.style.backgroundColor = '#fff';
    modal.style.padding = '25px';
    modal.style.borderRadius = '8px';
    modal.style.boxShadow = '0 4px 15px rgba(0,0,0,0.2)';
    modal.style.minWidth = '300px';
    modal.style.maxWidth = '80%';
    modal.style.textAlign = 'center';
    modal.style.fontFamily = 'Arial, sans-serif';

    const text = document.createElement('p');
    text.textContent = message;
    text.style.marginBottom = '20px';
    text.style.color = '#333';
    text.style.fontSize = '16px';
    text.style.lineHeight = '1.5';

    const btn = document.createElement('button');
    btn.textContent = 'OK';
    btn.style.padding = '8px 25px';
    btn.style.border = 'none';
    btn.style.backgroundColor = '#0d6efd';
    btn.style.color = '#fff';
    btn.style.borderRadius = '5px';
    btn.style.cursor = 'pointer';
    btn.style.fontSize = '16px';

    btn.onmouseover = function() { btn.style.backgroundColor = '#0b5ed7'; }
    btn.onmouseout = function() { btn.style.backgroundColor = '#0d6efd'; }

    btn.onclick = function() {
        if (document.body.contains(overlay)) {
            document.body.removeChild(overlay);
        }
    };

    modal.appendChild(text);
    modal.appendChild(btn);
    overlay.appendChild(modal);
    
    // Make sure body exists before appending
    if (document.body) {
        document.body.appendChild(overlay);
        btn.focus();
    } else {
        document.addEventListener('DOMContentLoaded', () => {
            document.body.appendChild(overlay);
            btn.focus();
        });
    }
};

// Authentication management
const Auth = {
    checkSession() {
        const user = localStorage.getItem('currentUser');
        const isLoginPage = window.location.pathname.endsWith('login.html');

        if (!user && !isLoginPage) {
            // Not logged in and trying to access a protected page
            window.location.replace('login.html');
        } else if (user && isLoginPage) {
            // Already logged in and trying to access login page
            window.location.replace('dashboard.html');
        }
    },

    login(user) {
        localStorage.setItem('currentUser', JSON.stringify(user));
        window.location.replace('dashboard.html');
    },

    logout() {
        localStorage.removeItem('currentUser');
        window.location.replace('login.html');
    }
};

// Run check on load and on pageshow (handles back/forward button)
window.addEventListener('pageshow', (event) => {
    Auth.checkSession();
});

// Initial check
Auth.checkSession();

// Handle Logout links
document.addEventListener('click', (e) => {
    const logoutLink = e.target.closest('a[href="login.html"]') || e.target.closest('a[href="index.html"]');
    if (logoutLink && !window.location.pathname.endsWith('login.html')) {
        e.preventDefault();
        Auth.logout();
    }
});
