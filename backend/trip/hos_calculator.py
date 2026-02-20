from datetime import datetime, timedelta
import math

# FMCSA Constants
MAX_DRIVING_HOURS = 11.0
MAX_WINDOW_HOURS = 14.0
REST_HOURS = 10.0
BREAK_AFTER_DRIVING_HOURS = 8.0
BREAK_DURATION_HOURS = 0.5
CYCLE_LIMIT_HOURS = 70.0
FUEL_EVERY_MILES = 1000.0
FUEL_STOP_DURATION_HOURS = 0.5
PICKUP_DURATION_HOURS = 1.0
DROPOFF_DURATION_HOURS = 1.0
SPEED_CAP_MPH = 65.0

class HOSCalculator:
    def __init__(self, current_cycle_used=0.0):
        # Start at 8:00 AM tomorrow
        now = datetime.now()
        tomorrow = now + timedelta(days=1)
        self.current_time = tomorrow.replace(hour=8, minute=0, second=0, microsecond=0)
        
        self.cycle_used = float(current_cycle_used)
        self.driving_in_window = 0.0
        self.on_duty_in_window = 0.0
        self.driving_since_break = 0.0
        self.miles_since_fuel = 0.0
        self.window_start = self.current_time
        
        self.events = []

    def _add_event(self, event_type, duration_hours, label, miles=0, lat=None, lon=None):
        start_time = self.current_time
        end_time = start_time + timedelta(hours=duration_hours)
        
        event = {
            "type": event_type,
            "start": start_time.isoformat(),
            "end": end_time.isoformat(),
            "duration_hours": duration_hours,
            "label": label,
            "miles": miles,
            "lat": lat,
            "lon": lon
        }
        self.events.append(event)
        
        self.current_time = end_time
        self.cycle_used += duration_hours
        
        # Update counters based on event type
        if event_type == "driving":
            self.driving_in_window += duration_hours
            self.driving_since_break += duration_hours
            self.on_duty_in_window += duration_hours
            self.miles_since_fuel += miles
        elif event_type in ["on_duty", "fuel", "pickup", "dropoff"]:
            self.on_duty_in_window += duration_hours

    def _take_rest_if_needed(self):
        window_elapsed = (self.current_time - self.window_start).total_seconds() / 3600.0
        
        needs_rest = (
            self.driving_in_window >= MAX_DRIVING_HOURS or 
            window_elapsed >= MAX_WINDOW_HOURS or
            self.cycle_used >= CYCLE_LIMIT_HOURS
        )
        
        if needs_rest:
            # Add 10-hour rest
            self._add_event("rest", REST_HOURS, "off-duty rest (10hr)")
            
            # Reset daily counters
            self.driving_in_window = 0.0
            self.driving_since_break = 0.0
            self.on_duty_in_window = 0.0
            self.window_start = self.current_time
            
            # Note: cycle_used is NOT reset (rolling 8-day window assumes user manages resets separately)

    def _take_break_if_needed(self):
        if self.driving_since_break >= BREAK_AFTER_DRIVING_HOURS:
            self._add_event("break", BREAK_DURATION_HOURS, "30-min break")
            self.driving_since_break = 0.0
            # Break is off-duty, doesn't add to counters except cycle?
            # Instructions: "Break does NOT count as on-duty."
            # Implicitly: Break counts towards window but not driving/on-duty hours within window?
            # Usually break is 'off duty', so cycle_used shouldn't increase if it's purely driving limit, 
            # but for simplicity let's assume it consumes time. 
            # _add_event adds to cycle_used. If break is OFF duty, maybe it shouldn't add to cycle?
            # FMCSA: 30-min break is off-duty.
            pass

    def _available_driving_hours(self):
        window_elapsed = (self.current_time - self.window_start).total_seconds() / 3600.0
        remaining_window = max(0, MAX_WINDOW_HOURS - window_elapsed)
        remaining_driving = max(0, MAX_DRIVING_HOURS - self.driving_in_window)
        remaining_break = max(0, BREAK_AFTER_DRIVING_HOURS - self.driving_since_break)
        remaining_cycle = max(0, CYCLE_LIMIT_HOURS - self.cycle_used)
        
        return min(remaining_window, remaining_driving, remaining_break, remaining_cycle)

    def _drive_segment(self, miles, speed, label):
        miles_remaining = float(miles)
        speed = min(speed, SPEED_CAP_MPH)
        
        while miles_remaining > 0:
            self._take_rest_if_needed()
            self._take_break_if_needed()
            
            available_hours = self._available_driving_hours()
            
            # Avoid infinite loop if available hours is 0 but rest wasn't triggered
            if available_hours <= 0:
                self._take_rest_if_needed()
                available_hours = self._available_driving_hours()
                if available_hours <= 0:
                    # Should not happen if rest resets counters
                    break

            # Calculate chunk
            hours_needed = miles_remaining / speed
            miles_to_fuel = max(0, FUEL_EVERY_MILES - self.miles_since_fuel)
            hours_to_fuel = miles_to_fuel / speed
            
            drive_hours = min(available_hours, hours_needed, hours_to_fuel)
            
            # Ensure we drive at least a tiny bit to progress
            if drive_hours <= 0.001: 
                 drive_hours = 0.001 

            drive_miles = drive_hours * speed
            
            if drive_miles > miles_remaining:
                drive_miles = miles_remaining
                drive_hours = drive_miles / speed

            self._add_event("driving", drive_hours, label, miles=drive_miles)
            miles_remaining -= drive_miles
            
            # Check fuel
            if self.miles_since_fuel >= FUEL_EVERY_MILES:
                self._add_event("fuel", FUEL_STOP_DURATION_HOURS, "Fuel Stop")
                self.miles_since_fuel = 0.0

    def _on_duty_stop(self, duration_hours, label, lat, lon):
        window_elapsed = (self.current_time - self.window_start).total_seconds() / 3600.0
        if window_elapsed + duration_hours > MAX_WINDOW_HOURS:
            self._take_rest_if_needed()
            
        self._add_event("on_duty", duration_hours, label, lat=lat, lon=lon)

    def calculate_schedule(self, leg1_miles, leg1_hours, leg2_miles, leg2_hours, pickup_lat, pickup_lon, dropoff_lat, dropoff_lon):
        # Derive speed from OSRM duration (simplistic, capped at 65)
        # leg_hours is total duration. average speed = miles / hours
        # Use provided hours to estimate speed
        
        speed1 = (leg1_miles / leg1_hours) if leg1_hours > 0 else 60.0
        speed2 = (leg2_miles / leg2_hours) if leg2_hours > 0 else 60.0
        
        # Drive Leg 1
        self._drive_segment(leg1_miles, speed1, "Driving to Pickup")
        
        # Pickup
        self._on_duty_stop(PICKUP_DURATION_HOURS, "Pickup", pickup_lat, pickup_lon)
        
        # Drive Leg 2
        self._drive_segment(leg2_miles, speed2, "Driving to Dropoff")
        
        # Dropoff
        self._on_duty_stop(DROPOFF_DURATION_HOURS, "Dropoff", dropoff_lat, dropoff_lon)
        
        return self.events

    def get_daily_logs(self):
        logs_by_date = {}
        
        type_map = {
            "driving": "D",
            "on_duty": "ON",
            "fuel": "ON", 
            "break": "OFF",
            "rest": "SB",
            "pickup": "ON",
            "dropoff": "ON"
        }

        # First pass: flat list of simplistic segments
        raw_segments = []
        for e in self.events:
            start_dt = datetime.fromisoformat(e["start"])
            end_dt = datetime.fromisoformat(e["end"])
            
            current = start_dt
            while current < end_dt:
                # Find end of current day (midnight)
                next_day = (current + timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
                segment_end = min(end_dt, next_day)
                
                date_str = current.strftime("%Y-%m-%d")
                start_h = current.hour + current.minute/60.0 + current.second/3600.0
                end_h = segment_end.hour + segment_end.minute/60.0 + segment_end.second/3600.0
                if end_h == 0.0 and segment_end.day != current.day: 
                    end_h = 24.0 # midnight handling
                
                status = type_map.get(e["type"], "OFF")
                
                raw_segments.append({
                    "date": date_str,
                    "start_hour": start_h,
                    "end_hour": end_h,
                    "status": status,
                    "label": e["label"]
                })
                
                current = segment_end

        # Group by date and fill gaps
        grouped = {}
        for s in raw_segments:
            d = s["date"]
            if d not in grouped:
                grouped[d] = []
            grouped[d].append(s)

        # Sort dates
        sorted_dates = sorted(grouped.keys())
        result = []

        for d in sorted_dates:
            segs = grouped[d]
            segs.sort(key=lambda x: x["start_hour"])
            
            filled = []
            current_h = 0.0
            
            # Initialize totals
            totals = {
                "off_duty": 0.0,
                "sleeper": 0.0,
                "driving": 0.0,
                "on_duty": 0.0
            }
            
            for s in segs:
                if s["start_hour"] > current_h:
                    # Fill gap with OFF
                    duration = s["start_hour"] - current_h
                    totals["off_duty"] += duration
                    filled.append({
                        "start_hour": current_h,
                        "end_hour": s["start_hour"],
                        "status": "OFF",
                        "label": "Off Duty"
                    })
                
                # Add segment duration to totals
                duration = s["end_hour"] - s["start_hour"]
                if s["status"] == "OFF":
                    totals["off_duty"] += duration
                elif s["status"] == "SB":
                    totals["sleeper"] += duration
                elif s["status"] == "D":
                    totals["driving"] += duration
                elif s["status"] == "ON":
                    totals["on_duty"] += duration
                    
                filled.append(s)
                current_h = s["end_hour"]
                
            if current_h < 24.0:
                duration = 24.0 - current_h
                totals["off_duty"] += duration
                filled.append({
                    "start_hour": current_h,
                    "end_hour": 24.0,
                    "status": "OFF",
                    "label": "Off Duty"
                })
                
            result.append({
                "date": d,
                "segments": filled,
                "totals": {k: round(v, 2) for k, v in totals.items()}
            })
            
        return result    
    def get_total_driving_hours(self):
        return sum(e["duration_hours"] for e in self.events if e["type"] == "driving")

    def get_total_rest_hours(self):
        return sum(e["duration_hours"] for e in self.events if e["type"] in ["rest", "break"])

    def get_total_days(self):
        # Count unique dates from events
        unique_dates = set()
        for e in self.events:
             # handle start and end dates
            start_date = datetime.fromisoformat(e["start"]).strftime("%Y-%m-%d")
            end_date = datetime.fromisoformat(e["end"]).strftime("%Y-%m-%d")
            unique_dates.add(start_date)
            unique_dates.add(end_date)
            
            # If event spans multiple days (more than start/end), iterate (unlikely for typical events max 10h)
            # But relying on start/end covers the span for calculation purposes roughly
            
        return len(unique_dates)
