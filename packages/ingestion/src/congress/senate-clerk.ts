import { XMLParser } from 'fast-xml-parser';
import { createLogger } from '@democracy-watch/shared';

const logger = createLogger('senate-clerk');

// Senate.gov XML structure types
export interface SenateClerkVote {
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
  memberVotes: SenateMemberVote[];
}

export interface SenateMemberVote {
  lisId: string;
  name: string;
  party: string;
  state: string;
  position: string;
}

// Rate limiting for Senate.gov requests
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
 * Fetch and parse a Senate roll call vote from senate.gov
 * @param congress - The congress number (e.g., 119)
 * @param session - The session number (1 or 2)
 * @param rollCallNumber - The roll call number
 * @returns Parsed vote data with member positions, or null if not found
 */
export async function fetchSenateRollCall(
  congress: number,
  session: number,
  rollCallNumber: number
): Promise<SenateClerkVote | null> {
  await rateLimit();

  // Format: vote{congress}{session}/vote_{congress}_{session}_{number}.xml
  // Example: vote1191/vote_119_1_00001.xml
  const rollStr = rollCallNumber.toString().padStart(5, '0');
  const url = `https://www.senate.gov/legislative/LIS/roll_call_votes/vote${congress}${session}/vote_${congress}_${session}_${rollStr}.xml`;

  logger.debug({ url }, 'Fetching Senate.gov XML');

  try {
    const response = await fetch(url);

    if (!response.ok) {
      if (response.status === 404) {
        logger.debug({ url, status: 404 }, 'Senate roll call not found');
        return null;
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const xml = await response.text();
    return parseRollCallXml(xml, congress, session);
  } catch (error) {
    logger.error({ error, url }, 'Failed to fetch Senate.gov XML');
    return null;
  }
}

/**
 * Parse Senate.gov XML into structured vote data
 */
function parseRollCallXml(
  xml: string,
  congress: number,
  session: number
): SenateClerkVote {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
  });

  const doc = parser.parse(xml);
  const rollCall = doc.roll_call_vote;

  // Parse vote counts
  const count = rollCall.count || {};
  const yeaTotal = parseInt(count.yeas || '0', 10);
  const nayTotal = parseInt(count.nays || '0', 10);
  const presentTotal = parseInt(count.present || '0', 10);
  const notVotingTotal = parseInt(count.absent || '0', 10);

  // Parse vote date (format: "January 3, 2025" or other formats)
  const voteDate = parseVoteDate(rollCall.vote_date || '');

  // Parse individual member votes
  const members = rollCall.members?.member || [];
  const membersArray = Array.isArray(members) ? members : [members];

  const memberVotes: SenateMemberVote[] = membersArray
    .filter((m: any) => m && m.lis_member_id)
    .map((m: any) => ({
      lisId: m.lis_member_id || '',
      name: m.member_full || '',
      party: m.party || '',
      state: m.state || '',
      position: normalizeVotePosition(m.vote_cast || ''),
    }));

  return {
    congress: parseInt(rollCall.congress || congress.toString(), 10),
    session: parseInt(rollCall.session || session.toString(), 10),
    chamber: 'senate',
    rollCallNumber: parseInt(rollCall.vote_number || '0', 10),
    voteDate,
    voteQuestion: rollCall.vote_question_text || rollCall.question || '',
    voteResult: rollCall.vote_result || '',
    yeaTotal,
    nayTotal,
    presentTotal,
    notVotingTotal,
    memberVotes,
  };
}

/**
 * Parse various date formats from Senate.gov XML
 */
function parseVoteDate(dateStr: string): string {
  if (!dateStr) return new Date().toISOString().split('T')[0];

  // Try ISO format first (2025-01-03)
  if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
    return dateStr.split('T')[0];
  }

  // Parse "January 3, 2025" format
  const match = dateStr.match(/(\w+)\s+(\d{1,2}),?\s+(\d{4})/);
  if (match) {
    const [, monthStr, day, year] = match;
    const months: Record<string, string> = {
      January: '01', February: '02', March: '03', April: '04',
      May: '05', June: '06', July: '07', August: '08',
      September: '09', October: '10', November: '11', December: '12',
    };
    const month = months[monthStr] || '01';
    return `${year}-${month}-${day.padStart(2, '0')}`;
  }

  // Fallback to current date
  logger.warn({ dateStr }, 'Could not parse Senate vote date');
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
  if (pos === 'not voting' || pos === 'not-voting' || pos === 'absent') return 'Not Voting';

  return position.trim() || 'Not Voting';
}
