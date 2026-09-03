import {NextResponse}from'next/server';import{saveTradingPlanSettings}from'@/lib/server/trading-plan';
export async function PUT(r:Request){try{return NextResponse.json(await saveTradingPlanSettings(await r.json()))}catch(e){return NextResponse.json({error:e instanceof Error?e.message:'ERROR'},{status:400})}}
