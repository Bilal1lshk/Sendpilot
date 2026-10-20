export const PIPELINE_STAGES = ["new", "contacted", "replied", "meeting", "not_interested"] as const;

export type PipelineStage = (typeof PIPELINE_STAGES)[number];
