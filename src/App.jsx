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
  Globe,
  Navigation,
  ShieldCheck,
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
    title: 'AECRCMC',
    subtitle: 'Ranger Portal',
    sighting: 'Sighting',
    clearance: 'Clearance',
    elephantCount: 'Elephant Count',
    severity: 'Severity',
    location: 'Location',
    detecting: 'Detecting...',
    detected: 'Detected Range',
    notes: 'Observations',
    voiceNote: 'Voice',
    record: 'Record',
    recording: 'Recording',
    stop: 'Stop',
    play: 'Play',
    photo: 'Evidence',
    submit: 'Submit Report',
    submitting: 'Submitting...',
    success: 'Report Sent',
    error: 'Error',
    range: 'Range',
    high: 'HIGH',
    medium: 'MEDIUM',
    low: 'LOW'
  },
  ta: {
    title: 'AECRCMC',
    subtitle: 'வனக் காவலர் போர்டல்',
    sighting: 'பார்வை',
    clearance: 'கிளியரன்ஸ்',
    elephantCount: 'யானைகளின் எண்ணிக்கை',
    severity: 'தீவிரம்',
    location: 'இருப்பிடம்',
    detecting: 'கண்டறியப்படுகிறது...',
    detected: 'கண்டறியப்பட்ட சரகம்',
    notes: 'கவனிப்புகள்',
    voiceNote: 'குரல்',
    record: 'பதிவு செய்',
    recording: 'பதிவாகிறது',
    stop: 'நிறுத்து',
    play: 'இயக்கு',
    photo: 'சான்று',
    submit: 'அறிக்கையை சமர்ப்பி',
    submitting: 'சமர்ப்பிக்கப்படுகிறது...',
    success: 'அறிக்கை அனுப்பப்பட்டது',
    error: 'பிழை',
    range: 'சரகம்',
    high: 'அதிகம்',
    medium: 'நடுத்தரம்',
    low: 'குறைவு'
  }
};

export default function App() {
  const [lang, setLang] = useState('en');
  const [type, setType] = useState('SIGHTING');
  const [form, setForm] = useState({
    count: 0,
    notes: '',
    latitude: null,
    longitude: null,
    range: '',
    image: null,
    voice: null,
    damageDesc: '',
    casualties: 0
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
      await submitReport({ ...form, reportType: type, isClear: type === 'CLEARANCE' });
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
    <div className="portal-container">
      <header className="header">
        <div className="logo-container">
          <div className="logo-circle">
            <img src="/logo.png" alt="AECRCMC" />
          </div>
          <div>
            <h1 style={{ fontFamily: 'var(--font-accent)', fontSize: '1.5rem', color: 'var(--color-gold)' }}>{t.title}</h1>
            <p className="label" style={{ margin: 0, opacity: 0.6 }}>{t.subtitle}</p>
          </div>
        </div>
        <button className="lang-toggle" onClick={() => setLang(lang === 'en' ? 'ta' : 'en')}>
          <Globe size={20} />
        </button>
      </header>

      <div className="type-selector">
        <button 
          onClick={() => setType('SIGHTING')}
          className={`type-btn ${type === 'SIGHTING' ? 'active sighting' : ''}`}
        >
          <AlertTriangle size={16} /> {t.sighting}
        </button>
        <button 
          onClick={() => setType('CLEARANCE')}
          className={`type-btn ${type === 'CLEARANCE' ? 'active clearance' : ''}`}
        >
          <ShieldCheck size={16} /> {t.clearance}
        </button>
      </div>

      <form onSubmit={handleSubmit} className="form-section">
        <div className="glass info-row">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div className="icon-box" style={{ background: 'var(--color-gold)', color: 'var(--color-coffee)' }}>
              <MapPin size={20} />
            </div>
            <div>
              <p className="label" style={{ margin: 0 }}>{detecting ? t.detecting : t.detected}</p>
              <p style={{ fontWeight: 800, fontSize: '0.9rem' }}>{form.range || '---'}</p>
            </div>
          </div>
          <button type="button" onClick={fetchLocation} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)' }}>
            <RefreshCw size={20} className={detecting ? 'animate-spin' : ''} />
          </button>
        </div>

        {type === 'SIGHTING' && (
          <div className="glass info-row">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div className="icon-box">
                <Info size={20} />
              </div>
              <span className="label" style={{ margin: 0 }}>{t.severity}</span>
            </div>
            <span className={`severity-badge ${severity.toLowerCase()}`}>
              {t[severity.toLowerCase()]}
            </span>
          </div>
        )}

        <div className="field-group">
          {type === 'SIGHTING' && (
            <div style={{ marginBottom: '1rem' }}>
              <label className="label">{t.elephantCount}</label>
              <input 
                type="number" 
                value={form.count}
                onChange={e => setForm({...form, count: parseInt(e.target.value) || 0})}
                className="input-main"
                style={{ fontSize: '2rem', textAlign: 'center' }}
              />
            </div>
          )}

          <div>
            <label className="label">{t.notes}</label>
            <textarea 
              value={form.notes}
              onChange={e => setForm({...form, notes: e.target.value})}
              className="input-main"
              placeholder="..."
            />
          </div>
        </div>

        <div className="media-grid">
          <div className={`glass media-card ${form.voice || recording ? 'active' : ''}`} onClick={() => !recording && !audioUrl && startRecording()}>
            <div className="icon-box">
              {recording ? <Square size={20} fill="currentColor" className="animate-pulse" /> : <Mic size={20} />}
            </div>
            <span className="media-label">{recording ? t.recording : form.voice ? 'Voice OK' : t.record}</span>
            {recording && <button type="button" onClick={(e) => {e.stopPropagation(); stopRecording();}} className="btn-stop" style={{ position: 'absolute', inset: 0, background: 'none', border: 'none' }}></button>}
            {audioUrl && !recording && <button type="button" onClick={(e) => {e.stopPropagation(); new Audio(audioUrl).play();}} style={{ marginTop: '0.5rem', background: 'none', border: 'none', color: 'var(--color-gold)', fontSize: '0.6rem', fontWeight: 900 }}>PLAY</button>}
          </div>

          <div className={`glass media-card ${form.image ? 'active' : ''}`}>
            <input 
              type="file" 
              accept="image/*" 
              capture="environment"
              onChange={e => setForm({...form, image: e.target.files[0]})}
              style={{ position: 'absolute', inset: 0, opacity: 0, zIndex: 10 }}
            />
            <div className="icon-box">
              {form.image ? <CheckCircle2 size={20} /> : <Camera size={20} />}
            </div>
            <span className="media-label">{form.image ? 'Photo OK' : t.photo}</span>
          </div>
        </div>

        <button 
          disabled={loading || submitted}
          className={`submit-btn ${submitted ? 'success' : ''}`}
        >
          {loading ? <RefreshCw size={24} className="animate-spin" /> : 
           submitted ? <CheckCircle2 size={24} /> : 
           <><Navigation size={20} /> {t.submit}</>}
        </button>
      </form>

      <AnimatePresence>
        {submitted && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="success-overlay">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="success-card">
              <div style={{ width: '80px', height: '80px', background: 'rgba(46, 204, 113, 0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifycenter: 'center', color: '#2ecc71', margin: '0 auto 2rem' }}>
                <CheckCircle2 size={40} />
              </div>
              <h2 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: '0.5rem' }}>{t.success}</h2>
              <p style={{ opacity: 0.4, fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '2px' }}>HQ Notified</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
