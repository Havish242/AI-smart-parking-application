from abc import ABC, abstractmethod
from typing import Dict, Any, List
from enum import Enum
from datetime import datetime


class AgentType(Enum):
    ASSIGNMENT_AGENT = "assignment"
    AVAILABILITY_AGENT = "availability"
    RECOMMENDATION_AGENT = "recommendation"


class BaseAgent(ABC):
    """Base class for all intelligent parking agents"""
    
    def __init__(self, agent_id: str, agent_type: AgentType):
        self.agent_id = agent_id
        self.agent_type = agent_type
        self.created_at = datetime.now()
        self.decision_history: List[Dict[str, Any]] = []
    
    @abstractmethod
    def perceive(self, state: Dict[str, Any]) -> Dict[str, Any]:
        """Perceive the environment state"""
        pass
    
    @abstractmethod
    def decide(self, perceived_state: Dict[str, Any]) -> Dict[str, Any]:
        """Make a decision based on perceived state"""
        pass
    
    @abstractmethod
    def act(self, decision: Dict[str, Any]) -> Dict[str, Any]:
        """Execute the decision"""
        pass
    
    def reason(self, state: Dict[str, Any]) -> Dict[str, Any]:
        """Complete reasoning cycle: Perceive -> Decide -> Act"""
        perceived = self.perceive(state)
        decision = self.decide(perceived)
        action = self.act(decision)
        
        self.decision_history.append({
            "timestamp": datetime.now(),
            "state": state,
            "perceived": perceived,
            "decision": decision,
            "action": action
        })
        
        return action
    
    def get_decision_history(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Get recent decision history"""
        return self.decision_history[-limit:]
