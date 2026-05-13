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
  Trash2,
  Bell,
  History,
  Image as ImageIcon,
  ChevronRight,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { submitReport, getRecentReports, getActiveAlerts } from './lib/api';
import { supabase } from './lib/supabase';

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
    tags: ['Crop Damage', 'Village Near', 'Heading North', 'Moving Fast', 'Single Male'],
    alertsTitle: 'Recent Alerts',
    noAlerts: 'No recent alerts found.'
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
    tags: ['பயிர் சேதம்', 'கிராமம் அருகில்', 'வடக்கு நோக்கி', 'வேகமாக நகர்கிறது', 'ஒற்றை யானை'],
    alertsTitle: 'சமீபத்திய அறிவிப்புகள்',
    noAlerts: 'சமீபத்திய அறிவிப்புகள் எதுவும் இல்லை.'
  }
};

export default function App() {
  const [lang, setLang] = useState('en');
  const [view, setView] = useState('FORM'); // FORM | ALERTS
  const [type, setType] = useState('SIGHTING');
  const [form, setForm] = useState({
    count: 0,
    notes: '',
    latitude: null,
    longitude: null,
    range: '',
    images: [], 
    voice: null,
    damageDesc: '',
    casualties: 0,
    chaseResult: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submittedResult, setSubmittedResult] = useState(null);
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

  const [recentAlerts, setRecentAlerts] = useState([]);
  const [activeAlerts, setActiveAlerts] = useState([]);
  const [fetchingAlerts, setFetchingAlerts] = useState(false);

  useEffect(() => {
    // Supabase Real-time for live alerts
    const channel = supabase
      .channel('public:reports')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'reports' }, (payload) => {
        setRecentAlerts(prev => [payload.new, ...prev].slice(0, 20));
        if (view !== 'ALERTS') {
          // You could add a toast here or just the badge is fine
          console.log("New Alert Received!", payload.new);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [view]);

  const fetchAlerts = async () => {
    setFetchingAlerts(true);
    try {
      const [history, active] = await Promise.all([
        getRecentReports(20),
        getActiveAlerts()
      ]);
      setRecentAlerts(history);
      setActiveAlerts(active);
    } catch (err) {
      console.error("Failed to fetch alerts:", err);
    } finally {
      setFetchingAlerts(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, [view]);
  
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

  const [locationError, setLocationError] = useState(null);
  
  const requestLocation = () => {
    if (!('geolocation' in navigator)) {
      setLocationError("Geolocation not supported");
      return;
    }
    
    setDetecting(true);
    setLocationError(null);
    
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        updatePosition(latitude, longitude);
      },
      (err) => console.warn("Quick GPS check failed, starting watch...", err),
      { enableHighAccuracy: true, timeout: 5000 }
    );

    if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
    
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        updatePosition(pos.coords.latitude, pos.coords.longitude);
        setDetecting(false);
        setLocationError(null);
      },
      (err) => {
        console.error("GPS Watch Error:", err);
        setDetecting(false);
        if (err.code === 1) setLocationError("PERMISSION_DENIED");
        else if (err.code === 2) setLocationError("POSITION_UNAVAILABLE");
        else if (err.code === 3) setLocationError("TIMEOUT");
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }
    );
  };

  const updatePosition = (lat, lng) => {
    setForm(prev => {
      const updated = { ...prev, latitude: lat, longitude: lng };
      let closest = RANGES[0];
      let minDist = Infinity;
      RANGES.forEach(r => {
        const dist = Math.sqrt(Math.pow(lat - r.lat, 2) + Math.pow(lng - r.lng, 2));
        if (dist < minDist) {
          minDist = dist;
          closest = r;
        }
      });
      updated.range = closest.name;
      return updated;
    });
  };



  useEffect(() => {
    requestLocation();
    return () => {
      if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
    };
  }, []);

  const compressImage = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 1024;
          let width = img.width;
          let height = img.height;
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob((blob) => {
            resolve(new File([blob], file.name, { type: 'image/jpeg' }));
          }, 'image/jpeg', 0.7);
        };
      };
    });
  };

  const handleAddPhotos = async (files) => {
    if (!files.length) return;
    setLoading(true);
    const newImages = [];
    for (const file of Array.from(files)) {
      const compressed = await compressImage(file);
      newImages.push(compressed);
    }
    setForm(prev => ({ ...prev, images: [...prev.images, ...newImages] }));
    setLoading(false);
  };

  const removePhoto = (index) => {
    setForm(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

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
      const result = await submitReport({ 
        ...form, 
        severity: manualSeverity,
        reportType: type, 
        isClear: type === 'CLEARANCE',
        bullCount: counts.bull,
        makhnaCount: counts.makhna,
        maleGroupCount: counts.male_group,
        femaleGroupCount: counts.female_group,
        femaleCalfCount: counts.female_calf,
        single_female_count: counts.single_female,
        remarks: counts.unidentified > 0 ? `Unidentified: ${counts.unidentified}` : ''
      });
      
      if ('serviceWorker' in navigator && 'Notification' in window) {
        if (Notification.permission === 'granted') {
          navigator.serviceWorker.ready.then(registration => {
            registration.showNotification(`🚨 REPORT SENT: ${form.range}`, {
              body: `Severity: ${manualSeverity}. HQ has been alerted.`,
              icon: '/logo.png',
              vibrate: [200, 100, 200],
              tag: 'report-success'
            });
          });
        }
      }
      
      const playSiren = () => {
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3');
        audio.volume = 1.0;
        audio.play().catch(e => console.warn("Audio play blocked by browser", e));
      };
      playSiren();

      if ('vibrate' in navigator) navigator.vibrate([500, 200, 500, 200, 500]);

      setSubmittedResult(result);
      setSubmitted(true);
      
      setTimeout(() => {
        setSubmitted(false);
        setSubmittedResult(null);
        setForm({ count: 0, notes: '', images: [], voice: null, damageDesc: '', casualties: 0, chaseResult: '', latitude: form.latitude, longitude: form.longitude, range: form.range });
        setCounts({ bull: 0, makhna: 0, male_group: 0, female_group: 0, female_calf: 0, single_female: 0, unidentified: 0 });
        setAudioUrl(null);
        setActiveTags([]);
      }, 15000);
    } catch (err) {
      alert(t.error + ': ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const generateWhatsAppMessage = () => {
    if (!submittedResult) return '';
    const isClearance = submittedResult.report_type === 'CLEARANCE';
    const severityEmoji = manualSeverity === 'HIGH' ? '🔴' : manualSeverity === 'MEDIUM' ? '🟠' : '🟢';
    const photosCount = (submittedResult.image_urls?.length || (submittedResult.image_url ? 1 : 0));
    
    let msg = isClearance 
      ? `✅ *AECRCMC AREA CLEARANCE*\n✅ *சரகம் பாதுகாப்பானது*\n\n`
      : `🚨 *AECRCMC EMERGENCY ALERT*\n🚨 *அவசர எச்சரிக்கை*\n\n`;

    msg += `📍 *Range / சரகம்:* ${submittedResult.range}\n`;
    msg += `🌍 *Map / வரைபடம்:* https://www.google.com/maps?q=${submittedResult.latitude},${submittedResult.longitude}\n`;
    
    if (isClearance) {
      msg += `🛡️ *Status / நிலை:* Area Secured & Clear / பகுதி பாதுகாக்கப்பட்டது\n`;
    } else {
      msg += `🔥 *Severity / தீவிரம்:* ${severityEmoji} ${manualSeverity}\n`;
      msg += `🐘 *Count / எண்ணிக்கை:* ${submittedResult.elephant_count}\n`;
    }

    if (submittedResult.damage_desc) msg += `📜 *Notes / குறிப்பு:* ${submittedResult.damage_desc}\n`;
    
    msg += `\n📎 *Evidence / ஆதாரங்கள்:* ${photosCount} Photos 📸${submittedResult.voice_url ? ', 1 Voice Note 🎤' : ''}\n`;
    
    if (submittedResult.image_url) msg += `🖼️ *Photo:* ${submittedResult.image_url}\n`;
    if (submittedResult.voice_url) msg += `🎤 *Voice:* ${submittedResult.voice_url}\n`;
    
    msg += `\n⏰ *Time / நேரம்:* ${new Date(submittedResult.created_at).toLocaleTimeString()}\n`;
    msg += `🌍 _Sent via AECRCMC Ranger Portal_`;
    
    return encodeURIComponent(msg);
  };

  return (
    <div className="portal-container">
      <header className="header glass" style={{ borderBottom: '1px solid var(--glass-border)', borderRadius: '0 0 30px 30px', margin: '0 -1.5rem 2rem', padding: '1rem 1.5rem' }}>
        <div className="logo-container">
          <div className="logo-circle" onClick={() => setView('FORM')} style={{ cursor: 'pointer' }}>
            <img src="/logo.png" alt="AECRCMC" />
          </div>
          <div>
            <h1 style={{ fontFamily: 'var(--font-accent)', fontSize: '1.4rem', color: 'var(--color-gold)', fontWeight: 900, lineHeight: 1 }}>{t.title}</h1>
            <p className="label" style={{ margin: 0, opacity: 0.5, letterSpacing: '2px', fontSize: '0.5rem' }}>{t.subtitle}</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button 
            className={`lang-toggle ${view === 'ALERTS' ? 'active' : ''}`}
            onClick={() => setView(view === 'FORM' ? 'ALERTS' : 'FORM')}
            style={{ 
              background: view === 'ALERTS' ? 'var(--color-gold)' : 'rgba(255,255,255,0.05)',
              color: view === 'ALERTS' ? 'var(--color-coffee)' : 'var(--color-gold)',
              position: 'relative'
            }}
          >
            {view === 'FORM' ? <Bell size={22} /> : <History size={22} />}
            {view === 'FORM' && <div className="notification-count">!</div>}
          </button>
          <button className="lang-toggle" onClick={() => setLang(lang === 'en' ? 'ta' : 'en')}>
            <Globe size={22} />
          </button>
        </div>
      </header>
      
      {view === 'FORM' ? (
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
          {activeAlerts.length > 0 && (
            <div className="active-alerts-banner" style={{ marginBottom: '1.5rem' }}>
              <div className="label" style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div className="pulse-dot" style={{ background: '#ff4757' }}></div> 
                LIVE CONFLICTS ({activeAlerts.length})
              </div>
              <div style={{ display: 'flex', overflowX: 'auto', gap: '0.75rem', paddingBottom: '0.5rem' }} className="no-scrollbar">
                {activeAlerts.map(alert => (
                  <div 
                    key={alert.id} 
                    className="glass alert-card-mini" 
                    onClick={() => {
                      // Pre-fill range if clicked
                      setForm(prev => ({ ...prev, range: alert.range }));
                    }}
                    style={{ 
                      flex: '0 0 160px', 
                      padding: '0.75rem', 
                      borderLeft: `4px solid ${alert.severity === 'HIGH' ? '#ff4757' : alert.severity === 'MEDIUM' ? '#f1c40f' : '#2ecc71'}`,
                      background: 'rgba(255,255,255,0.05)',
                      cursor: 'pointer'
                    }}
                  >
                    <p style={{ fontSize: '0.7rem', fontWeight: 900, color: 'var(--color-gold)', marginBottom: '0.25rem' }}>{alert.range}</p>
                    <p style={{ fontSize: '0.75rem', fontWeight: 700, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {alert.elephant_count} Elephants
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.25rem' }}>
                       <a 
                        href={`https://www.google.com/maps?q=${alert.latitude},${alert.longitude}`}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        style={{ fontSize: '0.6rem', color: 'white', opacity: 0.4, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '2px' }}
                      >
                        <MapPin size={10} /> {alert.latitude?.toFixed(4)}, {alert.longitude?.toFixed(4)}
                      </a>
                    </div>
                    <p style={{ fontSize: '0.6rem', opacity: 0.4, marginTop: '0.25rem' }}>{new Date(alert.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                ))}
              </div>
            </div>
          )}


          <div className="type-selector">
            <button onClick={() => setType('SIGHTING')} className={`type-btn ${type === 'SIGHTING' ? 'active sighting' : ''}`}>
              <Navigation2 size={18} /> {t.sighting}
            </button>
            <button onClick={() => setType('CLEARANCE')} className={`type-btn ${type === 'CLEARANCE' ? 'active clearance' : ''}`}>
              <ShieldCheck size={18} /> {t.clearance}
            </button>
          </div>

          <form onSubmit={handleSubmit} className="form-section">
            <div className="glass info-card" style={{ background: 'var(--glass-heavy)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div className="icon-box" style={{ background: 'var(--color-gold)', color: 'var(--color-coffee)' }}>
                  <MapPin size={24} />
                </div>
                <div>
                  <p className="label" style={{ margin: 0 }}>{detecting ? t.detecting : t.detected}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <p style={{ fontWeight: 900, fontSize: '1rem', color: locationError ? '#ff4757' : 'white' }}>{form.range || '...'}</p>
                    {!detecting && !locationError && <div className="pulse-dot"></div>}
                  </div>
                </div>
              </div>
              <div className={`severity-badge ${manualSeverity.toLowerCase()}`} onClick={() => {
                  const levels = ['LOW', 'MEDIUM', 'HIGH'];
                  setManualSeverity(levels[(levels.indexOf(manualSeverity) + 1) % 3]);
                }} style={{ cursor: 'pointer' }}>
                {manualSeverity}
              </div>
            </div>

            {type === 'SIGHTING' && (
              <div className="field-group">
                <div className="label-container"><label className="label">Elephant Categories</label></div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  {ELEPHANT_TYPES.map(cat => (
                    <div 
                      key={cat.id} 
                      className={`glass media-card ${counts[cat.id] > 0 ? 'active' : ''}`}
                      onClick={() => adjustCount(cat.id, 1)}
                      style={{ padding: '0.75rem', minHeight: '110px', border: counts[cat.id] > 0 ? `2px solid ${cat.color}` : '', position: 'relative' }}
                    >
                      {/* Minus Button */}
                      {counts[cat.id] > 0 && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); adjustCount(cat.id, -1); }}
                          style={{ 
                            position: 'absolute', 
                            top: '5px', 
                            left: '5px', 
                            background: 'rgba(255,255,255,0.1)', 
                            border: 'none', 
                            borderRadius: '8px', 
                            width: '24px', 
                            height: '24px', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            color: 'white',
                            zIndex: 2
                          }}
                        >
                          <Minus size={14} />
                        </button>
                      )}
                      
                      <div style={{ position: 'absolute', top: '5px', right: '5px', background: counts[cat.id] > 0 ? cat.color : 'rgba(255,255,255,0.1)', color: 'white', padding: '2px 8px', borderRadius: '10px', fontSize: '0.8rem', fontWeight: 900, zIndex: 1 }}>
                        {counts[cat.id]}
                      </div>
                      <div style={{ width: '40px', height: '40px', borderRadius: '10px', overflow: 'hidden', marginBottom: '0.5rem' }}>
                        <img src={cat.img} alt={cat.id} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                      <p style={{ fontSize: '0.75rem', fontWeight: 900, margin: 0 }}>{lang === 'en' ? cat.label.en : cat.label.ta}</p>
                    </div>
                  ))}
                </div>
                <div className="field-group" style={{ marginTop: '1.5rem' }}>
                  <div style={{ textAlign: 'center', background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="label">Total Count</span>
                    <span style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--color-gold)', fontFamily: 'var(--font-accent)' }}>{form.count}</span>
                  </div>
                </div>
              </div>
            )}

            {type === 'CLEARANCE' && (
              <div className="field-group" style={{ animation: 'slideUp 0.3s ease-out' }}>
                <div className="glass info-card" style={{ background: 'rgba(46, 204, 113, 0.1)', borderColor: 'rgba(46, 204, 113, 0.2)' }}>
                   <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}><ShieldCheck size={24} color="#2ecc71" /><div><p className="label" style={{ color: '#2ecc71' }}>POST-CONFLICT STATUS</p><p style={{ fontWeight: 900 }}>Area Secured & Clear</p></div></div>
                </div>
                <div className="field-group" style={{ marginTop: '1.5rem' }}>
                  <label className="label">Damage Assessment</label>
                  <div className="tag-container">
                    {[ { label: 'No Damage', icon: '✅' }, { label: 'Crop Damage', icon: '🌾' }, { label: 'Property Damage', icon: '🏠' }, { label: 'Human Injury', icon: '🩹' }, { label: 'Casualty', icon: '🚑' } ].map(item => (
                      <div key={item.label} onClick={() => setForm({...form, damageDesc: item.label})} className={`tag ${form.damageDesc === item.label ? 'active' : ''}`}>
                        {item.icon} {item.label}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="field-group">
              <label className="label">{type === 'SIGHTING' ? t.notes : 'Final Remarks'}</label>
              <textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} className="input-main" placeholder="..." rows={3} />
              {type === 'SIGHTING' && ( <div className="tag-container">{t.tags.map(tag => ( <div key={tag} onClick={() => toggleTag(tag)} className={`tag ${activeTags.includes(tag) ? 'active' : ''}`}>{tag}</div> ))}</div> )}
            </div>

            <div className="media-grid">
              <div className={`glass media-card ${form.voice || recording ? 'active' : ''}`} onClick={() => { if (recording) stopRecording(); else if (!audioUrl) startRecording(); }}>
                <div className="icon-box">{recording ? <Square size={24} fill="currentColor" /> : <Mic size={24} />}</div>
                <span className="media-label">{recording ? t.recording : form.voice ? 'READY' : t.record}</span>
              </div>
              <div className="glass media-card" style={{ position: 'relative' }}>
                <input type="file" accept="image/*" capture="environment" multiple onChange={e => handleAddPhotos(e.target.files)} style={{ position: 'absolute', inset: 0, opacity: 0, zIndex: 10, cursor: 'pointer' }} />
                <div className="icon-box"><Camera size={24} /></div><span className="media-label">PHOTOS ({form.images.length})</span>
              </div>
            </div>

            <button disabled={loading || submitted || detecting} className={`submit-btn ${submitted ? 'success' : ''}`}>
              {loading ? <RefreshCw size={28} className="animate-spin" /> : submitted ? <CheckCircle2 size={28} /> : <><Navigation size={24} /> {t.submit}</>}
            </button>
          </form>
        </motion.div>
      ) : (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="alerts-container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ fontFamily: 'var(--font-accent)', color: 'var(--color-gold)' }}>{t.alertsTitle}</h2>
            <button onClick={fetchAlerts} className="lang-toggle" style={{ width: '36px', height: '36px' }}>
              <RefreshCw size={16} className={fetchingAlerts ? 'animate-spin' : ''} />
            </button>
          </div>
          
          {fetchingAlerts && recentAlerts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', opacity: 0.5 }}>
              <RefreshCw size={40} className="animate-spin" style={{ margin: '0 auto 1rem' }} />
              <p>Fetching alerts...</p>
            </div>
          ) : recentAlerts.length > 0 ? (
            recentAlerts.map(alert => (
              <div key={alert.id} className="glass alert-item">
                <div className="alert-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div className={`badge-dot ${alert.severity?.toLowerCase() || 'low'}`}></div>
                    <span style={{ fontSize: '0.8rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px' }}>{alert.range || 'System'}</span>
                  </div>
                  <span className="alert-time">{new Date(alert.created_at).toLocaleString()}</span>
                </div>
                <div className="alert-body">
                  {alert.report_type === 'SIGHTING' ? (
                    `🚨 Sighting: ${alert.elephant_count} elephants reported.`
                  ) : alert.report_type === 'CLEARANCE' ? (
                    `✅ Area reported as CLEAR.`
                  ) : alert.notes}
                </div>
                <div className="alert-meta">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <AlertTriangle size={12} /> {alert.severity || 'LOW'}
                  </div>
                  <a 
                    href={`https://www.google.com/maps?q=${alert.latitude},${alert.longitude}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'inherit', textDecoration: 'none', opacity: 0.6 }}
                  >
                    <MapPin size={12} /> {alert.latitude?.toFixed(4)}, {alert.longitude?.toFixed(4)}
                  </a>
                  {alert.image_url && <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><ImageIcon size={12} /> Photo</div>}
                  {alert.voice_url && <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Mic size={12} /> Voice</div>}
                </div>
              </div>
            ))
          ) : (
            <div style={{ textAlign: 'center', padding: '4rem', opacity: 0.3 }}>
              <Info size={40} style={{ margin: '0 auto 1rem' }} />
              <p>{t.noAlerts}</p>
            </div>
          )}
          <div style={{ height: '100px' }}></div>
        </motion.div>
      )}

      <AnimatePresence>
        {submitted && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="success-overlay">
            <motion.div initial={{ scale: 0.9, y: 30 }} animate={{ scale: 1, y: 0 }} className="success-card">
              <div style={{ width: '80px', height: '80px', background: 'rgba(46, 204, 113, 0.1)', borderRadius: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2ecc71', margin: '0 auto 2rem', border: '1px solid rgba(46, 204, 113, 0.2)' }}><CheckCircle2 size={40} /></div>
              <h2 style={{ fontSize: '1.8rem', fontWeight: 900, marginBottom: '0.5rem', fontFamily: 'var(--font-accent)' }}>{t.success}</h2>
              <p style={{ opacity: 0.5, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '4px', fontWeight: 900, marginBottom: '2rem' }}>HQ ALERTED</p>
              <a href={`https://wa.me/?text=${generateWhatsAppMessage()}`} target="_blank" rel="noreferrer" className="submit-btn" style={{ background: '#25D366', textDecoration: 'none', color: 'white', padding: '1.25rem' }}><RefreshCw size={24} style={{ transform: 'rotate(45deg)' }} /> BROADCAST TO WHATSAPP</a>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
