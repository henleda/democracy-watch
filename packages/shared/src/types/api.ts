export interface ApiResponse<T> {
  data: T;
  meta?: ResponseMeta;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface ResponseMeta {
  requestId?: string;
  timestamp?: string;
}

export interface PaginationMeta extends ResponseMeta {
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

export interface ListOptions {
  limit?: number;
  offset?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface MemberListOptions extends ListOptions {
  state?: string;
  party?: string;
  chamber?: 'house' | 'senate';
  active?: boolean;
}
