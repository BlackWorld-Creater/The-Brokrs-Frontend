import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { chatAPI } from "../services/api";
import { useSocket } from "../hooks/useSocket";
import useAuthStore from "../store/authStore";
import {
  MessageSquare,
  Send,
  Search,
  Plus,
  Users,
  X,
  Edit,
  Trash2,
  Check,
  CheckCheck,
  MoreVertical,
  Smile,
  Reply,
  Phone,
  UserPlus,
  Hash,
  Star,
  ChevronLeft,
  Settings,
  Circle,
  Loader,
  ArrowDown,
} from "lucide-react";
import { format, isToday, isYesterday, formatDistanceToNow } from "date-fns";
import toast from "react-hot-toast";

/* ── Constants ───────────────────────────────────────────────────── */
const QUICK_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🔥", "👏", "✅"];

/* ── Helpers ─────────────────────────────────────────────────────── */
const msgDateLabel = (dateStr) => {
  const d = new Date(dateStr);
  if (isToday(d)) return format(d, "HH:mm");
  if (isYesterday(d)) return `Yesterday ${format(d, "HH:mm")}`;
  return format(d, "MMM d, HH:mm");
};

const groupDateLabel = (dateStr) => {
  const d = new Date(dateStr);
  if (isToday(d)) return "Today";
  if (isYesterday(d)) return "Yesterday";
  return format(d, "EEEE, MMMM d");
};

