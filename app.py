from flask import Flask, request, jsonify, render_template
from flask_bcrypt import Bcrypt
from flask_cors import CORS
from pymongo import MongoClient
from bson.objectid import ObjectId
import joblib
import pandas as pd
import datetime
from datetime import timezone
import numpy as np
from bson.errors import InvalidId
from pymongo.errors import DuplicateKeyError
import logging
import os

# ------------------------------------------APP & DB CONFIGURATION
app = Flask(__name__, static_folder="static", template_folder="templates")

#app = Flask(__name__)
bcrypt = Bcrypt(app)
CORS(app)
# ---------------------------------------------- MongoDB Setup ---
#MONGO_URI = "mongodb+srv://anapatch_db_user:BlaMuXAJulXku0hx@cluster1.gqsi4uc.mongodb.net/?retryWrites=true&w=majority&appName=Cluster1"

MONGO_URI = os.environ.get("MONGO_URI")
logging.basicConfig(level=logging.INFO)
if not MONGO_URI:
    logging.error("❌ MONGO_URI environment variable is missing!")

DB_NAME = "house_price_app"


try:
    client = MongoClient(MONGO_URI)
    db = client[DB_NAME]
    users_collection = db["users"]
    predictions_collection = db['predictions']
    feedbacks_collection = db['feedbacks']
    users_collection.create_index([("username", 1)], unique=True)

    logging.info("✅ Connected to MongoDB successfully.")
except Exception as e:
    logging.error(f"❌ ERROR: Could not connect to MongoDB. {e}")



# ----------------------------------------------------LOAD MACHINE LEARNING MODEL
# โหลด Price Model
try:
    price_model = joblib.load("ml_model/price_model.joblib")
    print("Price Model loaded successfully.")
except FileNotFoundError:
    print("ERROR: price_model.joblib not found.")
    price_model = None

# โหลด Imputer Model
try:
    imputer_model = joblib.load("ml_model/imputer_model.joblib")
    print("Imputer Model loaded successfully.")
except FileNotFoundError:
    print("ERROR: imputer_model.joblib not found.")
    imputer_model = None
neighborhood_list = [
    "Blmngtn", "Blueste", "Briardl", "Brooksd", "ClearCr", 
    "CollgCr", "Crawfor", "Edwards", "Gilbert", "IDOTRR",
    "MeadowV", "Mitchel", "NWAmes", "NoRidge", "NPkVill",
    "NridgHt", "NwAmes", "OldTown", "SWISU", "Sawyer",
    "SawyerW", "Somerst", "StoneBr", "Timber", "Veenker"
]
int_features = [
    "OverallQual", "TotalBsmtSF", "LotArea", "GarageCars", 
    "Fireplaces", "BedroomAbvGr", "GrLivArea", "FullBath"
]

default_neighborhood = 0  # หรือเลข index ที่เหมาะสม

# Mapping รหัส → ตัวเลขสำหรับโมเดล
neighborhood_to_num = {name: i for i, name in enumerate(neighborhood_list)}
num_to_neighborhood = {i: name for i, name in enumerate(neighborhood_list)}

TRAINED_COLUMNS = [
    "OverallQual",
    "TotalBsmtSF",
    "LotArea",
    "GarageCars",
    "Fireplaces",
    "BedroomAbvGr",
    "GrLivArea",
    "FullBath",
    "Neighborhood"
  ]
reverse_models = {}
for f in TRAINED_COLUMNS:
    try:
        reverse_models[f] = joblib.load(f"ml_model/reverse_{f}.joblib")
        print(f"Reverse Model for {f} loaded successfully.")
    except FileNotFoundError:
        print(f"ERROR: reverse_{f}.joblib not found.")
        reverse_models[f] = None
#  ----------------------------------------------WEB PAGE ROUTES (ส่วนสำหรับเปิดหน้าเว็บ HTML)
@app.route('/')
def index_page():
    # เมื่อเข้าเว็บครั้งแรก ให้ไปที่หน้า login
    return render_template('index.html')

@app.route('/home')
def home_page():
    # หน้าหลักจริงๆ หลัง login สำเร็จ
    return render_template('index.html')
    
@app.route('/signup')
def signup_page():
    return render_template('signup.html')

