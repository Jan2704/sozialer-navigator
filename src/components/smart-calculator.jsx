import React, { useState, useEffect } from "react";
import { evaluateAllBenefits } from "../logic/benefit-engine.js";
import { wohngeldData } from "../data/wohngeld-data.js";
import { cn } from "../lib/utils";
import {
  Search,
  X,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  ChevronDown,
  Info
} from "lucide-react";

function InfoTooltip({ text }) {
  return (
    <div className="relative group inline-block ml-1.5 align-middle select-none">
      <Info className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer transition-colors" />
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-slate-900 text-white text-[10px] rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-200 text-center font-normal z-50 shadow-lg leading-normal">
        {text}
        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-900" />
      </div>
    </div>
  );
}

export function SmartCalculator({ benefitSlug = "wohngeld", regelsatz = 563, className, defaultCity, theme = 'light' }) {
  const isDark = theme === 'dark';

  // Wizard Step State (1, 2, 3, or 4)
  const [step, setStep] = useState(1);

  // --- Step 1 States: Basis & Status ---
  const [age, setAge] = useState("");
  const [cityInput, setCityInput] = useState(defaultCity ? `${defaultCity.plz} ${defaultCity.stadt}` : "");
  const [selectedCity, setSelectedCity] = useState(defaultCity || null);
  const [status, setStatus] = useState("employee");
  const [isKurzarbeit, setIsKurzarbeit] = useState(false);
  const [schoolType, setSchoolType] = useState("Universität");
  const [livesWithParents, setLivesWithParents] = useState(false);
  const [parentIncomeBracket, setParentIncomeBracket] = useState("normal");
  const [grundrenteYears, setGrundrenteYears] = useState("unknown");
  const [bafoegSelfInsured, setBafoegSelfInsured] = useState(false);
  const [kidsBirthYears, setKidsBirthYears] = useState({});

  // --- Step 2 States: Haushalt & Wohnen ---
  const [persons, setPersons] = useState("1");
  const [housingType, setHousingType] = useState("Miete");
  const [rent, setRent] = useState("");
  const [heatingCost, setHeatingCost] = useState("");
  const [interest, setInterest] = useState("");
  const [operatingCosts, setOperatingCosts] = useState("");
  const [propertyTax, setPropertyTax] = useState("");
  const [housingArea, setHousingArea] = useState("");
  const [hasCareDependent, setHasCareDependent] = useState(false);
  const [careDependentGrad, setCareDependentGrad] = useState("PG 2");
  const [careOrganization, setCareOrganization] = useState("private");

  // --- Step 3 States: Familie & Kinder ---
  const [kids, setKids] = useState("0");
  const [kidsAgesList, setKidsAgesList] = useState([]);
  const [isSingleParent, setIsSingleParent] = useState(false);
  const [childSupportReceived, setChildSupportReceived] = useState("none");
  const [childOwnIncome, setChildOwnIncome] = useState("");
  const [isPregnantOrNewborn, setIsPregnantOrNewborn] = useState(false);
  const [netIncomeBeforeBirth, setNetIncomeBeforeBirth] = useState("");
  const [elterngeldOption, setElterngeldOption] = useState("basis");

  // --- Step 4 States: Einkommen & Vermögen ---
  const [income, setIncome] = useState("");
  const [netIncome, setNetIncome] = useState("");
  const [terminationReason, setTerminationReason] = useState("none");
  const [expenses, setExpenses] = useState("");
  const [maintenance, setMaintenance] = useState("");
  const [hasHighAssets, setHasHighAssets] = useState(false);
  const [hasDisability, setHasDisability] = useState(false);
  const [disabilityGdb, setDisabilityGdb] = useState("50");
  const [isBereaved, setIsBereaved] = useState(false);

  // UI States
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [isFocused, setIsFocused] = useState("");

  // Mapping of major German cities and their PLZ ranges
  const MAJOR_CITY_PLZ_RANGES = [
    { stadt: "Berlin", min: 10115, max: 14199, exclude: [14467, 14469, 14471, 14473, 14476, 14478, 14480, 14482] },
    { stadt: "Hamburg", min: 20095, max: 22769 },
    { stadt: "München", min: 80331, max: 81929 },
    { stadt: "Köln", min: 50667, max: 51149 },
    { stadt: "Frankfurt", min: 60311, max: 65936 },
    { stadt: "Stuttgart", min: 70173, max: 70629 },
    { stadt: "Düsseldorf", min: 40210, max: 40629 },
    { stadt: "Leipzig", min: 4103, max: 4357 },
    { stadt: "Dortmund", min: 44135, max: 44388 },
    { stadt: "Essen", min: 45127, max: 45359 },
    { stadt: "Bremen", min: 28195, max: 28779 },
    { stadt: "Dresden", min: 1067, max: 1328 },
    { stadt: "Hannover", min: 30159, max: 30659 },
    { stadt: "Nürnberg", min: 90402, max: 90491 },
    { stadt: "Duisburg", min: 47051, max: 47279 },
    { stadt: "Bochum", min: 44787, max: 44894 },
    { stadt: "Wuppertal", min: 42103, max: 42399 },
    { stadt: "Bielefeld", min: 33602, max: 33739 },
    { stadt: "Bonn", min: 53111, max: 53229 },
    { stadt: "Münster", min: 48143, max: 48167 },
    { stadt: "Mannheim", min: 68159, max: 68309 },
    { stadt: "Karlsruhe", min: 76131, max: 76229 },
    { stadt: "Augsburg", min: 86150, max: 86199 },
    { stadt: "Wiesbaden", min: 65183, max: 65207 },
    { stadt: "Gelsenkirchen", min: 45879, max: 45899 },
    { stadt: "Mönchengladbach", min: 41061, max: 41239 },
    { stadt: "Braunschweig", min: 38100, max: 38126 },
    { stadt: "Chemnitz", min: 9111, max: 9247 },
    { stadt: "Kiel", min: 24103, max: 24159 },
    { stadt: "Aachen", min: 52062, max: 52080 },
    { stadt: "Halle", min: 6108, max: 6132 },
    { stadt: "Magdeburg", min: 39104, max: 39130 },
    { stadt: "Freiburg", min: 79098, max: 79117 },
    { stadt: "Krefeld", min: 47798, max: 47839 },
    { stadt: "Lübeck", min: 23552, max: 23570 },
    { stadt: "Oberhausen", min: 46045, max: 46149 },
    { stadt: "Erfurt", min: 99084, max: 99099 },
    { stadt: "Mainz", min: 55116, max: 55131 },
    { stadt: "Rostock", min: 18055, max: 18147 },
    { stadt: "Kassel", min: 34117, max: 34134 }
  ];

  // Listen for hero micro-commitment selector pre-select event
  useEffect(() => {
    const handler = (e) => {
      const p = e.detail?.persons;
      if (!p) return;
      // Map "4" (5+) to value "4" which is the select option
      setPersons(p);
      // Jump to step 2 (Haushalt & Wohnen) where persons is shown
      setStep(2);
      // Small delay so the scroll lands after React re-renders
      setTimeout(() => {
        const calc = document.getElementById('calculator');
        if (calc) calc.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 150);
    };
    document.addEventListener('amtly:preselect', handler);
    return () => document.removeEventListener('amtly:preselect', handler);
  }, []);

  // Filter cities on input - PLZ ONLY
  useEffect(() => {
    const isSearchingPLZ = /^\d+$/.test(cityInput.trim());

    if (cityInput.length >= 2 && isSearchingPLZ && !selectedCity) {
      const inputStr = cityInput.trim();
      let filtered = wohngeldData.filter(
        (c) => c.plz.startsWith(inputStr)
      );

      if (inputStr.length === 5 && filtered.length === 0) {
        const num = parseInt(inputStr, 10);
        const cityMatch = MAJOR_CITY_PLZ_RANGES.find(p =>
          num >= p.min && num <= p.max && (!p.exclude || !p.exclude.includes(num))
        );

        if (cityMatch) {
          const baseCity = wohngeldData.find(c => c.stadt.includes(cityMatch.stadt));
          if (baseCity) {
            filtered = [{ ...baseCity, plz: inputStr }];
          }
        }
      } else if (inputStr.length < 5) {
        const numLow = parseInt(inputStr.padEnd(5, '0'), 10);
        const numHigh = parseInt(inputStr.padEnd(5, '9'), 10);

        for (const p of MAJOR_CITY_PLZ_RANGES) {
          if (Math.max(numLow, p.min) <= Math.min(numHigh, p.max)) {
            const baseCity = wohngeldData.find(c => c.stadt.includes(p.stadt));
            if (baseCity && !filtered.find(c => c.stadt.includes(p.stadt))) {
              filtered.push({ ...baseCity, plz: inputStr + "..." });
            }
          }
        }
      }

      setSuggestions(filtered.slice(0, 10));
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
  };

  const clearCity = () => {
    setCityInput("");
    setSelectedCity(null);
  };

  // Validation function per step
  const isStepValid = (stepNum) => {
    if (stepNum === 1) {
      return selectedCity !== null && status !== "" && age !== "";
    }
    if (stepNum === 2) {
      if (housingType === "Miete") {
        return rent !== "" && parseFloat(rent) >= 0;
      }
      return true; // Eigentum fields are optional
    }
    if (stepNum === 3) {
      const count = parseInt(kids) || 0;
      if (count > 0) {
        const agesFilled = kidsAgesList.length === count && kidsAgesList.every(a => a !== "");
        if (!agesFilled) return false;
        return kidsAgesList.every((a, idx) => {
          const ageVal = parseInt(a, 10);
          if (ageVal >= 1 && ageVal <= 3) {
            const by = kidsBirthYears[idx];
            return by !== undefined && by !== "";
          }
          return true;
        });
      }
      return true;
    }
    if (stepNum === 4) {
      return income !== "" && parseFloat(income) >= 0 && netIncome !== "" && parseFloat(netIncome) >= 0;
    }
    return false;
  };

  const handleKidsCountChange = (countStr) => {
    setKids(countStr);
    const count = parseInt(countStr) || 0;
    setKidsAgesList(prev => {
      const newList = [...prev];
      if (newList.length < count) {
        while (newList.length < count) newList.push("");
      } else if (newList.length > count) {
        newList.length = count;
      }
      return newList;
    });
  };

  const handleNextStep = () => {
    if (isStepValid(step)) {
      setStep(prev => Math.min(prev + 1, 4));
    }
  };

  const handlePrevStep = () => {
    setStep(prev => Math.max(prev - 1, 1));
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (step < 4) {
        handleNextStep();
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isStepValid(4)) return;

    setIsLoading(true);
    setLoadingMessage("");

    // Build profileInput for local evaluation and fallback reference
    const parsedAges = kidsAgesList.map(a => a !== "" ? parseInt(a, 10) : 0);
    const birthYearsArray = parsedAges.map((childAge, idx) => {
      if (childAge >= 1 && childAge <= 3) {
        return kidsBirthYears[idx] || 0;
      }
      return 0;
    });

    const profileInput = {
      age: parseInt(age) || 30,
      plz: selectedCity ? selectedCity.plz : "",
      selectedCity: selectedCity,
      status: status,
      isKurzarbeit: isKurzarbeit,
      schoolType: schoolType,
      livesWithParents: livesWithParents,
      parentIncomeBracket: parentIncomeBracket,
      bafoegSelfInsured: bafoegSelfInsured,
      grundrenteYears: grundrenteYears,
      persons: parseInt(persons) || 1,
      housingType: housingType,
      rent: parseFloat(rent) || 0,
      heating: parseFloat(heatingCost) || 0,
      interest: parseFloat(interest) || 0,
      operatingCosts: parseFloat(operatingCosts) || 0,
      propertyTax: parseFloat(propertyTax) || 0,
      housingArea: parseFloat(housingArea) || 0,
      hasCareDependent: hasCareDependent,
      careDependentGrad: careDependentGrad,
      careOrganization: careOrganization,
      kids: parseInt(kids) || 0,
      kidsAges: parsedAges,
      kidsBirthYears: birthYearsArray,
      isSingleParent: isSingleParent,
      childSupportReceived: childSupportReceived,
      childOwnIncome: parseFloat(childOwnIncome) || 0,
      isPregnantOrNewborn: isPregnantOrNewborn,
      netIncomeBeforeBirth: parseFloat(netIncomeBeforeBirth) || 0,
      elterngeldOption: elterngeldOption,
      income: parseFloat(income) || 0,
      expenses: parseFloat(expenses) || (status === 'employee' ? 102 : 0),
      maintenance: parseFloat(maintenance) || 0,
      hasHighAssets: hasHighAssets,
      hasDisability: hasDisability,
      disabilityGdb: parseFloat(disabilityGdb) || 0,
      isBereaved: isBereaved
    };

    // Construct Payload for Python Backend API
    const isOwner = housingType === "Eigentum";
    const rentCold = isOwner ? (parseFloat(interest) || 0) : (parseFloat(rent) || 0);
    const rentUtility = isOwner ? ((parseFloat(operatingCosts) || 0) + (parseFloat(propertyTax) || 0)) : 0;
    const rentHeating = isOwner ? 0 : (parseFloat(heatingCost) || 0);

    const mainIncomeBrutto = parseFloat(income) || 0;
    const mainIncomeNetto = parseFloat(netIncome) || 0;

    const members = [
      {
        role: "main",
        age: parseInt(age) || 30,
        is_single_parent: isSingleParent,
        incomes: (mainIncomeBrutto > 0 || mainIncomeNetto > 0) ? [
          { amount_brutto: mainIncomeBrutto, amount_net: mainIncomeNetto }
        ] : []
      }
    ];

    const parsedPersons = parseInt(persons) || 1;
    const parsedKids = parseInt(kids) || 0;

    // Partner (uses applicant age as dynamic fallback instead of hardcoded 35)
    if (parsedPersons > 1 && (parsedPersons - parsedKids) > 1) {
      members.push({
        role: "partner",
        age: parseInt(age) || 35,
        is_single_parent: false,
        incomes: []
      });
    }

    // Children
    kidsAgesList.forEach((kidAge, idx) => {
      const childIncomeAmount = idx === 0 && childOwnIncome ? parseFloat(childOwnIncome) || 0 : 0;
      members.push({
        role: "child",
        age: parseInt(kidAge) || 0,
        is_single_parent: false,
        incomes: childIncomeAmount > 0 ? [
          { amount_brutto: childIncomeAmount, amount_net: childIncomeAmount }
        ] : []
      });
    });

    const payload = {
      rent_cold: rentCold,
      rent_utility: rentUtility,
      rent_heating: rentHeating,
      termination_reason: terminationReason,
      members: members
    };

    // Timers for cold start message and API Timeout
    const loadingTimer = setTimeout(() => {
      setLoadingMessage("Die Live-Berechnung läuft... Hinweis: Beim ersten Aufruf kann der Serverstart (Render.com Cold Start) bis zu 30 Sekunden dauern.");
    }, 3000);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      const isLocal = window.location.hostname.includes('localhost') || window.location.hostname === '127.0.0.1';
      const apiUrl = isLocal
        ? 'http://localhost:8000/api/v4/analyze'
        : 'https://sozialer-navigator-api.onrender.com/api/v4/analyze';

      console.log("Fetching calculation from backend API:", apiUrl, payload);
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(loadingTimer);
      clearTimeout(timeoutId);
      setLoadingMessage("");

      if (!response.ok) {
        throw new Error(`API returned status ${response.status}`);
      }

      const data = await response.json();
      console.log("Calculation success from API:", data);

      const bgRes = (data.results || []).find(r => r.type === "SGB2");
      const wgRes = (data.results || []).find(r => r.type === "WOHNGELD");

      let primaryType = "Wohngeld";
      let primaryAmount = 0;
      let primaryEligible = false;

      if (bgRes && bgRes.amount > 0) {
        primaryType = "Bürgergeld";
        primaryAmount = bgRes.amount;
        primaryEligible = true;
      } else if (wgRes && wgRes.amount > 0) {
        primaryType = "Wohngeld";
        primaryAmount = wgRes.amount;
        primaryEligible = true;
      } else {
        primaryType = "Kein Anspruch";
        primaryAmount = 0;
        primaryEligible = false;
      }

      const mappedResults = (data.results || []).map(r => {
        let id = "unknown";
        if (r.type === "SGB2") id = "buergergeld";
        if (r.type === "WOHNGELD") id = "wohngeld";
        if (r.type === "ALERT") id = "sperrzeit_alert";

        return {
          id: id,
          title: r.title,
          amount: r.amount,
          eligible: r.amount > 0 || r.type === "ALERT" ? "probable" : "none",
          description: r.text,
          details: r
        };
      });

      if (isOwner && wgRes) {
        mappedResults.push({
          id: "lastenzuschuss",
          title: "Lastenzuschuss (Wohngeld)",
          amount: wgRes.amount,
          eligible: wgRes.amount > 0 ? "probable" : "none",
          description: wgRes.text,
          details: wgRes
        });
      }

      const resultDetail = {
        results: mappedResults,
        opportunities: data.opportunities || [],
        input: profileInput,
        eligible: primaryEligible,
        amount: primaryAmount,
        type: primaryType,
        details: {},
        isOfflineResult: false
      };

      const event = new CustomEvent("benefit-calculation-completed", {
        detail: resultDetail
      });
      window.dispatchEvent(event);

      if (window.showView) {
        window.showView("results");
      }

    } catch (err) {
      console.warn("API request failed or timed out. Falling back to local benefit engine:", err);
      clearTimeout(loadingTimer);
      clearTimeout(timeoutId);
      setLoadingMessage("");

      // Run local client-side evaluation
      const allResults = evaluateAllBenefits(profileInput);

      const wgResult = allResults.find(r => r.id === "wohngeld");
      const lzResult = allResults.find(r => r.id === "lastenzuschuss");
      const bgResult = allResults.find(r => r.id === "buergergeld");
      const gaResult = allResults.find(r => r.id === "grundsicherung_alter");
      const bafoegResult = allResults.find(r => r.id === "bafoeg");

      let primaryResult = wgResult;
      if (lzResult && lzResult.eligible === "probable" && lzResult.amount > (primaryResult?.amount || 0)) {
        primaryResult = lzResult;
      }
      if (bgResult && bgResult.eligible === "probable" && bgResult.amount > (primaryResult?.amount || 0)) {
        primaryResult = bgResult;
      }
      if (gaResult && gaResult.eligible === "probable" && gaResult.amount > (primaryResult?.amount || 0)) {
        primaryResult = gaResult;
      }
      if (bafoegResult && bafoegResult.eligible === "probable" && bafoegResult.amount > (primaryResult?.amount || 0)) {
        primaryResult = bafoegResult;
      }

      if (!primaryResult || primaryResult.eligible === "none") {
        const eligibleOthers = allResults.filter(r => r.eligible !== "none" && r.amount > 0);
        if (eligibleOthers.length > 0) {
          primaryResult = eligibleOthers.sort((a, b) => b.amount - a.amount)[0];
        } else {
          primaryResult = wgResult || bgResult;
        }
      }

      const resultDetail = {
        results: allResults,
        opportunities: [], // No live opportunities in offline mode
        input: profileInput,
        eligible: primaryResult ? primaryResult.eligible !== "none" : false,
        amount: primaryResult ? primaryResult.amount : 0,
        type: primaryResult ? primaryResult.type : "Kein Anspruch",
        details: primaryResult ? primaryResult.details : {},
        isOfflineResult: true
      };

      const event = new CustomEvent("benefit-calculation-completed", {
        detail: resultDetail
      });
      window.dispatchEvent(event);

      if (window.showView) {
        window.showView("results");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Styles definition
  const iconClass = "text-slate-400";
  const inputDarkClass = "bg-slate-900 border-slate-800 text-white placeholder:text-slate-500 focus:ring-teal-500/50 focus:border-teal-500/50";
  const labelDarkClass = "text-slate-300";

  const inputClass = "w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-4 text-slate-900 placeholder:text-slate-400 transition-all outline-none focus:bg-white focus:border-teal-600 focus:ring-4 focus:ring-teal-600/10 hover:border-slate-300 font-medium";
  const labelClass = "block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 ml-1";
  const buttonClass = "w-full bg-teal-600 hover:bg-teal-700 text-white font-sans font-bold py-5 rounded-xl shadow-lg shadow-teal-600/20 hover:-translate-y-0.5 active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-base tracking-wide border-none cursor-pointer";
  const secondaryBtnClass = "px-6 py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-all flex items-center justify-center gap-2 border-none cursor-pointer";

  return (
    <div className={cn("rounded-3xl transition-colors bg-transparent", className)}>
      
      {/* 4-STEP WIZARD PROGRESS BAR */}
      <div className="flex items-center justify-between mb-8 select-none">
        {[1, 2, 3, 4].map((s) => (
          <React.Fragment key={s}>
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-colors border-2",
                  step === s
                    ? "bg-teal-600 border-teal-600 text-white shadow-lg shadow-teal-600/20"
                    : step > s
                    ? "bg-teal-600 border-teal-600 text-white"
                    : isDark
                    ? "bg-slate-900 border-slate-800 text-slate-500"
                    : "bg-slate-50 border-slate-200 text-slate-400"
                )}
              >
                {step > s ? "✓" : s}
              </div>
              <span
                className={cn(
                  "hidden lg:inline text-xs font-bold uppercase tracking-wider transition-colors",
                  step === s
                    ? (isDark ? "text-white" : "text-slate-800")
                    : "text-slate-400"
                )}
              >
                {s === 1 && "Basis & Status"}
                {s === 2 && "Haushalt & Wohnen"}
                {s === 3 && "Familie & Kinder"}
                {s === 4 && "Einkommen & Vermögen"}
              </span>
            </div>
            {s < 4 && (
              <div
                className={cn(
                  "flex-1 h-0.5 mx-2 md:mx-4 transition-colors",
                  step > s
                    ? "bg-teal-600"
                    : isDark
                    ? "bg-slate-800"
                    : "bg-slate-100"
                )}
              />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Dünner horizontaler Fortschrittsbalken */}
      <div className={cn("w-full h-1 bg-slate-100 rounded-full mb-8 overflow-hidden", isDark && "bg-slate-800")}>
        <div 
          className="h-full bg-teal-600 transition-all duration-300 ease-out" 
          style={{ width: `${step * 25}%` }}
        />
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* STEP 1: BASIS & STATUS */}
        {step === 1 && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Age */}
              <div className="space-y-2 text-left">
                <label className={cn(labelClass, isDark && labelDarkClass)}>Alter (Jahre)</label>
                <input
                  type="number"
                  placeholder="z.B. 32"
                  className={cn(inputClass, isDark && inputDarkClass)}
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  onKeyDown={handleKeyDown}
                />
              </div>

              {/* Status */}
              <div className="space-y-2 text-left">
                <label className={cn(labelClass, isDark && labelDarkClass)}>Beschäftigungsstatus</label>
                <div className="relative">
                  <select
                    className={cn(inputClass, "appearance-none cursor-pointer font-medium", isDark && inputDarkClass)}
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                  >
                    <option value="employee">Angestellt / Arbeitnehmer</option>
                    <option value="self_employed">Selbstständig</option>
                    <option value="unemployed_sgb2">Arbeitslos (Bürgergeld-Bezug)</option>
                    <option value="unemployed_sgb3">Arbeitslos (ALG I Bezug)</option>
                    <option value="seeking_work">Arbeitssuchend / Ohne Bezüge</option>
                    <option value="student">Student(in)</option>
                    <option value="trainee">Auszubildende(r) / Schüler</option>
                    <option value="pensioner">Rentner / Pensionär</option>
                    <option value="asylum_seeker">Asylbewerber(in)</option>
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Conditional Sub-questions based on Status */}
            {status === "employee" && (
              <div className={cn("flex items-center gap-3 p-4 rounded-2xl border transition-colors", isDark ? "bg-slate-900/50 border-slate-800" : "bg-slate-50/50 border-slate-100")}>
                <input
                  type="checkbox"
                  id="kurzarbeit"
                  className="w-5 h-5 rounded-lg border-2 border-slate-200 text-teal-600 focus:ring-teal-500 cursor-pointer"
                  checked={isKurzarbeit}
                  onChange={(e) => setIsKurzarbeit(e.target.checked)}
                />
                <label htmlFor="kurzarbeit" className={cn("text-sm font-semibold cursor-pointer select-none", isDark ? "text-slate-300" : "text-slate-700")}>
                  Befinden Sie sich aktuell in Kurzarbeit? <InfoTooltip text="für Kurzarbeitergeld" />
                </label>
              </div>
            )}

            {["employee", "unemployed_sgb2", "unemployed_sgb3", "seeking_work"].includes(status) && (
              <div className="space-y-2 text-left animate-in slide-in-from-top-2 duration-300">
                <label className={cn(labelClass, isDark && labelDarkClass)}>Beendigung des Arbeitsverhältnisses</label>
                <div className="relative">
                  <select
                    className={cn(inputClass, "appearance-none cursor-pointer font-medium", isDark && inputDarkClass)}
                    value={terminationReason}
                    onChange={(e) => setTerminationReason(e.target.value)}
                  >
                    <option value="none">Keine Beendigung droht / Kündigung durch Arbeitgeber</option>
                    <option value="self_termination">Eigenkündigung (Selbst gekündigt)</option>
                    <option value="mutual_agreement">Aufhebungsvertrag unterschrieben</option>
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
              </div>
            )}

            {(status === "student" || status === "trainee") && (
              <div className="p-5 border border-teal-600/20 bg-teal-50/10 rounded-2xl space-y-4 text-left animate-in slide-in-from-top-2 duration-300">
                <h4 className="text-sm font-bold text-teal-600 uppercase tracking-wider">Studien- & Ausbildungsdetails</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={cn(labelClass, isDark && labelDarkClass)}>Schul- / Hochschulart</label>
                    <div className="relative">
                      <select
                        className={cn(inputClass, "appearance-none cursor-pointer", isDark && inputDarkClass)}
                        value={schoolType}
                        onChange={(e) => setSchoolType(e.target.value)}
                      >
                        <option value="Universität">Universität / Fachhochschule</option>
                        <option value="Berufsfachschule">Berufsfachschule</option>
                        <option value="Abendgymnasium">Abendgymnasium</option>
                        <option value="Sonstige">Sonstige</option>
                      </select>
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>
                  </div>
                  <div>
                    <label className={cn(labelClass, isDark && labelDarkClass)}>Elterneinkommen (Schätzung)</label>
                    <div className="relative">
                      <select
                        className={cn(inputClass, "appearance-none cursor-pointer", isDark && inputDarkClass)}
                        value={parentIncomeBracket}
                        onChange={(e) => setParentIncomeBracket(e.target.value)}
                      >
                        <option value="low">Gering (z.B. Bürgergeld/Rente)</option>
                        <option value="normal">Normal (Mittelschicht)</option>
                        <option value="high">Sehr hoch (Gutverdienend)</option>
                      </select>
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-2.5 mt-3">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="lives-parents"
                      className="w-5 h-5 rounded-lg border-2 border-slate-200 text-teal-600 focus:ring-teal-500 cursor-pointer"
                      checked={livesWithParents}
                      onChange={(e) => setLivesWithParents(e.target.checked)}
                    />
                    <label htmlFor="lives-parents" className={cn("text-sm font-semibold cursor-pointer select-none", isDark ? "text-slate-300" : "text-slate-700")}>
                      Wohnen Sie bei Ihren Eltern im Haushalt?
                    </label>
                  </div>

                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="bafoeg-self-insured"
                      className="w-5 h-5 rounded-lg border-2 border-slate-200 text-teal-600 focus:ring-teal-500 cursor-pointer"
                      checked={bafoegSelfInsured}
                      onChange={(e) => setBafoegSelfInsured(e.target.checked)}
                    />
                    <label htmlFor="bafoeg-self-insured" className={cn("text-sm font-semibold cursor-pointer select-none", isDark ? "text-slate-300" : "text-slate-700")}>
                      Zahlen Sie eigene Beiträge für Kranken- und Pflegeversicherung (nicht familienversichert)?
                    </label>
                  </div>
                </div>
              </div>
            )}

            {status === "pensioner" && (
              <div className="p-5 border border-teal-600/20 bg-teal-50/10 rounded-2xl space-y-4 text-left animate-in slide-in-from-top-2 duration-300">
                <h4 className="text-sm font-bold text-teal-600 uppercase tracking-wider">Renten- & Beitragsdetails</h4>
                <div>
                  <label className={cn(labelClass, isDark && labelDarkClass)}>Grundrentenzeiten (Versicherungsjahre)</label>
                  <div className="relative">
                    <select
                      className={cn(inputClass, "appearance-none cursor-pointer", isDark && inputDarkClass)}
                      value={grundrenteYears}
                      onChange={(e) => setGrundrenteYears(e.target.value)}
                    >
                      <option value="unknown">Unbekannt / Weiß nicht genau</option>
                      <option value="under33">Weniger als 33 Jahre</option>
                      <option value="33-34">33 bis 34 Jahre</option>
                      <option value="35plus">35 Jahre oder mehr</option>
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-2">Dazu zählen auch Kindererziehungs- und Pflegezeiten.</p>
                </div>
              </div>
            )}

            {/* PLZ & City Search */}
            <div className="space-y-3 relative text-left">
              <label htmlFor="city-input" className={cn(labelClass, isDark && labelDarkClass)}>
                Wohnort (Postleitzahl)
              </label>
              <div className="relative group">
                <div className={cn("absolute left-4 top-1/2 -translate-y-1/2", iconClass)}>
                  <Search className="w-5 h-5" />
                </div>

                <input
                  type="text"
                  id="city-input"
                  inputMode="numeric"
                  maxLength={5}
                  placeholder="Ihre PLZ..."
                  className={cn(inputClass, "pl-12 pr-10 tracking-widest font-medium", isDark && inputDarkClass)}
                  autoComplete="off"
                  value={cityInput}
                  onFocus={() => setIsFocused("city")}
                  onBlur={() => setTimeout(() => setIsFocused(""), 200)}
                  onKeyDown={handleKeyDown}
                  onChange={(e) => {
                    const numericVal = e.target.value.replace(/\D/g, '');
                    setCityInput(numericVal);
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
                <div className={cn("absolute top-full left-0 right-0 border rounded-[1rem] shadow-2xl z-50 mt-2 max-h-72 overflow-y-auto overflow-x-hidden", isDark ? "bg-slate-900 border-slate-700" : "bg-white border-slate-200")}>
                  {suggestions.map((city) => (
                    <div
                      key={`${city.plz}-${city.stadt}`}
                      onClick={() => handleCitySelect(city)}
                      className={cn("px-5 py-3 cursor-pointer text-sm font-medium flex justify-between items-center border-b last:border-none transition-colors", isDark ? "hover:bg-slate-800 text-slate-300 border-slate-800" : "hover:bg-teal-50 text-slate-700 border-slate-50")}
                    >
                      <div className="flex items-center gap-3">
                        <span className={cn("font-bold text-lg", isDark ? "text-white" : "text-teal-600")}>{city.plz}</span>
                        <span className={isDark ? "text-slate-400 font-medium" : "text-slate-700 font-medium"}>{city.stadt}</span>
                      </div>
                      <span className={cn("text-[10px] px-2 py-1 rounded-md uppercase tracking-wider font-bold", isDark ? "bg-slate-800 text-teal-600" : "bg-teal-600/10 text-teal-600")}>Mietstufe {city.mietstufe}</span>
                    </div>
                  ))}
                </div>
              )}

              {selectedCity && (
                <div className={cn("rounded-2xl p-5 mt-4 flex items-center justify-between border-2 animate-in slide-in-from-top-2 duration-300", isDark ? "bg-teal-600/10 border-teal-600/20" : "bg-teal-50/50 border-teal-600/10")}>
                  <div>
                    <p className="text-[10px] font-bold text-teal-600 uppercase tracking-wider mb-1">Gewählter Wohnort</p>
                    <h4 className={cn("font-bold text-lg", isDark ? "text-white" : "text-slate-900")}>{selectedCity.plz} {selectedCity.stadt}</h4>
                  </div>
                  <div className={cn("px-4 py-2 rounded-xl shadow-sm text-xs font-bold text-teal-600 border transition-colors", isDark ? "bg-slate-900 border-teal-600/20" : "bg-white border-teal-600/10 hover:border-teal-600/30")}>
                    Mietstufe {selectedCity.mietstufe}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 2: HAUSHALT & WOHNEN */}
        {step === 2 && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Household size */}
              <div className="space-y-2 text-left">
                <label className={cn(labelClass, isDark && labelDarkClass)}>Personen im Haushalt</label>
                <div className="relative">
                  <select
                    className={cn(inputClass, "appearance-none cursor-pointer", isDark && inputDarkClass)}
                    value={persons}
                    onChange={(e) => setPersons(e.target.value)}
                  >
                    <option value="1">1 Person</option>
                    <option value="2">2 Personen</option>
                    <option value="3">3 Personen</option>
                    <option value="4">4+ Personen</option>
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Housing Type */}
              <div className="space-y-2 text-left">
                <label className={cn(labelClass, isDark && labelDarkClass)}>Wohnverhältnis</label>
                <div className="relative">
                  <select
                    className={cn(inputClass, "appearance-none cursor-pointer", isDark && inputDarkClass)}
                    value={housingType}
                    onChange={(e) => setHousingType(e.target.value)}
                  >
                    <option value="Miete">Miete (Mietwohnung / WG)</option>
                    <option value="Eigentum">Eigentum (Eigenheim / Wohnung)</option>
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Miete Inputs */}
            {housingType === "Miete" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left animate-in slide-in-from-top-2 duration-300">
                <div>
                  <label className={cn(labelClass, isDark && labelDarkClass)}>Bruttokaltmiete</label>
                  <div className="relative">
                    <input
                      type="number"
                      placeholder="z.B. 650"
                      className={cn(inputClass, isDark && inputDarkClass)}
                      value={rent}
                      onKeyDown={handleKeyDown}
                      onChange={(e) => setRent(e.target.value)}
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">€</span>
                  </div>
                </div>
                <div>
                  <label className={cn(labelClass, isDark && labelDarkClass)}>Heizkosten</label>
                  <div className="relative">
                    <input
                      type="number"
                      placeholder="z.B. 110"
                      className={cn(inputClass, isDark && inputDarkClass)}
                      value={heatingCost}
                      onKeyDown={handleKeyDown}
                      onChange={(e) => setHeatingCost(e.target.value)}
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">€</span>
                  </div>
                </div>
              </div>
            )}

            {/* Eigentum Inputs */}
            {housingType === "Eigentum" && (
              <div className="p-5 border border-teal-600/20 bg-teal-50/10 rounded-2xl space-y-4 text-left animate-in slide-in-from-top-2 duration-300">
                <h4 className="text-sm font-bold text-teal-600 uppercase tracking-wider">Eigenheim-Kosten (Optional)</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={cn(labelClass, isDark && labelDarkClass)}>Monatliche Zinsen</label>
                    <div className="relative">
                      <input
                        type="number"
                        placeholder="z.B. 250"
                        className={cn(inputClass, isDark && inputDarkClass)}
                        value={interest}
                        onKeyDown={handleKeyDown}
                        onChange={(e) => setInterest(e.target.value)}
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">€</span>
                    </div>
                  </div>
                  <div>
                    <label className={cn(labelClass, isDark && labelDarkClass)}>Nebenkosten (ohne Heizung)</label>
                    <div className="relative">
                      <input
                        type="number"
                        placeholder="z.B. 150"
                        className={cn(inputClass, isDark && inputDarkClass)}
                        value={operatingCosts}
                        onKeyDown={handleKeyDown}
                        onChange={(e) => setOperatingCosts(e.target.value)}
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">€</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={cn(labelClass, isDark && labelDarkClass)}>Grundsteuer (Monatlich)</label>
                    <div className="relative">
                      <input
                        type="number"
                        placeholder="z.B. 25"
                        className={cn(inputClass, isDark && inputDarkClass)}
                        value={propertyTax}
                        onKeyDown={handleKeyDown}
                        onChange={(e) => setPropertyTax(e.target.value)}
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">€</span>
                    </div>
                  </div>
                  <div>
                    <label className={cn(labelClass, isDark && labelDarkClass)}>Wohnfläche (qm)</label>
                    <div className="relative">
                      <input
                        type="number"
                        placeholder="z.B. 85"
                        className={cn(inputClass, isDark && inputDarkClass)}
                        value={housingArea}
                        onKeyDown={handleKeyDown}
                        onChange={(e) => setHousingArea(e.target.value)}
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">qm</span>
                    </div>
                  </div>
                </div>
              </div>
            )}


          </div>
        )}

        {/* STEP 3: FAMILIE & KINDER */}
        {step === 3 && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="space-y-2 text-left">
              <label className={cn(labelClass, isDark && labelDarkClass)}>Anzahl Kinder im Haushalt</label>
              <div className="relative">
                <select
                  className={cn(inputClass, "appearance-none cursor-pointer", isDark && inputDarkClass)}
                  value={kids}
                  onChange={(e) => handleKidsCountChange(e.target.value)}
                >
                  <option value="0">Keine Kinder</option>
                  <option value="1">1 Kind</option>
                  <option value="2">2 Kinder</option>
                  <option value="3">3+ Kinder</option>
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {parseInt(kids) > 0 && (
              <div className="p-5 border border-teal-600/20 bg-teal-50/10 rounded-2xl space-y-4 text-left animate-in slide-in-from-top-2 duration-300">
                <h4 className="text-sm font-bold text-teal-600 uppercase tracking-wider">Kinder-Details</h4>
                
                <div className="space-y-4">
                  {kidsAgesList.map((ageVal, idx) => {
                    const isU3 = ageVal !== "" && parseInt(ageVal, 10) >= 1 && parseInt(ageVal, 10) <= 3;
                    return (
                      <div key={idx} className="flex flex-col sm:flex-row gap-4 items-end p-4 rounded-xl bg-slate-500/5 border border-slate-200/10">
                        <div className="flex-1 space-y-2 text-left">
                          <label className={cn(labelClass, isDark && labelDarkClass)}>Alter von Kind {idx + 1}</label>
                          <div className="relative">
                            <select
                              className={cn(inputClass, "appearance-none cursor-pointer font-medium", isDark && inputDarkClass)}
                              value={ageVal}
                              onChange={(e) => {
                                const val = e.target.value;
                                setKidsAgesList(prev => {
                                  const next = [...prev];
                                  next[idx] = val;
                                  return next;
                                });
                                if (val === "" || parseInt(val, 10) < 1 || parseInt(val, 10) > 3) {
                                  setKidsBirthYears(prev => {
                                    const next = { ...prev };
                                    delete next[idx];
                                    return next;
                                  });
                                }
                              }}
                            >
                              <option value="">Bitte auswählen</option>
                              {Array.from({ length: 18 }).map((_, a) => (
                                <option key={a} value={a}>{a} {a === 1 ? "Jahr" : "Jahre"}</option>
                              ))}
                            </select>
                            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                          </div>
                        </div>

                        {isU3 && (
                          <div className="flex-1 space-y-2 text-left animate-in fade-in duration-300">
                            <label className={cn(labelClass, isDark && labelDarkClass)}>Geburtsjahr (Bayern)</label>
                            <div className="relative">
                              <select
                                className={cn(inputClass, "appearance-none cursor-pointer font-medium", isDark && inputDarkClass)}
                                value={kidsBirthYears[idx] || ""}
                                onChange={(e) => {
                                  const val = e.target.value ? parseInt(e.target.value) : "";
                                  setKidsBirthYears(prev => ({
                                    ...prev,
                                    [idx]: val
                                  }));
                                }}
                              >
                                <option value="">Bitte auswählen</option>
                                <option value="2026">2026</option>
                                <option value="2025">2025</option>
                                <option value="2024">2024 (oder früher)</option>
                                <option value="2023">2023</option>
                                <option value="2022">2022</option>
                              </select>
                              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                <p className="text-[10px] text-slate-400 mt-2">Wichtig für Bayerisches Familiengeld (1-3 Jahre) und Unterhaltsvorschuss.</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={cn(labelClass, isDark && labelDarkClass)}>Einkommen der Kinder (z.B. Unterhalt, Waisenrente)</label>
                <div className="relative">
                  <input
                    type="number"
                    placeholder="z.B. 250"
                    className={cn(inputClass, isDark && inputDarkClass)}
                    value={childOwnIncome}
                    onKeyDown={handleKeyDown}
                    onChange={(e) => setChildOwnIncome(e.target.value)}
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">€</span>
                </div>
              </div>

                  <div className="flex flex-col justify-end">
                    <div className="flex items-center gap-3 h-14">
                      <input
                        type="checkbox"
                        id="single-parent"
                        className="w-5 h-5 rounded-lg border-2 border-slate-200 text-teal-600 focus:ring-teal-500 cursor-pointer"
                        checked={isSingleParent}
                        onChange={(e) => setIsSingleParent(e.target.checked)}
                      />
                      <label htmlFor="single-parent" className={cn("text-sm font-semibold cursor-pointer select-none", isDark ? "text-slate-300" : "text-slate-700")}>
                        Alleinerziehend?
                      </label>
                    </div>
                  </div>
                </div>

                {isSingleParent && (
                  <div className="pt-4 border-t border-slate-100/10 animate-in slide-in-from-top-2 duration-300">
                    <label className={cn(labelClass, isDark && labelDarkClass)}>Unterhalts-Status des anderen Elternteils</label>
                    <div className="relative">
                      <select
                        className={cn(inputClass, "appearance-none cursor-pointer", isDark && inputDarkClass)}
                        value={childSupportReceived}
                        onChange={(e) => setChildSupportReceived(e.target.value)}
                      >
                        <option value="none">Zahlt gar keinen Unterhalt (oder unregelmäßig)</option>
                        <option value="low">Zahlt Unterhalt, aber unter dem Mindestunterhalt</option>
                        <option value="full">Zahlt vollen Unterhalt</option>
                      </select>
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Pregnancy Checkbox */}
            <div className={cn("p-5 border rounded-2xl space-y-4 text-left transition-colors", isDark ? "bg-slate-900/40 border-slate-800" : "bg-slate-50/50 border-slate-100")}>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="pregnant-newborn"
                  className="w-5 h-5 rounded-lg border-2 border-slate-200 text-teal-600 focus:ring-teal-500 cursor-pointer"
                  checked={isPregnantOrNewborn}
                  onChange={(e) => setIsPregnantOrNewborn(e.target.checked)}
                />
                <label htmlFor="pregnant-newborn" className={cn("text-sm font-semibold cursor-pointer select-none", isDark ? "text-slate-300" : "text-slate-700")}>
                  Schwangerschaft oder Kind unter 14 Monate alt? <InfoTooltip text="für Elterngeld" />
                </label>
              </div>

              {isPregnantOrNewborn && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-100/10 animate-in slide-in-from-top-2 duration-300">
                  <div>
                    <label className={cn(labelClass, isDark && labelDarkClass)}>Nettoeinkommen vor Geburt</label>
                    <div className="relative">
                      <input
                        type="number"
                        placeholder="z.B. 1900"
                        className={cn(inputClass, isDark && inputDarkClass)}
                        value={netIncomeBeforeBirth}
                        onKeyDown={handleKeyDown}
                        onChange={(e) => setNetIncomeBeforeBirth(e.target.value)}
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">€</span>
                    </div>
                  </div>
                  <div>
                    <label className={cn(labelClass, isDark && labelDarkClass)}>Gewünschte Variante</label>
                    <div className="relative">
                      <select
                        className={cn(inputClass, "appearance-none cursor-pointer", isDark && inputDarkClass)}
                        value={elterngeldOption}
                        onChange={(e) => setElterngeldOption(e.target.value)}
                      >
                        <option value="basis">Basiselterngeld (12-14 Mon.)</option>
                        <option value="plus">Elterngeld Plus (24-28 Mon.)</option>
                      </select>
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 4: EINKOMMEN & VERMÖGEN */}
        {step === 4 && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Brutto Income */}
              <div className="text-left">
                <label className={cn(labelClass, isDark && labelDarkClass)}>Monatliches Brutto-Einkommen (Haushalt)</label>
                <div className="relative">
                  <input
                    type="number"
                    value={income}
                    onChange={(e) => setIncome(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className={cn(inputClass, "text-lg font-semibold", isDark && inputDarkClass)}
                    placeholder="z.B. 2500"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">€</span>
                </div>
              </div>

              {/* Net Income */}
              <div className="text-left animate-in fade-in duration-300">
                <label className={cn(labelClass, isDark && labelDarkClass)}>Monatliches Netto-Einkommen (Haushalt)</label>
                <div className="relative">
                  <input
                    type="number"
                    value={netIncome}
                    onChange={(e) => setNetIncome(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className={cn(inputClass, "text-lg font-semibold", isDark && inputDarkClass)}
                    placeholder="z.B. 1800"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">€</span>
                </div>
              </div>
            </div>
            <p className="text-[10px] text-slate-400 text-left">Geben Sie das gesamte Einkommen aller Haushaltsmitglieder ein. Freibeträge werden automatisch berechnet.</p>
          </div>
        )}

        {/* CONTROLS AREA */}
        <div className="flex items-center gap-4 pt-4 border-t border-slate-100 mt-6">
          {step > 1 && (
            <button
              type="button"
              onClick={handlePrevStep}
              className={cn(secondaryBtnClass)}
              disabled={isLoading}
            >
              <ArrowLeft className="w-4 h-4" /> Zurück
            </button>
          )}

          {step < 4 ? (
            <button
              type="button"
              onClick={handleNextStep}
              disabled={!isStepValid(step)}
              className={cn(buttonClass, "flex-1 disabled:opacity-50 disabled:cursor-not-allowed")}
            >
              Weiter <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!isStepValid(4) || isLoading}
              className={cn(buttonClass, "flex-1 disabled:opacity-50 disabled:cursor-not-allowed shadow-teal-500/20")}
            >
              {isLoading ? "Wird berechnet..." : "Ansprüche prüfen & Ergebnisse anzeigen"}
            </button>
          )}
        </div>

        {step === 4 && (
          <div className="space-y-2 mt-2">
            <p className="text-center text-[11px] text-slate-400">
              Dauert nur 1 Sekunde – alle Berechnungen laufen lokal in deinem Browser.
            </p>
            {loadingMessage && (
              <p className="text-center text-xs text-amber-600 dark:text-amber-400 font-semibold animate-pulse max-w-md mx-auto leading-relaxed">
                {loadingMessage}
              </p>
            )}
          </div>
        )}

      </form>
    </div>
  );
}
