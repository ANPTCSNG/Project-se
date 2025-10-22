
document.addEventListener('DOMContentLoaded', () => {
    updateNavLinks();
    const languageSelector = document.getElementById('languageSelector');
    if (languageSelector) {
        languageSelector.addEventListener('change', function() {
            const lang = this.value;
            document.querySelectorAll('[data-th], [data-en]').forEach(el => {
                const text = el.getAttribute(`data-${lang}`);
                if (text) el.textContent = text;
            });
            document.documentElement.lang = lang;
            localStorage.setItem('language', lang);
        });
        
        const savedLang = localStorage.getItem('language') || 'th';
        languageSelector.value = savedLang;
    }
});

function updateNavLinks() {
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    const loginLogoutLink = document.getElementById('loginLogoutLink');
    const signupAccountLink = document.getElementById('signupAccountLink');

    if (loginLogoutLink) {
        loginLogoutLink.href = isLoggedIn ? 'javascript:void(0);' : '/login'; 
        loginLogoutLink.setAttribute('data-th', isLoggedIn ? 'ออกจากระบบ' : 'เข้าสู่ระบบ');
        loginLogoutLink.setAttribute('data-en', isLoggedIn ? 'Logout' : 'Login');
    }
    if (signupAccountLink) {
        signupAccountLink.href = isLoggedIn ? '/user-account' : '/signup'; 
        signupAccountLink.setAttribute('data-th', isLoggedIn ? 'บัญชีผู้ใช้' : 'สมัครสมาชิก');
        signupAccountLink.setAttribute('data-en', isLoggedIn ? 'My Account' : 'Sign Up');
    }
    const currentLang = localStorage.getItem('language') || 'th';
    document.querySelectorAll('[data-th], [data-en]').forEach(el => {
        const text = el.getAttribute(`data-${currentLang}`);
        if (text) {
            el.textContent = text;
        }
    });
}
document.querySelectorAll('#loginLogoutLink, #logoutButton').forEach(link => {
        link.addEventListener('click', function(e) {
            // ตรวจสอบว่าเป็นปุ่ม Logout จริงๆ (แสดงเมื่อ login แล้ว)
            if (localStorage.getItem('isLoggedIn') === 'true' && (this.id === 'logoutButton' || this.getAttribute('data-en') === 'Logout')) {
                e.preventDefault();
                localStorage.clear(); // ล้างข้อมูลทั้งหมด
                alert('คุณออกจากระบบสำเร็จ');
                window.location.href = "/login"; // กลับไปหน้า Login
            }
        });
    });
// ---------------------------------- ฟังก์ชันสำหรับแสดงข้อความ (ใช้ alert แบบง่าย) ---
function showModal(message) {
    alert(message);
}

// ------------------------------------ จัดการฟอร์มสมัครสมาชิก (Signup) ---
const signupForm = document.getElementById('signupForm');
if (signupForm) {
    signupForm.addEventListener('submit', function(event) {
        event.preventDefault();
        const username = document.getElementById('username').value;
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        
        fetch("http://127.0.0.1:5000/api/signup", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, email, password })
        })
        .then(res => {
            if (!res.ok) {
                return res.json().then(err => { throw new Error(err.error || 'การสมัครสมาชิกล้มเหลว') });
            }
            return res.json();
        })
        .then(data => {
            showModal("สมัครสมาชิกสำเร็จ! กรุณาเข้าสู่ระบบ");
            // ✅ แก้ไข: ไปที่เส้นทาง /login ที่ Flask รู้จัก
            window.location.href = "/login"; 
        })
        .catch(err => {
            console.error("Signup Error:", err);
            showModal(err.message || 'การสมัครสมาชิกล้มเหลว');
        });
    });
}

