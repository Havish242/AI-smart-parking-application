import heapq
from typing import Dict, List, Optional, Set, Tuple

NodeId = str
Graph = Dict[NodeId, List[NodeId]]
CoordMap = Dict[NodeId, Tuple[int, int]]


def manhattan(a: Tuple[int, int], b: Tuple[int, int]) -> int:
    return abs(a[0] - b[0]) + abs(a[1] - b[1])


def reconstruct_path(came_from: Dict[NodeId, NodeId], current: NodeId) -> List[NodeId]:
    path = [current]
    while current in came_from:
        current = came_from[current]
        path.append(current)
    path.reverse()
    return path


def a_star_search(
    graph: Graph,
    coords: CoordMap,
    start: NodeId,
    goal: NodeId,
    blocked: Optional[Set[NodeId]] = None,
) -> Optional[List[NodeId]]:
    blocked = blocked or set()
    if start in blocked or goal in blocked:
        return None

    open_heap: List[Tuple[int, int, NodeId]] = []
    heapq.heappush(open_heap, (0, 0, start))

    came_from: Dict[NodeId, NodeId] = {}
    g_score: Dict[NodeId, int] = {start: 0}
    visited: Set[NodeId] = set()

    while open_heap:
        _, _, current = heapq.heappop(open_heap)
        if current in visited:
            continue
        visited.add(current)

        if current == goal:
            return reconstruct_path(came_from, current)

        for neighbor in graph.get(current, []):
            if neighbor in blocked:
                continue
            tentative_g = g_score[current] + 1
            if tentative_g < g_score.get(neighbor, 10**9):
                came_from[neighbor] = current
                g_score[neighbor] = tentative_g
                h = manhattan(coords[neighbor], coords[goal])
                f = tentative_g + h
                heapq.heappush(open_heap, (f, h, neighbor))

    return None


def best_first_search(
    graph: Graph,
    coords: CoordMap,
    start: NodeId,
    goal: NodeId,
    blocked: Optional[Set[NodeId]] = None,
) -> Optional[List[NodeId]]:
    blocked = blocked or set()
    if start in blocked or goal in blocked:
        return None

    open_heap: List[Tuple[int, NodeId]] = []
    heapq.heappush(open_heap, (manhattan(coords[start], coords[goal]), start))

    came_from: Dict[NodeId, NodeId] = {}
    visited: Set[NodeId] = set()

    while open_heap:
        _, current = heapq.heappop(open_heap)
        if current in visited:
            continue
        visited.add(current)

        if current == goal:
            return reconstruct_path(came_from, current)

        for neighbor in graph.get(current, []):
            if neighbor in visited or neighbor in blocked:
                continue
            if neighbor not in came_from:
                came_from[neighbor] = current
            heapq.heappush(open_heap, (manhattan(coords[neighbor], coords[goal]), neighbor))

    return None
