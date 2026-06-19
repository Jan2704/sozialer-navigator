import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    MapPin, Mail, Send, CheckCircle, ShieldCheck,
    FileCheck, ArrowRight, Loader2, Building2,
    Euro, Clock, Info, Download, AlertCircle, Printer
} from 'lucide-react';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import ResultRoadmap from './result-roadmap';
import citiesData from '../data/cities_2026.json';
import cityDistrictsData from '../data/city_districts.json';
import authoritiesData from '../data/authorities.json';

export default function AuthorityApp() {
    const [city, setCity] = useState('');
    const [zipCode, setZipCode] = useState('');
    const [hasSearched, setHasSearched] = useState(false);
    // Initialize authority as null; we'll find it via search logic
    const [authority, setAuthority] = useState(null);
    const [loading, setLoading] = useState(false);
    const [view, setView] = useState('main'); // 'main', 'confirm', 'success'
    const [isPaidProcessing, setIsPaidProcessing] = useState(false);

    // Roadmap State
    const [completedSteps, setCompletedSteps] = useState([]);

    // Benefit Type State (Dynamic Label)
    const [benefitLabel, setBenefitLabel] = useState('Wohngeld'); // Default to Wohngeld until calc says otherwise

    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        street: '',
        email: '',
        phone: '',
        agb: false,
        accuracy: false,
        messenger: false
    });

    // Assistant State
    const [assistantStep, setAssistantStep] = useState(1);
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
    const [assistantData, setAssistantData] = useState({
        firstName: '',
        lastName: '',
        birthDate: '',
        street: '',
        zipCity: '',
        phone: '',
        email: '',
        iban: '',
        kontoinhaber: '',
        transferBenefit: 'no',
        isOwner: 'no',
        hasCar: 'no',
        hasSavings: 'no'
    });

    const [isContactFilled, setIsContactFilled] = useState(false);

    const isFormValid =
        formData.firstName.length > 1 &&
        formData.lastName.length > 1 &&
        formData.street.length > 4 &&
        formData.email.includes('@') &&
        formData.agb &&
        formData.accuracy &&
        formData.messenger;



    // Search Logic
    const findAuthorityInDB = (searchTerm, typeOverride = null) => {
        if (!searchTerm || searchTerm.length < 2) return null;

        const term = searchTerm.toLowerCase().trim();
        const currentBenefit = typeOverride || (benefitLabel === 'Bürgergeld' ? 'jobcenter' : 'wohngeld');

        // 1. Check authoritiesData (Detailed map for major cities)
        // Order: Specific PLZ Distrcts -> PLZ Prefixes -> City Name
        for (const [cityName, cityData] of Object.entries(authoritiesData)) {
            const isCityMatch = term.includes(cityName.toLowerCase());

            // a) District check (Existing logic)
            if (cityData.type === 'district') {
                const matchedDistrict = cityData.districts?.find(d => d.plz?.some(p => p.startsWith(term)));
                if (matchedDistrict?.authorities?.[currentBenefit]) {
                    const auth = matchedDistrict.authorities[currentBenefit];
                    return {
                        name: auth.name,
                        street: auth.address,
                        zipCity: matchedDistrict.name + (matchedDistrict.plz?.[0] ? ` (${matchedDistrict.plz[0]})` : ''),
                        email: auth.email || 'Nicht verfügbar'
                    };
                }
            }

            // b) Prefix check (NEW: Universal for major cities)
            const hasPrefixMatch = cityData.prefixes?.some(p => term.startsWith(p));
            if (hasPrefixMatch || isCityMatch) {
                if (cityData.authorities?.[currentBenefit]) {
                    const auth = cityData.authorities[currentBenefit];
                    return {
                        name: auth.name,
                        street: auth.address,
                        zipCity: cityName + (term.length === 5 ? ` (${term})` : ''),
                        email: auth.email || 'Nicht verfügbar'
                    };
                }

                // Fallback for district cities
                if (cityData.fallback?.[currentBenefit]) {
                    const fallback = cityData.fallback[currentBenefit];
                    return {
                        name: fallback.name,
                        street: fallback.address,
                        zipCity: cityName,
                        email: fallback.email || 'Nicht verfügbar'
                    };
                }
            }
        }

        // 2. Standard Search (cities_2026.json) - With prefix-based city fallback
        // Try exact match first
        let match = citiesData.find(c => {
            const cityStadt = c.stadt.toLowerCase();
            const normalizedCityPlz = c.plz.toString().padStart(5, '0');
            return cityStadt === term || normalizedCityPlz === term;
        });

        // If no exact match, try fuzzy PLZ match (prefix)
        if (!match && /^\d+$/.test(term)) {
            // Find a city where the representative PLZ shares at least the first 3 digits
            // This works well for identifying the city area for 70xxx, 40xxx, etc.
            match = citiesData.find(c => {
                const normalizedCityPlz = c.plz.toString().padStart(5, '0');
                return normalizedCityPlz.startsWith(term.substring(0, 3));
            });
        }

        // Final fallback for city names
        if (!match) {
            match = citiesData.find(c => c.stadt.toLowerCase().includes(term));
        }

        if (match) {
            const displayCity = (term.length === 5 && /^\d+$/.test(term)) ? `${term} ${match.stadt}` : (match.plz ? `${match.plz} ${match.stadt}` : match.stadt);

            if (currentBenefit === 'jobcenter') {
                return {
                    name: `Jobcenter ${match.stadt}`,
                    street: match.amt_adresse || `${match.stadt} Zentrum`,
                    zipCity: displayCity,
                    email: match.jobcenter_email || 'Nicht verfügbar',
                    phone: ''
                };
            }
            return {
                name: match.amt_name || `Wohngeldstelle ${match.stadt}`,
                street: match.amt_adresse || `${match.stadt} Zentrum`,
                zipCity: displayCity,
                email: match.amt_email || 'Nicht verfügbar',
                phone: ''
            };
        }
        return null;
    };

    const handleSearch = () => {
        if (!zipCode) return;

        let searchTerm = zipCode;
        // Basic cleanup/validation could go here

        const auth = findAuthorityInDB(searchTerm);
        setAuthority(auth || null);
        setHasSearched(true);
    };

    // Listen for the calculation event AND Payment Return
    useEffect(() => {
        // 1. Calculation Event
        const handleCalculation = (event) => {
            const { detail } = event;
            if (!detail || !detail.input) return;

            const { input, type } = detail;
            const isCityObject = typeof input.city === 'object' && input.city !== null;
            const cityName = isCityObject ? input.city.stadt : input.city;
            const cityPlz = isCityObject ? input.city.plz : '';

            // Set Benefit Label based on type (Case-insensitive mapping)
            const typeLower = (type || '').toLowerCase();
            const label = typeLower === 'wohngeld' ? 'Wohngeld' :
                typeLower.includes('grundsicherung') ? 'Grundsicherung' :
                    typeLower.includes('bafög') ? 'BAföG' :
                        'Bürgergeld';
            setBenefitLabel(label);

            setCity(cityName);
            if (cityPlz) {
                setZipCode(cityPlz);
            }

            // Initial Search based on PLZ (preferred) or City from calculation
            const searchTerm = cityPlz || cityName;
            if (searchTerm) {
                const auth = findAuthorityInDB(searchTerm);
                if (auth) {
                    setAuthority(auth);
                    setHasSearched(true);
                }
            }

            // Auto-populate assistant data from calculation with smart inferences
            setAssistantData(prev => ({
                ...prev,
                firstName: input.firstName || prev.firstName || '',
                lastName: input.lastName || prev.lastName || '',
                birthDate: input.birthDate || prev.birthDate || '',
                street: input.street || prev.street || '',
                zipCity: cityPlz ? `${cityPlz} ${cityName}` : cityName,
                phone: input.phone || prev.phone || '',
                email: input.email || prev.email || '',
                iban: input.iban || prev.iban || '',
                kontoinhaber: input.kontoinhaber || `${input.firstName || ''} ${input.lastName || ''}`.trim() || prev.kontoinhaber || '',
                transferBenefit: label === 'Wohngeld' ? 'no' : prev.transferBenefit,
                hasSavings: label === 'Bürgergeld' ? 'no' : prev.hasSavings,
                isOwner: input.isOwner || prev.isOwner || 'no'
            }));

            // Immediately transition to the new 'pdf-ready' review dashboard
            setIsContactFilled(!!(input.firstName && input.lastName && input.email));
            setView('pdf-ready');
        };

        window.addEventListener('benefit-calculation-completed', handleCalculation);

        // Check if we missed the event (hydration delay)
        if (window.lastCalculationResult) {
            handleCalculation({ detail: window.lastCalculationResult });
        }

        // 2. Check for Stripe Success Return (?session_id=...)
        const params = new URLSearchParams(window.location.search);
        if (params.get('session_id')) {
            setView('success');
            if (!completedSteps.includes(1)) {
                setCompletedSteps(prev => [...prev, 1]);
            }
            // Optional: Clear URL param to avoid re-triggering on refresh (cleaner UX)
            window.history.replaceState({}, document.title, window.location.pathname);
        }

        return () => window.removeEventListener('benefit-calculation-completed', handleCalculation);
    }, []);

    // Re-run search when benefit selection changes to ensure correct authority type is shown
    useEffect(() => {
        if (hasSearched && zipCode) {
            const auth = findAuthorityInDB(zipCode);
            setAuthority(auth || null);
        }
    }, [benefitLabel]);

    // ... existing search logic ...

    // Open Lead Modal for PDF Request
    const handleRequestPdf = () => {
        if (window.openLeadModal) {
            window.openLeadModal('pdf-checklist');
            // Optimistically mark step 1 as done
            if (!completedSteps.includes(1)) {
                setCompletedSteps(prev => [...prev, 1]);
            }
        } else {
            console.error("LeadModal not found window.openLeadModal");
            alert("Ein Fehler ist aufgetreten. Bitte laden Sie die Seite neu.");
        }
    };

    const handlePaidStart = () => {
        setView('confirm');
    };

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleConfirmSend = async () => {
        if (!isFormValid) return;

        setIsPaidProcessing(true);

        try {
            // Save state to localStorage for after-payment return
            localStorage.setItem('pendingApplicationUser', JSON.stringify({
                ...formData,
                zipCode: zipCode, // Add current zip input
                city: city // Add current city
            }));
            localStorage.setItem('pendingApplicationAuthority', JSON.stringify(authority));
            localStorage.setItem('pendingBenefitLabel', benefitLabel);

            // Call Backend to create Stripe Session
            const response = await fetch(`/api/checkout/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: formData.email,
                    firstName: formData.firstName,
                    lastName: formData.lastName,
                    authority: authority?.name || 'Unknown',
                    authorityEmail: authority?.email || '',
                })
            });

            const data = await response.json();

            if (response.ok && data.url) {
                // Redirect to Stripe
                window.location.href = data.url;
            } else {
                console.error("Stripe Error:", data);
                alert("Fehler beim Starten der Zahlung: " + (data.error || 'Unbekannt'));
                setIsPaidProcessing(false);
            }
        } catch (error) {
            console.error("Network Error:", error);
            alert("Verbindungsfehler. Ist das Backend gestartet?");
            setIsPaidProcessing(false);
        }
    };

    // --- Post-Payment Logic ---
    useEffect(() => {
        // Check for Stripe Success Return (?session_id=...)
        const params = new URLSearchParams(window.location.search);
        if (params.get('session_id')) {
            setView('success');
            if (!completedSteps.includes(1)) {
                setCompletedSteps(prev => [...prev, 1]);
            }
            // Clean URL
            window.history.replaceState({}, document.title, window.location.pathname);

            // Clean up old pending storage just in case
            localStorage.removeItem('pendingApplicationUser');
            localStorage.removeItem('pendingApplicationAuthority');
            localStorage.removeItem('pendingBenefitLabel');
        }
    }, []);

    const handleStartAssistant = () => {
        setAssistantData(prev => ({
            ...prev,
            firstName: prev.firstName || formData.firstName || '',
            lastName: prev.lastName || formData.lastName || '',
            email: prev.email || formData.email || '',
            phone: prev.phone || formData.phone || '',
            kontoinhaber: prev.kontoinhaber || `${prev.firstName || formData.firstName || ''} ${prev.lastName || formData.lastName || ''}`.trim()
        }));
        setView('assistant');
        setAssistantStep(1);
    };

    const handleAssistantNext = () => {
        setAssistantStep(prev => Math.min(prev + 1, 5));
    };

    const handleAssistantBack = () => {
        setAssistantStep(prev => Math.max(prev - 1, 1));
    };

    const handleGeneratePdf = async () => {
        setIsGeneratingPdf(true);
        try {
            const isWohngeld = benefitLabel.toLowerCase().includes('wohngeld') || benefitLabel.toLowerCase().includes('lastenzuschuss');
            // Fetch template
            const templatePath = isWohngeld ? '/forms/TEST_Wohngeld.pdf' : '/forms/Hauptantrag_Buergergeld.pdf';
            const response = await fetch(templatePath);
            if (!response.ok) {
                throw new Error('PDF-Vorlage nicht gefunden.');
            }
            const arrayBuffer = await response.arrayBuffer();
            const pdfDoc = await PDFDocument.load(arrayBuffer);
            const form = pdfDoc.getForm();

            // Fill basic details
            try {
                if (isWohngeld) {
                    form.getTextField('Vorname').setText(assistantData.firstName);
                    form.getTextField('Nachname').setText(assistantData.lastName);
                    form.getTextField('Strasse_Hausnummer').setText(assistantData.street);
                    form.getTextField('PLZ_Ort').setText(assistantData.zipCity);
                } else {
                    form.getTextField('txtfPersonVorname').setText(assistantData.firstName);
                    form.getTextField('txtfPersonNachname').setText(assistantData.lastName);
                    form.getTextField('txtfPersonStr').setText(assistantData.street);
                    
                    // PLZ & Ort split
                    const zipMatch = assistantData.zipCity.match(/^(\d{5})\s*(.*)$/);
                    if (zipMatch) {
                        form.getTextField('txtfPersonPlz').setText(zipMatch[1]);
                        form.getTextField('txtfPersonOrt').setText(zipMatch[2]);
                    } else {
                        form.getTextField('txtfPersonOrt').setText(assistantData.zipCity);
                    }
                    
                    // Attempt birthdate if field exists
                    try {
                        form.getTextField('txtfPersonGebDat').setText(assistantData.birthDate);
                    } catch(e) {}
                }
            } catch (fieldErr) {
                console.warn("Field filling warning:", fieldErr);
            }

            // TAXFIX-FEATURE: Cover page
            const coverPage = pdfDoc.insertPage(0);
            const { width, height } = coverPage.getSize();
            const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
            const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

            // Draw cover page
            coverPage.drawRectangle({
                x: 0,
                y: height - 100,
                width: width,
                height: 100,
                color: rgb(13/255, 148/255, 136/255), // brand.blue Teal
            });

            coverPage.drawText("AMTLY DIGITALER ASSISTENT", {
                x: 40,
                y: height - 45,
                size: 10,
                font: fontBold,
                color: rgb(1, 1, 1),
            });

            coverPage.drawText(`Offizieller Antrag auf ${benefitLabel}`, {
                x: 40,
                y: height - 75,
                size: 20,
                font: fontBold,
                color: rgb(1, 1, 1),
            });

            coverPage.drawText("1. Angaben zum Antragsteller", {
                x: 40,
                y: height - 140,
                size: 14,
                font: fontBold,
                color: rgb(15/255, 23/255, 42/255),
            });

            let yPos = height - 165;
            const drawField = (label, value) => {
                coverPage.drawText(label, { x: 40, y: yPos, size: 10, font: fontBold, color: rgb(71/255, 85/255, 105/255) });
                coverPage.drawText(value || 'Keine Angabe', { x: 220, y: yPos, size: 10, font: fontRegular, color: rgb(15/255, 23/255, 42/255) });
                yPos -= 20;
            };

            drawField("Name, Vorname:", `${assistantData.lastName}, ${assistantData.firstName}`);
            drawField("Geburtsdatum:", assistantData.birthDate);
            drawField("Anschrift:", `${assistantData.street}, ${assistantData.zipCity}`);
            drawField("E-Mail / Telefon:", `${assistantData.email} / ${assistantData.phone || '-'}`);
            
            if (assistantData.iban) {
                drawField("Bankverbindung:", `IBAN: ${assistantData.iban}`);
                drawField("Kontoinhaber:", assistantData.kontoinhaber || `${assistantData.firstName} ${assistantData.lastName}`);
            }

            yPos -= 10;
            coverPage.drawText("2. Vorläufige Anspruchsberechnung (Amtly)", {
                x: 40,
                y: yPos,
                size: 14,
                font: fontBold,
                color: rgb(15/255, 23/255, 42/255),
            });
            yPos -= 25;

            const savedState = window.lastCalculationResult;
            if (savedState && savedState.input) {
                drawField("Voraussichtlicher Anspruch:", `${Math.round(savedState.amount)} € / Monat`);
                drawField("Mietstufe der Stadt:", `${savedState.input.city?.mietstufe || 'N/A'}`);
                drawField("Haushaltsgröße:", `${savedState.input.persons} Person(en) (${savedState.input.kids} Kind/er)`);
                drawField("Monatliches Brutto:", `${savedState.input.income} €`);
                drawField("Warmmiete:", `${savedState.input.rent} € Kalt + ${savedState.input.heating} € Heizung`);
            } else {
                drawField("Voraussichtlicher Anspruch:", "Berechnung abgeschlossen (siehe Folgeseiten)");
            }

            yPos -= 10;
            coverPage.drawText("3. Zusatzangaben", {
                x: 40,
                y: yPos,
                size: 14,
                font: fontBold,
                color: rgb(15/255, 23/255, 42/255),
            });
            yPos -= 25;

            if (isWohngeld) {
                drawField("Andere Sozialleistungen?", assistantData.transferBenefit === 'yes' ? 'Ja' : 'Nein');
                drawField("Wohneigentum vorhanden?", assistantData.isOwner === 'yes' ? 'Ja (Lastenzuschuss)' : 'Nein (Mietzuschuss)');
            } else {
                drawField("Ersparnisse > 40.000 €?", assistantData.hasSavings === 'yes' ? 'Ja' : 'Nein');
                drawField("PKW / Auto vorhanden?", assistantData.hasCar === 'yes' ? 'Ja' : 'Nein');
            }

            coverPage.drawRectangle({
                x: 40,
                y: 50,
                width: width - 80,
                height: 70,
                color: rgb(248/255, 250/255, 252/255),
                borderColor: rgb(226/255, 232/255, 240/255),
                borderWidth: 1,
            });

            coverPage.drawText("HINWEIS FÜR DEN SACHBEARBEITER:", {
                x: 55,
                y: 100,
                size: 8,
                font: fontBold,
                color: rgb(100/255, 116/255, 139/255),
            });

            coverPage.drawText("Dieses Deckblatt dient zur schnelleren Vorab-Einschätzung des Falls.", {
                x: 55,
                y: 85,
                size: 9,
                font: fontRegular,
                color: rgb(71/255, 85/255, 105/255),
            });
            coverPage.drawText("Die rechtlich bindenden Daten entnehmen Sie bitte den nachfolgenden Antragsformularen.", {
                x: 55,
                y: 70,
                size: 9,
                font: fontRegular,
                color: rgb(71/255, 85/255, 105/255),
            });

            form.flatten();
            const pdfBytes = await pdfDoc.save();
            const blob = new Blob([pdfBytes], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);

            const link = document.createElement('a');
            link.href = url;
            link.download = `Antrag_${benefitLabel.replace(/\s+/g, '_')}_${assistantData.lastName}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            setView('assistant-success');
            
            if (!completedSteps.includes(1)) {
                setCompletedSteps(prev => [...prev, 1]);
            }
            
            if (window.confetti) {
                window.confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
            }

        } catch (err) {
            console.error("PDF generation failed:", err);
            alert("Beim Erstellen des PDFs ist ein Fehler aufgetreten: " + err.message);
        } finally {
            setIsGeneratingPdf(false);
        }
    };

    const handleEmailAuthority = () => {
        if (!authority || !authority.email || authority.email === 'Nicht verfügbar') {
            alert("Leider liegt uns für Ihr zuständiges Amt keine E-Mail-Adresse vor. Bitte drucken Sie das PDF aus.");
            return;
        }

        const subject = encodeURIComponent(`Antrag auf ${benefitLabel} - ${assistantData.firstName} ${assistantData.lastName}`);
        const body = encodeURIComponent(
            `Sehr geehrte Damen und Herren,\n\n` +
            `hiermit stelle ich, ${assistantData.firstName} ${assistantData.lastName} (geb. am ${assistantData.birthDate}), einen formellen Antrag auf ${benefitLabel} ab dem aktuellen Monat.\n\n` +
            `Im Anhang dieser E-Mail finden Sie meinen ausgefüllten und generierten Antrag (PDF) sowie das Berechnungsblatt.\n\n` +
            `Bitte bestätigen Sie mir den Erhalt dieser E-Mail und des Antrags.\n\n` +
            `Mit freundlichen Grüßen,\n` +
            `${assistantData.firstName} ${assistantData.lastName}`
        );

        window.location.href = `mailto:${authority.email}?subject=${subject}&body=${body}`;
    };

    return (
        <div className="w-full space-y-8">

            {/* VIEW: SUCCESS */}
            {view === 'success' ? (
                <div className="bg-white border border-[#c5a67c]/30 rounded-[2.5rem] p-8 md:p-12 shadow-2xl shadow-[#0a1628]/10 text-center relative overflow-hidden animate-in fade-in zoom-in-95 duration-500">
                    <div className="absolute inset-0 bg-gradient-to-b from-[#f8fafc] to-white pointer-events-none"></div>
                    <div className="relative z-10 flex flex-col items-center">

                        {/* 1. Immediate Success Visual */}
                        <div className="w-20 h-20 bg-[#0a1628] text-[#c5a67c] rounded-full flex items-center justify-center mb-8 shadow-xl border-4 border-white ring-1 ring-slate-100">
                            <ShieldCheck className="w-10 h-10" />
                        </div>
                        <h2 className="text-4xl font-serif font-bold text-[#0a1628] mb-4">Vielen Dank.</h2>
                        <p className="text-[#c5a67c] mb-8 font-bold uppercase tracking-widest text-xs">Bestellung erfolgreich abgeschlossen</p>


                        {/* 2. Dynamic Processing Status (Integrated) */}
                        <div className="mb-10 w-full max-w-md mx-auto">
                            <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-4 flex flex-col items-center justify-center gap-2">
                                <div className="flex items-center gap-3">
                                    <CheckCircle className="w-5 h-5 text-emerald-600" />
                                    <span className="text-sm text-emerald-900 font-bold">
                                        Zahlung bestätigt – Vorgang läuft!
                                    </span>
                                </div>
                                <p className="text-xs text-emerald-700/80 text-center mt-2 px-4">
                                    Ihr Antrag wird soeben in unserem System rechtssicher aufbereitet und geht binnen weniger Minuten an die Behörde raus.
                                    Sie erhalten gleich den Versandaufschrieb sowie die Kopie des Antrags per Mail.
                                </p>
                            </div>
                        </div>


                        {/* 3. Action Buttons */}
                        <div className="flex flex-col md:flex-row gap-4 justify-center items-center w-full max-w-lg mb-10">
                            {/* Checklist Button - Always active */}
                            <button
                                onClick={() => document.getElementById('result-roadmap')?.scrollIntoView({ behavior: 'smooth' })}
                                className="px-6 py-4 bg-[#0a1628] text-white rounded-xl font-bold hover:bg-[#1e293b] transition-all shadow-lg hover:shadow-xl w-full flex justify-center items-center gap-2 group"
                            >
                                <FileCheck className="w-5 h-5 text-[#c5a67c]" />
                                <span>Ihre weiteren Schritte ansehen (Checkliste)</span>
                            </button>
                        </div>

                        <div className="bg-[#f8fafc] border-l-4 border-[#c5a67c] p-6 w-full max-w-lg text-left shadow-sm rounded-r-xl">
                            <h4 className="font-bold text-[#0a1628] mb-2 flex items-center gap-2 font-serif">
                                <Info className="w-4 h-4 text-[#c5a67c]" /> Nächste Schritte
                            </h4>
                            <p className="text-slate-600 text-sm">
                                Die Behörde ist nun gesetzlich verpflichtet, Ihren Antrag zu bearbeiten (§ 16 SGB I).
                                Nutzen Sie die Zeit bis zur Rückmeldung, um Ihre Unterlagen zu sortieren.
                            </p>
                        </div>
                    </div>
                </div>
            ) : (
                <>
                    {/* Context Header */}
                    <div className="bg-[#f8fafc] border border-slate-200/60 p-6 rounded-2xl flex items-start gap-4 shadow-sm">
                        <div className="p-2bg-white rounded-xl border border-slate-100 shadow-sm shrink-0">
                            <Info className="w-6 h-6 text-[#c5a67c]" />
                        </div>
                        <div>
                            <h3 className="font-serif font-bold text-[#0a1628] text-xl">Auf Grundlage Ihrer Angaben kommt {benefitLabel} in Betracht.</h3>
                            <p className="text-slate-600 text-sm mt-1.5 leading-relaxed">Der Gesetzgeber schreibt vor, dass Leistungen ab dem Monat der Antragstellung gezahlt werden. Sichern Sie Ihren Anspruch noch heute, bevor der aktuelle Monat abläuft.</p>
                        </div>
                    </div>

                    {/* Authority Finder Section */}
                    <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 md:p-10 shadow-xl shadow-slate-200/40 relative overflow-hidden group">
                        {/* Background Decor */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none opacity-50"></div>

                        <div className="relative z-10 grid md:grid-cols-2 gap-12">

                            {/* Left: Input & Search */}
                            <div>
                                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold uppercase tracking-wider mb-6">
                                    <Building2 className="w-3 h-3" /> ZUSTÄNDIGKEIT PRÜFEN
                                </div>
                                <h3 className="font-serif text-3xl font-bold text-[#0a1628] mb-6">Welches Amt ist für Sie zuständig?</h3>

                                <div className="space-y-4 mb-4">
                                    {/* PLZ & Search Button */}
                                    <div className="flex gap-3">
                                        <div className="relative flex items-center bg-white border border-slate-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:border-[#0a1628] focus-within:ring-[#0a1628]/20 transition-all shadow-sm flex-1">
                                            <div className="pl-4 text-slate-400"><MapPin className="w-5 h-5" /></div>
                                            <input
                                                type="text"
                                                placeholder="PLZ"
                                                className="w-full py-4 px-4 outline-none text-slate-900 placeholder:text-slate-400 font-medium"
                                                value={zipCode}
                                                onChange={(e) => setZipCode(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                            />
                                        </div>
                                        <button
                                            onClick={handleSearch}
                                            className="bg-[#0a1628] text-white font-bold px-6 rounded-xl hover:bg-[#1e293b] transition-colors shadow-lg"
                                        >
                                            Finden
                                        </button>
                                    </div>
                                </div>
                                <p className="text-xs text-slate-400 font-medium pl-1">Ihre Daten werden nur zur Ermittlung des zuständigen Amtes genutzt.</p>
                            </div>

                            {/* Right: Result Display */}
                            <div className="bg-[#f8fafc] border border-slate-200/60 rounded-2xl p-6 relative flex flex-col justify-center">
                                {hasSearched ? (
                                    authority ? (
                                        <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-500">
                                            <div className="bg-white rounded-xl p-5 border border-slate-100 shadow-sm">
                                                <h4 className="font-bold text-[#0a1628] text-lg mb-1">{authority.name}</h4>
                                                <p className="text-slate-500 text-sm leading-relaxed">{authority.street}<br />{authority.zipCity}</p>

                                                <div className="flex items-center gap-3 pt-4 mt-4 border-t border-slate-100">
                                                    <div className="p-2 bg-slate-50 rounded-lg border border-slate-100 text-[#0a1628]"><Mail className="w-4 h-4" /></div>
                                                    <span className="text-sm font-medium text-slate-600 select-all">{authority.email}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center h-full p-8 text-center animate-in fade-in zoom-in-95">
                                            <div className="bg-amber-50 p-4 rounded-full mb-4">
                                                <AlertCircle className="w-10 h-10 text-amber-600" />
                                            </div>
                                            <span className="text-lg font-serif font-bold text-[#0a1628]">Amt nicht gefunden</span>
                                            <p className="text-sm text-slate-500 mt-2 max-w-[200px]">
                                                Für diese PLZ konnte kein zuständiges Amt automatisch ermittelt werden.
                                            </p>
                                            <a
                                                href="mailto:support@sozialer-navigator.de?subject=PLZ%20nicht%20gefunden"
                                                className="mt-4 text-xs font-bold text-[#c5a67c] hover:underline"
                                            >
                                                Support kontaktieren
                                            </a>
                                        </div>
                                    )
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-full text-slate-400 p-8 text-center">
                                        <Building2 className="w-10 h-10 mb-3 opacity-20 text-[#0a1628]" />
                                        <span className="text-sm font-medium opacity-60">Resultat wird hier angezeigt</span>
                                    </div>
                                )}
                            </div>

                        </div>
                    </div>

                    {/* React Result Roadmap: Integrated Here */}
                    <ResultRoadmap completedSteps={completedSteps} />

                    {/* Options Grid */}
                    <div className="grid md:grid-cols-2 gap-6 items-stretch relative">

                        {/* View State: Normal Main View */}
                        {view === 'main' && (
                            <>
                                {/* Option 1: Self Service / Free PDF (Assistent) */}
                                <div className="bg-white border border-slate-200 rounded-[2rem] p-8 flex flex-col shadow-lg shadow-slate-200/20 hover:border-slate-300 transition-all relative">
                                    <div className="mb-6">
                                        <div className="flex justify-between items-start mb-4">
                                            <h3 className="font-bold text-[#0D9488] text-xl">Antrag kostenfrei ausfüllen</h3>
                                            <Mail className="w-6 h-6 text-[#0D9488]/40" />
                                        </div>
                                        <p className="text-slate-500 leading-relaxed text-sm">
                                            Beantworten Sie ein paar einfache Fragen am Handy. Wir erstellen Ihnen ein vollständig ausgefülltes, offizielles Antrags-PDF zum direkten Einreichen – 100% kostenfrei.
                                        </p>
                                    </div>

                                    <div className="mt-auto pt-6 border-t border-slate-100">
                                        <button
                                            onClick={handleStartAssistant}
                                            className="w-full py-4 px-4 bg-[#0D9488] hover:bg-teal-700 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2 shadow-md shadow-teal-500/10 cursor-pointer"
                                        >
                                            <Download className="w-4 h-4" />
                                            Jetzt kostenlos ausfüllen
                                        </button>
                                        <p className="text-center text-[10px] text-slate-400 uppercase tracking-wider font-bold mt-4">Kostenlos · Ohne Registrierung</p>
                                    </div>
                                </div>

                                {/* Option 2: Paid Service (PREMIUM REDESIGN) */}
                                <div className="bg-[#0a1628] border border-[#1e293b] rounded-[2rem] p-8 flex flex-col shadow-2xl relative overflow-hidden group hover:scale-[1.01] transition-transform duration-300">
                                    <div className="absolute top-0 right-0 bg-[#c5a67c] text-[#0a1628] text-[10px] font-bold px-4 py-2 rounded-bl-xl uppercase tracking-widest leading-none z-20">
                                        EMPFEHLUNG
                                    </div>

                                    {/* Subtle highlight effect */}
                                    <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl pointer-events-none"></div>

                                    <div className="mb-6 relative z-10">
                                        <div className="flex justify-between items-start mb-4">
                                            <h3 className="font-serif font-bold text-white text-2xl">Frist sicher starten</h3>
                                            <div className="bg-white/10 p-2 rounded-lg text-[#c5a67c] mt-1 backdrop-blur-sm"><ShieldCheck className="w-6 h-6" /></div>
                                        </div>
                                        <p className="text-slate-300 font-medium leading-relaxed text-sm mb-6">
                                            Lehnen Sie sich zurück. Wir sichern Ihre Ansprüche durch sofortigen, beweissicheren Digitalversand an das zuständige Amt. Danach bearbeiten Sie die Unterlagen-Checkliste.
                                        </p>

                                        <ul className="space-y-4 mb-8">
                                            {[
                                                'Bequemer Versand noch heute (ohne Papierkram)',
                                                'Adressiert an die korrekte Behörden-Zweigstelle',
                                                'Transparenter Nachweis (Sie erhalten die E-Mail in CC)',
                                                'Inklusive Unterlagen-Checkliste PDF'
                                            ].map((item, i) => (
                                                <li key={i} className="flex items-start gap-3 text-sm text-slate-200 font-medium">
                                                    <div className="bg-emerald-500/20 rounded-full p-0.5 mt-0.5"><CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" strokeWidth={2.5} /></div>
                                                    <span>{item}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>

                                    <div className="mt-auto pt-6 border-t border-white/10 relative z-10">
                                        <div className="flex justify-between items-end mb-5">
                                            <div>
                                                <span className="block text-3xl font-bold text-white">5,99 €</span>
                                                <span className="text-[10px] text-[#c5a67c] uppercase font-bold tracking-widest">EINMALIG · KEIN ABO</span>
                                            </div>
                                        </div>

                                        <button
                                            onClick={handlePaidStart}
                                            className="w-full py-4 px-6 bg-white hover:bg-slate-100 text-[#0a1628] font-bold text-lg rounded-xl transition-all shadow-lg hover:shadow-white/20 flex items-center justify-center gap-2 group/btn"
                                        >
                                            <ShieldCheck className="w-5 h-5 text-[#c5a67c]" />
                                            Jetzt absichern
                                            <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform opacity-50 absolute right-6" />
                                        </button>
                                        <p className="text-center text-[10px] text-slate-400 mt-4 flex items-center justify-center gap-1.5"><ShieldCheck className="w-3 h-3" /> Sichere 256-Bit SSL-Verschlüsselung</p>
                                    </div>
                                </div>
                            </>
                        )}

                        {/* Form View (Paid Service) */}
                        {view === 'confirm' && (
                            <div className="col-span-1 md:col-span-2 bg-white border border-slate-200 rounded-[2.5rem] p-8 md:p-12 shadow-2xl relative animate-in fade-in zoom-in-95 duration-300">
                                <button
                                    onClick={() => setView('main')}
                                    className="absolute top-6 left-6 p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors flex items-center gap-2 font-medium"
                                >
                                    ← Zurück
                                </button>

                                <div className="max-w-4xl mx-auto">
                                    <div className="text-center mb-12 mt-4">
                                        <h2 className="text-3xl font-serif font-bold text-[#0a1628] mb-2">Fristsicher starten</h2>
                                        <p className="text-slate-500">Bitte vervollständigen Sie Ihre Angaben für den Versand.</p>
                                    </div>

                                    <div className="flex flex-col lg:flex-row gap-12">

                                        {/* LEFT COLUMN: Benefits & Trust (The "Why") */}
                                        <div className="lg:w-5/12 space-y-8 bg-[#f8fafc] border border-slate-200/60 rounded-3xl p-8 relative overflow-hidden">
                                            {/* Decorative Background */}
                                            <div className="absolute -top-24 -right-24 w-64 h-64 bg-slate-200 opacity-20 rounded-full blur-3xl mix-blend-multiply pointer-events-none"></div>

                                            {/* Authority Summary */}
                                            <div>
                                                <h4 className="font-serif font-bold text-[#0a1628] mb-4 text-base tracking-wide flex items-center gap-2">
                                                    EMPFÄNGER
                                                </h4>
                                                <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm space-y-3">
                                                    <div className="flex items-start gap-4">
                                                        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 shrink-0">
                                                            <Building2 className="w-5 h-5 text-[#c5a67c]" />
                                                        </div>
                                                        <div className="text-sm">
                                                            <p className="font-bold text-[#0a1628] leading-tight">{authority?.name || 'Amt nicht ausgewählt'}</p>
                                                            <p className="text-slate-500 mt-0.5">{authority?.street}</p>
                                                            <p className="text-slate-500">{authority?.zipCity}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-4 text-sm pt-2 border-t border-slate-50">
                                                        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 shrink-0">
                                                            <Mail className="w-5 h-5 text-slate-400" />
                                                        </div>
                                                        <p className="text-slate-500 truncate">{authority?.email}</p>
                                                    </div>
                                                </div>
                                            </div>

                                            <hr className="border-slate-200/60" />

                                            {/* Explicit Benefits */}
                                            <div>
                                                <h4 className="font-serif font-bold text-[#0a1628] mb-5 text-base tracking-wide flex items-center gap-2">
                                                    IHR ANTRAG
                                                </h4>
                                                <ul className="space-y-4">
                                                    <li className="flex items-start gap-3 group">
                                                        <div className="mt-0.5 group-hover:scale-110 transition-transform"><CheckCircle className="w-5 h-5 text-emerald-500" strokeWidth={2.5} /></div>
                                                        <div>
                                                            <p className="font-bold text-[#0a1628] text-sm">Formloser Antrag (Fristwahrung)</p>
                                                            <p className="text-xs text-slate-500 leading-relaxed mt-0.5">Rechtzeitige Sicherung Ihrer Ansprüche für den aktuellen Monat.</p>
                                                        </div>
                                                    </li>
                                                    <li className="flex items-start gap-3 group">
                                                        <div className="mt-0.5 group-hover:scale-110 transition-transform"><CheckCircle className="w-5 h-5 text-emerald-500" strokeWidth={2.5} /></div>
                                                        <div>
                                                            <p className="font-bold text-[#0a1628] text-sm">Versandbestätigung per E-Mail</p>
                                                            <p className="text-xs text-slate-500 leading-relaxed mt-0.5">Sie stehen transparent in CC und haben sofort den Nachweis über den Versand.</p>
                                                        </div>
                                                    </li>
                                                    <li className="flex items-start gap-3 bg-white p-3 rounded-xl border border-[#c5a67c]/30 shadow-sm relative overflow-hidden group">
                                                        <div className="absolute inset-0 bg-gradient-to-r from-[#c5a67c]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                                        <div className="relative z-10 mt-0.5"><CheckCircle className="w-5 h-5 text-[#c5a67c]" strokeWidth={2.5} /></div>
                                                        <div className="relative z-10">
                                                            <p className="font-bold text-[#0a1628] text-sm flex items-center gap-2">
                                                                Dokumenten-Checkliste
                                                                <span className="bg-[#c5a67c]/10 text-[#c5a67c] text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Inklusive</span>
                                                            </p>
                                                            <p className="text-xs text-slate-600 leading-relaxed mt-1">
                                                                Wir senden Ihnen zusätzlich ein PDF mit allen Unterlagen, die Sie danach in Ruhe sammeln müssen.
                                                            </p>
                                                        </div>
                                                    </li>
                                                </ul>
                                            </div>

                                            {/* Beautiful Timeline */}
                                            <div className="bg-white border text-left border-blue-100 rounded-2xl p-5 shadow-sm relative">
                                                <h5 className="font-bold text-blue-900 text-xs uppercase tracking-wider mb-4 flex items-center gap-2">
                                                    <FileCheck className="w-4 h-4 text-blue-600" /> So läuft es ab
                                                </h5>
                                                <div className="space-y-4 pl-2 relative before:absolute before:inset-0 before:ml-4 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-300 before:to-transparent">
                                                    <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active text-left">
                                                        <div className="flex items-center justify-center w-6 h-6 rounded-full border border-white bg-blue-100 text-blue-600 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 text-[10px] font-bold z-10">1</div>
                                                        <div className="w-[calc(100%-2.5rem)] md:w-[calc(50%-1.5rem)] pl-3 text-xs text-slate-600 leading-snug">
                                                            <strong className="text-slate-900 block mb-0.5">Versand an das Amt</strong>
                                                            Sie sind für den Beweis in CC.
                                                        </div>
                                                    </div>
                                                    <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active text-left">
                                                        <div className="flex items-center justify-center w-6 h-6 rounded-full border border-white bg-slate-100 text-slate-500 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 text-[10px] font-bold z-10">2</div>
                                                        <div className="w-[calc(100%-2.5rem)] md:w-[calc(50%-1.5rem)] pl-3 text-xs text-slate-600 leading-snug">
                                                            <strong className="text-slate-900 block mb-0.5">Checkliste erhalten</strong>
                                                            PDF per Mail zur Vorbereitung.
                                                        </div>
                                                    </div>
                                                    <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active text-left">
                                                        <div className="flex items-center justify-center w-6 h-6 rounded-full border border-white bg-slate-100 text-slate-500 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 text-[10px] font-bold z-10">3</div>
                                                        <div className="w-[calc(100%-2.5rem)] md:w-[calc(50%-1.5rem)] pl-3 text-xs text-slate-600 leading-snug">
                                                            <strong className="text-slate-900 block mb-0.5">Amt meldet sich</strong>
                                                            Papierkram ganz in Ruhe nachreichen.
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* RIGHT COLUMN: The Form (The "How") */}
                                        <div className="lg:w-7/12 flex flex-col justify-between">
                                            {!authority ? (
                                                <div className="bg-amber-50 border border-amber-200 rounded-3xl p-8 flex flex-col items-center justify-center text-center h-full space-y-6">
                                                    <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center shadow-inner">
                                                        <MapPin className="w-8 h-8" />
                                                    </div>
                                                    <div>
                                                        <h3 className="font-serif font-bold text-amber-900 text-2xl mb-2">Zuständiges Amt fehlt</h3>
                                                        <p className="text-amber-700/80 mb-4">Damit wir Ihren Antrag rechtssicher versenden können, müssen wir zuerst ermitteln, welche Behörde für Ihren Wohnort zuständig ist.</p>
                                                        <a
                                                            href="mailto:support@sozialer-navigator.de?subject=PLZ%20nicht%20gefunden"
                                                            className="text-sm font-bold text-amber-600 hover:underline block"
                                                        >
                                                            Hilfe vom Support anfordern
                                                        </a>
                                                    </div>
                                                    <button
                                                        onClick={() => setView('main')}
                                                        className="py-4 px-8 bg-[#0a1628] hover:bg-[#1e293b] text-white font-bold rounded-xl transition-all shadow-xl hover:shadow-[#0a1628]/20 flex items-center gap-2"
                                                    >
                                                        <MapPin className="w-5 h-5" /> Jetzt zuständiges Amt finden
                                                    </button>
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="space-y-6">

                                                        {/* Explicit Benefit Selection */}
                                                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                                                            <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider">Was beantragen Sie?</label>
                                                            <select
                                                                value={benefitLabel}
                                                                onChange={(e) => setBenefitLabel(e.target.value)}
                                                                className="w-full rounded-xl border-2 border-slate-200 bg-white text-slate-900 focus:border-[#0a1628] focus:ring-0 p-4 font-bold text-lg cursor-pointer shadow-sm appearance-none transition-colors"
                                                                style={{ backgroundImage: `url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%230a1628%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1.2rem top 50%', backgroundSize: '0.8rem auto' }}
                                                            >
                                                                <option value="Wohngeld">Wohngeld</option>
                                                                <option value="Bürgergeld">Bürgergeld</option>
                                                                <option value="Grundsicherung im Alter">Grundsicherung im Alter / bei Erwerbsminderung</option>
                                                                <option value="Sozialleistungen Allgemein">Sonstige Sozialleistungen</option>
                                                            </select>
                                                            <p className="text-xs text-slate-500 mt-2 flex items-center gap-1.5"><Info className="w-3.5 h-3.5" /> Dieser Begriff wird offiziell im Antrag verwendet.</p>
                                                        </div>

                                                        <div className="grid grid-cols-2 gap-5">
                                                            <div>
                                                                <label className="block text-xs font-bold text-slate-700 mb-1.5 ml-1">Vorname *</label>
                                                                <input
                                                                    type="text" name="firstName" required
                                                                    value={formData.firstName} onChange={handleInputChange}
                                                                    className="w-full rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:border-[#0a1628] focus:ring-0 p-3.5 shadow-sm transition-colors"
                                                                    placeholder="Max"
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="block text-xs font-bold text-slate-700 mb-1.5 ml-1">Nachname *</label>
                                                                <input
                                                                    type="text" name="lastName" required
                                                                    value={formData.lastName} onChange={handleInputChange}
                                                                    className="w-full rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:border-[#0a1628] focus:ring-0 p-3.5 shadow-sm transition-colors"
                                                                    placeholder="Mustermann"
                                                                />
                                                            </div>
                                                        </div>

                                                        <div>
                                                            <label className="block text-xs font-bold text-slate-700 mb-1.5 ml-1">Straße & Hausnummer *</label>
                                                            <input
                                                                type="text" name="street" required
                                                                value={formData.street} onChange={handleInputChange}
                                                                className="w-full rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:border-[#0a1628] focus:ring-0 p-3.5 shadow-sm transition-colors"
                                                                placeholder="Musterstr. 12"
                                                            />
                                                        </div>

                                                        <div>
                                                            <label className="block text-xs font-bold text-slate-700 mb-1.5 ml-1">E-Mail Adresse *</label>
                                                            <input
                                                                type="email" name="email" required
                                                                value={formData.email} onChange={handleInputChange}
                                                                className="w-full rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:border-[#0a1628] focus:ring-0 p-3.5 shadow-sm transition-colors"
                                                                placeholder="email@beispiel.de"
                                                            />
                                                            <p className="text-xs text-slate-500 mt-2 ml-1 flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> Dorthin senden wir alle Dokumente sicher zu.</p>
                                                        </div>

                                                        {/* Legal Checkboxes - Cleaned up */}
                                                        <div className="space-y-4 pt-4 border-t border-slate-100">
                                                            <label className="flex items-start gap-3 cursor-pointer group">
                                                                <div className="relative flex items-center mt-0.5">
                                                                    <input type="checkbox" name="agb" required checked={formData.agb} onChange={handleInputChange} className="peer w-5 h-5 text-[#0a1628] rounded border-slate-300 focus:ring-[#0a1628] cursor-pointer" />
                                                                </div>
                                                                <span className="text-sm text-slate-600 leading-snug group-hover:text-slate-900 transition-colors">
                                                                    Ich akzeptiere die <a href="/agb" target="_blank" className="underline underline-offset-2 hover:text-blue-600 font-medium">AGB</a> und <a href="/datenschutz" target="_blank" className="underline underline-offset-2 hover:text-blue-600 font-medium">Datenschutzerklärung</a>.
                                                                </span>
                                                            </label>

                                                            <label className="flex items-start gap-3 cursor-pointer group">
                                                                <div className="relative flex items-center mt-0.5">
                                                                    <input type="checkbox" name="accuracy" required checked={formData.accuracy} onChange={handleInputChange} className="peer w-5 h-5 text-[#0a1628] rounded border-slate-300 focus:ring-[#0a1628] cursor-pointer" />
                                                                </div>
                                                                <span className="text-sm text-slate-600 leading-snug group-hover:text-slate-900 transition-colors">
                                                                    Die Empfängeradresse <strong>{authority?.name}</strong> ist korrekt für meinen Wohnort.
                                                                </span>
                                                            </label>

                                                            <label className="flex items-start gap-3 cursor-pointer group">
                                                                <div className="relative flex items-center mt-0.5">
                                                                    <input type="checkbox" name="messenger" required checked={formData.messenger} onChange={handleInputChange} className="peer w-5 h-5 text-[#0a1628] rounded border-slate-300 focus:ring-[#0a1628] cursor-pointer" />
                                                                </div>
                                                                <span className="text-sm text-slate-600 leading-snug group-hover:text-slate-900 transition-colors">
                                                                    Ich verstehe, dass "Sozialer Navigator" als Bote agiert und keine Rechtsberatung anbietet.
                                                                </span>
                                                            </label>
                                                        </div>
                                                    </div>

                                                    {/* Submit Area */}
                                                    <div className="mt-10">
                                                        <button
                                                            onClick={handleConfirmSend}
                                                            disabled={isPaidProcessing || !isFormValid}
                                                            className="w-full py-5 px-6 bg-[#0a1628] hover:bg-[#1e293b] text-white font-bold text-lg rounded-xl transition-all shadow-xl hover:shadow-[#0a1628]/20 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed group"
                                                        >
                                                            {isPaidProcessing ? (
                                                                <>
                                                                    <Loader2 className="w-6 h-6 animate-spin text-[#c5a67c]" />
                                                                    Wird gesichert verschlüsselt...
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <ShieldCheck className="w-6 h-6 text-[#c5a67c] group-disabled:text-slate-400" />
                                                                    <span>Zahlungspflichtig bestellen (5,99 €)</span>
                                                                </>
                                                            )}
                                                        </button>
                                                        <div className="flex items-center justify-center gap-2 mt-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
                                                            <ShieldCheck className="w-4 h-4" /> 256-Bit SSL Verschlüsselung
                                                        </div>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* View State: PDF Ready Review Dashboard */}
                        {view === 'pdf-ready' && (
                            <div className="col-span-1 md:col-span-3 bg-white border border-slate-200 rounded-[2.5rem] p-8 md:p-12 shadow-2xl relative animate-in fade-in zoom-in-95 duration-300 text-left">
                                <div className="max-w-6xl mx-auto">
                                    <div className="text-center mb-10">
                                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-700 text-[10px] font-bold uppercase tracking-widest mb-4">
                                            Antrag ausgefüllt & startklar
                                        </div>
                                        <h2 className="text-3xl md:text-4xl font-serif font-bold text-[#0a1628] mb-3">
                                            {!isContactFilled ? 'Antrags-PDF kostenfrei freischalten' : 'Ihr Antrag ist bereit zum Absenden!'}
                                        </h2>
                                        <p className="text-slate-500 max-w-2xl mx-auto">
                                            {!isContactFilled 
                                                ? `Wir haben die Berechnung für ${benefitLabel} durchgeführt. Tragen Sie jetzt noch kurz Ihren Namen und Ihre E-Mail-Adresse ein, um das fertig ausgefüllte PDF freizuschalten.`
                                                : `Wir haben Ihren Antrag auf ${benefitLabel} basierend auf Ihren Angaben vollständig ausgefüllt. Bitte überprüfen Sie Ihre Daten kurz und laden Sie das fertige PDF herunter.`
                                            }
                                        </p>
                                    </div>

                                    <div className="flex flex-col lg:flex-row gap-8 items-stretch">
                                        {/* Main Panel: Review Data */}
                                        <div className="flex-1 space-y-6">
                                            {!isContactFilled ? (
                                                /* Capture Contact Form */
                                                <div className="bg-slate-50 border border-slate-200/60 rounded-3xl p-6 md:p-8 space-y-6 shadow-inner animate-in fade-in duration-300">
                                                    <h3 className="font-serif text-xl font-bold text-[#0a1628] border-b border-slate-200 pb-3 flex items-center gap-2">
                                                        <User className="w-5 h-5 text-teal-600" />
                                                        <span>Wer soll den Antrag erhalten? (Empfängerdaten)</span>
                                                    </h3>

                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                                        <div>
                                                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 ml-1">Vorname *</label>
                                                            <input
                                                                type="text"
                                                                placeholder="z.B. Erika"
                                                                value={assistantData.firstName}
                                                                onChange={(e) => setAssistantData(prev => ({ ...prev, firstName: e.target.value }))}
                                                                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3.5 text-slate-900 placeholder:text-slate-400 focus:border-teal-600 focus:ring-1 focus:ring-teal-600/20 font-medium transition-colors"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 ml-1">Nachname *</label>
                                                            <input
                                                                type="text"
                                                                placeholder="z.B. Mustermann"
                                                                value={assistantData.lastName}
                                                                onChange={(e) => setAssistantData(prev => ({ ...prev, lastName: e.target.value }))}
                                                                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3.5 text-slate-900 placeholder:text-slate-400 focus:border-teal-600 focus:ring-1 focus:ring-teal-600/20 font-medium transition-colors"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 ml-1">E-Mail-Adresse *</label>
                                                            <input
                                                                type="email"
                                                                placeholder="erika@beispiel.de"
                                                                value={assistantData.email}
                                                                onChange={(e) => setAssistantData(prev => ({ ...prev, email: e.target.value }))}
                                                                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3.5 text-slate-900 placeholder:text-slate-400 focus:border-teal-600 focus:ring-1 focus:ring-teal-600/20 font-medium transition-colors"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 ml-1">Telefonnummer (Optional)</label>
                                                            <input
                                                                type="tel"
                                                                placeholder="z.B. 0176 1234567"
                                                                value={assistantData.phone}
                                                                onChange={(e) => setAssistantData(prev => ({ ...prev, phone: e.target.value }))}
                                                                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3.5 text-slate-900 placeholder:text-slate-400 focus:border-teal-600 focus:ring-1 focus:ring-teal-600/20 font-medium transition-colors"
                                                            />
                                                        </div>
                                                    </div>

                                                    <div className="pt-2">
                                                        <button
                                                            type="button"
                                                            disabled={!assistantData.firstName || !assistantData.lastName || !assistantData.email.includes('@')}
                                                            onClick={() => setIsContactFilled(true)}
                                                            className="w-full py-4 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-2xl shadow-xl shadow-teal-600/20 hover:-translate-y-0.5 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                                        >
                                                            Antrags-PDF freischalten & vorbereiten <ArrowRight className="w-5 h-5" />
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                /* Data Review Summary and Download Button */
                                                <>
                                                    <div className="bg-slate-50 border border-slate-200/60 rounded-3xl p-6 md:p-8 space-y-6 shadow-inner animate-in fade-in duration-300">
                                                        <h3 className="font-serif text-xl font-bold text-[#0a1628] border-b border-slate-200 pb-3 flex items-center gap-2">
                                                            <User className="w-5 h-5 text-teal-600" />
                                                            <span>Persönliche Angaben & Auszahlung</span>
                                                        </h3>

                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 text-sm text-left">
                                                            <div>
                                                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Name, Vorname</span>
                                                                <span className="font-semibold text-slate-800">{assistantData.firstName} {assistantData.lastName}</span>
                                                            </div>
                                                            <div>
                                                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Wohnort</span>
                                                                <span className="font-semibold text-slate-800">{assistantData.zipCity}</span>
                                                            </div>
                                                            <div>
                                                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">E-Mail-Adresse</span>
                                                                <span className="font-semibold text-slate-800">{assistantData.email}</span>
                                                            </div>
                                                            <div>
                                                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Telefonnummer</span>
                                                                <span className="font-semibold text-slate-800">{assistantData.phone || '-'}</span>
                                                            </div>
                                                            <div className="sm:col-span-2 pt-2 border-t border-slate-200/50">
                                                                <span className="text-[10px] font-bold uppercase tracking-wider text-teal-600 block mb-1">Bankverbindung & Hausanschrift (Datenschutz-Schutz)</span>
                                                                <p className="text-slate-500 text-xs mt-1 leading-relaxed font-medium">
                                                                    Aus Gründen des Datenschutzes haben wir Ihre <strong>Bankverbindung (IBAN)</strong>, Ihr <strong>Geburtsdatum</strong> sowie Ihre <strong>genaue Straße & Hausnummer</strong> online <strong>nicht</strong> abgefragt.
                                                                </p>
                                                                <p className="text-slate-400 text-[10px] mt-1 leading-relaxed">
                                                                    Sie können diese wenigen Angaben nach dem Herunterladen des PDFs ganz einfach handschriftlich oder direkt digital im Formular eintragen.
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="pt-2">
                                                        <button
                                                            type="button"
                                                            onClick={handleGeneratePdf}
                                                            disabled={isGeneratingPdf}
                                                            className="w-full py-5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-2xl shadow-xl shadow-teal-600/20 hover:-translate-y-0.5 active:scale-[0.99] transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer text-lg"
                                                        >
                                                            {isGeneratingPdf ? (
                                                                <>Wird generiert... <Loader2 className="w-6 h-6 animate-spin" /></>
                                                            ) : (
                                                                <>Vorausgefülltes PDF jetzt kostenlos herunterladen <Download className="w-6 h-6" /></>
                                                            )}
                                                        </button>
                                                        
                                                        <div className="flex items-center justify-center gap-3 mt-4 text-xs font-semibold text-slate-400 select-none">
                                                            <Lock className="w-4 h-4 text-teal-600" />
                                                            <span>Zero-Knowledge: Die PDF-Befüllung erfolgt zu 100 % sicher auf Ihrem Gerät</span>
                                                        </div>
                                                    </div>
                                                </>
                                            )}

                                            {/* Authority box inside the ready view */}
                                            {authority && (
                                                <div className="bg-teal-50/40 border border-teal-500/10 rounded-3xl p-6 flex flex-col sm:flex-row gap-5 items-start">
                                                    <div className="p-3 bg-white border border-teal-100 rounded-2xl text-teal-600 shadow-sm shrink-0">
                                                        <Building2 className="w-6 h-6" />
                                                    </div>
                                                    <div>
                                                        <h4 className="font-bold text-slate-800 text-sm">Empfänger (Zuständige Stelle)</h4>
                                                        <p className="text-slate-600 text-xs mt-1 leading-relaxed font-medium">
                                                            <strong>{authority.name}</strong><br />
                                                            {authority.street}<br />
                                                            {authority.zipCity}
                                                        </p>
                                                        {authority.email && authority.email !== 'Nicht verfügbar' && (
                                                            <div className="mt-3 text-xs flex items-center gap-2">
                                                                <span className="text-slate-400 font-bold uppercase tracking-wider text-[9px]">E-Mail für Anträge:</span>
                                                                <span className="font-semibold text-slate-700 font-mono select-all bg-white px-2 py-0.5 rounded border border-teal-100/50">{authority.email}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Right Sidebar: Live Preview Document */}
                                        <div className="w-full lg:w-[320px] shrink-0 bg-slate-50 border border-slate-200/60 rounded-3xl p-5 flex flex-col shadow-inner select-none relative overflow-hidden min-h-[380px]">
                                            <div className="absolute inset-0 bg-grid-slate-200/[0.4] bg-[bottom_1px_center] opacity-30 pointer-events-none"></div>
                                            
                                            <div className="flex justify-between items-center pb-3 border-b border-slate-200 mb-4 relative z-10">
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><FileCheck className="w-4 h-4 text-teal-600" /> LIVE-VORSCHAU</span>
                                                <span className="text-[9px] bg-teal-600/10 text-teal-700 px-2 py-0.5 rounded-full font-bold uppercase">Entwurf</span>
                                            </div>
                                            
                                            <div className="bg-white border border-slate-200 shadow-lg rounded-xl p-5 flex-1 flex flex-col justify-between text-[8px] leading-normal text-slate-700 font-sans relative z-10 max-h-[360px] overflow-y-auto font-mono">
                                                <div>
                                                    <div className="text-slate-400 border-b border-slate-100 pb-1 mb-2 font-medium text-left">
                                                        Abs.: {assistantData.firstName || '[Vorname]'} {assistantData.lastName || '[Nachname]'}, {assistantData.street || '[Straße]'}, {assistantData.zipCity || '[Ort]'}
                                                    </div>
                                                    
                                                    <div className="mb-4 text-left">
                                                        <p className="font-bold text-slate-900">{authority?.name || 'Zuständige Behörde'}</p>
                                                        <p className="text-slate-500 leading-tight">{authority?.street || '[Straße]'}<br />{authority?.zipCity || '[Ort]'}</p>
                                                    </div>
                                                    
                                                    <p className="font-bold text-[9px] text-slate-900 mb-2 text-left">Antrag auf {benefitLabel}</p>
                                                    
                                                    <div className="space-y-1 text-slate-600 leading-snug text-left">
                                                        <p>Sehr geehrte Damen und Herren,</p>
                                                        <p>
                                                            hiermit beantrage ich, <strong>{assistantData.lastName || '[Nachname]'}, {assistantData.firstName || '[Vorname]'}</strong>
                                                            {assistantData.birthDate ? ` (geb. am ${assistantData.birthDate})` : ''}, wohnhaft in <strong>{assistantData.street || '[Straße]'}, {assistantData.zipCity || '[Ort]'}</strong>,
                                                            die Leistung {benefitLabel} ab dem aktuellen Kalendermonat.
                                                        </p>
                                                        
                                                        {window.lastCalculationResult ? (
                                                            <p>Nach vorläufiger Berechnung beträgt mein ermittelter monatlicher Anspruch <strong>{Math.round(window.lastCalculationResult.amount)} €</strong>.</p>
                                                        ) : null}
                                                        
                                                        {assistantData.iban && (
                                                            <p className="pt-1">Bitte überweisen Sie die Zahlungen auf das Konto: <strong>{assistantData.iban}</strong> (Inhaber: {assistantData.kontoinhaber}).</p>
                                                        )}
                                                    </div>
                                                </div>
                                                
                                                <div className="pt-4 border-t border-slate-100 flex justify-between items-end text-slate-400 text-left">
                                                    <div>Ort, Datum: {new Date().toLocaleDateString('de-DE')}</div>
                                                    <div className="border-t border-dashed border-slate-300 w-20 text-center pt-0.5 font-bold">Unterschrift</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* View State: Assistant Questionnaire */}
                        {view === 'assistant' && (
                            <div className="col-span-1 md:col-span-2 bg-white border border-slate-200 rounded-[2.5rem] p-8 md:p-12 shadow-2xl relative animate-in fade-in zoom-in-95 duration-300 text-left">
                                <button
                                    onClick={() => setView('main')}
                                    className="absolute top-6 left-6 p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors flex items-center gap-2 font-medium cursor-pointer"
                                >
                                    ← Zurück
                                </button>
                                
                                <div className="max-w-4xl mx-auto">
                                    <div className="text-center mb-8 mt-4">
                                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-600 text-[10px] font-bold uppercase tracking-widest mb-4">
                                             Digitaler Antrags-Assistent ({benefitLabel})
                                        </div>
                                        <h2 className="text-3xl font-serif font-bold text-[#0F172A] mb-2">Offiziellen Antrag ausfüllen</h2>
                                        <p className="text-slate-500">Ihre Daten werden zu 100% lokal verarbeitet und nicht gespeichert.</p>
                                    </div>
                                    
                                    <div className="mb-10">
                                         <div className="flex justify-between text-xs text-slate-400 font-bold uppercase tracking-wider mb-2">
                                             <span>Schritt {assistantStep} von 5</span>
                                             <span>{Math.round((assistantStep / 5) * 100)}% abgeschlossen</span>
                                         </div>
                                         <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                             <div 
                                                 className="bg-teal-600 h-full transition-all duration-500 rounded-full"
                                                 style={{ width: `${(assistantStep / 5) * 100}%` }}
                                             ></div>
                                         </div>
                                    </div>
                                    
                                    <div className="flex flex-col lg:flex-row gap-10 items-stretch">
                                         <div className="flex-1 space-y-6">
                                             {assistantStep === 1 && (
                                                 <div className="space-y-4 animate-in fade-in duration-300">
                                                      <h3 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-2">1. Persönliche Details</h3>
                                                      <div className="grid grid-cols-2 gap-4">
                                                           <div>
                                                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Vorname *</label>
                                                                <input 
                                                                    type="text" 
                                                                    required
                                                                    value={assistantData.firstName}
                                                                    onChange={e => setAssistantData({...assistantData, firstName: e.target.value})}
                                                                    className="w-full rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 p-3.5 shadow-sm transition-all"
                                                                    placeholder="z.B. Max"
                                                                />
                                                           </div>
                                                           <div>
                                                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Nachname *</label>
                                                                <input 
                                                                    type="text" 
                                                                    required
                                                                    value={assistantData.lastName}
                                                                    onChange={e => setAssistantData({...assistantData, lastName: e.target.value})}
                                                                    className="w-full rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 p-3.5 shadow-sm transition-all"
                                                                    placeholder="z.B. Mustermann"
                                                                />
                                                           </div>
                                                      </div>
                                                      <div>
                                                           <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Geburtsdatum *</label>
                                                           <input 
                                                                type="text" 
                                                                required
                                                                value={assistantData.birthDate}
                                                                onChange={e => setAssistantData({...assistantData, birthDate: e.target.value})}
                                                                className="w-full rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 p-3.5 shadow-sm transition-all"
                                                                placeholder="TT.MM.JJJJ (z.B. 15.08.1985)"
                                                           />
                                                      </div>
                                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                           <div>
                                                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">E-Mail-Adresse *</label>
                                                                <input 
                                                                    type="email" 
                                                                    required
                                                                    value={assistantData.email}
                                                                    onChange={e => setAssistantData({...assistantData, email: e.target.value})}
                                                                    className="w-full rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 p-3.5 shadow-sm transition-all"
                                                                    placeholder="ihre@email.de"
                                                                />
                                                           </div>
                                                           <div>
                                                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Telefonnummer</label>
                                                                <input 
                                                                    type="tel" 
                                                                    value={assistantData.phone}
                                                                    onChange={e => setAssistantData({...assistantData, phone: e.target.value})}
                                                                    className="w-full rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 p-3.5 shadow-sm transition-all"
                                                                    placeholder="0176..."
                                                                />
                                                           </div>
                                                      </div>
                                                 </div>
                                             )}
                                             
                                             {assistantStep === 2 && (
                                                 <div className="space-y-4 animate-in fade-in duration-300">
                                                      <h3 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-2">2. Anschrift</h3>
                                                      <div>
                                                           <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Straße & Hausnummer *</label>
                                                           <input 
                                                                type="text" 
                                                                required
                                                                value={assistantData.street}
                                                                onChange={e => setAssistantData({...assistantData, street: e.target.value})}
                                                                className="w-full rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 p-3.5 shadow-sm transition-all"
                                                                placeholder="z.B. Hauptstraße 12"
                                                           />
                                                      </div>
                                                      <div>
                                                           <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">PLZ & Ort *</label>
                                                           <input 
                                                                type="text" 
                                                                required
                                                                value={assistantData.zipCity}
                                                                onChange={e => setAssistantData({...assistantData, zipCity: e.target.value})}
                                                                className="w-full rounded-xl border border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 p-3.5 shadow-sm transition-all font-medium"
                                                                placeholder="PLZ Ort"
                                                           />
                                                      </div>
                                                 </div>
                                             )}
                                             
                                             {assistantStep === 3 && (
                                                 <div className="space-y-4 animate-in fade-in duration-300">
                                                      <h3 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-2">3. Bankverbindung (Optional)</h3>
                                                      <p className="text-xs text-slate-500 leading-relaxed mb-4">Geben Sie Ihre IBAN an, damit die zuständige Behörde Zuschüsse direkt auf Ihr Konto überweisen kann.</p>
                                                      <div>
                                                           <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Kontoinhaber</label>
                                                           <input 
                                                                type="text" 
                                                                value={assistantData.kontoinhaber}
                                                                onChange={e => setAssistantData({...assistantData, kontoinhaber: e.target.value})}
                                                                className="w-full rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 p-3.5 shadow-sm transition-all"
                                                                placeholder={assistantData.firstName ? `${assistantData.firstName} ${assistantData.lastName}` : "Name des Inhabers"}
                                                           />
                                                      </div>
                                                      <div>
                                                           <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">IBAN (Optional)</label>
                                                           <input 
                                                                type="text" 
                                                                value={assistantData.iban}
                                                                onChange={e => setAssistantData({...assistantData, iban: e.target.value})}
                                                                className="w-full rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 p-3.5 shadow-sm transition-all"
                                                                placeholder="DE..."
                                                           />
                                                      </div>
                                                 </div>
                                             )}
                                             
                                             {assistantStep === 4 && (
                                                 <div className="space-y-6 animate-in fade-in duration-300">
                                                      <h3 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-2">4. Zusatzangaben</h3>
                                                      
                                                      {benefitLabel.toLowerCase().includes('wohngeld') ? (
                                                          <>
                                                              <div className="space-y-3 text-left">
                                                                   <label className="block text-sm font-bold text-slate-800">Empfangen Sie oder ein Haushaltsmitglied bereits andere Sozialleistungen (z. B. Bürgergeld, Grundsicherung)?</label>
                                                                   <div className="flex gap-4">
                                                                       <button 
                                                                           type="button"
                                                                           onClick={() => setAssistantData({...assistantData, transferBenefit: 'yes'})}
                                                                           className={`flex-1 py-3 border-2 rounded-xl font-bold transition-all cursor-pointer ${assistantData.transferBenefit === 'yes' ? 'border-teal-600 bg-teal-50 text-teal-700' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'}`}
                                                                       >
                                                                           Ja
                                                                       </button>
                                                                       <button 
                                                                           type="button"
                                                                           onClick={() => setAssistantData({...assistantData, transferBenefit: 'no'})}
                                                                           className={`flex-1 py-3 border-2 rounded-xl font-bold transition-all cursor-pointer ${assistantData.transferBenefit === 'no' ? 'border-teal-600 bg-teal-50 text-teal-700' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'}`}
                                                                       >
                                                                           Nein
                                                                       </button>
                                                                   </div>
                                                              </div>
                                                              <div className="space-y-3 text-left">
                                                                   <label className="block text-sm font-bold text-slate-800">Wohnen Sie in einer Eigentumswohnung oder einem eigenen Haus?</label>
                                                                   <div className="flex gap-4">
                                                                       <button 
                                                                           type="button"
                                                                           onClick={() => setAssistantData({...assistantData, isOwner: 'yes'})}
                                                                           className={`flex-1 py-3 border-2 rounded-xl font-bold transition-all cursor-pointer ${assistantData.isOwner === 'yes' ? 'border-teal-600 bg-teal-50 text-teal-700' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'}`}
                                                                       >
                                                                           Ja (Lastenzuschuss)
                                                                       </button>
                                                                       <button 
                                                                           type="button"
                                                                           onClick={() => setAssistantData({...assistantData, isOwner: 'no'})}
                                                                           className={`flex-1 py-3 border-2 rounded-xl font-bold transition-all cursor-pointer ${assistantData.isOwner === 'no' ? 'border-teal-600 bg-teal-50 text-teal-700' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'}`}
                                                                       >
                                                                           Nein (Mietzuschuss)
                                                                       </button>
                                                                   </div>
                                                              </div>
                                                          </>
                                                      ) : (
                                                          <>
                                                              <div className="space-y-3 text-left">
                                                                   <label className="block text-sm font-bold text-slate-800">Besitzen Sie oder ein Haushaltsmitglied ein Auto / KFZ?</label>
                                                                   <div className="flex gap-4">
                                                                       <button 
                                                                           type="button"
                                                                           onClick={() => setAssistantData({...assistantData, hasCar: 'yes'})}
                                                                           className={`flex-1 py-3 border-2 rounded-xl font-bold transition-all cursor-pointer ${assistantData.hasCar === 'yes' ? 'border-teal-600 bg-teal-50 text-teal-700' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'}`}
                                                                       >
                                                                           Ja
                                                                       </button>
                                                                       <button 
                                                                           type="button"
                                                                           onClick={() => setAssistantData({...assistantData, hasCar: 'no'})}
                                                                           className={`flex-1 py-3 border-2 rounded-xl font-bold transition-all cursor-pointer ${assistantData.hasCar === 'no' ? 'border-teal-600 bg-teal-50 text-teal-700' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'}`}
                                                                       >
                                                                           Nein
                                                                       </button>
                                                                   </div>
                                                              </div>
                                                              <div className="space-y-3 text-left">
                                                                   <label className="block text-sm font-bold text-slate-800">Besitzen Sie verwertbares Vermögen (Ersparnisse, Depots) über 40.000 €?</label>
                                                                   <div className="flex gap-4">
                                                                       <button 
                                                                           type="button"
                                                                           onClick={() => setAssistantData({...assistantData, hasSavings: 'yes'})}
                                                                           className={`flex-1 py-3 border-2 rounded-xl font-bold transition-all cursor-pointer ${assistantData.hasSavings === 'yes' ? 'border-teal-600 bg-teal-50 text-teal-700' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'}`}
                                                                       >
                                                                           Ja
                                                                       </button>
                                                                       <button 
                                                                           type="button"
                                                                           onClick={() => setAssistantData({...assistantData, hasSavings: 'no'})}
                                                                           className={`flex-1 py-3 border-2 rounded-xl font-bold transition-all cursor-pointer ${assistantData.hasSavings === 'no' ? 'border-teal-600 bg-teal-50 text-teal-700' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'}`}
                                                                       >
                                                                           Nein
                                                                       </button>
                                                                   </div>
                                                              </div>
                                                          </>
                                                      )}
                                                 </div>
                                             )}
                                             
                                             {assistantStep === 5 && (
                                                 <div className="space-y-6 animate-in fade-in duration-300">
                                                      <h3 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-2">5. Vorschau & Generierung</h3>
                                                      <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 flex gap-3">
                                                           <ShieldCheck className="w-6 h-6 text-[#0D9488] shrink-0 mt-0.5" />
                                                           <div className="text-xs text-emerald-800 font-medium leading-relaxed">
                                                                <strong>Zero-Knowledge Verschlüsselung:</strong> Ihre Daten werden zu 100% lokal auf Ihrem Gerät verarbeitet und niemals an unsere Server gesendet. Die PDF-Erstellung geschieht direkt in Ihrem Browser.
                                                           </div>
                                                      </div>
                                                      <p className="text-sm text-slate-600 leading-relaxed">Bitte prüfen Sie Ihre Angaben in der Live-Vorschau rechts. Wenn alles korrekt ist, können Sie Ihren offiziellen Antrag jetzt kostenfrei generieren.</p>
                                                 </div>
                                             )}
                                             
                                             <div className="pt-6 border-t border-slate-100 flex gap-4 mt-8">
                                                 {assistantStep > 1 && (
                                                     <button 
                                                         type="button"
                                                         onClick={handleAssistantBack}
                                                         className="px-6 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors cursor-pointer"
                                                     >
                                                         Zurück
                                                     </button>
                                                 )}
                                                 
                                                 {assistantStep < 5 ? (
                                                     <button 
                                                         type="button"
                                                         onClick={handleAssistantNext}
                                                         disabled={
                                                             (assistantStep === 1 && (!assistantData.firstName || !assistantData.lastName || !assistantData.birthDate || !assistantData.email)) ||
                                                             (assistantStep === 2 && (!assistantData.street || !assistantData.zipCity))
                                                         }
                                                         className="flex-1 py-3.5 bg-[#0F172A] hover:bg-[#1E293B] text-white font-bold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
                                                     >
                                                         Weiter <ArrowRight className="w-4 h-4" />
                                                     </button>
                                                 ) : (
                                                     <button 
                                                         type="button"
                                                         onClick={handleGeneratePdf}
                                                         disabled={isGeneratingPdf}
                                                         className="flex-1 py-3.5 bg-[#0D9488] hover:bg-teal-700 text-white font-bold rounded-xl shadow-lg shadow-teal-500/20 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                                                     >
                                                         {isGeneratingPdf ? (
                                                             <>Wird generiert... <Loader2 className="w-5 h-5 animate-spin" /></>
                                                         ) : (
                                                             <>Antrag jetzt kostenlos generieren <Download className="w-5 h-5" /></>
                                                         )}
                                                     </button>
                                                 )}
                                             </div>
                                         </div>
                                         
                                         <div className="w-full lg:w-[320px] shrink-0 bg-slate-50 border border-slate-200/60 rounded-3xl p-5 flex flex-col shadow-inner select-none relative overflow-hidden min-h-[380px]">
                                              <div className="absolute inset-0 bg-grid-slate-200/[0.4] bg-[bottom_1px_center] opacity-30 pointer-events-none"></div>
                                              
                                              <div className="flex justify-between items-center pb-3 border-b border-slate-200 mb-4 relative z-10">
                                                   <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><FileCheck className="w-4 h-4 text-[#0D9488]" /> LIVE-VORSCHAU</span>
                                                   <span className="text-[9px] bg-teal-600/10 text-teal-700 px-2 py-0.5 rounded-full font-bold uppercase">Entwurf</span>
                                              </div>
                                              
                                              <div className="bg-white border border-slate-200 shadow-lg rounded-xl p-5 flex-1 flex flex-col justify-between text-[8px] leading-normal text-slate-700 font-sans relative z-10 max-h-[320px] overflow-y-auto font-mono">
                                                   <div>
                                                       <div className="text-slate-400 border-b border-slate-100 pb-1 mb-2 font-medium">
                                                           {assistantData.firstName || assistantData.lastName ? (
                                                               <>Abs.: {assistantData.firstName} {assistantData.lastName}, {assistantData.street || '[Straße]'}, {assistantData.zipCity || '[Ort]'}</>
                                                           ) : (
                                                               <>Absender (Wird ausgefüllt...)</>
                                                           )}
                                                       </div>
                                                       
                                                       <div className="mb-4">
                                                           <p className="font-bold text-slate-900">{authority?.name || 'Zuständige Behörde'}</p>
                                                           <p className="text-slate-500 leading-tight">{authority?.street || '[Straße]'}<br />{authority?.zipCity || '[Ort]'}</p>
                                                       </div>
                                                       
                                                       <p className="font-bold text-[9px] text-slate-900 mb-2">Antrag auf {benefitLabel}</p>
                                                       
                                                       <div className="space-y-1 text-slate-600">
                                                           <p>Sehr geehrte Damen und Herren,</p>
                                                           <p>
                                                               hiermit beantrage ich, <strong>{assistantData.lastName || '[Name]'}, {assistantData.firstName || '[Vorname]'}</strong>
                                                               {assistantData.birthDate ? ` (geb. am ${assistantData.birthDate})` : ''}, wohnhaft in <strong>{assistantData.street || '[Straße]'}, {assistantData.zipCity || '[Ort]'}</strong>,
                                                               die Leistung {benefitLabel} ab dem aktuellen Kalendermonat.
                                                           </p>
                                                           
                                                           {window.lastCalculationResult ? (
                                                               <p>Nach vorläufiger Berechnung beträgt mein ermittelter monatlicher Anspruch <strong>{Math.round(window.lastCalculationResult.amount)} €</strong>.</p>
                                                           ) : null}
                                                           
                                                           {assistantData.iban && (
                                                               <p className="pt-1">Bitte überweisen Sie die Zahlungen auf das Konto: <strong>{assistantData.iban}</strong> (Inhaber: {assistantData.kontoinhaber || `${assistantData.firstName} ${assistantData.lastName}`}).</p>
                                                           )}
                                                       </div>
                                                   </div>
                                                   
                                                   <div className="pt-4 border-t border-slate-100 flex justify-between items-end text-slate-400">
                                                       <div>Ort, Datum: {new Date().toLocaleDateString('de-DE')}</div>
                                                       <div className="border-t border-dashed border-slate-300 w-20 text-center pt-0.5 font-bold">Unterschrift</div>
                                                   </div>
                                              </div>
                                         </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {view === 'assistant-success' && (
                            <div className="col-span-1 md:col-span-2 bg-white border border-teal-500/30 rounded-[2.5rem] p-8 md:p-12 shadow-2xl shadow-teal-500/10 text-center relative overflow-hidden animate-in fade-in zoom-in-95 duration-500 text-left text-left">
                                <div className="absolute inset-0 bg-gradient-to-b from-[#f8fafc] to-white pointer-events-none"></div>
                                <div className="relative z-10 flex flex-col items-center">

                                    <div className="w-20 h-20 bg-[#0D9488] text-white rounded-full flex items-center justify-center mb-8 shadow-xl border-4 border-white ring-1 ring-slate-100 animate-bounce" style={{ animationDuration: '3s' }}>
                                        <CheckCircle className="w-10 h-10" />
                                    </div>
                                    <h2 className="text-4xl font-serif font-bold text-[#0F172A] mb-4 text-center">Ihr Antrag ist fertig!</h2>
                                    <p className="text-teal-600 mb-8 font-bold uppercase tracking-widest text-xs text-center">PDF-Dokument erfolgreich generiert</p>

                                    <div className="mb-10 w-full max-w-md mx-auto bg-slate-50 border border-slate-200/60 rounded-2xl p-6 text-left space-y-4 shadow-inner">
                                        <div className="flex items-start gap-3">
                                            <div className="p-2.5 bg-white border border-slate-100 rounded-xl text-teal-600 shadow-sm shrink-0"><Building2 className="w-5 h-5" /></div>
                                            <div>
                                                <h4 className="font-bold text-slate-800 text-sm">Empfänger (Zuständiges Amt)</h4>
                                                <p className="text-slate-600 text-xs mt-0.5 leading-relaxed font-medium">
                                                    <strong>{authority?.name || 'Zuständige Stelle'}</strong><br />
                                                    {authority?.street}<br />
                                                    {authority?.zipCity}
                                                </p>
                                            </div>
                                        </div>
                                        {authority?.email && authority.email !== 'Nicht verfügbar' && (
                                            <div className="flex items-center gap-3 pt-3 border-t border-slate-200/60 text-xs">
                                                <div className="p-2.5 bg-white border border-slate-100 rounded-xl text-[#0D9488] shadow-sm shrink-0"><Mail className="w-5 h-5" /></div>
                                                <div>
                                                    <span className="block text-slate-400 font-bold uppercase tracking-wider text-[9px]">E-Mail für Anträge</span>
                                                    <span className="font-medium text-slate-700 select-all font-mono">{authority.email}</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex flex-col md:flex-row gap-4 justify-center items-center w-full max-w-lg mb-10">
                                        {authority?.email && authority.email !== 'Nicht verfügbar' ? (
                                            <button
                                                onClick={handleEmailAuthority}
                                                className="px-6 py-4 bg-teal-600 text-white rounded-xl font-bold hover:bg-teal-500 transition-all shadow-lg hover:shadow-xl w-full flex justify-center items-center gap-2 group cursor-pointer"
                                            >
                                                <Send className="w-5 h-5" />
                                                <span>Antrag per E-Mail an das Amt senden</span>
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => window.print()}
                                                className="px-6 py-4 bg-[#0F172A] text-white rounded-xl font-bold hover:bg-[#1E293B] transition-all shadow-lg hover:shadow-xl w-full flex justify-center items-center gap-2 group cursor-pointer"
                                            >
                                                <Printer className="w-5 h-5 text-[#c5a67c]" />
                                                <span>Antrag ausdrucken & postalisch senden</span>
                                            </button>
                                        )}
                                    </div>

                                    <div className="bg-[#f8fafc] border-l-4 border-teal-500 p-6 w-full max-w-lg text-left shadow-sm rounded-r-xl">
                                        <h4 className="font-bold text-[#0F172A] mb-2 flex items-center gap-2 font-serif text-sm">
                                            <Info className="w-4 h-4 text-teal-600" /> Wie geht es jetzt weiter?
                                        </h4>
                                        <ol className="text-slate-600 text-xs space-y-2 list-decimal list-inside font-medium leading-relaxed">
                                             <li><strong>PDF anhängen:</strong> Falls Sie oben auf "Per E-Mail senden" geklickt haben, öffnet sich Ihr Mail-Programm. Vergessen Sie nicht, das heruntergeladene PDF-Dokument an diese Mail anzuhängen!</li>
                                             <li><strong>Ausdrucken & Unterschreiben:</strong> Das Amt benötigt aus rechtlichen Gründen oft eine Unterschrift. Drucken Sie das PDF bei Gelegenheit aus, unterschreiben Sie es und reichen Sie es nach.</li>
                                             <li><strong>Unterlagen vorbereiten:</strong> Suchen Sie nun Ihre Nachweise (Mietvertrag, Einkommensbelege) zusammen. Das Amt wird sich bezüglich dieser Unterlagen in Kürze bei Ihnen melden.</li>
                                        </ol>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* Footer Disclaimer */}
            <p className="text-center text-xs text-slate-400 max-w-2xl mx-auto leading-relaxed mt-12 pb-8">
                Wir unterstützen beim Versand und bei der Vorbereitung. Die Entscheidung über den Antrag trifft ausschließlich die zuständige Behörde.
            </p>
        </div>
    );
}
