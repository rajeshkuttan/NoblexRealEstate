const { sequelize, User, Lead, Property, LeadProperty, LeadActivity, Tenant } = require('../models');

// Sample users data
const usersData = [
  {
    name: 'Ahmed Hassan',
    email: 'ahmed@emirateslease.com',
    password: 'password123',
    role: 'admin',
    phone: '+971 50 123 4567'
  },
  {
    name: 'Sarah Johnson',
    email: 'sarah@emirateslease.com',
    password: 'password123',
    role: 'agent',
    phone: '+971 50 234 5678'
  },
  {
    name: 'Mike Wilson',
    email: 'mike@emirateslease.com',
    password: 'password123',
    role: 'agent',
    phone: '+971 50 345 6789'
  },
  {
    name: 'Fatima Al-Zahra',
    email: 'fatima@emirateslease.com',
    password: 'password123',
    role: 'manager',
    phone: '+971 50 456 7890'
  }
];

// Sample leads data
const leadsData = [
  {
    name: 'John Smith',
    email: 'john.smith@email.com',
    phone: '+971 50 111 1111',
    company: 'Tech Solutions LLC',
    position: 'CEO',
    emiratesId: '784-1234-5678901-2',
    visaStatus: 'resident',
    nationality: 'british',
    emirate: 'dubai',
    community: 'Marina Walk',
    buildingType: 'apartment',
    bedrooms: 2,
    bathrooms: 2,
    area: 1200,
    budget: 120000,
    furnished: 'furnished',
    status: 'new',
    priority: 'high',
    source: 'website',
    leadScore: 85,
    assignedTo: 2,
    complianceStatus: 'pending',
    kycStatus: 'pending',
    requirements: 'Sea view, Gym, Pool',
    notes: 'Looking for luxury apartment in Dubai Marina',
    tags: ['luxury', 'marina', 'high-budget']
  },
  {
    name: 'Maria Garcia',
    email: 'maria.garcia@email.com',
    phone: '+971 50 222 2222',
    company: 'Garcia Trading',
    position: 'Manager',
    emiratesId: '784-2345-6789012-3',
    visaStatus: 'resident',
    nationality: 'spanish',
    emirate: 'abu_dhabi',
    community: 'Al Reem Island',
    buildingType: 'villa',
    bedrooms: 3,
    bathrooms: 3,
    area: 2000,
    budget: 180000,
    furnished: 'semi_furnished',
    status: 'contacted',
    priority: 'medium',
    source: 'referral',
    leadScore: 72,
    assignedTo: 3,
    complianceStatus: 'verified',
    kycStatus: 'completed',
    requirements: 'Garden, Pool, Parking',
    notes: 'Family looking for spacious villa',
    tags: ['family', 'villa', 'abu-dhabi']
  },
  {
    name: 'David Chen',
    email: 'david.chen@email.com',
    phone: '+971 50 333 3333',
    company: 'Chen Enterprises',
    position: 'Director',
    emiratesId: '784-3456-7890123-4',
    visaStatus: 'investor',
    nationality: 'chinese',
    emirate: 'dubai',
    community: 'Downtown Dubai',
    buildingType: 'penthouse',
    bedrooms: 4,
    bathrooms: 4,
    area: 3000,
    budget: 300000,
    furnished: 'furnished',
    status: 'qualified',
    priority: 'high',
    source: 'walk_in',
    leadScore: 95,
    assignedTo: 2,
    complianceStatus: 'verified',
    kycStatus: 'completed',
    antiMoneyLaundering: true,
    requirements: 'City view, Concierge, High floor',
    notes: 'High-end investor looking for premium property',
    tags: ['investor', 'premium', 'downtown']
  },
  {
    name: 'Aisha Al-Rashid',
    email: 'aisha.rashid@email.com',
    phone: '+971 50 444 4444',
    company: 'Al-Rashid Group',
    position: 'Executive',
    emiratesId: '784-4567-8901234-5',
    visaStatus: 'resident',
    nationality: 'uae',
    emirate: 'sharjah',
    community: 'Al Majaz',
    buildingType: 'apartment',
    bedrooms: 2,
    bathrooms: 2,
    area: 1000,
    budget: 80000,
    furnished: 'unfurnished',
    status: 'viewing',
    priority: 'medium',
    source: 'social_media',
    leadScore: 68,
    assignedTo: 3,
    complianceStatus: 'verified',
    kycStatus: 'completed',
    requirements: 'Near metro, Shopping mall',
    notes: 'Young professional looking for affordable apartment',
    tags: ['affordable', 'sharjah', 'metro']
  },
  {
    name: 'Robert Johnson',
    email: 'robert.johnson@email.com',
    phone: '+971 50 555 5555',
    company: 'Johnson & Associates',
    position: 'Partner',
    emiratesId: '784-5678-9012345-6',
    visaStatus: 'resident',
    nationality: 'american',
    emirate: 'dubai',
    community: 'Jumeirah',
    buildingType: 'villa',
    bedrooms: 5,
    bathrooms: 5,
    area: 4000,
    budget: 250000,
    furnished: 'furnished',
    status: 'negotiation',
    priority: 'high',
    source: 'advertisement',
    leadScore: 88,
    assignedTo: 2,
    complianceStatus: 'verified',
    kycStatus: 'completed',
    antiMoneyLaundering: true,
    requirements: 'Beach access, Private pool, Garden',
    notes: 'Family relocating from US, need large villa',
    tags: ['family', 'jumeirah', 'beach']
  }
];

