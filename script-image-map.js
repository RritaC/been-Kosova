// Kosovo map with polygon shapes only (no background image)

const STORAGE_KEY = 'beenKosova_visited';

// Use polygon data
const cities = Object.keys(kosovoPolygons).map(id => ({
    id: id,
    name: kosovoPolygons[id].name,
    region: kosovoPolygons[id].region
}));

// Initialize with empty array - ensure it starts at 0%
let visitedCities = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
// Clear any invalid data on load
if (!Array.isArray(visitedCities)) {
    visitedCities = [];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(visitedCities));
}

// Validate visited cities - only keep valid city IDs
const validCityIds = Object.keys(kosovoPolygons);
const originalLength = visitedCities.length;
visitedCities = visitedCities.filter(id => validCityIds.includes(id));
if (visitedCities.length !== originalLength) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(visitedCities));
}

// Calculate center point of polygon for label placement
function getPolygonCenter(coordsString) {
    const coords = coordsString.split(',').map(Number);
    let sumX = 0, sumY = 0;
    for (let i = 0; i < coords.length; i += 2) {
        sumX += coords[i];
        sumY += coords[i + 1];
    }
    return {
        x: sumX / (coords.length / 2),
        y: sumY / (coords.length / 2)
    };
}

function drawMap() {
    const svg = d3.select("#kosovo-map");
    svg.selectAll("*").remove();

    // Set SVG viewBox - using approximate dimensions from polygon coordinates
    // Find max coordinates to set viewBox
    let maxX = 0, maxY = 0;
    Object.values(kosovoPolygons).forEach(poly => {
        const coords = poly.coords.split(',').map(Number);
        for (let i = 0; i < coords.length; i += 2) {
            maxX = Math.max(maxX, coords[i]);
            maxY = Math.max(maxY, coords[i + 1]);
        }
    });

    const viewBoxWidth = Math.ceil(maxX * 1.1);
    const viewBoxHeight = Math.ceil(maxY * 1.1);

    svg.attr("viewBox", `0 0 ${viewBoxWidth} ${viewBoxHeight}`)
        .attr("preserveAspectRatio", "xMidYMid meet");

    // Add filter for glow effect on visited cities
    const defs = svg.append("defs");
    const glowFilter = defs.append("filter")
        .attr("id", "glow")
        .attr("x", "-50%")
        .attr("y", "-50%")
        .attr("width", "200%")
        .attr("height", "200%");

    glowFilter.append("feGaussianBlur")
        .attr("stdDeviation", "3")
        .attr("result", "coloredBlur");

    const feMerge = glowFilter.append("feMerge");
    feMerge.append("feMergeNode").attr("in", "coloredBlur");
    feMerge.append("feMergeNode").attr("in", "SourceGraphic");

    // Draw Kosovo background
    svg.append("rect")
        .attr("width", viewBoxWidth)
        .attr("height", viewBoxHeight)
        .attr("fill", "#f9fafb");

    // Draw clickable polygons matching actual municipality shapes
    const municipalityData = Object.keys(kosovoPolygons).map(id => ({
        id: id,
        ...kosovoPolygons[id],
        center: getPolygonCenter(kosovoPolygons[id].coords)
    }));

    const municipalityPolygons = svg.selectAll(".municipality")
        .data(municipalityData)
        .enter()
        .append("g")
        .attr("class", "municipality-group");

    municipalityPolygons.append("path")
        .attr("class", "city")
        .attr("id", d => d.id)
        .attr("d", d => coordsToPath(d.coords))
        .attr("data-city", d => d.name)
        .attr("data-region", d => d.region)
        .attr("fill", d => {
            const regionColor = kosovoMapData.regions[d.region].color;
            return visitedCities.includes(d.id) ? "#16a34a" : regionColor;
        })
        .attr("fill-opacity", d => visitedCities.includes(d.id) ? 0.7 : 0.3)
        .attr("stroke", d => {
            const regionColor = kosovoMapData.regions[d.region].color;
            return visitedCities.includes(d.id) ? "#16a34a" : regionColor;
        })
        .attr("stroke-width", "1.5")
        .attr("stroke-opacity", "0.8")
        .attr("filter", d => visitedCities.includes(d.id) ? "url(#glow)" : null)
        .attr("cursor", "pointer")
        .on("click", function (event, d) {
            toggleCity(d.id);
        })
        .on("mouseenter", function (event, d) {
            const regionColor = kosovoMapData.regions[d.region].color;
            d3.select(this)
                .attr("stroke-width", "2.5")
                .attr("fill-opacity", visitedCities.includes(d.id) ? 0.8 : 0.4);
        })
        .on("mouseleave", function (event, d) {
            d3.select(this)
                .attr("stroke-width", "1.5")
                .attr("fill-opacity", visitedCities.includes(d.id) ? 0.7 : 0.3);
        });

    // Add municipality name labels
    municipalityPolygons.append("text")
        .attr("class", "municipality-label")
        .attr("x", d => d.center.x)
        .attr("y", d => d.center.y)
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "middle")
        .attr("font-size", "10px")
        .attr("font-weight", "500")
        .attr("fill", "#1a202c")
        .attr("pointer-events", "none")
        .text(d => d.name);

    municipalityPolygons.append("title")
        .text(d => d.name);

    // Create legend in HTML container
    createLegend();
}