@app.route('/login')
def login_page():
    return render_template('login.html')

@app.route('/forgotpassword')
def forgotpassword_page():
    return render_template('forgotpassword.html')

@app.route('/terms')
def terms_page():
    return render_template('terms.html')

@app.route('/privacy')
def privacy_page():
    return render_template('privacy.html')

@app.route('/results')
def results_page():
    test_id_value = "ID_FOUND_IN_FLASK"
    return render_template('results.html')

@app.route('/user-account')
def user_account_page():
    return render_template('user-account.html')

#  --------------------------------------------------API ENDPOINTS (ส่วนสำหรับรับส่งข้อมูล)
# ----------------------------------------------------- AUTHENTICATION API ---
@app.route('/api/signup', methods=['POST'])
def signup():
    """Endpoint สำหรับการลงทะเบียนผู้ใช้ใหม่"""
    try:
        data = request.get_json()
        username = data.get('username')
        password = data.get('password')
        email = data.get('email')

        if not all([username, password, email]):
            return jsonify({'error': 'Missing required fields'}), 400

        if users_collection.find_one({"username": username}):
            return jsonify({'error': 'Username already exists'}), 409

        hashed_password = bcrypt.generate_password_hash(password).decode('utf-8')
        user_doc = {
            "username": username,
            "password": hashed_password,
            "email": email,
            "created_at": datetime.datetime.utcnow()
        }
        users_collection.insert_one(user_doc)
        return jsonify({'message': 'Register success'}), 201
    except DuplicateKeyError:
        # 409 Conflict คือ Status code ที่บอกว่า "ข้อมูลขัดแย้ง/ซ้ำ"
        return jsonify({"error": "ชื่อผู้ใช้นี้ถูกใช้งานแล้ว"}), 409
    
    except Exception as e:
        return jsonify({'error': f'Registration failed: {e}'}), 500

@app.route('/api/login', methods=['POST'])
def login():
    """Endpoint สำหรับการเข้าสู่ระบบ"""
    try:
        data = request.get_json()
        username = data.get('username')
        password = data.get('password')

        if not all([username, password]):
            return jsonify({'error': 'Missing username or password'}), 400

        user = users_collection.find_one({"username": username})
    
        if user and bcrypt.check_password_hash(user['password'], password):
            return jsonify({
                'message': 'Login success', 
                'user_id': str(user['_id']), 
                'username': user['username'],
                "email": user.get('email', '')
            }), 200
        else:
            return jsonify({'error': 'Invalid username or password'}), 401
    except Exception as e:
        return jsonify({'error': f'Login failed: {e}'}), 500

