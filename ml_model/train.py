import pandas as pd
import joblib
from sklearn.linear_model import LinearRegression
import os

# --- กำหนด Path ที่สำคัญ ---
# __file__ คือ path ของไฟล์ train.py เอง
# os.path.dirname(...) จะได้ path ของโฟลเดอร์ที่ไฟล์นี้อยู่ (ml_model)
MODEL_DIR = os.path.dirname(__file__) 
# สร้าง path สำหรับบันทึกโมเดลและ features ลงในโฟลเดอร์ ml_model
MODEL_PATH = os.path.join(MODEL_DIR, "model.pkl")
FEATURES_PATH = os.path.join(MODEL_DIR, "feature_columns.pkl")


# --- โหลดไฟล์ข้อมูล (แก้ไขตรงนี้!) ---
# ระบุให้ชัดเจนว่าไฟล์ข้อมูลอยู่ในโฟลเดอร์ 'data'
DATA_PATH = "data/train_cleaned.csv" 
print(f"⏳ Loading data from: {DATA_PATH}")
try:
    train_cleaned = pd.read_csv(DATA_PATH)
    print("✅ Data loaded successfully.")
except FileNotFoundError:
    print(f"❌ ERROR: File not found at '{DATA_PATH}'")
    print("👉 Please make sure you are running this script from the main 'Project' folder.")
    exit() # ออกจากโปรแกรมถ้าหาไฟล์ไม่เจอ



print("⏳ Training model...")
y_train = train_cleaned['SalePrice']
X_train = train_cleaned.drop(columns=['Id','SalePrice'])
X_train = pd.get_dummies(X_train)


# --- บันทึก Feature Columns และโมเดล ---
# บันทึก Feature Columns
joblib.dump(X_train.columns, FEATURES_PATH)

# เทรนโมเดล
model = LinearRegression()
model.fit(X_train, y_train)

# บันทึกโมเดล
joblib.dump(model, MODEL_PATH)

print("-" * 30)
print(f"✅ Model saved to: {MODEL_PATH}")
print(f"✅ Features saved to: {FEATURES_PATH}")