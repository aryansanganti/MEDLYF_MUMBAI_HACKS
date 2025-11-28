# agents/crewai_medlyf/crew.py
"""
CrewAI-style crew for MedLyf:
Agents: Ingestion watcher (optional), Forecasting, Optimization, Alerting, Logistics.

This crew uses Redis pub/sub for event transport and CrewAI classes for semantics.
Run: python crew.py
"""

import os
import asyncio
import json
from datetime import datetime, timedelta
from pathlib import Path
import joblib
import pandas as pd
import aiohttp
import redis.asyncio as aioredis

# Try to import CrewAI primitives for semantics (not strictly required for functionality)
try:
    from crewai import Agent, Crew  # for type/semantics — optional
except Exception:
    Agent = object
    Crew = object

# Config
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
CHANNEL = os.getenv("REDIS_CHANNEL", "medlyf_events")
SERVER_URL = os.getenv("SERVER_URL", "http://host.docker.internal:5001")  # update for Docker / local
MODEL_DIR = Path.cwd() / "models"
MODEL_DIR.mkdir(parents=True, exist_ok=True)
THRESHOLD = float(os.getenv("ALERT_THRESHOLD", "80"))  # occupancy threshold for alerting

# Redis client
r = aioredis.from_url(REDIS_URL, decode_responses=True)

# ------------------------------------------------------------
# Utility functions
# ------------------------------------------------------------
def now():
    return datetime.utcnow().isoformat() + "Z"

async def post_to_server(path: str, json_payload: dict):
    url = SERVER_URL.rstrip("/") + "/" + path.lstrip("/")
    async with aiohttp.ClientSession() as sess:
        try:
            async with sess.post(url, json=json_payload, timeout=20) as resp:
                text = await resp.text()
                return resp.status, text
        except Exception as e:
            return 500, str(e)

# ------------------------------------------------------------
# Forecasting agent
# ------------------------------------------------------------
async def simple_moving_average_forecast(df: pd.DataFrame, periods=5):
    # fallback predictor: mean of last 7 days
    last_mean = df['y'].tail(7).mean() if len(df) >= 7 else df['y'].mean()
    preds = []
    last_ds = pd.to_datetime(df['ds']).max()
    for i in range(1, periods + 1):
        ds = (last_ds + pd.Timedelta(days=i)).strftime("%Y-%m-%d")
        preds.append({"ds": ds, "yhat": float(last_mean), "yhat_lower": float(last_mean*0.95), "yhat_upper": float(last_mean*1.05)})
    return preds

async def forecast_agent(payload: dict):
    """
    payload: { hospital_id, file_path }
    Trains (or loads) model, predicts next 5 days, publishes prediction_ready event.
    """
    hospital_id = payload.get("hospital_id")
    file_path = payload.get("file_path")
    if not hospital_id or not file_path:
        print("forecast_agent missing payload fields")
        return
    try:
        df = pd.read_csv(file_path, parse_dates=['ds'])
    except Exception as e:
        print("forecast_agent: could not read CSV", e)
        return

    preds = None
    model_meta = {}
    # Try Prophet if available and enough data
    if len(df) >= 10:
        try:
            from prophet import Prophet
            m = Prophet(daily_seasonality=True, weekly_seasonality=True)
            # Prophet expects columns ds,y
            m.fit(df[['ds', 'y']].rename(columns={'ds':'ds','y':'y'}))
            future = m.make_future_dataframe(periods=5)
            forecast = m.predict(future).tail(5)[['ds','yhat','yhat_lower','yhat_upper']]
            preds = forecast.to_dict(orient='records')
            joblib.dump(m, MODEL_DIR / f"{hospital_id}_prophet.joblib")
            model_meta = {"model":"prophet", "trained_rows": len(df)}
        except Exception as e:
            print("Prophet failed or not installed, falling back. Error:", e)

    if preds is None:
        preds = await simple_moving_average_forecast(df, periods=5)
        model_meta = {"model":"moving_average", "trained_rows": len(df)}

    event = {
        "event_type": "prediction_ready",
        "ts": now(),
        "hospital_id": hospital_id,
        "predictions": preds,
        "model_meta": model_meta
    }
    await r.publish(CHANNEL, json.dumps(event))
    print(f"[ForecastAgent] published prediction_ready for {hospital_id}")

