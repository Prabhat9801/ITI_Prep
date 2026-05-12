import React, { useEffect, useState } from 'react';
import { fetchAPI } from '../utils/api';
import { Target, TrendingUp, AlertTriangle, CheckCircle, Clock, Award, ArrowRight, Database } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LineChart, Line, CartesianGrid, AreaChart, Area } from 'recharts';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [subjectStats, setSubjectStats] = useState([]);
  const [weakAreas, setWeakAreas] = useState([]);
  const [recommendation, setRecommendation] = useState(null);
  const [dailyProgress, setDailyProgress] = useState([]);
  const [questionGrowth, setQuestionGrowth] = useState([]);
  const [mockHistory, setMockHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const loadAll = async () => {
      try {
        const [statsData, subjectsData, weakData, recData, dailyData, growthData, historyData] = await Promise.all([
          fetchAPI('/progress/overview'),
          fetchAPI('/progress/subjects'),
          fetchAPI('/progress/weak-areas'),
          fetchAPI('/progress/recommendation'),
          fetchAPI('/progress/daily'),
          fetchAPI('/progress/question-growth'),
          fetchAPI('/practice/mock-test/history?limit=10')
        ]);
        setStats(statsData);
        setSubjectStats(subjectsData || []);
        setWeakAreas(weakData || []);
        setRecommendation(recData);
        setDailyProgress(dailyData || []);
        setQuestionGrowth(growthData || []);
        setMockHistory(historyData || []);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    loadAll();
  }, []);

  // Prepare chart data from real subject stats (top 8 subjects with attempts)
  const chartData = subjectStats
    .filter(s => s.total_attempted > 0)
    .sort((a, b) => b.total_attempted - a.total_attempted)
    .slice(0, 8)
    .map(s => ({
      name: s.name.length > 15 ? s.name.substring(0, 14) + '…' : s.name,
      fullName: s.name,
      score: s.accuracy,
      color: s.color
    }));

  // Find actual weakest subject
  const weakestSubject = subjectStats
    .filter(s => s.total_attempted >= 3)
    .sort((a, b) => a.accuracy - b.accuracy)[0];

  if (loading) return <div className="flex justify-center mt-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>;

  return (
    <div className="space-y-6">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Welcome Back, Student 👋</h1>
        <p className="text-text-muted">Here's your progress for the BTSC ITI Instructor Exam.</p>
      </header>

      {/* Top Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="glass-card p-4">
          <div className="flex justify-between items-start mb-2">
            <div>
              <p className="text-text-muted text-xs font-bold uppercase tracking-wider">Overall Accuracy</p>
              <h2 className="text-2xl font-bold text-white mt-1">{stats?.overall_accuracy || 0}%</h2>
            </div>
            <div className="p-2 bg-primary/20 rounded-lg text-primary">
              <Target size={20} />
            </div>
          </div>
          <div className="w-full bg-surface-light rounded-full h-1 mt-3">
            <div className="bg-primary h-1 rounded-full" style={{ width: `${stats?.overall_accuracy || 0}%` }}></div>
          </div>
        </div>

        <div className="glass-card p-4">
          <div className="flex justify-between items-start mb-2">
            <div>
              <p className="text-text-muted text-xs font-bold uppercase tracking-wider">Attempted</p>
              <h2 className="text-2xl font-bold text-white mt-1">{stats?.total_attempted || 0}</h2>
            </div>
            <div className="p-2 bg-secondary/20 rounded-lg text-secondary">
              <CheckCircle size={20} />
            </div>
          </div>
          <p className="text-[10px] text-secondary flex items-center gap-1 mt-3">
            <TrendingUp size={12} /> {stats?.total_correct || 0} correct
          </p>
        </div>

        <div className="glass-card p-4">
          <div className="flex justify-between items-start mb-2">
            <div>
              <p className="text-text-muted text-xs font-bold uppercase tracking-wider">Question Bank</p>
              <h2 className="text-2xl font-bold text-primary-light mt-1">{stats?.total_db_questions || 0}</h2>
            </div>
            <div className="p-2 bg-primary/20 rounded-lg text-primary-light">
              <Database size={20} />
            </div>
          </div>
          <p className="text-[10px] text-text-muted mt-3">Organically growing...</p>
        </div>

        <div className="glass-card p-4">
          <div className="flex justify-between items-start mb-2">
            <div>
              <p className="text-text-muted text-xs font-bold uppercase tracking-wider">Weak Areas</p>
              <h2 className="text-2xl font-bold text-warning mt-1">{stats?.weak_areas || 0}</h2>
            </div>
            <div className="p-2 bg-warning/20 rounded-lg text-warning">
              <AlertTriangle size={20} />
            </div>
          </div>
          <p className="text-[10px] text-text-muted mt-3 truncate">
            {weakestSubject ? weakestSubject.name : 'Good progress!'}
          </p>
        </div>

        <div className="glass-card p-4">
          <div className="flex justify-between items-start mb-2">
            <div>
              <p className="text-text-muted text-xs font-bold uppercase tracking-wider">Time Spent</p>
              <h2 className="text-2xl font-bold text-white mt-1">{stats?.total_time_minutes || 0}m</h2>
            </div>
            <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400">
              <Clock size={20} />
            </div>
          </div>
          <p className="text-[10px] text-text-muted mt-3">Total study time</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
        {/* Subject Performance Chart — LIVE */}
        <div className="glass-card lg:col-span-2">
          <h3 className="text-lg font-bold text-white mb-6">Subject Performance (Live)</h3>
          {chartData.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} domain={[0, 100]} />
                  <Tooltip 
                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                    contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }}
                    formatter={(value) => [`${value}%`, 'Accuracy']}
                  />
                  <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.score > 75 ? '#10b981' : entry.score > 50 ? '#4f46e5' : '#ef4444'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-text-muted">
              <p>Start practicing to see your performance chart!</p>
            </div>
          )}
        </div>

        {/* AI Recommendation — LIVE */}
        <div className="glass-card bg-gradient-to-br from-primary/10 to-transparent border-primary/20">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">🤖</span>
            <h3 className="text-lg font-bold text-white">AI Coach</h3>
          </div>
          
          <div className="p-4 bg-surface rounded-xl border border-border mb-4">
            <p className="text-sm text-text mb-2">Based on your performance:</p>
            {recommendation?.action === 'review' && weakAreas.length > 0 ? (
              <>
                <p className="text-lg font-bold text-warning mb-1">{weakAreas[0]?.topic_name || 'Weak Topic'}</p>
                <p className="text-xs text-text-muted">Accuracy: {weakAreas[0]?.accuracy || 0}% — Needs review!</p>
              </>
            ) : recommendation?.action === 'learn' ? (
              <>
                <p className="text-lg font-bold text-primary mb-1">New Topics Available</p>
                <p className="text-xs text-text-muted">Start learning unexplored subjects.</p>
              </>
            ) : (
              <>
                <p className="text-lg font-bold text-secondary mb-1">All Topics Strong! 🎉</p>
                <p className="text-xs text-text-muted">Keep practicing to maintain mastery.</p>
              </>
            )}
          </div>
          
          <button 
            className="w-full btn-primary py-3 rounded-xl flex items-center justify-center gap-2"
            onClick={() => {
              if (weakAreas.length > 0) {
                navigate(`/learn?subject=${encodeURIComponent(weakAreas[0]?.topic_name || '')}`);
              } else {
                navigate('/learn');
              }
            }}
          >
            Start Recommended Session <TrendingUp size={16} />
          </button>
        </div>
      </div>

      {/* Daily Progress Trend */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        {dailyProgress.some(d => d.total > 0) && (
          <div className="glass-card">
            <h3 className="text-lg font-bold text-white mb-6">15-Day Activity Trend</h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailyProgress} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }} />
                  <Line type="monotone" dataKey="total" stroke="#4f46e5" strokeWidth={2} dot={{ r: 3, fill: '#4f46e5' }} name="Attempted" />
                  <Line type="monotone" dataKey="correct" stroke="#10b981" strokeWidth={2} dot={{ r: 3, fill: '#10b981' }} name="Correct" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Question Bank Growth Trend */}
        <div className="glass-card">
          <h3 className="text-lg font-bold text-white mb-6">Question Bank Growth History</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={questionGrowth} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorBackground" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorOrganic" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }} />
                <Area type="monotone" dataKey="background" stackId="1" stroke="#4f46e5" fillOpacity={1} fill="url(#colorBackground)" name="Background Gen" />
                <Area type="monotone" dataKey="organic" stackId="1" stroke="#10b981" fillOpacity={1} fill="url(#colorOrganic)" name="Organic Quiz" />
                <Area type="monotone" dataKey="manual" stackId="1" stroke="#94a3b8" fillOpacity={1} fill="rgba(148,163,184,0.1)" name="Manual Import" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Mock Test History */}
      {mockHistory.length > 0 && (
        <div className="glass-card mt-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-white">Mock Test History</h3>
            <button 
              onClick={() => navigate('/history')} 
              className="text-sm text-primary hover:underline flex items-center gap-1"
            >
              View All <ArrowRight size={14} />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-text-muted border-b border-border">
                  <th className="text-left py-3 px-2 font-medium">Date</th>
                  <th className="text-center py-3 px-2 font-medium">Score</th>
                  <th className="text-center py-3 px-2 font-medium">Accuracy</th>
                  <th className="text-center py-3 px-2 font-medium">Merit</th>
                  <th className="text-center py-3 px-2 font-medium">Result</th>
                </tr>
              </thead>
              <tbody>
                {mockHistory.slice(0, 5).map((test) => (
                  <tr key={test.id} className="border-b border-border/50 hover:bg-surface-light/30 transition-colors">
                    <td className="py-3 px-2 text-text-muted">{new Date(test.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</td>
                    <td className="py-3 px-2 text-center text-white font-semibold">{test.correct}/{test.total_questions}</td>
                    <td className="py-3 px-2 text-center">
                      <span className={`font-semibold ${test.percentage >= 60 ? 'text-secondary' : test.percentage >= 40 ? 'text-warning' : 'text-danger'}`}>
                        {test.percentage.toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-3 px-2 text-center text-primary font-semibold">{test.merit_score.toFixed(1)}/75</td>
                    <td className="py-3 px-2 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${test.is_passed ? 'bg-secondary/20 text-secondary' : 'bg-danger/20 text-danger'}`}>
                        {test.is_passed ? 'PASS' : 'FAIL'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Weak Areas Detail */}
      {weakAreas.length > 0 && (
        <div className="glass-card mt-6 border-warning/20">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <AlertTriangle size={20} className="text-warning" /> Weak Areas — Focus Here
          </h3>
          <div className="space-y-3">
            {weakAreas.map((w, i) => (
              <div 
                key={i}
                className="p-4 bg-surface rounded-xl border border-border flex justify-between items-center cursor-pointer hover:border-warning/50 transition-colors"
                onClick={() => navigate(`/learn?subject=${encodeURIComponent(w.topic_name)}`)}
              >
                <div>
                  <p className="font-semibold text-white">{w.topic_name}</p>
                  <p className="text-xs text-text-muted">{w.attempted} attempted • Mastery: {w.mastery}%</p>
                </div>
                <div className="text-right">
                  <p className="text-danger font-bold text-lg">{w.accuracy}%</p>
                  <p className="text-xs text-text-muted">accuracy</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
