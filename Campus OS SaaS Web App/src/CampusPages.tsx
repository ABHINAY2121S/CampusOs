import { useEffect, useMemo, useState } from "react"
import {
  Activity,
  ArrowDownRight,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Bell,
  BookOpen,
  Bookmark,
  Building2,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
  CircleAlert,
  CircleCheck,
  Clock3,
  Coffee,
  FileText,
  Filter,
  GraduationCap,
  HeartPulse,
  Inbox,
  Laptop,
  MapPin,
  MessageCircle,
  Moon,
  Plus,
  Printer,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Sun,
  TrainFront,
  UploadCloud,
  Users,
  Wifi,
  Wrench,
  X,
  type LucideIcon,
} from "lucide-react"
import {
  Action,
  Badge,
  Button,
  Card,
  Heading,
  Icon,
  SectionTitle,
  SelectField,
  TextAreaField,
  TextField,
  type Page,
} from "./ui"

type Nav = (page: Page) => void
type BaseProps = { toast: (message: string) => void }
const heading = (
  eyebrow: string,
  title: string,
  subtitle: string,
  aside?: React.ReactNode,
) => (
  <div className="page-heading secondary-heading">
    <div>
      <span className="eyebrow">{eyebrow}</span>
      <Heading level={1}>{title}</Heading>
      <p>{subtitle}</p>
    </div>
    {aside}
  </div>
)
const suggestions = [
  "Am I eligible for any scholarships?",
  "When does the library close today?",
  "How do I report a broken projector?",
  "What's happening on campus this week?",
  "Where can I get a bonafide certificate?",
]
const chatAnswers: Record<string, {
  text: string
  source: string
  meta: string
  action: string
  page: Page
}> = {
  scholarship: {
    text: "Based on your SE Computer Engineering profile, you're likely eligible for the Maharashtra Post-Matric Scholarship and the SIT Merit Grant. The Post-Matric application window closes in 18 days. Check each scheme's income and document requirements before applying.",
    source: "Student Welfare Office · 2026–27 schemes",
    meta: "Updated 2 days ago",
    action: "Check eligibility",
    page: "scholarships",
  },
  library: {
    text: "The Central Library is open until 9:00 PM today. Reading halls are currently at high occupancy, so you may want to arrive early to find a seat.",
    source: "Library services · Live hours",
    meta: "Updated just now",
    action: "View service",
    page: "services",
  },
  projector: {
    text: "You can describe the problem in plain language and Campus AI will identify the location, category, and any similar reports. There's already an active projector issue in B204 affecting 27 students.",
    source: "Campus issue reporting · CO-2041",
    meta: "Updated 12 min ago",
    action: "Report issue",
    page: "report",
  },
  events: {
    text: "TechFest 2026 registrations are open this week. The Robotics Club also has an open workshop on Saturday in C Block. You can explore events and register from the Events page.",
    source: "Campus events calendar · February 2026",
    meta: "Updated today",
    action: "Explore events",
    page: "events",
  },
  certificate: {
    text: "You can request a bonafide certificate at the Student Office in A Block, ground floor. Bring your student ID. The office is open Monday to Friday, 9:30 AM to 5:00 PM.",
    source: "Student Office · Service guide",
    meta: "Updated this month",
    action: "View service",
    page: "services",
  },
}
function getAnswer(question: string) {
  const q = question.toLowerCase()
  return chatAnswers[
    q.includes("scholarship") || q.includes("scheme") || q.includes("eligib")
      ? "scholarship"
      : q.includes("library")
        ? "library"
        : q.includes("projector") || q.includes("report") || q.includes("issue")
          ? "projector"
          : q.includes("event") || q.includes("week")
            ? "events"
            : "certificate"
  ]
}
type ChatMessage = {
  question: string
  answer: ReturnType<typeof getAnswer>
}
export function CampusAIPage({
  navigate,
  toast,
}: BaseProps & { navigate: Nav }) {
  const [draft, setDraft] = useState("")
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [history, setHistory] = useState<{
    title: string
    messages: ChatMessage[]
  }[]>([])
  const [active, setActive] = useState("New conversation")
  const ask = (question = draft) => {
    if (!question.trim()) return
    setMessages((prev) => [
      ...prev,
      { question: question.trim(), answer: getAnswer(question) },
    ])
    setDraft("")
    setActive(question.trim().slice(0, 38))
  }
  const newChat = () => {
    if (messages.length)
      setHistory((prev) => [{ title: messages[0].question, messages }, ...prev])
    setMessages([])
    setActive("New conversation")
  }
  return (
    <div className="wide-container ai-page">
      {heading(
        "CAMPUS INTELLIGENCE",
        "Campus AI",
        "Answers grounded in your campus, with sources you can trust.",
        <Badge tone="violet" icon={Sparkles}>
          Campus-aware assistant
        </Badge>,
      )}
      <div className="ai-layout">
        <Card className="ai-history">
          <div className="ai-history-top">
            <span className="eyebrow">CONVERSATIONS</span>
            <Action aria-label="New conversation" onClick={newChat}>
              <Icon as={Plus} size={17} />
            </Action>
          </div>
          <Action
            className={`history-row ${
              active === "New conversation" ? "selected" : ""
            }`}
            onClick={newChat}
          >
            <Icon as={Plus} size={16} /> New conversation
          </Action>
          <span className="history-caption">RECENT</span>
          {history.map((h, i) => (
            <Action
              key={`${h.title}-${i}`}
              className={`history-row ${active === h.title ? "selected" : ""}`}
              onClick={() => {
                setMessages(h.messages)
                setActive(h.title)
              }}
            >
              <Icon as={MessageCircle} size={16} />
              <span>{h.title}</span>
            </Action>
          ))}
          {[
            "Scholarship options for SE students",
            "Library hours and services",
            "TechFest registration",
          ].map((t, i) => (
            <Action
              key={t}
              className="history-row"
              onClick={() => {
                const question = [
                  suggestions[0],
                  suggestions[1],
                  suggestions[3],
                ][i]
                setMessages([{ question, answer: getAnswer(question) }])
                setActive(t)
              }}
            >
              <Icon as={MessageCircle} size={16} />
              <span>{t}</span>
            </Action>
          ))}
          <div className="history-foot">
            <Icon as={ShieldCheck} size={16} />
            <span>Answers are sourced from verified campus information.</span>
          </div>
        </Card>
        <Card className="ai-chat">
          <div className="ai-chat-top">
            <span className="ai-icon small">
              <Icon as={Sparkles} size={18} />
            </span>
            <div>
              <strong>Campus AI</strong>
              <small>
                <span className="live-dot" /> Ready to help
              </small>
            </div>
            <Badge tone="violet">BETA</Badge>
          </div>
          <div className="ai-chat-body" aria-live="polite">
            {messages.length === 0 ? (
              <div className="ai-welcome">
                <div className="ai-welcome-icon">
                  <Icon as={Sparkles} size={24} />
                </div>
                <span className="eyebrow">YOUR CAMPUS, EXPLAINED</span>
                <Heading level={2}>
                  Hi Abhinay, what can I help you find?
                </Heading>
                <p>
                  Ask about schemes, services, events, or how things work around
                  Sahyadri. I'll show you where my answers come from.
                </p>
                <div className="prompt-grid">
                  {suggestions.map((s, i) => (
                    <Action key={s} onClick={() => ask(s)}>
                      <Icon
                        as={
                          [
                            GraduationCap,
                            BookOpen,
                            Wrench,
                            CalendarDays,
                            FileText,
                          ][i]
                        }
                        size={17}
                      />
                      <span>{s}</span>
                      <Icon as={ArrowUpRight} size={14} />
                    </Action>
                  ))}
                </div>
              </div>
            ) : (
              <div className="conversation">
                {messages.map((m, i) => (
                  <div className="chat-exchange" key={`${m.question}-${i}`}>
                    <div className="chat-user">
                      <span>{m.question}</span>
                      <span className="avatar small-avatar">AK</span>
                    </div>
                    <div className="chat-response">
                      <span className="ai-icon small">
                        <Icon as={Sparkles} size={16} />
                      </span>
                      <div>
                        <strong>Campus AI</strong>
                        <p>{m.answer.text}</p>
                        <div className="source-card">
                          <span className="source-icon">
                            <Icon as={FileText} size={17} />
                          </span>
                          <div>
                            <span className="eyebrow">SOURCE / REFERENCE</span>
                            <strong>{m.answer.source}</strong>
                            <small>{m.answer.meta}</small>
                          </div>
                          <Icon as={ArrowUpRight} size={16} />
                        </div>
                        <div className="chat-answer-actions">
                          <Button
                            variant="secondary"
                            onClick={() => navigate(m.answer.page)}
                          >
                            {m.answer.action} <Icon as={ArrowRight} size={15} />
                          </Button>
                          {m.answer.page === "scholarships" && (
                            <Button
                              variant="ghost"
                              onClick={() => navigate("scholarships")}
                            >
                              View scheme
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <form
            className="ai-composer"
            onSubmit={(e) => {
              e.preventDefault()
              ask()
            }}
          >
            <div>
              <Icon as={Sparkles} size={18} />
              <TextField
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                aria-label="Ask Campus AI"
                placeholder="Ask anything about your campus..."
              />
              <Action
                aria-label="Send message"
                type="submit"
                disabled={!draft.trim()}
              >
                <Icon as={Send} size={17} />
              </Action>
            </div>
            <span>
              Campus AI can make mistakes. Verify important information with the
              source.
            </span>
          </form>
        </Card>
      </div>
    </div>
  )
}

const schemes = [
  {
    id: "maha",
    name: "Maharashtra Post-Matric Scholarship",
    org: "Government of Maharashtra",
    category: "Government",
    tags: ["SE students", "Income-based"],
    days: 18,
    recommended: true,
    description:
      "Financial support for eligible students pursuing professional degree courses in Maharashtra.",
    icon: GraduationCap,
  },
  {
    id: "merit",
    name: "SIT Merit Excellence Grant",
    org: "Sahyadri Institute of Technology",
    category: "Institute",
    tags: ["Merit-based", "All departments"],
    days: 32,
    recommended: true,
    description:
      "Recognition and fee support for students demonstrating outstanding academic performance.",
    icon: Sparkles,
  },
  {
    id: "eebc",
    name: "EBC Fee Reimbursement Scheme",
    org: "Directorate of Technical Education",
    category: "Government",
    tags: ["Income-based", "Maharashtra domicile"],
    days: 25,
    recommended: true,
    description:
      "Tuition and examination fee reimbursement for eligible economically backward students.",
    icon: BookOpen,
  },
  {
    id: "research",
    name: "Undergraduate Research Fellowship",
    org: "SIT Research Cell",
    category: "Research",
    tags: ["SE–BE students", "Faculty nomination"],
    days: 46,
    recommended: false,
    description:
      "A semester-long stipend to explore applied research with a faculty mentor.",
    icon: Activity,
  },
  {
    id: "women",
    name: "Women in Engineering Award",
    org: "SIT Student Welfare Office",
    category: "Institute",
    tags: ["Women students", "Engineering"],
    days: 39,
    recommended: false,
    description:
      "Supporting women pursuing engineering through mentorship and financial assistance.",
    icon: GraduationCap,
  },
]
export function ScholarshipsPage({
  navigate,
  toast,
}: BaseProps & { navigate: Nav }) {
  const [saved, setSaved] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("campus-saved-schemes") || "[]")
    } catch {
      return []
    }
  })
  const [filters, setFilters] = useState({
    category: "All categories",
    eligibility: "All eligibility",
    year: "All years",
    department: "All departments",
    deadline: "Any deadline",
  })
  const toggleSave = (id: string) =>
    setSaved((prev) => {
      const next = prev.includes(id)
        ? prev.filter((x) => x !== id)
        : [...prev, id]
      localStorage.setItem("campus-saved-schemes", JSON.stringify(next))
      return next
    })
  const visible = schemes.filter(
    (s) =>
      (filters.category === "All categories" ||
        s.category === filters.category) &&
      (filters.eligibility === "All eligibility" ||
        s.tags.some((t) =>
          t.toLowerCase().includes(filters.eligibility.toLowerCase()),
        )) &&
      (filters.deadline === "Any deadline" ||
        s.days <= Number(filters.deadline.split(" ")[0])) &&
      (filters.year === "All years" ||
        s.tags.some((t) => t.includes("SE") || t.includes("All"))) &&
      (filters.department === "All departments" ||
        s.tags.some(
          (t) =>
            t.includes("Engineering") ||
            t.includes("departments") ||
            t.includes("SE"),
        )),
  )
  const card = (s: typeof schemes[number], featured = false) => (
    <Card
      className={`scheme-card ${featured ? "recommended-scheme" : ""}`}
      key={s.id}
    >
      <div className="scheme-head">
        <span className="scheme-icon">
          <Icon as={s.icon} size={20} />
        </span>
        <Action
          className={`save-action ${saved.includes(s.id) ? "is-saved" : ""}`}
          aria-label={`${saved.includes(s.id) ? "Unsave" : "Save"} ${s.name}`}
          onClick={() => toggleSave(s.id)}
        >
          <Icon as={Bookmark} size={18} />
        </Action>
      </div>
      <span className="eyebrow">{s.org}</span>
      <Heading level={3}>{s.name}</Heading>
      <p>{s.description}</p>
      <div className="scheme-tags">
        {s.tags.map((t) => (
          <span key={t}>{t}</span>
        ))}
      </div>
      <div className="scheme-bottom">
        <span className="deadline">
          <Icon as={Clock3} size={15} />
          <strong>{s.days} days left</strong> · Closes{" "}
          {new Date(Date.now() + s.days * 86400000).toLocaleDateString(
            "en-IN",
            { day: "numeric", month: "short" },
          )}
        </span>
        <Action
          onClick={() =>
            toast(
              `${s.name}: review the scheme guidelines at the Student Welfare Office before applying.`,
            )
          }
        >
          View scheme <Icon as={ArrowRight} size={15} />
        </Action>
      </div>
    </Card>
  )
  return (
    <div className="wide-container opportunities-page">
      {heading(
        "OPPORTUNITIES / STUDENT WELFARE",
        "Scholarships & schemes",
        "Find financial support and opportunities that fit your profile.",
        <Button
          variant="secondary"
          icon={Sparkles}
          onClick={() => navigate("campus-ai")}
        >
          Ask Campus AI
        </Button>,
      )}
      <Card className="opportunity-intro">
        <div>
          <span className="eyebrow">MATCHED TO YOUR PROFILE</span>
          <Heading level={2}>Support for your next step.</Heading>
          <p>
            SE Computer Engineering · Sahyadri Institute of Technology · Pune
          </p>
        </div>
        <span className="opportunity-count mono">
          05 <small>OPEN SCHEMES</small>
        </span>
      </Card>
      <div className="secondary-section-head">
        <div>
          <Heading level={2}>Recommended for you</Heading>
          <p>Based on your year, course and campus profile.</p>
        </div>
        <Badge tone="blue" icon={Check}>
          3 potential matches
        </Badge>
      </div>
      <div className="scheme-grid recommended-grid">
        {schemes.filter((s) => s.recommended).map((s) => card(s, true))}
      </div>
      <div className="secondary-section-head">
        <div>
          <Heading level={2}>Explore all opportunities</Heading>
          <p>Filter to find the right scheme for you.</p>
        </div>
      </div>
      <Card className="filters-panel">
        <div className="filter-title">
          <Icon as={Filter} size={17} />
          <span>FILTERS</span>
        </div>
        <div className="scheme-filters">
          {([
            [
              "category",
              "Category",
              ["All categories", "Government", "Institute", "Research"],
            ],
            [
              "eligibility",
              "Eligibility",
              ["All eligibility", "Merit", "Income", "Women"],
            ],
            ["year", "Year", ["All years", "SE Computer"]],
            [
              "department",
              "Department",
              ["All departments", "Computer Engineering"],
            ],
            ["deadline", "Deadline", ["Any deadline", "20 days", "30 days"]],
          ] as const).map(([key, label, options]) => (
            <label key={key}>
              {label}
              <SelectField
                value={filters[key]}
                onChange={(e) =>
                  setFilters({ ...filters, [key]: e.target.value })
                }
              >
                {options.map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </SelectField>
            </label>
          ))}
        </div>
      </Card>
      <div className="scheme-grid all-schemes">
        {visible.map((s) => card(s))}
      </div>
      {visible.length === 0 && (
        <Card className="empty-state">
          <Icon as={Inbox} size={29} />
          <Heading level={3}>No schemes match these filters</Heading>
          <p>Try expanding your search criteria.</p>
          <Button
            variant="secondary"
            onClick={() =>
              setFilters({
                category: "All categories",
                eligibility: "All eligibility",
                year: "All years",
                department: "All departments",
                deadline: "Any deadline",
              })
            }
          >
            Clear filters
          </Button>
        </Card>
      )}
    </div>
  )
}

type Notice = {
  id: number
  category: string
  title: string
  body: string
  date: string
  pinned?: boolean
  emergency?: boolean
  unread?: boolean
  from: string
}
const notices: Notice[] = [
  {
    id: 1,
    category: "Emergency",
    title: "Temporary water supply interruption in Hostel Block",
    body: "Water supply in the east wing will be paused for maintenance from 2:00 to 4:00 PM. Alternate facilities are available in the west wing.",
    date: "Today · 10:24 AM",
    pinned: true,
    emergency: true,
    unread: true,
    from: "Campus Administration",
  },
  {
    id: 2,
    category: "Examination",
    title: "Mid-semester examination timetable released",
    body: "The revised timetable for SE and TE engineering has been published. Please check your department notice board for room allocation.",
    date: "Today · 9:10 AM",
    pinned: true,
    unread: true,
    from: "Examination Cell",
  },
  {
    id: 3,
    category: "Placement",
    title: "TCS campus recruitment drive · Registrations open",
    body: "Eligible final-year students can register through the placement cell before Friday, 5:00 PM.",
    date: "Yesterday · 4:32 PM",
    unread: true,
    from: "Training & Placement Cell",
  },
  {
    id: 4,
    category: "Department",
    title: "SE Computer Engineering project review schedule",
    body: "The first project review for Division B will be held next week in C Block Lab 03.",
    date: "Yesterday · 11:05 AM",
    from: "Computer Engineering",
  },
  {
    id: 5,
    category: "Events",
    title: "TechFest 2026 · Team registrations are live",
    body: "Bring your ideas to the biggest student-run technology festival on campus.",
    date: "20 Feb · 2:00 PM",
    from: "Student Council",
  },
  {
    id: 6,
    category: "College",
    title: "Library extended hours during examination week",
    body: "The Central Library will stay open until 10:00 PM during the mid-semester exam period.",
    date: "18 Feb · 3:15 PM",
    from: "Central Library",
  },
]
export function NoticesPage({ toast }: BaseProps) {
  const [category, setCategory] = useState("All notices")
  const [query, setQuery] = useState("")
  const [read, setRead] = useState<number[]>([])
  const visible = notices.filter(
    (n) =>
      (category === "All notices" || n.category === category) &&
      `${n.title} ${n.body} ${n.from}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  )
  const item = (n: Notice) => (
    <Card
      key={n.id}
      className={`notice-entry ${n.emergency ? "notice-emergency" : ""}`}
    >
      <div className="notice-entry-icon">
        <Icon
          as={
            n.emergency
              ? CircleAlert
              : n.category === "Events"
                ? CalendarDays
                : FileText
          }
          size={20}
        />
      </div>
      <div className="notice-entry-body">
        <div className="notice-entry-meta">
          <Badge
            tone={n.emergency ? "critical" : "neutral"}
            icon={n.emergency ? CircleAlert : undefined}
          >
            {n.category}
          </Badge>
          {n.pinned && (
            <span className="pinned-label">
              <Icon as={Bookmark} size={13} /> Pinned
            </span>
          )}
          {n.unread && !read.includes(n.id) && (
            <span className="unread-label">
              <span /> Unread
            </span>
          )}
        </div>
        <Heading level={3}>{n.title}</Heading>
        <p>{n.body}</p>
        <div className="notice-entry-foot">
          <span>
            {n.from} <span className="dot-sep">·</span>{" "}
            <span className="mono">{n.date}</span>
          </span>
          <Action
            onClick={() => {
              setRead((prev) => [...prev, n.id])
              toast("Notice marked as read.")
            }}
          >
            {read.includes(n.id) || !n.unread ? "Read" : "Mark as read"}{" "}
            <Icon as={ArrowRight} size={14} />
          </Action>
        </div>
      </div>
    </Card>
  )
  return (
    <div className="wide-container notices-page">
      {heading(
        "CAMPUS COMMUNICATIONS",
        "Notices",
        "Official updates, without the notice-board hunt.",
        <Badge tone="blue" icon={Bell}>
          {notices.filter((n) => n.unread && !read.includes(n.id)).length}{" "}
          unread
        </Badge>,
      )}
      <div className="notices-toolbar">
        <div className="table-search">
          <Icon as={Search} size={17} />
          <TextField
            aria-label="Search notices"
            placeholder="Search notices..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div
          className="notice-filters"
          role="group"
          aria-label="Notice categories"
        >
          {[
            "All notices",
            "College",
            "Department",
            "Examination",
            "Placement",
            "Events",
            "Emergency",
          ].map((c) => (
            <Action
              key={c}
              className={category === c ? "active" : ""}
              onClick={() => setCategory(c)}
            >
              {c}
            </Action>
          ))}
        </div>
      </div>
      {category === "All notices" && !query && (
        <>
          <div className="secondary-section-head">
            <Heading level={2}>Pinned announcements</Heading>
            <span className="muted">Important for everyone on campus</span>
          </div>
          <div className="notice-stack">
            {visible.filter((n) => n.pinned).map(item)}
          </div>
          <div className="secondary-section-head">
            <Heading level={2}>Latest notices</Heading>
            <span className="muted">From across your campus</span>
          </div>
        </>
      )}
      <div className="notice-stack">
        {(category === "All notices" && !query
          ? visible.filter((n) => !n.pinned)
          : visible
        ).map(item)}
      </div>
      {visible.length === 0 && (
        <Card className="empty-state">
          <Icon as={Inbox} size={28} />
          <Heading level={3}>No notices found</Heading>
          <p>Try a different category or search term.</p>
        </Card>
      )}
    </div>
  )
}

const eventImages = {
  tech: "/images/techfest.jpg",
  music: "/images/cultural-fest.jpg",
  workshop: "/images/robotics.jpg",
}
const events = [
  {
    id: "techfest",
    title: "TechFest 2026: Build what comes next",
    category: "Technology",
    image: eventImages.tech,
    alt: "Audience at a technology conference",
    day: "28",
    month: "FEB",
    time: "9:00 AM – 6:00 PM",
    venue: "Main Auditorium · A Block",
    organizer: "Student Council & Tech Cell",
    status: "Open for registration",
  },
  {
    id: "robotics",
    title: "Build a bot: Robotics workshop",
    category: "Workshop",
    image: eventImages.workshop,
    alt: "Robot prototype at a workshop",
    day: "01",
    month: "MAR",
    time: "10:00 AM – 2:00 PM",
    venue: "Innovation Lab · C Block",
    organizer: "Robotics Club",
    status: "Few seats left",
  },
  {
    id: "soundscape",
    title: "Soundscape: An evening of music",
    category: "Culture",
    image: eventImages.music,
    alt: "Band performing on an outdoor stage",
    day: "06",
    month: "MAR",
    time: "5:30 PM – 8:30 PM",
    venue: "Central Courtyard",
    organizer: "Cultural Committee",
    status: "Open for registration",
  },
]
const clubs = [
  {
    name: "Robotics Club",
    area: "Technology & making",
    members: 86,
    icon: Wrench,
    description:
      "Build, break, iterate. From autonomous bots to campus-wide build days.",
  },
  {
    name: "CodeCraft",
    area: "Software & open source",
    members: 124,
    icon: Laptop,
    description:
      "A community for shipping ideas, contributing to open source, and growing together.",
  },
  {
    name: "The Literary Circle",
    area: "Arts & expression",
    members: 58,
    icon: BookOpen,
    description:
      "A home for curious readers, writers, and people who love a good conversation.",
  },
  {
    name: "Sahyadri Outreach",
    area: "Community & impact",
    members: 72,
    icon: HeartPulse,
    description:
      "Small actions, real impact. Volunteering in and beyond our campus.",
  },
]
export function EventsPage({ toast }: BaseProps) {
  const [tab, setTab] = useState<"events" | "clubs">("events")
  const [registered, setRegistered] = useState<string[]>(() => {
    try {
      return JSON.parse(
        localStorage.getItem("campus-event-registrations") || "[]",
      )
    } catch {
      return []
    }
  })
  const [joined, setJoined] = useState<string[]>([])
  return (
    <div className="wide-container events-page">
      {heading(
        "CAMPUS LIFE",
        "Events & clubs",
        "Show up for the things that make campus yours.",
        <Badge tone="blue" icon={CalendarDays}>
          3 upcoming events
        </Badge>,
      )}
      <div className="issue-tabs">
        <Action
          className={tab === "events" ? "selected" : ""}
          onClick={() => setTab("events")}
        >
          Upcoming events <span>3</span>
        </Action>
        <Action
          className={tab === "clubs" ? "selected" : ""}
          onClick={() => setTab("clubs")}
        >
          Campus clubs <span>4</span>
        </Action>
      </div>
      {tab === "events" ? (
        <>
          <div className="secondary-section-head">
            <div>
              <Heading level={2}>Coming up on campus</Heading>
              <p>Find your people. Make something memorable.</p>
            </div>
          </div>
          <div className="event-grid">
            {events.map((e) => (
              <Card className="event-card" key={e.id}>
                <div className="event-cover">
                  <img src={e.image} alt={e.alt} loading="lazy" />
                  <span className="event-date">
                    <strong>{e.day}</strong>
                    <small>{e.month}</small>
                  </span>
                </div>
                <div className="event-content">
                  <span className="eyebrow">
                    {e.category.toUpperCase()} · {e.organizer}
                  </span>
                  <Heading level={3}>{e.title}</Heading>
                  <div className="event-meta">
                    <span>
                      <Icon as={Clock3} size={16} /> {e.time}
                    </span>
                    <span>
                      <Icon as={MapPin} size={16} /> {e.venue}
                    </span>
                  </div>
                  <div className="event-bottom">
                    <Badge
                      tone={
                        registered.includes(e.id)
                          ? "success"
                          : e.status === "Few seats left"
                            ? "warning"
                            : "blue"
                      }
                      icon={registered.includes(e.id) ? CircleCheck : Clock3}
                    >
                      {registered.includes(e.id) ? "Registered" : e.status}
                    </Badge>
                    <Button
                      variant={
                        registered.includes(e.id) ? "secondary" : "primary"
                      }
                      onClick={() => {
                        setRegistered((prev) => {
                          const next = prev.includes(e.id)
                            ? prev.filter((x) => x !== e.id)
                            : [...prev, e.id]
                          localStorage.setItem(
                            "campus-event-registrations",
                            JSON.stringify(next),
                          )
                          return next
                        })
                        toast(
                          registered.includes(e.id)
                            ? "Registration cancelled."
                            : `You're registered for ${e.title}.`,
                        )
                      }}
                    >
                      {registered.includes(e.id) ? "Cancel" : "Register"}
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </>
      ) : (
        <>
          <div className="secondary-section-head">
            <div>
              <Heading level={2}>Find your community</Heading>
              <p>Student-led spaces to learn, create and belong.</p>
            </div>
          </div>
          <div className="club-grid">
            {clubs.map((c) => (
              <Card className="club-card" key={c.name}>
                <span className="club-icon">
                  <Icon as={c.icon} size={22} />
                </span>
                <span className="eyebrow">{c.area.toUpperCase()}</span>
                <Heading level={3}>{c.name}</Heading>
                <p>{c.description}</p>
                <div className="club-footer">
                  <span>
                    <Icon as={Users} size={15} /> {c.members} members
                  </span>
                  <Button
                    variant={joined.includes(c.name) ? "secondary" : "primary"}
                    onClick={() => {
                      setJoined((prev) =>
                        prev.includes(c.name)
                          ? prev.filter((x) => x !== c.name)
                          : [...prev, c.name],
                      )
                      toast(
                        joined.includes(c.name)
                          ? `Left ${c.name}.`
                          : `Joined ${c.name}.`,
                      )
                    }}
                  >
                    {joined.includes(c.name) ? "Joined" : "Join club"}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

const itemReports = [
  {
    name: "Black canvas backpack",
    type: "Lost",
    ref: "LF-1082",
    location: "Central Library · Ground floor",
    when: "Today · 11:30 AM",
    description:
      "Black backpack with a small silver keychain on the front zip.",
    icon: BookOpen,
  },
  {
    name: "Black canvas backpack",
    type: "Found",
    ref: "LF-1079",
    location: "Central Library · Reading hall",
    when: "Today · 12:05 PM",
    description:
      "Black backpack with a metallic keychain, handed in at the library desk.",
    icon: BookOpen,
  },
  {
    name: "Blue water bottle",
    type: "Found",
    ref: "LF-1076",
    location: "C Block · Lab 02",
    when: "Yesterday · 4:15 PM",
    description: "Blue stainless-steel water bottle, no name label.",
    icon: BookOpen,
  },
]
export function LostFoundPage({ toast }: BaseProps) {
  const [mode, setMode] = useState<"Lost" | "Found">("Lost")
  const [open, setOpen] = useState(false)
  const [photo, setPhoto] = useState("")
  const [title, setTitle] = useState("")
  const [location, setLocation] = useState("")
  const [date, setDate] = useState("")
  const [time, setTime] = useState("")
  const [description, setDescription] = useState("")
  const [submitted, setSubmitted] = useState<{
    mode: "Lost" | "Found"
    title: string
    location: string
    date: string
    time: string
    description: string
    photo: string
  } | null>(null)
  const report = (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitted({ mode, title, location, date, time, description, photo })
    setOpen(false)
    toast(`${mode} item reported. We'll notify you about possible matches.`)
    setTitle("")
    setLocation("")
    setDate("")
    setTime("")
    setDescription("")
    setPhoto("")
  }
  return (
    <div className="wide-container lost-page">
      {heading(
        "CAMPUS COMMUNITY",
        "Lost & Found",
        "A better chance of getting your things back.",
        <Button icon={Plus} onClick={() => setOpen(true)}>
          Report an item
        </Button>,
      )}
      <Card className="match-card">
        <div className="match-top">
          <span className="match-symbol">
            <Icon as={Sparkles} size={19} />
          </span>
          <div>
            <span className="eyebrow">POSSIBLE MATCH FOUND</span>
            <Heading level={2}>These items might be the same</Heading>
          </div>
          <Badge tone="violet" icon={Sparkles}>
            92% match confidence
          </Badge>
        </div>
        <div className="match-comparison">
          {itemReports.slice(0, 2).map((r) => (
            <div className="match-half" key={r.ref}>
              <div className="match-half-head">
                <Badge
                  tone={r.type === "Lost" ? "warning" : "success"}
                  icon={r.type === "Lost" ? Search : Check}
                >
                  {r.type}
                </Badge>
                <span className="mono">{r.ref}</span>
              </div>
              <span className="item-illustration">
                <Icon as={r.icon} size={27} />
              </span>
              <Heading level={3}>{r.name}</Heading>
              <p>{r.description}</p>
              <span>
                <Icon as={MapPin} size={15} /> {r.location}
              </span>
              <span>
                <Icon as={Clock3} size={15} /> {r.when}
              </span>
            </div>
          ))}
        </div>
        <div className="match-bottom">
          <span>
            <Icon as={ShieldCheck} size={16} /> Our team verifies ownership
            before an item is returned.
          </span>
          <Button
            onClick={() =>
              toast(
                "A claim request has been sent to the campus Lost & Found desk.",
              )
            }
          >
            This could be mine <Icon as={ArrowRight} size={16} />
          </Button>
        </div>
      </Card>
      <div className="secondary-section-head">
        <div>
          <Heading level={2}>Recently reported</Heading>
          <p>Items from across campus.</p>
        </div>
        <div className="segmented-tabs">
          <Action
            className={mode === "Lost" ? "selected" : ""}
            onClick={() => setMode("Lost")}
          >
            Lost
          </Action>
          <Action
            className={mode === "Found" ? "selected" : ""}
            onClick={() => setMode("Found")}
          >
            Found
          </Action>
        </div>
      </div>
      <div className="found-grid">
        {submitted?.mode === mode && (
          <Card className="found-card">
            {submitted.photo ? (
              <img
                className="submitted-photo"
                src={submitted.photo}
                alt={submitted.title}
              />
            ) : (
              <span className="found-icon">
                <Icon as={Check} size={22} />
              </span>
            )}
            <Badge tone="blue">Your {mode.toLowerCase()} report</Badge>
            <Heading level={3}>{submitted.title}</Heading>
            <p>
              {submitted.description ||
                "The campus desk will review your report and look for matches."}
            </p>
            <div>
              <Icon as={MapPin} size={15} /> {submitted.location}
            </div>
            <small>
              {submitted.date} · {submitted.time}
            </small>
          </Card>
        )}
        {itemReports
          .filter((r) => r.type === mode)
          .map((r) => (
            <Card className="found-card" key={r.ref}>
              <span className="found-icon">
                <Icon as={r.icon} size={22} />
              </span>
              <span className="mono muted">{r.ref}</span>
              <Heading level={3}>{r.name}</Heading>
              <p>{r.description}</p>
              <div>
                <Icon as={MapPin} size={15} /> {r.location}
              </div>
              <small>{r.when}</small>
            </Card>
          ))}
      </div>
      {open && (
        <div className="overlay" onMouseDown={() => setOpen(false)}>
          <form
            className="report-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Report lost or found item"
            onMouseDown={(e) => e.stopPropagation()}
            onSubmit={report}
          >
            <div className="modal-head">
              <div>
                <span className="eyebrow">CAMPUS LOST & FOUND</span>
                <Heading level={2}>Report an item</Heading>
              </div>
              <Action
                className="icon-button"
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
              >
                <Icon as={X} size={19} />
              </Action>
            </div>
            <div className="segmented-tabs modal-mode">
              <Action
                type="button"
                className={mode === "Lost" ? "selected" : ""}
                onClick={() => setMode("Lost")}
              >
                I lost something
              </Action>
              <Action
                type="button"
                className={mode === "Found" ? "selected" : ""}
                onClick={() => setMode("Found")}
              >
                I found something
              </Action>
            </div>
            <label className="modal-field">
              Item name
              <TextField
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Black canvas backpack"
              />
            </label>
            <label className="modal-field">
              Photo <span className="optional">OPTIONAL</span>
              <span className="photo-upload">
                <Icon as={UploadCloud} size={20} />
                {photo ? (
                  <img src={photo} alt="Selected item preview" />
                ) : (
                  <span>Choose a photo to help identify the item</span>
                )}
                <TextField
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) {
                      const reader = new FileReader()
                      reader.onload = () => setPhoto(String(reader.result))
                      reader.readAsDataURL(file)
                    }
                  }}
                />
              </span>
            </label>
            <label className="modal-field">
              Last seen / found at
              <TextField
                required
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Central Library, ground floor"
              />
            </label>
            <div className="modal-field-pair">
              <label className="modal-field">
                Date
                <TextField
                  required
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </label>
              <label className="modal-field">
                Approx. time
                <TextField
                  required
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                />
              </label>
            </div>
            <label className="modal-field">
              Description
              <TextAreaField
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Any identifying details?"
              />
            </label>
            <div className="modal-actions">
              <Button variant="secondary" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                Submit report <Icon as={ArrowRight} size={16} />
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

const services: {
  name: string
  icon: LucideIcon
  status: string
  tone: "success" | "warning" | "blue"
  location: string
  hours: string
  contact: string
  detail: string
}[] = [
  {
    name: "Central Library",
    icon: BookOpen,
    status: "High occupancy",
    tone: "warning",
    location: "Central Library",
    hours: "8:00 AM – 9:00 PM",
    contact: "library@sahyadri.edu.in",
    detail: "Books, reading halls and digital resources",
  },
  {
    name: "Computer Labs",
    icon: Laptop,
    status: "Operational",
    tone: "success",
    location: "C Block · Floors 1–3",
    hours: "8:30 AM – 7:00 PM",
    contact: "labs@sahyadri.edu.in",
    detail: "Open access and department labs",
  },
  {
    name: "Campus Wi-Fi",
    icon: Wifi,
    status: "Operational",
    tone: "success",
    location: "All campus buildings",
    hours: "Available 24/7",
    contact: "network@sahyadri.edu.in",
    detail: "Network access and connectivity help",
  },
  {
    name: "Transport",
    icon: TrainFront,
    status: "Running on time",
    tone: "success",
    location: "Main gate · Bus bay",
    hours: "6:30 AM – 7:30 PM",
    contact: "transport@sahyadri.edu.in",
    detail: "Campus buses and route information",
  },
  {
    name: "Canteen",
    icon: Coffee,
    status: "Open",
    tone: "success",
    location: "Central Courtyard",
    hours: "8:00 AM – 8:00 PM",
    contact: "canteen@sahyadri.edu.in",
    detail: "Meals, snacks and refreshments",
  },
  {
    name: "Hostel",
    icon: Building2,
    status: "Water maintenance",
    tone: "warning",
    location: "Hostel Block",
    hours: "Desk staffed 24/7",
    contact: "hostel@sahyadri.edu.in",
    detail: "Accommodation and resident support",
  },
  {
    name: "Medical Center",
    icon: HeartPulse,
    status: "Open",
    tone: "success",
    location: "A Block · Ground floor",
    hours: "9:00 AM – 6:00 PM",
    contact: "medical@sahyadri.edu.in",
    detail: "First aid and medical assistance",
  },
  {
    name: "Printing",
    icon: Printer,
    status: "Operational",
    tone: "success",
    location: "B Block · Ground floor",
    hours: "9:00 AM – 6:00 PM",
    contact: "print@sahyadri.edu.in",
    detail: "Printing, scanning and photocopying",
  },
  {
    name: "Student Office",
    icon: Users,
    status: "Open",
    tone: "success",
    location: "A Block · Ground floor",
    hours: "9:30 AM – 5:00 PM",
    contact: "studentoffice@sahyadri.edu.in",
    detail: "Certificates, records and student help",
  },
]
export function ServicesPage({ toast }: BaseProps) {
  const [query, setQuery] = useState("")
  const visible = services.filter((s) =>
    `${s.name} ${s.location} ${s.detail}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  )
  return (
    <div className="wide-container services-page">
      {heading(
        "CAMPUS DIRECTORY",
        "Campus services",
        "The essentials, exactly when you need them.",
        <span className="live-label">
          <span className="live-dot" /> LIVE STATUS
        </span>,
      )}
      <div className="services-toolbar">
        <div className="table-search">
          <Icon as={Search} size={17} />
          <TextField
            aria-label="Search services"
            placeholder="Find a service or location..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <span>{services.length} SERVICES ACROSS CAMPUS</span>
      </div>
      <div className="service-grid">
        {visible.map((s) => (
          <Card className="service-card" key={s.name}>
            <div className="service-card-head">
              <span className="service-icon">
                <Icon as={s.icon} size={21} />
              </span>
              <Badge
                tone={s.tone}
                icon={s.tone === "warning" ? Clock3 : CircleCheck}
              >
                {s.status}
              </Badge>
            </div>
            <Heading level={2}>{s.name}</Heading>
            <p>{s.detail}</p>
            <div className="service-facts">
              <span>
                <Icon as={MapPin} size={16} /> {s.location}
              </span>
              <span>
                <Icon as={Clock3} size={16} /> {s.hours}
              </span>
            </div>
            <Action
              onClick={() => {
                navigator.clipboard
                  ?.writeText(s.contact)
                  .then(() => toast(`${s.name} contact copied: ${s.contact}`))
                  .catch(() => toast(`Contact ${s.name} at ${s.contact}`))
              }}
            >
              <span>{s.contact}</span>
              <Icon as={ArrowUpRight} size={16} />
            </Action>
          </Card>
        ))}
      </div>
      {visible.length === 0 && (
        <Card className="empty-state">
          <Icon as={Inbox} size={28} />
          <Heading level={3}>No matching services</Heading>
          <p>Try another name or location.</p>
        </Card>
      )}
    </div>
  )
}

const trend = [21, 25, 19, 32, 28, 34, 29, 37, 33, 41, 38, 48]
const departmentRows = [
  { name: "Electrical", open: 19, resolved: 42, time: "2.8h", sla: 92 },
  { name: "Network / Wi-Fi", open: 12, resolved: 37, time: "1.9h", sla: 96 },
  { name: "IT Maintenance", open: 8, resolved: 31, time: "2.2h", sla: 88 },
  { name: "Civil & Furniture", open: 5, resolved: 24, time: "4.1h", sla: 84 },
  { name: "Housekeeping", open: 3, resolved: 28, time: "1.4h", sla: 98 },
  { name: "Security", open: 1, resolved: 17, time: "1.1h", sla: 99 },
]
export function AnalyticsPage({
  department,
  navigate,
}: {
  department: boolean
  navigate: Nav
}) {
  const [period, setPeriod] = useState("Last 12 weeks")
  const [selected, setSelected] = useState(
    department ? "Electrical" : "All departments",
  )
  const rows =
    selected === "All departments"
      ? departmentRows
      : departmentRows.filter((r) => r.name === selected)
  const highest = Math.max(...trend)
  return (
    <div className="wide-container analytics-page">
      {heading(
        department
          ? "ADMINISTRATION / DEPARTMENT VIEW"
          : "CAMPUS INTELLIGENCE / ANALYTICS",
        department ? "Department Dashboard" : "Campus analytics",
        department
          ? "Track workload and recurring problems for your team."
          : "Patterns that help us make campus better, one fix at a time.",
        <Button
          variant="secondary"
          onClick={() => navigate(department ? "analytics" : "department")}
        >
          {department ? "Campus view" : "Department view"}{" "}
          <Icon as={ArrowRight} size={16} />
        </Button>,
      )}
      <div className="analytics-toolbar">
        <div className="segmented-tabs">
          <Action
            className={!department ? "selected" : ""}
            onClick={() => navigate("analytics")}
          >
            Campus-wide
          </Action>
          <Action
            className={department ? "selected" : ""}
            onClick={() => navigate("department")}
          >
            Departments
          </Action>
        </div>
        <div>
          <label>
            Department{" "}
            <SelectField
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
            >
              <option>All departments</option>
              {departmentRows.map((r) => (
                <option key={r.name}>{r.name}</option>
              ))}
            </SelectField>
          </label>
          <label>
            Period{" "}
            <SelectField
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
            >
              <option>Last 12 weeks</option>
              <option>Last 30 days</option>
              <option>This semester</option>
            </SelectField>
          </label>
        </div>
      </div>
      <div className="analytics-kpis">
        <Card>
          <span className="eyebrow">TOTAL ISSUES</span>
          <strong className="mono">342</strong>
          <small>
            <Icon as={ArrowDownRight} size={14} /> 8.2% vs previous period
          </small>
        </Card>
        <Card>
          <span className="eyebrow">AVG. RESOLUTION</span>
          <strong className="mono">2.4h</strong>
          <small>
            <Icon as={ArrowDownRight} size={14} /> 18% faster
          </small>
        </Card>
        <Card>
          <span className="eyebrow">SLA COMPLIANCE</span>
          <strong className="mono">93.6%</strong>
          <small>
            <Icon as={ArrowUpRight} size={14} /> 2.1% improvement
          </small>
        </Card>
        <Card>
          <span className="eyebrow">RECURRING CLUSTERS</span>
          <strong className="mono">07</strong>
          <small className="muted">Across 4 facilities</small>
        </Card>
      </div>
      <div className="analytics-main">
        <Card className="trend-card">
          <SectionTitle
            title="Issue volume trend"
            aside={
              <Badge tone="blue" icon={Activity}>
                {period}
              </Badge>
            }
          />
          <p className="section-description">
            New reports across campus over time
          </p>
          <div className="trend-chart">
            <div className="chart-grid">
              <span>50</span>
              <span>40</span>
              <span>30</span>
              <span>20</span>
              <span>10</span>
            </div>
            <div className="trend-bars">
              {trend.map((v, i) => (
                <div className="trend-column" key={i}>
                  <div className="trend-bar-slot">
                    <span
                      style={{ height: `${(v / highest) * 100}%` }}
                      title={`${v} issues in week ${i + 1}`}
                    />
                  </div>
                  <small className="mono">
                    {i % 2 === 0 ? `W${i + 1}` : ""}
                  </small>
                </div>
              ))}
            </div>
          </div>
          <div className="chart-foot">
            <span>
              <i /> New issues
            </span>
            <span>Peak: 48 reports in week 12</span>
          </div>
        </Card>
        <Card className="recurring-card">
          <SectionTitle
            title="Recurring problems"
            aside={<span className="mono muted">BY FACILITY</span>}
          />
          <p className="section-description">
            Where repeat issues keep appearing
          </p>
          {[
            ["B Block", "Projector & display faults", 14, 82],
            ["C Block Labs", "Wi-Fi disconnects", 11, 65],
            ["Hostel", "Water supply", 8, 49],
            ["Central Library", "Cooling & seating", 5, 32],
          ].map(([place, name, count, width]) => (
            <div className="recurring-row" key={place}>
              <div>
                <strong>{place}</strong>
                <span>{name}</span>
              </div>
              <span className="mono">{count}×</span>
              <div className="category-bar">
                <i style={{ width: `${width}%` }} />
              </div>
            </div>
          ))}
        </Card>
      </div>
      <Card className="department-table-card">
        <SectionTitle
          title="Resolution by department"
          aside={
            <span className="muted">Open · resolved · average time · SLA</span>
          }
        />
        <div className="department-table-wrap">
          <table>
            <thead>
              <tr>
                <th>DEPARTMENT</th>
                <th>OPEN</th>
                <th>RESOLVED</th>
                <th>AVG. TIME</th>
                <th>SLA COMPLIANCE</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.name}>
                  <td>
                    <span className="dept-mark">
                      <Icon
                        as={
                          r.name.includes("Electrical")
                            ? Wrench
                            : r.name.includes("Network")
                              ? Wifi
                              : Building2
                        }
                        size={17}
                      />
                    </span>
                    <strong>{r.name}</strong>
                  </td>
                  <td className="mono">{r.open}</td>
                  <td className="mono">{r.resolved}</td>
                  <td className="mono">{r.time}</td>
                  <td>
                    <div className="sla-cell">
                      <div className="factor-track">
                        <span style={{ width: `${r.sla}%` }} />
                      </div>
                      <strong className="mono">{r.sla}%</strong>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

export function ProfilePage({
  theme,
  setTheme,
  role,
  switchRole,
  navigate,
  toast,
}: BaseProps & {
  theme: "light" | "dark" | "system"
  setTheme: (theme: "light" | "dark" | "system") => void
  role: "student" | "admin"
  switchRole: () => void
  navigate: Nav
}) {
  const [tab, setTab] = useState<"issues" | "events" | "saved">("issues")
  const savedSchemes: string[] = (() => {
    try {
      return JSON.parse(localStorage.getItem("campus-saved-schemes") || "[]")
    } catch {
      return []
    }
  })()
  const registeredEvents: string[] = (() => {
    try {
      return JSON.parse(
        localStorage.getItem("campus-event-registrations") || "[]",
      )
    } catch {
      return []
    }
  })()
  const [prefs, setPrefs] = useState(() => {
    try {
      return (
        JSON.parse(
          localStorage.getItem("campus-notification-preferences") || "null",
        ) || { issues: true, notices: true, events: false, schemes: true }
      )
    } catch {
      return { issues: true, notices: true, events: false, schemes: true }
    }
  })
  return (
    <div className="wide-container profile-page">
      {heading(
        "ACCOUNT / YOUR WORKSPACE",
        "Profile & settings",
        "Your campus identity, activity and preferences.",
      )}
      <div className="profile-grid">
        <div className="profile-main">
          <Card className="profile-identity">
            <span className="profile-avatar">AK</span>
            <div>
              <span className="eyebrow">STUDENT PROFILE</span>
              <Heading level={2}>Abhinay Shinde</Heading>
              <p>SE Computer Engineering · Division B</p>
              <span className="mono">SIT2024CS117</span>
            </div>
            <Badge tone="success" icon={CircleCheck}>
              Active student
            </Badge>
          </Card>
          <Card className="profile-detail-card">
            <SectionTitle title="Your details" />
            <div className="details-grid">
              {[
                ["College", "Sahyadri Institute of Technology"],
                ["Department", "Computer Engineering"],
                ["Year / Division", "SE · Division B"],
                ["Student ID", "SIT2024CS117"],
                ["College email", "abhinay@sahyadri.edu.in"],
                ["Academic year", "2026–27"],
              ].map(([k, v]) => (
                <div key={k}>
                  <span>{k}</span>
                  <strong className={k === "Student ID" ? "mono" : ""}>
                    {v}
                  </strong>
                </div>
              ))}
            </div>
          </Card>
          <Card className="profile-activity">
            <div
              className="profile-tabs"
              role="tablist"
              aria-label="Your activity"
            >
              <Action
                role="tab"
                aria-selected={tab === "issues"}
                className={tab === "issues" ? "active" : ""}
                onClick={() => setTab("issues")}
              >
                My Issues <span>3</span>
              </Action>
              <Action
                role="tab"
                aria-selected={tab === "events"}
                className={tab === "events" ? "active" : ""}
                onClick={() => setTab("events")}
              >
                My Events
              </Action>
              <Action
                role="tab"
                aria-selected={tab === "saved"}
                className={tab === "saved" ? "active" : ""}
                onClick={() => setTab("saved")}
              >
                Saved Opportunities
              </Action>
            </div>
            <div className="profile-tab-content">
              {tab === "issues" ? (
                <>
                  <div className="profile-list-row">
                    <span className="profile-row-icon">
                      <Icon as={Wrench} size={18} />
                    </span>
                    <div>
                      <strong>Projector malfunction in B204</strong>
                      <small className="mono">CO-2041 · B BLOCK</small>
                    </div>
                    <Badge tone="warning" icon={Clock3}>
                      In progress
                    </Badge>
                  </div>
                  <div className="profile-list-row">
                    <span className="profile-row-icon">
                      <Icon as={Wifi} size={18} />
                    </span>
                    <div>
                      <strong>Wi-Fi disconnecting in C Block</strong>
                      <small className="mono">CO-2038 · C BLOCK</small>
                    </div>
                    <Badge tone="blue" icon={Clock3}>
                      Assigned
                    </Badge>
                  </div>
                  <Action
                    className="inline-link"
                    onClick={() => navigate("issues")}
                  >
                    View all issues <Icon as={ArrowRight} size={15} />
                  </Action>
                </>
              ) : tab === "events" ? (
                <>
                  {registeredEvents.length ? (
                    registeredEvents.map((id) => {
                      const event = events.find((e) => e.id === id)
                      return (
                        event && (
                          <div className="profile-list-row" key={id}>
                            <span className="profile-row-icon">
                              <Icon as={CalendarDays} size={18} />
                            </span>
                            <div>
                              <strong>{event.title}</strong>
                              <small>
                                {event.day} {event.month} · {event.venue}
                              </small>
                            </div>
                            <Badge tone="success" icon={Check}>
                              Registered
                            </Badge>
                          </div>
                        )
                      )
                    })
                  ) : (
                    <p className="profile-tab-empty">
                      No events registered yet. Find something worth showing up
                      for.
                    </p>
                  )}
                  <Action
                    className="inline-link"
                    onClick={() => navigate("events")}
                  >
                    Explore events <Icon as={ArrowRight} size={15} />
                  </Action>
                </>
              ) : (
                <>
                  {savedSchemes.length ? (
                    savedSchemes.map((id) => {
                      const scheme = schemes.find((s) => s.id === id)
                      return (
                        scheme && (
                          <div className="profile-list-row" key={id}>
                            <span className="profile-row-icon">
                              <Icon as={GraduationCap} size={18} />
                            </span>
                            <div>
                              <strong>{scheme.name}</strong>
                              <small>
                                Applications close in {scheme.days} days
                              </small>
                            </div>
                            <Badge tone="warning" icon={Clock3}>
                              Open
                            </Badge>
                          </div>
                        )
                      )
                    })
                  ) : (
                    <p className="profile-tab-empty">
                      No opportunities saved yet. Bookmark a scheme to find it
                      here.
                    </p>
                  )}
                  <Action
                    className="inline-link"
                    onClick={() => navigate("scholarships")}
                  >
                    Explore schemes <Icon as={ArrowRight} size={15} />
                  </Action>
                </>
              )}
            </div>
          </Card>
        </div>
        <div className="profile-side">
          <Card className="preferences-card">
            <SectionTitle title="Notification preferences" />
            <p className="section-description">
              Choose what you want to hear about.
            </p>
            {[
              [
                "issues",
                "Issue updates",
                "Assignments, repairs and resolutions",
              ],
              [
                "notices",
                "Important notices",
                "College and department updates",
              ],
              ["events", "Events & clubs", "Registrations and upcoming events"],
              ["schemes", "Scholarships", "Deadlines and opportunities"],
            ].map(([key, label, desc]) => (
              <label className="preference-row" key={key}>
                <span>
                  <strong>{label}</strong>
                  <small>{desc}</small>
                </span>
                <TextField
                  type="checkbox"
                  checked={prefs[(key as keyof typeof prefs)]}
                  onChange={(e) => {
                    const next = { ...prefs, [key]: e.target.checked }
                    setPrefs(next)
                    localStorage.setItem(
                      "campus-notification-preferences",
                      JSON.stringify(next),
                    )
                    toast("Notification preferences updated.")
                  }}
                />
                <span className="switch-track" />
              </label>
            ))}
          </Card>
          <Card className="appearance-card">
            <SectionTitle title="Appearance" />
            <p className="section-description">
              Make Campus OS feel like yours.
            </p>
            <div className="appearance-options">
              {[
                { name: "light", icon: Sun, label: "Light" },
                { name: "dark", icon: Moon, label: "Dark" },
                { name: "system", icon: Laptop, label: "System" },
              ].map((t) => (
                <Action
                  key={t.name}
                  className={theme === t.name ? "selected" : ""}
                  onClick={() => setTheme(t.name as typeof theme)}
                >
                  <Icon as={t.icon} size={19} />
                  {t.label}
                  {theme === t.name && <Icon as={Check} size={15} />}
                </Action>
              ))}
            </div>
          </Card>
          <Card className="account-card">
            <SectionTitle title="Workspace access" />
            <p>
              Preview the {role === "student" ? "administration" : "student"}{" "}
              experience in this prototype.
            </p>
            <Button variant="secondary" onClick={switchRole} icon={Users}>
              Switch to {role === "student" ? "admin" : "student"} view
            </Button>
          </Card>
        </div>
      </div>
    </div>
  )
}
