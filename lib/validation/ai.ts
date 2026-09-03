import{z}from'zod';
export const aiRequestSchema=z.object({tradeId:z.string().uuid(),reviewType:z.enum(['PRE_TRADE','POST_TRADE'])});
export const aiReviewSchema=z.object({market_structure:z.string(),support_resistance:z.string(),setup_quality:z.number().min(0).max(100),risk_reward_comment:z.string(),plan_compliance:z.boolean(),warnings:z.array(z.string()),observations:z.array(z.string()),educational_summary:z.string(),what_went_well:z.array(z.string()).optional(),what_to_improve:z.array(z.string()).optional(),repeated_errors:z.array(z.string()).optional()});
