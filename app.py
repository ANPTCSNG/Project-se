from flask import Flask, request, jsonify, render_template
from flask_bcrypt import Bcrypt
from flask_cors import CORS
from pymongo import MongoClient
from bson.objectid import ObjectId
import joblib
import pandas as pd
from datetime import datetime
import numpy as np

# APP & DB CONFIGURATION

app = Flask(__name__)
bcrypt = Bcrypt(app)
CORS(app)

# --- MongoDB Setup ---
MONGO_URI = "mongodb+srv://anapatch_db_user:BlaMuXAJulXku0hx@cluster1.gqsi4uc.mongodb.net/?retryWrites=true&w=majority&appName=Cluster1"
DB_NAME = "house_price_app"

try:
    client = MongoClient(MONGO_URI)
    db = client[DB_NAME]
    users_collection = db["users"]
    predictions_collection = db['predictions']
    users_collection.create_index([("username", 1)], unique=True)
    print("✅ Connected to MongoDB successfully.")
except Exception as e:
    print(f"❌ ERROR: Could not connect to MongoDB. {e}")


# 3. LOAD MACHINE LEARNING MODEL

try:
    model = joblib.load("ml_model/model.pkl")
    feature_columns = joblib.load("ml_model/feature_columns.pkl")
    print("✅ ML model and feature columns loaded successfully.")
except FileNotFoundError:
    print("❌ ERROR: model.pkl or feature_columns.pkl not found.")
    model = None
    feature_columns = []

#  WEB PAGE ROUTES (ส่วนสำหรับเปิดหน้าเว็บ HTML)


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
    return render_template('results.html')

#  API ENDPOINTS (ส่วนสำหรับรับส่งข้อมูล)

# --- AUTHENTICATION API ---
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
            "created_at": datetime.utcnow()
        }
        users_collection.insert_one(user_doc)
        return jsonify({'message': 'Register success'}), 201
    
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
                'username': user['username']
            }), 200
        else:
            return jsonify({'error': 'Invalid username or password'}), 401
    except Exception as e:
        return jsonify({'error': f'Login failed: {e}'}), 500

# --- PREDICTION API ---
@app.route('/api/predict', methods=['POST'])
@app.route('/api/predict', methods=['POST'])

def predict():
    """Endpoint สำหรับการทำนายราคาบ้าน และบันทึกประวัติ"""
    if not model:
        return jsonify({'error': 'ML model is not loaded.'}), 503

    try:
        data = request.get_json()
        user_id = data.get('user_id')
        if not user_id:
            return jsonify({'error': 'User ID is required'}), 400
            
        user_id_obj = ObjectId(user_id)
        if not users_collection.find_one({"_id": user_id_obj}):
            return jsonify({'error': 'User ID not found.'}), 404

        X_new = pd.DataFrame(0, index=[0], columns=feature_columns)
        for col in feature_columns:
             if col in data:
                 X_new[col] = data[col]
        
        pred_price = model.predict(X_new)[0]
        rounded_price = round(float(pred_price), 2)
        
        prediction_log = {
            "user_id": user_id_obj,
            "input_features": {key: data[key] for key in feature_columns if key in data},
            "predicted_price": rounded_price,
            "timestamp": datetime.utcnow()
        }
        predictions_collection.insert_one(prediction_log)
        return jsonify({"predicted_price": rounded_price}), 200
    except Exception as e:
        return jsonify({'error': f'Prediction failed: {e}'}), 500


#RUN THE APP

if __name__ == '__main__':
    app.run(debug=True, host="0.0.0.0", port=5000)
    