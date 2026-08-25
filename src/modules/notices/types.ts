export interface Notice {
  id: string;
  message: string;
  authorUsername: string;
  showOnHome: boolean;
  isAutomatic: boolean;
  createdAt: string;
}

export interface NoticeInput {
  message: string;
  showOnHome?: boolean;
}

export interface NoticeListParams {
  page?: number;
  pageSize?: number;
  startDate?: string;
  endDate?: string;
}

export interface NoticeListResult {
  items: Notice[];
  total: number;
  page: number;
  pageSize: number;
}
