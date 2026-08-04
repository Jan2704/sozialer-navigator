import React, { useState } from 'react';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { ShieldCheck, Lock, Download, ChevronRight, FileText } from 'lucide-react';
import { cn } from '../lib/utils';
import { getAuthority } from '../utils/get-authority';

const STATUS_LABELS = {
  employee: 'Angestellt / Arbeitnehmer',
  self_employed: 'Selbstständig',
  unemployed_sgb2: 'Arbeitslos (Bürgergeld-Bezug)',
  unemployed_sgb3: 'Arbeitslos (ALG I Bezug)',
  seeking_work: 'Arbeitssuchend / Ohne Bezüge',
  student: 'Student(in)',
  trainee: 'Auszubildende(r) / Schüler',
  pensioner: 'Rentner / Pensionär',
  asylum_seeker: 'Asylbewerber(in)'
};

export function TrustPdfGenerator({ result }) {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    street: '',
    zipCity: ''
  });
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGenerated, setIsGenerated] = useState(false);
  const [error, setError] = useState('');
  const [benefitType, setBenefitType] = useState('Wohngeld');
  const [savedState, setSavedState] = useState(null);

  // Load type from URL on mount and state from sessionStorage
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('type')) {
        setBenefitType(params.get('type'));
      }
      
      const stored = sessionStorage.getItem('sozialerNavigatorState');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setSavedState(parsed);
          
          // Auto-fill zipCity from saved state
          if (parsed.input && parsed.input.city) {
            setFormData(prev => ({
              ...prev,
              zipCity: `${parsed.input.city.plz} ${parsed.input.city.stadt}`
            }));
          }
        } catch (e) {
          console.error("Failed to parse saved state", e);
        }
      }
    }
  }, []);

  const isWohngeld = benefitType.toLowerCase().includes('wohngeld') || benefitType.toLowerCase().includes('lastenzuschuss');
  
  const handleGenerate = async (e) => {
    e.preventDefault();
    setIsGenerating(true);
    setError('');

    try {
      let pdfDoc;

      if (isWohngeld) {
        // No official, address-matching Wohngeld form template exists (every Wohngeldbehörde
        // has its own form). Generate a proper "formloser Antrag" letter from scratch instead
        // of filling a static Munich-only sample that carried a baked-in fake sender/recipient/
        // signature and whose AcroForm fields overlapped that fake text.
        pdfDoc = await PDFDocument.create();
        const page = pdfDoc.addPage([595.28, 841.89]); // A4
        const { width, height } = page.getSize();
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
        const colorPrimary = rgb(0.04, 0.09, 0.16);
        const colorGray = rgb(0.4, 0.4, 0.4);
        const marginX = 70.87;
        const rightMargin = width - 70.87;

        const zipMatch = formData.zipCity.match(/^(\d{5})\s*(.*)$/);
        const plz = zipMatch ? zipMatch[1] : '';
        const cityName = zipMatch ? zipMatch[2] : formData.zipCity;
        const { authority } = getAuthority(cityName, plz, 'wohngeld');

        // Sender (top right)
        let sy = height - 60;
        [[`${formData.firstName} ${formData.lastName}`, true], [formData.street, false], [formData.zipCity, false]]
          .forEach(([text, bold]) => {
            if (!text) return;
            page.drawText(text, { x: width - 210, y: sy, size: 11, font: bold ? fontBold : font, color: colorPrimary });
            sy -= 14;
          });

        // Recipient
        let y = height - 160;
        page.drawText(authority.name, { x: marginX, y, size: 12, font: fontBold, color: colorPrimary });
        y -= 18;
        page.drawText(authority.address || `Zuständige Wohngeldbehörde ${cityName}`, { x: marginX, y, size: 11, font, color: colorPrimary });

        // Date
        const dateText = `Datum: ${new Date().toLocaleDateString('de-DE')}`;
        page.drawText(dateText, { x: rightMargin - font.widthOfTextAtSize(dateText, 11), y: height - 240, size: 11, font, color: colorPrimary });

        // Subject + body
        y = height - 290;
        const drawAt = (text, opts = {}) => {
          page.drawText(text, { x: marginX, y, size: opts.size || 11, font: opts.bold ? fontBold : font, color: colorPrimary });
          y -= opts.lineHeight || 16;
        };
        drawAt(`Betreff: Formloser Antrag auf ${benefitType} zur Fristwahrung`, { bold: true, size: 13, lineHeight: 35 });
        drawAt('Sehr geehrte Damen und Herren,', { lineHeight: 35 });

        const wrap = (text) => {
          const words = text.split(' ');
          let line = '';
          for (const word of words) {
            const test = line ? `${line} ${word}` : word;
            if (font.widthOfTextAtSize(test, 11) < rightMargin - marginX) {
              line = test;
            } else {
              drawAt(line);
              line = word;
            }
          }
          drawAt(line);
        };
        wrap(`Hiermit stelle ich formlos einen Antrag auf ${benefitType} zur Wahrung der gesetzlichen Fristen.`);
        y -= 10;
        wrap('Dieser Antrag dient der Sicherung meiner Ansprüche mit sofortiger Wirkung für den aktuellen Kalendermonat.');
        y -= 25;
        drawAt('Um das Verfahren zeitnah abzuschließen, bitte ich Sie höflichst um:', { bold: true, lineHeight: 20 });
        drawAt('1. Eine schriftliche Bestätigung über den Eingang dieses Antrags.');
        drawAt('2. Die Zusendung der erforderlichen Antragsformulare sowie einer Liste der benötigten Nachweise.');
        y -= 30;
        drawAt('Mit freundlichen Grüßen,', { lineHeight: 35 });
        drawAt(`${formData.firstName} ${formData.lastName}`, { bold: true, size: 12, lineHeight: 20 });
        page.drawText('(Dieses Schreiben wurde maschinell erstellt und ist ohne Unterschrift gültig)', { x: marginX, y, size: 7, font, color: colorGray });
      } else {
        // Bürgergeld (Real 16-page Hauptantrag from BA)
        const response = await fetch('/forms/Hauptantrag_Buergergeld.pdf');

        if (!response.ok) {
          throw new Error('Konfigurationsfehler: PDF-Template nicht gefunden.');
        }

        const arrayBuffer = await response.arrayBuffer();
        pdfDoc = await PDFDocument.load(arrayBuffer);
        const form = pdfDoc.getForm();

        try {
          form.getTextField('txtfPersonVorname').setText(formData.firstName);
          form.getTextField('txtfPersonNachname').setText(formData.lastName);
          form.getTextField('txtfPersonStr').setText(formData.street); // BA separates street and nr, but putting both in street works.

          // Try to split PLZ and Ort if possible
          const zipMatch = formData.zipCity.match(/^(\d{5})\s*(.*)$/);
          if (zipMatch) {
            form.getTextField('txtfPersonPlz').setText(zipMatch[1]);
            form.getTextField('txtfPersonOrt').setText(zipMatch[2]);
          } else {
            // Fallback if user didn't enter PLZ properly
            form.getTextField('txtfPersonOrt').setText(formData.zipCity);
          }
        } catch (fieldError) {
          console.warn("Could not find some form fields, falling back to overlay method if needed.", fieldError);

          // Fallback for flat PDFs
          const pages = pdfDoc.getPages();
          const firstPage = pages[0];
          const { height } = firstPage.getSize();
          const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
          const color = rgb(0.04, 0.09, 0.16);

          const startX = 60;
          let startY = height - 150;

          firstPage.drawText(`${formData.firstName} ${formData.lastName}`, {
            x: startX, y: startY, size: 12, font, color
          });
          firstPage.drawText(`${formData.street}`, {
            x: startX, y: startY - 20, size: 12, font, color
          });
          firstPage.drawText(`${formData.zipCity}`, {
            x: startX, y: startY - 40, size: 12, font, color
          });
        }

        form.flatten();
      }

      // TAXFIX-FEATURE: Create a cover page with the deep-mapped data
      if (savedState && savedState.input) {
        const coverPage = pdfDoc.insertPage(0);
        const { width, height } = coverPage.getSize();
        const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
        const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
        
        coverPage.drawText(`Zusammenfassung: Sozialer Navigator`, {
          x: 60, y: height - 100, size: 24, font: fontBold, color: rgb(0.04, 0.09, 0.16)
        });
        
        coverPage.drawText(`Die folgenden Daten wurden im Vorfeld elektronisch erfasst:`, {
          x: 60, y: height - 140, size: 12, font: fontRegular
        });

        const drawRow = (yPos, label, value) => {
          coverPage.drawText(label, { x: 60, y: yPos, size: 12, font: fontBold });
          coverPage.drawText(value, { x: 200, y: yPos, size: 12, font: fontRegular });
        };

        let yStart = height - 180;
        drawRow(yStart, 'Antragsteller:', `${formData.firstName} ${formData.lastName}`);
        drawRow(yStart - 25, 'Haushaltsgröße:', `${savedState.input.persons} Erwachsene(r), ${savedState.input.kids} Kind(er)`);
        drawRow(yStart - 50, 'Brutto-Einkommen:', `${savedState.input.income} Euro`);
        drawRow(yStart - 75, 'Warmmiete:', `${savedState.input.rent} Euro`);
        drawRow(yStart - 100, 'Berufl. Status:', STATUS_LABELS[savedState.input.status] || 'Sonstiges');
        
        coverPage.drawText(`Diese Anlage dient zur schnelleren Vorab-Einschätzung durch die Behörde.`, {
          x: 60, y: height - 320, size: 10, font: fontRegular, color: rgb(0.4, 0.4, 0.4)
        });
      }

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `Antrag_${benefitType.replace(/\s+/g, '_')}_${formData.lastName}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      setIsGenerated(true);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Beim Generieren des PDFs ist ein Fehler aufgetreten.');
    } finally {
      setIsGenerating(false);
    }
  };

  if (isGenerated) {
    return (
      <div className="bg-white p-10 rounded-3xl shadow-xl border border-slate-100 text-center animate-in fade-in zoom-in duration-500">
        <div className="w-20 h-20 bg-brand-emerald/10 text-brand-emerald rounded-full flex items-center justify-center mx-auto mb-6">
          <ShieldCheck className="w-10 h-10" />
        </div>
        <h3 className="text-3xl font-bold text-slate-900 mb-4">Ihr Antrag ist fertig!</h3>
        <p className="text-slate-600 mb-8 max-w-md mx-auto">
          Das Dokument wurde sicher auf Ihrem Gerät gespeichert. Bitte drucken Sie es aus, unterschreiben Sie unten rechts und senden Sie es an das zuständige Amt.
        </p>
        <button 
          onClick={() => setIsGenerated(false)}
          className="text-brand-blue font-bold hover:underline"
        >
          Zurück zum Formular
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col md:flex-row">
      
      {/* Left Side: Preview & Trust */}
      <div className="bg-slate-50 p-10 md:w-5/12 border-b md:border-b-0 md:border-r border-slate-200 flex flex-col justify-between relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-grid-slate-200/[0.4] bg-[bottom_1px_center] opacity-50"></div>
        
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 bg-brand-blue/10 text-brand-blue font-bold px-3 py-1 rounded-full text-xs uppercase tracking-wider mb-6">
            <Lock className="w-4 h-4" /> Zero-Knowledge Architektur
          </div>
          <h3 className="text-2xl font-bold text-slate-900 mb-4">Ihre Daten bleiben bei Ihnen.</h3>
          
          {savedState ? (
            <div className="bg-brand-emerald/10 border border-brand-emerald/20 p-4 rounded-xl mb-6">
               <p className="text-brand-emerald font-bold mb-2 flex items-center gap-2">
                 <ShieldCheck className="w-5 h-5" /> Daten sicher übernommen!
               </p>
               <ul className="text-sm text-emerald-800 font-medium space-y-1">
                 <li>• Miete: {savedState.input.rent}€</li>
                 <li>• Einkommen: {savedState.input.income}€</li>
                 <li>• Haushalt: {savedState.input.persons} Person(en)</li>
               </ul>
               <p className="text-xs text-emerald-700 mt-3 opacity-80">
                 Wir heften diese Werte automatisch als Deckblatt an deinen Antrag, damit du sie nicht erneut ausfüllen musst.
               </p>
            </div>
          ) : (
            <p className="text-slate-600 mb-8 text-sm leading-relaxed">
              Um das offizielle {benefitType}-Formular für Sie vorauszufüllen, benötigen wir noch Ihre Adresse. 
              Diese Daten werden <strong className="text-slate-900">niemals</strong> auf unseren Servern gespeichert. Die Erstellung des PDFs passiert zu 100% lokal in Ihrem Browser.
            </p>
          )}
        </div>

        {/* Mock Preview Document */}
        <div className="relative z-10 bg-white p-4 rounded-xl shadow-lg border border-slate-200 transform rotate-[-2deg] hover:rotate-0 transition-all duration-300">
           <div className="flex items-center gap-3 mb-4 border-b border-slate-100 pb-3">
             <FileText className="w-6 h-6 text-brand-blue" />
             <div className="text-xs font-bold text-slate-900 uppercase">Offizieller Antrag ({benefitType})</div>
           </div>
           
           {/* Skeleton Lines representing the form */}
           <div className="space-y-3 opacity-60">
             <div className="h-2 bg-slate-200 rounded w-1/3"></div>
             <div className="h-2 bg-slate-200 rounded w-1/2"></div>
             <div className="h-2 bg-brand-blue/20 rounded w-3/4 mb-4"></div>
             
             <div className="grid grid-cols-2 gap-4 mt-6">
               <div>
                 <div className="text-[8px] text-slate-400 mb-1 uppercase font-bold">Vorname, Nachname</div>
                 <div className={cn("h-4 rounded", formData.lastName ? "text-brand-blue text-xs font-bold" : "bg-brand-blue/10 w-full")}>
                   {formData.lastName ? `${formData.firstName} ${formData.lastName}` : ''}
                 </div>
               </div>
               <div>
                 <div className="text-[8px] text-slate-400 mb-1 uppercase font-bold">Anschrift</div>
                 <div className={cn("h-4 rounded", formData.street ? "text-brand-blue text-xs font-bold" : "bg-brand-blue/10 w-full")}>
                   {formData.street ? `${formData.street}, ${formData.zipCity}` : ''}
                 </div>
               </div>
             </div>
           </div>
        </div>
      </div>

      {/* Right Side: Form */}
      <div className="p-10 md:w-7/12">
        <h3 className="text-xl font-bold text-slate-900 mb-6">Persönliche Daten für das PDF</h3>
        
        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-6 text-sm font-medium border border-red-100 flex items-start gap-3">
            <Lock className="w-5 h-5 shrink-0" /> {error}
          </div>
        )}

        <form onSubmit={handleGenerate} className="space-y-5">
          <div className="grid grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Vorname</label>
              <input 
                type="text" 
                required
                value={formData.firstName}
                onChange={e => setFormData({...formData, firstName: e.target.value})}
                className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-3 text-slate-900 outline-none focus:bg-white focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/10 transition-all font-medium"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Nachname</label>
              <input 
                type="text" 
                required
                value={formData.lastName}
                onChange={e => setFormData({...formData, lastName: e.target.value})}
                className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-3 text-slate-900 outline-none focus:bg-white focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/10 transition-all font-medium"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Straße & Hausnummer</label>
            <input 
              type="text" 
              required
              value={formData.street}
              onChange={e => setFormData({...formData, street: e.target.value})}
              className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-3 text-slate-900 outline-none focus:bg-white focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/10 transition-all font-medium"
            />
          </div>
          
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">PLZ & Ort</label>
            <input 
              type="text" 
              required
              value={formData.zipCity}
              onChange={e => setFormData({...formData, zipCity: e.target.value})}
              className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-3 text-slate-900 outline-none focus:bg-white focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/10 transition-all font-medium"
            />
          </div>

          <div className="pt-4 border-t border-slate-100 mt-6 flex flex-col sm:flex-row items-center gap-4">
            <button 
              type="submit"
              disabled={isGenerating}
              className="w-full sm:flex-1 bg-brand-blue hover:bg-brand-indigo text-white font-bold py-4 px-6 rounded-xl shadow-lg shadow-brand-blue/30 hover:-translate-y-0.5 transition-all flex justify-center items-center gap-2 disabled:opacity-50"
            >
              {isGenerating ? (
                <>Generiere PDF lokal... <span className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full"></span></>
              ) : (
                <>Offizielles PDF herunterladen <Download className="w-5 h-5" /></>
              )}
            </button>
            <div className="flex items-center justify-center gap-3 bg-emerald-50 text-emerald-700 font-bold py-3 px-4 rounded-xl border border-emerald-100 shadow-sm w-full sm:w-auto shrink-0">
              <ShieldCheck className="w-6 h-6 text-emerald-500 shrink-0" />
              <span className="text-xs text-left leading-tight">Deine Daten haben<br/>dein Gerät nie verlassen.</span>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