# --- --------------------------------------------------------------PREDICTION API ---
# -----------------------------------------------------------------PREDICTION API ---
@app.route('/api/predict', methods=['POST'])
def predict():
    # --- เช็คว่าโมเดลโหลดเรียบร้อย ---
    if price_model is None or imputer_model is None:
        return jsonify({'error': 'Model is not loaded'}), 500

    data = request.get_json()
    if data is None:
        return jsonify({'error': 'No input data provided'}), 400

    # --- 1. รับ input ดิบจาก User ---
    feature_data = data.get('features')  # dict ของ 9 features (เช่น {'OverallQual': '8', 'LotArea': ''})
    price_range_input = data.get('price_range')  # string (เช่น "100001-200000" หรือ "")
    if not feature_data:
        return jsonify({'error': 'No features provided'}), 400

    # --- 2. เตรียมข้อมูลสำหรับ Imputer (ช่องว่างจะถูกแทนที่ด้วย np.nan) ---
    input_dict_for_model = {}
    for col in TRAINED_COLUMNS:
        val = feature_data.get(col)
        if val is None or val == "":
            input_dict_for_model[col] = np.nan
        else:
            if col == "Neighborhood":
                input_dict_for_model[col] = neighborhood_to_num.get(val, np.nan)
            else:
                try:
                    input_dict_for_model[col] = float(val)
                except (ValueError, TypeError):
                    input_dict_for_model[col] = np.nan
    
    input_df = pd.DataFrame([input_dict_for_model], columns=TRAINED_COLUMNS)

    try:
        # --- 3. เติมค่าที่หายด้วย Imputer ---
        filled_array = imputer_model.transform(input_df)
        filled_df = pd.DataFrame(filled_array, columns=TRAINED_COLUMNS)

        # --- 4. ทำนายราคาบ้าน (ต้องแน่ใจว่า Neighborhood เป็น int) ---
        predict_df = filled_df.copy()
        predict_df['Neighborhood'] = predict_df['Neighborhood'].astype(int)
        
        pred_price = price_model.predict(predict_df)[0]
        # ทำให้เป็น float ธรรมดา (ไม่ใช่ numpy float) เพื่อให้ JSON ทำงานง่าย
        pred_price = float(pred_price) 

        # --- 5. [สำคัญ] แยกแยะข้อมูล User Input และ Imputed Values ---
        
        user_inputs_display = {}    # Dict สำหรับเก็บ "สิ่งที่ผู้ใช้กรอก"
        imputed_values_display = {} # Dict สำหรับเก็บ "สิ่งที่โมเดลเติมให้"
        
        # ดึงค่าที่โมเดลเติมแล้ว (แถวแรก) มาเป็น dict
        filled_values_dict = filled_df.iloc[0].to_dict()

        for col in TRAINED_COLUMNS:
            original_val = feature_data.get(col) # ค่าดิบที่ user ส่งมา (string)
            
            # ค่าสุดท้ายที่ Imputer เติม (ตัวเลข)
            final_filled_val = filled_values_dict[col] 
            
            # แปลงค่าที่เติมแล้วให้เป็นรูปแบบที่แสดงผลได้
            display_val = ""
            if col == "Neighborhood":
                display_val = num_to_neighborhood.get(int(round(final_filled_val)), "Unknown")
            elif col in int_features:
                display_val = int(round(final_filled_val))
            else:
                display_val = round(final_filled_val, 2) # ทศนิยม 2 ตำแหน่ง (ถ้ามี)

            # --- ตรรกะการแยกแยะ ---
            if original_val is None or original_val == "":
                # ถ้า user "ไม่ได้กรอก" -> เก็บใน imputed_values_display
                imputed_values_display[col] = display_val
            else:
                # ถ้า user "กรอก" -> เก็บใน user_inputs_display
                # (เราจะโชว์ค่าที่ user กรอกมาตรงๆ)
                user_inputs_display[col] = original_val 

        # --- 6. [สำคัญ] จัดการ "ช่วงราคา" ตามโจทย์ ---
        
        final_price_range_used = "" # นี่คือ "ช่วงราคา" ที่จะแสดงผลตามโจทย์
        is_match = False # (เก็บไว้ใช้เฉยๆ)

        if price_range_input:
            # --- 6a. ถ้า User "เลือก" ช่วงราคามา ---
            final_price_range_used = price_range_input
            # เพิ่มเข้าไปใน dict "สิ่งที่ผู้ใช้กรอก"
            user_inputs_display['PriceRange'] = price_range_input

            # (ตรรกะเช็ค is_match ของเดิม)
            if final_price_range_used == "0-100000" and pred_price <= 100000: is_match = True
            elif final_price_range_used == "100001-200000" and 100000 < pred_price <= 200000: is_match = True
            elif final_price_range_used == "200001-300000" and 200000 < pred_price <= 300000: is_match = True
            elif final_price_range_used == "300001-400000" and 300000 < pred_price <= 400000: is_match = True
            elif final_price_range_used == "400001-500000" and 400000 < pred_price <= 500000: is_match = True
            elif final_price_range_used == "500000+" and pred_price > 500000: is_match = True
        
        else:
            # --- 6b. ถ้า User "ไม่ได้เลือก" ช่วงราคา (เราต้องเติมให้) ---
            # เราจะ "สร้าง" ช่วงราคาที่ตรงกับราคาที่ทำนายได้
            if pred_price <= 100000:
                final_price_range_used = "0-100000"
            elif 100000 < pred_price <= 200000:
                final_price_range_used = "100001-200000"
            elif 200000 < pred_price <= 300000:
                final_price_range_used = "200001-300000"
            elif 300000 < pred_price <= 400000:
                final_price_range_used = "300001-400000"
            elif 400000 < pred_price <= 500000:
                final_price_range_used = "400001-500000"
            else: # pred_price > 500000
                final_price_range_used = "500000+"
            
            # เพิ่มเข้าไปใน dict "สิ่งที่โมเดลเติม"
            imputed_values_display['PriceRange'] = final_price_range_used
            is_match = True # ถือว่า match เสมอ เพราะเราสร้างช่วงราคาจากผลลัพธ์
            

     
        return jsonify({
          
            'predicted_price': pred_price, 
            
            
            'user_inputs': user_inputs_display,
         
            'imputed_values': imputed_values_display,
            
            'final_price_range': final_price_range_used, 
            
            'matches_budget': is_match 
        })

    except Exception as e:
        return jsonify({'error': f'Prediction failed: {str(e)}'}), 500
    

