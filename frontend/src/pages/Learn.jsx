import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import './Learn.css';
import ReactMarkdown from 'react-markdown';
import { fetchAPI } from '../utils/api';
import {
  ArrowLeft, BookOpen, ChevronRight, ChevronDown, Send, Bot, User,
  Loader2, Sparkles, Brain, Zap, GraduationCap, PenTool, RefreshCw,
  CheckCircle2, XCircle, ChevronLeft, Lightbulb, RotateCcw, Menu, X
} from 'lucide-react';

const Learn = () => {
  const [searchParams] = useSearchParams();
  const initialSubject = searchParams.get('subject') || '';
  const initialTopic = searchParams.get('topic') || '';

  // Syllabus state
  const [syllabusData, setSyllabusData] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [selectedTopicId, setSelectedTopicId] = useState(null);
  const [selectedSubtopicId, setSelectedSubtopicId] = useState(null);
  const [expandedUnit, setExpandedUnit] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Teaching state
  const [teachingContent, setTeachingContent] = useState('');
  const [teachingLoading, setTeachingLoading] = useState(false);
  const [level, setLevel] = useState('basic');

  // Chat state (inline in learn tab)
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatExpanded, setChatExpanded] = useState(false);
  const chatEndRef = useRef(null);

  // Quiz state
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [quizLoading, setQuizLoading] = useState(false);
  const [currentQuizIdx, setCurrentQuizIdx] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [quizScore, setQuizScore] = useState({ correct: 0, total: 0 });

  // AI Provider state
  const [providers, setProviders] = useState([]);
  const [selectedProvider, setSelectedProvider] = useState('auto');
  const [showProviderMenu, setShowProviderMenu] = useState(false);

  // Active tab: learn or quiz (chat is now inside learn)
  const [activeTab, setActiveTab] = useState('learn');

  // Load syllabus and providers
  useEffect(() => {
    loadSyllabus();
    loadProviders();
  }, []);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Close sidebar on mobile when topic selected
  useEffect(() => {
    if (window.innerWidth < 768 && selectedTopic) {
      setSidebarOpen(false);
    }
  }, [selectedTopic]);

  const loadSyllabus = async () => {
    try {
      const data = await fetchAPI('/syllabus/full');
      setSyllabusData(data.syllabus || []);
      if (initialSubject) {
        const subj = (data.syllabus || []).find(s =>
          s.subject_name.toLowerCase().includes(initialSubject.toLowerCase())
        );
        if (subj) {
          setSelectedSubject(subj);
          if (initialTopic) handleTopicClick(subj, initialTopic);
        }
      }
    } catch (err) {
      console.error('Failed to load syllabus:', err);
    }
  };

  const loadProviders = async () => {
    try {
      const data = await fetchAPI('/ai/providers');
      setProviders(data.providers || []);
    } catch (err) {
      console.error('Failed to load providers:', err);
    }
  };

  const handleSubjectClick = (subject) => {
    if (selectedSubject?.subject_name === subject.subject_name) {
      setSelectedSubject(null);
      return;
    }
    setSelectedSubject(subject);
    setSelectedTopic(null);
    setTeachingContent('');
    setExpandedUnit(null);
    setChatMessages([]);
    setQuizQuestions([]);
    setActiveTab('learn');
  };

  const handleTopicClick = async (subject, topicObj, unitId = null) => {
    const subj = subject || selectedSubject;
    const topicName = typeof topicObj === 'string' ? topicObj : topicObj.name;
    const subId = typeof topicObj === 'string' ? null : topicObj.id;

    setSelectedTopic(topicName);
    setSelectedTopicId(unitId);
    setSelectedSubtopicId(subId);
    setActiveTab('learn');
    setTeachingContent('');
    setChatMessages([{
      role: 'assistant',
      content: `👋 "${topicName}" ke baare mein kuch bhi poocho! Main help karunga.`
    }]);
    setChatExpanded(false);
    setQuizQuestions([]);
    setQuizScore({ correct: 0, total: 0 });

    setTeachingLoading(true);
    try {
      const data = await fetchAPI(
        `/syllabus/teach-topic?subject=${encodeURIComponent(subj?.subject_name || '')}&topic=${encodeURIComponent(topicName)}&level=${level}&provider=${selectedProvider}`
      );
      setTeachingContent(data.content || '');
    } catch (err) {
      setTeachingContent('⚠️ Content load nahi ho paya. Please try again.');
    } finally {
      setTeachingLoading(false);
    }
  };

  const handleLevelChange = async (newLevel) => {
    setLevel(newLevel);
    if (selectedTopic && selectedSubject) {
      setTeachingLoading(true);
      try {
        const data = await fetchAPI(
          `/syllabus/teach-topic?subject=${encodeURIComponent(selectedSubject.subject_name)}&topic=${encodeURIComponent(selectedTopic)}&level=${newLevel}&provider=${selectedProvider}`
        );
        setTeachingContent(data.content || '');
      } catch (err) {
        console.error(err);
      } finally {
        setTeachingLoading(false);
      }
    }
  };

  // Chat
  const handleChatSend = async (e) => {
    e.preventDefault();
    if (!chatInput.trim() || chatLoading) return;
    const userMsg = chatInput.trim();
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setChatLoading(true);
    setChatExpanded(true);

    try {
      const resp = await fetchAPI('/chat/send', {
        method: 'POST',
        body: JSON.stringify({
          message: userMsg,
          topic_context: selectedTopic ? `${selectedSubject?.subject_name} - ${selectedTopic}` : '',
          provider: selectedProvider,
          history: chatMessages.slice(-6)
        })
      });
      setChatMessages(prev => [...prev, { role: 'assistant', content: resp.response }]);
    } catch (err) {
      setChatMessages(prev => [...prev, { role: 'assistant', content: '⚠️ Connection error. Please try again.' }]);
    } finally {
      setChatLoading(false);
    }
  };

  // Quiz
  const handleGenerateQuiz = async () => {
    if (!selectedSubject || !selectedTopic) return;
    setQuizLoading(true);
    setQuizQuestions([]);
    setCurrentQuizIdx(0);
    setSelectedAnswer(null);
    setShowResult(false);
    setQuizScore({ correct: 0, total: 0 });

    try {
      const resp = await fetchAPI('/ai/generate-quiz', {
        method: 'POST',
        body: JSON.stringify({
          subject: selectedSubject.subject_name,
          topic: selectedTopic,
          subject_id: selectedSubject.subject_id,
          topic_id: selectedTopicId,
          subtopic_id: selectedSubtopicId,
          count: 5,
          difficulty: 'mixed',
          provider: selectedProvider
        })
      });
      setQuizQuestions(resp.questions || []);
    } catch (err) {
      console.error(err);
    } finally {
      setQuizLoading(false);
    }
  };

  const handleQuizAnswer = (answer) => {
    if (showResult) return;
    setSelectedAnswer(answer);
    setShowResult(true);
    const q = quizQuestions[currentQuizIdx];
    if (answer === q.correct_answer) {
      setQuizScore(prev => ({ ...prev, correct: prev.correct + 1, total: prev.total + 1 }));
    } else {
      setQuizScore(prev => ({ ...prev, total: prev.total + 1 }));
    }
  };

  const handleNextQuestion = () => {
    setSelectedAnswer(null);
    setShowResult(false);
    setCurrentQuizIdx(prev => prev + 1);
  };

  const providerObj = providers.find(p => p.id === selectedProvider) || { name: 'Auto', icon: '🤖' };

  return (
    <div className="lp">
      {/* ── Top Bar ─── */}
      <header className="lp-top">
        <div className="lp-top-left">
          <button className="lp-menu-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <Link to="/syllabus" className="lp-back"><ArrowLeft size={16} /></Link>
          <h1 className="lp-logo"><GraduationCap size={20} /><span>AI Learning Hub</span></h1>
        </div>
        <div className="lp-top-right">
          <div className="prov-wrap">
            <div className="prov-btn" style={{ cursor: 'default', background: 'rgba(16, 185, 129, 0.15)', borderColor: 'rgba(16, 185, 129, 0.3)', color: '#6ee7b7' }}>
              <span>🤖</span>
              <span className="prov-label">Auto AI Engine</span>
              <span className="prov-spd" style={{ marginLeft: '6px', background: 'rgba(255,255,255,0.1)' }}>smart</span>
            </div>
          </div>
        </div>
      </header>

      <div className="lp-body">
        {/* ── Sidebar Overlay (mobile) ─── */}
        {sidebarOpen && <div className="lp-overlay" onClick={() => setSidebarOpen(false)} />}

        {/* ── Sidebar ─── */}
        <aside className={`lp-side ${sidebarOpen ? 'open' : ''}`}>
          <div className="lp-side-head">
            <BookOpen size={15} /><span>Subjects & Topics</span>
            <button className="lp-side-close" onClick={() => setSidebarOpen(false)}><X size={18} /></button>
          </div>
          <div className="lp-side-list">
            {syllabusData.map((subj, idx) => (
              <div key={idx} className="sb-group">
                <button
                  className={`sb-subj ${selectedSubject?.subject_name === subj.subject_name ? 'on' : ''}`}
                  onClick={() => handleSubjectClick(subj)}
                >
                  <span className="sb-dot" style={{ background: `hsl(${(idx * 37) % 360}, 70%, 60%)` }} />
                  <span className="sb-name">{subj.subject_name}</span>
                  <ChevronRight size={13} className={`sb-chev ${selectedSubject?.subject_name === subj.subject_name ? 'rot' : ''}`} />
                </button>

                {selectedSubject?.subject_name === subj.subject_name && (
                  <div className="sb-topics">
                    {subj.units ? subj.units.map((unit, uidx) => (
                      <div key={uidx} className="sb-unit">
                        <button className="sb-unit-btn"
                          onClick={() => setExpandedUnit(expandedUnit === uidx ? null : uidx)}>
                          <ChevronRight size={11} className={expandedUnit === uidx ? 'rot' : ''} />
                          <span>{unit.unit_title}</span>
                        </button>
                        {expandedUnit === uidx && unit.topics && (
                          <div className="sb-tlist">
                            {(unit.topic_details || unit.topics).map((t, tidx) => {
                              const tName = typeof t === 'string' ? t : t.name;
                              return (
                                <button key={tidx}
                                  className={`sb-topic ${selectedTopic === tName ? 'on' : ''}`}
                                  onClick={() => handleTopicClick(subj, t, unit.unit_id)}>
                                  <Lightbulb size={11} /><span>{tName}</span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )) : null}
                    {subj.topics && !subj.units ? (
                      <div className="sb-tlist">
                        {subj.topics.map((t, tidx) => (
                          <button key={tidx}
                            className={`sb-topic ${selectedTopic === t ? 'on' : ''}`}
                            onClick={() => handleTopicClick(subj, t)}>
                            <Lightbulb size={11} /><span>{t}</span>
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            ))}
          </div>
        </aside>

        {/* ── Main Content ─── */}
        <main className="lp-main">
          {!selectedTopic ? (
            <div className="lp-welcome">
              <div className="lp-wel-icon"><Brain size={56} /></div>
              <h2>AI Learning Hub 🎓</h2>
              <p>{selectedSubject
                ? `"${selectedSubject.subject_name}" selected. Ab koi topic choose karo!`
                : 'Left side se koi subject aur topic select karo. AI aapko Hinglish mein padhayega!'
              }</p>
              <div className="lp-wel-chips">
                <span><Sparkles size={14} /> AI Teaching</span>
                <span><Bot size={14} /> Chatbot</span>
                <span><PenTool size={14} /> AI Quiz</span>
              </div>
              <button className="lp-open-sb" onClick={() => setSidebarOpen(true)}>
                <Menu size={16} /> Browse Subjects
              </button>
            </div>
          ) : (
            <div className="lp-content">
              {/* Topic Header */}
              <div className="lp-thead">
                <div>
                  <p className="lp-subj-label">{selectedSubject?.subject_name}</p>
                  <h2 className="lp-topic-title">{selectedTopic}</h2>
                </div>
                <div className="lp-levels">
                  {[{ id: 'basic', l: 'ITI', e: '📗' }, { id: 'intermediate', l: 'Diploma', e: '📘' }, { id: 'advanced', l: 'B.Tech', e: '📕' }].map(lv => (
                    <button key={lv.id} className={`lp-lvl ${level === lv.id ? 'on' : ''}`}
                      onClick={() => handleLevelChange(lv.id)} disabled={teachingLoading}>
                      {lv.e} <span className="lp-lvl-text">{lv.l}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Tabs: Learn | Quiz */}
              <div className="lp-tabs">
                <button className={`lp-tab ${activeTab === 'learn' ? 'on' : ''}`} onClick={() => setActiveTab('learn')}>
                  <BookOpen size={15} /> Learn & Ask
                </button>
                <button className={`lp-tab ${activeTab === 'quiz' ? 'on' : ''}`} onClick={() => setActiveTab('quiz')}>
                  <PenTool size={15} /> Quiz
                </button>
              </div>

              {/* ═══ LEARN TAB (with inline chatbot) ═══ */}
              {activeTab === 'learn' && (
                <div className="lp-learn">
                  {/* Teaching Content */}
                  <div className="lp-teach">
                    {teachingLoading ? (
                      <div className="lp-teach-load">
                        <Loader2 className="lp-spin" size={36} />
                        <p>AI is generating your lesson...</p>
                        <small>Using {selectedProvider === 'auto' ? 'best available AI' : providerObj.name}</small>
                      </div>
                    ) : (
                      <div className="lp-teach-body">
                        <ReactMarkdown>{teachingContent}</ReactMarkdown>
                      </div>
                    )}
                  </div>

                  {/* Inline Chatbot */}
                  <div className={`lp-chat ${chatExpanded ? 'expanded' : ''}`}>
                    <button className="lp-chat-header" onClick={() => setChatExpanded(!chatExpanded)}>
                      <div className="lp-chat-header-left">
                        <Bot size={18} />
                        <span>Doubt hai? Yahan poocho! 💬</span>
                      </div>
                      <ChevronDown size={16} className={chatExpanded ? 'rot180' : ''} />
                    </button>

                    {chatExpanded && (
                      <div className="lp-chat-body">
                        <div className="lp-chat-msgs">
                          {chatMessages.map((msg, idx) => (
                            <div key={idx} className={`lp-msg ${msg.role}`}>
                              <div className="lp-msg-av">
                                {msg.role === 'user' ? <User size={14} /> : <Bot size={14} />}
                              </div>
                              <div className="lp-msg-bub">
                                {msg.role === 'assistant' ? (
                                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                                ) : msg.content}
                              </div>
                            </div>
                          ))}
                          {chatLoading && (
                            <div className="lp-msg assistant">
                              <div className="lp-msg-av"><Bot size={14} /></div>
                              <div className="lp-msg-bub lp-typing"><Loader2 size={13} className="lp-spin" /> Soch raha hoon...</div>
                            </div>
                          )}
                          <div ref={chatEndRef} />
                        </div>
                        <form onSubmit={handleChatSend} className="lp-chat-form">
                          <input value={chatInput} onChange={e => setChatInput(e.target.value)}
                            placeholder={`"${selectedTopic}" ke baare mein poocho...`} className="lp-chat-inp" />
                          <button type="submit" disabled={!chatInput.trim() || chatLoading} className="lp-chat-send">
                            <Send size={16} />
                          </button>
                        </form>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ═══ QUIZ TAB ═══ */}
              {activeTab === 'quiz' && (
                <div className="lp-quiz">
                  {quizQuestions.length === 0 && !quizLoading ? (
                    <div className="lp-quiz-empty">
                      <Sparkles size={44} />
                      <h3>AI Quiz Generator</h3>
                      <p>"{selectedTopic}" pe Hinglish mein 5 naye MCQ generate karo!</p>
                      <button onClick={handleGenerateQuiz} className="lp-gen-btn">
                        <Zap size={16} /> Generate Quiz
                      </button>
                    </div>
                  ) : quizLoading ? (
                    <div className="lp-quiz-load">
                      <Loader2 className="lp-spin" size={36} />
                      <p>AI quiz bana raha hai...</p>
                    </div>
                  ) : currentQuizIdx >= quizQuestions.length ? (
                    <div className="lp-quiz-done">
                      <div className="lp-qd-emoji">🎉</div>
                      <h3>Quiz Complete!</h3>
                      <div className="lp-qd-score">
                        <span className="lp-qd-n">{quizScore.correct}</span>
                        <span className="lp-qd-s">/</span>
                        <span className="lp-qd-t">{quizScore.total}</span>
                      </div>
                      <p className="lp-qd-pct">{Math.round((quizScore.correct / quizScore.total) * 100)}% Accuracy</p>
                      <button onClick={handleGenerateQuiz} className="lp-gen-btn"><RotateCcw size={15} /> More Questions</button>
                    </div>
                  ) : (
                    <div className="lp-q-card">
                      <div className="lp-q-prog">
                        <span>Q {currentQuizIdx + 1}/{quizQuestions.length}</span>
                        <span className="lp-q-sc">Score: {quizScore.correct}/{quizScore.total}</span>
                      </div>
                      <h3 className="lp-q-text">{quizQuestions[currentQuizIdx]?.q}</h3>
                      <div className="lp-q-opts">
                        {['A', 'B', 'C', 'D'].map(opt => {
                          const q = quizQuestions[currentQuizIdx];
                          const val = q[`option_${opt.toLowerCase()}`];
                          const isCorrect = q.correct_answer === opt;
                          const isSelected = selectedAnswer === opt;
                          let cls = 'lp-q-opt';
                          if (showResult) {
                            if (isCorrect) cls += ' correct';
                            else if (isSelected) cls += ' wrong';
                          }
                          return (
                            <button key={opt} className={cls} onClick={() => handleQuizAnswer(opt)} disabled={showResult}>
                              <span className="lp-q-letter">{opt}</span>
                              <span className="lp-q-val">{val}</span>
                              {showResult && isCorrect && <CheckCircle2 size={16} className="lp-q-ico ok" />}
                              {showResult && isSelected && !isCorrect && <XCircle size={16} className="lp-q-ico no" />}
                            </button>
                          );
                        })}
                      </div>
                      {showResult && (
                        <div className="lp-q-exp">
                          <div className={`lp-q-badge ${selectedAnswer === quizQuestions[currentQuizIdx].correct_answer ? 'ok' : 'no'}`}>
                            {selectedAnswer === quizQuestions[currentQuizIdx].correct_answer ? '✅ Sahi Jawab!' : '❌ Galat!'}
                          </div>
                          <p className="lp-q-expt">{quizQuestions[currentQuizIdx].explanation}</p>
                          {quizQuestions[currentQuizIdx].why_wrong && <p className="lp-q-why">{quizQuestions[currentQuizIdx].why_wrong}</p>}
                          <button onClick={handleNextQuestion} className="lp-q-next">
                            {currentQuizIdx < quizQuestions.length - 1 ? 'Agla Question →' : 'Results Dekho'}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default Learn;
