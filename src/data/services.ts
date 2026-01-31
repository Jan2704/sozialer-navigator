export interface Service {
    id: string;
    name: string;
    address: string;
    city: string;
    lat: number;
    lng: number;
    type: 'Wohngeld' | 'Bürgergeld' | 'Beratung';
}

export const services: Service[] = [
    {
        id: "berlin-mitte",
        name: "Wohngeldbehörde Berlin Mitte",
        address: "Karl-Marx-Allee 31, 10178 Berlin",
        city: "Berlin",
        lat: 52.5200,
        lng: 13.4050,
        type: "Wohngeld"
    },
    {
        id: "hamburg-mitte",
        name: "Bezirksamt Hamburg-Mitte",
        address: "Klosterwall 8, 20095 Hamburg",
        city: "Hamburg",
        lat: 53.5511,
        lng: 9.9937,
        type: "Wohngeld"
    },
    {
        id: "muenchen-amt",
        name: "Amt für Wohnen München",
        address: "Franziskanerstr. 8, 81669 München",
        city: "München",
        lat: 48.1351,
        lng: 11.5820,
        type: "Wohngeld"
    },
    {
        id: "koeln-wohngeld",
        name: "Wohngeldstelle Köln",
        address: "Ottoplatz 1, 50679 Köln",
        city: "Köln",
        lat: 50.9375,
        lng: 6.9603,
        type: "Wohngeld"
    },
    {
        id: "frankfurt-amt",
        name: "Wohngeldbehörde Frankfurt",
        address: "Battonnstraße 12, 60311 Frankfurt",
        city: "Frankfurt",
        lat: 50.1109,
        lng: 8.6821,
        type: "Wohngeld"
    }
];
