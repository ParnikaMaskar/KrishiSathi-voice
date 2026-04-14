import asyncio
import websockets
import json
import base64
import os
import requests
from groq import Groq
import ollama
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Initialize Groq for STT
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
if GROQ_API_KEY:
    groq_client = Groq(api_key=GROQ_API_KEY)
    print("Groq initialized for STT.")
else:
    print("WARNING: GROQ_API_KEY not found in .env. Transcription will fail.")

# Ollama Model Configuration
OLLAMA_MODEL = "phi3:mini"
print(f"Ollama integration active (using {OLLAMA_MODEL})")

# Weather and Sensor Data Storage
CITY_NAME = os.getenv("CITY_NAME", "Pune")
OPENWEATHER_API_KEY = os.getenv("OPENWEATHER_API_KEY")

latest_farm_data = {
    "weather": None,
    "sensors": {
        "temperature": "N/A",
        "humidity": "N/A",
        "soil_moisture": "N/A"
    }
}

def get_weather():
    if not OPENWEATHER_API_KEY:
        return None
    try:
        url = f"http://api.openweathermap.org/data/2.5/weather?q={CITY_NAME}&appid={OPENWEATHER_API_KEY}&units=metric"
        response = requests.get(url, timeout=5)
        if response.status_code == 200:
            data = response.json()
            latest_farm_data["weather"] = {
                "temp": data["main"]["temp"],
                "humidity": data["main"]["humidity"],
                "description": data["weather"][0]["description"]
            }
            return latest_farm_data["weather"]
    except Exception as e:
        print(f"Weather API Error: {e}")
    return None

async def handle_voice(websocket, path=None):
    print(f"Client connected")
    try:
        async for message in websocket:
            data = json.loads(message)
            
            if data.get('type') == 'SENSOR_DATA':
                print(f"Received sensor data from ESP32: {data.get('data')}")
                latest_farm_data["sensors"].update(data.get('data', {}))
                continue

            if data.get('type') == 'AUDIO_BLOB':
                print("Received audio blob, processing with Groq...")
                
                # 1. Decode base64 audio
                audio_data = base64.b64decode(data['audio'])
                temp_filename = "temp_recording.wav"
                
                with open(temp_filename, "wb") as f:
                    f.write(audio_data)
                
                # 2. Transcribe with Groq
                transcript = ""
                if GROQ_API_KEY:
                    try:
                        print("Transcribing via Groq API...")
                        with open(temp_filename, "rb") as audio_file:
                            translation = groq_client.audio.transcriptions.create(
                                file=(temp_filename, audio_file.read()),
                                model="whisper-large-v3-turbo",
                                response_format="text",
                            )
                            transcript = translation.strip()
                    except Exception as e:
                        print(f"Groq STT Error: {e}")
                
                print(f"Transcript: {transcript}")
                
                # Send transcript back immediately
                await websocket.send(json.dumps({
                    "type": "TRANSCRIPT",
                    "text": transcript
                }))
                
                # 3. Get AI Response from Ollama (Local)
                response_text = ""
                if transcript:
                    try:
                        print(f"Generating local response via Ollama ({OLLAMA_MODEL})...")
                        
                        # Fetch fresh weather
                        weather = get_weather()
                        weather_str = f"{weather['temp']}°C, {weather['description']}" if weather else "Unknown"
                        
                        # 🔥 UPDATED SYSTEM PROMPT
                        system_prompt = f"""You are FarmVoice, a smart and practical farm assistant.

CORE BEHAVIOR:
- Always reply in the SAME language as the user’s input.
- If the input is mixed (e.g., Hinglish), respond in the dominant language.
- If unsure, default to the user's regional language (Hindi/Marathi).
- Never switch to English unless the user clearly uses English.

STYLE:
- Keep responses very short (1–2 sentences).
- Use simple, spoken language (like talking to a farmer, not writing an essay).
- Avoid technical jargon.

FARM CONTEXT:
- Location: {CITY_NAME}
- Weather: {weather_str}
- Sensors:
  - Temperature: {latest_farm_data['sensors']['temperature']}°C
  - Humidity: {latest_farm_data['sensors']['humidity']}%
  - Soil Moisture: {latest_farm_data['sensors']['soil_moisture']}%

INTELLIGENCE RULES:
- Combine sensor data + weather before answering.
- Give clear, actionable advice (e.g., irrigate / wait / monitor).
- If data is missing, still give best possible suggestion.

LANGUAGE EXAMPLES:
- Hindi input → Hindi output
- Marathi input → Marathi output
- Hinglish input → Hinglish output

Do not explain your reasoning. Just give the answer.
"""
                        print(f"System Context: {system_prompt}")

                        # 🔥 Slightly improved user message
                        response = ollama.chat(model=OLLAMA_MODEL, messages=[
                            {
                                'role': 'system',
                                'content': system_prompt
                            },
                            {
                                'role': 'user',
                                'content': f"User said (original language): {transcript}",
                            },
                        ])
                        response_text = response['message']['content']
                    except Exception as e:
                        print(f"Ollama Error: {e}")
                        response_text = "Sorry, my local brain had an error. Is Ollama running?"
                
                # 4. Send AI Response back
                print(f"Response: {response_text}")
                await websocket.send(json.dumps({
                    "type": "RESPONSE",
                    "text": response_text
                }))
                
                # Cleanup
                if os.path.exists(temp_filename):
                    os.remove(temp_filename)
            
    except websockets.exceptions.ConnectionClosedError:
        print("Client disconnected")
    except Exception as e:
        print(f"Error: {e}")

async def main():
    server = await websockets.serve(handle_voice, "0.0.0.0", 8765)
    print("Voice Server running on ws://0.0.0.0:8765")
    await server.wait_closed()

if __name__ == "__main__":
    asyncio.run(main())