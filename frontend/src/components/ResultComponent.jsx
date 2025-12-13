import { useState } from 'react';
import LeadModal from './LeadModal';
import { trackEvent } from '../utils/tracking';

// Dein funktionierender DSL-Link (Strom kommt später wieder dazu)
const LINK_DSL = "https://a.check24.net/misc/click.php?pid=1163556&aid=18&deep=dsl-anbieterwechsel&cat=4&tid=sozialer-navigator";

export default function ResultComponent({ resultData }) {
  // Wir holen uns den Betrag aus den Daten (oder nehmen 0, falls leer)
  const calculatedAmount = resultData?.amount || 0;
  const isSGB2 = resultData?.type === 'SGB2'; // Prüfen, ob Bürgergeld-Fall

  const [feedback, setFeedback] = useState(null); // Welchen Button hat er geklickt?
  const [modalState, setModalState] = useState({ isOpen: false, type: 'legal' });

  // Funktion: Wenn einer der 3 Buttons geklickt wird
  const handleSelection = (selection) => {
    setFeedback(selection);
    trackEvent('result_feedback_selected', { selection });
  };

  // Funktion: Modal öffnen
  const openModal = (type) => {
    setModalState({ isOpen: true, type });
    trackEvent('lead_modal_opened', { type });
  };

  return (
    <div className="max-w-xl mx-auto space-y-8 mt-8 animate-fade-in">
      
      {/* 1. DAS ERGEBNIS-FENSTER */}
      <div className="bg-white border border-gray-200 rounded-3xl p-8 text-center shadow-lg relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-400 to-blue-600"></div>
        <p className="text-gray-500 uppercase text-xs font-bold tracking-wider mb-3">Dein geschätzter Anspruch</p>
        <div className="text-6xl font-extrabold text-gray-900 mb-2 tracking-tight">
          {calculatedAmount.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €
        </div>
        <p className="text-gray-400 text-sm">pro Monat (Regelsatz + Miete)</p>
      </div>

      {/* 2. DIE FRAGE: PASST DAS? */}
      <div>
        <h3 className="text-center text-lg font-semibold text-gray-800 mb-5">
          Passt dieses Ergebnis zu deinem Bescheid?
        </h3>

        {/* Die 3 Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          <FeedbackButton 
            active={feedback === 'rejected'} 
            onClick={() => handleSelection('rejected')}
            icon="❌" 
            label="Nein, abgelehnt"
            colorClass="red"
          />
          <FeedbackButton 
            active={feedback === 'no_app'} 
            onClick={() => handleSelection('no_app')}
            icon="📝" 
            label="Noch kein Antrag"
            colorClass="blue"
          />
          <FeedbackButton 
            active={feedback === 'match'} 
            onClick={() => handleSelection('match')}
            icon="✅" 
            label="Ja, passt genau"
            colorClass="green"
          />
        </div>

        {/* 3. WAS PASSIERT JETZT? (Die Action Cards) */}
        
        {/* FALL A: WUT (Abgelehnt/Weniger) -> ANWALT */}
        {feedback === 'rejected' && (
          <ActionCard 
            color="red"
            icon="⚖️"
            title="Achtung: Widerspruch prüfen!"
            text="In über 50 % der Fälle sind Ablehnungen fehlerhaft. Lass das kostenlos prüfen."
            btnText="Kostenlose Prüfung anfordern"
            onClick={() => openModal('legal')}
          />
        )}

        {/* FALL B: UNSICHER (Kein Antrag) -> BILDUNG */}
        {feedback === 'no_app' && (
          <ActionCard 
            color="blue"
            icon="🎓"
            title="Tipp: Bildungsgutschein"
            text="Wenn du noch keinen Job hast: Das Amt übernimmt oft 100% der Kosten für Weiterbildungen."
            btnText="Chancen auf Förderung prüfen"
            onClick={() => openModal('education')}
          />
        )}

        {/* FALL C: HAPPY (Passt) -> CHECK24 */}
        {feedback === 'match' && (
          <ActionCard 
            color="green"
            icon="💰"
            title="Perfekt! Zeit zum Optimieren."
            text="Da dein Bescheid stimmt, senke jetzt deine Fixkosten für Internet & Co."
            btnText="Vergleichen & Sparen"
            onClick={() => window.open(LINK_DSL, '_blank')}
          />
        )}
      </div>

      {/* Das Modal (im Hintergrund versteckt, bis es gebraucht wird) */}
      <LeadModal 
        isOpen={modalState.isOpen} 
        onClose={() => setModalState({ ...modalState, isOpen: false })} 
        type={modalState.type}
        contextData={{ isSGB2 }}
      />
    </div>
  );
}

// --- Hilfs-Bausteine (damit der Code oben sauber bleibt) ---

function FeedbackButton({ active, onClick, icon, label, colorClass }) {
  const styles = {
    red: active ? 'border-red-500 bg-red-50 text-red-700 shadow-md' : 'hover:border-red-200',
    blue: active ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-md' : 'hover:border-blue-200',
    green: active ? 'border-green-500 bg-green-50 text-green-700 shadow-md' : 'hover:border-green-200',
  };

  return (
    <button
      onClick={onClick}
      className={`p-4 rounded-xl border-2 text-sm font-medium transition-all flex flex-col items-center gap-2 bg-white text-gray-600 ${active ? 'transform scale-105' : 'border-gray-100'} ${styles[colorClass]}`}
    >
      <span className="text-2xl">{icon}</span>
      <span>{label}</span>
    </button>
  );
}

function ActionCard({ color, icon, title, text, btnText, onClick }) {
  const theme = {
    red: { border: 'border-red-500', bg: 'bg-red-50', btn: 'bg-red-600 hover:bg-red-700' },
    blue: { border: 'border-blue-500', bg: 'bg-blue-50', btn: 'bg-blue-600 hover:bg-blue-700' },
    green: { border: 'border-green-500', bg: 'bg-green-50', btn: 'bg-green-600 hover:bg-green-700' },
  };
  const t = theme[color];

  return (
    <div className={`border-l-4 rounded-r-xl shadow-lg p-6 bg-white mt-4 ${t.border} ${t.bg} bg-opacity-20`}>
      <div className="flex flex-col sm:flex-row gap-4 items-start">
        <div className="text-4xl p-2 bg-white rounded-full shadow-sm">{icon}</div>
        <div className="flex-1">
          <h4 className="font-bold text-lg mb-2 text-gray-900">{title}</h4>
          <p className="text-gray-600 mb-5 text-sm">{text}</p>
          <button onClick={onClick} className={`w-full sm:w-auto ${t.btn} text-white font-bold py-3 px-8 rounded-lg shadow-md transition-colors`}>
            {btnText}
          </button>
        </div>
      </div>
    </div>
  );
}