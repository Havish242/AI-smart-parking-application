from .base_agent import BaseAgent, AgentType
from typing import Dict, Any, List, Tuple
from models import ParkingSpace, ParkingLot, Location


class ParkingAssignmentAgent(BaseAgent):
    """Intelligent agent for assigning parking spaces to users"""
    
    def __init__(self, agent_id: str = "agent_0"):
        super().__init__(agent_id, AgentType.ASSIGNMENT_AGENT)
        self.preferences = {
            "distance_weight": 0.4,
            "price_weight": 0.3,
            "availability_weight": 0.2,
            "level_preference_weight": 0.1
        }
    
    def perceive(self, state: Dict[str, Any]) -> Dict[str, Any]:
        """Perceive available parking spaces and user requirements"""
        user_location = state.get("user_location")
        parking_lot = state.get("parking_lot")
        user_prefs = state.get("user_preferences", {})
        
        available_spaces = [
            space for space in parking_lot.spaces 
            if space.status.value == "available"
        ]
        
        return {
            "user_location": user_location,
            "available_spaces": available_spaces,
            "user_preferences": user_prefs,
            "total_available": len(available_spaces),
            "occupancy_rate": 1 - (len(available_spaces) / len(parking_lot.spaces))
        }
    
    def decide(self, perceived_state: Dict[str, Any]) -> Dict[str, Any]:
        """Decide on best parking space based on multiple factors"""
        user_location = perceived_state["user_location"]
        available_spaces = perceived_state["available_spaces"]
        
        if not available_spaces:
            return {"decision": "no_spaces_available"}
        
        scored_spaces = []
        for space in available_spaces:
            score = self._calculate_space_score(
                space, 
                user_location, 
                perceived_state
            )
            scored_spaces.append((space, score))
        
        scored_spaces.sort(key=lambda x: x[1], reverse=True)
        best_space = scored_spaces[0][0]
        
        return {
            "decision": "assign_space",
            "assigned_space": best_space,
            "top_alternatives": [s[0] for s in scored_spaces[1:4]],
            "confidence": scored_spaces[0][1]
        }
    
    def act(self, decision: Dict[str, Any]) -> Dict[str, Any]:
        """Execute the parking assignment decision"""
        if decision["decision"] == "no_spaces_available":
            return {
                "action": "inform_user",
                "message": "No parking spaces available",
                "success": False
            }
        
        assigned_space = decision["assigned_space"]
        return {
            "action": "assign_parking",
            "space_id": assigned_space.id,
            "location": assigned_space.location,
            "price": assigned_space.price_per_hour,
            "level": assigned_space.level,
            "section": assigned_space.section,
            "success": True
        }
    
    def _calculate_space_score(
        self, 
        space: ParkingSpace, 
        user_location: Location, 
        state: Dict[str, Any]
    ) -> float:
        """Calculate composite score for a parking space"""
        distance = user_location.distance_to(space.location)
        distance_score = max(0, 100 - distance * 10)
        
        price_score = max(0, 100 - space.price_per_hour * 10)
        
        level_score = max(0, 100 - space.level * 15)
        
        composite_score = (
            distance_score * self.preferences["distance_weight"] +
            price_score * self.preferences["price_weight"] +
            level_score * self.preferences["level_preference_weight"]
        )
        
        return composite_score


class AvailabilityAgent(BaseAgent):
    """Agent that monitors and predicts parking availability"""
    
    def __init__(self, agent_id: str = "agent_avail_0"):
        super().__init__(agent_id, AgentType.AVAILABILITY_AGENT)
        self.availability_history = []
    
    def perceive(self, state: Dict[str, Any]) -> Dict[str, Any]:
        """Monitor current parking lot state"""
        parking_lot = state.get("parking_lot")
        
        total_spaces = len(parking_lot.spaces)
        available = sum(1 for s in parking_lot.spaces if s.status.value == "available")
        occupied = sum(1 for s in parking_lot.spaces if s.status.value == "occupied")
        reserved = sum(1 for s in parking_lot.spaces if s.status.value == "reserved")
        
        return {
            "total_spaces": total_spaces,
            "available": available,
            "occupied": occupied,
            "reserved": reserved,
            "occupancy_rate": occupied / total_spaces if total_spaces > 0 else 0,
            "availability_rate": available / total_spaces if total_spaces > 0 else 0
        }
    
    def decide(self, perceived_state: Dict[str, Any]) -> Dict[str, Any]:
        """Decide availability status and alerts"""
        occupancy_rate = perceived_state["occupancy_rate"]
        available = perceived_state["available"]
        total = perceived_state["total_spaces"]
        
        if available == 0:
            status = "critical"
            recommendation = "lot_full"
        elif occupancy_rate > 0.85:
            status = "high"
            recommendation = "high_demand"
        elif occupancy_rate > 0.60:
            status = "moderate"
            recommendation = "normal_flow"
        else:
            status = "low"
            recommendation = "plenty_available"
        
        return {
            "status": status,
            "recommendation": recommendation,
            "availability_percentage": perceived_state["availability_rate"] * 100
        }
    
    def act(self, decision: Dict[str, Any]) -> Dict[str, Any]:
        """Update availability information"""
        return {
            "action": "update_availability",
            "status": decision["status"],
            "recommendation": decision["recommendation"],
            "availability_percentage": decision["availability_percentage"]
        }
