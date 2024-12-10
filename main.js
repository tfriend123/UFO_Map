d3.json("Data/us-states.json").then((geojson,err1)=> {
    d3.dsv(",", "Data/ufoReport.csv", (d) => {
        if ((d["country"] === "us") &&
            (d["state"] != null) &&
            (d["city"] != null) &&
            !isNaN(+d["duration_seconds"]) &&
            !isNaN(+d["latShort"]) &&
            !isNaN(+d["LongShort"])) {

            return {
                country: d.country,
                state: d.state,
                city: d.city,
                duration: +d.duration_seconds,
                lat: +d.latShort,
                long: +d.LongShort,
                comments: d.comments
            };
        }
    }).then((data, err2) => {

        var isActive = false;
        let stateMap;
        var markers = [];
        var cities = [];
        var coords = []
        var isThere = false;
        var isOverlap = false;


        // – Calculate Statistics ––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––– \\

        function avgCalc(){
            var count = 0;
            for (let i = 0; i < data.length; i++){
                count += data[i]["duration"];
            }
            return (count/data.length)/60;
        }

        var avgTime = avgCalc();
        var medianTime = 1800/60 //pulled 1800 from center of data when sorted by ascending value.

        // – On-Click GeoJson Loader –––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––– \\

        function jsonLoader (map, stateName){
            if (isActive && stateMap){
                map.removeLayer(stateMap);
                countryMap.addTo(map);
                isActive = false;
            }
            d3.dsv(",", "Data/stateCenters.csv", (d) => {
                return{
                    stateName: d.Name,
                    x: +d.Lat,
                    y: +d.Long,
                    zoom: +d.Zoom
                }
            }).then((centers, err2) => {
                console.log(stateName);
                d3.json("Data/" + stateName + ".geojson").then((geojsonS) => {

                    geojsonS.properties["count"] = 0;
                    cities = [];
                    coords = [];

                    for (let i = 0; i < data.length; i++) {
                         if (geojsonS.properties["abbreviation"] === data[i]["state"]){

                             geojsonS.properties["count"]++;

                             var lat = data[i]["lat"];
                             var long = data[i]["long"];

                             if (!citySort(data[i]["city"]) && !latLongSort(lat, long)){
                                 markerMaker(lat, long, data[i]["comments"], data[i]["city"]);
                                 cities.push(data[i]["city"]);
                                 coords.push(lat);
                                 coords.push(long);
                             }
                         }
                    }

                    isActive = true;

                    const center = centers.find(c => c.stateName === stateName);
                    const x = center.x;
                    const y = center.y;
                    const zoom = center.zoom;

                    map.setView([x, y], zoom);

                    map.removeLayer(countryMap);
                    stateMap = L.geoJson(geojsonS, {
                        style: singleState,
                        onEachFeature: onEachFeature
                    });
                    stateMap.addTo(map);
                })
            })
        }
        // – Map –––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––– \\

        var map = L.map('map', {
            center: [38.5, -96], // Centered over the US
            zoom: 5,
            minZoom: 2,
            maxZoom: 10,
            attributionControl: false,
            zoomControl: true
        });

        var southWest = L.latLng(-60, -180); // Southwest corner of the world
        var northEast = L.latLng(85, 187); // Northeast corner of the world
        map.setMaxBounds(L.latLngBounds(southWest, northEast));

        map.on('drag', function () {
            map.panInsideBounds(map.getBounds());
        });

        // – Info ––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––– \\

        var info = L.control({position: 'topleft'});

        info.onAdd = function (map) {
            this._div = L.DomUtil.create('div', 'info');
            hideInfoBox();
            this.update();
            return this._div;
        };

        info.update = function (props) {
            let message = "<b>No Sightings</b>";

            if (props && props.count > 0) {
                message = '<b>' + props.count + ' Sightings!' + '</b>';
            }

            if (props && props.count == 1) {
                message = '<b>' + props.count + ' Sighting!' + '</b>';
            }

            this._div.innerHTML = (props ?
                '<h4>' + props.name + '</h4>' + message
                : 'Hover over the map');
        };
        info.addTo(map);

        function onMapMouseMove(e) {
            var mapContainer = map.getContainer().getBoundingClientRect();
            var boxWidth = info._div.offsetWidth;
            var boxHeight = info._div.offsetHeight;
            var x = e.originalEvent.clientX - mapContainer.left;
            var y = e.originalEvent.clientY - mapContainer.top;

            // Check boundaries to keep the box inside the map
            x = Math.min(x, mapContainer.width - boxWidth - 35); // 10px padding from right edge
            y = Math.min(y, mapContainer.height - boxHeight - 110); // 10px padding from bottom edge
            x = Math.max(x, 35); // 10px padding from left edge
            y = Math.max(y, 10); // 10px padding from top edge

            info._div.style.left = x + 'px';
            info._div.style.top = y + 'px';
        }

        function showInfoBox() {
            info._div.style.display = 'block';
        }

        function hideInfoBox() {
            info._div.style.display = 'none';
        }

        // – Title –––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––– \\

        var legend = L.control({position: 'topright'});

        legend.onAdd = function (map) {
            this._div = L.DomUtil.create('div', 'legend');
            this._div.innerHTML = "<h4>UFO Sightings in the US</h4>" + '<b>' + "Mouseover for sightings <br> Click for state specifics" + '</b></br>';
            return this._div;
        };

        legend.update = function (name) {
            if (name === "UFO Sightings in the US") {
                this._div.innerHTML = "<h4>" + name + "</h4>" + '<b>' + '<b>' + "Mouseover for sightings <br> Click for state specifics" + '</b></br>';
            } else {
                this._div.innerHTML = "<h4>" + name + "</h4>" + '<b>' + "Click on a UFO to learn more" + '</b></br>';
            }

        }

        legend.addTo(map);

        // – Color –––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––– \\

        function colorScale(d){
            const myColor = d3.scaleLinear()
                .range(["white", "#7faf22"])
                .domain([1,5000]);
            return myColor(d);
        }

        function state_styleLarge(feature) {
            return {
                fillColor: colorScale(feature.properties["count"]),
                weight: 2,
                opacity: 1,
                color: '#ffffff',
                fillOpacity: 1
            };
        }

        function singleState(){
            return{
                fillColor: "#cfcfcf",
                weight: 2,
                opacity: 1,
                color: "white",
                fillOpacity: 1
            };
        }

        // – Functions –––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––– \\

        function highlightFeature(e) {
            var layer = e.target;

            layer.setStyle({
                weight: 5,
                color: '#ffffff',
                dashArray: '',
                fillOpacity: 1
            });

            layer.bringToFront();
            info.update(layer.feature.properties);
            showInfoBox();
            map.on('mousemove', onMapMouseMove);
        }

        function resetHighlight(e) {
            var layer = e.target;

            layer.setStyle({
                weight: 2,
                color: '#ffffff',
                dashArray: '',
                fillOpacity: 1
            });
            info.update();
            hideInfoBox();
            map.off('mousemove', onMapMouseMove);
        }

        function toggleMap(e) {
            let mapName = "";
            var clickedFeature = e.target.feature;
            if (!clickedFeature) return;

            else if (map.hasLayer(countryMap)) {
                jsonLoader(map, clickedFeature.properties.name);
                mapName = clickedFeature.properties.name + " UFO Sightings";
            }
            else {
                map.addLayer(countryMap);
                map.removeLayer(stateMap);
                map.setView([38.5, -96], 5);
                mapName = "UFO Sightings in the US";
                markers.forEach(marker => map.removeLayer(marker));
                markers = [];
            }
            legend.update(mapName);
        }

        function onEachFeature(feature, layer) {
            layer.on({
                mouseover: highlightFeature,
                mouseout: resetHighlight,
                click: toggleMap
            });
        }

        // – Markers –––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––– \\

        function markerMaker(x, y, comment, place){
            marker = L.marker([x, y],
                {icon: sighting}).addTo(map);
            marker.bindPopup('<h2>' + place + '</h2>' + comment).openPopup();
            markers.push(marker);
        }

        var sighting = L.icon({
            iconUrl: 'icons/space.png',
            iconSize:     [39.5, 50], // size of the icon
            iconAnchor:   [22, 50], // point of the icon which will correspond to marker's location
            popupAnchor:  [-3, -76] // point from which the popup should open relative to the iconAnchor
        });

        // – City Sorter –––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––– \\

        function citySort(city){
            isThere = false;
            for (let i = 0; i < cities.length; i++){
                if (cities[i] === city){
                    isThere = true;
                    break;
                }
            }
            return isThere;
        }

        // – LongLat Sorter ––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––– \\

        function latLongSort(lat, long){
            isOverlap = false;
            for (let i = 0; i < coords.length; i++){
                if (coords[i] === lat && coords[i+1] === long){
                    isOverlap = true;
                    break;
                }
            }
            return isOverlap;
        }

        // – USA –––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––– \\

        for (let i = 0; i < geojson.features.length; i++) {
            geojson.features[i].properties["count"] = 0; // Initialize count

            for (let j = 0; j < data.length; j++) {
                if (geojson.features[i].properties["abv"] === data[j]["state"]) {
                    geojson.features[i].properties["count"]++;
                }
            }
        }

        let countryMap = L.geoJson(geojson, {
            style: state_styleLarge,
            onEachFeature: onEachFeature
        }).addTo(map);
    })
});


/*
    Date Source: https://www.kaggle.com/datasets/NUFORC/ufo-sightings

    This map depicts reports gathered by the National UFO Report Center.
    Leaflet Map and original Marker design

    Any data points from the same town/city or identical coordinates when reduced to two decimal places
    were removed for the sake of loading thousands of points efficiently.

    Timothy Friend 12/13/2024
 */