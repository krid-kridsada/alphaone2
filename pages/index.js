import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Upload, Download, LayoutDashboard, Settings, Bell, Search, User, Users, Target, Sparkles, Filter, Share2, CheckCircle, Loader2, RefreshCw, Moon, Sun, CalendarDays, Clock, ArrowRight, Activity, AlertCircle, Info, Bug } from 'lucide-react';


// --- Firebase Database Setup ---
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithCustomToken, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, onSnapshot } from 'firebase/firestore';

const firebaseConfigRaw = process.env.NEXT_PUBLIC_FIREBASE_CONFIG;
const initialAuthToken = process.env.NEXT_PUBLIC_INITIAL_AUTH_TOKEN;
const appId = process.env.NEXT_PUBLIC_APP_ID || 'default-app-id';

let app;
let auth;
let db;

try {
if (firebaseConfigRaw) {
const firebaseConfig = JSON.parse(firebaseConfigRaw);
app = initializeApp(firebaseConfig);
auth = getAuth(app);
db = getFirestore(app);
}
} catch (e) {
console.warn("Firebase init info: Running without Firebase config.", e);
}

// --- Helper: CSV Parser ที่เสถียร รองรับ Newline ใน Quotes และรูปแบบจาก Excel ---
const parseCSVStrict = (text) => {
const arr = [];
let quote = false;
let col = 0, row = 0;
for (let c = 0; c < text.length; c++) {
let cc = text[c], nc = text[c+1];
arr[row] = arr[row] || [];
arr[row][col] = arr[row][col] || '';

if (cc === '"' && quote && nc === '"') { arr[row][col] += cc; ++c; continue; }
if (cc === '"') { quote = !quote; continue; }
if (cc === ',' && !quote) { ++col; continue; }
if (cc === '\r' && nc === '\n' && !quote) { ++row; col = 0; ++c; continue; }
if (cc === '\n' && !quote) { ++row; col = 0; continue; }
if (cc === '\r' && !quote) { ++row; col = 0; continue; }

arr[row][col] += cc;
}

if (arr.length < 2) return { headers: [], data: [] };

const headers = arr[0].map(h => h.replace(/\r?\n|\r/g, ' ').replace(/\s+/g, ' ').trim());
const data = [];
for (let i = 1; i < arr.length; i++) {
const rowData = arr[i];
if (rowData.length === 1 && rowData[0].trim() === '') continue;
const obj = {};
headers.forEach((h, idx) => {
obj[h] = rowData[idx] ? rowData[idx].trim() : '';
});
data.push(obj);
}

return {
headers,
data: data.filter(obj => Object.values(obj).some(val => val && val.toString().trim() !== ''))
};
};

// --- MOCK DATA FOR MEETING CYCLE DASHBOARD ---
const MOCK_MEETING_DATA = [
{ id: 101, day: 'จันทร์', team: 'PM x Process', type: 'Progress Update', time: '09:30-09:45', title: 'Daily Sync', desc: 'อัปเดตงานกับ Process' },
{ id: 102, day: 'อังคาร', team: 'PM x Process', type: 'Progress Update', time: '09:30-09:45', title: 'Daily Sync', desc: 'อัปเดตงานกับ Process' },
{ id: 103, day: 'พุธ', team: 'PM x Process', type: 'Progress Update', time: '09:30-09:45', title: 'Daily Sync', desc: 'อัปเดตงานกับ Process' },
{ id: 104, day: 'พฤหัสบดี', team: 'PM x Process', type: 'Progress Update', time: '09:30-09:45', title: 'Daily Sync', desc: 'อัปเดตงานกับ Process' },
{ id: 105, day: 'ศุกร์', team: 'PM x Process', type: 'Progress Update', time: '09:30-09:45', title: 'Daily Sync', desc: 'อัปเดตงานกับ Process' },
{ id: 106, day: 'พุธ', team: 'PM x Process', type: 'UAT', time: '13:30-17:30', title: 'UAT Phase', desc: 'ร่วมทดสอบระบบ UAT' },
{ id: 107, day: 'ศุกร์', team: 'PM x Process', type: 'Progress Update', time: '09:00-11:00', title: 'Update & Req Sync', desc: 'Update progress + คุย Req กับ User' },
{ id: 201, day: 'จันทร์', team: 'Tech x Process', type: 'Progress Update', time: '13:30-17:30', title: 'Requirement Sync', desc: 'คุย Requirement กับ Process' },
{ id: 202, day: 'อังคาร', team: 'Tech x Process', type: 'Deploy', time: '10:00-15:00', title: 'Deploy', desc: 'นำขึ้นระบบ Production' },
{ id: 203, day: 'พุธ', team: 'Tech x Process', type: 'UAT', time: '13:30-17:30', title: 'UAT Support', desc: 'Support การทดสอบ UAT' },
{ id: 204, day: 'พฤหัสบดี', team: 'Tech x Process', type: 'Fix Bug', time: '09:00-17:30', title: 'Fix Bug', desc: 'แก้ไขบัคจากรอบ UAT' },
{ id: 205, day: 'ศุกร์', team: 'Tech x Process', type: 'Progress Update', time: '09:00-11:00', title: 'Update & Req Sync', desc: 'Update progress + คุย Req กับ User' },
{ id: 301, day: 'พุธ', team: 'User x Process x Tech', type: 'UAT', time: '13:30-17:30', title: 'UAT', desc: 'ทดสอบระบบ (User)' },
{ id: 302, day: 'ศุกร์', team: 'User x Process x Tech', type: 'Progress Update', time: '09:00-11:00', title: 'Update & Req Sync', desc: 'Update progress + คุย Req ร่วมกัน' },
{ id: 401, day: 'จันทร์', team: 'Helpdesk', type: 'Demo / Troubleshooting', time: '13:00-16:00', title: 'Demo & Troubleshoot', desc: 'สาธิตและแก้ปัญหาเบื้องต้น' }
];

const TEAMS = ['Tech x Process', 'PM x Process', 'User x Process x Tech', 'Helpdesk'];
const DAYS = ['จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์'];

