import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { trackEvent } from '../utils/tracking';

// Verbindung zu Supabase herstellen
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function LeadModal({ isOpen, onClose, type, contextData }) {
  const [step, setStep] = useState(1); 
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', consent: false });

  if (!isOpen) return null;

  // Texte für die verschiedenen Fälle
  const content = {
    legal: {
      icon: '⚖️',
      title: 'Kostenlose Anwaltsprüfung',
      benefit: 'Das Jobcenter macht Fehler. Lass deinen Bescheid prüfen. Die Kosten übernimmt meist der Staat (Beratungshilfe).',
      cta: 'Anspruch jetzt prüfen',
      partnerText: 'einem Partneranwalt'
    },
    education: {
      icon: '🎓',
      title: 'Bildungsgutschein Anspruch',
      benefit: 'Das Amt fördert Weiterbildungen oft zu 100% (Wert bis 20.000 €). Prüfe jetzt deinen Anspruch!',
      cta: 'Förderung prüfen',
      partnerText: 'einem Bildungsträger'
    }
  };

  const currentContent = content[type] || content.legal;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.consent) return alert("Bitte stimme der Kontaktaufnahme zu.");
    
    setIsSubmitting(true);
    trackEvent('lead_submit_start', { type });

    // HIER SENDEN WIR DIE DATEN AN SUPABASE
    const { error } = await supabase.from('leads').insert([{
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      type: type,
      status_sgb2: contextData?.isSGB2 || false,
      consent_given: true,
      status: 'new'
    }]);

    setIsSubmitting(false);

    if (error) {
      console.error("Supabase Error:", error);
      alert("Fehler beim Senden. Bitte prüfe deine Internetverbindung.");
    } else {
      trackEvent('lead_submit_success', { type });
      setStep(3); // Weiter zu Schritt 3 (Danke)
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-black z-10 p-2">✕</button>

        <div className="p-8">
          {/* SCHRITT 1: INFO */}
          {step === 1 && (
            <div className="text-center">
              <div className="text-6xl mb-6">{currentContent.icon}</div>
              <h2 className="text-2xl font-bold mb-3">{currentContent.title}</h2>
              <p className="text-gray-600 mb-6">{currentContent.benefit}</p>
              <div className="bg-green-50 text-green-800 p-4 rounded-xl text-sm font-semibold mb-8 border border-green-100">✅ 100% Kostenübernahme möglich</div>
              <button onClick={() => setStep(2)} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl shadow-lg text-lg">{currentContent.cta}</button>
            </div>
          )}

          {/* SCHRITT 2: FORMULAR */}
          {step === 2 && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <h3 className="text-xl font-bold text-center mb-4">Wohin sollen wir die Infos senden?</h3>
              <input required type="text" placeholder="Name" className="w-full border p-3 rounded-lg" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              <input required type="email" placeholder="E-Mail" className="w-full border p-3 rounded-lg" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
              <input required type="tel" placeholder="Telefon (für Rückfragen)" className="w-full border p-3 rounded-lg" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
              <div className="flex items-start gap-2 text-xs text-gray-600 bg-gray-50 p-2 rounded">
                <input required type="checkbox" className="mt-1" checked={formData.consent} onChange={e => setFormData({...formData, consent: e.target.checked})}/>
                <span>Ich stimme zu, dass mich der Soziale Navigator kontaktieren darf. (Widerruf jederzeit möglich).</span>
              </div>
              <button disabled={isSubmitting} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 rounded-xl shadow-lg mt-2">{isSubmitting ? 'Sende...' : 'Kostenlos anfordern'}</button>
            </form>
          )}

          {/* SCHRITT 3: DANKE */}
          {step === 3 && (
            <div className="text-center py-8">
              <div className="text-6xl mb-6">🎉</div>
              <h3 className="text-2xl font-bold mb-3">Erfolgreich!</h3>
              <p className="text-gray-600 mb-8">Ein Experte prüft deine Situation und meldet sich in Kürze.</p>
              <button onClick={onClose} className="text-blue-600 font-bold underline">Zurück</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}