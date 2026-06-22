import { AISTask, Urgency, Difficulty } from '../types/game';
import { RETRIEVAL_REFS } from './storeRefs';

const genId = () => Math.random().toString(36).substring(2, 9);

// ── Timing helpers ─────────────────────────────────────────────────────────────
// Expiry in real milliseconds
const EXPIRY_MS: Record<Urgency, number> = {
  CRITICAL: 120_000,
  HIGH:     300_000,
  MEDIUM:   600_000,
  LOW:      900_000,
};

const MAX_SCORE: Record<Urgency, number> = {
  CRITICAL: 150,
  HIGH:     100,
  MEDIUM:   75,
  LOW:      50,
};

// Progressive urgency based on fraction of shift elapsed (0–1)
export function pickUrgency(pct: number): Urgency {
  const r = Math.random();
  if (pct < 0.25) return r < 0.6 ? 'LOW'    : 'MEDIUM';
  if (pct < 0.5)  return r < 0.4 ? 'MEDIUM' : r < 0.7 ? 'HIGH' : 'LOW';
  if (pct < 0.75) return r < 0.5 ? 'HIGH'   : r < 0.8 ? 'MEDIUM' : 'CRITICAL';
  return r < 0.5 ? 'HIGH' : 'CRITICAL';
}

// Progressive difficulty based on fraction of shift elapsed
export function pickDifficulty(pct: number): Difficulty {
  const r = Math.random();
  if (pct < 0.25) return r < 0.8 ? 'EASY'   : 'MEDIUM';
  if (pct < 0.5)  return r < 0.5 ? 'EASY'   : r < 0.85 ? 'MEDIUM' : 'HARD';
  if (pct < 0.75) return r < 0.2 ? 'EASY'   : r < 0.65 ? 'MEDIUM' : 'HARD';
  return r < 0.15 ? 'MEDIUM' : 'HARD';
}

// ── FLIGHT PLAN pool ───────────────────────────────────────────────────────────
export interface FPLCorrect {
  aircraftId: string; flightRules: string; typeOfFlight: string;
  aircraftType: string; wakeCategory: string; equipment: string; ssr: string;
  depAerodrome: string; eobt: string; cruisingSpeed: string; cruisingLevel: string;
  route: string; destAerodrome: string; totalEet: string; altAerodrome1: string;
  altAerodrome2: string; otherInfo: string; endurance: string; pob: string;
  emergencyRadio: string; survivalEquip: string; jackets: string; dinghies: string;
  acColour: string; remarks19: string; pilot: string;
}

interface FPLScenario {
  id: string; narrative: string; difficultyTier: Difficulty;
  correct: FPLCorrect; errors: Partial<FPLCorrect>;
}

const FPL_POOL: FPLScenario[] = [
  {
    id: 'fpl-01', difficultyTier: 'EASY',
    narrative: 'Morning, AIS — this is G-ABCD, a Cessna 172, light category. I\'d like to file VFR, general aviation, out of Heathrow — EGLL — off the blocks at 0800Z. We\'ll cruise 110 knots at VFR levels. Routing direct WOTAN then direct to Birmingham — EGBB — total time one hour thirty. Alternate is London City, EGLC. Standard equipment with a Mode C transponder. Endurance four hours, two persons on board. Pilot in command Captain Davies.',
    correct: {
      aircraftId:'G-ABCD', flightRules:'V', typeOfFlight:'G', aircraftType:'C172', wakeCategory:'L',
      equipment:'S', ssr:'C', depAerodrome:'EGLL', eobt:'0800', cruisingSpeed:'N0110', cruisingLevel:'VFR',
      route:'DCT WOTAN DCT', destAerodrome:'EGBB', totalEet:'0130', altAerodrome1:'EGLC', altAerodrome2:'',
      otherInfo:'0', endurance:'0400', pob:'002', emergencyRadio:'V', survivalEquip:'',
      jackets:'', dinghies:'', acColour:'WHITE RED TRIM', remarks19:'', pilot:'DAVIES'
    },
    errors:{ wakeCategory:'M', eobt:'0900', route:'DCT' }
  },
  {
    id: 'fpl-02', difficultyTier: 'EASY',
    narrative: 'Hi AIS, G-WXYZ, a Piper PA-28, light aircraft. Filing VFR, private flight, departing London City — EGLC — at 1030Z. Cruise 95 knots, VFR. Routing direct to Blackbushe, EGLK, twenty minutes en route. Alternate Denham, EGLD. Standard kit, Mode A transponder only. Endurance two hours thirty, one person on board. Pilot Smith.',
    correct: {
      aircraftId:'G-WXYZ', flightRules:'V', typeOfFlight:'G', aircraftType:'P28A', wakeCategory:'L',
      equipment:'S', ssr:'A', depAerodrome:'EGLC', eobt:'1030', cruisingSpeed:'N0095', cruisingLevel:'VFR',
      route:'DCT', destAerodrome:'EGLK', totalEet:'0020', altAerodrome1:'EGLD', altAerodrome2:'',
      otherInfo:'0', endurance:'0230', pob:'001', emergencyRadio:'V', survivalEquip:'',
      jackets:'', dinghies:'', acColour:'BLUE WHITE', remarks19:'', pilot:'SMITH'
    },
    errors:{ aircraftType:'C172', totalEet:'0050' }
  },
  {
    id: 'fpl-03', difficultyTier: 'EASY',
    narrative: 'Aberdeen AIS, G-LMNP, a Cessna 208 Caravan, light. VFR, general aviation, off Aberdeen — EGPD — at 0645Z. 170 knots, VFR levels, direct GOMUR then direct to Sumburgh, EGPB, one hour. Alternate back at Aberdeen, EGPD. Standard equipment, Mode C. Endurance three hours, four on board. Captain MacLeod.',
    correct: {
      aircraftId:'G-LMNP', flightRules:'V', typeOfFlight:'G', aircraftType:'C208', wakeCategory:'L',
      equipment:'S', ssr:'C', depAerodrome:'EGPD', eobt:'0645', cruisingSpeed:'N0170', cruisingLevel:'VFR',
      route:'DCT GOMUR DCT', destAerodrome:'EGPB', totalEet:'0100', altAerodrome1:'EGPD', altAerodrome2:'',
      otherInfo:'0', endurance:'0300', pob:'004', emergencyRadio:'VE', survivalEquip:'M',
      jackets:'LF', dinghies:'D/1/4/YELLOW', acColour:'WHITE BLUE STRIPE', remarks19:'OFFSHORE OPS', pilot:'MACLEOD'
    },
    errors:{ wakeCategory:'M', survivalEquip:'', jackets:'' }
  },
  {
    id: 'fpl-04', difficultyTier: 'EASY',
    narrative: 'AIS, G-RDST, a Robinson R22 helicopter, light. VFR private flight from Blackbushe — EGLK — at 1415Z, 80 knots, VFR, direct to Denham, EGLD, twenty-five minutes. Alternate London City, EGLC. Standard equipment, Mode C transponder. Endurance one hour forty-five, two persons on board. Pilot Jones.',
    correct: {
      aircraftId:'G-RDST', flightRules:'V', typeOfFlight:'G', aircraftType:'R22', wakeCategory:'L',
      equipment:'S', ssr:'C', depAerodrome:'EGLK', eobt:'1415', cruisingSpeed:'N0080', cruisingLevel:'VFR',
      route:'DCT', destAerodrome:'EGLD', totalEet:'0025', altAerodrome1:'EGLC', altAerodrome2:'',
      otherInfo:'0', endurance:'0145', pob:'002', emergencyRadio:'V', survivalEquip:'',
      jackets:'', dinghies:'', acColour:'RED WHITE', remarks19:'', pilot:'JONES'
    },
    errors:{ eobt:'1445', pob:'001' }
  },
  {
    id: 'fpl-05', difficultyTier: 'EASY',
    narrative: 'Wycombe AIS, G-VENT, a Grob G109 motor-glider, light category. VFR, general aviation, departing Wycombe Air Park — EGTB — at 1200Z. Cruise 80 knots, VFR. Direct COMPTON then direct to Old Sarum, EGLS, fifty-five minutes. Alternate Southampton, EGHI. Standard equipment, Mode C. Endurance five hours, two on board. Pilot Hughes.',
    correct: {
      aircraftId:'G-VENT', flightRules:'V', typeOfFlight:'G', aircraftType:'G109', wakeCategory:'L',
      equipment:'S', ssr:'C', depAerodrome:'EGTB', eobt:'1200', cruisingSpeed:'N0080', cruisingLevel:'VFR',
      route:'DCT COMPTON DCT', destAerodrome:'EGLS', totalEet:'0055', altAerodrome1:'EGHI', altAerodrome2:'',
      otherInfo:'0', endurance:'0500', pob:'002', emergencyRadio:'V', survivalEquip:'',
      jackets:'', dinghies:'', acColour:'YELLOW BLACK', remarks19:'', pilot:'HUGHES'
    },
    errors:{ aircraftType:'C172', depAerodrome:'EGLD', totalEet:'0030' }
  },
  {
    id: 'fpl-06', difficultyTier: 'MEDIUM',
    narrative: 'Manchester AIS, Speedbird 456, a Boeing 737-800, medium wake. IFR scheduled service, off Manchester — EGCC — at 0915Z. Cruise 450 knots, Flight Level 350. Route: UVAVU, UL9 to KOKSY, L10 to REMSI, N869 to DOMOD, then the DOMOD7F arrival into Rome Fiumicino — LIRF — total time two hours forty-five. Alternates Ciampino, LIRA, and Bergamo, LIME. RNAV equipped, Mode S with ADS-B out. Endurance four hours thirty, 150 souls on board. Captain Johnson.',
    correct: {
      aircraftId:'BAW456', flightRules:'I', typeOfFlight:'S', aircraftType:'B738', wakeCategory:'M',
      equipment:'SDFGRY/SD', ssr:'SDE1', depAerodrome:'EGCC', eobt:'0915', cruisingSpeed:'N0450',
      cruisingLevel:'F350', route:'UVAVU UL9 KOKSY L10 REMSI N869 DOMOD DOMOD7F',
      destAerodrome:'LIRF', totalEet:'0245', altAerodrome1:'LIRA', altAerodrome2:'LIME',
      otherInfo:'PBN/B2 NAV/RNVD1E2 DOF/260603 REG/GBABS STS/HOSP',
      endurance:'0430', pob:'150', emergencyRadio:'UVE', survivalEquip:'',
      jackets:'', dinghies:'', acColour:'WHITE BLUE STRIPE', remarks19:'', pilot:'CPTJOHNSON'
    },
    errors:{ wakeCategory:'H', equipment:'S/C', ssr:'C', totalEet:'0210', altAerodrome2:'' }
  },
  {
    id: 'fpl-07', difficultyTier: 'MEDIUM',
    narrative: 'Gatwick AIS, Easy 789, an Airbus A319, medium. IFR, non-scheduled, departing Gatwick — EGKK — at 1330Z, 450 knots, Flight Level 370. Routing BOGNA, UL612 to RODEL, UN872 to NORMA, into Palma de Mallorca — LEPA — one hour fifty-five. Alternates Barcelona, LEBL, and Sabadell, LELL. RNAV equipped, Mode S with ADS-B. Endurance three hours twenty, 180 on board. Captain Patel.',
    correct: {
      aircraftId:'EZY789', flightRules:'I', typeOfFlight:'N', aircraftType:'A319', wakeCategory:'M',
      equipment:'SDFGHIRVY/SD', ssr:'SDE1', depAerodrome:'EGKK', eobt:'1330', cruisingSpeed:'N0450',
      cruisingLevel:'F370', route:'BOGNA UL612 RODEL UN872 NORMA',
      destAerodrome:'LEPA', totalEet:'0155', altAerodrome1:'LEBL', altAerodrome2:'LELL',
      otherInfo:'PBN/B2 DOF/260603 REG/GEZYT',
      endurance:'0320', pob:'180', emergencyRadio:'UVE', survivalEquip:'',
      jackets:'', dinghies:'', acColour:'ORANGE WHITE', remarks19:'', pilot:'CPTPATEL'
    },
    errors:{ typeOfFlight:'S', cruisingLevel:'F350', totalEet:'0225', altAerodrome2:'' }
  },
  {
    id: 'fpl-08', difficultyTier: 'MEDIUM',
    narrative: 'Newcastle AIS, Jersey 101, an Embraer 190, medium. IFR scheduled, off Newcastle — EGNT — at 0745Z, 390 knots, Flight Level 200. Route BERMA, UN601 to GRICE, into Edinburgh — EGPH — thirty-five minutes. Alternates Glasgow, EGPF, and Aberdeen, EGPD. RNAV, Mode S with ADS-B. Endurance two hours thirty, 98 on board. Captain Wilson.',
    correct: {
      aircraftId:'BEE101', flightRules:'I', typeOfFlight:'S', aircraftType:'E190', wakeCategory:'M',
      equipment:'SDFGRY/SD', ssr:'SDE1', depAerodrome:'EGNT', eobt:'0745', cruisingSpeed:'N0390',
      cruisingLevel:'F200', route:'BERMA UN601 GRICE',
      destAerodrome:'EGPH', totalEet:'0035', altAerodrome1:'EGPF', altAerodrome2:'EGPD',
      otherInfo:'PBN/B2 DOF/260603',
      endurance:'0230', pob:'098', emergencyRadio:'UVE', survivalEquip:'',
      jackets:'', dinghies:'', acColour:'WHITE BLUE', remarks19:'', pilot:'CPTWILSON'
    },
    errors:{ wakeCategory:'L', cruisingLevel:'F280', totalEet:'0055', pob:'089' }
  },
  {
    id: 'fpl-09', difficultyTier: 'MEDIUM',
    narrative: 'Schiphol AIS, KLM 2004, a Boeing 737-900, medium. IFR scheduled, departing Amsterdam — EHAM — at 1150Z, 440 knots, Flight Level 290. Route ARTIP, L10 to KONAN, UL608 to KILAK, into Birmingham — EGBB — one hour five. Alternates London City, EGLC, and Heathrow, EGLL. RNAV, Mode S with ADS-B. Endurance three hours thirty, 190 on board. Captain van den Burg.',
    correct: {
      aircraftId:'KLM2004', flightRules:'I', typeOfFlight:'S', aircraftType:'B739', wakeCategory:'M',
      equipment:'SDFGHIRY/SD', ssr:'SDE1', depAerodrome:'EHAM', eobt:'1150', cruisingSpeed:'N0440',
      cruisingLevel:'F290', route:'ARTIP L10 KONAN UL608 KILAK',
      destAerodrome:'EGBB', totalEet:'0105', altAerodrome1:'EGLC', altAerodrome2:'EGLL',
      otherInfo:'PBN/B2 DOF/260603 REG/PHBXF',
      endurance:'0330', pob:'190', emergencyRadio:'UVE', survivalEquip:'',
      jackets:'', dinghies:'', acColour:'BLUE WHITE', remarks19:'', pilot:'CPTVANDENBURG'
    },
    errors:{ aircraftType:'B738', cruisingLevel:'F350', altAerodrome1:'EGKK', altAerodrome2:'' }
  },
  {
    id: 'fpl-10', difficultyTier: 'MEDIUM',
    narrative: 'Southampton AIS, Logan 505, a Dash 8-400, medium. IFR scheduled, off Southampton — EGHI — at 1620Z, 280 knots, Flight Level 200. Route ORTAC, UL9 to NEVIL, direct BAGSO, into Dublin — EIDW — one hour fifteen. Alternates Shannon, EINN, and Manchester, EGCC. RNAV, Mode S with ADS-B. Endurance three hours, 78 on board. Maritime survival kit and life jackets carried. Captain O\'Reilly.',
    correct: {
      aircraftId:'LOG505', flightRules:'I', typeOfFlight:'S', aircraftType:'DH8D', wakeCategory:'M',
      equipment:'SDFGRY/SD', ssr:'SDE1', depAerodrome:'EGHI', eobt:'1620', cruisingSpeed:'N0280',
      cruisingLevel:'F200', route:'ORTAC UL9 NEVIL DCT BAGSO',
      destAerodrome:'EIDW', totalEet:'0115', altAerodrome1:'EINN', altAerodrome2:'EGCC',
      otherInfo:'PBN/B2 DOF/260603',
      endurance:'0300', pob:'078', emergencyRadio:'UVE', survivalEquip:'M',
      jackets:'LF', dinghies:'D/1/8/YELLOW', acColour:'WHITE BLUE STRIPE', remarks19:'', pilot:'CPTOREILLY'
    },
    errors:{ wakeCategory:'L', route:'DCT', totalEet:'0135', survivalEquip:'', jackets:'' }
  },
  {
    id: 'fpl-11', difficultyTier: 'HARD',
    narrative: 'Heathrow AIS, Speedbird 1, a Boeing 777-300ER, heavy. IFR scheduled, off Heathrow — EGLL — at 2230Z, Mach 0.84, Flight Level 390. Routing WOTAN, UN863 to KONAN, UN601 to ABBOT, UM608 to DITEV, UP6 to TUPOS, M317 to GIDAP, L303 to DESDI, into Dubai — OMDB — total six hours fifty. Alternates Sharjah, OMSJ, and Abu Dhabi, OMAA. RNAV, Mode S with ADS-B. Endurance nine hours thirty, 320 on board. Captain Morgan.',
    correct: {
      aircraftId:'BAW001', flightRules:'I', typeOfFlight:'S', aircraftType:'B77W', wakeCategory:'H',
      equipment:'SDFGHIRVY/SD', ssr:'SDE1', depAerodrome:'EGLL', eobt:'2230',
      cruisingSpeed:'M084', cruisingLevel:'F390',
      route:'WOTAN UN863 KONAN UN601 ABBOT UM608 DITEV UP6 TUPOS M317 GIDAP L303 DESDI',
      destAerodrome:'OMDB', totalEet:'0650', altAerodrome1:'OMSJ', altAerodrome2:'OMAA',
      otherInfo:'PBN/L1B1 NAV/RNVD1E2 DOF/260603 REG/GBZNH EET/EGTT0012 EPWW0130 UKBV0230 URRV0310 UBBA0400 UTAK0520',
      endurance:'0930', pob:'320', emergencyRadio:'UVE', survivalEquip:'',
      jackets:'', dinghies:'', acColour:'WHITE BLUE GOLD', remarks19:'', pilot:'CPTMORGAN'
    },
    errors:{ wakeCategory:'M', ssr:'C', cruisingLevel:'F350', route:'DCT OMDB',
             altAerodrome2:'', otherInfo:'0', endurance:'0700' }
  },
  {
    id: 'fpl-12', difficultyTier: 'HARD',
    narrative: 'Manchester AIS, Speedbird 295, a Boeing 767-300ER, heavy, ETOPS. IFR scheduled, off Manchester — EGCC — at 1045Z, Mach 0.82, Flight Level 350. North Atlantic routing UVAVU, UN542 to GOMUP, then the track via 57 North 010 West, 57 North 020 West, 57 North 030 West, 54 North 040 West, 51 North 050 West, direct RAFOX, direct BOBTU, into New York Kennedy — KJFK — eight hours twenty. Alternates Boston, KBOS, and Newark, KEWR. RNAV oceanic, Mode S with ADS-B. Endurance eleven hours, 269 on board. Maritime survival and dinghies carried. Captain Brown.',
    correct: {
      aircraftId:'BAW295', flightRules:'I', typeOfFlight:'S', aircraftType:'B763', wakeCategory:'H',
      equipment:'SDFGHIRY/SD', ssr:'SDE1', depAerodrome:'EGCC', eobt:'1045',
      cruisingSpeed:'M082', cruisingLevel:'F350',
      route:'UVAVU UN542 GOMUP DCT 5700N01000W 5700N02000W 5700N03000W 5400N04000W 5100N05000W DCT RAFOX DCT BOBTU',
      destAerodrome:'KJFK', totalEet:'0820', altAerodrome1:'KBOS', altAerodrome2:'KEWR',
      otherInfo:'PBN/L1B1 NAV/RNVD1E2 DOF/260603 REG/GBZBA STS/MARSAR EET/EGTT0008 EISN0030 CZQX0150 KZWY0530',
      endurance:'1100', pob:'269', emergencyRadio:'UVE', survivalEquip:'M',
      jackets:'LFU', dinghies:'D/4/20/ORANGE', acColour:'WHITE BLUE GOLD', remarks19:'ETOPS 180', pilot:'CPTBROWN'
    },
    errors:{ wakeCategory:'M', cruisingLevel:'F390', route:'DCT KJFK', totalEet:'0700',
             altAerodrome2:'', otherInfo:'0', survivalEquip:'', jackets:'', dinghies:'', remarks19:'' }
  },
  {
    id: 'fpl-13', difficultyTier: 'HARD',
    narrative: 'Heathrow AIS, Cathay 101, an Airbus A350-900, heavy. IFR scheduled, off Heathrow — EGLL — at 2115Z, Mach 0.85, Flight Level 410. Routing WOTAN, UB3 to KOLOV, M748 to OLRAK, B317 to ALOSA, L980 to TULNA, A596 to OMGAB, G221 to DAMOG, into Hong Kong — VHHH — eleven hours forty-five. Alternates Macau, VMMC, and Guangzhou, ZGGG. RNAV, Mode S with ADS-B. Endurance fourteen hours, 377 on board. Captain Chang.',
    correct: {
      aircraftId:'CPA101', flightRules:'I', typeOfFlight:'S', aircraftType:'A359', wakeCategory:'H',
      equipment:'SDFGHIRVY/SD', ssr:'SDE1', depAerodrome:'EGLL', eobt:'2115',
      cruisingSpeed:'M085', cruisingLevel:'F410',
      route:'WOTAN UB3 KOLOV M748 OLRAK B317 ALOSA L980 TULNA A596 OMGAB G221 DAMOG',
      destAerodrome:'VHHH', totalEet:'1145', altAerodrome1:'VMMC', altAerodrome2:'ZGGG',
      otherInfo:'PBN/L1 NAV/RNVD1E2 DOF/260603 REG/BHGF STS/HOSP EET/EGTT0020 EPWW0140 UKBV0250 UTAT0430 VHHK1120',
      endurance:'1400', pob:'377', emergencyRadio:'UVE', survivalEquip:'',
      jackets:'', dinghies:'', acColour:'GREEN WHITE', remarks19:'POLAR TRACK', pilot:'CPTCHANG'
    },
    errors:{ wakeCategory:'J', cruisingLevel:'F390', route:'DCT VHHH',
             totalEet:'1015', altAerodrome2:'', otherInfo:'0', endurance:'1200', pob:'300' }
  },
  {
    id: 'fpl-14', difficultyTier: 'HARD',
    narrative: 'Stansted AIS, Ryanair 55QX, a Boeing 737-800, medium. IFR, non-scheduled, off Stansted — EGSS — at 0630Z, 440 knots, Flight Level 310. Route LOREL, UM605 to REDFA, UL602 to KONAN, UN601 to KODIK, into Düsseldorf — EDDL — one hour thirty. Alternates Cologne, EDDK, and Dresden, EDDC. RNAV, Mode S with ADS-B. Endurance three hours forty, 185 on board. Captain Collins.',
    correct: {
      aircraftId:'RYR55QX', flightRules:'I', typeOfFlight:'N', aircraftType:'B738', wakeCategory:'M',
      equipment:'SDFGRY/SD', ssr:'SDE1', depAerodrome:'EGSS', eobt:'0630',
      cruisingSpeed:'N0440', cruisingLevel:'F310',
      route:'LOREL UM605 REDFA UL602 KONAN UN601 KODIK',
      destAerodrome:'EDDL', totalEet:'0130', altAerodrome1:'EDDK', altAerodrome2:'EDDC',
      otherInfo:'PBN/B2 NAV/RNVD1E2 DOF/260603 REG/GEZDJ',
      endurance:'0340', pob:'185', emergencyRadio:'UVE', survivalEquip:'',
      jackets:'', dinghies:'', acColour:'WHITE YELLOW BLUE', remarks19:'', pilot:'CPTCOLLINS'
    },
    errors:{ typeOfFlight:'S', wakeCategory:'H', cruisingLevel:'F350', totalEet:'0110',
             altAerodrome2:'', otherInfo:'PBN/B2', pob:'180' }
  },
  {
    id: 'fpl-16', difficultyTier: 'HARD',
    narrative: 'Good morning, AIS — LIA402 here. We\'re a Gulfstream 650, registration N2227H, heavy wake category. We\'re departing Miami — KMIA — today at 0815Z, filing IFR non-scheduled to Grantley Adams, that\'s TBPB. We\'ll be cruising Mach 0.85, Flight Level 410. Route: DCT GEECE, then L466 to MEEGL, Y421 to HARBG, then direct. Total estimated elapsed time three hours twenty. Alternates are Piarco — TTPP — and Point Salines — TGPY. Supplementary: endurance six hours. Twelve souls on board. Emergency radio: UHF, VHF and ELT. We have maritime and desert survival kits, life jackets with lights and VHF radio. Two orange covered dinghies, capacity twenty each. Aircraft is white with blue stripes. Pilot in command, Captain Williams.',
    correct: {
      aircraftId:'LIA402', flightRules:'I', typeOfFlight:'N', aircraftType:'GL7T', wakeCategory:'H',
      equipment:'SDFGHIRY/SD', ssr:'SDE1', depAerodrome:'KMIA', eobt:'0815',
      cruisingSpeed:'M085', cruisingLevel:'F410',
      route:'DCT GEECE L466 MEEGL Y421 HARBG DCT',
      destAerodrome:'TBPB', totalEet:'0320', altAerodrome1:'TTPP', altAerodrome2:'TGPY',
      otherInfo:'PBN/C4 DOF/260615 REG/N2227H',
      endurance:'0600', pob:'012', emergencyRadio:'UVE', survivalEquip:'MD',
      jackets:'LFU', dinghies:'D/2/20/ORANGE/COVERED',
      acColour:'WHITE BLUE STRIPE', remarks19:'', pilot:'WILLIAMS'
    },
    errors:{ wakeCategory:'M', aircraftType:'G650', ssr:'C', totalEet:'0300',
             altAerodrome2:'', survivalEquip:'M', jackets:'LF', dinghies:'D/2/20/ORANGE' }
  },
  {
    id: 'fpl-15', difficultyTier: 'HARD',
    narrative: 'Birmingham AIS, Tom 7865, a Boeing 787-8 Dreamliner, heavy, ETOPS 180. IFR non-scheduled, off Birmingham — EGBB — at 1430Z, Mach 0.85, Flight Level 380. Oceanic routing UVAVU, UN866 to RATKA, then 55 North 020 West, 52 North 030 West, 48 North 040 West, 44 North 050 West, direct RAFOX, direct JIMAT, into Cancún — MMUN — ten hours five. Alternates Mérida, MMMD, and Mexico City, MMMX. RNAV oceanic, Mode S with ADS-B. Endurance twelve hours thirty, 280 on board. Maritime survival carried. Captain Adams.',
    correct: {
      aircraftId:'TOM7865', flightRules:'I', typeOfFlight:'N', aircraftType:'B788', wakeCategory:'H',
      equipment:'SDFGHIRVY/SD', ssr:'SDE1', depAerodrome:'EGBB', eobt:'1430',
      cruisingSpeed:'M085', cruisingLevel:'F380',
      route:'UVAVU UN866 RATKA DCT 5500N02000W 5200N03000W 4800N04000W 4400N05000W DCT RAFOX DCT JIMAT',
      destAerodrome:'MMUN', totalEet:'1005', altAerodrome1:'MMMD', altAerodrome2:'MMMX',
      otherInfo:'PBN/L1B1 NAV/RNVD1E2 DOF/260603 REG/GTOMY STS/MARSAR EET/EGTT0015 EISN0035 CZQX0210 KZWY0720',
      endurance:'1230', pob:'280', emergencyRadio:'UVE', survivalEquip:'M',
      jackets:'LFU', dinghies:'D/4/20/ORANGE', acColour:'WHITE BLUE RED', remarks19:'ETOPS 180', pilot:'CPTADAMS'
    },
    errors:{ wakeCategory:'M', cruisingLevel:'F350', route:'DCT MMUN',
             totalEet:'0900', altAerodrome2:'', otherInfo:'0', survivalEquip:'', dinghies:'', remarks19:'' }
  },
];