const TYPE_STYLES = {
'UAT': { light: 'bg-yellow-50 text-yellow-800 border border-yellow-200 border-l-4 border-l-yellow-400', dark: 'bg-yellow-500/10 text-yellow-300 border border-yellow-500/20 border-l-4 border-l-yellow-500' },
'Deploy': { light: 'bg-blue-50 text-blue-800 border border-blue-200 border-l-4 border-l-blue-400', dark: 'bg-blue-500/10 text-blue-300 border border-blue-500/20 border-l-4 border-l-blue-500' },
'Fix Bug': { light: 'bg-orange-50 text-orange-800 border border-orange-200 border-l-4 border-l-orange-400', dark: 'bg-orange-500/10 text-orange-300 border border-orange-500/20 border-l-4 border-l-orange-500' },
'Progress Update': { light: 'bg-emerald-50 text-emerald-800 border border-emerald-200 border-l-4 border-l-emerald-400', dark: 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 border-l-4 border-l-emerald-500' },
'Demo / Troubleshooting': { light: 'bg-purple-50 text-purple-800 border border-purple-200 border-l-4 border-l-purple-400', dark: 'bg-purple-500/10 text-purple-300 border border-purple-500/20 border-l-4 border-l-purple-500' },
};

const TEAM_ICONS = {
'Tech x Process': '💻',
'PM x Process': '📊',
'User x Process x Tech': '🤝',
'Helpdesk': '🎧'
};

// --- Meeting Cycle Dashboard Component ---
const MeetingCycleDashboard = ({ isDarkMode }) => {
const [selectedDay, setSelectedDay] = useState('จันทร์');

const getHeatmapColor = (count) => {
if (count === 0) return isDarkMode ? 'bg-slate-800' : 'bg-slate-100';
if (count === 1) return isDarkMode ? 'bg-blue-900/40 text-blue-300' : 'bg-blue-100 text-blue-700';
if (count === 2) return isDarkMode ? 'bg-blue-700/60 text-white' : 'bg-blue-300 text-blue-900';
return isDarkMode ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white';
};

return (
<div className="flex flex-col gap-4 xl:gap-6 w-full max-w-7xl mx-auto">
<div className="grid grid-cols-1 md:grid-cols-2 gap-4 xl:gap-6 shrink-0">
<div className={`relative overflow-hidden p-4 xl:p-5 rounded-2xl border shadow-sm flex items-center gap-4 group transition-all hover:shadow-md ${isDarkMode ? 'bg-gradient-to-br from-indigo-900/50 to-purple-900/50 border-indigo-700/50' : 'bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-200'}`}>
<div className={`absolute -right-4 -top-4 w-24 h-24 rounded-full blur-2xl opacity-40 transition-transform duration-500 group-hover:scale-150 ${isDarkMode ? 'bg-purple-500' : 'bg-purple-400'}`}></div>
<div className={`p-3 rounded-xl shrink-0 z-10 ${isDarkMode ? 'bg-indigo-500/20 text-indigo-300' : 'bg-white text-indigo-600 shadow-sm'}`}>
<Users size={24} />
</div>
<div className="z-10 flex-1">
<div className="flex items-center gap-2 mb-1">
<span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 ${isDarkMode ? 'bg-indigo-500/30 text-indigo-200' : 'bg-indigo-200 text-indigo-800'}`}>
<Sparkles size={10} /> ทุกสิ้นเดือน
</span>
</div>
<h3 className={`font-bold text-sm xl:text-base ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>Retrospective (All Teams)</h3>
<p className={`text-xs mt-0.5 ${isDarkMode ? 'text-indigo-200/80' : 'text-slate-600'}`}>ทุกทีมเข้าร่วมเพื่อสรุปผลและปรับปรุงการทำงานร่วมกัน</p>
</div>
</div>

<div className={`relative overflow-hidden p-4 xl:p-5 rounded-2xl border shadow-sm flex items-center gap-4 group transition-all hover:shadow-md ${isDarkMode ? 'bg-gradient-to-br from-emerald-900/50 to-teal-900/50 border-emerald-700/50' : 'bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200'}`}>
<div className={`absolute -right-4 -top-4 w-24 h-24 rounded-full blur-2xl opacity-40 transition-transform duration-500 group-hover:scale-150 ${isDarkMode ? 'bg-teal-500' : 'bg-teal-400'}`}></div>
<div className={`p-3 rounded-xl shrink-0 z-10 ${isDarkMode ? 'bg-emerald-500/20 text-emerald-300' : 'bg-white text-emerald-600 shadow-sm'}`}>
<Target size={24} />
</div>
<div className="z-10 flex-1">
<div className="flex items-center gap-2 mb-1">
<span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 ${isDarkMode ? 'bg-emerald-500/30 text-emerald-200' : 'bg-emerald-200 text-emerald-800'}`}>
<Sparkles size={10} /> สัปดาห์แรกของเดือน
</span>
</div>
<h3 className={`font-bold text-sm xl:text-base ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>Steer-Co Meeting</h3>
<p className={`text-xs mt-0.5 ${isDarkMode ? 'text-emerald-200/80' : 'text-slate-600'}`}>ประชุมคณะกรรมการบริหารและอัปเดตทิศทางโครงการ</p>
</div>
</div>
</div>

<div className="grid grid-cols-1 xl:grid-cols-3 gap-4 xl:gap-6 items-start">
<div className={`xl:col-span-2 rounded-2xl border shadow-sm flex flex-col overflow-hidden ${isDarkMode ? 'border-slate-700 bg-slate-900' : 'border-slate-200 bg-white'} divide-y ${isDarkMode ? 'divide-slate-700' : 'divide-slate-200'}`}>
<div className={`px-5 py-4 border-b flex justify-between items-center ${isDarkMode ? 'border-slate-800' : 'border-slate-100'}`}>
<h3 className={`font-bold text-lg flex items-center gap-2 ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
<CalendarDays className={isDarkMode ? 'text-blue-400' : 'text-blue-600'} size={20}/>
Weekly Timeline View
</h3>
<div className="flex flex-wrap gap-2 text-[10px] font-medium">
<span className={`px-2 py-1 rounded border-l-2 ${isDarkMode ? 'bg-yellow-500/10 border-yellow-500 text-yellow-400' : 'bg-yellow-50 border-yellow-400 text-yellow-700'}`}>UAT</span>
<span className={`px-2 py-1 rounded border-l-2 ${isDarkMode ? 'bg-blue-500/10 border-blue-500 text-blue-400' : 'bg-blue-50 border-blue-400 text-blue-700'}`}>Deploy</span>
<span className={`px-2 py-1 rounded border-l-2 ${isDarkMode ? 'bg-orange-500/10 border-orange-500 text-orange-400' : 'bg-orange-50 border-orange-400 text-orange-700'}`}>Fix Bug</span>
<span className={`px-2 py-1 rounded border-l-2 ${isDarkMode ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400' : 'bg-emerald-50 border-emerald-400 text-emerald-700'}`}>Update</span>
<span className={`px-2 py-1 rounded border-l-2 ${isDarkMode ? 'bg-purple-500/10 border-purple-500 text-purple-400' : 'bg-purple-50 border-purple-400 text-purple-700'}`}>Demo</span>
</div>
</div>

<div className="overflow-x-auto custom-scrollbar">
<div className="min-w-[1000px] p-4">
<div className={`rounded-xl border overflow-hidden flex flex-col ${isDarkMode ? 'border-slate-700 bg-slate-900' : 'border-slate-200 bg-white'} divide-y ${isDarkMode ? 'divide-slate-700' : 'divide-slate-200'}`}>
<div className={`grid grid-cols-[180px_repeat(5,1fr)] divide-x ${isDarkMode ? 'divide-slate-700' : 'divide-slate-200'}`}>
<div className={`p-3 font-bold text-[11px] uppercase tracking-wider flex items-center justify-center ${isDarkMode ? 'bg-slate-800/50 text-slate-400' : 'bg-slate-50 text-slate-500'}`}>
ทีม (Teams)
</div>
{DAYS.map(day => (
<div key={day} className={`p-3 text-center font-bold text-sm cursor-pointer transition-colors ${selectedDay === day ? (isDarkMode ? 'bg-blue-900/40 text-blue-300' : 'bg-blue-100/50 text-blue-700') : (isDarkMode ? 'bg-slate-800/50 text-slate-300 hover:bg-slate-800' : 'bg-slate-50 text-slate-700 hover:bg-white')} `} onClick={() => setSelectedDay(day)}>
{day}
</div>
))}
</div>

{TEAMS.map((team) => (
<div key={team} className={`grid grid-cols-[180px_repeat(5,1fr)] divide-x ${isDarkMode ? 'divide-slate-700' : 'divide-slate-200'}`}>
<div className={`p-4 flex flex-col justify-center items-start bg-transparent`}>
<div className="text-xl mb-1">{TEAM_ICONS[team]}</div>
<span className={`font-bold text-[11px] leading-tight ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>{team}</span>
</div>

{DAYS.map(day => {
const tasks = MOCK_MEETING_DATA.filter(d => d.team === team && d.day === day);
return (
<div key={`${team}-${day}`} className={`p-2.5 flex flex-col gap-2 min-h-[110px] transition-colors ${selectedDay === day ? (isDarkMode ? 'bg-slate-800/50' : 'bg-blue-50/30') : 'bg-transparent'} hover:${isDarkMode ? 'bg-slate-800/30' : 'bg-slate-50'}`}>
{tasks.map(task => {
const style = TYPE_STYLES[task.type][isDarkMode ? 'dark' : 'light'];
return (
<div key={task.id} className={`p-2.5 rounded-lg shadow-sm flex flex-col gap-1.5 hover:shadow-md transition-shadow cursor-default ${style}`}>
<span className="font-bold text-[10px] sm:text-[11px] leading-tight">{task.title}</span>
<div className="text-[9px] sm:text-[10px] font-medium opacity-80 flex items-center gap-1">
<Clock size={10} /> {task.time}
</div>
</div>
)
})}
</div>
)
})}
</div>
))}
</div>
</div>
</div>
</div>

<div className="flex flex-col gap-4 xl:gap-6">
<div className={`p-5 rounded-2xl border shadow-sm ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
<h3 className={`font-bold text-sm mb-3 ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>Workload Heatmap (ปริมาณงาน)</h3>
<div className="flex gap-2">
{DAYS.map(day => {
const dayTasksCount = MOCK_MEETING_DATA.filter(d => d.day === day).length;
const heatClass = getHeatmapColor(dayTasksCount);
return (
<div
key={`heatmap-${day}`}
onClick={() => setSelectedDay(day)}
className={`flex-1 flex flex-col items-center justify-center py-3 rounded-lg cursor-pointer transition-all border ${selectedDay === day ? 'ring-2 ring-blue-400 ring-offset-2 ring-offset-slate-900' : ''} ${heatClass} ${isDarkMode ? 'border-slate-700/50' : 'border-transparent'}`}
>
<span className="text-xs font-semibold mb-1">{day}</span>
<span className="text-lg font-bold">{dayTasksCount}</span>
</div>
)
})}
</div>
</div>

<div className={`flex-1 p-5 rounded-2xl border shadow-sm flex flex-col ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
<div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-200 dark:border-slate-800">
<h3 className={`font-bold text-sm ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>รายละเอียด: วัน{selectedDay}</h3>
<span className={`text-xs px-2 py-1 rounded-full ${isDarkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
{MOCK_MEETING_DATA.filter(d => d.day === selectedDay).length} กิจกรรม
</span>
</div>

<div className="flex-1 overflow-y-auto space-y-3 pr-1">
{MOCK_MEETING_DATA.filter(d => d.day === selectedDay).length === 0 ? (
<div className={`text-center py-8 text-sm ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>ไม่มีกิจกรรมในวันนี้</div>
) : (
MOCK_MEETING_DATA.filter(d => d.day === selectedDay).map(task => {
const style = TYPE_STYLES[task.type][isDarkMode ? 'dark' : 'light'];
return (
<div key={`detail-${task.id}`} className={`p-3 rounded-xl border ${isDarkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
<div className="flex justify-between items-start mb-1.5">
<span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${style}`}>{task.type}</span>
<span className={`text-[10px] flex items-center gap-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}><Clock size={12}/> {task.time}</span>
</div>
<h4 className={`font-bold text-sm mb-1 ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>{task.title}</h4>
<p className={`text-xs mb-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>{task.desc}</p>
<div className={`text-[10px] flex items-center gap-1.5 font-medium ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>
<UsersIcon size={12} /> {task.team}
</div>
</div>
)
})
)}
</div>
</div>
</div>
</div>

<div className={`p-5 rounded-2xl border shadow-sm mt-2 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
<div className="flex items-center gap-2 mb-4">
<Info size={16} className={isDarkMode ? 'text-blue-400' : 'text-blue-600'} />
<h3 className={`font-bold text-sm ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>Dependency Flow (ลำดับการทำงานมาตรฐาน)</h3>
</div>
<div className="flex flex-col sm:flex-row items-center justify-center gap-4 py-4 px-2">
<div className={`flex flex-col items-center p-3 rounded-xl min-w-[140px] text-center border ${isDarkMode ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400' : 'bg-yellow-50 border-yellow-200 text-yellow-700'}`}>
<span className="text-xs font-bold mb-1">1. UAT Phase</span>
<span className="text-[10px] opacity-80">ทดสอบและค้นหาบัค</span>
</div>
<ArrowRight size={20} className={isDarkMode ? 'text-slate-600 rotate-90 sm:rotate-0' : 'text-slate-300 rotate-90 sm:rotate-0'} />

<div className={`flex flex-col items-center p-3 rounded-xl min-w-[140px] text-center border ${isDarkMode ? 'bg-orange-500/10 border-orange-500/30 text-orange-400' : 'bg-orange-50 border-orange-200 text-orange-700'}`}>
<span className="text-xs font-bold mb-1">2. Fix Bug</span>
<span className="text-[10px] opacity-80">แก้ไขปัญหาที่พบ</span>
</div>
<ArrowRight size={20} className={isDarkMode ? 'text-slate-600 rotate-90 sm:rotate-0' : 'text-slate-300 rotate-90 sm:rotate-0'} />

<div className={`flex flex-col items-center p-3 rounded-xl min-w-[140px] text-center border ${isDarkMode ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' : 'bg-blue-50 border-blue-200 text-blue-700'}`}>
<span className="text-xs font-bold mb-1">3. Deploy</span>
<span className="text-[10px] opacity-80">นำขึ้นระบบจริง</span>
</div>
</div>
</div>
</div>
);
};

const UsersIcon = ({size}) => (
<svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
);


export default function App() {
const [activeMenu, setActiveMenu] = useState('overview');

const [rawData, setRawData] = useState([]);
const [headers, setHeaders] = useState([]);
const [defectData, setDefectData] = useState([]);

const [filters, setFilters] = useState({ month: 'All', area: 'All' });
const [defectFilters, setDefectFilters] = useState({ month: 'All', area: 'All' });

const [toastMessage, setToastMessage] = useState('');
const [hoveredPoint, setHoveredPoint] = useState(null);
const [exportMenuOpen, setExportMenuOpen] = useState(false);

const [isDarkMode, setIsDarkMode] = useState(true);
const [user, setUser] = useState(null);
const [isSyncing, setIsSyncing] = useState(true);

useEffect(() => {
if (!auth) {
setIsSyncing(false);
return;
}
const initAuth = async () => {
try {
if (initialAuthToken) {
await signInWithCustomToken(auth, initialAuthToken);
} else {
await signInAnonymously(auth);
}
} catch (error) {
console.warn("Auth Info: Network offline or blocked. Running in local/sheet mode.");
setIsSyncing(false);
}
};
initAuth();
const unsubscribe = onAuthStateChanged(auth, setUser);
return () => unsubscribe();
}, []);

useEffect(() => {
if (!user || !db) return;
const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'boards', 'sharedState');
const unsubscribe = onSnapshot(docRef, (docSnap) => {
if (docSnap.exists()) {
const cloudData = docSnap.data();
if (cloudData.rawData) setRawData(JSON.parse(cloudData.rawData));
if (cloudData.headers) setHeaders(JSON.parse(cloudData.headers));
if (cloudData.defectData) setDefectData(JSON.parse(cloudData.defectData));
}
setIsSyncing(false);
}, (error) => {
console.warn("Firestore sync info: Offline mode active.");
setIsSyncing(false);
});
return () => unsubscribe();
}, [user]);

const saveToCloud = async (newData, newHeaders, newDefectData = defectData) => {
if (!user || !db) return;
try {
const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'boards', 'sharedState');
await setDoc(docRef, {
rawData: JSON.stringify(newData),
headers: JSON.stringify(newHeaders),
defectData: JSON.stringify(newDefectData),
updatedAt: new Date().toISOString()
});
} catch (error) {
console.error("Save to cloud failed", error);
}
};

const showToast = (msg) => {
setToastMessage(msg);
setTimeout(() => setToastMessage(''), 3000);
};

const handleSyncFromGoogleSheet = async () => {
setIsSyncing(true);
try {
const sheetId = '1ZvLfOB9eF-k0vY1GWazJLBTQq-w5DM3enCAORChCNwk';
const timestamp = new Date().getTime();
const mainUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&t=${timestamp}`;
const defectUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=1329297716&t=${timestamp}`;

const [mainResponse, defectResponse] = await Promise.all([
fetch(mainUrl),
fetch(defectUrl)
]);

if (!mainResponse.ok || !defectResponse.ok) throw new Error('Network response was not ok');

const mainText = await mainResponse.text();
const defectText = await defectResponse.text();

const { data: parsedDefectData } = parseCSVStrict(defectText);
const processedDefectData = parsedDefectData.map((item, idx) => {
let boardStatus = 'Todo';
const keys = Object.keys(item);
const colH = keys.length > 7 ? keys[7] : null;

if (item['BoardStatus']) {
boardStatus = item['BoardStatus'];
} else if (colH && item[colH]) {
const val = item[colH].toString().toLowerCase().trim();
if (val.includes('done') || val.includes('pass') || val.includes('เสร็จ') || val.includes('close')) boardStatus = 'Prod';
else if (val.includes('retest')) boardStatus = 'UAT';
else if (val.includes('progress') || val.includes('กำลัง')) boardStatus = 'Task';
else if (val.includes('not start')) boardStatus = 'Todo';
}
return { ...item, BoardStatus: boardStatus, id: `def-${idx}-${Math.random().toString(36).substr(2, 5)}` };
});
setDefectData(processedDefectData);

const { headers: parsedHeaders, data: mainData } = parseCSVStrict(mainText);
const processedData = mainData.map((item, idx) => {
let boardStatus = 'Todo';
if (item['BoardStatus']) {
boardStatus = item['BoardStatus'];
} else {
const techStatus = (item['Status Progress Tech Team'] || '').trim().toLowerCase();
if (techStatus === 'not start') boardStatus = 'Todo';
else if (techStatus === 'in progress') boardStatus = 'Task';
else if (techStatus === 'uat') boardStatus = 'UAT';
else if (techStatus === 'done') boardStatus = 'Prod';
else boardStatus = 'Todo';
}
return { ...item, BoardStatus: boardStatus, id: `main-${idx}-${Math.random().toString(36).substr(2, 5)}` };
});

const newHeaders = parsedHeaders.includes('BoardStatus') ? parsedHeaders : [...parsedHeaders, 'BoardStatus'];

setHeaders(newHeaders);
setRawData(processedData);
saveToCloud(processedData, newHeaders, processedDefectData);

showToast('🔄 ดึงข้อมูลโครงการ และ Defect จาก Sheet ล่าสุดสำเร็จแล้วค่ะ!');
} catch (error) {
console.error("Error fetching Google Sheet:", error);
showToast('❌ ซิงค์ข้อมูลล้มเหลว (ตรวจสอบการแชร์ Sheet เป็นทุกคนที่มีลิงก์)');
} finally {
setIsSyncing(false);
}
};

const handleShareLink = async () => {
const url = window.location.href;
try {
if (navigator.clipboard && window.isSecureContext) {
await navigator.clipboard.writeText(url);
showToast('🔗 คัดลอกลิงก์สำเร็จ! นำไปแชร์ให้ทีมได้เลยค่ะ');
} else {
const textArea = document.createElement("textarea");
textArea.value = url;
document.body.appendChild(textArea);
textArea.select();
document.execCommand('copy');
document.body.removeChild(textArea);
showToast('🔗 คัดลอกลิงก์สำเร็จ! นำไปแชร์ให้ทีมได้เลยค่ะ');
}
} catch (err) {
console.error('Copy failed', err);
showToast('❌ คัดลอกล้มเหลว กรุณาก๊อปปี้จากช่อง URL โดยตรงค่ะ');
}
};

const handleExport = async (format, dataToExport, fileNamePrefix) => {
if (!dataToExport || dataToExport.length === 0) {
showToast('⚠️ ไม่มีข้อมูลสำหรับส่งออก');
return;
}

if (format === 'csv') {
const exportHeaders = Object.keys(dataToExport[0] || {});
const csvContent = [exportHeaders.map(h => `"${h}"`).join(',')];
dataToExport.forEach(row => {
const rowString = exportHeaders.map(h => {
let val = row[h] || '';
val = val.toString().replace(/"/g, '""');
return `"${val}"`;
}).join(',');
csvContent.push(rowString);
});

const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
const blob = new Blob([bom, csvContent.join('\n')], { type: 'text/csv;charset=utf-8;' });
const link = document.createElement("a");
const url = URL.createObjectURL(blob);
link.setAttribute("href", url);
link.setAttribute("download", `${fileNamePrefix}.csv`);
link.style.display = 'none';
document.body.appendChild(link);
link.click();

setTimeout(() => {
document.body.removeChild(link);
window.URL.revokeObjectURL(url);
}, 150);

showToast('✅ ส่งออกไฟล์ .csv สำเร็จ!');
}
else if (format === 'xlsx') {
setIsSyncing(true);
try {
if (typeof window.XLSX === 'undefined') {
await new Promise((resolve, reject) => {
const script = document.createElement('script');
script.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
script.onload = resolve;
script.onerror = reject;
document.head.appendChild(script);
});
}

const worksheet = window.XLSX.utils.json_to_sheet(dataToExport);
const workbook = window.XLSX.utils.book_new();
window.XLSX.utils.book_append_sheet(workbook, worksheet, "Data");

window.XLSX.writeFile(workbook, `${fileNamePrefix}.xlsx`);
showToast('✅ ส่งออกไฟล์ .xlsx สำเร็จ!');
} catch (error) {
console.error('Export XLSX error:', error);
showToast('❌ เกิดข้อผิดพลาดในการสร้างไฟล์ Excel');
} finally {
setIsSyncing(false);
}
}
setExportMenuOpen(false);
};

const overviewMonthColName = rawData.length > 0 && Object.keys(rawData[0]).length > 9
? Object.keys(rawData[0])[9]
: 'Revise Estimate Deliver';

// อ่านชื่อหัวคอลัมน์ N (Index 13) เพื่อนำมาใช้อ้างอิงดึงข้อมูลวันที่
const overviewColN = rawData.length > 0 && Object.keys(rawData[0]).length > 13 ? Object.keys(rawData[0])[13] : null;

// อ่านชื่อหัวคอลัมน์ A (Index 0) สำหรับ Task No.
const mainColA = rawData.length > 0 ? Object.keys(rawData[0])[0] : null;

// ฟังก์ชันจัดฟอร์แมตวันที่ให้เป็น dd/mm/yyyy เสมอ
const formatDateDDMMYYYY = (dateStr) => {
if (!dateStr || String(dateStr).trim() === '' || String(dateStr).trim() === '-') return '';
const str = String(dateStr).trim();

// ตรวจสอบแบบที่มี / หรือ - คั่น
if (str.includes('/') || str.includes('-')) {
const parts = str.split(/[-/]/);
if (parts.length >= 3) {
let d, m, y;
if (parts[0].length === 4) { // กรณีมาแบบ YYYY-MM-DD
y = parts[0]; m = parts[1]; d = parts[2].split(' ')[0];
} else { // กรณีมาแบบ DD/MM/YYYY หรือ MM/DD/YYYY
d = parts[0]; m = parts[1]; y = parts[2].split(' ')[0];
}
if (y.length === 2) y = '20' + y; // ถ้าปีมาแค่ 2 หลักให้เติม 20 ด้านหน้า
return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`;
}
}

// กรณีอื่น ๆ ลองใช้ Date parser มาตรฐาน
const dateObj = new Date(str);
if (!isNaN(dateObj.getTime())) {
const d = String(dateObj.getDate()).padStart(2, '0');
const m = String(dateObj.getMonth() + 1).padStart(2, '0');
const y = dateObj.getFullYear();
return `${d}/${m}/${y}`;
}
return str;
};

const filteredData = useMemo(() => {
return rawData.filter(item => {
const matchMonth = filters.month === 'All' || item[overviewMonthColName] === filters.month;
const matchArea = filters.area === 'All' || item['Area'] === filters.area;
return matchMonth && matchArea;
});
}, [rawData, filters, overviewMonthColName]);

const monthOptions = useMemo(() => ['All', ...new Set(rawData.map(item => item[overviewMonthColName]).filter(v => Boolean(v) && v !== 'All'))], [rawData, overviewMonthColName]);
const areaOptions = useMemo(() => ['All', ...new Set(rawData.map(item => item['Area']).filter(v => Boolean(v) && v !== 'All'))], [rawData]);

const totalTasks = filteredData.length;
const completedTasks = filteredData.filter(item => item.BoardStatus === 'Prod').length;
const uatTasks = filteredData.filter(item => item.BoardStatus === 'UAT').length;
const inProgressTasks = filteredData.filter(item => item.BoardStatus === 'Task').length;
const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

const handleDragStart = (e, id) => e.dataTransfer.setData('taskId', id);
const handleDragOver = (e) => e.preventDefault();
const handleDrop = (e, status) => {
e.preventDefault();
const id = e.dataTransfer.getData('taskId');
const updatedData = rawData.map(item => item.id === id ? { ...item, BoardStatus: status } : item);
setRawData(updatedData);
saveToCloud(updatedData, headers, defectData);
};

const defectMonthColName = defectData.length > 0 && Object.keys(defectData[0]).length > 12
? Object.keys(defectData[0])[12]
: 'Month';
const defectAreaColName = defectData.length > 0 ? (Object.keys(defectData[0]).find(k => k.includes('Area') || k.includes('พื้นที่')) || 'Area') : 'Area';

const filteredDefectData = useMemo(() => {
return defectData.filter(item => {
const matchMonth = defectFilters.month === 'All' || item[defectMonthColName] === defectFilters.month;
const matchArea = defectFilters.area === 'All' || item[defectAreaColName] === defectFilters.area;
return matchMonth && matchArea;
});
}, [defectData, defectFilters, defectMonthColName, defectAreaColName]);

const defectMonthOptions = useMemo(() => ['All', ...new Set(defectData.map(item => item[defectMonthColName]).filter(v => Boolean(v) && v !== 'All'))], [defectData, defectMonthColName]);
const defectAreaOptions = useMemo(() => ['All', ...new Set(defectData.map(item => item[defectAreaColName]).filter(v => Boolean(v) && v !== 'All'))], [defectData, defectAreaColName]);

const defectKeys = defectData.length > 0 ? Object.keys(defectData[0]) : [];
const colA = defectKeys.length > 0 ? defectKeys[0] : null;
const colC = defectKeys.length > 2 ? defectKeys[2] : null;
const colH = defectKeys.length > 7 ? defectKeys[7] : null;

const isDefectDone = (item) => {
if (!colH) return false;
const val = item[colH] ? item[colH].toString().trim() : '';
if (!val || val === '-' || val.toLowerCase() === 'n/a' || val.toLowerCase() === 'pending' || val.toLowerCase() === 'no') return false;

if (colH.toLowerCase().includes('status') || colH.includes('สถานะ')) {
const lowerVal = val.toLowerCase();
return lowerVal.includes('done') || lowerVal.includes('pass') || lowerVal.includes('เสร็จ') || lowerVal.includes('close') || lowerVal.includes('prod');
}
return true;
};

const defectTotalCount = filteredDefectData.filter(item => colA && item[colA] && item[colA].toString().trim() !== '').length;

const defectBkkItems = filteredDefectData.filter(item => colC && item[colC] && item[colC].toString().toLowerCase().includes('bkk'));
const defectBkkCount = defectBkkItems.length;
const defectBkkDone = defectBkkItems.filter(isDefectDone).length;
const defectBkkPending = defectBkkCount - defectBkkDone;

const defectBranchItems = filteredDefectData.filter(item => colC && item[colC] && item[colC].toString().toLowerCase().includes('branch'));
const defectBranchCount = defectBranchItems.length;
const defectBranchDone = defectBranchItems.filter(isDefectDone).length;
const defectBranchPending = defectBranchCount - defectBranchDone;

const defectProductionCount = filteredDefectData.filter(isDefectDone).length;

const defectProgressPercent = defectTotalCount > 0 ? Math.round((defectProductionCount / defectTotalCount) * 100) : 0;

const handleDefectDrop = (e, status) => {
e.preventDefault();
const id = e.dataTransfer.getData('taskId');
const updatedData = defectData.map(item => item.id === id ? { ...item, BoardStatus: status } : item);
setDefectData(updatedData);
saveToCloud(rawData, headers, updatedData);
};

const renderBurndownChart = (dataToRender, mode = 'overview') => {
if (dataToRender.length === 0) return <div className={`flex items-center justify-center h-full ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>ยังไม่มีข้อมูลสำหรับสร้างกราฟ</div>;

const formatToMonthYear = (dateStr) => {
if (!dateStr) return null;
const str = String(dateStr).trim();
if (/^[A-Za-z]{3}-\d{4}$/.test(str)) return str;

let d = new Date(str);
if (isNaN(d.getTime()) && str.includes('/')) {
const parts = str.split('/');
if (parts.length >= 3) {
let day = parseInt(parts[0], 10);
let month = parseInt(parts[1], 10);
let year = parseInt(parts[2], 10);
if (year < 100) year += 2000;
if (month > 12) { const t = day; day = month; month = t; }
d = new Date(year, month - 1, day);
}
} else if (isNaN(d.getTime()) && str.includes('-')) {
const parts = str.split('-');
if (parts.length === 3 && parts[0].length <= 2) {
let day = parseInt(parts[0], 10);
let month = parseInt(parts[1], 10);
let year = parseInt(parts[2], 10);
if (year < 100) year += 2000;
d = new Date(year, month - 1, day);
}
}

if (!isNaN(d.getTime())) {
const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
return `${months[d.getMonth()]}-${d.getFullYear()}`;
}
return str;
};

const getMonthValue = (item) => {
if (mode === 'defect') {
const keys = Object.keys(item);
if (keys.length > 12) {
const colM = keys[12];
return formatToMonthYear(item[colM]);
}
return null;
}

const keys = Object.keys(item);
if (keys.length > 9) {
const colJ = keys[9];
return formatToMonthYear(item[colJ]);
}
return null;
};

const parseMonthYear = (str) => {
if(!str || typeof str !== 'string') return 0;
const parts = str.split('-');
if (parts.length !== 2) return 0;
const [m, y] = parts;
const months = {Jan:0, Feb:1, Mar:2, Apr:3, May:4, Jun:5, Jul:6, Aug:7, Sep:8, Oct:9, Nov:10, Dec:11};
return new Date(y, months[m] || 0).getTime();
};

let validData = dataToRender.map(t => ({ ...t, _chartMonth: getMonthValue(t) })).filter(t => t._chartMonth && t._chartMonth !== 'undefined' && t._chartMonth !== 'null');
const uniqueMonths = [...new Set(validData.map(t => t._chartMonth))];
uniqueMonths.sort((a, b) => parseMonthYear(a) - parseMonthYear(b));

const xLabels = ['Start', ...uniqueMonths];
const total = dataToRender.length;

let idealRemaining = total;
let actualRemaining = total;

const idealData = [total];
const actualData = [total];
const targetCounts = [total];
const doneCounts = [0];
const pendingCounts = [total];

uniqueMonths.forEach(month => {
const tasksInMonth = validData.filter(t => t._chartMonth === month);
const doneInMonth = tasksInMonth.filter(t => t.BoardStatus === 'Prod');

targetCounts.push(tasksInMonth.length);
doneCounts.push(doneInMonth.length);
pendingCounts.push(tasksInMonth.length - doneInMonth.length);

idealRemaining -= tasksInMonth.length;
actualRemaining -= doneInMonth.length;

idealData.push(idealRemaining);
actualData.push(actualRemaining);
});

const w = 600;
const h = 200;
const paddingX = 40;
const paddingY = 20;

const getX = (index) => {
if (xLabels.length === 1) return w / 2;
return paddingX + (index * ((w - paddingX * 2) / (xLabels.length - 1)));
};

const getY = (val) => {
if (total === 0) return h - paddingY;
return paddingY + ((total - val) / total) * (h - paddingY * 2);
};

const idealPath = idealData.map((val, i) => `${getX(i)},${getY(val)}`).join(' ');
const actualPath = actualData.map((val, i) => `${getX(i)},${getY(val)}`).join(' ');

return (
<div className="relative w-full h-full" onMouseLeave={() => setHoveredPoint(null)}>
<svg width="100%" height="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
<line x1={paddingX} y1={paddingY} x2={w - paddingX} y2={paddingY} stroke={isDarkMode ? "#334155" : "#f1f5f9"} strokeWidth="1" />
<line x1={paddingX} y1={h/2} x2={w - paddingX} y2={h/2} stroke={isDarkMode ? "#334155" : "#f1f5f9"} strokeWidth="1" />
<line x1={paddingX} y1={h - paddingY} x2={w - paddingX} y2={h - paddingY} stroke={isDarkMode ? "#475569" : "#e2e8f0"} strokeWidth="2" />

<text x={paddingX - 10} y={getY(total) + 4} fontSize="10" fill={isDarkMode ? "#64748b" : "#94a3b8"} textAnchor="end">{total}</text>
<text x={paddingX - 10} y={getY(total/2) + 4} fontSize="10" fill={isDarkMode ? "#64748b" : "#94a3b8"} textAnchor="end">{Math.round(total/2)}</text>
<text x={paddingX - 10} y={getY(0) + 4} fontSize="10" fill={isDarkMode ? "#64748b" : "#94a3b8"} textAnchor="end">0</text>

<polyline points={idealPath} fill="none" stroke={isDarkMode ? "#64748b" : "#cbd5e1"} strokeWidth="3" strokeDasharray="5,5" />
<polyline points={actualPath} fill="none" stroke={isDarkMode ? "#3b82f6" : "#3b82f6"} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />

{xLabels.map((label, i) => {
const pointTime = label === 'Start' ? 0 : parseMonthYear(label);
const isCurrentOrPast = pointTime <= new Date().getTime();
const isOnTarget = actualData[i] <= idealData[i];

let pointColor = "#3b82f6";
let isBlinking = false;

if (isOnTarget) {
pointColor = "#22c55e";
} else if (isCurrentOrPast) {
pointColor = "#eab308";
isBlinking = true;
}

return (
<g
key={`point-${i}`}
className="cursor-pointer group"
onMouseEnter={() => setHoveredPoint({
label,
target: targetCounts[i],
done: doneCounts[i],
pending: pendingCounts[i],
x: getX(i),
y: Math.min(getY(idealData[i]), getY(actualData[i]))
})}
>
<rect x={getX(i) - 20} y={0} width={40} height={h} fill="transparent" />
<circle cx={getX(i)} cy={getY(idealData[i])} r="4" fill={isDarkMode ? "#64748b" : "#94a3b8"} />

<circle cx={getX(i)} cy={getY(actualData[i])} r="5" fill={pointColor} stroke={isDarkMode ? "#1e293b" : "#fff"} strokeWidth="2" className={isBlinking ? 'animate-pulse' : ''} />

<text x={getX(i)} y={h - 2} fontSize="10" fill={isDarkMode ? "#94a3b8" : "#64748b"} textAnchor="middle" className={`group-hover:font-bold transition-colors ${isBlinking ? 'group-hover:text-yellow-400' : (isOnTarget ? 'group-hover:text-green-400' : 'group-hover:text-blue-400')}`}>{label}</text>
</g>
);
})}
</svg>

{hoveredPoint && (
<div
className={`absolute z-50 px-4 py-3 rounded-xl shadow-2xl text-xs pointer-events-none transform -translate-x-1/2 -translate-y-full border transition-all duration-200 min-w-[160px] ${isDarkMode ? 'bg-slate-800 border-slate-600 text-slate-200' : 'bg-white border-slate-200 text-slate-700'}`}
style={{
left: `${(hoveredPoint.x / w) * 100}%`,
top: `calc(${(hoveredPoint.y / h) * 100}% - 16px)`
}}
>
<div className={`font-bold border-b pb-2 mb-2 text-center text-sm ${isDarkMode ? 'border-slate-600 text-blue-300' : 'border-slate-100 text-blue-700'}`}>
{hoveredPoint.label === 'Start' ? 'ภาพรวมก่อนเริ่มโครงการ' : hoveredPoint.label}
</div>

<div className="space-y-2">
<div className="flex justify-between gap-4 items-center">
<span className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>ที่ต้องส่ง:</span>
<span className={`font-bold px-2 py-0.5 rounded ${isDarkMode ? 'text-amber-400 bg-amber-400/10' : 'text-amber-600 bg-amber-50'}`}>{hoveredPoint.target} ตัว</span>
</div>
<div className="flex justify-between gap-4 items-center">
<span className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>ทำเสร็จไป:</span>
<span className={`font-bold px-2 py-0.5 rounded ${isDarkMode ? 'text-green-400 bg-green-400/10' : 'text-green-600 bg-green-50'}`}>{hoveredPoint.done} ตัว</span>
</div>
<div className="flex justify-between gap-4 items-center">
<span className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>คงค้าง:</span>
<span className={`font-bold px-2 py-0.5 rounded ${isDarkMode ? 'text-rose-400 bg-rose-400/10' : 'text-rose-600 bg-rose-50'}`}>{hoveredPoint.pending} ตัว</span>
</div>
</div>

<div className={`absolute left-1/2 bottom-0 transform -translate-x-1/2 translate-y-full w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[8px] ${isDarkMode ? 'border-t-slate-800' : 'border-t-white'}`}></div>
</div>
)}
</div>
);
};

const columns = ['Todo', 'Task', 'UAT', 'Prod'];

return (
<div className={`flex flex-col sm:flex-row min-h-screen w-full font-sans relative transition-colors duration-300 pb-16 sm:pb-0 ${isDarkMode ? 'bg-slate-950 text-slate-200' : 'bg-slate-50 text-slate-800'}`}>

{isSyncing && (
<div className={`fixed inset-0 backdrop-blur-sm z-50 flex flex-col items-center justify-center ${isDarkMode ? 'bg-slate-950/80' : 'bg-white/80'}`}>
<Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-4" />
<p className={`font-medium text-sm sm:text-base ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>กำลังประมวลผลข้อมูลจากระบบ...</p>
</div>
)}

{toastMessage && (
<div className={`fixed bottom-20 sm:bottom-6 right-4 sm:right-6 px-4 sm:px-6 py-3 sm:py-4 rounded-xl shadow-2xl flex items-center gap-3 z-50 animate-bounce ${isDarkMode ? 'bg-slate-800 text-white border border-slate-700' : 'bg-slate-800 text-white'}`}>
<CheckCircle size={20} className="text-green-400 shrink-0" />
<span className="font-medium text-xs sm:text-sm">{toastMessage}</span>
</div>
)}

<div className={`fixed bottom-0 left-0 right-0 sm:relative sm:w-16 xl:w-64 flex flex-row sm:flex-col items-center xl:items-start py-2 sm:py-4 shadow-[0_-5px_15px_-3px_rgba(0,0,0,0.1)] sm:shadow-xl z-50 shrink-0 transition-all duration-300 sm:sticky sm:top-0 sm:h-screen ${isDarkMode ? 'bg-slate-900 border-t sm:border-t-0 sm:border-r border-slate-800 text-slate-300' : 'bg-slate-900 text-white'}`}>
<div className="hidden sm:flex items-center justify-center xl:justify-start w-full px-4 mb-8 mt-2">
<div className="bg-blue-600 p-2 rounded-lg shrink-0"><LayoutDashboard size={20} className="text-white"/></div>
<span className="ml-3 font-bold text-lg hidden xl:block truncate text-white">DashBoard</span>
</div>

<nav className="w-full flex flex-row sm:flex-col justify-around sm:justify-start gap-1 sm:gap-2 px-2 xl:px-4">
<button
onClick={() => setActiveMenu('overview')}
className={`flex-1 sm:flex-none w-full flex flex-col sm:flex-row items-center justify-center xl:justify-start p-2 sm:p-2.5 xl:p-3 rounded-xl transition-colors border outline-none ${activeMenu === 'overview' ? (isDarkMode ? 'bg-slate-800/80 text-blue-400 border-slate-700' : 'bg-slate-800 text-blue-400 border-slate-700') : (isDarkMode ? 'border-transparent text-slate-400 hover:bg-slate-800/50 hover:text-white' : 'border-transparent text-slate-400 hover:bg-slate-800 hover:text-white')}`}
>
<LayoutDashboard size={20} className="shrink-0" />
<span className="mt-1 sm:mt-0 sm:ml-3 font-medium text-[10px] sm:text-sm sm:hidden xl:block">ภาพรวม</span>
</button>

<button
onClick={() => setActiveMenu('meeting')}
className={`flex-1 sm:flex-none w-full flex flex-col sm:flex-row items-center justify-center xl:justify-start p-2 sm:p-2.5 xl:p-3 rounded-xl transition-colors border outline-none ${activeMenu === 'meeting' ? (isDarkMode ? 'bg-slate-800/80 text-blue-400 border-slate-700' : 'bg-slate-800 text-blue-400 border-slate-700') : (isDarkMode ? 'border-transparent text-slate-400 hover:bg-slate-800/50 hover:text-white' : 'border-transparent text-slate-400 hover:bg-slate-800 hover:text-white')}`}
>
<CalendarDays size={20} className="shrink-0" />
<span className="mt-1 sm:mt-0 sm:ml-3 font-medium text-[10px] sm:text-sm sm:hidden xl:block">Meeting</span>
</button>

<button
onClick={() => setActiveMenu('defect')}
className={`flex-1 sm:flex-none w-full flex flex-col sm:flex-row items-center justify-center xl:justify-start p-2 sm:p-2.5 xl:p-3 rounded-xl transition-colors border outline-none ${activeMenu === 'defect' ? (isDarkMode ? 'bg-slate-800/80 text-red-400 border-slate-700' : 'bg-red-50 text-red-600 border-red-200') : (isDarkMode ? 'border-transparent text-slate-400 hover:bg-slate-800/50 hover:text-white' : 'border-transparent text-slate-400 hover:bg-slate-800 hover:text-white')}`}
>
<Bug size={20} className="shrink-0" />
<span className="mt-1 sm:mt-0 sm:ml-3 font-medium text-[10px] sm:text-sm sm:hidden xl:block">Defect List</span>
</button>

<button className={`flex-1 sm:flex-none w-full flex flex-col sm:flex-row items-center justify-center xl:justify-start p-2 sm:p-2.5 xl:p-3 sm:mt-4 rounded-xl transition-colors border border-transparent outline-none ${isDarkMode ? 'text-slate-400 hover:bg-slate-800/50 hover:text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
<Settings size={20} className="shrink-0" />
<span className="mt-1 sm:mt-0 sm:ml-3 font-medium text-[10px] sm:text-sm sm:hidden xl:block">ตั้งค่า</span>
</button>
</nav>
</div>

<div className="flex-1 flex flex-col min-w-0 w-full overflow-x-hidden">

<header className={`h-14 sm:h-16 border-b flex items-center justify-between px-3 sm:px-4 xl:px-8 shrink-0 z-30 shadow-sm sticky top-0 transition-colors duration-300 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
<div className={`flex items-center rounded-full px-3 sm:px-4 py-1 sm:py-1.5 w-32 sm:w-48 xl:w-64 border focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-200'}`}>
<Search size={14} className={`sm:w-4 sm:h-4 shrink-0 ${isDarkMode ? 'text-slate-400' : 'text-slate-400'}`} />
<input type="text" placeholder="ค้นหา..." className={`bg-transparent border-none focus:outline-none ml-1.5 sm:ml-2 text-xs sm:text-sm w-full ${isDarkMode ? 'text-slate-200 placeholder-slate-500' : 'text-slate-700'}`} />
</div>

<div className="flex items-center gap-2 sm:gap-3 xl:gap-4">
<div className={`items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs font-semibold px-2 sm:px-3 py-1 sm:py-1.5 rounded-full border hidden md:flex ${isDarkMode ? 'text-green-400 bg-green-900/30 border-green-800/50' : 'text-green-600 bg-green-50 border-green-200'}`}>
<span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-green-500 animate-pulse"></span> Sync
</div>

<button
onClick={() => setIsDarkMode(!isDarkMode)}
className={`p-1.5 sm:p-2 rounded-full transition-colors flex items-center justify-center border ${isDarkMode ? 'bg-slate-800 text-amber-400 hover:bg-slate-700 border-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border-slate-200'}`}
title={isDarkMode ? "เปลี่ยนเป็นโหมดสว่าง" : "เปลี่ยนเป็นโหมดมืด"}
>
{isDarkMode ? <Sun size={16} className="sm:w-4 sm:h-4" /> : <Moon size={16} className="sm:w-4 sm:h-4" />}
</button>

<button className={`p-1.5 sm:p-2 relative transition-colors rounded-full ${isDarkMode ? 'text-slate-400 hover:text-blue-400 hover:bg-slate-800' : 'text-slate-400 hover:text-blue-600 hover:bg-blue-50'}`}>
<Bell size={16} className="sm:w-4 sm:h-4" />
<span className={`absolute top-1 right-1 w-1.5 h-1.5 sm:w-2 sm:h-2 bg-red-500 rounded-full border ${isDarkMode ? 'border-slate-900' : 'border-white'}`}></span>
</button>
<div className={`flex items-center gap-2 sm:gap-3 border-l pl-2 sm:pl-3 xl:pl-4 ${isDarkMode ? 'border-slate-700' : 'border-slate-200'}`}>
<div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center shrink-0 border ${isDarkMode ? 'bg-blue-900/40 text-blue-400 border-blue-800/50' : 'bg-blue-100 text-blue-600 border-blue-200'}`}>
<User size={14} className="sm:w-4 sm:h-4" />
</div>
<div className="hidden lg:block">
<p className={`text-xs sm:text-sm font-bold leading-none mb-1 ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>เจ้านาย</p>
<p className="text-[9px] sm:text-[10px] text-slate-500 uppercase tracking-wider leading-none">Project Manager</p>
</div>
</div>
</div>
</header>

<div className="p-3 sm:p-4 xl:p-6 flex flex-col gap-4 xl:gap-6 w-full max-w-full">

{activeMenu === 'overview' ? (
<>
<div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-3 sm:gap-4 shrink-0 w-full">
<div className="w-full xl:w-auto">
<h1 className={`text-lg sm:text-xl xl:text-2xl font-bold leading-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>สรุปความคืบหน้าโครงการ Alpha One 2026</h1>
<p className={`text-[10px] sm:text-xs xl:text-sm mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>ทำงานร่วมกันแบบเรียลไทม์ พร้อมบันทึกคลาวด์อัตโนมัติ</p>
</div>

<div className="flex flex-wrap gap-2 w-full xl:w-auto items-center shrink-0 z-40">
<button
onClick={handleSyncFromGoogleSheet}
className={`shrink-0 flex items-center justify-center gap-1.5 sm:gap-2 px-3 xl:px-4 py-1.5 sm:py-2 rounded-lg text-[11px] sm:text-sm font-bold transition-colors shadow-sm border ${isDarkMode ? 'bg-green-900/40 border-green-800/50 text-green-400 hover:bg-green-900/60' : 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100'}`}
>
<RefreshCw size={14} className={`sm:w-4 sm:h-4 ${isSyncing ? "animate-spin" : ""}`} />
<span>ดึงจาก Sheet</span>
</button>

<button
onClick={handleShareLink}
className={`shrink-0 flex items-center justify-center gap-1.5 sm:gap-2 px-3 xl:px-4 py-1.5 sm:py-2 rounded-lg text-[11px] sm:text-sm font-bold transition-colors shadow-sm border ${isDarkMode ? 'bg-indigo-900/40 border-indigo-800/50 text-indigo-400 hover:bg-indigo-900/60' : 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100'}`}
>
<Share2 size={14} className="sm:w-4 sm:h-4" /> <span>แชร์ลิงก์</span>
</button>

<div className="relative shrink-0">
<button
onClick={() => setExportMenuOpen(prev => !prev)}
className={`flex items-center justify-center gap-1.5 sm:gap-2 px-3 xl:px-4 py-1.5 sm:py-2 rounded-lg text-[11px] sm:text-sm font-medium transition-colors shadow-sm border ${isDarkMode ? 'bg-blue-600 border-blue-500 text-white hover:bg-blue-500' : 'bg-blue-600 border-blue-700 text-white hover:bg-blue-700 shadow-blue-200'}`}
>
<Download size={14} className="sm:w-4 sm:h-4" /> <span>ส่งออก</span>
</button>

{exportMenuOpen && (
<>
<div className="fixed inset-0 z-40" onClick={() => setExportMenuOpen(false)}></div>
<div className={`absolute right-0 top-full mt-2 w-32 rounded-xl shadow-xl border overflow-hidden z-50 py-1 animate-in fade-in slide-in-from-top-2 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
<button
onClick={() => handleExport('xlsx', rawData, 'project_overview')}
className={`w-full text-left px-4 py-2.5 text-[11px] sm:text-sm font-medium transition-colors relative z-50 ${isDarkMode ? 'text-slate-200 hover:bg-slate-700' : 'text-slate-700 hover:bg-slate-100'}`}
>
.xlsx
</button>
<button
onClick={() => handleExport('csv', rawData, 'project_overview')}
className={`w-full text-left px-4 py-2.5 text-[11px] sm:text-sm font-medium transition-colors relative z-50 ${isDarkMode ? 'text-slate-200 hover:bg-slate-700' : 'text-slate-700 hover:bg-slate-100'}`}
>
.csv
</button>
</div>
</>
)}
</div>
</div>
</div>

<div className="grid grid-cols-1 xl:grid-cols-12 gap-4 xl:gap-6 shrink-0 w-full">
<div className="xl:col-span-5 flex flex-col gap-4 xl:gap-6">
<div className="grid grid-cols-2 lg:grid-cols-4 gap-3 xl:gap-4">
<div className={`p-3 xl:p-4 rounded-2xl border shadow-sm flex flex-col justify-center ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
<p className={`text-[10px] xl:text-xs font-medium mb-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>รวมทั้งหมด</p>
<div className="flex items-end gap-1.5">
<h2 className={`text-2xl xl:text-3xl font-bold leading-none ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>{totalTasks}</h2>
<span className={`text-[10px] xl:text-xs mb-0.5 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>รายการ</span>
</div>
</div>

<div className={`p-3 xl:p-4 rounded-2xl border shadow-sm flex flex-col justify-center ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
<p className={`text-[10px] xl:text-xs font-medium mb-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>รอทดสอบ (UAT)</p>
<div className="flex items-end gap-1.5">
<h2 className={`text-2xl xl:text-3xl font-bold leading-none ${isDarkMode ? 'text-purple-400' : 'text-purple-600'}`}>{uatTasks}</h2>
<span className={`text-[10px] xl:text-xs mb-0.5 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>รายการ</span>
</div>
</div>

<div className={`p-3 xl:p-4 rounded-2xl border shadow-sm flex flex-col justify-center ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
<p className={`text-[10px] xl:text-xs font-medium mb-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>กำลังดำเนินการ</p>
<div className="flex items-end gap-1.5">
<h2 className={`text-2xl xl:text-3xl font-bold leading-none ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>{inProgressTasks}</h2>
<span className={`text-[10px] xl:text-xs mb-0.5 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>รายการ</span>
</div>
</div>

<div className={`p-3 xl:p-4 rounded-2xl border shadow-sm flex flex-col justify-center ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
<p className={`text-[10px] xl:text-xs font-medium mb-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Production</p>
<div className="flex items-end gap-1.5">
<h2 className={`text-2xl xl:text-3xl font-bold leading-none ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>{completedTasks}</h2>
<span className={`text-[10px] xl:text-xs mb-0.5 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>รายการ</span>
</div>
</div>
</div>

<div className={`p-4 xl:p-5 rounded-2xl border shadow-sm flex flex-col justify-center ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
<div className="flex justify-between items-end mb-2">
<p className={`text-[11px] sm:text-xs xl:text-sm font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>ความสำเร็จโครงการ (Project Pipeline)</p>
<h2 className={`text-base sm:text-lg xl:text-xl font-bold leading-none ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>{progressPercent}%</h2>
</div>
<div className={`w-full h-2 sm:h-2.5 xl:h-3 rounded-full overflow-hidden ${isDarkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
<div className="h-full bg-blue-500 transition-all duration-500 ease-out" style={{ width: `${progressPercent}%` }}></div>
</div>
</div>

<div className={`p-3 sm:p-4 xl:p-5 rounded-2xl border shadow-sm flex items-center gap-3 sm:gap-4 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
<div className={`p-2 sm:p-2.5 rounded-xl hidden sm:block shrink-0 ${isDarkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
<Filter size={18} className="sm:w-5 sm:h-5" />
</div>
<div className="flex-1 grid grid-cols-2 gap-2 sm:gap-3 xl:gap-4 w-full">
<div className="w-full">
<label className={`block text-[9px] sm:text-[10px] xl:text-xs font-semibold uppercase tracking-wider mb-1 sm:mb-1.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>เดือน (Month)</label>
<select
className={`w-full text-[11px] sm:text-xs xl:text-sm rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none block p-1.5 sm:p-2 transition-all border ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'}`}
value={filters.month}
onChange={(e) => setFilters({...filters, month: e.target.value})}
>
{monthOptions.map((m, idx) => <option key={`ov-mo-${idx}`} value={m}>{m === 'All' ? 'ทั้งหมด (All)' : m}</option>)}
</select>
</div>
<div className="w-full">
<label className={`block text-[9px] sm:text-[10px] xl:text-xs font-semibold uppercase tracking-wider mb-1 sm:mb-1.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>พื้นที่ (HQ/Branch)</label>
<select
className={`w-full text-[11px] sm:text-xs xl:text-sm rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none block p-1.5 sm:p-2 transition-all border ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'}`}
value={filters.area}
onChange={(e) => setFilters({...filters, area: e.target.value})}
>
{areaOptions.map((a, idx) => <option key={`ov-ar-${idx}`} value={a}>{a === 'All' ? 'ทั้งหมด (All)' : a}</option>)}
</select>
</div>
</div>
</div>
</div>

<div className={`xl:col-span-7 p-4 xl:p-5 rounded-2xl border shadow-sm flex flex-col ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
<div className="flex justify-between items-center mb-3 xl:mb-4 shrink-0">
<h3 className={`font-bold text-base xl:text-lg ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>Burndown Chart</h3>
<div className="flex gap-3 xl:gap-4 text-xs xl:text-sm font-medium">
<div className={`flex items-center gap-1.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}><div className={`w-2.5 h-2.5 rounded-full border-2 ${isDarkMode ? 'border-slate-500' : 'border-slate-300'}`}></div> Ideal</div>
<div className={`flex items-center gap-1.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}><div className="w-2.5 h-2.5 rounded-full bg-blue-600"></div> Actual</div>
</div>
</div>
<div className={`flex-1 w-full rounded-xl border p-2 xl:p-4 min-h-[140px] xl:min-h-0 ${isDarkMode ? 'bg-slate-950/50 border-slate-800' : 'bg-slate-50/50 border-slate-100'}`}>
{renderBurndownChart(filteredData, 'overview')}
</div>
</div>
</div>

<div className="flex flex-col mt-2">
<div className="mb-3 xl:mb-4 flex items-center justify-between shrink-0">
<h3 className={`font-bold text-base xl:text-lg ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>Task Board</h3>
<span className={`text-xs xl:text-sm font-medium px-3 py-1 rounded-full ${isDarkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-200/70 text-slate-600'}`}>{filteredData.length} งานในบอร์ด</span>
</div>

<div className="flex gap-4 xl:gap-6 overflow-x-auto xl:grid xl:grid-cols-4 pb-2 items-start">
{columns.map(status => {
const columnTasks = filteredData.filter(t => t.BoardStatus === status);

const headerColors = isDarkMode ? {
'Todo': 'bg-slate-800 text-slate-300',
'Task': 'bg-blue-900/40 text-blue-400',
'UAT': 'bg-purple-900/40 text-purple-400',
'Prod': 'bg-green-900/40 text-green-400'
} : {
'Todo': 'bg-slate-200/80 text-slate-700',
'Task': 'bg-blue-100 text-blue-700',
'UAT': 'bg-purple-100 text-purple-700',
'Prod': 'bg-green-100 text-green-700'
};

return (
<div
key={`ov-col-${status}`}
className={`flex flex-col rounded-2xl p-3 xl:p-4 border shadow-inner min-w-[280px] xl:min-w-0 ${isDarkMode ? 'bg-slate-900/50 border-slate-800' : 'bg-slate-100/70 border-slate-200'}`}
onDragOver={handleDragOver}
onDrop={(e) => handleDrop(e, status)}
>
<div className="flex justify-between items-center mb-3 shrink-0">
<h4 className={`font-bold text-xs xl:text-sm px-3 py-1 rounded-full ${headerColors[status]}`}>
{status === 'Task' ? 'In Progress' : status.toUpperCase()}
</h4>
<span className={`text-xs font-bold px-2 py-0.5 rounded-md shadow-sm border ${isDarkMode ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-white text-slate-600 border-slate-200'}`}>
{columnTasks.length}
</span>
</div>

<div className="flex flex-col space-y-2.5 xl:space-y-3 pb-2">
{columnTasks.map(task => (
<div
key={`ov-task-${task.id}`}
draggable
onDragStart={(e) => handleDragStart(e, task.id)}
className={`p-3 xl:p-4 rounded-xl shadow-sm border cursor-grab active:cursor-grabbing transition-all group relative overflow-hidden ${isDarkMode ? 'bg-slate-800 border-slate-700 hover:border-blue-500' : 'bg-white border-slate-200 hover:border-blue-400 hover:shadow-md'}`}
>
<div className={`absolute left-0 top-0 bottom-0 w-1 ${task['Area']?.includes('BKK') ? 'bg-orange-400' : 'bg-blue-400'}`}></div>

<div className="flex justify-between items-start mb-2 pl-2">
<span className={`text-[9px] xl:text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-400' : 'bg-slate-50 border-slate-100 text-slate-500'}`}>
{mainColA && task[mainColA] ? task[mainColA] : task['No']}
</span>
{task['Area'] && (
<span className={`text-[9px] xl:text-[10px] font-medium px-1.5 py-0.5 rounded-md border ${isDarkMode ? 'bg-blue-900/30 border-blue-800/50 text-blue-400' : 'bg-blue-50 border-blue-100 text-blue-700'}`}>
{task['Area']}
</span>
)}
</div>

<h5 className={`font-semibold text-xs xl:text-sm mb-1 leading-snug transition-colors pl-2 line-clamp-3 ${isDarkMode ? 'text-slate-200 group-hover:text-blue-400' : 'text-slate-800 group-hover:text-blue-600'}`} title={task['Detail']}>
{task['Detail'] || 'ไม่ระบุรายละเอียดงาน'}
</h5>

<div className="flex flex-col gap-1.5 mt-2 pl-2">
<div className="flex items-center gap-1.5 text-[10px] xl:text-[11px] font-medium">
<span className={`px-1.5 py-0.5 rounded border truncate w-full ${isDarkMode ? 'bg-indigo-900/30 border-indigo-800/50 text-indigo-400' : 'bg-indigo-50 border-indigo-100 text-indigo-600'}`} title={task['Task']}>
📁 {task['Task'] || 'ไม่มีหมวดหมู่'}
</span>
</div>

<div className={`flex items-center justify-between gap-1.5 text-[10px] xl:text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
<div className="flex items-center gap-1.5 min-w-0">
<LayoutDashboard size={12} className={isDarkMode ? 'text-slate-500 shrink-0' : 'text-slate-400 shrink-0'} />
<span className="truncate" title={task['Module']}>{task['Module'] || 'ไม่มีโมดูล'}</span>
</div>

{/* ส่วนแสดงวันที่อ่านจาก Column N */}
{overviewColN && task[overviewColN] && task[overviewColN].toString().trim() !== '' && (
<div className="flex items-center gap-1 shrink-0 text-[9px] xl:text-[10px] font-medium opacity-80" title={`วันที่: ${task[overviewColN]}`}>
<CalendarDays size={10} className={isDarkMode ? 'text-blue-400' : 'text-blue-600'} />
<span>{formatDateDDMMYYYY(task[overviewColN])}</span>
</div>
)}
</div>
</div>
</div>
))}

{columnTasks.length === 0 && (
<div className={`h-20 xl:h-24 border-2 border-dashed rounded-xl flex items-center justify-center text-xs xl:text-sm font-medium ${isDarkMode ? 'border-slate-800 bg-slate-900/30 text-slate-600' : 'border-slate-300 bg-slate-50/50 text-slate-400'}`}>
ลากวางที่นี่
</div>
)}
</div>
</div>
);
})}
</div>
</div>
</>
) : activeMenu === 'meeting' ? (
<div className="flex flex-col gap-3 sm:gap-4 w-full">
<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-4 shrink-0">
<div>
<h1 className={`text-lg sm:text-xl xl:text-2xl font-bold leading-tight flex items-center gap-2 sm:gap-3 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
<CalendarDays className={`w-5 h-5 sm:w-6 sm:h-6 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
รอบการประชุมและปฏิบัติการรายสัปดาห์
</h1>
<p className={`text-[10px] sm:text-xs xl:text-sm mt-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>โครงสร้างแผนงานระหว่างทีม Tech, PM, User และ Helpdesk ประจำสัปดาห์</p>
</div>
</div>
<MeetingCycleDashboard isDarkMode={isDarkMode} />
</div>
) : activeMenu === 'defect' ? (
<>
<div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-3 sm:gap-4 shrink-0 w-full">
<div className="w-full xl:w-auto">
<h1 className={`text-lg sm:text-xl xl:text-2xl font-bold leading-tight flex items-center gap-2 sm:gap-3 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
<Bug className={`w-5 h-5 sm:w-6 sm:h-6 ${isDarkMode ? 'text-red-400' : 'text-red-600'}`} />
สรุปความคืบหน้า Defect (Issue Tracking)
</h1>
<p className={`text-[10px] sm:text-xs xl:text-sm mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>ติดตามและจัดการข้อบกพร่องของระบบ (อัปเดตจาก Sheet: Defect All)</p>
</div>

<div className="flex flex-wrap gap-2 w-full xl:w-auto items-center shrink-0 z-40">
<button
onClick={handleSyncFromGoogleSheet}
className={`shrink-0 flex items-center justify-center gap-1.5 sm:gap-2 px-3 xl:px-4 py-1.5 sm:py-2 rounded-lg text-[11px] sm:text-sm font-bold transition-colors shadow-sm border ${isDarkMode ? 'bg-green-900/40 border-green-800/50 text-green-400 hover:bg-green-900/60' : 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100'}`}
>
<RefreshCw size={14} className={`sm:w-4 sm:h-4 ${isSyncing ? "animate-spin" : ""}`} />
<span>ดึงจาก Sheet</span>
</button>

<button
onClick={handleShareLink}
className={`shrink-0 flex items-center justify-center gap-1.5 sm:gap-2 px-3 xl:px-4 py-1.5 sm:py-2 rounded-lg text-[11px] sm:text-sm font-bold transition-colors shadow-sm border ${isDarkMode ? 'bg-indigo-900/40 border-indigo-800/50 text-indigo-400 hover:bg-indigo-900/60' : 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100'}`}
>
<Share2 size={14} className="sm:w-4 sm:h-4" /> <span>แชร์ลิงก์</span>
</button>

<div className="relative shrink-0">
<button
onClick={() => setExportMenuOpen(prev => !prev)}
className={`flex items-center justify-center gap-1.5 sm:gap-2 px-3 xl:px-4 py-1.5 sm:py-2 rounded-lg text-[11px] sm:text-sm font-medium transition-colors shadow-sm border ${isDarkMode ? 'bg-blue-600 border-blue-500 text-white hover:bg-blue-500' : 'bg-blue-600 border-blue-700 text-white hover:bg-blue-700 shadow-blue-200'}`}
>
<Download size={14} className="sm:w-4 sm:h-4" /> <span>ส่งออก</span>
</button>

{exportMenuOpen && (
<>
<div className="fixed inset-0 z-40" onClick={() => setExportMenuOpen(false)}></div>
<div className={`absolute right-0 top-full mt-2 w-32 rounded-xl shadow-xl border overflow-hidden z-50 py-1 animate-in fade-in slide-in-from-top-2 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
<button
onClick={() => handleExport('xlsx', defectData, 'defect_tracking')}
className={`w-full text-left px-4 py-2.5 text-[11px] sm:text-sm font-medium transition-colors relative z-50 ${isDarkMode ? 'text-slate-200 hover:bg-slate-700' : 'text-slate-700 hover:bg-slate-100'}`}
>
.xlsx
</button>
<button
onClick={() => handleExport('csv', defectData, 'defect_tracking')}
className={`w-full text-left px-4 py-2.5 text-[11px] sm:text-sm font-medium transition-colors relative z-50 ${isDarkMode ? 'text-slate-200 hover:bg-slate-700' : 'text-slate-700 hover:bg-slate-100'}`}
>
.csv
</button>
</div>
</>
)}
</div>
</div>
</div>

<div className="grid grid-cols-1 xl:grid-cols-12 gap-4 xl:gap-6 shrink-0 w-full">
<div className="xl:col-span-5 flex flex-col gap-4 xl:gap-6">
<div className="grid grid-cols-2 lg:grid-cols-4 gap-3 xl:gap-4">
<div className={`p-3 xl:p-4 rounded-2xl border shadow-sm flex flex-col ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
<p className={`text-[10px] xl:text-xs font-medium mb-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Defect ทั้งหมด</p>
<div className="flex items-end gap-1.5 mt-auto">
<h2 className={`text-2xl xl:text-3xl font-bold leading-none ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>{defectTotalCount}</h2>
<span className={`text-[10px] xl:text-xs mb-0.5 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>ข้อ</span>
</div>
</div>

<div className={`p-3 xl:p-4 rounded-2xl border shadow-sm flex flex-col ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
<p className={`text-[10px] xl:text-xs font-medium mb-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>BKK</p>
<div className="flex items-end gap-1.5 mb-2">
<h2 className={`text-2xl xl:text-3xl font-bold leading-none ${isDarkMode ? 'text-purple-400' : 'text-purple-600'}`}>{defectBkkCount}</h2>
<span className={`text-[10px] xl:text-xs mb-0.5 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>ข้อ</span>
</div>
<div className="flex flex-wrap gap-2 mt-auto pt-2">
<div className={`flex items-center gap-1.5 px-2 py-1 rounded-md border text-[10px] xl:text-[11px] font-bold shadow-sm ${isDarkMode ? 'bg-green-500/10 border-green-500/40 text-green-400' : 'bg-green-50 border-green-500 text-green-600'}`}>
<svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" /></svg>
เสร็จ: {defectBkkDone}
</div>
<div className={`flex items-center gap-1.5 px-2 py-1 rounded-md border text-[10px] xl:text-[11px] font-bold shadow-sm ${isDarkMode ? 'bg-red-500/10 border-red-500/40 text-red-400' : 'bg-red-50 border-red-500 text-red-600'}`}>
<svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" /></svg>
เหลือ: {defectBkkPending}
</div>
</div>
</div>

<div className={`p-3 xl:p-4 rounded-2xl border shadow-sm flex flex-col ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
<p className={`text-[10px] xl:text-xs font-medium mb-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Branch</p>
<div className="flex items-end gap-1.5 mb-2">
<h2 className={`text-2xl xl:text-3xl font-bold leading-none ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>{defectBranchCount}</h2>
<span className={`text-[10px] xl:text-xs mb-0.5 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>ข้อ</span>
</div>
<div className="flex flex-wrap gap-2 mt-auto pt-2">
<div className={`flex items-center gap-1.5 px-2 py-1 rounded-md border text-[10px] xl:text-[11px] font-bold shadow-sm ${isDarkMode ? 'bg-green-500/10 border-green-500/40 text-green-400' : 'bg-green-50 border-green-500 text-green-600'}`}>
<svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" /></svg>
เสร็จ: {defectBranchDone}
</div>
<div className={`flex items-center gap-1.5 px-2 py-1 rounded-md border text-[10px] xl:text-[11px] font-bold shadow-sm ${isDarkMode ? 'bg-red-500/10 border-red-500/40 text-red-400' : 'bg-red-50 border-red-500 text-red-600'}`}>
<svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" /></svg>
เหลือ: {defectBranchPending}
</div>
</div>
</div>

<div className={`p-3 xl:p-4 rounded-2xl border shadow-sm flex flex-col ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
<p className={`text-[10px] xl:text-xs font-medium mb-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Production</p>
<div className="flex items-end gap-1.5 mt-auto">
<h2 className={`text-2xl xl:text-3xl font-bold leading-none ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>{defectProductionCount}</h2>
<span className={`text-[10px] xl:text-xs mb-0.5 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>ข้อ</span>
</div>
</div>
</div>

<div className={`p-4 xl:p-5 rounded-2xl border shadow-sm flex flex-col justify-center ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
<div className="flex justify-between items-end mb-2">
<p className={`text-[11px] sm:text-xs xl:text-sm font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>ความสำเร็จโครงการ (Project Pipeline)</p>
<h2 className={`text-base sm:text-lg xl:text-xl font-bold leading-none ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>{defectProgressPercent}%</h2>
</div>
<div className={`w-full h-2 sm:h-2.5 xl:h-3 rounded-full overflow-hidden ${isDarkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
<div className="h-full bg-blue-500 transition-all duration-500 ease-out" style={{ width: `${defectProgressPercent}%` }}></div>
</div>
</div>

<div className={`p-3 sm:p-4 xl:p-5 rounded-2xl border shadow-sm flex items-center gap-3 sm:gap-4 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
<div className={`p-2 sm:p-2.5 rounded-xl hidden sm:block shrink-0 ${isDarkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
<Filter size={18} className="sm:w-5 sm:h-5" />
</div>
<div className="flex-1 grid grid-cols-2 gap-2 sm:gap-3 xl:gap-4 w-full">
<div className="w-full">
<label className={`block text-[9px] sm:text-[10px] xl:text-xs font-semibold uppercase tracking-wider mb-1 sm:mb-1.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>เดือน (Month)</label>
<select
className={`w-full text-[11px] sm:text-xs xl:text-sm rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none block p-1.5 sm:p-2 transition-all border ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'}`}
value={defectFilters.month}
onChange={(e) => setDefectFilters({...defectFilters, month: e.target.value})}
>
{defectMonthOptions.map((m, idx) => <option key={`def-mo-${idx}`} value={m}>{m === 'All' ? 'ทั้งหมด (All)' : m}</option>)}
</select>
</div>
<div className="w-full">
<label className={`block text-[9px] sm:text-[10px] xl:text-xs font-semibold uppercase tracking-wider mb-1 sm:mb-1.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>พื้นที่ (HQ/Branch)</label>
<select
className={`w-full text-[11px] sm:text-xs xl:text-sm rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none block p-1.5 sm:p-2 transition-all border ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'}`}
value={defectFilters.area}
onChange={(e) => setDefectFilters({...defectFilters, area: e.target.value})}
>
{defectAreaOptions.map((a, idx) => <option key={`def-ar-${idx}`} value={a}>{a === 'All' ? 'ทั้งหมด (All)' : a}</option>)}
</select>
</div>
</div>
</div>
</div>

<div className={`xl:col-span-7 p-4 xl:p-5 rounded-2xl border shadow-sm flex flex-col ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
<div className="flex justify-between items-center mb-3 xl:mb-4 shrink-0">
<h3 className={`font-bold text-base xl:text-lg ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>Burndown Chart</h3>
<div className="flex gap-3 xl:gap-4 text-xs xl:text-sm font-medium">
<div className={`flex items-center gap-1.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}><div className={`w-2.5 h-2.5 rounded-full border-2 ${isDarkMode ? 'border-slate-500' : 'border-slate-300'}`}></div> Ideal</div>
<div className={`flex items-center gap-1.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}><div className="w-2.5 h-2.5 rounded-full bg-blue-600"></div> Actual</div>
</div>
</div>
<div className={`flex-1 w-full rounded-xl border p-2 xl:p-4 min-h-[140px] xl:min-h-0 ${isDarkMode ? 'bg-slate-950/50 border-slate-800' : 'bg-slate-50/50 border-slate-100'}`}>
{renderBurndownChart(filteredDefectData, 'defect')}
</div>
</div>
</div>

<div className="flex flex-col mt-2">
<div className="mb-3 xl:mb-4 flex items-center justify-between shrink-0">
<h3 className={`font-bold text-base xl:text-lg ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>Task Board (Defects)</h3>
<span className={`text-xs xl:text-sm font-medium px-3 py-1 rounded-full ${isDarkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-200/70 text-slate-600'}`}>{filteredDefectData.length} งานในบอร์ด</span>
</div>

<div className="flex gap-4 xl:gap-6 overflow-x-auto xl:grid xl:grid-cols-4 pb-2 items-start">
{columns.map(status => {
const columnTasks = filteredDefectData.filter(t => t.BoardStatus === status);

const headerColors = isDarkMode ? {
'Todo': 'bg-slate-800 text-slate-300',
'Task': 'bg-blue-900/40 text-blue-400',
'UAT': 'bg-purple-900/40 text-purple-400',
'Prod': 'bg-green-900/40 text-green-400'
} : {
'Todo': 'bg-slate-200/80 text-slate-700',
'Task': 'bg-blue-100 text-blue-700',
'UAT': 'bg-purple-100 text-purple-700',
'Prod': 'bg-green-100 text-green-700'
};

return (
<div
key={`def-col-${status}`}
className={`flex flex-col rounded-2xl p-3 xl:p-4 border shadow-inner min-w-[280px] xl:min-w-0 ${isDarkMode ? 'bg-slate-900/50 border-slate-800' : 'bg-slate-100/70 border-slate-200'}`}
onDragOver={handleDragOver}
onDrop={(e) => handleDefectDrop(e, status)}
>
<div className="flex justify-between items-center mb-3 shrink-0">
<h4 className={`font-bold text-xs xl:text-sm px-3 py-1 rounded-full ${headerColors[status]}`}>
{status === 'Todo' ? 'TODO' : status === 'Task' ? 'IN PROGRESS' : status === 'UAT' ? 'RETEST' : 'DONE'}
</h4>
<span className={`text-xs font-bold px-2 py-0.5 rounded-md shadow-sm border ${isDarkMode ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-white text-slate-600 border-slate-200'}`}>
{columnTasks.length}
</span>
</div>

<div className="flex flex-col space-y-2.5 xl:space-y-3 pb-2">
{columnTasks.map(task => (
<div
key={`def-task-${task.id}`}
draggable
onDragStart={(e) => handleDragStart(e, task.id)}
className={`p-3 xl:p-4 rounded-xl shadow-sm border cursor-grab active:cursor-grabbing transition-all group relative overflow-hidden ${isDarkMode ? 'bg-slate-800 border-slate-700 hover:border-blue-500' : 'bg-white border-slate-200 hover:border-blue-400 hover:shadow-md'}`}
>
<div className={`absolute left-0 top-0 bottom-0 w-1 ${task['Priority']?.toLowerCase().includes('high') ? 'bg-red-500' : (task['Area']?.includes('BKK') ? 'bg-orange-400' : 'bg-blue-400')}`}></div>

<div className="flex justify-between items-start mb-2 pl-2">
<span className={`text-[9px] xl:text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-400' : 'bg-slate-50 border-slate-100 text-slate-500'}`}>
{colA && task[colA] ? task[colA] : (task['No'] || task['Issue ID'] || 'Defect')}
</span>
{task['Area'] && (
<span className={`text-[9px] xl:text-[10px] font-medium px-1.5 py-0.5 rounded-md border ${isDarkMode ? 'bg-blue-900/30 border-blue-800/50 text-blue-400' : 'bg-blue-50 border-blue-100 text-blue-700'}`}>
{task['Area']}
</span>
)}
</div>

<h5 className={`font-semibold text-xs xl:text-sm mb-1 leading-snug transition-colors pl-2 line-clamp-3 ${isDarkMode ? 'text-slate-200 group-hover:text-blue-400' : 'text-slate-800 group-hover:text-blue-600'}`} title={task['Details'] || task['Detail']}>
{task['Details'] || task['Detail'] || 'ไม่ระบุรายละเอียดปัญหา'}
</h5>

<div className="flex flex-col gap-1.5 mt-2 pl-2">
<div className="flex items-center gap-1.5 text-[10px] xl:text-[11px] font-medium">
<span className={`px-1.5 py-0.5 rounded border truncate w-full ${isDarkMode ? 'bg-indigo-900/30 border-indigo-800/50 text-indigo-400' : 'bg-indigo-50 border-indigo-100 text-indigo-600'}`} title={task['System'] || task['Task']}>
📁 {task['System'] || task['Task'] || 'ไม่มีหมวดหมู่/ระบบ'}
</span>
</div>

<div className={`flex items-center gap-1.5 text-[10px] xl:text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
<LayoutDashboard size={12} className={isDarkMode ? 'text-slate-500 shrink-0' : 'text-slate-400 shrink-0'} />
<span className="truncate" title={task['Module']}>{task['Module'] || 'ไม่มีโมดูล'}</span>
</div>
</div>
</div>
))}

{columnTasks.length === 0 && (
<div className={`h-20 xl:h-24 border-2 border-dashed rounded-xl flex items-center justify-center text-xs xl:text-sm font-medium ${isDarkMode ? 'border-slate-800 bg-slate-900/30 text-slate-600' : 'border-slate-300 bg-slate-50/50 text-slate-400'}`}>
ลากวางที่นี่
</div>
)}
</div>
</div>
);
})}
</div>
</div>
</>
) : null}

{/* Footer Copyright */}
<div className={`mt-auto pt-8 pb-2 text-[10px] sm:text-xs font-medium tracking-wide ${isDarkMode ? 'text-slate-600' : 'text-slate-400'}`}>
Copyright &copy; 2026 Process Optimization
</div>

</div>
</div>
</div>
);
}