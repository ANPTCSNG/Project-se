'''from fastapi import FastAPI
from pydantic import BaseModel
import joblib
import numpy as np
import pandas as pd

# โหลดโมเดล
model = joblib.load("model.pkl")

# โหลด feature columns ที่ใช้ตอนเทรน
# (เอามาจาก X_train.columns)
feature_columns = joblib.load("feature_columns.pkl")

# สร้าง FastAPI app
app = FastAPI()

# กำหนด schema สำหรับ input
class HouseFeatures(BaseModel):
    LotArea: float
    OverallQual: int
    YearBuilt: int

@app.post("/predict")
def predict_price(features: HouseFeatures):
    # สร้าง DataFrame เปล่า ที่มีคอลัมน์เหมือน X_train
    X_new = pd.DataFrame(0, index=[0], columns=feature_columns)

    # ใส่ค่าที่ผู้ใช้กรอกมา
    X_new['LotArea'] = features.LotArea
    X_new['OverallQual'] = features.OverallQual
    X_new['YearBuilt'] = features.YearBuilt

    # ทำนาย
    pred_price = model.predict(X_new)[0]

    return {"predicted_price": round(float(pred_price), 2)}// '''

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Dict, Any, List
import joblib
import numpy as np
import pandas as pd
import bcrypt
from pymongo import MongoClient
from datetime import datetime
from bson.objectid import ObjectId

# ----------------------------------------------------------------------
# 1. CONFIGURATION: ML MODEL & MONGODB SETUP
# ----------------------------------------------------------------------

# NOTE: ในการใช้งานจริง ให้สร้างไฟล์ model.pkl และ feature_columns.pkl ก่อน
# Mocking the ML model loading for demonstration
try:
    model = joblib.load("model.pkl")
    feature_columns = joblib.load("feature_columns.pkl")
    print("ML model and feature columns loaded successfully.")
except FileNotFoundError:
    print("WARNING: model.pkl or feature_columns.pkl not found. Using mock objects.")
    
    # Mocking if files are not available, so the API can still run
    class MockModel:
        def predict(self, X):
            # Returns a mock prediction based on the sum of inputs + a constant
            return np.array([150000 + X.iloc[0]['LotArea'] * 0.1 + X.iloc[0]['OverallQual'] * 10000])

    model = MockModel()
    feature_columns = ['LotArea', 'OverallQual', 'YearBuilt'] # Mock features

# --- MongoDB Setup ---
# **สำคัญ:** กรุณาแทนที่ MONGO_URI ด้วย Connection String ของ MongoDB Atlas หรือ Local
MONGO_URI = "mongodb+srv://anapatch_db_user:BlaMuXAJulXku0hx@cluster1.gqsi4uc.mongodb.net/?retryWrites=true&w=majority&appName=Cluster1"
DB_NAME = "house_price_app"


try:
    client = MongoClient("mongodb+srv://anapatch_db_user:BlaMuXAJulXku0hx@cluster1.gqsi4uc.mongodb.net/?retryWrites=true&w=majority&appName=Cluster1")
    db = client["house_price_app"]
    users = db["users"]
    predictions_collection = db['predictions']
    # สร้าง index เพื่อให้ username ไม่ซ้ำกัน (unique)
    users.create_index([("username", 1)], unique=True)
    print("MongoDB connected and collections initialized.")
except Exception as e:
    print(f"ERROR: Could not connect to MongoDB. Check your MONGO_URI. {e}")
    # ใน Production ควรให้แอปพลิเคชันหยุดทำงานถ้าต่อ DB ไม่ได้
    
# ----------------------------------------------------------------------
# 2. SCHEMAS: Pydantic Models
# ----------------------------------------------------------------------

class HouseFeatures(BaseModel):
    """Schema สำหรับข้อมูลคุณสมบัติบ้านที่ใช้ในการทำนาย"""
    user_id: str # ID ของผู้ใช้ที่เข้าสู่ระบบ
    LotArea: float
    OverallQual: int
    YearBuilt: int

class UserRegistration(BaseModel):
    """Schema สำหรับการลงทะเบียนผู้ใช้ใหม่"""
    username: str
    password: str
    email: str

class UserLogin(BaseModel):
    """Schema สำหรับการเข้าสู่ระบบ"""
    username: str
    password: str

# ----------------------------------------------------------------------
# 3. HELPER FUNCTIONS: AUTHENTICATION
# ----------------------------------------------------------------------

def hash_password(password: str) -> bytes:
    """เข้ารหัสรหัสผ่านด้วย bcrypt"""
    password_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password_bytes, salt)

def verify_password(plain_password: str, hashed_password: bytes) -> bool:
    """ตรวจสอบรหัสผ่านที่ผู้ใช้ป้อนกับรหัสผ่านที่ถูกเข้ารหัสใน DB"""
    plain_password_bytes = plain_password.encode('utf-8')
    return bcrypt.checkpw(plain_password_bytes, hashed_password)

