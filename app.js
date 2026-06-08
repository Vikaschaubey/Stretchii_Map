

let vehicleData = [];

let vehicleMarkers = [];

let excelData = [];

let allRoutes = [];

let routeLayers = [];

let geofenceLayers = [];

let selectedRoute = null;

let activeMarkers = [];

const map = L.map("map").setView(
    [22.9734, 78.6569],
    5
);

let vehicleLayerGroup = L.layerGroup().addTo(map);

const routeListElement = document.getElementById("routeList");
const vehicleListElement = document.getElementById("vehicleList");
const routeCountElement = document.getElementById("routeCount");
const vehicleCountElement = document.getElementById("vehicleCount");
const routeSearchInput = document.getElementById("routeSearch");
const vehicleSearchInput = document.getElementById("vehicleSearch");

routeSearchInput.addEventListener("input", () => {
    filterRouteCards(routeSearchInput.value);
});

vehicleSearchInput.addEventListener("input", () => {
    filterVehicleCards(vehicleSearchInput.value);
});

L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
        attribution: "© OpenStreetMap",
        maxZoom: 19
    }
).addTo(map);

/* ==========================
   FILE UPLOAD
========================== */

document
.getElementById("fileInput")
.addEventListener("change", function (e) {

    const file = e.target.files[0];

    if (!file) return;

    const reader = new FileReader();

    reader.onload = function (event) {

        const workbook = XLSX.read(
            event.target.result,
            {
                type: "binary"
            }
        );

        const sheet =
            workbook.Sheets[
                workbook.SheetNames[0]
            ];

        excelData =
            XLSX.utils.sheet_to_json(
                sheet
            );

        alert(
            excelData.length +
            " routes loaded successfully."
        );
    };

    reader.readAsBinaryString(file);

});


document
.getElementById("vehicleFileInput")
.addEventListener(
    "change",
    function(e){

        const file =
        e.target.files[0];

        if(!file) return;

        const reader =
        new FileReader();

        reader.onload =
        function(event){

            const workbook =
            XLSX.read(
                event.target.result,
                {
                    type:"binary"
                }
            );

            const sheet =
            workbook.Sheets[
                workbook.SheetNames[0]
            ];

            vehicleData =
            XLSX.utils.sheet_to_json(
                sheet
            );

            alert(
                vehicleData.length +
                " vehicles loaded."
            );
        };

        reader.readAsBinaryString(
            file
        );

    }
);
/* ==========================
   UPLOAD BUTTON
========================== */

document
.getElementById("uploadBtn")
.addEventListener("click", function () {

    if (excelData.length === 0) {

        alert(
            "Please upload Excel file first."
        );

        return;
    }

    loadRoutes(excelData);

});

document
.getElementById(
    "uploadVehicleBtn"
)
.addEventListener(
    "click",
    function(){

        if(
            vehicleData.length === 0
        ){
            alert(
                "Upload vehicle file first."
            );
            return;
        }

        plotVehicles();

    }
);

/* ==========================
   CLEAR MAP
========================== */

function clearMap() {

    routeLayers.forEach(layer => {

        map.removeLayer(layer);

    });

    geofenceLayers.forEach(layer => {

        map.removeLayer(layer);

    });

    activeMarkers.forEach(marker => {

        map.removeLayer(marker);

    });

    routeLayers = [];
    geofenceLayers = [];
    activeMarkers = [];
    allRoutes = [];

    document.getElementById(
        "routeList"
    ).innerHTML = "";

}

/* ==========================
   HIGHLIGHT ROUTE
========================== */

function highlightRoute(route) {
    if (selectedRoute === route) {
        routeLayers.forEach(r => {
            r.setStyle({
                color: "blue",
                weight: 4
            });
        });

        selectedRoute = null;
        activeMarkers.forEach(marker => map.removeLayer(marker));
        activeMarkers = [];
        return;
    }

    routeLayers.forEach(r => {
        r.setStyle({
            color: "blue",
            weight: 4
        });
    });

    route.setStyle({
        color: "red",
        weight: 8
    });

    selectedRoute = route;
}

/* ==========================
   SHOW START END POINTS
========================== */

function showStretchMarkers(
    startLat,
    startLng,
    endLat,
    endLng
) {

    activeMarkers.forEach(marker => {

        map.removeLayer(marker);

    });

    activeMarkers = [];

    const startMarker =
        L.circleMarker(
            [startLat, startLng],
            {
                radius: 7,
                color: "green",
                fillColor: "green",
                fillOpacity: 1
            }
        ).addTo(map);

    const endMarker =
        L.circleMarker(
            [endLat, endLng],
            {
                radius: 7,
                color: "red",
                fillColor: "red",
                fillOpacity: 1
            }
        ).addTo(map);

    activeMarkers.push(startMarker);
    activeMarkers.push(endMarker);

}

