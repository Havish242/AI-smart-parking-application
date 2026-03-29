from .base_agent import BaseAgent, AgentType
from typing import Dict, Any
from datetime import datetime


class RecommendationAgent(BaseAgent):
    """Agent that recommends parking strategies and improvements"""
    
    def __init__(self, agent_id: str = "recommend_agent_0"):
        super().__init__(agent_id, AgentType.RECOMMENDATION_AGENT)
    
    def perceive(self, state: Dict[str, Any]) -> Dict[str, Any]:
        """Perceive parking system state and patterns"""
        metrics = state.get("metrics", {})
        historical = state.get("historical_data", [])
        
        return {
            "current_metrics": metrics,
            "trend": self._analyze_trend(historical),
            "anomalies": self._detect_anomalies(historical, metrics)
        }
    
    def decide(self, perceived_state: Dict[str, Any]) -> Dict[str, Any]:
        """Make recommendations based on perceived state"""
        trend = perceived_state.get("trend", "normal")
        anomalies = perceived_state.get("anomalies", [])
        
        recommendations = []
        
        if trend == "increasing":
            recommendations.append({
                "type": "increase_pricing",
                "reason": "Parking demand is increasing",
                "action": "Consider increasing base price by 10-15%"
            })
        
        if "high_turnover" in anomalies:
            recommendations.append({
                "type": "optimize_operations",
                "reason": "Detected high parking space turnover",
                "action": "Increase frequent cleaning and maintenance"
            })
        
        if "peak_hours_congestion" in anomalies:
            recommendations.append({
                "type": "expand_capacity",
                "reason": "Peak hours showing congestion",
                "action": "Consider expanding lot or implementing surge pricing"
            })
        
        return {
            "recommendations": recommendations,
            "priority": self._calculate_priority(trend, anomalies)
        }
    
    def act(self, decision: Dict[str, Any]) -> Dict[str, Any]:
        """Provide actionable insights"""
        return {
            "action": "provide_recommendations",
            "recommendations": decision["recommendations"],
            "priority_level": decision["priority"],
            "timestamp": datetime.now()
        }
    
    def _analyze_trend(self, historical: list) -> str:
        """Analyze if occupancy is increasing, decreasing, or stable"""
        if not historical or len(historical) < 2:
            return "insufficient_data"
        
        recent = historical[-5:] if len(historical) >= 5 else historical
        
        if all(recent[i] <= recent[i+1] for i in range(len(recent)-1)):
            return "increasing"
        elif all(recent[i] >= recent[i+1] for i in range(len(recent)-1)):
            return "decreasing"
        else:
            return "fluctuating"
    
    def _detect_anomalies(self, historical: list, current: Dict) -> list:
        """Detect anomalies in parking patterns"""
        anomalies = []
        
        if not historical:
            return anomalies
        
        avg_occupancy = sum(h.get("occupancy", 0) for h in historical) / len(historical)
        current_occupancy = current.get("occupancy_rate", 0)
        
        if current_occupancy > avg_occupancy * 1.3:
            anomalies.append("unusually_high_occupancy")
        
        if current_occupancy < avg_occupancy * 0.5:
            anomalies.append("unusually_low_occupancy")
        
        recent_ids = [h.get("reservation_count", 0) for h in historical[-10:]]
        if recent_ids and max(recent_ids) - min(recent_ids) > 5:
            anomalies.append("high_turnover")
        
        hour = datetime.now().hour
        if hour in [8, 9, 17, 18]:
            if current_occupancy > 0.80:
                anomalies.append("peak_hours_congestion")
        
        return anomalies
    
    def _calculate_priority(self, trend: str, anomalies: list) -> str:
        """Calculate priority level for recommendations"""
        score = 0
        
        if trend == "increasing":
            score += 2
        if len(anomalies) > 2:
            score += 3
        if "high_turnover" in anomalies or "peak_hours_congestion" in anomalies:
            score += 2
        
        if score >= 5:
            return "critical"
        elif score >= 3:
            return "high"
        elif score >= 1:
            return "medium"
        else:
            return "low"
