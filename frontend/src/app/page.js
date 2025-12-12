'use client';
import { useState } from 'react';

// --- RECHTSTEXTE (Impressum & Datenschutz Modal) ---
const LegalModal = ({ type, onClose }) => (
  <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={onClose}>
    <div className="bg-white rounded-2xl p-8 max-w-2xl w-full max-h-[80vh] overflow-y-auto shadow-2xl animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
      <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
        <h2 className="text-2xl font-bold text-slate-900 capitalize">{type === 'impressum' ? 'Impressum' : 'Datenschutz'}</h2>
        <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 transition font-bold">✕</button>
      </div>
      
      <div className="prose prose-slate text-sm text-slate-600 leading-relaxed space-y-4">
        {type === 'impressum' ? (
          <>
            <p className="font-bold text-lg">Angaben gemäß § 5 TMG</p>
            <p>
              Jan Rall<br />
              Parkstraße 4<br />
              88326 Aulendorf
            </p>
            <p><strong>Kontakt:</strong><br />E-Mail: kontakt@sozialer-navigator.de</p>
            <p><strong>Haftungsausschluss:</strong><br />Die Inhalte unserer Seiten wurden mit größter Sorgfalt erstellt. Für die Richtigkeit, Vollständigkeit und Aktualität der Inhalte können wir jedoch keine Gewähr übernehmen.</p>
          </>
        ) : (
          <>
            <p className="font-bold text-lg">Datenschutzerklärung</p>
            <p><strong>1. Datenschutz auf einen Blick</strong><br />Wir freuen uns über Ihr Interesse an unserer Website. Der Schutz Ihrer Privatsphäre ist für uns sehr wichtig. Nachstehend informieren wir Sie ausführlich über den Umgang mit Ihren Daten.</p>
            <p><strong>2. Keine Speicherung von Eingabedaten</strong><br />Sämtliche Eingaben, die Sie in den Rechner tätigen (z.B. Miete, Einkommen), werden <strong>ausschließlich lokal in Ihrem Browser</strong> verarbeitet. Es erfolgt keine Speicherung dieser sensiblen Daten auf unseren Servern und keine Weitergabe an Dritte.</p>
            <p><strong>3. Affiliate-Links</strong><br />Diese Website nutzt Affiliate-Links (z.B. zu Check24). Wenn Sie auf einen solchen Link klicken, werden Sie zum Anbieter weitergeleitet. Ab diesem Zeitpunkt gelten die Datenschutzbestimmungen des jeweiligen Anbieters.</p>
            <p><strong>4. Hosting</strong><br />Diese Seite wird bei Vercel Inc. gehostet. Die Server-Kommunikation erfolgt verschlüsselt (SSL/TLS).</p>
          </>
        )}
      </div>
      <button onClick={onClose} className="mt-8 w-full bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-slate-800 transition">Schließen</button>
    </div>
  </div>
);

// --- FOOTER ---
const Footer = ({ onOpenLegal }) => (
  <footer className="bg-white border-t border-slate-200 mt-auto py-8">
    <div className="max-w-4xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-slate-500">
      <div>© 2025 Sozialer Navigator. Alle Rechte vorbehalten.</div>
      <div className="flex gap-6 font-medium">
        <button onClick={() => onOpenLegal('impressum')} className="hover:text-indigo-600 transition">Impressum</button>
        <button onClick={() => onOpenLegal('datenschutz')} className="hover:text-indigo-600 transition">Datenschutz</button>
      </div>
    </div>
  </footer>
);