/* ==========================
   LOAD ROUTES
========================== */

async function loadRoutes(data) {

    clearMap();

    let bounds = [];

    document.getElementById(
        "routeCount"
    ).innerHTML =
        "Total Routes : " +
        data.length;

    for (let i = 0; i < data.length; i++) {

        const row = data[i];

        const startLat =
            Number(row.start_lat);

        const startLng =
            Number(row.start_long);

        const endLat =
            Number(row.end_lat);

        const endLng =
            Number(row.end_long);

        if (
            isNaN(startLat) ||
            isNaN(startLng) ||
            isNaN(endLat) ||
            isNaN(endLng)
        ) {
            continue;
        }

        try {

            const url =
                `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`;

            const response =
                await fetch(url);

            const result =
                await response.json();

            if (
                !result.routes ||
                result.routes.length === 0
            ) {
                continue;
            }

            const coordinates =
                result.routes[0]
                .geometry.coordinates;

            const latlngs =
                coordinates.map(c => [
                    c[1],
                    c[0]
                ]);

            const route =
                L.polyline(
                    latlngs,
                    {
                        color: "blue",
                        weight: 4
                    }
                ).addTo(map);

            routeLayers.push(route);

            allRoutes.push({
                route,
                latlngs,
                data: row,
                startLat,
                startLng,
                endLat,
                endLng
            });

            route.on(
                "mouseover",
                () => {

                    showInfo(row);

                }
            );

            route.on(
                "click",
                () => {

                    highlightRoute(route);

                    showStretchMarkers(
                        startLat,
                        startLng,
                        endLat,
                        endLng
                    );

                    map.fitBounds(
                        route.getBounds()
                    );

                    showInfo(row);

                }
            );

            createRouteCard(
                route,
                row,
                startLat,
                startLng,
                endLat,
                endLng
            );

            bounds.push([
                startLat,
                startLng
            ]);

            bounds.push([
                endLat,
                endLng
            ]);

        }
        catch (error) {

            console.log(error);

        }

    }

    if (bounds.length > 0) {

        map.fitBounds(bounds);

    }

}

function clearVehicles() {

    vehicleLayerGroup.clearLayers();

    vehicleMarkers = [];
    vehicleListElement.innerHTML = "";
    vehicleCountElement.innerHTML = "";
    vehicleSearchInput.value = "";

}

function getAmbulanceRadiusMeters() {
    const zoom = map.getZoom();
    // Zoom 8-18 mapped to radius 50m down to 5m, clamped between 5m and 50m.
    const radius = 500 / Math.pow(2, zoom - 8);
    return Math.max(5, Math.min(50, radius));
}

map.on("zoomend", () => {
    const radius = getAmbulanceRadiusMeters();
    vehicleMarkers.forEach(marker => {
        if (marker.setRadius) {
            marker.setRadius(radius);
        }
    });
});

function plotVehicles(){
    clearVehicles();

    vehicleMarkers.forEach(
        marker => {

            map.removeLayer(
                marker
            );

        }
    );

    vehicleMarkers = [];

    vehicleData.forEach(
        vehicle => {

            const lat =
            Number(
                vehicle.vehicle_lat
            );

            const lng =
            Number(
                vehicle.vehicle_long
            );

            if(
                isNaN(lat) ||
                isNaN(lng)
            ){
                return;
            }

            const marker =
            L.circle(
                [lat,lng],
                {
                    radius: getAmbulanceRadiusMeters(),
                    color:"orange",
                    fillColor:"orange",
                    fillOpacity:0.3,
                    weight:2
                }
            ).addTo(vehicleLayerGroup);

            marker.bindPopup(
                `
                <b>Vehicle</b><br>
                ${vehicle.vehicle_no}
                `
            );

            marker.on(
                "mouseover",
                function(){

                    marker.openPopup();

                }
            );

            marker.on(
                "click",
                function(){
                    showVehicleInfo(vehicle, lat, lng, marker);
                }
            );

            vehicleMarkers.push(
                marker
            );
            createVehicleCard(vehicle, lat, lng, marker);

        }
    );

    vehicleCountElement.innerHTML =
        "Total Vehicles : " +
        vehicleMarkers.length;

    alert(
        vehicleMarkers.length +
        " vehicles plotted."
    );

}

function createVehicleCard(vehicle, lat, lng, marker) {
    const card = document.createElement("div");
    card.className = "route-card";
    const label = vehicle.vehicle_no || vehicle.Vehicle_No || vehicle.name || "Vehicle";
    card.innerHTML = label;
    card.dataset.search = Object.values(vehicle).join(" ").toLowerCase();
    card.onclick = () => {
        if (marker) {
            marker.openPopup();
            map.setView([lat, lng], 13);
        }
        showVehicleInfo(vehicle, lat, lng, marker);
    };
    vehicleListElement.appendChild(card);
}

