// =====================================================================
// SCRIPT.JS (เวอร์ชันแก้ไขสมบูรณ์)
// =====================================================================

// --- Function สำหรับแสดง Modal (ถ้ามี) ---
// หากคุณไม่มีฟังก์ชัน showModal ให้ใช้ alert() แทน
function showModal(message) {
    // หากคุณมี UI ที่สวยงามกว่านี้ สามารถแก้ไขได้
    alert(message);
}

// --- จัดการฟอร์มสมัครสมาชิก (Signup) ---
const signupForm = document.getElementById('signupForm');
if (signupForm) {
    signupForm.addEventListener('submit', function(event) {
        event.preventDefault(); // ป้องกันฟอร์มรีเฟรชหน้า

        const username = document.getElementById('username').value;
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        let isValid = true;
        
        // (ส่วน Validate ข้อมูลเหมือนเดิม... ถ้าต้องการให้เข้มงวดขึ้นสามารถเพิ่มได้)

        if (isValid) {
            // --- โค้ด Fetch API ที่ถูกต้อง ---
            fetch("http://localhost:5000/api/signup", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, email, password })
            })
            .then(res => {
                if (!res.ok) {
                    // ถ้าเซิร์ฟเวอร์ตอบกลับ Error (เช่น username ซ้ำ)
                    return res.json().then(err => { throw new Error(err.error || 'การสมัครสมาชิกล้มเหลว') });
                }
                return res.json();
            })
            .then(data => {
                showModal("สมัครสมาชิกสำเร็จ! กรุณาเข้าสู่ระบบ");
                window.location.href = "login.html"; // <-- ไปหน้า Login
            })
            .catch(err => {
                console.error("Signup Error:", err);
                showModal(err.message); // แสดง Error ที่ได้รับจากเซิร์ฟเวอร์
            });
        }
    });
}

// --- จัดการฟอร์มเข้าสู่ระบบ (Login) ---
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', function(event) {
        event.preventDefault();

        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        
        fetch("http://localhost:5000/api/login", {
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
                // บันทึกข้อมูลที่จำเป็นลงในเบราว์เซอร์
                localStorage.setItem("isLoggedIn", "true");
                localStorage.setItem("username", data.username);
                localStorage.setItem("user_id", data.user_id); // <-- สำคัญมากสำหรับ Predict
                
                showModal(`ยินดีต้อนรับ ${data.username}!`);
                window.location.href = "index.html"; // <-- ไปหน้าหลัก
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
        window.location.href = "login.html";
    }
    
    searchForm.addEventListener('submit', function(event) {
        event.preventDefault();

        const area = document.getElementById('area').value;
        const bedrooms = document.getElementById('bedrooms').value;
        
        if (!area || !bedrooms) {
           alert('กรุณากรอกพื้นที่และจำนวนห้องนอน');
           return;
        }

        const user_id = localStorage.getItem("user_id"); // ดึง user_id ที่บันทึกไว้

        // **สำคัญ:** key ใน payload ต้องตรงกับที่โมเดลคาดหวัง
        const payload = {
            area: parseFloat(area),
            bedrooms: parseInt(bedrooms),
            bathrooms: 2, // สมมติค่า
            location_score: 7, // สมมติค่า
            user_id: user_id // ส่ง user_id ไปด้วยเพื่อบันทึกประวัติ
        };
        
        fetch("http://localhost:5000/api/predict", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        })
        .then(res => res.json())
        .then(data => {
            if (data.predicted_price !== undefined) {
                const price = data.predicted_price.toFixed(2);
                window.location.href = `results.html?price=${price}`;
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

// --- ฟังก์ชันอื่นๆ ---

function togglePassword() {
    // ... (โค้ด toggle password ของคุณเหมือนเดิม) ...
}

function logout() {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('username');
    localStorage.removeItem('user_id');
    alert('คุณออกจากระบบสำเร็จ');
    window.location.href = "login.html";
}