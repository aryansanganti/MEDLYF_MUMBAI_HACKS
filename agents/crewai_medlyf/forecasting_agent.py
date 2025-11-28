import os
import time
import schedule
import pandas as pd
import joblib
import certifi
import threading  # <--- NEW: Needed to run scheduler + API together
from flask import Flask, jsonify, request # <--- NEW: Flask imports
from datetime import datetime
from pymongo import MongoClient
from huggingface_hub import snapshot_download
from prophet import Prophet

# ============================================
# 1. FLASK SETUP
# ============================================
app = Flask(__name__)

# ============================================
# 2. CONFIGURATION
# ============================================
MONGO_URI = "mongodb+srv://aryansanganti_db_user:Aryan123@medlyf.9nmqmhs.mongodb.net/?appName=Medlyf"
DB_NAME = "test"
COLLECTION = "predictions"
CSV_FILE = "mumbai_disease_outbreaks_2020_2024.csv"

REPO_ID = "manubhavsar/mumbai-forecast-models"
LOCAL_MODELS = "./models"

# ============================================
# 3. MODEL LOADER
# ============================================
def load_models():
    """Downloads and loads models into memory once."""
    print("📥 Checking models...")
    os.makedirs(LOCAL_MODELS, exist_ok=True)
    
    # Only download if folder is empty
    if not os.listdir(LOCAL_MODELS):
        print("   Downloading from Hugging Face...")
        snapshot_download(repo_id=REPO_ID, repo_type="model", local_dir=LOCAL_MODELS)
    
    print("   Loading Random Forest & Prophet models...")
    clf = joblib.load(os.path.join(LOCAL_MODELS, "severity_rf.joblib"))
    le = joblib.load(os.path.join(LOCAL_MODELS, "label_encoder.joblib"))
    
    prophet_models = {}
    for fname in os.listdir(LOCAL_MODELS):
        if fname.startswith("prophet_") and fname.endswith(".pkl"):
            key = fname.replace("prophet_", "").replace(".pkl", "").replace("_", " ").replace("-", " ").lower()
            prophet_models[key] = joblib.load(os.path.join(LOCAL_MODELS, fname))
            
    return clf, le, prophet_models

# Load Global Models Once
print("🚀 Initializing MedLyf Engine...")
RF_MODEL, LABEL_ENCODER, PROPHET_MODELS = load_models()
print(f"   ✅ Models Loaded: {list(PROPHET_MODELS.keys())}")

# ============================================
# 4. ANALYSIS LOGIC
# ============================================
def analyze_disease(disease_name, df):
    """Runs forecast & severity check for a single disease."""
    
    # --- Filter Data ---
    clean_name = disease_name.lower().replace("/", " ").replace("-", " ")
    
    if 'disease' in df.columns:
        df['disease_clean'] = df['disease'].astype(str).str.lower().str.replace("/", " ").str.replace("-", " ")
        disease_df = df[df['disease_clean'] == clean_name].copy()
    else:
        return None

    if disease_df.empty: return None

    # --- Prepare Time Series ---
    try:
        if 'year' in disease_df.columns and 'month' in disease_df.columns:
            try:
                disease_df['ds'] = pd.to_datetime(disease_df['year'].astype(str) + '-' + disease_df['month'], format='%Y-%b')
            except:
                disease_df['ds'] = pd.to_datetime(disease_df['year'].astype(str) + '-' + disease_df['month'], format='%Y-%B')
        elif 'date' in disease_df.columns:
            disease_df['ds'] = pd.to_datetime(disease_df['date'])
        
        target_col = next((c for c in ['reported_cases', 'cases', 'count', 'y'] if c in disease_df.columns), None)
        if not target_col: return None
        
        disease_df = disease_df.rename(columns={target_col: 'y'})
        disease_df = disease_df.groupby(pd.Grouper(key='ds', freq='MS')).sum().reset_index()
    except:
        return None

    # --- Prophet Forecast ---
    model = PROPHET_MODELS.get(clean_name)
    if not model:
        # Fuzzy match attempt
        model = next((v for k, v in PROPHET_MODELS.items() if k in clean_name), None)
    
    if not model: 
        return {"error": f"No AI model for {disease_name}"}

    try:
        future = model.make_future_dataframe(periods=1, freq="MS")
        fcst = model.predict(future)
        next_row = fcst.iloc[-1]
        predicted_cases = int(next_row["yhat"])
        pred_date = next_row["ds"].strftime("%Y-%m-%d")
    except:
        return {"error": "Forecast math failed"}

    # --- Random Forest Severity ---
    try:
        last_real = disease_df.sort_values("ds").iloc[-1]
        features = pd.DataFrame([[
            last_real["y"], last_real["y"], last_real["y"], 
            last_real["y"], 0, next_row['ds'].month
        ]], columns=['lag_1','lag_2','lag_3','roll_mean_3','roll_std_3','month_num'])
        
        severity_code = RF_MODEL.predict(features)[0]
        severity = LABEL_ENCODER.inverse_transform([severity_code])[0]
        confidence = float(RF_MODEL.predict_proba(features)[0].max())
    except:
        severity = "Unknown"
        confidence = 0.0

    # --- Result Package ---
    return {
        "disease": disease_name,
        "predicted_date": pred_date,
        "predicted_cases": predicted_cases,
        "severity": severity,
        "confidence": round(confidence, 3),
        "ai_analysis": f"Forecast: {predicted_cases} cases expected by {pred_date}. Risk: {severity}."
    }

