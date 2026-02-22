import React from 'react';
import { Check, FileText, Clock, ShieldCheck, Download } from 'lucide-react';

export default function ResultRoadmap({ completedSteps = [] }) {
    // Helpers to check status
    const isDone = (step) => completedSteps.includes(step);

    return (
        <div id="result-roadmap" className="mt-8 mb-16 relative">

            <div className="absolute -left-10 top-0 w-64 h-full bg-slate-50/50 blur-3xl pointer-events-none"></div>

            <h3 className="font-serif text-2xl font-bold text-[#0a1628] mb-10 flex items-center gap-3 relative z-10">
                <span className="bg-[#0a1628] text-[#c5a67c] w-10 h-10 rounded-xl flex items-center justify-center shadow-lg shadow-slate-200/50">
                    <FileText className="w-5 h-5" />
                </span>
                Ihr Fahrplan zum Antrag
            </h3>

            <div className="relative space-y-8 pl-4 md:pl-0">

                {/* Vertical Connector Line */}
                <div className="absolute left-8 md:left-1/2 top-6 bottom-6 w-0.5 bg-gradient-to-b from-[#0a1628] via-slate-300 to-slate-200 -translate-x-1/2 hidden md:block"></div>
                <div className="absolute left-4 top-6 bottom-6 w-0.5 bg-gradient-to-b from-[#0a1628] to-slate-200 md:hidden"></div>

                {/* Step 1: Formloser Antrag */}
                <div className={`relative flex flex-col md:flex-row items-start md:items-center gap-6 md:gap-0 group ${isDone(1) ? 'opacity-80' : ''}`}>
                    <div className="md:w-1/2 md:pr-16 md:text-right order-2 md:order-1">
                        <div className={`backdrop-blur-md border p-6 rounded-2xl shadow-sm transition-all duration-300 relative group-hover:-translate-y-1 ${isDone(1) ? 'bg-[#f8fafc] border-emerald-200' : 'bg-white border-slate-200/60 hover:shadow-md hover:border-[#0a1628]/30'}`}>
                            <h4 className={`font-bold text-lg mb-2 transition-colors ${isDone(1) ? 'text-[#0a1628]' : 'text-[#0a1628]'}`}>
                                {isDone(1) ? '1. Formloser Antrag erledigt' : '1. Formlosen Antrag stellen'}
                            </h4>
                            <p className="text-sm text-slate-600 leading-relaxed font-medium">
                                {isDone(1)
                                    ? "Klasse! Sie haben den Antrag fristwahrend versendet. Der wichtigste Schritt ist getan."
                                    : "Senden Sie sofort eine formlose E-Mail an Ihre Behörde (Textvorlage unten). Damit sichern Sie Ihren Anspruch rückwirkend für den gesamten Monat!"
                                }
                            </p>
                            {!isDone(1) && (
                                <div className="mt-3 pt-3 border-t border-slate-100">
                                    <p className="text-xs text-slate-500">
                                        <span className="font-bold text-[#c5a67c]">Das passiert danach: </span>
                                        Die Behörde bestätigt den Eingang und sendet Ihnen die offiziellen Antragsformulare per Post.
                                    </p>
                                </div>
                            )}
                            {/* Arrow for Desktop */}
                            <div className={`hidden md:block absolute top-1/2 -right-3 w-4 h-4 border-t border-r transform rotate-45 -translate-y-1/2 transition-colors ${isDone(1) ? 'bg-[#f8fafc] border-emerald-200' : 'bg-white border-slate-200/60 group-hover:border-[#0a1628]/30'}`}></div>
                        </div>
                    </div>

                    {/* Icon: Number 1 */}
                    <div className={`absolute left-4 md:left-1/2 w-10 h-10 rounded-full border-4 shadow-lg z-10 transform -translate-x-1/2 flex items-center justify-center font-bold text-sm order-1 md:order-2 transition-transform duration-300 ${isDone(1) ? 'bg-emerald-500 border-white text-white shadow-emerald-100' : 'bg-[#0a1628] text-white border-white shadow-slate-200 uppercase group-hover:scale-110'}`}>
                        {isDone(1) ? <Check className="w-5 h-5" /> : '1'}
                    </div>

                    <div className="md:w-1/2 md:pl-16 order-3">
                        <div className="hidden md:flex items-center gap-2">
                            {isDone(1) ? (
                                <span className="px-3 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-bold uppercase tracking-wider rounded-full border border-emerald-200">
                                    Erledigt
                                </span>
                            ) : (
                                <span className="px-3 py-1 bg-[#0a1628] text-[#c5a67c] text-[10px] font-bold uppercase tracking-wider rounded-full shadow-sm">
                                    Wichtigster Schritt
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Step 2: Antrag einreichen */}
                <div className="relative flex flex-col md:flex-row items-start md:items-center gap-6 md:gap-0 group">
                    <div className="md:w-1/2 md:pr-16 md:text-right order-2 md:order-1">
                        <div className="hidden md:block text-[10px] font-bold text-slate-400 uppercase tracking-widest group-hover:text-[#c5a67c] transition-colors">Dokumente</div>
                    </div>

                    {/* Icon: Number 2 */}
                    <div className="absolute left-4 md:left-1/2 w-10 h-10 rounded-full bg-slate-50 text-slate-400 border-4 border-white shadow-sm z-10 transform -translate-x-1/2 flex items-center justify-center font-bold text-sm order-1 md:order-2 group-hover:bg-[#0a1628] group-hover:text-white group-hover:border-white transition-all duration-300">
                        2
                    </div>

                    <div className="md:w-1/2 md:pl-16 order-3">
                        <div className="bg-white border border-slate-200/60 p-6 rounded-2xl shadow-sm hover:shadow-md hover:border-[#0a1628]/30 transition-all duration-300 relative group-hover:-translate-y-1">
                            <h4 className="font-bold text-[#0a1628] text-lg mb-2 transition-colors">2. Unterlagen vorbereiten</h4>
                            <p className="text-sm text-slate-500 leading-relaxed font-medium mb-4">
                                Reichen Sie das offizielle Formular und Nachweise (Mietvertrag, Einkommen) nach.
                            </p>
                            {/* Arrow for Desktop */}
                            <div className="hidden md:block absolute top-1/2 -left-3 w-4 h-4 bg-white border-b border-l border-slate-200/60 transform rotate-45 -translate-y-1/2 group-hover:border-[#0a1628]/30 transition-colors"></div>
                        </div>
                    </div>
                </div>

                {/* Step 3: Bearbeitung / Experte */}
                <div className="relative flex flex-col md:flex-row items-start md:items-center gap-6 md:gap-0 group">
                    <div className="md:w-1/2 md:pr-16 md:text-right order-2 md:order-1">
                        <div className="bg-white border border-slate-200/60 p-6 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 relative group-hover:-translate-y-1">
                            <h4 className="font-bold text-[#0a1628] text-lg mb-2">3. Bearbeitung & Geduld</h4>
                            <p className="text-sm text-slate-500 leading-relaxed font-medium">
                                Die Bearbeitung dauert oft <span className="text-amber-600 font-bold">mehrere Monate</span>. Fehlende Unterlagen verzögern die Auszahlung weiter!
                            </p>
                            {/* Arrow for Desktop */}
                            <div className="hidden md:block absolute top-1/2 -right-3 w-4 h-4 bg-white border-t border-r border-slate-200/60 transform rotate-45 -translate-y-1/2"></div>
                        </div>
                    </div>

                    {/* Icon: Number 3 */}
                    <div className="absolute left-4 md:left-1/2 w-10 h-10 rounded-full bg-slate-50 text-slate-400 border-4 border-white shadow-sm z-10 transform -translate-x-1/2 flex items-center justify-center font-bold text-sm order-1 md:order-2">
                        3
                    </div>

                    <div className="md:w-1/2 md:pl-16 order-3 pt-6 md:pt-0">
                        <p className="text-[11px] text-slate-500 font-medium">
                            <span className="font-bold text-[#c5a67c]">Tipp: </span>Nutzen Sie unsere kostenlose Checkliste (siehe unten), um Rückfragen zu vermeiden.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
