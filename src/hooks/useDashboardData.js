import { useMemo } from 'react';
import { useAuth } from '../AuthContext';

export function useDashboardData({ PROJECTS = [], CONTRACTS = [], PARTIES = [], SCHEDULES = [], PAYMENTS = [], MONTHLY = [] }) {
    const { profile, isSuperAdmin, isTenantAdmin, isMember, isGlobalRole } = useAuth();

    const dashboardData = useMemo(() => {
        // 1. Resolve User Role & Slicing

        // Find the Party record for the member to filter their data
        const myParty = isMember
            ? (PARTIES.find(p => p.id === profile?.party_id || p.email === profile?.email || p.id === (profile?.notes || '').split(' — ')[1]) || { id: profile?.party_id })
            : null;

        const filteredContracts = isMember
            ? CONTRACTS.filter(c => c.party_id === myParty?.id)
            : CONTRACTS;

        const filteredProjects = isMember
            ? PROJECTS.filter(p => filteredContracts.some(c => c.project_id === p.id))
            : PROJECTS;

        const filteredSchedules = isMember
            ? SCHEDULES.filter(s => s.party_id === myParty?.id)
            : SCHEDULES;

        // 2. Calculate Key Metrics
        const totalAUM = filteredContracts.reduce((sum, c) => sum + Number(String(c.amount || 0).replace(/[^0-9.-]/g, '')), 0);

        const totalIncome = filteredSchedules
            .filter(s => s.status === 'Paid')
            .reduce((sum, s) => sum + Number(String(s.payment || 0).replace(/[^0-9.-]/g, '')), 0);

        const missedPayments = filteredSchedules.filter(s => s.status === 'Missed');
        const missedValue = missedPayments.reduce((sum, s) => sum + Number(String(s.payment || 0).replace(/[^0-9.-]/g, '')), 0);

        const activeContracts = filteredContracts.filter(c => c.status === 'Active');
        const avgYield = activeContracts.length > 0
            ? activeContracts.reduce((sum, c) => sum + Number(String(c.rate || 0).replace(/[^0-9.-]/g, '')), 0) / activeContracts.length
            : 0;

        // 2b. Calculate Trends
        const now = new Date();
        const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const prevAUM = filteredContracts
            .filter(c => {
                const created = new Date(c.created_at);
                return created < startOfThisMonth;
            })
            .reduce((sum, c) => sum + Number(String(c.amount || 0).replace(/[^0-9.-]/g, '')), 0);

        const aumTrend = prevAUM > 0 ? ((totalAUM - prevAUM) / prevAUM) * 100 : 0;

        // 3. Prepare Chart Data (Quarterly View)
        const scheduleDates = filteredSchedules.map(s => s.dueDate).filter(Boolean);
        const todayStr = now.toISOString().slice(0, 10);

        // Find date range
        const firstDate = scheduleDates.length
            ? new Date(Math.min(...scheduleDates.map(d => new Date(d))))
            : new Date(now.getFullYear(), now.getMonth(), 1);

        const lastDate = scheduleDates.length
            ? new Date(Math.max(...scheduleDates.map(d => new Date(d))))
            : new Date(now.getFullYear(), now.getMonth() + 11, 1);

        // Round to start of first quarter and end of last quarter
        const startDate = new Date(firstDate.getFullYear(), Math.floor(firstDate.getMonth() / 3) * 3, 1);
        const endDate = new Date(lastDate.getFullYear(), (Math.floor(lastDate.getMonth() / 3) + 1) * 3, 0);

        const quarters = [];
        let curr = new Date(startDate);

        // Ensure at least 4 quarters
        while (curr <= endDate || quarters.length < 4) {
            const qNum = Math.floor(curr.getMonth() / 3) + 1;
            const label = `Q${qNum} ${curr.getFullYear()}`;

            const qStart = new Date(curr.getFullYear(), curr.getMonth(), 1);
            const qEnd = new Date(curr.getFullYear(), curr.getMonth() + 3, 0);
            const qStartStr = qStart.toISOString().slice(0, 10);
            const qEndStr = qEnd.toISOString().slice(0, 10);

            const qSchedules = filteredSchedules.filter(s => s.dueDate && s.dueDate >= qStartStr && s.dueDate <= qEndStr);

            const projectedIn = qSchedules
                .filter(s => s.direction === 'IN')
                .reduce((sum, s) => sum + Number(String(s.payment || 0).replace(/[^0-9.-]/g, '')), 0);
            const projectedOut = qSchedules
                .filter(s => s.direction === 'OUT')
                .reduce((sum, s) => sum + Number(String(s.payment || 0).replace(/[^0-9.-]/g, '')), 0);

            const actualIn = qSchedules
                .filter(s => s.status === 'Paid' && s.direction === 'IN')
                .reduce((sum, s) => sum + Number(String(s.payment || 0).replace(/[^0-9.-]/g, '')), 0);
            const actualOut = qSchedules
                .filter(s => s.status === 'Paid' && s.direction === 'OUT')
                .reduce((sum, s) => sum + Number(String(s.payment || 0).replace(/[^0-9.-]/g, '')), 0);

            quarters.push({
                name: label,
                projectedIn,
                projectedOut: Math.abs(projectedOut),
                actualIn,
                actualOut: Math.abs(actualOut)
            });

            curr.setMonth(curr.getMonth() + 3);
            if (quarters.length > 20) break; // Cap at 5 years
        }

        // 4. Portfolio Diversification by Payment/Transaction Type
        const diversificationMap = {};
        filteredSchedules.forEach(s => {
            const type = s.type || 'Other';
            diversificationMap[type] = (diversificationMap[type] || 0) + Number(String(s.payment || 0).replace(/[^0-9.-]/g, ''));
        });
        const pieData = Object.keys(diversificationMap).map(name => ({
            name,
            value: Math.abs(diversificationMap[name])
        })).sort((a, b) => b.value - a.value);

        return {
            metrics: {
                totalAUM,
                totalIncome,
                missedCount: missedPayments.length,
                missedValue,
                avgYield,
                activeContractsCount: activeContracts.length,
                aumTrend
            },
            charts: {
                cashflow: quarters,
                diversification: pieData
            },
            recentActivity: filteredSchedules
                .filter(s => s.status === 'Due' || s.dueDate >= todayStr)
                .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
                .slice(0, 10),
            isMember,
            myParty
        };
    }, [PROJECTS, CONTRACTS, PARTIES, SCHEDULES, PAYMENTS, profile, isSuperAdmin, isTenantAdmin, isMember]);

    return dashboardData;
}
