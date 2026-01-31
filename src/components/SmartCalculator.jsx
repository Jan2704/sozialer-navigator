import React, { useState, useEffect } from "react";
import { calculateBestOption } from "../logic/calculator-2026.js";
import { wohngeldData } from "../data/wohngeldData.js";
import { cn } from "../lib/utils";
import {
  Search,
  X,
  HelpCircle,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Briefcase,
  Baby,
  GraduationCap,
  FileWarning,
  MapPin,
  ChevronDown
} from "lucide-react";

export function SmartCalculator({ benefitSlug = "wohngeld", regelsatz = 563, className, defaultCity, theme = 'light' }) {
  const isDark = theme === 'dark';

  // Form State
  const [cityInput, setCityInput] = useState(defaultCity ? `${defaultCity.plz} ${defaultCity.stadt}` : "");
  const [selectedCity, setSelectedCity] = useState(defaultCity || null);
  const [suggestions, setSuggestions] = useState([]);
  const [income, setIncome] = useState("");
  const [rent, setRent] = useState("");
  const [heatingCost, setHeatingCost] = useState("");
  const [persons, setPersons] = useState("1");
  const [kids, setKids] = useState("0");
  const [isProMode, setIsProMode] = useState(false);
  const [expenses, setExpenses] = useState("");
  const [maintenance, setMaintenance] = useState("");

  // UI State
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isFocused, setIsFocused] = useState("");

  // Filter cities on input
  useEffect(() => {
    if (cityInput.length > 2 && !selectedCity) {
      const filtered = wohngeldData.filter(
        (c) =>
          c.stadt.toLowerCase().includes(cityInput.toLowerCase()) ||
          c.plz.includes(cityInput)
      ).slice(0, 5);
      setSuggestions(filtered);
      setShowSuggestions(true);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [cityInput, selectedCity]);

  const handleCitySelect = (city) => {
    setCityInput(`${city.plz} ${city.stadt}`);
    setSelectedCity(city);
    setSuggestions([]);
    setShowSuggestions(false);

    window.dispatchEvent(new CustomEvent('city-selected', {
      detail: {
        city: city.stadt,
        plz: city.plz,
        fullCityData: city
      }
    }));
  };

  const clearCity = () => {
    setCityInput("");
    setSelectedCity(null);
  };

  const calculateClaim = (e) => {
    e.preventDefault();
    setIsLoading(true);

    // Optimized Delay: 400ms (was 800ms) for better UX
    // Optimized Delay: 400ms for better UX
    setTimeout(async () => {
      try {
        let backendResult = null;
        let usedFallback = false;

        // 1. Try Backend Calculation
        try {
          // Construct Complex Request for Python Backend
          const householdMembers = [];

          // Main Person
          householdMembers.push({
            id: "main",
            role: "main",
            age: 35, // Assumption
            incomes: [{
              amount_brutto: parseFloat(income) || 0,
              amount_net: (parseFloat(income) || 0) * 0.7,
              source_type: "employment"
            }]
          });

          // Children
          const numKids = parseInt(kids);
          for (let i = 0; i < numKids; i++) {
            householdMembers.push({ id: `child_${i}`, role: "child", age: 10, incomes: [] });
          }

          // Partners/Others
          const numAdults = Math.max(0, parseInt(persons) - 1 - numKids);
          for (let i = 0; i < numAdults; i++) {
            householdMembers.push({ id: `partner_${i}`, role: "partner", age: 35, incomes: [] });
          }

          const payload = {
            zip_code: selectedCity ? selectedCity.plz : "10115",
            city_tier: selectedCity ? parseInt(selectedCity.mietstufe) : 4,
            rent_cold: parseFloat(rent) || 0,
            rent_utility: 0, // Not asked in simple form
            rent_heating: parseFloat(heatingCost) || 0,
            months_unemployed: 0,
            members: householdMembers
          };

          // Timeout logic: 2 seconds max
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 2000);

          const response = await fetch('http://localhost:5000/api/v4/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            signal: controller.signal
          });
          clearTimeout(timeoutId);

          if (response.ok) {
            const data = await response.json();
            // Map Backend Response to Frontend Event format
            // Backend returns: { results: [...], opportunities: [...] }
            // We need to find the "best" result

            const sgb2 = data.results.find(r => r.type === 'SGB2');
            const wohngeld = data.results.find(r => r.type === 'WOHNGELD');

            const sgb2Amount = sgb2 ? sgb2.amount : 0;
            const wohngeldAmount = wohngeld ? wohngeld.amount : 0;

            const isWohngeldBetter = wohngeldAmount >= sgb2Amount;
            const bestAmount = Math.max(sgb2Amount, wohngeldAmount);

            backendResult = {
              eligible: bestAmount > 0,
              amount: bestAmount,
              type: isWohngeldBetter ? "Wohngeld" : "Bürgergeld",
              details: {
                wohngeld: wohngeldAmount.toFixed(2),
                buergergeld: sgb2Amount.toFixed(2),
                kiz: 0, // Backend might calculate this inside wohngeld or separate?
                eligibleRent: parseFloat(rent) // Placeholder
              }
            };
          } else {
            throw new Error("Backend Returned Error");
          }

        } catch (apiError) {
          console.warn("Backend unavailable, using local fallback:", apiError);
          usedFallback = true;
        }

        // 2. Use Fallback if Backend Failed or yielded no result
        let resultDetail;

        if (backendResult && !usedFallback) {
          resultDetail = {
            ...backendResult,
            input: {
              income: parseFloat(income) || 0,
              rent: parseFloat(rent) || 0,
              heating: parseFloat(heatingCost) || 0,
              city: selectedCity,
              persons: parseInt(persons),
              kids: parseInt(kids),
              expenses: parseFloat(expenses) || 0,
              maintenance: parseFloat(maintenance) || 0
            }
          };
        } else {
          // Local JS Logic (Fallback)
          const calculation = calculateBestOption({
            income: parseFloat(income) || 0,
            rent: parseFloat(rent) || 0,
            heating: parseFloat(heatingCost) || 0,
            regelsatz,
            city: selectedCity,
            persons: parseInt(persons),
            kids: parseInt(kids),
            expenses: parseFloat(expenses) || 0,
            maintenance: parseFloat(maintenance) || 0,
            quadratmeter: 50 + (parseInt(persons) - 1) * 15
          });

          resultDetail = {
            ...calculation,
            input: {
              income: parseFloat(income) || 0,
              rent: parseFloat(rent) || 0,
              heating: parseFloat(heatingCost) || 0,
              city: selectedCity,
              persons: parseInt(persons),
              kids: parseInt(kids),
              expenses: parseFloat(expenses) || 0,
              maintenance: parseFloat(maintenance) || 0
            }
          };
        }

        const event = new CustomEvent('benefit-calculation-completed', {
          detail: resultDetail
        });

        window.dispatchEvent(event);
      } catch (err) {
        console.error("SmartCalculator Error:", err);
      } finally {
        setIsLoading(false);
      }
    }, 400);
  };

  // Theme Classes - CALM AUTHORITY EDITION
  // Uses global.css components: .calm-input, .calm-label, .calm-btn-primary

  const containerClass = "bg-transparent";

  // Icon styling
  const iconClass = "text-[var(--text-muted)]";

  // Dark Mode Overrides
  const inputDarkClass = "bg-slate-950/50 border-white/10 text-white placeholder:text-slate-400 focus:ring-blue-500/50 focus:border-blue-500/50";
  const labelDarkClass = "text-slate-200";

  return (
    <div className={cn("rounded-3xl p-2 transition-colors", containerClass, className)}>
      <form onSubmit={calculateClaim} className="space-y-6">
        <div className="space-y-3 relative text-left">
          <label htmlFor="city-input" className={cn("calm-label ml-1", isDark && labelDarkClass)}>
            Wohnort (Stadtsuche)
          </label>
          <div className="relative group">
            <div className={cn("absolute left-4 top-1/2 -translate-y-1/2", iconClass)}>
              <Search className="w-5 h-5" />
            </div>

            <input
              type="text"
              id="city-input"
              placeholder="Stadt oder PLZ..."
              className={cn("calm-input pl-12 pr-10", isDark && inputDarkClass)}
              autoComplete="off"
              value={cityInput}
              onFocus={() => setIsFocused("city")}
              onBlur={() => setTimeout(() => setIsFocused(""), 200)}
              onChange={(e) => {
                setCityInput(e.target.value);
                setSelectedCity(null);
              }}
            />

            {cityInput && (
              <button
                type="button"
                onClick={clearCity}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-red-500 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {showSuggestions && suggestions.length > 0 && (
            <div className={cn("absolute top-full left-0 right-0 border rounded-2xl shadow-2xl z-50 mt-2 max-h-60 overflow-y-auto", isDark ? "bg-slate-900 border-slate-700" : "bg-white border-slate-200")}>
              {suggestions.map((city) => (
                <div
                  key={`${city.plz}-${city.stadt}`}
                  onClick={() => handleCitySelect(city)}
                  className={cn("px-5 py-3 cursor-pointer text-sm font-medium flex justify-between items-center border-b last:border-none", isDark ? "hover:bg-slate-800 text-slate-300 border-slate-800" : "hover:bg-slate-50 text-slate-700 border-slate-50")}
                >
                  <span>{city.plz} {city.stadt}</span>
                  <span className={cn("text-[10px] px-1.5 py-0.5 rounded uppercase", isDark ? "bg-slate-800 text-slate-400" : "bg-slate-100 text-slate-500")}>Mietstufe {city.mietstufe}</span>
                </div>
              ))}
            </div>
          )}

          {selectedCity && (
            <div className={cn("rounded-2xl p-4 mt-4 flex items-center justify-between border", isDark ? "bg-brand-blue/10 border-brand-blue/20" : "bg-blue-50/50 border-blue-100")}>
              <div>
                <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-1">Gewählter Wohnort</p>
                <h4 className={cn("font-bold", isDark ? "text-white" : "text-slate-900")}>{selectedCity.plz} {selectedCity.stadt}</h4>
              </div>
              <div className={cn("px-3 py-1.5 rounded-xl shadow-sm text-[10px] font-black text-brand-blue border", isDark ? "bg-slate-900 border-brand-blue/20" : "bg-white border-blue-50")}>
                <a href="/leistungen/mietstufe" target="_blank" className="hover:underline decoration-brand-blue/30 underline-offset-2 flex items-center gap-1">
                  MIETSTUFE {selectedCity.mietstufe} <HelpCircle className="w-3 h-3 text-blue-400" />
                </a>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2 text-left">
            <label className={cn("calm-label ml-1", isDark && labelDarkClass)}>Haushalt</label>
            <select
              className={cn("calm-input px-5 appearance-none cursor-pointer", isDark && inputDarkClass)}
              value={persons}
              onChange={(e) => setPersons(e.target.value)}
            >
              <option value="1" className="text-slate-900">1 Person</option>
              <option value="2" className="text-slate-900">2 Personen</option>
              <option value="3" className="text-slate-900">3 Personen</option>
              <option value="4" className="text-slate-900">4+ Personen</option>
            </select>
          </div>
          <div className="space-y-2 text-left">
            <label className={cn("calm-label ml-1", isDark && labelDarkClass)}>Kinder</label>
            <select
              className={cn("calm-input px-5 appearance-none cursor-pointer", isDark && inputDarkClass)}
              value={kids}
              onChange={(e) => setKids(e.target.value)}
            >
              <option value="0" className="text-slate-900">Keine</option>
              <option value="1" className="text-slate-900">1 Kind</option>
              <option value="2" className="text-slate-900">2 Kinder</option>
              <option value="3" className="text-slate-900">3+ Kinder</option>
            </select>
          </div>
        </div>

        {/* RESTORED INPUTS */}
        <div className="space-y-5">
          {/* INCOME */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className={cn("calm-label", isDark && labelDarkClass)}>Brutto-Einkommen</label>
              <a href="/leistungen/einkommen" target="_blank" className="text-[10px] text-brand-blue font-bold uppercase tracking-wider hover:underline flex items-center gap-1 group">
                <span className="group-hover:text-blue-500">Was zählt dazu?</span>
                <HelpCircle className={cn("w-3 h-3 transition-colors", isDark ? "text-slate-600 group-hover:text-brand-blue" : "text-blue-300 group-hover:text-brand-blue")} />
              </a>
            </div>
            <div className="relative">
              <input
                type="number"
                value={income}
                onChange={(e) => setIncome(e.target.value)}
                className={cn("calm-input text-lg font-semibold", isDark && inputDarkClass)}
                placeholder="z.B. 2100"
              />
              <span className={cn("absolute right-4 top-1/2 -translate-y-1/2 font-bold", isDark ? "text-slate-400" : "text-slate-400")}>€</span>
            </div>
            {income > 100 && (
              <div className="text-right mt-1.5">
                <a href="/leistungen/buergergeld-freibetrag" target="_blank" className={cn("inline-flex items-center gap-1 text-[10px] font-bold transition-colors px-2 py-0.5 rounded-full border", isDark ? "text-slate-400 hover:text-brand-blue bg-white/5 border-white/10" : "text-slate-400 hover:text-brand-blue bg-slate-50 border-slate-100")}>
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400"></span>
                  Freibetrag wird automatisch berechnet
                </a>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* RENT */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className={cn("calm-label mb-0", isDark && labelDarkClass)}>Kaltmiete</label>
              </div>
              <div className="relative">
                <input
                  type="number"
                  value={rent}
                  onChange={(e) => setRent(e.target.value)}
                  className={cn("calm-input text-lg font-semibold", isDark && inputDarkClass)}
                  placeholder="z.B. 450"
                />
                <span className={cn("absolute right-4 top-1/2 -translate-y-1/2 font-bold", isDark ? "text-slate-400" : "text-slate-400")}>€</span>
              </div>
            </div>

            {/* HEATING */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className={cn("calm-label mb-0", isDark && labelDarkClass)}>Heizkosten</label>
                <a href="/leistungen/heizkosten" target="_blank" className="text-[10px] text-brand-blue font-bold uppercase tracking-wider hover:underline flex items-center gap-1">
                  Hilfe <HelpCircle className={cn("w-3 h-3", isDark ? "text-slate-600" : "text-blue-300")} />
                </a>
              </div>
              <div className="relative">
                <input
                  type="number"
                  value={heatingCost}
                  onChange={(e) => setHeatingCost(e.target.value)}
                  className={cn("calm-input text-lg font-semibold", isDark && inputDarkClass)}
                  placeholder="z.B. 90"
                />
                <span className={cn("absolute right-4 top-1/2 -translate-y-1/2 font-bold", isDark ? "text-slate-400" : "text-slate-400")}>€</span>
              </div>
            </div>
          </div>
        </div>

        {/* EXPERT MODE TOGGLE */}
        <div className="pt-2">
          <button
            type="button"
            onClick={() => setIsProMode(!isProMode)}
            className={cn("flex items-center gap-2 text-xs font-bold uppercase tracking-widest transition-colors group", isDark ? "text-slate-400 hover:text-brand-blue" : "text-slate-400 hover:text-brand-blue")}
          >
            <div className={cn("w-8 h-4 rounded-full relative transition-colors", isProMode ? 'bg-brand-blue' : (isDark ? 'bg-slate-700' : 'bg-slate-200'))}>
              <div className={cn("absolute top-1/2 -translate-y-1/2 left-0.5 w-3 h-3 bg-white rounded-full shadow-sm transition-transform", isProMode ? 'translate-x-4' : 'translate-x-0')}></div>
            </div>
            Experten-Modus {isProMode ? 'an' : 'aus'}
          </button>

          {/* EXPERT FIELDS */}
          <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 transition-all duration-300 overflow-hidden ${isProMode ? 'max-h-40 opacity-100 mt-4' : 'max-h-0 opacity-0 mt-0'}`}>
            <div className="space-y-3 text-left">
              <div className="flex items-center justify-between">
                <label className={cn("calm-label ml-1", isDark && labelDarkClass)}>Werbungskosten (Mtl.)</label>
                <a href="/leistungen/werbungskosten" target="_blank" className="text-[10px] font-bold text-brand-blue hover:underline">Was ist das?</a>
              </div>
              <div className="relative">
                <input
                  type="number"
                  placeholder="z.B. 150"
                  className={cn("calm-input", isDark && inputDarkClass)}
                  value={expenses}
                  onChange={(e) => setExpenses(e.target.value)}
                />
                <span className={cn("absolute right-5 top-1/2 -translate-y-1/2 font-bold text-sm", isDark ? "text-slate-400" : "text-slate-300")}>€</span>
              </div>
            </div>
            <div className="space-y-3 text-left">
              <label className={cn("calm-label ml-1", isDark && labelDarkClass)}>Unterhaltszahlungen</label>
              <div className="relative">
                <input
                  type="number"
                  placeholder="z.B. 300"
                  className={cn("calm-input", isDark && inputDarkClass)}
                  value={maintenance}
                  onChange={(e) => setMaintenance(e.target.value)}
                />
                <span className={cn("absolute right-5 top-1/2 -translate-y-1/2 font-bold text-sm", isDark ? "text-slate-400" : "text-slate-300")}>€</span>
              </div>
            </div>
          </div>
        </div>

        <button
          type="submit"
          className="w-full calm-btn-primary shadow-lg"
          disabled={isLoading}
        >
          {isLoading ? "Wird berechnet..." : "Anspruch prüfen"}
        </button>
      </form >
    </div >
  );
}
