import { query, queryOne, createLogger } from '@democracy-watch/shared';
import {
  Bill,
  PaginatedResponse,
  ListOptions,
} from '@democracy-watch/shared';

const logger = createLogger('bill-service');

export interface BillListOptions extends ListOptions {
  congress?: number;
  chamber?: 'house' | 'senate';
  policyArea?: string;
  sponsorId?: string;
  q?: string;
}

export interface BillListItem {
  id: string;
  congress: number;
  billType: string;
  billNumber: number;
  title: string;
  summary?: string;
  sponsorId?: string;
  sponsorName?: string;
  sponsorParty?: string;
  introducedDate?: string;
  latestAction?: string;
  latestActionDate?: string;
  policyArea?: string;
  voteCount?: number;
}

export interface BillDetail extends BillListItem {
  fullTextUrl?: string;
  subjects?: string[];
  rollCalls?: BillRollCall[];
}

export interface BillRollCall {
  id: string;
  chamber: string;
  rollCallNumber: number;
  voteDate: string;
  voteQuestion?: string;
  voteResult?: string;
  yeaTotal?: number;
  nayTotal?: number;
  republicanYea?: number;
  republicanNay?: number;
  democratYea?: number;
  democratNay?: number;
}

export class BillService {
  async list(options: BillListOptions): Promise<PaginatedResponse<BillListItem>> {
    const {
      congress,
      chamber,
      policyArea,
      sponsorId,
      q,
      limit = 20,
      offset = 0,
      sort = 'latest_action_date',
      order = 'desc',
    } = options;

    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (congress) {
      conditions.push(`b.congress = $${paramIndex++}`);
      params.push(congress);
    }

    if (chamber) {
      const chamberTypes = chamber === 'house'
        ? ['hr', 'hres', 'hjres', 'hconres']
        : ['s', 'sres', 'sjres', 'sconres'];
      conditions.push(`b.bill_type = ANY($${paramIndex++})`);
      params.push(chamberTypes);
    }

    if (policyArea) {
      conditions.push(`pa.name ILIKE $${paramIndex++}`);
      params.push(`%${policyArea}%`);
    }

    if (sponsorId) {
      conditions.push(`b.sponsor_id = $${paramIndex++}`);
      params.push(sponsorId);
    }

    // Full-text search on title and summary
    if (q) {
      conditions.push(`(
        b.title ILIKE $${paramIndex} OR
        b.summary ILIKE $${paramIndex} OR
        CONCAT(UPPER(b.bill_type), ' ', b.bill_number) ILIKE $${paramIndex}
      )`);
      params.push(`%${q}%`);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const sortColumn = this.mapSortColumn(sort);
    const orderDir = order === 'desc' ? 'DESC NULLS LAST' : 'ASC NULLS LAST';

    const countQuery = `
      SELECT COUNT(*) as count
      FROM voting.bills b
      LEFT JOIN public.policy_areas pa ON pa.id = b.primary_policy_area_id
      ${whereClause}
    `;
    const countResult = await queryOne<{ count: string }>(countQuery, params);
    const total = parseInt(countResult?.count || '0');

    const dataQuery = `
      SELECT
        b.id,
        b.congress,
        b.bill_type,
        b.bill_number,
        b.title,
        LEFT(b.summary, 300) as summary,
        b.sponsor_id,
        m.full_name as sponsor_name,
        m.party as sponsor_party,
        b.introduced_date,
        b.latest_action,
        b.latest_action_date,
        pa.name as policy_area,
        (SELECT COUNT(*) FROM voting.roll_calls rc WHERE rc.bill_id = b.id) as vote_count
      FROM voting.bills b
      LEFT JOIN members.members m ON m.id = b.sponsor_id
      LEFT JOIN public.policy_areas pa ON pa.id = b.primary_policy_area_id
      ${whereClause}
      ORDER BY ${sortColumn} ${orderDir}
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;

    const rows = await query<Record<string, unknown>>(dataQuery, [...params, limit, offset]);

    const data: BillListItem[] = rows.map((row) => ({
      id: row.id as string,
      congress: row.congress as number,
      billType: row.bill_type as string,
      billNumber: row.bill_number as number,
      title: row.title as string,
      summary: row.summary as string | undefined,
      sponsorId: row.sponsor_id as string | undefined,
      sponsorName: row.sponsor_name as string | undefined,
      sponsorParty: row.sponsor_party as string | undefined,
      introducedDate: row.introduced_date as string | undefined,
      latestAction: row.latest_action as string | undefined,
      latestActionDate: row.latest_action_date as string | undefined,
      policyArea: row.policy_area as string | undefined,
      voteCount: parseInt(row.vote_count as string || '0'),
    }));

    return {
      data,
      meta: {
        total,
        limit,
        offset,
        hasMore: offset + data.length < total,
      },
    };
  }

  async getById(billId: string): Promise<BillDetail | null> {
    // Check if id looks like a UUID or a bill identifier (e.g., "hr-119-1234")
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(billId);

    let billSql: string;
    let billParams: unknown[];

    if (isUuid) {
      billSql = `
        SELECT
          b.*,
          m.full_name as sponsor_name,
          m.party as sponsor_party,
          pa.name as policy_area
        FROM voting.bills b
        LEFT JOIN members.members m ON m.id = b.sponsor_id
        LEFT JOIN public.policy_areas pa ON pa.id = b.primary_policy_area_id
        WHERE b.id = $1
      `;
      billParams = [billId];
    } else {
      // Parse bill identifier: "hr-119-1234" -> bill_type=hr, congress=119, bill_number=1234
      const parts = billId.split('-');
      if (parts.length !== 3) {
        logger.warn({ billId }, 'Invalid bill identifier format');
        return null;
      }
      const [billType, congress, billNumber] = parts;

      billSql = `
        SELECT
          b.*,
          m.full_name as sponsor_name,
          m.party as sponsor_party,
          pa.name as policy_area
        FROM voting.bills b
        LEFT JOIN members.members m ON m.id = b.sponsor_id
        LEFT JOIN public.policy_areas pa ON pa.id = b.primary_policy_area_id
        WHERE b.bill_type = $1 AND b.congress = $2 AND b.bill_number = $3
      `;
      billParams = [billType.toLowerCase(), parseInt(congress), parseInt(billNumber)];
    }

    const row = await queryOne<Record<string, unknown>>(billSql, billParams);
    if (!row) return null;

    // Fetch associated roll calls
    const rollCallsSql = `
      SELECT
        id, chamber, roll_call_number, vote_date, vote_question, vote_result,
        yea_total, nay_total, republican_yea, republican_nay, democrat_yea, democrat_nay
      FROM voting.roll_calls
      WHERE bill_id = $1
      ORDER BY vote_date DESC
    `;
    const rollCallRows = await query<Record<string, unknown>>(rollCallsSql, [row.id]);

    const rollCalls: BillRollCall[] = rollCallRows.map((rc) => ({
      id: rc.id as string,
      chamber: rc.chamber as string,
      rollCallNumber: rc.roll_call_number as number,
      voteDate: rc.vote_date as string,
      voteQuestion: rc.vote_question as string | undefined,
      voteResult: rc.vote_result as string | undefined,
      yeaTotal: rc.yea_total as number | undefined,
      nayTotal: rc.nay_total as number | undefined,
      republicanYea: rc.republican_yea as number | undefined,
      republicanNay: rc.republican_nay as number | undefined,
      democratYea: rc.democrat_yea as number | undefined,
      democratNay: rc.democrat_nay as number | undefined,
    }));

    return {
      id: row.id as string,
      congress: row.congress as number,
      billType: row.bill_type as string,
      billNumber: row.bill_number as number,
      title: row.title as string,
      summary: row.summary as string | undefined,
      sponsorId: row.sponsor_id as string | undefined,
      sponsorName: row.sponsor_name as string | undefined,
      sponsorParty: row.sponsor_party as string | undefined,
      introducedDate: row.introduced_date as string | undefined,
      latestAction: row.latest_action as string | undefined,
      latestActionDate: row.latest_action_date as string | undefined,
      policyArea: row.policy_area as string | undefined,
      fullTextUrl: row.full_text_url as string | undefined,
      subjects: row.subjects as string[] | undefined,
      rollCalls,
    };
  }

  async search(searchQuery: string, options: ListOptions = {}): Promise<PaginatedResponse<BillListItem>> {
    return this.list({
      ...options,
      q: searchQuery,
    });
  }

  private mapSortColumn(sort: string): string {
    const mapping: Record<string, string> = {
      title: 'b.title',
      congress: 'b.congress',
      introduced: 'b.introduced_date',
      introducedDate: 'b.introduced_date',
      latestAction: 'b.latest_action_date',
      latest_action_date: 'b.latest_action_date',
      billNumber: 'b.bill_number',
    };
    return mapping[sort] || 'b.latest_action_date';
  }
}
