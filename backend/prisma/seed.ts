import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { calculatePriorityScore } from "../src/services/priorityEngine";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding Campus OS database with realistic Indian college data...");

  // Clear existing data in reverse relation order for idempotent seed
  await prisma.issueFollow.deleteMany();
  await prisma.issueAffected.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.issueEvent.deleteMany();
  await prisma.issue.deleteMany();
  await prisma.issueCluster.deleteMany();
  await prisma.savedItem.deleteMany();
  await prisma.scheme.deleteMany();
  await prisma.lostFoundItem.deleteMany();
  await prisma.eventRegistration.deleteMany();
  await prisma.event.deleteMany();
  await prisma.notice.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.user.deleteMany();
  await prisma.room.deleteMany();
  await prisma.building.deleteMany();
  await prisma.department.deleteMany();

  // 1. Buildings
  const buildingsData = [
    { name: "Ramanujan Computing Complex", code: "RCC" },
    { name: "Aryabhata Academic Block", code: "AAB" },
    { name: "Dr. APJ Abdul Kalam Science Center", code: "KSC" },
    { name: "Visvesvaraya Engineering Hall", code: "VEH" },
    { name: "Sarabhai Administrative Building", code: "SAB" },
  ];

  const buildings = [];
  for (const b of buildingsData) {
    const created = await prisma.building.create({ data: b });
    buildings.push(created);
  }

  // 2. Rooms
  const rooms = [];
  for (const b of buildings) {
    const roomCodes = ["101", "102", "201", "204", "305", "Lab-1", "Lab-2", "LH-1"];
    for (const rCode of roomCodes) {
      const room = await prisma.room.create({
        data: {
          code: `${b.code}-${rCode}`,
          name: `${b.name} Room ${rCode}`,
          buildingId: b.id,
        },
      });
      rooms.push(room);
    }
  }

  // 3. Departments
  const departmentsData = [
    { name: "Electrical & Power Maintenance", code: "ELEC" },
    { name: "Network & IT Infrastructure", code: "NET_IT" },
    { name: "Audio-Visual & Smart Classrooms", code: "AV_IT" },
    { name: "Plumbing & Sanitation Works", code: "PLUMB" },
    { name: "Civil & Estate Infrastructure", code: "CIVIL" },
    { name: "Hostel & Campus Facilities", code: "FACILITY" },
  ];

  const departments: any[] = [];
  for (const d of departmentsData) {
    const dept = await prisma.department.create({ data: d });
    departments.push(dept);
  }

  // 4. Users (10 users across roles, with bcrypt hashed password)
  const passwordHash = await bcrypt.hash("Campus@123", 10);

  const usersData = [
    {
      name: "Aarav Sharma",
      email: "student@campus.edu",
      role: "student" as const,
      studentId: "2024CS1042",
      year: "3rd Year",
      division: "CS-A",
      departmentId: departments[1].id,
    },
    {
      name: "Priya Patel",
      email: "priya.patel@campus.edu",
      role: "student" as const,
      studentId: "2024EC1019",
      year: "2nd Year",
      division: "ECE-B",
      departmentId: departments[0].id,
    },
    {
      name: "Rohan Verma",
      email: "rohan.verma@campus.edu",
      role: "student" as const,
      studentId: "2023ME1088",
      year: "4th Year",
      division: "ME-A",
      departmentId: departments[4].id,
    },
    {
      name: "Dr. Meenakshi Sundaram",
      email: "faculty@campus.edu",
      role: "faculty" as const,
      departmentId: departments[1].id,
    },
    {
      name: "Prof. K. Venkatesh",
      email: "hod@campus.edu",
      role: "hod" as const,
      departmentId: departments[1].id,
    },
    {
      name: "Rajesh Nair",
      email: "admin@campus.edu",
      role: "admin" as const,
      departmentId: departments[5].id,
    },
    {
      name: "Ramesh Kumar",
      email: "tech.electrical@campus.edu",
      role: "technician" as const,
      departmentId: departments[0].id,
    },
    {
      name: "Suresh Pillai",
      email: "tech.it@campus.edu",
      role: "technician" as const,
      departmentId: departments[1].id,
    },
    {
      name: "Manoj Yadav",
      email: "tech.plumbing@campus.edu",
      role: "technician" as const,
      departmentId: departments[3].id,
    },
    {
      name: "Vikram Singh",
      email: "tech.civil@campus.edu",
      role: "technician" as const,
      departmentId: departments[4].id,
    },
  ];

  const users: any[] = [];
  for (const u of usersData) {
    const user = await prisma.user.create({
      data: {
        ...u,
        passwordHash,
      },
    });
    users.push(user);
  }

  // 5. Seed 200+ realistic issues
  console.log("Generating 200+ realistic issues...");

  const issueTemplates = [
    {
      title: "Ceiling fan making loud grinding noise in lecture hall",
      desc: "During morning lectures the middle row ceiling fan rattles intensely making it difficult to hear the professor.",
      category: "Electrical",
      asset: "Ceiling Fan",
      urgency: "medium",
    },
    {
      title: "Projector HDMI port damaged and screen flickering",
      desc: "The HDMI cable connector on the podium is broken, projector display turns completely green intermittently.",
      category: "Audio-Visual",
      asset: "Projector",
      urgency: "high",
    },
    {
      title: "Water cooler RO filter leaking onto floor creating slipping hazard",
      desc: "The drinking water cooler on the 2nd floor corridor is overflowing and leaking potable water continuously.",
      category: "Plumbing",
      asset: "Water Cooler",
      urgency: "high",
    },
    {
      title: "Wi-Fi access point unreachable and dropping packets",
      desc: "Campus Wi-Fi SSID drops connection every 5 minutes in computing lab, affecting ongoing lab test evaluations.",
      category: "Network/IT",
      asset: "WiFi Router",
      urgency: "high",
    },
    {
      title: "Bench wooden slat snapped and exposed nail",
      desc: "Second row third desk bench has broken timber with an exposed iron nail tearing student bags.",
      category: "Furniture",
      asset: "Wooden Desk",
      urgency: "medium",
    },
    {
      title: "Main switchboard sparking on high AC load",
      desc: "Visible electric sparks and burning odor coming from distribution box when both 2-ton AC units are switched on.",
      category: "Electrical",
      asset: "Switchboard",
      urgency: "emergency",
    },
    {
      title: "Washroom tap broken and continuous water gushing",
      desc: "The primary brass tap in 1st floor boys washroom has completely come off, flooding the washroom floor.",
      category: "Plumbing",
      asset: "Water Tap",
      urgency: "critical",
    },
    {
      title: "Classroom microphone amplifier output has severe static hum",
      desc: "The wireless lapel microphone system amplifies loud 50Hz electrical hum through room speakers.",
      category: "Audio-Visual",
      asset: "Microphone",
      urgency: "medium",
    },
    {
      title: "Elevator door stuck halfway between 2nd and 3rd floor",
      desc: "Lift B passenger elevator stopped abruptly, indicator lights flashing error code E-04.",
      category: "Infrastructure",
      asset: "Elevator",
      urgency: "critical",
    },
    {
      title: "Trash can overflowing with canteen plastic containers",
      desc: "Dustbins near south staircase entrance are full and garbage is scattering along the hallway.",
      category: "Sanitation",
      asset: "Trash Bin",
      urgency: "low",
    },
  ];

  const statuses = [
    "reported",
    "ai_classified",
    "assigned",
    "technician_accepted",
    "in_progress",
    "resolved",
    "closed",
  ] as const;

  const deptMap: Record<string, string> = {
    Electrical: departments[0].id,
    "Network/IT": departments[1].id,
    "Audio-Visual": departments[2].id,
    Plumbing: departments[3].id,
    Furniture: departments[4].id,
    Infrastructure: departments[4].id,
    Sanitation: departments[5].id,
  };

  const techMap: Record<string, string> = {
    Electrical: users[6].id,
    "Network/IT": users[7].id,
    "Audio-Visual": users[7].id,
    Plumbing: users[8].id,
    Furniture: users[9].id,
    Infrastructure: users[9].id,
    Sanitation: users[8].id,
  };

  for (let i = 1; i <= 210; i++) {
    const tmpl = issueTemplates[i % issueTemplates.length];
    const bld = buildings[i % buildings.length];
    const rm = rooms[i % rooms.length];
    const status = statuses[i % statuses.length];
    const reporter = users[i % 3]; // students
    const displayId = `CO-${(2000 + i).toString()}`;

    // realistic created time spread over past 20 days
    const hoursAgo = (i * 2.3) % (20 * 24);
    const createdAt = new Date(Date.now() - hoursAgo * 60 * 60 * 1000);
    const resolvedAt = ["resolved", "closed"].includes(status)
      ? new Date(createdAt.getTime() + (4 + (i % 24)) * 60 * 60 * 1000)
      : null;

    const affectedCount = 1 + (i % 35);
    const mergedCount = 1 + (i % 6);

    const priority = calculatePriorityScore({
      affectedCount,
      urgency: tmpl.urgency,
      createdAt,
      room: rm.code,
      building: bld.name,
      mergedCount,
    });

    const isAssigned = !["reported", "ai_classified"].includes(status);
    const assignedDeptId = isAssigned ? deptMap[tmpl.category] || departments[0].id : null;
    const assigneeId = isAssigned ? techMap[tmpl.category] || users[6].id : null;

    // Create cluster
    const cluster = await prisma.issueCluster.create({
      data: {
        canonicalIssueId: `temp-${displayId}`,
        affectedCount,
        mergedCount,
      },
    });

    const issue = await prisma.issue.create({
      data: {
        displayId,
        title: `${tmpl.title} (${bld.code} - ${rm.code})`,
        description: tmpl.desc,
        category: tmpl.category,
        building: bld.name,
        room: rm.code,
        asset: tmpl.asset,
        urgency: tmpl.urgency,
        status,
        priorityScore: priority.score,
        priorityBreakdown: priority.breakdown as any,
        clusterId: cluster.id,
        departmentId: assignedDeptId,
        assigneeId,
        reporterId: reporter.id,
        createdAt,
        resolvedAt,
        events: {
          create: [
            {
              actor: reporter.name,
              type: "reported",
              payload: { message: "Reported via student portal" },
              createdAt,
            },
            ...(isAssigned
              ? [
                  {
                    actor: "System Dispatcher",
                    type: "assigned",
                    payload: { departmentId: assignedDeptId },
                    createdAt: new Date(createdAt.getTime() + 10 * 60 * 1000),
                  },
                ]
              : []),
            ...(status === "resolved" || status === "closed"
              ? [
                  {
                    actor: "Technician",
                    type: "resolved",
                    payload: { note: "Repaired and tested on site" },
                    createdAt: resolvedAt || new Date(),
                  },
                ]
              : []),
          ],
        },
        affectedUsers: {
          create: [
            { userId: reporter.id },
            ...(i % 2 === 0 ? [{ userId: users[1].id }] : []),
          ],
        },
        comments: {
          create: [
            {
              authorId: reporter.id,
              body: `Issue observed during standard hours at ${rm.code}. Kindly look into this quickly.`,
              createdAt: new Date(createdAt.getTime() + 15 * 60 * 1000),
            },
            ...(isAssigned
              ? [
                  {
                    authorId: assigneeId || users[6].id,
                    body: "Work order created and replacement parts requisitioned.",
                    createdAt: new Date(createdAt.getTime() + 60 * 60 * 1000),
                  },
                ]
              : []),
          ],
        },
      },
    });

    // Update canonicalIssueId
    await prisma.issueCluster.update({
      where: { id: cluster.id },
      data: { canonicalIssueId: issue.id },
    });
  }

  // 6. Notices
  await prisma.notice.createMany({
    data: [
      {
        title: "Mid-Semester Examination Schedule - Autumn 2026",
        body: "The mid-semester examinations for all B.Tech and M.Tech branches will commence from October 15, 2026. Hall tickets available on portal.",
        category: "Academic",
        important: true,
        publishedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      },
      {
        title: "Campus Wi-Fi Maintenance & Certificate Upgrade",
        body: "Network IT team will perform routine core switch firmware upgrades on Saturday midnight. Expected downtime: 2 hours.",
        category: "Infrastructure",
        important: false,
        publishedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
      },
      {
        title: "National Hackathon 2026 Team Registrations Open",
        body: "Register your 4-member teams for the Smart India Campus Hackathon. Top 3 teams receive incubation support and cash prizes.",
        category: "Event",
        important: true,
        publishedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
      },
    ],
  });

  // 7. Events
  await prisma.event.createMany({
    data: [
      {
        title: "Annual Tech Symposium & Robotics Expo",
        description: "Keynote talks by leading AI researchers, live bot combat, and student research paper presentations.",
        venue: "Visvesvaraya Engineering Auditorium",
        date: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000),
      },
      {
        title: "Campus Placement Readiness Workshop",
        description: "Interactive session on system design interviews, resume polishing, and mock technical assessments.",
        venue: "Ramanujan Computing Complex Seminar Hall 1",
        date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      },
      {
        title: "Inter-Collegiate Cultural Festival 'Utsav 2026'",
        description: "Three-day music, theater, and fine arts fest with visiting artists and college band competitions.",
        venue: "Main Amphitheater",
        date: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000),
      },
    ],
  });

  // 8. Lost & Found Items
  await prisma.lostFoundItem.createMany({
    data: [
      {
        type: "lost",
        title: "Casio fx-991CW Scientific Calculator",
        description: "Black casing with initials AS engraved on backside, left in AAB Room 204.",
        location: "Aryabhata Academic Block Room 204",
        reporterId: users[0].id,
        status: "open",
      },
      {
        type: "found",
        title: "Student Smart ID Card (ECE Department)",
        description: "Found on cafeteria outdoor table during lunch break.",
        location: "Central Student Canteen",
        reporterId: users[1].id,
        status: "open",
      },
      {
        type: "lost",
        title: "Stainless Steel Insulated Water Bottle (Navy Blue)",
        description: "Milton 1000ml flask forgotten on 3rd floor library study desk.",
        location: "Central Library 3rd Floor",
        reporterId: users[2].id,
        status: "open",
      },
    ],
  });

  // 9. Campus Services
  await prisma.service.createMany({
    data: [
      {
        name: "RFID Library Pass Renewal",
        description: "Re-validate your digital library pass and clear book return dues online.",
        category: "Academic",
        url: "https://library.campus.edu",
      },
      {
        name: "Hostel Wi-Fi MAC Address Registration",
        description: "Register up to 2 personal devices on the high-speed campus fiber network.",
        category: "IT Support",
        url: "https://netreg.campus.edu",
      },
      {
        name: "Health Center OPD Appointment Booking",
        description: "Consult campus resident physicians, dentists, and psychological counselors.",
        category: "Healthcare",
        url: "https://health.campus.edu",
      },
      {
        name: "Campus Shuttle Bus Tracking",
        description: "Live GPS routes and departure timings for campus perimeter shuttles.",
        category: "Transport",
        url: "https://shuttle.campus.edu",
      },
    ],
  });

  // 10. Schemes & Scholarships
  await prisma.scheme.createMany({
    data: [
      {
        title: "Merit-cum-Means Financial Assistance Scheme",
        description: "Tuition waiver up to 80% for meritorious engineering students with family income under ₹5 LPA.",
        eligibility: "GPA > 7.5 and family income < ₹5,00,000 / year",
        deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
      {
        title: "Women in STEM Innovation Grant 2026",
        description: "₹50,000 project grant for female undergraduate students developing hardware or software prototypes.",
        eligibility: "Female students enrolled in 2nd/3rd/4th year B.Tech/B.Sc.",
        deadline: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
      },
      {
        title: "Post-Matric National Scholarship for Higher Education",
        description: "Central government scholarship for reserved category scholars covering hostel allowances and book grants.",
        eligibility: "Valid caste certificate and active bank Aadhaar linking.",
        deadline: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      },
    ],
  });

  // 11. Initial Notifications for Student
  await prisma.notification.createMany({
    data: [
      {
        userId: users[0].id,
        type: "status_update",
        title: "Work order assigned for CO-2001",
        body: "Technician Ramesh Kumar has been dispatched for your reported issue.",
        read: false,
      },
      {
        userId: users[0].id,
        type: "announcement",
        title: "Mid-Semester exam schedule published",
        body: "Check Notices for circular regarding autumn examination timetable.",
        read: false,
      },
    ],
  });

  console.log("✅ Seed completed successfully!");
  console.log(`Created:
  - ${buildings.length} Buildings & ${rooms.length} Rooms
  - ${departments.length} Departments
  - ${users.length} Users (Demo Student: student@campus.edu, HOD: hod@campus.edu, Admin: admin@campus.edu, Password: Campus@123)
  - 210 Realistic Issues with clusters, events, and comments
  - Notices, Events, Lost & Found, Services, and Schemes`);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
