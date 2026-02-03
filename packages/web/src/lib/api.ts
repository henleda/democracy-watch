// API_URL is server-side runtime variable, NEXT_PUBLIC_API_URL is build-time
// For SSR, we need the full URL; for client-side, /api works via rewrites
function getApiBase(): string {
  // Server-side: use API_URL (runtime) or NEXT_PUBLIC_API_URL (build-time)
  if (typeof window === 'undefined') {
    return process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || '/api';
  }
  // Client-side: use NEXT_PUBLIC_API_URL or /api (which gets rewritten)
  return process.env.NEXT_PUBLIC_API_URL || '/api';
}

interface ApiResponse<T> {
  data: T;
  meta?: {
    total?: number;
    offset?: number;
    limit?: number;
  };
}

async function fetchApi<T>(endpoint: string): Promise<T> {
  const apiBase = getApiBase();
  const res = await fetch(`${apiBase}${endpoint}`, {
    next: { revalidate: 300 }, // Cache for 5 minutes
  });

  if (!res.ok) {
    throw new Error(`API error: ${res.status}`);
  }

  return res.json();
}

export interface MemberListItem {
  id: string;
  bioguideId: string;
  fullName: string;
  party: 'Republican' | 'Democrat' | 'Independent';
  stateCode: string;
  district?: string;
  chamber: 'house' | 'senate';
  isActive: boolean;
  deviationScore?: number;
  partyAlignmentScore?: number;
}

export interface Member extends MemberListItem {
  firstName?: string;
  lastName?: string;
  websiteUrl?: string;
  twitterHandle?: string;
  totalVotes?: number;
  promisesTracked?: number;
}

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

export interface Vote {
  id: string;
  memberId: string;
  rollCallId: string;
  position: 'Yea' | 'Nay' | 'Present' | 'Not Voting';
  voteDate: string;
  billId?: string;
  createdAt: string;
  rollCall: {
    id: string;
    congress: number;
    chamber: string;
    rollCallNumber: number;
    voteQuestion?: string;
    voteResult?: string;
  };
  bill?: {
    id: string;
    title: string;
    billType: string;
    billNumber: number;
  };
}

export async function getMembersByZip(
  zipCode: string
): Promise<ApiResponse<ZipCodeResult>> {
  return fetchApi(`/v1/members/by-zip/${zipCode}`);
}

export async function getMembers(params?: {
  state?: string;
  party?: string;
  chamber?: string;
  limit?: number;
  offset?: number;
}): Promise<ApiResponse<MemberListItem[]>> {
  const searchParams = new URLSearchParams();
  if (params?.state) searchParams.set('state', params.state);
  if (params?.party) searchParams.set('party', params.party);
  if (params?.chamber) searchParams.set('chamber', params.chamber);
  if (params?.limit) searchParams.set('limit', params.limit.toString());
  if (params?.offset) searchParams.set('offset', params.offset.toString());

  const query = searchParams.toString();
  return fetchApi(`/v1/members${query ? `?${query}` : ''}`);
}

export async function getMember(memberId: string): Promise<ApiResponse<Member>> {
  return fetchApi(`/v1/members/${memberId}`);
}

export async function getMemberVotes(
  memberId: string,
  params?: { limit?: number; offset?: number }
): Promise<ApiResponse<Vote[]>> {
  const searchParams = new URLSearchParams();
  if (params?.limit) searchParams.set('limit', params.limit.toString());
  if (params?.offset) searchParams.set('offset', params.offset.toString());

  const query = searchParams.toString();
  return fetchApi(`/v1/members/${memberId}/votes${query ? `?${query}` : ''}`);
}
