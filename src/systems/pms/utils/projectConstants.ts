// @ts-nocheck
import { calculateDuration } from './pmsHelpers';

// Shared dropdown options for the New Project form (Add_Project.jsx / Edit_Add_Project.jsx)
export const PROJECT_TYPES = [
  'Irrigation Projects',
  'Canal Works Project',
  'HDPE/DI Pipeline Projects',
  'Road Works Project',
  'Building Construction Project',
  'Drainage Works Project',
  'Government Infrastructure Projects',
  'Other Civil Engineering Works'
];

/**
 * Generates realistic, valid dummy data for all fields of the Add Project form.
 */
export const generateDummyProjectData = () => {
  const projectNames = [
    'Wardha Lift Irrigation Scheme Phase-II',
    'Pench Left Bank Canal Rehabilitation',
    'Amravati Water Distribution Pipeline System',
    'Nagpur Feeder Branch Canal Construction',
    'Krishna Basin Underground Pipeline Project',
    'Godavari Valley Minor Irrigation Network',
    'Tapi River Lift Canal Extension Works',
    'Bhandara District High-Pressure Pipeline Network',
    'Upper Wardha Sub-Surface Drainage Project',
    'Pooja Canal Retaining & Embankment Works'
  ];

  const departments = [
    'Water Resources Department (WRD)',
    'Public Works Department (PWD)',
    'Maharashtra Water Infrastructure Dept',
    'Minor Irrigation & Ground Water Dept',
    'Rural Water Supply & Sanitation'
  ];

  const divisions = [
    'Wardha Irrigation Division',
    'Nagpur Project Division',
    'Amravati Canal Division',
    'Chandrapur Water Resources Division',
    'Yavatmal Irrigation Division'
  ];

  const subDivisions = [
    'Sub-Division No. 1 (Arvi)',
    'Sub-Division No. 2 (Deoli)',
    'Sub-Division No. 3 (Hinganghat)',
    'Sub-Division No. 4 (Seloo)',
    'Sub-Division No. 5 (Karanja)'
  ];

  const locations = [
    { village: 'Injewada', district: 'Wardha', state: 'Maharashtra', location: 'Injewada Sector-4, Wardha' },
    { village: 'Deoli', district: 'Wardha', state: 'Maharashtra', location: 'Deoli Rural Canal Belt, Wardha' },
    { village: 'Seloo', district: 'Wardha', state: 'Maharashtra', location: 'Seloo Branch Pipeline Zone, Wardha' },
    { village: 'Hinganghat', district: 'Wardha', state: 'Maharashtra', location: 'Hinganghat Southern Irrigation Zone' },
    { village: 'Umred', district: 'Nagpur', state: 'Maharashtra', location: 'Umred Feeder Route, Nagpur' },
    { village: 'Katol', district: 'Nagpur', state: 'Maharashtra', location: 'Katol Water Network Zone, Nagpur' },
    { village: 'Tiwsa', district: 'Amravati', state: 'Maharashtra', location: 'Tiwsa Canal Reach-2, Amravati' }
  ];

  const contractors = [
    {
      name: 'Pooja Construction',
      phone: '8275149683',
      email: 'daftarigroup@gmail.com',
      address: '104, 1st Floor, Behind Daftari Arcade, Dhuniwale Chowk, Nagpur Road, Wardha - 442001'
    },
    {
      name: 'Shree Ganesh Infra Ltd',
      phone: '9822341567',
      email: 'info@shreeganeshinfra.com',
      address: 'Plot No. 12, MIDC Industrial Area, Hingna Road, Nagpur - 440016'
    },
    {
      name: 'Apex Engineering & Infra',
      phone: '9422891234',
      email: 'contact@apexinfra.co.in',
      address: 'Shop 5-6, Civil Lines Complex, Near Collectorate, Amravati - 444601'
    },
    {
      name: 'Kalyan Construction Co.',
      phone: '9765432109',
      email: 'projects@kalyanconst.in',
      address: '45, Station Road, Dhantoli, Wardha - 442001'
    }
  ];

  // Helper for random 10-digit Indian phone number
  const generateRandomPhone = () => {
    const prefixes = ['98', '97', '94', '99', '88', '82', '70', '77', '91', '96'];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    let remaining = '';
    for (let i = 0; i < 8; i++) {
      remaining += Math.floor(Math.random() * 10);
    }
    return prefix + remaining;
  };

  const randInt = (min, max) => Math.floor(min + Math.random() * (max - min + 1));
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  const selectedLoc = pick(locations);
  const selectedContractor = pick(contractors);
  const randomPhone = generateRandomPhone();

  // Dates: startDate around today +/- 10 days, plannedEndDate 6-18 months later
  const today = new Date();
  const start = new Date(today);
  start.setDate(today.getDate() + randInt(-5, 10));

  const end = new Date(start);
  end.setMonth(start.getMonth() + randInt(6, 18));
  end.setDate(start.getDate() + randInt(0, 15));

  const pad = (n) => String(n).padStart(2, '0');
  const formatYMD = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  const startDateStr = formatYMD(start);
  const endDateStr = formatYMD(end);
  const workPeriodStr = calculateDuration(startDateStr, endDateStr) || `${randInt(6, 18)} Months`;

  const workOrderDate = new Date(start);
  workOrderDate.setDate(start.getDate() - randInt(5, 20));
  const workOrderDateStr = formatYMD(workOrderDate);

  const tenderAmt = (randInt(25, 95) * 100000) + (randInt(0, 9) * 10000);
  const percentages = [-4.5, -3.2, -2.0, 0, 1.5, 2.75, 4.0, 5.2];
  const percentage = pick(percentages);

  const randomSuffix = randInt(100, 999);

  return {
    projectType: pick(PROJECT_TYPES),
    projectName: `${pick(projectNames)} (Pkg-${randomSuffix})`,
    agreementNumber: `AGR/WRD/2026-27/${randInt(1000, 9999)}`,
    department: pick(departments),
    division: pick(divisions),
    subDivision: pick(subDivisions),
    irrigationCapacity: `${randInt(250, 1200)} Hectares`,
    projectLocation: selectedLoc.location,
    village: selectedLoc.village,
    district: selectedLoc.district,
    state: selectedLoc.state,
    contractorName: selectedContractor.name,
    contractorPhone: randomPhone,
    contractorEmail: `contractor.${randomSuffix}@${selectedContractor.name.toLowerCase().replace(/[^a-z]/g, '') || 'contractor'}.com`,
    contractorAddress: selectedContractor.address,
    startDate: startDateStr,
    plannedEndDate: endDateStr,
    workPeriod: workPeriodStr,
    workOrder: `WO/WRD/2026/${randInt(1000, 9999)}`,
    workOrderDate: workOrderDateStr,
    workOrderDocument: '',
    workOrderDocumentName: '',
    tenderId: `TND-2026-${randInt(10000, 99999)}`,
    tenderAmount: String(tenderAmt),
    percentage: String(percentage),
    maintenancePeriod: `${pick([12, 24, 36, 60])} Months`,
    projectDescription: 'Execution of complete pipeline laying, excavation, bedding, jointing, backfilling, air valve installations, and trial run as per technical specifications.'
  };
};
