// Handle signup form
const signupForm = document.getElementById('signupForm');
if (signupForm) {
    signupForm.addEventListener('submit', function(event) {
        event.preventDefault();

        const username = document.getElementById('username').value;
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        const usernameError = document.getElementById('usernameError');
        const emailError = document.getElementById('emailError');
        const passwordError = document.getElementById('passwordError');
        let isValid = true;

        // Reset errors
        usernameError.style.display = 'none';
        emailError.style.display = 'none';
        passwordError.style.display = 'none';

        // Validate fields
        if (username.length < 3) {
            usernameError.style.display = 'block';
            isValid = false;
        }
        if (!email.includes('@')) {
            emailError.style.display = 'block';
            isValid = false;
        }
        if (password.length < 6) {
            passwordError.style.display = 'block';
            isValid = false;
        }

        if (isValid) {
            fetch("http://localhost:5000/signup", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, email, password })
            })
            .then(res => res.json())
            .then(data => {
                if (data.message === "Signup successful") {
                    alert("Signup successful! Please log in.");
                    window.location.href = "login.html";
                } else {
                    alert(data.error || "Signup failed");
                }
            })
            .catch(err => {
                console.error("Error:", err);
                alert("Cannot connect to server.");
            });
        }
    });
}
// Handle login form
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', function(event) {
        event.preventDefault();

        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const usernameError = document.getElementById('usernameError');
        const passwordError = document.getElementById('passwordError');
        let isValid = true;

        // Reset error messages
        usernameError.style.display = 'none';
        passwordError.style.display = 'none';

        // Validate username
        if (username.length < 3) {
            usernameError.style.display = 'block';
            isValid = false;
        }

        // Validate password
        if (password.length < 6) {
            passwordError.style.display = 'block';
            isValid = false;
        }

        if (isValid) {
            fetch("http://localhost:5000/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, password })
            })
            .then(res => res.json())
            .then(data => {
                if (data.message === "Login successful") {
                    localStorage.setItem("isLoggedIn", "true");
                    localStorage.setItem("username", username);
                    alert(`Welcome ${username}!`);
                    window.location.href = "index.html";
                } else {
                    alert(data.error || "Login failed");
                }
            })
            .catch(err => {
                console.error("Error:", err);
                alert("Cannot connect to server.");
            });
        }
    });
}

// Handle password toggle
function togglePassword() {
    const passwordInput = document.getElementById('password');
    const toggleIcon = document.querySelector('.toggle-password');
    if (passwordInput && toggleIcon) {
        if (passwordInput.type === 'password') {
            passwordInput.type = 'text';
            toggleIcon.textContent = '🙈';
        } else {
            passwordInput.type = 'password';
            toggleIcon.textContent = '👁️';
        }
    }
}

// Check login state for home search page
const searchForm = document.getElementById('searchForm');
if (searchForm) {
    // Redirect to login if not logged in
    if (localStorage.getItem('isLoggedIn') !== 'true') {
        alert('Please log in to access the home search.');
        window.location.href = 'login.html';
    }

    // Handle search form submission
    searchForm.addEventListener('submit', function(event) {
        event.preventDefault();

        const size = document.getElementById('size').value;
        const area = document.getElementById('area').value;
        const bedrooms = document.getElementById('bedrooms').value;
        const yard = document.getElementById('yard').value;
        const sizeError = document.getElementById('sizeError');
        let isValid = true;

        // Reset error messages
        sizeError.style.display = 'none';

        // Validate size
        if (size && size < 0) {
            sizeError.style.display = 'block';
            isValid = false;
        }

        if (isValid) {
            // Construct URL with query parameters
            const params = new URLSearchParams();
            if (size) params.append('size', size);
            if (area) params.append('area', area);
            if (bedrooms) params.append('bedrooms', bedrooms);
            if (yard) params.append('yard', yard);
            window.location.href = `results.html?${params.toString()}`;
        }
    });
}

// Logout function (used in results.html)
function logout() {
    localStorage.removeItem('isLoggedIn');
    window.location.href = 'login.html';
}