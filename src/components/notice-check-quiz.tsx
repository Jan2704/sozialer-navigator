import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const questions = [
    {
        id: 'rent',
        text: 'Wohnkosten',
        subtext: 'Miete oder Heizkosten nicht voll übernommen?',
        icon: '🏠'
    },
    {
        id: 'income',
        text: 'Einkommen',
        subtext: 'Wurde Einkommen angerechnet?',
        icon: '💶'
    },
    {
        id: 'sanction',
        text: 'Sanktionen',
        subtext: 'Bürokratische Kürzungen erhalten?',
        icon: '📉'
    },
    {
        id: 'other',
        text: 'Sonstiges',
        subtext: 'Einmalige Bedarfe oder Darlehen abgelehnt?',
        icon: '📋'
    }
];

export default function NoticeCheckQuiz() {
    const [step, setStep] = useState('start'); // start, quiz, result
    const [issues, setIssues] = useState<string[]>([]);

    const toggleIssue = (id: string) => {
        setIssues(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handleStart = () => {
        setStep('quiz');
    }

    const handleResult = () => {
        setStep('result');
    }

    return (
        <div className="w-full">
            <AnimatePresence mode="wait">

                {step === 'start' && (
                    <motion.div
                        key="start"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="bg-white/95 backdrop-blur-md p-8 md:p-10 rounded-sm shadow-2xl shadow-black/20 text-center border-t-4 border-[#c5a67c]"
                    >
                        <h3 className="text-2xl font-serif text-[#0a1628] mb-4">
                            Vorab-Prüfung
                        </h3>
                        <p className="text-slate-600 mb-8 font-light text-sm leading-relaxed">
                            Prüfen Sie in 30 Sekunden unverbindlich, ob formale Fehler vorliegen könnten.
                        </p>

                        <button
                            onClick={handleStart}
                            className="w-full py-4 bg-[#0a1628] text-white hover:bg-[#112340] transition-colors font-medium tracking-wide text-sm uppercase"
                        >
                            Jetzt Prüfung starten
                        </button>
                        <p className="mt-4 text-[10px] text-slate-400 uppercase tracking-widest">Kostenlos & Anonym</p>
                    </motion.div>
                )}

                {step === 'quiz' && (
                    <motion.div
                        key="quiz"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="bg-white p-8 md:p-10 rounded-sm shadow-2xl shadow-black/20 border-t-4 border-[#c5a67c]"
                    >
                        <div className="mb-6 text-center">
                            <h3 className="text-xl font-serif text-[#0a1628]">Sachverhalt wählen</h3>
                            <div className="h-0.5 w-8 bg-[#c5a67c] mx-auto mt-3"></div>
                        </div>

                        <div className="grid gap-3 mb-8">
                            {questions.map((q) => (
                                <button
                                    key={q.id}
                                    onClick={() => toggleIssue(q.id)}
                                    className={`w-full text-left p-4 border transition-all duration-300 flex items-center gap-4 group ${issues.includes(q.id)
                                        ? 'border-[#c5a67c] bg-[#c5a67c]/5'
                                        : 'border-slate-200 hover:border-[#c5a67c]/50'
                                        }`}
                                >
                                    <span className="text-2xl opacity-80 group-hover:scale-110 transition-transform">{q.icon}</span>
                                    <div className="flex-1">
                                        <div className={`font-medium text-sm transition-colors ${issues.includes(q.id) ? 'text-[#0a1628]' : 'text-slate-700'}`}>
                                            {q.text}
                                        </div>
                                        <div className="text-xs text-slate-500 font-light mt-0.5">
                                            {q.subtext}
                                        </div>
                                    </div>
                                    {issues.includes(q.id) && <span className="text-[#c5a67c]">✓</span>}
                                </button>
                            ))}
                        </div>

                        <div className="flex gap-4">
                            <button
                                onClick={() => setIssues([])}
                                className="flex-1 py-3 text-xs text-slate-400 hover:text-[#0a1628] transition-colors border border-transparent hover:border-slate-200"
                            >
                                Zurücksetzen
                            </button>
                            <button
                                onClick={handleResult}
                                disabled={issues.length === 0}
                                className="flex-[2] py-3 bg-[#0a1628] text-white hover:bg-[#112340] transition-colors font-medium tracking-wide text-xs uppercase disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Weiter
                            </button>
                        </div>
                    </motion.div>
                )}

                {step === 'result' && (
                    <motion.div
                        key="result"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="bg-white p-8 md:p-10 rounded-sm shadow-2xl shadow-black/20 text-center border-t-4 border-[#c5a67c]"
                    >
                        <div className="mb-6">
                            <div className="w-16 h-16 bg-[#c5a67c]/10 rounded-full flex items-center justify-center text-[#c5a67c] text-3xl mx-auto mb-4 border border-[#c5a67c]/20">
                                ⚖️
                            </div>

                            <h3 className="text-xl font-serif text-[#0a1628] mb-2">
                                Handlungsbedarf erkannt.
                            </h3>
                            <p className="text-slate-600 text-sm font-light leading-relaxed mb-6">
                                In {issues.length} Bereichen liegen Anhaltspunkte für Fehler vor. Wir empfehlen eine anwaltliche Tiefenprüfung.
                            </p>
                        </div>

                        <div className="mb-8">
                            <button
                                onClick={() => (window as any).openLeadModal('legal_help')}
                                className="w-full py-4 bg-[#c5a67c] hover:bg-[#b0946b] text-white text-lg font-bold rounded-xl shadow-lg shadow-[#c5a67c]/20 transition-all transform hover:-translate-y-1"
                            >
                                Kostenlose Ersteinschätzung anfordern
                            </button>
                            <p className="text-xs text-slate-400 mt-3">Unverbindlich & Staatlich gefördert</p>
                        </div>
                    </motion.div>
                )}

            </AnimatePresence>
        </div>
    );
}
