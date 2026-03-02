import { useMemo } from 'react';
import { useAuth } from '../AuthContext';

export function useDashboardData({ PROJECTS = [], CONTRACTS = [], PARTIES = [], SCHEDULES = [], PAYMENTS = [], MONTHLY = [] }) {
    const { profile, isSuperAdmin, isTenantAdmin, isGlobalRole } = useAuth();

    const dashboardData = useMemo(() => {
        // 1. Resolve User Role & Slicing
        // If not admin, they are a Member.
        const isMember = !isSuperAdmin && !isTenantAdmin;

        // Find the Party record for the member to filter their data
        const myParty = isMember
            ? PARTIES.find(p => p.email === profile?.email || p.id === (profile?.notes || '').split(' — ')[1])
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

        // 3. Prepare Chart Data (Duration of Project / Multi-month)
        const scheduleDates = filteredSchedules.map(s => s.dueDate).filter(Boolean);
        const now = new Date();
        const todayStr = now.toISOString().slice(0, 10);

        // Start from either 1 month ago or the first schedule date
        const startDate = scheduleDates.length
            ? new Date(Math.min(...scheduleDates.map(d => new Date(d))))
            : new Date(now.getFullYear(), now.getMonth(), 1);
        startDate.setDate(1);

        const endDate = scheduleDates.length
            ? new Date(Math.max(...scheduleDates.map(d => new Date(d))))
            : new Date(now.getFullYear(), now.getMonth() + 11, 1);
        endDate.setDate(1);

        const months = [];
        let curr = new Date(startDate);
        // Ensure at least 12 months from start or current
        const limitDate = new Date(startDate);
        limitDate.setMonth(limitDate.getMonth() + 11);
        const finalEnd = endDate > limitDate ? endDate : limitDate;

        while (curr <= finalEnd) {
            const label = curr.toLocaleString('default', { month: 'short', year: '2-digit' });
            const monthKey = curr.toISOString().slice(0, 7); // YYYY-MM

            const monthlySchedules = filteredSchedules.filter(s => s.dueDate && s.dueDate.startsWith(monthKey));

            const projectedIn = monthlySchedules
                .filter(s => s.direction === 'IN')
                .reduce((sum, s) => sum + Number(String(s.payment || 0).replace(/[^0-9.-]/g, '')), 0);
            const projectedOut = monthlySchedules
                .filter(s => s.direction === 'OUT')
                .reduce((sum, s) => sum + Number(String(s.payment || 0).replace(/[^0-9.-]/g, '')), 0);

            const actualIn = monthlySchedules
                .filter(s => s.status === 'Paid' && s.direction === 'IN')
                .reduce((sum, s) => sum + Number(String(s.payment || 0).replace(/[^0-9.-]/g, '')), 0);
            const actualOut = monthlySchedules
                .filter(s => s.status === 'Paid' && s.direction === 'OUT')
                .reduce((sum, s) => sum + Number(String(s.payment || 0).replace(/[^0-9.-]/g, '')), 0);

            months.push({
                name: label,
                projectedIn,
                projectedOut: Math.abs(projectedOut),
                actualIn,
                actualOut: Math.abs(actualOut)
            });
            curr.setMonth(curr.getMonth() + 1);
            if (months.length > 60) break;
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
                activeContractsCount: activeContracts.length
            },
            charts: {
                cashflow: months,
                diversification: pieData
            },
            recentActivity: filteredSchedules
                .filter(s => s.status === 'Due' || s.dueDate >= todayStr)
                .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
                .slice(0, 10),
            isMember,
            myParty
        };
    }, [PROJECTS, CONTRACTS, PARTIES, SCHEDULES, PAYMENTS, profile, isSuperAdmin, isTenantAdmin]);

    return dashboardData;
}