// --------------------------------------------------- จัดการฟอร์มเข้าสู่ระบบ (Login) ---
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', function(event) {
        event.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        
        fetch("http://127.0.0.1:5000/api/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password })
        })
        .then(res => {
            if (!res.ok) {
                return res.json().then(err => { throw new Error(err.error || 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง') });
            }
            return res.json();
        })
        .then(data => {
            if (data.message === "Login success") {
                localStorage.setItem("isLoggedIn", "true");
                localStorage.setItem("username", data.username);
                localStorage.setItem("user_id", data.user_id);
                localStorage.setItem("email", data.email);
                
                showModal(`ยินดีต้อนรับ ${data.username}!`);
                // ✅ แก้ไข: ไปที่เส้นทาง /home ที่ Flask รู้จัก (หน้า index.html)
                window.location.href = "/home";
            }
        })
        .catch(err => {
            console.error("Login Error:", err);
            showModal(err.message);
        });
    });
}
//------------------------------------------toggle password visibility
window.togglePassword = function() {
        const passwordInput = document.getElementById('password');
        const toggleIcon = document.querySelector('.toggle-password');
        if (passwordInput && toggleIcon) {
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            toggleIcon.textContent = type === 'password' ? '👁️' : '🙈';
        }
    }
// -------------------------------------------------------- จัดการฟอร์มทำนายราคา (Search) ---
const searchForm = document.getElementById('searchForm');
if (searchForm) {
  
    if (localStorage.getItem('isLoggedIn') !== 'true') {
        alert('กรุณาเข้าสู่ระบบเพื่อใช้งาน');
        window.location.href = "/login"; 
    }
    
    searchForm.addEventListener('submit', function(event) {
        event.preventDefault();
        const inputs = {
            OverallQual: document.getElementById('OverallQual')?.value,
            GrLivArea: document.getElementById('GrLivArea')?.value,
            TotalBsmtSF: document.getElementById('TotalBsmtSF')?.value,
            LotArea: document.getElementById('LotArea')?.value,
            GarageCars: document.getElementById('GarageCars')?.value,
            FullBath: document.getElementById('FullBath')?.value,
            Neighborhood: document.getElementById('Neighborhood')?.value,
            Fireplaces: document.getElementById('Fireplaces')?.value,
            BedroomAbvGr: document.getElementById('BedroomAbvGr')?.value
        };
        const desiredRange = document.getElementById('SalePrice')?.value;
        let isValid = true;
        document.querySelectorAll('.error').forEach(error => error.style.display = 'none');

        if (inputs.OverallQual && (inputs.OverallQual < 1 || inputs.OverallQual > 10)) {
            document.getElementById('overallQualError').style.display = 'block'; isValid = false;
        }
        if (inputs.YearBuilt && (inputs.YearBuilt < 1800 || inputs.YearBuilt > new Date().getFullYear())) {
            document.getElementById('yearBuiltError').style.display = 'block'; isValid = false;
        }

        if (!isValid) {
            alert('กรุณากรอกข้อมูลให้ถูกต้อง');
            return;
        }
        const payload = {
        features: inputs,         // Object ของ 9 features
        price_range: desiredRange // String ของงบประมาณ
        };
        fetch("http://127.0.0.1:5000/api/predict", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        })
        .then(res => {
            if (!res.ok) { // เช็ค error จาก backend
                 return res.json().then(err => { throw new Error(err.error || "การทำนายล้มเหลว") });
            }
            return res.json();
        })
        .then(data => {
            if (data.predicted_price !== undefined) {
                const params = new URLSearchParams();
                for (const key in inputs) {
                   if (inputs[key]) { params.append(key, inputs[key]);}
                }
                params.append('predicted_price', data.predicted_price);
                params.append('price_range', data.desired_range);     
                params.append('matches_budget', data.matches_budget); 

                window.location.href = `/results?${params.toString()}`;
            } else {
                alert(data.error || "การทำนายราคาล้มเหลว");
            }
        })
        .catch(err => {
            console.error("Predict API Error:", err);
            alert("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
        });
    });
}
window.addEventListener('DOMContentLoaded', function() {
    if (window.location.pathname.includes('results')) {
        const urlParams = new URLSearchParams(window.location.search);
        console.log("Checking element #OverallQualResult1:", document.getElementById('OverallQualResult1'));
        document.getElementById('OverallQualResult1').textContent = urlParams.get('OverallQual') || '-';
        document.getElementById('GrLivAreaResult1').textContent = urlParams.get('GrLivArea') || '-';
        document.getElementById('TotalBsmtSFResult1').textContent = urlParams.get('TotalBsmtSF') || '-';
        document.getElementById('LotAreaResult1').textContent = urlParams.get('LotArea') || '-';
        document.getElementById('GarageCarsResult1').textContent = urlParams.get('GarageCars') || '-';
        document.getElementById('FullBathResult1').textContent = urlParams.get('FullBath') || '-';
        document.getElementById('BedroomAbvGrResult1').textContent = urlParams.get('BedroomAbvGr') || '-';
        document.getElementById('NeighborhoodResult1').textContent = urlParams.get('Neighborhood') || '-';
        document.getElementById('FireplacesResult1').textContent = urlParams.get('Fireplaces') || '-';

        // (ดึงงบจาก URL มาแสดง)
        const desiredRange = urlParams.get('price_range') || 'N/A';
        document.getElementById('budgetDisplay').textContent = desiredRange;

        // (ดึงราคาที่ทำนายได้จาก URL มาแสดง)
        const predictedPrice = parseFloat(urlParams.get('predicted_price'));
        if (predictedPrice) {
            document.getElementById('predictedPriceDisplay').textContent = predictedPrice.toLocaleString('en-US', {
                style: 'currency', currency: 'USD', minimumFractionDigits: 0
            });
        }

        // (ดึงผลเปรียบเทียบจาก URL มาแสดง)
        const matchesBudget = urlParams.get('matches_budget'); // นี่คือ 'true' หรือ 'false'
        const budgetMatchEl = document.getElementById('budgetMatchDisplay');
        
        if (matchesBudget === 'true') {
            budgetMatchEl.textContent = 'Yes 👍'; // (หรือ 'ใช่')
            budgetMatchEl.style.color = 'green';
        } else if (matchesBudget === 'false') {
            budgetMatchEl.textContent = 'No 👎'; // (หรือ 'ไม่')
            budgetMatchEl.style.color = 'red';
        } else {
            budgetMatchEl.textContent = '-';
        }

        
        // --- 3. ระบบ Feedback (แก้ไข Payload) ---
        const sendBtn = document.getElementById('send-comment-btn');
        const likeBtn = document.getElementById('like-btn');
        const dislikeBtn = document.getElementById('dislike-btn');
        const commentText = document.getElementById('comment-textarea');

        function sendFeedback(feedbackData) {
            const payload = {
                predicted_price: urlParams.get('predicted_price'),
                user_id: localStorage.getItem('user_id'),
                price_range: desiredRange,
                OverallQual: urlParams.get('OverallQual'),
                GrLivArea: urlParams.get('GrLivArea'),
                TotalBsmtSF: urlParams.get('TotalBsmtSF'),
                LotArea: urlParams.get('LotArea'),
                GarageCars: urlParams.get('GarageCars'),
                FullBath: urlParams.get('FullBath'),
                Neighborhood: urlParams.get('Neighborhood'),
                Fireplaces: urlParams.get('Fireplaces'),
                BedroomAbvGr: urlParams.get('BedroomAbvGr'),

                // ข้อมูล Feedback
                comment: feedbackData.comment || null,
                rating: feedbackData.rating || null
            };

            fetch('/api/feedback', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })
            .then(res => res.json())
            .then(data => {
                if (data.message) {
                    alert('ขอบคุณสำหรับ Feedback!');
                    if (feedbackData.comment) {
                        commentText.value = ''; // ล้างช่องคอมเมนต์
                    }
                    // (เพิ่ม) ปิดปุ่มหลังจากกด Like/Dislike
                    likeBtn.disabled = true;
                    dislikeBtn.disabled = true;
                } else {
                    alert('Error: ' + (data.error || 'ไม่สามารถส่ง Feedback ได้'));
                }
            })
            .catch(err => {
                console.error('Feedback API Error:', err);
                alert('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
            });
        }

        if (sendBtn) {
            sendBtn.addEventListener('click', function() {
                const comment = commentText.value.trim();
                if (comment) {
                    sendFeedback({ comment: comment });
                } else {
                    alert('กรุณาใส่ความคิดเห็นก่อนส่ง!');
                }
            });
        }

        if (likeBtn) {
            likeBtn.addEventListener('click', function() {
                sendFeedback({ rating: 'like' });
            });
        }

        if (dislikeBtn) {
            dislikeBtn.addEventListener('click', function() {
                sendFeedback({ rating: 'dislike' });
            });
        }
    } // --- จบ if (includes('results')) ---

    if (window.location.pathname.includes('/user-account')) {
        const username = localStorage.getItem('username') || 'Not logged in';
        document.getElementById('usernameDisplay').textContent = username;
        const email = localStorage.getItem('email') || 'N/A'; 
        document.getElementById('emailDisplay').textContent = email;
    }
});