// ── NOTAM pool ─────────────────────────────────────────────────────────────────
export interface NOTAMCorrect {
  notamType: string; firIndicator: string; subjectCode: string; conditionCode: string;
  traffic: string; purpose: string; scope: string; lower: string; upper: string;
  coordRadius: string; locationA: string; effectiveFrom: string; effectiveTo: string;
  schedule: string; notamText: string; lowerLimit: string; upperLimit: string;
}

interface NOTAMScenario {
  id: string; difficultyTier: Difficulty; situationDescription: string;
  correct: NOTAMCorrect; errors: Partial<NOTAMCorrect>;
}

const NOTAM_POOL: NOTAMScenario[] = [
  {
    id: 'ntm-01', difficultyTier: 'EASY',
    situationDescription: 'Runway 27L at London Heathrow (EGLL) is closed for maintenance from 03 Jun 2026 0600Z to 03 Jun 2026 1800Z.',
    correct: {
      notamType:'N', firIndicator:'EGTT', subjectCode:'RW', conditionCode:'LC',
      traffic:'IV', purpose:'NBO', scope:'A', lower:'000', upper:'999',
      coordRadius:'5129N00027W005', locationA:'EGLL',
      effectiveFrom:'2606030600', effectiveTo:'2606031800', schedule:'',
      notamText:'RWY 27L CLSD FOR MAINT.', lowerLimit:'', upperLimit:''
    },
    errors:{ conditionCode:'XX', traffic:'I', purpose:'N' }
  },
  {
    id: 'ntm-02', difficultyTier: 'EASY',
    situationDescription: 'ILS for runway 09R at Manchester (EGCC) is unserviceable from 04 Jun 2026 0800Z to 04 Jun 2026 1600Z for maintenance.',
    correct: {
      notamType:'N', firIndicator:'EGTT', subjectCode:'NI', conditionCode:'XX',
      traffic:'I', purpose:'NBO', scope:'A', lower:'000', upper:'999',
      coordRadius:'5321N00217W005', locationA:'EGCC',
      effectiveFrom:'2606040800', effectiveTo:'2606041600', schedule:'',
      notamText:'ILS RWY 09R U/S FOR MAINT.', lowerLimit:'', upperLimit:''
    },
    errors:{ subjectCode:'RW', traffic:'IV', scope:'AE' }
  },
  {
    id: 'ntm-03', difficultyTier: 'EASY',
    situationDescription: 'VOR (BHD) at Birmingham (EGBB) is unserviceable until further notice from 05 Jun 2026 1200Z.',
    correct: {
      notamType:'N', firIndicator:'EGTT', subjectCode:'NV', conditionCode:'XX',
      traffic:'IV', purpose:'NBO', scope:'AE', lower:'000', upper:'999',
      coordRadius:'5227N00143W010', locationA:'EGBB',
      effectiveFrom:'2606051200', effectiveTo:'2607051200', schedule:'',
      notamText:'BHD VOR U/S UFN.', lowerLimit:'', upperLimit:''
    },
    errors:{ subjectCode:'NI', scope:'A', effectiveTo:'2606051800' }
  },
  {
    id: 'ntm-04', difficultyTier: 'EASY',
    situationDescription: 'Taxiway Alpha at Edinburgh (EGPH) will be closed for resurfacing from 06 Jun 2026 2200Z to 07 Jun 2026 0400Z.',
    correct: {
      notamType:'N', firIndicator:'EGTT', subjectCode:'TW', conditionCode:'LC',
      traffic:'IV', purpose:'NBO', scope:'A', lower:'000', upper:'999',
      coordRadius:'5557N00310W003', locationA:'EGPH',
      effectiveFrom:'2606062200', effectiveTo:'2606070400', schedule:'',
      notamText:'TWY ALPHA CLSD FOR RESURFACING.', lowerLimit:'', upperLimit:''
    },
    errors:{ subjectCode:'RW', conditionCode:'LH', traffic:'I' }
  },
  {
    id: 'ntm-05', difficultyTier: 'MEDIUM',
    situationDescription: 'PAPI for runway 23 at London City Airport (EGLC) is unserviceable from 08 Jun 2026 0600Z to 08 Jun 2026 1400Z.',
    correct: {
      notamType:'N', firIndicator:'EGTT', subjectCode:'LP', conditionCode:'XX',
      traffic:'IV', purpose:'NBO', scope:'A', lower:'000', upper:'999',
      coordRadius:'5130N00003E003', locationA:'EGLC',
      effectiveFrom:'2606080600', effectiveTo:'2606081400', schedule:'',
      notamText:'PAPI RWY 23 U/S.', lowerLimit:'', upperLimit:''
    },
    errors:{ subjectCode:'LV', conditionCode:'LC', coordRadius:'5129N00027W005' }
  },
  {
    id: 'ntm-06', difficultyTier: 'MEDIUM',
    situationDescription: 'A temporary parachute dropping zone has been activated at Netheravon (EGDN). Parachuting will take place from FL060 to FL120. Active 09 Jun 2026 0900Z-1700Z.',
    correct: {
      notamType:'N', firIndicator:'EGTT', subjectCode:'WP', conditionCode:'CA',
      traffic:'IV', purpose:'BO', scope:'W', lower:'060', upper:'120',
      coordRadius:'5113N00150W005', locationA:'EGDN',
      effectiveFrom:'2606090900', effectiveTo:'2606091700', schedule:'',
      notamText:'PARACHUTE DROPPING ACTIVE. AIRCRAFT AVOID AREA.', lowerLimit:'6000FT AMSL', upperLimit:'FL120'
    },
    errors:{ subjectCode:'GA', scope:'A', lower:'000', upper:'999', lowerLimit:'', upperLimit:'' }
  },
  {
    id: 'ntm-07', difficultyTier: 'MEDIUM',
    situationDescription: 'A crane has been erected near Gatwick Airport (EGKK) at height 322 FT AMSL (54 FT AGL). Obstacle lights installed. From 10 Jun 2026 0000Z, PERM.',
    correct: {
      notamType:'N', firIndicator:'EGTT', subjectCode:'OB', conditionCode:'CE',
      traffic:'IV', purpose:'NBO', scope:'A', lower:'000', upper:'999',
      coordRadius:'5108N00011W001', locationA:'EGKK',
      effectiveFrom:'2606100000', effectiveTo:'PERM', schedule:'',
      notamText:'CRANE ERECTED. 322 FT AMSL 54 FT AGL. LGT INSTL.', lowerLimit:'SFC', upperLimit:'322FT AMSL'
    },
    errors:{ subjectCode:'NV', conditionCode:'LC', lowerLimit:'', upperLimit:'', effectiveTo:'2607100000' }
  },
  {
    id: 'ntm-08', difficultyTier: 'MEDIUM',
    situationDescription: 'Aerodrome beacon at Sumburgh (EGPB) is unserviceable from 11 Jun 2026 1000Z until further notice.',
    correct: {
      notamType:'N', firIndicator:'EGTT', subjectCode:'LB', conditionCode:'XX',
      traffic:'IV', purpose:'NBO', scope:'A', lower:'000', upper:'999',
      coordRadius:'5955N00109W003', locationA:'EGPB',
      effectiveFrom:'2606111000', effectiveTo:'2607111000', schedule:'',
      notamText:'AERODROME BCN U/S UFN.', lowerLimit:'', upperLimit:''
    },
    errors:{ subjectCode:'LP', traffic:'I', effectiveTo:'2606111800' }
  },
  {
    id: 'ntm-09', difficultyTier: 'HARD',
    situationDescription: 'A temporary prohibited area (TPA) is activated over a nuclear power station in EGTT FIR. Centred at 5215N00130W radius 5NM. FL000-FL100. From 12 Jun 2026 0600Z to 12 Jun 2026 2200Z.',
    correct: {
      notamType:'N', firIndicator:'EGTT', subjectCode:'GZ', conditionCode:'CA',
      traffic:'IV', purpose:'NBO', scope:'AW', lower:'000', upper:'100',
      coordRadius:'5215N00130W005', locationA:'EGTT',
      effectiveFrom:'2606120600', effectiveTo:'2606122200', schedule:'',
      notamText:'TEMPO PROHIBITED AREA ACTV. CENTRE 5215N 00130W RADIUS 5NM FL000-FL100. CIVIL AND MIL ATC TO BE NOTIFIED PRIOR ENTRY.', lowerLimit:'SFC', upperLimit:'FL100'
    },
    errors:{ subjectCode:'GR', scope:'A', lower:'000', upper:'999', lowerLimit:'', upperLimit:'', traffic:'I', purpose:'N' }
  },
  {
    id: 'ntm-10', difficultyTier: 'HARD',
    situationDescription: 'ILS Cat II minima at Teesside (EGNV) is suspended due to DME unserviceability. ILS operational at Cat I minima only. 13 Jun 2026 0800Z, duration until further notice.',
    correct: {
      notamType:'N', firIndicator:'EGTT', subjectCode:'NK', conditionCode:'XX',
      traffic:'I', purpose:'NBO', scope:'A', lower:'000', upper:'999',
      coordRadius:'5435N00125W005', locationA:'EGNV',
      effectiveFrom:'2606130800', effectiveTo:'2607130800', schedule:'',
      notamText:'DME ASSOCIATED WITH ILS RWY 23 U/S. ILS AVAILABLE CAT I MINIMA ONLY. CAT II MINIMA SUSPENDED.', lowerLimit:'', upperLimit:''
    },
    errors:{ subjectCode:'NI', conditionCode:'CD', traffic:'IV', effectiveTo:'2606131800', notamText:'ILS U/S.' }
  },
  {
    id: 'ntm-11', difficultyTier: 'HARD',
    situationDescription: 'Royal Air Force display including formation aerobatics will be active over Fairford (EGVA). Airspace from SFC to FL200 reserved. 14 Jun 2026 1000Z-1700Z.',
    correct: {
      notamType:'N', firIndicator:'EGTT', subjectCode:'GA', conditionCode:'CA',
      traffic:'IV', purpose:'NBO', scope:'AW', lower:'000', upper:'200',
      coordRadius:'5141N00151W010', locationA:'EGVA',
      effectiveFrom:'2606141000', effectiveTo:'2606141700', schedule:'',
      notamText:'MIL ACFT DISPLAY ACTV. FORMATION AEROBATICS. DO NOT ENTER RESERVED AIRSPACE WITHOUT PRIOR CLEARANCE FM LONDON CTL.', lowerLimit:'SFC', upperLimit:'FL200'
    },
    errors:{ subjectCode:'GR', scope:'A', lower:'000', upper:'999', lowerLimit:'', upperLimit:'', purpose:'N' }
  },
  {
    id: 'ntm-12', difficultyTier: 'HARD',
    situationDescription: 'Runway 08/26 at Newcastle (EGNT) has declared distances changed following threshold displacement for runway rehabilitation. Effective 15 Jun 2026 0001Z, PERM.',
    correct: {
      notamType:'N', firIndicator:'EGTT', subjectCode:'MD', conditionCode:'CH',
      traffic:'IV', purpose:'NBO', scope:'A', lower:'000', upper:'999',
      coordRadius:'5502N00141W003', locationA:'EGNT',
      effectiveFrom:'2606150001', effectiveTo:'PERM', schedule:'',
      notamText:'RWY 08/26 DECLARED DISTANCES CHANGED DUE THRESHOLD DISPLACEMENT. TORA 08: 2328M TODA 08: 2328M ASDA 08: 2328M LDA 08: 1940M. SEE AIP AD 2-EGNT-1-4.', lowerLimit:'', upperLimit:''
    },
    errors:{ subjectCode:'RW', conditionCode:'LC', effectiveTo:'2607150001',
             notamText:'RWY 08/26 CLSD.', traffic:'I' }
  },
  {
    id: 'ntm-13', difficultyTier: 'EASY',
    situationDescription: 'Aircraft stand 21 on the main apron at Birmingham (EGBB) is closed for line-marking works from 16 Jun 2026 0700Z to 16 Jun 2026 1500Z.',
    correct: {
      notamType:'N', firIndicator:'EGTT', subjectCode:'MK', conditionCode:'LC',
      traffic:'IV', purpose:'NBO', scope:'A', lower:'000', upper:'999',
      coordRadius:'5227N00143W005', locationA:'EGBB',
      effectiveFrom:'2606160700', effectiveTo:'2606161500', schedule:'',
      notamText:'STAND 21 CLSD FOR MARKING WORKS.', lowerLimit:'', upperLimit:''
    },
    errors:{ subjectCode:'MN', conditionCode:'LH', traffic:'I' }
  },
  {
    id: 'ntm-14', difficultyTier: 'EASY',
    situationDescription: 'JET A-1 fuel is not available at Sumburgh (EGPB) due to a supply shortage from 17 Jun 2026 0600Z until further notice.',
    correct: {
      notamType:'N', firIndicator:'EGTT', subjectCode:'FA', conditionCode:'XX',
      traffic:'IV', purpose:'NBO', scope:'A', lower:'000', upper:'999',
      coordRadius:'5955N00109W005', locationA:'EGPB',
      effectiveFrom:'2606170600', effectiveTo:'2607170600', schedule:'',
      notamText:'JET A-1 FUEL NOT AVBL DUE SUPPLY SHORTAGE.', lowerLimit:'', upperLimit:''
    },
    errors:{ subjectCode:'FU', conditionCode:'LC', scope:'AE' }
  },
  {
    id: 'ntm-15', difficultyTier: 'MEDIUM',
    situationDescription: 'GNSS may be unreliable within 60 NM of 5130N00130W up to FL250 due to planned interference testing. 18 Jun 2026 0900Z-1600Z.',
    correct: {
      notamType:'N', firIndicator:'EGTT', subjectCode:'KG', conditionCode:'XX',
      traffic:'IV', purpose:'NBO', scope:'E', lower:'000', upper:'250',
      coordRadius:'5130N00130W060', locationA:'EGTT',
      effectiveFrom:'2606180900', effectiveTo:'2606181600', schedule:'',
      notamText:'GNSS MAY BE UNRELIABLE WI 60NM 5130N00130W GND-FL250 DUE INTERFERENCE TESTING.', lowerLimit:'SFC', upperLimit:'FL250'
    },
    errors:{ subjectCode:'KK', scope:'A', upper:'999', lowerLimit:'', upperLimit:'' }
  },
  {
    id: 'ntm-16', difficultyTier: 'MEDIUM',
    situationDescription: 'A significant concentration of birds has been reported on the approach to Runway 23 at London City (EGLC). Hazard exists from surface to 1000 FT. From 19 Jun 2026 0500Z to 19 Jun 2026 1900Z.',
    correct: {
      notamType:'N', firIndicator:'EGTT', subjectCode:'WB', conditionCode:'CA',
      traffic:'IV', purpose:'NBO', scope:'A', lower:'000', upper:'010',
      coordRadius:'5130N00003E005', locationA:'EGLC',
      effectiveFrom:'2606190500', effectiveTo:'2606191900', schedule:'',
      notamText:'BIRD CONCENTRATION RPRT VCY APCH RWY 23. EXERCISE CAUTION.', lowerLimit:'SFC', upperLimit:'1000FT AGL'
    },
    errors:{ subjectCode:'WP', conditionCode:'XX', lowerLimit:'', upperLimit:'' }
  },
  {
    id: 'ntm-17', difficultyTier: 'HARD',
    situationDescription: 'A temporary segregated area for unmanned aircraft trials is established centred 5320N00210W radius 8NM, SFC to FL080. Active daily 0800Z-1700Z from 20 Jun 2026 to 24 Jun 2026.',
    correct: {
      notamType:'N', firIndicator:'EGTT', subjectCode:'GW', conditionCode:'CA',
      traffic:'IV', purpose:'NBO', scope:'AW', lower:'000', upper:'080',
      coordRadius:'5320N00210W008', locationA:'EGTT',
      effectiveFrom:'2606200800', effectiveTo:'2606241700', schedule:'DAILY 0800-1700',
      notamText:'TEMPO SEGREGATED AREA FOR UAS TRIALS ACTV. CENTRE 5320N00210W RADIUS 8NM SFC-FL080. DO NOT ENTER WHEN ACTIVE.', lowerLimit:'SFC', upperLimit:'FL080'
    },
    errors:{ subjectCode:'GA', scope:'A', schedule:'', lower:'000', upper:'999', lowerLimit:'', upperLimit:'' }
  },
  {
    id: 'ntm-18', difficultyTier: 'HARD',
    situationDescription: 'The RVR measuring system for Runway 09R at Manchester (EGCC) is unserviceable. Low visibility procedures are unaffected but RVR readouts are unavailable. 21 Jun 2026 0400Z until further notice.',
    correct: {
      notamType:'N', firIndicator:'EGTT', subjectCode:'MS', conditionCode:'XX',
      traffic:'I', purpose:'NBO', scope:'A', lower:'000', upper:'999',
      coordRadius:'5321N00217W005', locationA:'EGCC',
      effectiveFrom:'2606210400', effectiveTo:'2607210400', schedule:'',
      notamText:'RVR MEASURING SYSTEM RWY 09R U/S. RVR READOUTS NOT AVBL.', lowerLimit:'', upperLimit:''
    },
    errors:{ subjectCode:'MR', conditionCode:'LC', traffic:'IV', effectiveTo:'2606211200' }
  },
];

