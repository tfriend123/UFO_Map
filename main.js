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
                comments: d.comments,
                date: d.date_posted
            };
        }
    }).then((data, err2) => {

        var isActive = false;
        let stateMap;
        var markers = [];
        var cities = [];
        var coords = []
        var isOverlap = false;

        // – On-Click GeoJson Loader –––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––– \\

        function jsonLoader (map, stateName){
            if (isActive && stateMap) {
                map.removeLayer(stateMap);
                //container.removeContainer();
                countryMap.addTo(map);
                isActive = false;
            }
            else{
                //container.addTo(map);
                //barChart();
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

                             if (!latLongSort(lat, long)){
                                 markerMaker(lat, long, data[i]["comments"], data[i]["city"], data[i]["date"]);
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
            this._div.innerHTML = "<h4>UFO Sightings in the US</h4>" + '<b>' +
                "Mouseover for sightings <br> Click for state specifics" + '</b></br>';
            return this._div;
        };

        legend.update = function (name) {
            if (name === "UFO Sightings in the US") {
                this._div.innerHTML = "<h4>" + name + "</h4>" + '<b>' + '<b>' +
                    "Mouseover for sightings <br> Click for state specifics" + '</b></br>';
            } else {
                this._div.innerHTML = "<h4>" + name + "</h4>" + '<b>' +
                    "Click on a UFO to learn more <br> Click the state to leave " +
                    "<br> Hover over state to see it on chart" + '</b></br>';
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

        // – Highlight Map –––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––– \\

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
        // – Toggle Map ––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––– \\

        function toggleMap(e) {
            let mapName = "";
            var clickedFeature = e.target.feature;
            if (!clickedFeature) return;

            else if (map.hasLayer(countryMap)) {
                jsonLoader(map, clickedFeature.properties.name);
                container.addTo(map);
                barChart();
                mapName = clickedFeature.properties.name + " UFO Sightings";
            }
            else {
                container.removeContainer();
                map.addLayer(countryMap);
                map.removeLayer(stateMap);
                map.setView([38.5, -96], 5);
                mapName = "UFO Sightings in the US";
                markers.forEach(marker => map.removeLayer(marker));
                markers = [];
            }
            legend.update(mapName);
        }

        // – On Each Feature –––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––– \\

        function onEachFeature(feature, layer) {
            layer.on({
                mouseover: highlightFeature,
                mouseout: resetHighlight,
                click: toggleMap
            });
            layer.on({
                mouseover: function (e) {
                    highlightFeature(e);
                    highlightBar(feature.properties["abbreviation"]); // Highlight bar
                },
                mouseout: function (e) {
                    resetHighlight(e);
                    resetBarHighlight(); // Reset bar color
                },
                click: toggleMap
            });
        }

        // – Markers –––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––– \\

        function markerMaker(x, y, comment, place, datePost){
            marker = L.marker([x, y],
                {icon: sighting}).addTo(map);
            marker.bindPopup('<h2>' + place + ": " + datePost + '</h2>' + comment);
            markers.push(marker);
        }

        var sighting = L.icon({
            iconUrl: 'icons/space.png',
            iconSize:     [39.5, 50], // size of the icon
            iconAnchor:   [22, 50], // point of the icon which will correspond to marker's location
            popupAnchor:  [-3, -76] // point from which the popup should open relative to the iconAnchor
        });

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

        // – Chart Maker –––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––– \\

        var container = L.control({ position: 'bottomright' });

        container.onAdd = function(){
            var div = L.DomUtil.create('my_graph', 'chart-container');
            div.style.width = '350px';
            div.style.height = '400px';
            div.style.background = 'white';
            div.style.border = '4px solid #cf9c3f';
            div.style.padding = '10px';
            div.style.overflow = 'hidden';
            container._div = div;
            return div;
        }

        container.removeContainer = function() {
            d3.select("#my_graph").remove();
            map.removeControl(this); // Correctly remove the entire control from the map
        }

        function barChart () {
            const margin = { top: 20, right: 20, bottom: 50, left: 50 };
            const width = 350 - margin.left - margin.right;
            const height = 400 - margin.top - margin.bottom;

            const svg = d3.select('.chart-container')
                .append('svg')
                .attr('width', width + margin.left + margin.right)
                .attr('height', height + margin.top + margin.bottom)
                .append('g')
                .attr('transform', `translate(${margin.left},${margin.top})`);

            const stateDurations = d3.rollups(
                data,
                v => d3.median(v, d => d.duration),
                d => d.state
            );

            const sortedData = stateDurations.sort((a, b) => b[1] - a[1]);

            const x = d3.scaleBand()
                .domain(sortedData.map(d => d[0]))
                .range([0, width])
                .padding(0.2);

            const y = d3.scaleLinear()
                .domain([0, d3.max(sortedData, d => d[1])])
                .nice()
                .range([height, 0]);

            /*
            svg.append('g')
                .attr('transform', `translate(0,${height})`)
                .call(d3.axisBottom(x))
                .selectAll('text')
                .attr('transform', 'rotate(-45)')
                .style('text-anchor', 'end')
             */

            svg.append("text")
                .attr("x", width / 2) // Position horizontally at the center of the chart
                .attr("y", height -300) // Position below the X-axis
                .attr("fill", "#b24363") // Text color
                .attr("text-anchor", "middle") // Center the text
                .text("Median Duration of Sightings (in seconds)");

            svg.append("text")
                .attr("x", width / 2) // Position horizontally at the center of the chart
                .attr("y", height + 30) // Position below the X-axis
                .attr("fill", "#cf9c3f") // Text color
                .attr("text-anchor", "middle") // Center the text
                .text("States");

            svg.append("text")
                .attr("x", -170) // Position horizontally at the center of the chart
                .attr("y", -40) // Position below the X-axis
                .attr("fill", "#cf9c3f") // Text color
                .attr("text-anchor", "middle") // Center the text
                .attr('transform', 'rotate(-90)')
                .text("Seconds");

            svg.append('g').call(d3.axisLeft(y));

            // Bars
            svg.selectAll('.bar')
                .data(sortedData)
                .join('rect')
                .attr('class', 'bar')
                .attr('x', d => x(d[0]))
                .attr('y', d => y(d[1]))
                .attr('width', x.bandwidth())
                .attr('height', d => height - y(d[1]))
                .attr('fill', '#cf9c3f')
                .on('mouseover', (event, d) => {
                    d3.select(event.target).attr('fill', '#b24363');
                })
                .on('mouseout', (event, d) => {
                    d3.select(event.target).attr('fill', '#cf9c3f');
                });

            return svg;
        }

        function highlightBar(stateAbbreviation) {
            d3.selectAll('.bar')
                .attr('fill', d => d[0] === stateAbbreviation ? '#b24363' : '#cf9c3f');
        }

        function resetBarHighlight() {
            d3.selectAll('.bar').attr('fill', '#cf9c3f');
        }
    })
});


/*
    Date Source: https://www.kaggle.com/datasets/NUFORC/ufo-sightings

    This map depicts reports gathered by the National UFO Report Center.
    Leaflet Map and original Marker design

    Any data points from the same town/city or identical coordinates when reduced to two decimal places
    were removed for the sake of loading thousands of points efficiently.

    Timothy Friend 12/13/2024

    Map uses d3 elements to load data and geojsons
        – d3 also determines the color of the heatmap
 */