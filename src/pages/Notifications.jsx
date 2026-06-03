import { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import { useAuth } from "../hooks/useAuth";
import { markAsRead, markAllRead, clearNotifications } from "../services/notificationService";
import { getAnimeDetails } from "../services/api";
import { User, Clock, Heart, Bell, Download, Settings as SettingsIcon, Check, Trash2, Calendar, Info, AlertCircle, ExternalLink, BarChart2 } from "lucide-react";

const timeAgo = (date) => {
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);
  if (seconds < 60) return Math.floor(seconds) + "s ago";
  if (seconds < 3600) return Math.floor(seconds / 60) + "m ago";
  if (seconds < 86400) return Math.floor(seconds / 3600) + "h ago";
  if (seconds < 2592000) return Math.floor(seconds / 86400) + "d ago";
  return Math.floor(seconds / 2592000) + "mo ago";
};

const formatNotificationText = (notif) => {
  let title = notif.title.replace('🚀', '').trim();
  let message = notif.message.replace('!', '');

  if (notif.type === 'NEW_EPISODE') {
    if (title === 'New Episode Aired') {
      const match = message.match(/Episode (\d+) of (.*?) is now available/);
      if (match) {
        title = match[2];
        message = `Episode ${match[1]} is now available`;
      } else {
        title = "New Episode";
      }
    }
  }
  return { title, message };
};

