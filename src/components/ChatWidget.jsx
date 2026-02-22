import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Minus, ChevronRight, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ChatWidget = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [hasStarted, setHasStarted] = useState(false);
    const [inputValue, setInputValue] = useState('');
    const [messages, setMessages] = useState([
        {
            id: 1,
            sender: 'bot',
            text: "Hallo! Ich bin der virtuelle Assistent vom Sozialen Navigator. \n\nIch kann dir Fragen zu Wohngeld, Bürgergeld und mehr beantworten. Wie kann ich helfen?",
            timestamp: new Date(),
            actions: [
                { label: "Anspruch prüfen", action: "open_calculator" },
                { label: "Hilfe anfordern", action: "open_lead_modal" }
            ]
        }
    ]);
    const messagesEndRef = useRef(null);
    const [isTyping, setIsTyping] = useState(false); // Typing indicator state

    // --- SMART BRAIN LOGIC ---
    const Brain = {
        // Rules Engine
        rules: [
            // GREETINGS
            {
                keywords: ['hallo', 'hi', 'guten', 'moin'],
                response: "Hallo! Wie kann ich dich heute unterstützen?",
                actions: []
            },
            // CALCULATOR / RECHNER
            {
                keywords: ['rechner', 'berechnen', 'wieviel', 'höhe', 'bekomme ich'],
                response: "Unser Smart-Calculator kann dir genau sagen, wie viel dir zusteht. Es dauert nur 2 Minuten.",
                actions: [{ label: "Zum Rechner", action: "open_calculator" }]
            },
            // HELP / ANTRAG
            {
                keywords: ['hilfe', 'antrag', 'beantragen', 'formular', 'unterstützung', 'nicht zurecht'],
                response: "Anträge können kompliziert sein. Wir haben Experten, die dir dabei helfen können.",
                actions: [{ label: "Hilfe anfordern", action: "open_lead_modal" }]
            },
            // WOHNGELD BASICS
            {
                keywords: ['wohngeld', 'voraussetzung', 'wer bekommt'],
                response: "Wohngeld ist ein Zuschuss zur Miete für Geringverdiener. \n\nDu hast Anspruch, wenn du:\n1. Genug verdienst, um deinen Lebensunterhalt (ohne Miete) zu decken.\n2. Keine Transferleistungen (wie Bürgergeld) beziehst.",
                actions: [{ label: "Prüfen ob ich Anspruch habe", action: "open_calculator" }]
            },
            // BÜRGERGELD BASICS
            {
                keywords: ['bürgergeld', 'hartz', 'jobcenter', 'arbeitslos'],
                response: "Bürgergeld sichert den Lebensunterhalt, wenn das eigene Einkommen nicht reicht. Der Regelsatz 2026 für Alleinstehende beträgt 563€ + Miete.",
                actions: [{ label: "Bürgergeld-Rechner", action: "open_calculator" }]
            },
            // STUDENTS / AZUBIS
            {
                keywords: ['student', 'studium', 'bafög', 'uni'],
                response: "Als Student hast du meistens Anspruch auf BAföG. Wohngeld gibt es nur, wenn du dem Grunde nach KEIN BAföG bekommen kannst (z.B. Zweitstudium, zu alt).",
                actions: []
            },
            {
                keywords: ['azubi', 'ausbildung', 'lehrling', 'bab'],
                response: "Als Azubi erhältst du oft Berufsausbildungsbeihilfe (BAB). Wenn diese nicht reicht oder abgelehnt wird, kann Wohngeld möglich sein.",
                actions: []
            },
            // RENTNER
            {
                keywords: ['rente', 'rentner', 'altersrente', 'grundsicherung'],
                response: "Viele Rentner haben Anspruch auf Wohngeld (Mietzuschuss) oder Grundsicherung. \n\nWichtig: Wohngeld ist oft höher und hat weniger strenge Vermögensgrenzen als die Grundsicherung.",
                actions: [{ label: "Rentner-Check starten", action: "open_calculator" }]
            },
            // KINDERZUSCHLAG
            {
                keywords: ['kiz', 'kinderzuschlag', 'kinder'],
                response: "Der Kinderzuschlag (KiZ) ist für Eltern, die genug für sich selbst, aber nicht für die Kinder verdienen. Er beträgt bis zu 292€ pro Kind (2026).",
                actions: [{ label: "KiZ prüfen", action: "open_lead_modal_kiz" }]
            },
            // WBS
            {
                keywords: ['wbs', 'wohnberechtigungsschein', 'sozialwohnung'],
                response: "Mit einem Wohnberechtigungsschein (WBS) kannst du in günstigere Sozialwohnungen ziehen. Die Einkommensgrenzen sind ähnlich wie beim Wohngeld.",
                actions: []
            },
            // VERMÖGEN
            {
                keywords: ['vermögen', 'sparbuch', 'erspartes', 'guthaben'],
                response: "Beim Wohngeld sind die Vermögensgrenzen sehr hoch (60.000€ für die erste Person, 30.000€ für jede weitere). \n\nBeim Bürgergeld ist das Schonvermögen geringer (15.000€ nach der Karenzzeit).",
                actions: []
            },
            // MIETSTUFE
            {
                keywords: ['mietstufe', 'stufe'],
                response: "Die Mietstufe richtet sich nach deinem Wohnort. Je teurer die Stadt, desto höher die Stufe (1-7). Das beeinflusst, wie viel Miete bezuschusst wird.",
                actions: []
            }
        ],

        // Default Fallback
        fallback: {
            response: "Das ist eine sehr spezifische Frage. \n\nAm besten prüfst du deinen Anspruch direkt in unserem Rechner – der kennt alle Gesetze im Detail.",
            actions: [{ label: "Jetzt starten", action: "open_calculator" }]
        },

        decide: (text) => {
            const lowerText = text.toLowerCase();

            // Score based matching could be added here, currently first match wins
            for (const rule of Brain.rules) {
                if (rule.keywords.some(k => lowerText.includes(k))) {
                    return { response: rule.response, actions: rule.actions };
                }
            }
            return Brain.fallback;
        }
    };

    const toggleChat = () => setIsOpen(!isOpen);

    const startChat = () => {
        setHasStarted(true);
    };

    // Action Handler
    const executeAction = (actionType) => {
        if (actionType === 'open_calculator') {
            const calcElement = document.getElementById('calculator');
            if (calcElement) calcElement.scrollIntoView({ behavior: 'smooth' });
            // Close chat on mobile to see calculator
            if (window.innerWidth < 768) setIsOpen(false);
        } else if (actionType === 'open_lead_modal') {
            if (window.openLeadModal) window.openLeadModal('application'); // Open "Help" mode
        } else if (actionType === 'open_lead_modal_kiz') {
            if (window.openLeadModal) window.openLeadModal('kiz');
        }
    };

    const handleSendMessage = (e) => {
        if (e) e.preventDefault();
        if (!inputValue.trim()) return;

        const newUserMessage = {
            id: Date.now(),
            sender: 'user',
            text: inputValue,
            timestamp: new Date()
        };

        setMessages(prev => [...prev, newUserMessage]);
        setInputValue('');
        setIsTyping(true);

        // Simulate Neural Delay
        const thinkingTime = Math.min(1000, 500 + Math.random() * 800);

        setTimeout(() => {
            const decision = Brain.decide(newUserMessage.text);

            const botResponse = {
                id: Date.now() + 1,
                sender: 'bot',
                text: decision.response,
                actions: decision.actions,
                timestamp: new Date()
            };
            setMessages(prev => [...prev, botResponse]);
            setIsTyping(false);
        }, thinkingTime);
    };

    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, isOpen, isTyping]);

    return (
        <div className="fixed bottom-6 right-6 md:right-24 z-[100] flex flex-col items-end print:hidden">
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="mb-4 w-[90vw] md:w-[380px] bg-white rounded-sm shadow-2xl border border-slate-200 overflow-hidden flex flex-col font-sans"
                        style={{ height: '600px', maxHeight: '80vh' }}
                    >
                        {/* Header */}
                        <div className="bg-brand-navy p-4 flex justify-between items-start border-b border-brand-gold/20 relative">
                            <div className="flex gap-2">
                                <div className="p-2 bg-brand-navy/50 rounded-full text-brand-gold border border-brand-gold/20">
                                    <Sparkles size={16} />
                                </div>
                            </div>

                            {/* Agent Profile */}
                            <div className="absolute left-1/2 top-6 -translate-x-1/2 flex flex-col items-center pointer-events-none">
                                <div className="bg-brand-navy p-1 rounded-full shadow-lg mb-2 relative border border-brand-gold/30">
                                    <div className="w-12 h-12 bg-slate-800 rounded-full overflow-hidden flex items-center justify-center text-slate-400">
                                        <div className="w-12 h-12 bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center">
                                            <div className="w-2 h-2 bg-brand-gold rounded-full animate-pulse shadow-[0_0_10px_#C5A67C]"></div>
                                        </div>
                                    </div>
                                    <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-brand-navy rounded-full"></div>
                                </div>
                                <div className="text-center">
                                    <h3 className="font-serif text-white text-lg leading-tight tracking-wide">Sozialer Navigator</h3>
                                    <span className="text-xs text-brand-gold/80 font-medium uppercase tracking-widest">Digitaler Assistent</span>
                                </div>
                            </div>

                            {/* Minimize */}
                            <button onClick={toggleChat} className="p-2 hover:bg-white/10 rounded-full text-white/60 transition-colors">
                                <Minus size={24} />
                            </button>
                        </div>

                        {/* Chat Body */}
                        <div className="flex-1 overflow-y-auto p-4 bg-slate-50 scrollbar-thin scrollbar-thumb-slate-200">
                            <div className="flex flex-col gap-4 mt-6">
                                <div className="text-center text-xs text-slate-400 my-4 uppercase tracking-widest">Heute</div>

                                {messages.map((msg) => (
                                    <div
                                        key={msg.id}
                                        className={`flex flex-col w-full mb-2 ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                                    >
                                        <div className={`flex max-w-[85%] ${msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                                            {/* Avatar for Bot */}
                                            {msg.sender === 'bot' && (
                                                <div className="w-8 h-8 rounded-full bg-brand-navy flex-shrink-0 mr-2 flex items-center justify-center border border-brand-gold/30 mt-auto text-brand-gold">
                                                    <div className="w-4 h-4 rounded-full border border-brand-gold/50"></div>
                                                </div>
                                            )}

                                            <div
                                                className={`p-4 rounded-sm text-sm leading-relaxed shadow-sm whitespace-pre-wrap ${msg.sender === 'user'
                                                    ? 'bg-brand-gold text-brand-navy rounded-tr-none font-medium'
                                                    : 'bg-white text-slate-700 rounded-tl-none border border-slate-100'
                                                    }`}
                                            >
                                                {msg.text}
                                            </div>
                                        </div>

                                        {/* Actions Buttons (only for bot) */}
                                        {msg.sender === 'bot' && msg.actions && msg.actions.length > 0 && (
                                            <div className="flex flex-wrap gap-2 mt-2 ml-10">
                                                {msg.actions.map((act, i) => (
                                                    <button
                                                        key={i}
                                                        onClick={() => executeAction(act.action)}
                                                        className="px-4 py-2 bg-white border border-brand-navy/10 text-brand-navy text-xs font-bold uppercase tracking-wider rounded-sm hover:bg-brand-navy hover:text-white transition-all shadow-sm flex items-center gap-1 group"
                                                    >
                                                        {act.label} <ChevronRight size={12} className="group-hover:translate-x-1 transition-transform" />
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}

                                {/* Typing Indicator */}
                                {isTyping && (
                                    <div className="flex justify-start w-full mb-2">
                                        <div className="w-8 h-8 rounded-full bg-brand-navy flex-shrink-0 mr-2 flex items-center justify-center border border-brand-gold/30 mt-auto">
                                            <div className="w-4 h-4 rounded-full border border-brand-gold/50 opacity-50"></div>
                                        </div>
                                        <div className="bg-white px-4 py-3 rounded-sm rounded-tl-none border border-slate-100 shadow-sm flex items-center gap-1">
                                            <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></div>
                                            <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-100"></div>
                                            <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-200"></div>
                                        </div>
                                    </div>
                                )}

                                <div ref={messagesEndRef} />
                            </div>
                        </div>

                        {/* Footer / Input Area */}
                        <div className="p-4 bg-white border-t border-slate-100">
                            {!hasStarted ? (
                                <button
                                    onClick={startChat}
                                    className="w-full py-4 bg-brand-navy hover:bg-slate-800 text-white rounded-sm font-serif font-medium shadow-md transition-all active:scale-[0.99] text-center flex items-center justify-center gap-2 border-b-2 border-brand-gold"
                                >
                                    <MessageCircle size={18} className="text-brand-gold" />
                                    <span>Beratung starten</span>
                                </button>
                            ) : (
                                <form onSubmit={handleSendMessage} className="flex gap-2 items-center">
                                    <input
                                        type="text"
                                        value={inputValue}
                                        onChange={(e) => setInputValue(e.target.value)}
                                        placeholder="Ihre Frage..."
                                        className="flex-1 bg-slate-50 border border-slate-200 rounded-sm px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-brand-gold transition-all text-slate-800 placeholder:text-slate-400 font-light"
                                        autoFocus
                                    />
                                    <button
                                        type="submit"
                                        disabled={!inputValue.trim()}
                                        className="p-3 bg-brand-navy text-brand-gold rounded-sm hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                                    >
                                        <Send size={18} />
                                    </button>
                                </form>
                            )}
                            <div className="text-center mt-3">
                                <span className="text-[10px] text-slate-300 font-normal uppercase tracking-widest flex items-center justify-center gap-1">
                                    Sozialer Navigator AI • 2026
                                </span>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Floating Action Button */}
            <motion.button
                onClick={toggleChat}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`p-4 rounded-full shadow-2xl transition-all duration-300 z-50 flex items-center justify-center border-2 border-white/10 ${isOpen ? 'bg-white text-brand-navy' : 'bg-brand-navy text-white shadow-brand-navy/40'
                    }`}
                aria-label="Chat öffnen"
            >
                {isOpen ? <X size={24} /> : (
                    <div className="relative">
                        <MessageCircle size={28} className="text-brand-gold" strokeWidth={1.5} />
                        {/* Notification Dot */}
                        {!hasStarted && (
                            <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500 border border-brand-navy"></span>
                            </span>
                        )}
                    </div>
                )}
            </motion.button>
        </div>
    );
};

export default ChatWidget;
