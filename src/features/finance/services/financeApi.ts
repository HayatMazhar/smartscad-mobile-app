import { baseApi } from '../../../store/baseApi';

// Plan: legacy_api_parity_rollout 5.2 / 5.3 / 5.4
//
// Finance API client (mobile). Backed by the mobile API:
//   GET /api/v1/finance/dashboard
//   GET /api/v1/finance/cash-flows?year=&search=&pageNo=&pageSize=
//   GET /api/v1/finance/cash-flows/{id}
//   GET /api/v1/finance/accounts-expenditure?year=
//
// Each endpoint returns a multi result-set envelope from the underlying SP:
//   dashboard            -> { kpi, summary, contracts }
//   cash-flows           -> { items, paging }
//   cash-flows/{id}      -> { cashFlow, payments, contracts }
//   accounts-expenditure -> { accounts, totals }

function qs(o: Record<string, unknown>) {
  const sp = new URLSearchParams();
  Object.entries(o).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') sp.set(k, String(v));
  });
  const s = sp.toString();
  return s ? `?${s}` : '';
}

export type FinanceDashboardKpi = {
  ApproveBudget: number;
  ActualPayments: number;
  ReservedAmount: number;
  RemainingAmount: number;
  PerformancePct: number;
  ScopeFlowsCount: number;
  Year: number;
  ResourcesCount: number;
};

export type FinanceDashboardSummary = {
  TotalExpectedPaymentTillNow: number;
  TotalActualPaymentTillNow: number;
  AveragePerformance: number;
};

export type FinanceDashboardContracts = {
  TotalContracts: number;
  NoPayments: number;
  PaymentsInprogress: number;
  PaymentsCompleted: number;
};

export type FinanceDashboardResponse = {
  kpi: FinanceDashboardKpi[];
  summary: FinanceDashboardSummary[];
  contracts: FinanceDashboardContracts[];
};

export type FinanceCashFlowRow = {
  ID: number;
  AccountID: number;
  AccountNo?: string;
  AccountName?: string;
  Year: number;
  ProjectManager: string;
  ProjectName?: string;
  ProjectNameAr?: string;
  DisplayName?: string;
  ProjectType?: number;
  ProjectCode?: string;
  CostCenter?: string;
  Program?: string;
  SubProgram?: string;
  ProgramName?: string;
  SubProgramName?: string;
  StatusID?: number;
  ApproveBudget: number;
  InitialApprovedBudget?: number;
  LPONumber?: string;
  RequisitionNumber?: string;
  ActualPayments: number;
  ReservedAmount: number;
  RemainingAmount: number;
  PerformancePct: number;
  Created?: string;
  Modified?: string;
};

export type FinancePagingMeta = {
  PageNo: number;
  PageSize: number;
  TotalRows: number;
  TotalPages: number;
};

export type FinanceCashFlowsResponse = {
  items: FinanceCashFlowRow[];
  paging: FinancePagingMeta[];
};

export type FinanceCashFlowDetailRow = FinanceCashFlowRow & {
  M1?: number; M2?: number; M3?: number; M4?: number; M5?: number; M6?: number;
  M7?: number; M8?: number; M9?: number; M10?: number; M11?: number; M12?: number;
  RevisedBudgetJan?: number; RevisedBudgetFeb?: number; RevisedBudgetMar?: number;
  RevisedBudgetApr?: number; RevisedBudgetMay?: number; RevisedBudgetJun?: number;
  RevisedBudgetJul?: number; RevisedBudgetAug?: number; RevisedBudgetSep?: number;
  RevisedBudgetOct?: number; RevisedBudgetNov?: number; RevisedBudgetDec?: number;
  Comments?: string;
  Reason1?: string;
  Justification?: string;
  CreatedBy?: string;
  ModifiedBy?: string;
};

export type FinanceCashFlowPayment = {
  ID: number;
  TicketID?: number;
  PaymentAmount: number;
  TotalAmount?: number;
  TicketCreatedBy?: string;
  Created?: string;
  Modified?: string;
  ModifiedBy?: string;
  Comments?: string;
};

export type FinanceCashFlowContract = {
  ID: number;
  Name?: string;
  ContractNo?: string;
  CompanyName?: string;
  StartDate?: string;
  EndDate?: string;
  ContractValue: number;
  RemainingAmount: number;
  PaidAmount: number;
  ContractManagerID?: string;
  ContractManager2ID?: string;
};

export type FinanceCashFlowDetailResponse = {
  cashFlow: FinanceCashFlowDetailRow[];
  payments: FinanceCashFlowPayment[];
  contracts: FinanceCashFlowContract[];
};

export type FinanceAccountRow = {
  AccountID: number;
  AccountNo?: string;
  AccountName?: string;
  AccountChapterID?: number;
  AccountGroupID?: number;
  CashFlowsCount: number;
  ApproveBudget: number;
  ActualPayments: number;
  ReservedAmount: number;
  RemainingAmount: number;
  PerformancePct: number;
};

export type FinanceAccountsTotals = {
  Year: number;
  AccountsCount: number;
  CashFlowsCount: number;
  ApproveBudget: number;
  ActualPayments: number;
  ReservedAmount: number;
};

export type FinanceAccountsExpenditureResponse = {
  accounts: FinanceAccountRow[];
  totals: FinanceAccountsTotals[];
};

export const financeApi = baseApi.injectEndpoints({
  endpoints: (b) => ({
    v2GetFinanceDashboard: b.query<FinanceDashboardResponse, { year?: number; lang?: string } | void>({
      query: (a) => `/finance/dashboard${qs((a ?? {}) as any)}`,
      providesTags: ['FinanceV2'],
    }),
    v2GetCashFlows: b.query<FinanceCashFlowsResponse, {
      year?: number;
      search?: string;
      pageNo?: number;
      pageSize?: number;
      lang?: string;
    } | void>({
      query: (a) => `/finance/cash-flows${qs((a ?? {}) as any)}`,
      providesTags: ['FinanceV2'],
    }),
    v2GetCashFlowDetail: b.query<FinanceCashFlowDetailResponse, { id: number; lang?: string }>({
      query: ({ id, lang }) => `/finance/cash-flows/${id}${lang ? `?lang=${lang}` : ''}`,
      providesTags: (_r, _e, a) => [{ type: 'FinanceV2', id: a.id }],
    }),
    v2GetAccountsExpenditure: b.query<FinanceAccountsExpenditureResponse, { year?: number; lang?: string } | void>({
      query: (a) => `/finance/accounts-expenditure${qs((a ?? {}) as any)}`,
      providesTags: ['FinanceV2'],
    }),
  }),
  overrideExisting: false,
});

export const {
  useV2GetFinanceDashboardQuery,
  useV2GetCashFlowsQuery,
  useV2GetCashFlowDetailQuery,
  useV2GetAccountsExpenditureQuery,
} = financeApi;
