from google import genai
import os
from dotenv import load_dotenv

load_dotenv()
API_KEY = os.getenv("GEMINI_API_KEY")

client = genai.Client(api_key=API_KEY)
for m in client.models.list():
    if 'generateContent' in m.supported_actions:
        print(f"MODEL: {m.name}")
