import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { fetchAPI } from '../utils/api';
import { Book, GraduationCap, Sparkles } from 'lucide-react';

const Syllabus = () => {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const loadSubjects = async () => {
      try {
        const data = await fetchAPI('/syllabus/subjects');
        setSubjects(data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    loadSubjects();
  }, []);

  if (loading) return <div className="flex justify-center mt-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Exam Syllabus & AI Hub</h1>
        <p className="text-text-muted">Apne BTSC ITI Instructor Exam ke subjects select karein aur AI ke saath preparation shuru karein.</p>
        <Link 
          to="/learn"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            marginTop: '16px',
            padding: '12px 24px',
            background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
            borderRadius: '12px',
            color: 'white',
            fontWeight: '600',
            fontSize: '0.95rem',
            textDecoration: 'none',
            transition: 'all 0.2s',
            boxShadow: '0 4px 20px rgba(79, 70, 229, 0.4)'
          }}
        >
          <Sparkles size={18} /> Launch AI Exam Tutor
        </Link>
      </header>

      <div className="space-y-4">
        {subjects.map((subject) => (
          <div key={subject.id} className="glass-card p-0 overflow-hidden transition-all duration-300">
            <div 
              className="p-5 flex items-center justify-between cursor-pointer hover:bg-surface/50"
              onClick={() => navigate(`/learn?subject=${encodeURIComponent(subject.name)}`)}
            >
              <div className="flex items-center gap-4">
                <div 
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shadow-lg"
                  style={{ backgroundColor: `${subject.color}20`, border: `1px solid ${subject.color}50` }}
                >
                  {subject.icon}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">{subject.name}</h3>
                  <p className="text-sm text-text-muted">{subject.name_hi}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <button
                  className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary hover:bg-primary hover:text-white rounded-lg transition-colors text-sm font-medium"
                >
                  <GraduationCap size={16} /> Study with AI
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Syllabus;
