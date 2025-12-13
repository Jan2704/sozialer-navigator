import { createClient } from '@supabase/supabase-js';
import { useState } from 'react';

// --- SICHERHEITS-CHECK START ---
// Wir holen die Schlüssel. Wenn sie beim Bauen fehlen, bleibt supabase 'null',
// statt die App zum Absturz zu bringen.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = (supabaseUrl && supabaseKey)
  ? createClient(supabaseUrl, supabaseKey)
  : null;
// --- SICHERHEITS-CHECK ENDE ---

export default function LeadModal({ isOpen, onClose, selectedResult }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    consent: false
  });
  const [status, setStatus] = useState('idle'); // idle, loading, success, error

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Falls Supabase nicht verbunden ist (z.B. Schlüssel fehlen)
    if (!supabase) {
      alert("Datenbank-Verbindung fehlt! Bitte Schlüssel prüfen.");
      return;
    }

    setStatus('loading');

    const { error } = await supabase
      .from('leads')
      .insert([
        {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          consent_given: formData.consent,
          type: selectedResult?.type || 'unknown', // Speichert ob 'legal' oder 'education' geklickt wurde
          status_sgb2: true // Wir nehmen an, sie haben SGB II bejaht
        }
      ]);

    if (error) {
      console.error('Fehler:', error);
      setStatus('error');
    } else {
      setStatus('success');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden relative">
        
        {/* Schließen Button X oben rechts */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          ✕
        </button>

        <div className="p-8">
          
          {/* ERFOLGS-MELDUNG */}
          {status === 'success' ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-100 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">
                ✓
              </div>
              <h3 className="text-2xl font-bold text-gray-800 mb-2">Anfrage erhalten!</h3>
              <p className="text-gray-600 mb-6">
                Vielen Dank, {formData.name}. Wir prüfen deinen Fall und melden uns schnellstmöglich.
              </p>
              <button 
                onClick={onClose}
                className="w-full bg-green-500 text-white py-3 rounded-xl font-bold hover:bg-green-600 transition shadow-lg"
              >
                Alles klar
              </button>
            </div>
          ) : (
            
            /* DAS FORMULAR */
            <>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Kostenlose Prüfung anfordern</h2>
              <p className="text-gray-500 text-sm mb-6">
                Fülle das Formular aus, damit wir deinen Anspruch prüfen können.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Dein Name</label>
                  <input 
                    type="text" 
                    required
                    className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition"
                    placeholder="Max Mustermann"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">E-Mail Adresse</label>
                  <input 
                    type="email" 
                    required
                    className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition"
                    placeholder="max@beispiel.de"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                  />
                </div>

                {/* Telefon (Optional) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Telefonnummer (für Rückfragen)</label>
                  <input 
                    type="tel" 
                    className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition"
                    placeholder="0171 12345678"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  />
                </div>

                {/* Datenschutz Checkbox */}
                <div className="flex items-start gap-3 mt-4">
                  <input 
                    type="checkbox" 
                    required
                    id="consent"
                    className="mt-1 w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                    checked={formData.consent}
                    onChange={(e) => setFormData({...formData, consent: e.target.checked})}
                  />
                  <label htmlFor="consent" className="text-xs text-gray-500 leading-snug">
                    Ich stimme zu, dass meine Angaben zur Kontaktaufnahme und Zuordnung für eventuelle Rückfragen dauerhaft gespeichert werden.
                  </label>
                </div>

                {/* Absenden Button */}
                <button 
                  type="submit" 
                  disabled={status === 'loading'}
                  className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition shadow-lg mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {status === 'loading' ? 'Wird gesendet...' : 'Kostenlos prüfen lassen'}
                </button>
                
                {status === 'error' && (
                  <p className="text-red-500 text-center text-sm mt-2">Es gab einen Fehler. Bitte versuche es noch einmal.</p>
                )}
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}