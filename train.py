import pandas as pd
import joblib
from sklearn.linear_model import LinearRegression

# โหลดไฟล์ train
train_cleaned = pd.read_csv("train_cleaned.csv")

# แยก features / target
y_train = train_cleaned['SalePrice']
X_train = train_cleaned.drop(columns=['Id','SalePrice'])

# One-hot encoding
X_train = pd.get_dummies(X_train)

# เซฟ feature columns
joblib.dump(X_train.columns, "feature_columns.pkl")

# เทรน Linear Regression
model = LinearRegression()
model.fit(X_train, y_train)

# เซฟโมเดล
joblib.dump(model, "model.pkl")
print("✅ model.pkl + feature_columns.pkl saved")

#คำสั่ง powershell : python train.py
