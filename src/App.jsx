import { useState, useEffect, useRef } from 'react';
import { 
  Camera, 
  Mic, 
  MapPin, 
  AlertTriangle, 
  CheckCircle2, 
  Play, 
  Square, 
  RefreshCw, 
  ArrowRight, 
  Globe,
  Navigation,
  FileText,
  ShieldCheck,
  ChevronRight,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { submitReport } from './lib/api';

const RANGES = [
  { name: 'Mettupalayam', lat: 11.3000, lng: 76.9500 },
  { name: 'Sirumugai', lat: 11.3300, lng: 77.0000 },
  { name: 'Karamadai', lat: 11.2400, lng: 76.9000 },
  { name: 'Periyanaickenpalayam', lat: 11.1700, lng: 76.9400 },
  { name: 'Coimbatore', lat: 11.0100, lng: 76.9600 },
  { name: 'Madukkarai', lat: 10.9000, lng: 76.9200 },
  { name: 'Boluvampatty', lat: 10.9900, lng: 76.7600 }
];

const translations = {
  en: {
    title: 'AECRCMC Field Portal',
    subtitle: 'Official Field Reporting Utility',
    sighting: 'New Sighting',
    clearance: 'Area Clearance',
    elephantCount: 'Number of Elephants',
    severity: 'Live Severity',
    location: 'Location (GPS)',
    detecting: 'Detecting Range...',
    detected: 'Detected Range',
    notes: 'Observation Notes',
    voiceNote: 'Voice Evidence',
    record: 'Record Voice',
    recording: 'Recording...',
    stop: 'Stop',
    play: 'Play',
    photo: 'Evidence Photo',
    submit: 'Submit Report',
    submitting: 'Uploading...',
    success: 'Report Submitted Successfully',
    error: 'Submission Failed',
    range: 'Forest Range',
    damage: 'Damage Caused?',
    casualties: 'Casualties (if any)',
    officer: 'Officer Name',
    team: 'Team Members',
    high: 'HIGH',
    medium: 'MEDIUM',
    low: 'LOW'
  },
  ta: {
    title: 'AECRCMC கள போர்டல்',
    subtitle: 'அதிகாரப்பூர்வ கள அறிக்கை பயன்பாடு',
    sighting: 'புதிய பார்வை',
    clearance: 'பகுதி கிளியரன்ஸ்',
    elephantCount: 'யானைகளின் எண்ணிக்கை',
    severity: 'நேரடி தீவிரம்',
    location: 'இருப்பிடம் (GPS)',
    detecting: 'சரகம் கண்டறியப்படுகிறது...',
    detected: 'கண்டறியப்பட்ட சரகம்',
    notes: 'கவனிப்பு குறிப்புகள்',
    voiceNote: 'குரல் சான்று',
    record: 'குரலைப் பதிவு செய்',
    recording: 'பதிவு செய்யப்படுகிறது...',
    stop: 'நிறுத்து',
    play: 'இயக்கு',
    photo: 'சான்று புகைப்படம்',
    submit: 'அறிக்கையை சமர்ப்பி',
    submitting: 'பதிவேற்றப்படுகிறது...',
    success: 'அறிக்கை வெற்றிகரமாக சமர்ப்பிக்கப்பட்டது',
    error: 'சமர்ப்பிப்பதில் தோல்வி',
    range: 'வன சரகம்',
    damage: 'சேதம் விளைவிக்கப்பட்டதா?',
    casualties: 'உயிரிழப்புகள் (ஏதேனும் இருந்தால்)',
    officer: 'அதிகாரி பெயர்',
    team: 'குழு உறுப்பினர்கள்',
    high: 'அதிகம்',
    medium: 'நடுத்தரம்',
    low: 'குறைவு'
  }
};

export default function App() {
  const [lang, setLang] = useState('en');
  const [type, setType] = useState('SIGHTING'); // SIGHTING or CLEARANCE
  const [form, setForm] = useState({
    count: 0,
    notes: '',
    latitude: null,
    longitude: null,
    range: '',
    image: null,
    voice: null,
    damageDesc: '',
    casualties: 0,
    officerName: '',
    teamMembers: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [recording, setRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const [detecting, setDetecting] = useState(false);
  
  const mediaRecorderRef = useRef(null);
  const t = translations[lang];

  useEffect(() => {
    fetchLocation();
  }, []);

  const fetchLocation = () => {
    setDetecting(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setForm(prev => ({ ...prev, latitude, longitude }));
        detectRange(latitude, longitude);
        setDetecting(false);
      },
      () => setDetecting(false),
      { enableHighAccuracy: true }
    );
  };

  const detectRange = (lat, lng) => {
    let closest = RANGES[0];
    let minDist = Infinity;
    RANGES.forEach(r => {
      const dist = Math.sqrt(Math.pow(lat - r.lat, 2) + Math.pow(lng - r.lng, 2));
      if (dist < minDist) {
        minDist = dist;
        closest = r;
      }
    });
    setForm(prev => ({ ...prev, range: closest.name }));
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks = [];
      
      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        setForm(prev => ({ ...prev, voice: blob }));
        setAudioUrl(URL.createObjectURL(blob));
      };
      
      recorder.start();
      mediaRecorderRef.current = recorder;
      setRecording(true);
    } catch (err) {
      alert('Microphone access denied');
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await submitReport({
        ...form,
        reportType: type,
        isClear: type === 'CLEARANCE'
      });
      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
        setForm({ ...form, count: 0, notes: '', image: null, voice: null, damageDesc: '', casualties: 0 });
        setAudioUrl(null);
      }, 3000);
    } catch (err) {
      alert(t.error + ': ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const getSeverity = () => {
    if (form.casualties > 0 || form.count > 5 || form.damageDesc.length > 5) return 'HIGH';
    if (form.count > 2) return 'MEDIUM';
    return 'LOW';
  };

  const severity = getSeverity();

  return (
    <div className="max-w-md mx-auto min-h-screen flex flex-col p-4">
      {/* Header */}
      <header className="flex justify-between items-center mb-8 pt-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-white rounded-full p-1 border-2 border-[var(--color-gold)]">
            <img src="/logo.png" alt="AECRCMC" className="w-full h-full object-contain" />
          </div>
          <div>
            <h1 className="font-[family-name:var(--font-playfair)] text-xl font-black text-[var(--color-gold)]">{t.title}</h1>
            <p className="text-[10px] uppercase tracking-widest text-white/40">{t.subtitle}</p>
          </div>
        </div>
        <button 
          onClick={() => setLang(lang === 'en' ? 'ta' : 'en')}
          className="w-10 h-10 rounded-full glass flex items-center justify-center text-[var(--color-gold)] border border-white/10"
        >
          <Globe size={20} />
        </button>
      </header>

      {/* Type Selector */}
      <div className="flex gap-2 mb-8 bg-black/20 p-1.5 rounded-2xl border border-white/5">
        <button 
          onClick={() => setType('SIGHTING')}
          className={`flex-1 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${type === 'SIGHTING' ? 'bg-[var(--color-gold)] text-[var(--color-coffee)] shadow-lg' : 'text-white/40'}`}
        >
          <AlertTriangle size={16} /> {t.sighting}
        </button>
        <button 
          onClick={() => setType('CLEARANCE')}
          className={`flex-1 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${type === 'CLEARANCE' ? 'bg-[var(--color-forest)] text-white shadow-lg' : 'text-white/40'}`}
        >
          <ShieldCheck size={16} /> {t.clearance}
        </button>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="flex-1 space-y-6 pb-20">
        {/* GPS Info */}
        <div className="glass p-4 rounded-3xl border border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[var(--color-gold)]/10 flex items-center justify-center text-[var(--color-gold)]">
              <MapPin size={20} />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-white/40">{detecting ? t.detecting : t.detected}</p>
              <p className="text-sm font-bold">{form.range || '---'}</p>
            </div>
          </div>
          <button type="button" onClick={fetchLocation} className="p-2 text-white/40 hover:text-white">
            <RefreshCw size={18} className={detecting ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Severity Badge */}
        {type === 'SIGHTING' && (
          <div className="flex items-center justify-between glass p-4 rounded-3xl border border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/40">
                <Info size={20} />
              </div>
              <span className="text-[10px] uppercase tracking-widest text-white/40">{t.severity}</span>
            </div>
            <span className={`px-4 py-1.5 rounded-full text-[10px] font-black tracking-[0.2em] border shadow-lg ${
              severity === 'HIGH' ? 'bg-red-500/20 border-red-500 text-red-500 animate-pulse' :
              severity === 'MEDIUM' ? 'bg-orange-500/20 border-orange-500 text-orange-500' :
              'bg-green-500/20 border-green-500 text-green-500'
            }`}>
              {t[severity.toLowerCase()]}
            </span>
          </div>
        )}

        {/* Main Inputs */}
        <div className="space-y-4">
          {type === 'SIGHTING' && (
            <div>
              <label className="text-[10px] uppercase tracking-[0.3em] text-white/40 mb-3 block ml-1">{t.elephantCount}</label>
              <input 
                type="number" 
                value={form.count}
                onChange={e => setForm({...form, count: parseInt(e.target.value) || 0})}
                className="input-field text-2xl font-black py-4"
              />
            </div>
          )}

          <div>
            <label className="text-[10px] uppercase tracking-[0.3em] text-white/40 mb-3 block ml-1">{t.notes}</label>
            <textarea 
              value={form.notes}
              onChange={e => setForm({...form, notes: e.target.value})}
              className="input-field min-h-[100px] resize-none"
              placeholder="..."
            />
          </div>
        </div>

        {/* Media Tools */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-3">
            <label className="text-[10px] uppercase tracking-widest text-white/40 block ml-1">{t.voiceNote}</label>
            {!recording ? (
              <button 
                type="button"
                onClick={startRecording}
                className="w-full h-24 glass rounded-3xl flex flex-col items-center justify-center gap-2 border-dashed border-white/10 hover:border-[var(--color-gold)]/40 transition-all group"
              >
                <div className="w-10 h-10 rounded-full bg-[var(--color-gold)]/10 flex items-center justify-center text-[var(--color-gold)] group-hover:scale-110 transition-transform">
                  <Mic size={20} />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-white/40">{t.record}</span>
              </button>
            ) : (
              <button 
                type="button"
                onClick={stopRecording}
                className="w-full h-24 bg-red-500/10 rounded-3xl flex flex-col items-center justify-center gap-2 border border-red-500/40 animate-pulse"
              >
                <div className="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center text-white">
                  <Square size={20} fill="white" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-red-500">{t.recording}</span>
              </button>
            )}
            {audioUrl && !recording && (
              <button 
                type="button"
                onClick={() => new Audio(audioUrl).play()}
                className="w-full py-2 bg-[var(--color-gold)]/10 border border-[var(--color-gold)]/20 rounded-xl text-[var(--color-gold)] text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2"
              >
                <Play size={12} fill="currentColor" /> {t.play}
              </button>
            )}
          </div>

          <div className="space-y-3">
            <label className="text-[10px] uppercase tracking-widest text-white/40 block ml-1">{t.photo}</label>
            <div className="relative h-24">
              <input 
                type="file" 
                accept="image/*" 
                capture="environment"
                onChange={e => setForm({...form, image: e.target.files[0]})}
                className="absolute inset-0 opacity-0 z-10 cursor-pointer"
              />
              <div className={`w-full h-full glass rounded-3xl flex flex-col items-center justify-center gap-2 border-dashed border-white/10 ${form.image ? 'border-[var(--color-gold)]/40 bg-[var(--color-gold)]/5' : ''}`}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${form.image ? 'bg-[var(--color-gold)] text-[var(--color-coffee)]' : 'bg-white/5 text-white/40'}`}>
                  {form.image ? <CheckCircle2 size={20} /> : <Camera size={20} />}
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-white/40">
                  {form.image ? 'Selected' : 'Capture'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <button 
          disabled={loading || submitted}
          className={`w-full py-5 rounded-2xl font-black uppercase tracking-[0.2em] shadow-2xl transition-all flex items-center justify-center gap-3 mt-8 ${
            submitted ? 'bg-[var(--color-success)] text-white' : 
            'bg-[var(--color-gold)] text-[var(--color-coffee)] active:scale-95'
          }`}
        >
          {loading ? <RefreshCw size={24} className="animate-spin" /> : 
           submitted ? <CheckCircle2 size={24} /> : 
           <><Navigation size={24} /> {t.submit}</>}
        </button>
      </form>

      {/* Success Modal */}
      <AnimatePresence>
        {submitted && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-[var(--color-coffee)]/90 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white/5 border border-white/10 p-10 rounded-[40px] text-center space-y-6 shadow-2xl"
            >
              <div className="w-20 h-20 bg-[var(--color-success)]/20 rounded-full flex items-center justify-center text-[var(--color-success)] mx-auto border border-[var(--color-success)]/40">
                <CheckCircle2 size={40} />
              </div>
              <div>
                <h2 className="text-2xl font-black text-white">{t.success}</h2>
                <p className="text-white/40 text-sm mt-2">AECRCMC HQ notified in real-time.</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
