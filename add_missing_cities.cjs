const fs = require('fs');

const citiesFile = 'c:/Users/Jan-r/OneDrive/Dokumente/Jan/Projekt/sozialer-navigator/sozialer-navigator-app/src/data/cities_2026.json';
const cities = JSON.parse(fs.readFileSync(citiesFile, 'utf8'));

const newCities = [
    {
        plz: "94032",
        stadt: "Passau",
        slug: "passau",
        bundesland: "Bayern",
        mietstufe: 4,
        max_kalt_1p: "485.00",
        heiz_pausch_1p: "54.00",
        klima_pausch_1p: "18.00",
        gesamt_deckel_1p: "557.00",
        amt_name: "Amt für soziale Dienste",
        amt_adresse: "Vornholzstraße 40, 94032 Passau",
        amt_email: "vornholzstrasse@passau.de",
        jobcenter_email: "Jobcenter-Passau-Stadt@jobcenter-ge.de"
    },
    {
        plz: "85049",
        stadt: "Ingolstadt",
        slug: "ingolstadt",
        bundesland: "Bayern",
        mietstufe: 5,
        max_kalt_1p: "540.00",
        heiz_pausch_1p: "54.00",
        klima_pausch_1p: "18.00",
        gesamt_deckel_1p: "612.00",
        amt_name: "Amt für Soziales",
        amt_adresse: "Auf der Schanz 39, 85049 Ingolstadt",
        amt_email: "sozialamt@ingolstadt.de",
        jobcenter_email: "jobcenter@ingolstadt.de"
    },
    {
        plz: "78462",
        stadt: "Konstanz",
        slug: "konstanz",
        bundesland: "Baden-Württemberg",
        mietstufe: 6,
        max_kalt_1p: "585.00",
        heiz_pausch_1p: "54.00",
        klima_pausch_1p: "18.00",
        gesamt_deckel_1p: "657.00",
        amt_name: "Amt für Soziales",
        amt_adresse: "Benediktinerplatz 2, 78467 Konstanz",
        amt_email: "sozialamt@konstanz.de",
        jobcenter_email: "jobcenter-landkreis-konstanz@jobcenter-ge.de"
    },
    {
        plz: "36037",
        stadt: "Fulda",
        slug: "fulda",
        bundesland: "Hessen",
        mietstufe: 4,
        max_kalt_1p: "460.00",
        heiz_pausch_1p: "54.00",
        klima_pausch_1p: "18.00",
        gesamt_deckel_1p: "532.00",
        amt_name: "Sozialamt Fulda",
        amt_adresse: "Schlossstraße 1, 36037 Fulda",
        amt_email: "sozialamt@fulda.de",
        jobcenter_email: "kreisjobcenter@landkreis-fulda.de"
    },
    {
        plz: "23560",
        stadt: "Lübeck",
        slug: "luebeck",
        bundesland: "Schleswig-Holstein",
        mietstufe: 4,
        max_kalt_1p: "480.00",
        heiz_pausch_1p: "54.00",
        klima_pausch_1p: "18.00",
        gesamt_deckel_1p: "552.00",
        amt_name: "Bereich Soziales und Wohnen",
        amt_adresse: "Kronsforder Allee 2-6, 23560 Lübeck",
        amt_email: "soziale-sicherung@luebeck.de",
        jobcenter_email: "Jobcenter-Luebeck@jobcenter-ge.de"
    },
    {
        plz: "06108",
        stadt: "Halle (Saale)",
        slug: "halle-saale",
        bundesland: "Sachsen-Anhalt",
        mietstufe: 3,
        max_kalt_1p: "435.00",
        heiz_pausch_1p: "54.00",
        klima_pausch_1p: "18.00",
        gesamt_deckel_1p: "507.00",
        amt_name: "Fachbereich Soziales",
        amt_adresse: "Südpromenade 30, 06128 Halle (Saale)",
        amt_email: "sozialamt@halle.de",
        jobcenter_email: "jobcenter-halle@jobcenter-ge.de"
    },
    {
        plz: "47803",
        stadt: "Krefeld",
        slug: "krefeld",
        bundesland: "Nordrhein-Westfalen",
        mietstufe: 4,
        max_kalt_1p: "470.00",
        heiz_pausch_1p: "54.00",
        klima_pausch_1p: "18.00",
        gesamt_deckel_1p: "542.00",
        amt_name: "Fachbereich Soziales",
        amt_adresse: "St.-Anton-Straße 69-71, 47798 Krefeld",
        amt_email: "sozialamt@krefeld.de",
        jobcenter_email: "jobcenter-krefeld@jobcenter-ge.de"
    },
    {
        plz: "71638",
        stadt: "Ludwigsburg",
        slug: "ludwigsburg",
        bundesland: "Baden-Württemberg",
        mietstufe: 5,
        max_kalt_1p: "525.00",
        heiz_pausch_1p: "54.00",
        klima_pausch_1p: "18.00",
        gesamt_deckel_1p: "597.00",
        amt_name: "Fachbereich Soziales und Gesundheit",
        amt_adresse: "Wilhelmstraße 9, 71638 Ludwigsburg",
        amt_email: "soziales@landkreis-ludwigsburg.de",
        jobcenter_email: "Jobcenter.Kreis3@Landkreis-Ludwigsburg.de"
    }
];

newCities.forEach(nc => {
    if (!cities.some(c => c.stadt === nc.stadt)) {
        cities.push(nc);
    }
});

fs.writeFileSync(citiesFile, JSON.stringify(cities, null, 2));
console.log('Successfully added ' + newCities.length + ' cities to cities_2026.json');
