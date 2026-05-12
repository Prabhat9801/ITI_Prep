import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Syllabus from './pages/Syllabus';
import TopicDetail from './pages/TopicDetail';
import Practice from './pages/Practice';
import StudyPlan from './pages/StudyPlan';
import Learn from './pages/Learn';
import History from './pages/History';
import { fetchAPI } from './utils/api';

function App() {
  // Prevent Render Backend from sleeping (Ping every 5 mins)
  useEffect(() => {
    const pingBackend = async () => {
      try { await fetchAPI('/ai/providers'); } catch (e) { /* ignore error */ }
    };
    const interval = setInterval(pingBackend, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Router>
      <Routes>
        {/* Learn page has its own layout */}
        <Route path="/learn" element={<Learn />} />

        {/* Standard layout pages */}
        <Route path="/*" element={
          <Layout>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/syllabus" element={<Syllabus />} />
              <Route path="/topic/:id" element={<TopicDetail />} />
              <Route path="/practice" element={<Practice />} />
              <Route path="/study-plan" element={<StudyPlan />} />
              <Route path="/history" element={<History />} />
            </Routes>
          </Layout>
        } />
      </Routes>
    </Router>
  );
}

export default App;