// --- HELP SECTION ---
const HelpSection = () => (
  <section className="border-t border-slate-200 bg-white mt-12 py-12">
    <div className="max-w-4xl mx-auto px-6">
      <h3 className="text-2xl font-bold text-slate-900 mb-8 text-center">Häufige Fragen & Nutzungshinweise</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div>
          <div className="flex items-center gap-2 mb-4">
            <span className="bg-indigo-100 text-indigo-600 p-2 rounded-lg text-xl">📝</span>
            <h4 className="font-bold text-slate-800">Richtig Ausfüllen</h4>
          </div>
          <ul className="space-y-3 text-sm text-slate-600 leading-relaxed">
            <li><strong>Reale Werte:</strong> Gib Miete & Nebenkosten genau an.</li>
            <li><strong>Haushalt:</strong> Alle Personen (Partner, Kinder) zählen.</li>
            <li><strong>Alleinerziehend:</strong> Wichtiges Häkchen für mehr Geld.</li>
          </ul>
        </div>
        <div>
          <div className="flex items-center gap-2 mb-4">
            <span className="bg-amber-100 text-amber-600 p-2 rounded-lg text-xl">💡</span>
            <h4 className="font-bold text-slate-800">Profi-Tipps</h4>
          </div>
          <ul className="space-y-3 text-sm text-slate-600 leading-relaxed">
            <li><strong>Szenarien testen:</strong> Spiel "Was wäre wenn" durch.</li>
            <li><strong>Alles zählt:</strong> Auch Minijobs angeben.</li>
            <li><strong>Datenschutz:</strong> Daten bleiben im Browser.</li>
          </ul>
        </div>
        <div>
          <div className="flex items-center gap-2 mb-4">
            <span className="bg-red-100 text-red-600 p-2 rounded-lg text-xl">⚠️</span>
            <h4 className="font-bold text-slate-800">Wichtig</h4>
          </div>
          <ul className="space-y-3 text-sm text-slate-600 leading-relaxed">
            <li><strong>Nur Schätzung:</strong> Das Amt entscheidet final.</li>
            <li><strong>Rechtsstand:</strong> Prognose für 2025.</li>
          </ul>
        </div>
      </div>
    </div>
  </section>
);

