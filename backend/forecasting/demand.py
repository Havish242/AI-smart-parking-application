from typing import Dict, List, Tuple
from datetime import datetime, timedelta
import math


class DemandForecaster:
    """Predict parking demand using historical patterns"""
    
    def __init__(self):
        self.historical_data: List[Dict] = []
        self.patterns = {
            "hourly": {},
            "daily": {},
            "weekly": {}
        }
    
    def add_data_point(self, timestamp: datetime, occupancy: float):
        """Add historical data point"""
        self.historical_data.append({
            "timestamp": timestamp,
            "occupancy": occupancy
        })
    
    def learn_patterns(self):
        """Learn patterns from historical data"""
        if len(self.historical_data) < 24:
            return
        
        hourly_data = {}
        for entry in self.historical_data:
            hour = entry["timestamp"].hour
            if hour not in hourly_data:
                hourly_data[hour] = []
            hourly_data[hour].append(entry["occupancy"])
        
        for hour, occupancies in hourly_data.items():
            self.patterns["hourly"][hour] = sum(occupancies) / len(occupancies)
        
        daily_data = {}
        for entry in self.historical_data:
            day = entry["timestamp"].weekday()
            if day not in daily_data:
                daily_data[day] = []
            daily_data[day].append(entry["occupancy"])
        
        for day, occupancies in daily_data.items():
            self.patterns["daily"][day] = sum(occupancies) / len(occupancies)
    
    def forecast(self, hours_ahead: int = 1) -> Dict:
        """
        Forecast parking demand for given hours ahead
        
        Returns:
            Dictionary with predicted occupancy rates
        """
        if not self.patterns["hourly"]:
            self.learn_patterns()
        
        future_time = datetime.now() + timedelta(hours=hours_ahead)
        hour = future_time.hour
        day = future_time.weekday()
        
        hourly_avg = self.patterns["hourly"].get(hour, 0.5)
        
        daily_factor = self.patterns["daily"].get(day, 1.0)
        
        predicted_occupancy = min(1.0, hourly_avg * daily_factor)
        
        # Add confidence score
        confidence = min(0.95, 0.5 + len(self.historical_data) * 0.01)
        
        return {
            "forecast_time": future_time,
            "hours_ahead": hours_ahead,
            "predicted_occupancy": predicted_occupancy,
            "predicted_availability": 1.0 - predicted_occupancy,
            "confidence": confidence,
            "trend": self._calculate_trend(hour, day)
        }
    
    def _calculate_trend(self, hour: int, day: int) -> str:
        """Calculate demand trend (increasing, stable, decreasing)"""
        if not self.patterns["hourly"]:
            return "stable"
        
        current_hour_demand = self.patterns["hourly"].get(hour, 0.5)
        next_hour_demand = self.patterns["hourly"].get((hour + 1) % 24, 0.5)
        
        diff = next_hour_demand - current_hour_demand
        
        if diff > 0.1:
            return "increasing"
        elif diff < -0.1:
            return "decreasing"
        else:
            return "stable"
    
    def forecast_peak_hours(self) -> List[int]:
        """Return predicted peak hours for today"""
        if not self.patterns["hourly"]:
            self.learn_patterns()
        
        # Sort hours by occupancy
        sorted_hours = sorted(
            self.patterns["hourly"].items(),
            key=lambda x: x[1],
            reverse=True
        )
        
        return [hour for hour, _ in sorted_hours[:4]]


class SeasonalAdjuster:
    """Adjust forecasts based on seasonal patterns"""
    
    def __init__(self):
        self.seasonal_factors = {}
    
    def add_seasonal_event(self, date: datetime, factor: float):
        """Add seasonal adjustment for specific date"""
        date_key = date.strftime("%m-%d")
        self.seasonal_factors[date_key] = factor
    
    def adjust_forecast(self, forecast: Dict, timestamp: datetime) -> Dict:
        """Adjust forecast based on seasonal factors"""
        date_key = timestamp.strftime("%m-%d")
        factor = self.seasonal_factors.get(date_key, 1.0)
        
        adjusted_forecast = forecast.copy()
        adjusted_forecast["predicted_occupancy"] = min(
            1.0,
            forecast["predicted_occupancy"] * factor
        )
        adjusted_forecast["seasonal_factor"] = factor
        
        return adjusted_forecast
