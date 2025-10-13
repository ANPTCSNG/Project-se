from flask import Flask, request, jsonify
from flask_bcrypt import Bcrypt
from flask_cors import CORS
from pymongo import MongoClient
import joblib
import numpy as np

app = Flask(__name__)
bcrypt = Bcrypt(app)
CORS(app)

# -------------------
# Connect MongoDB Atlas
# -------------------

client = MongoClient("mongodb+srv://anapatch_db_user:BlaMuXAJulXku0hx@cluster1.gqsi4uc.mongodb.net/?retryWrites=true&w=majority&appName=Cluster1")
db = client["house_price_app"]
users = db["users"]
try:
    # จะโยน exception ถ้า connect ไม่ได้
    #client = MongoClient("mongodb+srv://anapatch_db_user:BlaMuXAJulXku0hxpy@cluster1.gqsi4uc.mongodb.net/?retryWrites=true&w=majority&appName=Cluster1")
    print("✅ Connected to MongoDB")
    print("📦 Databases:", client.list_database_names())
except Exception as e:
    print("❌ MongoDB connection failed:", e)
   


# -------------------
# โหลดโมเดล Machine Learning
# -------------------
model = joblib.load("model.pkl")

# -------------------
# Register
# -------------------
@app.route('/signup', methods=['POST'])
def signup():
    data = request.json
    username = data['username']
    password = data['password']

    if users.find_one({'username': username}):
        return jsonify({'error': 'User already exists'}), 400

    hashed_pw = bcrypt.generate_password_hash(password).decode('utf-8')
    users.insert_one({'username': username, 'password': hashed_pw})
    return jsonify({'message': 'Register success'})

# -------------------
# Login
# -------------------
@app.route('/login', methods=['POST'])
def login():
    data = request.json
    username = data['username']
    password = data['password']

    user = users.find_one({'username': username})
    if user and bcrypt.check_password_hash(user['password'], password):
        return jsonify({'message': 'Login success'})
    return jsonify({'error': 'Invalid username or password'}), 401

# -------------------
# ทำนายราคาบ้าน
# -------------------
@app.route('/predict', methods=['POST'])
def predict():
    data = request.json
    features = np.array([[
        data['area'], 
        data['bedrooms'], 
        data['bathrooms'], 
        data['location_score']
    ]])
    prediction = model.predict(features)[0]
    return jsonify({'predicted_price': float(prediction)})

if __name__ == '__main__':
    app.run(debug=True,host="127.0.0.1", port=5000)

#python app.py
