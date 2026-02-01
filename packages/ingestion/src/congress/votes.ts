import { CongressApiClient } from './client';
import { query, queryOne, createLogger } from '@democracy-watch/shared';
import { IngestResult } from './members';

const logger = createLogger('ingest-votes');

export async function ingestVotes(
  client: CongressApiClient,
  congress: number,
  mode: 'full' | 'incremental'
): Promise<IngestResult> {
  const result: IngestResult = { inserted: 0, updated: 0, errors: 0 };

  // Ingest House votes
  const houseResult = await ingestChamberVotes(client, congress, 'house', mode);
  result.inserted += houseResult.inserted;
  result.updated += houseResult.updated;
  result.errors += houseResult.errors;

  // TODO: Senate votes require different API structure
  // const senateResult = await ingestChamberVotes(client, congress, 'senate', mode);

  logger.info({ result }, 'Votes ingestion completed');
  return result;
}

async function ingestChamberVotes(
  client: CongressApiClient,
  congress: number,
  chamber: 'house' | 'senate',
  mode: 'full' | 'incremental'
): Promise<IngestResult> {
  const result: IngestResult = { inserted: 0, updated: 0, errors: 0 };

  let offset = 0;
  const limit = 250;
  let hasMore = true;

  while (hasMore) {
    logger.info({ offset, limit, chamber }, 'Fetching votes batch');

    const response =
      chamber === 'house'
        ? await client.getHouseVotes(congress, { limit, offset })
        : { votes: [] }; // Senate votes handled differently

    const votes = response.votes || [];

    for (const vote of votes) {
      try {
        // Check if roll call already exists
        const exists = await rollCallExists(congress, chamber, vote.rollCallNumber);

        if (exists && mode === 'incremental') {
          continue; // Skip existing votes in incremental mode
        }

        // Get vote details with member positions
        const details = await client.getVoteDetails(
          congress,
          chamber,
          vote.rollCallNumber
        );

        await upsertRollCall(details.vote, chamber);
        const memberResult = await upsertMemberVotes(details.vote, chamber);

        result.inserted += memberResult.inserted;
        result.updated += memberResult.updated;
      } catch (error) {
        logger.error(
          { error, rollCall: vote.rollCallNumber },
          'Failed to process vote'
        );
        result.errors++;
      }
    }

    hasMore = votes.length === limit;
    offset += limit;
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
