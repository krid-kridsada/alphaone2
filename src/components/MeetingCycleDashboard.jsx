import React, { useState } from 'react';
import { Users, Target, Sparkles, CalendarDays, Clock, Info, ArrowRight } from 'lucide-react';

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
      {/* Monthly Highlights Section */}
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

      {/* Main Content Area (Timeline + Details) */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 xl:gap-6 items-start">
        {/* Left Col: Timeline (Span 2) */}
        <div className={`xl:col-span-2 rounded-2xl border shadow-sm flex flex-col overflow-hidden ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
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

        {/* Right Col: Daily Detail & Heatmap */}
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

      {/* Dependency Flow Section */}
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


export default MeetingCycleDashboard;