// Sample tenants data
const tenantsData = [
  {
    name: 'Ahmed Al Maktoum',
    email: 'ahmed.almaktoum@email.com',
    phone: '+971 50 111 1111',
    emiratesId: '784-1990-1234567-1',
    visaStatus: 'resident',
    nationality: 'UAE',
    company: 'Maktoum Trading LLC',
    jobTitle: 'Managing Director',
    salary: 45000.00,
    employer: 'Self-Employed',
    emergencyContact: 'Fatima Al Maktoum',
    emergencyPhone: '+971 50 111 2222',
    address: 'Marina Heights, Unit 1501, Dubai Marina',
    city: 'Dubai',
    emirate: 'Dubai',
    postalCode: '00000',
    status: 'active',
    notes: 'Long-term tenant, always pays on time. Excellent credit history.',
    documents: {
      passport: 'passport_ahmed.pdf',
      emiratesId: 'eid_ahmed.pdf',
      visa: 'visa_ahmed.pdf',
      tenancyContract: 'contract_ahmed.pdf'
    },
    isActive: true
  },
  {
    name: 'Sarah Johnson',
    email: 'sarah.johnson@email.com',
    phone: '+971 50 222 2222',
    emiratesId: '784-1985-2345678-2',
    visaStatus: 'work',
    nationality: 'British',
    company: 'Emirates Airlines',
    jobTitle: 'Senior Cabin Crew',
    salary: 22000.00,
    employer: 'Emirates Airlines',
    emergencyContact: 'Robert Johnson',
    emergencyPhone: '+44 20 1234 5678',
    address: 'Business Bay Plaza, Unit 302, Business Bay',
    city: 'Dubai',
    emirate: 'Dubai',
    postalCode: '00000',
    status: 'active',
    notes: 'Partial payment made, very cooperative tenant.',
    documents: {
      passport: 'passport_sarah.pdf',
      emiratesId: 'eid_sarah.pdf',
      visa: 'visa_sarah.pdf',
      employmentLetter: 'employment_sarah.pdf'
    },
    isActive: true
  },
  {
    name: 'Mohammed Rashid',
    email: 'mohammed.rashid@email.com',
    phone: '+971 50 333 3333',
    emiratesId: '784-1988-3456789-3',
    visaStatus: 'resident',
    nationality: 'UAE',
    company: 'Rashid Properties',
    jobTitle: 'Real Estate Developer',
    salary: 65000.00,
    employer: 'Self-Employed',
    emergencyContact: 'Layla Rashid',
    emergencyPhone: '+971 50 333 4444',
    address: 'Palm Residences, Villa 12, Palm Jumeirah',
    city: 'Dubai',
    emirate: 'Dubai',
    postalCode: '00000',
    status: 'active',
    notes: 'High-value tenant, owns multiple properties. VIP treatment required.',
    documents: {
      passport: 'passport_mohammed.pdf',
      emiratesId: 'eid_mohammed.pdf',
      tradeLicense: 'license_mohammed.pdf'
    },
    isActive: true
  },
  {
    name: 'Linda Chen',
    email: 'linda.chen@email.com',
    phone: '+971 50 444 4444',
    emiratesId: '784-1992-4567890-4',
    visaStatus: 'work',
    nationality: 'Chinese',
    company: 'HSBC Bank',
    jobTitle: 'Senior Banking Manager',
    salary: 35000.00,
    employer: 'HSBC Bank Middle East',
    emergencyContact: 'David Chen',
    emergencyPhone: '+86 138 1234 5678',
    address: 'Downtown Complex, Unit 805, Downtown Dubai',
    city: 'Dubai',
    emirate: 'Dubai',
    postalCode: '00000',
    status: 'active',
    notes: 'All payments completed on time. Excellent tenant.',
    documents: {
      passport: 'passport_linda.pdf',
      emiratesId: 'eid_linda.pdf',
      visa: 'visa_linda.pdf',
      bankStatement: 'statement_linda.pdf'
    },
    isActive: true
  },
  {
    name: 'Khalid Hassan',
    email: 'khalid.hassan@email.com',
    phone: '+971 50 555 5555',
    emiratesId: '784-1995-5678901-5',
    visaStatus: 'resident',
    nationality: 'UAE',
    company: 'Hassan Group',
    jobTitle: 'Operations Manager',
    salary: 28000.00,
    employer: 'Hassan Group LLC',
    emergencyContact: 'Amira Hassan',
    emergencyPhone: '+971 50 555 6666',
    address: 'Marina Heights, Unit 2203, Dubai Marina',
    city: 'Dubai',
    emirate: 'Dubai',
    postalCode: '00000',
    status: 'active',
    notes: 'Partial payment tenant. Requesting payment plan for remaining balance.',
    documents: {
      passport: 'passport_khalid.pdf',
      emiratesId: 'eid_khalid.pdf',
      employmentLetter: 'employment_khalid.pdf'
    },
    isActive: true
  },
  {
    name: 'Elena Rodriguez',
    email: 'elena.rodriguez@email.com',
    phone: '+971 50 666 6666',
    emiratesId: '784-1989-6789012-6',
    visaStatus: 'work',
    nationality: 'Spanish',
    company: 'Jumeirah Hotels',
    jobTitle: 'Hotel Manager',
    salary: 32000.00,
    employer: 'Jumeirah Hotels & Resorts',
    emergencyContact: 'Carlos Rodriguez',
    emergencyPhone: '+34 91 123 4567',
    address: 'Jumeirah Beach Residence, Unit 1102, JBR',
    city: 'Dubai',
    emirate: 'Dubai',
    postalCode: '00000',
    status: 'active',
    notes: 'Professional tenant, works in hospitality industry.',
    documents: {
      passport: 'passport_elena.pdf',
      emiratesId: 'eid_elena.pdf',
      visa: 'visa_elena.pdf'
    },
    isActive: true
  },
  {
    name: 'Raj Patel',
    email: 'raj.patel@email.com',
    phone: '+971 50 777 7777',
    emiratesId: '784-1987-7890123-7',
    visaStatus: 'work',
    nationality: 'Indian',
    company: 'Tech Solutions DMCC',
    jobTitle: 'IT Director',
    salary: 38000.00,
    employer: 'Tech Solutions DMCC',
    emergencyContact: 'Priya Patel',
    emergencyPhone: '+91 98765 43210',
    address: 'Greens Community, Villa 45, The Greens',
    city: 'Dubai',
    emirate: 'Dubai',
    postalCode: '00000',
    status: 'active',
    notes: 'Tech professional, prefers digital communication.',
    documents: {
      passport: 'passport_raj.pdf',
      emiratesId: 'eid_raj.pdf',
      visa: 'visa_raj.pdf',
      employmentContract: 'contract_raj.pdf'
    },
    isActive: true
  },
  {
    name: 'Sophia Williams',
    email: 'sophia.williams@email.com',
    phone: '+971 50 888 8888',
    emiratesId: '784-1993-8901234-8',
    visaStatus: 'work',
    nationality: 'American',
    company: 'McKinsey & Company',
    jobTitle: 'Senior Consultant',
    salary: 42000.00,
    employer: 'McKinsey & Company',
    emergencyContact: 'Michael Williams',
    emergencyPhone: '+1 212 555 0123',
    address: 'DIFC Apartments, Unit 1505, DIFC',
    city: 'Dubai',
    emirate: 'Dubai',
    postalCode: '00000',
    status: 'active',
    notes: 'High-income professional, frequent traveler.',
    documents: {
      passport: 'passport_sophia.pdf',
      emiratesId: 'eid_sophia.pdf',
      visa: 'visa_sophia.pdf'
    },
    isActive: true
  },
  {
    name: 'Youssef Mansour',
    email: 'youssef.mansour@email.com',
    phone: '+971 50 999 9999',
    emiratesId: '784-1991-9012345-9',
    visaStatus: 'resident',
    nationality: 'Egyptian',
    company: 'Mansour Engineering',
    jobTitle: 'Civil Engineer',
    salary: 25000.00,
    employer: 'Mansour Engineering Consultants',
    emergencyContact: 'Nour Mansour',
    emergencyPhone: '+20 10 1234 5678',
    address: 'Silicon Oasis, Unit 701, Dubai Silicon Oasis',
    city: 'Dubai',
    emirate: 'Dubai',
    postalCode: '00000',
    status: 'active',
    notes: 'Reliable tenant, works in construction industry.',
    documents: {
      passport: 'passport_youssef.pdf',
      emiratesId: 'eid_youssef.pdf',
      visa: 'visa_youssef.pdf'
    },
    isActive: true
  },
  {
    name: 'Isabella Martinez',
    email: 'isabella.martinez@email.com',
    phone: '+971 50 101 0101',
    emiratesId: '784-1994-0123456-0',
    visaStatus: 'work',
    nationality: 'Mexican',
    company: 'Dubai Mall',
    jobTitle: 'Retail Manager',
    salary: 18000.00,
    employer: 'Emaar Malls',
    emergencyContact: 'Diego Martinez',
    emergencyPhone: '+52 55 1234 5678',
    address: 'Al Barsha, Unit 402, Al Barsha 1',
    city: 'Dubai',
    emirate: 'Dubai',
    postalCode: '00000',
    status: 'active',
    notes: 'Retail professional, flexible with viewings.',
    documents: {
      passport: 'passport_isabella.pdf',
      emiratesId: 'eid_isabella.pdf',
      visa: 'visa_isabella.pdf'
    },
    isActive: true
  },
  {
    name: 'Hassan Ali',
    email: 'hassan.ali@email.com',
    phone: '+971 50 202 0202',
    emiratesId: '784-1986-1234567-1',
    visaStatus: 'resident',
    nationality: 'UAE',
    company: 'Ali Motors',
    jobTitle: 'Business Owner',
    salary: 55000.00,
    employer: 'Self-Employed',
    emergencyContact: 'Maryam Ali',
    emergencyPhone: '+971 50 202 0303',
    address: 'Arabian Ranches, Villa 23, Arabian Ranches 2',
    city: 'Dubai',
    emirate: 'Dubai',
    postalCode: '00000',
    status: 'active',
    notes: 'Business owner, excellent credit history.',
    documents: {
      passport: 'passport_hassan.pdf',
      emiratesId: 'eid_hassan.pdf',
      tradeLicense: 'license_hassan.pdf'
    },
    isActive: true
  },
  {
    name: 'Anna Kowalski',
    email: 'anna.kowalski@email.com',
    phone: '+971 50 303 0303',
    emiratesId: '784-1990-2345678-2',
    visaStatus: 'work',
    nationality: 'Polish',
    company: 'Dubai Properties',
    jobTitle: 'Marketing Director',
    salary: 36000.00,
    employer: 'Dubai Properties Group',
    emergencyContact: 'Jan Kowalski',
    emergencyPhone: '+48 22 123 4567',
    address: 'City Walk, Unit 903, City Walk',
    city: 'Dubai',
    emirate: 'Dubai',
    postalCode: '00000',
    status: 'active',
    notes: 'Marketing professional, active on social media.',
    documents: {
      passport: 'passport_anna.pdf',
      emiratesId: 'eid_anna.pdf',
      visa: 'visa_anna.pdf'
    },
    isActive: true
  },
  {
    name: 'Omar Abdullah',
    email: 'omar.abdullah@email.com',
    phone: '+971 50 404 0404',
    emiratesId: '784-1996-3456789-3',
    visaStatus: 'student',
    nationality: 'Jordanian',
    company: 'Dubai University',
    jobTitle: 'Graduate Student',
    salary: 8000.00,
    employer: 'Part-time Work',
    emergencyContact: 'Laila Abdullah',
    emergencyPhone: '+962 6 123 4567',
    address: 'International City, Unit 505, International City',
    city: 'Dubai',
    emirate: 'Dubai',
    postalCode: '00000',
    status: 'active',
    notes: 'Student tenant, requires flexible payment terms.',
    documents: {
      passport: 'passport_omar.pdf',
      emiratesId: 'eid_omar.pdf',
      studentId: 'student_omar.pdf'
    },
    isActive: true
  },
  {
    name: 'Jennifer Lee',
    email: 'jennifer.lee@email.com',
    phone: '+971 50 505 0505',
    emiratesId: '784-1988-4567890-4',
    visaStatus: 'work',
    nationality: 'Korean',
    company: 'Samsung Gulf',
    jobTitle: 'Regional Sales Manager',
    salary: 40000.00,
    employer: 'Samsung Gulf Electronics',
    emergencyContact: 'James Lee',
    emergencyPhone: '+82 2 1234 5678',
    address: 'Business Bay, Unit 1203, Business Bay',
    city: 'Dubai',
    emirate: 'Dubai',
    postalCode: '00000',
    status: 'active',
    notes: 'Corporate tenant, company-sponsored lease.',
    documents: {
      passport: 'passport_jennifer.pdf',
      emiratesId: 'eid_jennifer.pdf',
      visa: 'visa_jennifer.pdf',
      corporateLetter: 'corporate_jennifer.pdf'
    },
    isActive: true
  },
  {
    name: 'Abdullah Rahman',
    email: 'abdullah.rahman@email.com',
    phone: '+971 50 606 0606',
    emiratesId: '784-1992-5678901-5',
    visaStatus: 'resident',
    nationality: 'UAE',
    company: 'Rahman Investments',
    jobTitle: 'Investment Manager',
    salary: 48000.00,
    employer: 'Self-Employed',
    emergencyContact: 'Fatima Rahman',
    emergencyPhone: '+971 50 606 0707',
    address: 'Emirates Hills, Villa 8, Emirates Hills',
    city: 'Dubai',
    emirate: 'Dubai',
    postalCode: '00000',
    status: 'active',
    notes: 'High net worth individual, multiple properties.',
    documents: {
      passport: 'passport_abdullah_r.pdf',
      emiratesId: 'eid_abdullah_r.pdf',
      tradeLicense: 'license_abdullah_r.pdf'
    },
    isActive: true
  }
];

