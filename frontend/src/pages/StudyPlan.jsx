import React, { useEffect, useState } from 'react';
import { fetchAPI } from '../utils/api';
import { Calendar, CheckCircle, Circle, PlayCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

const StudyPlan = () => {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPlans = async () => {
      try {
        const data = await fetchAPI('/syllabus/study-plan');
        setPlans(data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    loadPlans();
  }, []);

  if (loading) return <div className="flex justify-center mt-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>;

  return (
    <div className="max-w-4xl mx-auto pb-20">
      <header className="mb-8">
        <div className="inline-flex items-center justify-center p-3 bg-primary/20 text-primary rounded-xl mb-4">
          <Calendar size={28} />
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">15-Day Exam Crash Plan</h1>
        <p className="text-text-muted text-lg">Follow this structured plan to guarantee exam readiness.</p>
      </header>

      <div className="space-y-4 relative before:absolute before:inset-0 before:ml-6 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
        {plans.map((plan, index) => {
          const isToday = index === 0; // Mock current day
          
          return (
            <div key={plan.day} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
              <div className="flex items-center justify-center w-12 h-12 rounded-full border-4 border-background bg-surface-light text-text-muted font-bold z-10 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-[0_0_0_4px_var(--background)]">
                {plan.is_completed ? (
                  <CheckCircle className="text-secondary" size={24} />
                ) : isToday ? (
                  <Circle className="text-primary fill-primary/20" size={24} />
                ) : (
                  <span>{plan.day}</span>
                )}
              </div>
              
              <div className="w-[calc(100%-4rem)] md:w-[calc(50%-3rem)] glass-card p-5 transition-transform hover:scale-[1.02]">
                <div className="flex justify-between items-start mb-2">
                  <span className={`text-xs font-bold px-2 py-1 rounded border uppercase tracking-wider ${
                    plan.type === 'learning' ? 'bg-primary/10 border-primary/30 text-primary' :
                    plan.type === 'practice' ? 'bg-secondary/10 border-secondary/30 text-secondary' :
                    plan.type === 'mock' ? 'bg-danger/10 border-danger/30 text-danger' :
                    'bg-warning/10 border-warning/30 text-warning'
                  }`}>
                    {plan.type}
                  </span>
                  <span className="text-sm font-medium text-text-muted">Day {plan.day}</span>
                </div>
                
                <h3 className="text-lg font-bold text-white mb-1">{plan.title}</h3>
                <p className="text-sm text-text-muted mb-4">{plan.title_hi}</p>
                
                <div className="flex items-center justify-between mt-auto">
                  <div className="text-xs text-text-muted">
                    <span className="font-bold text-text">{plan.target_questions}</span> MCQs Target
                  </div>
                  
                  <Link 
                    to={plan.type === 'learning' ? '/syllabus' : '/practice'}
                    className={`flex items-center gap-1 text-sm font-medium ${isToday ? 'text-primary' : 'text-text-muted hover:text-white'} transition-colors`}
                  >
                    Start <PlayCircle size={16} />
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default StudyPlan;
