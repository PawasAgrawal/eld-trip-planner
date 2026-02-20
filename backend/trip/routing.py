import requests
from django.conf import settings

def geocode(address: str) -> dict:
    """
    Geocode an address using Nominatim (OpenStreetMap).
    Returns a dict with lat, lon, and display_name.
    """
    if not address:
        raise ValueError("Address cannot be empty")
        
    url = "https://nominatim.openstreetmap.org/search"
    headers = {"User-Agent": "ELDTripPlanner/1.0"}
    params = {
        "q": address,
        "format": "json",
        "limit": 1
    }
    
    response = requests.get(url, headers=headers, params=params, timeout=10)
    response.raise_for_status()
    
    data = response.json()
    if not data:
        raise ValueError(f"Address not found: {address}")
        
    result = data[0]
    return {
        "lat": float(result["lat"]),
        "lon": float(result["lon"]),
        "display_name": result["display_name"]
    }

def get_route(origin: dict, destination: dict) -> dict:
    """
    Get driving route between two points using OSRM.
    Returns distance (miles), duration (hours), and geometry (GeoJSON).
    """
    # OSRM expects {lon},{lat}
    start_coords = f"{origin['lon']},{origin['lat']}"
    end_coords = f"{destination['lon']},{destination['lat']}"
    
    url = f"http://router.project-osrm.org/route/v1/driving/{start_coords};{end_coords}"
    params = {
        "overview": "full",
        "geometries": "geojson"
    }
    
    response = requests.get(url, params=params, timeout=10)
    response.raise_for_status()
    
    data = response.json()
    if data.get("code") != "Ok":
        raise ValueError(f"OSRM Error: {data.get('code')}")
        
    route = data["routes"][0]
    
    # Conversions
    meters = route["distance"]
    seconds = route["duration"]
    
    miles = meters * 0.000621371
    hours = seconds / 3600.0
    
    return {
        "distance_miles": miles,
        "duration_hours": hours,
        "geometry": route["geometry"]
    }