// ── PIB / Dissemination pool ───────────────────────────────────────────────────
interface PIBScenario {
  id: string; difficultyTier: Difficulty; description: string;
  correctChannel: string; explanation: string;
  notams?: { id: string; text: string; relevant: boolean; tag: string }[];
}

const PIB_POOL: PIBScenario[] = [
  {
    id: 'pib-01', difficultyTier: 'EASY',
    description: 'A standard instrument departure (SID) procedure at Heathrow is being permanently redesigned. New charts are required and the change is planned for the upcoming 28-day AIRAC cycle.',
    correctChannel: 'AIRAC Amendment',
    explanation: 'Permanent changes to AIP procedures that require charting must be published in an AIRAC Amendment to align with the 28-day AIRAC cycle so operators can update navigation databases.'
  },
  {
    id: 'pib-02', difficultyTier: 'EASY',
    description: 'Taxiway Bravo at Manchester will be closed for resurfacing. The closure is expected to last 5 months.',
    correctChannel: 'AIP Supplement',
    explanation: 'Temporary changes of significant duration (typically > 3 months) that affect current AIP information are published as AIP Supplements. They have a defined end date and do not go through AIRAC.'
  },
  {
    id: 'pib-03', difficultyTier: 'EASY',
    description: 'An urgent advisory is to be issued regarding wake turbulence separation changes following new research findings. No operational impact on charts or AIP data — purely informational.',
    correctChannel: 'AIC',
    explanation: 'Aeronautical Information Circulars (AICs) are used for purely advisory information that does not require operational action and has no direct effect on AIP data or NOTAMs.'
  },
  {
    id: 'pib-04', difficultyTier: 'EASY',
    description: 'A runway lighting system failure will render the approach lighting at Gatwick unusable for approximately 48 hours starting tonight.',
    correctChannel: 'NOTAM',
    explanation: 'Short-notice, operationally significant information — especially anything affecting aircraft safety operations imminently — is published as a NOTAM for immediate dissemination.'
  },
  {
    id: 'pib-05', difficultyTier: 'MEDIUM',
    description: 'A VOR frequency is being permanently changed at an en-route station. The change is planned and non-urgent, and must be integrated into published charts before it takes effect.',
    correctChannel: 'AIRAC Amendment',
    explanation: 'Permanent en-route navaid changes require chart and navigation database updates. Because the change must be synchronised across the network, AIRAC publication is mandatory.'
  },
  {
    id: 'pib-06', difficultyTier: 'MEDIUM',
    description: 'A temporary restricted area around a royal residence is being activated for 10 days while the Head of State is in residence.',
    correctChannel: 'NOTAM',
    explanation: 'Short-duration (< 3 months), operationally significant airspace restrictions go out as NOTAMs. Even a 10-day duration is too short for a Supplement and the restriction needs immediate promulgation.'
  },
  {
    id: 'pib-07', difficultyTier: 'MEDIUM',
    description: 'New guidance on the use of night-vision goggles in general aviation, following a safety study. The guidance is non-mandatory and has no direct impact on published aeronautical data.',
    correctChannel: 'AIC',
    explanation: 'Advisory guidance with no effect on navigational data or operational procedures is distributed via AIC. It informs without creating a binding change to AIP.'
  },
  {
    id: 'pib-08', difficultyTier: 'MEDIUM',
    description: 'An ILS approach procedure is being permanently amended to include new RNAV/RNP specifications. Updated approach plates are required. Timing is coordinated to the next available AIRAC date.',
    correctChannel: 'AIRAC Amendment',
    explanation: 'Permanent changes to instrument approach procedures require charting and AIRAC-cycle publication to allow operators and avionics manufacturers to update navigation databases on time.'
  },
  {
    id: 'pib-09', difficultyTier: 'HARD',
    description: 'A runway has been lengthened by 200m and the declared distances (TORA, TODA, ASDA, LDA) changed permanently. The aerodrome has requested immediate publication without waiting for the next AIRAC cycle.',
    correctChannel: 'AIP Amendment',
    explanation: 'Permanent non-AIRAC-cycle changes that require immediate publication — without charting lead time — are issued as AIP Amendments (non-AIRAC). These bypass the 28-day cycle but still update the AIP permanently.'
  },
  {
    id: 'pib-10', difficultyTier: 'HARD',
    description: 'A major international air show will create a large temporary restricted area and require multiple sub-areas and corridors. The event is 6 weeks away and will last 2 weeks.',
    correctChannel: 'AIP Supplement',
    explanation: 'Temporary changes of 2+ weeks duration with complex associated information (maps, corridors) that are known in advance are best published as AIP Supplements, which can include graphics unavailable in a NOTAM.'
  },
  {
    id: 'pib-11', difficultyTier: 'EASY',
    description: 'A short-notice unserviceability of the only fire-fighting vehicle at a small aerodrome downgrades the rescue and fire-fighting category for 3 days. Operators must be told immediately.',
    correctChannel: 'NOTAM',
    explanation: 'A short-duration, operationally significant change such as an RFFS category downgrade requires immediate promulgation by NOTAM.'
  },
  {
    id: 'pib-12', difficultyTier: 'MEDIUM',
    description: 'An aerodrome operator wants to publish a permanent change to apron markings and stand numbering, including a new apron chart. The change is planned, not time-critical, and can wait for the next cycle.',
    correctChannel: 'AIRAC Amendment',
    explanation: 'Permanent charted changes to AIP aerodrome data are published on the AIRAC cycle so all holders update their documentation on the same common effective date.'
  },
  {
    id: 'pib-13', difficultyTier: 'MEDIUM',
    description: 'The State wishes to remind operators of the procedures for carriage of dangerous goods following several recent occurrences. The reminder is purely advisory with no change to regulations or AIP data.',
    correctChannel: 'AIC',
    explanation: 'Advisory or explanatory information that does not change AIP data or require operational action is disseminated through an AIC.'
  },
  {
    id: 'pib-14', difficultyTier: 'HARD',
    description: 'Major airfield drainage works will restrict taxiway availability for 4 months with phased changes and an accompanying diagram. The works are known well in advance.',
    correctChannel: 'AIP Supplement',
    explanation: 'Temporary changes of long duration (typically > 3 months) with graphics that cannot be carried in a NOTAM are published as AIP Supplements.'
  },
];

// ── Pilot Call pool ────────────────────────────────────────────────────────────
interface PilotCallScenario {
  id: string; difficultyTier: Difficulty; callsign: string; pilotMessage: string;
  options: [string, string, string, string]; correctIdx: number; explanation: string;
  callerType?: string;
}

const PILOT_CALL_POOL: PilotCallScenario[] = [
  {
    id: 'pc-01', difficultyTier: 'EASY',
    callerType: 'Pilot — Speedbird 123',
    callsign: 'SPEEDBIRD 123',
    pilotMessage: 'London AIS, Speedbird 123, request current ATIS information for Heathrow.',
    options: [
      'Speedbird 123, Heathrow ATIS information Charlie is current, QNH 1013.',
      'Speedbird 123, I do not have that information available at this time.',
      'Speedbird 123, ATIS frequency is 113.75, monitor that.',
      'Speedbird 123, contact Heathrow Approach on 119.725.'
    ],
    correctIdx: 0,
    explanation: 'The correct response reads back the current ATIS information code and QNH, confirming to the pilot that the information is current.'
  },
  {
    id: 'pc-02', difficultyTier: 'EASY',
    callsign: 'G-ABCD',
    pilotMessage: 'AIS, G-ABCD, I would like to file a VFR flight plan from Blackbushe to Denham.',
    options: [
      'G-ABCD, go ahead with flight plan details — aircraft type, departure time, route, altitude, endurance and persons on board.',
      'G-ABCD, contact Farnborough LARS for that.',
      'G-ABCD, VFR flight plans are not required for that route.',
      'G-ABCD, standby, we are very busy right now.'
    ],
    correctIdx: 0,
    explanation: 'The correct response prompts the pilot for all required FPL fields: aircraft type, departure time, route, cruising altitude, endurance and POB.'
  },
  {
    id: 'pc-03', difficultyTier: 'EASY',
    callsign: 'G-WXYZ',
    pilotMessage: 'AIS, G-WXYZ, I have just overflown the Compton VOR and it appears to be transmitting intermittently — signal keeps dropping.',
    options: [
      'G-WXYZ, Roger, we will note your pilot report and initiate action to check the VOR serviceability. A NOTAM will be issued if confirmed unserviceable.',
      'G-WXYZ, the VOR is showing serviceable on our systems, nothing to worry about.',
      'G-WXYZ, contact En-route ATC for that report.',
      'G-WXYZ, we cannot action pilot reports, please file a report on landing.'
    ],
    correctIdx: 0,
    explanation: 'AIS must accept the pilot report, log it, initiate a serviceability check and, if confirmed, issue a NOTAM. The pilot should be acknowledged professionally.'
  },
  {
    id: 'pc-04', difficultyTier: 'EASY',
    callsign: 'EASYJET 987',
    pilotMessage: 'AIS, Easyjet 987, can you confirm the airspace classification above FL195 in the London TMA?',
    options: [
      'Easyjet 987, airspace above FL195 in the London TMA is Class C, IFR and VFR flights permitted with ATC clearance.',
      'Easyjet 987, all airspace above FL195 is uncontrolled Class G.',
      'Easyjet 987, please check the AIP for airspace classification.',
      'Easyjet 987, contact London Control on 127.100.'
    ],
    correctIdx: 0,
    explanation: 'The AIS officer should be able to confirm airspace classification from the AIP. Above FL195 in the UK, airspace is Class C (CAS above FL195 is Class C in EGTT FIR).'
  },
  {
    id: 'pc-05', difficultyTier: 'MEDIUM',
    callsign: 'RYANAIR 55QX',
    pilotMessage: 'AIS, Ryanair 55QX, can you confirm if NOTAM A0234/26 regarding runway 27L closure at Heathrow is still active?',
    options: [
      'Ryanair 55QX, standby while I check. — NOTAM A0234/26 is confirmed active. Runway 27L at EGLL is closed until 1800Z today.',
      'Ryanair 55QX, I do not have access to NOTAM information.',
      'Ryanair 55QX, all NOTAMs are published on the AIS website.',
      'Ryanair 55QX, contact Heathrow operations for NOTAM queries.'
    ],
    correctIdx: 0,
    explanation: 'The AIS officer must check the NOTAM database and confirm the current status of the specified NOTAM to the pilot — including current validity and relevant details.'
  },
  {
    id: 'pc-06', difficultyTier: 'MEDIUM',
    callsign: 'THOMAS COOK 7865',
    pilotMessage: 'AIS, Thomas Cook 7865, we need a Pre-flight Information Bulletin for a flight from Birmingham to Cancun tomorrow.',
    options: [
      'Thomas Cook 7865, noted. Can you confirm your departure aerodrome, destination, route and estimated departure time so we can compile the relevant PIB?',
      'Thomas Cook 7865, PIBs are self-service on the AIS portal.',
      'Thomas Cook 7865, we will email the PIB to your operations department.',
      'Thomas Cook 7865, contact your dispatcher for the PIB.'
    ],
    correctIdx: 0,
    explanation: 'The AIS officer should confirm the key PIB parameters — departure aerodrome, destination, route and ETD — before compiling the bulletin. PIBs are area-specific.'
  },
  {
    id: 'pc-07', difficultyTier: 'MEDIUM',
    callsign: 'WIZZ AIR 34',
    pilotMessage: 'AIS, Wizz Air 34, filing IFR flight plan Budapest to Luton, but we have not included an alternate as the forecast is excellent.',
    options: [
      'Wizz Air 34, under SERA.4035, an alternate aerodrome is required for IFR unless destination weather meets the exemption criteria. Please provide an alternate or confirm the exemption applies.',
      'Wizz Air 34, that is fine, we will file without the alternate.',
      'Wizz Air 34, contact ATC for that decision.',
      'Wizz Air 34, you do not need an alternate for European routes.'
    ],
    correctIdx: 0,
    explanation: 'IFR flight plans require an alternate aerodrome unless the specific exemption criteria in SERA/ICAO Annex 2 are met. The AIS officer should advise the pilot of the requirement and the conditions for exemption.'
  },
  {
    id: 'pc-09', difficultyTier: 'HARD',
    callsign: 'CALEDONIAN 99',
    pilotMessage: 'AIS, Caledonian 99, we are overflying an area that appears to have fire activity on the ground. We believe there may be a TFR but did not see one on our PIB. Can you check?',
    options: [
      'Caledonian 99, standby. I am checking NOTAMs for that area now. — I can confirm NOTAM B0891/26 is active, activating a temporary restricted area in that vicinity from FL000-FL100. What is your current level?',
      'Caledonian 99, if it was not on your PIB, there is no TFR active.',
      'Caledonian 99, contact London Control for TFR information.',
      'Caledonian 99, we only hold NOTAMs for departure and destination aerodromes.'
    ],
    correctIdx: 0,
    explanation: 'The AIS officer should check the NOTAM database immediately and confirm whether a TFR or restriction exists in the area, provide the NOTAM reference, and clarify the vertical limits and extent.'
  },
  // ── Non-pilot callers ─────────────────────────────────────────────────────
  {
    id: 'pc-11', difficultyTier: 'EASY',
    callerType: 'Airline Operations (Caribbean Airlines Despatch)',
    callsign: 'BWA DESPATCH',
    pilotMessage: 'Good morning AIS, Caribbean Airlines despatch here. Can you confirm the current QNH and METAR for Grantley Adams — we are planning a push in about 40 minutes.',
    options: [
      'Good morning. The latest METAR for TBPB at 0950Z reads: wind 080 at 12 knots, visibility 9999, few clouds at 1800 feet, temperature 28, dew point 22, QNH 1013. No significant change.',
      'That information is only available to the pilot-in-command. Please have your crew contact us.',
      'QNH and METAR are on the ATIS. Tune 126.25.',
      'We do not provide MET information. Contact the met office directly.'
    ],
    correctIdx: 0,
    explanation: 'AIS provides weather and operational information to all authorised users including airline operations and despatch. Reading back the latest METAR with all key elements is the correct response.'
  },
  {
    id: 'pc-12', difficultyTier: 'EASY',
    callerType: 'Ground Handler (Airport Operations)',
    callsign: 'GRANTLEY ADAMS OPS',
    pilotMessage: 'AIS, aerodrome operations here. We have contractor vehicles working on taxiway Bravo from 1400Z to 1800Z today. Do we need a NOTAM for that?',
    options: [
      'Yes, a NOTAM is required whenever a taxiway or part of the movement area is closed or restricted. Please submit the details — taxiway designation, exact limits, times and any vehicles or personnel involved — and we will raise the NOTAM.',
      'No, taxiway works do not require a NOTAM, just notify ATC.',
      'Notify the aerodrome authority. A NOTAM is only needed for runway closures.',
      'Email the NOTAM office and they will decide.'
    ],
    correctIdx: 0,
    explanation: 'Any restriction to the movement area, including taxiway closures, requires a NOTAM under ICAO Annex 15. AIS should collect the details and issue the NOTAM promptly.'
  },
  {
    id: 'pc-13', difficultyTier: 'MEDIUM',
    callerType: 'Airline Despatch (American Airlines)',
    callsign: 'AAL DESPATCH',
    pilotMessage: 'AIS, American Airlines despatch. We are planning flight AA2210 from Miami to Barbados tonight. Can we get a PIB for the route and destination, departure time approximately 2100Z?',
    options: [
      'Certainly. I will compile a PIB for the KMIA to TBPB route, departure 2100Z. Can you confirm the planned routing and flight level so I include the correct en-route NOTAMs?',
      'PIBs are only available through the self-briefing portal. I cannot compile one by telephone.',
      'Contact the Barbados met office for flight planning.',
      'We only issue PIBs to the crew, not to despatch. Have the pilot call us.'
    ],
    correctIdx: 0,
    explanation: 'PIBs can be compiled and distributed to authorised users including airline despatch. The correct response is to take the request and gather the details needed to produce an accurate, route-specific PIB.'
  },
  {
    id: 'pc-14', difficultyTier: 'MEDIUM',
    callerType: 'Military ATC (Eastern Air Command)',
    callsign: 'EASTERN AIR COMMAND',
    pilotMessage: 'TBPB AIS, Eastern Air Command. We have a military exercise requiring a temporary restricted area over the east coast from FL050 to FL200, from 0600Z to 1800Z tomorrow. What is the NOTAM procedure?',
    options: [
      'Eastern Air Command, for a temporary restricted area we will need the exact coordinates or the area boundary, the vertical limits FL050 to FL200, the activation times, the contact frequency for entry requests, and authority reference. Please send those details in writing and we will raise the NOTAM immediately for promulgation.',
      'Military airspace is handled by the Ministry of Defence, not AIS.',
      'A restricted area requires an AIP amendment, not a NOTAM.',
      'Send an email to the NOTAM office with the details and they will process it next week.'
    ],
    correctIdx: 0,
    explanation: 'AIS is responsible for NOTAM promulgation for temporary airspace restrictions regardless of the requesting authority. The officer must collect all required NOTAM data elements and issue promptly.'
  },
  {
    id: 'pc-15', difficultyTier: 'MEDIUM',
    callerType: 'Flight School (BCCAS Training Academy)',
    callsign: 'BCCAS TRAINING',
    pilotMessage: 'AIS, good morning. BCCAS training academy here. We have student pilots filing VFR cross-country plans to Canouan and Mustique next week. Can you tell us what documents they need for entry into Saint Vincent and the Grenadines airspace?',
    options: [
      'Good morning. For VFR entry into SVG airspace, pilots will need a valid flight plan, a general declaration if crossing an international boundary, proof of aircraft registration and insurance, and the pilot licence. I would also recommend checking for any current NOTAMs for TVSC and TVSM. Would you like me to compile a PIB for those aerodromes?',
      'Contact Saint Vincent AIS directly for that information.',
      'We only handle Barbados airspace. All foreign requirements must be researched by the operator.',
      'Entry requirements are in the SVG AIP. We do not advise on foreign entry procedures.'
    ],
    correctIdx: 0,
    explanation: 'AIS officers should provide practical guidance to operators including entry documentation requirements. Offering a PIB for the destination aerodromes is excellent proactive service.'
  },
  {
    id: 'pc-16', difficultyTier: 'HARD',
    callerType: 'LIAT Maintenance Control',
    callsign: 'LIAT MAINTENANCE CONTROL',
    pilotMessage: 'AIS, LIAT maintenance control. We have an aircraft with a MEL item — the DME is inoperative. The crew want to file an IFR plan to Antigua. Is that permitted, and how should it be listed on the flight plan?',
    options: [
      'With the DME inoperative the aircraft may still operate IFR subject to the MEL provision and ATC approval, provided alternate navigation means are available such as GNSS or VOR. In Item 10 of the flight plan, do not include the D code for DME. If GNSS is fitted and approved, include G in Item 10 and PBN/ in Item 18. I recommend confirming the route is not DME-required with the operator\'s ops manual.',
      'A DME inoperative aircraft cannot fly IFR. The flight must be cancelled.',
      'Just file a normal flight plan. ATC will deal with the DME status.',
      'Maintenance matters are not an AIS function. Contact your chief pilot.'
    ],
    correctIdx: 0,
    explanation: 'AIS officers must understand equipment codes and MEL implications for flight plan filing. Item 10 should not include D if DME is inoperative; GNSS (G) and PBN/ specifications in Item 18 are the correct alternative entries.'
  },
  {
    id: 'pc-17', difficultyTier: 'HARD',
    callerType: 'Coast Guard Operations',
    callsign: 'BARBADOS COAST GUARD',
    pilotMessage: 'AIS, Barbados Coast Guard. We are launching a search and rescue aircraft to investigate an ELT signal 40 miles south-east of TBPB. What NOTAMs and airspace restrictions should we be aware of?',
    options: [
      'Barbados Coast Guard, standby while I check. There are no active restricted areas in that sector. The current active NOTAMs relevant to that area include A0341/26 — a naval exercise area from FL000 to 1000 feet 30 miles south-east of TBPB, active until 1600Z. Suggest you contact TBPB Approach on 119.7 for a clearance and to advise of the SAR activation. I will also raise a NOTAM to warn other traffic if you confirm the search area.',
      'No NOTAMs are currently active. You are cleared to proceed.',
      'Contact Piarco Oceanic for SAR coordination.',
      'We do not have real-time access to military exercise information.'
    ],
    correctIdx: 0,
    explanation: 'For SAR activations, AIS must check all relevant NOTAMs and airspace restrictions, advise ATC, and proactively offer to issue a NOTAM to protect the search area from other traffic.'
  },
  {
    id: 'pc-18', difficultyTier: 'EASY',
    callerType: 'Pilot — G-TUTR',
    callsign: 'G-TUTR',
    pilotMessage: 'AIS, G-TUTR, could you confirm the sunset time at Blackbushe today for my night currency planning?',
    options: [
      'G-TUTR, standby — sunset at Blackbushe today is 2018 local, so the end of daylight for night-flying purposes is 30 minutes later at 2048 local.',
      'G-TUTR, we do not provide time information, check online.',
      'G-TUTR, night never applies at Blackbushe.',
      'G-TUTR, contact the tower for that.'
    ],
    correctIdx: 0,
    explanation: 'AIS can provide sunrise/sunset and the official night definition (30 minutes after sunset to 30 minutes before sunrise) to assist flight planning.'
  },
  {
    id: 'pc-19', difficultyTier: 'MEDIUM',
    callerType: 'Pilot — N512JG',
    callsign: 'N512JG',
    pilotMessage: 'AIS, November 512 Juliet Golf, I filed a flight plan an hour ago but now need to delay departure by two hours. How do I update it?',
    options: [
      'N512JG, no problem — I will raise a delay (DLA) message against your filed flight plan with the revised EOBT so all addressees are updated. Confirm your new off-blocks time.',
      'N512JG, you must cancel and file a brand-new flight plan.',
      'N512JG, delays under three hours do not need any action.',
      'N512JG, contact each ATC unit on your route individually.'
    ],
    correctIdx: 0,
    explanation: 'A revised EOBT differing from the filed time beyond the threshold is handled by transmitting a DLA (delay) message rather than refiling the whole plan.'
  },
  {
    id: 'pc-20', difficultyTier: 'MEDIUM',
    callerType: 'Airline Despatch (Virgin Atlantic)',
    callsign: 'VIRGIN DESPATCH',
    pilotMessage: 'AIS, Virgin despatch. Can you confirm whether the current North Atlantic track message is valid for tonight\'s westbound crossing?',
    options: [
      'Virgin despatch, standby — I will retrieve the current NAT track message and confirm the westbound track definitions and validity times for tonight, and include them in your PIB.',
      'Virgin despatch, oceanic tracks are not an AIS responsibility.',
      'Virgin despatch, just use last night\'s tracks, they rarely change.',
      'Virgin despatch, contact Gander directly, we hold no oceanic data.'
    ],
    correctIdx: 0,
    explanation: 'AIS can retrieve and confirm current NAT track messages and incorporate them into a route PIB for oceanic operations.'
  },
  {
    id: 'pc-21', difficultyTier: 'HARD',
    callerType: 'Aerodrome Operator (TBPB Ops)',
    callsign: 'GRANTLEY ADAMS OPS',
    pilotMessage: 'AIS, TBPB ops. We have just had a fuel spill on Runway 09/27 and the runway is closed with immediate effect for clean-up, estimated two hours. What do you need from us?',
    options: [
      'TBPB ops, I will raise an immediate NOTAM now. Please confirm the exact closure time, the estimated reopening time, whether any portion of the runway remains usable, and a contact for updates so I can amend or cancel the NOTAM when the runway reopens.',
      'TBPB ops, runway closures only need a phone call to ATC, no NOTAM.',
      'TBPB ops, this needs an AIP Supplement, allow several days.',
      'TBPB ops, we cannot act until you submit a written form next week.'
    ],
    correctIdx: 0,
    explanation: 'An immediate runway closure is safety-critical and requires an urgent NOTAM. AIS must gather precise times, extent and a contact, and cancel or replace the NOTAM when the runway reopens.'
  },
];

