import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { fetchAPI } from '../utils/api';
import { ArrowLeft, BookOpen, Layers, PenTool, Loader2 } from 'lucide-react';

const TopicDetail = () => {
  const { id } = useParams();
  const [topic, setTopic] = useState(null);
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [level, setLevel] = useState('basic');
  const [loadingContent, setLoadingContent] = useState(false);

  useEffect(() => {
    const loadTopic = async () => {
      try {
        const data = await fetchAPI(`/syllabus/topic/${id}`);
        setTopic(data);
        fetchContent(id, 'basic');
      } catch (error) {
        console.error(error);
        setLoading(false);
      }
    };
    loadTopic();
  }, [id]);

  const fetchContent = async (topicId, selectedLevel) => {
    setLoadingContent(true);
    setLevel(selectedLevel);
    try {
      const data = await fetchAPI(`/syllabus/teach/${topicId}?level=${selectedLevel}`);
      setContent(data.content);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingContent(false);
      setLoading(false);
    }
  };

  if (loading) return <div className="flex justify-center mt-20"><Loader2 className="animate-spin text-primary w-12 h-12" /></div>;
  if (!topic) return <div className="text-center mt-20 text-text-muted">Topic not found</div>;

  return (
    <div className="max-w-4xl mx-auto pb-20">
      <Link to="/syllabus" className="inline-flex items-center gap-2 text-text-muted hover:text-primary mb-6 transition-colors">
        <ArrowLeft size={16} /> Back to Syllabus
      </Link>

      <div className="glass-card mb-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-2 text-secondary text-sm font-medium mb-2">
            <BookOpen size={16} /> {topic.subject?.name}
          </div>
          <h1 className="text-3xl font-bold text-white mb-1">{topic.name}</h1>
          <p className="text-text-muted text-lg mb-6">{topic.name_hi}</p>

          <div className="flex bg-surface p-1 rounded-xl w-fit">
            {[
              { id: 'basic', label: 'ITI Level' },
              { id: 'intermediate', label: 'Diploma' },
              { id: 'advanced', label: 'B.Tech' }
            ].map((lvl) => (
              <button
                key={lvl.id}
                onClick={() => fetchContent(id, lvl.id)}
                disabled={loadingContent}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  level === lvl.id 
                    ? 'bg-primary text-white shadow-md' 
                    : 'text-text-muted hover:text-text hover:bg-surface-light'
                }`}
              >
                {lvl.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-6">
          <div className="glass-card relative min-h-[300px]">
            {loadingContent ? (
              <div className="absolute inset-0 flex items-center justify-center bg-surface/50 backdrop-blur-sm rounded-xl z-20">
                <div className="text-center">
                  <Loader2 className="animate-spin text-primary w-10 h-10 mx-auto mb-2" />
                  <p className="text-text font-medium animate-pulse">AI is generating perfect explanation...</p>
                </div>
              </div>
            ) : null}
            
            <div className={`prose prose-invert prose-primary max-w-none prose-headings:text-white prose-a:text-primary ${loadingContent ? 'opacity-30' : ''}`}>
              <ReactMarkdown>{content || ''}</ReactMarkdown>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass-card">
            <h3 className="font-bold text-white flex items-center gap-2 mb-4">
              <Layers size={18} className="text-secondary" /> Subtopics
            </h3>
            <ul className="space-y-3">
              {topic.subtopics?.map((st, idx) => (
                <li key={st.id} className="flex gap-3 text-sm">
                  <span className="text-primary mt-0.5">•</span>
                  <div>
                    <p className="text-text">{st.name}</p>
                    <p className="text-xs text-text-muted">{st.name_hi}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="glass-card bg-gradient-to-br from-secondary/10 to-transparent border-secondary/20">
            <div className="text-center">
              <div className="w-12 h-12 bg-secondary/20 rounded-full flex items-center justify-center text-secondary mx-auto mb-3">
                <PenTool size={24} />
              </div>
              <h3 className="font-bold text-white mb-2">Ready to Practice?</h3>
              <p className="text-xs text-text-muted mb-4">Test your knowledge on {topic.name}</p>
              <Link 
                to={`/practice?topic=${id}`}
                className="block w-full py-2 bg-secondary hover:bg-secondary-hover text-white rounded-lg font-medium transition-colors"
              >
                Start Quiz
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TopicDetail;
