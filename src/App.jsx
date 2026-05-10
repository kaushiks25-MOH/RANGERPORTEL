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
  Plus,
  Minus,
  Navigation2,
  Trash2
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
    subtitle: 'COIMBATORE DIVISION',
    sighting: 'Sighting',
    clearance: 'Clearance',
    elephantCount: 'Number of Elephants',
    severity: 'Severity',
    detecting: 'Locating...',
    detected: 'Detected Range',
    notes: 'Observations',
    voice: 'Voice Proof',
    photo: 'Photo Proof',
    record: 'Record',
    recording: 'Recording',
    submit: 'Send Report',
    success: 'Report Sent Successfully',
    error: 'Submission Error',
    high: 'HIGH',
    medium: 'MEDIUM',
    low: 'LOW',
    tags: ['Crop Damage', 'Village Near', 'Heading North', 'Moving Fast', 'Single Male']
  },
  ta: {
    title: 'AECRCMC',
    subtitle: 'கோவை கோட்டம்',
    sighting: 'பார்வை',
    clearance: 'கிளியரன்ஸ்',
    elephantCount: 'யானைகளின் எண்ணிக்கை',
    severity: 'தீவிரம்',
    detecting: 'இருப்பிடம் கண்டறியப்படுகிறது...',
    detected: 'கண்டறியப்பட்ட சரகம்',
    notes: 'கவனிப்புகள்',
    voice: 'குரல் சான்று',
    photo: 'புகைப்பட சான்று',
    record: 'பதிவு செய்',
    recording: 'பதிவாகிறது',
    submit: 'அறிக்கையை அனுப்பு',
    success: 'அறிக்கை வெற்றிகரமாக அனுப்பப்பட்டது',
    error: 'அனுப்புவதில் பிழை',
    high: 'அதிகம்',
    medium: 'நடுத்தரம்',
    low: 'குறைவு',
    tags: ['பயிர் சேதம்', 'கிராமம் அருகில்', 'வடக்கு நோக்கி', 'வேகமாக நகர்கிறது', 'ஒற்றை யானை']
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
  const [detecting, setDetecting] = useState(true);
  const [activeTags, setActiveTags] = useState([]);
  const [manualSeverity, setManualSeverity] = useState('LOW');
  const [counts, setCounts] = useState({
    bull: 0,
    makhna: 0,
    male_group: 0,
    female_group: 0,
    female_calf: 0,
    single_female: 0,
    unidentified: 0
  });
  
  const mediaRecorderRef = useRef(null);
  const watchIdRef = useRef(null);
  const t = translations[lang];

  const ELEPHANT_TYPES = [
    { id: 'bull', label: { en: 'Bull', ta: 'காளை' }, sub: 'Large solitary male', img: '/bull.png', color: '#e74c3c' },
    { id: 'male_group', label: { en: 'Male Group', ta: 'ஆண் குழு' }, sub: 'Two or more bulls', img: '/bull.png', color: '#e67e22' },
    { id: 'female_calf', label: { en: 'Female with Calf', ta: 'குட்டியுடன் பெண்' }, sub: 'Mother & Baby', img: '/mother_calf.png', color: '#f1c40f' },
    { id: 'female_group', label: { en: 'Elephant Group', ta: 'யானை கூட்டம்' }, sub: 'Mixed herd', img: '/group.png', color: '#27ae60' },
    { id: 'single_female', label: { en: 'Lone Cow', ta: 'தனி பெண்' }, sub: 'Solitary Female', img: '/cow.png', color: '#3498db' },
    { id: 'unidentified', label: { en: 'Unidentified', ta: 'அடையாளம் தெரியவில்லை' }, sub: 'Unclear view', img: '/logo.png', color: '#95a5a6' }
  ];

  useEffect(() => {
    if ('geolocation' in navigator) {
      setDetecting(true);
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          setForm(prev => {
            const updated = { ...prev, latitude, longitude };
            let closest = RANGES[0];
            let minDist = Infinity;
            RANGES.forEach(r => {
              const dist = Math.sqrt(Math.pow(latitude - r.lat, 2) + Math.pow(longitude - r.lng, 2));
              if (dist < minDist) {
                minDist = dist;
                closest = r;
              }
            });
            updated.range = closest.name;
            return updated;
          });
          setDetecting(false);
        },
        (err) => {
          console.error(err);
          setDetecting(false);
        },
        { enableHighAccuracy: true, maximumAge: 1000, timeout: 5000 }
      );
    }
    return () => {
      if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
    };
  }, []);

  const adjustCount = (id, delta) => {
    setCounts(prev => {
      const nextValue = Math.max(0, prev[id] + delta);
      const total = Object.values({ ...prev, [id]: nextValue }).reduce((a, b) => a + b, 0);
      setForm(f => ({ ...f, count: total }));
      return { ...prev, [id]: nextValue };
    });
  };

  const toggleTag = (tag) => {
    setActiveTags(prev => {
      const next = prev.includes(tag) ? prev.filter(x => x !== tag) : [...prev, tag];
      setForm(f => ({ ...f, notes: next.join(', ') }));
      return next;
    });
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
        severity: manualSeverity,
        reportType: type, 
        isClear: type === 'CLEARANCE',
        bullCount: counts.bull,
        makhnaCount: counts.makhna,
        maleGroupCount: counts.male_group,
        femaleGroupCount: counts.female_group,
        femaleCalfCount: counts.female_calf,
        singleFemaleCount: counts.single_female,
        remarks: counts.unidentified > 0 ? `Unidentified: ${counts.unidentified}` : ''
      });
      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
        setForm({ ...form, count: 0, notes: '', image: null, voice: null, damageDesc: '', casualties: 0 });
        setCounts({ bull: 0, makhna: 0, male_group: 0, female_group: 0, female_calf: 0, single_female: 0, unidentified: 0 });
        setAudioUrl(null);
        setActiveTags([]);
      }, 3000);
    } catch (err) {
      alert(t.error + ': ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const getSeverity = () => {
    if (form.casualties > 0 || form.count > 5 || activeTags.length > 2) return 'HIGH';
    if (form.count > 2 || activeTags.length > 0) return 'MEDIUM';
    return 'LOW';
  };

  return (
    <div className="portal-container">
      <header className="header">
        <div className="logo-container">
          <div className="logo-circle">
            <img src="/logo.png" alt="AECRCMC" />
          </div>
          <div>
            <h1 style={{ fontFamily: 'var(--font-accent)', fontSize: '1.6rem', color: 'var(--color-gold)', fontWeight: 900 }}>{t.title}</h1>
            <p className="label" style={{ margin: 0, opacity: 0.5, letterSpacing: '3px' }}>{t.subtitle}</p>
          </div>
        </div>
        <button className="lang-toggle" onClick={() => setLang(lang === 'en' ? 'ta' : 'en')}>
          <Globe size={22} />
        </button>
      </header>

      <div className="type-selector">
        <button 
          onClick={() => setType('SIGHTING')}
          className={`type-btn ${type === 'SIGHTING' ? 'active sighting' : ''}`}
        >
          <Navigation2 size={18} /> {t.sighting}
        </button>
        <button 
          onClick={() => setType('CLEARANCE')}
          className={`type-btn ${type === 'CLEARANCE' ? 'active clearance' : ''}`}
        >
          <ShieldCheck size={18} /> {t.clearance}
        </button>
      </div>

      <form onSubmit={handleSubmit} className="form-section">
        <div className="glass info-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div className="icon-box" style={{ background: 'var(--color-gold)', color: 'var(--color-coffee)' }}>
              <MapPin size={24} />
            </div>
            <div>
              <p className="label" style={{ margin: 0 }}>{detecting ? t.detecting : t.detected}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <p style={{ fontWeight: 900, fontSize: '1rem' }}>{form.range || '...'}</p>
                {!detecting && <div className="pulse-dot"></div>}
              </div>
            </div>
          </div>
          <div 
            className={`severity-badge ${manualSeverity.toLowerCase()}`}
            onClick={() => {
              const levels = ['LOW', 'MEDIUM', 'HIGH'];
              const next = levels[(levels.indexOf(manualSeverity) + 1) % 3];
              setManualSeverity(next);
            }}
            style={{ cursor: 'pointer', transition: 'all 0.3s ease', border: '1px solid rgba(255,255,255,0.2)' }}
          >
            {manualSeverity}
          </div>
        </div>

        {type === 'SIGHTING' && (
          <div className="field-group">
            <label className="label" style={{ marginBottom: '1rem' }}>Sighting Categories</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
              {ELEPHANT_TYPES.map(cat => (
                <div 
                  key={cat.id} 
                  className={`glass media-card ${counts[cat.id] > 0 ? 'active' : ''}`}
                  onClick={() => adjustCount(cat.id, 1)}
                  style={{ 
                    padding: '1.25rem', 
                    minHeight: 'auto', 
                    flexDirection: 'row', 
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    cursor: 'pointer',
                    border: counts[cat.id] > 0 ? `2px solid ${cat.color}` : '1px solid rgba(255,255,255,0.05)'
                  }}
                >
                  <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ width: '60px', height: '60px', borderRadius: '15px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
                      <img src={cat.img} alt={cat.id} style={{ width: '100%', height: '100%', objectCover: 'cover' }} />
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontSize: '1rem', fontWeight: 900, color: 'white', margin: 0 }}>{lang === 'en' ? cat.label.en : cat.label.ta}</p>
                      <p style={{ fontSize: '0.7rem', opacity: 0.4, margin: 0 }}>{cat.sub}</p>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(0,0,0,0.3)', padding: '0.5rem', borderRadius: '12px' }} onClick={(e) => e.stopPropagation()}>
                    <button 
                      type="button" 
                      onClick={() => adjustCount(cat.id, -1)}
                      style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', borderRadius: '8px', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <Minus size={20} />
                    </button>
                    <span style={{ minWidth: '24px', textAlign: 'center', fontWeight: 900, fontSize: '1.2rem', color: cat.color }}>
                      {counts[cat.id]}
                    </span>
                    <button 
                      type="button" 
                      onClick={() => adjustCount(cat.id, 1)}
                      style={{ background: cat.color, border: 'none', color: 'white', borderRadius: '8px', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <Plus size={20} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="field-group" style={{ marginTop: '2rem' }}>
              <div className="label-container">
                <label className="label">{t.elephantCount}</label>
                <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.2)', fontWeight: 900 }}>TOTAL COUNT</span>
              </div>
              <div style={{ textAlign: 'center', background: 'rgba(255,255,255,0.03)', padding: '1.5rem', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)', fontSize: '3rem', fontWeight: 900, color: 'var(--color-gold)', fontFamily: 'var(--font-accent)' }}>
                {form.count}
              </div>
            </div>
          </div>
        )}

        {type === 'CLEARANCE' && (
          <div className="field-group" style={{ animation: 'slideUp 0.3s ease-out' }}>
            <div className="glass info-card" style={{ background: 'rgba(46, 204, 113, 0.1)', borderColor: 'rgba(46, 204, 113, 0.2)', marginBottom: '1.5rem' }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <ShieldCheck size={24} className="text-green-500" />
                  <div>
                    <p className="label" style={{ color: '#2ecc71' }}>POST-CONFLICT STATUS</p>
                    <p style={{ fontWeight: 900, fontSize: '1.1rem' }}>Area Secured & Clear</p>
                  </div>
               </div>
            </div>

            <div className="field-group">
              <label className="label">Damage Assessment</label>
              <div className="tag-container">
                {[
                  { label: 'No Damage', icon: '✅' },
                  { label: 'Crop Damage', icon: '🌾' },
                  { label: 'Property Damage', icon: '🏠' },
                  { label: 'Human Injury', icon: '🩹' },
                  { label: 'Casualty', icon: '🚑' }
                ].map(item => (
                  <div 
                    key={item.label} 
                    onClick={() => setForm({...form, damageDesc: item.label})}
                    className={`tag ${form.damageDesc === item.label ? 'active' : ''}`}
                    style={{ 
                      background: form.damageDesc === item.label ? 'var(--color-gold)' : '',
                      padding: '10px 15px',
                      fontSize: '0.7rem'
                    }}
                  >
                    <span style={{ marginRight: '5px' }}>{item.icon}</span> {item.label}
                  </div>
                ))}
              </div>
            </div>

            <div className="field-group" style={{ marginTop: '1.5rem' }}>
              <div className="label-container">
                <label className="label">Casualties Reported</label>
                <span style={{ fontSize: '0.6rem', color: 'red', fontWeight: 900 }}>CRITICAL</span>
              </div>
              <div className="count-adjuster" style={{ background: 'rgba(255,0,0,0.05)', borderColor: 'rgba(255,0,0,0.1)' }}>
                <button type="button" className="adj-btn" onClick={() => setForm(f => ({ ...f, casualties: Math.max(0, f.casualties - 1) }))}>
                  <Minus size={24} />
                </button>
                <div className="count-display" style={{ 
                  color: form.casualties > 0 ? 'red' : 'white', 
                  fontFamily: 'Inter, sans-serif',
                  fontSize: '3rem'
                }}>{form.casualties}</div>
                <button type="button" className="adj-btn" onClick={() => setForm(f => ({ ...f, casualties: f.casualties + 1 }))}>
                  <Plus size={24} />
                </button>
              </div>
            </div>

            <div className="field-group" style={{ marginTop: '1.5rem' }}>
              <label className="label">Chase Result / Final Direction</label>
              <input 
                type="text"
                value={form.chaseResult || ''}
                onChange={e => setForm({...form, chaseResult: e.target.value})}
                className="input-main"
                placeholder="e.g. Driven towards forest boundary"
              />
            </div>
          </div>
        )}

        <div className="field-group">
          <label className="label">{type === 'SIGHTING' ? t.notes : 'Final Remarks'}</label>
          <textarea 
            value={form.notes}
            onChange={e => setForm({...form, notes: e.target.value})}
            className="input-main"
            placeholder="..."
            rows={3}
          />
          {type === 'SIGHTING' && (
            <div className="tag-container">
              {t.tags.map(tag => (
                <div 
                  key={tag} 
                  onClick={() => toggleTag(tag)}
                  className={`tag ${activeTags.includes(tag) ? 'active' : ''}`}
                >
                  {tag}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="media-grid">
          <div 
            className={`glass media-card ${form.voice || recording ? 'active' : ''}`} 
            onClick={() => {
              if (recording) stopRecording();
              else if (!audioUrl) startRecording();
            }}
          >
            <div className="icon-box">
              {recording ? <Square size={24} fill="currentColor" /> : <Mic size={24} />}
            </div>
            <span className="media-label">{recording ? t.recording : form.voice ? 'READY' : t.record}</span>
            {audioUrl && !recording && (
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                 <button type="button" onClick={(e) => {e.stopPropagation(); new Audio(audioUrl).play();}} className="tag active" style={{ borderRadius: '8px' }}><Play size={10} fill="currentColor" /></button>
                 <button type="button" onClick={(e) => {e.stopPropagation(); setAudioUrl(null); setForm(f=>({...f, voice: null}))}} className="tag" style={{ borderRadius: '8px' }}><Trash2 size={10} /></button>
              </div>
            )}
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
              {form.image ? <CheckCircle2 size={24} /> : <Camera size={24} />}
            </div>
            <span className="media-label">{form.image ? 'ATTACHED' : t.photo}</span>
          </div>
        </div>

        <button 
          disabled={loading || submitted || detecting}
          className={`submit-btn ${submitted ? 'success' : ''}`}
        >
          {loading ? <RefreshCw size={28} className="animate-spin" /> : 
           submitted ? <CheckCircle2 size={28} /> : 
           <><Navigation size={24} /> {t.submit}</>}
        </button>
      </form>

      <AnimatePresence>
        {submitted && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="success-overlay">
            <motion.div initial={{ scale: 0.9, y: 30 }} animate={{ scale: 1, y: 0 }} className="success-card">
              <div style={{ width: '100px', height: '100px', background: 'rgba(46, 204, 113, 0.1)', borderRadius: '35px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2ecc71', margin: '0 auto 2rem', border: '1px solid rgba(46, 204, 113, 0.2)' }}>
                <CheckCircle2 size={50} />
              </div>
              <h2 style={{ fontSize: '2.5rem', fontWeight: 900, marginBottom: '0.5rem', fontFamily: 'var(--font-accent)' }}>{t.success}</h2>
              <p style={{ opacity: 0.5, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '4px', fontWeight: 900, marginBottom: '2rem' }}>HQ ALERTED</p>
              
              <a 
                href={`https://wa.me/?text=${encodeURIComponent(
                  `🚨 *AECRCMC EMERGENCY ALERT*\n\n` +
                  `*Type:* ${type}\n` +
                  `*Range:* ${form.range}\n` +
                  `*Severity:* ${manualSeverity}\n` +
                  `${type === 'SIGHTING' ? `*Count:* ${form.count}\n` : `*Damage:* ${form.damageDesc}\n`}` +
                  `*Time:* ${new Date().toLocaleTimeString()}\n\n` +
                  `🌍 _Location link and voice notes available on HQ Dashboard._`
                )}`}
                target="_blank"
                rel="noreferrer"
                className="submit-btn"
                style={{ background: '#25D366', textDecoration: 'none', color: 'white' }}
              >
                <RefreshCw size={24} style={{ transform: 'rotate(45deg)' }} /> BROADCAST TO WHATSAPP
              </a>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