// ── Generator functions ────────────────────────────────────────────────────────

export function generateFlightPlanTask(usedIds: Set<string>, gameTimePct: number): AISTask | null {
  const difficulty = pickDifficulty(gameTimePct);
  const urgency = pickUrgency(gameTimePct);

  let pool = FPL_POOL.filter(s => !usedIds.has(s.id));
  if (pool.length === 0) { usedIds.clear(); pool = [...FPL_POOL]; }

  // prefer matching difficulty tier
  const tiered = pool.filter(s => s.difficultyTier === difficulty);
  const candidates = tiered.length > 0 ? tiered : pool;
  const template = candidates[Math.floor(Math.random() * candidates.length)];
  usedIds.add(template.id);

  // Fields start EMPTY — the player fills in the whole flight plan from the spoken briefing.
  const provided: FPLCorrect = {} as FPLCorrect;

  return {
    id: genId(), scenarioId: template.id,
    type: 'FLIGHT_PLAN', urgency, difficulty,
    status: 'PENDING',
    title: 'Flight Plan Received',
    description: 'A pilot has phoned in their flight plan. Listen to the briefing, then complete the ICAO flight-plan form.',
    scenario: { narrative: template.narrative, provided, fieldsWithErrors: [] },
    correctAnswer: template.correct,
    expiresAt: Date.now() + EXPIRY_MS[urgency],
    createdAt: Date.now(),
    maxScore: MAX_SCORE[urgency],
  };
}

export function generateNotamTask(usedIds: Set<string>, gameTimePct: number): AISTask | null {
  const difficulty = pickDifficulty(gameTimePct);
  const urgency = pickUrgency(gameTimePct);

  let pool = NOTAM_POOL.filter(s => !usedIds.has(s.id));
  if (pool.length === 0) { usedIds.clear(); pool = [...NOTAM_POOL]; }

  const tiered = pool.filter(s => s.difficultyTier === difficulty);
  const candidates = tiered.length > 0 ? tiered : pool;
  const template = candidates[Math.floor(Math.random() * candidates.length)];
  usedIds.add(template.id);

  const provided: NOTAMCorrect = { ...template.correct, ...template.errors };

  return {
    id: genId(), scenarioId: template.id,
    type: 'NOTAM', urgency, difficulty,
    status: 'PENDING',
    title: 'NOTAM Request',
    description: 'An originator has reported a change. Check the draft and correct the NOTAM fields.',
    scenario: { situation: template.situationDescription, provided, fieldsWithErrors: Object.keys(template.errors) },
    correctAnswer: template.correct,
    expiresAt: Date.now() + EXPIRY_MS[urgency],
    createdAt: Date.now(),
    maxScore: MAX_SCORE[urgency],
  };
}

export function generatePibTask(usedIds: Set<string>, gameTimePct: number): AISTask | null {
  const difficulty = pickDifficulty(gameTimePct);
  const urgency = pickUrgency(gameTimePct);

  let pool = PIB_POOL.filter(s => !usedIds.has(s.id));
  if (pool.length === 0) { usedIds.clear(); pool = [...PIB_POOL]; }

  const tiered = pool.filter(s => s.difficultyTier === difficulty);
  const candidates = tiered.length > 0 ? tiered : pool;
  const template = candidates[Math.floor(Math.random() * candidates.length)];
  usedIds.add(template.id);

  return {
    id: genId(), scenarioId: template.id,
    type: 'PIB', urgency, difficulty,
    status: 'PENDING',
    title: 'Dissemination Decision',
    description: template.description,
    scenario: { description: template.description },
    correctAnswer: { channel: template.correctChannel, explanation: template.explanation },
    expiresAt: Date.now() + EXPIRY_MS[urgency],
    createdAt: Date.now(),
    maxScore: MAX_SCORE[urgency],
  };
}

export function generatePilotCallTask(usedIds: Set<string>, gameTimePct: number): AISTask | null {
  const difficulty = pickDifficulty(gameTimePct);
  const urgency = pickUrgency(gameTimePct);

  let pool = PILOT_CALL_POOL.filter(s => !usedIds.has(s.id));
  if (pool.length === 0) { usedIds.clear(); pool = [...PILOT_CALL_POOL]; }

  const tiered = pool.filter(s => s.difficultyTier === difficulty);
  const candidates = tiered.length > 0 ? tiered : pool;
  const template = candidates[Math.floor(Math.random() * candidates.length)];
  usedIds.add(template.id);

  const callerType = template.callerType ?? `Pilot — ${template.callsign}`;
  return {
    id: genId(), scenarioId: template.id,
    type: 'PILOT_CALL', urgency, difficulty,
    status: 'PENDING',
    title: 'AIS Information Request',
    description: `Incoming call: ${callerType}`,
    scenario: {
      callsign: template.callsign,
      callerType,
      pilotMessage: template.pilotMessage,
      options: template.options,
    },
    correctAnswer: { index: template.correctIdx, explanation: template.explanation },
    expiresAt: Date.now() + EXPIRY_MS[urgency],
    createdAt: Date.now(),
    maxScore: MAX_SCORE[urgency],
  };
}

// ── COVER PAGE pool ────────────────────────────────────────────────────────────
interface CoverPageCorrect {
  productType: string; productTitle: string; icaoLocation: string;
  effectiveDate: string; issueNumber: string; authority: string;
  preparedBy: string; distribution: string;
  // Lenient title scoring: the player's title is accepted if it contains all of these tokens.
  titleKeywords?: string[];
}

interface CoverPageScenario {
  id: string; difficultyTier: Difficulty; situation: string;
  correct: CoverPageCorrect;
}

const COVER_PAGE_POOL: CoverPageScenario[] = [
  {
    id: 'cp-02', difficultyTier: 'EASY',
    situation: 'The Director General of Civil Aviation has approved new explanatory guidance for operators on fuel-conservation practices in the Eastern Caribbean. It contains advice and background only — it introduces no regulatory or operational change and is not safety-critical. Reference B04/2026, effective 1 July 2026. Prepared by AIS Officer J. Browne, Barbados (TBPB), for distribution to airlines and operators.',
    correct: {
      productType: 'AIC', productTitle: 'AIC BARBADOS B04/2026 — FUEL CONSERVATION PRACTICES',
      titleKeywords: ['AIC', 'FUEL', 'B04/2026'],
      icaoLocation: 'TBPB', effectiveDate: '260701', issueNumber: 'B04/2026',
      authority: 'Barbados Civil Aviation Department',
      preparedBy: 'J. BROWNE / AIS OFFICER',
      distribution: 'AIRLINES AND OPERATORS',
    },
  },
  {
    id: 'cp-03', difficultyTier: 'MEDIUM',
    situation: 'A new standard instrument departure (BAJAN1A) at TBPB has been designed and fully co-ordinated with all affected states. It is a permanent change requiring navigation-database coding and new charts, so it must take effect on a fixed internationally-recognised cycle date to let operators update their databases in advance. Reference 05/2026, effective 17 July 2026. Prepared by Senior AIS Officer R. Marshall, Barbados (TBPB), for distribution to all NOTAM offices and distributed lists.',
    correct: {
      productType: 'AIRAC Amendment', productTitle: 'AIP BARBADOS AIRAC AMENDMENT 05/2026',
      titleKeywords: ['AIRAC', '05/2026'],
      icaoLocation: 'TBPB', effectiveDate: '260717', issueNumber: '05/2026',
      authority: 'Barbados Civil Aviation Department',
      preparedBy: 'R. MARSHALL / SENIOR AIS OFFICER',
      distribution: 'ALL NOTAM OFFICES / DISTRIBUTED LISTS',
    },
  },
  {
    id: 'cp-04', difficultyTier: 'MEDIUM',
    situation: 'Taxiway Alpha at TBPB will be fully reconstructed over a five-month period beginning 1 August 2026. The work temporarily changes declared distances and needs maps and tables far too large for a NOTAM, but the situation is temporary and will be withdrawn once the works finish. Reference S03/2026, effective 1 August 2026. Prepared by AIS Officer K. Welch, Barbados (TBPB), for distribution to airlines and operators.',
    correct: {
      productType: 'AIP Supplement', productTitle: 'AIP BARBADOS SUPPLEMENT S03/2026 — TWY ALPHA CONSTRUCTION',
      titleKeywords: ['SUPPLEMENT', 'S03/2026'],
      icaoLocation: 'TBPB', effectiveDate: '260801', issueNumber: 'S03/2026',
      authority: 'Barbados Civil Aviation Department',
      preparedBy: 'K. WELCH / AIS OFFICER',
      distribution: 'AIRLINES AND OPERATORS',
    },
  },
  {
    id: 'cp-05', difficultyTier: 'HARD',
    situation: 'Runway 09/27 at TBPB has been permanently lengthened by 210 metres; the declared distances (TORA, TODA, ASDA, LDA) change for good, effective 20 June 2026. The Director has authorised publication immediately, without waiting for the next fixed internationally-recognised cycle date. Reference 02/2026. Prepared by Chief AIS Officer D. Crichlow, Barbados (TBPB), for distribution to all NOTAM offices and distributed lists.',
    correct: {
      productType: 'AIP Amendment', productTitle: 'AIP BARBADOS AMENDMENT 02/2026 — DECLARED DISTANCES RWY 09/27',
      titleKeywords: ['AMENDMENT', '02/2026'],
      icaoLocation: 'TBPB', effectiveDate: '260620', issueNumber: '02/2026',
      authority: 'Barbados Civil Aviation Department',
      preparedBy: 'D. CRICHLOW / CHIEF AIS OFFICER',
      distribution: 'ALL NOTAM OFFICES / DISTRIBUTED LISTS',
    },
  },
  {
    id: 'cp-06', difficultyTier: 'HARD',
    situation: 'A new Cat I ILS approach has been commissioned for Runway 09 at TBPB. All co-ordination with CAA, IATA and ARINC is complete and the charts and minima tables are included. It is permanent and requires navigation-database coding, so it must be released on the next fixed internationally-recognised cycle date. Effective 14 August 2026. Reference 06/2026. Prepared by Chief AIS Officer D. Crichlow, Barbados (TBPB), for distribution to all NOTAM offices and distributed lists.',
    correct: {
      productType: 'AIRAC Amendment', productTitle: 'AIP BARBADOS AIRAC AMENDMENT 06/2026 — ILS RWY 09 TBPB',
      titleKeywords: ['AIRAC', '06/2026'],
      icaoLocation: 'TBPB', effectiveDate: '260814', issueNumber: '06/2026',
      authority: 'Barbados Civil Aviation Department',
      preparedBy: 'D. CRICHLOW / CHIEF AIS OFFICER',
      distribution: 'ALL NOTAM OFFICES / DISTRIBUTED LISTS',
    },
  },
];

// ── AIS HANDLING pool ──────────────────────────────────────────────────────────
interface AisHandlingCorrect {
  urgency: string; operationalSignificance: string;
  scope: string; volume: string; duration: string;
  publicationType: string;
}

interface AisHandlingScenario {
  id: string; difficultyTier: Difficulty; situation: string;
  correct: AisHandlingCorrect;
}

const AIS_HANDLING_POOL: AisHandlingScenario[] = [
  {
    id: 'ah-01', difficultyTier: 'EASY',
    situation: 'The VOR at Grantley Adams (TBPB) is confirmed unserviceable during the morning serviceability check. Pilots are currently using it for approach. No ETA for repair.',
    correct: {
      urgency: 'Immediate (< 24 hours)',
      operationalSignificance: 'Essential — safety critical',
      scope: 'Local / Aerodrome',
      volume: 'Brief (NOTAM-sized)',
      duration: 'Temporary (hours / days)',
      publicationType: 'NOTAM',
    },
  },
  {
    id: 'ah-02', difficultyTier: 'EASY',
    situation: 'A new advisory has been approved on the voluntary reporting of bird strikes, containing best practices and statistics. No mandatory changes. Not safety critical.',
    correct: {
      urgency: 'Non-immediate (planned publication)',
      operationalSignificance: 'Informational — advisory only',
      scope: 'National',
      volume: 'Moderate (one or two pages)',
      duration: 'Permanent',
      publicationType: 'AIC',
    },
  },
  {
    id: 'ah-03', difficultyTier: 'MEDIUM',
    situation: 'A military exercise will create a temporary restricted area (TRA) in the eastern Caribbean. The TRA is 50 NM wide, active for 3 days starting tomorrow at 0600Z. Overflying international traffic will be affected.',
    correct: {
      urgency: 'Immediate (< 24 hours)',
      operationalSignificance: 'Essential — safety critical',
      scope: 'International',
      volume: 'Brief (NOTAM-sized)',
      duration: 'Temporary (hours / days)',
      publicationType: 'NOTAM',
    },
  },
  {
    id: 'ah-04', difficultyTier: 'MEDIUM',
    situation: 'Runway 09/27 at TBPB is being extended by 300 metres. Declared distances change permanently. New charts, approach plates, and airport diagram are required. Coordination with navigation database providers is in progress.',
    correct: {
      urgency: 'Non-immediate (planned publication)',
      operationalSignificance: 'Essential — safety critical',
      scope: 'International',
      volume: 'Extensive (multiple pages / graphics)',
      duration: 'Permanent',
      publicationType: 'AIRAC Amendment',
    },
  },
  {
    id: 'ah-05', difficultyTier: 'HARD',
    situation: 'Taxiway Bravo at TBPB requires full reconstruction over 6 months. Operations will be significantly restricted. The information includes an aerodrome diagram showing the closed areas, revised taxi routes, and revised ground movement procedures.',
    correct: {
      urgency: 'Non-immediate (planned publication)',
      operationalSignificance: 'Significant — operationally relevant',
      scope: 'Local / Aerodrome',
      volume: 'Extensive (multiple pages / graphics)',
      duration: 'Long-term (> 3 months)',
      publicationType: 'AIP Supplement',
    },
  },
  {
    id: 'ah-06', difficultyTier: 'HARD',
    situation: 'A new Cat II ILS approach for Runway 09 at TBPB has been approved. Updated minima tables, approach charts, and OCA/H data must be published. The change is planned for the next AIRAC date to allow navigation database update.',
    correct: {
      urgency: 'Non-immediate (planned publication)',
      operationalSignificance: 'Essential — safety critical',
      scope: 'International',
      volume: 'Extensive (multiple pages / graphics)',
      duration: 'Permanent',
      publicationType: 'AIRAC Amendment',
    },
  },
  {
    id: 'ah-07', difficultyTier: 'EASY',
    situation: 'A mobile crane will operate close to the approach at TBPB for two days next week, penetrating the obstacle limitation surface. Pilots need to be warned in good time, but the situation is short-lived and can be described in plain text.',
    correct: {
      urgency: 'Non-immediate (planned publication)',
      operationalSignificance: 'Essential — safety critical',
      scope: 'Local / Aerodrome',
      volume: 'Brief (NOTAM-sized)',
      duration: 'Temporary (hours / days)',
      publicationType: 'NOTAM',
    },
  },
  {
    id: 'ah-08', difficultyTier: 'MEDIUM',
    situation: 'The AIS unit\'s published telephone and AFTN contact details in the GEN section of the AIP have changed permanently. The change is textual only, not safety critical, and does not require charting or a fixed common effective date.',
    correct: {
      urgency: 'Non-immediate (planned publication)',
      operationalSignificance: 'Informational — advisory only',
      scope: 'National',
      volume: 'Brief (NOTAM-sized)',
      duration: 'Permanent',
      publicationType: 'AIP Amendment',
    },
  },
  {
    id: 'ah-09', difficultyTier: 'MEDIUM',
    situation: 'A temporary restricted area will be active around an offshore summit venue for 5 days, affecting international overflights. The lateral and vertical limits are simple and can be described in text.',
    correct: {
      urgency: 'Immediate (< 24 hours)',
      operationalSignificance: 'Essential — safety critical',
      scope: 'International',
      volume: 'Brief (NOTAM-sized)',
      duration: 'Temporary (hours / days)',
      publicationType: 'NOTAM',
    },
  },
  {
    id: 'ah-10', difficultyTier: 'HARD',
    situation: 'A new RNP AR approach procedure with associated charts, minima and database coding has been approved for Runway 27 at TBPB. It is permanent and must be effective on a common date so operators can load it into their navigation databases.',
    correct: {
      urgency: 'Non-immediate (planned publication)',
      operationalSignificance: 'Essential — safety critical',
      scope: 'International',
      volume: 'Extensive (multiple pages / graphics)',
      duration: 'Permanent',
      publicationType: 'AIRAC Amendment',
    },
  },
];

// ── METAR pool ─────────────────────────────────────────────────────────────────
interface MetarScenario {
  id: string; difficultyTier: Difficulty;
  mode: 'decode' | 'encode';
  metar?: string; situation?: string;
  questions: { id: string; prompt: string; hint?: string }[];
  correct: Record<string, string | string[]>;
}

