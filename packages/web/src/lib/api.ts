const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api';

interface ApiResponse<T> {
  data: T;
  meta?: {
    total?: number;
    offset?: number;
    limit?: number;
  };
}

async function fetchApi<T>(endpoint: string): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    next: { revalidate: 300 }, // Cache for 5 minutes
  });

  if (!res.ok) {
    throw new Error(`API error: ${res.status}`);
  }

  return res.json();
}

export interface MemberListItem {
  id: string;
  bioguide_id: string;
  first_name: string;
  last_name: string;
  party: string;
  state: string;
  district?: number;
  chamber: 'House' | 'Senate';
  photo_url?: string;
}

export interface Member extends MemberListItem {
  title?: string;
  phone?: string;
  website?: string;
  twitter?: string;
  facebook?: string;
  office_address?: string;
  next_election?: number;
}

export interface Vote {
  id: string;
  roll_call_id: string;
  bill_id?: string;
  bill_title?: string;
  vote_date: string;
  position: 'Yea' | 'Nay' | 'Present' | 'Not Voting';
  vote_question?: string;
  vote_result?: string;
}

export async function getMembersByZip(
  zipCode: string
): Promise<ApiResponse<MemberListItem[]>> {
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