function Avatar({ name, avatar, size = 36, online }) {
  const initials = name
    ?.split(" ")
    .map((w) => w[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();
  return (
    <div
      className="relative flex-shrink-0"
      style={{ width: size, height: size }}
    >
      {avatar ? (
        <img
          src={avatar}
          alt={name}
          className="rounded-full object-cover w-full h-full"
        />
      ) : (
        <div
          className="rounded-full flex items-center justify-center w-full h-full font-bold"
          style={{
            background: "rgba(var(--accent),0.18)",
            color: "rgb(var(--accent-light))",
            fontSize: size * 0.35,
          }}
        >
          {initials}
        </div>
      )}
      {online !== undefined && (
        <div
          className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2"
          style={{
            background: online ? "#22c55e" : "#64748b",
            borderColor: "rgb(var(--bg-card))",
          }}
        />
      )}
    </div>
  );
}

/* ── New Chat Modal ──────────────────────────────────────────────── */
function NewChatModal({ onClose, onSelectUser, onCreateGroup }) {
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("direct");
  const [groupName, setGroupName] = useState("");
  const [selectedUsers, setSelectedUsers] = useState([]);
  const { user } = useAuthStore();

  const { data: users } = useQuery({
    queryKey: ["chat-users", search],
    queryFn: () =>
      chatAPI.getUsers(search || undefined).then((r) => r.data.data),
    debounce: 300,
  });

  const toggleUser = (u) => {
    setSelectedUsers((prev) =>
      prev.find((x) => x.id === u.id)
        ? prev.filter((x) => x.id !== u.id)
        : [...prev, u],
    );
  };

  return (
    <div
      className="modal-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal-content" style={{ maxWidth: 420 }}>
        <div
          className="flex items-center justify-between p-5"
          style={{ borderBottom: "1px solid rgba(var(--border))" }}
        >
          <h2 className="section-title">New Conversation</h2>
          <button onClick={onClose} className="btn-ghost p-1.5">
            <X size={16} />
          </button>
        </div>

        {/* Tabs */}
        <div
          className="flex gap-1 p-3"
          style={{ borderBottom: "1px solid rgba(var(--border))" }}
        >
          {[
            { id: "direct", label: "Direct Message" },
            { id: "group", label: "Group Chat" },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="flex-1 py-2 rounded-lg text-sm font-medium transition-all"
              style={{
                background:
                  tab === t.id ? "rgba(var(--accent),0.15)" : "transparent",
                color:
                  tab === t.id
                    ? "rgb(var(--accent-light))"
                    : "rgb(var(--text-muted))",
                border:
                  tab === t.id
                    ? "1px solid rgba(var(--accent),0.25)"
                    : "1px solid transparent",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="p-4 space-y-3">
          {tab === "group" && (
            <input
              className="input-field"
              placeholder="Group name..."
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
            />
          )}

          <div className="relative">
            <Search
              size={13}
              className="absolute left-3 top-1/2 -translate-y-1/2"
              style={{ color: "rgb(var(--text-muted))" }}
            />
            <input
              className="input-field pl-9"
              placeholder="Search users..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
          </div>

          {/* Selected tags for group */}
          {tab === "group" && selectedUsers.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {selectedUsers.map((u) => (
                <span
                  key={u.id}
                  className="flex items-center gap-1 px-2 py-1 rounded-full text-xs"
                  style={{
                    background: "rgba(var(--accent),0.12)",
                    color: "rgb(var(--accent-light))",
                  }}
                >
                  {u.first_name}
                  <button onClick={() => toggleUser(u)}>
                    <X size={10} />
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* User list */}
          <div className="space-y-1 max-h-60 overflow-y-auto">
            {(users || []).map((u) => {
              const selected = selectedUsers.find((x) => x.id === u.id);
              return (
                <button
                  key={u.id}
                  onClick={() =>
                    tab === "direct" ? onSelectUser(u.id) : toggleUser(u)
                  }
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left"
                  style={{
                    background: selected
                      ? "rgba(var(--accent),0.08)"
                      : "transparent",
                    border: `1px solid ${selected ? "rgba(var(--accent),0.2)" : "transparent"}`,
                  }}
                  onMouseEnter={(e) => {
                    if (!selected)
                      e.currentTarget.style.background =
                        "rgba(var(--bg-hover))";
                  }}
                  onMouseLeave={(e) => {
                    if (!selected)
                      e.currentTarget.style.background = "transparent";
                  }}
                >
                  <Avatar
                    name={`${u.first_name} ${u.last_name}`}
                    avatar={u.avatar_url}
                    size={36}
                  />
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-sm font-medium truncate"
                      style={{ color: "rgb(var(--text-primary))" }}
                    >
                      {u.first_name} {u.last_name}
                    </p>
                    <p
                      className="text-xs truncate"
                      style={{ color: "rgb(var(--text-muted))" }}
                    >
                      {u.designation || u.department_name || u.email}
                    </p>
                  </div>
                  {selected && (
                    <Check
                      size={14}
                      style={{ color: "rgb(var(--accent-light))" }}
                    />
                  )}
                </button>
              );
            })}
            {users?.length === 0 && (
              <p
                className="text-center py-4 text-sm"
                style={{ color: "rgb(var(--text-muted))" }}
              >
                No users found
              </p>
            )}
          </div>

          {tab === "group" && selectedUsers.length > 0 && (
            <button
              onClick={() =>
                onCreateGroup(
                  groupName,
                  selectedUsers.map((u) => u.id),
                )
              }
              disabled={!groupName.trim()}
              className="btn-primary w-full justify-center"
            >
              <Users size={14} /> Create Group ({selectedUsers.length} members)
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Message Bubble ──────────────────────────────────────────────── */
function MessageBubble({
  msg,
  isMine,
  onReply,
  onEdit,
  onDelete,
  onReact,
  showAvatar,
}) {
  const [showMenu, setShowMenu] = useState(false);
  const [showEmojis, setShowEmojis] = useState(false);
  const isDeleted = msg.is_deleted;
  const isSystem = msg.type === "system";

  if (isSystem)
    return (
      <div className="text-center py-2">
        <span
          className="text-xs px-3 py-1 rounded-full"
          style={{
            background: "rgba(var(--bg-hover))",
            color: "rgb(var(--text-muted))",
          }}
        >
          {msg.content}
        </span>
      </div>
    );

  return (
    <div
      className={`flex items-end gap-2 group ${isMine ? "flex-row-reverse" : "flex-row"} mb-1`}
    >
      {/* Avatar — only for others */}
      {!isMine &&
        (showAvatar ? (
          <Avatar
            name={`${msg.first_name} ${msg.last_name}`}
            avatar={msg.avatar_url}
            size={28}
          />
        ) : (
          <div style={{ width: 28 }} />
        ))}

      <div
        className={`flex flex-col max-w-[70%] ${isMine ? "items-end" : "items-start"}`}
      >
        {/* Sender name */}
        {!isMine && showAvatar && (
          <span
            className="text-xs mb-1 ml-1 font-medium"
            style={{ color: "rgb(var(--accent-light))" }}
          >
            {msg.first_name} {msg.last_name}
          </span>
        )}

        {/* Reply preview */}
        {msg.reply_to && (
          <div
            className="text-xs mb-1 px-2.5 py-1.5 rounded-lg opacity-80"
            style={{
              background: "rgba(var(--bg-hover))",
              borderLeft: "2px solid rgb(var(--accent))",
              maxWidth: "100%",
            }}
          >
            <p
              className="font-semibold"
              style={{ color: "rgb(var(--accent-light))" }}
            >
              {msg.reply_to.sender_first}
            </p>
            <p className="truncate" style={{ color: "rgb(var(--text-muted))" }}>
              {msg.reply_to.content}
            </p>
          </div>
        )}

        {/* Bubble */}
        <div className="relative">
          <div
            className="px-3.5 py-2 rounded-2xl text-sm leading-relaxed"
            style={{
              background: isMine
                ? "rgb(var(--accent))"
                : "rgba(var(--bg-hover))",
              color: isMine ? "white" : "rgb(var(--text-primary))",
              borderBottomRightRadius: isMine ? 4 : undefined,
              borderBottomLeftRadius: !isMine ? 4 : undefined,
              opacity: isDeleted ? 0.6 : 1,
              fontStyle: isDeleted ? "italic" : "normal",
            }}
          >
            {msg.content}
            {msg.is_edited && !isDeleted && (
              <span className="text-xs ml-1.5 opacity-60">(edited)</span>
            )}
          </div>

          {/* Hover actions */}
          {!isDeleted && (
            <div
              className={`absolute top-0 ${isMine ? "right-full mr-1" : "left-full ml-1"} opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5`}
            >
              {/* Quick react */}
              <div className="relative">
                <button
                  onClick={() => setShowEmojis((v) => !v)}
                  className="w-6 h-6 rounded-full flex items-center justify-center"
                  style={{
                    background: "rgba(var(--bg-hover))",
                    border: "1px solid rgba(var(--border))",
                  }}
                >
                  <Smile
                    size={11}
                    style={{ color: "rgb(var(--text-muted))" }}
                  />
                </button>
                {showEmojis && (
                  <div
                    className="absolute bottom-full mb-1 flex gap-0.5 p-1.5 rounded-xl z-20"
                    style={{
                      background: "rgb(var(--bg-card))",
                      border: "1px solid rgba(var(--border))",
                      boxShadow: "var(--shadow-modal)",
                    }}
                  >
                    {QUICK_EMOJIS.map((e) => (
                      <button
                        key={e}
                        onClick={() => {
                          onReact(msg.id, e);
                          setShowEmojis(false);
                        }}
                        className="text-base hover:scale-125 transition-transform px-0.5"
                      >
                        {e}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button
                onClick={() => onReply(msg)}
                className="w-6 h-6 rounded-full flex items-center justify-center"
                style={{
                  background: "rgba(var(--bg-hover))",
                  border: "1px solid rgba(var(--border))",
                }}
              >
                <Reply size={11} style={{ color: "rgb(var(--text-muted))" }} />
              </button>
              {isMine && (
                <div className="relative">
                  <button
                    onClick={() => setShowMenu((v) => !v)}
                    className="w-6 h-6 rounded-full flex items-center justify-center"
                    style={{
                      background: "rgba(var(--bg-hover))",
                      border: "1px solid rgba(var(--border))",
                    }}
                  >
                    <MoreVertical
                      size={11}
                      style={{ color: "rgb(var(--text-muted))" }}
                    />
                  </button>
                  {showMenu && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setShowMenu(false)}
                      />
                      <div
                        className="absolute bottom-full mb-1 w-28 card py-1 z-20"
                        style={{ boxShadow: "var(--shadow-modal)" }}
                      >
                        <button
                          onClick={() => {
                            onEdit(msg);
                            setShowMenu(false);
                          }}
                          className="w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 hover:bg-white/5"
                          style={{ color: "rgb(var(--text-secondary))" }}
                        >
                          <Edit size={10} /> Edit
                        </button>
                        <button
                          onClick={() => {
                            onDelete(msg.id);
                            setShowMenu(false);
                          }}
                          className="w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 hover:bg-white/5"
                          style={{ color: "rgb(var(--danger))" }}
                        >
                          <Trash2 size={10} /> Delete
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Reactions */}
        {msg.reactions?.filter((r) => r.count > 0).length > 0 && (
          <div className="flex gap-1 mt-1 flex-wrap">
            {msg.reactions
              .filter((r) => r.count > 0)
              .map((r) => (
                <button
                  key={r.emoji}
                  onClick={() => onReact(msg.id, r.emoji)}
                  className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs transition-all"
                  style={{
                    background: r.mine
                      ? "rgba(var(--accent),0.15)"
                      : "rgba(var(--bg-hover))",
                    border: `1px solid ${r.mine ? "rgba(var(--accent),0.3)" : "rgba(var(--border))"}`,
                  }}
                >
                  <span>{r.emoji}</span>
                  <span style={{ color: "rgb(var(--text-muted))" }}>
                    {r.count}
                  </span>
                </button>
              ))}
          </div>
        )}

        {/* Timestamp */}
        <span
          className="text-xs mt-1 px-1"
          style={{ color: "rgb(var(--text-muted))", opacity: 0.7 }}
        >
          {msgDateLabel(msg.created_at)}
        </span>
      </div>
    </div>
  );
}

/* ── Main Chat Page ──────────────────────────────────────────────── */
export default function ChatPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const { emit, on } = useSocket();

  const [activeRoomId, setActiveRoomId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [replyTo, setReplyTo] = useState(null);
  const [editingMsg, setEditingMsg] = useState(null);
  const [showNewChat, setShowNewChat] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [typingUsers, setTypingUsers] = useState({}); // roomId -> [{firstName}]
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [sidebarSearch, setSidebarSearch] = useState("");

  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const typingTimerRef = useRef(null);
  const inputRef = useRef(null);

  /* ── Queries ──────────────────────────────────────────────────── */
  const { data: rooms, isLoading: roomsLoading } = useQuery({
    queryKey: ["chat-rooms"],
    queryFn: () => chatAPI.getRooms().then((r) => r.data.data),
    refetchInterval: 30000,
  });

  const activeRoom = rooms?.find((r) => r.id === activeRoomId);

  /* ── Load messages when room changes ─────────────────────────── */
  useEffect(() => {
    if (!activeRoomId) return;
    setMessages([]);
    setHasMore(true);
    emit("room:join", activeRoomId);
    chatAPI
      .getMessages(activeRoomId)
      .then((r) => {
        setMessages(r.data.data || []);
        setTimeout(
          () => messagesEndRef.current?.scrollIntoView({ behavior: "auto" }),
          50,
        );
      })
      .catch(() => {});
    chatAPI
      .markRead(activeRoomId)
      .then(() => {
        queryClient.invalidateQueries(["chat-rooms"]);
      })
      .catch(() => {});
  }, [activeRoomId]);

  /* ── Socket event listeners ───────────────────────────────────── */
  useEffect(() => {
    const unsubs = [
      on("user:online", ({ userId }) =>
        setOnlineUsers((p) => new Set([...p, userId])),
      ),
      on("user:offline", ({ userId }) =>
        setOnlineUsers((p) => {
          const n = new Set(p);
          n.delete(userId);
          return n;
        }),
      ),
      on("message:new", (msg) => {
        if (msg.room_id === activeRoomId || msg.roomId === activeRoomId) {
          setMessages((prev) => [...prev, msg]);
          setTimeout(
            () =>
              messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }),
            50,
          );
          chatAPI.markRead(activeRoomId).catch(() => {});
        }
        queryClient.invalidateQueries(["chat-rooms"]);
      }),
      on("message:edited", (data) => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === data.msgId
              ? { ...m, content: data.content, is_edited: true }
              : m,
          ),
        );
      }),
      on("message:deleted", (data) => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === data.msgId
              ? { ...m, is_deleted: true, content: "[message deleted]" }
              : m,
          ),
        );
      }),
      on("reaction:update", (data) => {
        queryClient.invalidateQueries(["chat-messages", activeRoomId]);
      }),
      on("typing:start", ({ roomId, userId, firstName }) => {
        if (roomId === activeRoomId && userId !== user?.id) {
          setTypingUsers((p) => ({
            ...p,
            [roomId]: [
              ...(p[roomId] || []).filter((u) => u.userId !== userId),
              { userId, firstName },
            ],
          }));
        }
      }),
      on("typing:stop", ({ roomId, userId }) => {
        setTypingUsers((p) => ({
          ...p,
          [roomId]: (p[roomId] || []).filter((u) => u.userId !== userId),
        }));
      }),
    ];
    return () => unsubs.forEach((fn) => fn && fn());
  }, [activeRoomId, on]);

  /* ── Load more (infinite scroll up) ──────────────────────────── */
  const loadMore = async () => {
    if (loadingMore || !hasMore || !messages.length) return;
    setLoadingMore(true);
    const oldest = messages[0]?.created_at;
    try {
      const res = await chatAPI.getMessages(activeRoomId, oldest);
      const older = res.data.data || [];
      if (older.length < 40) setHasMore(false);
      setMessages((prev) => [...older, ...prev]);
    } catch {}
    setLoadingMore(false);
  };

  const handleScroll = () => {
    const el = messagesContainerRef.current;
    if (!el) return;
    if (el.scrollTop < 60) loadMore();
    setShowScrollBtn(el.scrollHeight - el.scrollTop - el.clientHeight > 300);
  };

  /* ── Typing indicator ─────────────────────────────────────────── */
  const handleInputChange = (val) => {
    setInputText(val);
    if (!activeRoomId) return;
    emit("typing:start", { roomId: activeRoomId });
    clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(
      () => emit("typing:stop", { roomId: activeRoomId }),
      1500,
    );
  };

  /* ── Send message ─────────────────────────────────────────────── */
  const sendMutation = useMutation({
    mutationFn: (data) => chatAPI.sendMessage(activeRoomId, data),
    onSuccess: (res) => {
      const msg = res.data.data;
      setMessages((prev) => [...prev, msg]);
      emit("message:send", { roomId: activeRoomId, message: msg });
      queryClient.invalidateQueries(["chat-rooms"]);
      setTimeout(
        () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }),
        50,
      );
    },
    onError: () => toast.error("Failed to send message"),
  });

  const handleSend = () => {
    const text = inputText.trim();
    if (!text || !activeRoomId) return;
    emit("typing:stop", { roomId: activeRoomId });
    if (editingMsg) {
      chatAPI
        .editMessage(editingMsg.id, text)
        .then(() => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === editingMsg.id
                ? { ...m, content: text, is_edited: true }
                : m,
            ),
          );
          emit("message:edit", {
            roomId: activeRoomId,
            msgId: editingMsg.id,
            content: text,
          });
        })
        .catch(() => toast.error("Edit failed"));
      setEditingMsg(null);
    } else {
      sendMutation.mutate({ content: text, replyToId: replyTo?.id });
      setReplyTo(null);
    }
    setInputText("");
  };

  /* ── Mutations ────────────────────────────────────────────────── */
  const handleDelete = (msgId) => {
    chatAPI
      .deleteMessage(msgId)
      .then(() => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === msgId
              ? { ...m, is_deleted: true, content: "[message deleted]" }
              : m,
          ),
        );
        emit("message:delete", { roomId: activeRoomId, msgId });
      })
      .catch(() => toast.error("Delete failed"));
  };

  const handleReact = (msgId, emoji) => {
    chatAPI
      .reactMessage(msgId, emoji)
      .then(() => {
        // Optimistic update reactions
        setMessages((prev) =>
          prev.map((m) => {
            if (m.id !== msgId) return m;
            const existing = m.reactions || [];
            const idx = existing.findIndex((r) => r.emoji === emoji);
            if (idx === -1) {
              return {
                ...m,
                reactions: [...existing, { emoji, count: 1, mine: true }],
              };
            }
            const r = existing[idx];
            if (r.mine) {
              const newReactions = [...existing];
              newReactions[idx] = { ...r, count: r.count - 1, mine: false };
              return { ...m, reactions: newReactions };
            } else {
              const newReactions = [...existing];
              newReactions[idx] = { ...r, count: r.count + 1, mine: true };
              return { ...m, reactions: newReactions };
            }
          }),
        );
      })
      .catch(() => {});
  };

  const handleOpenDirect = async (userId) => {
    setShowNewChat(false);
    const res = await chatAPI.openDirect(userId);
    const roomId = res.data.data.roomId;
    queryClient.invalidateQueries(["chat-rooms"]);
    setActiveRoomId(roomId);
  };

  const handleCreateGroup = async (name, memberIds) => {
    setShowNewChat(false);
    try {
      const res = await chatAPI.createGroup({ name, memberIds });
      queryClient.invalidateQueries(["chat-rooms"]);
      setActiveRoomId(res.data.data.roomId);
      toast.success("Group created!");
    } catch {
      toast.error("Failed to create group");
    }
  };

  /* ── Group messages by date ───────────────────────────────────── */
  const groupedMessages = messages.reduce((acc, msg) => {
    const day = format(new Date(msg.created_at), "yyyy-MM-dd");
    if (!acc[day]) acc[day] = [];
    acc[day].push(msg);
    return acc;
  }, {});

  const typingList = typingUsers[activeRoomId] || [];
  const filteredRooms = (rooms || []).filter((r) => {
    if (!sidebarSearch) return true;
    const name =
      r.type === "direct"
        ? `${r.other_user?.first_name} ${r.other_user?.last_name}`
        : r.name;
    return name?.toLowerCase().includes(sidebarSearch.toLowerCase());
  });

  return (
    <div
      className="flex h-[calc(100vh-8rem)] rounded-2xl overflow-hidden"
      style={{
        border: "1px solid rgba(var(--border))",
        background: "rgb(var(--bg-card))",
      }}
    >
      {/* ── Sidebar ─────────────────────────────────────────────── */}
      <div
        className="w-72 flex flex-col flex-shrink-0"
        style={{ borderRight: "1px solid rgba(var(--border))" }}
      >
        {/* Header */}
        <div
          className="p-4 flex items-center justify-between"
          style={{ borderBottom: "1px solid rgba(var(--border))" }}
        >
          <div className="flex items-center gap-2">
            <MessageSquare
              size={18}
              style={{ color: "rgb(var(--accent-light))" }}
            />
            <span
              className="font-display font-bold"
              style={{ color: "rgb(var(--text-primary))" }}
            >
              Messages
            </span>
          </div>
          <button
            onClick={() => setShowNewChat(true)}
            className="w-8 h-8 rounded-xl flex items-center justify-center transition-all"
            style={{
              background: "rgba(var(--accent),0.12)",
              border: "1px solid rgba(var(--accent),0.2)",
            }}
          >
            <Plus size={15} style={{ color: "rgb(var(--accent-light))" }} />
          </button>
        </div>

        {/* Search */}
        <div className="px-3 py-2">
          <div className="relative">
            <Search
              size={12}
              className="absolute left-3 top-1/2 -translate-y-1/2"
              style={{ color: "rgb(var(--text-muted))" }}
            />
            <input
              className="input-field pl-8 py-1.5 text-sm"
              placeholder="Search conversations..."
              value={sidebarSearch}
              onChange={(e) => setSidebarSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Room list */}
        <div className="flex-1 overflow-y-auto">
          {roomsLoading ? (
            <div className="space-y-2 p-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex gap-3 p-2 animate-pulse">
                  <div
                    className="w-10 h-10 rounded-full"
                    style={{ background: "rgba(var(--bg-hover))" }}
                  />
                  <div className="flex-1 space-y-1.5">
                    <div
                      className="h-3.5 rounded w-28"
                      style={{ background: "rgba(var(--bg-hover))" }}
                    />
                    <div
                      className="h-3 rounded w-40"
                      style={{ background: "rgba(var(--bg-hover))" }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredRooms.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare
                size={32}
                className="mx-auto mb-2"
                style={{ color: "rgb(var(--text-muted))" }}
              />
              <p
                className="text-sm"
                style={{ color: "rgb(var(--text-muted))" }}
              >
                No conversations yet
              </p>
              <button
                onClick={() => setShowNewChat(true)}
                className="btn-primary mx-auto mt-3 text-xs px-3 py-1.5"
              >
                <Plus size={12} /> New Chat
              </button>
            </div>
          ) : (
            filteredRooms.map((room) => {
              const isActive = room.id === activeRoomId;
              const isDirect = room.type === "direct";
              const other = room.other_user;
              const roomName = isDirect
                ? `${other?.first_name} ${other?.last_name}`
                : room.name;
              const isOnline = isDirect && onlineUsers.has(other?.id);
              const unread = parseInt(room.unread_count || 0);

              return (
                <button
                  key={room.id}
                  onClick={() => setActiveRoomId(room.id)}
                  className="w-full flex items-center gap-3 px-3 py-3 transition-all text-left"
                  style={{
                    background: isActive
                      ? "rgba(var(--accent),0.1)"
                      : "transparent",
                    borderRight: isActive
                      ? "3px solid rgb(var(--accent))"
                      : "3px solid transparent",
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive)
                      e.currentTarget.style.background =
                        "rgba(var(--bg-hover))";
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive)
                      e.currentTarget.style.background = "transparent";
                  }}
                >
                  {isDirect ? (
                    <Avatar
                      name={roomName}
                      avatar={other?.avatar_url}
                      size={40}
                      online={isOnline}
                    />
                  ) : (
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{
                        background:
                          room.type === "announcement"
                            ? "rgba(249,115,22,0.15)"
                            : "rgba(var(--accent),0.12)",
                      }}
                    >
                      {room.type === "announcement" ? (
                        <Hash size={16} style={{ color: "#f97316" }} />
                      ) : (
                        <Users
                          size={16}
                          style={{ color: "rgb(var(--accent-light))" }}
                        />
                      )}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span
                        className="text-sm font-semibold truncate"
                        style={{
                          color: "rgb(var(--text-primary))",
                          maxWidth: 140,
                        }}
                      >
                        {roomName}
                      </span>
                      {room.last_message_at && (
                        <span
                          className="text-xs flex-shrink-0 ml-1"
                          style={{ color: "rgb(var(--text-muted))" }}
                        >
                          {msgDateLabel(room.last_message_at)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-0.5">
                      <span
                        className="text-xs truncate"
                        style={{
                          color: "rgb(var(--text-muted))",
                          maxWidth: 155,
                        }}
                      >
                        {typingUsers[room.id]?.length ? (
                          <span style={{ color: "rgb(var(--accent-light))" }}>
                            {typingUsers[room.id][0].firstName} is typing...
                          </span>
                        ) : (
                          room.last_message || "Start a conversation"
                        )}
                      </span>
                      {unread > 0 && (
                        <span
                          className="flex-shrink-0 min-w-[20px] h-5 rounded-full flex items-center justify-center text-white font-bold ml-1"
                          style={{
                            background: "rgb(var(--accent))",
                            fontSize: 10,
                            padding: "0 5px",
                          }}
                        >
                          {unread > 99 ? "99+" : unread}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* ── Chat Area ───────────────────────────────────────────── */}
      {activeRoom ? (
        <div className="flex-1 flex flex-col min-w-0">
          {/* Chat header */}
          <div
            className="flex items-center gap-3 px-5 py-3 flex-shrink-0"
            style={{ borderBottom: "1px solid rgba(var(--border))" }}
          >
            {activeRoom.type === "direct" ? (
              <>
                <Avatar
                  name={`${activeRoom.other_user?.first_name} ${activeRoom.other_user?.last_name}`}
                  avatar={activeRoom.other_user?.avatar_url}
                  size={36}
                  online={onlineUsers.has(activeRoom.other_user?.id)}
                />
                <div>
                  <p
                    className="font-semibold text-sm"
                    style={{ color: "rgb(var(--text-primary))" }}
                  >
                    {activeRoom.other_user?.first_name}{" "}
                    {activeRoom.other_user?.last_name}
                  </p>
                  <p
                    className="text-xs"
                    style={{
                      color: onlineUsers.has(activeRoom.other_user?.id)
                        ? "#22c55e"
                        : "rgb(var(--text-muted))",
                    }}
                  >
                    {onlineUsers.has(activeRoom.other_user?.id)
                      ? "Online"
                      : "Offline"}
                    {activeRoom.other_user?.designation &&
                      ` · ${activeRoom.other_user.designation}`}
                  </p>
                </div>
              </>
            ) : (
              <>
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{
                    background:
                      activeRoom.type === "announcement"
                        ? "rgba(249,115,22,0.15)"
                        : "rgba(var(--accent),0.12)",
                  }}
                >
                  {activeRoom.type === "announcement" ? (
                    <Hash size={15} style={{ color: "#f97316" }} />
                  ) : (
                    <Users
                      size={15}
                      style={{ color: "rgb(var(--accent-light))" }}
                    />
                  )}
                </div>
                <div>
                  <p
                    className="font-semibold text-sm"
                    style={{ color: "rgb(var(--text-primary))" }}
                  >
                    {activeRoom.name}
                  </p>
                  <p
                    className="text-xs"
                    style={{ color: "rgb(var(--text-muted))" }}
                  >
                    {activeRoom.member_count} members
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Messages */}
          <div
            ref={messagesContainerRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto px-5 py-4 space-y-0.5"
          >
            {/* Load more */}
            {hasMore && (
              <div className="text-center py-2">
                {loadingMore ? (
                  <Loader
                    size={16}
                    className="animate-spin mx-auto"
                    style={{ color: "rgb(var(--text-muted))" }}
                  />
                ) : (
                  <button
                    onClick={loadMore}
                    className="text-xs"
                    style={{ color: "rgb(var(--accent-light))" }}
                  >
                    Load older messages
                  </button>
                )}
              </div>
            )}

            {Object.entries(groupedMessages).map(([day, dayMsgs]) => (
              <div key={day}>
                {/* Day separator */}
                <div className="flex items-center gap-3 my-4">
                  <div
                    className="flex-1 h-px"
                    style={{ background: "rgba(var(--border))" }}
                  />
                  <span
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{
                      background: "rgba(var(--bg-hover))",
                      color: "rgb(var(--text-muted))",
                    }}
                  >
                    {groupDateLabel(day)}
                  </span>
                  <div
                    className="flex-1 h-px"
                    style={{ background: "rgba(var(--border))" }}
                  />
                </div>

                {dayMsgs.map((msg, idx) => {
                  const isMine = msg.sender_id === user?.id;
                  const prevMsg = dayMsgs[idx - 1];
                  const showAvatar =
                    !isMine &&
                    (!prevMsg ||
                      prevMsg.sender_id !== msg.sender_id ||
                      prevMsg.type === "system");
                  return (
                    <MessageBubble
                      key={msg.id}
                      msg={msg}
                      isMine={isMine}
                      showAvatar={showAvatar}
                      onReply={setReplyTo}
                      onEdit={(m) => {
                        setEditingMsg(m);
                        setInputText(m.content);
                        inputRef.current?.focus();
                      }}
                      onDelete={handleDelete}
                      onReact={handleReact}
                    />
                  );
                })}
              </div>
            ))}

            {/* Typing indicator */}
            {typingList.length > 0 && (
              <div className="flex items-center gap-2 py-1">
                <div
                  className="flex gap-0.5 px-3 py-2 rounded-2xl"
                  style={{ background: "rgba(var(--bg-hover))" }}
                >
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="w-1.5 h-1.5 rounded-full"
                      style={{
                        background: "rgb(var(--text-muted))",
                        animation: `bounce 1.4s ease-in-out ${i * 0.16}s infinite`,
                      }}
                    />
                  ))}
                </div>
                <span
                  className="text-xs"
                  style={{ color: "rgb(var(--text-muted))" }}
                >
                  {typingList.map((u) => u.firstName).join(", ")} typing...
                </span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Scroll to bottom button */}
          {showScrollBtn && (
            <button
              onClick={() =>
                messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
              }
              className="absolute bottom-24 right-8 w-9 h-9 rounded-full flex items-center justify-center shadow-lg"
              style={{ background: "rgb(var(--accent))", color: "white" }}
            >
              <ArrowDown size={14} />
            </button>
          )}

          {/* Reply preview */}
          {replyTo && (
            <div
              className="px-4 py-2 flex items-center gap-2"
              style={{
                borderTop: "1px solid rgba(var(--border))",
                background: "rgba(var(--bg-hover))",
              }}
            >
              <Reply size={13} style={{ color: "rgb(var(--accent-light))" }} />
              <div className="flex-1 min-w-0">
                <p
                  className="text-xs font-semibold"
                  style={{ color: "rgb(var(--accent-light))" }}
                >
                  Replying to {replyTo.first_name}
                </p>
                <p
                  className="text-xs truncate"
                  style={{ color: "rgb(var(--text-muted))" }}
                >
                  {replyTo.content}
                </p>
              </div>
              <button
                onClick={() => setReplyTo(null)}
                className="btn-ghost p-1"
              >
                <X size={12} />
              </button>
            </div>
          )}

          {/* Edit indicator */}
          {editingMsg && (
            <div
              className="px-4 py-2 flex items-center gap-2"
              style={{
                borderTop: "1px solid rgba(var(--border))",
                background: "rgba(var(--warning),0.07)",
              }}
            >
              <Edit size={13} style={{ color: "#f59e0b" }} />
              <p className="text-xs flex-1" style={{ color: "#f59e0b" }}>
                Editing message
              </p>
              <button
                onClick={() => {
                  setEditingMsg(null);
                  setInputText("");
                }}
                className="btn-ghost p-1"
              >
                <X size={12} />
              </button>
            </div>
          )}

          {/* Input bar */}
          <div
            className="px-4 py-3 flex items-end gap-3"
            style={{ borderTop: "1px solid rgba(var(--border))" }}
          >
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                className="input-field resize-none pr-3 py-3"
                placeholder="Type a message... (Enter to send, Shift+Enter for new line)"
                value={inputText}
                onChange={(e) => handleInputChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                  if (e.key === "Escape") {
                    setReplyTo(null);
                    setEditingMsg(null);
                    setInputText("");
                  }
                }}
                rows={1}
                style={{ maxHeight: 120, overflowY: "auto", lineHeight: 1.5 }}
              />
            </div>
            <button
              onClick={handleSend}
              disabled={!inputText.trim() || sendMutation.isPending}
              className="w-10 h-10 rounded-xl flex items-center justify-center transition-all flex-shrink-0"
              style={{
                background: inputText.trim()
                  ? "rgb(var(--accent))"
                  : "rgba(var(--bg-hover))",
                color: inputText.trim() ? "white" : "rgb(var(--text-muted))",
              }}
            >
              {sendMutation.isPending ? (
                <Loader size={16} className="animate-spin" />
              ) : (
                <Send size={16} />
              )}
            </button>
          </div>
        </div>
      ) : (
        /* Empty state */
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <div
            className="w-20 h-20 rounded-3xl flex items-center justify-center"
            style={{
              background: "rgba(var(--accent),0.1)",
              border: "1px solid rgba(var(--accent),0.2)",
            }}
          >
            <MessageSquare
              size={36}
              style={{ color: "rgb(var(--accent-light))" }}
            />
          </div>
          <div className="text-center">
            <h3
              className="font-display font-bold text-xl mb-2"
              style={{ color: "rgb(var(--text-primary))" }}
            >
              Internal Chat
            </h3>
            <p
              className="text-sm max-w-xs"
              style={{ color: "rgb(var(--text-muted))" }}
            >
              Chat privately with teammates or create group conversations.
              Select a conversation or start a new one.
            </p>
          </div>
          <button onClick={() => setShowNewChat(true)} className="btn-primary">
            <Plus size={14} /> Start a Conversation
          </button>
        </div>
      )}

      {/* New Chat Modal */}
      {showNewChat && (
        <NewChatModal
          onClose={() => setShowNewChat(false)}
          onSelectUser={handleOpenDirect}
          onCreateGroup={handleCreateGroup}
        />
      )}

      {/* Typing bounce animation */}
      <style>{`
        @keyframes bounce {
          0%,60%,100% { transform: translateY(0) }
          30% { transform: translateY(-4px) }
        }
      `}</style>
    </div>
  );
}