const METAR_POOL: MetarScenario[] = [
  {
    id: 'met-01', difficultyTier: 'EASY', mode: 'decode',
    metar: 'METAR TBPB 031200Z 06008KT 9999 FEW018 SCT025 28/23 Q1015 NOSIG',
    questions: [
      { id: 'wind',  prompt: 'Describe the wind (direction, speed, unit).' },
      { id: 'vis',   prompt: 'What is the visibility?' },
      { id: 'cloud1',prompt: 'Decode the first cloud layer (FEW018).', hint: 'State coverage and height in feet.' },
      { id: 'temp',  prompt: 'What is the temperature?' },
      { id: 'qnh',   prompt: 'What is the QNH?' },
      { id: 'trend', prompt: 'What does NOSIG mean?' },
    ],
    correct: {
      wind:   ['060 DEGREES AT 8 KNOTS', '060 AT 8 KNOTS', '060 8KT', '060 8 KT', 'FROM 060 AT 8 KNOTS'],
      vis:    ['10 KM OR MORE', '10KM OR MORE', '10 KILOMETRES OR MORE', 'MORE THAN 10 KM', 'GREATER THAN 10KM', '10KM PLUS'],
      cloud1: ['FEW AT 1800 FEET', 'FEW 1800 FT', 'FEW CLOUD AT 1800 FEET', 'FEW 1800 FEET'],
      temp:   ['28 DEGREES C', '28 C', '28 DEGREES CELSIUS', '28C', '28'],
      qnh:    ['1015 HPA', 'QNH 1015', '1015 HECTOPASCALS', '1015'],
      trend:  ['NO SIGNIFICANT CHANGE', 'NOSIG', 'NO SIG CHANGE'],
    },
  },
  {
    id: 'met-02', difficultyTier: 'EASY', mode: 'decode',
    metar: 'METAR TBPB 031800Z 00000KT CAVOK 30/18 Q1017 NOSIG',
    questions: [
      { id: 'wind',  prompt: 'What are the wind conditions?' },
      { id: 'cavok', prompt: 'What does CAVOK indicate?', hint: 'Three conditions must all be met.' },
      { id: 'temp',  prompt: 'What is the temperature / dewpoint?' },
      { id: 'qnh',   prompt: 'What is the QNH?' },
    ],
    correct: {
      wind:  ['CALM', '00000KT', 'NO WIND', 'WIND CALM'],
      cavok: ['VISIBILITY 10 KM OR MORE, NO CLOUD BELOW 5000 FT AND NO CUMULONIMBUS, NO SIGNIFICANT WEATHER', 'CEILING AND VISIBILITY OK', 'VIS 10KM OR MORE NO CLOUD BELOW 5000FT NO CB NO SIGNIFICANT WEATHER', 'VISIBILITY 10KM OR MORE NO SIGNIFICANT CLOUD NO SIGNIFICANT WEATHER'],
      temp:  ['30 DEGREES C / 18 DEGREES C', '30/18', '30 C 18 C', '30C 18C', 'TEMP 30 DEWPOINT 18', '30 18'],
      qnh:   ['1017 HPA', '1017', 'QNH 1017', '1017 HECTOPASCALS'],
    },
  },
  {
    id: 'met-03', difficultyTier: 'EASY', mode: 'decode',
    metar: 'METAR TTPP 031500Z 09012KT 8000 -RA BKN015 OVC025 26/24 Q1013 TEMPO RA',
    questions: [
      { id: 'wind',  prompt: 'Describe the wind.' },
      { id: 'wx',    prompt: 'Decode the present weather (-RA).' },
      { id: 'cloud1',prompt: 'Decode BKN015.' },
      { id: 'cloud2',prompt: 'Decode OVC025.' },
      { id: 'trend', prompt: 'What does TEMPO RA indicate?' },
    ],
    correct: {
      wind:   ['090 DEGREES AT 12 KNOTS', '090 AT 12 KNOTS', '090 12KT', '090 12 KT'],
      wx:     ['LIGHT RAIN', '-RA', 'SLIGHT RAIN'],
      cloud1: ['BROKEN AT 1500 FEET', 'BROKEN 1500 FT', 'BKN 1500 FEET', 'BROKEN CLOUD AT 1500 FEET'],
      cloud2: ['OVERCAST AT 2500 FEET', 'OVERCAST 2500 FT', 'OVC 2500 FEET', 'OVERCAST CLOUD AT 2500 FEET'],
      trend:  ['TEMPORARILY RAIN EXPECTED', 'TEMPORARY RAIN', 'TEMPO RAIN', 'TEMPORARILY RAIN'],
    },
  },
  {
    id: 'met-04', difficultyTier: 'MEDIUM', mode: 'decode',
    metar: 'METAR TBPB 030600Z 12015G28KT 3000 TSRA SCT012CB BKN018 25/23 Q1010 TEMPO TSRA',
    questions: [
      { id: 'wind',  prompt: 'Decode the wind (note gusts).' },
      { id: 'vis',   prompt: 'What is the reported visibility?' },
      { id: 'wx',    prompt: 'Decode TSRA.' },
      { id: 'cloud1',prompt: 'What is SCT012CB?' },
      { id: 'risk',  prompt: 'What immediate risk does this METAR indicate for aircraft operations?' },
    ],
    correct: {
      wind:   ['120 DEGREES AT 15 KNOTS GUSTING 28 KNOTS', '120 AT 15 GUSTING 28 KNOTS', '120 15KT GUST 28KT', '120 15 G28KT'],
      vis:    ['3000 METRES', '3000 M', '3000 METERS', '3 KM', '3000'],
      wx:     ['THUNDERSTORM WITH RAIN', 'TS WITH RAIN', 'THUNDERSTORM AND RAIN', 'TSRA'],
      cloud1: ['SCATTERED CUMULONIMBUS AT 1200 FEET', 'SCT CB 1200 FT', 'SCATTERED CB AT 1200 FEET', 'SCATTERED CUMULONIMBUS 1200 FEET'],
      risk:   ['THUNDERSTORM WITH LOW VISIBILITY AND CUMULONIMBUS — SIGNIFICANT RISK TO OPERATIONS', 'THUNDERSTORM LOW VISIBILITY AND CB SIGNIFICANT RISK', 'CONVECTIVE WEATHER WITH CB AND POOR VISIBILITY HAZARDOUS', 'THUNDERSTORM LOW VIS AND CUMULONIMBUS HAZARD TO OPERATIONS'],
    },
  },
  {
    id: 'met-05', difficultyTier: 'MEDIUM', mode: 'encode',
    situation: 'At TBPB at 0900Z, conditions are: wind 140° at 10 kt, visibility 9000 m, light drizzle (DZ), scattered cloud at 1800 ft, broken cloud at 3000 ft, temperature 27°C dewpoint 24°C, QNH 1014 hPa, no significant change expected.',
    questions: [
      { id: 'wind',  prompt: 'Encode the wind group.', hint: 'Format: DDDSSKT' },
      { id: 'vis',   prompt: 'Encode the visibility group.', hint: 'In metres, 4 digits' },
      { id: 'wx',    prompt: 'Encode the present weather.', hint: 'Light drizzle' },
      { id: 'cloud1',prompt: 'Encode the first cloud layer (scattered at 1800 ft).', hint: 'Format: AAAHHHCB if CB present' },
      { id: 'cloud2',prompt: 'Encode the second cloud layer (broken at 3000 ft).' },
      { id: 'tempdp',prompt: 'Encode temperature and dewpoint group.' },
    ],
    correct: {
      wind:   '14010KT',
      vis:    '9000',
      wx:     '-DZ',
      cloud1: 'SCT018',
      cloud2: 'BKN030',
      tempdp: '27/24',
    },
  },
  {
    id: 'met-06', difficultyTier: 'MEDIUM', mode: 'encode',
    situation: 'TBPB at 1500Z: Wind variable at 5 kt, visibility greater than 10 km, no significant cloud below 5000 ft, no significant weather, temperature 31°C dewpoint 19°C, QNH 1018 hPa, no significant change.',
    questions: [
      { id: 'wind',  prompt: 'Encode the wind group.', hint: 'Variable at 5 knots' },
      { id: 'viswx', prompt: 'What single group replaces visibility, weather and cloud in these conditions?' },
      { id: 'tempdp',prompt: 'Encode temperature and dewpoint.' },
      { id: 'qnh',   prompt: 'Encode the QNH group.' },
    ],
    correct: {
      wind:   'VRB05KT',
      viswx:  'CAVOK',
      tempdp: '31/19',
      qnh:    'Q1018',
    },
  },
  {
    id: 'met-07', difficultyTier: 'HARD', mode: 'decode',
    metar: 'METAR MKJP 031200Z 18020KT 160V220 5000 +SHRA FEW010 SCT018CB BKN025 24/22 Q1008 RETS BECMG 4000 SHRA BKN015',
    questions: [
      { id: 'wind',  prompt: 'Decode the wind including the variable direction group (160V220).' },
      { id: 'vis',   prompt: 'What is the visibility?' },
      { id: 'wx',    prompt: 'Decode +SHRA.' },
      { id: 'cloud', prompt: 'Decode SCT018CB.' },
      { id: 'rets',  prompt: 'What does RETS indicate?' },
      { id: 'trend', prompt: 'What does BECMG 4000 SHRA BKN015 mean?' },
    ],
    correct: {
      wind:  ['180 DEGREES AT 20 KNOTS, DIRECTION VARIABLE BETWEEN 160 AND 220 DEGREES', '180 AT 20 KNOTS VARIABLE 160 TO 220', '180 20KT VRB 160 220', '180 20 KT VARYING 160 220'],
      vis:   ['5000 METRES', '5000 M', '5000', '5 KM'],
      wx:    ['HEAVY SHOWER OF RAIN', 'HEAVY RAIN SHOWERS', 'HEAVY SHOWERS OF RAIN', '+SHRA'],
      cloud: ['SCATTERED CUMULONIMBUS AT 1800 FEET', 'SCT CB 1800 FT', 'SCATTERED CB AT 1800 FEET', 'SCATTERED CUMULONIMBUS 1800 FEET'],
      rets:  ['RECENT THUNDERSTORM', 'RECENT TS'],
      trend: ['CONDITIONS BECOMING: VISIBILITY 4000 M, RAIN SHOWERS, BROKEN CLOUD AT 1500 FEET', 'BECOMING VIS 4000 RAIN SHOWERS BROKEN 1500FT', 'BECMG 4000 SHRA BKN015', 'BECOMING 4000M RAIN SHOWERS BROKEN AT 1500 FEET'],
    },
  },
  {
    id: 'met-08', difficultyTier: 'HARD', mode: 'encode',
    situation: 'At TBPB at 2100Z: Wind 250° at 25 kt gusting 40 kt. Visibility 1200 m in heavy rain and thunderstorm. Overcast cumulonimbus at 800 ft. Temperature 23°C, dewpoint 22°C. QNH 1005 hPa. TEMPO: wind 260° at 35 kt gusting 55 kt.',
    questions: [
      { id: 'wind',    prompt: 'Encode the wind with gusts.', hint: 'DDDSSGSSGKT' },
      { id: 'vis',     prompt: 'Encode the visibility.' },
      { id: 'wx',      prompt: 'Encode the significant weather.', hint: 'Heavy thunderstorm + rain' },
      { id: 'cloud',   prompt: 'Encode the cloud layer.' },
      { id: 'tempdp',  prompt: 'Encode temperature / dewpoint.' },
      { id: 'qnh',     prompt: 'Encode QNH.' },
      { id: 'trend',   prompt: 'Encode the TEMPO wind (260° at 35 kt gusting 55 kt).' },
    ],
    correct: {
      wind:   '25025G40KT',
      vis:    '1200',
      wx:     '+TSRA',
      cloud:  'OVC008CB',
      tempdp: '23/22',
      qnh:    'Q1005',
      trend:  'TEMPO 26035G55KT',
    },
  },
];

// ── ATS MESSAGE pool ───────────────────────────────────────────────────────────
interface AtsField {
  id: string; label: string; hint?: string;
}

interface AtsMessageCorrect {
  messageType: string;
  [key: string]: string;
}

interface AtsMessageScenario {
  id: string; difficultyTier: Difficulty;
  situation: string;
  fields?: AtsField[];
  correct: AtsMessageCorrect;
}

const ATS_MESSAGE_POOL: AtsMessageScenario[] = [
  {
    id: 'ats-01', difficultyTier: 'EASY',
    situation: 'Flight BAW456, a B738 departing EGLL IFR to EGCC, has just become airborne at 0903Z. The AIS/ATC unit must immediately transmit a message to the receiving unit to advise that the aircraft is airborne. Which ATS message type is used, and what departure time is recorded?',
    fields: [
      { id: 'depTime', label: 'Actual Time of Departure (HHMM Z)', hint: 'Use the actual wheels-off time' },
    ],
    correct: { messageType: 'DEP', depTime: '0903' },
  },
  {
    id: 'ats-02', difficultyTier: 'EASY',
    situation: 'G-ABCD, a VFR Cessna 172, has landed safely at TBPB at 1347Z and vacated the runway. No further action required from ATC. Which ATS message must AIS/ATC transmit to the departure unit, and what is the arrival time?',
    fields: [
      { id: 'arrTime', label: 'Actual Arrival Time (HHMM Z)', hint: 'Time aircraft lands / vacates runway' },
    ],
    correct: { messageType: 'ARR', arrTime: '1347' },
  },
  {
    id: 'ats-03', difficultyTier: 'EASY',
    situation: 'EZY789 filed a flight plan with EOBT 1330Z from EGKK. The aircraft will now depart at 1415Z — a delay of 45 minutes. The pilot has advised AIS. Which message type must be transmitted to all relevant units?',
    correct: { messageType: 'DLA' },
  },
  {
    id: 'ats-04', difficultyTier: 'EASY',
    situation: 'The pilot of G-RDST has cancelled his VFR flight plan for a local flight from EGLK to EGLD due to deteriorating weather before departure. Which ATS message must AIS transmit?',
    correct: { messageType: 'CNL' },
  },
  {
    id: 'ats-05', difficultyTier: 'MEDIUM',
    situation: 'BAW001 filed an IFR flight plan with cruising level F390 and route via WOTAN. After departure, the crew requests a change of cruising level to F410. The change has been co-ordinated with ATC. Which ATS message type is used for a mid-flight amendment to a filed flight plan element?',
    fields: [
      { id: 'item', label: 'Which FPL item number is being changed?', hint: 'Cruising level is in Item 15' },
    ],
    correct: { messageType: 'CHG', item: '15' },
  },
  {
    id: 'ats-06', difficultyTier: 'MEDIUM',
    situation: 'An aircraft, LOG505, is airborne on an IFR flight. London Control is about to transfer the flight to Shannon. London issues a message to Shannon containing the full current state of the flight plan, including any amendments made since departure. Which message type is this?',
    correct: { messageType: 'CPL' },
  },
  {
    id: 'ats-07', difficultyTier: 'MEDIUM',
    situation: 'Aircraft G-LMNP, IFR from EGPD to EGPB, was estimated at NATEB waypoint at 1020Z. It is now 1055Z and no position report or radio contact has been established. The pilot is 35 minutes overdue at the reporting point. What alerting phase should be declared, and which message transmitted?',
    fields: [
      { id: 'phase', label: 'Alerting Phase Declared', hint: 'INCERFA = uncertainty, ALERFA = alert, DETRESFA = distress' },
    ],
    correct: { messageType: 'ALERFA', phase: 'ALERT' },
  },
  {
    id: 'ats-08', difficultyTier: 'MEDIUM',
    situation: 'Aircraft TOM7865 is squawking 7600 on secondary surveillance radar. The flight crew are transmitting on the correct frequency but not receiving ATC. They are following lost communications procedures. Which ATS alerting message type is initiated?',
    correct: { messageType: 'RCF' },
  },
  {
    id: 'ats-09', difficultyTier: 'HARD',
    situation: 'Monarch 412 has declared MAYDAY over the Atlantic. The aircraft\'s position is known, it is descending due to engine failure, and has lost contact for 20 minutes. Search and rescue services are being co-ordinated. Which alerting phase applies and which ATS message is transmitted to all relevant units?',
    fields: [
      { id: 'phase', label: 'Alerting Phase', hint: 'This is beyond alert — the aircraft is known to be in distress' },
    ],
    correct: { messageType: 'DETRESFA', phase: 'DISTRESS' },
  },
  {
    id: 'ats-10', difficultyTier: 'HARD',
    situation: 'Caledonian 99, IFR from EGPF to EIDW, has reached the boundary of Scottish Control and is about to be transferred to Shannon. Before transfer, Scottish Control transmits a message to Shannon requesting that Shannon accept the flight and take responsibility for separation. What message type is this, and what message will Shannon transmit back when it accepts?',
    fields: [
      { id: 'initiating', label: 'Message sent BY Scottish (requesting acceptance)', hint: 'Coordination — requesting next unit to accept' },
      { id: 'response',   label: 'Message sent BY Shannon (accepting the flight)', hint: 'Acceptance message' },
    ],
    correct: { messageType: 'CDN', initiating: 'CDN', response: 'ACP' },
  },
  {
    id: 'ats-11', difficultyTier: 'EASY',
    situation: 'A pilot has just submitted complete flight plan details for an IFR flight from EGLL to EGCC, departing in three hours. AIS must transmit the filed flight plan to all units concerned along the route. Which ATS message type is transmitted?',
    correct: { messageType: 'FPL' },
  },
  {
    id: 'ats-12', difficultyTier: 'MEDIUM',
    situation: 'An ATC unit has received an estimate for an inbound aircraft but never received the associated flight plan. To obtain it from the originating unit, which ATS message type should be sent?',
    fields: [
      { id: 'expand', label: 'What does this message ask the addressee to do?', hint: 'It requests the missing filed flight plan' },
    ],
    correct: { messageType: 'RQP', expand: 'REQUEST FLIGHT PLAN' },
  },
  {
    id: 'ats-13', difficultyTier: 'MEDIUM',
    situation: 'Following an incident, an authority needs the supplementary information from Item 19 of a flight plan (endurance, persons on board, emergency equipment). Which ATS message type requests this supplementary data from the originator?',
    correct: { messageType: 'RQS' },
  },
  {
    id: 'ats-14', difficultyTier: 'HARD',
    situation: 'No arrival report has been received for a VFR flight that should have landed 20 minutes ago, and attempts to establish communication have so far been unsuccessful. Uncertainty exists as to the safety of the aircraft. Which alerting phase is declared and which message reflects it?',
    fields: [
      { id: 'phase', label: 'Alerting Phase Declared', hint: 'The first and least severe alerting phase' },
    ],
    correct: { messageType: 'INCERFA', phase: 'UNCERTAINTY' },
  },
];

// ── Generator functions ─────────────────────────────────────────────────────────

export function generateCoverPageTask(usedIds: Set<string>, gameTimePct: number): AISTask | null {
  const difficulty = pickDifficulty(gameTimePct);
  const urgency    = pickUrgency(gameTimePct);

  let pool = COVER_PAGE_POOL.filter(s => !usedIds.has(s.id));
  if (pool.length === 0) { usedIds.clear(); pool = [...COVER_PAGE_POOL]; }

  const tiered = pool.filter(s => s.difficultyTier === difficulty);
  const candidates = tiered.length > 0 ? tiered : pool;
  const template = candidates[Math.floor(Math.random() * candidates.length)];
  usedIds.add(template.id);

  return {
    id: genId(), scenarioId: template.id,
    type: 'COVER_PAGE', urgency, difficulty,
    status: 'PENDING',
    title: 'AIS Product Cover Page',
    description: 'Complete the official cover page for a Barbados AIS publication.',
    scenario: { situation: template.situation },
    correctAnswer: template.correct,
    expiresAt: Date.now() + EXPIRY_MS[urgency],
    createdAt: Date.now(),
    maxScore: MAX_SCORE[urgency],
  };
}

export function generateAisHandlingTask(usedIds: Set<string>, gameTimePct: number): AISTask | null {
  const difficulty = pickDifficulty(gameTimePct);
  const urgency    = pickUrgency(gameTimePct);

  let pool = AIS_HANDLING_POOL.filter(s => !usedIds.has(s.id));
  if (pool.length === 0) { usedIds.clear(); pool = [...AIS_HANDLING_POOL]; }

  const tiered = pool.filter(s => s.difficultyTier === difficulty);
  const candidates = tiered.length > 0 ? tiered : pool;
  const template = candidates[Math.floor(Math.random() * candidates.length)];
  usedIds.add(template.id);

  return {
    id: genId(), scenarioId: template.id,
    type: 'AIS_HANDLING', urgency, difficulty,
    status: 'PENDING',
    title: 'AIS Information Handling',
    description: 'Assess the 5 information-handling criteria for the given situation.',
    scenario: { situation: template.situation },
    correctAnswer: template.correct,
    expiresAt: Date.now() + EXPIRY_MS[urgency],
    createdAt: Date.now(),
    maxScore: MAX_SCORE[urgency],
  };
}

export function generateMetarTask(usedIds: Set<string>, gameTimePct: number): AISTask | null {
  const difficulty = pickDifficulty(gameTimePct);
  const urgency    = pickUrgency(gameTimePct);

  let pool = METAR_POOL.filter(s => !usedIds.has(s.id));
  if (pool.length === 0) { usedIds.clear(); pool = [...METAR_POOL]; }

  const tiered = pool.filter(s => s.difficultyTier === difficulty);
  const candidates = tiered.length > 0 ? tiered : pool;
  const template = candidates[Math.floor(Math.random() * candidates.length)];
  usedIds.add(template.id);

  return {
    id: genId(), scenarioId: template.id,
    type: 'METAR', urgency, difficulty,
    status: 'PENDING',
    title: template.mode === 'decode' ? 'METAR Decoding' : 'METAR Encoding',
    description: template.mode === 'decode'
      ? 'Decode the elements of the METAR observation.'
      : 'Encode the described meteorological conditions into METAR format.',
    scenario: {
      metar: template.metar,
      situation: template.situation,
      mode: template.mode,
      questions: template.questions,
    },
    correctAnswer: template.correct,
    expiresAt: Date.now() + EXPIRY_MS[urgency],
    createdAt: Date.now(),
    maxScore: MAX_SCORE[urgency],
  };
}

export function generateAtsMessageTask(usedIds: Set<string>, gameTimePct: number): AISTask | null {
  const difficulty = pickDifficulty(gameTimePct);
  const urgency    = pickUrgency(gameTimePct);

  let pool = ATS_MESSAGE_POOL.filter(s => !usedIds.has(s.id));
  if (pool.length === 0) { usedIds.clear(); pool = [...ATS_MESSAGE_POOL]; }

  const tiered = pool.filter(s => s.difficultyTier === difficulty);
  const candidates = tiered.length > 0 ? tiered : pool;
  const template = candidates[Math.floor(Math.random() * candidates.length)];
  usedIds.add(template.id);

  return {
    id: genId(), scenarioId: template.id,
    type: 'ATS_MESSAGE', urgency, difficulty,
    status: 'PENDING',
    title: 'ATS Message',
    description: 'Identify the correct ATS message type and complete the required fields.',
    scenario: { situation: template.situation, fields: template.fields },
    correctAnswer: template.correct,
    expiresAt: Date.now() + EXPIRY_MS[urgency],
    createdAt: Date.now(),
    maxScore: MAX_SCORE[urgency],
  };
}

