// Code generated - EDITING IS FUTILE. DO NOT EDIT.
//
// Generated by:
//     public/app/plugins/gen.go
// Using jennies:
//     TSTypesJenny
//     PluginTsTypesJenny
//
// Run 'make gen-cue' from repository root to regenerate.

import * as common from '@grafana/schema';

export const pluginVersion = "11.4.0-pre";

export interface Options {
  dedupStrategy: common.LogsDedupStrategy;
  displayedFields?: Array<string>;
  enableLogDetails: boolean;
  isFilterLabelActive?: unknown;
  /**
   * TODO: figure out how to define callbacks
   */
  onClickFilterLabel?: unknown;
  onClickFilterOutLabel?: unknown;
  onClickFilterOutString?: unknown;
  onClickFilterString?: unknown;
  onClickHideField?: unknown;
  onClickShowField?: unknown;
  prettifyLogMessage: boolean;
  showCommonLabels: boolean;
  showLabels: boolean;
  showLogContextToggle: boolean;
  showTime: boolean;
  sortOrder: common.LogsSortOrder;
  wrapLogMessage: boolean;
}

export const defaultOptions: Partial<Options> = {
  displayedFields: [],
};
