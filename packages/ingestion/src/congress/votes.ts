import { CongressApiClient } from './client';
import { query, queryOne, createLogger } from '@democracy-watch/shared';
import { IngestResult } from './members';
import { fetchHouseRollCall, HouseClerkVote } from './house-clerk';

const logger = createLogger('ingest-votes');

export interface VoteIngestionOptions {
  startOffset?: number;  // Starting offset for chunked processing
  maxRollCalls?: number; // Maximum roll calls to process (for chunking)
}

export interface VoteIngestionResult extends IngestResult {
  rollCallsProcessed: number;
  hasMore: boolean;
  nextOffset: number;
}

export async function ingestVotes(
  client: CongressApiClient,
  congress: number,
  mode: 'full' | 'incremental',
  options: VoteIngestionOptions = {}
): Promise<VoteIngestionResult> {
  const result: VoteIngestionResult = {
    inserted: 0,
    updated: 0,
    errors: 0,
    rollCallsProcessed: 0,
    hasMore: false,
    nextOffset: 0,
  };

  // Ingest House votes with optional chunking
  const houseResult = await ingestChamberVotes(
    client,
    congress,
    'house',
    mode,
    options
  );
  result.inserted += houseResult.inserted;
  result.updated += houseResult.updated;
  result.errors += houseResult.errors;
  result.rollCallsProcessed = houseResult.rollCallsProcessed;
  result.hasMore = houseResult.hasMore;
  result.nextOffset = houseResult.nextOffset;

  // TODO: Senate votes require different API structure
  // const senateResult = await ingestChamberVotes(client, congress, 'senate', mode);

  logger.info({ result }, 'Votes ingestion completed');
  return result;
}

async function ingestChamberVotes(
  client: CongressApiClient,
  congress: number,
  chamber: 'house' | 'senate',
  mode: 'full' | 'incremental',
  options: VoteIngestionOptions = {}
): Promise<VoteIngestionResult> {
  const result: VoteIngestionResult = {
    inserted: 0,
    updated: 0,
    errors: 0,
    rollCallsProcessed: 0,
    hasMore: false,
    nextOffset: 0,
  };

  let offset = options.startOffset || 0;
  const limit = 250;
  const maxRollCalls = options.maxRollCalls || Infinity;
  let hasMore = true;

  while (hasMore && result.rollCallsProcessed < maxRollCalls) {
    logger.info({ offset, limit, chamber, maxRollCalls, processed: result.rollCallsProcessed }, 'Fetching votes batch');

    const response =
      chamber === 'house'
        ? await client.getHouseVotes(congress, { limit, offset })
        : { houseRollCallVotes: [] }; // Senate votes handled differently

    // Congress.gov API returns 'houseRollCallVotes' not 'votes'
    const votes = response.houseRollCallVotes || response.votes || [];

    let processedCount = 0;
    for (const vote of votes) {
      try {
        // Check if roll call already exists (with member votes)
        const exists = await rollCallExists(congress, chamber, vote.rollCallNumber);

        if (exists && mode === 'incremental') {
          continue; // Skip existing votes in incremental mode
        }

        // Extract year from vote date
        const year = vote.startDate
          ? parseInt(vote.startDate.split('-')[0], 10)
          : new Date().getFullYear();

        // Fetch detailed vote data from House Clerk XML
        if (chamber === 'house') {
          const clerkVote = await fetchHouseRollCall(year, vote.rollCallNumber);

          if (clerkVote) {
            // Upsert roll call with full totals from XML
            await upsertRollCallFromClerk(clerkVote, vote);
            result.inserted++;

            // Upsert individual member votes
            const memberResult = await upsertMemberVotesFromClerk(
              clerkVote,
              chamber
            );
            result.inserted += memberResult.inserted;
            result.updated += memberResult.updated;
            result.errors += memberResult.errors;

            processedCount++;
            result.rollCallsProcessed++;
            // Log progress every 50 roll calls
            if (processedCount % 50 === 0) {
              logger.info(
                {
                  rollCallsProcessed: result.rollCallsProcessed,
                  memberVotesInserted: result.inserted,
                  memberVotesUpdated: result.updated,
                  errors: result.errors,
                },
                'Vote processing progress'
              );
            }

            // Check if we've hit the max for this chunk
            if (result.rollCallsProcessed >= maxRollCalls) {
              break;
            }
          } else {
            // Fall back to list data if XML not found
            await upsertRollCallFromList(vote, chamber);
            result.inserted++;
            result.rollCallsProcessed++;
            logger.warn(
              { rollCall: vote.rollCallNumber, year },
              'House Clerk XML not found, using list data only'
            );
          }
        } else {
          // Senate votes use different source (TODO)
          await upsertRollCallFromList(vote, chamber);
          result.inserted++;
          result.rollCallsProcessed++;
        }
      } catch (error) {
        logger.error(
          { error, rollCall: vote.rollCallNumber },
          'Failed to process vote'
        );
        result.errors++;
        result.rollCallsProcessed++;
      }
    }

    logger.info(
      { batchComplete: offset, processedCount, chamber, rollCallsProcessed: result.rollCallsProcessed },
      'Batch processing complete'
    );

    // Check if there's more data and we haven't hit our limit
    const moreFromApi = votes.length === limit;
    const hitLimit = result.rollCallsProcessed >= maxRollCalls;

    if (hitLimit && moreFromApi) {
      // We stopped early due to limit, more data available
      result.hasMore = true;
      result.nextOffset = offset + votes.length;
    } else {
      hasMore = moreFromApi;
      offset += limit;
    }
  }

  return result;
}

