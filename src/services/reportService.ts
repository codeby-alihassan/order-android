import { DateFilterType, Sale, Purchase, Expense, CounterMovement, FinancialReportData } from '../types';
import { getSales } from './saleService';
import { getPurchases } from './purchaseService';
import { getExpenses } from './expenseService';
import { getAllCounterMovements } from './counterService';
import { isWithinDateRange, isDateInRange } from '../utils/dateUtils';
import { roundMoney } from '../utils/formatters';

export interface ReportSummary {
  filter: DateFilterType;
  customStart?: string;
  customEnd?: string;
  totalSales: number;
  completedSalesCount: number;
  cashSales: number;
  creditSales: number;
  bankSales: number;
  totalProfit: number;
  totalPurchases: number;
  purchasesCount: number;
  totalExpenses: number;
  expensesCount: number;
  netCashMovement: number;
  filteredSales: Sale[];
  filteredPurchases: Purchase[];
  filteredExpenses: Expense[];
  filteredMovements: CounterMovement[];
}

export async function generateReport(
  filter: DateFilterType,
  customStart?: string,
  customEnd?: string,
  referenceDate?: Date
): Promise<ReportSummary> {
  const allSales = await getSales();
  const allPurchases = await getPurchases();
  const allExpenses = await getExpenses();
  const allMovements = await getAllCounterMovements();

  // Filter sales
  const filteredSales = allSales.filter(
    (s) => isWithinDateRange(s.date, filter, customStart, customEnd, referenceDate)
  );

  const completedSales = filteredSales.filter((s) => s.status === 'Completed');

  let totalSales = 0;
  let cashSales = 0;
  let creditSales = 0;
  let bankSales = 0;
  let totalProfit = 0;

  for (const s of completedSales) {
    totalSales = roundMoney(totalSales + s.total);
    totalProfit = roundMoney(totalProfit + s.totalProfit);

    if (s.paymentMethod === 'Cash') {
      cashSales = roundMoney(cashSales + s.total);
    } else if (s.paymentMethod === 'Credit') {
      creditSales = roundMoney(creditSales + s.total);
    } else if (s.paymentMethod === 'Bank Transfer') {
      bankSales = roundMoney(bankSales + s.total);
    }
  }

  // Filter purchases
  const filteredPurchases = allPurchases.filter(
    (p) => isWithinDateRange(p.date, filter, customStart, customEnd, referenceDate)
  );

  const totalPurchases = roundMoney(
    filteredPurchases.reduce((acc, p) => acc + p.totalAmount, 0)
  );

  // Filter expenses
  const filteredExpenses = allExpenses.filter(
    (e) => isWithinDateRange(e.date, filter, customStart, customEnd, referenceDate)
  );

  const totalExpenses = roundMoney(
    filteredExpenses.reduce((acc, e) => acc + e.amount, 0)
  );

  // Filter counter movements for net cash movement
  const filteredMovements = allMovements.filter(
    (m) => isWithinDateRange(m.date, filter, customStart, customEnd, referenceDate)
  );

  // Opening Cash is initial float, not operational cash flow. Net cash movement in drawer during period:
  const netCashMovement = roundMoney(
    filteredMovements
      .filter((m) => m.type !== 'Opening Cash' && m.type !== 'Closing')
      .reduce((acc, m) => acc + m.amount, 0)
  );

  return {
    filter,
    customStart,
    customEnd,
    totalSales,
    completedSalesCount: completedSales.length,
    cashSales,
    creditSales,
    bankSales,
    totalProfit,
    totalPurchases,
    purchasesCount: filteredPurchases.length,
    totalExpenses,
    expensesCount: filteredExpenses.length,
    netCashMovement,
    filteredSales,
    filteredPurchases,
    filteredExpenses,
    filteredMovements,
  };
}

export async function generateFinancialReport(start?: Date, end?: Date): Promise<FinancialReportData> {
  const allSales = await getSales();
  const allPurchases = await getPurchases();
  const allExpenses = await getExpenses();

  const filteredSales = allSales.filter((s) => isDateInRange(s.date, start, end));
  const completedSales = filteredSales.filter((s) => s.status === 'Completed');
  const voidedSales = filteredSales.filter((s) => s.status === 'Voided');

  let totalSales = 0;
  let cashSalesTotal = 0;
  let creditSalesTotal = 0;
  let bankTransferSalesTotal = 0;
  let totalProfit = 0;

  const productAgg: Record<string, { productName: string; quantitySold: number; revenue: number; profit: number }> = {};

  for (const s of completedSales) {
    totalSales = roundMoney(totalSales + s.total);
    totalProfit = roundMoney(totalProfit + s.totalProfit);

    if (s.paymentMethod === 'Cash') {
      cashSalesTotal = roundMoney(cashSalesTotal + s.total);
    } else if (s.paymentMethod === 'Credit') {
      creditSalesTotal = roundMoney(creditSalesTotal + s.total);
    } else if (s.paymentMethod === 'Bank Transfer') {
      bankTransferSalesTotal = roundMoney(bankTransferSalesTotal + s.total);
    }

    for (const item of s.items) {
      if (!productAgg[item.productId]) {
        productAgg[item.productId] = {
          productName: item.productName,
          quantitySold: 0,
          revenue: 0,
          profit: 0,
        };
      }
      productAgg[item.productId].quantitySold += item.quantity;
      productAgg[item.productId].revenue = roundMoney(productAgg[item.productId].revenue + item.lineTotal);
      productAgg[item.productId].profit = roundMoney(productAgg[item.productId].profit + item.profit);
    }
  }

  const filteredPurchases = allPurchases.filter((p) => isDateInRange(p.date, start, end));
  const totalPurchases = roundMoney(filteredPurchases.reduce((acc, p) => acc + p.totalAmount, 0));

  const filteredExpenses = allExpenses.filter((e) => isDateInRange(e.date, start, end));
  const totalExpenses = roundMoney(filteredExpenses.reduce((acc, e) => acc + e.amount, 0));

  const netIncome = roundMoney(totalProfit - totalExpenses);

  const topProducts = Object.values(productAgg).sort((a, b) => b.quantitySold - a.quantitySold);

  return {
    totalSales,
    totalInvoicesCount: completedSales.length,
    voidedInvoicesCount: voidedSales.length,
    cashSalesTotal,
    creditSalesTotal,
    bankTransferSalesTotal,
    totalProfit,
    totalPurchases,
    totalExpenses,
    netIncome,
    completedSales,
    topProducts,
  };
}
