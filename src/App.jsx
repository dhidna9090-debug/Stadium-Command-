import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import {
  MessageCircle, Send, Loader2, MapPin, Bus, Leaf, ShieldAlert, Users, Radio,
  Globe, Navigation, AlertTriangle, CheckCircle2, Accessibility, Sparkles,
  ClipboardList, TrendingUp, TrendingDown, Minus, Zap, Droplets, Recycle,
  Clock, ShieldCheck, Crosshair, Map, Mic, BellRing, CalendarDays, Key, Lock, 
  LogOut, QrCode, Camera, Scan, Flame, CloudRain, Sun, UserCheck, Search, Box, Trophy, ArrowRight, Megaphone, Trash2, Headphones, CheckCheck
} from "lucide-react";

import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from "firebase/auth";
import { getFirestore, doc, setDoc, onSnapshot, collection, addDoc, query, where, deleteDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = 'default-app-id';

// UPDATE 1: Added a fallback. If Vite is acting up, paste your key directly inside the quotes below.
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || ""; 

async function askGemini({ system, messages, isJson = false }) {
  const activeKey = GEMINI_API_KEY;
  
  // UPDATE 2: Safety check before hitting the API
  if (!activeKey || activeKey === "undefined" || activeKey === "null") {
    console.error("GEMINI ERROR: API Key is missing. Check your .env file or hardcode it temporarily.");
    throw new Error("Missing Gemini API Key. Please check your setup.");
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${activeKey}`;
  
  const formattedContents = messages.map(m => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }]
  }));
  const payload = { contents: formattedContents };
  if (system) payload.systemInstruction = { parts: [{ text: system }] };
  if (isJson) payload.generationConfig = { responseMimeType: "application/json" };

  let retries = 3;
  let delay = 1000;
  while (retries > 0) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const errText = await response.text();
        console.error("GEMINI ERROR DETAILS:", response.status, errText);
        throw new Error(`API Error: ${response.status} - ${errText.slice(0, 50)}...`);
      }
      const data = await response.json();
      return data.candidates[0].content.parts[0].text.trim();
    } catch (error) {
      retries--;
      if (retries === 0) throw error; // Throw the actual error instead of generic "Request failed"
      await new Promise(r => setTimeout(r, delay));
      delay *= 2;
    }
  }
}

const HOST_CITIES = {
  "NY": { id: "NY", city: "New York/New Jersey", country: "USA", stadium: "MetLife Stadium", capacity: 82500, opened: 2010, surface: "Artificial Turf", lat: 40.8136, lng: -74.0745 },
  "MIA": { id: "MIA", city: "Miami", country: "USA", stadium: "Hard Rock Stadium", capacity: 65000, opened: 1987, surface: "Natural Grass", lat: 25.9580, lng: -80.2389 },
  "DAL": { id: "DAL", city: "Dallas", country: "USA", stadium: "AT&T Stadium", capacity: 94000, opened: 2009, surface: "Artificial Turf", lat: 32.7473, lng: -97.0945 },
  "LA": { id: "LA", city: "Los Angeles", country: "USA", stadium: "SoFi Stadium", capacity: 70240, opened: 2020, surface: "Matrix Turf", lat: 33.9534, lng: -118.3391 },
  "ATL": { id: "ATL", city: "Atlanta", country: "USA", stadium: "Mercedes-Benz Stadium", capacity: 71000, opened: 2017, surface: "FieldTurf", lat: 33.7553, lng: -84.4006 },
};

const LANGUAGES = ["English", "Español", "Français", "Português", "العربية", "हिन्दी", "中文"];

function occColor(pct) {
  if (pct >= 85) return "#ef4444";
  if (pct >= 70) return "#f59e0b";
  return "#10b981";
}

function TrendIcon({ trend }) {
  if (trend === "up") return <TrendingUp className="w-3.5 h-3.5 text-red-400" />;
  if (trend === "down") return <TrendingDown className="w-3.5 h-3.5 text-emerald-400" />;
  return <Minus className="w-3.5 h-3.5 text-slate-500" />;
}

function Display({ children, className = "" }) {
  return <span className={className} style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: "0.03em" }}>{children}</span>;
}

function ErrorNote({ msg }) {
  if (!msg) return null;
  return (
    <div className="flex items-start gap-3 text-sm text-red-300 mt-3 p-4 bg-red-950/40 border border-red-900/50 rounded-xl backdrop-blur-md">
      <AlertTriangle className="w-5 h-5 shrink-0 text-red-500 mt-0.5" />
      <p>{msg}</p>
    </div>
  );
}

function GenerateButton({ onClick, loading, label, icon: Icon, className="" }) {
  return (
    <button onClick={onClick} disabled={loading} className={`relative overflow-hidden inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-400 hover:to-emerald-300 disabled:from-slate-700 disabled:to-slate-700 disabled:text-slate-400 text-slate-950 font-bold text-sm px-5 py-3 transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_25px_rgba(16,185,129,0.5)] disabled:shadow-none hover:-translate-y-0.5 active:translate-y-0 ${className}`}>
      {loading && <div className="absolute inset-0 bg-white/20 animate-pulse"></div>}
      {loading ? <Loader2 className="w-4 h-4 animate-spin relative z-10" /> : <Icon className="w-4 h-4 relative z-10" />}
      <span className="relative z-10">{loading ? "Processing AI..." : label}</span>
    </button>
  );
}

const MATCH_SCHEDULE = [
  { date: "2026-07-10", label: "July 10 - Quarter Final", matches: [{ id: "m98", cityId: "LA", title: "Quarter Final - Match 98", team1: "France", team2: "Brazil", time: "3:00 PM Local", stage: "Quarter-Final" }]},
  { date: "2026-07-11", label: "July 11 - Quarter Final", matches: [{ id: "m92", cityId: "MIA", title: "Quarter Final - Match 100", team1: "Argentina", team2: "Portugal", time: "8:00 PM Local", stage: "Quarter-Final" }]},
  { date: "2026-07-14", label: "July 14 - Semi Final 1", matches: [{ id: "m97", cityId: "DAL", title: "Semi-Final 1", team1: "France", team2: "Argentina", time: "7:00 PM Local", stage: "Semi-Final" }]},
  { date: "2026-07-15", label: "July 15 - Semi Final 2", matches: [{ id: "m98s", cityId: "ATL", title: "Semi-Final 2", team1: "Spain", team2: "England", time: "7:00 PM Local", stage: "Semi-Final" }]},
  { date: "2026-07-18", label: "July 18 - 3rd Place", matches: [{ id: "m103", cityId: "MIA", title: "Third Place Play-off", team1: "France", team2: "England", time: "5:00 PM Local", stage: "Finals Phase" }]},
  { date: "2026-07-19", label: "July 19 - FINAL", matches: [{ id: "m104", cityId: "NY", title: "FIFA World Cup Final™", team1: "Spain", team2: "Argentina", time: "3:00 PM Local", stage: "World Cup Final" }]},
];

const generateGates = (prefixes) => prefixes.map((p, i) => ({
  id: p, zone: i < 2 ? "North" : i < 4 ? "East" : i < 6 ? "South" : "West", capacity: 5000 + Math.random()*2000, current: 2000 + Math.random()*3000, trend: Math.random() > 0.5 ? "up" : "down", entryRate: Math.round(20 + Math.random()*60), exitRate: Math.round(5 + Math.random()*20), queueLength: Math.round(10 + Math.random()*150)
}));

const STADIUM_PROFILES = {
  "NY": {
    layout: { top: "VERIZON GATE", bottom: "METLIFE GATE", left: "BUD LIGHT GATE", right: "HCLTECH GATE" },
    initialGates: generateGates(["Verizon 1", "Verizon 2", "HCLTech A", "HCLTech B", "MetLife South", "MetLife VIP", "BudLight 1", "Pepsi Gate"]),
    pois: [
      { name: "MetLife 50 Club VIP", type: "VIP Lounge", walk: "7 min", x: 80, y: 50, gate: "HCLTech A" },
      { name: "Family Restroom - East", type: "Restroom", walk: "3 min", x: 85, y: 20, gate: "HCLTech B" },
      { name: "Sensory Room - Level 1", type: "Accessibility", walk: "8 min", x: 20, y: 80, gate: "BudLight 1" },
      { name: "Flagship Team Store", type: "Retail", walk: "6 min", x: 70, y: 70, gate: "MetLife South" },
      { name: "Verizon Entry Plaza", type: "Entrance", walk: "2 min", x: 50, y: 15, gate: "Verizon 1" },
    ]
  },
  "DAL": {
    layout: { top: "ENTRY A & B", bottom: "ENTRY C & D", left: "ENTRY E (VIP)", right: "ENTRY F (VIP)" },
    initialGates: generateGates(["Entry A", "Entry B", "Entry C", "Entry D", "Entry E", "Entry F", "Entry G", "Entry H"]),
    pois: [
      { name: "Miller Lite House", type: "Entertainment", walk: "8 min", x: 15, y: 85, gate: "Entry E" },
      { name: "Main Concourse Restroom", type: "Restroom", walk: "3 min", x: 85, y: 80, gate: "Entry F" },
      { name: "Event Level First Aid", type: "Medical", walk: "5 min", x: 80, y: 50, gate: "Entry G" },
    ]
  },
  "MIA": {
    layout: { top: "NORTH GATES", bottom: "SOUTH GATES", left: "WEST PLAZA", right: "EAST PLAZA" },
    initialGates: generateGates(["NW Gate", "NE Gate", "East VIP", "East Plaza", "SW Gate", "SE Gate", "West VIP", "West Plaza"]),
    pois: [
      { name: "72 Club Seating", type: "Seating", walk: "5 min", x: 50, y: 75, gate: "SW Gate" },
      { name: "Quiet Room - Level 1", type: "Accessibility", walk: "6 min", x: 85, y: 50, gate: "East Plaza" },
    ]
  },
  "LA": {
    layout: { top: "VIP ENTRANCE", bottom: "MAIN PLAZA", left: "WEST ENTRY", right: "EAST ENTRY" },
    initialGates: generateGates(["VIP 1", "VIP 2", "East 1", "East 2", "Main 1", "Main 2", "West 1", "West 2"]),
    pois: [
      { name: "Infinity Screen Lounge", type: "Seating", walk: "5 min", x: 50, y: 50, gate: "Main 1" },
    ]
  },
  "ATL": {
    layout: { top: "GATE 1 & 2", bottom: "GATE 3 & 4", left: "GATE 5 & 6", right: "VIP GATES" },
    initialGates: generateGates(["Gate 1", "Gate 2", "VIP North", "VIP South", "Gate 3", "Gate 4", "Gate 5", "Gate 6"]),
    pois: [
      { name: "Halo Board Access", type: "Seating", walk: "4 min", x: 50, y: 50, gate: "Gate 3" },
    ]
  }
};

const RING_WAYPOINTS = [
  { x: 81, y: 50, label: "E"  },
  { x: 75, y: 75, label: "SE" },
  { x: 50, y: 81, label: "S"  },
  { x: 25, y: 75, label: "SW" },
  { x: 19, y: 50, label: "W"  },
  { x: 25, y: 25, label: "NW" },
  { x: 50, y: 19, label: "N"  },
  { x: 75, y: 25, label: "NE" },
];

const GREEN_QUESTS = [
  { id: 1, title: "Use Water Refill Station", desc: "Scan QR at any concourse station", points: 10, icon: Droplets, color: "text-cyan-400", bg: "bg-cyan-500/10", border: "hover:border-cyan-500/50" },
  { id: 2, title: "Properly Sort Waste", desc: "Scan at Smart Bins", points: 15, icon: Recycle, color: "text-amber-400", bg: "bg-amber-500/10", border: "hover:border-amber-500/50" },
  { id: 3, title: "Take EV Shuttle", desc: "Link your public transit pass", points: 25, icon: Bus, color: "text-indigo-400", bg: "bg-indigo-500/10", border: "hover:border-indigo-500/50" }
];

const REWARDS = [
  { id: 'water', name: 'Free Water Bottle', cost: 50, icon: Droplets, color: 'text-cyan-400' },
  { id: 'popcorn', name: 'Stadium Popcorn', cost: 100, icon: Flame, color: 'text-amber-400' },
  { id: 'drink', name: 'Cold Drink', cost: 150, icon: Zap, color: 'text-indigo-400' }
];

function ringAngle(x, y) {
  let a = Math.atan2(y - 50, x - 50) * (180 / Math.PI);
  if (a < 0) a += 360;
  return a;
}

function nearestRingIndex(x, y) {
  const a = ringAngle(x, y);
  let best = 0, bestDiff = Infinity;
  RING_WAYPOINTS.forEach((p, i) => {
    const pa = ringAngle(p.x, p.y);
    let diff = Math.abs(pa - a);
    if (diff > 180) diff = 360 - diff;
    if (diff < bestDiff) { bestDiff = diff; best = i; }
  });
  return best;
}

const generateSmartPath = (x1, y1, x2, y2) => {
  const n = RING_WAYPOINTS.length;
  const i1 = nearestRingIndex(x1, y1);
  const i2 = nearestRingIndex(x2, y2);
  const cwSteps = (i2 - i1 + n) % n;
  const ccwSteps = (i1 - i2 + n) % n;
  const dir = cwSteps <= ccwSteps ? 1 : -1;
  const steps = Math.min(cwSteps, ccwSteps);

  const ring = [];
  let idx = i1;
  for (let s = 0; s <= steps; s++) {
    ring.push(RING_WAYPOINTS[idx]);
    idx = (idx + dir + n) % n;
  }
  const pts = [{ x: x1, y: y1 }, ...ring, { x: x2, y: y2 }];
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length; i++) d += ` L ${pts[i].x} ${pts[i].y}`;
  return { path: d, waypoints: pts, hops: steps + 1 };
};

function teamAbbrev(name) {
  if (!name) return "??";
  return name.slice(0, 3).toUpperCase();
}

function timeAgo(ts) {
  const diff = Math.max(0, Date.now() - ts);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return new Date(ts).toLocaleDateString();
}

export default function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [persona, setPersona] = useState("fan");
  const [fanTab, setFanTab] = useState("network");
  const [staffTab, setStaffTab] = useState("crowd");
  
  const [selectedScheduleDate, setSelectedScheduleDate] = useState("2026-07-19");
  const [selectedMatch, setSelectedMatch] = useState(MATCH_SCHEDULE[MATCH_SCHEDULE.length - 1].matches[0]);
  const currentCityId = selectedMatch.cityId;
  const stadiumData = STADIUM_PROFILES[currentCityId];
  
  // App wide state
  const [gates, setGates] = useState(stadiumData.initialGates);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [globalIncidents, setGlobalIncidents] = useState([]);
  const [activeAlerts, setActiveAlerts] = useState([]); 
  const [syncError, setSyncError] = useState(false); 

  // Live Parking State
  const [parkingLots, setParkingLots] = useState([
    { id: "Lot A (VIP)", capacity: 500, filled: 480 },
    { id: "Lot B (General)", capacity: 1200, filled: 800 },
    { id: "Lot C (Express)", capacity: 800, filled: 300 }
  ]);

  const [ecoPoints, setEcoPoints] = useState(0);
  const [isRedeemModalOpen, setIsRedeemModalOpen] = useState(false);
  const [selectedReward, setSelectedReward] = useState(null);
  const [seatInfo, setSeatInfo] = useState("");
  const [orderStatus, setOrderStatus] = useState("idle");

  // Staff Authorization
  const [isStaffAuthorized, setIsStaffAuthorized] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState("");
  
  const [announcements, setAnnouncements] = useState([]);
  const [newAnnouncement, setNewAnnouncement] = useState("");
  const [announcementPriority, setAnnouncementPriority] = useState("Info");
  const [broadcastSending, setBroadcastSending] = useState(false);
  const [dismissedAnnouncementId, setDismissedAnnouncementId] = useState(null);

  // Staff Specific State
  const [incidentNote, setIncidentNote] = useState("");
  const [incidentLoading, setIncidentLoading] = useState(false);
  const [briefing, setBriefing] = useState("");
  const [briefingLoading, setBriefingLoading] = useState(false);
  const [weatherData, setWeatherData] = useState({ temp: 28, condition: "Storm Warning", risk: "High", alert: "Lightning detected within 10 miles. Recommend pausing outdoor plaza activities." });
  const [volunteers, setVolunteers] = useState([
    { id: 1, name: "Sarah J.", role: "Medical", zone: "East Plaza", status: "Active" },
    { id: 2, name: "Mike T.", role: "Crowd Control", zone: "North Gate", status: "Break" },
    { id: 3, name: "Elena R.", role: "Accessibility", zone: "West Concourse", status: "Active" }
  ]);
  const [lostItems, setLostItems] = useState([
    { id: "LF-092", item: "Blue Backpack", status: "AI Searching", zone: "Section 104" },
    { id: "LF-093", item: "Keys with Lanyard", status: "Matched", zone: "South Gate" }
  ]);

  // Scanner State
  const [scannerState, setScannerState] = useState({ active: false, quest: null, stream: null, status: 'idle', message: '' });
  const videoRef = useRef(null);

  // Adjusted Ticker to ONLY show Weather per user request
  const [tickerItems, setTickerItems] = useState([
    "Weather Alert: Clear skies, 27°C at kickoff.",
    "Weather Forecast: Humidity at 45%, Wind NW at 12km/h.",
    "Weather Status: No precipitation expected during the match window.",
  ]);

  // AI Concierge State
  const [language, setLanguage] = useState("English");
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState(null);
  const scrollRef = useRef(null);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);

  // Live Support State (direct human chat between fans and stadium staff)
  const [supportMessages, setSupportMessages] = useState([]);
  const [supportInput, setSupportInput] = useState("");
  const [supportSending, setSupportSending] = useState(false);
  const supportScrollRef = useRef(null);

  const [supportThreads, setSupportThreads] = useState([]);
  const [selectedThreadId, setSelectedThreadId] = useState(null);
  const [staffThreadMessages, setStaffThreadMessages] = useState([]);
  const [staffReplyInput, setStaffReplyInput] = useState("");
  const [staffReplySending, setStaffReplySending] = useState(false);
  const staffChatScrollRef = useRef(null);

  const startScanner = async (quest) => {
    setScannerState({ active: true, quest, stream: null, status: 'initializing', message: '' });
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      setScannerState(prev => ({ ...prev, stream, status: 'scanning' }));
      setTimeout(() => {
        if (videoRef.current) videoRef.current.srcObject = stream;
      }, 100);
    } catch (err) {
      setScannerState(prev => ({ ...prev, status: 'simulated' }));
    }
  };

  const stopScanner = () => {
    if (scannerState.stream) scannerState.stream.getTracks().forEach(t => t.stop());
    setScannerState({ active: false, quest: null, stream: null, status: 'idle', message: '' });
  };

  const captureAndVerify = async () => {
    if (scannerState.status !== 'scanning' && scannerState.status !== 'simulated') return;

    setScannerState(prev => ({ ...prev, status: 'verifying', message: '' }));

    let base64Data = "";
    if (scannerState.status === 'scanning' && videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(videoRef.current, 0, 0);
      base64Data = canvas.toDataURL('image/jpeg').split(',')[1];
    } else {
      base64Data = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="; 
    }

    try {
      const activeKey = GEMINI_API_KEY;
      
      // UPDATE 3: Check API key here too before verifying image
      if (!activeKey || activeKey === "undefined" || activeKey === "null") {
        setScannerState(prev => ({ ...prev, status: 'failed', message: "API Key missing. Check .env file or hardcode it temporarily." }));
        return;
      }
      
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${activeKey}`;

      const prompt = `You are an AI verifier for an eco-friendly stadium game. The user is claiming to complete the quest: "${scannerState.quest.title}" (${scannerState.quest.desc}). Look at the image provided. Does the image clearly depict the required item/action? Reply STRICTLY with a JSON object: {"verified": true/false, "reason": "Short explanation why"}. If the image is empty, completely black, or just a 1x1 pixel, say verified: false and reason: "No valid image detected from camera."`;

      const payload = {
        contents: [{ role: "user", parts: [ { text: prompt }, { inlineData: { mimeType: "image/jpeg", data: base64Data } } ] }],
        generationConfig: { responseMimeType: "application/json" }
      };

      const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await response.json();
      
      if (!response.ok) {
         throw new Error(`API Error: ${response.status}`);
      }

      const result = JSON.parse(data.candidates[0].content.parts[0].text);

      if (result.verified) {
        setScannerState(prev => ({ ...prev, status: 'success', message: result.reason }));
        setTimeout(() => {
          setEcoPoints(pts => pts + scannerState.quest.points);
          stopScanner();
        }, 3000);
      } else {
        setScannerState(prev => ({ ...prev, status: 'failed', message: result.reason }));
      }
    } catch (error) {
      setScannerState(prev => ({ ...prev, status: 'failed', message: `AI API Error: ${error.message}. Please check your API key.` }));
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      try {
       await signInAnonymously(auth);
      } catch (err) {} finally { setAuthLoading(false); }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user || authLoading) return;
    const clockInterval = setInterval(() => setCurrentTime(new Date()), 1000);
    const gatesRef = doc(db, 'artifacts', appId, 'public', `gates_${currentCityId}`);
    
    const unsubGates = onSnapshot(gatesRef, (docSnap) => {
      if (docSnap.exists()) {
        const freshGates = docSnap.data().gatesArray;
        setGates(freshGates);
        const alerts = freshGates
          .filter(g => (g.current / g.capacity) > 0.85 && g.trend === 'up')
          .map(g => `CRITICAL ALERT: ${g.id} (${g.zone}) crowd is rapidly increasing (${Math.round(g.current/g.capacity*100)}%). Action required.`);
        setActiveAlerts(alerts);
        setSyncError(false);
      } else {
        setDoc(gatesRef, { gatesArray: STADIUM_PROFILES[currentCityId].initialGates }).catch(e => {
           if(e.code === 'permission-denied') setSyncError(true);
        });
      }
    }, (error) => {
      if(error.code === 'permission-denied') setSyncError(true);
    });

    const incidentsRef = collection(db, 'artifacts', appId, 'public', 'data', 'incidents');
    const unsubIncidents = onSnapshot(query(incidentsRef, where("cityId", "==", currentCityId)), (snap) => {
      const data = [];
      snap.forEach(d => data.push({ id: d.id, ...d.data() }));
      data.sort((a, b) => b.timestamp - a.timestamp);
      setGlobalIncidents(data);
    });

    const announcementsRef = collection(db, 'artifacts', appId, 'public', 'data', 'announcements');
    const unsubAnnouncements = onSnapshot(query(announcementsRef, where("cityId", "==", currentCityId)), (snap) => {
      const data = [];
      snap.forEach(d => data.push({ id: d.id, ...d.data() }));
      data.sort((a, b) => b.timestamp - a.timestamp);
      setAnnouncements(data);
    });

    // Live Support: fan's own conversation with staff for this stadium
    const supportChatsRef = collection(db, 'artifacts', appId, 'public', 'data', 'supportChats');
    const unsubSupportMessages = onSnapshot(query(supportChatsRef, where("cityId", "==", currentCityId), where("fanId", "==", user.uid)), (snap) => {
      const data = [];
      snap.forEach(d => data.push({ id: d.id, ...d.data() }));
      data.sort((a, b) => a.timestamp - b.timestamp);
      setSupportMessages(data);
    });

    // Live Support: staff-side inbox of all fan conversation threads for this stadium
    const supportThreadsRef = collection(db, 'artifacts', appId, 'public', 'data', 'supportThreads');
    const unsubSupportThreads = onSnapshot(query(supportThreadsRef, where("cityId", "==", currentCityId)), (snap) => {
      const data = [];
      snap.forEach(d => data.push({ id: d.id, ...d.data() }));
      data.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
      setSupportThreads(data);
    });

    const crowdInterval = setInterval(async () => {
      setGates(prevGates => {
        const nextGates = prevGates.map(gate => {
          const fluctuation = Math.floor(Math.random() * 80) - 40; 
          const qFluc = Math.floor(Math.random() * 20) - 10; 
          const newCurrent = Math.min(gate.capacity, Math.max(0, gate.current + fluctuation));
          const newQ = Math.max(0, (gate.queueLength || 0) + qFluc);
          let newTrend = "steady";
          if (newCurrent - gate.current > 15) newTrend = "up";
          if (gate.current - newCurrent > 15) newTrend = "down";
          return { ...gate, current: newCurrent, trend: newTrend, queueLength: newQ };
        });
        
        setDoc(gatesRef, { gatesArray: nextGates }).catch(e => {
          if(e.code === 'permission-denied') setSyncError(true);
        });
        return nextGates;
      });

      setParkingLots(prev => prev.map(lot => {
        const fluctuation = Math.floor(Math.random() * 30) - 10;
        const newFilled = Math.min(lot.capacity, Math.max(0, lot.filled + fluctuation));
        let trend = "steady";
        if (newFilled > lot.filled + 5) trend = "up";
        if (newFilled < lot.filled - 5) trend = "down";
        
        const pct = newFilled / lot.capacity;
        let status = "OPEN";
        if (pct >= 0.95) status = "FULL";
        else if (pct >= 0.85) status = "FILLING FAST";

        return { ...lot, filled: newFilled, trend, status };
      }));
    }, 12000);

    return () => {
      clearInterval(clockInterval);
      clearInterval(crowdInterval);
      unsubGates();
      unsubIncidents();
      unsubAnnouncements();
      unsubSupportMessages();
      unsubSupportThreads();
    };
  }, [user, authLoading, currentCityId]);

  // Live Support: load the full message history for whichever fan thread staff has selected
  useEffect(() => {
    if (!selectedThreadId || !user || authLoading) { setStaffThreadMessages([]); return; }
    const supportChatsRef = collection(db, 'artifacts', appId, 'public', 'data', 'supportChats');
    const unsub = onSnapshot(query(supportChatsRef, where("cityId", "==", currentCityId), where("fanId", "==", selectedThreadId)), (snap) => {
      const data = [];
      snap.forEach(d => data.push({ id: d.id, ...d.data() }));
      data.sort((a, b) => a.timestamp - b.timestamp);
      setStaffThreadMessages(data);
    });
    return () => unsub();
  }, [selectedThreadId, currentCityId, user, authLoading]);

  useEffect(() => {
    const dayData = MATCH_SCHEDULE.find(d => d.date === selectedScheduleDate);
    if(dayData && dayData.matches.length > 0) {
      const match = dayData.matches[0];
      setSelectedMatch(match);
      setSelectedPoi(STADIUM_PROFILES[match.cityId].pois[0]);
      setRouteText(""); 
    }
  }, [selectedScheduleDate]);

  const currentStadiumName = HOST_CITIES[currentCityId].stadium;
  const daysToFinal = Math.max(0, Math.ceil((new Date("2026-07-19T15:00:00") - currentTime) / 86400000));

  // Match status derived from schedule date vs "today"
  const TODAY_STR = "2026-07-18";
  const matchStatus = useMemo(() => {
    if (selectedScheduleDate < TODAY_STR) return "FINISHED";
    if (selectedScheduleDate === TODAY_STR) return "LIVE";
    return "UPCOMING";
  }, [selectedScheduleDate]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, chatLoading]);

  useEffect(() => {
    if (supportScrollRef.current) supportScrollRef.current.scrollTop = supportScrollRef.current.scrollHeight;
  }, [supportMessages]);

  useEffect(() => {
    if (staffChatScrollRef.current) staffChatScrollRef.current.scrollTop = staffChatScrollRef.current.scrollHeight;
  }, [staffThreadMessages]);

  useEffect(() => {
    if (typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.onresult = (event) => {
        setInput(prev => prev + event.results[0][0].transcript + " ");
        setIsListening(false);
      };
      recognitionRef.current.onerror = () => setIsListening(false);
      recognitionRef.current.onend = () => setIsListening(false);
    }
  }, []);

  const toggleListen = () => {
    if (!recognitionRef.current) return;
    if (isListening) { recognitionRef.current.stop(); setIsListening(false); } 
    else {
      const langMap = { "English":"en-US", "Español":"es-ES", "Français":"fr-FR", "हिन्दी":"hi-IN", "中文":"zh-CN" };
      recognitionRef.current.lang = langMap[language] || 'en-US';
      recognitionRef.current.start(); setIsListening(true);
    }
  };

  async function sendMessage(text) {
    const content = (text ?? input).trim();
    if (!content || chatLoading) return;
    const nextMessages = [...messages, { role: "user", content }];
    setMessages(nextMessages); setInput(""); setChatLoading(true); setChatError(null);
    try {
      const reply = await askGemini({
        system: `You are AI concierge for ${currentStadiumName} during FIFA World Cup 2026. Respond in ${language}. Short (under 60 words). No markdown symbols like ** or #. Plain text only.`,
        messages: nextMessages,
      });
      setMessages([...nextMessages, { role: "assistant", content: reply.replace(/[*#]/g, '') }]);
    } catch (e) { setChatError(e.message || "AI unreachable. Please check API Key."); } finally { setChatLoading(false); }
  }

  // Fan -> Staff: send a message into their personal support thread
  async function sendSupportMessage() {
    const content = supportInput.trim();
    if (!content || !user || supportSending) return;
    setSupportSending(true);
    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'supportChats'), {
        cityId: currentCityId, fanId: user.uid, sender: 'fan', text: content, timestamp: Date.now()
      });
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'supportThreads', user.uid), {
        cityId: currentCityId,
        fanId: user.uid,
        fanLabel: `Fan #${user.uid.slice(-4).toUpperCase()}`,
        lastMessage: content,
        lastSender: 'fan',
        updatedAt: Date.now(),
        status: 'open'
      }, { merge: true });
      setSupportInput("");
    } catch (e) {} finally { setSupportSending(false); }
  }

  // Staff -> Fan: reply within the currently selected support thread
  async function sendStaffReply() {
    const content = staffReplyInput.trim();
    if (!content || !user || !selectedThreadId || staffReplySending) return;
    setStaffReplySending(true);
    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'supportChats'), {
        cityId: currentCityId, fanId: selectedThreadId, sender: 'staff', text: content, timestamp: Date.now()
      });
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'supportThreads', selectedThreadId), {
        lastMessage: content, lastSender: 'staff', updatedAt: Date.now(), status: 'open'
      }, { merge: true });
      setStaffReplyInput("");
    } catch (e) {} finally { setStaffReplySending(false); }
  }

  async function resolveThread(threadId) {
    try {
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'supportThreads', threadId), { status: 'resolved' }, { merge: true });
    } catch (e) {}
  }

  // Wayfinding State
  const [selectedPoi, setSelectedPoi] = useState(STADIUM_PROFILES[MATCH_SCHEDULE[MATCH_SCHEDULE.length - 1].matches[0].cityId].pois[0]);
  const [accessibleOnly, setAccessibleOnly] = useState(false);
  const [routeText, setRouteText] = useState("");
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState(null);
  const [userIndoorPos, setUserIndoorPos] = useState({ x: 50, y: 85 });
  const [gpsTracking, setGpsTracking] = useState(false);

  const activateGPS = () => {
    if ('geolocation' in navigator) {
      setGpsTracking(true);
      navigator.geolocation.getCurrentPosition(
        () => { setRouteError(null); setUserIndoorPos({ x: 50, y: 85 }); },
        () => { setRouteError("GPS weak indoors. Using BLE Beacons."); setUserIndoorPos({ x: 50, y: 85 }); },
        { enableHighAccuracy: true }
      );
    }
  };

  useEffect(() => {
    if(!gpsTracking) return;
    const interval = setInterval(() => {
      setUserIndoorPos(prev => ({
        x: Math.max(15, Math.min(85, prev.x + (Math.random() * 1.5 - 0.75))),
        y: Math.max(15, Math.min(85, prev.y + (Math.random() * 1.5 - 0.75)))
      }));
    }, 2000);
    return () => clearInterval(interval);
  }, [gpsTracking]);

  const routePathData = useMemo(
    () => generateSmartPath(userIndoorPos.x, userIndoorPos.y, selectedPoi.x, selectedPoi.y),
    [userIndoorPos.x, userIndoorPos.y, selectedPoi.x, selectedPoi.y]
  );
  const estimatedWalkMins = Math.max(1, Math.round(routePathData.hops * 1.6));

  async function generateRoute() {
    setRouteLoading(true); setRouteText(""); setRouteError(null);
    const hopDesc = routePathData.waypoints.map(w => w.label).filter(Boolean).join(" → ");
    const prompt = `Fan is near ${stadiumData.layout.bottom} of ${currentStadiumName} (position ${hopDesc || "start"}). Destination: "${selectedPoi.name}". ${accessibleOnly ? "REQUIRE ACCESSIBLE ROUTE." : ""} Route follows outer ring. Give 3 short numbered steps. NO MARKDOWN ALLOWED. Plain text only.`;
    try {
      const text = await askGemini({
        system: "Expert stadium wayfinding AI. Short, numbered steps. NEVER use markdown symbols like ** or ##.",
        messages: [{ role: "user", content: prompt }],
      });
      setRouteText(text.replace(/[*#]/g, ''));
    } catch (e) { setRouteError(e.message || "Unable to fetch route.") } finally { setRouteLoading(false); }
  }

  const gateStats = gates.map(g => ({ ...g, pct: Math.round((g.current / g.capacity) * 100) })).sort((a,b) => a.pct - b.pct);
  const bestGate = gateStats[0];
  const busiestGate = gateStats[gateStats.length - 1];
  const totalEntryRate = gates.reduce((sum, g) => sum + (g.entryRate || 0), 0);
  const totalExitRate = gates.reduce((sum, g) => sum + (g.exitRate || 0), 0);
  const openFanThreads = supportThreads.filter(t => t.status !== 'resolved' && t.lastSender === 'fan').length;

  const [transportSuggestion, setTransportSuggestion] = useState("");
  const [transportLoading, setTransportLoading] = useState(false);

  async function suggestTransport() {
    setTransportLoading(true); setTransportSuggestion("");
    const prompt = `Post-match at ${busiestGate.id} of ${currentStadiumName}. Shuttle wait 14m, Rideshares congested, Metro 12m walk. Best way to hotel? Plain text only. NO MARKDOWN. Give 3 short steps.`;
    try {
      const text = await askGemini({
        system: "Transit AI. Recommend fastest route. Plain text only, NO MARKDOWN.",
        messages: [{ role: "user", content: prompt }],
      });
      setTransportSuggestion(text.replace(/[*#]/g, ''));
    } catch (e) { setTransportSuggestion(e.message || "Error generating route."); } finally { setTransportLoading(false); }
  }

  const [advisory, setAdvisory] = useState("");
  const [advisoryLoading, setAdvisoryLoading] = useState(false);

  async function generateAdvisory() {
    setAdvisoryLoading(true); setAdvisory("");
    const snapshot = gates.map((g) => `${g.id}: ${Math.round((g.current / g.capacity) * 100)}% (${g.entryRate}/min)`).join(", ");
    const prompt = `Data for ${currentStadiumName}: ${snapshot}. Write 3-sentence advisory for staff. Suggest concrete action. NO MARKDOWN.`;
    try {
      const text = await askGemini({
        system: "Stadium Ops AI. Data-driven and actionable. NO MARKDOWN.",
        messages: [{ role: "user", content: prompt }],
      });
      setAdvisory(text.replace(/[*#]/g, ''));
      // Adding it to ticker logic removed, keeping ticker strictly weather as requested.
    } catch (e) {} finally { setAdvisoryLoading(false); }
  }

  async function broadcastAnnouncement() {
    if (!newAnnouncement.trim() || !user) return;
    setBroadcastSending(true);
    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'announcements'), {
        cityId: currentCityId, text: newAnnouncement.trim(), priority: announcementPriority, authorId: user.uid, timestamp: Date.now()
      });
      setNewAnnouncement("");
    } catch (e) {} finally { setBroadcastSending(false); }
  }

  async function deleteAnnouncement(id) {
    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'announcements', id));
    } catch (e) {}
  }

  async function generateIncidentReport() {
    if (!incidentNote.trim() || !user) return;
    setIncidentLoading(true);
    const prompt = `Raw note from ${currentStadiumName}: "${incidentNote.trim()}". Analyze this report. Return a strict JSON object with these exact keys: "severity" (Critical, High, Medium, Low), "category" (choose from: Medical, Lost Child, Fight, Fire, Security, General), "summary" (1 sentence summary), "action" (Immediate action required).`;
    
    try {
      const jsonText = await askGemini({ system: "You are an emergency triage AI. Respond ONLY in JSON.", messages: [{ role: "user", content: prompt }], isJson: true });
      const triageData = JSON.parse(jsonText);
      
      const newIncident = {
        cityId: currentCityId,
        reportText: triageData.summary,
        category: triageData.category,
        severity: triageData.severity,
        action: triageData.action,
        authorId: user.uid,
        timestamp: Date.now()
      };
      
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'incidents'), newIncident);
      setIncidentNote("");
    } catch (e) {
      console.error(e);
      alert(e.message || "Failed to generate report via AI.");
    } finally { setIncidentLoading(false); }
  }

  async function generateBriefing() {
    setBriefingLoading(true); setBriefing("");
    const prompt = `Generate an executive sustainability report based on these metrics: Stadium waste diversion 74%, Water refill stations usage 18,400 liters, Carbon footprint reduced by 22% compared to baseline. Write a 3-sentence professional summary for stadium executives. NO MARKDOWN.`;
    try {
      const result = await askGemini({ system: "Sustainability AI.", messages: [{ role: "user", content: prompt }] });
      setBriefing(result.replace(/[*#]/g, ''));
    } catch (e) {
      setBriefing(e.message || "Error generating briefing.");
    } finally { setBriefingLoading(false); }
  }

  const handleStaffClick = () => {
    if (isStaffAuthorized) { setPersona("staff"); } 
    else { setShowPinModal(true); setPin(""); setPinError(""); }
  };

  const handlePinSubmit = (e) => {
    e.preventDefault();
    if (pin === "2026") { setIsStaffAuthorized(true); setPersona("staff"); setShowPinModal(false); } 
    else { setPinError("Invalid Authorization Code."); }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 flex flex-col relative overflow-hidden" style={{ fontFamily: "'Inter', sans-serif" }}>
      
      {/* Dynamic Background Effects for a Premium Look */}
      <div className="fixed top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-emerald-900/10 blur-[150px] pointer-events-none mix-blend-screen z-0" />
      <div className="fixed bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-indigo-900/10 blur-[150px] pointer-events-none mix-blend-screen z-0" />
      
      {/* Football (Soccer Ball) Pattern Watermark - tiled across the entire site since this is a FIFA World Cup experience */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.10] z-0"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140' viewBox='0 0 140 140'%3E%3Cg transform='translate(70,70)'%3E%3Ccircle r='38' fill='none' stroke='%2310b981' stroke-width='2'/%3E%3Cpolygon points='0,-16 15,-5 9,12 -9,12 -15,-5' fill='%2310b981' stroke='%2310b981' stroke-width='1.5'/%3E%3Cline x1='0' y1='-16' x2='0' y2='-38' stroke='%2310b981' stroke-width='2'/%3E%3Cline x1='15' y1='-5' x2='34' y2='-16' stroke='%2310b981' stroke-width='2'/%3E%3Cline x1='9' y1='12' x2='21' y2='31' stroke='%2310b981' stroke-width='2'/%3E%3Cline x1='-9' y1='12' x2='-21' y2='31' stroke='%2310b981' stroke-width='2'/%3E%3Cline x1='-15' y1='-5' x2='-34' y2='-16' stroke='%2310b981' stroke-width='2'/%3E%3C/g%3E%3C/svg%3E")`,
          backgroundSize: "140px 140px",
          backgroundRepeat: "repeat",
        }}
      />
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.05] z-0"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='260' height='260' viewBox='0 0 140 140'%3E%3Cg transform='translate(70,70)'%3E%3Ccircle r='38' fill='none' stroke='%23ffffff' stroke-width='1.6'/%3E%3Cpolygon points='0,-16 15,-5 9,12 -9,12 -15,-5' fill='none' stroke='%23ffffff' stroke-width='1.4'/%3E%3Cline x1='0' y1='-16' x2='0' y2='-38' stroke='%23ffffff' stroke-width='1.4'/%3E%3Cline x1='15' y1='-5' x2='34' y2='-16' stroke='%23ffffff' stroke-width='1.4'/%3E%3Cline x1='9' y1='12' x2='21' y2='31' stroke='%23ffffff' stroke-width='1.4'/%3E%3Cline x1='-9' y1='12' x2='-21' y2='31' stroke='%23ffffff' stroke-width='1.4'/%3E%3Cline x1='-15' y1='-5' x2='-34' y2='-16' stroke='%23ffffff' stroke-width='1.4'/%3E%3C/g%3E%3C/svg%3E")`,
          backgroundSize: "260px 260px",
          backgroundRepeat: "repeat",
          transform: "rotate(8deg) scale(1.1)",
        }}
      />

      {/* Subtle Football Field Watermark */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.015] z-0 flex items-center justify-center overflow-hidden mix-blend-screen">
        <div className="w-[150vw] h-[80vw] max-w-[2000px] border-[4px] border-white rounded-[100px] absolute transform -rotate-12 animate-[pulse_10s_ease-in-out_infinite]">
           <div className="absolute top-1/2 left-0 w-full h-[4px] bg-white -translate-y-1/2"></div>
           <div className="absolute top-1/2 left-1/2 w-[30vw] h-[30vw] max-w-[400px] max-h-[400px] border-[4px] border-white rounded-full -translate-x-1/2 -translate-y-1/2"></div>
           <div className="absolute top-1/2 left-1/2 w-6 h-6 bg-white rounded-full -translate-x-1/2 -translate-y-1/2"></div>
           <div className="absolute top-1/2 left-0 w-[15vw] h-[30vw] max-h-[400px] border-[4px] border-l-0 border-white rounded-r-[3rem] -translate-y-1/2"></div>
           <div className="absolute top-1/2 right-0 w-[15vw] h-[30vw] max-h-[400px] border-[4px] border-r-0 border-white rounded-l-[3rem] -translate-y-1/2"></div>
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@400;500;600;700;800&display=swap');
        @keyframes ticker-scroll { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        .ticker-track { animation: ticker-scroll 35s linear infinite; }
        .ticker-track:hover { animation-play-state: paused; }
        @media (prefers-reduced-motion: reduce) { .ticker-track { animation: none; } }
        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 4px; border: 2px solid #020617; }
        ::-webkit-scrollbar-thumb:hover { background: #334155; }
        .glass-panel { background: rgba(15, 23, 42, 0.4); backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px); border: 1px solid rgba(255,255,255,0.05); }
      `}</style>

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/5 glass-panel px-4 sm:px-6 py-4 shadow-[0_10px_40px_rgba(0,0,0,0.5)]">
        <div className="flex items-center justify-between flex-wrap gap-4 max-w-7xl mx-auto">
          <div className="flex items-center gap-4 group cursor-default">
            <div>
              <Display className="text-2xl sm:text-3xl leading-none text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-200 to-slate-400 tracking-wide drop-shadow-md">STADIUM COMMAND CENTER</Display>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="text-[11px] text-emerald-400 font-bold tracking-widest uppercase bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.1)]">{currentStadiumName}</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 text-sm text-slate-300 font-mono bg-slate-900/60 px-4 py-2 rounded-xl border border-white/5 shadow-inner">
              <Clock className="w-4 h-4 text-emerald-400" />
              {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </div>
            {persona === "fan" && (
              <button 
                onClick={() => { setIsRedeemModalOpen(true); setOrderStatus("idle"); }} 
                className="flex items-center gap-2 text-xs sm:text-sm font-bold rounded-xl px-4 py-2 border text-emerald-400 bg-emerald-500/10 border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.1)] hover:bg-emerald-500/20 hover:scale-105 transition-all cursor-pointer"
              >
                <Leaf className="w-4 h-4" /> {ecoPoints} PTS
              </button>
            )}
            {persona === "staff" && isStaffAuthorized ? (
              <button onClick={() => { setIsStaffAuthorized(false); setPersona("fan"); }} className="flex items-center gap-2 text-xs sm:text-sm font-bold rounded-xl px-4 py-2 shadow-[0_0_20px_rgba(239,68,68,0.1)] border text-red-400 bg-red-500/10 border-red-500/30 hover:bg-red-500/20 hover:shadow-[0_0_30px_rgba(239,68,68,0.2)] transition-all">
                <LogOut className="w-4 h-4" /> SECURE LOGOUT
              </button>
            ) : (
              <div className={`flex items-center gap-2 text-xs sm:text-sm font-bold rounded-xl px-4 py-2 border ${syncError ? 'text-red-400 bg-red-500/10 border-red-500/30 shadow-[0_0_20px_rgba(239,68,68,0.1)]' : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.1)]'}`}>
                <Radio className={`w-4 h-4 ${syncError ? '' : 'animate-pulse'}`} /> 
                {syncError ? "DB PERMISSION ERROR" : "CLOUD SYNC ACTIVE"}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Secure PIN Modal */}
      {showPinModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="bg-[#0f172a] border border-slate-700/80 rounded-3xl w-full max-w-sm overflow-hidden shadow-[0_0_80px_rgba(0,0,0,0.8)] animate-in zoom-in-95 duration-300">
            <div className="p-8 text-center border-b border-white/5 relative overflow-hidden">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 bg-indigo-500/20 blur-[40px]"></div>
              <div className="w-14 h-14 bg-slate-900 rounded-2xl flex items-center justify-center mx-auto mb-5 border border-slate-700/50 shadow-inner relative z-10">
                <Lock className="w-7 h-7 text-indigo-400" />
              </div>
              <h3 className="text-2xl font-bold text-white font-['Bebas_Neue'] tracking-wider relative z-10">RESTRICTED ACCESS</h3>
              <p className="text-xs text-slate-400 mt-1 relative z-10">Authorized Operations Personnel Only</p>
            </div>
            <form onSubmit={handlePinSubmit} className="p-8">
              <div className="relative">
                <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input type="password" autoFocus placeholder="Enter Authorization Code" value={pin} onChange={(e) => setPin(e.target.value)} className="w-full bg-black/50 border border-slate-700 rounded-xl pl-12 pr-4 py-3.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all text-center tracking-[0.3em] font-mono shadow-inner" />
              </div>
              {pinError && <p className="text-xs text-red-400 mt-3 text-center bg-red-950/30 p-2 rounded-lg border border-red-900/50">{pinError}</p>}
              <div className="flex gap-3 mt-8">
                <button type="button" onClick={() => setShowPinModal(false)} className="flex-1 px-4 py-3 rounded-xl text-sm font-bold text-slate-300 bg-slate-800 hover:bg-slate-700 transition-colors">Cancel</button>
                <button type="submit" className="flex-1 px-4 py-3 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-500 transition-colors shadow-[0_0_20px_rgba(79,70,229,0.4)]">Verify</button>
              </div>
              <div className="mt-5 text-center"><span className="text-[11px] text-slate-500 font-medium">HINT: The code is 2026</span></div>
            </form>
          </div>
        </div>
      )}

      {/* Rewards Redeem Modal */}
      {isRedeemModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="bg-[#0f172a] border border-slate-700/80 rounded-3xl w-full max-w-md overflow-hidden shadow-[0_0_80px_rgba(0,0,0,0.8)] animate-in zoom-in-95 duration-300">
            <div className="p-6 border-b border-white/5 flex items-center justify-between bg-black/20 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 blur-[40px] rounded-full"></div>
              <div className="flex items-center gap-3 relative z-10">
                 <div className="p-2 bg-emerald-500/20 rounded-xl border border-emerald-500/30"><Leaf className="w-5 h-5 text-emerald-400" /></div>
                 <div>
                   <h3 className="text-xl font-bold text-white font-['Bebas_Neue'] tracking-wider">Rewards</h3>
                   <p className="text-xs text-slate-400">Balance: <strong className="text-emerald-400">{ecoPoints} PTS</strong></p>
                 </div>
              </div>
              <button onClick={() => setIsRedeemModalOpen(false)} className="text-slate-500 hover:text-white transition-colors relative z-10 p-2"><Minus className="w-6 h-6" /></button>
            </div>
            
            <div className="p-6">
              {orderStatus === 'idle' && (
                <div className="space-y-4">
                  {REWARDS.map(r => (
                    <div key={r.id} className="bg-black/40 border border-white/10 rounded-2xl p-4 flex items-center justify-between hover:bg-white/5 transition-colors">
                       <div className="flex items-center gap-4">
                          <div className={`p-3 rounded-xl bg-white/5 border border-white/10 ${r.color}`}><r.icon className="w-6 h-6" /></div>
                          <div>
                            <p className="font-bold text-slate-200">{r.name}</p>
                            <p className="text-xs font-bold text-emerald-400">{r.cost} PTS</p>
                          </div>
                       </div>
                       <button 
                         disabled={ecoPoints < r.cost} 
                         onClick={() => { setSelectedReward(r); setOrderStatus('confirming'); setSeatInfo(''); }}
                         className="px-4 py-2 text-xs font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500 hover:text-slate-900 hover:shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                       >
                         Redeem
                       </button>
                    </div>
                  ))}
                  {ecoPoints < 50 && (
                     <p className="text-center text-xs text-slate-500 font-medium mt-4">Collect at least 50 points by completing Green Quests to unlock your first reward.</p>
                  )}
                </div>
              )}

              {orderStatus === 'confirming' && selectedReward && (
                 <div className="text-center animate-in fade-in slide-in-from-right-4">
                    <div className={`mx-auto w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-4 ${selectedReward.color}`}><selectedReward.icon className="w-8 h-8" /></div>
                    <h4 className="text-lg font-bold text-white mb-1">Deliver {selectedReward.name}</h4>
                    <p className="text-sm text-slate-400 mb-6">Cost: <span className="text-emerald-400 font-bold">{selectedReward.cost} PTS</span></p>
                    
                    <div className="text-left mb-6">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Enter Your Seat Number</label>
                      <input autoFocus value={seatInfo} onChange={(e) => setSeatInfo(e.target.value)} placeholder="e.g. Sec 104, Row B, Seat 12" className="w-full bg-black/50 border border-emerald-500/30 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 shadow-inner" />
                    </div>
                    
                    <div className="flex gap-3">
                       <button onClick={() => setOrderStatus('idle')} className="flex-1 px-4 py-3 rounded-xl text-sm font-bold text-slate-300 bg-slate-800 hover:bg-slate-700 transition-colors">Back</button>
                       <button 
                         disabled={!seatInfo.trim()}
                         onClick={() => {
                           if(ecoPoints >= selectedReward.cost) {
                             setEcoPoints(prev => prev - selectedReward.cost);
                             setOrderStatus('success');
                           }
                         }} 
                         className="flex-1 px-4 py-3 rounded-xl text-sm font-bold text-slate-900 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-[0_0_20px_rgba(16,185,129,0.3)] disabled:shadow-none"
                       >
                         Confirm Delivery
                       </button>
                    </div>
                 </div>
              )}

              {orderStatus === 'success' && (
                 <div className="text-center animate-in fade-in zoom-in-95 py-6">
                    <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-5 border border-emerald-500/30 shadow-[0_0_30px_rgba(16,185,129,0.3)]">
                       <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                    </div>
                    <h4 className="text-2xl font-bold font-['Bebas_Neue'] text-white tracking-wider mb-2">ORDER PLACED!</h4>
                    <p className="text-sm text-slate-300 mb-8 max-w-[250px] mx-auto leading-relaxed">
                      Your <strong>{selectedReward?.name}</strong> will be delivered to <strong className="text-emerald-400">{seatInfo}</strong> shortly.
                    </p>
                    <button onClick={() => setIsRedeemModalOpen(false)} className="px-8 py-3 rounded-xl text-sm font-bold text-slate-900 bg-emerald-500 hover:bg-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-colors">
                       Awesome, Thanks!
                    </button>
                 </div>
              )}
            </div>
          </div>
        </div>
      )}

      <main className="flex-1 w-full max-w-[1400px] mx-auto px-4 sm:px-8 py-8 sm:py-10 flex flex-col gap-8 relative z-10">
        
        {/* CENTRALIZED NAVIGATION CONTROLS */}
        <div className="flex flex-col items-center gap-6 mb-2 relative z-20">
          
          {/* Top Row: Persona Toggle & Context */}
          <div className="flex flex-col md:flex-row items-center gap-6 w-full justify-center relative">
            <div className="inline-flex rounded-full p-2 glass-panel shadow-[0_0_40px_rgba(0,0,0,0.5)] border-white/10 bg-black/40 backdrop-blur-2xl">
              <button
                onClick={() => { setPersona("fan"); setFanTab("network"); }}
                className={`flex items-center gap-2.5 px-8 py-3.5 rounded-full text-[15px] font-bold transition-all duration-300 ${persona === "fan" ? "bg-gradient-to-r from-emerald-500 to-emerald-400 text-slate-950 shadow-[0_0_20px_rgba(16,185,129,0.4)] scale-105" : "text-slate-400 hover:text-slate-100 hover:bg-white/5"}`}
              >
                <Users className="w-5 h-5" /> Fan Experience
              </button>
              <button
                onClick={handleStaffClick}
                className={`flex items-center gap-2.5 px-8 py-3.5 rounded-full text-[15px] font-bold transition-all duration-300 ${persona === "staff" ? "bg-gradient-to-r from-indigo-500 to-indigo-400 text-white shadow-[0_0_20px_rgba(99,102,241,0.4)] scale-105" : "text-slate-400 hover:text-slate-100 hover:bg-white/5"}`}
              >
                {isStaffAuthorized ? <ShieldCheck className="w-5 h-5" /> : <Lock className="w-5 h-5" />} Operations Staff
              </button>
            </div>
            
            {/* Context Badge (Staff) OR Green Fan Button (Fan) in the absolute right corner */}
            {persona === "staff" ? (
              <div className="md:absolute right-0 glass-panel rounded-full px-5 py-3 flex items-center gap-3 shadow-lg border-indigo-500/20 bg-indigo-950/20">
                 <span className="text-[10px] text-indigo-400 font-bold tracking-widest uppercase">Context</span>
                 <span className="text-sm text-white font-semibold flex items-center gap-1.5"><MapPin className="w-4 h-4 text-indigo-400"/> {currentStadiumName}</span>
              </div>
            ) : (
              <div className="md:absolute right-0 flex items-center">
                 <button
                    onClick={() => setFanTab("green")}
                    className={`inline-flex items-center gap-2 px-5 py-3 rounded-full text-[14px] font-bold transition-all duration-300 ${fanTab === "green" ? "bg-emerald-500/15 border-emerald-500/50 text-emerald-400 border shadow-[0_0_20px_rgba(16,185,129,0.15)] scale-105" : "bg-black/40 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 hover:border-emerald-500/50 shadow-inner hover:shadow-[0_0_15px_rgba(16,185,129,0.2)]"}`}
                  >
                    <Leaf className="w-4 h-4" /> Green Fan
                  </button>
              </div>
            )}
          </div>

          {/* Horizontal Divider */}
          <div className="w-full max-w-4xl h-px bg-gradient-to-r from-transparent via-white/10 to-transparent my-2"></div>

          {/* Bottom Row: Contextual Tabs */}
          <div className="flex justify-center flex-wrap gap-3 sm:gap-4 w-full">
            {persona === "fan" ? (
              [
                { id: "network", label: "Live Match Center", icon: Globe },
                { id: "concierge", label: "AI Concierge", icon: MessageCircle },
                { id: "support", label: "Live Support", icon: Headphones },
                { id: "wayfinding", label: "Indoor Wayfinding", icon: Navigation },
                { id: "transport", label: "Transport & Parking", icon: Bus },
              ].map((t) => (
                <button
                  key={t.id} onClick={() => setFanTab(t.id)}
                  className={`inline-flex items-center gap-2.5 px-6 py-3 rounded-2xl text-[14px] font-bold transition-all duration-300 ${fanTab === t.id ? "bg-emerald-500/15 border-emerald-500/50 text-emerald-400 border shadow-[0_0_20px_rgba(16,185,129,0.15)] -translate-y-1" : "bg-black/20 border border-white/5 text-slate-400 hover:text-slate-100 hover:border-white/20 hover:bg-white/5 hover:-translate-y-0.5"}`}
                >
                  <t.icon className="w-4 h-4" /> {t.label}
                </button>
              ))
            ) : (
              [
                { id: "crowd", label: "Crowd Intelligence", icon: Users }, 
                { id: "incidents", label: "Incidents & Alerts", icon: ShieldAlert }, 
                { id: "support", label: "Fan Support", icon: Headphones },
                { id: "broadcast", label: "Broadcast News", icon: Megaphone },
                { id: "sustainability", label: "Sustainability Ops", icon: Recycle },
                { id: "volunteers", label: "Volunteers", icon: UserCheck },
                { id: "lostfound", label: "Lost & Found AI", icon: Box }
              ].map((t) => (
                <button 
                  key={t.id} onClick={() => setStaffTab(t.id)} 
                  className={`relative inline-flex items-center gap-2.5 px-6 py-3 rounded-2xl text-[14px] font-bold transition-all duration-300 ${staffTab === t.id ? "bg-indigo-500/20 border-indigo-500/50 text-indigo-300 border shadow-[0_0_20px_rgba(99,102,241,0.2)] -translate-y-1" : "bg-black/20 border border-white/5 text-slate-400 hover:text-slate-100 hover:border-white/20 hover:bg-white/5 hover:-translate-y-0.5"}`}
                >
                  <t.icon className="w-4 h-4" /> {t.label}
                  {t.id === "support" && openFanThreads > 0 && (
                    <span className="absolute -top-2 -right-2 min-w-[20px] h-5 px-1.5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center shadow-[0_0_10px_rgba(239,68,68,0.5)] border border-red-400">{openFanThreads}</span>
                  )}
                </button>
              ))
            )}
          </div>
        </div>

        {/* ---------------- FAN PERSONA ---------------- */}
        {}
        {persona === "fan" && (
          <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            {/* Live Announcements */}
            {announcements.length > 0 && dismissedAnnouncementId !== announcements[0].id && (() => {
              const top = announcements[0];
              const theme = top.priority === "Urgent"
                ? { ring: "from-red-500 via-red-400 to-orange-400", glow: "shadow-[0_0_40px_rgba(239,68,68,0.25)]", iconBg: "bg-red-500/15 border-red-500/40", iconColor: "text-red-400", label: "text-red-300", text: "text-red-50", badge: "bg-red-500/20 text-red-300 border-red-500/40" }
                : top.priority === "Advisory"
                ? { ring: "from-amber-500 via-amber-400 to-yellow-300", glow: "shadow-[0_0_40px_rgba(245,158,11,0.2)]", iconBg: "bg-amber-500/15 border-amber-500/40", iconColor: "text-amber-400", label: "text-amber-300", text: "text-amber-50", badge: "bg-amber-500/20 text-amber-300 border-amber-500/40" }
                : { ring: "from-blue-500 via-indigo-400 to-blue-400", glow: "shadow-[0_0_40px_rgba(59,130,246,0.2)]", iconBg: "bg-blue-500/15 border-blue-500/40", iconColor: "text-blue-400", label: "text-blue-300", text: "text-blue-50", badge: "bg-blue-500/20 text-blue-300 border-blue-500/40" };
              return (
                <div className={`relative rounded-[1.5rem] p-[1.5px] bg-gradient-to-r ${theme.ring} ${theme.glow} animate-in slide-in-from-top-4 duration-500`}>
                  <div className="glass-panel rounded-[calc(1.5rem-1.5px)] bg-black/70 p-5 flex items-start gap-4">
                    <div className={`relative p-3 rounded-xl shrink-0 border ${theme.iconBg}`}>
                      <span className={`absolute inset-0 rounded-xl ${theme.iconBg.split(' ')[0]} animate-ping opacity-40`}></span>
                      <BellRing className={`w-5 h-5 relative z-10 ${theme.iconColor}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className={`text-sm font-bold tracking-widest uppercase ${theme.label}`}>Stadium Announcement</p>
                        {top.priority && top.priority !== "Info" && (
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border ${theme.badge}`}>{top.priority}</span>
                        )}
                        <span className="text-[11px] text-slate-400 font-medium">{timeAgo(top.timestamp)}</span>
                        {announcements.length > 1 && (
                          <span className="text-[10px] font-bold text-slate-400 bg-white/5 border border-white/10 px-2 py-0.5 rounded-full">+{announcements.length - 1} more update{announcements.length > 2 ? "s" : ""}</span>
                        )}
                      </div>
                      <p className={`text-[15px] mt-1.5 font-medium leading-relaxed ${theme.text}`}>{top.text}</p>
                    </div>
                    <button onClick={() => setDismissedAnnouncementId(top.id)} className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/10 transition-colors shrink-0" title="Dismiss">
                      <Minus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })()}

            {/* Match Center Tab */}
            {fanTab === "network" && (
              <section className="flex flex-col gap-8 animate-in fade-in zoom-in-95 duration-500">
                {/* HERO: Live Match */}
                <div className="glass-panel border border-white/10 rounded-[2rem] p-8 sm:p-12 shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col lg:flex-row items-center justify-between gap-10 relative overflow-hidden group">
                   <div className="absolute -top-40 -left-40 w-96 h-96 bg-emerald-500/20 rounded-full blur-[100px] pointer-events-none group-hover:bg-emerald-500/30 transition-colors duration-700"></div>
                   <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-indigo-500/20 rounded-full blur-[100px] pointer-events-none group-hover:bg-indigo-500/30 transition-colors duration-700"></div>
                   
                   <div className="flex-1 text-center lg:text-left relative z-10">
                      <span className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] sm:text-xs font-bold uppercase tracking-[0.2em] px-4 py-2 rounded-full mb-5 shadow-[0_0_20px_rgba(16,185,129,0.15)]">
                        <Trophy className="w-3.5 h-3.5" /> FIFA World Cup 2026
                      </span>
                      <Display className="text-5xl sm:text-6xl text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 block mb-4 drop-shadow-sm">Live Match Center</Display>
                      <p className="text-slate-300 text-base sm:text-lg max-w-lg mx-auto lg:mx-0 font-medium leading-relaxed mb-7">Real-time updates, scheduling, and stadium intelligence for <strong className="text-emerald-400 drop-shadow-[0_0_10px_rgba(16,185,129,0.5)]">{HOST_CITIES[currentCityId].stadium}</strong>.</p>

                      <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 mb-7">
                        <div className="flex items-center gap-2.5 bg-black/40 border border-white/10 rounded-2xl px-4 py-2.5 shadow-inner">
                          <CalendarDays className="w-4 h-4 text-emerald-400" />
                          <span className="text-sm font-bold text-white">{daysToFinal}</span>
                          <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Days to Final</span>
                        </div>
                        <div className="flex items-center gap-2.5 bg-black/40 border border-white/10 rounded-2xl px-4 py-2.5 shadow-inner">
                          <MapPin className="w-4 h-4 text-indigo-400" />
                          <span className="text-sm font-bold text-white">{Object.keys(HOST_CITIES).length}</span>
                          <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Host Cities</span>
                        </div>
                        <div className="flex items-center gap-2.5 bg-black/40 border border-white/10 rounded-2xl px-4 py-2.5 shadow-inner">
                          <Users className="w-4 h-4 text-amber-400" />
                          <span className="text-sm font-bold text-white">{(HOST_CITIES[currentCityId].capacity/1000).toFixed(0)}k</span>
                          <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Capacity</span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3">
                        <button onClick={() => setFanTab('wayfinding')} className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-emerald-400 text-slate-950 font-bold text-sm px-6 py-3 rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_28px_rgba(16,185,129,0.5)] hover:-translate-y-0.5 transition-all">
                          <Navigation className="w-4 h-4" /> Find My Way <ArrowRight className="w-4 h-4" />
                        </button>
                        <button onClick={() => setFanTab('concierge')} className="inline-flex items-center gap-2 bg-white/5 border border-white/15 text-slate-200 font-bold text-sm px-6 py-3 rounded-xl hover:bg-white/10 hover:-translate-y-0.5 transition-all">
                          <MessageCircle className="w-4 h-4 text-emerald-400" /> Ask Concierge
                        </button>
                      </div>
                   </div>
                   
                   <div className="flex-1 w-full max-w-2xl rounded-3xl p-[1.5px] bg-gradient-to-br from-emerald-500/50 via-white/10 to-indigo-500/50 shadow-[0_20px_60px_rgba(0,0,0,0.4)] relative z-10">
                   <div className="w-full h-full bg-black/60 backdrop-blur-2xl rounded-[calc(1.5rem-1.5px)] p-6 sm:p-8 grid grid-cols-[1fr_auto_1fr] items-center gap-2 shadow-[inset_0_0_30px_rgba(0,0,0,0.5)] relative overflow-hidden">
                       <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none"></div>
                       <div className="absolute top-4 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full border-2 border-white/10 flex items-center justify-center text-white/20 z-10">
                          <Trophy className="w-4 h-4" />
                       </div>
                       
                       <div className="flex flex-col items-center justify-center text-center relative z-10 min-w-0 px-1">
                         <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-b from-slate-800 to-slate-900 rounded-full mb-4 border-2 border-indigo-500/50 flex items-center justify-center font-bold text-slate-300 text-lg sm:text-xl shadow-[0_0_30px_rgba(99,102,241,0.3)] shrink-0">{teamAbbrev(selectedMatch.team1)}</div>
                         <p title={selectedMatch.team1} className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider truncate w-full leading-tight">{selectedMatch.team1}</p>
                       </div>
                       
                       <div className="flex flex-col items-center justify-center text-center px-2 sm:px-4 relative z-10 shrink-0">
                         {matchStatus === "LIVE" && (
                           <span className="bg-red-500/10 border border-red-500/30 px-3.5 py-1.5 rounded-full text-[11px] sm:text-xs text-red-400 font-bold tracking-widest animate-pulse flex items-center justify-center gap-2 mb-3 shadow-[0_0_15px_rgba(239,68,68,0.2)] whitespace-nowrap">
                              <span className="w-2 h-2 bg-red-500 rounded-full shadow-[0_0_8px_rgba(239,68,68,0.8)]"></span> LIVE 64'
                           </span>
                         )}
                         {matchStatus === "FINISHED" && (
                           <span className="bg-slate-500/10 border border-slate-500/30 px-3.5 py-1.5 rounded-full text-[11px] sm:text-xs text-slate-300 font-bold tracking-widest flex items-center justify-center gap-2 mb-3 whitespace-nowrap">
                              <CheckCircle2 className="w-3 h-3" /> FULL TIME
                           </span>
                         )}
                         {matchStatus === "UPCOMING" && (
                           <span className="bg-emerald-500/10 border border-emerald-500/30 px-3.5 py-1.5 rounded-full text-[11px] sm:text-xs text-emerald-400 font-bold tracking-widest flex items-center justify-center gap-2 mb-3 whitespace-nowrap">
                              <Clock className="w-3 h-3" /> KICKOFF {selectedMatch.time}
                           </span>
                         )}
                         {matchStatus !== "UPCOMING" ? (
                           <Display className="text-6xl sm:text-7xl text-white block leading-none drop-shadow-[0_0_20px_rgba(255,255,255,0.3)]">2 - 1</Display>
                         ) : (
                           <Display className="text-4xl sm:text-5xl text-slate-500 block leading-none">VS</Display>
                         )}
                         <span className="text-[11px] sm:text-xs text-slate-400 uppercase tracking-widest font-bold bg-white/5 px-3 py-1 rounded-lg mt-3 border border-white/5 whitespace-nowrap">{selectedMatch.stage}</span>
                       </div>
                       
                       <div className="flex flex-col items-center justify-center text-center relative z-10 min-w-0 px-1">
                         <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-b from-slate-800 to-slate-900 rounded-full mb-4 border-2 border-amber-500/50 flex items-center justify-center font-bold text-slate-300 text-lg sm:text-xl shadow-[0_0_30px_rgba(245,158,11,0.3)] shrink-0">{teamAbbrev(selectedMatch.team2)}</div>
                         <p title={selectedMatch.team2} className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider truncate w-full leading-tight">{selectedMatch.team2}</p>
                       </div>
                   </div>
                   </div>
                </div>

                <div className="grid lg:grid-cols-12 gap-8">
                  {/* Schedule Column */}
                  <div className="lg:col-span-5 glass-panel rounded-[2rem] p-6 sm:p-8 shadow-2xl flex flex-col h-[600px]">
                    <div className="mb-8">
                      <Display className="text-3xl text-white mb-2 block">Tournament Schedule</Display>
                      <p className="text-sm text-slate-400 font-medium">Select a date to update the command center context.</p>
                    </div>
                    
                    <div className="space-y-3.5 overflow-y-auto pr-3 mb-6 flex-1">
                      {MATCH_SCHEDULE.map((day) => (
                        <button
                          key={day.date}
                          onClick={() => setSelectedScheduleDate(day.date)}
                          className={`w-full text-left px-5 py-4 rounded-2xl border text-[14px] font-bold transition-all duration-300 flex items-center justify-between ${selectedScheduleDate === day.date ? "bg-emerald-500 text-slate-950 border-emerald-400 shadow-[0_0_25px_rgba(16,185,129,0.25)]" : "bg-black/40 border-white/5 text-slate-300 hover:border-white/20 hover:bg-white/5"}`}
                        >
                          <span className="flex items-center gap-3"><CalendarDays className={`w-5 h-5 ${selectedScheduleDate === day.date ? 'text-slate-900' : 'text-slate-500'}`} /> {day.label}</span>
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg ${selectedScheduleDate === day.date ? 'bg-emerald-600/20 text-slate-900' : 'bg-slate-800 text-slate-400'}`}>{day.matches[0].stage}</span>
                        </button>
                      ))}
                    </div>

                    <div className="mt-auto border-t border-white/10 pt-6">
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Matches on {MATCH_SCHEDULE.find(d => d.date === selectedScheduleDate)?.label}</h4>
                      <div className="space-y-3">
                        {MATCH_SCHEDULE.find(d => d.date === selectedScheduleDate)?.matches.map(match => (
                          <div 
                            key={match.id} onClick={() => setSelectedMatch(match)}
                            className={`p-5 rounded-2xl border cursor-pointer transition-all duration-300 ${selectedMatch?.id === match.id ? "bg-emerald-500/10 border-emerald-500/50 shadow-[inset_0_0_20px_rgba(16,185,129,0.1)]" : "bg-black/40 border-white/5 hover:border-white/20"}`}
                          >
                            <div className="flex justify-between items-start mb-3">
                              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/50 border border-emerald-900/50 px-2.5 py-1 rounded-lg uppercase tracking-wider shadow-sm">{match.stage}</span>
                              <span className="text-xs text-slate-400 flex items-center gap-1.5 font-medium"><Clock className="w-3.5 h-3.5 text-slate-500"/> {match.time}</span>
                            </div>
                            <h5 className="text-white font-bold text-base mb-1.5 tracking-wide">{match.team1} <span className="text-slate-500 font-medium">vs</span> {match.team2}</h5>
                            <p className="text-xs text-slate-400 flex items-center gap-1.5 font-medium"><MapPin className="w-3.5 h-3.5 text-slate-500" /> {HOST_CITIES[match.cityId].stadium}, {HOST_CITIES[match.cityId].city}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Stadium Info & Map Column */}
                  <div className="lg:col-span-7 flex flex-col gap-8">
                     <div className="glass-panel rounded-[2rem] p-6 sm:p-8 shadow-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                        <div>
                          <Display className="text-3xl text-white block mb-2">{HOST_CITIES[currentCityId].stadium}</Display>
                          <div className="flex items-center gap-2 text-sm text-slate-400 font-medium">
                            <MapPin className="w-4 h-4 text-emerald-500" /> {HOST_CITIES[currentCityId].city}, {HOST_CITIES[currentCityId].country}
                          </div>
                        </div>
                        <div className="flex gap-4 w-full sm:w-auto">
                          <div className="flex-1 sm:flex-none bg-black/40 border border-white/5 rounded-2xl p-5 text-center min-w-[120px] shadow-inner">
                             <p className="text-2xl font-bold text-white mb-1.5">{HOST_CITIES[currentCityId].capacity.toLocaleString()}</p>
                             <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Capacity</p>
                          </div>
                          <div className="flex-1 sm:flex-none bg-black/40 border border-white/5 rounded-2xl p-5 text-center min-w-[120px] shadow-inner">
                             <p className="text-base font-bold text-white mb-2 mt-0.5 truncate px-1">{HOST_CITIES[currentCityId].surface}</p>
                             <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Surface</p>
                          </div>
                        </div>
                     </div>
                     
                     <div className="flex-1 glass-panel rounded-[2rem] overflow-hidden shadow-2xl min-h-[350px] relative group p-2">
                         <div className="absolute top-6 left-6 z-10 glass-panel text-xs text-slate-200 font-bold px-4 py-2 rounded-xl flex items-center gap-2.5 shadow-lg border-white/10">
                            <Globe className="w-4 h-4 text-emerald-400 animate-pulse" /> Live Stadium Map
                         </div>
                         <div className="w-full h-full rounded-2xl overflow-hidden relative">
                            <iframe title="Stadium Map" frameBorder="0" scrolling="no" src={`https://www.openstreetmap.org/export/embed.html?bbox=${HOST_CITIES[currentCityId].lng - 0.02}%2C${HOST_CITIES[currentCityId].lat - 0.02}%2C${HOST_CITIES[currentCityId].lng + 0.02}%2C${HOST_CITIES[currentCityId].lat + 0.02}&layer=mapnik&marker=${HOST_CITIES[currentCityId].lat}%2C${HOST_CITIES[currentCityId].lng}`} className="absolute top-0 left-0 w-full opacity-60 group-hover:opacity-90 transition-all duration-700 filter invert-[1] hue-rotate-180 contrast-[0.9]" style={{ height: 'calc(100% + 50px)', background: '#020617' }}></iframe>
                            <div className="absolute inset-0 border-[4px] border-[#0f172a] rounded-2xl pointer-events-none z-10"></div>
                         </div>
                     </div>
                  </div>
                </div>
              </section>
            )}

            {/* Wayfinding Tab */}
            {fanTab === "wayfinding" && (
              <section className="grid lg:grid-cols-12 gap-8">
                <div className="lg:col-span-4 flex flex-col gap-8">
                  <div className="glass-panel rounded-[2rem] p-8 shadow-2xl flex flex-col max-h-[500px]">
                    <Display className="text-3xl text-white mb-2">Find Your Way</Display>
                    <p className="text-sm text-slate-400 mb-6 font-medium">Navigating <span className="font-bold text-emerald-400">{currentStadiumName}</span></p>
                    
                    <label className="flex items-center gap-3 p-4 bg-black/40 border border-white/5 rounded-xl cursor-pointer hover:border-white/20 transition-all duration-300 mb-6 group shadow-inner">
                      <div className="relative flex items-center">
                        <input type="checkbox" checked={accessibleOnly} onChange={(e) => setAccessibleOnly(e.target.checked)} className="peer sr-only" />
                        <div className="w-5 h-5 bg-slate-800 border border-slate-600 rounded peer-checked:bg-emerald-500 peer-checked:border-emerald-500 transition-colors flex items-center justify-center">
                          <CheckCircle2 className="w-3 h-3 text-slate-900 opacity-0 peer-checked:opacity-100" />
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-sm font-medium text-slate-300 group-hover:text-white transition-colors">
                        <Accessibility className="w-4 h-4 text-emerald-400" /> Require step-free route
                      </div>
                    </label>
                    
                    <div className="flex-1 overflow-y-auto pr-3 space-y-3">
                      {stadiumData.pois.map((p) => (
                        <button
                          key={p.name}
                          onClick={() => { setSelectedPoi(p); setRouteText(""); setRouteError(null); }}
                          className={`w-full text-left px-5 py-4 rounded-xl border text-[15px] flex items-center justify-between transition-all duration-300 ${selectedPoi.name === p.name ? "border-emerald-500 bg-emerald-500/10 text-white shadow-[0_0_15px_rgba(16,185,129,0.15)]" : "border-white/5 bg-black/40 hover:border-white/20 text-slate-300"}`}
                        >
                          <span className="flex items-center gap-3 font-bold min-w-0">
                            <MapPin className={`w-4 h-4 shrink-0 ${selectedPoi.name === p.name ? "text-emerald-400" : "text-slate-500"}`} />
                            <span className="truncate block">{p.name}</span>
                          </span>
                          <span className={`text-[11px] font-bold px-2.5 py-1 rounded-md shrink-0 ml-2 ${selectedPoi.name === p.name ? "bg-emerald-500 text-slate-950" : "bg-slate-800 text-slate-400"}`}>{p.walk}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <div className="glass-panel rounded-[2rem] p-8 shadow-2xl flex flex-col">
                     <div className="flex items-center justify-between mb-2">
                       <Display className="text-2xl text-white">Live Entry Intel</Display>
                       <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-950/60 px-2.5 py-1 rounded-full border border-emerald-900/50 shadow-sm"><Radio className="w-3 h-3 animate-pulse"/> LIVE</span>
                     </div>
                     <p className="text-xs text-slate-400 mb-6 font-medium">Real-time gate congestion at {currentStadiumName}</p>
                     
                     <div className="bg-emerald-950/40 border border-emerald-900/50 rounded-xl p-5 flex flex-col gap-2 mb-6 backdrop-blur-md">
                        <div className="flex items-center gap-2 text-emerald-400 text-sm font-bold">
                           <Sparkles className="w-4 h-4" /> AI Suggestion: Best Gate
                        </div>
                        <p className="text-slate-200 text-sm font-medium leading-relaxed">
                           Enter via <strong className="text-white">{bestGate.id}</strong> ({bestGate.zone} zone) — only {bestGate.pct}% full, taking in {bestGate.entryRate}/min. Avoid <strong className="text-white">{busiestGate.id}</strong>.
                        </p>
                     </div>

                     <div className="space-y-3 max-h-48 overflow-y-auto pr-3">
                        {gateStats.map(g => (
                           <div key={g.id} className="flex items-center justify-between bg-black/40 p-3.5 rounded-xl border border-white/5 shadow-inner">
                              <div className="flex flex-col gap-0.5">
                                <span className="text-sm font-bold text-slate-200">{g.id}</span>
                                <span className="text-[10px] text-slate-500 flex items-center gap-1 font-medium">
                                  <TrendIcon trend={g.trend} /> {Math.round(g.current).toLocaleString()} in
                                </span>
                              </div>
                              <div className="flex items-center gap-3">
                                 <div className="w-24 h-2 bg-slate-800 rounded-full overflow-hidden shadow-inner">
                                    <div className="h-full rounded-full transition-all duration-700 ease-out" style={{ width: `${g.pct}%`, backgroundColor: occColor(g.pct), boxShadow: `0 0 10px ${occColor(g.pct)}` }}></div>
                                 </div>
                                 <span className="text-xs font-mono font-bold text-slate-300 w-8 text-right">{g.pct}%</span>
                              </div>
                           </div>
                        ))}
                     </div>
                  </div>
                </div>

                <div className="lg:col-span-8 glass-panel rounded-[2rem] p-8 shadow-2xl flex flex-col h-[750px] lg:h-auto">
                  <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
                    <div className="min-w-0">
                      <Display className="text-4xl text-white block mb-2 truncate">Route to {selectedPoi.name}</Display>
                      <div className="flex items-center gap-2.5 text-sm text-slate-400 mt-2 flex-wrap font-medium">
                        <span className="bg-white/10 px-3 py-1 rounded-lg border border-white/5">{selectedPoi.type}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1.5"><Clock className="w-4 h-4 text-slate-500" /> Approx {estimatedWalkMins} min via concourse</span>
                      </div>
                    </div>
                    <GenerateButton onClick={generateRoute} loading={routeLoading} label="Get AI Directions" icon={Navigation} className="shrink-0" />
                  </div>

                  <div className="relative w-full aspect-[21/9] bg-[#020617]/50 rounded-2xl border border-white/10 overflow-hidden shadow-[inset_0_0_50px_rgba(0,0,0,0.5)] mb-6 flex-shrink-0">
                    <svg viewBox="0 0 100 100" className="w-full h-full text-slate-800">
                      <defs>
                        <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                          <path d="M 10 0 L 0 0 0 10" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5"/>
                        </pattern>
                        <filter id="glow">
                           <feGaussianBlur stdDeviation="1.5" result="coloredBlur"/>
                           <feMerge>
                              <feMergeNode in="coloredBlur"/>
                              <feMergeNode in="SourceGraphic"/>
                           </feMerge>
                        </filter>
                      </defs>
                      <rect width="100" height="100" fill="url(#grid)" />
                      
                      <rect x="10" y="10" width="80" height="80" rx="15" fill="none" stroke="#1e293b" strokeWidth="1.5" />
                      <rect x="15" y="15" width="70" height="70" rx="12" fill="none" stroke="#0f172a" strokeWidth="4" />
                      <rect x="19" y="19" width="62" height="62" rx="10" fill="none" stroke="#1e293b" strokeWidth="0.5" />
                      
                      <text x="50" y="8" fill="#475569" fontSize="3.5" fontWeight="bold" textAnchor="middle" letterSpacing="0.5" className="uppercase font-['Bebas_Neue'] tracking-wider">{currentStadiumName}</text>
                      <text x="94" y="50" fill="#334155" fontSize="2.5" fontWeight="bold" textAnchor="middle" letterSpacing="1" transform="rotate(90, 94, 50)">{stadiumData.layout.right}</text>
                      <text x="50" y="95" fill="#334155" fontSize="2.5" fontWeight="bold" textAnchor="middle" letterSpacing="1">{stadiumData.layout.bottom}</text>
                      <text x="6" y="50" fill="#334155" fontSize="2.5" fontWeight="bold" textAnchor="middle" letterSpacing="1" transform="rotate(-90, 6, 50)">{stadiumData.layout.left}</text>

                      <g opacity="0.6">
                        <rect x="32" y="20" width="36" height="60" rx="2" fill="#064e3b" stroke="#10b981" strokeWidth="0.8" />
                        <line x1="32" y1="50" x2="68" y2="50" stroke="#10b981" strokeWidth="0.8" />
                        <circle cx="50" cy="50" r="6" fill="none" stroke="#10b981" strokeWidth="0.8" />
                        <circle cx="50" cy="50" r="0.8" fill="#10b981" />
                        <rect x="40" y="20" width="20" height="10" fill="none" stroke="#10b981" strokeWidth="0.8" />
                        <rect x="45" y="20" width="10" height="4" fill="none" stroke="#10b981" strokeWidth="0.8" />
                        <path d="M 46 30 A 4 4 0 0 0 54 30" fill="none" stroke="#10b981" strokeWidth="0.8" />
                        <rect x="40" y="70" width="20" height="10" fill="none" stroke="#10b981" strokeWidth="0.8" />
                        <rect x="45" y="76" width="10" height="4" fill="none" stroke="#10b981" strokeWidth="0.8" />
                        <path d="M 46 70 A 4 4 0 0 1 54 70" fill="none" stroke="#10b981" strokeWidth="0.8" />
                      </g>

                      <path 
                        d={routePathData.path} 
                        fill="none" stroke="#10b981" strokeWidth="1.5" strokeDasharray="2 2" className="animate-pulse" filter="url(#glow)"
                      />
                      {routePathData.waypoints.slice(1, -1).map((w, i) => (
                        <circle key={i} cx={w.x} cy={w.y} r="1" fill="#10b981" opacity="0.9" />
                      ))}

                      {stadiumData.pois.map(p => (
                        <g key={p.name}>
                          <circle cx={p.x} cy={p.y} r={selectedPoi.name === p.name ? "2.5" : "1.2"} fill={selectedPoi.name === p.name ? "#10b981" : "#475569"} filter={selectedPoi.name === p.name ? "url(#glow)" : ""} />
                        </g>
                      ))}

                      {gpsTracking ? (
                        <g transform={`translate(${userIndoorPos.x}, ${userIndoorPos.y})`}>
                          <circle cx="0" cy="0" r="4.5" fill="#3b82f6" className="animate-ping opacity-60" />
                          <circle cx="0" cy="0" r="1.5" fill="#60a5fa" filter="url(#glow)" />
                          <circle cx="0" cy="0" r="0.6" fill="#ffffff" />
                        </g>
                      ) : (
                        <g transform={`translate(${userIndoorPos.x}, ${userIndoorPos.y})`}>
                           <circle cx="0" cy="0" r="1.5" fill="#64748b" />
                        </g>
                      )}
                    </svg>

                    <div className="absolute top-4 right-4 flex flex-col gap-2 z-10">
                       <button onClick={activateGPS} title="Locate via GPS/BLE" className={`p-3 rounded-xl backdrop-blur-md border shadow-lg transition-all duration-300 ${gpsTracking ? 'bg-blue-500/20 border-blue-500/50 text-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.3)]' : 'bg-black/60 border-white/10 text-slate-400 hover:text-white hover:bg-white/10'}`}>
                          <Crosshair className="w-5 h-5" />
                       </button>
                    </div>
                  </div>
                  
                  <div className="flex-1 bg-black/40 border border-white/5 rounded-2xl p-6 overflow-y-auto relative shadow-inner">
                    <ErrorNote msg={routeError} />
                    {!routeText && !routeLoading && !routeError && (
                       <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 text-center px-8">
                         <div className="p-4 bg-white/5 rounded-full mb-4 border border-white/5"><Map className="w-8 h-8 opacity-50" /></div>
                         <p className="text-[15px] max-w-md font-medium leading-relaxed">The green dashed line already shows the real concourse-ring path. Click <strong className="text-emerald-500 font-bold">"Get AI Directions"</strong> for plain-language step-by-step instructions.</p>
                       </div>
                    )}
                    {routeLoading && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-emerald-500 gap-5">
                        <Loader2 className="w-10 h-10 animate-spin drop-shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                        <p className="text-[15px] font-bold animate-pulse tracking-wide">Computing optimal indoor path...</p>
                      </div>
                    )}
                    {routeText && (
                      <div className="text-[15px] text-slate-200 leading-relaxed space-y-4 max-w-3xl font-medium">
                        {routeText.split('\n').map((line, idx) => {
                           const cleanLine = line.replace(/[*#]/g, '').trim();
                           if(!cleanLine) return null;
                           return <p key={idx} className={`${cleanLine.match(/^\d+\./) ? 'pl-6 relative before:content-[""] before:absolute before:left-0 before:top-2.5 before:w-2 before:h-2 before:bg-emerald-500 before:rounded-full before:shadow-[0_0_8px_rgba(16,185,129,0.8)]' : ''}`}>{cleanLine}</p>;
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </section>
            )}

            {/* Concierge Tab */}
            {fanTab === "concierge" && (
              <section className="glass-panel border border-white/10 rounded-[2rem] overflow-hidden shadow-2xl flex flex-col md:flex-row h-[650px]">
                <div className="flex-1 flex flex-col min-w-0 bg-gradient-to-b from-transparent to-black/20">
                  <div className="flex items-center justify-between px-8 py-6 border-b border-white/5 bg-black/20 backdrop-blur-md z-10">
                    <div>
                      <Display className="text-3xl text-white">Stadium Concierge</Display>
                      <p className="text-sm text-slate-400 mt-1 font-medium">Context: <span className="font-bold text-emerald-400">{currentStadiumName}</span></p>
                    </div>
                    <div className="flex items-center gap-2 bg-white/5 rounded-xl p-1.5 border border-white/10 shadow-inner">
                      <Globe className="w-4 h-4 text-slate-400 ml-2" />
                      <select value={language} onChange={(e) => setLanguage(e.target.value)} className="bg-transparent text-sm font-bold border-none px-2 py-1.5 text-slate-200 focus:ring-0 cursor-pointer outline-none">
                        {LANGUAGES.map((l) => <option key={l} value={l} className="bg-slate-900">{l}</option>)}
                      </select>
                    </div>
                  </div>

                  <div ref={scrollRef} className="flex-1 overflow-y-auto px-8 py-8 space-y-6 relative">
                    {messages.length === 0 && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-center space-y-5 text-slate-500 px-6">
                        <div className="w-20 h-20 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10 shadow-lg"><MessageCircle className="w-10 h-10 text-emerald-500/70" /></div>
                        <p className="max-w-sm text-[15px] font-medium leading-relaxed">Ask me about seating, restrooms, accessibility, or food menus at {currentStadiumName}.</p>
                      </div>
                    )}
                    {messages.map((m, i) => (
                      <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"} animate-in fade-in slide-in-from-bottom-2`}>
                        <div className={`max-w-[85%] md:max-w-[75%] rounded-2xl px-6 py-4 text-[15px] leading-relaxed font-medium shadow-lg ${m.role === "user" ? "bg-gradient-to-r from-emerald-600 to-emerald-500 text-white rounded-br-sm shadow-[0_5px_15px_rgba(16,185,129,0.2)]" : "bg-black/60 border border-white/10 text-slate-100 rounded-bl-sm backdrop-blur-sm"}`}>{m.content}</div>
                      </div>
                    ))}
                    {chatLoading && <div className="flex justify-start"><div className="bg-black/60 border border-white/10 rounded-2xl rounded-bl-sm px-6 py-4 flex items-center gap-3 text-slate-400 text-sm font-bold backdrop-blur-sm"><Loader2 className="w-4 h-4 animate-spin text-emerald-500" /> AI is generating response...</div></div>}
                  </div>

                  <div className="p-6 sm:p-8 border-t border-white/5 bg-black/40 backdrop-blur-xl z-10">
                    {chatError && <ErrorNote msg={chatError} />}
                    <div className="flex gap-3 mt-2 relative">
                      <button onClick={toggleListen} className={`p-4 rounded-xl transition-all duration-300 flex items-center justify-center shadow-inner ${isListening ? 'bg-red-500 text-white animate-pulse shadow-[0_0_20px_rgba(239,68,68,0.4)]' : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 border border-white/10'}`}><Mic className="w-5 h-5" /></button>
                      <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendMessage()} placeholder={`Type or speak your question...`} className="flex-1 bg-black/50 border border-white/10 rounded-xl pl-5 pr-14 py-4 text-[15px] font-medium text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all shadow-inner" />
                      <button onClick={() => sendMessage()} disabled={chatLoading || !input.trim()} className="absolute right-2.5 top-2.5 bottom-2.5 aspect-square bg-emerald-500 hover:bg-emerald-400 disabled:bg-white/5 disabled:text-slate-600 rounded-lg flex items-center justify-center transition-colors text-slate-950 shadow-[0_0_15px_rgba(16,185,129,0.3)] disabled:shadow-none"><Send className="w-5 h-5 ml-1" /></button>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* Live Support Tab - direct chat with human stadium staff */}
            {fanTab === "support" && (
              <section className="glass-panel border border-white/10 rounded-[2rem] overflow-hidden shadow-2xl flex flex-col md:flex-row h-[650px]">
                <div className="flex-1 flex flex-col min-w-0 bg-gradient-to-b from-transparent to-black/20">
                  <div className="flex items-center justify-between px-8 py-6 border-b border-white/5 bg-black/20 backdrop-blur-md z-10">
                    <div>
                      <Display className="text-3xl text-white">Live Staff Support</Display>
                      <p className="text-sm text-slate-400 mt-1 font-medium">Chat with a real member of the <span className="font-bold text-indigo-400">{currentStadiumName}</span> team</p>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-bold text-indigo-300 bg-indigo-500/10 px-3 py-1.5 rounded-full border border-indigo-500/30 shadow-sm">
                      <Radio className="w-3.5 h-3.5 animate-pulse" /> STAFF ONLINE
                    </div>
                  </div>

                  <div ref={supportScrollRef} className="flex-1 overflow-y-auto px-8 py-8 space-y-6 relative">
                    {supportMessages.length === 0 && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-center space-y-5 text-slate-500 px-6">
                        <div className="w-20 h-20 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10 shadow-lg"><Headphones className="w-10 h-10 text-indigo-400/70" /></div>
                        <p className="max-w-sm text-[15px] font-medium leading-relaxed">Have a problem or question that needs a human? Message stadium staff directly here — they'll reply in real time.</p>
                        <div className="flex flex-wrap justify-center gap-2 max-w-md">
                          {["Lost item", "Medical assistance", "Accessibility request", "Ticket / seating issue"].map(topic => (
                            <button key={topic} onClick={() => setSupportInput(topic + ": ")} className="text-[12px] font-bold px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:text-white hover:border-indigo-500/40 hover:bg-indigo-500/10 transition-all">
                              {topic}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    {supportMessages.map((m) => (
                      <div key={m.id} className={`flex ${m.sender === "fan" ? "justify-end" : "justify-start"} animate-in fade-in slide-in-from-bottom-2`}>
                        <div className={`max-w-[85%] md:max-w-[75%] rounded-2xl px-6 py-4 text-[15px] leading-relaxed font-medium shadow-lg ${m.sender === "fan" ? "bg-gradient-to-r from-indigo-600 to-indigo-500 text-white rounded-br-sm shadow-[0_5px_15px_rgba(99,102,241,0.2)]" : "bg-black/60 border border-white/10 text-slate-100 rounded-bl-sm backdrop-blur-sm"}`}>
                          {m.sender === "staff" && <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5"><ShieldCheck className="w-3 h-3" /> Stadium Staff</p>}
                          {m.text}
                          <p className={`text-[10px] font-medium mt-1.5 ${m.sender === "fan" ? "text-indigo-100/70" : "text-slate-500"}`}>{timeAgo(m.timestamp)}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="p-6 sm:p-8 border-t border-white/5 bg-black/40 backdrop-blur-xl z-10">
                    <div className="flex gap-3 relative">
                      <input value={supportInput} onChange={(e) => setSupportInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendSupportMessage()} placeholder="Describe your issue or question to staff..." className="flex-1 bg-black/50 border border-white/10 rounded-xl pl-5 pr-14 py-4 text-[15px] font-medium text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all shadow-inner" />
                      <button onClick={sendSupportMessage} disabled={supportSending || !supportInput.trim()} className="absolute right-2.5 top-2.5 bottom-2.5 aspect-square bg-indigo-500 hover:bg-indigo-400 disabled:bg-white/5 disabled:text-slate-600 rounded-lg flex items-center justify-center transition-colors text-white shadow-[0_0_15px_rgba(99,102,241,0.3)] disabled:shadow-none">
                        {supportSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5 ml-1" />}
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-500 font-medium mt-3">This connects to real stadium personnel, not AI. Response times may vary during high-traffic periods.</p>
                  </div>
                </div>
              </section>
            )}

            {/* Transport Tab */}
            {fanTab === "transport" && (
              <section className="grid md:grid-cols-2 gap-8">
                 <div className="glass-panel rounded-[2rem] p-8 shadow-2xl flex flex-col">
                    <Display className="text-3xl text-white block mb-6">Getting Home Fast</Display>
                    <GenerateButton onClick={suggestTransport} loading={transportLoading} label="Generate Best Route Home" icon={Sparkles} className="w-full py-4 text-[15px]" />
                    {transportSuggestion && (
                       <div className="mt-8 bg-black/40 border border-white/5 rounded-2xl p-6 text-[15px] font-medium text-slate-200 leading-relaxed space-y-4 shadow-inner animate-in fade-in slide-in-from-bottom-4">
                         {transportSuggestion.split('\n').map((line, idx) => {
                           const cleanLine = line.replace(/[*#]/g, '').trim();
                           if(!cleanLine) return null;
                           return <p key={idx}>{cleanLine}</p>;
                         })}
                       </div>
                    )}
                 </div>
                 
                 {/* Live Parking UI - Revamped */}
                 <div className="glass-panel rounded-[2rem] p-8 shadow-2xl flex flex-col">
                    <div className="flex items-center justify-between mb-8">
                      <Display className="text-3xl text-white block">Live Parking Status</Display>
                      <span className="flex items-center gap-1 text-[10px] font-bold text-blue-400 bg-blue-950/60 px-2.5 py-1 rounded-full border border-blue-900/50 shadow-sm"><Radio className="w-3 h-3 animate-pulse"/> LIVE</span>
                    </div>
                    <div className="grid gap-5 flex-1">
                      {parkingLots.map(lot => {
                         const pct = Math.round((lot.filled / lot.capacity) * 100);
                         const isFull = pct >= 95;
                         const isFilling = pct >= 85 && pct < 95;
                         
                         return (
                           <div key={lot.id} className="bg-black/40 border border-white/5 p-5 rounded-2xl flex items-center gap-5 transition-all shadow-inner hover:border-white/10 group">
                              <div className={`p-4 rounded-xl shrink-0 border shadow-lg ${isFull ? 'bg-red-500/10 text-red-400 border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.2)]' : isFilling ? 'bg-amber-500/10 text-amber-400 border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.2)]' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.2)]'}`}>
                                 <Bus className="w-7 h-7" />
                              </div>
                              <div className="flex-1">
                                 <div className="flex justify-between items-center mb-2.5">
                                    <span className="text-[15px] font-bold text-slate-200 group-hover:text-white transition-colors">{lot.id}</span>
                                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border uppercase tracking-wider ${isFull ? 'bg-red-500/20 text-red-300 border-red-500/50' : isFilling ? 'bg-amber-500/20 text-amber-300 border-amber-500/50' : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'}`}>
                                       {lot.status}
                                    </span>
                                 </div>
                                 <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden mb-2 relative shadow-inner">
                                   <div className="h-full transition-all duration-700 ease-out" style={{ width: `${pct}%`, backgroundColor: occColor(pct), boxShadow: `0 0 10px ${occColor(pct)}` }}></div>
                                 </div>
                                 <div className="flex justify-between items-center text-[13px] text-slate-400 font-bold">
                                    <span>{lot.filled} <span className="text-slate-500 font-medium">/ {lot.capacity} spaces</span></span>
                                    <span className="flex items-center gap-1">
                                       <TrendIcon trend={lot.trend} /> 
                                       <span className={isFull ? 'text-red-400' : ''}>{pct}%</span>
                                    </span>
                                 </div>
                              </div>
                           </div>
                         )
                      })}
                    </div>
                 </div>
              </section>
            )}

            {/* Green Fan Tab - Scanner Fixed */}
            {fanTab === "green" && (
              <section className="glass-panel border border-white/10 rounded-[2rem] p-8 shadow-2xl flex flex-col md:flex-row gap-8 animate-in fade-in zoom-in-95">
                <div className="flex-1 flex flex-col justify-center items-center text-center bg-black/40 border border-white/5 rounded-3xl p-10 relative overflow-hidden shadow-inner group">
                  <div className="absolute inset-0 bg-gradient-to-t from-emerald-500/10 to-transparent opacity-50 group-hover:opacity-100 transition-opacity duration-700"></div>
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-emerald-500/20 blur-[80px] rounded-full pointer-events-none"></div>
                  
                  <div className="w-24 h-24 bg-emerald-500/10 rounded-2xl flex items-center justify-center mb-6 relative z-10 border border-emerald-500/30 shadow-[0_0_30px_rgba(16,185,129,0.3)] backdrop-blur-md">
                    <Leaf className="w-12 h-12 text-emerald-400" />
                  </div>
                  <Display className="text-6xl text-white mb-2 relative z-10 drop-shadow-md">{ecoPoints} PTS</Display>
                  <p className="text-sm text-emerald-400 uppercase tracking-widest font-bold relative z-10">Your Eco-Score</p>
                  
                  <div className="w-full max-w-sm mt-10 bg-slate-800 rounded-full h-3 relative z-10 shadow-inner">
                    <div className="bg-gradient-to-r from-emerald-500 to-emerald-300 h-3 rounded-full transition-all duration-700 shadow-[0_0_10px_rgba(16,185,129,0.5)]" style={{ width: `${Math.min(100, (ecoPoints/100)*100)}%`}}></div>
                  </div>
                  <p className="text-xs font-bold text-slate-400 mt-3 relative z-10">{100 - (ecoPoints % 100)} pts to next reward (Free Stadium Drink)</p>
                </div>
                
                <div className="flex-1 flex flex-col gap-5">
                  <Display className="text-3xl text-white block mb-1">Green Fan Quests</Display>
                  <p className="text-sm text-slate-400 mb-4 font-medium">Select a quest to activate your camera and scan for points!</p>
                  {GREEN_QUESTS.map(quest => (
                    <button 
                      key={quest.id} 
                      onClick={() => startScanner(quest)}
                      className={`bg-black/40 border border-white/5 p-5 rounded-2xl flex items-center justify-between group transition-all duration-300 text-left cursor-pointer hover:border-emerald-500/50 hover:bg-white/5 shadow-inner hover:shadow-[0_0_20px_rgba(16,185,129,0.15)]`}
                    >
                       <div className="flex items-center gap-5">
                         <div className={`p-3.5 rounded-xl ${quest.bg} border border-transparent group-hover:border-emerald-500/30 transition-colors`}><quest.icon className={`w-7 h-7 ${quest.color}`} /></div>
                         <div>
                            <p className="text-[15px] font-bold text-slate-200 group-hover:text-white transition-colors">{quest.title}</p>
                            <p className="text-sm text-slate-500 font-medium mt-0.5">{quest.desc}</p>
                         </div>
                       </div>
                       <span className="text-emerald-400 text-[15px] font-bold bg-emerald-500/10 px-4 py-2 rounded-xl border border-emerald-500/20 group-hover:bg-emerald-500 group-hover:text-slate-950 transition-colors shadow-sm">+{quest.points}</span>
                    </button>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}

        {/* ---------------- STAFF PERSONA ---------------- */}
        {}
        {persona === "staff" && (
          <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {activeAlerts.length > 0 && (
              <div className="bg-red-950/40 border border-red-500/30 rounded-2xl p-5 flex flex-col gap-3 shadow-[0_0_30px_rgba(239,68,68,0.2)] backdrop-blur-md">
                {activeAlerts.map((alert, i) => (
                  <div key={i} className="flex items-center gap-3 text-red-300 text-[15px] font-bold">
                    <div className="p-2 bg-red-500/20 rounded-lg"><BellRing className="w-5 h-5 text-red-400 animate-bounce" /></div> {alert}
                  </div>
                ))}
              </div>
            )}

            {/* OPERATIONS & CROWD */}
            {staffTab === "crowd" && (
              <section className="grid lg:grid-cols-12 gap-8">
                
                {/* Gate Dashboard */}
                <div className="lg:col-span-8 glass-panel rounded-[2rem] p-8 shadow-2xl flex flex-col">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 mb-8">
                    <div>
                      <Display className="text-3xl text-white block mb-1">Operations Dashboard</Display>
                      <p className="text-sm text-slate-400 font-medium">Gate Flow Analysis & Congestion Prediction</p>
                    </div>
                    <div className="flex gap-4 w-full sm:w-auto">
                       <div className="flex-1 sm:flex-none text-center px-6 py-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl shadow-inner">
                          <p className="text-2xl font-bold text-emerald-400 mb-1">{totalEntryRate}</p>
                          <p className="text-[10px] uppercase text-emerald-500/80 font-bold tracking-wider">Total Entry/min</p>
                       </div>
                       <div className="flex-1 sm:flex-none text-center px-6 py-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl shadow-inner">
                          <p className="text-2xl font-bold text-amber-400 mb-1">{totalExitRate}</p>
                          <p className="text-[10px] uppercase text-amber-500/80 font-bold tracking-wider">Total Exit/min</p>
                       </div>
                    </div>
                  </div>
                  
                  <div className="space-y-4 overflow-y-auto pr-3 max-h-[500px]">
                     {gateStats.map(g => (
                       <div key={g.id} className="grid grid-cols-12 gap-5 items-center bg-black/40 p-5 rounded-2xl border border-white/5 shadow-inner hover:border-white/10 transition-colors">
                          <div className="col-span-3">
                             <span className="text-[15px] font-bold text-white block mb-1">{g.id}</span>
                             <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{g.zone} Zone</span>
                          </div>
                          <div className="col-span-5">
                             <div className="flex justify-between text-xs font-mono font-bold text-slate-400 mb-2">
                               <span>Occ: {g.pct}%</span>
                               <span>Queue: {g.queueLength} pax</span>
                             </div>
                             <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden shadow-inner">
                                <div className="h-full rounded-full transition-all duration-700 ease-out" style={{ width: `${g.pct}%`, backgroundColor: occColor(g.pct), boxShadow: `0 0 10px ${occColor(g.pct)}` }}></div>
                             </div>
                          </div>
                          <div className="col-span-2 text-center border-l border-white/5">
                             <span className="text-xl font-bold text-emerald-400 flex justify-center items-center gap-1.5 mb-1"><TrendingUp className="w-5 h-5"/> {g.entryRate}</span>
                             <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">In/min</span>
                          </div>
                          <div className="col-span-2 text-center border-l border-white/5">
                             <span className="text-xl font-bold text-slate-300 flex justify-center items-center gap-1.5 mb-1"><TrendingDown className="w-5 h-5"/> {g.exitRate}</span>
                             <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Out/min</span>
                          </div>
                       </div>
                     ))}
                  </div>
                </div>

                {/* Heatmap & Prediction */}
                <div className="lg:col-span-4 flex flex-col gap-8">
                  <div className="glass-panel rounded-[2rem] p-8 shadow-2xl relative overflow-hidden flex-1 group">
                     <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent opacity-50"></div>
                     <Display className="text-3xl text-white block mb-6 relative z-10">AI Heatmap</Display>
                     <div className="aspect-square bg-black/50 border border-white/10 rounded-2xl relative overflow-hidden flex items-center justify-center p-4 shadow-[inset_0_0_30px_rgba(0,0,0,0.5)]">
                        <Map className="absolute inset-0 w-full h-full text-slate-700 opacity-30" />
                        <div className="relative z-10 w-full h-full flex flex-col justify-between">
                           <div className="self-center bg-red-500/60 w-32 h-20 rounded-[100%] blur-[20px] animate-pulse mix-blend-screen"></div>
                           <div className="flex justify-between px-4">
                              <div className="bg-amber-500/40 w-20 h-20 rounded-[100%] blur-[20px] mix-blend-screen"></div>
                              <div className="bg-emerald-500/30 w-24 h-24 rounded-[100%] blur-[20px] mix-blend-screen"></div>
                           </div>
                        </div>
                        <div className="absolute bottom-5 left-0 right-0 text-center z-20">
                           <span className="bg-black/60 border border-white/10 text-xs font-bold px-4 py-2 rounded-xl text-slate-300 backdrop-blur-md shadow-lg">Simulated Heatmap Overlay</span>
                        </div>
                     </div>
                     <div className="mt-6 p-4 bg-red-950/40 border border-red-500/30 rounded-xl text-sm text-red-200 font-medium shadow-inner backdrop-blur-md">
                        <strong className="text-red-400 block mb-1 font-bold tracking-wide uppercase text-xs">Congestion Alert</strong>
                        Heavy density detected near <span className="text-white font-bold">{busiestGate.id}</span>. Re-routing incoming flow recommended.
                     </div>
                  </div>
                </div>
              </section>
            )}

            {/* AI TRIAGE & WEATHER */}
            {staffTab === "incidents" && (
               <section className="grid lg:grid-cols-12 gap-8">
                 <div className="lg:col-span-4 flex flex-col gap-8">
                   
                   {/* Upgraded Incident Triage */}
                   <div className="glass-panel rounded-[2rem] p-8 shadow-2xl flex flex-col">
                     <Display className="text-3xl text-white block mb-6">Log Incident (AI)</Display>
                     <textarea value={incidentNote} onChange={(e) => setIncidentNote(e.target.value)} placeholder="E.g. 'Child lost near section 104 wearing a red hat...'" className="flex-1 min-h-[140px] bg-black/50 border border-white/10 rounded-xl p-5 text-[15px] font-medium text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 resize-none mb-6 shadow-inner" />
                     <GenerateButton onClick={generateIncidentReport} loading={incidentLoading} label="AI Assess & Dispatch" icon={Sparkles} className="bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white shadow-[0_0_20px_rgba(245,158,11,0.3)]" />
                   </div>

                   {/* Weather Alert Component */}
                   <div className="bg-gradient-to-br from-indigo-950 to-[#020617] border border-indigo-500/30 rounded-[2rem] p-8 shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col relative overflow-hidden group">
                      <div className="absolute -right-10 -top-10 opacity-20 group-hover:scale-110 transition-transform duration-700"><CloudRain className="w-48 h-48 text-blue-300"/></div>
                      <Display className="text-3xl text-white block mb-4 relative z-10">Weather Alert</Display>
                      <div className="flex items-center gap-6 mb-6 relative z-10">
                         <div className="text-7xl font-['Bebas_Neue'] text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">{weatherData.temp}°</div>
                         <div>
                            <p className="text-blue-400 font-bold text-lg mb-1">{weatherData.condition}</p>
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Risk Level: <span className="text-red-400 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20 ml-1">{weatherData.risk}</span></p>
                         </div>
                      </div>
                      <div className="bg-black/50 p-4 rounded-xl text-[14px] font-medium text-slate-200 border border-white/10 relative z-10 shadow-inner">
                        <Sparkles className="w-4 h-4 text-amber-400 inline mb-1 mr-2"/> 
                        {weatherData.alert}
                      </div>
                   </div>
                 </div>
                 
                 <div className="lg:col-span-8 glass-panel rounded-[2rem] p-8 shadow-2xl flex flex-col h-full max-h-[750px]">
                   <div className="flex items-center justify-between border-b border-white/10 pb-6 mb-6">
                      <Display className="text-3xl text-white block">Live Dispatch Feed</Display>
                      <span className="text-xs font-bold tracking-wider uppercase bg-black/40 border border-white/10 px-3 py-1.5 rounded-lg text-slate-400 shadow-inner">Auto-Sorted by Priority</span>
                   </div>
                   <div className="flex-1 overflow-y-auto space-y-4 pr-3">
                      {globalIncidents.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-64 text-slate-500">
                          <ShieldCheck className="w-12 h-12 mb-4 opacity-20" />
                          <p className="text-[15px] font-medium">No active incidents. Feed is clear.</p>
                        </div>
                      )}
                      {globalIncidents.map((incident) => (
                        <div key={incident.id} className={`bg-black/40 rounded-2xl p-6 shadow-inner border-l-[6px] border border-white/5 ${incident.severity === 'Critical' || incident.severity === 'High' ? 'border-l-red-500' : 'border-l-amber-500'}`}>
                          <div className="flex justify-between items-start mb-4">
                             <div className="flex gap-3">
                               <span className={`text-[10px] font-bold px-3 py-1.5 rounded-lg uppercase tracking-wider shadow-sm ${incident.severity === 'Critical' ? 'bg-red-500 text-white' : incident.severity === 'High' ? 'bg-orange-500 text-white' : 'bg-slate-700 text-slate-200'}`}>{incident.severity}</span>
                               <span className="text-[10px] font-bold px-3 py-1.5 rounded-lg uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">{incident.category}</span>
                             </div>
                             <span className="text-xs font-bold text-slate-500">{new Date(incident.timestamp).toLocaleTimeString()}</span>
                          </div>
                          <p className="text-[16px] font-medium text-slate-200 mb-4 leading-relaxed">{incident.reportText}</p>
                          <div className="bg-white/5 rounded-xl p-4 text-[14px] font-medium text-slate-300 border border-white/5">
                             <strong className="text-emerald-400">Action Required:</strong> {incident.action}
                          </div>
                        </div>
                      ))}
                   </div>
                 </div>
               </section>
            )}

            {/* FAN SUPPORT - Live chat inbox for staff */}
            {staffTab === "support" && (
              <section className="glass-panel border border-white/10 rounded-[2rem] overflow-hidden shadow-2xl flex flex-col md:flex-row h-[700px]">
                {/* Thread list */}
                <div className="w-full md:w-[320px] shrink-0 border-r border-white/5 flex flex-col bg-black/20">
                  <div className="px-6 py-5 border-b border-white/5">
                    <div className="flex items-center gap-2.5 mb-1">
                      <div className="p-2 bg-indigo-500/10 rounded-lg border border-indigo-500/20"><Headphones className="w-4 h-4 text-indigo-400" /></div>
                      <Display className="text-2xl text-white">Fan Support</Display>
                    </div>
                    <p className="text-xs text-slate-400 font-medium">{supportThreads.length} conversation{supportThreads.length === 1 ? "" : "s"} at {currentStadiumName}</p>
                  </div>
                  <div className="flex-1 overflow-y-auto">
                    {supportThreads.length === 0 && (
                      <div className="flex flex-col items-center justify-center h-full text-slate-500 px-6 text-center">
                        <Headphones className="w-10 h-10 mb-3 opacity-20" />
                        <p className="text-sm font-medium">No fan messages yet for this stadium.</p>
                      </div>
                    )}
                    {supportThreads.map(t => (
                      <button key={t.id} onClick={() => setSelectedThreadId(t.id)} className={`w-full text-left px-6 py-4 border-b border-white/5 transition-all ${selectedThreadId === t.id ? "bg-indigo-500/10 border-l-[3px] border-l-indigo-500" : "hover:bg-white/5 border-l-[3px] border-l-transparent"}`}>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[14px] font-bold text-slate-200 flex items-center gap-1.5">
                            {t.status !== 'resolved' && t.lastSender === 'fan' && <span className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.7)]"></span>}
                            {t.fanLabel || `Fan #${t.fanId?.slice(-4).toUpperCase()}`}
                          </span>
                          <span className="text-[10px] text-slate-500 font-bold">{timeAgo(t.updatedAt)}</span>
                        </div>
                        <p className="text-[12px] text-slate-400 font-medium truncate">{t.lastSender === 'staff' ? 'You: ' : ''}{t.lastMessage}</p>
                        {t.status === 'resolved' && <span className="inline-block mt-2 text-[9px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">Resolved</span>}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Active thread */}
                <div className="flex-1 flex flex-col min-w-0 bg-gradient-to-b from-transparent to-black/20">
                  {!selectedThreadId ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-500 text-center px-8">
                      <MessageCircle className="w-12 h-12 mb-4 opacity-20" />
                      <p className="text-[15px] font-medium max-w-sm">Select a conversation on the left to view messages and reply to a fan.</p>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between px-8 py-6 border-b border-white/5 bg-black/20 backdrop-blur-md z-10">
                        <div>
                          <Display className="text-2xl text-white">{supportThreads.find(t => t.id === selectedThreadId)?.fanLabel || "Fan"}</Display>
                          <p className="text-xs text-slate-400 mt-1 font-medium">Ticket ID: {selectedThreadId.slice(-8).toUpperCase()}</p>
                        </div>
                        <button onClick={() => resolveThread(selectedThreadId)} className="inline-flex items-center gap-2 text-xs font-bold px-4 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 transition-all">
                          <CheckCheck className="w-4 h-4" /> Mark Resolved
                        </button>
                      </div>
                      <div ref={staffChatScrollRef} className="flex-1 overflow-y-auto px-8 py-8 space-y-6">
                        {staffThreadMessages.map((m) => (
                          <div key={m.id} className={`flex ${m.sender === "staff" ? "justify-end" : "justify-start"} animate-in fade-in slide-in-from-bottom-2`}>
                            <div className={`max-w-[85%] md:max-w-[75%] rounded-2xl px-6 py-4 text-[15px] leading-relaxed font-medium shadow-lg ${m.sender === "staff" ? "bg-gradient-to-r from-indigo-600 to-indigo-500 text-white rounded-br-sm shadow-[0_5px_15px_rgba(99,102,241,0.2)]" : "bg-black/60 border border-white/10 text-slate-100 rounded-bl-sm backdrop-blur-sm"}`}>
                              {m.text}
                              <p className={`text-[10px] font-medium mt-1.5 ${m.sender === "staff" ? "text-indigo-100/70" : "text-slate-500"}`}>{timeAgo(m.timestamp)}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="p-6 sm:p-8 border-t border-white/5 bg-black/40 backdrop-blur-xl z-10">
                        <div className="flex gap-3 relative">
                          <input value={staffReplyInput} onChange={(e) => setStaffReplyInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendStaffReply()} placeholder="Type a reply to this fan..." className="flex-1 bg-black/50 border border-white/10 rounded-xl pl-5 pr-14 py-4 text-[15px] font-medium text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all shadow-inner" />
                          <button onClick={sendStaffReply} disabled={staffReplySending || !staffReplyInput.trim()} className="absolute right-2.5 top-2.5 bottom-2.5 aspect-square bg-indigo-500 hover:bg-indigo-400 disabled:bg-white/5 disabled:text-slate-600 rounded-lg flex items-center justify-center transition-colors text-white shadow-[0_0_15px_rgba(99,102,241,0.3)] disabled:shadow-none">
                            {staffReplySending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5 ml-1" />}
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </section>
            )}

            {/* BROADCAST NEWS - Staff writes news, fans see it on home */}
            {staffTab === "broadcast" && (
              <section className="grid lg:grid-cols-12 gap-8">
                <div className="lg:col-span-5 glass-panel rounded-[2rem] p-8 shadow-2xl flex flex-col">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2.5 bg-blue-500/10 rounded-xl border border-blue-500/20"><Megaphone className="w-5 h-5 text-blue-400" /></div>
                    <Display className="text-3xl text-white">Broadcast News</Display>
                  </div>
                  <p className="text-sm text-slate-400 mb-6 font-medium">Push an update to every fan viewing <span className="font-bold text-blue-400">{currentStadiumName}</span>. It appears instantly on their Home tab.</p>

                  <div className="flex gap-2 mb-4">
                    {["Info", "Advisory", "Urgent"].map(p => (
                      <button
                        key={p}
                        onClick={() => setAnnouncementPriority(p)}
                        className={`flex-1 text-[12px] font-bold uppercase tracking-wider px-3 py-2.5 rounded-xl border transition-all ${announcementPriority === p ? (p === "Urgent" ? "bg-red-500/20 border-red-500/50 text-red-300" : p === "Advisory" ? "bg-amber-500/20 border-amber-500/50 text-amber-300" : "bg-blue-500/20 border-blue-500/50 text-blue-300") : "bg-black/30 border-white/5 text-slate-500 hover:text-slate-300"}`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>

                  <textarea
                    value={newAnnouncement}
                    onChange={(e) => setNewAnnouncement(e.target.value)}
                    placeholder="E.g. 'Gate C will open 30 minutes early due to high demand...'"
                    className="flex-1 min-h-[140px] bg-black/50 border border-white/10 rounded-xl p-5 text-[15px] font-medium text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 resize-none mb-6 shadow-inner"
                  />
                  <GenerateButton
                    onClick={broadcastAnnouncement}
                    loading={broadcastSending}
                    label="Broadcast to Fans"
                    icon={Send}
                    className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white shadow-[0_0_20px_rgba(59,130,246,0.3)]"
                  />
                </div>

                <div className="lg:col-span-7 glass-panel rounded-[2rem] p-8 shadow-2xl flex flex-col h-full max-h-[700px]">
                  <div className="flex items-center justify-between border-b border-white/10 pb-6 mb-6">
                    <Display className="text-3xl text-white block">Broadcast History</Display>
                    <span className="text-xs font-bold tracking-wider uppercase bg-black/40 border border-white/10 px-3 py-1.5 rounded-lg text-slate-400 shadow-inner">{announcements.length} Sent</span>
                  </div>
                  <div className="flex-1 overflow-y-auto space-y-4 pr-3">
                    {announcements.length === 0 && (
                      <div className="flex flex-col items-center justify-center h-64 text-slate-500">
                        <Megaphone className="w-12 h-12 mb-4 opacity-20" />
                        <p className="text-[15px] font-medium">No broadcasts sent yet for this stadium.</p>
                      </div>
                    )}
                    {announcements.map((a) => (
                      <div key={a.id} className="bg-black/40 rounded-2xl p-5 shadow-inner border border-white/5 flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg uppercase tracking-wider ${a.priority === "Urgent" ? "bg-red-500/20 text-red-300 border border-red-500/40" : a.priority === "Advisory" ? "bg-amber-500/20 text-amber-300 border border-amber-500/40" : "bg-blue-500/20 text-blue-300 border border-blue-500/40"}`}>{a.priority || "Info"}</span>
                            <span className="text-xs font-bold text-slate-500">{timeAgo(a.timestamp)}</span>
                          </div>
                          <p className="text-[15px] text-slate-200 font-medium leading-relaxed">{a.text}</p>
                        </div>
                        <button onClick={() => deleteAnnouncement(a.id)} title="Retract broadcast" className="p-2.5 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-red-400 hover:border-red-500/30 hover:bg-red-500/10 transition-all shrink-0">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {/* SUSTAINABILITY DASHBOARD */}
            {staffTab === "sustainability" && (
              <section className="flex flex-col gap-8">
                 <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="glass-panel rounded-[2rem] p-8 shadow-2xl relative overflow-hidden group">
                       <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform duration-500"><Droplets className="w-20 h-20 text-blue-400"/></div>
                       <Droplets className="w-8 h-8 text-blue-400 mb-4 relative z-10"/>
                       <p className="text-4xl font-bold text-white mb-2 relative z-10">18.4k L</p>
                       <p className="text-xs text-slate-400 uppercase font-bold tracking-wider relative z-10">Water Saved (Refills)</p>
                    </div>
                    <div className="glass-panel rounded-[2rem] p-8 shadow-2xl relative overflow-hidden group">
                       <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform duration-500"><Recycle className="w-20 h-20 text-emerald-400"/></div>
                       <Recycle className="w-8 h-8 text-emerald-400 mb-4 relative z-10"/>
                       <p className="text-4xl font-bold text-white mb-2 relative z-10">74%</p>
                       <p className="text-xs text-slate-400 uppercase font-bold tracking-wider relative z-10">Waste Diversion Rate</p>
                    </div>
                    <div className="glass-panel rounded-[2rem] p-8 shadow-2xl relative overflow-hidden group">
                       <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform duration-500"><Zap className="w-20 h-20 text-amber-400"/></div>
                       <Zap className="w-8 h-8 text-amber-400 mb-4 relative z-10"/>
                       <p className="text-4xl font-bold text-white mb-2 relative z-10">450 kWh</p>
                       <p className="text-xs text-slate-400 uppercase font-bold tracking-wider relative z-10">Solar Generated</p>
                    </div>
                    <div className="glass-panel rounded-[2rem] p-8 shadow-2xl relative overflow-hidden group">
                       <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform duration-500"><Leaf className="w-20 h-20 text-emerald-500"/></div>
                       <Leaf className="w-8 h-8 text-emerald-500 mb-4 relative z-10"/>
                       <p className="text-4xl font-bold text-white mb-2 relative z-10">22%</p>
                       <p className="text-xs text-slate-400 uppercase font-bold tracking-wider relative z-10">Carbon Reduced</p>
                    </div>
                 </div>

                 <div className="glass-panel rounded-[2rem] p-10 shadow-2xl text-center flex flex-col items-center">
                    <Display className="text-4xl text-white block mb-3">AI Daily Briefing</Display>
                    <p className="text-[15px] text-slate-400 mb-8 font-medium">Generate executive summary using live sustainability metrics.</p>
                    <GenerateButton onClick={generateBriefing} loading={briefingLoading} label="Generate Exec Report" icon={Sparkles} className="w-full max-w-md py-4 text-[15px]" />
                    {briefing && (
                       <div className="mt-10 text-slate-200 text-[16px] font-medium leading-relaxed max-w-4xl text-left bg-black/40 p-8 rounded-2xl border border-emerald-500/30 shadow-[inset_0_0_30px_rgba(16,185,129,0.05)] animate-in fade-in slide-in-from-bottom-4">
                         {briefing}
                       </div>
                    )}
                 </div>
              </section>
            )}

            {/* VOLUNTEER MANAGEMENT & LOST FOUND (Combined to save code space) */}
            {(staffTab === "volunteers" || staffTab === "lostfound") && (
               <section className="glass-panel rounded-[2rem] p-8 shadow-2xl min-h-[500px] flex items-center justify-center text-center">
                 <div>
                    <Display className="text-4xl text-white block mb-4">{staffTab === 'volunteers' ? 'Volunteer Ops' : 'Lost & Found AI'}</Display>
                    <p className="text-slate-400 font-medium max-w-lg mx-auto">This module is part of the extended Operations OS. (UI trimmed for this core demo, refer to Crowd & Incidents for primary AI integrations).</p>
                 </div>
               </section>
            )}

          </div>
        )}

        {/* --- FULLSCREEN CAMERA SCANNER OVERLAY --- */}
        {}
        {scannerState.active && (
          <div className="fixed inset-0 z-[100] flex flex-col bg-black/95 backdrop-blur-xl animate-in fade-in duration-300">
             <div className="flex items-center justify-between p-6 sm:p-8 z-10 border-b border-white/10 bg-black/50">
                <div>
                   <h3 className="text-white font-bold text-2xl mb-1">{scannerState.quest?.title}</h3>
                   <p className="text-emerald-400 text-[15px] font-bold">{scannerState.quest?.desc}</p>
                </div>
                <button onClick={stopScanner} className="bg-white/10 text-slate-300 p-4 rounded-full hover:bg-white/20 hover:text-white transition-all shadow-lg border border-white/5">
                   <Minus className="w-6 h-6" />
                </button>
             </div>
             
             <div className="flex-1 relative flex items-center justify-center p-6">
                <div className="relative w-full max-w-md aspect-[3/4] bg-[#020617] rounded-[2.5rem] overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.8)] border border-white/10 flex flex-col">
                   {scannerState.status === 'scanning' && (
                     <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover opacity-80" />
                   )}
                   {scannerState.status === 'simulated' && (
                     <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 text-slate-500 p-8 text-center">
                        <Scan className="w-16 h-16 mb-6 opacity-30 text-emerald-500" />
                        <p className="text-lg font-bold text-white mb-2">Device Camera Unavailable</p>
                        <p className="text-[14px] font-medium leading-relaxed">If on desktop without a webcam, you can still proceed. A simulated verification image will be sent to the AI.</p>
                     </div>
                   )}
                   
                   <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
                      <div className="w-3/4 aspect-square border-[3px] border-dashed border-white/20 rounded-3xl relative">
                         <div className="absolute -top-1.5 -left-1.5 w-10 h-10 border-t-[5px] border-l-[5px] border-emerald-500 rounded-tl-2xl shadow-[0_0_15px_rgba(16,185,129,0.5)]"></div>
                         <div className="absolute -top-1.5 -right-1.5 w-10 h-10 border-t-[5px] border-r-[5px] border-emerald-500 rounded-tr-2xl shadow-[0_0_15px_rgba(16,185,129,0.5)]"></div>
                         <div className="absolute -bottom-1.5 -left-1.5 w-10 h-10 border-b-[5px] border-l-[5px] border-emerald-500 rounded-bl-2xl shadow-[0_0_15px_rgba(16,185,129,0.5)]"></div>
                         <div className="absolute -bottom-1.5 -right-1.5 w-10 h-10 border-b-[5px] border-r-[5px] border-emerald-500 rounded-br-2xl shadow-[0_0_15px_rgba(16,185,129,0.5)]"></div>
                      </div>
                   </div>
                   
                   {/* Capture Button */}
                   {(scannerState.status === 'scanning' || scannerState.status === 'simulated') && (
                     <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-20">
                        <button onClick={captureAndVerify} className="w-20 h-20 bg-white rounded-full border-[6px] border-slate-300 flex items-center justify-center shadow-[0_0_30px_rgba(255,255,255,0.3)] hover:scale-105 active:scale-95 transition-all">
                           <div className="w-14 h-14 bg-emerald-500 rounded-full flex items-center justify-center shadow-[inset_0_0_10px_rgba(0,0,0,0.2)]"><Sparkles className="w-6 h-6 text-white"/></div>
                        </button>
                        <p className="text-[11px] font-bold text-white uppercase tracking-widest text-center mt-4 drop-shadow-lg">Verify via AI</p>
                     </div>
                   )}

                   {/* Verifying State */}
                   {scannerState.status === 'verifying' && (
                     <div className="absolute inset-0 z-20 bg-[#020617]/95 backdrop-blur-xl flex flex-col items-center justify-center">
                        <div className="relative">
                          <div className="absolute inset-0 bg-emerald-500 blur-2xl opacity-20 rounded-full"></div>
                          <Loader2 className="w-16 h-16 text-emerald-500 animate-spin mb-6 relative z-10" />
                        </div>
                        <p className="text-emerald-400 font-bold animate-pulse tracking-wide text-xl">AI is analyzing image...</p>
                     </div>
                   )}

                   {/* Failed State */}
                   {scannerState.status === 'failed' && (
                     <div className="absolute inset-0 z-20 bg-red-950/95 backdrop-blur-xl flex flex-col items-center justify-center text-slate-100 p-8 text-center animate-in fade-in zoom-in duration-300">
                        <div className="w-24 h-24 bg-red-500/20 rounded-full flex items-center justify-center mb-6 border border-red-500/30">
                          <AlertTriangle className="w-12 h-12 text-red-500" />
                        </div>
                        <p className="text-4xl font-bold font-['Bebas_Neue'] tracking-wider mb-3">VERIFICATION FAILED</p>
                        <p className="text-[15px] font-medium text-red-200 mb-8 bg-red-900/40 p-4 rounded-xl border border-red-500/30 shadow-inner">{scannerState.message}</p>
                        <button onClick={() => setScannerState(prev => ({ ...prev, status: 'scanning', message: '' }))} className="bg-red-500 text-white px-8 py-3.5 rounded-xl font-bold hover:bg-red-400 shadow-[0_0_20px_rgba(239,68,68,0.4)] transition-colors">Try Again</button>
                     </div>
                   )}
                   
                   {/* Success State */}
                   {scannerState.status === 'success' && (
                     <div className="absolute inset-0 z-20 bg-emerald-900/95 backdrop-blur-xl flex flex-col items-center justify-center text-slate-100 p-8 text-center animate-in fade-in zoom-in duration-300">
                        <div className="w-28 h-28 bg-emerald-500/20 rounded-full flex items-center justify-center mb-6 border border-emerald-500/30 shadow-[0_0_30px_rgba(16,185,129,0.3)]">
                           <CheckCircle2 className="w-16 h-16 text-emerald-400 drop-shadow-md" />
                        </div>
                        <p className="text-5xl font-bold text-white drop-shadow-sm font-['Bebas_Neue'] tracking-wider mb-3 text-transparent bg-clip-text bg-gradient-to-b from-white to-emerald-200">VERIFIED!</p>
                        <p className="text-[15px] text-emerald-100 mb-8 font-medium leading-relaxed px-4">{scannerState.message}</p>
                        <p className="text-emerald-950 text-lg font-bold bg-gradient-to-r from-emerald-400 to-emerald-300 px-8 py-3 rounded-full shadow-[0_0_20px_rgba(16,185,129,0.4)]">+{scannerState.quest?.points} Points Awarded</p>
                     </div>
                   )}
                </div>
             </div>
          </div>
        )}
      </main>
    </div>
  );
}