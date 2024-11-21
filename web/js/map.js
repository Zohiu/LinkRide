var school_latitude = 53.8088002;
var school_longitude = 10.3978350;

var user_latitude = school_latitude;
var user_longitude = school_longitude;

var ellipse_position = L.latLng(school_latitude + (user_latitude - school_latitude) * 0.75, school_longitude + (user_longitude - school_longitude) * 0.75);


var searchPoints = L.geoJson(null, {
    onEachFeature: function (feature, layer) {
        layer.bindPopup(feature.properties.name);
    }
});
function showSearchPoints (geojson) {
    searchPoints.clearLayers();
    searchPoints.addData(geojson);
}

// Karte initialisieren
var mymap = L.map('mapid', {
    zoomSnap: 0.25,
    wheelPxPerZoomLevel: 100,
    zoomControl: false, 
    photonControl: true, 
    photonControlOptions: {
        resultsHandler: showSearchPoints, 
        placeholder: 'Adresse', 
        position: 'topleft', 
        url: "https://photon.komoot.io/api/?"
    }
});


searchPoints.addTo(mymap);
var tilelayer = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {maxZoom: 18, attribution: 'Data \u00a9 <a href="http://www.openstreetmap.org/copyright"> OpenStreetMap Contributors </a> Tiles \u00a9 Komoot'}).addTo(mymap);

function calculateAngle(lat1, lng1, lat2, lng2) {
    const R = 6371; // Radius of the Earth in kilometers

    // Convert latitude and longitude from degrees to radians
    const lat1Rad = toRadians(lat1);
    const lng1Rad = toRadians(lng1);
    const lat2Rad = toRadians(lat2);
    const lng2Rad = toRadians(lng2);

    // Calculate differences
    const dLat = lat2Rad - lat1Rad;
    const dLng = lng2Rad - lng1Rad;

    // Haversine formula
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.sin(dLng / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    // Calculate the angle in radians
    const angleRad = Math.atan2(Math.sin(dLng) * Math.cos(lat2Rad), Math.cos(lat1Rad) * Math.sin(lat2Rad) - Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLng));

    // Convert angle from radians to degrees
    const angleDegrees = toDegrees(angleRad);

    // Ensure the angle is between 0 and 360 degrees
    const positiveAngle = (angleDegrees + 360) % 360;

    return positiveAngle;
}

// Globale Variablen
var line, ellipse;

// Linie und Kreis initialisieren
function updateLineAndCircle() {
    var point1 = L.latLng(school_latitude, school_longitude);
    var point2 = L.latLng(user_latitude, user_longitude);
    var distance = mymap.distance(point1, point2) / 2;

    // Convert angle from radians to degrees
    const angleDegrees = calculateAngle(school_latitude, school_longitude, user_latitude, user_longitude) + 90;

    // Linie zwischen den Punkten
    if (line) {
        mymap.removeLayer(line);
    }
    line = L.polyline([point1, point2], {color: 'rgb(17, 25, 31)'}).addTo(mymap);
    
    // Kreis
    if (ellipse) {
        mymap.removeLayer(ellipse);
    }

    var rad1 = (document.getElementById('rad1').value / 100) * distance;
    var rad2 = (document.getElementById('rad2').value / 100) * distance;

    ellipse = L.ellipse(ellipse_position, [rad2, rad1], angleDegrees, {
        color: '#14a3d2',
        fillColor: '#14a3d2',
        fillOpacity: 0.5,
    }).addTo(mymap);
}


let rad1 = document.getElementById('rad1');
let rad2 = document.getElementById('rad2');
let pos = document.getElementById('pos');

let t_rad1 = document.getElementById('t_rad1');
let t_rad2 = document.getElementById('t_rad2');
let t_pos = document.getElementById('t_pos');


function map_update() {
    let position = 100 - pos.value;
    ellipse_position = L.latLng(school_latitude + (user_latitude - school_latitude) * (position / 100), school_longitude + (user_longitude - school_longitude) * (position / 100));

    t_rad1.textContent = "Breite (" + rad1.value + "%)"
    t_rad2.textContent = "Länge (" + rad2.value + "%)"
    t_pos.textContent = "Position (" + pos.value + "%)"
    updateLineAndCircle();
}


function toRadians(degrees) {
    return degrees * (Math.PI / 180);
}

function toDegrees(radians) {
    return radians * (180 / Math.PI);
}


var sliders = document.querySelectorAll('#rad1, #rad2, #pos, #control');

sliders.forEach(function(slider) {
    slider.addEventListener('mouseover', function() {
        mymap.dragging.disable();
    });

    slider.addEventListener('mouseout', function() {
        mymap.dragging.enable();
    });

    slider.addEventListener('touchstart', function() {
        mymap.dragging.disable();
    });

    slider.addEventListener('touchend', function() {
        mymap.dragging.enable();
    });
    slider.addEventListener('input', function() {
        map_update();
    });
});


// Initialer Aufruf zur Einrichtung
updateLineAndCircle();