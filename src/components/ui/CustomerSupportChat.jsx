import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, User, Zap, Paperclip, Smile, Settings, ChevronLeft, Calendar, HelpCircle, Truck, CreditCard } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const CustomerSupportChat = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentView, setCurrentView] = useState('tickets'); // 'tickets' | 'chat'
  const [tickets, setTickets] = useState([]);
  const [activeTicketId, setActiveTicketId] = useState(null);
  
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const scrollRef = useRef(null);
  const chatContainerRef = useRef(null);

  // Poll for messages
  useEffect(() => {
    let interval;
    if (isOpen && currentView === 'chat' && activeTicketId) {
      interval = setInterval(() => {
        fetchMessages(activeTicketId, false);
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [isOpen, currentView, activeTicketId]);

  // Initial fetch for tickets when opened
  useEffect(() => {
    if (isOpen && currentView === 'tickets') {
      fetchTickets();
    }
  }, [isOpen, currentView]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (chatContainerRef.current && !chatContainerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    if (scrollRef.current && currentView === 'chat') {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, currentView]);

  const fetchTickets = async () => {
    try {
      const res = await fetch('/api/support/tickets');
      const json = await res.json();
      if (json.status === 'success') {
        setTickets(json.data);
      }
    } catch (err) {
      console.error("Failed to fetch tickets", err);
    }
  };

  const fetchMessages = async (ticketId, load = true) => {
    if (load) setLoading(true);
    try {
      const res = await fetch(`/api/support/tickets/${ticketId}/messages`);
      const json = await res.json();
      if (json.status === 'success') {
        setMessages(json.data);
      }
    } catch (err) {
      console.error("Failed to fetch messages", err);
    } finally {
      if (load) setLoading(false);
    }
  };

  const createTicket = async (category, title) => {
    setLoading(true);
    try {
      const res = await fetch('/api/support/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, title, description: "New user inquiry." })
      });
      const json = await res.json();
      if (json.status === 'success') {
        setActiveTicketId(json.data.id);
        setCurrentView('chat');
        fetchMessages(json.data.id);
      }
    } catch (err) {
      console.error('Failed to create ticket', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!message.trim() || !activeTicketId) return;

    const tmpMessage = message;
    setMessage('');

    // Optimistic UI Update
    const optMsg = {
      id: "temp-" + Date.now(),
      type: 'user',
      text: tmpMessage,
      time: 'Sending...',
      timestamp: Date.now()
    };
    setMessages(prev => [...prev, optMsg]);

    try {
      await fetch(`/api/support/tickets/${activeTicketId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: tmpMessage })
      });
      // Immediately fetch again
      fetchMessages(activeTicketId, false);
    } catch (err) {
      console.error("Failed to send msg", err);
    }
  };

  const handleBack = () => {
    setCurrentView('tickets');
    setActiveTicketId(null);
    setMessages([]);
  };

  const handleOpenTicket = (id) => {
    setActiveTicketId(id);
    setCurrentView('chat');
    fetchMessages(id);
  };

  return (
    <div ref={chatContainerRef} className="fixed bottom-6 right-6 z-[100] flex flex-col items-end">
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 20, scale: 0.95, transformOrigin: 'bottom right' }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
            className="mb-4 w-[380px] h-[580px] bg-[rgb(var(--bg-card))] border border-[rgba(var(--border))] rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="p-4 bg-gradient-to-r from-indigo-600 to-indigo-800 text-white flex items-center justify-between shadow-lg relative overflow-hidden flex-shrink-0">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-10 -mt-10" />
              
              <div className="flex items-center gap-3 relative z-10 w-full">
                {currentView === 'chat' ? (
                  <button onClick={handleBack} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors mr-1">
                    <ChevronLeft size={20} />
                  </button>
                ) : (
                  <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-md border border-white/30 shadow-inner">
                    <MessageSquare size={20} />
                  </div>
                )}
                <div className="flex-1">
                  <h3 className="font-bold text-sm leading-tight text-white tracking-wide">
                    {currentView === 'chat' ? `Ticket #${activeTicketId?.slice(-6) || ''}` : 'Help Center'}
                  </h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(74,222,128,0.5)]" />
                    <span className="text-[10px] font-semibold text-white/80 uppercase tracking-wider">
                      {currentView === 'chat' ? 'Agent Online' : 'We are here to help'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 relative z-10">
                  <button onClick={() => setIsOpen(false)} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors">
                    <X size={18} />
                  </button>
                </div>
              </div>
            </div>

            {/* TICKETS VIEW */}
            {currentView === 'tickets' && (
              <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800">
                <div className="p-4">
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 ml-1">Need help with?</h4>
                  <div className="grid grid-cols-2 gap-3 mb-6">
                    <button onClick={() => createTicket('Orders and Delivery', 'Delivery Tracking')} className="flex flex-col items-center justify-center gap-2 p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 group">
                      <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                        <Truck size={20} />
                      </div>
                      <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Orders</span>
                    </button>
                    <button onClick={() => createTicket('Payments', 'Payment Issue')} className="flex flex-col items-center justify-center gap-2 p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 group">
                      <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                        <CreditCard size={20} />
                      </div>
                      <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Payments</span>
                    </button>
                    <button onClick={() => createTicket('Account Services', 'Account Update')} className="flex flex-col items-center justify-center gap-2 p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 group">
                      <div className="w-10 h-10 rounded-full bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                        <User size={20} />
                      </div>
                      <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Account</span>
                    </button>
                    <button onClick={() => createTicket('General Queries', 'Support Question')} className="flex flex-col items-center justify-center gap-2 p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 group">
                      <div className="w-10 h-10 rounded-full bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-400 group-hover:bg-amber-600 group-hover:text-white transition-colors">
                        <HelpCircle size={20} />
                      </div>
                      <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Other</span>
                    </button>
                  </div>

                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 ml-1">Your Conversations</h4>
                  {tickets.length === 0 ? (
                    <div className="text-center py-6 px-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 border-dashed">
                      <p className="text-sm text-gray-400 dark:text-gray-500 font-medium">No previous support history</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {tickets.map(ticket => (
                        <div 
                          key={ticket.id} 
                          onClick={() => handleOpenTicket(ticket.id)}
                          className="p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm hover:border-indigo-300 cursor-pointer transition-all flex items-start gap-3 relative overflow-hidden group"
                        >
                          <div className={`w-1 absolute left-0 top-0 bottom-0 bg-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity`} />
                          <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 flex-shrink-0">
                            <MessageSquare size={18} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-center mb-0.5">
                              <p className="text-sm font-bold text-gray-800 dark:text-gray-100 truncate pr-2">{ticket.category}</p>
                              <span className="text-[10px] font-semibold text-gray-400 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded uppercase tracking-wider">
                                {ticket.status}
                              </span>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate w-[90%]">{ticket.title}</p>
                            <p className="text-[10px] text-gray-400 mt-1 flex items-center gap-1">
                              <Calendar size={10} />
                              {new Date(ticket.updatedAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* CHAT VIEW */}
            {currentView === 'chat' && (
              <>
                <div 
                  ref={scrollRef}
                  className="flex-1 p-5 overflow-y-auto space-y-4 bg-gray-50 dark:bg-gray-900 scroll-smooth border-t border-gray-200 dark:border-gray-800"
                >
                  {loading && messages.length === 0 ? (
                    <div className="flex justify-center items-center h-full text-indigo-400">
                      <Zap className="animate-pulse" size={24} />
                    </div>
                  ) : (
                    messages.map((msg) => (
                      <motion.div 
                        initial={{ opacity: 0, x: msg.type === 'user' ? 20 : -20, y: 10 }}
                        animate={{ opacity: 1, x: 0, y: 0 }}
                        transition={{ duration: 0.3 }}
                        key={msg.id} 
                        className={`flex gap-3 ${msg.type === 'user' ? 'flex-row-reverse' : ''}`}
                      >
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm ${
                          msg.type === 'user' ? 'bg-indigo-600' : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
                        }`}>
                          {msg.type === 'user' ? <User size={14} className="text-white" /> : <Zap size={14} className="text-indigo-500" />}
                        </div>
                        <div className={`max-w-[75%] flex flex-col ${msg.type === 'user' ? 'items-end' : ''}`}>
                          <div className={`px-4 py-2.5 rounded-2xl text-[13px] leading-relaxed shadow-sm ${
                            msg.type === 'user' 
                              ? 'bg-gradient-to-br from-indigo-500 to-indigo-600 text-white rounded-tr-none' 
                              : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 border border-gray-200 dark:border-gray-700 rounded-tl-none'
                          }`}>
                            {msg.text}
                          </div>
                          <span className="text-[9px] mt-1.5 font-medium px-1 text-gray-400 uppercase tracking-tight">{msg.time}</span>
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>

                <div className="p-4 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 flex-shrink-0 relative">
                  <form onSubmit={handleSend} className="relative">
                    <input
                      type="text"
                      placeholder="Type your message..."
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-100 rounded-xl pl-4 pr-24 py-3 text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900/40 transition-all placeholder:text-gray-400"
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                      <button type="button" className="p-1.5 text-gray-400 hover:text-indigo-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all duration-200">
                        <Paperclip size={18} />
                      </button>
                      <button 
                        type="submit"
                        disabled={!message.trim()}
                        className="p-2 ml-1 text-white bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-indigo-700 rounded-lg transition-colors shadow-md shadow-indigo-600/20"
                      >
                        <Send size={16} />
                      </button>
                    </div>
                  </form>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative">
        <motion.button 
          id="customer-support-fab"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          whileHover={{ scale: 1.08, rotate: isOpen ? 90 : 5 }}
          whileTap={{ scale: 0.94 }}
          onClick={() => setIsOpen(!isOpen)}
          className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-[0_8px_30px_rgb(0,0,0,0.12)] transition-all duration-300 group relative overflow-hidden backdrop-blur-md ${
            isOpen 
              ? 'bg-gray-800 dark:bg-gray-100 text-white dark:text-gray-900 rotate-90' 
              : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-600/40 shadow-lg'
          }`}
        >
          {!isOpen && <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />}
          <AnimatePresence mode="wait">
            {isOpen ? (
              <motion.div key="close" initial={{ rotate: -45, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 45, opacity: 0 }} transition={{ duration: 0.2 }}>
                <X size={24} />
              </motion.div>
            ) : (
              <motion.div key="chat" initial={{ rotate: 45, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -45, opacity: 0 }} transition={{ duration: 0.2 }} className="flex items-center justify-center">
                <MessageSquare size={24} />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.button>
        <AnimatePresence>
          {!isOpen && tickets.length > 0 && (
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className="absolute -top-1.5 -right-1.5 z-[110]">
              <span className="relative flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 border-2 border-white dark:border-gray-900"></span>
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default CustomerSupportChat;