function showVehicleInfo(vehicle, lat, lng, marker) {
    let html = "<table>";
    Object.keys(vehicle).forEach(key => {
        html += `
        <tr>
            <td><b>${key}</b></td>
            <td>${vehicle[key]}</td>
        </tr>
        `;
    });
    
    html += "</table>";
    document.getElementById("infoPanel").innerHTML = html;
}
/* ==========================
   ROUTE CARD
========================== */

function createRouteCard(
    route,
    row,
    startLat,
    startLng,
    endLat,
    endLng
) {

    const card =
        document.createElement(
            "div"
        );

    card.className =
        "route-card";

    const label =
        row.Stretch_ID ||
        row.Name ||
        row.UPC ||
        "Route";

    card.innerHTML = label;
    card.dataset.search = Object.values(row).join(" ").toLowerCase();

    card.onclick = () => {

        highlightRoute(route);

        showStretchMarkers(
            startLat,
            startLng,
            endLat,
            endLng
        );

        map.fitBounds(
            route.getBounds()
        );

        showInfo(row);

    };

    routeListElement.appendChild(card);

}

/* ==========================
   INFO PANEL
========================== */

function showInfo(row) {

    let html =
        "<table>";

    for (let key in row) {

        html += `
        <tr>
            <td><b>${key}</b></td>
            <td>${row[key]}</td>
        </tr>
        `;
    }

    html += "</table>";

    document
        .getElementById(
            "infoPanel"
        )
        .innerHTML = html;

}

function filterRouteCards(query) {
    const term = query.trim().toLowerCase();
    Array.from(routeListElement.children).forEach(card => {
        card.style.display =
            !term || card.dataset.search.includes(term)
                ? ""
                : "none";
    });
}

function filterVehicleCards(query) {
    const term = query.trim().toLowerCase();
    Array.from(vehicleListElement.children).forEach(card => {
        card.style.display =
            !term || card.dataset.search.includes(term)
                ? ""
                : "none";
    });
}

/* ==========================
   GENERATE GEOFENCE
========================== */

document
.getElementById(
    "generateBuffer"
)
.addEventListener(
    "click",
    generateBuffers
);

document
.getElementById(
    "exportMatchBtn"
)
.addEventListener(
    "click",
    exportMatchedSheet
);

function exportMatchedSheet() {
    if (geofenceLayers.length === 0) {
        alert("Please generate geofence first.");
        return;
    }

    const matchedRows = [];

    allRoutes.forEach(item => {
        if (!item.buffer) return;

        const routeProperties = item.data;

        vehicleData.forEach(vehicle => {
            const lat = Number(vehicle.vehicle_lat);
            const lng = Number(vehicle.vehicle_long);
            if (isNaN(lat) || isNaN(lng)) return;

            const point = turf.point([lng, lat]);
            const inside = turf.booleanPointInPolygon(point, item.buffer);
            if (!inside) return;

            const combined = {};
            Object.keys(routeProperties).forEach(k => {
                combined[`Route_${k}`] = routeProperties[k];
            });
            Object.keys(vehicle).forEach(k => {
                combined[`Vehicle_${k}`] = vehicle[k];
            });
            matchedRows.push(combined);
        });
    });

    if (matchedRows.length === 0) {
        alert("No vehicles found inside route geofences.");
        return;
    }

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(matchedRows);
    XLSX.utils.book_append_sheet(workbook, worksheet, "Matched Ambulances");
    XLSX.writeFile(workbook, "matched_routes_vehicles.xlsx");
}

function generateBuffers() {

    geofenceLayers.forEach(
        layer => {

            map.removeLayer(
                layer
            );

        }
    );

    geofenceLayers = [];

    const meters =
        Number(
            document
            .getElementById(
                "bufferDistance"
            )
            .value
        );

    allRoutes.forEach(
        item => {

            const coordinates =
                item.latlngs.map(
                    p => [
                        p[1],
                        p[0]
                    ]
                );

            const line =
                turf.lineString(
                    coordinates
                );

            const buffer =
                turf.buffer(
                    line,
                    meters,
                    {
                        units:
                            "meters"
                    }
                );

            const geoLayer =
                L.geoJSON(
                    buffer,
                    {
                        style: {
                            color:
                                "green",
                            weight: 2,
                            fillOpacity:
                                0.2
                        }
                    }
                ).addTo(map);

            item.buffer = buffer;

            geoLayer.on(
                "click",
                () => {

                    showInfo(
                        item.data
                    );

                }
            );

            geofenceLayers.push(
                geoLayer
            );

        }
    );

    alert(
        "Geofence Generated : " +
        meters +
        " meters"
    );

}