async function rollCallExists(
  congress: number,
  chamber: string,
  rollCallNumber: number
): Promise<boolean> {
  const sql = `
    SELECT 1 FROM voting.roll_calls
    WHERE congress = $1 AND chamber = $2 AND roll_call_number = $3
  `;
  const result = await queryOne(sql, [congress, chamber, rollCallNumber]);
  return result !== null;
}

// House roll call vote from list API format
interface HouseRollCallVote {
  congress: number;
  rollCallNumber: number;
  sessionNumber: number;
  result: string;
  startDate: string;
  legislationType?: string;
  legislationNumber?: string;
  voteQuestion?: string;
}

async function upsertRollCallFromList(
  vote: HouseRollCallVote,
  chamber: string
): Promise<void> {
  // Try to find associated bill if legislation info is present
  let billId: string | null = null;
  if (vote.legislationType && vote.legislationNumber) {
    // Map legislation type to bill type (HRES -> hres, HR -> hr, etc.)
    const billType = vote.legislationType.toLowerCase();
    const billNumber = parseInt(vote.legislationNumber, 10);

    if (!isNaN(billNumber)) {
      const billResult = await queryOne<{ id: string }>(
        `SELECT id FROM voting.bills WHERE congress = $1 AND bill_type = $2 AND bill_number = $3`,
        [vote.congress, billType, billNumber]
      );
      billId = billResult?.id || null;
    }
  }

  // Parse date from startDate
  const voteDate = vote.startDate ? vote.startDate.split('T')[0] : null;

  const sql = `
    INSERT INTO voting.roll_calls (
      congress, chamber, session, roll_call_number, bill_id,
      vote_date, vote_question, vote_result
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    ON CONFLICT (congress, chamber, session, roll_call_number)
    DO UPDATE SET
      bill_id = COALESCE(EXCLUDED.bill_id, voting.roll_calls.bill_id),
      vote_question = COALESCE(EXCLUDED.vote_question, voting.roll_calls.vote_question),
      vote_result = EXCLUDED.vote_result
  `;

  await query(sql, [
    vote.congress,
    chamber,
    vote.sessionNumber || 1,
    vote.rollCallNumber,
    billId,
    voteDate,
    vote.voteQuestion || null,
    vote.result,
  ]);
}

/**
 * Upsert roll call with full data from House Clerk XML
 */
