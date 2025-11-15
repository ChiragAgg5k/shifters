/**
 * Script to extract F1 circuits from GeoJSON and generate TypeScript circuit data
 */

const fs = require('fs');
const path = require('path');

// Circuit IDs we want to extract (2024 F1 Calendar)
const CIRCUIT_IDS = [
    'au-1953', // Melbourne - Albert Park
    'cn-2004', // Shanghai
    'jp-1962', // Suzuka
    'bh-2002', // Bahrain
    'sa-2021', // Jeddah
    'us-2022', // Miami
    'it-1953', // Imola
    'mc-1929', // Monaco
    'es-1991', // Barcelona
    'ca-1978', // Montreal
    'at-1969', // Red Bull Ring
    'gb-1948', // Silverstone
    'be-1925', // Spa
    'hu-1986', // Hungaroring
    'nl-1948', // Zandvoort
    'it-1922', // Monza
    'az-2016', // Baku
    'sg-2008', // Singapore
    'us-2012', // Austin (COTA)
    'mx-1962', // Mexico City
    'br-1940', // Sao Paulo (Interlagos)
    'us-2023', // Las Vegas
    'qa-2004', // Losail (Qatar)
    'ae-2009'  // Yas Marina (Abu Dhabi)
];

// Read the GeoJSON file
const geojsonPath = path.join(__dirname, '..', 'public', 'data', 'circuits', 'f1-circuits.geojson');
const geojsonData = JSON.parse(fs.readFileSync(geojsonPath, 'utf-8'));

// Filter and format circuits
const circuits = geojsonData.features
    .filter(feature => CIRCUIT_IDS.includes(feature.properties.id))
    .map(feature => {
        const props = feature.properties;
        const coords = feature.geometry.coordinates;

        // Format coordinates as array of [lon, lat] arrays
        const formattedCoords = coords.map(coord => `[${coord[0]},${coord[1]}]`).join(',');

        return {
            id: props.id,
            name: props.Name,
            location: props.Location,
            length: props.length,
            coordinates: formattedCoords
        };
    })
    .sort((a, b) => {
        // Sort by calendar order
        return CIRCUIT_IDS.indexOf(a.id) - CIRCUIT_IDS.indexOf(b.id);
    });

// Generate TypeScript file
const tsContent = `/**
 * F1 Circuit Data
 * Extracted from f1-circuits.geojson
 * 2024 F1 Calendar - 24 Circuits
 */

export interface Circuit {
  id: string
  name: string
  location: string
  length: number
  coordinates: number[][]
}

export const F1_CIRCUITS: Circuit[] = [
${circuits.map(circuit => `  {
    id: '${circuit.id}',
    name: '${circuit.name}',
    location: '${circuit.location}',
    length: ${circuit.length},
    coordinates: [${circuit.coordinates}]
  }`).join(',\n')}
]
`;

// Write to file
const outputPath = path.join(__dirname, '..', 'lib', 'data', 'circuits.ts');
fs.writeFileSync(outputPath, tsContent);

console.log(`✅ Extracted ${circuits.length} circuits to ${outputPath}`);
console.log('\nCircuits:');
circuits.forEach((circuit, index) => {
    console.log(`  ${index + 1}. ${circuit.name} (${circuit.location})`);
});
