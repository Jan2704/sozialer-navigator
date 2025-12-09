'use client';
import { useState } from 'react';

// --- DESIGN COMPONENTS ---
const Header = () => (
  <header className="bg-white border-b border-slate-100 sticky top-0 z-50 backdrop-blur-md bg-opacity-90">
    <div className="max-w-4xl mx-auto px-6 py-4 flex justify-between items-center">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold shadow-indigo-200 shadow-lg">N</div>
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight leading-none">Sozialer Navigator</h1>
          <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-600">GovTech 4.2</span>
        </div>
      </div>
      <div className="hidden md:flex gap-4 text-sm font-medium text-slate-500">
        <span>Sicherheit</span>
        <span>Datenschutz</span>
        <span className="text-indigo-600">Hilfe</span>
      </div>
    </div>
  </header>
);

const Card = ({ children, title, icon }) => (
  <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-slate-100 transition hover:shadow-md">
    {title && (
      <div className="flex items-center gap-3 mb-6 border-b border-slate-50 pb-4">
        <span className="text-2xl">{icon}</span>
        <h2 className="text-lg font-bold text-slate-800">{title}</h2>
      </div>
    )}
    {children}
  </div>
);

const Label = ({ children }) => (
  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 ml-1">{children}</label>
);

const Input = (props) => (
  <input 
    className="w-full bg-slate-50 text-slate-900 p-3 rounded-xl border-none ring-1 ring-slate-200 focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all outline-none font-medium"
    {...props}
  />
);

const Select = ({ children, ...props }) => (
  <select 
    className="w-full bg-slate-50 text-slate-900 p-3 rounded-xl border-none ring-1 ring-slate-200 focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all outline-none font-medium appearance-none"
    {...props}
  >
    {children}
  </select>
);

// --- OPPORTUNITY CARD (Das Geld-Modul) ---
const OpportunityCard = ({ opp }) => (
  <a 
    href={opp.link} 
    target="_blank" 
    rel="noopener noreferrer"
    className="block p-5 bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-lg hover:border-indigo-200 transition-all transform hover:-translate-y-1 group"
  >
    <div className="flex justify-between items-start mb-2">
      <span className="text-3xl bg-slate-50 p-2 rounded-lg">{opp.icon}</span>
      <span className="text-xs font-bold bg-emerald-100 text-emerald-700 px-2 py-1 rounded uppercase tracking-wide group-hover:bg-emerald-200 transition">Empfehlung</span>
    </div>
    <h3 className="text-lg font-bold text-slate-900 mb-1">{opp.title}</h3>
    <p className="text-sm text-slate-500 mb-4 leading-relaxed">{opp.text}</p>
    <div className="text-indigo-600 font-bold text-sm flex items-center gap-1 group-hover:gap-2 transition-all">
      {opp.action} <span>→</span>
    </div>
  </a>
);