async function upsertRollCallFromClerk(
  clerkVote: HouseClerkVote,
  listVote: HouseRollCallVote
): Promise<void> {
  // Try to find associated bill if legislation info is present
  let billId: string | null = null;
  if (listVote.legislationType && listVote.legislationNumber) {
    const billType = listVote.legislationType.toLowerCase();
    const billNumber = parseInt(listVote.legislationNumber, 10);

    if (!isNaN(billNumber)) {
      const billResult = await queryOne<{ id: string }>(
        `SELECT id FROM voting.bills WHERE congress = $1 AND bill_type = $2 AND bill_number = $3`,
        [clerkVote.congress, billType, billNumber]
      );
      billId = billResult?.id || null;
    }
  }

  const sql = `
    INSERT INTO voting.roll_calls (
      congress, chamber, session, roll_call_number, bill_id,
      vote_date, vote_question, vote_result,
      yea_total, nay_total, present_total, not_voting_total
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    ON CONFLICT (congress, chamber, session, roll_call_number)
    DO UPDATE SET
      bill_id = COALESCE(EXCLUDED.bill_id, voting.roll_calls.bill_id),
      vote_question = COALESCE(EXCLUDED.vote_question, voting.roll_calls.vote_question),
      vote_result = EXCLUDED.vote_result,
      yea_total = EXCLUDED.yea_total,
      nay_total = EXCLUDED.nay_total,
      present_total = EXCLUDED.present_total,
      not_voting_total = EXCLUDED.not_voting_total
  `;

  await query(sql, [
    clerkVote.congress,
    clerkVote.chamber,
    clerkVote.session,
    clerkVote.rollCallNumber,
    billId,
    clerkVote.voteDate,
    clerkVote.voteQuestion || null,
    clerkVote.voteResult,
    clerkVote.yeaTotal,
    clerkVote.nayTotal,
    clerkVote.presentTotal,
    clerkVote.notVotingTotal,
  ]);
}

/**
 * Insert individual member votes from House Clerk XML
 */
async function upsertMemberVotesFromClerk(
  clerkVote: HouseClerkVote,
  chamber: string
): Promise<IngestResult> {
  const result: IngestResult = { inserted: 0, updated: 0, errors: 0 };
  let membersNotFound = 0;
  let sampleMissingIds: string[] = [];

  // Get roll call ID
  const rollCall = await queryOne<{ id: string }>(
    `SELECT id FROM voting.roll_calls WHERE congress = $1 AND chamber = $2 AND roll_call_number = $3`,
    [clerkVote.congress, chamber, clerkVote.rollCallNumber]
  );

  if (!rollCall) {
    logger.error({ rollCallNumber: clerkVote.rollCallNumber }, 'Roll call not found after insert');
    return result;
  }

  for (const memberVote of clerkVote.memberVotes) {
    try {
      // Get member ID by bioguide_id
      const member = await queryOne<{ id: string }>(
        `SELECT id FROM members.members WHERE bioguide_id = $1`,
        [memberVote.bioguideId]
      );

      if (!member) {
        membersNotFound++;
        if (sampleMissingIds.length < 5) {
          sampleMissingIds.push(memberVote.bioguideId);
        }
        continue;
      }

      const sql = `
        INSERT INTO voting.votes (member_id, roll_call_id, position, vote_date)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (member_id, roll_call_id)
        DO UPDATE SET position = EXCLUDED.position
        RETURNING (xmax = 0) AS inserted
      `;

      const upsertResult = await query<{ inserted: boolean }>(sql, [
        member.id,
        rollCall.id,
        memberVote.position,
        clerkVote.voteDate,
      ]);

      if (upsertResult[0]?.inserted) {
        result.inserted++;
      } else {
        result.updated++;
      }
    } catch (error: any) {
      logger.error(
        { error: error?.message || error, bioguideId: memberVote.bioguideId },
        'Failed to upsert member vote'
      );
      result.errors++;
    }
  }

  // Log if there were any issues finding members
  if (membersNotFound > 0) {
    logger.warn(
      {
        rollCall: clerkVote.rollCallNumber,
        membersNotFound,
        sampleMissingIds,
      },
      'Some members not found in database'
    );
  }

  return result;
}

