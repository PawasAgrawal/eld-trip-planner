import requests
import json

url = "http://127.0.0.1:8000/api/trip/plan/"
headers = {"Content-Type": "application/json"}
data = {
    "current_location": "Chicago, IL",
    "pickup_location": "St. Louis, MO",
    "dropoff_location": "Dallas, TX",
    "current_cycle_used": 22
}

print(f"Testing {url}...")
try:
    response = requests.post(url, json=data, headers=headers, timeout=30)
    print(f"Status Code: {response.status_code}")
    if response.status_code == 200:
        print("Success!")
        data = response.json()
        print(f"Events: {len(data.get('events', []))}")
        print(f"Daily Logs: {len(data.get('daily_logs', []))}")
        print(f"Total Distance: {data.get('total_distance_miles'):.1f} miles")
        print(f"Total Driving: {data.get('total_driving_hours')} hrs")
        print(f"Total Rest: {data.get('total_rest_hours')} hrs")
        print(f"Total Days: {data.get('total_days')}")
        
        if data.get('daily_logs'):
            print("Sample Daily Log (first day):")
            print(data['daily_logs'][0])
    else:
        print("Failed!")
        print(response.text)
except Exception as e:
    print(f"Error: {e}")
