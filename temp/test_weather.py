import requests
import os
from dotenv import load_dotenv

load_dotenv(dotenv_path='d:/Projects/KrishiSathi-v3/FarmVoice_v2/server/.env')

CITY_NAME = os.getenv("CITY_NAME", "Pune")
OPENWEATHER_API_KEY = os.getenv("OPENWEATHER_API_KEY")

def test_weather():
    print(f"Testing Weather API for {CITY_NAME}...")
    if not OPENWEATHER_API_KEY:
        print("Error: OPENWEATHER_API_KEY not found in .env")
        return
    
    url = f"http://api.openweathermap.org/data/2.5/weather?q={CITY_NAME}&appid={OPENWEATHER_API_KEY}&units=metric"
    try:
        response = requests.get(url, timeout=5)
        print(f"Status Code: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print("Successfully fetched weather:")
            print(f"- Temp: {data['main']['temp']}°C")
            print(f"- Humidity: {data['main']['humidity']}%")
            print(f"- Description: {data['weather'][0]['description']}")
        else:
            print(f"Error Response: {response.text}")
    except Exception as e:
        print(f"Connection Error: {e}")

if __name__ == "__main__":
    test_weather()