# ============================================
# 5. DATABASE SAVER
# ============================================
def save_to_mongo(data):
    try:
        client = MongoClient(MONGO_URI, tlsCAFile=certifi.where())
        db = client[DB_NAME]
        col = db[COLLECTION]
        data['created_at'] = datetime.now()
        col.insert_one(data)
        print(f"   💾 Saved {data['disease']} to MongoDB.")
    except Exception as e:
        print(f"   ❌ MongoDB Error: {e}")

# ============================================
# 6. DAILY JOB
# ============================================
def run_daily_scan():
    print(f"\n⏰ Starting Daily Analysis: {datetime.now()}")
    
    try:
        df = pd.read_csv(CSV_FILE)
        df.columns = [c.lower().strip() for c in df.columns]
        diseases = df['disease'].unique().tolist()
    except Exception as e:
        print(f"❌ Could not read CSV: {e}")
        return

    print(f"🔍 Analyzing {len(diseases)} diseases...")
    
    for disease in diseases:
        result = analyze_disease(disease, df)
        
        if result and "error" not in result:
            print(f"   ✅ {disease}: {result['predicted_cases']} cases ({result['severity']})")
            save_to_mongo(result)
        elif result and "error" in result:
            print(f"   ⚠️ {disease}: {result['error']}")

    print("✅ Daily Scan Complete.\n")

# ============================================
# 7. FLASK API ENDPOINTS (NEW!)
# ============================================

@app.route('/', methods=['GET'])
def health_check():
    return jsonify({"status": "MedLyf API Online", "models_loaded": len(PROPHET_MODELS)})

@app.route('/predict', methods=['GET'])
def predict_disease():
    """
    API Endpoint: Get a forecast for a specific disease.
    Usage: GET /predict?disease=Malaria
    """
    disease_name = request.args.get('disease')
    if not disease_name:
        return jsonify({"error": "Please provide a disease parameter. Example: /predict?disease=Malaria"}), 400

    try:
        df = pd.read_csv(CSV_FILE)
        df.columns = [c.lower().strip() for c in df.columns]
    except Exception as e:
        return jsonify({"error": f"Failed to load CSV: {str(e)}"}), 500

    result = analyze_disease(disease_name, df)
    
    if not result:
        return jsonify({"error": "Disease not found or analysis failed"}), 404
    
    if "error" in result:
        return jsonify(result), 400

    # Optional: Save API requests to DB too?
    # save_to_mongo(result) 
    
    return jsonify(result)

@app.route('/trigger-scan', methods=['POST'])
def trigger_scan():
    """Manually trigger the daily scan via API"""
    thread = threading.Thread(target=run_daily_scan)
    thread.start()
    return jsonify({"message": "Daily scan triggered in background."})

# ============================================
# 8. THREADING & EXECUTION
# ============================================
def run_scheduler():
    """Runs the schedule loop in a background thread"""
    print("⏳ Scheduler active in background.")
    schedule.every(24).minutes.do(run_daily_scan)
    while True:
        schedule.run_pending()
        time.sleep(1)

if __name__ == "__main__":
    # 1. Start the Scheduler in a separate thread
    scheduler_thread = threading.Thread(target=run_scheduler)
    scheduler_thread.daemon = True # Ensures thread dies when app closes
    scheduler_thread.start()

    # 2. Start the Flask App
    print("🌍 Starting Flask API on port 5001...")
    app.run(host='0.0.0.0', port=5001, debug=False)