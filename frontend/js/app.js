// API Configuration
const API_BASE_URL = "http://localhost:8000";

// Application State
let currentLot = null;
let currentReservation = null;
let userLocation = null;

// ============ INITIALIZATION ============

document.addEventListener("DOMContentLoaded", function() {
    initializeApp();
});

async function initializeApp() {
    console.log("Initializing AI Smart Parking System...");
    
    // Setup navigation
    setupNavigation();
    
    // Load initial data
    await loadDashboard();
    await loadSystemStats();
}

// ============ NAVIGATION ============

function setupNavigation() {
    const navLinks = document.querySelectorAll(".nav-link");
    
    navLinks.forEach(link => {
        link.addEventListener("click", function(e) {
            e.preventDefault();
            
            // Remove active class from all links
            navLinks.forEach(l => l.classList.remove("active"));
            
            // Add active class to clicked link
            this.classList.add("active");
            
            // Get section name
            const sectionName = this.getAttribute("data-section");
            
            // Hide all sections
            document.querySelectorAll(".section").forEach(s => s.classList.remove("active"));
            
            // Show selected section
            const section = document.getElementById(sectionName);
            if (section) {
                section.classList.add("active");
                
                // Load data based on section
                if (sectionName === "analytics") {
                    loadAnalytics();
                } else if (sectionName === "agents") {
                    loadAgentsInfo();
                }
            }
        });
    });
}

// ============ DASHBOARD ============

async function loadDashboard() {
    try {
        // Get parking lot info
        const lotsResponse = await fetch(`${API_BASE_URL}/parking-lots`);
        const lots = await lotsResponse.json();
        
        if (lots.length > 0) {
            currentLot = lots[0];
            
            // Update dashboard stats
            document.getElementById("total-spaces").textContent = currentLot.total_spaces;
            document.getElementById("available-spaces").textContent = currentLot.available_spaces;
            
            const occupied = currentLot.total_spaces - currentLot.available_spaces;
            document.getElementById("occupied-spaces").textContent = occupied;
            
            const occupancyPercent = Math.round(currentLot.occupancy_rate * 100);
            document.getElementById("occupancy-rate").textContent = occupancyPercent + "%";
            
            // Render parking lot map
            renderParkingMap(currentLot);
            
            // Load pricing
            await loadPricing(currentLot.id);
        }
    } catch (error) {
        console.error("Error loading dashboard:", error);
    }
}

function renderParkingMap(lot) {
    const mapContainer = document.getElementById("lot-map");
    mapContainer.innerHTML = "";
    
    // Get lot details
    fetch(`${API_BASE_URL}/parking-lots/${lot.id}`)
        .then(res => res.json())
        .then(data => {
            data.spaces.forEach((space, index) => {
                const spaceElement = document.createElement("div");
                spaceElement.className = `parking-space ${space.status}`;
                spaceElement.textContent = space.id.split("_")[1];
                spaceElement.title = `${space.id} - ${space.status} - $${space.price}/hr`;
                mapContainer.appendChild(spaceElement);
            });
        });
}

async function loadPricing(lotId) {
    try {
        const response = await fetch(`${API_BASE_URL}/parking-lot/${lotId}/pricing`);
        const data = await response.json();
        
        const pricing = data.current_pricing;
        const priceElement = document.querySelector(".pricing-card .price");
        priceElement.textContent = `$${pricing.price_per_hour.toFixed(2)}`;
        
        const detailsElement = document.getElementById("price-details");
        detailsElement.innerHTML = `
            <div>Time Slot: <strong>${pricing.time_slot}</strong></div>
            <div>Occupancy: <strong>${(pricing.occupancy_rate * 100).toFixed(1)}%</strong></div>
            <div>${pricing.rationale}</div>
        `;
    } catch (error) {
        console.error("Error loading pricing:", error);
    }
}

async function loadSystemStats() {
    try {
        const response = await fetch(`${API_BASE_URL}/system-stats`);
        const stats = await response.json();
        
        console.log("System Stats:", stats);
    } catch (error) {
        console.error("Error loading system stats:", error);
    }
}

// ============ FIND PARKING ============

document.getElementById("parking-form")?.addEventListener("submit", async function(e) {
    e.preventDefault();
    
    const userLocationInput = document.getElementById("user-location").value;
    const vehicleSize = document.getElementById("vehicle-size").value;
    
    // Parse location (simplified - in production would use geocoding)
    const [lat, lng] = userLocationInput.includes(",") 
        ? userLocationInput.split(",").map(x => parseFloat(x.trim()))
        : [40.7128, -74.0060]; // Default to NYC if not specified
    
    userLocation = { latitude: lat, longitude: lng };
    
    try {
        // Get current parking lot
        if (!currentLot) {
            const lotsResponse = await fetch(`${API_BASE_URL}/parking-lots`);
            const lots = await lotsResponse.json();
            currentLot = lots[0];
        }
        
        // Find parking using agent
        const findResponse = await fetch(`${API_BASE_URL}/find-parking`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                user_location: userLocation,
                parking_lot: currentLot,
                vehicle_size: vehicleSize
            })
        });
        
        const findResult = await findResponse.json();
        
        // Get optimized route
        const routeResponse = await fetch(`${API_BASE_URL}/optimize-route`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                user_location: userLocation,
                parking_lot: currentLot,
                vehicle_size: vehicleSize
            })
        });
        
        const routeResult = await routeResponse.json();
        
        // Display results
        displayFindParkingResults(findResult, routeResult);
        
    } catch (error) {
        console.error("Error finding parking:", error);
        alert("Error finding parking: " + error.message);
    }
});

