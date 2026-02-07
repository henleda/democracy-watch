import { query, queryOne, createLogger } from '@democracy-watch/shared';
import { CiceroClient } from '../clients/cicero-client';
import {
  Member,
  MemberListItem,
  MemberVote,
  PaginatedResponse,
  MemberListOptions,
  ListOptions,
} from '@democracy-watch/shared';

export interface ZipCodeResult {
  zipCode: string;
  state: {
    code: string;
    name: string;
  };
  district?: string;
  representatives: Array<{
    chamber: 'house' | 'senate';
    member: MemberListItem;
  }>;
}

const logger = createLogger('member-service');

export class MemberService {
  private ciceroClient: CiceroClient | null | undefined = undefined;
  private ciceroClientPromise: Promise<CiceroClient | null> | null = null;

  private async getCiceroClient(): Promise<CiceroClient | null> {
    // Return cached client if already initialized
    if (this.ciceroClient !== undefined) {
      return this.ciceroClient;
    }

    // Ensure only one initialization happens
    if (!this.ciceroClientPromise) {
      this.ciceroClientPromise = CiceroClient.create().then((client) => {
        this.ciceroClient = client;
        return client;
      });
    }

    return this.ciceroClientPromise;
  }
  async list(options: MemberListOptions): Promise<PaginatedResponse<MemberListItem>> {
    const {
      state,
      party,
      chamber,
      active = true,
      limit = 20,
      offset = 0,
      sort = 'full_name',
      order = 'asc',
    } = options;

    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (state) {
      conditions.push(`state_code = $${paramIndex++}`);
      params.push(state);
    }
    if (party) {
      conditions.push(`party = $${paramIndex++}`);
      params.push(party);
    }
    if (chamber) {
      conditions.push(`chamber = $${paramIndex++}`);
      params.push(chamber);
    }
    if (active !== undefined) {
      conditions.push(`is_active = $${paramIndex++}`);
      params.push(active);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const sortColumn = this.mapSortColumn(sort);
    const orderDir = order === 'desc' ? 'DESC' : 'ASC';

    const countQuery = `SELECT COUNT(*) as count FROM members.members ${whereClause}`;
    const countResult = await queryOne<{ count: string }>(countQuery, params);
    const total = parseInt(countResult?.count || '0');

    const dataQuery = `
      SELECT
        id, bioguide_id, full_name, party, state_code, chamber, district,
        is_active, deviation_score, party_alignment_score
      FROM members.members
      ${whereClause}
      ORDER BY ${sortColumn} ${orderDir}
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;

    const rows = await query<{
      id: string;
      bioguide_id: string;
      full_name: string;
      party: string;
      state_code: string;
      chamber: string;
      district: string | null;
      is_active: boolean;
      deviation_score: number | null;
      party_alignment_score: number | null;
    }>(dataQuery, [...params, limit, offset]);

    const data: MemberListItem[] = rows.map((row) => ({
      id: row.id,
      bioguideId: row.bioguide_id,
      fullName: row.full_name,
      party: row.party as 'Republican' | 'Democrat' | 'Independent',
      stateCode: row.state_code,
      chamber: row.chamber as 'house' | 'senate',
      district: row.district || undefined,
      isActive: row.is_active,
      deviationScore: row.deviation_score || undefined,
      partyAlignmentScore: row.party_alignment_score || undefined,
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

  async getById(id: string): Promise<Member | null> {
    // Check if id looks like a UUID (36 chars with hyphens)
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

    const sql = isUuid
      ? `
        SELECT m.*, s.name as state_name,
          (SELECT COUNT(*) FROM voting.votes v WHERE v.member_id = m.id) as total_votes
        FROM members.members m
        JOIN public.states s ON s.code = m.state_code
        WHERE m.id = $1
      `
      : `
        SELECT m.*, s.name as state_name,
          (SELECT COUNT(*) FROM voting.votes v WHERE v.member_id = m.id) as total_votes
        FROM members.members m
        JOIN public.states s ON s.code = m.state_code
        WHERE m.bioguide_id = $1
      `;

    const row = await queryOne<Record<string, unknown>>(sql, [id]);
    if (!row) return null;

    return this.mapRowToMember(row);
  }

  async getByZipCode(zipCode: string): Promise<ZipCodeResult | null> {
    // Step 1: Try database lookup (cached ZIPs from previous lookups or seed data)
    let district = await this.lookupDistrictFromDb(zipCode);

    // Step 2: If not found in database, try Cicero API fallback
    if (!district) {
      const cicero = await this.getCiceroClient();

      if (cicero) {
        logger.info({ zipCode }, 'ZIP not in database, trying Cicero API');

        const ciceroResult = await cicero.getDistrictByZip(zipCode);

        if (ciceroResult) {
          // Get state name from database
          const stateInfo = await queryOne<{ name: string }>(
            'SELECT name FROM public.states WHERE code = $1',
            [ciceroResult.stateCode]
          );

          if (stateInfo) {
            district = {
              state_code: ciceroResult.stateCode,
              district_number: ciceroResult.districtNumber,
              state_name: stateInfo.name,
            };

            // Cache the result for future lookups to minimize API calls
            await cicero.cacheResult(zipCode, ciceroResult);
          }
        }
      } else {
        logger.debug({ zipCode }, 'Cicero client not available for fallback lookup');
      }
    }

    if (!district) {
      logger.debug({ zipCode }, 'No district found for ZIP code');
      return null;
    }

    // Step 3: Get representatives for this district
    const representatives = await this.getRepresentativesForDistrict(
      district.state_code,
      district.district_number
    );

    return {
      zipCode,
      state: {
        code: district.state_code,
        name: district.state_name,
      },
      district: district.district_number || undefined,
      representatives,
    };
  }

  private async lookupDistrictFromDb(zipCode: string): Promise<{
    state_code: string;
    district_number: string | null;
    state_name: string;
  } | null> {
    const districtQuery = `
      SELECT
        zd.state_code,
        zd.district_number,
        s.name as state_name
      FROM public.zip_districts zd
      JOIN public.states s ON s.code = zd.state_code
      WHERE zd.zip_code = $1
      LIMIT 1
    `;

    return queryOne<{
      state_code: string;
      district_number: string | null;
      state_name: string;
    }>(districtQuery, [zipCode]);
  }

  private async getRepresentativesForDistrict(
    stateCode: string,
    districtNumber: string | null
  ): Promise<ZipCodeResult['representatives']> {
    const membersQuery = `
      SELECT
        id, bioguide_id, full_name, party, state_code, chamber, district,
        is_active, deviation_score, party_alignment_score
      FROM members.members
      WHERE state_code = $1
        AND is_active = TRUE
        AND (
          chamber = 'senate'
          OR (chamber = 'house' AND district = $2)
        )
      ORDER BY chamber DESC, full_name
    `;

    const rows = await query<{
      id: string;
      bioguide_id: string;
      full_name: string;
      party: string;
      state_code: string;
      chamber: string;
      district: string | null;
      is_active: boolean;
      deviation_score: number | null;
      party_alignment_score: number | null;
    }>(membersQuery, [stateCode, districtNumber]);

    return rows.map((row) => ({
      chamber: row.chamber as 'house' | 'senate',
      member: {
        id: row.id,
        bioguideId: row.bioguide_id,
        fullName: row.full_name,
        party: row.party as 'Republican' | 'Democrat' | 'Independent',
        stateCode: row.state_code,
        chamber: row.chamber as 'house' | 'senate',
        district: row.district || undefined,
        isActive: row.is_active,
        deviationScore: row.deviation_score || undefined,
        partyAlignmentScore: row.party_alignment_score || undefined,
      },
    }));
  }

  async getVotes(
    memberId: string,
    options: ListOptions
  ): Promise<PaginatedResponse<MemberVote>> {
    const { limit = 20, offset = 0 } = options;

    // First resolve the member's UUID (memberId can be UUID or bioguide_id)
    const memberLookup = await queryOne<{ id: string }>(
      `SELECT id FROM members.members WHERE id::text = $1 OR bioguide_id = $1`,
      [memberId]
    );

    if (!memberLookup) {
      return { data: [], meta: { total: 0, limit, offset, hasMore: false } };
    }

    const resolvedMemberId = memberLookup.id;

    const countQuery = `
      SELECT COUNT(*) as count
      FROM voting.votes v
      WHERE v.member_id = $1
    `;
    const countResult = await queryOne<{ count: string }>(countQuery, [resolvedMemberId]);
    const total = parseInt(countResult?.count || '0');

    const dataQuery = `
      SELECT
        v.id, v.member_id, v.roll_call_id, v.position,
        COALESCE(v.vote_date, rc.vote_date) as vote_date,
        v.bill_id,
        rc.congress, rc.chamber, rc.roll_call_number, rc.vote_question, rc.vote_result,
        b.id as bill_id, b.title as bill_title, b.bill_type, b.bill_number
      FROM voting.votes v
      JOIN voting.roll_calls rc ON rc.id = v.roll_call_id
      LEFT JOIN voting.bills b ON b.id = v.bill_id
      WHERE v.member_id = $1
      ORDER BY COALESCE(v.vote_date, rc.vote_date) DESC NULLS LAST
      LIMIT $2 OFFSET $3
    `;

    const rows = await query<Record<string, unknown>>(dataQuery, [resolvedMemberId, limit, offset]);

    const data: MemberVote[] = rows.map((row) => ({
      id: row.id as string,
      memberId: row.member_id as string,
      rollCallId: row.roll_call_id as string,
      position: row.position as 'Yea' | 'Nay' | 'Present' | 'Not Voting',
      voteDate: row.vote_date as string,
      billId: row.bill_id as string | undefined,
      createdAt: '',
      rollCall: {
        id: row.roll_call_id as string,
        congress: row.congress as number,
        chamber: row.chamber as string,
        rollCallNumber: row.roll_call_number as number,
        voteQuestion: row.vote_question as string | undefined,
        voteResult: row.vote_result as string | undefined,
      },
      bill: row.bill_id
        ? {
            id: row.bill_id as string,
            title: row.bill_title as string,
            billType: row.bill_type as string,
            billNumber: row.bill_number as number,
          }
        : undefined,
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

  private mapSortColumn(sort: string): string {
    const mapping: Record<string, string> = {
      fullName: 'full_name',
      name: 'full_name',
      state: 'state_code',
      party: 'party',
      deviation: 'deviation_score',
      alignment: 'party_alignment_score',
    };
    return mapping[sort] || 'full_name';
  }

  private mapRowToMember(row: Record<string, unknown>): Member {
    return {
      id: row.id as string,
      bioguideId: row.bioguide_id as string,
      thomasId: row.thomas_id as string | undefined,
      govtrackId: row.govtrack_id as number | undefined,
      openSecretsId: row.opensecrets_id as string | undefined,
      fecId: row.fec_id as string | undefined,
      firstName: row.first_name as string,
      lastName: row.last_name as string,
      fullName: row.full_name as string,
      party: row.party as 'Republican' | 'Democrat' | 'Independent',
      stateCode: row.state_code as string,
      chamber: row.chamber as 'house' | 'senate',
      district: row.district as string | undefined,
      currentTermStart: row.current_term_start as string | undefined,
      currentTermEnd: row.current_term_end as string | undefined,
      isActive: row.is_active as boolean,
      websiteUrl: row.website_url as string | undefined,
      twitterHandle: row.twitter_handle as string | undefined,
      totalVotes: (row.total_votes as number) || 0,
      promisesTracked: (row.promises_tracked as number) || 0,
      deviationScore: row.deviation_score as number | undefined,
      partyAlignmentScore: row.party_alignment_score as number | undefined,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    };
  }
}
