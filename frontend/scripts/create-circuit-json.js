/**
 * Script to create a simplified JSON file with just the 24 circuits
 */

const fs = require('fs');
const path = require('path');

const CIRCUIT_IDS = [
    'au-1953', 'cn-2004', 'jp-1962', 'bh-2002', 'sa-2021', 'us-2022',
    'it-1953', 'mc-1929', 'es-1991', 'ca-1978', 'at-1969', 'gb-1948',
    'be-1925', 'hu-1986', 'nl-1948', 'it-1922', 'az-2016', 'sg-2008',
    'us-2012', 'mx-1962', 'br-1940', 'us-2023', 'qa-2004', 'ae-2009'
];

const geojsonPath = path.join(__dirname, '..', 'public', 'data', 'circuits', 'f1-circuits.geojson');
const geojsonData = JSON.parse(fs.readFileSync(geojsonPath, 'utf-8'));

const circuits = geojsonData.features
    .filter(feature => CIRCUIT_IDS.includes(feature.properties.id))
    .map(feature => ({
        id: feature.properties.id,
        name: feature.properties.Name,
        location: feature.properties.Location,
        length: feature.properties.length,
        altitude: feature.properties.altitude,
        opened: feature.properties.opened,
        coordinates: feature.geometry.coordinates
    }))
    .sort((a, b) => CIRCUIT_IDS.indexOf(a.id) - CIRCUIT_IDS.indexOf(b.id));

const outputPath = path.join(__dirname, '..', 'public', 'data', 'circuits', 'f1-2024-circuits.json');
fs.writeFileSync(outputPath, JSON.stringify({ circuits }, null, 2));

console.log(`✅ Created simplified JSON with ${circuits.length} circuits`);
