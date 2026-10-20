import mongoose, { Schema, Document, Model } from "mongoose";
import { ICampaignStep, STEP_TYPES, StepType } from "./Campaign";

export interface IAutomationFlow extends Document {
  userId: string;
  name: string;
  description: string;
  steps: ICampaignStep[];
  config?: Record<string, any>;
  isTemplate: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const StepSchema = new Schema<ICampaignStep>(
  {
    type: { type: String, enum: STEP_TYPES, required: true },
    delayDays: { type: Number, default: 0, min: 0 },
    template: { type: String, default: "" },
  },
  { _id: false }
);

const AutomationFlowSchema = new Schema<IAutomationFlow>(
  {
    userId: { type: String, required: true, index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    steps: { type: [StepSchema], default: [] },
    config: { type: Schema.Types.Mixed, default: {} },
    isTemplate: { type: Boolean, default: false },
  },
  { timestamps: true }
);

AutomationFlowSchema.index({ userId: 1, createdAt: -1 });

const AutomationFlow: Model<IAutomationFlow> =
  mongoose.models.AutomationFlow ||
  mongoose.model<IAutomationFlow>("AutomationFlow", AutomationFlowSchema);

export default AutomationFlow;