function createLegend() {
    const legendContainer = document.getElementById('legend-container');
    if (!legendContainer) return;

    legendContainer.innerHTML = '';

    // Legend title
    const title = document.createElement('h3');
    title.className = 'legend-title';
    title.textContent = 'RAJONET';
    legendContainer.appendChild(title);

    // Legend items container
    const itemsContainer = document.createElement('div');
    itemsContainer.className = 'legend-items';

    Object.entries(kosovoMapData.regions).forEach(([key, region]) => {
        const item = document.createElement('div');
        item.className = 'legend-item';

        const colorBox = document.createElement('div');
        colorBox.className = 'legend-color';
        colorBox.style.backgroundColor = region.color;

        const label = document.createElement('span');
        label.className = 'legend-label';
        label.textContent = region.name;

        item.appendChild(colorBox);
        item.appendChild(label);
        itemsContainer.appendChild(item);
    });

    legendContainer.appendChild(itemsContainer);
}

function updateUI() {
    d3.selectAll(".city")
        .attr("fill", function () {
            const id = d3.select(this).attr("id");
            const region = d3.select(this).attr("data-region");
            const regionColor = kosovoMapData.regions[region]?.color || "#d1d5db";
            return visitedCities.includes(id) ? "#16a34a" : regionColor;
        })
        .attr("fill-opacity", function () {
            const id = d3.select(this).attr("id");
            return visitedCities.includes(id) ? 0.7 : 0.3;
        })
        .attr("stroke", function () {
            const id = d3.select(this).attr("id");
            const region = d3.select(this).attr("data-region");
            const regionColor = kosovoMapData.regions[region]?.color || "#d1d5db";
            return visitedCities.includes(id) ? "#16a34a" : regionColor;
        })
        .attr("stroke-width", "1.5")
        .attr("stroke-opacity", "0.8")
        .attr("filter", function () {
            const id = d3.select(this).attr("id");
            return visitedCities.includes(id) ? "url(#glow)" : null;
        });

    updateCityList();
    updateStats();
}

function updateCityList() {
    const container = document.getElementById('cities-container');
    if (!container) return;

    container.innerHTML = '';

    const sortedCities = [...cities].sort((a, b) => {
        if (a.region !== b.region) {
            return a.region.localeCompare(b.region);
        }
        return a.name.localeCompare(b.name);
    });

    sortedCities.forEach(city => {
        const cityItem = document.createElement('div');
        cityItem.className = `city-item ${visitedCities.includes(city.id) ? 'visited' : ''}`;
        cityItem.innerHTML = `
            <div class="city-checkbox"></div>
            <span>${city.name}</span>
        `;

        cityItem.addEventListener('click', () => toggleCity(city.id));
        container.appendChild(cityItem);
    });
}

function updateStats() {
    const visitedCount = visitedCities.length;
    const totalCount = cities.length;
    const completionRate = totalCount > 0 ? Math.min(100, Math.round((visitedCount / totalCount) * 100)) : 0;

    document.getElementById('visited-count').textContent = visitedCount;
    document.getElementById('total-count').textContent = totalCount;
    document.getElementById('completion-rate').textContent = `${completionRate}%`;

    const progressBar = document.getElementById('progress-bar');
    if (progressBar) {
        progressBar.style.width = `${completionRate}%`;
    }
}

function toggleCity(cityId) {
    const index = visitedCities.indexOf(cityId);
    if (index > -1) {
        visitedCities.splice(index, 1);
    } else {
        visitedCities.push(cityId);
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(visitedCities));
    updateUI();
}

// Toggle cities section functionality
function setupCitiesToggle() {
    const header = document.getElementById('cities-header');
    const grid = document.querySelector('.cities-grid');

    if (header && grid) {
        // Ensure it starts hidden
        grid.classList.remove('show');
        header.classList.remove('active');

        header.addEventListener('click', function (e) {
            e.stopPropagation();
            const isActive = grid.classList.toggle('show');
            header.classList.toggle('active', isActive);
        });
    }
}

document.addEventListener('DOMContentLoaded', function () {
    drawMap();
    updateUI();
    setupCitiesToggle();
});

