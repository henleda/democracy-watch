import { XMLParser } from 'fast-xml-parser';
import { createLogger } from '@democracy-watch/shared';

const logger = createLogger('house-clerk');

// House Clerk XML structure types
export interface HouseClerkVote {
  congress: number;
  session: number;
  chamber: string;
  rollCallNumber: number;
  voteDate: string;
  voteQuestion: string;
  voteResult: string;
  yeaTotal: number;
  nayTotal: number;
  presentTotal: number;
  notVotingTotal: number;
  memberVotes: MemberVote[];
  // Bill info extracted from legis-num (e.g., "H R 153")
  billType?: string;
  billNumber?: number;
}

export interface MemberVote {
  bioguideId: string;
  name: string;
  party: string;
  state: string;
  position: string;
}

// Rate limiting for House Clerk requests
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 500; // 500ms between requests

async function rateLimit(): Promise<void> {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < MIN_REQUEST_INTERVAL) {
    await new Promise((resolve) =>
      setTimeout(resolve, MIN_REQUEST_INTERVAL - elapsed)
    );
  }
  lastRequestTime = Date.now();
}

/**
 * Fetch and parse a House roll call vote from clerk.house.gov
 * @param year - The year of the vote (e.g., 2023)
 * @param rollCallNumber - The roll call number
 * @returns Parsed vote data with member positions
 */
export async function fetchHouseRollCall(
  year: number,
  rollCallNumber: number
): Promise<HouseClerkVote | null> {
  await rateLimit();

  // Format roll call number with leading zeros (e.g., 1 -> "001", 296 -> "296")
  const rollStr = rollCallNumber.toString().padStart(3, '0');
  const url = `https://clerk.house.gov/evs/${year}/roll${rollStr}.xml`;

  logger.debug({ url }, 'Fetching House Clerk XML');

  try {
    const response = await fetch(url);

    if (!response.ok) {
      if (response.status === 404) {
        logger.warn({ url, status: 404 }, 'Roll call not found');
        return null;
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const xml = await response.text();
    return parseRollCallXml(xml);
  } catch (error) {
    logger.error({ error, url }, 'Failed to fetch House Clerk XML');
    throw error;
  }
}

/**
 * Parse House Clerk XML into structured vote data
 */
function parseRollCallXml(xml: string): HouseClerkVote {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
  });

  const doc = parser.parse(xml);
  const rollcall = doc['rollcall-vote'];
  const metadata = rollcall['vote-metadata'];
  const voteData = rollcall['vote-data'];

  // Parse vote totals from metadata
  const totals = metadata['vote-totals']?.['totals-by-vote'] || {};

  // Handle both array and single object for totals
  let yeaTotal = 0;
  let nayTotal = 0;
  let presentTotal = 0;
  let notVotingTotal = 0;

  if (Array.isArray(totals)) {
    for (const t of totals) {
      const voteType = t['@_total-type'] || t['vote-type'];
      const count = parseInt(t['#text'] || t.total || '0', 10);
      if (voteType === 'yea' || voteType === 'Yea') yeaTotal = count;
      else if (voteType === 'nay' || voteType === 'Nay') nayTotal = count;
      else if (voteType === 'present' || voteType === 'Present') presentTotal = count;
      else if (voteType === 'not-voting' || voteType === 'Not Voting') notVotingTotal = count;
    }
  } else if (typeof totals === 'object') {
    yeaTotal = parseInt(totals['yea-total'] || '0', 10);
    nayTotal = parseInt(totals['nay-total'] || '0', 10);
    presentTotal = parseInt(totals['present-total'] || '0', 10);
    notVotingTotal = parseInt(totals['not-voting-total'] || '0', 10);
  }

  // Parse action date (format: "13-Jul-2023" or "2023-07-13")
  const actionDateStr = metadata['action-date']?.['#text'] || metadata['action-date'] || '';
  const voteDate = parseVoteDate(actionDateStr);

  // Parse individual votes
  const recordedVotes = voteData?.['recorded-vote'] || [];
  const votesArray = Array.isArray(recordedVotes) ? recordedVotes : [recordedVotes];

  const memberVotes: MemberVote[] = votesArray
    .filter((v: any) => v && v.legislator)
    .map((v: any) => {
      const legislator = v.legislator;
      return {
        bioguideId: legislator['@_name-id'] || '',
        name: legislator['#text'] || legislator['@_unaccented-name'] || '',
        party: legislator['@_party'] || '',
        state: legislator['@_state'] || '',
        position: normalizeVotePosition(v.vote || ''),
      };
    })
    .filter((v: MemberVote) => v.bioguideId); // Filter out any without bioguide ID

  // Extract bill info from legis-num (e.g., "H R 153", "S 5", "H RES 24")
  const legisNum = metadata['legis-num']?.['#text'] || metadata['legis-num'] || '';
  const { billType, billNumber } = parseLegisNum(legisNum);

  return {
    congress: parseInt(metadata.congress?.['#text'] || metadata.congress || '0', 10),
    session: parseInt(metadata.session?.['#text'] || metadata.session || '1', 10),
    chamber: 'house',
    rollCallNumber: parseInt(metadata['rollcall-num']?.['#text'] || metadata['rollcall-num'] || '0', 10),
    voteDate,
    voteQuestion: metadata['vote-question']?.['#text'] || metadata['vote-question'] || '',
    voteResult: metadata['vote-result']?.['#text'] || metadata['vote-result'] || '',
    yeaTotal,
    nayTotal,
    presentTotal,
    notVotingTotal,
    memberVotes,
    billType,
    billNumber,
  };
}