// ── INFO REQUEST pool (departments / agencies — pick best response) ─────────────
interface InfoRequestScenario {
  id: string; difficultyTier: Difficulty;
  caller: string; request: string; options: string[];
  correctIdx: number; explanation: string;
}

const INFO_REQUEST_POOL: InfoRequestScenario[] = [
  {
    id: 'inf-01', difficultyTier: 'EASY',
    caller: 'Airport Operations',
    request: 'Operations here — a handling agent is asking which aerodrome chart shows the apron stands and taxiway designators for Grantley Adams. Where do we point them?',
    options: [
      'The Aircraft Parking/Docking chart (AD 2 type chart) in the AIP — it depicts stands and taxiway designators.',
      'The en-route chart, it has all the taxiways.',
      'The NOTAM summary — taxiways are only published as NOTAM.',
      'There is no published chart for stands; advise them to call the tower.',
    ],
    correctIdx: 0,
    explanation: 'Apron stands and taxiway designators are shown on the Aircraft Parking/Docking (apron) chart published in AIP AD 2 for the aerodrome.',
  },
  {
    id: 'inf-02', difficultyTier: 'EASY',
    caller: 'Flight Dispatch Office',
    request: 'Dispatch here — we need the published hours of operation and the AFTN address for the Barbados ARO. Can AIS supply that?',
    options: [
      'Yes — those are in AIP GEN 3 (Services) / AD 2 for TBPB; I will read the ARO hours and AFTN address.',
      'No, ARO details are confidential and not published.',
      'Check the METAR, the ARO hours are appended to it.',
      'Those are only available from ICAO headquarters.',
    ],
    correctIdx: 0,
    explanation: 'ARO/AIS service hours and AFTN addresses are published in the AIP (GEN 3 and the relevant AD 2 section) and may be provided to operators.',
  },
  {
    id: 'inf-03', difficultyTier: 'MEDIUM',
    caller: 'Adjacent ACS (Piarco)',
    request: 'Piarco control & movement desk — we are missing the supplementary information (Item 19) for an inbound that filed with you: endurance and persons on board. Can you pass the FPL supplementary data?',
    options: [
      'Yes — Item 19 supplementary data is held with the filed FPL; I will relay endurance and POB to you.',
      'No, Item 19 is destroyed once the FPL is filed.',
      'Supplementary information is only given to the pilot, not to ATС.',
      'Tell them to request it from the destination aerodrome.',
    ],
    correctIdx: 0,
    explanation: 'Item 19 (supplementary information — endurance, POB, emergency/survival equipment) is retained with the filed flight plan and is provided to ATS units that need it, e.g. for SAR.',
  },
  {
    id: 'inf-04', difficultyTier: 'MEDIUM',
    caller: 'Airline Operations Centre',
    request: 'Ops centre — our crew need the current validity of the airway routings on UA5 through the Piarco FIR for tonight\'s flight. Which source is authoritative?',
    options: [
      'The current AIRAC AIP en-route section plus any active NOTAM affecting that airway — both together give the authoritative status.',
      'Last month\'s printed chart is fine, airways never change.',
      'The pilot\'s EFB only — AIS holds no airway data.',
      'A METAR will confirm whether the airway is open.',
    ],
    correctIdx: 0,
    explanation: 'Authoritative airway status comes from the current AIRAC AIP en-route data, amended by any active NOTAM — both must be checked together.',
  },
  {
    id: 'inf-05', difficultyTier: 'HARD',
    caller: 'Military Liaison',
    request: 'Military liaison — we are activating a temporary danger area tomorrow and need the aircraft type performance band reference to assess affected traffic. Which AIS reference gives ICAO type designators and wake categories?',
    options: [
      'ICAO Doc 8643 (Aircraft Type Designators) — it lists type designators with wake turbulence category.',
      'ICAO Doc 7910 — that is location indicators, not aircraft types.',
      'The AIP GEN 2.2 abbreviations list.',
      'The NOTAM Q-code table in Doc 8126.',
    ],
    correctIdx: 0,
    explanation: 'ICAO Doc 8643 is the authoritative list of aircraft type designators with manufacturer, model and wake turbulence category. Doc 7910 is location indicators.',
  },
  {
    id: 'inf-06', difficultyTier: 'HARD',
    caller: 'Search and Rescue (RCC)',
    request: 'RCC here — we have an overdue light aircraft that filed through you. We urgently need everything on Item 19 plus the alternate aerodromes. How do you respond?',
    options: [
      'Immediately retrieve the filed FPL and read Item 19 (endurance, POB, emergency radio, survival/jackets/dinghies) and the Item 15 alternates without delay.',
      'Advise RCC to file a written request and wait 24 hours.',
      'Only confirm the callsign; the rest is restricted.',
      'Refer RCC to the airline; AIS does not assist SAR.',
    ],
    correctIdx: 0,
    explanation: 'In a SAR situation, AIS/ARO must release the full supplementary information and alternates from the filed flight plan to the RCC immediately — this is a primary purpose of retaining Item 19.',
  },
  // ── Store-retrieval scenarios ──────────────────────────────────────────────
  // These ask the officer to retrieve a specific message that is seeded into the
  // shift file store (see fileStore.ts seedFileStore / commonSeed). Both sides are
  // driven off RETRIEVAL_REFS so the correct answer always matches what is on file.
  {
    id: 'inf-07', difficultyTier: 'MEDIUM',
    caller: 'Adjacent ACC (Piarco)',
    request: `Piarco here — we have an inbound that filed through you, callsign ${RETRIEVAL_REFS.inboundFpl.callsign}. Pull its flight plan from your file store and confirm the departure aerodrome and EOBT for us.`,
    options: [
      `Retrieving it now — ${RETRIEVAL_REFS.inboundFpl.callsign} is on file inbound from ${RETRIEVAL_REFS.inboundFpl.depName} (${RETRIEVAL_REFS.inboundFpl.dep}), EOBT ${RETRIEVAL_REFS.inboundFpl.eobt}. I'll relay the full plan.`,
      `${RETRIEVAL_REFS.inboundFpl.callsign} — that one departed Piarco (TTPP), EOBT 1130. Relaying now.`,
      'We do not keep inbound flight plans once they are filed; please query the originating office.',
      `${RETRIEVAL_REFS.inboundFpl.callsign} is an outbound departure, not an inbound — nothing on file at this office.`,
    ],
    correctIdx: 0,
    explanation: `Open the shift file store, find ${RETRIEVAL_REFS.inboundFpl.callsign} under the ${RETRIEVAL_REFS.inboundFpl.folderId} folder, and read back the held details: inbound from ${RETRIEVAL_REFS.inboundFpl.depName} (${RETRIEVAL_REFS.inboundFpl.dep}), EOBT ${RETRIEVAL_REFS.inboundFpl.eobt}. The filed plan is retained for exactly this kind of retrieval.`,
  },
  {
    id: 'inf-08', difficultyTier: 'MEDIUM',
    caller: 'Caribbean Airlines Despatch',
    request: `Despatch here — did the cancellation for ${RETRIEVAL_REFS.cnl.callsign} get sent? Check your file store and tell us where it was addressed and the EOBT it cancelled.`,
    options: [
      `Yes — the CNL for ${RETRIEVAL_REFS.cnl.callsign} is on file, addressed to ${RETRIEVAL_REFS.cnl.destName} (${RETRIEVAL_REFS.cnl.addressee}), cancelling the EOBT ${RETRIEVAL_REFS.cnl.eobt} departure.`,
      `Yes — ${RETRIEVAL_REFS.cnl.callsign} cancelled, but it was addressed to Hewanorra (TLPCZQZX), EOBT 0930.`,
      'No cancellation messages are retained in the file store; you will have to refile.',
      `${RETRIEVAL_REFS.cnl.callsign} only has an FPL on file — no cancellation was ever raised.`,
    ],
    correctIdx: 0,
    explanation: `Look up ${RETRIEVAL_REFS.cnl.callsign} in the file store under the ${RETRIEVAL_REFS.cnl.folderId} folder: the CNL is on file addressed to ${RETRIEVAL_REFS.cnl.addressee} (${RETRIEVAL_REFS.cnl.destName}), cancelling the EOBT ${RETRIEVAL_REFS.cnl.eobt} departure. The store keeps a copy of transmitted messages for confirmation.`,
  },
  {
    id: 'inf-09', difficultyTier: 'MEDIUM',
    caller: 'Grantley Adams TWR/APP',
    request: `Tower here — ${RETRIEVAL_REFS.foreignInbound.originName} filed a foreign inbound to us, callsign ${RETRIEVAL_REFS.foreignInbound.callsign}. Did you get it, where did it come from and is it being forwarded to us?`,
    options: [
      `Yes — ${RETRIEVAL_REFS.foreignInbound.callsign} is on file inbound from ${RETRIEVAL_REFS.foreignInbound.depName} (${RETRIEVAL_REFS.foreignInbound.dep}), EOBT ${RETRIEVAL_REFS.foreignInbound.eobt}, filed by ${RETRIEVAL_REFS.foreignInbound.originName} and addressed to us. Acknowledged and forwarding it to you now.`,
      `${RETRIEVAL_REFS.foreignInbound.callsign} is an outbound departure from Barbados, nothing inbound on file.`,
      'We do not retain foreign-originated flight plans; query the originating office.',
      `${RETRIEVAL_REFS.foreignInbound.callsign} only overflies the Piarco FIR — it is not inbound to Barbados.`,
    ],
    correctIdx: 0,
    explanation: `Foreign inbound FPLs addressed to Barbados are filed under BOTH the TBPB folder and the originating country's folder (${RETRIEVAL_REFS.foreignInbound.originName}). Acknowledge it and forward it to ${RETRIEVAL_REFS.foreignInbound.atcUnit} so the unit is ready for the arrival. ${RETRIEVAL_REFS.foreignInbound.callsign} is inbound from ${RETRIEVAL_REFS.foreignInbound.depName} (${RETRIEVAL_REFS.foreignInbound.dep}), EOBT ${RETRIEVAL_REFS.foreignInbound.eobt}.`,
  },
  {
    id: 'inf-10', difficultyTier: 'HARD',
    caller: RETRIEVAL_REFS.overflight.atcUnit,
    request: `${RETRIEVAL_REFS.overflight.atcUnit} — checking on overflight ${RETRIEVAL_REFS.overflight.callsign} that should be crossing the Piarco FIR. Do you hold it and what is its routing?`,
    options: [
      `Yes — ${RETRIEVAL_REFS.overflight.callsign} is on file as an overflight, ${RETRIEVAL_REFS.overflight.depName} (${RETRIEVAL_REFS.overflight.dep}) → ${RETRIEVAL_REFS.overflight.destName} (${RETRIEVAL_REFS.overflight.dest}), EOBT ${RETRIEVAL_REFS.overflight.eobt}. Acknowledged and relaying to you.`,
      `${RETRIEVAL_REFS.overflight.callsign} is inbound to land at Grantley Adams, not an overflight.`,
      'No overflight messages are retained at this office.',
      `${RETRIEVAL_REFS.overflight.callsign} was cancelled earlier today.`,
    ],
    correctIdx: 0,
    explanation: `The overflight FPL is filed under BOTH the TBPB folder and the originating country's folder (${RETRIEVAL_REFS.overflight.originName}). It is an OVERFLIGHT of the Piarco FIR (not an arrival), routing ${RETRIEVAL_REFS.overflight.depName} (${RETRIEVAL_REFS.overflight.dep}) → ${RETRIEVAL_REFS.overflight.destName} (${RETRIEVAL_REFS.overflight.dest}). Acknowledge and forward it to ${RETRIEVAL_REFS.overflight.atcUnit}.`,
  },
];

export function generateInfoRequestTask(usedIds: Set<string>, gameTimePct: number): AISTask | null {
  const difficulty = pickDifficulty(gameTimePct);
  const urgency    = pickUrgency(gameTimePct);

  let pool = INFO_REQUEST_POOL.filter(s => !usedIds.has(s.id));
  if (pool.length === 0) { usedIds.clear(); pool = [...INFO_REQUEST_POOL]; }

  const tiered = pool.filter(s => s.difficultyTier === difficulty);
  const candidates = tiered.length > 0 ? tiered : pool;
  const template = candidates[Math.floor(Math.random() * candidates.length)];
  usedIds.add(template.id);

  return {
    id: genId(), scenarioId: template.id,
    type: 'INFO_REQUEST', urgency, difficulty,
    status: 'PENDING',
    title: 'Information Request',
    description: `Incoming call: ${template.caller}`,
    scenario: {
      caller: template.caller,
      request: template.request,
      options: template.options,
    },
    correctAnswer: { index: template.correctIdx, explanation: template.explanation },
    expiresAt: Date.now() + EXPIRY_MS[urgency],
    createdAt: Date.now(),
    maxScore: MAX_SCORE[urgency],
  };
}

// ── RFFS category-status pool ───────────────────────────────────────────────────
interface RffsScenario {
  id: string; difficultyTier: Difficulty;
  category: string;          // declared fire category
  scenarioNote: string;      // what's happening on the watch board
  board: { head: string; staff: number; trucks: number };
  // distractor option sets
  headOptions: string[];
  staffOptions: number[];
  trucksOptions: number[];
}

const RFFS_POOL: RffsScenario[] = [
  {
    id: 'rffs-01', difficultyTier: 'EASY',
    category: 'CAT 9',
    scenarioNote: 'Full watch on duty. All appliances serviceable.',
    board: { head: 'SFO Greenidge', staff: 14, trucks: 4 },
    headOptions: ['SFO Greenidge', 'SFO Clarke', 'LFF Mapp'],
    staffOptions: [12, 14, 16],
    trucksOptions: [3, 4, 5],
  },
  {
    id: 'rffs-02', difficultyTier: 'MEDIUM',
    category: 'CAT 7',
    scenarioNote: 'One major foam tender unserviceable for maintenance, category reduced. Watch reduced accordingly.',
    board: { head: 'SFO Clarke', staff: 10, trucks: 3 },
    headOptions: ['SFO Clarke', 'SFO Greenidge', 'WM Boyce'],
    staffOptions: [10, 12, 14],
    trucksOptions: [2, 3, 4],
  },
  {
    id: 'rffs-03', difficultyTier: 'MEDIUM',
    category: 'CAT 9',
    scenarioNote: 'Change of watch completed; new senior fire officer on duty, all trucks operational.',
    board: { head: 'SFO Boyce', staff: 15, trucks: 4 },
    headOptions: ['SFO Boyce', 'SFO Clarke', 'SFO Greenidge'],
    staffOptions: [13, 15, 17],
    trucksOptions: [3, 4, 5],
  },
  {
    id: 'rffs-04', difficultyTier: 'HARD',
    category: 'CAT 6',
    scenarioNote: 'Two appliances off the run (one u/s, one on training detail); category temporarily downgraded. Reduced crew.',
    board: { head: 'LFF Mapp', staff: 8, trucks: 2 },
    headOptions: ['LFF Mapp', 'SFO Boyce', 'SFO Clarke'],
    staffOptions: [8, 10, 12],
    trucksOptions: [2, 3, 4],
  },
  {
    id: 'rffs-05', difficultyTier: 'HARD',
    category: 'CAT 9',
    scenarioNote: 'Full establishment plus a relief crew on station for a VIP movement. All four foam tenders plus reserve serviceable.',
    board: { head: 'SFO Greenidge', staff: 18, trucks: 5 },
    headOptions: ['SFO Greenidge', 'SFO Boyce', 'WM Holder'],
    staffOptions: [16, 18, 20],
    trucksOptions: [4, 5, 6],
  },
];

export function generateRffsTask(usedIds: Set<string>, gameTimePct: number): AISTask | null {
  const difficulty = pickDifficulty(gameTimePct);

  let pool = RFFS_POOL.filter(s => !usedIds.has(s.id));
  if (pool.length === 0) { usedIds.clear(); pool = [...RFFS_POOL]; }

  const template = pool[Math.floor(Math.random() * pool.length)];
  usedIds.add(template.id);

  // RFFS is always a high-priority scheduled call.
  const urgency: Urgency = 'CRITICAL';

  return {
    id: genId(), scenarioId: template.id,
    type: 'RFFS_CALL', urgency, difficulty,
    status: 'PENDING',
    title: 'RFFS Category Call',
    description: 'The RFFS watch room is calling for the current fire-category status report.',
    scenario: {
      category: template.category,
      scenarioNote: template.scenarioNote,
      board: template.board,
      headOptions: template.headOptions,
      staffOptions: template.staffOptions,
      trucksOptions: template.trucksOptions,
    },
    correctAnswer: template.board,
    expiresAt: Date.now() + EXPIRY_MS[urgency],
    createdAt: Date.now(),
    maxScore: MAX_SCORE[urgency],
  };
}

// ── FPL / AFTN addressing pool ───────────────────────────────────────────────────
// The address book: each contracting state / ATS unit reachable from the Barbados
// AIS desk, with its 8-letter AFTN addressee indicator. Officers must transmit each
// approved flight plan to the correct set of AFTN addresses.
//   • TBPBSELX — Barbados arrivals (destination addressee for inbound flights)
//   • ZQZX suffix — ATS Reporting Office / Area Control Centre of each state/FIR
export const ROUTING_FOLDERS = [
  { id: 'TBPB', country: 'Barbados', unit: 'Grantley Adams — Arrivals', aftn: 'TBPBSELX' },
  { id: 'TTZP', country: 'Piarco FIR', unit: 'Piarco Area Control (ACC)', aftn: 'TTZPZQZX' },
  { id: 'TTPP', country: 'Trinidad & Tobago', unit: 'Piarco ARO', aftn: 'TTPPZQZX' },
  { id: 'TGPY', country: 'Grenada', unit: 'Point Salines ARO', aftn: 'TGPYZQZX' },
  { id: 'TVSV', country: 'St Vincent & the Grenadines', unit: 'Argyle ARO', aftn: 'TVSVZQZX' },
  { id: 'TLPC', country: 'St Lucia', unit: 'Hewanorra ARO', aftn: 'TLPCZQZX' },
  { id: 'SYCJ', country: 'Guyana', unit: 'Cheddi Jagan ARO', aftn: 'SYCJZQZX' },
  { id: 'SMJP', country: 'Suriname', unit: 'Johan A. Pengel ARO', aftn: 'SMJPZQZX' },
] as const;

interface FplRoutingScenario {
  id: string; difficultyTier: Difficulty;
  messageType: 'FPL' | 'CNL';
  callsign: string; aircraftType: string; flightRules: string;
  dep: string; depName: string; dest: string; destName: string;
  eobt: string; routeText: string;
  correctAftn: string[]; disregard?: boolean; explanation: string;
}

