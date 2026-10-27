/* ==========================================================================
   GLOBAL AIR POLLUTION DASHBOARD - JAVASCRIPT LOGIC & CHART.JS
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    initDashboard();
});

// Global Chart Instances
let chartTargetDist = null;
let chartTopCountries = null;
let chartPollutants = null;

// Color Palette for AQI Categories
const AQI_COLORS = {
    "Good": "#10B981",
    "Moderate": "#F59E0B",
    "Unhealthy for Sensitive Groups": "#F97316",
    "Unhealthy": "#EF4444",
    "Very Unhealthy": "#A855F7",
    "Hazardous": "#DC2626"
};

/**
 * Initializes the entire dashboard by fetching statistics, populating dropdowns,
 * rendering charts, and running initial simulation.
 */
async function initDashboard() {
    try {
        const response = await fetch('/api/stats');
        if (!response.ok) throw new Error("Failed to load dashboard statistics");
        const stats = await response.json();

        // 1. Update KPI Values
        document.getElementById('kpi-samples').innerText = stats.total_samples.toLocaleString();
        document.getElementById('kpi-countries').innerText = stats.total_countries.toLocaleString();
        
        if (stats.metadata && stats.metadata.metrics) {
            const acc = (stats.metadata.metrics.test_accuracy * 100).toFixed(2);
            document.getElementById('kpi-accuracy').innerText = `${acc}%`;
        }

        // 2. Populate Country Dropdown
        const countrySelect = document.getElementById('sim-country');
        countrySelect.innerHTML = '';
        stats.all_countries.forEach(country => {
            const option = document.createElement('option');
            option.value = country;
            option.textContent = country;
            if (country === "United States of America") option.selected = true;
            countrySelect.appendChild(option);
        });

        // 3. Render Analytics Charts
        renderTargetChart(stats.target_distribution);
        renderCountryChart(stats.top_countries);
        renderPollutantChart(stats.pollutant_stats);

        // 4. Fetch Violations Table Data
        fetchViolationsData();

        // 5. Run Initial Simulator Calculation
        runMLSimulation();

    } catch (error) {
        console.error("Dashboard initialization error:", error);
    }
}

/**
 * Updates output label when a slider moves.
 */
function updateSliderOutput(param) {
    const val = document.getElementById(`sim-${param}`).value;
    document.getElementById(`out-${param}`).value = val;
    runMLSimulation();
}

/**
 * Sends current simulator sliders and country selection to /api/predict.
 */
async function runMLSimulation() {
    const payload = {
        co_aqi_value: parseFloat(document.getElementById('sim-co').value),
        ozone_aqi_value: parseFloat(document.getElementById('sim-ozone').value),
        no2_aqi_value: parseFloat(document.getElementById('sim-no2').value),
        'pm2.5_aqi_value': parseFloat(document.getElementById('sim-pm25').value),
        country_name: document.getElementById('sim-country').value
    };

    try {
        const response = await fetch('/api/predict', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const res = await response.json();
        if (res.status === 'success') {
            updatePredictionOutput(res.predicted_category, res.confidence_score, res.probabilities);
        }
    } catch (err) {
        console.error("Simulation error:", err);
    }
}

/**
 * Renders the prediction hero badge and probability distribution bars.
 */
function updatePredictionOutput(category, confidence, probabilities) {
    const badge = document.getElementById('sim-pred-badge');
    badge.innerText = category;
    
    // Apply styling matching AQI category
    const catKey = category.trim();
    const color = AQI_COLORS[catKey] || "#3B82F6";
    badge.style.backgroundColor = `${color}25`;
    badge.style.color = color;
    badge.style.border = `1px solid ${color}60`;
    badge.style.boxShadow = `0 0 15px ${color}40`;

    document.getElementById('sim-conf-text').innerText = `${(confidence * 100).toFixed(2)}%`;

    // Render Probability Breakdown Bars
    const container = document.getElementById('prob-bars-container');
    container.innerHTML = '';

    Object.keys(probabilities).forEach(cls => {
        const probVal = probabilities[cls];
        const percent = (probVal * 100).toFixed(1);
        const clsColor = AQI_COLORS[cls] || "#3B82F6";

        const row = document.createElement('div');
        row.className = 'prob-row';
        row.innerHTML = `
            <div class="prob-meta">
                <span>${cls}</span>
                <strong>${percent}%</strong>
            </div>
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${percent}%; background: ${clsColor};"></div>
            </div>
        `;
        container.appendChild(row);
    });
}

/**
 * Sets quick station ID and triggers OpenAQ fetch.
 */
function setStation(locationId) {
    document.getElementById('openaq-location-id').value = locationId;
    fetchOpenAQLive();
}

/**
 * Fetches live OpenAQ data and runs ML inference via /api/openaq/predict.
 */
async function fetchOpenAQLive() {
    const locationId = document.getElementById('openaq-location-id').value;
    const apiKey = document.getElementById('openaq-key-input').value;

    const placeholder = document.getElementById('openaq-placeholder');
    const content = document.getElementById('openaq-content');

    placeholder.innerHTML = `<i class="fa-solid fa-spinner fa-spin" style="font-size: 36px;"></i><p>Streaming OpenAQ v3 sensor data & running ML inference...</p>`;
    content.classList.add('hidden');

    try {
        const response = await fetch('/api/openaq/predict', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                location_id: parseInt(locationId),
                api_key: apiKey ? apiKey : null
            })
        });

        const res = await response.json();
        if (res.status === 'success') {
            document.getElementById('openaq-locality').innerText = `${res.locality} (ID: ${res.location_id})`;
            document.getElementById('openaq-country').innerText = res.country_name;

            document.getElementById('openaq-pm25').innerText = res.pollutants['pm2.5_aqi_value'];
            document.getElementById('openaq-ozone').innerText = res.pollutants['ozone_aqi_value'];
            document.getElementById('openaq-no2').innerText = res.pollutants['no2_aqi_value'];
            document.getElementById('openaq-co').innerText = res.pollutants['co_aqi_value'];

            const badge = document.getElementById('openaq-predicted-badge');
            badge.innerText = res.predicted_category;
            const catKey = res.predicted_category.trim();
            const color = AQI_COLORS[catKey] || "#3B82F6";
            badge.style.backgroundColor = `${color}25`;
            badge.style.color = color;
            badge.style.border = `1px solid ${color}60`;

            const confPercent = (res.confidence_score * 100).toFixed(1);
            document.getElementById('openaq-conf-val').innerText = `${confPercent}%`;
            document.getElementById('openaq-conf-fill').style.width = `${confPercent}%`;

            placeholder.classList.add('hidden');
            content.classList.remove('hidden');
        }
    } catch (err) {
        placeholder.innerHTML = `<i class="fa-solid fa-triangle-exclamation" style="color: #EF4444;"></i><p>Error ingesting OpenAQ location ID ${locationId}</p>`;
    }
}