async function upsertRollCall(
  vote: {
    congress: number;
    chamber: string;
    rollCallNumber: number;
    date: string;
    question: string;
    result: string;
    yeas: number;
    nays: number;
    present: number;
    notVoting: number;
    bill?: { congress: number; type: string; number: number };
  },
  chamber: string
): Promise<void> {
  // Find associated bill if any
  let billId: string | null = null;
  if (vote.bill) {
    const billResult = await queryOne<{ id: string }>(
      `SELECT id FROM voting.bills WHERE congress = $1 AND bill_type = $2 AND bill_number = $3`,
      [vote.bill.congress, vote.bill.type.toLowerCase(), vote.bill.number]
    );
    billId = billResult?.id || null;
  }

  const sql = `
    INSERT INTO voting.roll_calls (
      congress, chamber, session, roll_call_number, bill_id,
      vote_date, vote_question, vote_result,
      yea_total, nay_total, present_total, not_voting_total
    ) VALUES ($1, $2, 1, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    ON CONFLICT (congress, chamber, session, roll_call_number)
    DO UPDATE SET
      bill_id = EXCLUDED.bill_id,
      vote_question = EXCLUDED.vote_question,
      vote_result = EXCLUDED.vote_result,
      yea_total = EXCLUDED.yea_total,
      nay_total = EXCLUDED.nay_total,
      present_total = EXCLUDED.present_total,
      not_voting_total = EXCLUDED.not_voting_total
  `;

  await query(sql, [
    vote.congress,
    chamber,
    vote.rollCallNumber,
    billId,
    vote.date,
    vote.question,
    vote.result,
    vote.yeas,
    vote.nays,
    vote.present,
    vote.notVoting,
  ]);
}

async function upsertMemberVotes(
  vote: {
    congress: number;
    rollCallNumber: number;
    date: string;
    members: Array<{ bioguideId: string; votePosition: string }>;
    bill?: { congress: number; type: string; number: number };
  },
  chamber: string
): Promise<IngestResult> {
  const result: IngestResult = { inserted: 0, updated: 0, errors: 0 };

  // Get roll call ID
  const rollCall = await queryOne<{ id: string }>(
    `SELECT id FROM voting.roll_calls WHERE congress = $1 AND chamber = $2 AND roll_call_number = $3`,
    [vote.congress, chamber, vote.rollCallNumber]
  );

  if (!rollCall) {
    logger.error({ rollCallNumber: vote.rollCallNumber }, 'Roll call not found');
    return result;
  }

  // Get bill ID if any
  let billId: string | null = null;
  if (vote.bill) {
    const billResult = await queryOne<{ id: string }>(
      `SELECT id FROM voting.bills WHERE congress = $1 AND bill_type = $2 AND bill_number = $3`,
      [vote.bill.congress, vote.bill.type.toLowerCase(), vote.bill.number]
    );
    billId = billResult?.id || null;
  }

  for (const memberVote of vote.members) {
    try {
      // Get member ID
      const member = await queryOne<{ id: string }>(
        `SELECT id FROM members.members WHERE bioguide_id = $1`,
        [memberVote.bioguideId]
      );

      if (!member) {
        continue; // Member not in database yet
      }

      // Map vote position
      const position = mapVotePosition(memberVote.votePosition);

      const sql = `
        INSERT INTO voting.votes (member_id, roll_call_id, position, vote_date, bill_id)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (member_id, roll_call_id)
        DO UPDATE SET position = EXCLUDED.position
        RETURNING (xmax = 0) AS inserted
      `;

      const upsertResult = await query<{ inserted: boolean }>(sql, [
        member.id,
        rollCall.id,
        position,
        vote.date,
        billId,
      ]);

      if (upsertResult[0]?.inserted) {
        result.inserted++;
      } else {
        result.updated++;
      }
    } catch (error) {
      logger.error(
        { error, bioguideId: memberVote.bioguideId },
        'Failed to upsert member vote'
      );
      result.errors++;
    }
  }

  return result;
}

function mapVotePosition(position: string): string {
  const positionMap: Record<string, string> = {
    'Yea': 'Yea',
    'Aye': 'Yea',
    'Yes': 'Yea',
    'Nay': 'Nay',
    'No': 'Nay',
    'Present': 'Present',
    'Not Voting': 'Not Voting',
    'Abstain': 'Not Voting',
  };
  return positionMap[position] || 'Not Voting';
}
