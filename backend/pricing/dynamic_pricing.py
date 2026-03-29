from typing import Dict
from datetime import datetime


class DynamicPricingEngine:
    """Implement dynamic pricing based on demand and occupancy"""
    
    def __init__(self, base_price: float = 5.0):
        self.base_price = base_price
        self.pricing_factors = {
            "occupancy_multiplier": 1.5,
            "time_of_day_factor": 1.0,
            "surge_threshold": 0.85
        }
        self.price_history = []
    
    def calculate_price(
        self,
        occupancy_rate: float,
        predicted_demand: float = None,
        time_slot: str = "normal"
    ) -> Dict:
        """
        Calculate dynamic price based on multiple factors
        
        Args:
            occupancy_rate: Current occupancy as percentage (0.0 to 1.0)
            predicted_demand: Predicted demand from forecaster (0.0 to 1.0)
            time_slot: "peak", "normal", or "off-peak"
        
        Returns:
            Dictionary with price and pricing details
        """
        price = self.base_price
        
        # Occupancy-based pricing
        if occupancy_rate >= self.pricing_factors["surge_threshold"]:
            # High demand pricing
            surge_multiplier = 1.0 + (occupancy_rate - self.pricing_factors["surge_threshold"]) * 3.0
            price *= surge_multiplier
        else:
            # Standard occupancy-based pricing
            price *= (1.0 + occupancy_rate * self.pricing_factors["occupancy_multiplier"] / 2)
        
        # Time-based adjustment
        time_multiplier = self._get_time_multiplier(time_slot)
        price *= time_multiplier
        
        # Predicted demand adjustment
        if predicted_demand is not None:
            if predicted_demand > 0.75:
                price *= 1.3  # High predicted demand
            elif predicted_demand > 0.50:
                price *= 1.1  # Moderate demand
            elif predicted_demand < 0.25:
                price *= 0.8  # Low predicted demand
        
        # Round to nearest 0.50
        price = round(price * 2) / 2
        
        # Cap price
        max_price = self.base_price * 5.0
        min_price = self.base_price * 0.5
        price = max(min_price, min(max_price, price))
        
        pricing_info = {
            "price_per_hour": price,
            "base_price": self.base_price,
            "occupancy_rate": occupancy_rate,
            "time_slot": time_slot,
            "time_multiplier": time_multiplier,
            "occupancy_multiplier": 1.0 + occupancy_rate * self.pricing_factors["occupancy_multiplier"] / 2,
            "predicted_demand": predicted_demand,
            "timestamp": datetime.now(),
            "pricing_rationale": self._generate_rationale(occupancy_rate, time_slot, predicted_demand)
        }
        
        self.price_history.append(pricing_info)
        
        return pricing_info
    
    def _get_time_multiplier(self, time_slot: str) -> float:
        """Get time-based price multiplier"""
        multipliers = {
            "peak": 1.5,      # Morning/evening rush hours
            "normal": 1.0,    # Regular hours
            "off-peak": 0.7   # Late night/early morning
        }
        return multipliers.get(time_slot, 1.0)
    
    def _generate_rationale(
        self,
        occupancy_rate: float,
        time_slot: str,
        predicted_demand: float = None
    ) -> str:
        """Generate human-readable explanation for pricing"""
        reasons = []
        
        if occupancy_rate >= self.pricing_factors["surge_threshold"]:
            reasons.append("High occupancy surge pricing applied")
        elif occupancy_rate > 0.60:
            reasons.append("Above-average occupancy")
        else:
            reasons.append("Standard pricing")
        
        if time_slot == "peak":
            reasons.append("Peak hour multiplier")
        elif time_slot == "off-peak":
            reasons.append("Off-peak discount")
        
        if predicted_demand and predicted_demand > 0.75:
            reasons.append("High predicted demand")
        
        return "; ".join(reasons)
    
    def get_price_trend(self, hours: int = 24) -> Dict:
        """Get price trend over recent history"""
        if len(self.price_history) == 0:
            return {"trend": "no_data"}
        
        recent_prices = self.price_history[-hours:]
        
        if len(recent_prices) < 2:
            return {"trend": "insufficient_data"}
        
        first_price = recent_prices[0]["price_per_hour"]
        last_price = recent_prices[-1]["price_per_hour"]
        
        avg_price = sum(p["price_per_hour"] for p in recent_prices) / len(recent_prices)
        min_price = min(p["price_per_hour"] for p in recent_prices)
        max_price = max(p["price_per_hour"] for p in recent_prices)
        
        if last_price > first_price * 1.1:
            trend = "rising"
        elif last_price < first_price * 0.9:
            trend = "falling"
        else:
            trend = "stable"
        
        return {
            "trend": trend,
            "average_price": avg_price,
            "min_price": min_price,
            "max_price": max_price,
            "current_price": last_price,
            "price_change_percentage": ((last_price - first_price) / first_price * 100) if first_price > 0 else 0
        }
    
    def apply_promotions(self, price: float, user_type: str = "regular") -> float:
        """Apply promotional discounts"""
        discounts = {
            "premium": 0.85,   # 15% discount
            "regular": 1.0,    # No discount
            "admin": 0.0       # Free
        }
        
        multiplier = discounts.get(user_type, 1.0)
        return price * multiplier
