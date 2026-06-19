import React, { useState, useEffect } from "react";
import { calculateBestOption } from "../logic/calculator-2026.js";
import { wohngeldData } from "../data/wohngeld-data.js";
import { cn } from "../lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  ArrowRight,
  ArrowLeft,
  Briefcase,
  Users,
  Baby,
  MapPin,
  Euro,
  Home,
  CheckCircle2,
  AlertCircle
} from "lucide-react";

const steps = [
  { id: "status", title: "Aktuelle Situation" },
  { id: "career", title: "Perspektive" },
  { id: "household", title: "Dein Haushalt" },
  { id: "location", title: "Wohnort" },
  { id: "income", title: "Einkommen" },
  { id: "rent", title: "Miete" },
  { id: "result", title: "Ergebnis" }
];

export function StepCalculator({ defaultCity }) {
  // Form State
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState(1);
  
  const [status, setStatus] = useState("");
  const [avgsIntent, setAvgsIntent] = useState(null);
  const [persons, setPersons] = useState("");
  const [kids, setKids] = useState("0");
  
  const [cityInput, setCityInput] = useState(defaultCity ? `${defaultCity.plz} ${defaultCity.stadt}` : "");
  const [selectedCity, setSelectedCity] = useState(defaultCity || null);
  const [suggestions, setSuggestions] = useState([]);
  
  const [income, setIncome] = useState("");
  const [rent, setRent] = useState(""); // Warmmiete
  
  const [isCalculating, setIsCalculating] = useState(false);
  const [result, setResult] = useState(null);

  // Constants
  const regelsatz = 563;

  // Handlers
  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setDirection(1);
      setCurrentStep(prev => prev + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setDirection(-1);
      setCurrentStep(prev => prev - 1);
    }
  };

  // City Search Logic (Simplified)
  useEffect(() => {
    const isSearchingPLZ = /^\d+$/.test(cityInput.trim());
    if (cityInput.length >= 2 && isSearchingPLZ && !selectedCity) {
      let filtered = wohngeldData.filter(c => c.plz.startsWith(cityInput.trim()));
      setSuggestions(filtered.slice(0, 5));
    } else {
      setSuggestions([]);
    }
  }, [cityInput, selectedCity]);

  const handleCitySelect = (city) => {
    setCityInput(`${city.plz} ${city.stadt}`);
    setSelectedCity(city);
    setSuggestions([]);
  };

  const handleCalculate = () => {
    setIsCalculating(true);
    setDirection(1);
    setCurrentStep(6); // Go to result step immediately showing loading

    setTimeout(() => {
      // Split Warmmiete roughly into Kalt (80%) and Heiz (20%) for the engine
      const warm = parseFloat(rent) || 0;
      const kalt = warm * 0.8;
      const heiz = warm * 0.2;

      const calculation = calculateBestOption({
        income: parseFloat(income) || 0,
        rent: kalt,
        heating: heiz,
        regelsatz,
        city: selectedCity,
        persons: parseInt(persons) || 1,
        kids: parseInt(kids) || 0,
        status: status || "employee",
        expenses: 120, // Pauschale for MVP
        maintenance: 0,
        quadratmeter: 50 + (parseInt(persons) - 1) * 15
      });

      const finalResult = {
        ...calculation,
        input: {
          income: parseFloat(income),
          rent: warm,
          city: selectedCity,
          persons: parseInt(persons),
          kids: parseInt(kids),
          status: status
        }
      };
      
      setResult(finalResult);
      
      // TAXFIX-FEATURE: Store state securely in session storage for deep mapping
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('sozialerNavigatorState', JSON.stringify(finalResult));
      }
      setIsCalculating(false);
      
      // Trigger global event if needed
      window.dispatchEvent(new CustomEvent('benefit-calculation-completed', {
        detail: {
            ...calculation,
            input: { rent: warm, income: parseFloat(income) }
        }
      }));
    }, 1500); // Fake delay for perceived value
  };

  // Variants for Framer Motion
  const variants = {
    enter: (direction) => ({
      x: direction > 0 ? 50 : -50,
      opacity: 0
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1
    },
    exit: (direction) => ({
      zIndex: 0,
      x: direction < 0 ? 50 : -50,
      opacity: 0
    })
  };

  // Renders
  const renderStatus = () => (
    <div className="space-y-6">
      <h3 className="text-2xl font-bold text-slate-900 mb-6">Wie ist deine aktuelle Situation?</h3>
      <div className="grid grid-cols-1 gap-4">
        {[
          { id: "employee", label: "Angestellt / Arbeitssuchend", icon: Briefcase },
          { id: "pensioner", label: "Rentner / Pensionär", icon: Users },
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => { setStatus(item.id); setTimeout(nextStep, 200); }}
            className={cn(
              "flex items-center gap-4 p-5 rounded-2xl border-2 transition-all text-left",
              status === item.id 
                ? "border-brand-blue bg-brand-blue/5 shadow-md" 
                : "border-slate-200 hover:border-brand-blue/50 hover:bg-slate-50"
            )}
          >
            <div className={cn("p-3 rounded-xl", status === item.id ? "bg-brand-blue text-white" : "bg-slate-100 text-slate-500")}>
              <item.icon className="w-6 h-6" />
            </div>
            <div>
              <div className="font-bold text-slate-900 text-lg">{item.label}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );

  const renderCareer = () => (
    <div className="space-y-6">
      <h3 className="text-2xl font-bold text-slate-900 mb-2">Berufliche Perspektive</h3>
      <p className="text-slate-500 mb-6 font-medium">Bist du aktuell beim Amt gemeldet oder denkst über eine berufliche Weiterbildung/Neuorientierung nach?</p>
      <div className="grid grid-cols-1 gap-4">
        {[
          { id: "yes", label: "Ja, ich möchte mich weiterentwickeln" },
          { id: "no", label: "Nein, aktuell nicht" },
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => { setAvgsIntent(item.id); setTimeout(nextStep, 200); }}
            className={cn(
              "p-5 rounded-2xl border-2 transition-all text-left font-bold text-lg",
              avgsIntent === item.id 
                ? "border-brand-blue bg-brand-blue/5 shadow-md text-brand-blue" 
                : "border-slate-200 hover:border-brand-blue/50 hover:bg-slate-50 text-slate-700"
            )}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );

  const renderHousehold = () => (
    <div className="space-y-6">
      <h3 className="text-2xl font-bold text-slate-900 mb-6">Wohnst du alleine?</h3>
      <div className="grid grid-cols-1 gap-4 mb-8">
        {[
          { id: "1", label: "Ich wohne alleine" },
          { id: "2", label: "Mit Partner/in" },
          { id: "3", label: "Mehrere Erwachsene (WG)" },
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => setPersons(item.id)}
            className={cn(
              "p-5 rounded-2xl border-2 transition-all text-left font-bold text-lg",
              persons === item.id 
                ? "border-brand-blue bg-brand-blue/5 shadow-md text-brand-blue" 
                : "border-slate-200 hover:border-brand-blue/50 hover:bg-slate-50 text-slate-700"
            )}
          >
            {item.label}
          </button>
        ))}
      </div>
      
      {persons && (
        <div className="animate-in fade-in slide-in-from-bottom-4">
          <h4 className="text-lg font-bold text-slate-900 mb-4">Leben Kinder im Haushalt?</h4>
          <div className="flex gap-3">
             {[0, 1, 2, 3, 4].map(num => (
               <button
                 key={num}
                 onClick={() => setKids(num.toString())}
                 className={cn(
                   "flex-1 py-4 rounded-xl border-2 font-bold transition-all text-lg",
                   kids === num.toString()
                     ? "border-brand-blue bg-brand-blue text-white shadow-md"
                     : "border-slate-200 hover:border-brand-blue/50 hover:bg-slate-50 text-slate-700"
                 )}
               >
                 {num === 4 ? "4+" : num}
               </button>
             ))}
          </div>
          <button 
            onClick={nextStep}
            className="w-full mt-8 bg-brand-blue text-white font-bold py-4 rounded-xl shadow-lg hover:shadow-brand-blue/30 transition-all flex justify-center items-center gap-2"
          >
            Weiter <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );

  const renderLocation = () => (
    <div className="space-y-6">
      <h3 className="text-2xl font-bold text-slate-900 mb-2">Wo wohnst du?</h3>
      <p className="text-slate-500 mb-6 font-medium">Wir benötigen deine Postleitzahl, um die Mietobergrenzen für deine Stadt zu prüfen.</p>
      
      <div className="relative">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
          <MapPin className="w-6 h-6" />
        </div>
        <input
          type="text"
          value={cityInput}
          onChange={(e) => {
            setCityInput(e.target.value.replace(/\D/g, ''));
            setSelectedCity(null);
          }}
          placeholder="PLZ eingeben..."
          maxLength={5}
          className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl pl-12 pr-4 py-4 text-xl font-bold text-slate-900 outline-none focus:bg-white focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/10 transition-all"
        />
        
        {suggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden">
            {suggestions.map((city) => (
              <button
                key={`${city.plz}-${city.stadt}`}
                onClick={() => handleCitySelect(city)}
                className="w-full text-left px-5 py-4 hover:bg-slate-50 border-b last:border-none flex justify-between items-center"
              >
                <div>
                  <span className="font-bold text-slate-900 text-lg mr-2">{city.plz}</span>
                  <span className="text-slate-600">{city.stadt}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedCity && (
        <div className="animate-in fade-in slide-in-from-bottom-4">
          <div className="bg-brand-blue/5 border-2 border-brand-blue/20 rounded-xl p-5 mb-8">
            <p className="text-brand-blue font-bold flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" />
              Stadt erkannt: Mietstufe {selectedCity.mietstufe}
            </p>
          </div>
          <button 
            onClick={nextStep}
            className="w-full bg-brand-blue text-white font-bold py-4 rounded-xl shadow-lg hover:shadow-brand-blue/30 transition-all flex justify-center items-center gap-2"
          >
            Weiter <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );

  const renderIncome = () => (
    <div className="space-y-6">
      <h3 className="text-2xl font-bold text-slate-900 mb-2">Wie hoch ist dein Brutto-Einkommen?</h3>
      <p className="text-slate-500 mb-6 font-medium">Dein gesamtes Haushaltseinkommen (inkl. Kindergeld etc.) vor Steuern. Keine Sorge, Freibeträge ziehen wir automatisch ab.</p>
      
      <div className="relative">
        <input
          type="number"
          value={income}
          onChange={(e) => setIncome(e.target.value)}
          placeholder="z.B. 2500"
          className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-6 py-5 text-3xl font-bold text-slate-900 outline-none focus:bg-white focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/10 transition-all"
        />
        <div className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-2xl">
          €
        </div>
      </div>
      
      <button 
        onClick={nextStep}
        disabled={!income}
        className="w-full mt-8 bg-brand-blue text-white font-bold py-4 rounded-xl shadow-lg hover:shadow-brand-blue/30 transition-all flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Weiter <ArrowRight className="w-5 h-5" />
      </button>
    </div>
  );

  const renderRent = () => (
    <div className="space-y-6">
      <h3 className="text-2xl font-bold text-slate-900 mb-2">Wie hoch ist deine Warmmiete?</h3>
      <p className="text-slate-500 mb-6 font-medium">Miete inklusive Heizung und Nebenkosten.</p>
      
      <div className="relative">
        <input
          type="number"
          value={rent}
          onChange={(e) => setRent(e.target.value)}
          placeholder="z.B. 800"
          className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-6 py-5 text-3xl font-bold text-slate-900 outline-none focus:bg-white focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/10 transition-all"
        />
        <div className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-2xl">
          €
        </div>
      </div>
      
      <button 
        onClick={handleCalculate}
        disabled={!rent}
        className="w-full mt-8 bg-brand-emerald hover:bg-[#0ea5e9] text-white font-bold py-5 rounded-xl shadow-lg hover:shadow-brand-emerald/30 transition-all flex justify-center items-center gap-2 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Jetzt kostenlos berechnen
      </button>
    </div>
  );

  const renderResult = () => {
    if (isCalculating) {
      return (
        <div className="flex flex-col items-center justify-center py-12 space-y-6">
          <div className="w-16 h-16 border-4 border-brand-blue/20 border-t-brand-blue rounded-full animate-spin"></div>
          <h3 className="text-xl font-bold text-slate-900">Wir prüfen deine Förderungen...</h3>
          <p className="text-slate-500 font-medium">Rechtliche Vorgaben für 2026 werden angewandt.</p>
        </div>
      );
    }

    if (!result) return null;

    const { eligible, amount, type } = result;

    return (
      <div className="text-left space-y-6 py-2">
        
        <div className="mb-6">
           <h3 className="text-3xl font-black text-slate-900 mb-2">Deine Förder-Möglichkeiten</h3>
           <p className="text-slate-600 font-medium">Wir haben auf Basis deiner Angaben folgende Ansprüche identifiziert:</p>
        </div>

        {/* Card 1: Wohngeld / Bürgergeld */}
        {eligible && (
            <div className="bg-white border-2 border-brand-emerald rounded-2xl p-6 shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-brand-emerald text-white text-[10px] font-bold uppercase tracking-widest py-1 px-3 rounded-bl-xl">
                   Hauptanspruch
                </div>
                <h4 className="text-xl font-bold text-slate-900 mb-1">{type}</h4>
                <p className="text-3xl font-black text-brand-emerald mb-4">~ {amount.toFixed(0)}€ <span className="text-sm font-medium text-slate-500">/ Monat</span></p>
                <p className="text-sm text-slate-600 mb-6">Sichere dir deinen Anspruch zur Fristwahrung.</p>
                
                <a 
                  href={`/pdf-paket?type=${encodeURIComponent(type)}`} 
                  className="w-full block text-center bg-brand-emerald hover:bg-emerald-600 text-white font-bold py-3 rounded-xl transition-all"
                >
                  Formlosen Antrag generieren
                </a>
            </div>
        )}

        {/* Card 2: AVGS Coaching Lead */}
        {avgsIntent === "yes" && (
            <div className="bg-white border-2 border-brand-blue rounded-2xl p-6 shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-brand-blue text-white text-[10px] font-bold uppercase tracking-widest py-1 px-3 rounded-bl-xl">
                   100% Gefördert
                </div>
                <h4 className="text-xl font-bold text-slate-900 mb-1">Karriere-Coaching (AVGS)</h4>
                <p className="text-3xl font-black text-brand-blue mb-4">Wert: 2.500€</p>
                <p className="text-sm text-slate-600 mb-6">Der Staat zahlt dein individuelles Coaching zur beruflichen Neuorientierung komplett.</p>
                
                <button 
                  onClick={() => alert('Hier würde sich z.B. ein Kontaktformular für den Bildungsanbieter öffnen. (Lead-Gen)')}
                  className="w-full bg-brand-blue hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-all"
                >
                  Jetzt gratis Beratung sichern
                </button>
            </div>
        )}

        {/* Card 3: Kinderzuschlag */}
        {parseInt(kids) > 0 && (
             <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-md">
                <h4 className="text-lg font-bold text-slate-900 mb-1 flex items-center gap-2">
                   <Baby className="w-5 h-5 text-brand-indigo" /> Kinderzuschlag (KiZ)
                </h4>
                <p className="text-2xl font-black text-brand-indigo mb-2">bis zu 297€ <span className="text-sm font-medium text-slate-500">/ Kind</span></p>
                <p className="text-sm text-slate-600">Da du Kinder hast, prüfe nach dem {type}-Antrag unbedingt auch den separaten Kinderzuschlag bei der Familienkasse.</p>
             </div>
        )}

        {/* Fallback if absolutely nothing is eligible */}
        {!eligible && avgsIntent !== "yes" && parseInt(kids) === 0 && (
             <div className="text-center py-8">
               <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-4">
                 <AlertCircle className="w-8 h-8" />
               </div>
               <h3 className="text-xl font-bold text-slate-900">Leider kein direkter Anspruch</h3>
               <p className="text-slate-600 mt-2">Dein Einkommen scheint die Obergrenzen zu überschreiten.</p>
             </div>
        )}

      </div>
    );
  };

  return (
    <div className="w-full max-w-xl mx-auto bg-white rounded-[2rem] shadow-2xl overflow-hidden border border-slate-100 min-h-[500px] flex flex-col">
      {/* Header / Progress */}
      <div className="px-8 pt-8 pb-4 border-b border-slate-100">
        <div className="flex justify-between items-center mb-6">
           <button 
             onClick={prevStep} 
             className={cn("p-2 rounded-full hover:bg-slate-100 text-slate-500 transition-colors", currentStep === 0 || currentStep === 6 ? "opacity-0 pointer-events-none" : "")}
           >
             <ArrowLeft className="w-5 h-5" />
           </button>
           <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
              {currentStep < 6 ? `Schritt ${currentStep + 1} von 6` : "Auswertung"}
           </span>
           <div className="w-9"></div> {/* Spacer for centering */}
        </div>
        
        {currentStep < 6 && (
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
            <div 
              className="bg-brand-blue h-full rounded-full transition-all duration-500"
              style={{ width: `${((currentStep + 1) / 6) * 100}%` }}
            ></div>
          </div>
        )}
      </div>

      {/* Content Area with Framer Motion */}
      <div className="relative flex-grow p-8 overflow-hidden">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentStep}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="w-full"
          >
            {currentStep === 0 && renderStatus()}
            {currentStep === 1 && renderCareer()}
            {currentStep === 2 && renderHousehold()}
            {currentStep === 3 && renderLocation()}
            {currentStep === 4 && renderIncome()}
            {currentStep === 5 && renderRent()}
            {currentStep === 6 && renderResult()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
