import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/supabase/auth';
import { aiRequestSchema, aiReviewSchema } from '@/lib/validation/ai';

const DEFAULT_GROQ_MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct';

const responseShape = {
  market_structure: 'string', support_resistance: 'string', setup_quality: 'number from 0 to 100',
  risk_reward_comment: 'string', plan_compliance: 'boolean', warnings: ['string'], observations: ['string'],
  educational_summary: 'string', what_went_well: ['string'], what_to_improve: ['string'], repeated_errors: ['string']
};

type GroqResponse = { choices?: Array<{ message?: { content?: string | null } }> };

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = aiRequestSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'INVALID_INPUT' }, { status: 400 });

  const groqApiKey = process.env.GROQ_API_KEY;
  if (!groqApiKey) return NextResponse.json({ error: 'GROQ_NOT_CONFIGURED' }, { status: 503 });

  const { supabase } = await requireUser();
  const { data: allowed } = await supabase.rpc('consume_ai_rate_limit', { p_limit: 10, p_window_minutes: 60 });
  if (!allowed) return NextResponse.json({ error: 'AI_RATE_LIMIT' }, { status: 429 });

  const { data: trade, error } = await supabase
    .from('trades').select('*,instrument:instruments(display_name),strategy:strategies(name)')
    .eq('id', parsed.data.tradeId).single();
  if (error || !trade) return NextResponse.json({ error: 'TRADE_NOT_FOUND' }, { status: 404 });

  let imageUrl: string | null = null;
  if (trade.analysis_image_url) {
    const extension = trade.analysis_image_url.split('.').pop()?.toLowerCase();
    if (extension === 'jpg' || extension === 'jpeg' || extension === 'png') {
      const { data } = await supabase.storage.from('trade-images').createSignedUrl(trade.analysis_image_url, 300);
      imageUrl = data?.signedUrl ?? null;
    }
  }

  const context = {
    activo: trade.instrument?.display_name, direction: trade.direction, timeframe: trade.timeframe,
    entry: trade.entry_price, stop_loss_price: trade.stop_loss_price, stop_loss_points: trade.stop_loss_points,
    take_profit_price: trade.take_profit_price, take_profit_points: trade.take_profit_points, rr: trade.rr_planned,
    notes: trade.notes, strategy: trade.strategy?.name, status: trade.status, result_usd: trade.pnl_usd,
    followed_plan: trade.followed_plan, emotion_before: trade.emotion_before, emotion_after: trade.emotion_after
  };
  const prompt = [
    'Actúa como revisor educativo de disciplina de trading.',
    'No des órdenes ni señales de compra o venta y no modifiques las reglas de riesgo.',
    'Evalúa la calidad del setup, la estructura visible, soportes y resistencias, R:R y cumplimiento del plan.',
    `Tipo de revisión: ${parsed.data.reviewType}. Datos: ${JSON.stringify(context)}.`,
    `Responde únicamente con un objeto JSON válido que siga exactamente esta estructura: ${JSON.stringify(responseShape)}.`
  ].join(' ');

  const content: Array<Record<string, unknown>> = [{ type: 'text', text: prompt }];
  if (imageUrl) content.push({ type: 'image_url', image_url: { url: imageUrl } });

  const model = process.env.GROQ_MODEL || DEFAULT_GROQ_MODEL;
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${groqApiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model, temperature: 0.2, response_format: { type: 'json_object' },
      messages: [{ role: 'user', content }]
    })
  });
  if (!response.ok) {
    return NextResponse.json({ error: 'GROQ_REQUEST_FAILED', detail: (await response.text()).slice(0, 500) }, { status: 502 });
  }

  const raw = (await response.json()) as GroqResponse;
  const text = raw.choices?.[0]?.message?.content;
  if (!text) return NextResponse.json({ error: 'GROQ_EMPTY_RESPONSE' }, { status: 502 });

  let review;
  try { review = aiReviewSchema.parse(JSON.parse(text)); }
  catch { return NextResponse.json({ error: 'GROQ_INVALID_STRUCTURED_RESPONSE' }, { status: 502 }); }

  await supabase.rpc('save_ai_trade_review', {
    p_trade_id: trade.id, p_review_type: parsed.data.reviewType, p_model: model, p_response: review
  });
  return NextResponse.json({
    review, imageAnalyzed: Boolean(imageUrl),
    note: trade.analysis_image_url && !imageUrl
      ? 'La evidencia WEBP se conserva, pero el análisis visual de Groq requiere una imagen JPG o PNG.' : null
  });
}
