import { memo, useMemo, useState } from "react";

import {
  FiArrowUpRight,
  FiArrowDownRight,
} from "react-icons/fi";

import PeriodFilter from "../shared/PeriodFilter";
import {
  BALANCE_PERIOD_OPTIONS,
  createPeriodState,
  formatPeriodHint,
  getTotalsForPeriod,
} from "../../utils/periodUtils";

import { formatCurrency } from "../../utils/currency";

import "../../styles/wallet/BalanceCard.css";

function BalanceCard({
  transactions,
  initialBalance = 0,
  currency = "RUB",
  isShared = false,
  variant = "default",
}) {
  const [period, setPeriod] = useState(() =>
    createPeriodState("all")
  );

  const { income, expense, balance, savingsRate } =
    useMemo(() => {
      const totals = getTotalsForPeriod(transactions, period);
      const adjustedBalance =
        period.preset === "all"
          ? totals.balance + initialBalance
          : totals.balance;

      return {
        ...totals,
        balance: adjustedBalance,
      };
    }, [transactions, period, initialBalance]);

  const percent = savingsRate.toFixed(1);
  const isPositive = balance >= 0;
  const periodHint = formatPeriodHint(period);

  return (
    <div className={`balance-card${variant === "hero" ? " balance-card--hero" : ""}`}>
      <div className="balance-card-top">
        <p className="balance-label">
          {isShared ? "Общий баланс" : "Баланс"}
          <span className="balance-period-hint">
            {periodHint}
          </span>
        </p>

        <PeriodFilter
          value={period}
          onChange={setPeriod}
          options={BALANCE_PERIOD_OPTIONS}
          ariaLabel="Период баланса"
        />
      </div>

      <h1 className="balance-value">
        {formatCurrency(balance, currency)}
      </h1>

      <div className="balance-bottom">
        <div className="balance-stats">
          <div className="stat-item income-stat">
            <div className="stat-icon">
              <FiArrowUpRight />
            </div>

            <div>
              <strong>
                +{formatCurrency(income, currency)}
              </strong>
              <span>доход</span>
            </div>
          </div>

          <div className="stat-item expense-stat">
            <div className="stat-icon">
              <FiArrowDownRight />
            </div>

            <div>
              <strong>
                -{formatCurrency(expense, currency)}
              </strong>
              <span>расход</span>
            </div>
          </div>
        </div>

        <div
          className={
            isPositive
              ? "balance-percent positive-balance"
              : "balance-percent negative-balance"
          }
        >
          {isPositive ? "+" : ""}
          {percent}%
        </div>
      </div>
    </div>
  );
}

export default memo(BalanceCard);
