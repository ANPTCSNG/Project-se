// ---------------------------------- 1. Global Utility Functions (นอก DOMContentLoaded) ---
const API_BASE_URL = "https://projectse-9dgx.onrender.com";
//window.location.hostname.includes("localhost")
//  ? "http://127.0.0.1:5000"
//    : "https://your-staging-api.onrender.com";

function setContent(id, value) {
    const el = document.getElementById(id);
    if (el) {
        el.textContent = value;
        return true;
    }
    if (!el && window.location.hostname.includes("localhost")) {
    console.warn(`Element with ID '${id}' not found.`);
    }
}

function showModal(message) {
    alert(message);
}

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
        // Fix: loginLogoutLink.href ซ้ำ
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

//------------------------------------------toggle password visibility (Global)
window.togglePassword = function() {
    const passwordInput = document.getElementById('password');
    const toggleIcon = document.querySelector('.toggle-password');
    if (passwordInput && toggleIcon) {
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        toggleIcon.textContent = type === 'password' ? '👁️' : '🙈';
    }
}


// ---------------------------------- 2. Main Logic Block (ใน DOMContentLoaded) ---

document.addEventListener('DOMContentLoaded', () => {
    
    // --- Initial Setup ---
    updateNavLinks();
    
    // Language Selector setup
// (โค้ดใหม่ที่แก้ไขแล้ว)

    // --- Language Selector setup (FIXED) ---

    // 1. สร้างฟังก์ชันสำหรับเปลี่ยนภาษา (แยกออกมา)
    function applyLanguage(lang) {
        document.querySelectorAll('[data-th], [data-en]').forEach(el => {
            const text = el.getAttribute(`data-${lang}`);
            if (text) {
                
                // [FIX 2] ตรวจสอบว่าเป็น input หรือ textarea หรือไม่
                if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                    if (el.hasAttribute('placeholder')) {
                        el.placeholder = text;
                    }
                } else {
                    // ถ้าไม่ใช่ ก็ให้เปลี่ยน textContent ปกติ
                    el.textContent = text;
                }
            }
        });
        document.documentElement.lang = lang;
        localStorage.setItem('language', lang);
    }

    // 2. ดึง Element ของ dropdown
    const languageSelector = document.getElementById('languageSelector');
    
    if (languageSelector) {
        // 3. ใส่ Event Listener (เหมือนเดิม)
        languageSelector.addEventListener('change', function() {
            applyLanguage(this.value); // เรียกใช้ฟังก์ชัน
        });
        
        // 4. ดึงภาษาที่เคยบันทึกไว้
        const savedLang = localStorage.getItem('language') || 'th';
        languageSelector.value = savedLang;
        
        // 5. [FIX 1] สั่งให้เปลี่ยนภาษา "ทันที" ตอนโหลดหน้าเว็บ
        applyLanguage(savedLang); 
    }
    
    // Logout Event Listener (ต้องอยู่ใน DOMContentLoaded)
    document.querySelectorAll('#loginLogoutLink, #logoutButton').forEach(link => {
        link.addEventListener('click', function(e) {
            if (localStorage.getItem('isLoggedIn') === 'true' && (this.id === 'logoutButton' || this.getAttribute('data-en') === 'Logout')) {
                e.preventDefault();
                localStorage.removeItem("isLoggedIn");
                localStorage.removeItem("username");
                localStorage.removeItem("user_id");
                localStorage.removeItem("email");
                localStorage.removeItem("prediction_results"); // ลบผลลัพธ์เก่าด้วย
                alert('คุณออกจากระบบสำเร็จ');
                window.location.href = "/login"; 
            }
        });
    });


    // ------------------------------------ จัดการฟอร์มสมัครสมาชิก (Signup) ---
    const signupForm = document.getElementById('signupForm');
    if (signupForm) {
        signupForm.addEventListener('submit', function(event) {
            event.preventDefault();
            const username = document.getElementById('username').value;
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            
          //  fetch("http://127.0.0.1:5000/api/signup", {
                fetch(`${API_BASE_URL}/api/signup`, {
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
            
            //fetch("http://127.0.0.1:5000/api/login", {
                fetch(`${API_BASE_URL}/api/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: 'include',
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
                    window.location.href = "/home";
                }
            })
            .catch(err => {
                console.error("Login Error:", err);
                showModal(err.message);
            });
        });
    }
    
    // -------------------------------------------------------- จัดการฟอร์มทำนายราคา (Search) ---
    const searchForm = document.getElementById('searchForm');
    if (searchForm) {
    
        
        searchForm.addEventListener('submit', function(event) {
            event.preventDefault();
            if (localStorage.getItem('isLoggedIn') !== 'true') {
                alert('กรุณาเข้าสู่ระบบเพื่อใช้งาน');
                window.location.href = "/login";
                return; 
            }
            // 1. เก็บค่าที่ User กรอก (สำหรับส่ง Feedback)
            const original_form_inputs = {
                OverallQual: document.getElementById('OverallQual').value,
                GrLivArea: document.getElementById('GrLivArea').value,
                TotalBsmtSF: document.getElementById('TotalBsmtSF').value,
                LotArea: document.getElementById('LotArea').value,
                GarageCars: document.getElementById('GarageCars').value,
                FullBath: document.getElementById('FullBath').value,
                Neighborhood: document.getElementById('Neighborhood').value,
                Fireplaces: document.getElementById('Fireplaces').value,
                BedroomAbvGr: document.getElementById('BedroomAbvGr').value
            };
            const original_form_range = document.getElementById('SalePrice').value;
            
            let isValid = true;
            document.querySelectorAll('.error').forEach(error => error.style.display = 'none');

            // ********************* ส่วน Validation *********************
            const numericFeatures = [
                'GrLivArea', 'TotalBsmtSF', 'LotArea', 
                'GarageCars', 'FullBath', 'BedroomAbvGr', 'Fireplaces'
            ];
            numericFeatures.forEach(key => {
                const value = original_form_inputs[key];
                const numberValue = parseFloat(value);
                if (value && (isNaN(numberValue) || numberValue < 0)) {
                    const errorElement = document.getElementById(`${key}Error`); 
                    if (errorElement) { errorElement.style.display = 'block'; }
                    isValid = false;
                }
            });
            const overallQual = parseFloat(original_form_inputs.OverallQual);
            if (original_form_inputs.OverallQual && (isNaN(overallQual) || overallQual < 1 || overallQual > 10)) {
                document.getElementById('OverallQualError').style.display = 'block'; 
                isValid = false;
            }
            // ************************************************************

            if (!isValid) {
                alert('กรุณากรอกข้อมูลให้ถูกต้อง');
                return;
            }
            
            // 2. สร้าง Payload สำหรับส่งไป /api/predict
            const payload = {
                features: original_form_inputs, // ส่ง 9 features
                price_range: original_form_range // ส่ง price range
            };
            
            //fetch("http://127.0.0.1:5000/api/predict", {
                fetch(`${API_BASE_URL}/api/predict`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            })
            .then(res => {
                if (!res.ok) { 
                    return res.json().then(err => { throw new Error(err.error || "การทำนายล้มเหลว") });
                }
                return res.json();
            })
            .then(data => {
                
                // 3. [สำคัญ] ตรวจสอบ data structure ใหม่
                if (data.predicted_price !== undefined && data.user_inputs && data.imputed_values) {
                    
                    // 4. [สำคัญ] สร้าง Object ที่จะเก็บใน Local Storage ใหม่
                    const resultsToStore = {
                        // ข้อมูลดิบจากฟอร์ม (สำหรับ Feedback)
                        original_form_inputs: original_form_inputs,
                        original_form_range: original_form_range,
                        
                        // ข้อมูลใหม่จาก Server (สำหรับแสดงผล)
                        predicted_price: data.predicted_price,
                        user_inputs: data.user_inputs,
                        imputed_values: data.imputed_values,
                        final_price_range: data.final_price_range
                    };
                    
                    localStorage.setItem('prediction_results', JSON.stringify(resultsToStore));
                    
                    window.location.href = "/results"; 
                } else {
                    alert(data.error || "การทำนายราคาล้มเหลว (ข้อมูลไม่สมบูรณ์)");
                }
            })
            .catch(err => {
                console.error("Predict API Error:", err);
                alert("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้: " + err.message);
            });
        });
    }

    // -------------------------------------------------------- จัดการหน้า Results (Features Display & Feedback) ---
    if (window.location.pathname.includes('results')) {
        
        // 1. [สำคัญ] ดึงข้อมูลจาก Local Storage (โครงสร้างใหม่)
        const storedResults = localStorage.getItem('prediction_results');
        if (!storedResults) {
            alert('ไม่พบข้อมูลการทำนาย กรุณาลองใหม่อีกครั้ง');
            window.location.href = "/home";
            return;
        }

        const resultsData = JSON.parse(storedResults);

        // --- 2. [สำคัญ] แยกข้อมูลสำหรับ "แสดงผล" ---
        const predictedPrice = parseFloat(resultsData.predicted_price);
        const userInputs = resultsData.user_inputs; // นี่คือ object (ข้อ 1)
        const imputedValues = resultsData.imputed_values; // นี่คือ object (ข้อ 2)
        const finalPriceRange = resultsData.final_price_range; // นี่คือ string (ข้อ 3)
        
        // --- 3. [สำคัญ] แยกข้อมูลสำหรับ "ส่ง Feedback" (ต้องใช้ข้อมูลดิบ) ---
        const originalInputsForFeedback = resultsData.original_form_inputs;
        const originalRangeForFeedback = resultsData.original_form_range;

        
        // --- 4. [สำคัญ] สร้างฟังก์ชัน Helper เพื่อแสดงผล ---

        // Object สำหรับแปลงชื่อ Key เป็นภาษาไทย (เพิ่ม/แก้ไขได้ตามต้องการ)
        const featureNameMap = {
            'OverallQual': { th: 'คุณภาพโดยรวม', en: 'Overall Quality' },
            'GrLivArea': { th: 'พื้นที่ใช้สอย (ตร.ฟุต)', en: 'Living Area (sq. ft.)' },
            'TotalBsmtSF': { th: 'พื้นที่ชั้นใต้ดิน (ตร.ฟุต)', en: 'Basement Area (sq. ft.)' },
            'LotArea': { th: 'ขนาดที่ดิน (ตร.ฟุต)', en: 'Lot Size (sq. ft.)' },
            'GarageCars': { th: 'จำนวนที่จอดรถ (คัน)', en: 'Garage (Cars)' },
            'FullBath': { th: 'จำนวนห้องน้ำ (ห้อง)', en: 'Full Bathrooms' },
            'Neighborhood': { th: 'ทำเลที่ตั้ง', en: 'Neighborhood' },
            'Fireplaces': { th: 'จำนวนเตาผิง', en: 'Fireplaces' },
            'BedroomAbvGr': { th: 'จำนวนห้องนอน', en: 'Bedrooms' },
            'PriceRange': { th: 'ช่วงราคาที่เลือก', en: 'Selected Price Range' }
        };

        /**
         * ฟังก์ชันสำหรับสร้าง HTML list จาก Object ข้อมูล
           @param {string} containerId 
         * @param {object} dataObject 
         * @param {string} lang - 'th' หรือ 'en'
         */
        function populateDisplayList(containerId, dataObject, lang) {
            const container = document.getElementById(containerId);
            if (!container) {
                console.error(`Container ID '${containerId}' not found for displaying data.`);
                return;
            }
            if (Object.keys(dataObject).length === 0) {
                const noDataText = (lang === 'th') 
                    ? '-(ไม่มีข้อมูลในส่วนนี้)-' 
                    : '-(No data in this section)-';
                container.innerHTML = `<p class="no-data-msg">${noDataText}</p>`;
                return;
            }

            let htmlContent = '<ul>';
            for (const key in dataObject) {
                
                // [FIX] ดึงชื่อที่ถูกต้องตามภาษา (th หรือ en)
                const nameMapEntry = featureNameMap[key];
                const displayName = (nameMapEntry && nameMapEntry[lang]) ? nameMapEntry[lang] : key; 
                
                const displayValue = dataObject[key];
                htmlContent += `<li><strong>${displayName}:</strong> ${displayValue}</li>`;
            }
            htmlContent += '</ul>';
            container.innerHTML = htmlContent;
        }
     
        // --- 5. [สำคัญ] (แก้ไขใหม่) เรียกใช้ฟังก์ชัน และ "เพิ่ม" Event Listener ---

        // 5a. ดึงภาษาที่บันทึกไว้ (จาก localStorage)
        const savedLang = localStorage.getItem('language') || 'th';

        // 5b. แสดงผลครั้งแรก (ด้วยภาษาที่บันทึกไว้)
        populateDisplayList('user-inputs-display', userInputs, savedLang);
        populateDisplayList('imputed-values-display', imputedValues, savedLang);
        
        // 5c. แสดงผลราคา (ส่วนนี้เหมือนเดิม)
        setContent('final-price-range-display', finalPriceRange || 'N/A');
        if (!isNaN(predictedPrice)) {
            setContent('predictedPriceDisplay', predictedPrice.toLocaleString('en-US', {
                style: 'currency', currency: 'USD', minimumFractionDigits: 0
            }));
        }

        // 5d. [FIX] เพิ่ม Listener ให้กับ dropdown *เฉพาะหน้านี้*
        //    (Listener ตัวนี้จะทำงาน *เพิ่มเติม* จาก Listener ตัวหลัก)
        const languageSelectorOnResultPage = document.getElementById('languageSelector');
        if (languageSelectorOnResultPage) {
            languageSelectorOnResultPage.addEventListener('change', function() {
                const newLang = this.value;
                // สั่ง "วาดใหม่" (re-render) list ทั้งสอง เมื่อมีการเปลี่ยนภาษา
                populateDisplayList('user-inputs-display', userInputs, newLang);
                populateDisplayList('imputed-values-display', imputedValues, newLang);
            });
        }
        // --- 6. [สำคัญ] แก้ไขระบบ Feedback ให้ใช้ข้อมูลที่ถูกต้อง ---
        const sendBtn = document.getElementById('send-comment-btn');
        const likeBtn = document.getElementById('like-btn');
        const dislikeBtn = document.getElementById('dislike-btn');
        const commentText = document.getElementById('comment-textarea');

        const baseFeedbackPayload = {
            predicted_price: resultsData.predicted_price,
            user_id: localStorage.getItem('user_id'),
            
            // ใช้ข้อมูลดิบที่ user กรอกมาจริงๆ (จากข้อ 3)
            price_range: originalRangeForFeedback || '',
            OverallQual: originalInputsForFeedback.OverallQual || '',
            GrLivArea: originalInputsForFeedback.GrLivArea || '',
            TotalBsmtSF: originalInputsForFeedback.TotalBsmtSF || '',
            LotArea: originalInputsForFeedback.LotArea || '',     
            GarageCars: originalInputsForFeedback.GarageCars || '',
            FullBath: originalInputsForFeedback.FullBath || '',
            Neighborhood: originalInputsForFeedback.Neighborhood || '',
            Fireplaces: originalInputsForFeedback.Fireplaces || '',
            BedroomAbvGr: originalInputsForFeedback.BedroomAbvGr || ''
        };

        if (likeBtn) {
            likeBtn.addEventListener('click', function() {
                
                // สร้าง Payload สำหรับ "Rating" เท่านั้น
                const payload = {
                    ...baseFeedbackPayload, // เอาข้อมูลบริบทมาทั้งหมด
                    rating: 'like'         // เพิ่มแค่ "rating"
                };

                // ส่ง "Rating" ไปยัง Server ทันที
                //fetch('/api/feedback', { // (ใช้ Endpoint เดิม แต่ส่งข้อมูลไม่เหมือนเดิม)
                fetch(`${API_BASE_URL}/api/feedback`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                })
                .then(res => {
                    if (!res.ok) return res.json().then(err => { throw new Error(err.error) });
                    return res.json();
                })
                .then(data => {
                    if (data.message) {
                        console.log('Rating saved!');
                        // [UI] อัปเดตปุ่มให้ "สว่าง"
                        likeBtn.classList.add('active'); 
                        dislikeBtn.classList.remove('active');
                        // ไม่ต้อง disable ปุ่ม เพื่อให้ user เปลี่ยนใจได้
                    }
                })
                .catch(err => {
                    console.error('Like Button Error:', err);
                    alert('ไม่สามารถบันทึก Like ได้: ' + err.message);
                });
            });
        }

        // 2. ปุ่ม "Dislike" 👎
        if (dislikeBtn) {
            dislikeBtn.addEventListener('click', function() {
                
                // สร้าง Payload สำหรับ "Rating" เท่านั้น
                const payload = {
                    ...baseFeedbackPayload, // เอาข้อมูลบริบทมาทั้งหมด
                    rating: 'dislike'      // เพิ่มแค่ "rating"
                };

                // ส่ง "Rating" ไปยัง Server ทันที
                //fetch('/api/feedback', { // (ใช้ Endpoint เดิม)
                fetch(`${API_BASE_URL}/api/feedback`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                })
                .then(res => {
                    if (!res.ok) return res.json().then(err => { throw new Error(err.error) });
                    return res.json();
                })
                .then(data => {
                    if (data.message) {
                        console.log('Rating saved!');
                        // [UI] อัปเดตปุ่มให้ "สว่าง"
                        dislikeBtn.classList.add('active');
                        likeBtn.classList.remove('active');
                    }
                })
                .catch(err => {
                    console.error('Dislike Button Error:', err);
                    alert('ไม่สามารถบันทึก Dislike ได้: ' + err.message);
                });
            });
        }
        
        // 3. ปุ่ม "Send Comment"
        if (sendBtn) {
            sendBtn.addEventListener('click', function() {
                const comment = commentText.value.trim();
                
                if (!comment) {
                    alert('กรุณาใส่ความคิดเห็นก่อนส่ง!');
                    return; // หยุดทำงานถ้าไม่มีคอมเมนต์
                }
                
                // สร้าง Payload สำหรับ "Comment" เท่านั้น
                const payload = {
                    ...baseFeedbackPayload, // เอาข้อมูลบริบทมาทั้งหมด
                    comment: comment       // เพิ่มแค่ "comment"
                };

                // ส่ง "Comment" ไปยัง Server ทันที
                //fetch('/api/feedback', { // (ใช้ Endpoint เดิม)
                fetch(`${API_BASE_URL}/api/feedback`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                })
                .then(res => {
                    if (!res.ok) return res.json().then(err => { throw new Error(err.error) });
                    return res.json();
                })
                .then(data => {
                    if (data.message) {
                        alert('ขอบคุณสำหรับ Feedback!');
                        commentText.value = ''; // ล้างช่องคอมเมนต์
                    }
                })
                .catch(err => {
                    console.error('Send Comment Error:', err);
                    alert('ไม่สามารถส่งคอมเมนต์ได้: ' + err.message);
                });
            });
        }
            }
    // -------------------------------------------------------- จัดการหน้า User Account ---
    if (window.location.pathname.includes('/user-account')) {
        const username = localStorage.getItem('username') || 'Not logged in';
        setContent('usernameDisplay', username);
        const email = localStorage.getItem('email') || 'N/A'; 
        setContent('emailDisplay', email);
    }       
});