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
  Image as ImageIcon
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
  const [subscriptionId, setSubscriptionId] = useState(null);
  const [counts, setCounts] = useState({
    bull: 0,
    makhna: 0,
    male_group: 0,
    female_group: 0,
    female_calf: 0,
    single_female: 0,
    unidentified: 0
  });

  useEffect(() => {
    const checkSub = () => {
      // PushAlert usually handles this via its UI, but we can check if it's loaded
      if (window.PushAlert) {
         setSubscriptionId('PushAlert Active');
      }
    };
    const interval = setInterval(checkSub, 5000);
    return () => clearInterval(interval);
  }, []);
  
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

  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      alert("🔔 PushAlert: Please use the floating bell icon or the popup that appears to subscribe.");
    } else {
      alert("❌ Browser does not support notifications");
    }
  };

  const testDirectNotification = async () => {
    alert("✅ PushAlert Integrated!\n\nYou will receive a notification as soon as an alert is broadcasted by the database.");
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
      
      // Trigger Local Native Notification (Instant)
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
      // Play Emergency Siren Sound
      const playSiren = () => {
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3');
        audio.volume = 1.0;
        audio.play().catch(e => console.warn("Audio play blocked by browser", e));
      };
      playSiren();

      if ('vibrate' in navigator) navigator.vibrate([500, 200, 500, 200, 500]);

      // Note: Global broadcast is now handled by the Supabase trigger via Webpushr REST API.
      // We no longer trigger it from the frontend to keep the REST API key secure.

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
    
    const severityEmoji = manualSeverity === 'HIGH' ? '🔴' : manualSeverity === 'MEDIUM' ? '🟠' : '🟢';
    const photosCount = submittedResult.image_urls?.length || 0;
    
    let msg = `🚨 *AECRCMC EMERGENCY ALERT*\n`;
    msg += `🚨 *அவசர எச்சரிக்கை*\n\n`;
    msg += `📍 *Range / சரகம்:* ${submittedResult.range}\n`;
    msg += `🔥 *Severity / தீவிரம்:* ${severityEmoji} ${manualSeverity}\n`;
    msg += `🐘 *Count / எண்ணிக்கை:* ${submittedResult.elephant_count}\n`;
    if (submittedResult.damage_desc) msg += `📜 *Damage / சேதம்:* ${submittedResult.damage_desc}\n`;
    msg += `📎 *Attachments:* ${photosCount} Photos 📸, ${submittedResult.voice_url ? '1 Voice Note 🎤' : 'No Voice'}\n\n`;
    
    if (submittedResult.image_url) msg += `🖼️ *Photo 1:* ${submittedResult.image_url}\n`;
    if (submittedResult.image_url_2) msg += `🖼️ *Photo 2:* ${submittedResult.image_url_2}\n`;
    if (submittedResult.voice_url) msg += `🎤 *Voice Note:* ${submittedResult.voice_url}\n`;
    
    msg += `\n⏰ *Time / நேரம்:* ${new Date(submittedResult.created_at).toLocaleTimeString()}\n`;
    msg += `🌍 _Dashboard: Full gallery uploaded._`;
    
    return encodeURIComponent(msg);
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
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button 
            className="lang-toggle"
            onClick={requestNotificationPermission}
            style={{ background: '#2ecc71', color: 'white', fontSize: '0.6rem', width: 'auto', padding: '0 10px', fontWeight: 900 }}
          >
            JOIN ALERTS
          </button>
          <button 
            className="lang-toggle"
            onClick={testDirectNotification}
            style={{ background: '#3498db', color: 'white', fontSize: '0.6rem', width: 'auto', padding: '0 10px', fontWeight: 900 }}
          >
            TEST ME
          </button>
          <button 
            className={`lang-toggle ${locationError || !('Notification' in window && Notification.permission === 'granted') ? 'alert' : ''}`} 
            onClick={() => { requestLocation(); requestNotificationPermission(); }}
            style={{ 
              background: (locationError || (window.Notification && Notification.permission !== 'granted')) ? 'rgba(255, 71, 87, 0.2)' : '',
              border: (locationError || (window.Notification && Notification.permission !== 'granted')) ? '1px solid #ff4757' : ''
            }}
          >
            <ShieldCheck size={22} color={(locationError || (window.Notification && Notification.permission !== 'granted')) ? '#ff4757' : 'currentColor'} />
          </button>
          <button className="lang-toggle" onClick={() => setLang(lang === 'en' ? 'ta' : 'en')}>
            <Globe size={22} />
          </button>
        </div>
      </header>
      
      {!subscriptionId && !loading && (
        <div 
          onClick={requestNotificationPermission}
          style={{ 
            background: '#ff4757', 
            color: 'white', 
            padding: '12px', 
            textAlign: 'center', 
            fontSize: '0.8rem', 
            fontWeight: 900,
            cursor: 'pointer',
            animation: 'pulse 2s infinite'
          }}
        >
          🚨 ALERT SYSTEM DISCONNECTED! TAP HERE TO JOIN
        </div>
      )}

      {window.location.protocol === 'http:' && window.location.hostname !== 'localhost' && (
        <div style={{ background: '#ff4757', color: 'white', fontSize: '0.7rem', padding: '5px', textAlign: 'center', fontWeight: 900 }}>
          ⚠️ SECURITY ERROR: GPS & NOTIFICATIONS REQUIRE HTTPS
        </div>
      )}

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
              <p className="label" style={{ margin: 0 }}>
                {locationError === 'PERMISSION_DENIED' ? 'GPS Blocked' : 
                 locationError ? 'GPS Error' :
                 detecting ? t.detecting : t.detected}
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <p style={{ fontWeight: 900, fontSize: '1rem', color: locationError ? '#ff4757' : 'white' }}>
                  {locationError === 'PERMISSION_DENIED' ? 'Allow location in settings' :
                   locationError ? 'Weak signal. Try again.' :
                   form.range || '...'}
                </p>
                {!detecting && !locationError && <div className="pulse-dot"></div>}
                {locationError && (
                  <button type="button" onClick={requestLocation} className="tag active" style={{ padding: '2px 8px', fontSize: '0.6rem', marginLeft: '5px' }}>
                    RETRY
                  </button>
                )}
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
                  style={{ padding: '1.25rem', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', border: counts[cat.id] > 0 ? `2px solid ${cat.color}` : '1px solid rgba(255,255,255,0.05)' }}
                >
                  <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ width: '60px', height: '60px', borderRadius: '15px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
                      <img src={cat.img} alt={cat.id} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontSize: '1rem', fontWeight: 900, color: 'white', margin: 0 }}>{lang === 'en' ? cat.label.en : cat.label.ta}</p>
                      <p style={{ fontSize: '0.7rem', opacity: 0.4, margin: 0 }}>{cat.sub}</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(0,0,0,0.3)', padding: '0.5rem', borderRadius: '12px' }} onClick={(e) => e.stopPropagation()}>
                    <button type="button" onClick={() => adjustCount(cat.id, -1)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', borderRadius: '8px', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Minus size={20} />
                    </button>
                    <span style={{ minWidth: '24px', textAlign: 'center', fontWeight: 900, fontSize: '1.2rem', color: cat.color }}>{counts[cat.id]}</span>
                    <button type="button" onClick={() => adjustCount(cat.id, 1)} style={{ background: cat.color, border: 'none', color: 'white', borderRadius: '8px', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Plus size={20} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="field-group" style={{ marginTop: '2rem' }}>
              <div className="label-container"><label className="label">{t.elephantCount}</label><span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.2)', fontWeight: 900 }}>TOTAL COUNT</span></div>
              <div style={{ textAlign: 'center', background: 'rgba(255,255,255,0.03)', padding: '1.5rem', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)', fontSize: '3rem', fontWeight: 900, color: 'var(--color-gold)', fontFamily: 'var(--font-accent)' }}>{form.count}</div>
            </div>
          </div>
        )}

        {type === 'CLEARANCE' && (
          <div className="field-group" style={{ animation: 'slideUp 0.3s ease-out' }}>
            <div className="glass info-card" style={{ background: 'rgba(46, 204, 113, 0.1)', borderColor: 'rgba(46, 204, 113, 0.2)', marginBottom: '1.5rem' }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}><ShieldCheck size={24} className="text-green-500" /><div><p className="label" style={{ color: '#2ecc71' }}>POST-CONFLICT STATUS</p><p style={{ fontWeight: 900, fontSize: '1.1rem' }}>Area Secured & Clear</p></div></div>
            </div>
            <div className="field-group">
              <label className="label">Damage Assessment</label>
              <div className="tag-container">
                {[ { label: 'No Damage', icon: '✅' }, { label: 'Crop Damage', icon: '🌾' }, { label: 'Property Damage', icon: '🏠' }, { label: 'Human Injury', icon: '🩹' }, { label: 'Casualty', icon: '🚑' } ].map(item => (
                  <div key={item.label} onClick={() => setForm({...form, damageDesc: item.label})} className={`tag ${form.damageDesc === item.label ? 'active' : ''}`} style={{ background: form.damageDesc === item.label ? 'var(--color-gold)' : '', padding: '10px 15px', fontSize: '0.7rem' }}>
                    <span style={{ marginRight: '5px' }}>{item.icon}</span> {item.label}
                  </div>
                ))}
              </div>
            </div>
            <div className="field-group" style={{ marginTop: '1.5rem' }}>
              <div className="label-container"><label className="label">Casualties Reported</label><span style={{ fontSize: '0.6rem', color: 'red', fontWeight: 900 }}>CRITICAL</span></div>
              <div className="count-adjuster" style={{ background: 'rgba(255,0,0,0.05)', borderColor: 'rgba(255,0,0,0.1)' }}>
                <button type="button" className="adj-btn" onClick={() => setForm(f => ({ ...f, casualties: Math.max(0, f.casualties - 1) }))}><Minus size={24} /></button>
                <div className="count-display" style={{ color: form.casualties > 0 ? 'red' : 'white', fontFamily: 'Inter, sans-serif', fontSize: '3rem' }}>{form.casualties}</div>
                <button type="button" className="adj-btn" onClick={() => setForm(f => ({ ...f, casualties: f.casualties + 1 }))}><Plus size={24} /></button>
              </div>
            </div>
            <div className="field-group" style={{ marginTop: '1.5rem' }}><label className="label">Chase Result / Final Direction</label><input type="text" value={form.chaseResult || ''} onChange={e => setForm({...form, chaseResult: e.target.value})} className="input-main" placeholder="e.g. Driven towards forest boundary" /></div>
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
            {audioUrl && !recording && ( <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}><button type="button" onClick={(e) => {e.stopPropagation(); new Audio(audioUrl).play();}} className="tag active" style={{ borderRadius: '8px' }}><Play size={10} fill="currentColor" /></button><button type="button" onClick={(e) => {e.stopPropagation(); setAudioUrl(null); setForm(f=>({...f, voice: null}))}} className="tag" style={{ borderRadius: '8px' }}><Trash2 size={10} /></button></div> )}
          </div>
          <div className="glass media-card" style={{ position: 'relative' }}>
            <input type="file" accept="image/*" capture="environment" multiple onChange={e => handleAddPhotos(e.target.files)} style={{ position: 'absolute', inset: 0, opacity: 0, zIndex: 10, cursor: 'pointer' }} />
            <div className="icon-box"><Camera size={24} /></div><span className="media-label">ADD PHOTOS ({form.images.length})</span>
          </div>
        </div>

        {form.images.length > 0 && (
          <div className="field-group" style={{ marginTop: '1rem' }}>
             <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '10px' }}>
                {form.images.map((img, i) => (
                  <div key={i} style={{ position: 'relative', flexShrink: 0 }}>
                    <div style={{ width: '60px', height: '60px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}><ImageIcon size={20} className="text-[var(--color-gold)]" /></div>
                    <button type="button" onClick={() => removePhoto(i)} style={{ position: 'absolute', top: '-5px', right: '-5px', background: 'red', border: 'none', color: 'white', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Trash2 size={12} /></button>
                  </div>
                ))}
             </div>
          </div>
        )}

        <button disabled={loading || submitted || detecting} className={`submit-btn ${submitted ? 'success' : ''}`}>
          {loading ? <RefreshCw size={28} className="animate-spin" /> : submitted ? <CheckCircle2 size={28} /> : <><Navigation size={24} /> {t.submit}</>}
        </button>
      </form>

      <AnimatePresence>
        {submitted && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="success-overlay">
            <motion.div initial={{ scale: 0.9, y: 30 }} animate={{ scale: 1, y: 0 }} className="success-card">
              <div style={{ width: '100px', height: '100px', background: 'rgba(46, 204, 113, 0.1)', borderRadius: '35px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2ecc71', margin: '0 auto 2rem', border: '1px solid rgba(46, 204, 113, 0.2)' }}><CheckCircle2 size={50} /></div>
              <h2 style={{ fontSize: '2.5rem', fontWeight: 900, marginBottom: '0.5rem', fontFamily: 'var(--font-accent)' }}>{t.success}</h2>
              <p style={{ opacity: 0.5, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '4px', fontWeight: 900, marginBottom: '2rem' }}>HQ ALERTED</p>
              <a href={`https://wa.me/?text=${generateWhatsAppMessage()}`} target="_blank" rel="noreferrer" className="submit-btn" style={{ background: '#25D366', textDecoration: 'none', color: 'white' }}><RefreshCw size={24} style={{ transform: 'rotate(45deg)' }} /> BROADCAST TO WHATSAPP</a>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
