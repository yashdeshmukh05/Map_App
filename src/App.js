import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, FeatureGroup } from "react-leaflet";
import { EditControl } from "react-leaflet-draw";
import "leaflet/dist/leaflet.css";
import axios from "axios";
import L from "leaflet";
import "leaflet-draw/dist/leaflet.draw.css";
import { IoRestaurant } from "react-icons/io5"; // Updated icon for restaurants
import ReactDOMServer from "react-dom/server"; // Correct import

// Default marker icon configuration
let DefaultIcon = L.icon({
  iconUrl: "leaflet/dist/images/marker-icon.png",
  shadowUrl: "leaflet/dist/images/marker-shadow.png",
});
L.Marker.prototype.options.icon = DefaultIcon;

// Base maps
const baseMaps = {
  OpenStreetMap: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  Satellite: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
};

const RestaurantFinderMap = () => {
  const [currentLocation, setCurrentLocation] = useState([18.51957, 73.85535]);
  const [selectedBaseMap, setSelectedBaseMap] = useState("OpenStreetMap");
  const [posMarkers, setPosMarkers] = useState([]);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setCurrentLocation([latitude, longitude]);
        },
        (error) => {
          console.error("Error getting current location: ", error);
        }
      );
    }
  }, []);

  const handleBaseMapChange = (event) => {
    setSelectedBaseMap(event.target.value);
  };

  const makeOverpassQuery = (qstrg) => {
    const coordinates = qstrg.split(" ");
    coordinates.pop();
    let ply1 = "";
    for (let i = 0; i < coordinates.length; i += 2) {
      const lat = coordinates[i];
      const lon = coordinates[i + 1];
      ply1 += `${lat} ${lon} `;
    }
    return `[out:json];node["amenity"="restaurant"](poly:"${ply1.trim()}");out;`;
  };

  const addMarkers = (latlons) => {
    setPosMarkers(latlons);
  };

  const handleDrawCreated = (e) => {
    const { layer } = e;
    const points = layer.toGeoJSON().geometry.coordinates[0];
    let qstrg = "";
    points.forEach((point) => {
      const x = point[0];
      const y = point[1];
      qstrg += `${y} ${x} `;
    });

    const qry = makeOverpassQuery(qstrg);
    const encodedQuery = encodeURIComponent(qry);
    const overpassApiUrl = `https://overpass-api.de/api/interpreter?data=${encodedQuery}`;

    axios
      .get(overpassApiUrl)
      .then((response) => {
        const restaurants = response.data.elements.filter(
          (node) => node.tags && node.tags.name
        );
        const restaurantData = restaurants.map((restaurant) => [
          [restaurant.lat, restaurant.lon],
          restaurant.tags.name || "Unnamed Restaurant",
        ]);
        addMarkers(restaurantData);
      })
      .catch((error) => {
        console.log("Error fetching data:", error);
      });
  };

  // Custom divIcon with FaUtensils
  const restaurantIcon = new L.DivIcon({
    html: ReactDOMServer.renderToString(<IoRestaurant size={25} color="orange" />), // Render to HTML string
    className: "custom-div-icon", // Optional: Add a custom class for styling
    iconAnchor: [16, 32], // Adjust anchor point
    popupAnchor: [0, -32], // Adjust popup position
  });

  return (
    <MapContainer
      center={currentLocation}
      zoom={13}
      style={{ height: "100vh", width: "100%" }}
    >
      <TileLayer
        attribution="&copy; <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a> contributors"
        url={baseMaps[selectedBaseMap]}
      />
      {posMarkers.map((data, index) => (
        <Marker position={data[0]} key={index} icon={restaurantIcon}>
          <Popup>{data[1]}</Popup>
        </Marker>
      ))}
      <FeatureGroup>
        <EditControl
          position="topright"
          onCreated={handleDrawCreated}
          draw={{
            rectangle: true,
            polyline: false,
            circle: false,
            circlemarker: false,
            marker: false,
          }}
        />
      </FeatureGroup>
      <div className="absolute top-10 right-10 bg-white p-4 rounded shadow-lg z-10">
        <label htmlFor="baseMapSelect" className="block mb-2">Base Map:</label>
        <select
          id="baseMapSelect"
          value={selectedBaseMap}
          onChange={handleBaseMapChange}
          className="border p-2 rounded"
        >
          {Object.keys(baseMaps).map((mapName) => (
            <option key={mapName} value={mapName}>
              {mapName}
            </option>
          ))}
        </select>
      </div>
    </MapContainer>
  );
};

export default RestaurantFinderMap;
