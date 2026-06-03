import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Upload, Download, LayoutDashboard, Settings, Bell, Search, User, Users, Target, Sparkles, Filter, Share2, CheckCircle, Loader2, RefreshCw, Moon, Sun, CalendarDays, Clock, ArrowRight, Activity, AlertCircle, Info, Bug, LayoutGrid, List, Map } from 'lucide-react';
import StackedProgressBar from './components/StackedProgressBar.jsx';

// --- Firebase Database Setup ---
import { signInWithCustomToken, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { auth, db, appId, initialAuthToken } from './firebase.js';

// --- Helper: CSV Parser ---
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

// Next.js aesthetic color palettes
const TYPE_STYLES = {
 'UAT': { light: 'bg-purple-50 text-purple-900 border border-purple-200', dark: 'bg-purple-500/10 text-purple-300 border border-purple-500/20' },
 'Deploy': { light: 'bg-blue-50 text-blue-900 border border-blue-200', dark: 'bg-blue-500/10 text-blue-300 border border-blue-500/20' },
 'Fix Bug': { light: 'bg-orange-50 text-orange-900 border border-orange-200', dark: 'bg-orange-500/10 text-orange-300 border border-orange-500/20' },
 'Progress Update': { light: 'bg-zinc-100 text-zinc-900 border border-zinc-200', dark: 'bg-zinc-800/50 text-zinc-300 border border-zinc-700/50' },
 'Demo / Troubleshooting': { light: 'bg-teal-50 text-teal-900 border border-teal-200', dark: 'bg-teal-500/10 text-teal-300 border border-teal-500/20' },
};

const TEAM_ICONS = {
 'Tech x Process': '💻',
 'PM x Process': '📊',
 'User x Process x Tech': '🤝',
 'Helpdesk': '🎧'
};

const getStatusStyle = (status, isDark) => {
 if (isDark) {
 if (status === 'Todo') return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
 if (status === 'Task') return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
 if (status === 'UAT') return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
 if (status === 'Prod') return 'bg-green-500/20 text-green-400 border-green-500/30';
 } else {
 if (status === 'Todo') return 'bg-slate-100 text-slate-700 border-slate-200';
 if (status === 'Task') return 'bg-blue-50 text-blue-700 border-blue-200';
 if (status === 'UAT') return 'bg-purple-50 text-purple-700 border-purple-200';
 if (status === 'Prod') return 'bg-green-50 text-green-700 border-green-200';
 }
 return '';
};

// --- Meeting Cycle Dashboard Component ---
const MeetingCycleDashboard = ({ isDarkMode }) => {
 const [selectedDay, setSelectedDay] = useState('จันทร์');

 const getHeatmapColor = (count) => {
 if (count === 0) return isDarkMode ? 'bg-zinc-900 border-zinc-800 text-zinc-500' : 'bg-zinc-50 border-zinc-200 text-zinc-400';
 if (count === 1) return isDarkMode ? 'bg-blue-900/40 border-blue-800/50 text-blue-300' : 'bg-blue-100 border-blue-300 text-blue-700';
 if (count === 2) return isDarkMode ? 'bg-blue-800/60 border-blue-700/50 text-blue-200' : 'bg-blue-300 border-blue-400 text-blue-900';
 return isDarkMode ? 'bg-blue-600 text-white border-blue-500' : 'bg-blue-600 text-white border-blue-700'; 
 };

 return (
 <div className="flex flex-col gap-4 w-full max-w-7xl mx-auto font-sans tracking-tight">
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 shrink-0">
 <div className={`p-5 rounded-xl border flex items-center gap-4 group transition-all ${isDarkMode ? 'border-purple-700/50' : 'border-purple-200'}`} style={{ background: isDarkMode ? 'linear-gradient(to bottom right, rgba(88, 28, 135, 0.4), rgba(49, 46, 129, 0.4))' : 'linear-gradient(to bottom right, #f3e8ff, #e0e7ff)'}}>
 <div className={`p-3 rounded-lg shrink-0 ${isDarkMode ? 'bg-purple-500/20 text-purple-300' : 'bg-white text-purple-600 shadow-sm'}`}>
 <Users size={20} />
 </div>
 <div className="flex-1">
 <div className="flex items-center gap-2 mb-1">
 <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full tracking-wider flex items-center gap-1 ${isDarkMode ? 'bg-purple-500/30 text-purple-200' : 'bg-purple-200 text-purple-800'}`}>
 <Sparkles size={10} /> ทุกสิ้นเดือน
 </span>
 </div>
 <h3 className={`font-semibold text-sm ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>Retrospective (All Teams)</h3>
 <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-purple-200/80' : 'text-slate-600'}`}>สรุปผลและปรับปรุงการทำงานร่วมกัน</p>
 </div>
 </div>

 <div className={`p-5 rounded-xl border flex items-center gap-4 group transition-all ${isDarkMode ? 'border-emerald-700/50' : 'border-emerald-200'}`} style={{ background: isDarkMode ? 'linear-gradient(to bottom right, rgba(6, 78, 59, 0.4), rgba(2, 44, 34, 0.4))' : 'linear-gradient(to bottom right, #d1fae5, #ccfbf1)'}}>
 <div className={`p-3 rounded-lg shrink-0 ${isDarkMode ? 'bg-emerald-500/20 text-emerald-300' : 'bg-white text-emerald-600 shadow-sm'}`}>
 <Target size={20} />
 </div>
 <div className="flex-1">
 <div className="flex items-center gap-2 mb-1">
 <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full tracking-wider flex items-center gap-1 ${isDarkMode ? 'bg-emerald-500/30 text-emerald-200' : 'bg-emerald-200 text-emerald-800'}`}>
 <Sparkles size={10} /> สัปดาห์แรกของเดือน
 </span>
 </div>
 <h3 className={`font-semibold text-sm ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>Steer-Co Meeting</h3>
 <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-emerald-200/80' : 'text-slate-600'}`}>ประชุมอัปเดตทิศทางโครงการ</p>
 </div>
 </div>
 </div>

 <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 items-start">
 <div className={`xl:col-span-2 rounded-xl border flex flex-col overflow-hidden ${isDarkMode ? 'bg-zinc-950 border-zinc-800' : 'bg-white border-zinc-200'}`}>
 <div className={`px-5 py-4 border-b flex justify-between items-center ${isDarkMode ? 'border-zinc-800' : 'border-zinc-200'}`}>
 <h3 className={`font-semibold text-sm flex items-center gap-2 ${isDarkMode ? 'text-zinc-100' : 'text-zinc-900'}`}>
 <CalendarDays size={16}/>
 Weekly Timeline View
 </h3>
 <div className="flex flex-wrap gap-2 text-[10px] font-medium">
 <span className={`px-2 py-1 rounded border-l-2 ${isDarkMode ? 'bg-amber-500/10 border-amber-500 text-amber-400' : 'bg-amber-50 border-amber-400 text-amber-700'}`}>UAT</span>
 <span className={`px-2 py-1 rounded border-l-2 ${isDarkMode ? 'bg-blue-500/10 border-blue-500 text-blue-400' : 'bg-blue-50 border-blue-400 text-blue-700'}`}>Deploy</span>
 <span className={`px-2 py-1 rounded border-l-2 ${isDarkMode ? 'bg-orange-500/10 border-orange-500 text-orange-400' : 'bg-orange-50 border-orange-400 text-orange-700'}`}>Fix Bug</span>
 <span className={`px-2 py-1 rounded border-l-2 ${isDarkMode ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400' : 'bg-emerald-50 border-emerald-400 text-emerald-700'}`}>Update</span>
 <span className={`px-2 py-1 rounded border-l-2 ${isDarkMode ? 'bg-purple-500/10 border-purple-500 text-purple-400' : 'bg-purple-50 border-purple-400 text-purple-700'}`}>Demo</span>
 </div>
 </div>
 
 <div className="overflow-x-auto custom-scrollbar">
 <div className="min-w-[1000px] p-4">
 <div className={`rounded-xl border flex flex-col ${isDarkMode ? 'border-zinc-800 bg-zinc-950' : 'border-zinc-200 bg-white'} divide-y ${isDarkMode ? 'divide-zinc-800' : 'divide-zinc-200'}`}>
 <div className={`grid grid-cols-[180px_repeat(5,1fr)] divide-x ${isDarkMode ? 'divide-zinc-800' : 'divide-zinc-200'}`}>
 <div className={`p-3 font-semibold text-[11px] uppercase tracking-wider flex items-center justify-center ${isDarkMode ? 'bg-zinc-900/50 text-zinc-500' : 'bg-zinc-50 text-zinc-500'}`}>
 Teams
 </div>
 {DAYS.map(day => (
 <div key={day} className={`p-3 text-center font-medium text-sm cursor-pointer transition-colors ${selectedDay === day ? (isDarkMode ? 'bg-zinc-800 text-zinc-100' : 'bg-zinc-100 text-zinc-900') : (isDarkMode ? 'bg-transparent text-zinc-500 hover:bg-zinc-900' : 'bg-transparent text-zinc-500 hover:bg-zinc-50')} `} onClick={() => setSelectedDay(day)}>
 {day}
 </div>
 ))}
 </div>
 
 {TEAMS.map((team) => (
 <div key={team} className={`grid grid-cols-[180px_repeat(5,1fr)] divide-x ${isDarkMode ? 'divide-zinc-800' : 'divide-zinc-200'}`}>
 <div className={`p-4 flex flex-col justify-center items-start bg-transparent`}>
 <div className="text-xl mb-1">{TEAM_ICONS[team]}</div>
 <span className={`font-medium text-[11px] leading-tight ${isDarkMode ? 'text-zinc-400' : 'text-zinc-600'}`}>{team}</span>
 </div>

 {DAYS.map(day => {
 const tasks = MOCK_MEETING_DATA.filter(d => d.team === team && d.day === day);
 return (
 <div key={`${team}-${day}`} className={`p-2.5 flex flex-col gap-2 min-h-[110px] transition-colors ${selectedDay === day ? (isDarkMode ? 'bg-zinc-900/30' : 'bg-zinc-50/50') : 'bg-transparent'}`}>
 {tasks.map(task => {
 const style = TYPE_STYLES[task.type][isDarkMode ? 'dark' : 'light'];
 return (
 <div key={task.id} className={`p-2.5 rounded-lg flex flex-col gap-1.5 transition-shadow cursor-default ${style}`}>
 <span className="font-semibold text-[10px] sm:text-[11px] leading-tight">{task.title}</span>
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

 <div className="flex flex-col gap-4">
 <div className={`p-5 rounded-xl border ${isDarkMode ? 'bg-zinc-950 border-zinc-800' : 'bg-white border-zinc-200'}`}>
 <h3 className={`font-semibold text-sm mb-3 ${isDarkMode ? 'text-zinc-100' : 'text-zinc-900'}`}>Workload Heatmap</h3>
 <div className="flex gap-2">
 {DAYS.map(day => {
 const dayTasksCount = MOCK_MEETING_DATA.filter(d => d.day === day).length;
 const heatClass = getHeatmapColor(dayTasksCount);
 return (
 <div 
 key={`heatmap-${day}`} 
 onClick={() => setSelectedDay(day)}
 className={`flex-1 flex flex-col items-center justify-center py-3 rounded-lg cursor-pointer transition-all border ${heatClass}`}
 >
 <span className="text-xs font-medium mb-1">{day}</span>
 <span className="text-lg font-semibold">{dayTasksCount}</span>
 </div>
 )
 })}
 </div>
 </div>

 <div className={`flex-1 p-5 rounded-xl border flex flex-col ${isDarkMode ? 'bg-zinc-950 border-zinc-800' : 'bg-white border-zinc-200'}`}>
 <div className="flex justify-between items-center mb-4 pb-3 border-b border-zinc-200 dark:border-zinc-800">
 <h3 className={`font-semibold text-sm ${isDarkMode ? 'text-zinc-100' : 'text-zinc-900'}`}>รายละเอียด: วัน{selectedDay}</h3>
 <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${isDarkMode ? 'bg-zinc-800 text-zinc-300' : 'bg-zinc-100 text-zinc-600'}`}>
 {MOCK_MEETING_DATA.filter(d => d.day === selectedDay).length} Tasks
 </span>
 </div>
 
 <div className="flex-1 overflow-y-auto space-y-3 pr-1">
 {MOCK_MEETING_DATA.filter(d => d.day === selectedDay).length === 0 ? (
 <div className={`text-center py-8 text-sm ${isDarkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>No tasks for today</div>
 ) : (
 MOCK_MEETING_DATA.filter(d => d.day === selectedDay).map(task => {
 const style = TYPE_STYLES[task.type][isDarkMode ? 'dark' : 'light'];
 return (
 <div key={`detail-${task.id}`} className={`p-3 rounded-xl border ${isDarkMode ? 'bg-zinc-900/50 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}>
 <div className="flex justify-between items-start mb-1.5">
 <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded ${style}`}>{task.type}</span>
 <span className={`text-[10px] flex items-center gap-1 ${isDarkMode ? 'text-zinc-500' : 'text-zinc-500'}`}><Clock size={12}/> {task.time}</span>
 </div>
 <h4 className={`font-semibold text-sm mb-1 ${isDarkMode ? 'text-zinc-100' : 'text-zinc-900'}`}>{task.title}</h4>
 <p className={`text-xs mb-2 ${isDarkMode ? 'text-zinc-400' : 'text-zinc-600'}`}>{task.desc}</p>
 <div className={`text-[10px] flex items-center gap-1.5 font-medium ${isDarkMode ? 'text-zinc-500' : 'text-zinc-500'}`}>
 <Users size={12} /> {task.team}
 </div>
 </div>
 )
 })
 )}
 </div>
 </div>
 </div>
 </div>
 </div>
 );
};

// --- Roadmap Dashboard Component ---
const RoadmapDashboard = ({ isDarkMode, data, searchQuery = '', showBenefitOnly = false }) => {
 const [selectedTask, setSelectedTask] = useState(null);
 const [statusFilter, setStatusFilter] = useState(null);
 const statusLabels = { prod: 'Done', task: 'In Progress', uat: 'UAT', todo: 'Not Start' };
 const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
 const quarters = [
 { name: 'Q1', span: 3 },
 { name: 'Q2', span: 3 },
 { name: 'Q3', span: 3 },
 { name: 'Q4', span: 3 },
 ];

 const formatDateDisplay = (dateStr) => {
	 if (!dateStr || String(dateStr).trim() === '' || String(dateStr).trim() === '-') return '';
	 const s = String(dateStr).trim();
	 const d = new Date(s);
	 if (!isNaN(d.getTime())) {
		 const dd = String(d.getDate()).padStart(2, '0');
		 const mm = String(d.getMonth() + 1).padStart(2, '0');
		 const yyyy = d.getFullYear();
		 return `${dd}/${mm}/${yyyy}`;
	 }
	 // fallback: return original string
	 return s;
 };

 // ฟังก์ชันตัวช่วยสำหรับกำหนดสีของการ์ดแต่ละใบตามสถานะ
 const getTaskTheme = (status, isDark) => {
 if (isDark) {
 if (status === 'prod') return { bg: 'rgba(6, 78, 59, 0.4)', border: 'rgba(16, 185, 129, 0.4)', text: '#6ee7b7' }; // Green (Done)
 if (status === 'uat') return { bg: 'rgba(88, 28, 135, 0.4)', border: 'rgba(147, 51, 234, 0.4)', text: '#d8b4fe' }; // Purple (UAT)
 if (status === 'task') return { bg: 'rgba(30, 58, 138, 0.4)', border: 'rgba(59, 130, 246, 0.4)', text: '#93c5fd' }; // Blue (In Progress)
 return { bg: 'rgba(63, 63, 70, 0.3)', border: 'rgba(113, 113, 122, 0.3)', text: '#d4d4d8' }; // Gray (Not Start)
 } else {
 if (status === 'prod') return { bg: '#ecfdf5', border: '#6ee7b7', text: '#065f46' }; // Green (Done)
 if (status === 'uat') return { bg: '#faf5ff', border: '#d8b4fe', text: '#581c87' }; // Purple (UAT)
 if (status === 'task') return { bg: '#eff6ff', border: '#93c5fd', text: '#1e3a8a' }; // Blue (In Progress)
 return { bg: '#f4f4f5', border: '#d4d4d8', text: '#3f3f46' }; // Gray (Not Start)
 }
 };

 // ปรับ Mock Data ให้สเกลตรงกับ 24 คอลัมน์ (1 เดือน = 2 Sprints)
 const defaultCategories = [
 {
 id: 'foundation',
 title: 'Foundation Systems',
 tasks: [
 { no: '1', name: 'รายละเอียดงานเพิ่มเติม on alphaone', month: 'ม.ค.', benefit: 'เพิ่มความชัดเจน', status: 'prod', start: 1, end: 2 }, 
 { no: '6', name: 'Call Gateway', month: 'มิ.ย.', benefit: 'รองรับลูกค้าเพิ่ม', status: 'task', start: 11, end: 12 },
 { no: '2', name: 'การแก้ไขข้อมูลลูกค้า by MSG', month: 'ม.ค.', benefit: 'อัปเดตข้อมูลลูกค้า', status: 'prod', start: 1, end: 2 }, 
 { no: '7', name: 'Blog บทความข่าวสาร', month: 'ต.ค.', benefit: 'เพิ่มยอดเข้าชม', status: 'todo', start: 19, end: 20 },
 { no: '3', name: 'Messenger Chat', month: 'พ.ค.', benefit: 'ลดเวลาตอบกลับ', status: 'uat', start: 9, end: 10 },
 { no: '4', name: 'Login / session timeout', month: 'พ.ค.', benefit: 'เพิ่มความปลอดภัย', status: 'task', start: 9, end: 10 },
 { no: '5', name: 'User management', month: 'พ.ค.', benefit: 'จัดการผู้ใช้งานอย่างมีประสิทธิภาพ', status: 'todo', start: 9, end: 10 }
 ]
 },
 {
 id: 'document',
 title: 'Document Delivery',
 tasks: [
 { no: '8', name: 'ระบบจัดการเอกสารนำกลับ', month: 'ก.พ.', benefit: 'ลดกระดาษ 20%', status: 'prod', start: 3, end: 4 }, 
 { no: '13', name: 'มีระบบการออกใบสั่งงานนิติบุคคล', month: 'มิ.ย.', benefit: 'ออกใบสั่งงานอัตโนมัติ', status: 'task', start: 11, end: 12 },
 { no: '9', name: 'ฟังก์ชั่นจ่ายงาน & จ่ายงานล่วงหน้า', month: 'ก.พ.', benefit: 'ลดเวลาการจ่ายงาน', status: 'uat', start: 3, end: 4 },
 { no: '10', name: 'จัดการงานเลื่อน', month: 'ก.พ.', benefit: 'ลดงานค้าง 15%', status: 'prod', start: 3, end: 4 },
 { no: '11', name: 'หน้าตรวจงานสิ้นวัน (1.2,1.4)', month: 'มี.ค.', benefit: 'ตรวจสอบงานสิ้นวัน', status: 'todo', start: 5, end: 6 },
 { no: '12', name: 'Ai Smart Tools Photo-Inspection', month: 'ก.พ.', benefit: 'เพิ่มความแม่นยำ AI', status: 'task', start: 3, end: 4 }
 ]
 },
 {
 id: 'eod',
 title: 'End of Day',
 tasks: [
 { no: '14', name: 'NPS (13)', month: 'ก.พ.', benefit: 'วัดผลความพึงพอใจ', status: 'prod', start: 3, end: 4 }, 
 { no: '16', name: 'Payment Gateway', month: 'มิ.ย.', benefit: 'จ่ายเงินง่ายขึ้น', status: 'uat', start: 11, end: 12 },
 { no: '15', name: 'Report', month: 'มิ.ย.', benefit: 'รายงานผลการทำงาน', status: 'todo', start: 11, end: 12 }
 ]
 }
 ];

 const categoriesToRender = useMemo(() => {
 const THEMES = [
 { light: { bg: '#faf5ff', border: '#e9d5ff', text: '#7e22ce', grad: 'linear-gradient(to bottom right, #f3e8ff, #e0e7ff)' },
 dark: { bg: 'rgba(88, 28, 135, 0.2)', border: 'rgba(147, 51, 234, 0.3)', text: '#d8b4fe', grad: 'linear-gradient(to bottom right, rgba(88, 28, 135, 0.4), rgba(49, 46, 129, 0.4))' } },
 { light: { bg: '#ecfdf5', border: '#a7f3d0', text: '#047857', grad: 'linear-gradient(to bottom right, #d1fae5, #ccfbf1)' },
 dark: { bg: 'rgba(6, 78, 59, 0.2)', border: 'rgba(16, 185, 129, 0.3)', text: '#6ee7b7', grad: 'linear-gradient(to bottom right, rgba(6, 78, 59, 0.4), rgba(2, 44, 34, 0.4))' } },
 { light: { bg: '#eff6ff', border: '#bfdbfe', text: '#1d4ed8', grad: 'linear-gradient(to bottom right, #e0f2fe, #dbeafe)' },
 dark: { bg: 'rgba(30, 58, 138, 0.2)', border: 'rgba(59, 130, 246, 0.3)', text: '#93c5fd', grad: 'linear-gradient(to bottom right, rgba(30, 58, 138, 0.4), rgba(23, 37, 84, 0.4))' } },
 { light: { bg: '#fff7ed', border: '#fed7aa', text: '#9a3412', grad: 'linear-gradient(to bottom right, #ffedd5, #ffedd5)' },
 dark: { bg: 'rgba(124, 45, 18, 0.2)', border: 'rgba(249, 115, 22, 0.3)', text: '#fdba74', grad: 'linear-gradient(to bottom right, rgba(124, 45, 18, 0.4), rgba(67, 20, 7, 0.4))' } }
 ];

 if (!data || data.length === 0) {
 return defaultCategories.map((cat, index) => {
 const filteredTasks = cat.tasks.filter(t => !searchQuery || t.name.toLowerCase().includes(searchQuery.toLowerCase()) || String(t.no).includes(searchQuery));
 return {
 ...cat,
 tasks: filteredTasks,
 theme: THEMES[index % THEMES.length]
 };
 });
 }

 const groups = {};
 const allKeys = data.length > 0 ? Object.keys(data[0]) : [];
 
 const colA_key = allKeys.length > 0 ? allKeys[0] : null;  // A: Task Number
 const colF_key = allKeys.length > 5 ? allKeys[5] : null;  // F: Thumb name
 const colJ_key = allKeys.length > 9 ? allKeys[9] : null;  // J: Month
 const colL_key = allKeys.length > 11 ? allKeys[11] : null; // L: Status
 const colN_key = allKeys.length > 13 ? allKeys[13] : null; // N: UAT Date
 const colO_key = allKeys.length > 14 ? allKeys[14] : null; // O: Prod Date
 const colV_key = allKeys.length > 21 ? allKeys[21] : null; // V: Benefit
 const colW_key = allKeys.length > 22 ? allKeys[22] : null; // W: Category
 const colX_key = allKeys.length > 23 ? allKeys[23] : null; // X: Sprint

 data.forEach(item => {
 const taskNo = colA_key && item[colA_key] ? String(item[colA_key]).trim() : '';
 const taskName = colF_key && item[colF_key] ? String(item[colF_key]).trim() : '';
 const monthVal = colJ_key && item[colJ_key] ? String(item[colJ_key]).trim() : '';
 const catName = colW_key && item[colW_key] && String(item[colW_key]).trim() !== '' ? String(item[colW_key]).trim() : 'General Tasks';
 const benefitVal = colV_key && item[colV_key] ? String(item[colV_key]).trim() : '-';
 const sprintVal = colX_key && item[colX_key] ? String(item[colX_key]).toLowerCase().trim() : '';
 
 const statusRaw = colL_key && item[colL_key] ? String(item[colL_key]).toLowerCase().trim() : '';
 let parsedStatus = 'todo'; // Not Start
 if (statusRaw.includes('done') || statusRaw.includes('เสร็จ') || statusRaw.includes('pass') || statusRaw.includes('close') || statusRaw.includes('prod')) parsedStatus = 'prod';
 else if (statusRaw.includes('uat') || statusRaw.includes('retest')) parsedStatus = 'uat';
 else if (statusRaw.includes('progress') || statusRaw.includes('กำลัง')) parsedStatus = 'task';
 
 const matchSearch = !searchQuery || 
 taskName.toLowerCase().includes(searchQuery.toLowerCase()) || 
 taskNo.toLowerCase().includes(searchQuery.toLowerCase());

 if (!taskName || taskName === '-' || !monthVal || monthVal === '-' || !matchSearch) return;

 let monthIndex = -1;
 const val = monthVal.toLowerCase();

 const mthsEn = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
 const mthsThShort = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
 const mthsThFull = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
 
 for (let i = 0; i < 12; i++) {
 if (val.includes(mthsEn[i]) || val.includes(mthsThShort[i]) || val.includes(mthsThFull[i])) {
 monthIndex = i;
 break;
 }
 }

 if (monthIndex === -1 && /^(1[0-2]|[1-9])$/.test(val)) {
 monthIndex = parseInt(val, 10) - 1;
 }

 if (monthIndex === -1) {
 let d = new Date(monthVal);
 if (isNaN(d.getTime()) && monthVal.includes('/')) {
 const parts = monthVal.split('/');
 if (parts.length >= 2) {
 let m = parseInt(parts[1], 10);
 if (parts[0].length === 4) m = parseInt(parts[1], 10); 
 else if (parts.length === 2) m = parseInt(parts[0], 10);
 else m = parseInt(parts[1], 10); 
 if (m >= 1 && m <= 12) monthIndex = m - 1;
 }
 } else if (!isNaN(d.getTime())) {
 monthIndex = d.getMonth();
 } else if (monthVal.includes('-')) {
 const parts = monthVal.split('-');
 if (parts.length >= 2) {
 let m = parseInt(parts[1], 10);
 if (m >= 1 && m <= 12) monthIndex = m - 1;
 }
 }
 }

 if (monthIndex !== -1) {
 // คำนวณ Sprint: ตรวจสอบว่าเป็น Sprint ที่ 1 หรือ 2 จาก Column X
 let sprintOffset = 0; // Default: First Sprint
 if (sprintVal.includes('2') || sprintVal.includes('second') || sprintVal.includes('ปลาย') || sprintVal.includes('หลัง')) {
 sprintOffset = 1;
 }

 const startCol = (monthIndex * 2) + sprintOffset + 1;
 
 if (!groups[catName]) groups[catName] = [];
 groups[catName].push({ 
 no: taskNo, 
 name: taskName, 
 month: monthVal, 
 benefit: benefitVal, 
 status: parsedStatus, 
 start: startCol, 
 end: startCol + 1,
 uat: colN_key && item[colN_key] ? String(item[colN_key]).trim() : '',
 prod: colO_key && item[colO_key] ? String(item[colO_key]).trim() : ''
 });
 }
 });

 if (Object.keys(groups).length === 0) {
 return defaultCategories.map((cat, index) => {
 const filteredTasks = cat.tasks.filter(t => !searchQuery || t.name.toLowerCase().includes(searchQuery.toLowerCase()) || String(t.no).includes(searchQuery));
 return {
 ...cat,
 tasks: filteredTasks,
 theme: THEMES[index % THEMES.length]
 };
 });
 }
 
 const mappedCategories = Object.keys(groups).map((catName) => {
 let tasks = groups[catName];

 // จัดเรียงข้อมูล: 1. เลขที่ข้อ (น้อยไปมาก) 2. เวลา/เดือน (น้อยไปมาก)
 tasks.sort((a, b) => {
 const noA = String(a.no || '').trim();
 const noB = String(b.no || '').trim();
 
 // ถ้าไม่มีเลขข้อ ให้ไปอยู่ด้านล่างสุด
 if (!noA && noB) return 1;
 if (noA && !noB) return -1;
 
 // Natural Sort (1, 2, 10...)
 const noCmp = noA.localeCompare(noB, undefined, { numeric: true, sensitivity: 'base' });
 if (noCmp !== 0) return noCmp;
 
 // ถ้าเลขซ้ำกัน ให้เรียงตาม Sprint/เดือน
 return a.start - b.start;
 });

 return {
 title: catName,
 tasks: tasks 
 };
 });

 // จัดเรียงลำดับหมวดหมู่ให้อยู่ตำแหน่งคงที่ (Foundation -> Document -> End of Day)
 const predefinedOrder = ['Foundation Systems', 'Document Delivery', 'End of Day'];
 mappedCategories.sort((a, b) => {
 let indexA = predefinedOrder.findIndex(cat => a.title.toLowerCase().includes(cat.toLowerCase()));
 let indexB = predefinedOrder.findIndex(cat => b.title.toLowerCase().includes(cat.toLowerCase()));
 
 if (indexA === -1) indexA = 999;
 if (indexB === -1) indexB = 999;
 
 if (indexA !== indexB) return indexA - indexB;
 return a.title.localeCompare(b.title);
 });

 return mappedCategories.map((cat, index) => ({
 ...cat,
 id: `cat-dyn-${index}`,
 theme: THEMES[index % THEMES.length]
 }));
 }, [data, searchQuery]);

 // คำนวณสถิติจำนวนงานแยกตามสี (สถานะ) เพื่อนำไปแสดงในแถบ Legend
 const displayedCategories = useMemo(() => {
 let filtered = categoriesToRender;
 if (showBenefitOnly) {
 filtered = filtered
 .map(cat => ({ ...cat, tasks: cat.tasks.filter(task => task.benefit && task.benefit !== '-') }))
 .filter(cat => cat.tasks.length > 0);
 }
 if (!statusFilter) return filtered;
 return filtered
 .map(cat => ({ ...cat, tasks: cat.tasks.filter(task => task.status === statusFilter) }))
 .filter(cat => cat.tasks.length > 0);
 }, [categoriesToRender, showBenefitOnly, statusFilter]);

 const stats = useMemo(() => {
 const counts = { prod: 0, task: 0, uat: 0, todo: 0 };
 displayedCategories.forEach(cat => {
 if(cat.tasks) {
 cat.tasks.forEach(task => {
 counts[task.status] = (counts[task.status] || 0) + 1;
 });
 }
 });
 return counts;
 }, [displayedCategories]);

 return (
 <div className="flex flex-col gap-3">
 {/* ข้อมูลสรุปสีต่างๆ (Legend & Stats) */}
 <div className="flex flex-wrap gap-2 md:gap-3 items-center">
 {['prod', 'task', 'uat', 'todo'].map((statusKey, index) => {
 const colors = {
 prod: isDarkMode ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-emerald-50 border-emerald-200 text-emerald-700',
 task: isDarkMode ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' : 'bg-blue-50 border-blue-200 text-blue-700',
 uat: isDarkMode ? 'bg-purple-500/10 border-purple-500/20 text-purple-400' : 'bg-purple-50 border-purple-200 text-purple-700',
 todo: isDarkMode ? 'bg-zinc-500/10 border-zinc-500/20 text-zinc-400' : 'bg-zinc-50 border-zinc-200 text-zinc-700'
 };
 const active = statusFilter === statusKey;
 return (
 <button
 key={statusKey}
 type="button"
 onClick={() => setStatusFilter(prev => prev === statusKey ? null : statusKey)}
 className={`flex items-center gap-1.5 md:gap-2 px-2.5 py-1.5 rounded-lg border shadow-sm transition ${colors[statusKey]} ${active ? 'ring-2 ring-offset-1 ring-blue-400' : ''}`}
 >
 <div className={`w-2.5 h-2.5 rounded-full ${statusKey === 'prod' ? 'bg-emerald-500' : statusKey === 'task' ? 'bg-blue-500' : statusKey === 'uat' ? 'bg-purple-500' : 'bg-zinc-400 md:bg-zinc-500'}`}></div>
 <span className="text-[10px] md:text-xs font-semibold">{statusLabels[statusKey]}: {stats[statusKey]}</span>
 </button>
 );
 })}
 <div className="ml-auto flex items-center gap-2">
 {statusFilter && (
 <span className={`text-[10px] font-medium px-2 py-1 rounded-full border ${isDarkMode ? 'bg-zinc-900 border-zinc-800 text-zinc-400' : 'bg-zinc-100 border-zinc-200 text-zinc-600'}`}>
 Filter: {statusLabels[statusFilter]}
 </span>
 )}
 <span className={`text-[10px] font-medium px-2 py-1 rounded-full border ${isDarkMode ? 'bg-zinc-900 border-zinc-800 text-zinc-400' : 'bg-zinc-100 border-zinc-200 text-zinc-600'}`}>
 Total: {stats.prod + stats.task + stats.uat + stats.todo} Tasks
 </span>
 </div>
 </div>

 {/* Grid Roadmap Dashboard */}
 <div className={`w-full overflow-x-auto rounded-xl border shadow-sm custom-scrollbar ${isDarkMode ? 'border-zinc-800 bg-zinc-950' : 'border-zinc-200 bg-white'}`}>
 <div className="min-w-[4800px] flex flex-col"> 
 {/* Header */}
 <div className="flex">
 <div className={`w-14 shrink-0 border-r border-b ${isDarkMode ? 'border-zinc-800' : 'border-zinc-200'}`}></div>
 <div className="flex-1">
 {/* Quarters Header */}
 <div className="grid grid-cols-4">
 {quarters.map((q, i) => (
 <div key={i} className={`text-center py-2 text-xs font-bold border-r border-b last:border-r-0 ${isDarkMode ? 'border-zinc-800 bg-zinc-900 text-zinc-300' : 'border-zinc-200 bg-zinc-50 text-zinc-700'}`}>
 {q.name}
 </div>
 ))}
 </div>
 {/* Months Header */}
 <div className="grid grid-cols-12">
 {months.map((m, i) => (
 <div key={i} className={`text-center py-1.5 text-[10px] font-bold border-r border-b last:border-r-0 ${isDarkMode ? 'border-zinc-800 bg-zinc-900/50 text-zinc-400' : 'border-zinc-200 bg-white text-zinc-600'}`}>
 {m}
 </div>
 ))}
 </div>
 </div>
 </div>

 {/* Body */}
 <div className="flex flex-col relative">
 {/* Background Grid Lines (24 Sprints) */}
 <div className="absolute top-0 bottom-0 left-14 right-0 grid pointer-events-none" style={{ gridTemplateColumns: 'repeat(24, minmax(0, 1fr))' }}>
 {Array.from({ length: 24 }).map((_, i) => (
 <div key={`line-${i}`} className={`border-r ${isDarkMode ? 'border-zinc-800/50' : 'border-zinc-200'} h-full border-dashed`}></div>
 ))}
 </div>

 {displayedCategories.map((cat, idx) => (
 <div key={cat.id} className={`flex border-b last:border-b-0 ${isDarkMode ? 'border-zinc-800' : 'border-zinc-200'}`}>
 {/* Category Sidebar */}
 <div 
 className={`w-14 shrink-0 flex items-center justify-center border-r ${isDarkMode ? 'border-zinc-800/50' : 'border-zinc-200/50'}`} 
 style={{ background: isDarkMode ? cat.theme.dark.grad : cat.theme.light.grad }}
 >
 <span 
 className={`text-[10px] font-bold whitespace-nowrap tracking-widest py-2 ${isDarkMode ? 'text-white' : 'text-zinc-800'}`}
 style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
 >
 {cat.title}
 </span>
 </div>
 
 {/* Category Rows */}
 <div className="flex-1 relative z-10 px-0">
 <div className="grid h-full" style={{ gridTemplateColumns: 'repeat(24, minmax(0, 1fr))' }}>
 {Array.from({ length: 24 }).map((_, colIdx) => {
 const sprintTasks = cat.tasks.filter(t => t.start === colIdx + 1);
 return (
 <div key={colIdx} className="flex flex-col gap-1 p-1 h-full min-h-[40px]">
 {sprintTasks.map((task, tIdx) => {
 const tTheme = getTaskTheme(task.status, isDarkMode);
 return (
 <div
 key={tIdx}
 onClick={() => setSelectedTask({ ...task, category: cat.title, tTheme: tTheme })}
 className="flex flex-col p-2 rounded-lg border cursor-pointer transition-all duration-300 group hover:z-30 hover:-translate-y-0.5 hover:shadow-md backdrop-blur-sm"
 style={{ 
 background: tTheme.bg,
 borderColor: tTheme.border,
 }}
 >
 <div className="flex items-start gap-1.5 mb-1">
 {task.no && (
 <span 
 className="font-bold text-[9px] px-1 py-0.5 rounded-sm shrink-0 shadow-sm" 
 style={{ backgroundColor: isDarkMode ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.7)', color: tTheme.text }}
 >
 {task.no}
 </span>
 )}
 <span 
 className="font-bold text-[10px] sm:text-xs leading-snug line-clamp-2 transition-colors" 
 title={task.name}
 style={{ color: tTheme.text }}
 >
 {task.name}
 </span>
 </div>
 
 {(task.month || (task.benefit && task.benefit !== '-')) && (
 <div 
 className="flex flex-col gap-1 mt-auto pt-1.5 border-t"
 style={{ borderColor: tTheme.border }}
 >
 {task.month && (
 <div className={`flex items-center gap-1 text-[9px] sm:text-[10px] font-semibold opacity-90`} style={{ color: tTheme.text }}>
 <CalendarDays size={10} />
 <span>{task.month}</span>
 </div>
 )}
 {task.benefit && task.benefit !== '-' && (
 <div className={`flex items-center gap-1 text-[9px] sm:text-[10px] font-semibold opacity-90`} style={{ color: tTheme.text }}>
 <Target size={10} className="shrink-0" />
 <span className="line-clamp-1" title={task.benefit}>{task.benefit}</span>
 </div>
 )}
 </div>
 )}
 </div>
 );
 })}
 </div>
 );
 })}
 </div>
 </div>
 </div>
 ))}
 </div>
 </div>

 {/* Popup Modal */}
 {selectedTask && (
 <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200" onClick={() => setSelectedTask(null)}>
 <div
 className="relative w-full max-w-md p-6 rounded-2xl shadow-2xl transform transition-all animate-in zoom-in-95 duration-200 border"
 style={{
 background: isDarkMode ? '#18181b' : '#ffffff',
 borderColor: selectedTask.tTheme.border,
 }}
 onClick={e => e.stopPropagation()}
 >
 <button
 onClick={() => setSelectedTask(null)}
 className={`absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full transition-colors font-bold ${isDarkMode ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-500'}`}
 >
 ✕
 </button>
 
 <div className="mb-4 pr-6 flex gap-2 flex-wrap items-center">
 <span 
 className="text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider border"
 style={{
 background: selectedTask.tTheme.bg,
 borderColor: selectedTask.tTheme.border,
 color: selectedTask.tTheme.text,
 }}
 >
 {selectedTask.status === 'prod' ? 'DONE' : selectedTask.status === 'uat' ? 'UAT' : selectedTask.status === 'task' ? 'IN PROGRESS' : 'NOT START'}
 </span>
 <span 
 className={`text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider border ${isDarkMode ? 'bg-zinc-800 border-zinc-700 text-zinc-300' : 'bg-zinc-100 border-zinc-200 text-zinc-600'}`}
 >
 {selectedTask.category}
 </span>
 {selectedTask.no && (
 <span className={`text-[10px] font-bold px-2 py-1 rounded-full text-zinc-500 bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-400 border border-transparent`}>
 {selectedTask.no}
 </span>
 )}
 </div>
 
 <h3 className={`text-xl font-bold mb-6 leading-snug ${isDarkMode ? 'text-white' : 'text-zinc-900'}`}>{selectedTask.name}</h3>
 
 <div className="flex flex-col gap-3">
 <div className={`flex items-center gap-4 p-4 rounded-xl border ${isDarkMode ? 'bg-zinc-900/80 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}>
 <div className={`p-2.5 rounded-lg`} style={{ background: selectedTask.tTheme.bg, color: selectedTask.tTheme.text }}>
 <CalendarDays size={20} />
 </div>
 <div>
 <p className={`text-[10px] uppercase font-bold tracking-wider mb-0.5 ${isDarkMode ? 'text-zinc-500' : 'text-zinc-500'}`}>เดือนที่ส่งมอบ</p>
 <p className={`font-semibold text-sm ${isDarkMode ? 'text-zinc-200' : 'text-zinc-900'}`}>{selectedTask.month}</p>
 </div>
 </div>
 
 <div className={`flex items-center gap-4 p-4 rounded-xl border ${isDarkMode ? 'bg-zinc-900/80 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}>
 <div className={`p-2.5 rounded-lg`} style={{ background: selectedTask.tTheme.bg, color: selectedTask.tTheme.text }}>
 <Target size={20} />
 </div>
 <div>
 <p className={`text-[10px] uppercase font-bold tracking-wider mb-0.5 ${isDarkMode ? 'text-zinc-500' : 'text-zinc-500'}`}>Benefit ที่คาดว่าจะได้รับ</p>
 <p className={`font-semibold text-sm ${isDarkMode ? 'text-zinc-200' : 'text-zinc-900'}`}>{selectedTask.benefit && selectedTask.benefit !== '-' ? selectedTask.benefit : 'ไม่ได้ระบุ'}</p>
 </div>
 </div>

 <div className={`flex items-stretch gap-4 mt-2`}> 
 <div className={`flex-1 flex items-center gap-4 p-4 rounded-xl border ${isDarkMode ? 'bg-zinc-900/80 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}>
 <div className={`p-2.5 rounded-lg`} style={{ background: selectedTask.tTheme.bg, color: selectedTask.tTheme.text }}>
 <CalendarDays size={20} />
 </div>
 <div>
 <p className={`text-[10px] uppercase font-bold tracking-wider mb-0.5 ${isDarkMode ? 'text-zinc-500' : 'text-zinc-500'}`}>UAT Date</p>
 <p className={`font-semibold text-sm ${isDarkMode ? 'text-zinc-200' : 'text-zinc-900'}`}>{formatDateDisplay(selectedTask.uat) || 'ไม่ได้ระบุ'}</p>
 </div>
 </div>

 <div className={`flex-1 flex items-center gap-4 p-4 rounded-xl border ${isDarkMode ? 'bg-zinc-900/80 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}>
 <div className={`p-2.5 rounded-lg`} style={{ background: selectedTask.tTheme.bg, color: selectedTask.tTheme.text }}>
 <CalendarDays size={20} />
 </div>
 <div>
 <p className={`text-[10px] uppercase font-bold tracking-wider mb-0.5 ${isDarkMode ? 'text-zinc-500' : 'text-zinc-500'}`}>Prod Date</p>
 <p className={`font-semibold text-sm ${isDarkMode ? 'text-zinc-200' : 'text-zinc-900'}`}>{formatDateDisplay(selectedTask.prod) || 'ไม่ได้ระบุ'}</p>
 </div>
 </div>
 </div>
 </div>

 <div className="mt-8 pt-4 border-t border-zinc-200 dark:border-zinc-800 flex justify-end">
 <button 
 onClick={() => setSelectedTask(null)}
 className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${isDarkMode ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300' : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700'}`}
 >
 ปิดหน้าต่าง
 </button>
 </div>
 </div>
 </div>
 )}
 </div>
 </div>
 );
};

// Reusable UI-only multiselect dropdown (no external deps)
const MultiSelectDropdown = ({ options = [], value = [], onChange = () => {}, placeholder = 'Select', isDarkMode = false }) => {
	const [open, setOpen] = useState(false);
	const ref = useRef(null);

	useEffect(() => {
		const onDoc = (e) => {
			if (!ref.current) return;
			if (!ref.current.contains(e.target)) setOpen(false);
		};
		document.addEventListener('click', onDoc);
		return () => document.removeEventListener('click', onDoc);
	}, []);

	const toggleOption = (opt) => {
		let next = Array.isArray(value) ? [...value] : [];
		if (opt === 'All') {
			next = ['All'];
			onChange(next);
			return;
		}
		const hasAll = next.includes('All');
		if (hasAll) next = [];
		const idx = next.indexOf(opt);
		if (idx === -1) next.push(opt); else next.splice(idx, 1);
		if (next.length === 0) next = ['All'];
		onChange(next);
	};

	const isSelected = (opt) => Array.isArray(value) && value.includes(opt);

	return (
		<div className="relative" ref={ref}>
			<button type="button" onClick={() => setOpen(prev => !prev)} className={`w-full text-left px-3 py-1.5 rounded-md border flex items-center justify-between gap-2 ${isDarkMode ? 'bg-zinc-900 border-zinc-800 text-zinc-300' : 'bg-white border-zinc-200 text-zinc-700'}`}>
				<div className="flex-1 truncate text-sm">
					{Array.isArray(value) && value.length > 0 ? (value.includes('All') ? 'All' : value.join(', ')) : placeholder}
				</div>
				<div className="text-xs text-zinc-400">▾</div>
			</button>

			{open && (
				<div className={`absolute mt-2 right-0 left-0 z-50 rounded-md shadow-xl border overflow-auto max-h-56 ${isDarkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'}`}>
					<div className="p-2">
						{options.map((opt, i) => (
							<label key={`opt-${i}`} className="flex items-center gap-2 p-2 rounded hover:bg-zinc-50 cursor-pointer" style={{display: 'flex'}}>
								<input type="checkbox" checked={isSelected(opt)} onChange={() => toggleOption(opt)} />
								<span className={`text-sm ${isDarkMode ? 'text-zinc-200' : 'text-zinc-800'}`}>{opt === 'All' ? (opt) : opt}</span>
							</label>
						))}
					</div>
				</div>
			)}
		</div>
	);
};

export default function App() {
 const [activeMenu, setActiveMenu] = useState('overview'); 
 const [searchQuery, setSearchQuery] = useState(''); // เพิ่มสเตทควบคุมช่องค้นหา
 
 const [rawData, setRawData] = useState([]);
 const [headers, setHeaders] = useState([]);
 const [defectData, setDefectData] = useState([]); 
 
 const [filters, setFilters] = useState({ month: ['All'], area: ['All'] });
 const [defectFilters, setDefectFilters] = useState({ month: ['All'], area: ['All'] });
 
 const [toastMessage, setToastMessage] = useState('');
 const [exportMenuOpen, setExportMenuOpen] = useState(false); 
 
 const [overviewBoardView, setOverviewBoardView] = useState('kanban');
 const [defectBoardView, setDefectBoardView] = useState('kanban');
 const [showChartLabels, setShowChartLabels] = useState(true);
 const [hoveredPoint, setHoveredPoint] = useState(null);

 // สเตทสำหรับ Roadmap Sync
 const [roadmapData, setRoadmapData] = useState([]);
 const [isSyncingRoadmap, setIsSyncingRoadmap] = useState(false);
 const [roadmapViewMode, setRoadmapViewMode] = useState('synced'); // เปลี่ยนค่าเริ่มต้นเป็นโหมด 'synced'
 const [roadmapShowBenefitOnly, setRoadmapShowBenefitOnly] = useState(false);

 const [isDarkMode, setIsDarkMode] = useState(false);
 const [user, setUser] = useState(null);
 const [isSyncing, setIsSyncing] = useState(true);

 // ฟังก์ชันแยกสำหรับโหลดข้อมูล Roadmap
 const fetchRoadmapFromSheet = async (showToastMsg = false) => {
 setIsSyncingRoadmap(true);
 try {
 const sheetId = '1ZvLfOB9eF-k0vY1GWazJLBTQq-w5DM3enCAORChCNwk';
 const timestamp = new Date().getTime();
 const url = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&t=${timestamp}`;
 
 const response = await fetch(url);
 if (!response.ok) throw new Error('Network response was not ok');
 
 const text = await response.text();
 const { data } = parseCSVStrict(text);
 
 setRoadmapData(data);
 if (showToastMsg) showToast('🔄 ซิงค์ข้อมูล Roadmap สำเร็จ!');
 } catch (error) {
 console.error("Error fetching Roadmap from Google Sheet:", error);
 if (showToastMsg) showToast('❌ ซิงค์ข้อมูล Roadmap ล้มเหลว');
 } finally {
 setIsSyncingRoadmap(false);
 }
 };

 // ดึงข้อมูล Roadmap อัตโนมัติ 1 รอบตอนโหลดแอปครั้งแรก
 useEffect(() => {
 fetchRoadmapFromSheet(false);
 }, []);
 
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

 showToast('🔄 Sync Complete!');
 } catch (error) {
 console.error("Error fetching Google Sheet:", error);
 showToast('❌ Sync Failed.');
 } finally {
 setIsSyncing(false);
 }
 };

 const handleShareLink = async () => {
 const url = window.location.href;
 try {
 if (navigator.clipboard && window.isSecureContext) {
 await navigator.clipboard.writeText(url);
 showToast('🔗 Link Copied!');
 } else {
 const textArea = document.createElement("textarea");
 textArea.value = url;
 document.body.appendChild(textArea);
 textArea.select();
 document.execCommand('copy');
 document.body.removeChild(textArea);
 showToast('🔗 Link Copied!');
 }
 } catch (err) {
 console.error('Copy failed', err);
 showToast('❌ Copy Failed');
 }
 };

 const handleExport = async (format, dataToExport, fileNamePrefix) => {
 if (!dataToExport || dataToExport.length === 0) {
 showToast('⚠️ No Data to Export');
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
 
 showToast('✅ CSV Exported!');
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
 showToast('✅ XLSX Exported!');
 } catch (error) {
 console.error('Export XLSX error:', error);
 showToast('❌ Export Failed');
 } finally {
 setIsSyncing(false);
 }
 }
 setExportMenuOpen(false); 
 };

 const formatDateDDMMYYYY = (dateStr) => {
 if (!dateStr || String(dateStr).trim() === '' || String(dateStr).trim() === '-') return '';
 const str = String(dateStr).trim();
 if (str.includes('/') || str.includes('-')) {
 const parts = str.split(/[-/]/);
 if (parts.length >= 3) {
 let d, m, y;
 if (parts[0].length === 4) { 
 y = parts[0]; m = parts[1]; d = parts[2].split(' ')[0]; 
 } else { 
 d = parts[0]; m = parts[1]; y = parts[2].split(' ')[0];
 }
 if (y.length === 2) y = '20' + y; 
 return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`;
 }
 }
 const dateObj = new Date(str);
 if (!isNaN(dateObj.getTime())) {
 const d = String(dateObj.getDate()).padStart(2, '0');
 const m = String(dateObj.getMonth() + 1).padStart(2, '0');
 const y = dateObj.getFullYear();
 return `${d}/${m}/${y}`;
 }
 return str; 
 };

 // --- Overview Computed Data ---
 const overviewMonthColName = rawData.length > 0 && Object.keys(rawData[0]).length > 9 
 ? Object.keys(rawData[0])[9] 
 : 'Revise Estimate Deliver';

 const overviewColN = rawData.length > 0 && Object.keys(rawData[0]).length > 13 ? Object.keys(rawData[0])[13] : null;
 const overviewColO = rawData.length > 0 && Object.keys(rawData[0]).length > 14 ? Object.keys(rawData[0])[14] : null;

 const overviewKeys = rawData.length > 0 ? Object.keys(rawData[0]) : [];
 const overviewColA = overviewKeys.length > 0 ? overviewKeys[0] : null;

 const filteredData = useMemo(() => {
 return rawData.filter(item => {
 const itemMonth = String(item[overviewMonthColName] || '').trim();
 const itemArea = String(item['Area'] || '').trim();
 const selectedMonths = Array.isArray(filters.month) ? filters.month : [filters.month];
 const selectedAreas = Array.isArray(filters.area) ? filters.area : [filters.area];
 const matchMonth = selectedMonths.includes('All') || (itemMonth !== '' && selectedMonths.includes(itemMonth));
 const matchArea = selectedAreas.includes('All') || (itemArea !== '' && selectedAreas.includes(itemArea));
 const matchSearch = !searchQuery || Object.values(item).some(val => val && String(val).toLowerCase().includes(searchQuery.toLowerCase()));
 return matchMonth && matchArea && matchSearch;
 });
 }, [rawData, filters, overviewMonthColName, searchQuery]);

 const monthOptions = useMemo(() => ['All', ...new Set(rawData.map(item => item[overviewMonthColName]).filter(v => Boolean(v) && v !== 'All'))], [rawData, overviewMonthColName]);
 const areaOptions = useMemo(() => ['All', ...new Set(rawData.map(item => item['Area']).filter(v => Boolean(v) && v !== 'All'))], [rawData]);

 const totalTasks = filteredData.length;
 const completedTasks = filteredData.filter(item => item.BoardStatus === 'Prod').length;
 const uatTasks = filteredData.filter(item => item.BoardStatus === 'UAT').length;
 const inProgressTasks = filteredData.filter(item => item.BoardStatus === 'Task').length; 
const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

const overviewTodo = Math.max(0, totalTasks - (completedTasks + uatTasks + inProgressTasks));
const overviewSegments = [
	{ label: 'Done', value: completedTasks, color: 'bg-green-500' },
	{ label: 'UAT', value: uatTasks, color: 'bg-purple-500' },
	{ label: 'In Progress', value: inProgressTasks, color: 'bg-blue-500' },
	{ label: 'Todo', value: overviewTodo, color: 'bg-slate-400' },
];

 const handleDragStart = (e, id) => e.dataTransfer.setData('taskId', id);
 const handleDragOver = (e) => e.preventDefault();
 const handleDrop = (e, status) => {
 e.preventDefault();
 const id = e.dataTransfer.getData('taskId');
 const updatedData = rawData.map(item => item.id === id ? { ...item, BoardStatus: status } : item);
 setRawData(updatedData);
 saveToCloud(updatedData, headers, defectData);
 };

 // --- Defect Computed Data ---
 const defectMonthColName = defectData.length > 0 && Object.keys(defectData[0]).length > 12 
 ? Object.keys(defectData[0])[12] 
 : 'Month';
 const defectAreaColName = defectData.length > 0 ? (Object.keys(defectData[0]).find(k => k.includes('Area') || k.includes('พื้นที่')) || 'Area') : 'Area';
 
 const filteredDefectData = useMemo(() => {
 return defectData.filter(item => {
 const itemMonth = String(item[defectMonthColName] || '').trim();
 const itemArea = String(item[defectAreaColName] || '').trim();
 const selectedMonths = Array.isArray(defectFilters.month) ? defectFilters.month : [defectFilters.month];
 const selectedAreas = Array.isArray(defectFilters.area) ? defectFilters.area : [defectFilters.area];
 const matchMonth = selectedMonths.includes('All') || (itemMonth !== '' && selectedMonths.includes(itemMonth));
 const matchArea = selectedAreas.includes('All') || (itemArea !== '' && selectedAreas.includes(itemArea));
 const matchSearch = !searchQuery || Object.values(item).some(val => val && String(val).toLowerCase().includes(searchQuery.toLowerCase()));
 return matchMonth && matchArea && matchSearch;
 });
 }, [defectData, defectFilters, defectMonthColName, defectAreaColName, searchQuery]);

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

const defectTodoCount = filteredDefectData.filter(item => item.BoardStatus === 'Todo').length;
const defectInProgressCount = filteredDefectData.filter(item => item.BoardStatus === 'Task').length;
const defectUatCount = filteredDefectData.filter(item => item.BoardStatus === 'UAT').length;
const defectDoneCount = defectProductionCount || filteredDefectData.filter(isDefectDone).length;
const defectSegments = [
	{ label: 'Done', value: defectDoneCount, color: 'bg-green-500' },
	{ label: 'UAT', value: defectUatCount, color: 'bg-purple-500' },
	{ label: 'In Progress', value: defectInProgressCount, color: 'bg-blue-500' },
	{ label: 'Todo', value: defectTodoCount, color: 'bg-slate-400' },
];

 const handleDefectDrop = (e, status) => {
 e.preventDefault();
 const id = e.dataTransfer.getData('taskId');
 const updatedData = defectData.map(item => item.id === id ? { ...item, BoardStatus: status } : item);
 setDefectData(updatedData);
 saveToCloud(rawData, headers, updatedData);
 };

 // --- SVG Chart Render Function (Restored) ---
 const renderChartSVG = (dataToRender, mode = 'overview', chartType = 'burndown', showLabels = true) => {
 if (dataToRender.length === 0) return <div className={`flex items-center justify-center h-full text-sm ${isDarkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>ไม่มีข้อมูลสำหรับสร้างกราฟ</div>;

 const parseMonthYear = (str) => {
 if(!str || typeof str !== 'string') return 0;
 const parts = str.split('-');
 if (parts.length !== 2) return 0;
 const [m, y] = parts;
 const months = {Jan:0, Feb:1, Mar:2, Apr:3, May:4, Jun:5, Jul:6, Aug:7, Sep:8, Oct:9, Nov:10, Dec:11};
 return new Date(y, months[m] || 0).getTime();
 };

 const getMonthValue = (item) => {
 const col = mode === 'defect' ? defectMonthColName : overviewMonthColName;
 if (!item[col]) return null;
 
 const str = String(item[col]).trim();
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
 
 let validData = dataToRender.map(t => ({ ...t, _chartMonth: getMonthValue(t) })).filter(t => t._chartMonth && t._chartMonth !== 'undefined' && t._chartMonth !== 'null');
 const uniqueMonths = [...new Set(validData.map(t => t._chartMonth))];
 uniqueMonths.sort((a, b) => parseMonthYear(a) - parseMonthYear(b));

 const xLabels = ['Start', ...uniqueMonths];
 const total = dataToRender.length;

 let idealRemaining = total;
 let actualRemaining = total;
 let idealAccumulated = 0;
 let actualAccumulated = 0;

 const idealData = chartType === 'burndown' ? [total] : [0];
 const actualData = chartType === 'burndown' ? [total] : [0];
 const targetCounts = [total]; 
 const doneCounts = [0]; 
 const pendingCounts = [total]; 

 uniqueMonths.forEach(month => {
 const tasksInMonth = validData.filter(t => t._chartMonth === month);
 const doneInMonth = tasksInMonth.filter(t => t.BoardStatus === 'Prod');

 idealRemaining -= tasksInMonth.length;
 actualRemaining -= doneInMonth.length;
 idealAccumulated += tasksInMonth.length;
 actualAccumulated += doneInMonth.length;

 targetCounts.push(tasksInMonth.length);
 doneCounts.push(doneInMonth.length);
 pendingCounts.push(tasksInMonth.length - doneInMonth.length);

 if (chartType === 'burndown') {
 idealData.push(idealRemaining);
 actualData.push(actualRemaining);
 } else {
 idealData.push(idealAccumulated);
 actualData.push(actualAccumulated);
 }
 });

 const w = 600;
 const h = 200;
 const paddingX = 40;
 const paddingY = 20;

 const getX = (index) => {
 if (xLabels.length === 1) return w / 2;
 return paddingX + (index * ((w - paddingX * 2) / (xLabels.length - 1)));
 };

 const maxY = chartType === 'burndown' ? total : (total > 0 ? total + Math.ceil(total*0.1) : 10);

 const getY = (val) => {
 if (maxY === 0) return h - paddingY;
 return paddingY + ((maxY - val) / maxY) * (h - paddingY * 2);
 };

 const idealPath = idealData.map((val, i) => `${getX(i)},${getY(val)}`).join(' ');
 const actualPath = actualData.map((val, i) => `${getX(i)},${getY(val)}`).join(' ');

 return (
 <div className="relative w-full h-full min-h-[220px]" onMouseLeave={() => setHoveredPoint(null)}>
 <svg width="100%" height="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
 <line x1={paddingX} y1={paddingY} x2={w - paddingX} y2={paddingY} stroke={isDarkMode ? "#27272a" : "#f4f4f5"} strokeWidth="1" />
 <line x1={paddingX} y1={h/2} x2={w - paddingX} y2={h/2} stroke={isDarkMode ? "#27272a" : "#f4f4f5"} strokeWidth="1" />
 <line x1={paddingX} y1={h - paddingY} x2={w - paddingX} y2={h - paddingY} stroke={isDarkMode ? "#3f3f46" : "#e4e4e7"} strokeWidth="1" />

 <text x={paddingX - 10} y={getY(maxY) + 4} fontSize="10" fill={isDarkMode ? "#71717a" : "#a1a1aa"} textAnchor="end">{maxY}</text>
 <text x={paddingX - 10} y={getY(maxY/2) + 4} fontSize="10" fill={isDarkMode ? "#71717a" : "#a1a1aa"} textAnchor="end">{Math.round(maxY/2)}</text>
 <text x={paddingX - 10} y={getY(0) + 4} fontSize="10" fill={isDarkMode ? "#71717a" : "#a1a1aa"} textAnchor="end">0</text>

 <polyline points={idealPath} fill="none" stroke={isDarkMode ? "#71717a" : "#a1a1aa"} strokeWidth="2" strokeDasharray="5,5" />
 
 {idealData.map((val, i) => (
 <circle key={`ideal-pt-${i}`} cx={getX(i)} cy={getY(val)} r="3" fill={isDarkMode ? "#71717a" : "#a1a1aa"} />
 ))}

 {/* Render Ideal Numbers if toggled */}
 {showLabels && idealData.map((val, i) => (
 <text key={`ideal-lbl-${i}`} x={getX(i)} y={getY(val) - 10} fontSize="10" fill={isDarkMode ? "#a1a1aa" : "#71717a"} textAnchor="middle" fontWeight="500">
 {val}
 </text>
 ))}

 <polyline points={actualPath} fill="none" stroke={chartType === 'burndown' ? "#3b82f6" : "#10b981"} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

 {/* Render Actual Numbers if toggled */}
 {showLabels && actualData.map((val, i) => (
 <text key={`actual-lbl-${i}`} x={getX(i)} y={getY(val) + 16} fontSize="11" fill={chartType === 'burndown' ? "#60a5fa" : "#34d399"} textAnchor="middle" fontWeight="bold">
 {val}
 </text>
 ))}

 {xLabels.map((label, i) => {
 const pointTime = label === 'Start' ? 0 : parseMonthYear(label);
 const isCurrentOrPast = pointTime <= new Date().getTime();
 const isOnTarget = chartType === 'burndown' ? (actualData[i] <= idealData[i]) : (actualData[i] >= idealData[i]);

 let pointColor = chartType === 'burndown' ? "#3b82f6" : "#10b981";
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
 y: Math.min(getY(idealData[i]), getY(actualData[i])),
 chartType,
 mode
 })}
 >
 <rect x={getX(i) - 20} y={0} width={40} height={h} fill="transparent" />
 <circle cx={getX(i)} cy={getY(actualData[i])} r="4" fill={pointColor} stroke={isDarkMode ? "#09090b" : "#fff"} strokeWidth="2" className={isBlinking ? 'animate-pulse' : ''} />
 <text x={getX(i)} y={h - 2} fontSize="9" fill={isDarkMode ? "#71717a" : "#a1a1aa"} textAnchor="middle" className={`group-hover:font-bold transition-colors ${isBlinking ? 'group-hover:text-yellow-400' : (isOnTarget ? 'group-hover:text-green-400' : 'group-hover:text-blue-400')}`}>
 {label.length > 8 ? label.substring(0, 8) : label}
 </text>
 </g>
 );
 })}
 </svg>

 {hoveredPoint && hoveredPoint.chartType === chartType && hoveredPoint.mode === mode && (
 <div
 className={`absolute z-50 px-4 py-3 rounded-lg shadow-xl text-xs pointer-events-none transform -translate-x-1/2 -translate-y-full border transition-all duration-200 min-w-[160px] ${isDarkMode ? 'bg-zinc-900 border-zinc-800 text-zinc-200' : 'bg-white border-zinc-200 text-zinc-700'}`}
 style={{
 left: `${(hoveredPoint.x / w) * 100}%`,
 top: `calc(${(hoveredPoint.y / h) * 100}% - 16px)`
 }}
 >
 <div className={`font-semibold border-b pb-2 mb-2 text-center text-sm ${isDarkMode ? 'border-zinc-800 text-zinc-100' : 'border-zinc-100 text-zinc-900'}`}>
 {hoveredPoint.label === 'Start' ? 'ภาพรวมก่อนเริ่มโครงการ' : hoveredPoint.label}
 </div>
 <div className="space-y-2">
 <div className="flex justify-between gap-4 items-center">
 <span className={isDarkMode ? 'text-zinc-400' : 'text-zinc-500'}>ที่ต้องส่ง:</span>
 <span className={`font-bold px-2 py-0.5 rounded ${isDarkMode ? 'text-amber-400 bg-amber-500/10' : 'text-amber-600 bg-amber-50'}`}>{hoveredPoint.target} ตัว</span>
 </div>
 <div className="flex justify-between gap-4 items-center">
 <span className={isDarkMode ? 'text-zinc-400' : 'text-zinc-500'}>ทำเสร็จไป:</span>
 <span className={`font-bold px-2 py-0.5 rounded ${isDarkMode ? 'text-green-400 bg-green-500/10' : 'text-green-600 bg-green-50'}`}>{hoveredPoint.done} ตัว</span>
 </div>
 <div className="flex justify-between gap-4 items-center">
 <span className={isDarkMode ? 'text-zinc-400' : 'text-zinc-500'}>คงค้าง:</span>
 <span className={`font-bold px-2 py-0.5 rounded ${isDarkMode ? 'text-red-400 bg-red-500/10' : 'text-red-600 bg-red-50'}`}>{hoveredPoint.pending} ตัว</span>
 </div>
 </div>
 <div className={`absolute left-1/2 bottom-0 transform -translate-x-1/2 translate-y-full w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] ${isDarkMode ? 'border-t-zinc-900' : 'border-t-white'}`}></div>
 </div>
 )}
 </div>
 );
 };

 const columns = ['Todo', 'Task', 'UAT', 'Prod'];

 return (
 <div className={`flex flex-col md:flex-row min-h-screen w-full font-sans tracking-tight relative transition-colors duration-300 pb-16 md:pb-0 ${isDarkMode ? 'bg-black text-zinc-100' : 'bg-zinc-50 text-zinc-900'}`}>
 
 {/* Loading Overlay */}
 {isSyncing && (
 <div className={`fixed inset-0 backdrop-blur-sm z-[100] flex flex-col items-center justify-center ${isDarkMode ? 'bg-black/80' : 'bg-white/80'}`}>
 <Loader2 className={`w-8 h-8 animate-spin mb-4 ${isDarkMode ? 'text-white' : 'text-black'}`} />
 <p className="font-medium text-sm">Syncing Data...</p>
 </div>
 )}

 {/* Toast Notification */}
 {toastMessage && (
 <div className={`fixed top-6 right-6 px-4 py-3 rounded-lg shadow-xl flex items-center gap-3 z-[100] animate-in fade-in slide-in-from-top-4 border ${isDarkMode ? 'bg-zinc-900 border-zinc-800 text-white' : 'bg-white border-zinc-200 text-black'}`}>
 <CheckCircle size={16} className={isDarkMode ? 'text-zinc-300' : 'text-zinc-600'} />
 <span className="font-medium text-sm">{toastMessage}</span>
 </div>
 )}

 {/* Vercel-style Sidebar */}
 <div className={`fixed bottom-0 left-0 right-0 md:relative md:w-64 flex flex-row md:flex-col items-center md:items-start py-2 md:py-6 shadow-[0_-5px_15px_-3px_rgba(0,0,0,0.05)] md:shadow-none z-50 shrink-0 transition-all duration-300 md:sticky md:top-0 md:h-screen ${isDarkMode ? 'bg-zinc-950 md:border-r border-zinc-800 border-t md:border-t-0' : 'bg-white md:border-r border-zinc-200 border-t md:border-t-0'}`}>
 <div className="hidden md:flex items-center w-full px-6 mb-8">
 <div className={`p-2 rounded-md shrink-0 border ${isDarkMode ? 'bg-zinc-900 border-zinc-800 text-white' : 'bg-zinc-100 border-zinc-200 text-black'}`}><Activity size={18} /></div>
 <span className="ml-3 font-semibold text-base tracking-tight">Alpha One</span>
 </div>
 
 <nav className="w-full flex flex-row md:flex-col justify-around md:justify-start gap-1 md:gap-1 px-2 md:px-4">
 <button onClick={() => setActiveMenu('overview')} className={`flex-1 md:flex-none w-full flex flex-col md:flex-row items-center md:justify-start py-2.5 md:py-2 md:px-3 rounded-md transition-all text-[10px] md:text-sm font-medium ${activeMenu === 'overview' ? (isDarkMode ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-50 text-blue-600') : (isDarkMode ? 'text-zinc-400 hover:text-white hover:bg-zinc-900' : 'text-zinc-500 hover:text-black hover:bg-zinc-50')}`}>
 <LayoutDashboard size={16} className="mb-1 md:mb-0 md:mr-3 shrink-0" /> <span className="hidden md:block">Overview</span><span className="md:hidden">Overview</span>
 </button>

 <button onClick={() => setActiveMenu('roadmap')} className={`flex-1 md:flex-none w-full flex flex-col md:flex-row items-center md:justify-start py-2.5 md:py-2 md:px-3 rounded-md transition-all text-[10px] md:text-sm font-medium ${activeMenu === 'roadmap' ? (isDarkMode ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-50 text-blue-600') : (isDarkMode ? 'text-zinc-400 hover:text-white hover:bg-zinc-900' : 'text-zinc-500 hover:text-black hover:bg-zinc-50')}`}>
 <Map size={16} className="mb-1 md:mb-0 md:mr-3 shrink-0" /> <span className="hidden md:block">Roadmap</span><span className="md:hidden">Map</span>
 </button>
 
 <button onClick={() => setActiveMenu('meeting')} className={`flex-1 md:flex-none w-full flex flex-col md:flex-row items-center md:justify-start py-2.5 md:py-2 md:px-3 rounded-md transition-all text-[10px] md:text-sm font-medium ${activeMenu === 'meeting' ? (isDarkMode ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-50 text-blue-600') : (isDarkMode ? 'text-zinc-400 hover:text-white hover:bg-zinc-900' : 'text-zinc-500 hover:text-black hover:bg-zinc-50')}`}>
 <CalendarDays size={16} className="mb-1 md:mb-0 md:mr-3 shrink-0" /> <span className="hidden md:block">Meeting Cycle</span><span className="md:hidden">Meeting</span>
 </button>

 <button onClick={() => setActiveMenu('defect')} className={`flex-1 md:flex-none w-full flex flex-col md:flex-row items-center md:justify-start py-2.5 md:py-2 md:px-3 rounded-md transition-all text-[10px] md:text-sm font-medium ${activeMenu === 'defect' ? (isDarkMode ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-50 text-blue-600') : (isDarkMode ? 'text-zinc-400 hover:text-white hover:bg-zinc-900' : 'text-zinc-500 hover:text-black hover:bg-zinc-50')}`}>
 <Bug size={16} className="mb-1 md:mb-0 md:mr-3 shrink-0" /> <span className="hidden md:block">Issue Tracking</span><span className="md:hidden">Issues</span>
 </button>
 </nav>
 
 <div className="mt-auto hidden md:flex flex-col gap-1 w-full px-4">
 <button className={`w-full flex items-center py-2 px-3 rounded-md transition-all text-sm font-medium ${isDarkMode ? 'text-zinc-400 hover:text-white hover:bg-zinc-900' : 'text-zinc-500 hover:text-black hover:bg-zinc-50'}`}>
 <Settings size={16} className="mr-3 shrink-0" /> Settings
 </button>
 </div>
 </div>

 {/* Main Content Area */}
 <div className="flex-1 flex flex-col min-w-0 w-full">
 
 {/* Next.js Header */}
 <header className={`h-14 border-b flex items-center justify-between px-4 md:px-8 shrink-0 z-30 sticky top-0 backdrop-blur-md transition-colors duration-300 ${isDarkMode ? 'bg-black/70 border-zinc-800' : 'bg-white/70 border-zinc-200'}`}>
 <div className={`flex items-center rounded-md px-3 py-1.5 w-40 md:w-64 border transition-all ${isDarkMode ? 'bg-zinc-900 border-zinc-800 focus-within:border-zinc-600' : 'bg-zinc-50 border-zinc-200 focus-within:border-zinc-400'}`}>
 <Search size={14} className={isDarkMode ? 'text-zinc-500' : 'text-zinc-400'} />
 <input 
 type="text" 
 placeholder="Search..." 
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 className={`bg-transparent border-none focus:outline-none ml-2 text-xs w-full ${isDarkMode ? 'text-zinc-200 placeholder-zinc-500' : 'text-zinc-900 placeholder-zinc-400'}`} 
 />
 </div>
 
 <div className="flex items-center gap-2 md:gap-4">
 <button onClick={() => setIsDarkMode(!isDarkMode)} className={`p-1.5 rounded-md transition-colors ${isDarkMode ? 'text-zinc-400 hover:bg-zinc-800' : 'text-zinc-500 hover:bg-zinc-100'}`}>
 {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
 </button>
 <div className={`w-px h-4 ${isDarkMode ? 'bg-zinc-800' : 'bg-zinc-200'}`}></div>
 <div className="flex items-center gap-2 cursor-pointer">
 <div className={`w-7 h-7 rounded-full flex items-center justify-center border ${isDarkMode ? 'bg-zinc-800 border-zinc-700 text-zinc-300' : 'bg-zinc-100 border-zinc-200 text-zinc-600'}`}>
 <User size={14} />
 </div>
 </div>
 </div>
 </header>

 {/* Content Body */}
 <div className="p-4 md:p-8 flex flex-col gap-6 md:gap-8 w-full max-w-7xl mx-auto">
 
{activeMenu === 'overview' ? (
<>
 {/* Header Action Row */}
 <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0 w-full">
 <div>
 <h1 className="text-xl md:text-2xl font-semibold tracking-tight">Project Overview</h1>
 <p className={`text-xs md:text-sm mt-1 ${isDarkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>Alpha One 2026 • Real-time cloud sync</p>
 </div>
 
 <div className="flex gap-2 w-full md:w-auto items-center">
 <button onClick={handleSyncFromGoogleSheet} className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${isDarkMode ? 'bg-zinc-900 border-zinc-800 hover:bg-zinc-800 text-zinc-300' : 'bg-white border-zinc-200 hover:bg-zinc-50 text-zinc-700'}`}>
 <RefreshCw size={14} className={isSyncing ? "animate-spin" : ""} /> Sync
 </button>
 <button onClick={handleShareLink} className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${isDarkMode ? 'bg-zinc-900 border-zinc-800 hover:bg-zinc-800 text-zinc-300' : 'bg-white border-zinc-200 hover:bg-zinc-50 text-zinc-700'}`}>
 <Share2 size={14} /> Share
 </button>
 <div className="relative">
 <button onClick={() => setExportMenuOpen(prev => !prev)} className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${isDarkMode ? 'bg-white border-white text-black hover:bg-zinc-200' : 'bg-black border-black text-white hover:bg-zinc-800'}`}>
 <Download size={14} /> Export
 </button>
 {exportMenuOpen && (
 <>
 <div className="fixed inset-0 z-40" onClick={() => setExportMenuOpen(false)}></div>
 <div className={`absolute right-0 top-full mt-2 w-32 rounded-lg shadow-xl border overflow-hidden z-50 py-1 animate-in fade-in slide-in-from-top-2 ${isDarkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'}`}>
 <button onClick={() => handleExport('xlsx', rawData, 'project_overview')} className={`w-full text-left px-4 py-2 text-xs font-medium transition-colors relative z-50 ${isDarkMode ? 'text-zinc-300 hover:bg-zinc-800' : 'text-zinc-700 hover:bg-zinc-50'}`}>.xlsx</button>
 <button onClick={() => handleExport('csv', rawData, 'project_overview')} className={`w-full text-left px-4 py-2 text-xs font-medium transition-colors relative z-50 ${isDarkMode ? 'text-zinc-300 hover:bg-zinc-800' : 'text-zinc-700 hover:bg-zinc-50'}`}>.csv</button>
 </div>
 </>
 )}
 </div>
 </div>
 </div>

 {/* Stacked progress bar (Overview) */}
 <StackedProgressBar segments={overviewSegments} total={totalTasks} isDarkMode={isDarkMode} />
 {/* KPI Modules & Filters */}
 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full">
 
 {/* Left Col: KPIs */}
 <div className="lg:col-span-2 grid grid-cols-2 lg:grid-cols-4 gap-4">
 <div className={`p-4 rounded-xl border flex flex-col justify-center ${isDarkMode ? 'bg-zinc-950 border-zinc-800' : 'bg-white border-zinc-200'}`}>
 <p className={`text-[10px] font-semibold uppercase tracking-wider mb-1 ${isDarkMode ? 'text-zinc-500' : 'text-zinc-500'}`}>Total</p>
 <div className="flex items-baseline gap-1 mt-1">
 <h2 className={`text-3xl font-bold tracking-tighter ${isDarkMode ? 'text-white' : 'text-black'}`}>{totalTasks}</h2>
 </div>
 </div>
 <div className={`p-4 rounded-xl border flex flex-col justify-center ${isDarkMode ? 'bg-zinc-950 border-zinc-800' : 'bg-white border-zinc-200'}`}>
 <p className={`text-[10px] font-semibold uppercase tracking-wider mb-1 ${isDarkMode ? 'text-zinc-500' : 'text-zinc-500'}`}>UAT</p>
 <div className="flex items-baseline gap-1 mt-1">
 <h2 className={`text-3xl font-bold tracking-tighter ${isDarkMode ? 'text-purple-400' : 'text-purple-600'}`}>{uatTasks}</h2>
 </div>
 </div>
 <div className={`p-4 rounded-xl border flex flex-col justify-center ${isDarkMode ? 'bg-zinc-950 border-zinc-800' : 'bg-white border-zinc-200'}`}>
 <p className={`text-[10px] font-semibold uppercase tracking-wider mb-1 ${isDarkMode ? 'text-zinc-500' : 'text-zinc-500'}`}>In Progress</p>
 <div className="flex items-baseline gap-1 mt-1">
 <h2 className={`text-3xl font-bold tracking-tighter ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>{inProgressTasks}</h2>
 </div>
 </div>
 <div className={`p-4 rounded-xl border flex flex-col justify-center ${isDarkMode ? 'bg-zinc-950 border-zinc-800' : 'bg-white border-zinc-200'}`}>
 <p className={`text-[10px] font-semibold uppercase tracking-wider mb-1 ${isDarkMode ? 'text-zinc-500' : 'text-zinc-500'}`}>Production</p>
 <div className="flex items-baseline gap-1 mt-1">
 <h2 className={`text-3xl font-bold tracking-tighter ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>{completedTasks}</h2>
 </div>
 </div>
 </div>

 {/* Right Col: Progress & Filters */}
 <div className="lg:col-span-1 flex flex-col gap-4 justify-between">
 <div className={`p-4 rounded-xl border flex flex-col justify-center flex-1 ${isDarkMode ? 'bg-zinc-950 border-zinc-800' : 'bg-white border-zinc-200'}`}>
 <div className="flex justify-between items-end mb-2">
 <p className={`text-sm font-semibold ${isDarkMode ? 'text-zinc-300' : 'text-zinc-800'}`}>Completion</p>
 <h2 className={`text-lg font-bold ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>{progressPercent}%</h2>
 </div>
 <div className={`w-full h-1.5 rounded-full overflow-hidden ${isDarkMode ? 'bg-zinc-800' : 'bg-zinc-100'}`}>
 <div className={`h-full transition-all duration-500 ${isDarkMode ? 'bg-blue-500' : 'bg-blue-500'}`} style={{ width: `${progressPercent}%` }}></div>
 </div>
 </div>

 <div className={`p-4 rounded-xl border flex flex-col gap-2 ${isDarkMode ? 'bg-zinc-950 border-zinc-800' : 'bg-white border-zinc-200'}`}>
 <div className="flex items-center gap-2 mb-1">
 <Filter size={14} className={isDarkMode ? 'text-zinc-400' : 'text-zinc-500'} />
 <span className={`text-xs font-semibold ${isDarkMode ? 'text-zinc-300' : 'text-zinc-700'}`}>Filters</span>
 </div>
 <div className="grid grid-cols-2 gap-3">
 <div>
 <MultiSelectDropdown options={monthOptions} value={filters.month} onChange={(selected) => setFilters({...filters, month: selected})} placeholder={'Months'} isDarkMode={isDarkMode} />
 </div>
 <div>
 <MultiSelectDropdown options={areaOptions} value={filters.area} onChange={(selected) => setFilters({...filters, area: selected})} placeholder={'Areas'} isDarkMode={isDarkMode} />
 </div>
 </div>
 </div>
 </div>
 </div>

 {/* Side-by-side Charts */}
 <div className="flex flex-col xl:flex-row gap-6 w-full">
 {/* Burndown Chart */}
 <div className={`p-5 rounded-xl border flex flex-col flex-1 min-w-0 ${isDarkMode ? 'bg-zinc-950 border-zinc-800' : 'bg-white border-zinc-200'}`}>
 <div className="flex justify-between items-center mb-6 shrink-0">
 <div className="flex items-center gap-3">
 <h3 className={`font-semibold text-sm ${isDarkMode ? 'text-zinc-100' : 'text-zinc-900'}`}>Burndown Chart</h3>
 <button onClick={() => setShowChartLabels(!showChartLabels)} className="flex items-center gap-1.5 cursor-pointer focus:outline-none" title="Toggle Data Labels">
 <div className={`w-6 h-3.5 rounded-full flex items-center p-0.5 transition-colors ${showChartLabels ? 'bg-blue-500' : (isDarkMode ? 'bg-zinc-700' : 'bg-zinc-300')}`}>
 <div className={`w-2.5 h-2.5 rounded-full bg-white transition-transform ${showChartLabels ? 'translate-x-2.5' : 'translate-x-0'}`} />
 </div>
 <span className={`text-[9px] font-medium ${isDarkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>Labels</span>
 </button>
 </div>
 <div className="flex gap-4 text-xs font-medium">
 <div className={`flex items-center gap-1.5 ${isDarkMode ? 'text-zinc-400' : 'text-zinc-500'}`}><div className={`w-2 h-2 rounded-full border-2 ${isDarkMode ? 'border-zinc-500' : 'border-zinc-300'}`}></div> Ideal Remaining</div>
 <div className={`flex items-center gap-1.5 ${isDarkMode ? 'text-zinc-400' : 'text-zinc-500'}`}><div className={`w-2 h-2 rounded-full bg-blue-500`}></div> Actual Remaining</div>
 </div>
 </div>
 <div className="flex-1 w-full min-h-[220px]">
 {renderChartSVG(filteredData, 'overview', 'burndown', showChartLabels)}
 </div>
 </div>
 
 {/* Accumulate Chart */}
 <div className={`p-5 rounded-xl border flex flex-col flex-1 min-w-0 ${isDarkMode ? 'bg-zinc-950 border-zinc-800' : 'bg-white border-zinc-200'}`}>
 <div className="flex justify-between items-center mb-6 shrink-0">
 <div className="flex items-center gap-3">
 <h3 className={`font-semibold text-sm ${isDarkMode ? 'text-zinc-100' : 'text-zinc-900'}`}>Accumulated Done</h3>
 <button onClick={() => setShowChartLabels(!showChartLabels)} className="flex items-center gap-1.5 cursor-pointer focus:outline-none" title="Toggle Data Labels">
 <div className={`w-6 h-3.5 rounded-full flex items-center p-0.5 transition-colors ${showChartLabels ? 'bg-emerald-500' : (isDarkMode ? 'bg-zinc-700' : 'bg-zinc-300')}`}>
 <div className={`w-2.5 h-2.5 rounded-full bg-white transition-transform ${showChartLabels ? 'translate-x-2.5' : 'translate-x-0'}`} />
 </div>
 <span className={`text-[9px] font-medium ${isDarkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>Labels</span>
 </button>
 </div>
 <div className="flex gap-4 text-xs font-medium">
 <div className={`flex items-center gap-1.5 ${isDarkMode ? 'text-zinc-400' : 'text-zinc-500'}`}><div className={`w-2 h-2 rounded-full border-2 ${isDarkMode ? 'border-zinc-500' : 'border-zinc-300'}`}></div> Target Goal</div>
 <div className={`flex items-center gap-1.5 ${isDarkMode ? 'text-zinc-400' : 'text-zinc-500'}`}><div className={`w-2 h-2 rounded-full bg-emerald-500`}></div> Actual Completed</div>
 </div>
 </div>
 <div className="flex-1 w-full min-h-[220px]">
 {renderChartSVG(filteredData, 'overview', 'accumulate', showChartLabels)}
 </div>
 </div>
 </div>

 {/* Kanban & Table Board */}
 <div className="flex flex-col mt-2">
 <div className="mb-4 flex items-center justify-between shrink-0">
 <h3 className={`font-semibold text-lg ${isDarkMode ? 'text-zinc-100' : 'text-zinc-900'}`}>Board</h3>
 <div className="flex items-center gap-3">
 {/* Toggle Switch */}
 <div className={`flex items-center p-0.5 rounded-lg border ${isDarkMode ? 'bg-zinc-900/50 border-zinc-800' : 'bg-zinc-100 border-zinc-200'}`}>
 <button 
 onClick={() => setOverviewBoardView('kanban')} 
 className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${overviewBoardView === 'kanban' ? (isDarkMode ? 'bg-zinc-800 text-white shadow-sm' : 'bg-white text-zinc-900 shadow-sm') : (isDarkMode ? 'text-zinc-500 hover:text-zinc-300' : 'text-zinc-500 hover:text-zinc-700')}`}
 >
 <LayoutGrid size={14} /> Board
 </button>
 <button 
 onClick={() => setOverviewBoardView('table')} 
 className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${overviewBoardView === 'table' ? (isDarkMode ? 'bg-zinc-800 text-white shadow-sm' : 'bg-white text-zinc-900 shadow-sm') : (isDarkMode ? 'text-zinc-500 hover:text-zinc-300' : 'text-zinc-500 hover:text-zinc-700')}`}
 >
 <List size={14} /> List
 </button>
 </div>
 <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${isDarkMode ? 'bg-zinc-900 border-zinc-800 text-zinc-400' : 'bg-zinc-100 border-zinc-200 text-zinc-600'}`}>{filteredData.length} tasks</span>
 </div>
 </div>
 
 {overviewBoardView === 'kanban' ? (
 <div className="flex gap-4 overflow-x-auto xl:grid xl:grid-cols-4 pb-4 items-start custom-scrollbar">
 {columns.map(status => {
 const columnTasks = filteredData.filter(t => t.BoardStatus === status);
 const headerColors = isDarkMode ? {
 'Todo': 'bg-slate-500/20 text-slate-300 border-slate-500/30',
 'Task': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
 'UAT': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
 'Prod': 'bg-green-500/20 text-green-400 border-green-500/30'
 } : {
 'Todo': 'bg-slate-100 text-slate-700 border-slate-200',
 'Task': 'bg-blue-50 text-blue-700 border-blue-200',
 'UAT': 'bg-purple-50 text-purple-700 border-purple-200',
 'Prod': 'bg-green-50 text-green-700 border-green-200'
 };

 return (
 <div key={`ov-col-${status}`} className={`flex flex-col rounded-xl p-3 border shrink-0 w-[280px] xl:w-auto ${isDarkMode ? 'bg-zinc-950/50 border-zinc-800' : 'bg-zinc-50/50 border-zinc-200'}`} onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, status)}>
 <div className="flex justify-between items-center mb-3">
 <h4 className={`font-semibold text-xs px-2 py-0.5 rounded border ${headerColors[status]}`}>
 {status === 'Task' ? 'In Progress' : status.toUpperCase()}
 </h4>
 <span className={`text-[10px] font-medium text-zinc-500`}>{columnTasks.length}</span>
 </div>

 <div className="flex flex-col gap-2 pb-2">
 {columnTasks.map(task => (
 <div key={`ov-task-${task.id}`} draggable onDragStart={(e) => handleDragStart(e, task.id)} className={`p-3 rounded-lg border-y border-r border-l-4 cursor-grab active:cursor-grabbing transition-all hover:shadow-sm group ${task['Area']?.includes('BKK') ? 'border-l-orange-500' : 'border-l-blue-500'} ${isDarkMode ? 'bg-zinc-900 border-zinc-800 hover:border-zinc-700' : 'bg-white border-zinc-200 hover:border-zinc-300'}`}>
 <div className="flex justify-between items-start mb-2">
 <span className={`text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded border ${isDarkMode ? 'bg-zinc-800 border-zinc-700 text-zinc-400' : 'bg-zinc-100 border-zinc-200 text-zinc-500'}`}>
 {overviewColA && task[overviewColA] ? task[overviewColA] : (task['No'] || task['ID'] || '-')}
 </span>
 {task['Area'] && (
 <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded border ${isDarkMode ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' : 'bg-blue-50 border-blue-200 text-blue-700'}`}>
 {task['Area']}
 </span>
 )}
 </div>
 
 <h5 className={`font-medium text-xs mb-2 leading-snug line-clamp-2 ${isDarkMode ? 'text-zinc-200' : 'text-zinc-800'}`} title={task['Detail']}>
 {task['Detail'] || 'No details provided'}
 </h5>
 
 <div className="flex flex-col gap-1.5 mt-auto pt-2 border-t border-dashed border-zinc-200 dark:border-zinc-800">
 <div className={`text-[9px] font-medium truncate ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>📁 {task['Task'] || 'Uncategorized'}</div>
 <div className={`flex items-center justify-between text-[9px] ${isDarkMode ? 'text-zinc-500' : 'text-zinc-500'}`}>
 <div className="flex items-center gap-1 min-w-0">
 <LayoutDashboard size={10} className="shrink-0" />
 <span className="truncate">{task['Module'] || 'No module'}</span>
 </div>
 {((overviewColN && task[overviewColN] && task[overviewColN].toString().trim() !== '') || (overviewColO && task[overviewColO] && task[overviewColO].toString().trim() !== '')) && (
 <div className="flex flex-col items-end gap-1 shrink-0 min-w-[92px]">
	 {overviewColN && task[overviewColN] && task[overviewColN].toString().trim() !== '' && (
		 <div className="flex items-center gap-2 text-[10px] font-semibold px-2 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
			 <CalendarDays size={12} />
			 <span className="truncate">UAT: {formatDateDDMMYYYY(task[overviewColN])}</span>
		 </div>
	 )}
	 {overviewColO && task[overviewColO] && task[overviewColO].toString().trim() !== '' && (
		 <div className="flex items-center gap-2 text-[10px] font-semibold px-2 py-1 rounded-full bg-green-50 text-emerald-700 border border-green-100">
			 <CalendarDays size={12} />
			 <span className="truncate">Prod: {formatDateDDMMYYYY(task[overviewColO])}</span>
		 </div>
	 )}
 </div>
 )}
 </div>
 </div>
 </div>
 ))}
 {columnTasks.length === 0 && <div className={`h-16 border border-dashed rounded-lg flex items-center justify-center text-xs font-medium ${isDarkMode ? 'border-zinc-800 text-zinc-600' : 'border-zinc-300 text-zinc-400'}`}>Drop here</div>}
 </div>
 </div>
 );
 })}
 </div>
 ) : (
 <div className={`w-full overflow-x-auto rounded-xl border custom-scrollbar ${isDarkMode ? 'border-zinc-800 bg-zinc-950' : 'border-zinc-200 bg-white'}`}>
 <table className="w-full text-left border-collapse min-w-[800px]">
 <thead>
 <tr className={`border-b ${isDarkMode ? 'border-zinc-800 bg-zinc-900/50' : 'border-zinc-200 bg-zinc-50'}`}>
 <th className={`py-3 px-4 text-[10px] font-semibold uppercase tracking-wider ${isDarkMode ? 'text-zinc-500' : 'text-zinc-500'}`}>ID</th>
 <th className={`py-3 px-4 text-[10px] font-semibold uppercase tracking-wider ${isDarkMode ? 'text-zinc-500' : 'text-zinc-500'}`}>Detail & Module</th>
 <th className={`py-3 px-4 text-[10px] font-semibold uppercase tracking-wider ${isDarkMode ? 'text-zinc-500' : 'text-zinc-500'}`}>Category</th>
 <th className={`py-3 px-4 text-[10px] font-semibold uppercase tracking-wider ${isDarkMode ? 'text-zinc-500' : 'text-zinc-500'}`}>Area</th>
 <th className={`py-3 px-4 text-[10px] font-semibold uppercase tracking-wider ${isDarkMode ? 'text-zinc-500' : 'text-zinc-500'}`}>Date</th>
 <th className={`py-3 px-4 text-[10px] font-semibold uppercase tracking-wider ${isDarkMode ? 'text-zinc-500' : 'text-zinc-500'}`}>Status</th>
 </tr>
 </thead>
 <tbody>
 {filteredData.map(task => (
 <tr key={`table-task-${task.id}`} className={`border-b last:border-0 transition-colors ${isDarkMode ? 'border-zinc-800 hover:bg-zinc-900/50' : 'border-zinc-200 hover:bg-zinc-50/50'}`}>
 <td className="py-3 px-4">
 <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${isDarkMode ? 'bg-zinc-800 border-zinc-700 text-zinc-300' : 'bg-zinc-100 border-zinc-200 text-zinc-700'}`}>
 {overviewColA && task[overviewColA] ? task[overviewColA] : (task['No'] || task['ID'] || '-')}
 </span>
 </td>
 <td className="py-3 px-4 max-w-[300px]">
 <p className={`text-xs font-medium line-clamp-1 ${isDarkMode ? 'text-zinc-200' : 'text-zinc-800'}`} title={task['Detail']}>{task['Detail'] || '-'}</p>
 <p className={`text-[10px] mt-0.5 flex items-center gap-1 ${isDarkMode ? 'text-zinc-500' : 'text-zinc-500'}`}><LayoutDashboard size={10} /> {task['Module'] || '-'}</p>
 </td>
 <td className={`py-3 px-4 text-xs font-medium ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>{task['Task'] || '-'}</td>
 <td className="py-3 px-4">
 {task['Area'] ? <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded border ${isDarkMode ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' : 'bg-blue-50 border-blue-200 text-blue-700'}`}>{task['Area']}</span> : '-'}
 </td>
 <td className={`py-3 px-4 text-xs ${isDarkMode ? 'text-zinc-400' : 'text-zinc-600'}`}>
 {((overviewColN && task[overviewColN] && task[overviewColN].toString().trim() !== '') || (overviewColO && task[overviewColO] && task[overviewColO].toString().trim() !== '')) ? (
 <div className="flex flex-col gap-1">
 {overviewColN && task[overviewColN] && task[overviewColN].toString().trim() !== '' && (
 <div className="flex items-center gap-1 font-medium text-blue-500"><CalendarDays size={10} /><span>{formatDateDDMMYYYY(task[overviewColN])} (UAT)</span></div>
 )}
 {overviewColO && task[overviewColO] && task[overviewColO].toString().trim() !== '' && (
 <div className="flex items-center gap-1 font-medium text-green-600"><CalendarDays size={10} /><span>{formatDateDDMMYYYY(task[overviewColO])} (Prod)</span></div>
 )}
 </div>
 ) : '-'}
 </td>
 <td className="py-3 px-4">
 <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${getStatusStyle(task.BoardStatus, isDarkMode)}`}>
 {task.BoardStatus === 'Task' ? 'IN PROGRESS' : task.BoardStatus.toUpperCase()}
 </span>
 </td>
 </tr>
 ))}
 {filteredData.length === 0 && (
 <tr>
 <td colSpan="6" className={`py-8 text-center text-xs ${isDarkMode ? 'text-zinc-500' : 'text-zinc-500'}`}>No tasks available</td>
 </tr>
 )}
 </tbody>
 </table>
 </div>
 )}
 </div>
 </>
 ) : activeMenu === 'roadmap' ? (
 <>
 {/* Header Action Row */}
 <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0 w-full mb-2">
 <div>
 <h1 className="text-xl md:text-2xl font-semibold tracking-tight">Project Roadmap</h1>
 <p className={`text-xs md:text-sm mt-1 ${isDarkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>Alpha One 2026 Timeline & Milestones</p>
 </div>
 
 <div className="flex flex-wrap gap-2 w-full md:w-auto items-center">
 
 {/* Toggle Switch สลับโหมด - Hidden */}
 <div className={`hidden flex items-center p-0.5 rounded-lg border mr-1 md:mr-2 ${isDarkMode ? 'bg-zinc-900/50 border-zinc-800' : 'bg-zinc-100 border-zinc-200'}`}>
 <button 
 onClick={() => setRoadmapViewMode('current')} 
 className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${roadmapViewMode === 'current' ? (isDarkMode ? 'bg-zinc-800 text-white shadow-sm' : 'bg-white text-zinc-900 shadow-sm') : (isDarkMode ? 'text-zinc-500 hover:text-zinc-300' : 'text-zinc-500 hover:text-zinc-700')}`}
 >
 <Map size={14} /> ปัจจุบัน
 </button>
 <button 
 onClick={() => setRoadmapViewMode('synced')} 
 className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${roadmapViewMode === 'synced' ? (isDarkMode ? 'bg-zinc-800 text-white shadow-sm' : 'bg-white text-zinc-900 shadow-sm') : (isDarkMode ? 'text-zinc-500 hover:text-zinc-300' : 'text-zinc-500 hover:text-zinc-700')}`}
 >
 <LayoutGrid size={14} /> ข้อมูล Sync
 </button>
 </div>

 <button
 onClick={() => setRoadmapShowBenefitOnly(prev => !prev)}
 className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${roadmapShowBenefitOnly ? (isDarkMode ? 'bg-blue-600 text-white shadow-sm' : 'bg-blue-600 text-white shadow-sm') : (isDarkMode ? 'text-zinc-500 hover:text-zinc-300' : 'text-zinc-500 hover:text-zinc-700')}`}
 >
 <Target size={14} /> Benefit
 </button>

 <button 
 onClick={() => fetchRoadmapFromSheet(true)} 
 className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${isDarkMode ? 'bg-zinc-900 border-zinc-800 hover:bg-zinc-800 text-zinc-300' : 'bg-white border-zinc-200 hover:bg-zinc-50 text-zinc-700'}`}
 >
 <RefreshCw size={14} className={isSyncingRoadmap ? "animate-spin" : ""} /> Sync
 </button>

 <button onClick={handleShareLink} className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${isDarkMode ? 'bg-zinc-900 border-zinc-800 hover:bg-zinc-800 text-zinc-300' : 'bg-white border-zinc-200 hover:bg-zinc-50 text-zinc-700'}`}>
 <Share2 size={14} /> Share
 </button>

 <div className="relative">
 <button onClick={() => setExportMenuOpen(prev => !prev)} className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${isDarkMode ? 'bg-white border-white text-black hover:bg-zinc-200' : 'bg-black border-black text-white hover:bg-zinc-800'}`}>
 <Download size={14} /> Export
 </button>
 {exportMenuOpen && (
 <>
 <div className="fixed inset-0 z-40" onClick={() => setExportMenuOpen(false)}></div>
 <div className={`absolute right-0 top-full mt-2 w-32 rounded-lg shadow-xl border overflow-hidden z-50 py-1 animate-in fade-in slide-in-from-top-2 ${isDarkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'}`}>
 <button onClick={() => handleExport('xlsx', roadmapData, 'project_roadmap')} className={`w-full text-left px-4 py-2 text-xs font-medium transition-colors relative z-50 ${isDarkMode ? 'text-zinc-300 hover:bg-zinc-800' : 'text-zinc-700 hover:bg-zinc-50'}`}>.xlsx</button>
 <button onClick={() => handleExport('csv', roadmapData, 'project_roadmap')} className={`w-full text-left px-4 py-2 text-xs font-medium transition-colors relative z-50 ${isDarkMode ? 'text-zinc-300 hover:bg-zinc-800' : 'text-zinc-700 hover:bg-zinc-50'}`}>.csv</button>
 </div>
 </>
 )}
 </div>
 </div>
 </div>
 
 {/* ส่งข้อมูล data เข้าไปเฉพาะตอนที่เลือกโหมด 'synced' เท่านั้น */}
 <RoadmapDashboard isDarkMode={isDarkMode} data={roadmapViewMode === 'synced' ? roadmapData : null} searchQuery={searchQuery} showBenefitOnly={roadmapShowBenefitOnly} />
 </>
 ) : activeMenu === 'meeting' ? (
 <div className="flex flex-col gap-4 w-full">
 <div className="flex flex-col justify-between items-start shrink-0 mb-2">
 <h1 className="text-xl md:text-2xl font-semibold tracking-tight">Meeting Cycle</h1>
 <p className={`text-xs md:text-sm mt-1 ${isDarkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>Weekly operations & sync schedule</p>
 </div>
 <MeetingCycleDashboard isDarkMode={isDarkMode} searchQuery={searchQuery} />
 </div>
 ) : activeMenu === 'defect' ? (
 <>
 {/* Defect Header */}
 <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0 w-full">
 <div>
 <h1 className="text-xl md:text-2xl font-semibold tracking-tight">Issue Tracking</h1>
 <p className={`text-xs md:text-sm mt-1 ${isDarkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>Defect resolution dashboard</p>
 </div>
 
 <div className="flex flex-wrap gap-2 w-full md:w-auto items-center shrink-0 z-40">
 <button onClick={handleSyncFromGoogleSheet} className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${isDarkMode ? 'bg-zinc-900 border-zinc-800 hover:bg-zinc-800 text-zinc-300' : 'bg-white border-zinc-200 hover:bg-zinc-50 text-zinc-700'}`}>
 <RefreshCw size={14} className={isSyncing ? "animate-spin" : ""} /> Sync
 </button>
 <button onClick={handleShareLink} className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${isDarkMode ? 'bg-zinc-900 border-zinc-800 hover:bg-zinc-800 text-zinc-300' : 'bg-white border-zinc-200 hover:bg-zinc-50 text-zinc-700'}`}>
 <Share2 size={14} /> Share
 </button>
 <div className="relative">
 <button onClick={() => setExportMenuOpen(prev => !prev)} className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${isDarkMode ? 'bg-white border-white text-black hover:bg-zinc-200' : 'bg-black border-black text-white hover:bg-zinc-800'}`}>
 <Download size={14} /> Export
 </button>
 {exportMenuOpen && (
 <>
 <div className="fixed inset-0 z-40" onClick={() => setExportMenuOpen(false)}></div>
 <div className={`absolute right-0 top-full mt-2 w-32 rounded-lg shadow-xl border overflow-hidden z-50 py-1 animate-in fade-in slide-in-from-top-2 ${isDarkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'}`}>
 <button onClick={() => handleExport('xlsx', defectData, 'defect_tracking')} className={`w-full text-left px-4 py-2 text-xs font-medium transition-colors relative z-50 ${isDarkMode ? 'text-zinc-300 hover:bg-zinc-800' : 'text-zinc-700 hover:bg-zinc-50'}`}>.xlsx</button>
 <button onClick={() => handleExport('csv', defectData, 'defect_tracking')} className={`w-full text-left px-4 py-2 text-xs font-medium transition-colors relative z-50 ${isDarkMode ? 'text-zinc-300 hover:bg-zinc-800' : 'text-zinc-700 hover:bg-zinc-50'}`}>.csv</button>
 </div>
 </>
 )}
 </div>
 </div>
 </div>

 {/* Defect KPIs */}
 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full">
 <div className="lg:col-span-2 grid grid-cols-2 lg:grid-cols-4 gap-4">
 <div className={`p-4 rounded-xl border flex flex-col justify-center ${isDarkMode ? 'bg-zinc-950 border-zinc-800' : 'bg-white border-zinc-200'}`}>
 <p className={`text-[10px] font-semibold uppercase tracking-wider mb-1 ${isDarkMode ? 'text-zinc-500' : 'text-zinc-500'}`}>Total Defects</p>
 <div className="flex items-baseline gap-1 mt-1">
 <h2 className={`text-3xl font-bold tracking-tighter ${isDarkMode ? 'text-white' : 'text-black'}`}>{defectTotalCount}</h2>
 </div>
 </div>

 <div className={`p-4 rounded-xl border flex flex-col ${isDarkMode ? 'bg-zinc-950 border-zinc-800' : 'bg-white border-zinc-200'}`}>
 <p className={`text-[10px] font-semibold uppercase tracking-wider mb-1 ${isDarkMode ? 'text-zinc-500' : 'text-zinc-500'}`}>BKK</p>
 <div className="flex items-baseline gap-1 mb-2">
 <h2 className={`text-3xl font-bold tracking-tighter ${isDarkMode ? 'text-purple-400' : 'text-purple-600'}`}>{defectBkkCount}</h2>
 </div>
 <div className="flex flex-col gap-1 mt-auto">
 <div className={`flex items-center justify-between px-1.5 py-0.5 rounded border text-[9px] font-bold ${isDarkMode ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-green-50 border-green-200 text-green-700'}`}>
 <span className="flex items-center gap-1"><CheckCircle size={10} /> Done</span> <span>{defectBkkDone}</span>
 </div>
 <div className={`flex items-center justify-between px-1.5 py-0.5 rounded border text-[9px] font-bold ${isDarkMode ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-red-50 border-red-200 text-red-700'}`}>
 <span className="flex items-center gap-1"><AlertCircle size={10} /> Pending</span> <span>{defectBkkPending}</span>
 </div>
 </div>
 </div>

 <div className={`p-4 rounded-xl border flex flex-col ${isDarkMode ? 'bg-zinc-950 border-zinc-800' : 'bg-white border-zinc-200'}`}>
 <p className={`text-[10px] font-semibold uppercase tracking-wider mb-1 ${isDarkMode ? 'text-zinc-500' : 'text-zinc-500'}`}>Branch</p>
 <div className="flex items-baseline gap-1 mb-2">
 <h2 className={`text-3xl font-bold tracking-tighter ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>{defectBranchCount}</h2>
 </div>
 <div className="flex flex-col gap-1 mt-auto">
 <div className={`flex items-center justify-between px-1.5 py-0.5 rounded border text-[9px] font-bold ${isDarkMode ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-green-50 border-green-200 text-green-700'}`}>
 <span className="flex items-center gap-1"><CheckCircle size={10} /> Done</span> <span>{defectBranchDone}</span>
 </div>
 <div className={`flex items-center justify-between px-1.5 py-0.5 rounded border text-[9px] font-bold ${isDarkMode ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-red-50 border-red-200 text-red-700'}`}>
 <span className="flex items-center gap-1"><AlertCircle size={10} /> Pending</span> <span>{defectBranchPending}</span>
 </div>
 </div>
 </div>
 
 <div className={`p-4 rounded-xl border flex flex-col justify-center ${isDarkMode ? 'bg-zinc-950 border-zinc-800' : 'bg-white border-zinc-200'}`}>
 <p className={`text-[10px] font-semibold uppercase tracking-wider mb-1 ${isDarkMode ? 'text-zinc-500' : 'text-zinc-500'}`}>Production</p>
 <div className="flex items-baseline gap-1 mt-auto">
 <h2 className={`text-3xl font-bold tracking-tighter ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>{defectProductionCount}</h2>
 </div>
 </div>
 </div>

 <div className="lg:col-span-1 flex flex-col gap-4 justify-between">
 <div className={`p-4 rounded-xl border flex flex-col justify-center flex-1 ${isDarkMode ? 'bg-zinc-950 border-zinc-800' : 'bg-white border-zinc-200'}`}>
 <div className="flex justify-between items-end mb-2">
 <p className={`text-sm font-semibold ${isDarkMode ? 'text-zinc-300' : 'text-zinc-800'}`}>Resolution Rate</p>
 <h2 className={`text-lg font-bold ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>{defectProgressPercent}%</h2>
 </div>
 <div className={`w-full h-1.5 rounded-full overflow-hidden ${isDarkMode ? 'bg-zinc-800' : 'bg-zinc-100'}`}>
 <div className={`h-full transition-all duration-500 ${isDarkMode ? 'bg-blue-500' : 'bg-blue-500'}`} style={{ width: `${defectProgressPercent}%` }}></div>
 </div>
 </div>

 <div className={`p-4 rounded-xl border flex flex-col gap-2 ${isDarkMode ? 'bg-zinc-950 border-zinc-800' : 'bg-white border-zinc-200'}`}>
 <div className="flex items-center gap-2 mb-1">
 <Filter size={14} className={isDarkMode ? 'text-zinc-400' : 'text-zinc-500'} />
 <span className={`text-xs font-semibold ${isDarkMode ? 'text-zinc-300' : 'text-zinc-700'}`}>Filters</span>
 </div>
 <div className="grid grid-cols-2 gap-3">
 <div>
 <MultiSelectDropdown options={defectMonthOptions} value={defectFilters.month} onChange={(selected) => setDefectFilters({...defectFilters, month: selected})} placeholder={'Months'} isDarkMode={isDarkMode} />
 </div>
 <div>
 <MultiSelectDropdown options={defectAreaOptions} value={defectFilters.area} onChange={(selected) => setDefectFilters({...defectFilters, area: selected})} placeholder={'Areas'} isDarkMode={isDarkMode} />
 </div>
 </div>
 </div>
 </div>
 </div>

 {/* Side-by-side Charts */}
 <div className="flex flex-col xl:flex-row gap-6 w-full">
 {/* Burndown Chart */}
 <div className={`p-5 rounded-xl border flex flex-col flex-1 min-w-0 ${isDarkMode ? 'bg-zinc-950 border-zinc-800' : 'bg-white border-zinc-200'}`}>
 <div className="flex justify-between items-center mb-6 shrink-0">
 <div className="flex items-center gap-3">
 <h3 className={`font-semibold text-sm ${isDarkMode ? 'text-zinc-100' : 'text-zinc-900'}`}>Defect Burndown</h3>
 <button onClick={() => setShowChartLabels(!showChartLabels)} className="flex items-center gap-1.5 cursor-pointer focus:outline-none" title="Toggle Data Labels">
 <div className={`w-6 h-3.5 rounded-full flex items-center p-0.5 transition-colors ${showChartLabels ? 'bg-blue-500' : (isDarkMode ? 'bg-zinc-700' : 'bg-zinc-300')}`}>
 <div className={`w-2.5 h-2.5 rounded-full bg-white transition-transform ${showChartLabels ? 'translate-x-2.5' : 'translate-x-0'}`} />
 </div>
 <span className={`text-[9px] font-medium ${isDarkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>Labels</span>
 </button>
 </div>
 <div className="flex gap-4 text-xs font-medium">
 <div className={`flex items-center gap-1.5 ${isDarkMode ? 'text-zinc-400' : 'text-zinc-500'}`}><div className={`w-2 h-2 rounded-full border-2 ${isDarkMode ? 'border-zinc-500' : 'border-zinc-300'}`}></div> Ideal Remaining</div>
 <div className={`flex items-center gap-1.5 ${isDarkMode ? 'text-zinc-400' : 'text-zinc-500'}`}><div className={`w-2 h-2 rounded-full bg-blue-500`}></div> Actual Remaining</div>
 </div>
 </div>
 <div className="flex-1 w-full min-h-[220px]">
 {renderChartSVG(filteredDefectData, 'defect', 'burndown', showChartLabels)}
 </div>
 </div>
 
 {/* Accumulate Chart */}
 <div className={`p-5 rounded-xl border flex flex-col flex-1 min-w-0 ${isDarkMode ? 'bg-zinc-950 border-zinc-800' : 'bg-white border-zinc-200'}`}>
 <div className="flex justify-between items-center mb-6 shrink-0">
 <div className="flex items-center gap-3">
 <h3 className={`font-semibold text-sm ${isDarkMode ? 'text-zinc-100' : 'text-zinc-900'}`}>Accumulated Done</h3>
 <button onClick={() => setShowChartLabels(!showChartLabels)} className="flex items-center gap-1.5 cursor-pointer focus:outline-none" title="Toggle Data Labels">
 <div className={`w-6 h-3.5 rounded-full flex items-center p-0.5 transition-colors ${showChartLabels ? 'bg-emerald-500' : (isDarkMode ? 'bg-zinc-700' : 'bg-zinc-300')}`}>
 <div className={`w-2.5 h-2.5 rounded-full bg-white transition-transform ${showChartLabels ? 'translate-x-2.5' : 'translate-x-0'}`} />
 </div>
 <span className={`text-[9px] font-medium ${isDarkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>Labels</span>
 </button>
 </div>
 <div className="flex gap-4 text-xs font-medium">
 <div className={`flex items-center gap-1.5 ${isDarkMode ? 'text-zinc-400' : 'text-zinc-500'}`}><div className={`w-2 h-2 rounded-full border-2 ${isDarkMode ? 'border-zinc-500' : 'border-zinc-300'}`}></div> Target Goal</div>
 <div className={`flex items-center gap-1.5 ${isDarkMode ? 'text-zinc-400' : 'text-zinc-500'}`}><div className={`w-2 h-2 rounded-full bg-emerald-500`}></div> Actual Completed</div>
 </div>
 </div>
 <div className="flex-1 w-full min-h-[220px]">
 {renderChartSVG(filteredDefectData, 'defect', 'accumulate', showChartLabels)}
 </div>
 </div>
 </div>

 {/* Kanban & Table Board */}
 <div className="flex flex-col mt-2">
 <div className="mb-4 flex items-center justify-between shrink-0">
 <h3 className={`font-semibold text-lg ${isDarkMode ? 'text-zinc-100' : 'text-zinc-900'}`}>Board</h3>
 <div className="flex items-center gap-3">
 {/* Toggle Switch */}
 <div className={`flex items-center p-0.5 rounded-lg border ${isDarkMode ? 'bg-zinc-900/50 border-zinc-800' : 'bg-zinc-100 border-zinc-200'}`}>
 <button 
 onClick={() => setDefectBoardView('kanban')} 
 className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${defectBoardView === 'kanban' ? (isDarkMode ? 'bg-zinc-800 text-white shadow-sm' : 'bg-white text-zinc-900 shadow-sm') : (isDarkMode ? 'text-zinc-500 hover:text-zinc-300' : 'text-zinc-500 hover:text-zinc-700')}`}
 >
 <LayoutGrid size={14} /> Board
 </button>
 <button 
 onClick={() => setDefectBoardView('table')} 
 className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${defectBoardView === 'table' ? (isDarkMode ? 'bg-zinc-800 text-white shadow-sm' : 'bg-white text-zinc-900 shadow-sm') : (isDarkMode ? 'text-zinc-500 hover:text-zinc-300' : 'text-zinc-500 hover:text-zinc-700')}`}
 >
 <List size={14} /> List
 </button>
 </div>
 <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${isDarkMode ? 'bg-zinc-900 border-zinc-800 text-zinc-400' : 'bg-zinc-100 border-zinc-200 text-zinc-600'}`}>{filteredDefectData.length} issues</span>
 </div>
 </div>
 
 {defectBoardView === 'kanban' ? (
 <div className="flex gap-4 overflow-x-auto xl:grid xl:grid-cols-4 pb-4 items-start custom-scrollbar">
 {columns.map(status => {
 const columnTasks = filteredDefectData.filter(t => t.BoardStatus === status);
 const titleLabel = status === 'Todo' ? 'TODO' : status === 'Task' ? 'IN PROGRESS' : status === 'UAT' ? 'RETEST' : 'DONE';

 return (
 <div key={`def-col-${status}`} className={`flex flex-col rounded-xl p-3 border shrink-0 w-[280px] xl:w-auto ${isDarkMode ? 'bg-zinc-950/50 border-zinc-800' : 'bg-zinc-50/50 border-zinc-200'}`} onDragOver={handleDragOver} onDrop={(e) => handleDefectDrop(e, status)}>
 <div className="flex justify-between items-center mb-3">
 <h4 className={`font-semibold text-xs px-2 py-0.5 rounded border ${getStatusStyle(status, isDarkMode)}`}>
 {titleLabel}
 </h4>
 <span className={`text-[10px] font-medium text-zinc-500`}>{columnTasks.length}</span>
 </div>

 <div className="flex flex-col gap-2 pb-2">
 {columnTasks.map(task => (
 <div key={`def-task-${task.id}`} draggable onDragStart={(e) => handleDragStart(e, task.id)} className={`p-3 rounded-lg border-y border-r border-l-4 cursor-grab active:cursor-grabbing transition-all hover:shadow-sm group ${task['Priority']?.toLowerCase().includes('high') ? 'border-l-red-500' : (task['Area']?.includes('BKK') ? 'border-l-orange-500' : 'border-l-blue-500')} ${isDarkMode ? 'bg-zinc-900 border-zinc-800 hover:border-zinc-700' : 'bg-white border-zinc-200 hover:border-zinc-300'}`}>
 <div className="flex justify-between items-start mb-2">
 <span className={`text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded border ${isDarkMode ? 'bg-zinc-800 border-zinc-700 text-zinc-400' : 'bg-zinc-100 border-zinc-200 text-zinc-500'}`}>
 {colA && task[colA] ? task[colA] : (task['No'] || task['Issue ID'] || '-')}
 </span>
 {task['Area'] && (
 <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded border ${isDarkMode ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' : 'bg-blue-50 border-blue-200 text-blue-700'}`}>
 {task['Area']}
 </span>
 )}
 </div>
 
 <h5 className={`font-medium text-xs mb-2 leading-snug line-clamp-2 ${isDarkMode ? 'text-zinc-200' : 'text-zinc-800'}`} title={task['Details'] || task['Detail']}>
 {task['Details'] || task['Detail'] || 'No details provided'}
 </h5>
 
 <div className="flex flex-col gap-1.5 mt-auto pt-2 border-t border-dashed border-zinc-200 dark:border-zinc-800">
 <div className={`text-[9px] font-medium truncate flex items-center gap-1 ${task['Priority']?.toLowerCase().includes('high') ? 'text-red-500' : (isDarkMode ? 'text-zinc-500' : 'text-zinc-500')}`}>
 {task['Priority']?.toLowerCase().includes('high') && <AlertCircle size={10} />}
 📁 {task['System'] || task['Task'] || 'Uncategorized'}
 </div>
 <div className={`flex items-center justify-between text-[9px] ${isDarkMode ? 'text-zinc-500' : 'text-zinc-500'}`}>
 <div className="flex items-center gap-1 min-w-0">
 <LayoutDashboard size={10} className="shrink-0" />
 <span className="truncate">{task['Module'] || 'No module'}</span>
 </div>
 </div>
 </div>
 </div>
 ))}
 {columnTasks.length === 0 && <div className={`h-16 border border-dashed rounded-lg flex items-center justify-center text-xs font-medium ${isDarkMode ? 'border-zinc-800 text-zinc-600' : 'border-zinc-300 text-zinc-400'}`}>Drop here</div>}
 </div>
 </div>
 );
 })}
 </div>
 ) : (
 <div className={`w-full overflow-x-auto rounded-xl border custom-scrollbar ${isDarkMode ? 'border-zinc-800 bg-zinc-950' : 'border-zinc-200 bg-white'}`}>
 <table className="w-full text-left border-collapse min-w-[800px]">
 <thead>
 <tr className={`border-b ${isDarkMode ? 'border-zinc-800 bg-zinc-900/50' : 'border-zinc-200 bg-zinc-50'}`}>
 <th className={`py-3 px-4 text-[10px] font-semibold uppercase tracking-wider ${isDarkMode ? 'text-zinc-500' : 'text-zinc-500'}`}>Issue ID</th>
 <th className={`py-3 px-4 text-[10px] font-semibold uppercase tracking-wider ${isDarkMode ? 'text-zinc-500' : 'text-zinc-500'}`}>Details & Module</th>
 <th className={`py-3 px-4 text-[10px] font-semibold uppercase tracking-wider ${isDarkMode ? 'text-zinc-500' : 'text-zinc-500'}`}>System</th>
 <th className={`py-3 px-4 text-[10px] font-semibold uppercase tracking-wider ${isDarkMode ? 'text-zinc-500' : 'text-zinc-500'}`}>Area</th>
 <th className={`py-3 px-4 text-[10px] font-semibold uppercase tracking-wider ${isDarkMode ? 'text-zinc-500' : 'text-zinc-500'}`}>Priority</th>
 <th className={`py-3 px-4 text-[10px] font-semibold uppercase tracking-wider ${isDarkMode ? 'text-zinc-500' : 'text-zinc-500'}`}>Status</th>
 </tr>
 </thead>
 <tbody>
 {filteredDefectData.map(task => (
 <tr key={`table-def-${task.id}`} className={`border-b last:border-0 transition-colors ${isDarkMode ? 'border-zinc-800 hover:bg-zinc-900/50' : 'border-zinc-200 hover:bg-zinc-50/50'}`}>
 <td className="py-3 px-4">
 <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${isDarkMode ? 'bg-zinc-800 border-zinc-700 text-zinc-300' : 'bg-zinc-100 border-zinc-200 text-zinc-700'}`}>
 {colA && task[colA] ? task[colA] : (task['No'] || task['Issue ID'] || '-')}
 </span>
 </td>
 <td className="py-3 px-4 max-w-[300px]">
 <p className={`text-xs font-medium line-clamp-1 ${isDarkMode ? 'text-zinc-200' : 'text-zinc-800'}`} title={task['Details'] || task['Detail']}>{task['Details'] || task['Detail'] || '-'}</p>
 <p className={`text-[10px] mt-0.5 flex items-center gap-1 ${isDarkMode ? 'text-zinc-500' : 'text-zinc-500'}`}><LayoutDashboard size={10} /> {task['Module'] || '-'}</p>
 </td>
 <td className={`py-3 px-4 text-xs font-medium ${isDarkMode ? 'text-zinc-400' : 'text-zinc-600'}`}>{task['System'] || task['Task'] || '-'}</td>
 <td className="py-3 px-4">
 {task['Area'] ? <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded border ${isDarkMode ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' : 'bg-blue-50 border-blue-200 text-blue-700'}`}>{task['Area']}</span> : '-'}
 </td>
 <td className="py-3 px-4">
 {task['Priority']?.toLowerCase().includes('high') ? (
 <span className="flex items-center gap-1 text-[10px] text-red-500 font-semibold"><AlertCircle size={10} /> {task['Priority']}</span>
 ) : (
 <span className={`text-[10px] ${isDarkMode ? 'text-zinc-400' : 'text-zinc-600'}`}>{task['Priority'] || '-'}</span>
 )}
 </td>
 <td className="py-3 px-4">
 <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${getStatusStyle(task.BoardStatus, isDarkMode)}`}>
 {task.BoardStatus === 'Todo' ? 'TODO' : task.BoardStatus === 'Task' ? 'IN PROGRESS' : task.BoardStatus === 'UAT' ? 'RETEST' : 'DONE'}
 </span>
 </td>
 </tr>
 ))}
 {filteredDefectData.length === 0 && (
 <tr>
 <td colSpan="6" className={`py-8 text-center text-xs ${isDarkMode ? 'text-zinc-500' : 'text-zinc-500'}`}>No issues available</td>
 </tr>
 )}
 </tbody>
 </table>
 </div>
 )}
 </div>
 </>
 ) : null}

 <div className={`mt-8 pt-4 border-t text-center text-[10px] font-medium ${isDarkMode ? 'border-zinc-800 text-zinc-600' : 'border-zinc-200 text-zinc-400'}`}>
 Vercel Aesthetic Edition • 2026 Process Optimization
 </div>

 </div>
 </div>
 </div>
 );
}