// --- MAIN APP LOGIC ---
export default function Home() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  // States
  const [general, setGeneral] = useState({
    zip_code: "", rent_cold: "", rent_utility: "", rent_heating: "", termination_reason: "none", months_unemployed: 0
  });

  const [members, setMembers] = useState([
    { role: "main", age: 30, income_brutto: 0, income_net: 0, income_type: "employment", is_single_parent: false }
  ]);

  // Helper Functions
  const addMember = () => setMembers([...members, { role: "child", age: 0, income_brutto: 0, income_net: 0, income_type: "none" }]);
  const removeMember = (index) => setMembers(members.filter((_, i) => i !== index));
  const updateMember = (index, field, value) => {
    const newMembers = [...members];
    newMembers[index][field] = value;
    setMembers(newMembers);
  };

  // API Logic (Mit LIVE URL)
  const handleAnalyze = async () => {
    setLoading(true);
    setResult(null);

    const payload = {
      zip_code: general.zip_code,
      rent_cold: parseFloat(general.rent_cold) || 0,
      rent_utility: parseFloat(general.rent_utility) || 0,
      rent_heating: parseFloat(general.rent_heating) || 0,
      termination_reason: general.termination_reason,
      months_unemployed: parseInt(general.months_unemployed) || 0,
      members: members.map(m => ({
        role: m.role,
        age: parseInt(m.age) || 0,
        is_single_parent: m.is_single_parent || false,
        incomes: m.income_type !== "none" ? [{
            amount_brutto: parseFloat(m.income_brutto) || 0,
            amount_net: parseFloat(m.income_net) || 0,
            source_type: m.income_type
        }] : []
      }))
    };

    try {
      // HIER IST DEINE LIVE URL EINGEBAUT:
      const res = await fetch('https://sozialer-navigator-api.onrender.com/api/v4/analyze', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error("Fehler");
      const data = await res.json();
      setResult(data);
      // Smooth scroll to results
      setTimeout(() => document.getElementById('results-section').scrollIntoView({ behavior: 'smooth' }), 100);
    } catch (e) { alert("Verbindung zum Server fehlgeschlagen."); }
    setLoading(false);
  };

  const handleDownload = async () => {
    // 1. Alert (Sales Hook)
    const confirm = window.confirm("Offiziellen Antrag jetzt generieren? (Preis: 29,99€ - Simulation)");
    if (!confirm) return;

    // Payload nachbauen
    const payload = {
        zip_code: general.zip_code,
        rent_cold: parseFloat(general.rent_cold) || 0,
        rent_utility: parseFloat(general.rent_utility) || 0,
        rent_heating: parseFloat(general.rent_heating) || 0,
        termination_reason: general.termination_reason,
        months_unemployed: parseInt(general.months_unemployed) || 0,
        members: members.map(m => ({
          role: m.role,
          age: parseInt(m.age) || 0,
          is_single_parent: m.is_single_parent || false,
          incomes: m.income_type !== "none" ? [{
              amount_brutto: parseFloat(m.income_brutto) || 0,
              amount_net: parseFloat(m.income_net) || 0,
              source_type: m.income_type
          }] : []
        }))
      };

    try {
        // HIER IST DEINE LIVE URL EINGEBAUT:
        const res = await fetch('https://sozialer-navigator-api.onrender.com/api/v4/pdf', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if(!res.ok) throw new Error("Fehler");
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = "Antrag_V4.pdf";
        document.body.appendChild(a);
        a.click();
        a.remove();
    } catch (e) { alert("Download fehlgeschlagen"); }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-indigo-100">
      <Header />

      <main className="max-w-4xl mx-auto px-4 py-12 space-y-8">
        
        {/* HERO */}
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-4 tracking-tight">Dein Recht auf <span className="text-indigo-600">Geld vom Staat.</span></h2>
          <p className="text-lg text-slate-500 max-w-2xl mx-auto">
            Prüfe in Sekunden deinen Anspruch auf Bürgergeld, Wohngeld & Kinderzuschlag. 
            Anonym, sicher & staatlich präzise (SGB II/WoGG).
          </p>
        </div>

        {/* SECTION 1 */}
        <Card title="Wohnen & Status" icon="🏠">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <Label>PLZ (Wohnort)</Label>
              <Input placeholder="10115" maxLength={5} value={general.zip_code} onChange={e => setGeneral({...general, zip_code: e.target.value})} />
            </div>
            <div>
              <Label>Aktueller Job-Status</Label>
              <Select value={general.termination_reason} onChange={e => setGeneral({...general, termination_reason: e.target.value})}>
                <option value="none">In Arbeit / Nicht gekündigt</option>
                <option value="fired">Gekündigt (Arbeitgeber)</option>
                <option value="mutual_agreement">Aufhebungsvertrag</option>
                <option value="self_termination">Selbst gekündigt</option>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div><Label>Kaltmiete (€)</Label><Input type="number" placeholder="500" value={general.rent_cold} onChange={e => setGeneral({...general, rent_cold: e.target.value})} /></div>
            <div><Label>Nebenkosten (€)</Label><Input type="number" placeholder="80" value={general.rent_utility} onChange={e => setGeneral({...general, rent_utility: e.target.value})} /></div>
            <div><Label>Heizkosten (€)</Label><Input type="number" placeholder="70" value={general.rent_heating} onChange={e => setGeneral({...general, rent_heating: e.target.value})} /></div>
          </div>
        </Card>

        {/* SECTION 2 */}
        <Card title="Personen im Haushalt" icon="👨‍👩‍👧">
          <div className="space-y-6">
            {members.map((m, idx) => (
              <div key={idx} className="bg-slate-50 p-6 rounded-2xl border border-slate-100 relative group hover:border-indigo-100 transition">
                <div className="flex justify-between mb-4">
                  <span className="text-xs font-bold bg-slate-200 text-slate-600 px-2 py-1 rounded uppercase tracking-wider">
                    {m.role === 'main' ? 'Du (Antragsteller)' : m.role === 'partner' ? 'Partner' : 'Kind / Weitere'}
                  </span>
                  {idx > 0 && <button onClick={() => removeMember(idx)} className="text-red-400 hover:text-red-600 text-sm font-medium">Entfernen</button>}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="col-span-1">
                    <Label>Rolle</Label>
                    <Select value={m.role} onChange={e => updateMember(idx, 'role', e.target.value)}>
                      <option value="main">Antragsteller</option>
                      <option value="partner">Partner</option>
                      <option value="child">Kind</option>
                    </Select>
                  </div>
                  <div className="col-span-1">
                    <Label>Alter</Label>
                    <Input type="number" value={m.age} onChange={e => updateMember(idx, 'age', e.target.value)} />
                  </div>
                  {/* Checkboxen */}
                  {m.role === 'main' && (
                    <div className="col-span-2 flex items-center h-full pt-6">
                       <label className="flex items-center gap-3 cursor-pointer p-2 hover:bg-white rounded-lg transition w-full">
                         <input type="checkbox" checked={m.is_single_parent} onChange={e => updateMember(idx, 'is_single_parent', e.target.checked)} className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500" />
                         <span className="text-sm font-medium text-slate-700">Ich bin alleinerziehend</span>
                       </label>
                    </div>
                  )}
                </div>

                {/* Einkommen */}
                <div className="mt-6 pt-6 border-t border-slate-200 border-dashed">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label>Einkommensart</Label>
                      <Select value={m.income_type} onChange={e => updateMember(idx, 'income_type', e.target.value)}>
                        <option value="none">Kein Einkommen</option>
                        <option value="employment">Angestellt</option>
                        <option value="minijob">Minijob (max 538€)</option>
                        <option value="self_employed">Selbstständig</option>
                        <option value="pension">Rente</option>
                        <option value="child_benefit">Kindergeld</option>
                      </Select>
                    </div>
                    {m.income_type !== 'none' && (
                      <>
                        <div><Label>Brutto (€)</Label><Input type="number" value={m.income_brutto} onChange={e => updateMember(idx, 'income_brutto', e.target.value)} /></div>
                        <div><Label>Netto (€)</Label><Input type="number" value={m.income_net} onChange={e => updateMember(idx, 'income_net', e.target.value)} /></div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button onClick={addMember} className="mt-6 w-full py-3 border-2 border-dashed border-indigo-100 rounded-xl text-indigo-600 font-bold hover:bg-indigo-50 hover:border-indigo-200 transition">
            + Weitere Person hinzufügen
          </button>
        </Card>

        {/* CTA */}
        <button 
          onClick={handleAnalyze} disabled={loading}
          className="w-full bg-gradient-to-r from-indigo-600 to-indigo-700 text-white py-5 rounded-2xl font-bold text-xl shadow-xl shadow-indigo-200 hover:shadow-2xl hover:scale-[1.01] transition transform disabled:opacity-70 disabled:scale-100"
        >
          {loading ? "Analysiere Rechtslage..." : "Anspruch jetzt prüfen ✨"}
        </button>

        {/* RESULTS */}
        {result && (
          <div id="results-section" className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700 pt-8">
            
            {/* Ergebnis Liste */}
            <div className="grid grid-cols-1 gap-6">
              {result.results.map((res, idx) => (
                <div key={idx} className={`p-8 rounded-2xl border bg-white shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 ${
                  res.type === 'ALERT' ? 'border-red-100 bg-red-50/50' : 
                  res.type === 'SGB2' ? 'border-emerald-100' : 'border-blue-100'
                }`}>
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                       {res.type === 'ALERT' && <span className="text-xl">⚠️</span>}
                       <h4 className={`text-xl font-bold ${res.type === 'ALERT' ? 'text-red-700' : 'text-slate-800'}`}>{res.title}</h4>
                    </div>
                    <p className="text-slate-600">{res.text}</p>
                  </div>
                  <div className={`text-3xl font-black ${res.type === 'ALERT' ? 'text-red-600' : 'text-emerald-600'}`}>
                    {res.amount}
                  </div>
                </div>
              ))}
            </div>

            {/* MONETIZATION: SMART OPPORTUNITIES */}
            {result.opportunities && result.opportunities.length > 0 && (
              <div className="bg-slate-900 p-6 md:p-8 rounded-2xl shadow-xl text-white">
                <div className="mb-6">
                  <h3 className="text-xl font-bold text-white">💰 Deine Spar-Chancen</h3>
                  <p className="text-slate-400 text-sm">Wir haben basierend auf deinen Daten {result.opportunities.length} Möglichkeiten gefunden, dein Budget sofort zu verbessern.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-slate-900">
                  {result.opportunities.map((opp) => (
                    <OpportunityCard key={opp.id} opp={opp} />
                  ))}
                </div>
              </div>
            )}

            {/* DOWNLOAD BUTTON */}
            <div className="pt-8">
                <button 
                  onClick={handleDownload}
                  className="w-full bg-emerald-600 text-white py-5 rounded-2xl font-bold text-lg shadow-xl shadow-emerald-100 hover:bg-emerald-700 hover:shadow-2xl transition flex items-center justify-center gap-3"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  Offiziellen Antrag als PDF laden (29,99€)
                </button>
                <p className="text-center text-xs text-slate-400 mt-4">Sichere SSL-Verschlüsselung • Sofortiger Download</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}