function displayFindParkingResults(findResult, routeResult) {
    const resultsDiv = document.getElementById("parking-results");
    resultsDiv.style.display = "block";
    
    // Display recommended space
    const parking = findResult.assigned_parking;
    const resultDetails = document.getElementById("result-details");
    
    resultDetails.innerHTML = `
        <div class="result-detail-item">
            <div class="label">Space ID</div>
            <div class="value">${parking.space_id}</div>
        </div>
        <div class="result-detail-item">
            <div class="label">Level</div>
            <div class="value">${parking.level}</div>
        </div>
        <div class="result-detail-item">
            <div class="label">Section</div>
            <div class="value">${parking.section}</div>
        </div>
        <div class="result-detail-item">
            <div class="label">Price/Hour</div>
            <div class="value">$${parking.price_per_hour.toFixed(2)}</div>
        </div>
        <div class="result-detail-item">
            <div class="label">Distance</div>
            <div class="value">${routeResult.route.distance.toFixed(2)} km</div>
        </div>
        <div class="result-detail-item">
            <div class="label">Est. Time</div>
            <div class="value">${routeResult.route.estimated_time_minutes.toFixed(0)} min</div>
        </div>
    `;
    
    // Confidence badge
    const confidence = Math.round(findResult.confidence);
    document.getElementById("confidence-badge").textContent = `${confidence}% Match`;
    
    // Scroll to results
    resultsDiv.scrollIntoView({ behavior: "smooth" });
}

// ============ ANALYTICS ============

async function loadAnalytics() {
    if (!currentLot) return;
    
    try {
        // Load demand forecast
        const forecastResponse = await fetch(
            `${API_BASE_URL}/parking-lot/${currentLot.id}/demand-forecast`
        );
        const forecastData = await forecastResponse.json();
        
        // Display forecast
        const forecastChart = document.getElementById("forecast-chart");
        forecastChart.innerHTML = `
            <div style="padding: 1rem;">
                <div>Predicted Occupancy: <strong>${(forecastData.forecast.predicted_occupancy * 100).toFixed(1)}%</strong></div>
                <div>Confidence: <strong>${(forecastData.forecast.confidence * 100).toFixed(0)}%</strong></div>
                <div>Trend: <strong>${forecastData.forecast.trend.toUpperCase()}</strong></div>
            </div>
        `;
        
        // Display peak hours
        const peakHoursDiv = document.getElementById("peak-hours");
        peakHoursDiv.innerHTML = forecastData.forecast.peak_hours_today
            .map(hour => `<div class="peak-hour-item">Hour ${hour}:00 - High demand expected</div>`)
            .join("");
        
        // Load price trend
        const statsResponse = await fetch(`${API_BASE_URL}/system-stats`);
        const stats = await statsResponse.json();
        
        const priceTrendDiv = document.getElementById("price-trend");
        if (stats.pricing) {
            priceTrendDiv.innerHTML = `
                <div class="trend-item">Current: $${stats.pricing.current_price?.toFixed(2) || 'N/A'}</div>
                <div class="trend-item">Trend: <strong>${stats.pricing.trend?.toUpperCase() || 'STABLE'}</strong></div>
                <div class="trend-item">Change: ${stats.pricing.price_change_percentage?.toFixed(1) || '0'}%</div>
            `;
        }
        
    } catch (error) {
        console.error("Error loading analytics:", error);
    }
}

// ============ AGENTS ============

async function loadAgentsInfo() {
    try {
        const statsResponse = await fetch(`${API_BASE_URL}/system-stats`);
        const stats = await statsResponse.json();
        
        // Assignment Agent
        const assignmentStats = document.getElementById("assignment-agent-stats");
        assignmentStats.innerHTML = `
            <div>Decisions Made: <strong>${stats.agents.assignment_agent.decisions_made}</strong></div>
        `;
        
        // Availability Agent
        const availabilityStats = document.getElementById("availability-agent-stats");
        availabilityStats.innerHTML = `
            <div>Decisions Made: <strong>${stats.agents.availability_agent.decisions_made}</strong></div>
        `;
        
        // Load recent decisions
        const decisionsDiv = document.getElementById("recent-decisions");
        decisionsDiv.innerHTML = `
            <div class="decision-item">
                <div class="timestamp">${new Date().toLocaleTimeString()}</div>
                <div class="content">Assignment Agent: Evaluating parking spaces...</div>
            </div>
            <div class="decision-item">
                <div class="timestamp">${new Date().toLocaleTimeString()}</div>
                <div class="content">Availability Agent: Monitoring lot status...</div>
            </div>
            <div class="decision-item">
                <div class="timestamp">${new Date().toLocaleTimeString()}</div>
                <div class="content">Pricing Agent: Adjusting rates based on demand...</div>
            </div>
        `;
        
    } catch (error) {
        console.error("Error loading agents info:", error);
    }
}

// ============ RESERVATION ============

document.getElementById("reserve-btn")?.addEventListener("click", async function() {
    if (!currentReservation) {
        alert("Please find parking first");
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/reserve-parking`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                user_id: "user_001",
                space_id: currentReservation.space_id,
                lot_id: currentReservation.lot_id,
                hours: 2
            })
        });
        
        const result = await response.json();
        
        if (result.status === "success") {
            alert(`Parking reserved! Reservation ID: ${result.reservation_id}\nTotal: $${result.total_price.toFixed(2)}`);
        } else {
            alert("Error: " + result.detail);
        }
    } catch (error) {
        console.error("Error reserving parking:", error);
        alert("Error: " + error.message);
    }
});

// ============ UTILITIES ============

document.getElementById("use-current-location")?.addEventListener("click", function() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function(position) {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            document.getElementById("user-location").value = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
        });
    } else {
        alert("Geolocation not supported");
    }
});

