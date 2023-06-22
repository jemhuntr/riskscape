import { error } from '@sveltejs/kit';
import { prisma } from '$lib/server';
import type { DamageAssessmentLog, InspectionScope } from '$lib/stores/selectedBuilding.js';

export async function POST({ params, request }) {
    const id = parseInt(params.id);
    if (isNaN(id)) throw error(400, 'Invalid building ID.');

    const logId = parseInt(params.logId);
    if (isNaN(logId)) throw error(400, 'Invalid preview log ID.');

    const building = await prisma.building.findFirst({ where: { id } });
    if (!building) throw error(400, 'Building not found.');

    const log = await prisma.assessmentLog.findFirst({ where: { id: logId } });
    if (!log) throw error(400, 'Assessment log not found.');

    // validate log inspection date is within the editable period
    const now = new Date().getTime();
    const limit = 1000 * 60 * 60 * 24 * 14; // 14 days
    if (now - log.inspectionDate.getTime() >= limit) throw error(400, 'Sorry, this entry has exceeded the allowable 14-day edit window. Further changes are now disabled.');

    const data: Partial<DamageAssessmentLog> = await request.json();

    // validate & build incoming update data
    if (!data.inspectionScope) throw error(400, 'Invalid inspection data.');

    const scope = JSON.parse(log.inspectionScope) as InspectionScope;
    scope.drawings = data.inspectionScope.drawings;

    try {
        const log = await prisma.assessmentLog.update({
            where: {
                id: logId
            },
            data: {
                inspectionScope: JSON.stringify(scope, null, 2),
            }
        });
        return new Response(JSON.stringify(log), {
            headers: {
                'Content-Type': 'application/json'
            }
        });
    } catch(err) {
        if (err instanceof Error) throw error(400, err.message);
        throw error(400, 'Failed to update damage assessment log.');
    }
}
