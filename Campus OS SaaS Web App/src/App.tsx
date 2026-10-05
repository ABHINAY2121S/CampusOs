import { useEffect, useMemo, useState } from "react";
import { Activity, ArrowDownRight, ArrowLeft, ArrowRight, ArrowUpRight, Bell, BookOpen, Coffee, CalendarDays, Check, CheckCheck, ChevronDown, ChevronLeft, ChevronRight, CircleAlert, CircleCheck, Clock3, Command, Compass, FileBarChart2, FileText, Filter, GraduationCap, HelpCircle, Home, LayoutDashboard, ListFilter, MapPin, Menu, MessageCircle, Moon, MoreHorizontal, Plus, Search, Send, Settings2, ShieldCheck, Sparkles, Sun, Users, Wrench, Wifi, X, Zap, Bookmark, Paperclip, Building2, Layers3, ClipboardList, UserRound, HardHat, Radio, SlidersHorizontal, LogOut, AlertTriangle, Archive, RotateCcw, ThumbsUp, Eye, TrendingDown, TrendingUp, Laptop, Inbox, LoaderCircle, PanelLeftClose, PanelLeftOpen, type LucideIcon } from "lucide-react";
import "./index.css";
import { Badge, Button, Card, Icon, SectionTitle, type Page } from "./ui";
import { CampusAIPage, ScholarshipsPage, NoticesPage, EventsPage, LostFoundPage, ServicesPage, AnalyticsPage, ProfilePage } from "./CampusPages";
import { useAuth } from "./store/AuthContext";
import { useSocket } from "./store/SocketContext";
import { getStudentStats } from "./api/student";
import { getAdminOverview, getBuildingHeatmap, getCategoriesDistribution, getDepartmentsPerformance, getNeedsAttention, getTechnicians } from "./api/admin";
import { getNotifications, markNotificationsRead, clearNotifications, type NotificationItem } from "./api/notifications";
import {
  getIssues,
  getIssueById,
  analyzeIssue,
  createIssue,
  markIssueAffected,
  toggleFollowIssue,
  confirmResolution,
  addComment,
  assignIssue,
  updateIssueStatus,
  type AnalyzeResult,
} from "./api/issues";

type Theme = "light" | "dark" | "system";
const issueRows = [
  { id: "CO-2041", title: "Projector malfunction in B204", location: "B Block · Room B204", priority: "High", priorityScore: 87, status: "In progress", affected: 27, updated: "12 min ago", category: "Electrical" },
  { id: "CO-2038", title: "Wi-Fi disconnecting in C Block labs", location: "C Block · Lab 03", priority: "High", priorityScore: 82, status: "Assigned", affected: 18, updated: "1 hr ago", category: "Network/Wi-Fi" },
  { id: "CO-2027", title: "Water dispenser not working", location: "Central Library · Floor 2", priority: "Medium", priorityScore: 62, status: "Under review", affected: 8, updated: "Yesterday", category: "Maintenance" },
  { id: "CO-2019", title: "Broken desk in classroom B108", location: "B Block · Room B108", priority: "Low", priorityScore: 28, status: "Resolved", affected: 3, updated: "2 days ago", category: "Civil & Furniture" },
];
const factors = [
  { name: "Affected students", value: 23, max: 30, note: "27 students impacted" },
  { name: "Severity", value: 19, max: 20, note: "Classroom equipment unusable" },
  { name: "Duration", value: 11, max: 15, note: "Reported 4 hours ago" },
  { name: "Location criticality", value: 13, max: 15, note: "Active teaching space" },
  { name: "Academic impact", value: 15, max: 10, note: "Lectures disrupted" },
  { name: "Duplicate reports", value: 6, max: 10, note: "3 matching reports" },
];
const similar = [
  { id: "CO-2039", title: "Projector not turning on in B204", similarity: 96, reporters: 14, age: "2 hours ago" },
  { id: "CO-2035", title: "B204 display keeps flickering", similarity: 89, reporters: 9, age: "4 hours ago" },
  { id: "CO-2031", title: "No display from lecturer's laptop", similarity: 78, reporters: 4, age: "Yesterday" },
];
const primaryNav: { label: string; icon: LucideIcon; page: Page }[] = [
  { label: "Overview", icon: LayoutDashboard, page: "overview" }, { label: "Issues", icon: ClipboardList, page: "issues" },
  { label: "Campus AI", icon: Sparkles, page: "campus-ai" }, { label: "Scholarships", icon: GraduationCap, page: "scholarships" }, { label: "Notices", icon: FileText, page: "notices" },
  { label: "Services", icon: Layers3, page: "services" }, { label: "Events", icon: CalendarDays, page: "events" },
  { label: "Lost & Found", icon: Compass, page: "lost" }, { label: "Analytics", icon: Activity, page: "analytics" },
  { label: "My Activity", icon: Clock3, page: "activity" },
];
const adminNav: { label: string; icon: LucideIcon; page: Page }[] = [
  { label: "Admin Dashboard", icon: Home, page: "admin" }, { label: "Department Dashboard", icon: Activity, page: "department" }, { label: "Departments", icon: Building2, page: "manage" },
  { label: "Users", icon: Users, page: "manage" }, { label: "Maintenance", icon: Wrench, page: "manage" }, { label: "Reports", icon: FileBarChart2, page: "manage" },
];
function PriorityBreakdown({ compact = false, score, label, breakdown }: { compact?: boolean; score?: number; label?: string; breakdown?: any }) {
  const currentScore = score ?? 87;
  // High >=75 / Medium 40-74 / Low <40 everywhere
  const currentLabel = label ?? (currentScore >= 75 ? "High priority" : currentScore >= 40 ? "Medium priority" : "Low priority");
  const tone: "critical" | "warning" | "neutral" = currentScore >= 75 ? "critical" : currentScore >= 40 ? "warning" : "neutral";

  const factorList = breakdown ? [
    { name: "Affected students", value: Math.round((breakdown.affected_students?.contribution ?? 0.23) * 100), max: Math.round((breakdown.affected_students?.weight ?? 0.30) * 100), note: breakdown.affected_students?.note || "Impact on students" },
    { name: "Severity", value: Math.round((breakdown.severity?.contribution ?? 0.19) * 100), max: Math.round((breakdown.severity?.weight ?? 0.20) * 100), note: breakdown.severity?.note || "Severity level" },
    { name: "Duration", value: Math.round((breakdown.duration?.contribution ?? 0.11) * 100), max: Math.round((breakdown.duration?.weight ?? 0.15) * 100), note: breakdown.duration?.note || "Time elapsed" },
    { name: "Location criticality", value: Math.round((breakdown.location_crit?.contribution ?? 0.13) * 100), max: Math.round((breakdown.location_crit?.weight ?? 0.15) * 100), note: breakdown.location_crit?.note || "Location type" },
    { name: "Academic impact", value: Math.round((breakdown.academic_impact?.contribution ?? 0.15) * 100), max: Math.round((breakdown.academic_impact?.weight ?? 0.10) * 100), note: breakdown.academic_impact?.note || "Impact on academics" },
    { name: "Duplicate reports", value: Math.round((breakdown.duplicate_reports?.contribution ?? 0.06) * 100), max: Math.round((breakdown.duplicate_reports?.weight ?? 0.10) * 100), note: breakdown.duplicate_reports?.note || "Distinct merged reports" },
  ] : factors;

  return <div className={`priority-breakdown ${compact ? "compact" : ""}`}><div className="priority-heading"><div><span className="eyebrow">TRANSPARENT BY DESIGN</span><h2>Priority breakdown</h2></div><Icon as={SlidersHorizontal} size={18} /></div><p className="muted">Every point has a reason. Here’s how this issue was scored.</p><div className="factor-list">{factorList.map(f => <div className="factor" key={f.name}><div className="factor-label"><span>{f.name}</span><span className="mono">+{f.value} <span className="muted">/ {f.max}</span></span></div><div className="factor-track"><span style={{ width: `${Math.min(100, Math.max(0, (f.value / (f.max || 1)) * 100))}%` }} /></div>{!compact && <span className="factor-note">{f.note}</span>}</div>)}</div><div className="score-footer"><div><span className="eyebrow">CALCULATED PRIORITY</span><div className="score-number mono">{currentScore} <span>/ 100</span></div></div><Badge tone={tone} icon={CircleAlert}>{currentLabel}</Badge></div><div className="score-track"><div style={{ width: `${Math.min(100, Math.max(0, currentScore))}%` }} /></div><p className="score-footnote"><Icon as={Sparkles} size={14} /> Updated as more students report the same issue</p></div>;
}
function Logo({ onClick, compact = false }: { onClick?: () => void; compact?: boolean }) { return <button className={`brand ${compact ? "brand-compact" : ""}`} onClick={onClick} aria-label="Campus OS home"><span className="brand-mark"><span /></span>{!compact && <span className="brand-name">campus<span className="brand-os">os</span><span className="brand-period">.</span></span>}</button>; }
function AnimatedValue({ value }: { value: string }) { const [display, setDisplay] = useState("0"); useEffect(() => { const match = value.match(/^(\d+)(.*)$/); if (!match) { setDisplay(value); return; } const target = Number(match[1]); const suffix = match[2]; const start = performance.now(); let frame = 0; const tick = (now: number) => { const progress = Math.min((now - start) / 600, 1); const current = Math.round(target * (1 - Math.pow(1 - progress, 3))); setDisplay(String(current).padStart(match[1].length, "0") + suffix); if (progress < 1) frame = requestAnimationFrame(tick); }; frame = requestAnimationFrame(tick); return () => cancelAnimationFrame(frame); }, [value]); return <>{display}</>; }
function StatCard({ icon, label, value, change, tone = "blue" }: { icon: LucideIcon; label: string; value: string; change?: string; tone?: string }) { return <Card className="stat-card"><div className="stat-top"><span className={`stat-icon tone-${tone}`}><Icon as={icon} size={18} /></span>{change && <span className="stat-change"><Icon as={change.startsWith("-") ? TrendingDown : TrendingUp} size={13} /> {change}</span>}</div><div className="stat-value mono"><AnimatedValue value={value} /></div><div className="stat-label">{label}</div></Card>; }
function IssueItem({ row, onClick }: { row: any; onClick: () => void }) {
  const isResolved = row.status === "Resolved" || row.status === "resolved";
  const score = row.priorityScore ?? (row.priority === "Critical" ? 85 : row.priority === "High" ? 78 : row.priority === "Medium" ? 55 : 25);
  const tone = isResolved ? "success" : score >= 75 ? "critical" : score >= 40 ? "warning" : "neutral";
  const icon = isResolved ? CircleCheck : score >= 75 ? Zap : Wifi;
  const displayStatus = isResolved ? "Resolved" : row.status === "in_progress" ? "In progress" : row.status === "assigned" ? "Assigned" : row.status || "Reported";
  return <button className="issue-item" onClick={onClick}><span className="issue-symbol"><Icon as={icon} size={18} /></span><span className="issue-main"><strong>{row.title}</strong><span className="issue-sub"><span className="mono">{row.displayId || row.id}</span><span className="dot-sep">·</span>{row.location || (row.building ? `${row.building}${row.room ? ` · ${row.room}` : ""}` : "Campus")}</span></span><span className="issue-right"><Badge tone={tone} icon={isResolved ? Check : Clock3}>{displayStatus}</Badge><small>{row.updated || "Recently"}</small></span><Icon as={ChevronRight} size={17} className="row-chevron" /></button>;
}

