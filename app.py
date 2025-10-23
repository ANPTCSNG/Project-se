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

# ------------------------------------------APP & DB CONFIGURATION

app = Flask(__name__)
bcrypt = Bcrypt(app)
CORS(app)
# ---------------------------------------------- MongoDB Setup ---
MONGO_URI = "mongodb+srv://anapatch_db_user:BlaMuXAJulXku0hx@cluster1.gqsi4uc.mongodb.net/?retryWrites=true&w=majority&appName=Cluster1"
DB_NAME = "house_price_app"

try:
    client = MongoClient(MONGO_URI)
    db = client[DB_NAME]
    users_collection = db["users"]
    predictions_collection = db['predictions']
    feedbacks_collection = db['feedbacks']
    users_collection.create_index([("username", 1)], unique=True)
    print("✅ Connected to MongoDB successfully.")
except Exception as e:
    print(f"❌ ERROR: Could not connect to MongoDB. {e}")


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
    return render_template('login.html')

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
@app.route('/api/predict', methods=['POST'])
def predict():
    # --- เช็คว่าโมเดลโหลดเรียบร้อย ---
    if price_model is None or imputer_model is None or not reverse_models:
        return jsonify({'error': 'Model is not loaded'}), 500

    data = request.get_json()
    if data is None:
        return jsonify({'error': 'No input data provided'}), 400

    # --- รับ input ---
    feature_data = data.get('features')  # dict ของ 9 features
    price_range = data.get('price_range')  # string เช่น "100k-200k"
    if not feature_data:
        return jsonify({'error': 'No features provided'}), 400

    # --- เตรียม input DataFrame ---
    input_dict = {}
    for col in TRAINED_COLUMNS:
        val = feature_data.get(col)
        if val is None or val == "":
            input_dict[col] = np.nan
        else:
            if col == "Neighborhood":
                input_dict[col] = neighborhood_to_num.get(val, np.nan)
            else:
                try:
                    input_dict[col] = float(val)
                except (ValueError, TypeError):
                    input_dict[col] = np.nan

    input_df = pd.DataFrame([input_dict], columns=TRAINED_COLUMNS)

    try:
        # --- เติมค่าที่หายด้วย Imputer ---
        filled_input = imputer_model.transform(input_df)
        filled_input = pd.DataFrame(filled_input, columns=TRAINED_COLUMNS)

        filled_input['Neighborhood'] = filled_input['Neighborhood'].astype(int)

        # --- ทำนายราคาบ้าน ---
        pred_price = price_model.predict(filled_input)[0]
        # --- ตรวจสอบช่วงราคา ---
        is_match = False
        if price_range:
            if price_range == "0-100000" and pred_price <= 100000:
                is_match = True
            elif price_range == "100001-200000" and 100000 <= pred_price <= 200000:
                is_match = True
            elif price_range == "200001-300000" and 200000 <= pred_price <= 300000:
                is_match = True
            elif price_range == "300001-400000" and 300000 <= pred_price <= 400000:
                is_match = True
            elif price_range == "400001-500000" and 400000<= pred_price <= 500000:
                is_match = True
            elif price_range == "500000+" and pred_price >= 500000:
                is_match = True

        # --- Reverse Prediction (ทำนาย feature จากราคา) ---
        guessed_features = {}
        for f in TRAINED_COLUMNS:
            if reverse_models.get(f):
                val = reverse_models[f].predict([[pred_price]])[0]
                if f in int_features:
                    val = int(round(val))
                if f == "Neighborhood":
                    val = num_to_neighborhood.get(int(round(val)), "Unknown")

                guessed_features[f] = val
        filled_reverse = pd.DataFrame([guessed_features])

        return jsonify({
            'predicted_price': pred_price,
            'matches_budget': is_match,
            'desired_range': price_range,
            'imputer_features': filled_input.to_dict(orient='records')[0],
            'reverse_features': filled_reverse.to_dict(orient='records')[0]
        })

    except Exception as e:
        return jsonify({'error': f'Prediction failed: {str(e)}'}), 500


        
# --- -----------------------------------------------FEEDBACK API ---
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
    except Exception as e:
        return jsonify({'error': f'Error converting user_id: {str(e)}'}), 500

    try:
        feedback_document = {
            "user_id": user_object_id, 
            "predicted_price": data.get('predicted_price'),
            "overall_qual": data.get('OverallQual'),
            "price_range": data.get('price_range'),
            "total_bsmt_sf": data.get('TotalBsmtSF'),
            "lot_area": data.get('LotArea'),
            "gr_liv_area": data.get('GrLivArea'),
            "garage_cars": data.get('GarageCars'),
            "fireplaces": data.get('Fireplaces'),
            "bedroom_abv_gr": data.get('BedroomAbvGr'),
            "full_bath": data.get('FullBath'),
            "neighborhood": data.get('Neighborhood'),
            "comment": data.get('comment'),
            "rating": data.get('rating'),
            "timestamp": datetime.datetime.utcnow() 
        }

        # ✅ แก้ไข: ใช้ตัวแปร 'feedbacks_collection' ที่เราสร้างไว้
        feedbacks_collection.insert_one(feedback_document)
        
        return jsonify({'message': 'Feedback received successfully'}), 201
        
    except Exception as e:
        return jsonify({'error': f'Failed to save feedback: {str(e)}'}), 500
    
#----------------------------------RUN THE APP
if __name__ == '__main__':
    app.run(debug=True, host="0.0.0.0", port=5000)