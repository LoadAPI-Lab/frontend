import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query';

import {
    getScenariosGetQueryKey,
    getScenariosListQueryKey,
    scenariosCreate,
    scenariosDelete,
    scenariosGet,
    scenariosList,
    scenariosReplace,
} from '@/api/generated/endpoints/scenarios/scenarios';
import type { ScenarioListResponseDtoItem, ScenarioResponseDto } from '@/api/generated/model';

import { type ScenarioDraft, toConfig } from './scenario-draft';

export type ScenarioSummary = ScenarioListResponseDtoItem;
export type Scenario = ScenarioResponseDto;

export const scenariosQuery = queryOptions({
    queryKey: getScenariosListQueryKey(),
    queryFn: ({ signal }) => scenariosList({ signal }),
});

export const scenarioQuery = (id: string) =>
    queryOptions({
        queryKey: getScenariosGetQueryKey(id),
        queryFn: ({ signal }) => scenariosGet(id, { signal }),
    });

const summaryOf = ({ config: _config, ...summary }: Scenario): ScenarioSummary => summary;

export function useSaveScenario(onSaved: (scenario: Scenario, created: boolean) => void) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, draft }: { id: string | null; draft: ScenarioDraft }) => {
            const data = { name: draft.name.trim(), config: toConfig(draft) };
            const saved = id ? await scenariosReplace(id, data) : await scenariosCreate(data);
            return { saved, created: id === null };
        },
        onSuccess: async ({ saved, created }) => {
            queryClient.setQueryData(scenarioQuery(saved.id).queryKey, saved);
            queryClient.setQueryData(scenariosQuery.queryKey, (list) => {
                if (!list) {
                    return list;
                }
                const summary = summaryOf(saved);
                return created
                    ? [...list, summary]
                    : list.map((item) => (item.id === saved.id ? summary : item));
            });
            onSaved(saved, created);
            await queryClient.invalidateQueries({ queryKey: scenariosQuery.queryKey });
        },
    });
}

export function useDeleteScenario(onDeleted: (scenario: ScenarioSummary) => void) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (scenario: ScenarioSummary) => {
            await scenariosDelete(scenario.id);
            return scenario;
        },
        onSuccess: async (deleted) => {
            queryClient.setQueryData(scenariosQuery.queryKey, (list) =>
                list?.filter((item) => item.id !== deleted.id),
            );
            queryClient.removeQueries({ queryKey: scenarioQuery(deleted.id).queryKey });
            onDeleted(deleted);
            await queryClient.invalidateQueries({ queryKey: scenariosQuery.queryKey });
        },
    });
}
