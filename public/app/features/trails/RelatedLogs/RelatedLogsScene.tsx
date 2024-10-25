import {
  CustomVariable,
  PanelBuilders,
  SceneFlexItem,
  SceneFlexLayout,
  sceneGraph,
  SceneObject,
  SceneObjectBase,
  SceneQueryRunner,
  SceneVariableSet,
  VariableDependencyConfig,
  VariableValueSelectors,
  type SceneComponentProps,
  type SceneObjectState,
  type SceneVariable,
} from '@grafana/scenes';
import { Stack } from '@grafana/ui';

import {
  fetchAndExtractLokiRecordingRules,
  getLogsQueryForMetric,
  getLogsUidOfMetric,
  type ExtractedRecordingRules,
} from '../Integrations/logsIntegration';
import { VAR_LOGS_DATASOURCE, VAR_LOGS_DATASOURCE_EXPR, VAR_METRIC_EXPR } from '../shared';

import { NoRelatedLogsScene } from './NoRelatedLogsFoundScene';

export interface RelatedLogsSceneState extends SceneObjectState {
  controls: SceneObject[];
  body: SceneFlexLayout;
  lokiRecordingRules: ExtractedRecordingRules;
}

const LOGS_PANEL_CONTAINER_KEY = 'related_logs/logs_panel_container';
const RELATED_LOGS_QUERY_KEY = 'related_logs/logs_query';

export class RelatedLogsScene extends SceneObjectBase<RelatedLogsSceneState> {
  constructor(state: Partial<RelatedLogsSceneState>) {
    super({
      controls: [],
      body: new SceneFlexLayout({
        direction: 'column',
        height: '400px',
        children: [
          new SceneFlexItem({
            key: LOGS_PANEL_CONTAINER_KEY,
            body: undefined,
          }),
        ],
      }),
      lokiRecordingRules: {},
      ...state,
    });

    this.addActivationHandler(this.onActivate.bind(this));
  }

  private onActivate() {
    fetchAndExtractLokiRecordingRules().then((lokiRecordingRules) => {
      const selectedMetric = sceneGraph.interpolate(this, VAR_METRIC_EXPR);
      const lokiDatasources = getLogsUidOfMetric(selectedMetric, lokiRecordingRules);
      const logsPanelContainer = sceneGraph.findByKeyAndType(this, LOGS_PANEL_CONTAINER_KEY, SceneFlexItem);

      if (!lokiDatasources?.length) {
        logsPanelContainer.setState({
          body: new NoRelatedLogsScene({}),
        });
      } else {
        logsPanelContainer.setState({
          body: PanelBuilders.logs()
            .setTitle('Logs')
            .setData(
              new SceneQueryRunner({
                datasource: { uid: VAR_LOGS_DATASOURCE_EXPR },
                queries: [],
                key: RELATED_LOGS_QUERY_KEY,
              })
            )
            .build(),
        });
        this.setState({
          $variables: new SceneVariableSet({
            variables: [
              new CustomVariable({
                name: VAR_LOGS_DATASOURCE,
                label: 'Logs data source',
                query: lokiDatasources?.map((ds) => `${ds.name} : ${ds.uid}`).join(','),
              }),
            ],
          }),
          controls: [new VariableValueSelectors({ layout: 'vertical' })],
          lokiRecordingRules,
        });
      }
    });
  }

  protected _variableDependency = new VariableDependencyConfig(this, {
    variableNames: [VAR_LOGS_DATASOURCE],
    onReferencedVariableValueChanged: (variable: SceneVariable) => {
      const { name } = variable.state;

      if (name === VAR_LOGS_DATASOURCE) {
        const selectedMetric = sceneGraph.interpolate(this, VAR_METRIC_EXPR);
        const selectedDatasourceUid = sceneGraph.interpolate(this, VAR_LOGS_DATASOURCE_EXPR);
        const lokiQuery = getLogsQueryForMetric(selectedMetric, selectedDatasourceUid, this.state.lokiRecordingRules);

        if (lokiQuery) {
          const relatedLogsQuery = sceneGraph.findByKeyAndType(this, RELATED_LOGS_QUERY_KEY, SceneQueryRunner);
          relatedLogsQuery.setState({
            queries: [
              {
                refId: 'A',
                expr: lokiQuery,
                maxLines: 100,
              },
            ],
          });
        }
      }
    },
  });

  static readonly Component = ({ model }: SceneComponentProps<RelatedLogsScene>) => {
    const { controls, body } = model.useState();

    return (
      <div>
        <Stack gap={1} direction={'column'} grow={1}>
          {controls && (
            <Stack gap={1}>
              {controls.map((control) => (
                <control.Component key={control.state.key} model={control} />
              ))}
            </Stack>
          )}
          <body.Component model={body} />
        </Stack>
      </div>
    );
  };
}

export function buildRelatedLogsScene() {
  return new RelatedLogsScene({});
}
