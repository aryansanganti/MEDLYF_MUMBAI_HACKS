import time
import schedule
import json
import os
from datetime import datetime
from pymongo import MongoClient
from forecasting_agent import run_forecast  # Import your agent

# ==========================================
# 1. MONGODB CONFIGURATION
# ==========================================

MONGO_URI = "mongodb+srv://aryansanganti_db_user:Aryan123@medlyf.9nmqmhs.mongodb.net/?appName=Medlyf" 
DB_NAME = "test"
COLLECTION_NAME = "predictions"

def get_collection():
    """Connects to the 'test' database and returns the 'predictions' collection."""
    try:
        client = MongoClient(MONGO_URI)
        db = client[DB_NAME]
        return db[COLLECTION_NAME]
    except Exception as e:
        print(f"❌ Connection Error: {e}")
        return None

def save_prediction(data):
    """Inserts a single prediction result into 'predictions' collection."""
    collection = get_collection()
    
    if collection is not None:
        try:
            # Add a timestamp so you know when the agent ran
            data['created_at'] = datetime.now()
            
            # Insert the document
            result = collection.insert_one(data)
            print(f"💾 Saved {data.get('disease', 'Unknown')} to 'test.predictions' (ID: {result.inserted_id})")
        except Exception as e:
            print(f"❌ Insert Error: {e}")

# ==========================================
# 2. THE 24-HOUR JOB
# ==========================================

def daily_job():
    print(f"\n⏰ Starting Daily Forecast Job: {datetime.now()}")
    
    # 1. Run the Agent for ALL diseases in the CSV
    try:
        # Returns a list of CrewOutput objects
        all_results = run_forecast("mumbai_disease_outbreaks_2020_2024.csv", disease=None)
    except Exception as e:
        print(f"❌ Error running agent: {e}")
        return

    # 2. Loop through the list of results and save them
    if isinstance(all_results, list):
        for result in all_results:
            
            # --- FIX: HANDLE CREWOUTPUT OBJECT ---
            # CrewAI returns an object, so we must access .raw property first
            if hasattr(result, 'raw'):
                content_str = result.raw
            else:
                content_str = str(result)
            
            # 3. Parse the string into a Dictionary (JSON)
            try:
                # Clean up markdown (e.g., ```json ... ```)
                clean_json = content_str.replace("```json", "").replace("```", "").strip()
                result_dict = json.loads(clean_json)
            except Exception as e:
                # Fallback: If AI didn't return perfect JSON, save the raw text
                print(f"⚠️ Could not parse JSON. Saving raw output.")
                result_dict = {
                    "raw_output": content_str, 
                    "disease": "Unknown_Parse_Error"
                }

            # 4. Save to MongoDB
            save_prediction(result_dict)
            
    else:
        print(f"⚠️ Warning: Agent did not return a list. Got: {type(all_results)}")

    print("✅ Job Complete. Waiting for next run.\n")

# ==========================================
# 3. SCHEDULER EXECUTION
# ==========================================

if __name__ == "__main__":
    print(f"🚀 MedLyf Scheduler Started.")
    print(f"   Database: {DB_NAME}")
    print(f"   Collection: {COLLECTION_NAME}")
    
    # Run once immediately to populate the DB right now
    daily_job()
    
    # Schedule to run every 24 hours
    schedule.every(24).hours.do(daily_job)
    
    print("⏳ Scheduler active. Press Ctrl+C to stop.")
    
    while True:
        schedule.run_pending()
        time.sleep(1)