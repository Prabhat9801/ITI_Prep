import React, { useEffect, useState } from 'react';
import { fetchAPI } from '../utils/api';
import { Award, AlertCircle, Clock, TrendingUp, FileText, CheckCircle, XCircle, ChevronDown, ChevronUp, ArrowUpRight, ArrowDownRight, Minus, Target } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';

const History = () => {
  const [history, setHistory] = useState([]);
  const [weakEvolution, setWeakEvolution] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedTest, setExpandedTest] = useState(null);
  const [testDetail, setTestDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      try {
        const [histData, evolData] = await Promise.all([
          fetchAPI('/practice/mock-test/history?limit=50'),
          fetchAPI('/practice/weak-area-evolution')
        ]);
        setHistory(histData || []);
        setWeakEvolution(evolData || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const loadTestDetail = async (testId) => {
    if (expandedTest === testId) {
      setExpandedTest(null);
      setTestDetail(null);
      return;
    }
    setExpandedTest(testId);
    setDetailLoading(true);
    try {
      const data = await fetchAPI(`/practice/mock-test/${testId}/detail`);
      setTestDetail(data);
    } catch (e) {
      console.error(e);
    } finally {
      setDetailLoading(false);
    }
  };

  if (loading) return <div className="flex justify-center mt-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>;

  const totalTests = history.length;
  const totalPassed = history.filter(h => h.is_passed).length;
  const avgScore = totalTests > 0 ? (history.reduce((acc, h) => acc + h.percentage, 0) / totalTests) : 0;
  const bestScore = totalTests > 0 ? Math.max(...history.map(h => h.percentage)) : 0;

  const chartData = [...history].reverse().map((h, i) => ({
    test: `T${i + 1}`,
    score: parseFloat(h.percentage.toFixed(1)),
    merit: parseFloat(h.merit_score.toFixed(1))
  }));

  // Separate weak area categories
  const weakTopics = weakEvolution.filter(w => w.status === 'weak');
  const improvingTopics = weakEvolution.filter(w => w.status === 'improving');
  const strongTopics = weakEvolution.filter(w => w.status === 'strong');

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2 font-display">Performance Analytics & History</h1>
        <p className="text-text-muted">Analyze your test results, track weak areas, and monitor your improvement trend.</p>
      </header>

      {totalTests === 0 ? (
        <div className="glass-card text-center py-16">
          <FileText size={48} className="text-text-muted mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">No Tests Recorded</h2>
          <p className="text-text-muted mb-6">Take your first Full Mock Test to generate your performance analysis.</p>
          <button onClick={() => navigate('/practice')} className="btn-primary px-8 py-3 rounded-xl font-bold">Start First Mock Test</button>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="glass-card border-l-4 border-l-primary">
              <p className="text-text-muted text-xs font-bold uppercase tracking-wider mb-1">Total Tests</p>
              <p className="text-3xl font-display font-bold text-white">{totalTests}</p>
            </div>
            <div className="glass-card border-l-4 border-l-secondary">
              <p className="text-text-muted text-xs font-bold uppercase tracking-wider mb-1">Pass Rate</p>
              <p className="text-3xl font-display font-bold text-secondary">{Math.round((totalPassed/totalTests)*100)}%</p>
            </div>
            <div className="glass-card border-l-4 border-l-warning">
              <p className="text-text-muted text-xs font-bold uppercase tracking-wider mb-1">Avg Score</p>
              <p className={`text-3xl font-display font-bold ${avgScore >= 40 ? 'text-secondary' : 'text-warning'}`}>{avgScore.toFixed(1)}%</p>
            </div>
            <div className="glass-card border-l-4 border-l-primary-light">
              <p className="text-text-muted text-xs font-bold uppercase tracking-wider mb-1">Best Merit</p>
              <p className="text-3xl font-display font-bold text-white">{Math.max(...history.map(h => h.merit_score)).toFixed(1)}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
             {/* Improvement Chart */}
            <div className="glass-card lg:col-span-2">
              <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                <TrendingUp size={20} className="text-primary" /> Score Improvement Trend
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="test" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} domain={[0, 100]} />
                    <Tooltip 
                        contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', color: '#fff', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)' }} 
                        itemStyle={{ fontWeight: 'bold' }}
                    />
                    <Line type="monotone" dataKey="score" stroke="#4f46e5" strokeWidth={4} dot={{ r: 6, fill: '#4f46e5', strokeWidth: 2, stroke: '#fff' }} name="Score %" activeDot={{ r: 8 }} />
                    <Line type="monotone" dataKey="merit" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981' }} name="Merit /75" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* AI Summary Card */}
            <div className="glass-card bg-gradient-to-br from-primary/10 to-transparent border-primary/20">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Target size={20} className="text-primary" /> Learning Status
              </h3>
              <div className="space-y-4">
                 <div className="flex justify-between items-center text-sm">
                    <span className="text-text-muted">Mastered Topics:</span>
                    <span className="text-secondary font-bold">{strongTopics.length}</span>
                 </div>
                 <div className="flex justify-between items-center text-sm">
                    <span className="text-text-muted">Improving:</span>
                    <span className="text-warning font-bold">{improvingTopics.length}</span>
                 </div>
                 <div className="flex justify-between items-center text-sm">
                    <span className="text-text-muted">Weak Points:</span>
                    <span className="text-danger font-bold">{weakTopics.length}</span>
                 </div>
                 
                 <div className="pt-4 mt-4 border-t border-white/5">
                    <p className="text-xs text-text-muted mb-2 uppercase font-bold tracking-widest">Focus Recommendation</p>
                    {weakTopics.length > 0 ? (
                        <p className="text-sm text-white font-medium">Prioritize <span className="text-danger font-bold">{weakTopics[0].topic_name}</span> in your next session to boost your score.</p>
                    ) : (
                        <p className="text-sm text-white font-medium">All topics are looking solid! Move to advanced level questions.</p>
                    )}
                 </div>
              </div>
            </div>
          </div>

          {/* ═══════════ WEAK AREA EVOLUTION TRACKER ═══════════ */}
          <div className="glass-card overflow-hidden">
            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2 px-1">
               Evolution Tracker: From Weak to Strong
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Column 1: WEAK */}
                <div className="space-y-4">
                    <h4 className="text-xs font-bold text-danger uppercase tracking-widest flex items-center gap-2 bg-danger/10 p-2 rounded-lg">
                        <AlertCircle size={14} /> Weak Points ({weakTopics.length})
                    </h4>
                    <div className="space-y-2">
                        {weakTopics.length > 0 ? weakTopics.map((w, i) => (
                            <div key={i} className="p-3 bg-surface border border-danger/20 rounded-xl hover:border-danger/50 transition-all cursor-pointer group"
                                onClick={() => navigate(`/learn?subject=${encodeURIComponent(w.topic_name)}`)}>
                                <div className="flex justify-between items-start">
                                    <p className="text-sm font-bold text-white group-hover:text-danger transition-colors">{w.topic_name}</p>
                                    <ArrowDownRight size={14} className="text-danger" />
                                </div>
                                <div className="flex justify-between items-end mt-2">
                                    <span className="text-[10px] text-text-muted uppercase font-bold">Accuracy</span>
                                    <span className="text-sm font-black text-danger">{w.latest_accuracy}%</span>
                                </div>
                            </div>
                        )) : <p className="text-xs text-text-muted italic px-2">No critical weak points!</p>}
                    </div>
                </div>

                {/* Column 2: IMPROVING */}
                <div className="space-y-4">
                    <h4 className="text-xs font-bold text-warning uppercase tracking-widest flex items-center gap-2 bg-warning/10 p-2 rounded-lg">
                        <TrendingUp size={14} /> Improving ({improvingTopics.length})
                    </h4>
                    <div className="space-y-2">
                        {improvingTopics.length > 0 ? improvingTopics.map((w, i) => (
                            <div key={i} className="p-3 bg-surface border border-warning/20 rounded-xl hover:border-warning/50 transition-all cursor-pointer group"
                                onClick={() => navigate(`/learn?subject=${encodeURIComponent(w.topic_name)}`)}>
                                <div className="flex justify-between items-start">
                                    <p className="text-sm font-bold text-white group-hover:text-warning transition-colors">{w.topic_name}</p>
                                    <ArrowUpRight size={14} className="text-warning" />
                                </div>
                                <div className="flex justify-between items-end mt-2">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] text-text-muted uppercase font-bold">Trend</span>
                                        <span className="text-[10px] text-secondary">+{w.improvement}%</span>
                                    </div>
                                    <span className="text-sm font-black text-warning">{w.latest_accuracy}%</span>
                                </div>
                            </div>
                        )) : <p className="text-xs text-text-muted italic px-2">Start practicing to see trends.</p>}
                    </div>
                </div>

                {/* Column 3: MASTERED (TICKS) */}
                <div className="space-y-4">
                    <h4 className="text-xs font-bold text-secondary uppercase tracking-widest flex items-center gap-2 bg-secondary/10 p-2 rounded-lg">
                        <CheckCircle size={14} /> Mastered ({strongTopics.length})
                    </h4>
                    <div className="space-y-2">
                        {strongTopics.length > 0 ? strongTopics.map((w, i) => (
                            <div key={i} className="p-3 bg-surface border border-secondary/20 rounded-xl flex justify-between items-center relative overflow-hidden">
                                <div className="absolute right-[-10px] top-[-10px] opacity-10">
                                    <CheckCircle size={60} className="text-secondary" />
                                </div>
                                <div className="z-10">
                                    <p className="text-sm font-bold text-white">{w.topic_name}</p>
                                    <p className="text-[10px] text-text-muted uppercase font-bold">Consistency High</p>
                                </div>
                                <div className="text-right z-10 flex flex-col items-end">
                                    <CheckCircle size={16} className="text-secondary mb-1" />
                                    <span className="text-sm font-black text-secondary">{w.latest_accuracy}%</span>
                                </div>
                            </div>
                        )) : <p className="text-xs text-text-muted italic px-2">Master topics to see them here.</p>}
                    </div>
                </div>
            </div>
          </div>

          {/* ═══════════ DETAILED TEST HISTORY ═══════════ */}
          <div className="glass-card">
            <h3 className="text-lg font-bold text-white mb-6 px-1">Mock Test History — Detailed Analysis</h3>
            <div className="space-y-3">
              {history.map((test, i) => (
                <div key={test.id} className="group">
                  {/* Test Summary Row */}
                  <div 
                    className={`p-4 rounded-xl border cursor-pointer transition-all duration-300 ${expandedTest === test.id ? 'bg-surface-light border-primary ring-2 ring-primary/20' : 'bg-surface border-border hover:border-text-muted'}`}
                    onClick={() => loadTestDetail(test.id)}
                  >
                    <div className="flex flex-wrap justify-between items-center gap-4">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg ${test.is_passed ? 'bg-secondary/10 text-secondary border border-secondary/30' : 'bg-danger/10 text-danger border border-danger/30'}`}>
                          {Math.round(test.percentage)}%
                        </div>
                        <div>
                          <p className="font-bold text-white group-hover:text-primary transition-colors">
                            Mock Test #{history.length - i}
                          </p>
                          <p className="text-xs text-text-muted flex items-center gap-2">
                             <Clock size={12} /> {new Date(test.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} • {Math.floor(test.time_taken_seconds / 60)}m used
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-6">
                        <div className="hidden sm:block text-center border-x border-white/5 px-4">
                           <p className="text-[10px] text-text-muted uppercase font-bold tracking-widest mb-1">CBT Score</p>
                           <p className="font-display font-bold text-white">{test.raw_score.toFixed(2)}</p>
                        </div>
                        <div className="text-center">
                           <p className="text-[10px] text-text-muted uppercase font-bold tracking-widest mb-1">Merit /75</p>
                           <p className="font-display font-bold text-primary">{test.merit_score.toFixed(1)}</p>
                        </div>
                        <div className="flex items-center gap-2 ml-2">
                           <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${test.is_passed ? 'bg-secondary text-surface' : 'bg-danger text-surface'}`}>
                             {test.is_passed ? 'Passed' : 'Failed'}
                           </span>
                           {expandedTest === test.id ? <ChevronUp size={20} className="text-primary" /> : <ChevronDown size={20} className="text-text-muted group-hover:text-white" />}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Detail */}
                  {expandedTest === test.id && (
                    <div className="mt-2 p-6 bg-surface-dark rounded-xl border border-primary/30 animate-slide-up shadow-2xl">
                      {detailLoading ? (
                        <div className="flex flex-col items-center justify-center py-12 gap-4">
                            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
                            <p className="text-sm text-text-muted font-bold animate-pulse">Analyzing per-question performance...</p>
                        </div>
                      ) : testDetail && testDetail.answers ? (
                        <div className="space-y-6">
                          <div className="flex flex-wrap justify-between items-center gap-4 bg-surface p-4 rounded-xl border border-border">
                            <h4 className="font-bold text-white">Full Review: {testDetail.answers.length} Questions</h4>
                            <div className="flex items-center gap-6">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-secondary"></div>
                                    <span className="text-xs font-bold text-text-muted">{testDetail.correct} Correct</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-danger"></div>
                                    <span className="text-xs font-bold text-text-muted">{testDetail.wrong} Incorrect</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-text-muted"></div>
                                    <span className="text-xs font-bold text-text-muted">{testDetail.skipped} Skipped</span>
                                </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 gap-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                            {testDetail.answers.map((ans, idx) => (
                              <div key={idx} className={`p-5 rounded-2xl border-2 transition-all ${ans.is_correct ? 'bg-secondary/5 border-secondary/10' : ans.selected_answer === 'skipped' ? 'bg-surface border-border' : 'bg-danger/5 border-danger/10'}`}>
                                <div className="flex justify-between items-start gap-4 mb-4">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="px-2 py-0.5 rounded bg-surface-light text-[10px] font-bold text-text-muted uppercase">Q. {idx + 1}</span>
                                        {ans.topic_name && <span className="px-2 py-0.5 rounded bg-primary/10 text-[10px] font-bold text-primary uppercase">{ans.topic_name}</span>}
                                    </div>
                                    <p className="text-white font-semibold leading-relaxed">{ans.question_text}</p>
                                  </div>
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${ans.is_correct ? 'bg-secondary text-surface' : ans.selected_answer === 'skipped' ? 'bg-text-muted text-surface' : 'bg-danger text-surface'}`}>
                                    {ans.is_correct ? <CheckCircle size={20} /> : ans.selected_answer === 'skipped' ? <Minus size={20} /> : <XCircle size={20} />}
                                  </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                                  {['a', 'b', 'c', 'd'].map(opt => {
                                    const optKey = `option_${opt}`;
                                    const isCorrectOpt = opt.toUpperCase() === ans.correct_answer;
                                    const isSelectedOpt = opt.toUpperCase() === ans.selected_answer;
                                    
                                    let variantClass = "bg-surface border-border text-text-muted";
                                    if (isCorrectOpt) variantClass = "bg-secondary/20 border-secondary text-secondary font-bold ring-2 ring-secondary/20";
                                    else if (isSelectedOpt && !ans.is_correct) variantClass = "bg-danger/20 border-danger text-danger font-bold";

                                    return (
                                      <div key={opt} className={`p-3 rounded-xl border text-sm flex items-center gap-3 ${variantClass}`}>
                                        <span className="w-6 h-6 rounded-lg bg-black/20 flex items-center justify-center font-bold text-[10px] uppercase">{opt}</span>
                                        <span className="flex-1">{ans[optKey]}</span>
                                      </div>
                                    );
                                  })}
                                </div>

                                {(ans.explanation || ans.why_others_wrong) && (
                                    <div className="mt-4 pt-4 border-t border-white/5 space-y-3">
                                        {ans.explanation && (
                                            <div className="text-xs leading-relaxed text-text">
                                                <strong className="text-secondary block mb-1 uppercase tracking-widest text-[9px]">Correct Explanation:</strong>
                                                <ReactMarkdown className="prose prose-invert prose-xs max-w-none">{ans.explanation}</ReactMarkdown>
                                            </div>
                                        )}
                                        {ans.why_others_wrong && !ans.is_correct && (
                                            <div className="text-xs leading-relaxed text-text">
                                                <strong className="text-warning block mb-1 uppercase tracking-widest text-[9px]">Concept Analysis:</strong>
                                                <ReactMarkdown className="prose prose-invert prose-xs max-w-none">{ans.why_others_wrong}</ReactMarkdown>
                                            </div>
                                        )}
                                    </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="py-12 text-center space-y-4">
                           <AlertCircle size={40} className="text-text-muted mx-auto" />
                           <p className="text-text-muted font-medium">No deep-analysis data available for legacy test results.</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default History;
