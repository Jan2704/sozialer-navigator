import { slugify } from './slugify';

export function getDistrictSlug(districtName: string): string {
    let name = districtName.split(' - ')[0]; // E.g., "Bezirksamt Mitte von Berlin"
    name = name.replace(/^Bezirksamt\s+/i, ''); // "Mitte von Berlin"
    name = name.replace(/\svon\sBerlin$/i, ''); // "Mitte"
    return slugify(name);
}

export function getCleanDistrictName(districtName: string): string {
    let name = districtName.split(' - ')[0]; 
    name = name.replace(/^Bezirksamt\s+/i, ''); 
    name = name.replace(/\svon\sBerlin$/i, ''); 
    return name;
}
