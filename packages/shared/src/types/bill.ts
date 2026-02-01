export interface Bill {
  id: string;
  congress: number;
  billType: string;
  billNumber: number;
  congressId: string;
  title: string;
  shortTitle?: string;
  summary?: string;
  fullTextUrl?: string;
  sponsorId?: string;
  introducedDate?: string;
  latestAction?: string;
  latestActionDate?: string;
  becameLaw: boolean;
  lawNumber?: string;
  primaryPolicyAreaId?: number;
  policyAreaIds?: number[];
  createdAt: string;
  updatedAt: string;
}

export interface RollCall {
  id: string;
  congress: number;
  chamber: 'house' | 'senate';
  session: number;
  rollCallNumber: number;
  billId?: string;
  voteDate: string;
  voteTime?: string;
  voteQuestion?: string;
  voteType?: string;
  voteResult?: string;
  yeaTotal?: number;
  nayTotal?: number;
  presentTotal?: number;
  notVotingTotal?: number;
  republicanYea?: number;
  republicanNay?: number;
  democratYea?: number;
  democratNay?: number;
  sourceUrl?: string;
  createdAt: string;
}
