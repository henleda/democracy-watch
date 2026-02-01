export type VotePosition = 'Yea' | 'Nay' | 'Present' | 'Not Voting';

export interface Vote {
  id: string;
  memberId: string;
  rollCallId: string;
  position: VotePosition;
  voteDate: string;
  billId?: string;
  createdAt: string;
}

export interface MemberVote extends Vote {
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