export default function App() {
  const { user, login: apiLogin, logout: apiLogout } = useAuth();
  const [page, setPage] = useState<Page>("login");
  const [theme, setTheme] = useState<Theme>("light");
  const [role, setRole] = useState<"student" | "admin">("student");
  const [loginEmail, setLoginEmail] = useState("student@campus.edu");
  const [loginPassword, setLoginPassword] = useState("Campus@123");
  const [loginLoading, setLoginLoading] = useState(false);
  const [studentStats, setStudentStats] = useState<any>(null);
  const [adminStats, setAdminStats] = useState<any>(null);
  const [heatmapData, setHeatmapData] = useState<any[]>([]);
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [deptPerfData, setDeptPerfData] = useState<any[]>([]);
  const [needsAttentionData, setNeedsAttentionData] = useState<any[]>([]);
  const [technicianList, setTechnicianList] = useState<any[]>([]);
  const [collapsed, setCollapsed] = useState(false);
  const [palette, setPalette] = useState(false);
  const [paletteQuery, setPaletteQuery] = useState("");
  const [notifications, setNotifications] = useState(false);
  const [mobileMore, setMobileMore] = useState(false);
  const [unread, setUnread] = useState(true);
  const [complaint, setComplaint] = useState("");
  const [processing, setProcessing] = useState(false);
  const [step, setStep] = useState(-1);
  const [extracted, setExtracted] = useState(false);
  const [manual, setManual] = useState(false);
  const [error, setError] = useState("");
  const [demoError, setDemoError] = useState<"" | "ai" | "submit">("");
  const [affected, setAffected] = useState(false);
  const [following, setFollowing] = useState(false);
  const [status, setStatus] = useState("Repair in progress");
  const [assigned, setAssigned] = useState(false);
  const [technician, setTechnician] = useState("Select technician");
  const [department, setDepartment] = useState("Electrical");
  const [note, setNote] = useState("");
  const [toast, setToast] = useState("");
  const [filter, setFilter] = useState("All statuses");
  const [priorityFilter, setPriorityFilter] = useState("All priorities");
  const [search, setSearch] = useState("");
  const [selectedBuilding, setSelectedBuilding] = useState("B Block");
  const [chipEdits, setChipEdits] = useState<Record<string,string>>({});
  const dark = theme === "dark" || (theme === "system" && window.matchMedia?.("(prefers-color-scheme: dark)").matches);
  useEffect(() => { document.documentElement.dataset.theme = dark ? "dark" : "light"; }, [dark]);
  const { socket } = useSocket();
  const [issuesData, setIssuesData] = useState<any[]>([]);
  const [selectedIssue, setSelectedIssue] = useState<any>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalyzeResult | null>(null);
  const [commentInput, setCommentInput] = useState("");
  const [notificationList, setNotificationList] = useState<NotificationItem[]>([]);

  const formatTimeAgo = (isoString?: string) => {
    if (!isoString) return "Just now";
    const diffMs = Date.now() - new Date(isoString).getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins} min ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} hr ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const loadNotifications = () => {
    getNotifications()
      .then((items) => {
        if (Array.isArray(items)) {
          setNotificationList(items);
          setUnread(items.some((n) => !n.read));
        }
      })
      .catch(() => {});
  };

  const handleSelectIssue = (raw: any) => {
    if (raw) {
      setSelectedIssue(raw);
      if (raw.id) {
        getIssueById(raw.id).then(setSelectedIssue).catch(() => {});
      }
    }
    navigate("detail");
  };

  const unreadCount = notificationList.length > 0 ? notificationList.filter(n => !n.read).length : (unread ? 3 : 0);

  const loadIssues = () => {
    getIssues()
      .then((res) => {
        if (res?.issues?.length) {
          const mapped = res.issues.map((iss: any) => ({
            id: iss.displayId || iss.id,
            realId: iss.id,
            displayId: iss.displayId || iss.id,
            title: iss.title,
            location: iss.building
              ? `${iss.building}${iss.room ? ` · Room ${iss.room}` : ""}`
              : "Campus",
            priority:
              iss.priorityScore >= 75 ? "High" : iss.priorityScore >= 40 ? "Medium" : "Low",
            priorityScore: iss.priorityScore,
            status:
              iss.status === "resolved"
                ? "Resolved"
                : iss.status === "in_progress"
                ? "In progress"
                : iss.status === "assigned"
                ? "Assigned"
                : "Reported",
            affected: iss.cluster?.affectedCount || iss._count?.affectedUsers || 1,
            updated: "Recently",
            category: iss.category || "General",
            raw: iss,
          }));
          setIssuesData(mapped);
          setSelectedIssue((prev: any) => prev || mapped[0]?.raw || null);
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    loadIssues();
    loadNotifications();
  }, []);

  useEffect(() => {
    if (!socket) return;
    const onIssueCreated = (data: any) => {
      loadIssues();
      loadNotifications();
      setToast(`New issue reported: ${data.displayId || "CO-issue"}`);
    };
    const onIssueUpdated = (data: any) => {
      loadIssues();
      loadNotifications();
      if (selectedIssue && (selectedIssue.id === data.issueId || selectedIssue.displayId === data.issueId)) {
        getIssueById(selectedIssue.id).then(setSelectedIssue).catch(() => {});
      }
    };
    const onNotificationNew = (data: any) => {
      loadNotifications();
      setUnread(true);
      setToast(data.title ? `${data.title}` : "New notification received");
    };
    socket.on("issue:created", onIssueCreated);
    socket.on("issue:updated", onIssueUpdated);
    socket.on("notification:new", onNotificationNew);
    return () => {
      socket.off("issue:created", onIssueCreated);
      socket.off("issue:updated", onIssueUpdated);
      socket.off("notification:new", onNotificationNew);
    };
  }, [socket, selectedIssue]);

  useEffect(() => {
    if (page === "overview") {
      getStudentStats().then(setStudentStats).catch(() => {});
    } else if (page === "admin") {
      getAdminOverview().then(setAdminStats).catch(() => {});
      getBuildingHeatmap().then(setHeatmapData).catch(() => {});
      getCategoriesDistribution().then(setCategoryData).catch(() => {});
      getDepartmentsPerformance().then(setDeptPerfData).catch(() => {});
      getNeedsAttention().then(setNeedsAttentionData).catch(() => {});
    } else if (page === "issues" || page === "manage") {
      loadIssues();
    }
    if (page === "manage") {
      getTechnicians().then(setTechnicianList).catch(() => {});
    }
  }, [page]);

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPalette(p => !p);
      }
      if (e.key === "Escape") {
        setPalette(false);
        setNotifications(false);
        setMobileMore(false);
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 3400);
    return () => clearTimeout(t);
  }, [toast]);

  const navigate = (p: Page) => {
    setPage(p);
    setPalette(false);
    setNotifications(false);
    setMobileMore(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const startAnalysis = async () => {
    setDemoError("");
    if (!complaint.trim() && !manual) {
      setError("Describe the issue first so Campus AI can understand it.");
      return;
    }
    setError("");
    setProcessing(true);
    setExtracted(false);
    setStep(0);

    setTimeout(() => setStep(1), 350);
    setTimeout(() => setStep(2), 700);
    setTimeout(() => setStep(3), 1050);

    try {
      const res = await analyzeIssue(complaint);
      setAnalysisResult(res);
      setChipEdits({
        Category: res.category || "Electrical",
        Location: [res.building, res.room].filter(Boolean).join(" · ") || "B Block · B204",
        Asset: res.asset || "Projector",
        Urgency: res.urgency ? res.urgency.charAt(0).toUpperCase() + res.urgency.slice(1) : "High",
        "Affected users": "1 (You)",
      });
      setStep(4);
      setProcessing(false);
      setExtracted(true);
    } catch {
      // Fallback extraction
      const detectedRoom = complaint.match(/\b([A-Z]\d{2,3})\b/i)?.[1]?.toUpperCase() || "B204";
      const detectedBuilding = complaint.match(/\b([A-E]\s*Block)\b/i)?.[1] || "B Block";
      setChipEdits({
        Category: "Electrical",
        Location: `${detectedBuilding} · ${detectedRoom}`,
        Asset: "Classroom equipment",
        Urgency: "High",
        "Affected users": "1 (You)",
      });
      setStep(4);
      setProcessing(false);
      setExtracted(true);
    }
  };

  const submitIssue = async () => {
    setDemoError("");
    if (analysisResult?.similarIssues && analysisResult.similarIssues.length > 0) {
      navigate("analysis");
      setToast("Issue analyzed. Similar reports were found.");
      return;
    }
    try {
      const newIssue = await createIssue({
        title: complaint.slice(0, 80) || "Reported Issue",
        description: complaint,
        category: chipEdits["Category"] || analysisResult?.category || "Electrical",
        building: analysisResult?.building || "B Block",
        room: analysisResult?.room || "B204",
        asset: chipEdits["Asset"] || analysisResult?.asset || "Equipment",
        urgency: (chipEdits["Urgency"] || analysisResult?.urgency || "high").toLowerCase(),
        embedding: analysisResult?.embedding || null,
      });
      setSelectedIssue(newIssue);
      navigate("detail");
      setToast(`Issue ${newIssue.displayId} created successfully.`);
      loadIssues();
    } catch {
      setDemoError("submit");
    }
  };

  const merge = async () => {
    const target = analysisResult?.similarIssues?.[0];
    if (target) {
      try {
        await markIssueAffected(target.id);
        const updated = await getIssueById(target.id);
        setSelectedIssue(updated);
        navigate("detail");
        setToast(`Added to the existing issue cluster ${target.displayId}.`);
        loadIssues();
        return;
      } catch {}
    }
    navigate("detail");
    setToast("Added to the existing issue cluster CO-2041.");
  };

  const createSeparate = async () => {
    try {
      const newIssue = await createIssue({
        title: complaint.slice(0, 80) || "Separate Reported Issue",
        description: complaint,
        category: chipEdits["Category"] || analysisResult?.category || "Electrical",
        building: analysisResult?.building || "B Block",
        room: analysisResult?.room || "B204",
        asset: chipEdits["Asset"] || analysisResult?.asset || "Equipment",
        urgency: (chipEdits["Urgency"] || analysisResult?.urgency || "high").toLowerCase(),
        embedding: analysisResult?.embedding || null,
      });
      setSelectedIssue(newIssue);
      navigate("detail");
      setToast(`Created a separate issue ${newIssue.displayId}.`);
      loadIssues();
    } catch {
      navigate("detail");
      setToast("Created a separate issue CO-2042.");
    }
  };

  const handleFollow = async () => {
    const targetId = selectedIssue?.id;
    if (targetId) {
      try {
        const res = await toggleFollowIssue(targetId);
        setFollowing(res.following);
        setSelectedIssue((prev: any) => prev ? { ...prev, isFollowing: res.following } : prev);
        setToast(res.following ? "You'll receive updates about this issue." : "Unfollowed issue.");
        return;
      } catch {}
    }
    setFollowing(!following);
    setToast(following ? "Unfollowed issue." : "You'll receive updates about this issue.");
  };

  const handleAffected = async () => {
    const targetId = selectedIssue?.id;
    if (targetId && !affected && !selectedIssue?.isAffected) {
      try {
        const res = await markIssueAffected(targetId);
        setAffected(true);
        setSelectedIssue((prev: any) => prev ? {
          ...prev,
          isAffected: true,
          affectedCount: res.affectedCount,
          priorityScore: res.priorityScore,
          priorityBreakdown: res.priorityBreakdown,
        } : prev);
        setToast("You're counted as affected. No duplicate issue created.");
        loadIssues();
        return;
      } catch {}
    }
    setAffected(true);
    setToast("You're counted as affected. No duplicate issue created.");
  };

  const handleComment = async () => {
    if (!commentInput.trim()) return;
    const body = commentInput.trim();
    setCommentInput("");

    const optimisticComment = {
      id: "temp-" + Date.now(),
      body,
      createdAt: new Date().toISOString(),
      author: {
        id: user?.id || "me",
        name: user?.name || (role === "student" ? "Abhinay Shinde" : "Campus Admin"),
        role: user?.role || role || "student",
      },
    };
    setSelectedIssue((prev: any) => prev ? {
      ...prev,
      comments: [...(prev.comments || []), optimisticComment],
    } : prev);

    const targetId = selectedIssue?.id;
    if (targetId) {
      try {
        const newComm = await addComment(targetId, body);
        setSelectedIssue((prev: any) => prev ? {
          ...prev,
          comments: (prev.comments || []).map((c: any) => c.id === optimisticComment.id ? newComm : c),
        } : prev);
        setToast("Comment posted.");
        return;
      } catch (err: any) {
        setToast(err.response?.data?.error || "Could not sync comment with server.");
        return;
      }
    }
    setToast("Comment posted.");
  };

  const handleConfirmResolution = async () => {
    const targetId = selectedIssue?.id;
    if (targetId) {
      try {
        await confirmResolution(targetId);
        setSelectedIssue((prev: any) => prev ? { ...prev, status: "closed" } : prev);
        setToast("Resolution confirmed. Thank you for helping improve campus.");
        loadIssues();
        return;
      } catch {}
    }
    setToast("Resolution confirmed. Thank you for helping improve campus.");
  };

  const handleAssignAndSave = async () => {
    setAssigned(true);
    const targetId = selectedIssue?.id;
    if (targetId) {
      try {
        const normStatus = status.toLowerCase().replace(/\s+/g, "_");
        await updateIssueStatus(targetId, normStatus);
        if (note.trim()) {
          try {
            await addComment(targetId, `[Staff Note]: ${note}`);
            setNote("");
          } catch {}
        }
        setToast(status === "Resolved" ? "Issue resolved. Student has been notified." : "Assignment and status saved successfully.");
        loadIssues();
        return;
      } catch {}
    }
    setToast(status === "Resolved" ? "Issue resolved. Student has been notified." : "Assignment and status saved successfully.");
  };

  const currentIssueRows = issuesData.length > 0 ? issuesData : issueRows;
  const displayedRows = useMemo(() => currentIssueRows.filter(r => (filter === "All statuses" || r.status === filter) && (priorityFilter === "All priorities" || r.priority === priorityFilter) && `${r.id} ${r.title} ${r.location}`.toLowerCase().includes(search.toLowerCase())), [currentIssueRows, filter, priorityFilter, search]);
  const pageTitle: Record<Page,string> = { login: "Sign in", overview: "Overview", report: "Report an issue", analysis: "AI issue analysis", detail: "Issue tracking", issues: "My issues", admin: "Campus Operations", manage: "Issue management", design: "Design system", notices: "Notices", services: "Services", events: "Events", lost: "Lost & Found", analytics: "Analytics", activity: "My Activity", "campus-ai": "Campus AI", scholarships: "Scholarships & schemes", department: "Department Dashboard", profile: "Profile & settings" };

  if (page === "login") return <div className="login-page"><div className="login-brand-panel"><div className="login-grid" /><div className="login-brand-inner"><Logo onClick={() => navigate("login")} /><div className="login-statement"><span className="login-kicker"><span className="live-dot" /> THE CAMPUS, CONNECTED</span><h1>One operating system for the entire campus<span className="brand-period">.</span></h1><p>Less time navigating complexity. More time making campus better for everyone.</p></div><div className="login-brand-bottom"><span>SAHYADRI INSTITUTE OF TECHNOLOGY</span><span className="mono">EST. 2024&nbsp; / &nbsp;PUNE, INDIA</span></div></div></div><div className="login-form-panel"><div className="mobile-login-brand"><Logo /></div><div className="login-form-wrap"><div className="login-welcome"><span className="eyebrow">WELCOME TO CAMPUS OS</span><h2>Sign in to your campus</h2><p>Everything happening on campus, in one place.</p></div><form onSubmit={async e => { e.preventDefault(); setLoginLoading(true); try { const loggedUser = await apiLogin(loginEmail, loginPassword); setToast(`Welcome back, ${loggedUser.name}!`); const isAdminUser = loggedUser.role === "admin" || loggedUser.role === "hod"; setRole(isAdminUser ? "admin" : "student"); navigate(isAdminUser ? "admin" : "overview"); } catch (err: any) { const msg = err.response?.data?.message || err.message || "Sign in"; setToast(msg.includes("Network") ? "Connected in offline demo mode" : msg); navigate(role === "admin" ? "admin" : "overview"); } finally { setLoginLoading(false); } }}><label className="field-label" htmlFor="login-id">College email or student ID</label><input id="login-id" className="field" placeholder="you@sahyadri.edu.in" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} /><label className="field-label" htmlFor="login-password">Password <button type="button" className="text-link" onClick={() => setToast("Contact campus IT to reset your password.")}>Forgot password?</button></label><input id="login-password" className="field" type="password" placeholder="Enter your password" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} /><div className="role-hint"><Icon as={ShieldCheck} size={17} /><span>Signing in as <strong>{role === "student" ? "Student" : "Administrator"}</strong></span><button type="button" onClick={() => { const nextRole = role === "student" ? "admin" : "student"; setRole(nextRole); setLoginEmail(nextRole === "admin" ? "admin@campus.edu" : "student@campus.edu"); }}>Switch role</button></div><Button className="full-width login-submit" type="submit" disabled={loginLoading}>{loginLoading ? "Signing in..." : "Continue to campus"} <Icon as={ArrowRight} size={17} /></Button></form><div className="or-divider"><span>or continue with</span></div><Button variant="secondary" className="full-width" onClick={() => navigate(role === "student" ? "overview" : "admin")} icon={GraduationCap}>College SSO</Button><p className="login-terms">By continuing, you agree to the campus <button onClick={() => setToast("Campus access is managed by Sahyadri Institute of Technology.")}>Terms of Use</button> and <button onClick={() => setToast("Your data stays within your campus workspace.")}>Privacy Policy</button>.</p></div><div className="login-form-footer"><span>Need help? <button onClick={() => setToast("Email support@sahyadri.edu.in for help.")}>Contact support</button></span><span className="mono">CAMPUS OS / V1.0</span></div></div>{toast && <div className="toast"><Icon as={CircleCheck} size={18} />{toast}</div>}</div>;


  return <div className={`app-shell ${collapsed ? "sidebar-collapsed" : ""}`}>
    <aside className="sidebar"><div className="sidebar-head"><Logo compact={collapsed} onClick={() => navigate(role === "admin" ? "admin" : "overview")} /><button className="sidebar-toggle icon-button" onClick={() => setCollapsed(!collapsed)} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}><Icon as={collapsed ? PanelLeftOpen : PanelLeftClose} size={18} /></button></div><div className="workspace-switch"><div className="workspace-icon">S</div>{!collapsed && <><div><strong>Sahyadri Institute</strong><small>Campus workspace</small></div><Icon as={ChevronDown} size={15} /></>}</div><div className="sidebar-scroll"><div className="nav-caption">{!collapsed && "WORKSPACE"}</div><nav aria-label="Main navigation">{primaryNav.map(n => <button key={n.label} className={`nav-link ${page === n.page || (n.page === "issues" && page === "detail") || (n.page === "report" && page === "analysis") ? "active" : ""}`} onClick={() => navigate(n.page)} title={collapsed ? n.label : undefined}><Icon as={n.icon} size={19} />{!collapsed && <span>{n.label}</span>}{!collapsed && n.page === "issues" && <span className="nav-count">3</span>}</button>)}</nav>{role === "admin" && <><div className="nav-caption admin-caption">{!collapsed && "ADMINISTRATION"}</div><nav aria-label="Administration">{adminNav.map(n => <button key={n.label} className={`nav-link ${page === n.page ? "active" : ""}`} onClick={() => navigate(n.page)} title={collapsed ? n.label : undefined}><Icon as={n.icon} size={19} />{!collapsed && <span>{n.label}</span>}</button>)}</nav></>}</div><div className="sidebar-bottom"><button className="nav-link" onClick={() => setToast("Help center is coming soon.")}><Icon as={HelpCircle} size={19} />{!collapsed && "Help & support"}</button><button className="nav-link" onClick={() => setNotifications(true)}><Icon as={Bell} size={19} />{!collapsed && "Notifications"}{!collapsed && unread && <span className="nav-unread" />}</button><div className="theme-control" aria-label="Appearance"><button title="Light theme" className={theme === "light" ? "selected" : ""} onClick={() => setTheme("light")}><Icon as={Sun} size={17} /></button><button title="Dark theme" className={theme === "dark" ? "selected" : ""} onClick={() => setTheme("dark")}><Icon as={Moon} size={17} /></button><button title="System theme" className={theme === "system" ? "selected" : ""} onClick={() => setTheme("system")}><Icon as={Laptop} size={17} /></button></div><button className="profile-block" onClick={() => navigate("profile")} title="Profile and settings"><span className="avatar">{user ? user.name.split(" ").map((w: string)=>w[0]).join("").slice(0,2).toUpperCase() : (role === "student" ? "AK" : "AD")}</span>{!collapsed && <><span><strong>{user?.name || (role === "student" ? "Abhinay Shinde" : "Admin Office")}</strong><small>{user?.role ? `${user.role.toUpperCase()} · ${user.department || "Campus"}` : (role === "student" ? "Student · SE Computer" : "Campus administrator")}</small></span><Icon as={MoreHorizontal} size={17} /></>}</button></div></aside>
    <div className="main-shell"><header className="topbar"><div className="breadcrumbs"><span>Sahyadri Institute</span><Icon as={ChevronRight} size={15} /><strong>{pageTitle[page]}</strong></div><div className="top-actions"><button className="global-search" onClick={() => setPalette(true)}><Icon as={Search} size={17} /><span>Search anything...</span><kbd>⌘ K</kbd></button><button className="icon-button notification-trigger" onClick={() => setNotifications(true)} aria-label="Open notifications"><Icon as={Bell} size={20} />{unread && <i />}</button><button className="top-avatar avatar" title="Profile and settings" onClick={() => navigate("profile")}>{user ? user.name.split(" ").map((w: string)=>w[0]).join("").slice(0,2).toUpperCase() : (role === "student" ? "AK" : "AD")}</button></div></header>
    <main className="page-content" key={page}>
      {page === "overview" && <><div className="page-heading dashboard-heading"><div><div className="overline"><span className="live-dot" /> MONDAY, 24 FEBRUARY 2025</div><h1>Good morning, {user?.name?.split(" ")[0] || "Abhinay"} <span className="heading-sparkle">✳</span></h1><p>Here's what's happening across your campus.</p></div><Button icon={Plus} onClick={() => navigate("report")}>Report an issue</Button></div><div className="stats-grid"><StatCard icon={ClipboardList} label="Active issues" value={studentStats ? String(studentStats.myIssuesOpen).padStart(2, "0") : "03"} change="-2 this week" /><StatCard icon={CircleCheck} label="Resolved" value={studentStats ? String(studentStats.myIssuesResolved).padStart(2, "0") : "12"} change="+4 this month" tone="green" /><StatCard icon={CalendarDays} label="Upcoming events" value={studentStats ? String(studentStats.upcomingEventsCount).padStart(2, "0") : "04"} tone="violet" /><StatCard icon={Bell} label="Important notices" value={studentStats ? String(studentStats.activeNoticesCount).padStart(2, "0") : "02"} tone="amber" /></div><div className="dashboard-columns"><div className="column-stack"><Card className="pulse-card"><SectionTitle title="Campus Pulse" aside={<span className="live-label"><span className="live-dot" /> LIVE STATUS</span>} /><p className="section-description">A quick look at what's happening around you.</p><div className="pulse-list">{[{ icon: Wifi, label: "Campus Wi-Fi", place: "All buildings", status: "Operational", tone: "success" }, { icon: BookOpen, label: "Central Library", place: "Reading halls", status: "High occupancy", tone: "warning" }, { icon: Wrench, label: "Projector B204", place: "B Block · Floor 2", status: "Maintenance ongoing", tone: "warning" }, { icon: Coffee, label: "Campus Canteen", place: "Main courtyard", status: "Open", tone: "success" }].map(x => <div className="pulse-row" key={x.label}><span className="pulse-icon"><Icon as={x.icon} size={18} /></span><span className="pulse-name"><strong>{x.label}</strong><small>{x.place}</small></span><Badge tone={x.tone as "success" | "warning"} icon={x.tone === "success" ? CircleCheck : Clock3}>{x.status}</Badge></div>)}</div></Card><Card className="issues-card"><SectionTitle title="My open issues" aside={<button className="inline-link" onClick={() => navigate("issues")}>View all <Icon as={ArrowRight} size={15} /></button>} /><div className="issue-list">{currentIssueRows.slice(0,3).map(r => <IssueItem key={r.id} row={r} onClick={() => { if (r.raw) setSelectedIssue(r.raw); navigate("detail"); }} />)}</div></Card></div><div className="column-stack"><Card className="feature-card"><div className="feature-icon"><Icon as={Sparkles} size={23} /></div><span className="eyebrow">CAMPUS AI</span><h2>Something not working? Just tell us.</h2><p>Describe an issue in your own words. Campus AI finds the right team, checks for duplicates, and explains its priority.</p><Button onClick={() => navigate("report")}>Report an issue <Icon as={ArrowRight} size={17} /></Button><div className="feature-footer"><Icon as={ShieldCheck} size={15} /> No forms to figure out. No duplicate tickets.</div></Card><Card className="notice-card"><SectionTitle title="On your radar" aside={<Icon as={ArrowUpRight} size={17} />} /><div className="notice-mini"><span className="notice-mini-icon"><Icon as={CalendarDays} size={18} /></span><div><strong>TechFest 2025 registrations open</strong><p>Register your team by 28 Feb</p></div><span className="mono">FEB 28</span></div><div className="notice-mini"><span className="notice-mini-icon"><Icon as={FileText} size={18} /></span><div><strong>Mid-semester examination schedule</strong><p>Updated timetable is now available</p></div><span className="mono">MAR 03</span></div></Card></div></div></>}
      {page === "report" && <div className="flow-container"><button className="back-link" onClick={() => navigate("overview")}><Icon as={ArrowLeft} size={16} /> Back to overview</button><div className="flow-heading"><div className="ai-icon"><Icon as={Sparkles} size={22} /></div><span className="eyebrow">CAMPUS AI · ISSUE REPORTING</span><h1>Tell us what's going on.</h1><p>Don't worry about categories or departments. Just describe the problem and we'll take it from there.</p></div><Card className={`report-card ${processing ? "is-processing" : ""}`}><div className="report-card-head"><div><h2>Describe the issue</h2><p>Include where it happened and how it's affecting you, if you can.</p></div><Badge tone="violet" icon={Sparkles}>AI assisted</Badge></div><textarea className="complaint-input" value={complaint} onChange={e => { setComplaint(e.target.value); setError(""); }} placeholder="Describe the problem in your own words…" aria-label="Describe the issue" /><div className="examples"><span>TRY AN EXAMPLE</span>{["The projector in B204 isn't working and our lecture is starting", "Wi-Fi keeps disconnecting in C Block lab"].map(x => <button key={x} onClick={() => setComplaint(x)}>{x} <Icon as={ArrowUpRight} size={13} /></button>)}</div>{error && <div className="inline-error"><Icon as={CircleAlert} size={16} />{error}</div>}{manual && <div className="manual-fields"><label>Category<select><option>Electrical</option><option>Network/Wi-Fi</option><option>Housekeeping</option></select></label><label>Location<input placeholder="e.g. B Block, Room B204" /></label></div>}<div className="report-actions"><span><Icon as={ShieldCheck} size={16} /> Your report is only shared with the relevant campus team</span><Button onClick={startAnalysis} disabled={processing} icon={processing ? LoaderCircle : Sparkles}>{processing ? "Analyzing issue..." : manual ? "Continue" : "Analyze issue"}</Button></div></Card>{(processing || extracted) && <Card className={`extraction-card ${processing ? "is-processing" : ""}`}><div className="shimmer-line" /><div className="extract-heading"><span className="ai-icon small"><Icon as={Sparkles} size={17} /></span><div><h2>{processing ? "Understanding your report" : "Here's what we found"}</h2><p>{processing ? "Campus AI is turning your description into a useful report." : "Check the details below. You can edit anything before submitting."}</p></div>{extracted && <Badge tone="violet" icon={Check}>AI confidence {analysisResult?.confidence ? Math.round(analysisResult.confidence * 100) : 94}%</Badge>}</div><div className="steps-grid">{["Detecting location", "Identifying category", "Checking similar reports", "Calculating priority"].map((s,i) => <div className={`processing-step ${step > i ? "done" : step === i ? "current" : "pending"}`} key={s}>{step > i ? <Icon as={CircleCheck} size={16} /> : step === i ? <Icon as={LoaderCircle} size={16} className="spinner" /> : <span className="step-empty" />}<span>{s}</span></div>)}</div>{processing && <div className="extraction-skeleton"><span /><span /><span /></div>}{extracted && <div className="extracted-content"><div className="extract-divider" /><div className="extract-label">EXTRACTED DETAILS <span>Click a value to edit</span></div><div className="chips-grid">{[{ label: "Category", value: chipEdits["Category"] || analysisResult?.category || "Electrical" }, { label: "Location", value: chipEdits["Location"] || [analysisResult?.building, analysisResult?.room].filter(Boolean).join(" · ") || "B Block · B204" }, { label: "Asset", value: chipEdits["Asset"] || analysisResult?.asset || "Projector" }, { label: "Urgency", value: chipEdits["Urgency"] || (analysisResult?.urgency ? analysisResult.urgency.charAt(0).toUpperCase() + analysisResult.urgency.slice(1) : "High") }, { label: "Affected users", value: chipEdits["Affected users"] || "1 (You)" }].map((c,i) => <label className="extract-chip" style={{ animationDelay: `${i*60}ms` }} key={c.label}><span>{c.label}</span><input aria-label={c.label} value={chipEdits[c.label] ?? c.value} onChange={e => setChipEdits({ ...chipEdits, [c.label]: e.target.value })} /><Icon as={ChevronDown} size={14} /></label>)}</div><div className="extract-bottom"><span><Icon as={ShieldCheck} size={16} /> You stay in control. AI just does the groundwork.</span><Button onClick={submitIssue}>Submit issue <Icon as={ArrowRight} size={17} /></Button></div></div>}</Card>}{demoError && <div className="error-state" role="alert"><span className="error-state-icon"><Icon as={CircleAlert} size={20} /></span><div><strong>{demoError === "ai" ? "AI temporarily unavailable" : "Unable to submit issue"}</strong><p>{demoError === "ai" ? "The analysis service isn't responding. You can still send a report manually." : "Your report wasn't sent. Your description is safe here."}</p></div><div className="error-state-actions">{demoError === "ai" ? <Button variant="secondary" onClick={() => { setManual(true); setDemoError(""); }}>Continue manually</Button> : <><Button variant="secondary" icon={RotateCcw} onClick={submitIssue}>Retry</Button><Button variant="ghost" onClick={() => { setDemoError(""); setToast("Draft saved on this device for this session."); }}>Save draft</Button></>}</div></div>}{!extracted && !processing && <div className="report-help"><Icon as={HelpCircle} size={18} /><div><strong>AI temporarily unavailable?</strong><span>You can still report an issue the traditional way.</span></div><button onClick={() => { setManual(true); setDemoError("ai"); }}>Continue manually <Icon as={ArrowRight} size={15} /></button></div>}{extracted && <div className="demo-state-links"><span>PREVIEW STATES</span><button onClick={() => setDemoError("ai")}>AI unavailable</button><button onClick={() => setDemoError("submit")}>Submit error</button></div>}</div>}
      {page === "analysis" && (() => {
        const topMatch = analysisResult?.similarIssues?.[0];
        const similarList = (analysisResult?.similarIssues && analysisResult.similarIssues.length > 0)
          ? analysisResult.similarIssues.map((r: any) => ({
              id: r.displayId || r.id,
              title: r.title,
              similarity: Math.round((r.similarity || 0.85) * 100),
              reporters: 14,
              age: "Recently",
            }))
          : similar;
        return <div className="flow-container analysis-page"><button className="back-link" onClick={() => navigate("report")}><Icon as={ArrowLeft} size={16} /> Back to report</button><div className="flow-heading compact-heading"><span className="eyebrow"><Icon as={Sparkles} size={15} /> CAMPUS AI ANALYSIS</span><h1>We found a match.</h1><p>Your report matches an issue already being tracked. Joining it helps the campus team see the full impact.</p></div><Card className="detected-card"><div className="detected-top"><span className="ai-icon small"><Icon as={Sparkles} size={17} /></span><span className="eyebrow">DETECTED ISSUE</span><Badge tone="critical" icon={CircleAlert}>Critical severity</Badge></div><h2>{topMatch?.title || "Projector malfunction, B204"}</h2><p>{topMatch?.description || "The projector in B204 is not functioning, disrupting scheduled lectures for SE Computer Engineering students."}</p><div className="detected-meta"><div><span>ESTIMATED IMPACT</span><strong><Icon as={Users} size={17} /> 27 students</strong></div><div><span>SUGGESTED DEPARTMENT</span><strong><Icon as={Zap} size={17} /> {topMatch?.category || "Electrical"}</strong></div><div><span>LOCATION</span><strong><Icon as={MapPin} size={17} /> {[topMatch?.building, topMatch?.room].filter(Boolean).join(" · ") || "B Block · B204"}</strong></div></div></Card><div className="analysis-grid"><Card className="similar-card"><SectionTitle title={`${similarList.length} similar reports found`} aside={<Badge tone="violet" icon={Sparkles}>AI matched</Badge>} /><p className="section-description">These reports may describe the same underlying issue.</p><div className="similar-list">{similarList.map(r => <div className="similar-item" key={r.id}><div className="similar-item-top"><span className="mono">{r.id}</span><Badge tone="violet">{r.similarity}% match</Badge></div><strong>{r.title}</strong><div className="similar-item-bottom"><span><Icon as={Users} size={14} /> {r.reporters} reporters</span><span><Icon as={Clock3} size={14} /> {r.age}</span></div></div>)}</div><Button className="full-width merge-button" onClick={merge} icon={Layers3}>This is the same issue, merge <Icon as={ArrowRight} size={16} /></Button><button className="different-link" onClick={createSeparate}>Not the same issue? Create a separate report</button></Card><Card className="priority-card"><PriorityBreakdown score={topMatch?.priorityScore} /></Card></div></div>;
      })()}
      {page === "detail" && (() => {
        const dScore = selectedIssue?.priorityScore ?? 87;
        const dLabel = dScore >= 75 ? "High priority" : dScore >= 40 ? "Medium priority" : "Low priority";
        const dTone: "critical" | "warning" | "neutral" = dScore >= 75 ? "critical" : dScore >= 40 ? "warning" : "neutral";
        const isResolved = selectedIssue?.status === "resolved" || selectedIssue?.status === "closed" || status === "Resolved";
        const dStatus = isResolved ? "Resolved" : selectedIssue?.status === "in_progress" ? "In progress" : selectedIssue?.status === "assigned" ? "Assigned" : status;
        const affCount = selectedIssue?.affectedCount ?? (selectedIssue?.cluster?.affectedCount || (27 + (affected ? 1 : 0)));
        const isAff = Boolean(selectedIssue?.isAffected ?? affected);
        const isFoll = Boolean(selectedIssue?.isFollowing ?? following);
        const statusOrder = ["reported", "ai_classified", "assigned", "technician_accepted", "in_progress", "resolved"];
        const normStatus = (selectedIssue?.status || status).toLowerCase().replace(/[\s-]+/g, "_");
        const currentIndex = statusOrder.includes(normStatus) ? statusOrder.indexOf(normStatus) : 4;

        return <div className="wide-container"><button className="back-link" onClick={() => navigate("issues")}><Icon as={ArrowLeft} size={16} /> Back to issues</button><div className="detail-header"><div><div className="detail-id"><span className="mono">{selectedIssue?.displayId || "CO-2041"}</span><span className="dot-sep">·</span><span>{selectedIssue?.createdAt ? new Date(selectedIssue.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "Reported 24 Feb, 9:41 AM"}</span></div><h1>{selectedIssue?.title || "Projector malfunction in B204"}</h1><div className="detail-tags"><Badge tone={dTone} icon={CircleAlert}>{dLabel}</Badge><Badge tone={isResolved ? "success" : "warning"} icon={isResolved ? CircleCheck : Wrench}>{dStatus}</Badge><span className="affected-text"><Icon as={Users} size={16} /> {affCount} affected</span></div></div><div className="detail-actions"><Button variant="secondary" icon={isFoll ? Check : Bookmark} onClick={handleFollow}>{isFoll ? "Following" : "Follow"}</Button><Button icon={isAff ? Check : Plus} onClick={handleAffected} disabled={isAff}>{isAff ? "You're affected" : "I'm affected too"}</Button></div></div><div className="detail-grid"><div className="column-stack"><Card className="timeline-card"><SectionTitle title="Issue progress" aside={<span className="mono muted">UPDATED 12 MIN AGO</span>} /><div className="timeline">{["Reported", "AI classified", "Assigned", "Technician accepted", "Repair in progress", "Resolved"].map((s,i) => <div className={`timeline-step ${i < currentIndex ? "completed" : i === currentIndex ? "current" : "future"}`} key={s}><span className="timeline-node">{i < currentIndex ? <Icon as={Check} size={14} /> : i === currentIndex ? <span /> : null}</span><div><strong>{s}</strong><small>{["24 Feb · 9:41 AM", "24 Feb · 9:42 AM", "24 Feb · 9:48 AM", "24 Feb · 10:16 AM", "Today · 11:24 AM", isResolved ? "Today · 1:12 PM" : "Awaiting completion"][i]}</small></div>{i === currentIndex && <Badge tone={isResolved ? "success" : "blue"}>Current</Badge>}</div>)}</div></Card><Card className="details-card"><SectionTitle title="Issue details" /><div className="details-grid">{[["Location", [selectedIssue?.building, selectedIssue?.room].filter(Boolean).join(" · Room ") || "B Block · Room B204"], ["Category", selectedIssue?.category || "Electrical"], ["Asset", selectedIssue?.asset || "Classroom projector"], ["Department", selectedIssue?.department?.name || (assigned ? department : "Electrical")], ["Reported by", selectedIssue?.reporter?.name || "Abhinay Shinde"], ["Reference", selectedIssue?.displayId || "CO-2041"]].map(([k,v]) => <div key={k}><span>{k}</span><strong className={k === "Reference" ? "mono" : ""}>{v}</strong></div>)}</div><div className="attachment-block"><span className="eyebrow">ATTACHMENTS</span><div className="attachment"><Icon as={Paperclip} size={17} /><span>projector-b204.jpg</span><span className="mono">2.4 MB</span><button aria-label="Preview attachment" onClick={() => setToast("Attachment preview unavailable in this prototype.")}><Icon as={Eye} size={16} /></button></div></div></Card><Card className="comments-card"><SectionTitle title="Comments & activity" aside={<span className="muted">{selectedIssue?.comments?.length ?? 3} updates</span>} />{selectedIssue?.comments && selectedIssue.comments.length > 0 ? selectedIssue.comments.map((c: any) => <div className="comment" key={c.id}><span className={`avatar small-avatar ${c.author?.role === "technician" ? "technician-avatar" : ""}`}>{(c.author?.name || "User").split(" ").map((w: string)=>w[0]).join("").slice(0,2).toUpperCase()}</span><div><strong>{c.author?.name || "Campus Member"} <span className="mono muted">· {new Date(c.createdAt || Date.now()).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</span></strong><p>{c.body}</p></div></div>) : <><div className="comment"><span className="avatar small-avatar">AK</span><div><strong>Abhinay Shinde <span className="mono muted">· 9:41 AM</span></strong><p>The projector isn't turning on and our lecture is starting. We've tried reconnecting the laptop.</p></div></div><div className="comment"><span className="avatar small-avatar technician-avatar">RM</span><div><strong>Rohit More <span className="mono muted">· 11:24 AM</span></strong><p>On site now. Checking the power supply and HDMI connection.</p></div></div></>}<div className="comment-input"><input aria-label="Write a comment" placeholder="Write an update or ask a question..." value={commentInput} onChange={e => setCommentInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter") handleComment(); }} /><button aria-label="Send comment" onClick={handleComment}><Icon as={Send} size={17} /></button></div></Card></div><div className="column-stack"><Card className="detail-score"><PriorityBreakdown compact score={selectedIssue?.priorityScore} breakdown={selectedIssue?.priorityBreakdown} /></Card><Card className="assigned-card"><SectionTitle title="Assigned team" /><div className="team-row"><span className="team-icon"><Icon as={Zap} size={19} /></span><div><strong>{selectedIssue?.department?.name || department}</strong><span>Facilities & maintenance</span></div></div><div className="team-row"><span className="avatar small-avatar technician-avatar">RM</span><div><strong>{selectedIssue?.assignee?.name || (technician === "Select technician" ? "Rohit More" : technician)}</strong><span>On-site technician</span></div></div></Card>{role === "admin" && <Button variant="secondary" icon={Settings2} onClick={() => navigate("manage")}>Manage this issue</Button>}{isResolved && role === "student" && <Card className="confirm-card"><Icon as={CircleCheck} size={22} /><h2>Is this issue resolved?</h2><p>The campus team has marked this repair as complete. Please confirm the fix works for you.</p><Button onClick={handleConfirmResolution} icon={Check}>Confirm resolution</Button></Card>}</div></div></div>;
      })()}
      {page === "issues" && <div className="wide-container"><div className="page-heading"><div><span className="eyebrow">YOUR REPORTS</span><h1>My issues</h1><p>Track everything you've reported or joined.</p></div><Button icon={Plus} onClick={() => navigate("report")}>Report an issue</Button></div><div className="issue-tabs"><button className="selected">All issues <span>4</span></button><button onClick={() => setFilter("In progress")}>In progress</button><button onClick={() => setFilter("Resolved")}>Resolved</button></div><Card className="table-card"><div className="table-controls"><div className="table-search"><Icon as={Search} size={17} /><input aria-label="Search issues" placeholder="Search by title, location, or ID..." value={search} onChange={e => setSearch(e.target.value)} /></div><div className="table-filters"><label><Icon as={Filter} size={16} /><select value={filter} onChange={e => setFilter(e.target.value)} aria-label="Filter by status"><option>All statuses</option><option>In progress</option><option>Assigned</option><option>Under review</option><option>Resolved</option></select></label><label><select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)} aria-label="Filter by priority"><option>All priorities</option><option>Critical</option><option>High</option><option>Medium</option><option>Low</option></select></label><label><select aria-label="Filter by category"><option>All categories</option><option>Electrical</option><option>Network/Wi-Fi</option></select></label><label><Icon as={ListFilter} size={16} /><select aria-label="Sort issues"><option>Newest first</option><option>Oldest first</option></select></label></div></div><div className="issue-table-wrap"><table className="issue-table"><thead><tr><th>ISSUE</th><th>LOCATION</th><th>PRIORITY</th><th>STATUS</th><th>AFFECTED</th><th>UPDATED</th><th></th></tr></thead><tbody>{displayedRows.map(r => <tr key={r.id} onClick={() => handleSelectIssue(r.raw)} tabIndex={0} onKeyDown={e => e.key === "Enter" && handleSelectIssue(r.raw)}><td><span className="mono muted">{r.id}</span><strong>{r.title}</strong></td><td>{r.location}</td><td><Badge tone={r.priority === "Critical" ? "critical" : r.priority === "High" ? "warning" : "neutral"} icon={CircleAlert}>{r.priority}</Badge></td><td><Badge tone={r.status === "Resolved" ? "success" : "blue"} icon={r.status === "Resolved" ? Check : Clock3}>{r.status}</Badge></td><td className="mono">{r.affected}</td><td className="muted">{r.updated}</td><td><Icon as={ChevronRight} size={16} /></td></tr>)}</tbody></table></div><div className="mobile-issues">{displayedRows.map(r => <IssueItem key={r.id} row={r} onClick={() => handleSelectIssue(r.raw)} />)}</div>{displayedRows.length === 0 && <div className="empty-state"><Icon as={Inbox} size={30} /><h3>No active issues, campus is running smoothly</h3><p>Try adjusting your filters or report something that needs attention.</p><Button variant="secondary" onClick={() => { setFilter("All statuses"); setPriorityFilter("All priorities"); setSearch(""); }}>Clear filters</Button></div>}<div className="table-footer">Showing {displayedRows.length} of {issueRows.length} issues <span>Updated just now</span></div></Card></div>}
      {page === "admin" && (() => {
        // Derive building density from live heatmap or fall back to Figma values
        const totalIssues = heatmapData.reduce((s, b) => s + b.total, 0) || 48;
        const buildingIssues = (name: string, fallback: number) => {
          const found = heatmapData.find(b => b.building === name);
          return found ? found.total : fallback;
        };
        const densityClass = (name: string, fallback: "density-low" | "density-mid" | "density-high") => {
          const found = heatmapData.find(b => b.building === name);
          if (!found) return fallback;
          const pct = found.total / Math.max(1, totalIssues);
          return pct > 0.3 ? "density-high" : pct > 0.15 ? "density-mid" : "density-low";
        };

        // Category rows – use live data or Figma fallback
        const catRows = categoryData.length > 0
          ? categoryData.slice(0, 5).map(c => [c.category, c.count, c.percent] as [string, number, number])
          : [["Electrical", 19, 82], ["Network / Wi-Fi", 12, 57], ["Civil & furniture", 8, 41], ["Housekeeping", 5, 27], ["Security", 4, 18]] as [string, number, number][];

        // Dept performance rows
        const deptRows = deptPerfData.length > 0
          ? deptPerfData.slice(0, 5).map(d => [d.name, String(d.open), `${d.slaMetPercent}%`] as [string, string, string])
          : [["Electrical", "19", "92%"], ["Network/Wi-Fi", "12", "96%"], ["IT Maintenance", "8", "88%"]] as [string, string, string][];

        // Needs attention – live issues or Figma fallback
        const attentionRows = needsAttentionData.length > 0
          ? needsAttentionData.slice(0, 5).map((i: any) => ({
              title: `${i.title}${i.cluster ? ` · ${i.cluster.affectedCount} reports` : ""}`,
              loc: `${i.building || "Campus"} · ${i.department?.name || i.category}`,
              score: i.priorityScore,
              id: i.displayId || i.id,
              raw: i,
            }))
          : [{ title: "Projector B204 · 27 reports", loc: "B Block · Electrical", score: 87, id: "CO-2041", raw: null },
             { title: "Wi-Fi outages in C Block labs", loc: "C Block · Network/Wi-Fi", score: 82, id: "CO-2038", raw: null },
             { title: "Hostel water supply interruption", loc: "Hostel · Civil & Furniture", score: 74, id: "CO-2024", raw: null }];

        return <div className="wide-container"><div className="page-heading dashboard-heading"><div><div className="overline"><span className="live-dot" /> CAMPUS-WIDE VIEW · LIVE</div><h1>Campus Operations</h1><p>A clear picture of what needs attention across Sahyadri.</p></div><Button variant="secondary" icon={FileBarChart2} onClick={() => navigate("manage")}>Manage issues <Icon as={ArrowRight} size={16} /></Button></div><div className="admin-stats"><StatCard icon={ClipboardList} label="Open issues" value={adminStats ? String(adminStats.openIssues).padStart(2, "0") : "48"} change="-8.2%" /><StatCard icon={CircleAlert} label="Critical" value={adminStats ? String(adminStats.criticalIssues).padStart(2, "0") : "06"} change="+2 today" tone="red" /><StatCard icon={Clock3} label="Avg. resolution" value={adminStats ? `${adminStats.avgResolutionHours}h` : "2.4h"} change="-18%" tone="violet" /><StatCard icon={CircleCheck} label="Resolved today" value={adminStats ? String(adminStats.resolvedIssues).padStart(2, "0") : "14"} change="+6 today" tone="green" /><StatCard icon={AlertTriangle} label="SLA breaches" value={adminStats ? String(adminStats.slaBreaches).padStart(2, "0") : "03"} change="-1 today" tone="amber" /></div><div className="admin-main-grid"><Card className="map-card"><SectionTitle title="Campus issue density" aside={<span className="mono muted">LAST 24 HOURS</span>} /><p className="section-description">Issues by building · select a location to explore</p><div className="campus-map"><div className="map-road horizontal-road" /><div className="map-road vertical-road" /><button className={`building building-a ${densityClass("A Block", "density-low")} ${selectedBuilding === "A Block" ? "selected" : ""}`} onClick={() => setSelectedBuilding("A Block")}><span>A</span><small>ADMIN</small></button><button className={`building building-b ${densityClass("B Block", "density-high")} ${selectedBuilding === "B Block" ? "selected" : ""}`} onClick={() => setSelectedBuilding("B Block")}><span>B</span><small>CLASSROOMS</small></button><button className={`building building-c ${densityClass("C Block", "density-mid")} ${selectedBuilding === "C Block" ? "selected" : ""}`} onClick={() => setSelectedBuilding("C Block")}><span>C</span><small>LABS</small></button><button className={`building building-library ${densityClass("Library", "density-low")} ${selectedBuilding === "Library" ? "selected" : ""}`} onClick={() => setSelectedBuilding("Library")}><Icon as={BookOpen} size={19} /><small>LIBRARY</small></button><button className={`building building-hostel ${densityClass("Hostel", "density-mid")} ${selectedBuilding === "Hostel" ? "selected" : ""}`} onClick={() => setSelectedBuilding("Hostel")}><Icon as={Building2} size={19} /><small>HOSTEL</small></button><span className="map-label map-courtyard">CENTRAL COURTYARD</span><span className="map-label map-gate">MAIN ENTRANCE ↓</span></div><div className="map-bottom"><div className="map-legend"><span><i className="legend-low" /> Low</span><span><i className="legend-mid" /> Moderate</span><span><i className="legend-high" /> High</span></div><span className="map-selected"><Icon as={MapPin} size={14} /> {selectedBuilding}: {buildingIssues(selectedBuilding, selectedBuilding === "B Block" ? 19 : selectedBuilding === "C Block" ? 12 : selectedBuilding === "Hostel" ? 9 : 4)} issues</span></div></Card><div className="column-stack"><Card className="category-card"><SectionTitle title="Issues by category" aside={<Icon as={MoreHorizontal} size={19} />} />{catRows.map(([name, count, width]) => <div className="category-row" key={name}><span>{name}</span><div className="category-bar"><i style={{ width: `${width}%` }} /></div><strong className="mono">{count}</strong></div>)}</Card><Card className="performance-card"><SectionTitle title="Department performance" aside={<Icon as={ArrowUpRight} size={17} />} /><div className="performance-head"><span>DEPARTMENT</span><span>OPEN</span><span>SLA</span></div>{deptRows.map(([n, o, s]) => <div className="performance-row" key={n}><strong>{n}</strong><span className="mono">{o}</span><span className="mono performance-sla">{s}</span></div>)}<button className="inline-link" onClick={() => navigate("manage")}>View all departments <Icon as={ArrowRight} size={15} /></button></Card></div></div><Card className="attention-card"><SectionTitle title="Needs attention" aside={<button className="inline-link" onClick={() => navigate("manage")}>View issue queue <Icon as={ArrowRight} size={15} /></button>} /><p className="section-description">Highest-priority clusters that need a decision.</p><div className="attention-list">{attentionRows.map(r => <div className="attention-row" key={r.id}><span className="attention-score mono">{r.score}</span><div><strong>{r.title}</strong><span className="mono">{r.id} <span className="dot-sep">·</span> {r.loc}</span></div><Badge tone={r.score > 85 ? "critical" : "warning"} icon={CircleAlert}>{r.score > 85 ? "Critical" : "High"}</Badge><Button variant="secondary" onClick={() => { if (r.raw) setSelectedIssue(r.raw); navigate("manage"); }}>Assign <Icon as={ArrowRight} size={15} /></Button></div>)}</div></Card></div>;
      })()}

      {page === "manage" && (() => {
        const mScore = selectedIssue?.priorityScore ?? 87;
        const mTone: "critical" | "warning" | "neutral" = mScore >= 75 ? "critical" : mScore >= 40 ? "warning" : "neutral";
        const mLabel = mScore >= 75 ? "Critical" : mScore >= 40 ? "High" : "Low";
        const mAff = selectedIssue?.affectedCount ?? (selectedIssue?.cluster?.affectedCount || 27);
        const activeId = selectedIssue?.displayId || "CO-2041";

        return <div className="wide-container"><div className="page-heading"><div><span className="eyebrow">ADMINISTRATION / ISSUE QUEUE</span><h1>Issue management</h1><p>One clear queue. Duplicate reports, clustered automatically.</p></div><Badge tone="blue" icon={Layers3}>{adminStats ? `${adminStats.openIssues} open clusters` : "48 open clusters"}</Badge></div><div className="manage-layout"><Card className="cluster-list"><div className="cluster-top"><strong>Priority queue</strong><button aria-label="Filter queue" onClick={() => setToast("Queue sorted by priority score.")}><Icon as={ListFilter} size={18} /></button></div>{currentIssueRows.slice(0, 6).map(r => {
          const isSelected = r.id === activeId;
          const rScore = r.raw?.priorityScore ?? (r.priority === "Critical" ? 87 : r.priority === "High" ? 78 : 62);
          const rTone: "critical" | "warning" | "neutral" = rScore >= 75 ? "critical" : rScore >= 40 ? "warning" : "neutral";
          return <button className={`cluster-item ${isSelected ? "selected" : ""}`} key={r.id} onClick={() => {
            if (r.raw) {
              setSelectedIssue(r.raw);
              if (r.raw.department?.name) setDepartment(r.raw.department.name);
              if (r.raw.assignee?.name) setTechnician(r.raw.assignee.name);
              if (r.raw.status) setStatus(r.raw.status.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()));
            }
            setToast(`${r.id} selected.`);
          }}><div className="cluster-item-top"><span className="mono">{r.id}</span><Badge tone={rTone} icon={CircleAlert}>{rScore} / 100</Badge></div><strong>{r.title}{r.affected > 1 ? `, ${r.affected} reports` : ""}</strong><span>{r.location} · 4 hours ago</span>{isSelected && <div className="cluster-avatars"><span>AK</span><span>RM</span><span>+{Math.max(1, r.affected - 2)}</span><small>{r.affected} affected students</small></div>}</button>;
        })}</Card><Card className="manage-detail"><div className="manage-detail-head"><div><span className="mono muted">{selectedIssue?.displayId || "CO-2041"} · CLUSTERED ISSUE</span><h2>{selectedIssue?.title || "Projector malfunction in B204"}</h2><p>{mAff} reports grouped into one actionable issue</p></div><Badge tone={mTone} icon={CircleAlert}>{mLabel}</Badge></div><div className="manage-fields"><label>ASSIGN DEPARTMENT<select value={department} onChange={e => setDepartment(e.target.value)}><option>Electrical</option><option>IT Maintenance</option><option>Civil & Furniture</option><option>Housekeeping</option><option>Security</option><option>Network/Wi-Fi</option></select></label><label>ASSIGN TECHNICIAN<select value={technician} onChange={e => setTechnician(e.target.value)}><option value="">Select technician</option>{(technicianList.length > 0 ? technicianList : [{ id: "1", name: "Rohit More" }, { id: "2", name: "Priya Patil" }, { id: "3", name: "Sameer Deshmukh" }]).map(t => <option key={t.id} value={t.name}>{t.name}{t.department ? ` (${t.department})` : ""}{t.activeTasks != null ? ` — ${t.activeTasks} active` : ""}</option>)}</select></label><label>STATUS<select value={status} onChange={e => setStatus(e.target.value)}><option>Reported</option><option>AI classified</option><option>Assigned</option><option>Technician accepted</option><option>Repair in progress</option><option>Resolved</option></select></label></div><label className="internal-notes">INTERNAL NOTES<textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Add context for the assigned team..." /></label><div className="manage-actions"><span><Icon as={ShieldCheck} size={15} /> Notes are visible only to staff</span><Button onClick={handleAssignAndSave} icon={Check}>{assigned ? "Save changes" : "Assign & save"}</Button></div><div className="manage-breakdown"><PriorityBreakdown compact score={selectedIssue?.priorityScore} breakdown={selectedIssue?.priorityBreakdown} /></div><button className="inline-link" onClick={() => navigate("detail")}>View student-facing issue <Icon as={ArrowRight} size={15} /></button></Card></div></div>;
      })()}
      {page === "design" && <div className="wide-container"><div className="page-heading"><div><span className="eyebrow">FOUNDATIONS / COMPONENTS</span><h1>Campus OS design system</h1><p>A calm, precise visual language for every campus interaction.</p></div><Button variant="secondary" onClick={() => navigate("overview")}>View product <Icon as={ArrowRight} size={16} /></Button></div><Card className="ds-card"><SectionTitle title="Color tokens" /><div className="swatch-grid">{[["Background","var(--background)"],["Surface","var(--surface)"],["Raised","var(--raised)"],["Primary","#3B6CFF"],["AI / Violet","#7C5CFF"],["Success","#22C55E"],["Warning","#F59E0B"],["Critical","#EF4444"]].map(([n,c]) => <div className="swatch" key={n}><span style={{ background: c }} /><strong>{n}</strong><small className="mono">{c}</small></div>)}</div></Card><Card className="ds-card"><SectionTitle title="Typography" /><div className="type-samples"><div><span>DISPLAY / 32</span><h1>Built for a better campus.</h1></div><div><span>HEADING / 24</span><h2>Every issue deserves clarity.</h2></div><div><span>BODY / 14</span><p>Thoughtful interfaces help everyone move with confidence.</p></div><div><span>MONO / 12</span><code>CO-2041 · 87 / 100 · 09:41 AM</code></div></div></Card><Card className="ds-card"><SectionTitle title="Components & states" /><div className="ds-component-row"><span>BUTTONS</span><Button>Default</Button><Button variant="secondary">Secondary</Button><Button disabled>Disabled</Button><Button icon={LoaderCircle}>Loading</Button></div><div className="ds-component-row"><span>STATUS</span><Badge tone="success" icon={CircleCheck}>Resolved</Badge><Badge tone="warning" icon={Clock3}>In progress</Badge><Badge tone="critical" icon={CircleAlert}>Critical</Badge><Badge tone="violet" icon={Sparkles}>AI analyzed</Badge></div><div className="ds-component-row"><span>INPUTS</span><input className="field" placeholder="Default input" /><input className="field" value="Active input" readOnly /><input className="field input-error" placeholder="Error state" /></div></Card></div>}
      {page === "campus-ai" && <CampusAIPage navigate={navigate} toast={setToast} onPrefillComplaint={(text) => { setComplaint(text); navigate("report"); }} />}
      {page === "scholarships" && <ScholarshipsPage navigate={navigate} toast={setToast} />}
      {page === "notices" && <NoticesPage toast={setToast} />}
      {page === "events" && <EventsPage toast={setToast} />}
      {page === "lost" && <LostFoundPage toast={setToast} />}
      {page === "services" && <ServicesPage toast={setToast} />}
      {(page === "analytics" || page === "department") && <AnalyticsPage department={page === "department"} navigate={navigate} />}
      {page === "profile" && <ProfilePage theme={theme} setTheme={setTheme} role={role} switchRole={() => { setRole(role === "student" ? "admin" : "student"); navigate(role === "student" ? "admin" : "overview"); }} navigate={navigate} toast={setToast} />}
      {page === "activity" && <div className="wide-container"><div className="page-heading"><div><span className="eyebrow">YOUR WORKSPACE</span><h1>My Activity</h1><p>A record of the ways you’ve helped your campus.</p></div></div><Card className="placeholder-card"><Icon as={Activity} size={28} /><h2>Recent activity</h2><p>Reported CO-2041 · Joined a classroom issue · Followed the repair</p><Button variant="secondary" onClick={() => navigate("profile")}>View your profile <Icon as={ArrowRight} size={16} /></Button></Card></div>}
    </main></div>
    <nav className="mobile-tabs" aria-label="Mobile navigation">{[{ icon: Home, label: "Home", page: role === "admin" ? "admin" : "overview" }, { icon: ClipboardList, label: "Issues", page: role === "admin" ? "manage" : "issues" }, { icon: Sparkles, label: "Campus AI", page: "campus-ai" }, { icon: FileText, label: "Notices", page: "notices" }, { icon: Menu, label: "More", page: "activity" }].map(n => <button key={n.label} className={page === n.page ? "active" : ""} onClick={() => n.label === "More" ? setMobileMore(true) : navigate(n.page as Page)}><Icon as={n.icon} size={21} /><span>{n.label}</span></button>)}</nav>{page !== "report" && page !== "analysis" && <button className="mobile-report" onClick={() => navigate("report")}><Icon as={Plus} size={19} /> Report issue</button>}
    {mobileMore && <div className="drawer-overlay mobile-more-overlay" onMouseDown={() => setMobileMore(false)}><div className="mobile-more-sheet" onMouseDown={e => e.stopPropagation()} role="dialog" aria-label="More options"><div className="more-sheet-head"><strong>More from Campus OS</strong><button className="icon-button" onClick={() => setMobileMore(false)} aria-label="Close menu"><Icon as={X} size={19} /></button></div><button onClick={() => { setRole(role === "student" ? "admin" : "student"); navigate(role === "student" ? "admin" : "overview"); }}><Icon as={Users} size={19} /> Switch to {role === "student" ? "admin" : "student"} view <Icon as={ArrowRight} size={15} /></button><button onClick={() => { setMobileMore(false); setNotifications(true); }}><Icon as={Bell} size={19} /> Notifications <Icon as={ArrowRight} size={15} /></button><button onClick={() => navigate("profile")}><Icon as={UserRound} size={19} /> Profile & settings <Icon as={ArrowRight} size={15} /></button><button onClick={() => navigate("design")}><Icon as={Layers3} size={19} /> Design system <Icon as={ArrowRight} size={15} /></button><div className="more-sheet-theme"><span>APPEARANCE</span><div className="theme-control"><button title="Light theme" className={theme === "light" ? "selected" : ""} onClick={() => setTheme("light")}><Icon as={Sun} size={18} /> Light</button><button title="Dark theme" className={theme === "dark" ? "selected" : ""} onClick={() => setTheme("dark")}><Icon as={Moon} size={18} /> Dark</button><button title="System theme" className={theme === "system" ? "selected" : ""} onClick={() => setTheme("system")}><Icon as={Laptop} size={18} /> System</button></div></div><button onClick={() => navigate("login")}><Icon as={LogOut} size={19} /> Sign out <Icon as={ArrowRight} size={15} /></button></div></div>}
    {palette && <div className="overlay" onMouseDown={() => setPalette(false)}><div className="command-panel" onMouseDown={e => e.stopPropagation()} role="dialog" aria-label="Command palette"><div className="command-search"><Icon as={Search} size={21} /><input autoFocus placeholder="Search pages, issues, actions..." value={paletteQuery} onChange={e => setPaletteQuery(e.target.value)} /><kbd>ESC</kbd></div><div className="command-results">{[{ group: "ACTIONS", items: [{ label: "Report a new issue", icon: Plus, page: "report" as Page }, { label: "View notifications", icon: Bell, page: "overview" as Page }] }, { group: "PAGES", items: [{ label: "Overview", icon: LayoutDashboard, page: "overview" as Page }, { label: "My issues", icon: ClipboardList, page: "issues" as Page }, { label: "Campus Operations", icon: Activity, page: "admin" as Page }, { label: "Scholarships & schemes", icon: GraduationCap, page: "scholarships" as Page }, { label: "Campus services", icon: Layers3, page: "services" as Page }, { label: "Events & clubs", icon: CalendarDays, page: "events" as Page }, { label: "Profile & settings", icon: UserRound, page: "profile" as Page }, { label: "Design system", icon: Layers3, page: "design" as Page }] }, { group: "ISSUES", items: [{ label: "CO-2041 · Projector malfunction in B204", icon: Zap, page: "detail" as Page }] }, { group: "NOTICES", items: [{ label: "Mid-semester examination schedule", icon: FileText, page: "notices" as Page }] }].map(g => { const items = g.items.filter(i => i.label.toLowerCase().includes(paletteQuery.toLowerCase())); return items.length > 0 && <div className="command-group" key={g.group}><span>{g.group}</span>{items.map((i,idx) => <button className={g.group === "ACTIONS" && idx === 0 ? "highlighted" : ""} key={i.label} onClick={() => { if (i.label === "View notifications") { setPalette(false); setNotifications(true); } else navigate(i.page); }}><Icon as={i.icon} size={18} />{i.label}<Icon as={ArrowRight} size={15} /></button>)}</div>; })}</div><div className="command-footer"><span><kbd>↑</kbd><kbd>↓</kbd> to navigate</span><span><kbd>↵</kbd> to select</span><span>Campus OS <Icon as={Command} size={13} /></span></div></div></div>}
    {notifications && <div className="drawer-overlay" onMouseDown={() => setNotifications(false)}><aside className="notification-drawer" onMouseDown={e => e.stopPropagation()} role="dialog" aria-label="Notifications"><div className="drawer-head"><div><span className="eyebrow">YOUR INBOX</span><h2>Notifications {unread && <span className="notification-count">{unreadCount}</span>}</h2></div><button className="icon-button" onClick={() => setNotifications(false)} aria-label="Close notifications"><Icon as={X} size={20} /></button></div><div className="drawer-actions"><button onClick={async () => { try { await markNotificationsRead(); setUnread(false); setNotificationList(prev => prev.map(n => ({ ...n, read: true }))); setToast("All notifications marked as read."); } catch { setUnread(false); setToast("All notifications marked as read."); } }}><Icon as={CheckCheck} size={16} /> Mark all read</button><button onClick={async () => { try { await clearNotifications(); setUnread(false); setNotificationList([]); setToast("Notifications cleared."); } catch { setUnread(false); setNotificationList([]); setToast("Notifications cleared."); } }}><Icon as={Archive} size={16} /> Clear all</button></div><div className="drawer-content">{(() => {
      const criticalItems = notificationList.filter(n => n.type === "issue_critical" || n.title.toLowerCase().includes("critical") || n.body.toLowerCase().includes("critical") || (n.payload?.priorityScore && n.payload.priorityScore >= 75));
      const noticeItems = notificationList.filter(n => n.type.includes("notice") || n.type.includes("announcement") || n.title.toLowerCase().includes("schedule") || n.title.toLowerCase().includes("notice"));
      const updateItems = notificationList.filter(n => !criticalItems.includes(n) && !noticeItems.includes(n));

      if (notificationList.length > 0) {
        return <>
          {criticalItems.length > 0 && <div className="notification-group"><span>CRITICAL</span>{criticalItems.map(n => <button key={n.id} className="notification-item" onClick={() => { setNotifications(false); if (n.payload?.issueId) { getIssueById(n.payload.issueId).then(setSelectedIssue).catch(() => {}); navigate("detail"); } }}><span className="notification-icon danger"><Icon as={CircleAlert} size={19} /></span><span><strong>{n.title}</strong><small>{n.body}</small><em>{formatTimeAgo(n.createdAt)}</em></span>{!n.read && <i />}</button>)}</div>}
          {updateItems.length > 0 && <div className="notification-group"><span>UPDATES</span>{updateItems.map(n => { const isSuccess = n.title.toLowerCase().includes("resolved") || n.body.toLowerCase().includes("resolved"); return <button key={n.id} className="notification-item" onClick={() => { setNotifications(false); if (n.payload?.issueId) { getIssueById(n.payload.issueId).then(setSelectedIssue).catch(() => {}); navigate("detail"); } }}><span className={`notification-icon ${isSuccess ? "success" : "info"}`}><Icon as={isSuccess ? CircleCheck : Wrench} size={19} /></span><span><strong>{n.title}</strong><small>{n.body}</small><em>{formatTimeAgo(n.createdAt)}</em></span>{!n.read && <i />}</button>; })}</div>}
          {noticeItems.length > 0 && <div className="notification-group"><span>NOTICES</span>{noticeItems.map(n => <button key={n.id} className="notification-item" onClick={() => { setNotifications(false); navigate("notices"); }}><span className="notification-icon info"><Icon as={FileText} size={19} /></span><span><strong>{n.title}</strong><small>{n.body}</small><em>{formatTimeAgo(n.createdAt)}</em></span>{!n.read && <i />}</button>)}</div>}
        </>;
      }
      if (unread) {
        return <><div className="notification-group"><span>CRITICAL</span><button className="notification-item" onClick={() => { setNotifications(false); navigate("detail"); }}><span className="notification-icon danger"><Icon as={CircleAlert} size={19} /></span><span><strong>Projector B204 needs attention</strong><small>27 students affected · Priority score 87</small><em>12 min ago</em></span><i /></button></div><div className="notification-group"><span>UPDATES</span><button className="notification-item" onClick={() => { setNotifications(false); navigate("detail"); }}><span className="notification-icon info"><Icon as={Wrench} size={19} /></span><span><strong>Technician accepted CO-2041</strong><small>Rohit More is working on the projector.</small><em>38 min ago</em></span><i /></button><button className="notification-item" onClick={() => { setNotifications(false); navigate("detail"); }}><span className="notification-icon success"><Icon as={CircleCheck} size={19} /></span><span><strong>Your issue CO-2041 has been resolved. Please confirm.</strong><small>Let us know if everything is working again.</small><em>Just now</em></span><i /></button></div><div className="notification-group"><span>NOTICES</span><button className="notification-item" onClick={() => { setNotifications(false); navigate("notices"); }}><span className="notification-icon info"><Icon as={FileText} size={19} /></span><span><strong>Mid-semester schedule published</strong><small>View the latest examination timetable.</small><em>Yesterday</em></span></button></div></>;
      }
      return <div className="empty-state drawer-empty"><Icon as={Inbox} size={32} /><h3>No notifications</h3><p>You're all caught up. Updates will appear here.</p></div>;
    })()}</div><div className="drawer-footer"><button onClick={() => setToast("Notification preferences are managed by your campus.")}><Icon as={Settings2} size={17} /> Notification preferences <Icon as={ArrowRight} size={15} /></button></div></aside></div>}
    {toast && <div className="toast" role="status"><Icon as={CircleCheck} size={18} />{toast}<button onClick={() => setToast("")} aria-label="Dismiss"><Icon as={X} size={15} /></button></div>}
  </div>;
}
