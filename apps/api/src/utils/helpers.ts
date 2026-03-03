import type { ApiResponse, PaginatedResponse } from '@pedirei/shared';

export function success<T>(data: T): ApiResponse<T> {
  return { success: true, data };
}

export function paginated<T>(
  data: T[],
  total: number,
  page: number,
  limit: number,
): PaginatedResponse<T> {
  return { data, total, page, limit };
}

export function error(message: string): ApiResponse {
  return { success: false, error: message };
}

export function errorResponse(message: string, _statusCode?: number): ApiResponse {
  return { success: false, error: message };
}

export function parsePagination(query: { page?: string; limit?: string }) {
  const page = Math.max(1, parseInt(query.page || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(query.limit || '20', 10)));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}