// --- COMPONENTS ---
const Header = () => (
  <header className="bg-white border-b border-slate-100 sticky top-0 z-50 backdrop-blur-md bg-opacity-90">
    <div className="max-w-4xl mx-auto px-6 py-4 flex justify-between items-center">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold shadow-indigo-200 shadow-lg">N</div>
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight leading-none">Sozialer Navigator</h1>
        </div>
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

// Clean Labels (Normal Case, Serioeser)
const Label = ({ children }) => (
  <label className="block text-sm font-semibold text-slate-700 mb-2 ml-1">{children}</label>
);

const Input = (props) => (
  <input className="w-full bg-slate-50 text-slate-900 p-3 rounded-xl border-none ring-1 ring-slate-200 focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all outline-none font-medium placeholder-slate-400" {...props} />
);

const Select = ({ children, ...props }) => (
  <select className="w-full bg-slate-50 text-slate-900 p-3 rounded-xl border-none ring-1 ring-slate-200 focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all outline-none font-medium appearance-none" {...props}>
    {children}
  </select>
);

const OpportunityCard = ({ opp }) => (
  <a href={opp.link} target="_blank" rel="noopener noreferrer"
    className="block p-5 bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-lg hover:border-indigo-200 transition-all transform hover:-translate-y-1 group relative overflow-hidden"
  >
    <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-50 rounded-full -mr-8 -mt-8 transition group-hover:bg-emerald-100"></div>
    <div className="flex justify-between items-start mb-3 relative z-10">
      <span className="text-3xl bg-slate-50 p-2 rounded-lg border border-slate-100">{opp.icon}</span>
      <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-1 rounded uppercase tracking-wide">Empfehlung</span>
    </div>
    <h3 className="text-lg font-bold text-slate-900 mb-1 relative z-10">{opp.title}</h3>
    <p className="text-sm text-slate-500 mb-4 leading-relaxed relative z-10">{opp.text}</p>
    <div className="text-indigo-600 font-bold text-sm flex items-center gap-1 group-hover:gap-2 transition-all relative z-10">
      {opp.action} <span>→</span>
    </div>
  </a>
);

// --- MAIN APP ---
export default function Home() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [showLegal, setShowLegal] = useState(null);

  const [general, setGeneral] = useState({
    zip_code: "", rent_cold: "", rent_utility: "", rent_heating: "", termination_reason: "none", months_unemployed: 0
  });

  const [members, setMembers] = useState([
    { role: "main", age: 30, income_brutto: 0, income_net: 0, income_type: "employment", is_single_parent: false }
  ]);

  const addMember = () => setMembers([...members, { role: "child", age: 0, income_brutto: 0, income_net: 0, income_type: "none" }]);
  const removeMember = (index) => setMembers(members.filter((_, i) => i !== index));
  const updateMember = (index, field, value) => {
    const newMembers = [...members];
    newMembers[index][field] = value;
    setMembers(newMembers);
  };

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
        role: m.role, age: parseInt(m.age) || 0, is_single_parent: m.is_single_parent || false,
        incomes: m.income_type !== "none" ? [{ amount_brutto: parseFloat(m.income_brutto) || 0, amount_net: parseFloat(m.income_net) || 0, source_type: m.income_type }] : []
      }))
    };
    try {
      const res = await fetch('https://sozialer-navigator-api.onrender.com/api/v4/analyze', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error("Fehler");
      const data = await res.json();
      setResult(data);
      setTimeout(() => document.getElementById('results-section').scrollIntoView({ behavior: 'smooth' }), 100);
    } catch (e) { alert("Verbindung fehlgeschlagen. Backend offline?"); }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-indigo-100 flex flex-col">
      <Header />
      <main className="max-w-4xl mx-auto px-4 py-12 space-y-8 flex-grow w-full">
        
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-4 tracking-tight leading-tight">Dein Anspruch auf <span className="text-indigo-600">Geld vom Staat.</span></h2>
          <p className="text-lg text-slate-500 max-w-2xl mx-auto leading-relaxed">Prüfe in Sekunden, ob dir Bürgergeld oder Wohngeld zusteht – anonym und kostenlos.</p>
        </div>

        <Card title="Wohnen & Status" icon="🏠">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div><Label>PLZ deines Wohnorts</Label><Input placeholder="z.B. 10115" maxLength={5} value={general.zip_code} onChange={e => setGeneral({...general, zip_code: e.target.value})} /></div>
            <div><Label>Aktuelle Situation</Label><Select value={general.termination_reason} onChange={e => setGeneral({...general, termination_reason: e.target.value})}><option value="none">Angestellt / Nicht gekündigt</option><option value="fired">Gekündigt (vom Arbeitgeber)</option><option value="mutual_agreement">Aufhebungsvertrag unterschrieben</option><option value="self_termination">Selbst gekündigt</option></Select></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div><Label>Kaltmiete (€)</Label><Input type="number" placeholder="500" value={general.rent_cold} onChange={e => setGeneral({...general, rent_cold: e.target.value})} /></div>
            <div><Label>Nebenkosten (€)</Label><Input type="number" placeholder="80" value={general.rent_utility} onChange={e => setGeneral({...general, rent_utility: e.target.value})} /></div>
            <div><Label>Heizkosten (€)</Label><Input type="number" placeholder="70" value={general.rent_heating} onChange={e => setGeneral({...general, rent_heating: e.target.value})} /></div>
          </div>
        </Card>

        <Card title="Personen im Haushalt" icon="👨‍👩‍👧">
          <div className="space-y-6">
            {members.map((m, idx) => (
              <div key={idx} className="bg-slate-50 p-6 rounded-2xl border border-slate-100 relative group hover:border-indigo-100 transition shadow-sm">
                <div className="flex justify-between items-center mb-4 border-b border-slate-200 pb-3">
                  <span className="font-bold text-slate-700">{m.role === 'main' ? 'Du (Antragsteller)' : m.role === 'partner' ? 'Dein Partner' : `Kind / Weitere Person #${idx}`}</span>
                  {idx > 0 && <button onClick={() => removeMember(idx)} className="text-red-500 hover:text-red-700 text-sm font-medium bg-red-50 hover:bg-red-100 px-3 py-1 rounded-lg transition">Entfernen</button>}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  <div className="md:col-span-4"><Label>Rolle</Label><Select value={m.role} onChange={e => updateMember(idx, 'role', e.target.value)}><option value="main">Antragsteller</option><option value="partner">Partner</option><option value="child">Kind</option></Select></div>
                  <div className="md:col-span-3"><Label>Alter</Label><Input type="number" value={m.age} onChange={e => updateMember(idx, 'age', e.target.value)} /></div>
                  {m.role === 'main' && (<div className="md:col-span-5 flex items-center h-full pt-6"><label className="flex items-center gap-3 cursor-pointer p-2 hover:bg-white rounded-lg transition w-full"><input type="checkbox" checked={m.is_single_parent} onChange={e => updateMember(idx, 'is_single_parent', e.target.checked)} className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500" /><span className="text-sm font-medium text-slate-700">Ich bin alleinerziehend</span></label></div>)}
                </div>
                <div className="mt-4 pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div><Label>Einkommensart</Label><Select value={m.income_type} onChange={e => updateMember(idx, 'income_type', e.target.value)}><option value="none">Kein Einkommen</option><option value="employment">Angestellt</option><option value="minijob">Minijob</option><option value="self_employed">Selbstständig</option><option value="pension">Rente</option><option value="child_benefit">Kindergeld</option></Select></div>
                    {m.income_type !== 'none' && (<><div><Label>Brutto (€)</Label><Input type="number" value={m.income_brutto} onChange={e => updateMember(idx, 'income_brutto', e.target.value)} /></div><div><Label>Netto (€)</Label><Input type="number" value={m.income_net} onChange={e => updateMember(idx, 'income_net', e.target.value)} /></div></>)}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <button onClick={addMember} className="mt-6 w-full py-4 border-2 border-dashed border-indigo-200 rounded-xl text-indigo-600 font-bold hover:bg-indigo-50 hover:border-indigo-300 transition flex items-center justify-center gap-2"><span>➕</span> Weitere Person hinzufügen</button>
        </Card>

        <button onClick={handleAnalyze} disabled={loading} className="w-full bg-slate-900 text-white py-5 rounded-2xl font-bold text-xl shadow-xl shadow-slate-300 hover:bg-slate-800 hover:scale-[1.01] transition transform disabled:opacity-70 disabled:scale-100">{loading ? "Berechne Anspruch..." : "Kostenlos Anspruch prüfen ➔"}</button>

        {result && (
          <div id="results-section" className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700 pt-8">
            <div className="grid grid-cols-1 gap-6">
              {result.results.map((res, idx) => {
                let borderClass = 'border-blue-100', bgClass = 'bg-white', textClass = 'text-slate-800', amountClass = 'text-indigo-600';
                if (res.type === 'ALERT') { borderClass = 'border-red-100'; bgClass = 'bg-red-50/50'; textClass = 'text-red-700'; amountClass = 'text-red-600'; }
                else if (res.type === 'SGB2') { borderClass = 'border-emerald-100'; amountClass = 'text-emerald-600'; }
                else if (res.type === 'REJECTED_INCOME') { borderClass = 'border-amber-100'; bgClass = 'bg-amber-50'; amountClass = 'text-slate-400'; }
                return (
                  <div key={idx} className={`p-8 rounded-2xl border shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 ${borderClass} ${bgClass}`}>
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                         {res.type === 'ALERT' && <span className="text-xl">⚠️</span>}
                         {res.type === 'REJECTED_INCOME' && <span className="text-xl">ℹ️</span>}
                         <h4 className={`text-xl font-bold ${textClass}`}>{res.title}</h4>
                      </div>
                      <p className="text-slate-600">{res.text}</p>
                    </div>
                    {(res.amount > 0 || res.type === 'SGB2') && (<div className={`text-3xl font-black ${amountClass}`}>{res.amount.toFixed(2)} €</div>)}
                  </div>
                );
              })}
            </div>
            {result.opportunities && result.opportunities.length > 0 && (
              <div className="bg-slate-900 p-6 md:p-8 rounded-2xl shadow-xl text-white">
                <div className="mb-6"><h3 className="text-xl font-bold text-white">💰 Deine nächsten Schritte</h3><p className="text-slate-400 text-sm">Basierend auf deiner Situation haben wir folgende Möglichkeiten gefunden.</p></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-slate-900">{result.opportunities.map((opp) => (<OpportunityCard key={opp.id} opp={opp} />))}</div>
              </div>
            )}
            <p className="text-center text-xs text-slate-400 mt-8">Hinweis: Dies ist eine Modellrechnung. Keine Rechtsberatung.</p>
          </div>
        )}
        <HelpSection />
      </main>
      <Footer onOpenLegal={setShowLegal} />
      {showLegal && <LegalModal type={showLegal} onClose={() => setShowLegal(null)} />}
    </div>
  );
}