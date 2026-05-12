import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { fetchAPI } from '../utils/api';

const ChatWidget = ({ onClose }) => {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Namaste! Main aapka AI Teacher hoon. ITI Electronics Mechanic exam me main aapki madad karunga. Aap mujhse koi bhi concept pooch sakte hain.' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsLoading(true);

    try {
      const response = await fetchAPI('/chat/send', {
        method: 'POST',
        body: JSON.stringify({ message: userMsg, topic_context: '' })
      });
      
      setMessages(prev => [...prev, { role: 'assistant', content: response.response }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, connection error. Please try again.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full h-full md:h-full glass flex flex-col md:shadow-2xl md:rounded-2xl overflow-hidden border-t md:border border-primary/30 animate-fade-in bg-background md:bg-transparent">
      {/* Header */}
      <div className="bg-primary/20 border-b border-primary/20 p-4 flex justify-between items-center backdrop-blur-md">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
            <Bot size={18} className="text-white" />
          </div>
          <div>
            <h3 className="font-bold text-white text-sm">AI Teacher</h3>
            <p className="text-xs text-secondary font-medium">Online</p>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl p-3 text-sm ${
              msg.role === 'user' 
                ? 'bg-primary text-white rounded-br-none' 
                : 'bg-surface-light text-text rounded-bl-none'
            }`}>
              {msg.role === 'user' ? (
                msg.content
              ) : (
                <div className="prose prose-invert prose-sm max-w-none prose-p:leading-relaxed">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-surface-light rounded-2xl rounded-bl-none p-3 flex items-center gap-2">
              <Loader2 size={16} className="animate-spin text-primary" />
              <span className="text-xs text-text-muted">Teacher is typing...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-3 bg-surface border-t border-surface-light">
        <form onSubmit={handleSend} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question..."
            className="flex-1 bg-surface-light border border-border rounded-xl px-4 py-2 text-sm text-text focus:outline-none focus:border-primary/50 transition-colors"
          />
          <button 
            type="submit" 
            disabled={!input.trim() || isLoading}
            className="bg-primary hover:bg-primary-hover disabled:opacity-50 text-white rounded-xl p-2 transition-colors flex items-center justify-center"
          >
            <Send size={18} />
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatWidget;
