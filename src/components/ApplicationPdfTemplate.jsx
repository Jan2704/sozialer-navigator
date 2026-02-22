import React from 'react';

const ApplicationPdfTemplate = ({ data, authority, benefitLabel }) => {
    const today = new Date().toLocaleDateString('de-DE', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });

    return (
        <div
            id="application-pdf-content"
            className="bg-white text-black p-12 font-serif leading-relaxed max-w-[210mm] mx-auto min-h-[297mm] relative"
            style={{ width: '210mm', height: 'auto' }} // Ensure A4 width context
        >
            {/* Header / Brand */}
            <div className="border-b-2 border-slate-800 pb-4 mb-12 flex justify-between items-end">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Sozialer Navigator</h1>
                    <p className="text-xs text-slate-500 uppercase tracking-widest mt-1">Rechtssicherer Antragsservice</p>
                </div>
                <div className="text-right text-xs text-slate-400">
                    Dokumenten-ID: {Math.random().toString(36).substr(2, 9).toUpperCase()}<br />
                    Datum: {today}
                </div>
            </div>

            {/* Address Block */}
            <div className="flex justify-between mb-16 items-start font-sans">
                {/* Sender (User) - Small above window */}
                <div className="w-[85mm]">
                    <p className="text-[10px] underline text-slate-500 mb-2">
                        {data.firstName} {data.lastName} • {data.street} • {data.zipCode} {data.city}
                    </p>
                    {/* Recipient Field */}
                    <div className="text-sm rounded p-2">
                        <strong>{authority?.name || 'An das zuständige Amt'}</strong><br />
                        {authority?.street}<br />
                        {authority?.zipCity}
                    </div>
                </div>

                {/* Sender Details (Right Side) */}
                <div className="text-right text-sm text-slate-600">
                    <p><strong>{data.firstName} {data.lastName}</strong></p>
                    <p>{data.street}</p>
                    <p>{data.zipCity}</p>
                    <div className="mt-4">
                        <p>E-Mail: {data.email}</p>
                        {data.phone && <p>Tel: {data.phone}</p>}
                    </div>
                </div>
            </div>

            {/* Subject */}
            <h2 className="font-bold text-lg mb-8">
                Formloser Antrag auf {benefitLabel} zur Fristwahrung
            </h2>

            {/* Body Text */}
            <div className="space-y-6 text-justify text-sm text-slate-800 font-sans">
                <p>Sehr geehrte Damen und Herren,</p>

                <p>
                    hiermit beantrage ich Leistungen nach dem
                    {benefitLabel.includes('Bürgergeld') ? ' SGB II (Bürgergeld)' :
                        benefitLabel.includes('Wohngeld') ? ' WoGG (Wohngeld)' :
                            benefitLabel.includes('Grundsicherung') ? ' SGB XII (Grundsicherung)' :
                                ' Sozialgesetzbuch'}
                    sowie alle weiteren in Betracht kommenden Sozialleistungen für mich und die mit mir in einer Bedarfsgemeinschaft lebenden Personen.
                </p>

                <p>
                    Der Antrag erfolgt zur <strong>Wahrung der Frist</strong> zum Ersten des laufenden Monats.
                    Die erforderlichen Unterlagen werde ich nach Aufforderung umgehend nachreichen.
                </p>

                <p>
                    Sollte Ihr Amt örtlich oder sachlich nicht zuständig sein, beantrage ich die Weiterleitung an den zuständigen Leistungsträger gemäß § 16 SGB I.
                    Sollte sich herausstellen, dass ein Anspruch auf eine andere, vorrangige Leistung besteht (z.B. Wohngeld statt Bürgergeld oder umgekehrt),
                    bitte ich, diesen Antrag gem. § 28 SGB X als Antrag auf die entsprechende Leistung zu werten.
                </p>

                <div className="bg-slate-50 p-4 border-l-4 border-slate-800 my-8">
                    <p className="font-bold mb-1">Bankverbindung für Auszahlungen:</p>
                    <p className="text-slate-500 italic text-xs">Wird mit den vollständigen Antragsunterlagen nachgereicht.</p>
                </div>

                <p className="font-bold">
                    Ich bitte um eine schriftliche Eingangsbestätigung dieses Antrags.
                </p>

                <p className="mt-12">Mit freundlichen Grüßen,</p>

                <div className="mt-12 mb-4">
                    <p className="font-script text-2xl text-slate-800" style={{ fontFamily: 'cursive' }}>{data.firstName} {data.lastName}</p>
                    <div className="border-t border-slate-800 w-64 pt-1">
                        <p className="text-xs text-slate-500">(Dieses Schreiben wurde digital erstellt und ist ohne Unterschrift gültig)</p>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="absolute bottom-12 left-12 right-12 border-t border-slate-200 pt-4 text-center text-[10px] text-slate-400">
                <p>Erstellt mit Sozialer Navigator - www.sozialer-navigator.de</p>
            </div>
        </div>
    );
};

export default ApplicationPdfTemplate;