/**
 * Parse legis-num field to extract bill type and number
 * Examples: "H R 153" -> {billType: "hr", billNumber: 153}
 *           "S 5" -> {billType: "s", billNumber: 5}
 *           "H RES 24" -> {billType: "hres", billNumber: 24}
 *           "QUORUM" -> {billType: undefined, billNumber: undefined}
 */
function parseLegisNum(legisNum: string): { billType?: string; billNumber?: number } {
  if (!legisNum) return {};

  // Common patterns: "H R 123", "S 5", "H RES 24", "S J RES 1", "H CON RES 5"
  // Also handles: "HR 123", "HRES 24" (no spaces)
  const normalized = legisNum.trim().toUpperCase();

  // Skip procedural votes
  if (['QUORUM', 'JOURNAL', 'MOTION', 'ADJOURN'].some(p => normalized.includes(p))) {
    return {};
  }

  // Pattern: (H|S) (optional: J |CON )?(R|RES)? (number)
  // Match things like: "H R 153", "S 5", "H RES 24", "S J RES 1"
  const match = normalized.match(/^(H|S)\s*(J\s*|CON\s*)?(R(?:ES)?|)\s*(\d+)$/);
  if (match) {
    const [, chamber, modifier, resType, num] = match;
    let billType = chamber.toLowerCase();

    // Add resolution type suffix
    if (modifier?.includes('J')) {
      billType += 'jres';
    } else if (modifier?.includes('CON')) {
      billType += 'conres';
    } else if (resType === 'RES') {
      billType += 'res';
    } else if (resType === 'R' || resType === '') {
      // "H R" means House bill (hr), "S" alone means Senate bill (s)
      billType += resType === 'R' ? 'r' : '';
    }

    return {
      billType,
      billNumber: parseInt(num, 10),
    };
  }

  logger.debug({ legisNum }, 'Could not parse legis-num');
  return {};
}

/**
 * Parse various date formats from House Clerk XML
 */
function parseVoteDate(dateStr: string): string {
  if (!dateStr) return new Date().toISOString().split('T')[0];

  // Try ISO format first (2023-07-13)
  if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
    return dateStr.split('T')[0];
  }

  // Parse "13-Jul-2023" format
  const match = dateStr.match(/(\d{1,2})-(\w{3})-(\d{4})/);
  if (match) {
    const [, day, monthStr, year] = match;
    const months: Record<string, string> = {
      Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
      Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12',
    };
    const month = months[monthStr] || '01';
    return `${year}-${month}-${day.padStart(2, '0')}`;
  }

  // Fallback to current date
  logger.warn({ dateStr }, 'Could not parse vote date');
  return new Date().toISOString().split('T')[0];
}

/**
 * Normalize vote position to standard values
 */
function normalizeVotePosition(position: string): string {
  const pos = position.trim().toLowerCase();

  if (pos === 'yea' || pos === 'aye' || pos === 'yes') return 'Yea';
  if (pos === 'nay' || pos === 'no') return 'Nay';
  if (pos === 'present') return 'Present';
  if (pos === 'not voting' || pos === 'not-voting') return 'Not Voting';

  // For Speaker elections and other special votes, the position might be a name
  // Treat these as special votes
  return position.trim() || 'Not Voting';
}
