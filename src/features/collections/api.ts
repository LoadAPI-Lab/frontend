import { queryOptions } from '@tanstack/react-query';

import {
    apiSpecsGet,
    apiSpecsList,
    getApiSpecsGetQueryKey,
    getApiSpecsListQueryKey,
} from '@/api/generated/endpoints/api-specs/api-specs';
import type {
    ApiSpecResponseDto,
    ApiSpecResponseDtoEndpointsItem,
    ApiSpecResponseDtoServersItem,
    ApiSpecSummaryResponseDto,
} from '@/api/generated/model';

export type ApiSpecSummary = ApiSpecSummaryResponseDto;
export type ApiSpec = ApiSpecResponseDto;
export type Endpoint = ApiSpecResponseDtoEndpointsItem;
export type ApiSpecServer = ApiSpecResponseDtoServersItem;

export const apiSpecKeys = {
    all: getApiSpecsListQueryKey(),
    detail: (id: string) => getApiSpecsGetQueryKey(id),
};

export const apiSpecsQuery = queryOptions({
    queryKey: apiSpecKeys.all,
    queryFn: ({ signal }) => apiSpecsList({ signal }),
});

export const apiSpecQuery = (id: string) =>
    queryOptions({
        queryKey: apiSpecKeys.detail(id),
        queryFn: ({ signal }) => apiSpecsGet(id, { signal }),
        staleTime: 5 * 60_000,
    });

export const isUsableServer = (server: ApiSpecServer) => server.relative !== true;
