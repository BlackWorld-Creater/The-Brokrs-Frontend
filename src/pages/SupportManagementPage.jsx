import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router-dom';
import { supportAPI } from '../services/api';
import { useSocket } from '../hooks/useSocket';
import useAuthStore from '../store/authStore';
import { 
  MessageSquare, User, Zap, Clock, CheckCircle, 
  Send, ChevronRight, Search, Filter, MoreVertical,
  UserPlus, Check, X, Loader, RefreshCcw, Wifi, WifiOff, Volume2, AlertCircle,
  Eye, Lock
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

/* ── System Message (centered chip) ─────────────────────────────── */
function SystemMessage({ text, time }) {
  return (
    <div className="flex justify-center my-3">
      <span
        className="inline-block text-[11px] font-medium px-4 py-1.5 rounded-full text-center max-w-[85%]"
        style={{
          background: 'rgba(99, 102, 241, 0.08)',
          color: '#6366f1',
          letterSpacing: '0.01em',
          border: '1px solid rgba(99, 102, 241, 0.12)',
        }}
      >
        {text}
      </span>
    </div>
  );
}

export default function SupportManagementPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const { socket, on, emit } = useSocket();
  const [activeTicketId, setActiveTicketId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [userTyping, setUserTyping] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [ownershipFilter, setOwnershipFilter] = useState('all'); // 'all' | 'mine'
  const [showAgentList, setShowAgentList] = useState(false);
  const [isAdminJoining, setIsAdminJoining] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const [socketStatus, setSocketStatus] = useState('connecting');

  const scrollRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const audioRef = useRef(new Audio('https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3'));

  // Queries
  const { data: tickets, isLoading: ticketsLoading, refetch: refetchTickets } = useQuery({
    queryKey: ['support-tickets'],
    queryFn: () => supportAPI.getTickets().then(r => r.data.data),
    refetchInterval: 30000,
  });

  const { data: agents } = useQuery({
    queryKey: ['support-agents'],
    queryFn: () => supportAPI.getAgents().then(r => r.data.data),
    enabled: !!user,
  });

  // Derived state
  const activeTicket = tickets?.find(t => t.id === activeTicketId);
  const activeAgentId = activeTicket?.assignedTo?.id || activeTicket?.assignedTo;
  const isAssignedToMe = activeAgentId === user?.id;
  const isAssignedToOther = activeAgentId && activeAgentId !== user?.id;
  // Admin can only view if ticket is assigned to another agent — no override
  const canSendMessage = activeTicket && activeTicket.status !== 'resolved' && !isAssignedToOther;

  // Load messages when ticket changes
  useEffect(() => {
    if (!activeTicketId) return;
    setMessages([]);
    emit('support:room:join', activeTicketId);
    
    supportAPI.getMessages(activeTicketId)
      .then(res => {
        if ((res.data.success || res.data.status === 'success') && Array.isArray(res.data.data)) {
          setMessages(res.data.data.map(m => ({
            ...m,
            type: m.senderType || m.type,
            text: m.content || m.text
          })));
        }
      })
      .catch(() => toast.error('Failed to load messages'));
  }, [activeTicketId, emit]);

  // Handle deep linking from notifications
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const ticketId = params.get('ticketId');
    if (ticketId && ticketId !== activeTicketId) {
      setActiveTicketId(ticketId);
    }
  }, [location.search, activeTicketId]);

  // Socket listeners
  useEffect(() => {
    if (!socket) return;

    const cleanup = [
      on('connect', () => setSocketStatus('connected')),
      on('disconnect', () => setSocketStatus('disconnected')),
      on('connect_error', () => setSocketStatus('error')),

      on('support:ticket:new', (ticket) => {
        queryClient.setQueryData(['support-tickets'], (old) => [ticket, ...(old || [])]);
        toast.success(`🎫 New ticket: ${ticket.category}`, { duration: 5000 });
        audioRef.current.play().catch(() => {});
      }),
      on('support:message:new', (msg) => {
        const ticketId = msg.ticketId || msg.ticket_id;
        const senderType = msg.senderType || msg.type;
        const msgText = msg.content || msg.text;
        const senderId = msg.senderId || msg.sender_id;

        if (ticketId === activeTicketId) {
          setMessages(prev => {
            // 1. Avoid exact ID duplicates
            if (prev.find(m => m.id === msg.id)) return prev;

            // 2. If this was sent by current user (agent type), check optimistic
            if (senderId === user?.id || senderType === 'agent') {
              const tempIndex = prev.findIndex(m => 
                m.id?.toString().startsWith('temp-') && 
                m.text === msgText
              );
              if (tempIndex !== -1) {
                const next = [...prev];
                next[tempIndex] = { ...msg, type: senderType, text: msgText };
                return next;
              }
              // DUPLICATION FIX: If we already have this exact text and it's from our own agent send, skip adding it as new
              // Use a more robust check: if an ID already exists or content matches exactly 
              const duplicate = prev.some(m => (m.id === msg.id) || (m.text === msgText && m.type === senderType && !m.id?.toString().startsWith('temp-')));
              if (duplicate) return prev;
            }

            return [...prev, { ...msg, type: senderType, text: msgText }];
          });
        } else {
          // If message is for a different ticket and NOT from current user, show notification
          if (senderId !== user?.id) {
            const ticket = tickets?.find(t => t.id === ticketId);
            toast(`💬 New message ${ticket ? `in ${ticket.title}` : ''}`, { 
              icon: '✉️',
              duration: 3000,
              onClick: () => setActiveTicketId(ticketId)
            });
            audioRef.current.play().catch(() => {});
          }
        }
        // Invalidate tickets to update last message/time
        queryClient.invalidateQueries(['support-tickets']);
      }),
      on('typing:start', ({ ticketId }) => {
        if (ticketId === activeTicketId) setUserTyping(true);
      }),
      on('typing:stop', ({ ticketId }) => {
        if (ticketId === activeTicketId) setUserTyping(false);
      }),
      on('support:ticket:updated', (updatedTicket) => {
        const agent = updatedTicket.assignedTo;
        const nameFallback = agent ? `${agent.first_name || agent.firstName || ''} ${agent.last_name || agent.lastName || ''}`.trim() : null;
        
        const ticketWithNames = {
          ...updatedTicket,
          assignedToName: updatedTicket.assignedToName || nameFallback || 'Assigned Agent'
        };

        queryClient.setQueryData(['support-tickets'], (old) => 
          old?.map(t => t.id === ticketWithNames.id ? ticketWithNames : t)
        );

        // Add system message for assignment if viewing this ticket
        if (ticketWithNames.id === activeTicketId && nameFallback) {
          setMessages(prev => {
            // Only add once
            const alreadyHas = prev.some(m => m.type === 'system' && (m.text.includes('assigned') || m.text.includes('joined')));
            if (alreadyHas) return prev;
            return [...prev, {
              id: 'assigned-' + Date.now(),
              type: 'system',
              text: `${nameFallback} was assigned to this conversation`,
              created_at: new Date().toISOString()
            }];
          });
        }

        if (ticketWithNames.id === activeTicketId) {
          queryClient.invalidateQueries(['support-tickets']);
        }
      }),
      on('support:handover', ({ ticketId, agentName }) => {
        if (ticketId === activeTicketId) {
          setMessages(prev => [...prev, {
            id: 'handover-' + Date.now(),
            type: 'system',
            text: `${agentName || 'Support agent'} has taken over this conversation`,
            created_at: new Date().toISOString()
          }]);
        }
        queryClient.invalidateQueries(['support-tickets']);
      }),
      on('support:notification', ({ type, ticketId, title, text }) => {
        queryClient.invalidateQueries(['notifications']);
        if (type === 'message' && ticketId !== activeTicketId) {
          toast(`💬 ${title}: ${text}`, {
            icon: '✉️',
            onClick: () => setActiveTicketId(ticketId)
          });
        }
      }),
      on('support:ticket:resolved', ({ id }) => {
        queryClient.invalidateQueries(['support-tickets']);
        if (id === activeTicketId) {
          setMessages(prev => [...prev, {
            id: 'resolved-' + Date.now(),
            type: 'system',
            text: 'This ticket has been marked as resolved',
            created_at: new Date().toISOString()
          }]);
          toast.success('Ticket resolved');
        }
      })
    ];

    return () => cleanup.forEach(fn => fn && fn());
  }, [socket, activeTicketId, on, queryClient, user?.id, tickets]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Handlers
  const handleAssign = async (ticketId, agentId = null) => {
    try {
      const res = await supportAPI.assign(ticketId, agentId);
      if (res.data.success || res.data.status === 'success') {
        queryClient.invalidateQueries(['support-tickets']);
        toast.success(agentId ? 'Ticket assigned to agent' : 'Ticket assigned to you');
        setShowAgentList(false);
      }
    } catch (err) {
      if (err.response?.status === 429) {
        toast.error('Too many assignment attempts. Please wait.');
      } else {
        toast.error('Failed to assign ticket');
      }
    }
  };

  const handleResolve = async (id) => {
    try {
      const res = await supportAPI.resolve(id);
      if (res.data.success || res.data.status === 'success') {
        queryClient.invalidateQueries(['support-tickets']);
        toast.success('Ticket marked as resolved');
      }
    } catch (err) {
      toast.error('Failed to resolve ticket');
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!message.trim() || !activeTicketId || !canSendMessage) return;

    const tmpText = message;
    setMessage('');
    setIsTyping(false);
    emit('typing:stop', { ticketId: activeTicketId });

    // Optimistic UI Update — shown on RIGHT for agent
    const optMsg = {
      id: "temp-" + Date.now(),
      type: 'agent',
      text: tmpText,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optMsg]);

    try {
      const res = await supportAPI.sendMessage(activeTicketId, { text: tmpText });
      if (res.data.success || res.data.status === 'success') {
        emit('message:send', { ticketId: activeTicketId, message: res.data.data });
      }
    } catch (err) {
      toast.error('Failed to send message');
      setMessages(prev => prev.filter(m => m.id !== optMsg.id));
    }
  };

  const handleInputChange = (e) => {
    setMessage(e.target.value);
    if (!activeTicketId) return;

    if (!isTyping && e.target.value.trim().length > 0) {
      setIsTyping(true);
      emit('typing:start', { ticketId: activeTicketId });
    }

    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      if (isTyping) {
        setIsTyping(false);
        emit('typing:stop', { ticketId: activeTicketId });
      }
    }, 2000);
  };

  const filteredTickets = tickets?.filter(t => {
    const title = t.title?.toLowerCase() || '';
    const category = t.category?.toLowerCase() || '';
    const searchTerm = search?.toLowerCase() || '';
    
    const matchesSearch = title.includes(searchTerm) || 
                          category.includes(searchTerm);
    const matchesFilter = filter === 'all' || t.status === filter;

    const tAgentId = t.assignedTo?.id || t.assignedTo;
    const matchesOwnership = ownershipFilter === 'all' || tAgentId === user?.id;

    return matchesSearch && matchesFilter && matchesOwnership;
  });

  /* ── Render a single message ──────────────────────────────────── */
  const renderMessage = (msg, i) => {
    // System messages → centered chip
    if (msg.type === 'system') {
      return <SystemMessage key={msg.id || i} text={msg.text} time={msg.created_at} />;
    }

    // Agent messages appear on the RIGHT (it's "my" message in admin view)
    const isMine = msg.type === 'agent';

    return (
      <div key={msg.id || i} className={`flex gap-2.5 ${isMine ? 'flex-row-reverse' : 'flex-row'}`}>
        {/* Avatar */}
        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm ${
          isMine 
            ? 'bg-indigo-600' 
            : msg.type === 'bot'
              ? 'bg-gradient-to-br from-violet-500 to-purple-600'
              : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
        }`}>
          {isMine ? (
            <User size={14} className="text-white" />
          ) : msg.type === 'bot' ? (
            <Zap size={14} className="text-white" />
          ) : (
            <User size={14} className="text-indigo-500" />
          )}
        </div>

        {/* Bubble + Time */}
        <div className={`max-w-[70%] flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
          {/* Sender label */}
          {!isMine && (
            <span className={`text-[10px] font-semibold mb-0.5 px-1 ${
              msg.type === 'bot' ? 'text-purple-500' : 'text-gray-500'
            }`}>
              {msg.type === 'bot' ? 'Bot' : msg.senderName || msg.sender_name || 'Customer'}
            </span>
          )}
          {isMine && (
            <span className="text-[10px] font-semibold mb-0.5 px-1 text-indigo-500">You</span>
          )}

          <div className={`px-4 py-2.5 text-sm leading-relaxed shadow-sm ${
            isMine 
              ? 'bg-indigo-600 text-white rounded-2xl rounded-br-md' 
              : msg.type === 'bot'
                ? 'bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 text-gray-800 dark:text-gray-100 border border-violet-200 dark:border-violet-800/40 rounded-2xl rounded-bl-md'
                : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 border border-gray-100 dark:border-gray-700 rounded-2xl rounded-bl-md'
          }`}>
            {msg.text}
          </div>
          <span className="text-[10px] mt-1 text-gray-400 font-medium px-1">
            {msg.created_at ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Pending'}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-[calc(100vh-140px)] gap-4 animate-fade-in">
      {/* Sidebar: Ticket List */}
      <div className="w-80 flex flex-col gap-3">
            <div className="card p-3 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${
                socketStatus === 'connected' ? 'bg-green-500 animate-pulse' : 
                socketStatus === 'connecting' ? 'bg-amber-500 animate-bounce' : 'bg-red-500'
              }`} />
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                {socketStatus}
              </span>
            </div>
            <button 
              onClick={() => refetchTickets()}
              className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-400 transition-colors"
              title="Refresh Tickets"
            >
              <RefreshCcw size={14} className={ticketsLoading ? 'animate-spin' : ''} />
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
            <input 
              type="text" 
              placeholder="Search tickets..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field pl-9 pr-3 py-2 text-sm"
            />
          </div>
          <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
            <button 
              onClick={() => setOwnershipFilter('all')}
              className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all ${
                ownershipFilter === 'all' 
                  ? 'bg-white dark:bg-gray-700 text-indigo-600 shadow-sm' 
                  : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'
              }`}
            >
              All
            </button>
            <button 
              onClick={() => setOwnershipFilter('mine')}
              className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all ${
                ownershipFilter === 'mine' 
                  ? 'bg-white dark:bg-gray-700 text-indigo-600 shadow-sm' 
                  : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'
              }`}
            >
              Mine
            </button>
          </div>
          <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide">
            {['all', 'pending', 'open', 'resolved'].map(f => (
              <button 
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all border ${
                  filter === f 
                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-600/20' 
                    : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 text-gray-500 hover:border-indigo-300'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
          {ticketsLoading ? (
            <div className="flex justify-center py-10 opacity-50"><Loader className="animate-spin" /></div>
          ) : filteredTickets?.length === 0 ? (
            <div className="text-center py-10 text-gray-400 text-sm italic">No tickets found</div>
          ) : (
            filteredTickets?.map(t => (
              <div 
                key={t.id}
                onClick={() => setActiveTicketId(t.id)}
                className={`p-3 rounded-xl border transition-all cursor-pointer relative overflow-hidden group ${
                  activeTicketId === t.id 
                    ? 'bg-indigo-50 dark:bg-indigo-900/10 border-indigo-200 dark:border-indigo-800/50 shadow-sm' 
                    : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 hover:border-indigo-200'
                }`}
              >
                <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                  t.status === 'pending' ? 'bg-amber-400' : 
                  t.status === 'open' ? 'bg-indigo-500' : 'bg-green-500'
                }`} />
                <div className="flex justify-between items-start mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-tighter text-indigo-600 dark:text-indigo-400 truncate max-w-[120px]">
                    {t.category}
                  </span>
                  <span className="text-[9px] text-gray-400 font-medium">
                    {formatDistanceToNow(new Date(t.updatedAt || t.created_at), { addSuffix: true })}
                  </span>
                </div>
                <h4 className="text-sm font-bold text-gray-800 dark:text-gray-100 truncate mb-1">
                  {t.title}
                </h4>
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-1.5">
                    {t.assignedTo ? (
                      <div className="flex items-center gap-1 opacity-80">
                        <User size={10} className="text-gray-400" />
                        <span className="text-[10px] text-gray-500 font-medium">
                          Assignee: {t.assignedToName || (t.assignedTo?.first_name ? `${t.assignedTo.first_name} ${t.assignedTo.last_name}` : 'Assigned Agent')}
                        </span>
                      </div>
                    ) : (
                      <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1">
                        <AlertCircle size={10} /> Unassigned
                      </span>
                    )}
                  </div>
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${
                    t.status === 'pending' ? 'bg-amber-100 text-amber-700' : 
                    t.status === 'open' ? 'bg-indigo-100 text-indigo-700' : 'bg-green-100 text-green-700'
                  }`}>
                    {t.status}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Content: Chat / Detail */}
      <div className="flex-1 flex flex-col card overflow-hidden border-none shadow-xl">
        {!activeTicketId ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-10 opacity-40">
            <MessageSquare size={64} className="mb-4 text-indigo-500" />
            <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">Select a ticket</h3>
            <p className="text-sm max-w-xs mt-2 text-gray-500">Choose a support request from the list to start chatting with the customer.</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  activeTicket?.status === 'pending' ? 'bg-amber-100 text-amber-600' : 
                  activeTicket?.status === 'open' ? 'bg-indigo-100 text-indigo-600' : 'bg-green-100 text-green-600'
                }`}>
                  <MessageSquare size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-800 dark:text-gray-100">
                    {activeTicket?.title}
                  </h3>
                  <p className="text-xs text-gray-400 flex items-center gap-2">
                    <span className="font-semibold text-indigo-500">{activeTicket?.category}</span>
                    <span>·</span>
                    <span>{activeTicket?.guestName || activeTicket?.userName || 'Anonymous User'}</span>
                  </p>
                </div>
              </div>

              {/* Read-only badge for admin when ticket is assigned to another agent */}
              {isAssignedToOther && (
                <div className="flex-1 mx-4 p-2 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/50 rounded-lg flex items-center gap-2 animate-fade-in">
                  <Eye size={14} className="text-amber-600 flex-shrink-0" />
                  <span className="text-xs font-bold text-amber-700 dark:text-amber-400">
                    View only — Handled by {activeTicket.assignedToName || (activeTicket.assignedTo?.first_name ? `${activeTicket.assignedTo.first_name} ${activeTicket.assignedTo.last_name || ''}`.trim() : 'Agent')}
                  </span>
                </div>
              )}

              <div className="flex items-center gap-2">
                <div className="relative">
                  <button 
                    onClick={() => setShowAgentList(!showAgentList)}
                    className="btn-ghost py-1.5 px-3 text-xs flex items-center gap-1.5 text-indigo-600"
                  >
                    <UserPlus size={14} /> {activeTicket?.assignedTo ? 'Reassign' : 'Assign'}
                  </button>
                  
                  {showAgentList && (
                    <div className="absolute right-0 top-full mt-2 w-56 card z-50 p-1 shadow-2xl animate-slide-up border border-indigo-100 dark:border-indigo-900/30">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest p-2 border-b border-gray-50 dark:border-gray-800 mb-1">
                        Select Support Agent
                      </p>
                      <button 
                        onClick={() => handleAssign(activeTicket.id)}
                        className="sidebar-link w-full text-xs flex items-center justify-between group"
                      >
                        <span className="flex items-center gap-2"><User size={13} /> Assign to me</span>
                        <ChevronRight size={10} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                      <div className="max-h-48 overflow-y-auto">
                        {agents?.filter(a => a.id !== user?.id).map(agent => (
                          <button 
                            key={agent.id}
                            onClick={() => handleAssign(activeTicket.id, agent.id)}
                            className="sidebar-link w-full text-xs flex items-center justify-between group"
                          >
                            <span className="flex items-center gap-2">
                              <div className="w-5 h-5 rounded bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-[10px] font-bold text-indigo-500">
                                {agent.first_name?.[0]}{agent.last_name?.[0]}
                              </div>
                              {agent.first_name} {agent.last_name}
                            </span>
                            <ChevronRight size={10} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                          </button>
                        ))}
                      </div>
                      {(!agents || agents.length <= 1) && (
                        <p className="p-3 text-[10px] text-gray-400 italic text-center">No other agents available</p>
                      )}
                    </div>
                  )}
                </div>

                {activeTicket?.status !== 'resolved' && (
                  <button 
                    onClick={() => handleResolve(activeTicket.id)}
                    className="btn-ghost py-1.5 px-3 text-xs flex items-center gap-1.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20"
                  >
                    <CheckCircle size={14} /> Resolve
                  </button>
                )}
                {/* Close Agent List when clicking outside */}
                {showAgentList && <div className="fixed inset-0 z-40" onClick={() => setShowAgentList(false)} />}
              </div>
            </div>

            {/* Chat Area */}
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-5 space-y-3 bg-gray-50/50 dark:bg-gray-900/20 custom-scrollbar"
              style={{
                backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%239C92AC\' fill-opacity=\'0.03\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
              }}
            >
              {messages.map(renderMessage)}
              {userTyping && (
                <div className="flex justify-start">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center">
                      <User size={14} className="text-indigo-500" />
                    </div>
                    <div className="bg-white dark:bg-gray-800 px-4 py-2.5 rounded-2xl rounded-bl-md border border-gray-100 dark:border-gray-700 flex gap-1 items-center">
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '200ms' }} />
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '400ms' }} />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-800 shadow-inner">
              {isAssignedToOther ? (
                /* READ-ONLY banner for admin when another agent handles the ticket */
                <div className="flex items-center justify-center gap-3 py-6 px-4 bg-gray-50/50 dark:bg-gray-900/50 rounded-xl border border-dashed border-gray-200 dark:border-gray-700 backdrop-blur-[2px]">
                  <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/20 flex items-center justify-center text-amber-600 flex-shrink-0 animate-pulse">
                    <Lock size={18} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm text-gray-700 dark:text-gray-200 font-bold">
                      Conversation Frozen
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      Currently being handled by {activeTicket.assignedToName || 'another agent'}.
                    </span>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSend} className="relative">
                  <input 
                    type="text" 
                    value={message}
                    onChange={handleInputChange}
                    placeholder={
                      activeTicket?.status === 'resolved' ? "Ticket resolved. Chatting disabled." : 
                      "Type your reply..."
                    }
                    disabled={activeTicket?.status === 'resolved'}
                    className={`input-field w-full pl-4 pr-12 py-3 transition-opacity ${
                      activeTicket?.status === 'resolved' ? 'opacity-30' : 'opacity-100'
                    }`}
                  />
                  <button 
                    type="submit" 
                    disabled={!message.trim() || activeTicket?.status === 'resolved'}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-600/20 disabled:opacity-30 transition-all hover:bg-indigo-700 active:scale-95"
                  >
                    <Send size={16} />
                  </button>
                </form>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
