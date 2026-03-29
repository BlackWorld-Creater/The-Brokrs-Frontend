import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, User, Zap, Paperclip, Smile, Settings, ChevronLeft, Calendar, HelpCircle, Truck, CreditCard } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSocket } from '../../hooks/useSocket';
import { supportAPI } from '../../services/api';
import useAuthStore from '../../store/authStore';
import toast from 'react-hot-toast';

const CustomerSupportChat = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentView, setCurrentView] = useState('tickets'); // 'tickets' | 'chat'
  const [tickets, setTickets] = useState([]);
  const [activeTicketId, setActiveTicketId] = useState(null);
  
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [agentTyping, setAgentTyping] = useState(null);

  const { socket, on, emit } = useSocket();
  const { isAuthenticated, user } = useAuthStore();
  const typingTimeoutRef = useRef(null);
  
  const scrollRef = useRef(null);
  const chatContainerRef = useRef(null);
  const audioRef = useRef(new Audio('https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3'));

  // Remove old polling logic. Use Sockets instead.
  useEffect(() => {
    if (!socket || !activeTicketId) return;
    
    // Join room whenever active ticket changes
    emit('support:room:join', activeTicketId);

    const cleanup = [
      on('support:message:new', (msg) => {
        if (msg.ticketId === activeTicketId || msg.ticket_id === activeTicketId) {
          setMessages(prev => {
            // 1. Avoid exact ID duplicates
            if (prev.find(m => m.id === msg.id)) return prev;
            
            // 2. Check for optimistic "temp" message with same text and type
            const tempIndex = prev.findIndex(m => 
              m.id?.toString().startsWith('temp-') && 
              m.text === (msg.content || msg.text) &&
              (m.type === (msg.senderType || msg.type))
            );

            if (tempIndex !== -1) {
              const next = [...prev];
              next[tempIndex] = {
                ...msg,
                type: msg.senderType || msg.type,
                text: msg.content || msg.text,
                time: msg.created_at ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'
              };
              return next;
            }

            return [...prev, {
              ...msg,
              type: msg.senderType || msg.type,
              text: msg.content || msg.text,
              time: msg.created_at ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'
            }];
          });

          // Notification logic for guests
          if ((msg.senderType === 'agent' || msg.senderType === 'bot') && !isOpen) {
            toast('New message from Support', { 
              icon: '💬',
              onClick: () => setIsOpen(true)
            });
            audioRef.current.play().catch(() => {});
          }
        }
      }),
      on('typing:start', ({ ticketId, firstName }) => {
        if (ticketId === activeTicketId) {
          setAgentTyping(firstName || 'Agent');
        }
      }),
      on('typing:stop', ({ ticketId }) => {
        if (ticketId === activeTicketId) {
          setAgentTyping(null);
        }
      }),
      on('support:handover', (data) => {
        const name = data?.agentName || data?.name || data?.first_name || 
                     (data?.agent?.first_name ? `${data.agent.first_name} ${data.agent.last_name || ''}`.trim() : null) ||
                     (data?.user?.first_name ? `${data.user.first_name} ${data.user.last_name || ''}`.trim() : null) ||
                     'Support Specialist';
        setMessages(prev => [...prev, {
          id: 'handover-' + Date.now(),
          type: 'system',
          text: `Agent ${name} has joined the conversation.`,
          time: 'System'
        }]);
      }),
      on('support:ticket:updated', (ticket) => {
        if (ticket.id === activeTicketId && ticket.assignedTo) {
          const agent = ticket.assignedTo;
          const name = agent.first_name ? `${agent.first_name} ${agent.last_name || ''}`.trim() : 
                       agent.name || agent.firstName || 'Support Specialist';
          
          // Only add handover message if we didn't have an assignee before
          setMessages(prev => {
            const alreadyHandover = prev.some(m => m.type === 'system' && m.text.includes('joined'));
            if (alreadyHandover) return prev;

            return [...prev, {
              id: 'handover-' + Date.now(),
              type: 'system',
              text: `Agent ${name} has joined the conversation.`,
              time: 'System'
            }];
          });
        }
      }),
      on('support:ticket:resolved', ({ id }) => {
        if (id === activeTicketId) {
          setMessages(prev => [...prev, {
            id: 'resolved-' + Date.now(),
            type: 'system',
            text: `This ticket has been marked as resolved.`,
            time: 'System'
          }]);
        }
      })
    ];

    return () => cleanup.forEach(fn => fn && fn());
  }, [socket, activeTicketId, on, emit]);

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
      const res = await supportAPI.getTickets();
      if (res.data.success || res.data.status === 'success') {
        setTickets(res.data.data);
      }
    } catch (err) {
      console.error("Failed to fetch tickets", err);
    }
  };

  const fetchMessages = async (ticketId, load = true) => {
    if (load) setLoading(true);
    try {
      const res = await supportAPI.getMessages(ticketId);
      if ((res.data.success || res.data.status === 'success') && Array.isArray(res.data.data)) {
        setMessages(res.data.data.map(m => ({
          ...m,
          type: m.senderType || m.type,
          text: m.content || m.text,
          time: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        })));
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
      const payload = { 
        category, 
        title, 
        description: "New user inquiry." 
      };
      
      if (!isAuthenticated) {
        payload.guestName = "Guest User"; // In a real app, you might ask for this
        payload.guestEmail = "guest@example.com";
      }

      const res = await supportAPI.createTicket(payload);
      if (res.data.success || res.data.status === 'success') {
        const ticketId = res.data.data.id || res.data.data.ticket?.id;
        setActiveTicketId(ticketId);
        setCurrentView('chat');
        // Join room immediately
        emit('support:room:join', ticketId);
        fetchMessages(ticketId);
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
    
    // Stop typing indicator
    setIsTyping(false);
    emit('typing:stop', { ticketId: activeTicketId });
    clearTimeout(typingTimeoutRef.current);

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
      const res = await supportAPI.sendMessage(activeTicketId, { text: tmpMessage });
      // Emit message:send after successful POST
      if (res.data.success || res.data.status === 'success') {
        emit('message:send', { ticketId: activeTicketId, message: res.data.data });
        // Update the optimistic message with real data if needed or just fetch
        fetchMessages(activeTicketId, false);
      }
    } catch (err) {
      console.error("Failed to send msg", err);
      // Remove optimistic message on error
      setMessages(prev => prev.filter(m => m.id !== optMsg.id));
    }
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    setMessage(val);

    if (!activeTicketId) return;

    if (!isTyping && val.trim().length > 0) {
      setIsTyping(true);
      emit('typing:start', { ticketId: activeTicketId });
    } else if (isTyping && val.trim().length === 0) {
      setIsTyping(false);
      emit('typing:stop', { ticketId: activeTicketId });
    }

    // Auto-stop typing after 2 seconds of inactivity
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      if (isTyping) {
        setIsTyping(false);
        emit('typing:stop', { ticketId: activeTicketId });
      }
    }, 2000);
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
                  {agentTyping && (
                    <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="flex gap-2 items-center text-[11px] text-gray-500 italic pb-2">
                      <div className="flex gap-1">
                        <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                      {agentTyping} is typing...
                    </motion.div>
                  )}
                </div>

                <div className="p-4 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 flex-shrink-0 relative">
                  <form onSubmit={handleSend} className="relative">
                    <input
                      type="text"
                      placeholder="Type your message..."
                      value={message}
                      onChange={handleInputChange}
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