// Sample properties data
const propertiesData = [
  {
    title: 'Luxury 2BR Apartment in Dubai Marina',
    location: 'Dubai Marina',
    emirate: 'dubai',
    community: 'Marina Walk',
    buildingType: 'apartment',
    bedrooms: 2,
    bathrooms: 2,
    area: 1200,
    price: 120000,
    pricePerSqft: 100,
    furnished: 'furnished',
    amenities: ['Gym', 'Pool', 'Parking', 'Concierge', 'Sea View'],
    features: {
      parking: 2,
      balcony: true,
      seaView: true,
      gym: true,
      pool: true,
      security: true
    },
    images: ['/api/placeholder/400/300'],
    availability: 'available',
    moveInDate: '2024-08-01',
    agentId: 2,
    description: 'Stunning 2-bedroom apartment with panoramic sea views in the heart of Dubai Marina. Fully furnished with premium finishes.'
  },
  {
    title: 'Modern 3BR Villa in Arabian Ranches',
    location: 'Arabian Ranches',
    emirate: 'dubai',
    community: 'Ranches 1',
    buildingType: 'villa',
    bedrooms: 3,
    bathrooms: 3,
    area: 2000,
    price: 180000,
    pricePerSqft: 90,
    furnished: 'semi_furnished',
    amenities: ['Garden', 'Pool', 'Parking', 'Gym', 'Golf Course'],
    features: {
      parking: 3,
      garden: true,
      pool: true,
      golfCourse: true,
      security: true
    },
    images: ['/api/placeholder/400/300'],
    availability: 'available',
    moveInDate: '2024-09-01',
    agentId: 3,
    description: 'Spacious family villa with private garden and pool access. Perfect for families seeking tranquility.'
  },
  {
    title: 'Executive Office Space in DIFC',
    location: 'DIFC',
    emirate: 'dubai',
    community: 'Financial Center',
    buildingType: 'office',
    bedrooms: 0,
    bathrooms: 2,
    area: 1500,
    price: 150000,
    pricePerSqft: 100,
    furnished: 'furnished',
    amenities: ['Business Center', 'Meeting Rooms', 'Parking', 'Security', 'High-speed Internet'],
    features: {
      parking: 4,
      businessCenter: true,
      meetingRooms: true,
      highSpeedInternet: true,
      security: true
    },
    images: ['/api/placeholder/400/300'],
    availability: 'available',
    moveInDate: '2024-07-15',
    agentId: 2,
    description: 'Premium office space in the heart of Dubai\'s financial district. Fully equipped for modern business needs.'
  },
  {
    title: 'Cozy 1BR Apartment in Sharjah',
    location: 'Al Majaz',
    emirate: 'sharjah',
    community: 'Al Majaz',
    buildingType: 'apartment',
    bedrooms: 1,
    bathrooms: 1,
    area: 800,
    price: 45000,
    pricePerSqft: 56,
    furnished: 'unfurnished',
    amenities: ['Parking', 'Security', 'Near Metro'],
    features: {
      parking: 1,
      security: true,
      nearMetro: true
    },
    images: ['/api/placeholder/400/300'],
    availability: 'available',
    moveInDate: '2024-06-01',
    agentId: 3,
    description: 'Affordable 1-bedroom apartment in the heart of Sharjah. Perfect for young professionals.'
  },
  {
    title: 'Luxury Penthouse in Downtown Dubai',
    location: 'Downtown Dubai',
    emirate: 'dubai',
    community: 'Burj Khalifa Area',
    buildingType: 'penthouse',
    bedrooms: 4,
    bathrooms: 4,
    area: 3000,
    price: 300000,
    pricePerSqft: 100,
    furnished: 'furnished',
    amenities: ['City View', 'Concierge', 'Gym', 'Pool', 'Parking', 'High Floor'],
    features: {
      parking: 4,
      cityView: true,
      concierge: true,
      gym: true,
      pool: true,
      highFloor: true,
      security: true
    },
    images: ['/api/placeholder/400/300'],
    availability: 'available',
    moveInDate: '2024-08-15',
    agentId: 2,
    description: 'Exclusive penthouse with breathtaking city views. The ultimate in luxury living.'
  }
];

