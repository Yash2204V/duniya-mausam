from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
import os
from dotenv import load_dotenv

load_dotenv()
app = Flask(__name__)
CORS(app) 

OPENWEATHER_API_KEY = os.getenv("OPENWEATHER_API_KEY")
WAQI_API_TOKEN = os.getenv("WAQI_API_TOKEN") 

def get_weather(city):
    """Get current weather from OpenWeather by city name."""
    geo_url = f"http://api.openweathermap.org/geo/1.0/direct?q={city}&limit=1&appid={OPENWEATHER_API_KEY}"
    geo_data = requests.get(geo_url).json()
    if not geo_data:
        return None, None, None
    
    lat = geo_data[0]['lat']
    lon = geo_data[0]['lon']

    weather_url = f"http://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lon}&appid={OPENWEATHER_API_KEY}&units=metric"
    weather_data = requests.get(weather_url).json()

    if not weather_data or "main" not in weather_data:
        return None, lat, lon

    return {
        "temperature": weather_data['main']['temp'],
        "humidity": weather_data['main']['humidity'],
        "weather": weather_data['weather'][0]['description']
    }, lat, lon


def get_aqi(city=None, lat=None, lon=None):
    """Get AQI from WAQI API by city name or coordinates."""
    if lat and lon:
        feed = f"geo:{lat};{lon}"
    elif city:
        feed = city
    else:
        return None

    aqi_url = f"https://api.waqi.info/feed/{feed}/?token={WAQI_API_TOKEN}"
    aqi_data = requests.get(aqi_url).json()

    if not aqi_data or aqi_data.get("status") != "ok":
        return None

    data = aqi_data["data"]
    return {
        "aqi_us": data.get("aqi"),
        "dominant_pollutant": data.get("dominentpol"),
        "pollutants": {
            k: v.get("v") for k, v in (data.get("iaqi") or {}).items()
        }
    }


@app.route("/environment", methods=["GET"])
def environment_data():
    city = request.args.get("city")

    if not city:
        return jsonify({"error": "City parameter is required"}), 400

    # Get weather
    weather, lat, lon = get_weather(city)
    if not lat or not lon:
        return jsonify({"error": "City not found"}), 404

    # Get AQI
    aqi = get_aqi(city=city, lat=lat, lon=lon)

    return jsonify({
        "city": city,
        "weather_data": weather if weather else {},
        "aqi_data": aqi if aqi else {}
    })


if __name__ == "__main__":
    app.run(debug=True)