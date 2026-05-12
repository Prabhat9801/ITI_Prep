import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { fetchAPI } from '../utils/api';
import { Play, CheckCircle, XCircle, AlertCircle, RefreshCw, Award, Clock, FileText } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const CATEGORIES = [
  { id: 'gen', name: 'General (UR)', threshold: 40 },
  { id: 'bc', name: 'Backward Class (BC)', threshold: 36.5 },
  { id: 'ebc', name: 'Extremely Backward Class (EBC)', threshold: 34 },
  { id: 'scst', name: 'SC / ST / Women / PWD', threshold: 32 }
];

const Practice = () => {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const topicId = searchParams.get('topic');

  const [session, setSession] = useState(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedOpt, setSelectedOpt] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // Scoring
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  
  // Mock Test State
  const [isMockTest, setIsMockTest] = useState(false);
  const [timeLeft, setTimeLeft] = useState(120 * 60);
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [showCategorySelect, setShowCategorySelect] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [answersLog, setAnswersLog] = useState([]); // Per-question answer tracking

  useEffect(() => {
    let timer;
    if (session && isMockTest && timeLeft > 0 && currentIdx < session.questions.length) {
      timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            // Auto submit
            setCurrentIdx(session.questions.length);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [session, isMockTest, timeLeft, currentIdx]);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const startTopicPractice = async () => {
    setLoading(true);
    setIsMockTest(false);
    try {
      const data = await fetchAPI('/practice/start-session', {
        method: 'POST',
        body: JSON.stringify({ 
          topic_id: topicId ? parseInt(topicId) : null,
          count: 10 
        })
      });
      setSession(data);
      resetState();
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const startMockTest = async () => {
    setErrorMsg(null);
    setLoading(true);
    setIsMockTest(true);
    try {
      const data = await fetchAPI('/practice/mock-test');
      if (data.error || !data.questions || data.questions.length === 0) {
        throw new Error(data.error || "No questions found in database. Please seed the database first.");
      }
      setSession(data);
      setTimeLeft(120 * 60);
      resetState();
      setShowCategorySelect(false);
    } catch (error) {
      console.error(error);
      setErrorMsg(error.message || "Failed to connect to backend server.");
      setIsMockTest(false);
    } finally {
      setLoading(false);
    }
  };

  const resetState = () => {
    setCurrentIdx(0);
    setSelectedOpt(null);
    setResult(null);
    setCorrectCount(0);
    setWrongCount(0);
    setAnswersLog([]);
  };

  const handleOptionClick = async (option) => {
    if (selectedOpt || !session) return;
    
    setSelectedOpt(option);
    const q = session.questions[currentIdx];
    
    if (isMockTest) {
      // In Mock test, we calculate immediately locally
      const isCorrect = option.toUpperCase() === q.correct_answer.toUpperCase();
      if (isCorrect) setCorrectCount(c => c + 1);
      else setWrongCount(w => w + 1);
      
      // Log this answer for detailed tracking
      setAnswersLog(prev => [...prev, {
        question_id: q.id,
        question_text: q.question,
        option_a: q.option_a,
        option_b: q.option_b,
        option_c: q.option_c,
        option_d: q.option_d,
        selected_answer: option.toUpperCase(),
        correct_answer: q.correct_answer,
        is_correct: isCorrect,
        explanation: q.explanation || "",
        why_others_wrong: q.why_others_wrong || "",
        subject_name: '',
        topic_name: ''
      }]);
      
      setResult({
        is_correct: isCorrect,
        correct_answer: q.correct_answer,
        explanation: q.explanation || "Mock test mode.",
        why_others_wrong: q.why_others_wrong || ""
      });
    } else {
      // Normal practice submits to backend
      try {
        const res = await fetchAPI('/practice/submit-answer', {
          method: 'POST',
          body: JSON.stringify({
            question_id: q.id,
            selected_answer: option,
            time_taken: 15
          })
        });
        setResult(res);
        if (res.is_correct) setCorrectCount(c => c + 1);
        else setWrongCount(w => w + 1);
      } catch (error) {
        console.error(error);
      }
    }
  };

  const nextQuestion = () => {
    if (isMockTest && !selectedOpt) {
      // Log as skipped
      const q = session.questions[currentIdx];
      setAnswersLog(prev => [...prev, {
        question_id: q.id,
        question_text: q.question,
        option_a: q.option_a,
        option_b: q.option_b,
        option_c: q.option_c,
        option_d: q.option_d,
        selected_answer: 'skipped',
        correct_answer: q.correct_answer,
        is_correct: false,
        explanation: q.explanation || "",
        why_others_wrong: q.why_others_wrong || "",
        subject_name: '',
        topic_name: ''
      }]);
    }

    if (currentIdx < session.questions.length - 1) {
      setCurrentIdx(i => i + 1);
      setSelectedOpt(null);
      setResult(null);
    } else {
      // End of session
      setCurrentIdx(session.questions.length);
    }
  };

  if (!session && !loading) {
    return (
      <div className="max-w-4xl mx-auto mt-10 animate-fade-in">
        {errorMsg && (
          <div className="bg-danger/10 border border-danger/30 text-danger p-4 rounded-xl mb-6 flex items-center gap-3">
            <AlertCircle size={20} />
            <p className="font-medium">{errorMsg}</p>
          </div>
        )}
        {topicId ? (
          <div className="text-center">
            <h1 className="text-3xl font-bold text-white mb-4">Topic Practice</h1>
            <p className="text-text-muted mb-8">Short adaptive session for focused learning.</p>
            <button onClick={startTopicPractice} className="btn-primary text-lg px-8 py-4 rounded-xl">
              Start 10-Question Practice
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-8">
            <div className="glass-card p-8 text-center flex flex-col items-center justify-center border-primary/30">
              <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center text-primary mb-6">
                <FileText size={32} />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Full Mock Test</h2>
              <p className="text-text-muted mb-6">100 Questions • 120 Minutes • Negative Marking</p>
              <div className="text-sm text-text-muted text-left mb-8 space-y-2 bg-surface p-4 rounded-lg">
                <p>✅ Exact exam simulation</p>
                <p>✅ +1 for Correct, -0.25 for Wrong</p>
                <p>✅ Random questions from all 47 subjects</p>
              </div>
              <button 
                onClick={() => setShowCategorySelect(true)}
                className="btn-primary w-full py-4 rounded-xl text-lg font-bold"
              >
                Take Full Mock Test
              </button>
            </div>
            
            <div className="glass-card p-8 text-center flex flex-col items-center justify-center">
              <div className="w-20 h-20 bg-secondary/20 rounded-full flex items-center justify-center text-secondary mb-6">
                <Play size={32} />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Quick Practice</h2>
              <p className="text-text-muted mb-6">10 Questions • Untimed • No Negative Marking</p>
              <div className="text-sm text-text-muted text-left mb-8 space-y-2 bg-surface p-4 rounded-lg">
                <p>✅ Relaxed learning environment</p>
                <p>✅ Detailed explanations instantly</p>
                <p>✅ Adaptive difficulty</p>
              </div>
              <button 
                onClick={startTopicPractice}
                className="w-full py-4 rounded-xl text-lg font-bold bg-surface border border-border hover:border-secondary hover:text-secondary transition-colors"
              >
                Start Quick Practice
              </button>
            </div>
          </div>
        )}

        {showCategorySelect && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="glass-card max-w-md w-full p-6 border-primary/50 animate-fade-in">
              <h3 className="text-xl font-bold text-white mb-4">Select Your Category</h3>
              <p className="text-text-muted text-sm mb-6">This sets the passing threshold based on official guidelines.</p>
              <div className="space-y-3 mb-8">
                {CATEGORIES.map(c => (
                  <button
                    key={c.id}
                    onClick={() => setCategory(c)}
                    className={`w-full p-4 rounded-xl border text-left flex justify-between items-center transition-colors ${category.id === c.id ? 'bg-primary/20 border-primary text-white' : 'bg-surface border-border text-text-muted hover:border-primary/50'}`}
                  >
                    <span className="font-medium">{c.name}</span>
                    <span className="text-sm bg-background px-2 py-1 rounded-md">{c.threshold}%</span>
                  </button>
                ))}
              </div>
              <div className="flex gap-4">
                <button onClick={() => setShowCategorySelect(false)} className="flex-1 py-3 rounded-xl bg-surface border border-border hover:bg-surface-light">Cancel</button>
                <button onClick={startMockTest} className="flex-1 py-3 rounded-xl btn-primary">Start Exam</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (loading) return <div className="flex justify-center mt-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>;

  // Session Complete Result Screen
  if (session && currentIdx >= session.questions.length) {
    const rawScore = correctCount - (wrongCount * 0.25);
    const finalScore = Math.max(0, rawScore);
    const percentage = (finalScore / session.total) * 100;
    const isPassed = percentage >= category.threshold;
    const meritScore = (finalScore * 0.75).toFixed(2);
    const timeTaken = (120 * 60) - timeLeft;
    
    // Auto-save mock test result with per-question answers (fire once)
    useEffect(() => {
      if (isMockTest) {
        fetchAPI('/practice/mock-test/submit', {
          method: 'POST',
          body: JSON.stringify({
            total_questions: session.total,
            attempted: correctCount + wrongCount,
            correct: correctCount,
            wrong: wrongCount,
            skipped: session.total - (correctCount + wrongCount),
            raw_score: parseFloat(finalScore.toFixed(2)),
            percentage: parseFloat(percentage.toFixed(2)),
            merit_score: parseFloat(meritScore),
            category: category.name,
            category_threshold: category.threshold,
            is_passed: isPassed,
            time_taken_seconds: timeTaken,
            answers: answersLog
          })
        }).catch(e => console.error('Failed to save mock test:', e));
      }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    return (
      <div className="max-w-2xl mx-auto text-center mt-10 animate-fade-in glass-card p-8">
        <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 ${isPassed ? 'bg-secondary/20 text-secondary' : 'bg-danger/20 text-danger'}`}>
          {isPassed ? <Award size={48} /> : <AlertCircle size={48} />}
        </div>
        
        <h2 className="text-3xl font-bold text-white mb-2">
          {isPassed ? 'Congratulations! You Passed.' : 'Keep Practicing. You Failed.'}
        </h2>
        <p className="text-text-muted mb-8">
          Category Threshold: {category.threshold}% | Your Percentage: {percentage.toFixed(2)}%
        </p>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-surface p-4 rounded-xl border border-border">
            <p className="text-sm text-text-muted mb-1">Attempted</p>
            <p className="text-2xl font-bold text-white">{correctCount + wrongCount}/{session.total}</p>
          </div>
          <div className="bg-secondary/10 p-4 rounded-xl border border-secondary/30">
            <p className="text-sm text-text-muted mb-1">Correct (+1)</p>
            <p className="text-2xl font-bold text-secondary">{correctCount}</p>
          </div>
          <div className="bg-danger/10 p-4 rounded-xl border border-danger/30">
            <p className="text-sm text-text-muted mb-1">Wrong (-0.25)</p>
            <p className="text-2xl font-bold text-danger">{wrongCount}</p>
          </div>
          <div className="bg-primary/10 p-4 rounded-xl border border-primary/30">
            <p className="text-sm text-text-muted mb-1">Raw Score</p>
            <p className="text-2xl font-bold text-primary">{finalScore.toFixed(2)}</p>
          </div>
        </div>

        {isMockTest && (
          <div className="bg-gradient-to-r from-primary/20 to-secondary/20 p-6 rounded-xl border border-primary/30 mb-8 text-left">
            <h3 className="font-bold text-white mb-2 flex items-center gap-2"><FileText size={18} /> Official Merit Conversion</h3>
            <p className="text-text-muted text-sm leading-relaxed">
              As per BTSC guidelines, CBT marks are multiplied by 0.75 for final merit. 
              <br/><br/>
              Your Merit Score: <strong className="text-white text-lg">{finalScore.toFixed(2)} × 0.75 = {meritScore} / 75</strong>
            </p>
          </div>
        )}

        <button 
          onClick={() => { setSession(null); resetState(); }}
          className="btn-primary px-8 py-3 rounded-xl flex items-center justify-center gap-2 mx-auto"
        >
          <RefreshCw size={18} /> Take Another Test
        </button>
      </div>
    );
  }

  const q = session.questions[currentIdx];

  return (
    <div className="max-w-3xl mx-auto pb-20">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold text-white mb-1">Question {currentIdx + 1} of {session.total}</h2>
          <div className="flex gap-2 text-xs">
            <span className="px-2 py-0.5 bg-surface rounded-full border border-border text-text-muted">{q.difficulty}</span>
            {isMockTest && <span className="px-2 py-0.5 bg-danger/10 rounded-full border border-danger/30 text-danger">-0.25 Negative Marking</span>}
          </div>
        </div>
        
        {isMockTest && (
          <div className={`flex items-center gap-2 font-mono text-xl font-bold px-4 py-2 rounded-xl border ${timeLeft < 300 ? 'bg-danger/20 border-danger text-danger animate-pulse' : 'bg-surface border-border text-white'}`}>
            <Clock size={20} />
            {formatTime(timeLeft)}
          </div>
        )}
      </div>

      <div className="w-full bg-surface-light rounded-full h-2 mb-8">
        <div 
          className="bg-primary h-2 rounded-full transition-all duration-300" 
          style={{ width: `${((currentIdx) / session.total) * 100}%` }}
        ></div>
      </div>

      <div className="glass-card mb-6 border-primary/20">
        <h3 className="text-xl font-medium text-white mb-6 leading-relaxed">
          {q.question}
        </h3>

        <div className="space-y-3">
          {['a', 'b', 'c', 'd'].map((opt) => {
            const isSelected = selectedOpt === opt;
            const isCorrect = result && opt.toUpperCase() === result.correct_answer;
            const isWrongSelected = isSelected && result && !result.is_correct;

            let btnClass = "w-full text-left p-4 rounded-xl border transition-all duration-200 ";
            
            if (!selectedOpt) {
              btnClass += "bg-surface border-border hover:border-primary hover:bg-surface-light cursor-pointer";
            } else if (isCorrect) {
              btnClass += "bg-secondary/20 border-secondary text-white";
            } else if (isWrongSelected) {
              btnClass += "bg-danger/20 border-danger text-white";
            } else {
              btnClass += "bg-surface border-border opacity-50 cursor-not-allowed";
            }

            return (
              <button
                key={opt}
                disabled={!!selectedOpt}
                onClick={() => handleOptionClick(opt)}
                className={btnClass}
              >
                <div className="flex items-center justify-between">
                  <div className="flex gap-3">
                    <span className="font-bold uppercase text-text-muted w-6">{opt}.</span>
                    <span className="font-medium">{q[`option_${opt}`]}</span>
                  </div>
                  {isCorrect && <CheckCircle className="text-secondary" size={20} />}
                  {isWrongSelected && <XCircle className="text-danger" size={20} />}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {result && (
        <div className="animate-fade-in space-y-4">
          <div className={`p-4 rounded-xl border ${result.is_correct ? 'bg-secondary/10 border-secondary/30' : 'bg-warning/10 border-warning/30'}`}>
            <h4 className={`font-bold flex items-center gap-2 mb-2 ${result.is_correct ? 'text-secondary' : 'text-warning'}`}>
              {result.is_correct ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
              {result.is_correct ? 'Excellent! Correct Answer.' : 'Incorrect.'}
            </h4>
            
            {!isMockTest && (
              <div className="text-sm text-text prose prose-invert prose-p:mb-2 max-w-none mt-2">
                <ReactMarkdown>{result.explanation}</ReactMarkdown>
                {!result.is_correct && result.why_others_wrong && (
                  <div className="mt-4 pt-4 border-t border-white/10">
                    <strong className="text-warning block mb-1">Why other options are wrong:</strong>
                    <ReactMarkdown>{result.why_others_wrong}</ReactMarkdown>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-4">
            <button 
              onClick={nextQuestion}
              className="btn-primary px-8 py-3 rounded-xl font-bold"
            >
              {currentIdx < session.questions.length - 1 ? 'Next Question' : 'View Final Results'}
            </button>
          </div>
        </div>
      )}
      
      {!result && isMockTest && (
         <div className="flex justify-end">
            <button 
              onClick={nextQuestion}
              className="px-6 py-3 rounded-xl font-bold bg-surface border border-border hover:border-text-muted text-text-muted transition-colors"
            >
              Skip Question (0 Marks)
            </button>
         </div>
      )}
    </div>
  );
};

export default Practice;