// Addressing rule used throughout the pool:
//   1. Inbound to Barbados → the destination addressee is Barbados arrivals (TBPBSELX).
//   2. Outbound from Barbados → the destination state's ATS Reporting Office (xxxxZQZX).
//   3. EVERY flight crossing the Piarco FIR adds the Piarco ACC (TTZPZQZX).
//   The originating office (the desk filing the plan) is never addressed to itself.
//   A CNL (cancellation) is sent to exactly the same addressees as the original FPL.
//   Trap messages (disregard:true) neither touch Barbados nor cross the Piarco FIR,
//   so AIS Barbados transmits nothing — the correct action is to disregard them.
const FPL_ROUTING_POOL: FplRoutingScenario[] = [
  {
    id: 'rte-01', difficultyTier: 'EASY', messageType: 'FPL',
    callsign: 'BWA415', aircraftType: 'B738', flightRules: 'IFR',
    dep: 'TTPP', depName: 'Piarco', dest: 'TBPB', destName: 'Grantley Adams', eobt: '1015',
    routeText: 'Piarco to Grantley Adams, within the Piarco FIR.',
    correctAftn: ['TBPBSELX', 'TTZPZQZX'],
    explanation: 'Inbound arrival into Barbados, so the destination addressee is Barbados arrivals (TBPBSELX). It crosses the Piarco FIR, so the Piarco ACC (TTZPZQZX) is added. Trinidad is the originating office and is not addressed.',
  },
  {
    id: 'rte-02', difficultyTier: 'EASY', messageType: 'FPL',
    callsign: 'BWA512', aircraftType: 'AT76', flightRules: 'IFR',
    dep: 'TBPB', depName: 'Grantley Adams', dest: 'TTPP', destName: 'Piarco', eobt: '1130',
    routeText: 'Grantley Adams to Piarco, within the Piarco FIR.',
    correctAftn: ['TTPPZQZX', 'TTZPZQZX'],
    explanation: 'Outbound to Trinidad, so address the Piarco ARO (TTPPZQZX). It crosses the Piarco FIR, so add the Piarco ACC (TTZPZQZX).',
  },
  {
    id: 'rte-03', difficultyTier: 'MEDIUM', messageType: 'FPL',
    callsign: 'LIA341', aircraftType: 'DH8D', flightRules: 'IFR',
    dep: 'TBPB', depName: 'Grantley Adams', dest: 'TGPY', destName: 'Point Salines', eobt: '1245',
    routeText: 'Grantley Adams to Point Salines, within the Piarco FIR.',
    correctAftn: ['TGPYZQZX', 'TTZPZQZX'],
    explanation: 'Outbound to Grenada, so address the Point Salines ARO (TGPYZQZX) plus the Piarco ACC (TTZPZQZX) for the FIR crossing.',
  },
  {
    id: 'rte-04', difficultyTier: 'MEDIUM', messageType: 'FPL',
    callsign: 'LIA221', aircraftType: 'AT72', flightRules: 'IFR',
    dep: 'TBPB', depName: 'Grantley Adams', dest: 'TVSV', destName: 'Argyle', eobt: '1400',
    routeText: 'Grantley Adams to Argyle (St Vincent), within the Piarco FIR.',
    correctAftn: ['TVSVZQZX', 'TTZPZQZX'],
    explanation: 'Outbound to St Vincent, so address the Argyle ARO (TVSVZQZX) plus the Piarco ACC (TTZPZQZX).',
  },
  {
    id: 'rte-05', difficultyTier: 'MEDIUM', messageType: 'FPL',
    callsign: 'BWA600', aircraftType: 'B738', flightRules: 'IFR',
    dep: 'TLPC', depName: 'Hewanorra', dest: 'TBPB', destName: 'Grantley Adams', eobt: '0930',
    routeText: 'Hewanorra (St Lucia) to Grantley Adams, within the Piarco FIR.',
    correctAftn: ['TBPBSELX', 'TTZPZQZX'],
    explanation: 'Inbound arrival from St Lucia. The destination addressee is Barbados arrivals (TBPBSELX), plus the Piarco ACC (TTZPZQZX). St Lucia is the originating office and is not addressed.',
  },
  {
    id: 'rte-06', difficultyTier: 'HARD', messageType: 'FPL',
    callsign: 'GGN77', aircraftType: 'C208', flightRules: 'IFR',
    dep: 'TBPB', depName: 'Grantley Adams', dest: 'SYCJ', destName: 'Cheddi Jagan', eobt: '0815',
    routeText: 'Grantley Adams to Cheddi Jagan (Guyana), within the Piarco FIR.',
    correctAftn: ['SYCJZQZX', 'TTZPZQZX'],
    explanation: 'Outbound to Guyana, so address the Cheddi Jagan ARO (SYCJZQZX) plus the Piarco ACC (TTZPZQZX).',
  },
  {
    id: 'rte-07', difficultyTier: 'HARD', messageType: 'FPL',
    callsign: 'SLM442', aircraftType: 'A320', flightRules: 'IFR',
    dep: 'TBPB', depName: 'Grantley Adams', dest: 'SMJP', destName: 'Johan A. Pengel', eobt: '1520',
    routeText: 'Grantley Adams to Johan A. Pengel (Suriname), within the Piarco FIR.',
    correctAftn: ['SMJPZQZX', 'TTZPZQZX'],
    explanation: 'Outbound to Suriname, so address the Johan A. Pengel ARO (SMJPZQZX) plus the Piarco ACC (TTZPZQZX).',
  },
  {
    id: 'rte-08', difficultyTier: 'HARD', messageType: 'FPL',
    callsign: 'LIA118', aircraftType: 'DH8D', flightRules: 'IFR',
    dep: 'TBPB', depName: 'Grantley Adams', dest: 'TLPC', destName: 'Hewanorra', eobt: '1650',
    routeText: 'Grantley Adams to Hewanorra (St Lucia), within the Piarco FIR.',
    correctAftn: ['TLPCZQZX', 'TTZPZQZX'],
    explanation: 'Outbound to St Lucia, so address the Hewanorra ARO (TLPCZQZX) plus the Piarco ACC (TTZPZQZX).',
  },

  // ── CNL (cancellation) messages — go to the SAME addressees as the original FPL ──
  {
    id: 'rte-cnl-01', difficultyTier: 'EASY', messageType: 'CNL',
    callsign: 'BWA512', aircraftType: 'AT76', flightRules: 'IFR',
    dep: 'TBPB', depName: 'Grantley Adams', dest: 'TTPP', destName: 'Piarco', eobt: '1130',
    routeText: 'CNL — cancels the Grantley Adams to Piarco plan filed earlier today.',
    correctAftn: ['TTPPZQZX', 'TTZPZQZX'],
    explanation: 'A cancellation (CNL) is transmitted to exactly the same addressees as the original flight plan. The outbound plan to Trinidad went to the Piarco ARO (TTPPZQZX) and the Piarco ACC (TTZPZQZX), so the CNL goes there too.',
  },
  {
    id: 'rte-cnl-02', difficultyTier: 'HARD', messageType: 'CNL',
    callsign: 'BWA600', aircraftType: 'B738', flightRules: 'IFR',
    dep: 'TLPC', depName: 'Hewanorra', dest: 'TBPB', destName: 'Grantley Adams', eobt: '0930',
    routeText: 'CNL — cancels the Hewanorra to Grantley Adams arrival filed earlier today.',
    correctAftn: ['TBPBSELX', 'TTZPZQZX'],
    explanation: 'A CNL goes to the same addressees as the original plan. This inbound arrival was addressed to Barbados arrivals (TBPBSELX) and the Piarco ACC (TTZPZQZX), so the cancellation is sent there too.',
  },

  // ── Trap messages — nothing to do with Barbados or the Piarco FIR → DISREGARD ──
  {
    id: 'rte-trap-01', difficultyTier: 'EASY', messageType: 'FPL',
    callsign: 'AAL1576', aircraftType: 'A321', flightRules: 'IFR',
    dep: 'KMIA', depName: 'Miami', dest: 'MKJP', destName: 'Kingston Norman Manley', eobt: '1340',
    routeText: 'Miami to Kingston (Jamaica), in the north-west Caribbean.',
    correctAftn: [], disregard: true,
    explanation: 'This flight neither departs nor arrives at Barbados, and Miami–Kingston lies well outside the Piarco FIR. AIS Barbados plays no part in its distribution — disregard the message and transmit nothing (do not reflexively add the Piarco ACC).',
  },
  {
    id: 'rte-trap-02', difficultyTier: 'MEDIUM', messageType: 'FPL',
    callsign: 'JBU1402', aircraftType: 'A320', flightRules: 'IFR',
    dep: 'TJSJ', depName: 'San Juan Luis Muñoz Marín', dest: 'TJBQ', destName: 'Aguadilla Rafael Hernández', eobt: '1610',
    routeText: 'San Juan to Aguadilla — a Puerto Rico domestic hop in the San Juan FIR.',
    correctAftn: [], disregard: true,
    explanation: 'A Puerto Rico domestic flight in the San Juan FIR. It does not touch Barbados or the Piarco FIR, so it is not AIS Barbados\u2019s message — disregard it.',
  },
  {
    id: 'rte-trap-03', difficultyTier: 'HARD', messageType: 'CNL',
    callsign: 'AVA242', aircraftType: 'A320', flightRules: 'IFR',
    dep: 'SKBO', depName: 'Bogotá El Dorado', dest: 'SVMI', destName: 'Caracas Maiquetía', eobt: '1205',
    routeText: 'CNL — cancellation of a Bogotá to Caracas flight in the north of South America.',
    correctAftn: [], disregard: true,
    explanation: 'Bogotá–Caracas runs through the Barranquilla and Maiquetía FIRs, nowhere near Barbados or the Piarco FIR. This cancellation is not ours to relay — disregard it.',
  },
];

export function generateFplRoutingTask(usedIds: Set<string>, gameTimePct: number): AISTask | null {
  const difficulty = pickDifficulty(gameTimePct);
  const urgency    = pickUrgency(gameTimePct);

  let pool = FPL_ROUTING_POOL.filter(s => !usedIds.has(s.id));
  if (pool.length === 0) { usedIds.clear(); pool = [...FPL_ROUTING_POOL]; }

  const tiered = pool.filter(s => s.difficultyTier === difficulty);
  const candidates = tiered.length > 0 ? tiered : pool;
  const template = candidates[Math.floor(Math.random() * candidates.length)];
  usedIds.add(template.id);

  return {
    id: genId(), scenarioId: template.id,
    type: 'FPL_ROUTING', urgency, difficulty,
    status: 'PENDING',
    title: 'AFTN Message — Addressing',
    description: 'A message has arrived. Decide which AFTN addressees it must be transmitted to — or disregard it if AIS Barbados has no part in it.',
    scenario: {
      messageType: template.messageType,
      callsign: template.callsign,
      aircraftType: template.aircraftType,
      flightRules: template.flightRules,
      dep: template.dep,
      depName: template.depName,
      dest: template.dest,
      destName: template.destName,
      eobt: template.eobt,
      routeText: template.routeText,
    },
    correctAnswer: { aftn: template.correctAftn, disregard: !!template.disregard, explanation: template.explanation },
    expiresAt: Date.now() + EXPIRY_MS[urgency],
    createdAt: Date.now(),
    maxScore: MAX_SCORE[urgency],
  };
}

// ── FPL APPROVAL / SELX FILING ───────────────────────────────────────────────
// The user acts as the AIS officer vetting an FPL that arrives ALREADY filled in
// by a handling agent or private operator. They verify each field, decide whether
// to approve (stamp + sign + file to SELX) or reject (return to originator), and
// — on approval — enter the correct 8-letter AFTN addressee.
//
// All scenarios here are flights INBOUND to Grantley Adams (TBPB). AIS Barbados
// files the accepted plan into the SELX message system, so the correct addressee
// is always TBPBSELX (Barbados arrivals — the home office's SELX address).

export interface FplApprovalSubmitted {
  callsign: string;
  aircraftType: string;
  wakeCategory: string;
  flightRules: string;
  dep: string; depName: string;
  dest: string; destName: string;
  eobt: string;
  totalEet: string;
  altn: string;
  endurance: string;
  pob: string;
  speed: string;
  level: string;
  route: string;
}

// The fixed set of fields the officer verifies. The keys match FplApprovalSubmitted.
export const FPL_APPROVAL_CHECK_FIELDS: { key: keyof FplApprovalSubmitted; label: string }[] = [
  { key: 'callsign',     label: 'Aircraft ID / Callsign' },
  { key: 'aircraftType', label: 'Aircraft Type' },
  { key: 'wakeCategory', label: 'Wake Turb. Cat.' },
  { key: 'dep',          label: 'Departure (ADEP)' },
  { key: 'dest',         label: 'Destination (ADES)' },
  { key: 'eobt',         label: 'EOBT (Off-blocks)' },
  { key: 'totalEet',     label: 'Total EET' },
  { key: 'altn',         label: 'Alternate (ALTN)' },
  { key: 'endurance',    label: 'Endurance' },
  { key: 'pob',          label: 'Persons on Board' },
  { key: 'route',        label: 'Route' },
];

interface FplApprovalScenario {
  id: string; difficultyTier: Difficulty;
  originator: string;       // who submitted the plan
  originatorType: string;   // 'Handling Agent' | 'Private Operator'
  flightDate: string;       // DOF (YYMMDD) — carried into the filing record
  submitted: FplApprovalSubmitted;
  errors: (keyof FplApprovalSubmitted)[];   // which checked fields are wrong
  fieldNotes: Partial<Record<keyof FplApprovalSubmitted, string>>;
  mustReject: boolean;      // true = disqualifying errors → return to originator
  addressee: string;        // correct 8-letter AFTN addressee (SELX)
  explanation: string;
}

const FPL_APPROVAL_POOL: FplApprovalScenario[] = [
  {
    id: 'app-01', difficultyTier: 'EASY',
    originator: 'Bridgetown Handling Services', originatorType: 'Handling Agent',
    flightDate: '260619',
    submitted: {
      callsign: 'BWA415', aircraftType: 'B738', wakeCategory: 'M', flightRules: 'IFR',
      dep: 'TTPP', depName: 'Piarco', dest: 'TBPB', destName: 'Grantley Adams',
      eobt: '1015', totalEet: '0045', altn: 'TLPC',
      endurance: '0230', pob: '162', speed: 'N0450', level: 'F360',
      route: 'DCT POPLO UA315 SABER DCT',
    },
    errors: [], fieldNotes: {}, mustReject: false, addressee: 'TBPBSELX',
    explanation: 'A clean, well-formed plan from the handling agent. Every field is valid and consistent (endurance comfortably exceeds the 45-minute EET), so it is approved, stamped, signed and filed to SELX (TBPBSELX, Barbados arrivals).',
  },
  {
    id: 'app-02', difficultyTier: 'EASY',
    originator: 'Caribbean Aircraft Handling', originatorType: 'Handling Agent',
    flightDate: '260619',
    submitted: {
      callsign: 'LIA341', aircraftType: 'AT76', wakeCategory: 'M', flightRules: 'IFR',
      dep: 'TGPY', depName: 'Point Salines', dest: 'TBPB', destName: 'Grantley Adams',
      eobt: '12:45', totalEet: '0050', altn: 'TLPC',
      endurance: '0205', pob: '068', speed: 'N0270', level: 'F250',
      route: 'DCT GADES DCT',
    },
    errors: ['eobt'],
    fieldNotes: { eobt: 'EOBT must be a 4-digit HHMM group with no colon — "12:45" should be filed as "1245".' },
    mustReject: false, addressee: 'TBPBSELX',
    explanation: 'Only a single formatting slip: the EOBT was written "12:45" instead of the ICAO 4-digit "1245". That is a minor, correctable error — the officer fixes the format and still approves and files the plan. Flag the EOBT, but do NOT reject the whole plan.',
  },
  {
    id: 'app-03', difficultyTier: 'MEDIUM',
    originator: 'Aero Services (BGI)', originatorType: 'Handling Agent',
    flightDate: '260619',
    submitted: {
      callsign: 'BWA512', aircraftType: 'B738', wakeCategory: 'M', flightRules: 'IFR',
      dep: 'TLPC', depName: 'Hewanorra', dest: 'TBPB', destName: 'Grantley Adams',
      eobt: '0930', totalEet: '0145', altn: 'TTPP',
      endurance: '0130', pob: '158', speed: 'N0450', level: 'F340',
      route: 'DCT MIKES UA301 SABER DCT',
    },
    errors: ['endurance'],
    fieldNotes: { endurance: 'Endurance (0130) is LESS than the total EET (0145) — the aircraft cannot legally reach its destination with required reserves.' },
    mustReject: true, addressee: 'TBPBSELX',
    explanation: 'The fuel endurance (1 h 30) is shorter than the total estimated time en route (1 h 45). That is a disqualifying safety error — the plan must be rejected and returned to the originator for correction, not filed.',
  },
  {
    id: 'app-04', difficultyTier: 'MEDIUM',
    originator: 'Bridgetown Handling Services', originatorType: 'Handling Agent',
    flightDate: '260619',
    submitted: {
      callsign: 'AAL2196', aircraftType: 'A321', wakeCategory: 'H', flightRules: 'IFR',
      dep: 'TJSJ', depName: 'San Juan', dest: 'TBPB', destName: 'Grantley Adams',
      eobt: '1340', totalEet: '0135', altn: 'TLPC',
      endurance: '0320', pob: '184', speed: 'N0460', level: 'F380',
      route: 'DCT PJM A555 ANADA DCT',
    },
    errors: ['wakeCategory'],
    fieldNotes: { wakeCategory: 'An A321 is a MEDIUM wake-turbulence category aircraft, not HEAVY — it was filed "H" but should be "M".' },
    mustReject: false, addressee: 'TBPBSELX',
    explanation: 'The only fault is the wake-turbulence category: an A321 is MEDIUM (M), but the operator entered HEAVY (H). This is a single, correctable data error — the officer corrects it to M and approves and files the plan. Flag the wake category but do not reject.',
  },
  {
    id: 'app-05', difficultyTier: 'MEDIUM',
    originator: 'SkyBridge Executive Aviation', originatorType: 'Private Operator',
    flightDate: '260619',
    submitted: {
      callsign: 'N650JP', aircraftType: 'GLF6', wakeCategory: 'M', flightRules: 'IFR',
      dep: 'KFLL', depName: 'Fort Lauderdale', dest: 'TBPB', destName: 'Grantley Adams',
      eobt: '1500', totalEet: '0405', altn: 'TTPP',
      endurance: '0630', pob: '009', speed: 'N0480', level: 'F430',
      route: 'DCT ZBV L455 OMEGA DCT',
    },
    errors: [], fieldNotes: {}, mustReject: false, addressee: 'TBPBSELX',
    explanation: 'A clean private-operator (business jet) plan. Aircraft type, wake category, aerodromes, times and endurance are all valid and consistent, so it is approved, stamped, signed and filed to SELX.',
  },
  {
    id: 'app-06', difficultyTier: 'HARD',
    originator: 'Island Jet Handling', originatorType: 'Handling Agent',
    flightDate: '260619',
    submitted: {
      callsign: 'BWA600', aircraftType: 'B378', wakeCategory: 'M', flightRules: 'IFR',
      dep: 'SYCJ', depName: 'Cheddi Jagan', dest: 'TBPB', destName: 'Grantley Adams',
      eobt: '0815', totalEet: '0015', altn: 'TTPP',
      endurance: '0210', pob: '149', speed: 'N0450', level: 'F360',
      route: 'DCT NIKAL UA315 SABER DCT',
    },
    errors: ['aircraftType', 'totalEet'],
    fieldNotes: {
      aircraftType: '"B378" is not a valid ICAO type designator — a Boeing 737-800 is "B738". The type was transposed.',
      totalEet: 'A total EET of 0015 (15 min) for Guyana → Barbados is implausible; that sector is around two hours.',
    },
    mustReject: true, addressee: 'TBPBSELX',
    explanation: 'Two serious errors: an invalid aircraft type designator ("B378" — a transposition of B738) and an impossible 15-minute EET for the Guyana–Barbados sector. These are disqualifying — reject the plan and return it to the originator.',
  },
  {
    id: 'app-07', difficultyTier: 'HARD',
    originator: 'Coastal Aviation Services', originatorType: 'Handling Agent',
    flightDate: '260619',
    submitted: {
      callsign: 'SLM442', aircraftType: 'A320', wakeCategory: 'M', flightRules: 'IFR',
      dep: 'SMJP', depName: 'Johan A. Pengel', dest: 'TBPB', destName: 'Grantley Adams',
      eobt: '1520', totalEet: '0210', altn: '',
      endurance: '0340', pob: '147', speed: 'N0450', level: 'F370',
      route: 'DCT KENED UA315 SABER DCT',
    },
    errors: ['altn'],
    fieldNotes: { altn: 'No destination alternate aerodrome was provided. An IFR plan requires a nominated alternate (Item 16) — this field is blank.' },
    mustReject: true, addressee: 'TBPBSELX',
    explanation: 'The destination alternate aerodrome (Item 16) is blank. An IFR flight plan must nominate an alternate, and this is missing, so the plan is incomplete — reject it and return it to the originator to supply the alternate.',
  },
  {
    id: 'app-08', difficultyTier: 'HARD',
    originator: 'Atlantic Wings Operations', originatorType: 'Private Operator',
    flightDate: '260619',
    submitted: {
      callsign: 'N218TX', aircraftType: 'C68A', wakeCategory: 'L', flightRules: 'IFR',
      dep: 'TNCM', depName: 'Princess Juliana', dest: 'TBPB', destName: 'Grantley Adams',
      eobt: '1105', totalEet: '0150', altn: 'TLPC',
      endurance: '0410', pob: '006', speed: 'N0400', level: 'F410',
      route: 'DCT ANU UA555 GUNSO DCT',
    },
    errors: [], fieldNotes: {}, mustReject: false, addressee: 'TBPBSELX',
    explanation: 'A clean, complete plan from a private operator (Cessna Citation Latitude, C68A — light category). All fields are valid and internally consistent, so it is approved, stamped, signed and filed to SELX.',
  },
];

export function generateFplApprovalTask(usedIds: Set<string>, gameTimePct: number): AISTask | null {
  const difficulty = pickDifficulty(gameTimePct);
  const urgency    = pickUrgency(gameTimePct);

  let pool = FPL_APPROVAL_POOL.filter(s => !usedIds.has(s.id));
  if (pool.length === 0) { usedIds.clear(); pool = [...FPL_APPROVAL_POOL]; }

  const tiered = pool.filter(s => s.difficultyTier === difficulty);
  const candidates = tiered.length > 0 ? tiered : pool;
  const template = candidates[Math.floor(Math.random() * candidates.length)];
  usedIds.add(template.id);

  return {
    id: genId(), scenarioId: template.id,
    type: 'FPL_APPROVAL', urgency, difficulty,
    status: 'PENDING',
    title: 'FPL Approval — Inbound Filing',
    description: `A pre-filled flight plan has arrived from ${template.originator}. Verify it, then approve & file to SELX or reject it.`,
    scenario: {
      originator: template.originator,
      originatorType: template.originatorType,
      flightDate: template.flightDate,
      submitted: template.submitted,
      // Filing metadata the downstream shift file-store task will consume once an
      // approved plan is filed (time sent is stamped at file time by the game).
      filing: {
        callsign: template.submitted.callsign,
        kind: 'FPL' as const,
        addressee: template.addressee,
        flightDate: template.flightDate,
      },
    },
    correctAnswer: {
      errors: template.errors,
      fieldNotes: template.fieldNotes,
      mustReject: template.mustReject,
      addressee: template.addressee,
      explanation: template.explanation,
    },
    expiresAt: Date.now() + EXPIRY_MS[urgency],
    createdAt: Date.now(),
    maxScore: MAX_SCORE[urgency],
  };
}

// ── Inbound vs Outbound FPL comparison ───────────────────────────────────────
// A learning activity: the SAME aircraft files an inbound leg into Barbados and,
// after turnaround, an outbound leg back out. Much of the plan is carried over,
// but several Item fields flip or change (dep/dest swap, route reverses, new
// EOBT/EET, new alternate, sometimes level/POB/callsign). The officer learns the
// inbound↔outbound relationship by amending a copy of the inbound plan into the
// correct outbound plan, field by field.
export interface FplCompareRow {
  key: string;        // unique field key
  item: string;       // ICAO item number (display only)
  label: string;      // human label
  inbound: string;    // value on the inbound leg
  outbound: string;   // correct value on the outbound leg
  why: string;        // why it changes — or why it stays the same
}

interface FplCompareScenario {
  id: string; difficultyTier: Difficulty;
  operator: string;        // operator / who the aircraft belongs to (unchanged)
  aircraftType: string;    // Item 9 type (unchanged between legs)
  wake: string;            // wake category (unchanged)
  flightRules: string;     // IFR/VFR (unchanged)
  speed: string;           // cruising speed (unchanged in these scenarios)
  inboundDesc: string;     // one-line description of the inbound leg
  outboundDesc: string;    // one-line description of the outbound leg
  rows: FplCompareRow[];   // the comparable fields
  explanation: string;     // overall teaching summary
}

