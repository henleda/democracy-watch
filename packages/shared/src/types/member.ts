export interface Member {
  id: string;
  bioguideId: string;
  thomasId?: string;
  govtrackId?: number;
  openSecretsId?: string;
  fecId?: string;
  firstName: string;
  lastName: string;
  fullName: string;
  party: 'Republican' | 'Democrat' | 'Independent';
  stateCode: string;
  chamber: 'house' | 'senate';
  district?: string;
  currentTermStart?: string;
  currentTermEnd?: string;
  isActive: boolean;
  websiteUrl?: string;
  twitterHandle?: string;
  totalVotes: number;
  promisesTracked: number;
  deviationScore?: number;
  partyAlignmentScore?: number;
  createdAt: string;
  updatedAt: string;
}

export interface MemberListItem {
  id: string;
  bioguideId: string;
  fullName: string;
  party: 'Republican' | 'Democrat' | 'Independent';
  stateCode: string;
  chamber: 'house' | 'senate';
  district?: string;
  isActive: boolean;
  deviationScore?: number;
  partyAlignmentScore?: number;
}

export interface Committee {
  id: string;
  code: string;
  name: string;
  chamber: 'house' | 'senate' | 'joint';
  committeeType: 'standing' | 'select' | 'joint' | 'subcommittee';
  parentCommitteeId?: string;
}

export interface CommitteeMembership {
  id: string;
  memberId: string;
  committeeId: string;
  role: 'chair' | 'ranking_member' | 'member';
  congress: number;
}
