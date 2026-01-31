
// import { createClient } from '@supabase/supabase-js';

// Centralized configuration - hardcoded for now to avoid build issues
const SUPABASE_URL = 'https://iiimjuplyjqapvwhbozf.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlpaW1qdXBseWpxYXB2d2hib3pmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU2NTI4MTgsImV4cCI6MjA4MTIyODgxOH0.Ru-09I4PuFQsJC-AMcdntn9bCS2f9lOdGQoMo7fAHYs';
// const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const RENT_LIMITS = {
    1: [359, 436, 519, 606, 691],
    2: [403, 490, 584, 683, 789],
    3: [448, 546, 651, 762, 888],
    4: [500, 609, 725, 890, 1034],
    5: [553, 671, 808, 986, 1158],
    6: [606, 739, 880, 1086, 1269],
    7: [666, 806, 974, 1199, 1394]
};

export function initializeCalculator(config) {

    const { cityData } = config;

    // Sort city data once
    const CITY_DB = cityData.map(c => ({
        name: c.stadt,
        mietstufe: c.mietstufe,
        amt_name: c.amt_name,
        amt_adresse: c.amt_adresse,
        amt_email: c.amt_email,
        slug: c.slug || c.stadt.toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss').replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    })).sort((a, b) => a.name.localeCompare(b.name));

    let ratioChartInstance = null;
    let viewHistory = [];

    // --- RENDER ICONS ---
    if (window.lucide) {
        window.lucide.createIcons();
    }

    // --- COOKIE LOGIC ---
    const cookieBanner = document.getElementById('cookie-banner');
    if (cookieBanner && !localStorage.getItem('sn_cookies_accepted')) {
        cookieBanner.classList.remove('hidden');
        setTimeout(() => cookieBanner.classList.remove('translate-y-full'), 1000);
    }
    window.acceptCookies = () => {
        localStorage.setItem('sn_cookies_accepted', 'true');
        if (cookieBanner) cookieBanner.classList.add('translate-y-full');
    };
    window.declineCookies = () => {
        localStorage.setItem('sn_cookies_accepted', 'false');
        if (cookieBanner) cookieBanner.classList.add('translate-y-full');
    };

    // --- UI HELPER FUNCTIONS ---
    window.showToast = (msg) => {
        const toast = document.getElementById('notification-toast');
        const msgEl = document.getElementById('toast-message');
        if (toast && msgEl) {
            msgEl.innerText = msg;
            toast.style.display = 'flex';
            setTimeout(() => { toast.style.display = 'none'; }, 3500);
        }
    };

    window.scrollToId = (id) => {
        const el = document.getElementById(id);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
    };

    window.showView = (viewId, pushHistory = true) => {
        if (pushHistory) {
            const current = document.querySelector('.view-section.active');
            if (current && current.id !== 'view-' + viewId) {
                viewHistory.push(current.id.replace('view-', ''));
            }
        }
        document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active'));
        const target = document.getElementById('view-' + viewId);
        if (target) {
            target.classList.add('active');
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
        if (viewId === 'hub-wohngeld') populateHubList('wohngeld');
        if (viewId === 'hub-buergergeld') populateHubList('buergergeld');
        if (window.lucide) window.lucide.createIcons();
    };

    window.goBack = () => {
        const prev = viewHistory.pop();
        if (prev) showView(prev, false);
        else showView('home', false);
    };

    // --- LEAD GENERATION ---
    window.submitLeadForm = async () => {
        const fname = document.getElementById('lead-firstname')?.value;
        const lname = document.getElementById('lead-lastname')?.value;
        const email = document.getElementById('lead-email')?.value;
        const phone = document.getElementById('lead-phone')?.value;
        const privacy = document.getElementById('lead-privacy')?.checked;
        const status = document.querySelector('input[name="status"]:checked')?.value || 'nicht angegeben';
        const needs = Array.from(document.querySelectorAll('input[name="needs"]:checked')).map(el => el.value);

        if (!fname || !lname || !email) {
            window.showToast('Bitte füllen Sie alle Pflichtfelder aus.');
            return;
        }
        if (!privacy) {
            window.showToast('Bitte akzeptieren Sie die Datenschutzerklärung.');
            return;
        }

        const btn = document.querySelector('button[onclick="submitLeadForm()"]');
        const originalText = btn ? btn.innerText : 'Senden';
        if (btn) {
            btn.innerText = "Sende...";
            btn.disabled = true;
        }

        try {
            /*
            const { error } = await supabase.from('leads').insert([{
                first_name: fname, last_name: lname, email, phone,
                status, needs, city: document.getElementById('city-input')?.value,
                created_at: new Date().toISOString()
            }]);
            if(error) throw error;
            */
            window.showToast('Dies ist eine Demo. Lead-Übermittlung deaktiviert.');
            document.getElementById('lead-form-internal')?.reset();
        } catch (e) {
            console.error(e);
            window.showToast('Fehler beim Senden. Bitte versuchen Sie es später.');
        } finally {
            if (btn) {
                btn.innerText = originalText;
                btn.disabled = false;
            }
        }
    };

    window.openLeadForm = (type) => {
        window.showView('results');
        const form = document.getElementById('lead-generation-form');
        if (form) {
            form.classList.remove('hidden');
            document.querySelectorAll('input[name="needs"]').forEach(cb => cb.checked = false);
            if (type) {
                const target = document.querySelector(`input[name="needs"][value="${type}"]`);
                if (target) target.checked = true;
            }
            setTimeout(() => window.scrollToId('lead-generation-form'), 100);
        }
    };

    // --- HUB LIST LOGIC ---
    function populateHubList(type, filter = '') {
        const listId = type === 'wohngeld' ? 'city-list-wohngeld' : 'city-list-buergergeld';
        const list = document.getElementById(listId);
        if (!list) return;

        const searchInput = document.getElementById(`hub-${type}-search`);
        const currentFilter = searchInput ? searchInput.value.toLowerCase() : filter;

        if (!currentFilter) {
            list.innerHTML = `<div class="col-span-full text-center py-12 text-slate-400 italic font-medium">Bitte geben Sie eine Stadt ein, um zuständige Stellen zu finden.</div>`;
            return;
        }

        const filtered = CITY_DB.filter(c => c.name.toLowerCase().includes(currentFilter))
            .sort((a, b) => {
                const aStarts = a.name.toLowerCase().startsWith(currentFilter);
                const bStarts = b.name.toLowerCase().startsWith(currentFilter);
                if (aStarts && !bStarts) return -1;
                if (!aStarts && bStarts) return 1;
                return 0;
            });

        if (filtered.length === 0) {
            list.innerHTML = `<div class="col-span-full text-center py-12 text-slate-400 italic font-medium">Keine Ergebnisse für "${currentFilter}" gefunden.</div>`;
            return;
        }

        list.innerHTML = filtered.map(city => {
            const linkUrl = type === 'wohngeld' ? `/${city.slug}/wohngeld` : `/${city.slug}/grundsicherung`;
            return `
            <a href="${linkUrl}" 
                 class="group block p-6 bg-white border border-slate-100 rounded-2xl hover:border-brand-blue/30 hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer text-left relative overflow-hidden">
                <div class="relative z-10">
                    <div class="flex justify-between items-start mb-3">
                        <h5 class="font-bold text-brand-slate text-lg group-hover:text-brand-blue transition-colors">${city.name}</h5>
                        <span class="text-[10px] font-black uppercase tracking-widest bg-slate-50 text-slate-400 px-2 py-1 rounded-md">Stufe ${city.mietstufe}</span>
                    </div>
                    <p class="text-xs text-slate-500 font-medium mb-4 flex items-center gap-2">
                        <i data-lucide="${type === 'wohngeld' ? 'building-2' : 'briefcase'}" class="w-3.5 h-3.5"></i>
                        ${type === 'wohngeld' ? (city.amt_name || 'Wohngeldstelle') : 'Jobcenter ' + city.name}
                    </p>
                    ${(type === 'wohngeld' && city.amt_email) ? `
                    <div class="inline-flex items-center gap-1.5 text-[10px] font-bold text-brand-blue bg-blue-50 px-2.5 py-1.5 rounded-full">
                        <i data-lucide="mail" class="w-3 h-3"></i> ${city.amt_email}
                    </div>
                    ` : ''}
                </div>
            </a>
        `}).join('');
        if (window.lucide) window.lucide.createIcons();
    }
    document.getElementById('hub-wohngeld-search')?.addEventListener('input', () => populateHubList('wohngeld'));
    document.getElementById('hub-buergergeld-search')?.addEventListener('input', () => populateHubList('buergergeld'));

    // --- CITY SEARCH & SELECTION ---
    const cityInput = document.getElementById('city-input');
    const suggestions = document.getElementById('city-suggestions');
    const clearCityInputBtn = document.getElementById('clear-city-input');
    let currentFocus = -1;

    if (cityInput) {
        cityInput.addEventListener('input', (e) => {
            const val = e.target.value.toLowerCase();
            currentFocus = -1;

            if (clearCityInputBtn) {
                if (val.length > 0) clearCityInputBtn.classList.remove('hidden');
                else clearCityInputBtn.classList.add('hidden');
            }

            if (val.length < 2) { if (suggestions) suggestions.classList.add('hidden'); return; }

            const matches = CITY_DB.filter(c => c.name.toLowerCase().includes(val))
                .sort((a, b) => {
                    const aStarts = a.name.toLowerCase().startsWith(val);
                    const bStarts = b.name.toLowerCase().startsWith(val);
                    if (aStarts && !bStarts) return -1;
                    if (!aStarts && bStarts) return 1;
                    return 0;
                })
                .slice(0, 5);

            if (suggestions && matches.length > 0) {
                suggestions.innerHTML = matches.map(c => {
                    // Safe regex escape
                    const escapedVal = val.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    const regex = new RegExp(`(${escapedVal})`, 'gi');
                    const highlighted = c.name.replace(regex, '<span class="text-brand-blue font-extrabold">$1</span>');
                    return `
                    <div role="option" class="suggestion-item group p-4 cursor-pointer border-b border-slate-50 last:border-none flex justify-between items-center transition-all duration-200 hover:bg-blue-50/50" onclick="selectCity('${c.name}', ${c.mietstufe})">
                        <div class="flex items-center gap-3">
                            <div class="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-white group-hover:text-brand-blue group-hover:shadow-sm transition-all">
                                <i data-lucide="map-pin" class="w-4 h-4"></i>
                            </div>
                            <span class="text-sm font-medium text-slate-700 group-hover:text-slate-900 transition-colors">${highlighted}</span>
                        </div>
                        <span class="text-[10px] bg-slate-100 text-slate-400 px-2 py-1 rounded-md uppercase font-bold tracking-wider group-hover:bg-white group-hover:text-brand-blue group-hover:shadow-sm transition-all">Stufe ${c.mietstufe}</span>
                    </div>
                `}).join('');
                suggestions.classList.remove('hidden');
                if (window.lucide) window.lucide.createIcons();
            } else if (suggestions) {
                suggestions.classList.add('hidden');
            }
        });

        cityInput.addEventListener('keydown', (e) => {
            if (!suggestions) return;
            const items = suggestions.querySelectorAll('.suggestion-item');
            if (e.key === 'ArrowDown') {
                currentFocus++;
                addActive(items);
            } else if (e.key === 'ArrowUp') {
                currentFocus--;
                addActive(items);
            } else if (e.key === 'Enter') {
                if (currentFocus > -1 && items.length > 0) {
                    e.preventDefault();
                    items[currentFocus].click();
                }
            } else if (e.key === 'Escape') {
                suggestions.classList.add('hidden');
                currentFocus = -1;
            }
        });

        function addActive(items) {
            if (!items || items.length === 0) return false;
            removeActive(items);
            if (currentFocus >= items.length) currentFocus = 0;
            if (currentFocus < 0) currentFocus = (items.length - 1);
            items[currentFocus].classList.add('bg-blue-50');
            items[currentFocus].scrollIntoView({ block: 'nearest' });
        }

        function removeActive(items) {
            for (let i = 0; i < items.length; i++) {
                items[i].classList.remove('bg-blue-50');
            }
        }
    }

    if (clearCityInputBtn) {
        clearCityInputBtn.addEventListener('click', () => {
            if (cityInput) cityInput.value = '';
            if (suggestions) suggestions.classList.add('hidden');
            clearCityInputBtn.classList.add('hidden');
            if (cityInput) cityInput.focus();
            currentFocus = -1;
        });
    }

    window.selectCity = (name, stufe) => {
        if (cityInput) cityInput.value = name;
        const mietstufeInput = document.getElementById('selected-mietstufe');
        if (mietstufeInput) mietstufeInput.value = stufe;
        if (suggestions) suggestions.classList.add('hidden');

        const searchContainer = document.getElementById('city-search-container');
        const infoContainer = document.getElementById('city-info-container');
        if (searchContainer && infoContainer) {
            searchContainer.classList.add('hidden');
            infoContainer.classList.remove('hidden');
        }

        document.querySelectorAll('.city-name-display').forEach(el => el.innerText = name);
        const levelDisplay = document.querySelector('.city-level-display');
        if (levelDisplay) levelDisplay.innerText = stufe;

        const city = CITY_DB.find(c => c.name === name);
        const authorityInfo = document.getElementById('city-authority-info');
        if (authorityInfo && city && city.amt_name) {
            authorityInfo.classList.remove('hidden');
            const nameEl = document.getElementById('authority-name');
            const addressEl = document.getElementById('authority-address');
            if (nameEl) nameEl.innerText = city.amt_name;
            if (addressEl) addressEl.innerText = city.amt_adresse;

            const emailLink = document.getElementById('authority-email');
            const emailText = document.getElementById('authority-email-text');
            if (emailLink && emailText && city.amt_email) {
                emailLink.classList.remove('hidden');
                emailLink.href = "mailto:" + city.amt_email;
                emailText.innerText = city.amt_email;
            } else if (emailLink) {
                emailLink.classList.add('hidden');
            }
        } else if (authorityInfo) {
            authorityInfo.classList.add('hidden');
        }

        const wgTitle = document.getElementById('hub-wohngeld-title-dynamic');
        if (wgTitle) wgTitle.innerText = name;
        const bgTitle = document.getElementById('hub-buergergeld-title-dynamic');
        if (bgTitle) bgTitle.innerText = name;

        if (!document.getElementById('view-home')?.classList.contains('active')) {
            window.showView('home');
            window.showToast(`Ort ${name} ausgewählt.`);
        }
        if (window.lucide) window.lucide.createIcons();
        document.getElementById('persons')?.focus();
    };

    window.resetCitySearch = () => {
        const searchContainer = document.getElementById('city-search-container');
        const infoContainer = document.getElementById('city-info-container');
        if (searchContainer) searchContainer.classList.remove('hidden');
        if (infoContainer) infoContainer.classList.add('hidden');
        if (cityInput) {
            cityInput.value = '';
            cityInput.focus();
        }
        if (clearCityInputBtn) clearCityInputBtn.classList.add('hidden');
    };

    // --- MAIN CALCULATION LOGIC ---
    const calcForm = document.getElementById('main-calc');
    if (calcForm) {
        calcForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            // Robust validation
            const incomeInput = document.getElementById('income');
            const rentInput = document.getElementById('rent');
            const mietstufeInput = document.getElementById('selected-mietstufe');
            const kidsInput = document.getElementById('kids');
            const personsInput = document.getElementById('persons');

            const inc = parseFloat(incomeInput?.value || '0');
            const rnt = parseFloat(rentInput?.value || '0');
            const ms = parseInt(mietstufeInput?.value || '0');
            const kidsCount = parseInt(kidsInput?.value || '0');
            const personsCount = parseInt(personsInput?.value || '1');

            if (!ms || ms === 0) {
                window.showToast("Bitte wählen Sie zuerst eine Stadt aus.");
                window.resetCitySearch();
                return;
            }

            if (isNaN(inc) || inc < 0 || isNaN(rnt) || rnt < 0) {
                window.showToast("Bitte geben Sie gültige positive Zahlen für Einkommen und Miete ein.");
                return;
            }

            if (rnt <= 0) {
                window.showToast("Bitte geben Sie eine positive Warmmiete ein.");
                return;
            }

            const btn = calcForm.querySelector('button[type="submit"]');
            const originalText = btn.innerText;
            if (btn) {
                btn.innerText = "Analysiere...";
                btn.disabled = true;
            }

            try {
                const members = [];
                members.push({ role: "main", age: 35, incomes: [{ amount_net: inc, amount_brutto: inc * 1.4 }] });
                if (personsCount > 1 && (personsCount - kidsCount) > 1) {
                    members.push({ role: "partner", age: 35, incomes: [] });
                }
                for (let i = 0; i < kidsCount; i++) {
                    members.push({ role: "child", age: 10, incomes: [] });
                }

                const payload = { rent_cold: rnt, rent_utility: 0, rent_heating: 0, termination_reason: "none", members: members };

                // Dynamic API URL for Localhost vs Production
                const isLocal = window.location.hostname.includes('localhost') || window.location.hostname === '127.0.0.1';
                const defaultApiUrl = isLocal
                    ? 'http://localhost:8000/api/v4/analyze'
                    : 'https://sozialer-navigator-api.onrender.com/api/v4/analyze';

                const apiUrl = config.apiUrl || defaultApiUrl;
                console.log('Sending request to:', apiUrl);

                const response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (!response.ok) {
                    let errorData = { error: 'Unbekannter Serverfehler', details: `Status: ${response.status}` };
                    try {
                        const jsonResponse = await response.json();
                        errorData = jsonResponse;
                    } catch (jsonError) {
                        // Response not JSON
                    }
                    window.showToast(`Fehler: ${errorData.error || 'Server'} - ${errorData.details || response.status}`);
                    throw new Error(`API Error: ${errorData.error}`);
                }
                const data = await response.json();

                window.showView('results');

                const sgb2 = data.results.find(r => r.type === 'SGB2');
                const wogg = data.results.find(r => r.type === 'WOHNGELD');
                let finalAmount = 0;
                let resultType = "Kein Anspruch";

                if (sgb2 && sgb2.amount > 0) {
                    finalAmount = sgb2.amount;
                    resultType = "Bürgergeld";
                } else if (wogg && wogg.amount > 0) {
                    finalAmount = wogg.amount;
                    resultType = "Wohngeld";
                }

                renderResults(finalAmount, resultType, { inc, rnt, ms, kidsCount, personsCount });

            } catch (err) {
                console.error(err);
                if (err.message.includes("API Error")) {
                    // Toast already shown
                } else {
                    window.showToast("Verbindungsfehler zum Berechnungs-Service. Bitte versuchen Sie es später.");
                }
            } finally {
                if (btn) {
                    btn.innerText = originalText;
                    btn.disabled = false;
                }
            }
        });
    }

    function renderResults(finalAmount, resultType, inputs) {
        const { inc, rnt, ms, kidsCount, personsCount } = inputs;

        const resDate = document.getElementById('res-date');
        if (resDate) resDate.innerText = new Date().toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });

        const resCityName = document.getElementById('res-city-name');
        if (resCityName) resCityName.innerText = cityInput?.value || "Ihrer Stadt";

        const resMietstufe = document.getElementById('res-mietstufe');
        if (resMietstufe) resMietstufe.innerText = `Mietstufe ${ms}`;

        const resAmountEl = document.getElementById('res-amount');
        if (resAmountEl) resAmountEl.innerText = finalAmount > 0 ? `${finalAmount.toFixed(0)}€` : "0€";

        const ratio = Math.min(100, Math.round((rnt / (inc + finalAmount || 1)) * 100));
        const ratioText = document.getElementById('ratio-text');
        if (ratioText) ratioText.innerText = `${ratio}%`;
        updateChart(ratio);

        const nextStepsContainer = document.getElementById('next-steps-result');
        if (nextStepsContainer) {
            nextStepsContainer.innerHTML = `
                <h5 class="font-bold text-brand-slate text-sm uppercase tracking-wider mb-3">Ergebnis: ${resultType}</h5>
                <p class="text-sm text-slate-600 font-medium leading-relaxed">
                    Basierend auf Ihren Angaben haben Sie voraussichtlich Anspruch auf <strong>${finalAmount.toFixed(2)}€ ${resultType}</strong>.
                </p>
            `;
        }

        const rentLimit = (RENT_LIMITS[ms] && RENT_LIMITS[ms][Math.min(personsCount - 1, 4)]) || 500;
        const isOverLimit = rnt > rentLimit;
        const rentCheckContainer = document.getElementById('rent-check-result');
        if (rentCheckContainer) {
            rentCheckContainer.innerHTML = `
                <div class="flex items-start gap-4">
                    <div class="w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isOverLimit ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600'}">
                        <i data-lucide="${isOverLimit ? 'alert-triangle' : 'check-circle-2'}" class="w-5 h-5"></i>
                    </div>
                    <div>
                        <h5 class="font-bold text-brand-slate text-sm uppercase tracking-wider mb-1">Miet-Check (Stufe ${ms})</h5>
                        <p class="text-sm text-slate-600 font-medium leading-relaxed">
                            ${isOverLimit ? `Ihre Miete liegt <strong>über dem Richtwert</strong> von ${rentLimit}€. Es wird nur der Höchstbetrag für die Berechnung berücksichtigt.` : `Ihre Miete liegt <strong>vollständig im Rahmen</strong> (Limit: ${rentLimit}€). Die Kosten werden voll anerkannt.`}
                        </p>
                    </div>
                </div>
            `;
        }

        const leadsContainer = document.getElementById('result-leads');
        if (leadsContainer) {
            let leads = [];
            if (inc === 0) {
                leads.push({ icon: 'briefcase', title: 'Bürgergeld beantragen', desc: 'Sichern Sie Ihren Lebensunterhalt. Hier finden Sie alle Infos zum Antrag beim Jobcenter.', link: 'https://www.arbeitsagentur.de/arbeitslos-arbeit-finden/buergergeld', cta: 'Zum Antrag', recommended: true });
            }
            if (kidsCount > 0 && inc > 0) {
                leads.push({ icon: 'baby', title: 'Kinder-Zuschuss (KiZ)', desc: 'Zusätzlich zum Wohngeld stehen Ihnen bis zu 292€ pro Kind zu. Prüfen Sie jetzt Ihren Anspruch.', link: 'https://www.arbeitsagentur.de/familie-und-kinder/kinderzuschlag-anspruch-hoehe-dauer', cta: 'Anspruch prüfen', recommended: true });
            }
            leads.push({ icon: 'graduation-cap', title: '🎓 Karriere-Boost (AVGS)', desc: 'Wir prüfen Ihren Anspruch auf 100% geförderte Coachings im Wert von 2.500€ – staatlich finanziert über den AVGS-Gutschein.', link: '#lead-generation-form', cta: 'Kostenlos prüfen', recommended: true, preselect: 'avgs' });
            leads.push({ icon: 'file-warning', title: 'Hilfe bei Ablehnung', desc: 'Antrag abgelehnt oder falsch berechnet? Wir prüfen Ihren Bescheid kostenlos und legen Widerspruch ein.', link: '#lead-generation-form', cta: 'Bescheid prüfen', recommended: false, preselect: 'ablehnung' });

            leadsContainer.innerHTML = leads.map(lead => `
                <a href="${lead.link}" ${lead.link.startsWith('#') ? `onclick="openLeadForm('${lead.preselect}'); return false;"` : 'target="_blank" rel="noopener noreferrer"'} class="group relative p-6 bg-white border ${lead.recommended ? 'border-brand-blue ring-1 ring-brand-blue shadow-lg' : 'border-slate-200'} rounded-2xl hover:border-brand-blue/30 hover:shadow-xl hover:-translate-y-1 transition-all text-left flex flex-col justify-between h-full">
                    ${lead.recommended ? '<div class="absolute -top-3 left-6 bg-brand-blue text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full shadow-md">Empfohlen</div>' : ''}
                    <div class="space-y-4">
                        <div class="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center text-brand-blue group-hover:scale-110 transition-transform">
                            <i data-lucide="${lead.icon}" class="w-5 h-5"></i>
                        </div>
                        <div>
                            <h5 class="font-bold text-brand-slate text-lg">${lead.title}</h5>
                            <p class="text-sm text-slate-500 mt-2 leading-relaxed">${lead.desc}</p>
                        </div>
                    </div>
                    <div class="mt-6 flex items-center text-xs font-bold uppercase tracking-widest text-brand-blue group-hover:gap-2 transition-all">
                        ${lead.cta} <i data-lucide="arrow-right" class="w-3 h-3 ml-1"></i>
                    </div>
                </a>
            `).join('');
        }

        const leadGenForm = document.getElementById('lead-generation-form');
        if (leadGenForm) leadGenForm.classList.remove('hidden');
        if (window.lucide) window.lucide.createIcons();
    }

    function updateChart(val) {
        const ctx = document.getElementById('ratioChart')?.getContext('2d');
        if (!ctx) return;
        if (ratioChartInstance) ratioChartInstance.destroy();
        ratioChartInstance = new Chart(ctx, {
            type: 'doughnut',
            data: { datasets: [{ data: [val, 100 - val], backgroundColor: ['#2563eb', '#f1f5f9'], borderWidth: 0, borderRadius: 15 }] },
            options: { responsive: true, maintainAspectRatio: false, cutout: '80%', plugins: { legend: { display: false }, tooltip: { enabled: false } } }
        });
    }
}