# --- -----------------------------------------------FEEDBACK API ---
# --- -----------------------------------------------FEEDBACK API (แก้ไขใหม่) ---
@app.route('/api/feedback', methods=['POST'])
def handle_feedback():
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    user_id_string = data.get('user_id')
    if not user_id_string:
        return jsonify({'error': 'Missing user_id'}), 400

    try:
        user_object_id = ObjectId(user_id_string)
    except InvalidId:
        return jsonify({'error': 'Invalid user_id format'}), 400

    try:
        # --- [ใหม่] สร้าง "Filter" (ตัวค้นหา) ---
        #    นี่คือ "บริบท" หรือ "กุญแจ" ที่ใช้ระบุว่าเรากำลังพูดถึง
        #    Feedback ของการทำนายครั้งไหน
        #    เราจะใช้ข้อมูลบริบททั้งหมดที่ JavaScript ส่งมา (baseFeedbackPayload)
        
        query_filter = {
            "user_id": user_object_id, 
            "predicted_price": data.get('predicted_price'),
            
            # ใช้ข้อมูลดิบที่ user กรอกมา (จาก baseFeedbackPayload)
            "overall_qual": data.get('OverallQual'),
            "price_range": data.get('price_range'),
            "total_bsmt_sf": data.get('TotalBsmtSF'),
            "lot_area": data.get('LotArea'),
            "gr_liv_area": data.get('GrLivArea'),
            "garage_cars": data.get('GarageCars'),
            "fireplaces": data.get('Fireplaces'),
            "bedroom_abv_gr": data.get('BedroomAbvGr'),
            "full_bath": data.get('FullBath'),
            "neighborhood": data.get('Neighborhood')
        }

        # 2. --- [ใหม่] สร้าง "Update Payload" (ข้อมูลที่จะอัปเดต) ---
        #    เราจะใช้ $set เพื่อ "ตั้งค่า" หรือ "เขียนทับ"
        #    เฉพาะ field ที่ถูกส่งมาในครั้งนี้เท่านั้น (เช่น comment หรือ rating)
        
        update_payload = {
            "$set": {
                "timestamp": datetime.datetime.utcnow() # อัปเดตเวลาล่าสุดเสมอ
            }
        }
        
        #  แยกว่าส่ง comment หรือ rating มา ---
        #    ถ้ามี 'comment' ส่งมา (และไม่ใช่ null) ให้เพิ่มเข้าไปใน $set
        if 'comment' in data and data['comment'] is not None:
            update_payload["$set"]["comment"] = data.get('comment')
            
        #    ถ้ามี 'rating' ส่งมา (และไม่ใช่ null) ให้เพิ่มเข้าไปใน $set
        if 'rating' in data and data['rating'] is not None:
            update_payload["$set"]["rating"] = data.get('rating')
        
        feedbacks_collection.update_one(
            query_filter, 
            update_payload, 
            upsert=True
        )
        
        return jsonify({'message': 'Feedback received successfully'}), 201
        
    except Exception as e:
        return jsonify({'error': f'Failed to save feedback: {str(e)}'}), 500
    
#----------------------------------RUN THE APP
if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)

    #if os.environ.get("FLASK_ENV") == "development":
    #port = int(os.environ.get("PORT", 5000))
    #debug_mode = os.environ.get("FLASK_ENV") == "development"
    #app.run(debug=debug_mode, host="0.0.0.0", port=port)
    #app.run(debug=True, host="0.0.0.0", port=5000)
        