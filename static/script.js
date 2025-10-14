// =====================================================================
// SCRIPT.JS (เวอร์ชันแก้ไขสมบูรณ์)
// =====================================================================

// --- ฟังก์ชันสำหรับแสดงข้อความ (ใช้ alert แบบง่าย) ---
function showModal(message) {
    alert(message);
}

// --- จัดการฟอร์มสมัครสมาชิก (Signup) ---
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
            showModal(err.message);
        });
    });
}

// --- จัดการฟอร์มเข้าสู่ระบบ (Login) ---
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

// --- จัดการฟอร์มทำนายราคา (Search) ---
const searchForm = document.getElementById('searchForm');
if (searchForm) {
    // ตรวจสอบว่าล็อกอินหรือยัง
    if (localStorage.getItem('isLoggedIn') !== 'true') {
        alert('กรุณาเข้าสู่ระบบเพื่อใช้งาน');
        window.location.href = "/login"; // ✅ แก้ไข: ไปที่ /login
    }
    
    searchForm.addEventListener('submit', function(event) {
        event.preventDefault();

        // **สำคัญ:** แก้ไข id ของ input ให้ตรงกับไฟล์ index.html ของคุณ
        const OverallQual = document.getElementById('OverallQual')?.value;
        const GrLivArea = document.getElementById('GrLivArea')?.value;
        // (เพิ่ม .value สำหรับ input fields อื่นๆ ที่นี่)
        
        if (!OverallQual || !GrLivArea) {
           alert('กรุณากรอกข้อมูลให้ครบถ้วน');
           return;
        }

        const user_id = localStorage.getItem("user_id");

        const payload = {
            user_id: user_id,
            OverallQual: parseInt(OverallQual),
            GrLivArea: parseInt(GrLivArea),
            // (เพิ่ม key-value สำหรับ input fields อื่นๆ ที่นี่)
        };
        
        fetch("http://127.0.0.1:5000/api/predict", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        })
        .then(res => res.json())
        .then(data => {
            if (data.predicted_price !== undefined) {
                // ✅ แก้ไข: ไปที่เส้นทาง /results พร้อมส่งราคาไปด้วย
                window.location.href = `/results?price=${data.predicted_price}`;
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

// --- ฟังก์ชัน Logout ---
function logout() {
    localStorage.clear(); // ล้างข้อมูลทั้งหมด
    alert('คุณออกจากระบบสำเร็จ');
    window.location.href = "/login"; // ✅ แก้ไข: ไปที่ /login
}