export default function Notifications() {
  const { user, globalNotifications, setGlobalNotifications } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [coverCache, setCoverCache] = useState({});

  useEffect(() => {
    if (!user) navigate("/");
  }, [user, navigate]);

  // Fetch cover images for notifications that don't have one
  useEffect(() => {
    const missing = globalNotifications.filter(n => n.animeId && !n.coverImage && !coverCache[n.animeId]);
    if (missing.length === 0) return;

    const uniqueIds = [...new Set(missing.map(n => n.animeId))];
    uniqueIds.slice(0, 10).forEach(async (id) => {
      try {
        const details = await getAnimeDetails(parseInt(id));
        if (details?.coverImage) {
          setCoverCache(prev => ({ ...prev, [id]: details.coverImage.large || details.coverImage.extraLarge || '' }));
        }
      } catch { /* silently fail */ }
    });
  }, [globalNotifications, coverCache]);

  // Merge cover cache into notifications
  const enrichedNotifications = globalNotifications.map(n => {
    if (n.coverImage || !n.animeId || !coverCache[n.animeId]) return n;
    return { ...n, coverImage: coverCache[n.animeId] };
  });

  const handleMarkRead = async (id) => {
    const res = await markAsRead(id);
    if (res.success) {
      setGlobalNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
    }
  };

  const handleReadAll = async () => {
    const res = await markAllRead();
    if (res.success) {
      setGlobalNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    }
  };

  const handleClear = async () => {
    const res = await clearNotifications();
    if (res.success) {
      setGlobalNotifications([]);
    }
  };

  const navItems = [
    { id: "profile", label: "Profile", icon: User, path: "/profile" },
    { id: "watching", label: "Continue Watching", icon: Clock, path: "/watching" },
    { id: "bookmarks", label: "Bookmarks", icon: Heart, path: "/watchlist" },
    { id: "notifications", label: "Notifications", icon: Bell, path: "/notifications" },
    { id: "stats", label: "Stats", icon: BarChart2, path: "/stats" },
    { id: "import", label: "Import/Export", icon: Download, path: "/import" },
    { id: "settings", label: "Settings", icon: SettingsIcon, path: "/settings" }
  ];

  const unreadCount = enrichedNotifications.filter(n => !n.isRead).length;

  return (
    <div className="min-h-screen text-white flex flex-col font-sans selection:bg-red-500/30">
      <Navbar />

      <div className="w-full pt-[80px] px-4 md:px-8 pb-12 max-w-[1200px] mx-auto flex-1">
        
        {/* Compact Navigation Tabs */}
        <div className="flex flex-wrap sm:flex-nowrap justify-center gap-1.5 sm:gap-2 md:gap-3 mb-10 w-full max-w-4xl mx-auto px-1 sm:px-0">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || (item.id === "notifications" && location.pathname === "/notifications");
            const Icon = item.icon;
            
            return (
              <Link
                key={item.id}
                to={item.path}
                className={`flex items-center justify-center gap-2 px-2.5 sm:px-3 md:px-4 py-2 sm:py-2 rounded-xl transition-all duration-300 border shrink-0 ${
                  isActive 
                  ? "bg-red-600 text-white border-red-600" 
                  : "bg-white/[0.02] border-white/5 text-white/30 hover:text-white hover:bg-white/[0.05]"
                }`}
              >
                <Icon size={18} strokeWidth={isActive ? 2.5 : 2} className="shrink-0 w-[18px] h-[18px] md:w-4 md:h-4" />
                <span className="hidden md:block text-[12px] font-bold tracking-tight whitespace-nowrap">
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-6 md:mb-8 px-1 sm:px-2">
          <div className="flex items-center gap-2 md:gap-3">
            <h2 className="text-[16px] md:text-xl font-black tracking-tight uppercase">Notifications</h2>
            {unreadCount > 0 && (
              <span className="text-[9px] md:text-[10px] font-black bg-red-600 text-white px-2 py-0.5 md:px-2.5 rounded-full">{unreadCount} New</span>
            )}
          </div>
          <div className="flex items-center gap-4 md:gap-6">
            <button 
              onClick={handleReadAll} 
              className="group flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.15em] text-white/40 hover:text-white transition-colors"
            >
              <Check size={14} strokeWidth={2.5} className="text-white/20 group-hover:text-green-500 transition-colors" />
              <span>Mark All Read</span>
            </button>
            <div className="w-[1px] h-3 bg-white/10 hidden sm:block"></div>
            <button 
              onClick={handleClear} 
              className="group flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.15em] text-white/40 hover:text-red-500 transition-colors"
              title="Clear All Notifications"
            >
              <Trash2 size={13} strokeWidth={2.5} className="text-white/20 group-hover:text-red-500 transition-colors" />
              <span className="hidden sm:inline">Clear All</span>
            </button>
          </div>
        </div>

        {/* Notification List */}
        {enrichedNotifications.length > 0 ? (
          <div className="flex flex-col gap-2 md:gap-2.5">
            {enrichedNotifications.map((notif) => {
              const { title, message } = formatNotificationText(notif);
              return (
              <Link
                key={notif._id}
                to={notif.animeId ? `/watch/${notif.animeId}` : '#'}
                onClick={() => { if (!notif.isRead) handleMarkRead(notif._id); }}
                className={`p-2.5 md:p-3.5 rounded-xl md:rounded-2xl border transition-all duration-300 flex gap-3 md:gap-4 relative overflow-hidden group cursor-pointer hover:bg-white/[0.03] ${
                  !notif.isRead 
                  ? "bg-white/[0.03] border-white/10 shadow-lg" 
                  : "bg-transparent border-white/5 opacity-50 hover:opacity-100"
                }`}
              >
                {!notif.isRead && <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-red-600 rounded-r-full" />}

                {/* Anime Cover Image or Fallback Icon */}
                {notif.type === 'NEW_EPISODE' && notif.coverImage ? (
                  <div className="relative shrink-0">
                    <div className="w-[48px] h-[68px] md:w-[56px] md:h-[78px] rounded-lg overflow-hidden ring-1 ring-white/10 group-hover:ring-white/20 transition-all shadow-lg">
                      <img
                        src={notif.coverImage}
                        alt={title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        loading="lazy"
                      />
                    </div>
                    {notif.episode && (
                      <div className="absolute -bottom-1 -right-1 bg-red-600 text-white text-[8px] md:text-[9px] font-black px-1.5 py-0.5 rounded-md shadow-lg ring-2 ring-[#0a0a0a] leading-none">
                        EP {notif.episode}
                      </div>
                    )}
                  </div>
                ) : notif.type === 'NEW_EPISODE' ? (
                  <div className="w-[48px] h-[68px] md:w-[56px] md:h-[78px] rounded-lg bg-red-600/10 flex items-center justify-center text-red-500 border border-red-500/20 shrink-0">
                    <Calendar size={20} />
                  </div>
                ) : notif.type === 'WATCHLIST_UPDATE' ? (
                  <div className="w-[48px] h-[68px] md:w-[56px] md:h-[78px] rounded-lg bg-blue-600/10 flex items-center justify-center text-blue-500 border border-blue-500/20 shrink-0">
                    <Info size={20} />
                  </div>
                ) : (
                  <div className="w-[48px] h-[68px] md:w-[56px] md:h-[78px] rounded-lg bg-yellow-600/10 flex items-center justify-center text-yellow-500 border border-yellow-500/20 shrink-0">
                    <AlertCircle size={20} />
                  </div>
                )}

                {/* Content */}
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h4 className={`text-[13px] md:text-[14px] font-bold leading-tight truncate ${!notif.isRead ? 'text-white group-hover:text-red-400' : 'text-white/60'} transition-colors`}>
                        {title}
                      </h4>
                      <p className="text-[10px] md:text-[11px] text-white/30 mt-1 leading-relaxed line-clamp-1">
                        {message}
                      </p>
                    </div>
                    {!notif.isRead && (
                      <div className="shrink-0 w-2 h-2 bg-red-500 rounded-full mt-1.5 animate-pulse" />
                    )}
                  </div>
                  
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-[8px] md:text-[9px] font-bold text-white/20 uppercase tracking-[0.15em]">{timeAgo(notif.createdAt)}</span>
                    {notif.type === 'NEW_EPISODE' && (
                      <span className="text-[8px] md:text-[9px] font-bold text-red-500/60 uppercase tracking-wider">New Episode</span>
                    )}
                    {notif.type === 'WATCHLIST_UPDATE' && (
                      <span className="text-[8px] md:text-[9px] font-bold text-blue-500/60 uppercase tracking-wider">Watchlist</span>
                    )}
                  </div>
                </div>

                {/* Hover Arrow */}
                {notif.animeId && (
                  <div className="shrink-0 self-center opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-1 group-hover:translate-x-0">
                    <ExternalLink size={14} className="text-white/20" />
                  </div>
                )}
              </Link>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 bg-[#111] border border-white/5 rounded-2xl shadow-xl relative overflow-hidden max-w-3xl mx-auto">
            <div className="relative w-20 h-20 mb-6 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
              <Bell size={32} className="text-white/20" strokeWidth={1.5} />
            </div>
            <h2 className="text-xl font-black text-white mb-2 uppercase tracking-tight">Zero Noise</h2>
            <p className="text-white/30 mb-8 text-[13px] max-w-xs text-center leading-relaxed">
              You don't have any new notifications right now. We'll let you know when new episodes air!
            </p>
            <Link to="/browse" className="bg-white text-black font-black py-3 px-8 rounded-xl text-[11px] uppercase tracking-[0.2em] transition-all hover:scale-105">
              Explore Anime
            </Link>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
