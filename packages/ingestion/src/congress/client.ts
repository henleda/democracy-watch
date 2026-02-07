import { createLogger } from '@democracy-watch/shared';

const logger = createLogger('congress-api-client');

export interface PaginationOptions {
  limit?: number;
  offset?: number;
}

export interface CongressApiResponse<T> {
  pagination?: {
    count: number;
    next?: string;
  };
  members?: T[];
  bills?: T[];
  votes?: T[];
  houseRollCallVotes?: T[];
  senateRollCallVotes?: T[];
  request?: Record<string, unknown>;
}

export class CongressApiClient {
  private baseUrl = 'https://api.congress.gov/v3';
  private requestCount = 0;
  private lastRequestTime = 0;
  private minRequestInterval = 720; // ms between requests (5000/hr = 1 per 0.72s)

  constructor(private apiKey: string) {}

  private async rateLimit(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastRequestTime;
    if (elapsed < this.minRequestInterval) {
      await new Promise((resolve) =>
        setTimeout(resolve, this.minRequestInterval - elapsed)
      );
    }
    this.lastRequestTime = Date.now();
    this.requestCount++;
  }

  private async fetch<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
    await this.rateLimit();

    const url = new URL(`${this.baseUrl}${endpoint}`);
    url.searchParams.set('api_key', this.apiKey);
    url.searchParams.set('format', 'json');

    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, value);
      }
    }

    logger.debug({ endpoint, requestCount: this.requestCount }, 'API request');

    const response = await fetch(url.toString());

    if (!response.ok) {
      const error = await response.text();
      logger.error({ status: response.status, error }, 'API error');
      throw new Error(`Congress.gov API error: ${response.status} - ${error}`);
    }

    return response.json() as Promise<T>;
  }

  async getMembers(
    congress: number,
    options: PaginationOptions = {}
  ): Promise<CongressApiResponse<CongressMember>> {
    const { limit = 250, offset = 0 } = options;
    return this.fetch<CongressApiResponse<CongressMember>>(`/member/congress/${congress}`, {
      limit: limit.toString(),
      offset: offset.toString(),
    });
  }

  async getMember(bioguideId: string): Promise<{ member: CongressMemberDetail }> {
    return this.fetch<{ member: CongressMemberDetail }>(`/member/${bioguideId}`);
  }

  async getBills(
    congress: number,
    options: PaginationOptions & { fromDateTime?: string } = {}
  ): Promise<CongressApiResponse<CongressBill>> {
    const { limit = 250, offset = 0, fromDateTime } = options;
    const params: Record<string, string> = {
      limit: limit.toString(),
      offset: offset.toString(),
    };
    if (fromDateTime) {
      params.fromDateTime = fromDateTime;
    }
    return this.fetch<CongressApiResponse<CongressBill>>(`/bill/${congress}`, params);
  }

  async getBill(
    congress: number,
    billType: string,
    billNumber: number
  ): Promise<{ bill: CongressBillDetail }> {
    return this.fetch<{ bill: CongressBillDetail }>(
      `/bill/${congress}/${billType}/${billNumber}`
    );
  }

  async getBillSummaries(
    congress: number,
    billType: string,
    billNumber: number
  ): Promise<{ summaries: CongressBillSummary[] }> {
    return this.fetch<{ summaries: CongressBillSummary[] }>(
      `/bill/${congress}/${billType}/${billNumber}/summaries`
    );
  }

  async getBillSubjects(
    congress: number,
    billType: string,
    billNumber: number
  ): Promise<{ subjects: { legislativeSubjects: Array<{ name: string }> } }> {
    return this.fetch<{ subjects: { legislativeSubjects: Array<{ name: string }> } }>(
      `/bill/${congress}/${billType}/${billNumber}/subjects`
    );
  }

  async getHouseVotes(
    congress: number,
    options: PaginationOptions = {}
  ): Promise<CongressApiResponse<CongressVote>> {
    const { limit = 250, offset = 0 } = options;
    return this.fetch<CongressApiResponse<CongressVote>>(`/house-vote/${congress}`, {
      limit: limit.toString(),
      offset: offset.toString(),
    });
  }

  async getSenateVotes(
    congress: number,
    session: number,
    options: PaginationOptions = {}
  ): Promise<CongressApiResponse<CongressVote>> {
    const { limit = 250, offset = 0 } = options;
    return this.fetch<CongressApiResponse<CongressVote>>(
      `/senate-vote/${congress}/${session}`,
      {
        limit: limit.toString(),
        offset: offset.toString(),
      }
    );
  }

  async getVoteDetails(
    congress: number,
    chamber: 'house' | 'senate',
    rollCallNumber: number,
    session?: number
  ): Promise<{ vote: CongressVoteDetail }> {
    const endpoint =
      chamber === 'house'
        ? `/house-vote/${congress}/${rollCallNumber}`
        : `/senate-vote/${congress}/${session}/${rollCallNumber}`;
    return this.fetch<{ vote: CongressVoteDetail }>(endpoint);
  }
}

// Congress.gov API response types
export interface CongressMember {
  bioguideId: string;
  name: string;
  partyName: string;
  state: string;
  district?: number;
  terms: { item: Array<{ chamber: string; startYear: number; endYear?: number }> };
  depiction?: { imageUrl: string };
  updateDate: string;
  officialWebsiteUrl?: string;
}

export interface CongressMemberDetail extends CongressMember {
  firstName: string;
  lastName: string;
  directOrderName: string;
  birthYear?: string;
  officialWebsiteUrl?: string;
  identifiers?: {
    thomasId?: string;
    govTrackId?: number;
    openSecretsId?: string;
    fecIds?: string[];
  };
}

export interface CongressBill {
  congress: number;
  type: string;
  number: number;
  title: string;
  latestAction?: { actionDate: string; text: string };
  updateDate: string;
}

export interface CongressBillSummary {
  text: string;
  updateDate: string;
  versionCode: string;
  actionDate?: string;
  actionDesc?: string;
}

export interface CongressBillTextVersion {
  type: string;
  date: string;
  url?: string;
  formats?: Array<{ type: string; url: string }>;
}

export interface CongressBillDetail extends CongressBill {
  introducedDate: string;
  sponsors?: Array<{
    bioguideId: string;
    fullName: string;
    firstName?: string;
    lastName?: string;
    party?: string;
    state?: string;
  }>;
  cosponsors?: {
    count: number;
    countIncludingWithdrawnCosponsors?: number;
    url?: string;
  };
  policyArea?: { name: string };
  // Note: subjects and summaries are URL references in the API, not inline data
  // Use getBillSubjects() and getBillSummaries() to fetch them
  subjects?: {
    count: number;
    url: string;
  };
  summaries?: {
    count: number;
    url: string;
  };
  textVersions?: {
    count: number;
    url: string;
  };
  constitutionalAuthorityStatementText?: string;
  originChamber?: string;
  originChamberCode?: string;
}

export interface CongressVote {
  congress: number;
  chamber: string;
  rollCallNumber: number;
  sessionNumber: number;
  startDate: string; // ISO datetime from House API
  date?: string; // Alternative date field
  question?: string;
  voteQuestion?: string; // From House API
  result: string;
  legislationType?: string;
  legislationNumber?: string;
  bill?: { congress: number; type: string; number: number };
}

export interface CongressVoteDetail extends CongressVote {
  yeas: number;
  nays: number;
  present: number;
  notVoting: number;
  members: Array<{
    bioguideId: string;
    votePosition: string;
    party: string;
  }>;
}