// Sample lead activities data
const activitiesData = [
  {
    leadId: 1,
    userId: 2,
    activityType: 'call',
    title: 'Initial Contact Call',
    description: 'Called lead to discuss requirements and schedule property viewing',
    completedAt: new Date()
  },
  {
    leadId: 2,
    userId: 3,
    activityType: 'email',
    title: 'Property Information Sent',
    description: 'Sent property details and pricing information via email',
    completedAt: new Date()
  },
  {
    leadId: 3,
    userId: 2,
    activityType: 'meeting',
    title: 'Property Viewing Scheduled',
    description: 'Scheduled property viewing for next week',
    scheduledAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  },
  {
    leadId: 4,
    userId: 3,
    activityType: 'whatsapp',
    title: 'WhatsApp Follow-up',
    description: 'Sent WhatsApp message with property updates',
    completedAt: new Date()
  },
  {
    leadId: 5,
    userId: 2,
    activityType: 'proposal',
    title: 'Proposal Sent',
    description: 'Sent formal lease proposal with terms and conditions',
    completedAt: new Date()
  }
];

const seed = async () => {
  try {
    console.log('🌱 Starting database seeding...');
    
    // Create users
    console.log('👥 Creating users...');
    const users = await User.bulkCreate(usersData);
    console.log(`✅ Created ${users.length} users`);
    
    // Create tenants
    console.log('👨‍👩‍👧‍👦 Creating tenants...');
    const tenants = await Tenant.bulkCreate(tenantsData);
    console.log(`✅ Created ${tenants.length} tenants`);
    
    // Create leads
    console.log('🎯 Creating leads...');
    const leads = await Lead.bulkCreate(leadsData);
    console.log(`✅ Created ${leads.length} leads`);
    
    // Create properties
    console.log('🏠 Creating properties...');
    const properties = await Property.bulkCreate(propertiesData);
    console.log(`✅ Created ${properties.length} properties`);
    
    // Create lead activities
    console.log('📝 Creating lead activities...');
    const activities = await LeadActivity.bulkCreate(activitiesData);
    console.log(`✅ Created ${activities.length} activities`);
    
    // Create some lead-property matches
    console.log('🔗 Creating lead-property matches...');
    const matches = [
      { leadId: 1, propertyId: 1, matchScore: 95, isFavorite: true },
      { leadId: 2, propertyId: 2, matchScore: 88, isFavorite: true },
      { leadId: 3, propertyId: 5, matchScore: 92, isFavorite: true },
      { leadId: 4, propertyId: 4, matchScore: 78, isFavorite: false },
      { leadId: 5, propertyId: 2, matchScore: 85, isFavorite: true }
    ];
    
    const leadProperties = await LeadProperty.bulkCreate(matches);
    console.log(`✅ Created ${leadProperties.length} lead-property matches`);
    
    console.log('🎉 Database seeding completed successfully!');
    console.log('📊 Summary:');
    console.log(`   - ${users.length} users`);
    console.log(`   - ${tenants.length} tenants`);
    console.log(`   - ${leads.length} leads`);
    console.log(`   - ${properties.length} properties`);
    console.log(`   - ${activities.length} activities`);
    console.log(`   - ${leadProperties.length} matches`);
    
  } catch (error) {
    console.error('❌ Seeding error:', error.message);
    console.error('Error details:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
};

seed();
