import time
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from django.conf import settings
from .routing import geocode, get_route
from .hos_calculator import HOSCalculator

@api_view(["POST"])
def plan_trip(request):
    try:
        data = request.data
        
        # Validation
        current_loc = data.get("current_location")
        pickup_loc = data.get("pickup_location")
        dropoff_loc = data.get("dropoff_location")
        cycle_used = data.get("current_cycle_used", 0)

        if not all([current_loc, pickup_loc, dropoff_loc]):
            return Response(
                {"error": "Missing required fields: current_location, pickup_location, dropoff_location"},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        try:
            cycle_used = float(cycle_used)
            if not (0 <= cycle_used <= 70):
                raise ValueError
        except ValueError:
            return Response(
                {"error": "current_cycle_used must be a float between 0 and 70"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Geocoding with rate limiting
        try:
            current_geo = geocode(current_loc)
            time.sleep(1.1)
            pickup_geo = geocode(pickup_loc)
            time.sleep(1.1)
            dropoff_geo = geocode(dropoff_loc)
        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_422_UNPROCESSABLE_ENTITY)
        except Exception as e:
            return Response({"error": "Geocoding service failed"}, status=status.HTTP_502_BAD_GATEWAY)

        # Routing
        try:
            leg1 = get_route(current_geo, pickup_geo)
            leg2 = get_route(pickup_geo, dropoff_geo)
        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_422_UNPROCESSABLE_ENTITY)
        except Exception as e:
            return Response({"error": "Routing service failed"}, status=status.HTTP_502_BAD_GATEWAY)

        # Calculation
        try:
            calculator = HOSCalculator(current_cycle_used=cycle_used)
            # Pass individual coords for stops
            events = calculator.calculate_schedule(
                leg1_miles=leg1["distance_miles"],
                leg1_hours=leg1["duration_hours"],
                leg2_miles=leg2["distance_miles"],
                leg2_hours=leg2["duration_hours"],
                pickup_lat=pickup_geo["lat"],
                pickup_lon=pickup_geo["lon"],
                dropoff_lat=dropoff_geo["lat"],
                dropoff_lon=dropoff_geo["lon"]
            )
            daily_logs = calculator.get_daily_logs()
        except Exception as e:
            return Response({"error": f"Calculation error: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        # Response
        response_data = {
            "locations": {
                "current": current_geo,
                "pickup": pickup_geo,
                "dropoff": dropoff_geo
            },
            "routes": {
                "leg1": leg1,
                "leg2": leg2
            },
            "total_distance_miles": leg1["distance_miles"] + leg2["distance_miles"],
            "total_driving_hours": round(calculator.get_total_driving_hours(), 2),
            "total_rest_hours": round(calculator.get_total_rest_hours(), 2),
            "total_days": calculator.get_total_days(),
            "events": events,
            "daily_logs": daily_logs
        }
        
        return Response(response_data, status=status.HTTP_200_OK)

    except Exception as e:
        return Response({"error": "An unexpected error occurred"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
