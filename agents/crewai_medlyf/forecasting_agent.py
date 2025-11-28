import os
import time
import schedule
import pandas as pd
import joblib
import certifi
from datetime import datetime
from pymongo import MongoClient
from huggingface_hub import snapshot_download
from prophet import Prophet

# ============================================
# 1. CONFIGURATION
# ============================================
MONGO_URI = "mongodb+srv://aryansanganti_db_user:Aryan123@medlyf.9nmqmhs.mongodb.net/?appName=Medlyf"
DB_NAME = "test"
COLLECTION = "predictions"
CSV_FILE = "mumbai_disease_outbreaks_2020_2024.csv"

REPO_ID = "manubhavsar/mumbai-forecast-models"
LOCAL_MODELS = "./models"

# ============================================
# 2. MODEL LOADER (FIXED)
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
            # --- FIX: Normalize keys by replacing hyphens and underscores with spaces ---
            # Example: "prophet_covid-19.pkl" -> "covid 19"
            key = fname.replace("prophet_", "").replace(".pkl", "").replace("_", " ").replace("-", " ").lower()
            prophet_models[key] = joblib.load(os.path.join(LOCAL_MODELS, fname))
            
    return clf, le, prophet_models

# Load Global Models Once
print("🚀 Initializing MedLyf Engine...")
RF_MODEL, LABEL_ENCODER, PROPHET_MODELS = load_models()
print(f"   ✅ Models Loaded: {list(PROPHET_MODELS.keys())}")

# ============================================
# 3. ANALYSIS LOGIC
# ============================================
def analyze_disease(disease_name, df):
    """Runs forecast & severity check for a single disease."""
    
    # --- Filter Data ---
    # Normalize input name to match model keys (remove / and -)
    clean_name = disease_name.lower().replace("/", " ").replace("-", " ")
    
    if 'disease' in df.columns:
        # Create temp column for filtering
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
        # Debugging aid
        print(f"      [Debug] Could not find key '{clean_name}' in models.")
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
# 4. DATABASE SAVER
# ============================================
def save_to_mongo(data):
    try:
        # Added certifi for Mac SSL issues
        client = MongoClient(MONGO_URI, tlsCAFile=certifi.where())
        db = client[DB_NAME]
        col = db[COLLECTION]
        data['created_at'] = datetime.now()
        col.insert_one(data)
        print(f"   💾 Saved {data['disease']} to MongoDB.")
    except Exception as e:
        print(f"   ❌ MongoDB Error: {e}")

# ============================================
# 5. THE MAIN JOB
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
# 6. EXECUTION LOOP
# ============================================
if __name__ == "__main__":
    print("🤖 MedLyf Automation Started.")
    
    # 1. Run immediately
    run_daily_scan()
    
    # 2. Schedule for every 24 hours
    schedule.every(24).minutes.do(run_daily_scan)

    print("⏳ Scheduler active. Running every 24 hours. (Ctrl+C to stop)")
    
    while True:
        schedule.run_pending()
        time.sleep(1)