const FPL_COMPARE_POOL: FplCompareScenario[] = [
  {
    id: 'cmp-01', difficultyTier: 'EASY',
    operator: 'Caribbean Airlines', aircraftType: 'B738', wake: 'M', flightRules: 'IFR', speed: 'N0450',
    inboundDesc: 'BWA415 arrives Grantley Adams (TBPB) inbound from Piarco, Trinidad (TTPP).',
    outboundDesc: 'After turnaround the same aircraft departs Barbados as BWA416 back to Piarco (TTPP).',
    rows: [
      { key: 'callsign', item: '7',  label: 'Aircraft ID / Callsign', inbound: 'BWA415', outbound: 'BWA416',
        why: 'The return leg is filed under its own flight number — the inbound BWA415 becomes the outbound BWA416.' },
      { key: 'dep',      item: '13', label: 'Departure (ADEP)',       inbound: 'TTPP',   outbound: 'TBPB',
        why: 'Departure and destination swap: the inbound destination (Barbados) becomes the outbound departure aerodrome.' },
      { key: 'eobt',     item: '13', label: 'EOBT (Off-blocks)',      inbound: '1015',   outbound: '1300',
        why: 'A fresh off-blocks time is filed for the return — the EOBT is never carried over from the inbound leg.' },
      { key: 'level',    item: '15', label: 'Cruising Level',         inbound: 'F350',   outbound: 'F350',
        why: 'Both legs were planned at the same flight level, so the cruising level is unchanged here.' },
      { key: 'route',    item: '15', label: 'Route',                  inbound: 'DCT POPLO UA315 SABER DCT', outbound: 'DCT SABER UA315 POPLO DCT',
        why: 'The route is flown in reverse: the waypoint/airway sequence is reversed end-to-end (SABER … POPLO instead of POPLO … SABER).' },
      { key: 'dest',     item: '16', label: 'Destination (ADES)',     inbound: 'TBPB',   outbound: 'TTPP',
        why: 'Destination and departure swap — Barbados was the inbound destination; on the return Trinidad is the destination.' },
      { key: 'addressing', item: 'AFTN', label: 'AFTN / ARO Addressing', inbound: 'TBPBZTZX', outbound: 'TTPPZTZX',
        why: 'A flight plan is addressed to the AFTN/ARO address of the DESTINATION aerodrome (plus the FIRs overflown). When the destination changes on the return, the addressee list changes too — here from Barbados (TBPBZTZX) to Piarco (TTPPZTZX).' },
      { key: 'totalEet', item: '16', label: 'Total EET',              inbound: '0045',   outbound: '0045',
        why: 'The sector is the same length in both directions, so the total EET is essentially unchanged.' },
      { key: 'altn',     item: '16', label: 'Alternate (ALTN)',       inbound: 'TLPC',   outbound: 'TTCP',
        why: 'The alternate is chosen near the NEW destination: inbound used St Lucia (TLPC) near Barbados; the return to Trinidad nominates Tobago (TTCP).' },
      { key: 'endurance',item: '19', label: 'Endurance',             inbound: '0230',   outbound: '0230',
        why: 'Endurance reflects the fuel uplift for a similar sector and is unchanged here.' },
      { key: 'pob',      item: '19', label: 'Persons on Board',       inbound: '162',    outbound: '158',
        why: 'A different passenger load on the return changes the persons-on-board count.' },
    ],
    explanation: 'Classic airline turnaround. The aircraft, type, wake, rules, speed and level all carry over, but the legs swap departure and destination, the route reverses, a new EOBT and alternate are filed and the passenger count changes. The flight number steps from BWA415 to BWA416. The AFTN/ARO addressing also follows the new destination, so the destination addressee moves from Barbados to Piarco.',
  },
  {
    id: 'cmp-02', difficultyTier: 'EASY',
    operator: 'Inter-Caribbean Regional', aircraftType: 'AT76', wake: 'M', flightRules: 'IFR', speed: 'N0270',
    inboundDesc: 'LIA341 arrives Grantley Adams (TBPB) inbound from Hewanorra, St Lucia (TLPC).',
    outboundDesc: 'The same turboprop departs Barbados as LIA342 back to Hewanorra (TLPC).',
    rows: [
      { key: 'callsign', item: '7',  label: 'Aircraft ID / Callsign', inbound: 'LIA341', outbound: 'LIA342',
        why: 'The return is filed under the next flight number — LIA341 inbound becomes LIA342 outbound.' },
      { key: 'dep',      item: '13', label: 'Departure (ADEP)',       inbound: 'TLPC',   outbound: 'TBPB',
        why: 'The inbound destination, Barbados, becomes the departure aerodrome for the return.' },
      { key: 'eobt',     item: '13', label: 'EOBT (Off-blocks)',      inbound: '0930',   outbound: '1100',
        why: 'A new off-blocks time is filed for the outbound leg.' },
      { key: 'level',    item: '15', label: 'Cruising Level',         inbound: 'F250',   outbound: 'F250',
        why: 'A short turboprop sector at the same level both ways — the cruising level is unchanged.' },
      { key: 'route',    item: '15', label: 'Route',                  inbound: 'DCT SABER DCT', outbound: 'DCT SABER DCT',
        why: 'On a short direct sector through a single reporting point, the reversed route reads the same — but it is still the return leg.' },
      { key: 'dest',     item: '16', label: 'Destination (ADES)',     inbound: 'TBPB',   outbound: 'TLPC',
        why: 'Departure and destination swap — St Lucia is now the destination.' },
      { key: 'addressing', item: 'AFTN', label: 'AFTN / ARO Addressing', inbound: 'TBPBZTZX', outbound: 'TLPCZTZX',
        why: 'The plan is addressed to the AFTN/ARO address of the destination aerodrome and FIRs overflown. With the destination now St Lucia, the destination addressee changes from Barbados (TBPBZTZX) to Hewanorra (TLPCZTZX).' },
      { key: 'totalEet', item: '16', label: 'Total EET',              inbound: '0050',   outbound: '0050',
        why: 'The same short sector takes about the same time in either direction.' },
      { key: 'altn',     item: '16', label: 'Alternate (ALTN)',       inbound: 'TGPY',   outbound: 'TFFF',
        why: 'The alternate moves to one near the NEW destination: Grenada (TGPY) inbound near Barbados; Martinique (TFFF) on the return near St Lucia.' },
      { key: 'endurance',item: '19', label: 'Endurance',             inbound: '0205',   outbound: '0205',
        why: 'Fuel uplift for a like sector is unchanged.' },
      { key: 'pob',      item: '19', label: 'Persons on Board',       inbound: '068',    outbound: '064',
        why: 'A different load returns, so the persons-on-board count changes.' },
    ],
    explanation: 'A regional turboprop turnaround. Note that on a single-fix direct sector the reversed route looks identical — yet it is still a separate outbound filing with its own callsign, EOBT, alternate and AFTN/ARO addressing (the destination addressee moves from Barbados to St Lucia).',
  },
  {
    id: 'cmp-03', difficultyTier: 'MEDIUM',
    operator: 'Caribbean Airlines', aircraftType: 'B738', wake: 'M', flightRules: 'IFR', speed: 'N0450',
    inboundDesc: 'BWA600 arrives Grantley Adams (TBPB) inbound (northbound) from Cheddi Jagan, Guyana (SYCJ).',
    outboundDesc: 'The same aircraft departs Barbados as BWA601 (southbound) back to Cheddi Jagan (SYCJ).',
    rows: [
      { key: 'callsign', item: '7',  label: 'Aircraft ID / Callsign', inbound: 'BWA600', outbound: 'BWA601',
        why: 'The return leg carries the paired flight number BWA601.' },
      { key: 'dep',      item: '13', label: 'Departure (ADEP)',       inbound: 'SYCJ',   outbound: 'TBPB',
        why: 'Barbados, the inbound destination, becomes the outbound departure.' },
      { key: 'eobt',     item: '13', label: 'EOBT (Off-blocks)',      inbound: '0815',   outbound: '1230',
        why: 'A new off-blocks time is filed for the return.' },
      { key: 'level',    item: '15', label: 'Cruising Level',         inbound: 'F360',   outbound: 'F350',
        why: 'Cruising level changes with direction under the semicircular rule: the northbound inbound leg takes an EVEN level (F360); the southbound return takes an ODD one (F350).' },
      { key: 'route',    item: '15', label: 'Route',                  inbound: 'DCT NIKAL UA315 SABER DCT', outbound: 'DCT SABER UA315 NIKAL DCT',
        why: 'The route reverses end-to-end (SABER … NIKAL on the way back).' },
      { key: 'dest',     item: '16', label: 'Destination (ADES)',     inbound: 'TBPB',   outbound: 'SYCJ',
        why: 'Departure and destination swap — Guyana is now the destination.' },
      { key: 'addressing', item: 'AFTN', label: 'AFTN / ARO Addressing', inbound: 'TBPBZTZX', outbound: 'SYCJZTZX',
        why: 'Addressing follows the route: the plan goes to the AFTN/ARO address of the destination aerodrome and the FIRs overflown. With Guyana now the destination, the destination addressee changes from Barbados (TBPBZTZX) to Cheddi Jagan (SYCJZTZX).' },
      { key: 'totalEet', item: '16', label: 'Total EET',              inbound: '0200',   outbound: '0205',
        why: 'The return EET differs slightly with the prevailing winds — a tailwind one way is a headwind the other.' },
      { key: 'altn',     item: '16', label: 'Alternate (ALTN)',       inbound: 'TLPC',   outbound: 'SMJP',
        why: 'The alternate moves near the NEW destination: St Lucia (TLPC) inbound; Suriname (SMJP) on the return near Guyana.' },
      { key: 'endurance',item: '19', label: 'Endurance',             inbound: '0330',   outbound: '0345',
        why: 'Endurance is planned against the return sector and its winds, so the fuel figure differs.' },
      { key: 'pob',      item: '19', label: 'Persons on Board',       inbound: '149',    outbound: '152',
        why: 'A different passenger load returns.' },
    ],
    explanation: 'A longer north–south sector. Beyond the usual swaps, the cruising level flips between even and odd under the semicircular rule because the direction reverses, and the EET and endurance shift with the head/tailwind. The AFTN/ARO addressing follows the new destination, moving from Barbados to Guyana.',
  },
  {
    id: 'cmp-04', difficultyTier: 'MEDIUM',
    operator: 'SkyBridge Executive (private)', aircraftType: 'GLF6', wake: 'M', flightRules: 'IFR', speed: 'N0480',
    inboundDesc: 'N650JP, a private business jet, arrives Grantley Adams (TBPB) from Fort Lauderdale (KFLL).',
    outboundDesc: 'The same aircraft departs Barbados back to Fort Lauderdale (KFLL) the next day.',
    rows: [
      { key: 'callsign', item: '7',  label: 'Aircraft ID / Callsign', inbound: 'N650JP', outbound: 'N650JP',
        why: 'A private flight files under its REGISTRATION, so the callsign is unchanged between legs — unlike an airline that uses paired flight numbers.' },
      { key: 'dep',      item: '13', label: 'Departure (ADEP)',       inbound: 'KFLL',   outbound: 'TBPB',
        why: 'Barbados, the inbound destination, becomes the outbound departure.' },
      { key: 'eobt',     item: '13', label: 'EOBT (Off-blocks)',      inbound: '1500',   outbound: '1400',
        why: 'A new off-blocks time is filed for the return flight.' },
      { key: 'level',    item: '15', label: 'Cruising Level',         inbound: 'F430',   outbound: 'F430',
        why: 'The business jet plans the same high level both ways — unchanged.' },
      { key: 'route',    item: '15', label: 'Route',                  inbound: 'DCT ZBV L455 OMEGA DCT', outbound: 'DCT OMEGA L455 ZBV DCT',
        why: 'The route reverses end-to-end for the return.' },
      { key: 'dest',     item: '16', label: 'Destination (ADES)',     inbound: 'TBPB',   outbound: 'KFLL',
        why: 'Departure and destination swap — Fort Lauderdale is now the destination.' },
      { key: 'addressing', item: 'AFTN', label: 'AFTN / ARO Addressing', inbound: 'TBPBZTZX', outbound: 'KFLLZTZX',
        why: 'The plan is addressed to the destination aerodrome ARO/AFTN address and the FIRs overflown. With Fort Lauderdale now the destination, the destination addressee changes from Barbados (TBPBZTZX) to KFLL (KFLLZTZX).' },
      { key: 'totalEet', item: '16', label: 'Total EET',              inbound: '0405',   outbound: '0420',
        why: 'A long over-water sector — the return EET grows against a headwind.' },
      { key: 'altn',     item: '16', label: 'Alternate (ALTN)',       inbound: 'TTPP',   outbound: 'KMIA',
        why: 'The alternate moves near the NEW destination: Piarco (TTPP) inbound near Barbados; Miami (KMIA) on the return near Fort Lauderdale.' },
      { key: 'endurance',item: '19', label: 'Endurance',             inbound: '0630',   outbound: '0645',
        why: 'Endurance is uplifted for the longer return sector and its winds.' },
      { key: 'pob',      item: '19', label: 'Persons on Board',       inbound: '009',    outbound: '007',
        why: 'A different number of passengers returns.' },
    ],
    explanation: 'A private business jet. The key teaching point: a private flight keeps the SAME callsign (its registration) on both legs, whereas an airline steps the flight number. Everything else follows the usual inbound↔outbound pattern, including AFTN/ARO addressing that moves to the new destination (Fort Lauderdale).',
  },
  {
    id: 'cmp-05', difficultyTier: 'HARD',
    operator: 'Surinam Airways', aircraftType: 'A320', wake: 'M', flightRules: 'IFR', speed: 'N0450',
    inboundDesc: 'SLM442 arrives Grantley Adams (TBPB) inbound (north-westbound) from Johan A. Pengel, Suriname (SMJP).',
    outboundDesc: 'The same aircraft departs Barbados as SLM443 (south-eastbound) back to Johan A. Pengel (SMJP).',
    rows: [
      { key: 'callsign', item: '7',  label: 'Aircraft ID / Callsign', inbound: 'SLM442', outbound: 'SLM443',
        why: 'The return carries the paired flight number SLM443.' },
      { key: 'dep',      item: '13', label: 'Departure (ADEP)',       inbound: 'SMJP',   outbound: 'TBPB',
        why: 'Barbados, the inbound destination, becomes the outbound departure.' },
      { key: 'eobt',     item: '13', label: 'EOBT (Off-blocks)',      inbound: '1520',   outbound: '1900',
        why: 'A new off-blocks time is filed for the return.' },
      { key: 'level',    item: '15', label: 'Cruising Level',         inbound: 'F380',   outbound: 'F370',
        why: 'Direction flips even/odd under the semicircular rule: the westbound inbound takes an EVEN level (F380); the eastbound return takes an ODD one (F370).' },
      { key: 'route',    item: '15', label: 'Route',                  inbound: 'DCT KENED UA315 SABER DCT', outbound: 'DCT SABER UA315 KENED DCT',
        why: 'The route reverses end-to-end for the return.' },
      { key: 'dest',     item: '16', label: 'Destination (ADES)',     inbound: 'TBPB',   outbound: 'SMJP',
        why: 'Departure and destination swap — Suriname is now the destination.' },
      { key: 'addressing', item: 'AFTN', label: 'AFTN / ARO Addressing', inbound: 'TBPBZTZX', outbound: 'SMJPZTZX',
        why: 'Addressing follows the destination: the plan is sent to the AFTN/ARO address of the destination aerodrome and the FIRs overflown. With Suriname now the destination, the destination addressee changes from Barbados (TBPBZTZX) to Johan A. Pengel (SMJPZTZX).' },
      { key: 'totalEet', item: '16', label: 'Total EET',              inbound: '0210',   outbound: '0220',
        why: 'The return EET grows slightly against the winds.' },
      { key: 'altn',     item: '16', label: 'Alternate (ALTN)',       inbound: 'TLPC',   outbound: 'SYCJ',
        why: 'The alternate moves near the NEW destination: St Lucia (TLPC) inbound; Guyana (SYCJ) on the return near Suriname.' },
      { key: 'endurance',item: '19', label: 'Endurance',             inbound: '0340',   outbound: '0355',
        why: 'Endurance is planned against the return sector and its winds.' },
      { key: 'pob',      item: '19', label: 'Persons on Board',       inbound: '147',    outbound: '150',
        why: 'A different passenger load returns.' },
    ],
    explanation: 'A harder case where almost every operational field shifts: the legs swap, the route reverses, the semicircular cruising level flips even↔odd with the direction, and the EET, endurance, alternate and AFTN/ARO addressing all change for the return (the destination addressee moves from Barbados to Suriname).',
  },
  {
    id: 'cmp-06', difficultyTier: 'HARD',
    operator: 'Atlantic Wings (private)', aircraftType: 'C68A', wake: 'L', flightRules: 'IFR', speed: 'N0400',
    inboundDesc: 'N218TX, a private Citation, arrives Grantley Adams (TBPB) from Princess Juliana, St Maarten (TNCM).',
    outboundDesc: 'The same aircraft departs Barbados back to Princess Juliana (TNCM).',
    rows: [
      { key: 'callsign', item: '7',  label: 'Aircraft ID / Callsign', inbound: 'N218TX', outbound: 'N218TX',
        why: 'A private flight files under its registration, so the callsign is unchanged on both legs.' },
      { key: 'dep',      item: '13', label: 'Departure (ADEP)',       inbound: 'TNCM',   outbound: 'TBPB',
        why: 'Barbados, the inbound destination, becomes the outbound departure.' },
      { key: 'eobt',     item: '13', label: 'EOBT (Off-blocks)',      inbound: '1105',   outbound: '1530',
        why: 'A new off-blocks time is filed for the return.' },
      { key: 'level',    item: '15', label: 'Cruising Level',         inbound: 'F410',   outbound: 'F410',
        why: 'The Citation plans the same level both ways — unchanged.' },
      { key: 'route',    item: '15', label: 'Route',                  inbound: 'DCT ANU UA555 GUNSO DCT', outbound: 'DCT GUNSO UA555 ANU DCT',
        why: 'The route reverses end-to-end for the return.' },
      { key: 'dest',     item: '16', label: 'Destination (ADES)',     inbound: 'TBPB',   outbound: 'TNCM',
        why: 'Departure and destination swap — St Maarten is now the destination.' },
      { key: 'addressing', item: 'AFTN', label: 'AFTN / ARO Addressing', inbound: 'TBPBZTZX', outbound: 'TNCMZTZX',
        why: 'The plan is addressed to the AFTN/ARO address of the destination aerodrome and the FIRs overflown. With St Maarten now the destination, the destination addressee changes from Barbados (TBPBZTZX) to Princess Juliana (TNCMZTZX).' },
      { key: 'totalEet', item: '16', label: 'Total EET',              inbound: '0150',   outbound: '0155',
        why: 'The return EET differs slightly with the winds.' },
      { key: 'altn',     item: '16', label: 'Alternate (ALTN)',       inbound: 'TLPC',   outbound: 'TKPK',
        why: 'The alternate moves near the NEW destination: St Lucia (TLPC) inbound near Barbados; St Kitts (TKPK) on the return near St Maarten.' },
      { key: 'endurance',item: '19', label: 'Endurance',             inbound: '0410',   outbound: '0420',
        why: 'Endurance is planned against the return sector and its winds.' },
      { key: 'pob',      item: '19', label: 'Persons on Board',       inbound: '006',    outbound: '005',
        why: 'A different number of passengers returns.' },
    ],
    explanation: 'A private Citation return. The callsign stays the same (the registration), while the legs swap, the route reverses, and the EET, endurance, alternate and AFTN/ARO addressing adjust for the return to St Maarten (the destination addressee moves from Barbados to Princess Juliana).',
  },
];

// Every comparison scenario must teach the full set of fields that change (or
// pointedly stay the same) between an aircraft's inbound and outbound legs.
const REQUIRED_COMPARE_KEYS = ['callsign', 'dep', 'eobt', 'level', 'route', 'dest', 'addressing', 'totalEet', 'altn'];
export function assertFplComparePoolValid(pool: FplCompareScenario[] = FPL_COMPARE_POOL): string[] {
  const problems: string[] = [];
  pool.forEach(s => {
    const keys = new Set(s.rows.map(r => r.key));
    REQUIRED_COMPARE_KEYS.forEach(k => {
      if (!keys.has(k)) problems.push(`${s.id}: missing required compare row "${k}"`);
    });
  });
  return problems;
}
if (import.meta.env?.DEV) {
  const issues = assertFplComparePoolValid();
  if (issues.length > 0) console.error('[FPL_COMPARE] scenario validation failed:\n' + issues.join('\n'));
}

export function generateFplCompareTask(usedIds: Set<string>, gameTimePct: number): AISTask | null {
  const difficulty = pickDifficulty(gameTimePct);
  const urgency    = pickUrgency(gameTimePct);

  let pool = FPL_COMPARE_POOL.filter(s => !usedIds.has(s.id));
  if (pool.length === 0) { usedIds.clear(); pool = [...FPL_COMPARE_POOL]; }

  const tiered = pool.filter(s => s.difficultyTier === difficulty);
  const candidates = tiered.length > 0 ? tiered : pool;
  const template = candidates[Math.floor(Math.random() * candidates.length)];
  usedIds.add(template.id);

  return {
    id: genId(), scenarioId: template.id,
    type: 'FPL_COMPARE', urgency, difficulty,
    status: 'PENDING',
    title: 'Inbound vs Outbound FPL',
    description: `${template.operator} — turn the inbound plan into the correct outbound plan and learn what changes between the legs.`,
    scenario: {
      operator: template.operator,
      aircraftType: template.aircraftType,
      wake: template.wake,
      flightRules: template.flightRules,
      speed: template.speed,
      inboundDesc: template.inboundDesc,
      outboundDesc: template.outboundDesc,
      rows: template.rows,
    },
    correctAnswer: {
      rows: template.rows,
      explanation: template.explanation,
    },
    expiresAt: Date.now() + EXPIRY_MS[urgency],
    createdAt: Date.now(),
    maxScore: MAX_SCORE[urgency],
  };
}