# ----------------------------------------------------------------------
# 4. FASTAPI APP & ENDPOINTS
# ----------------------------------------------------------------------

app = FastAPI(title="House Price Predictor API with MongoDB")

# --- AUTH ENDPOINTS ---

@app.post("/register")
def register(user_data: UserRegistration):
    """Endpoint สำหรับการลงทะเบียนผู้ใช้ใหม่"""
    try:
        # 1. เช็คว่ามี username นี้อยู่แล้วหรือไม่
        if users.find_one({"username": user_data.username}):
            raise HTTPException(status_code=400, detail="Username already exists")

        # 2. เข้ารหัสรหัสผ่าน
        hashed_password = hash_password(user_data.password)

        # 3. บันทึกข้อมูลผู้ใช้ลง MongoDB
        user_doc = {
            "username": user_data.username,
            "password": hashed_password,
            "email": user_data.email,
            "created_at": datetime.utcnow()
        }
        users.insert_one(user_doc)
        
        return {"message": "User registered successfully", "username": user_data.username}
    except HTTPException:
        raise
    except Exception as e:
        # Handle unique index error for username
        if "duplicate key error" in str(e):
             raise HTTPException(status_code=400, detail="Username already exists (Duplicate Key)")
        raise HTTPException(status_code=500, detail=f"Registration failed: {e}")


@app.post("/login")
def login(login_data: UserLogin):
    """Endpoint สำหรับการเข้าสู่ระบบ"""
    user = users.find_one({"username": login_data.username})
    
    if not user:
        raise HTTPException(status_code=401, detail="Invalid username or password")

    # ตรวจสอบรหัสผ่าน
    if verify_password(login_data.password, user['password']):
        # ในแอปจริง ต้องสร้าง JWT Token ที่นี่
        return {
            "message": "Login successful", 
            "user_id": str(user['_id']), # คืนค่า MongoDB ObjectId เป็น string สำหรับใช้ในการทำนาย
            "username": user['username']
        }
    else:
        raise HTTPException(status_code=401, detail="Invalid username or password")

# --- PREDICTION ENDPOINT ---

@app.post("/predict")
def predict_price(features: HouseFeatures):
    """
    Endpoint สำหรับการทำนายราคาบ้าน
    ต้องใช้ user_id ที่ได้จากการ Login มายืนยันสิทธิ์และบันทึก Log
    """
    try:
        # 1. ตรวจสอบ User ID (จำลองการตรวจสอบสิทธิ์)
        user_id_obj = ObjectId(features.user_id)
        user_check = users.find_one({"_id": user_id_obj})
        if not user_check:
            raise HTTPException(status_code=404, detail="User ID not found or invalid.")

        # 2. เตรียมข้อมูลสำหรับโมเดล
        # สร้าง DataFrame เปล่า ที่มีคอลัมน์เหมือน X_train
        X_new = pd.DataFrame(0, index=[0], columns=feature_columns)

        # ใส่ค่าที่ผู้ใช้กรอกมา
        X_new['LotArea'] = features.LotArea
        X_new['OverallQual'] = features.OverallQual
        X_new['YearBuilt'] = features.YearBuilt
        
        # NOTE: หากมี Feature Engineering หรือ One-Hot Encoding ต้องทำที่นี่ด้วย

        # 3. ทำนาย
        pred_price = model.predict(X_new)[0]
        rounded_price = round(float(pred_price), 2)
        
        # 4. บันทึก Log การทำนายลง MongoDB
        prediction_log = {
            "user_id": user_id_obj,
            "input_features": features.dict(),
            "predicted_price": rounded_price,
            "timestamp": datetime.utcnow()
        }
        predictions_collection.insert_one(prediction_log)

        return {"predicted_price": rounded_price}

    except HTTPException:
        raise
    except Exception as e:
        # Handle cases where ObjectId conversion fails or prediction errors occur
        raise HTTPException(status_code=500, detail=f"Prediction or Logging failed: {e}")

# --- HISTORY ENDPOINT ---

@app.get("/history/{user_id}")
def get_history(user_id: str):
    """Endpoint สำหรับดึงประวัติการทำนายของ User"""
    try:
        user_id_obj = ObjectId(user_id)
        
        # ค้นหาประวัติการทำนายทั้งหมดของผู้ใช้
        history_cursor = predictions_collection.find({"user_id": user_id_obj}).sort("timestamp", -1)
        
        history_list = []
        for doc in history_cursor:
            # แปลง ObjectId ให้เป็น string ก่อนส่งกลับ
            doc['_id'] = str(doc['_id'])
            doc['user_id'] = str(doc['user_id'])
            doc['timestamp'] = doc['timestamp'].isoformat() # แปลง datetime เป็น string
            history_list.append(doc)
            
        return {"user_id": user_id, "history": history_list}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve history: {e}")

# วิธีรัน: uvicorn api:app --reload