/**
 * Fetches regulatory violations and populates the compliance table.
 */
async function fetchViolationsData() {
    try {
        const response = await fetch('/api/violations');
        if (!response.ok) return;
        const data = await response.json();
        
        const tbody = document.getElementById('violations-table-body');
        tbody.innerHTML = '';

        data.records.forEach(rec => {
            const tr = document.createElement('tr');
            const actionBadge = rec.regulatory_violation_filed ? 
                `<span class="badge-tag danger"><i class="fa-solid fa-gavel"></i> Violation Filed</span>` :
                `<span class="badge-tag info"><i class="fa-solid fa-eye"></i> Exceedance Only</span>`;

            tr.innerHTML = `
                <td><strong>${rec.id}</strong></td>
                <td>${rec.country}</td>
                <td>${rec.region}</td>
                <td><span class="badge-tag warning">${rec.exceedance_pollutant}</span></td>
                <td><strong>${rec.measured_aqi}</strong> (Limit: ${rec.legal_threshold_aqi})</td>
                <td>${rec.exceedance_status}</td>
                <td>${actionBadge}</td>
                <td>${rec.enforcement_agency}</td>
                <td>${rec.status}</td>
            `;
            tbody.appendChild(tr);
        });

    } catch (err) {
        console.error("Error loading violations:", err);
    }
}

/**
 * Chart 1: Target Class Distribution Bar Chart
 */
function renderTargetChart(targetDist) {
    const ctx = document.getElementById('chart-target-dist').getContext('2d');
    if (chartTargetDist) chartTargetDist.destroy();

    const labels = Object.keys(targetDist);
    const data = Object.values(targetDist);
    const colors = labels.map(l => AQI_COLORS[l] || "#3B82F6");

    chartTargetDist = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Sample Count',
                data: data,
                backgroundColor: colors,
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: { ticks: { color: '#94A3B8' }, grid: { display: false } },
                y: { ticks: { color: '#94A3B8' }, grid: { color: 'rgba(255,255,255,0.05)' } }
            }
        }
    });
}

/**
 * Chart 2: Top Countries Horizontal Bar Chart
 */
function renderCountryChart(topCountries) {
    const ctx = document.getElementById('chart-countries').getContext('2d');
    if (chartTopCountries) chartTopCountries.destroy();

    const labels = Object.keys(topCountries);
    const data = Object.values(topCountries);

    chartTopCountries = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Record Count',
                data: data,
                backgroundColor: '#3B82F6',
                borderRadius: 6
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { ticks: { color: '#94A3B8' }, grid: { color: 'rgba(255,255,255,0.05)' } },
                y: { ticks: { color: '#94A3B8' }, grid: { display: false } }
            }
        }
    });
}

/**
 * Chart 3: Pollutants Mean vs Max Comparison Chart
 */
function renderPollutantChart(pollutantStats) {
    const ctx = document.getElementById('chart-pollutants').getContext('2d');
    if (chartPollutants) chartPollutants.destroy();

    const labels = ['CO AQI', 'Ozone AQI', 'NO2 AQI', 'PM2.5 AQI'];
    const keys = ['co_aqi_value', 'ozone_aqi_value', 'no2_aqi_value', 'pm2.5_aqi_value'];

    const means = keys.map(k => pollutantStats[k].mean);
    const maxs = keys.map(k => pollutantStats[k].max);

    chartPollutants = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                { label: 'Mean AQI', data: means, backgroundColor: '#06B6D4', borderRadius: 6 },
                { label: 'Maximum AQI', data: maxs, backgroundColor: '#EF4444', borderRadius: 6 }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { labels: { color: '#F8FAFC' } }
            },
            scales: {
                x: { ticks: { color: '#94A3B8' }, grid: { display: false } },
                y: { ticks: { color: '#94A3B8' }, grid: { color: 'rgba(255,255,255,0.05)' } }
            }
        }
    });
}

function refreshDashboardData() {
    initDashboard();
}
