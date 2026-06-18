import { memo, useMemo } from "react";



import {

  FiTrendingDown,

  FiTrendingUp,

  FiCalendar,

  FiActivity,

} from "react-icons/fi";



import {

  getTotals,

  formatMoney,

} from "../../utils/transactionAnalytics";



import "../../styles/wallet/WalletQuickStats.css";



function WalletQuickStats({ transactions }) {

  const month = useMemo(

    () => getTotals(transactions, 30),

    [transactions]

  );

  const week = useMemo(

    () => getTotals(transactions, 7),

    [transactions]

  );

  const all = useMemo(

    () => getTotals(transactions),

    [transactions]

  );



  const cards = useMemo(() => [

    {

      label: "Расход за месяц",

      value: `${formatMoney(month.expense)} ₽`,

      icon: FiTrendingDown,

      tone: "expense",

    },

    {

      label: "Доход за месяц",

      value: `${formatMoney(month.income)} ₽`,

      icon: FiTrendingUp,

      tone: "income",

    },

    {

      label: "Расход за неделю",

      value: `${formatMoney(week.expense)} ₽`,

      icon: FiCalendar,

      tone: "neutral",

    },

    {

      label: "Всего операций",

      value: String(all.count),

      icon: FiActivity,

      tone: "neutral",

    },

  ], [month, week, all]);



  return (

    <section className="wallet-metrics-bar">

      {cards.map((card) => {

        const Icon = card.icon;



        return (

          <article

            key={card.label}

            className={`wallet-stat-card ${card.tone}`}

          >

            <div className="wallet-stat-icon">

              <Icon />

            </div>

            <div className="wallet-stat-content">

              <span>{card.label}</span>

              <strong>{card.value}</strong>

            </div>

          </article>

        );

      })}

    </section>

  );

}



export default memo(WalletQuickStats);