# ------------------------------------------------------------
# Optimization agent (resource redistribution)
# ------------------------------------------------------------
async def optimization_agent(payload: dict):
    """
    Simple heuristic optimizer: given predictions, decide allocations.
    Input payload: prediction_ready event (hospital_id + predictions)
    Output: publishes 'optimized_plan' event with recommended actions.
    """
    hospital_id = payload.get("hospital_id")
    preds = payload.get("predictions", [])
    # Example: if predicted yhat grows by > 20% compared to last known day -> request extra resources
    # For simplicity compute delta between last day and max(predictions)
    if not preds:
        return
    yvals = [p.get("yhat", 0) for p in preds]
    max_pred = max(yvals)
    # naive: read last known occupancy from predictions list's first element or fetch actuals from DB
    last_pred = yvals[0] if len(yvals)>0 else max_pred
    increase_pct = (max_pred - last_pred) / (last_pred + 1e-6) * 100.0
    plan = []
    if increase_pct > 20 or max_pred >= THRESHOLD:
        # simple rule: request N oxygen tankers based on shortfall
        shortfall = max(0, max_pred - THRESHOLD)
        tankers = max(1, int(shortfall // 10))  # naive bucket
        plan.append({"action": "request_tanker", "quantity": tankers, "reason": f"predicted increase {increase_pct:.1f}% or max {max_pred}"})
    else:
        plan.append({"action":"no_action", "reason":"predicted demand within threshold"})

    event = {
        "event_type": "optimized_plan",
        "ts": now(),
        "hospital_id": hospital_id,
        "plan": plan
    }
    await r.publish(CHANNEL, json.dumps(event))
    print(f"[OptimizationAgent] published optimized_plan for {hospital_id}, plan: {plan}")

# ------------------------------------------------------------
# Alerting agent
# ------------------------------------------------------------
async def send_alert_notification(hospital_id: str, message: str, recipients=None, severity="high"):
    # For hackathon: console print + publish alert_sent
    alert = {
        "event_type": "alert_sent",
        "ts": now(),
        "hospital_id": hospital_id,
        "message": message,
        "severity": severity,
        "recipients": recipients or []
    }
    await r.publish(CHANNEL, json.dumps(alert))
    print(f"[AlertingAgent] ALERT for {hospital_id}: {message}")

async def alerting_agent(payload: dict):
    """
    Listen for optimized_plan or prediction_ready events; send alerts if necessary.
    """
    etype = payload.get("event_type", "")
    hospital_id = payload.get("hospital_id")
    if etype == "prediction_ready":
        # check prediction values
        preds = payload.get("predictions", [])
        for p in preds:
            yhat = p.get("yhat", 0)
            if yhat >= THRESHOLD:
                await send_alert_notification(hospital_id, f"Predicted occupancy {yhat} >= {THRESHOLD} on {p.get('ds')}", recipients=["admin@example.com"])
                return
    elif etype == "optimized_plan":
        plan = payload.get("plan", [])
        for action in plan:
            if action["action"] != "no_action":
                await send_alert_notification(hospital_id, f"Optimization recommends: {action}", recipients=["logistics@example.com"])
                return

# ------------------------------------------------------------
# Logistics agent — create a job in your server
# ------------------------------------------------------------
async def logistics_agent(payload: dict):
    """
    Create a job on your server when optimized_plan says request_tanker.
    """
    if payload.get("event_type") != "optimized_plan":
        return
    hospital_id = payload.get("hospital_id")
    plan = payload.get("plan", [])
    for action in plan:
        if action.get("action") == "request_tanker":
            qty = action.get("quantity", 1)
            job_payload = {
                "type": "oxygen_delivery",
                "hospitalId": hospital_id,
                "quantity": qty,
                "priority": "high",
                "notes": action.get("reason", "")
            }
            status, text = await post_to_server("/api/jobs", job_payload)
            print(f"[LogisticsAgent] created job for {hospital_id}: status {status}, resp {text}")
            # publish job_created event for audit
            evt = {
                "event_type": "job_created",
                "ts": now(),
                "hospital_id": hospital_id,
                "job_payload": job_payload,
                "server_status": status
            }
            await r.publish(CHANNEL, json.dumps(evt))
            return

# ------------------------------------------------------------
# Main subscriber: route events to agents
# ------------------------------------------------------------
async def handle_incoming_event(message_str: str):
    try:
        payload = json.loads(message_str)
    except Exception as e:
        print("Invalid JSON payload", e)
        return
    etype = payload.get("event_type", "")
    # route:
    if etype == "data_uploaded":
        # Run forecasting
        await forecast_agent(payload)
    elif etype == "prediction_ready":
        # Optimization & alerting
        await optimization_agent(payload)
        await alerting_agent(payload)
    elif etype == "optimized_plan":
        await logistics_agent(payload)
        await alerting_agent(payload)
    else:
        # you can also handle alert_sent or job_created etc.
        print("Unhandled event type:", etype)

async def subscriber_loop():
    sub = r.pubsub()
    await sub.subscribe(CHANNEL)
    print(f"Crew subscriber listening on {CHANNEL} (REDIS_URL={REDIS_URL})")
    try:
        while True:
            msg = await sub.get_message(ignore_subscribe_messages=True, timeout=1.0)
            if msg and msg.get("data"):
                # message['data'] is the published string
                await handle_incoming_event(msg['data'])
            await asyncio.sleep(0.05)
    except asyncio.CancelledError:
        print("Subscriber cancelled")
    finally:
        await sub.unsubscribe(CHANNEL)

if __name__ == "__main__":
    # run as long lived crew process
    print("Starting MedLyf Crew (Forecasting, Optimization, Alerting, Logistics)...")
    asyncio.run(subscriber_loop())
