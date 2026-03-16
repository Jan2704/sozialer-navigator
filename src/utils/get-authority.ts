import authoritiesShort from '../data/authorities.json';
import cities from '../data/cities_2026.json';

// Type definitions
export interface Authority {
    name: string;
    address: string;
    email?: string;
    lat?: number;
    lng?: number;
}

export interface AuthorityResult {
    authority: Authority;
    isDistrict: boolean;
    districtName?: string;
    found: boolean;
}

// Helper to normalize strings for comparison
const normalize = (str: string) => str.trim().toLowerCase();

export const getAuthority = (cityName: string, plz: string, type: 'wohngeld' | 'jobcenter' = 'wohngeld'): AuthorityResult => {
    const cityKey = Object.keys(authoritiesShort).find(
        (key) => normalize(key) === normalize(cityName)
    );

    const cityData = cityKey ? (authoritiesShort as any)[cityKey] : null;

    // Case 1: City found in our manual high-res map
    if (cityData) {
        if (cityData.type === 'district') {
            // Find district for PLZ
            const district = cityData.districts.find((d: any) => d.plz.includes(plz));

            if (district) {
                // Support new structure (authorities object)
                if (district.authorities && district.authorities[type]) {
                    return {
                        authority: district.authorities[type],
                        isDistrict: true,
                        districtName: district.name,
                        found: true
                    };
                }
                // Legacy support (authority object is usually Wohngeld)
                if (district.authority) {
                    // If requesting jobcenter but only legacy authority exists, return fallback or maybe the legacy one if appropriate?
                    // Strict interpretation: if we want jobcenter and don't have it, maybe return fallback?
                    // For now, if type is wohngeld, return authority.
                    if (type === 'wohngeld') {
                        return {
                            authority: district.authority,
                            isDistrict: true,
                            districtName: district.name,
                            found: true
                        };
                    }
                }
            }

            // District not found or authority skipped. Use Fallback.
            // Check new fallback structure
            if (cityData.fallback) {
                if (cityData.fallback[type] && !cityData.fallback.name) {
                    return { authority: cityData.fallback[type], isDistrict: false, found: true };
                }
                if (cityData.fallback.name && type === 'wohngeld') {
                    return { authority: cityData.fallback, isDistrict: false, found: true };
                }
            }

            // Absolute fallback (just first district first auth?)
            return {
                authority: { name: `Behörde (${type})`, address: `Unbekannte Adresse in ${cityName}` },
                isDistrict: false,
                found: false
            };

        } else {
            // Central authority logic
            // Check if central city has new structure
            if (cityData.authorities && cityData.authorities[type]) {
                return { authority: cityData.authorities[type], isDistrict: false, found: true };
            }
            if (cityData.authority && type === 'wohngeld') {
                return { authority: cityData.authority, isDistrict: false, found: true };
            }
        }
    }

    // Case 2 & 3: Look up in the larger cities_2026 dataset (Wohngeld only mostly)
    // If asking for Jobcenter and not in manual map, we might need a generic Jobcenter logic or fail.
    // For now, fallback to generic if type is Wohngeld.

    if (type === 'wohngeld') {
        const cityEntry = (cities as any[] || []).find((c) => c.plz === plz || (normalize(c.stadt) === normalize(cityName) && c.plz === plz));
        if (cityEntry) {
            return {
                authority: {
                    name: cityEntry.amt_name || `Wohngeldstelle ${cityName}`,
                    address: cityEntry.amt_adresse || `${cityName} Rathaus`,
                    email: cityEntry.amt_email || ''
                },
                isDistrict: false,
                found: true
            };
        }

        const genericCityEntry = (cities as any[] || []).find((c) => normalize(c.stadt) === normalize(cityName));
        if (genericCityEntry) {
            return {
                authority: {
                    name: genericCityEntry.amt_name || `Wohngeldstelle ${cityName}`,
                    address: genericCityEntry.amt_adresse || `${cityName} Rathaus`,
                    email: genericCityEntry.amt_email || ''
                },
                isDistrict: false,
                found: true
            };
        }
    }

    // Generic Fallback
    return {
        authority: {
            name: `${type === 'jobcenter' ? 'Jobcenter' : 'Wohngeldstelle'} ${cityName}`,
            address: `Adresse nicht gefunden`,
            email: ''
        },
        isDistrict: false,
        found: false
    };
};

export const getAllAuthoritiesForCity = (cityName: string, type: 'wohngeld' | 'jobcenter' = 'wohngeld'): Authority[] => {
    const cityKey = Object.keys(authoritiesShort).find(
        (key) => normalize(key) === normalize(cityName)
    );
    const cityData = cityKey ? (authoritiesShort as any)[cityKey] : null;

    if (!cityData) return [];

    let results: Authority[] = [];

    if (cityData) {
        if (cityData.type === 'district') {
            // Iterate relevant districts
            cityData.districts.forEach((d: any) => {
                if (d.authorities && d.authorities[type]) {
                    results.push(d.authorities[type]);
                } else if (d.authority && type === 'wohngeld') {
                    results.push(d.authority);
                }
            });
        } else {
            // Central
            if (cityData.authorities && cityData.authorities[type]) {
                results.push(cityData.authorities[type]);
            } else if (cityData.authority && type === 'wohngeld') {
                results.push(cityData.authority);
            }
        }
    }

    // Fallback found in manual map?
    if (results.length > 0) return results;

    // Use Generic Fallback from Cities DB
    if (type === 'wohngeld') {
        const cityEntry = (cities as any[] || []).find((c) => c.plz === cityName || normalize(c.stadt) === normalize(cityName));
        if (cityEntry) {
            results.push({
                name: cityEntry.amt_name || `Wohngeldstelle ${cityName}`,
                address: cityEntry.amt_adresse || `${cityName}`,
                email: cityEntry.amt_email || ''
                // No lat/lng here, MapView must handle geocoding
            });
        }
    } else if (type === 'jobcenter') {
        // Generic jobcenter lookup if available or fabricate one based on city center?
        // cities_2026 often has jobcenter_email, but maybe not address.
        // Let's see if we can find a jobcenter entry.
        const cityEntry = (cities as any[] || []).find((c) => c.plz === cityName || normalize(c.stadt) === normalize(cityName));
        if (cityEntry) {
            results.push({
                name: `Jobcenter ${cityName}`,
                // Using city name as approximate address if no specific address known
                address: `${cityName}`,
                email: cityEntry.jobcenter_email || ''
            });
        }
    }

    return results;
};
