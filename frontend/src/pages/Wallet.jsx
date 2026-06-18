import {

  lazy,

  Suspense,

  useCallback,

  useEffect,

  useState,

} from "react";

import { FiPlus, FiUpload } from "react-icons/fi";



import api from "../api/api";



import Sidebar from "../components/layout/Sidebar";

import PageHeader from "../components/layout/PageHeader";

import TransactionList from "../components/wallet/TransactionList";

import BalanceCard from "../components/wallet/BalanceCard";

import WalletQuickStats from "../components/wallet/WalletQuickStats";

import TopCategoriesWidget from "../components/wallet/TopCategoriesWidget";

import GoalsPanel from "../components/recommendations/GoalsPanel";



import "../styles/pages/Wallet.css";



const WalletInsights = lazy(

  () => import("../components/wallet/WalletInsights")

);

const AddTransactionModal = lazy(

  () => import("../components/wallet/AddTransactionModal")

);

const ImportStatementModal = lazy(

  () => import("../components/wallet/ImportStatementModal")

);



function WalletWidgetFallback() {

  return (

    <div

      className="dashboard-widget-fallback"

      aria-hidden

    />

  );

}



function Wallet() {

  const [transactions, setTransactions] = useState([]);

  const [familyBudget, setFamilyBudget] = useState(null);

  const [isImportOpen, setIsImportOpen] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);

  const [walletRefreshKey, setWalletRefreshKey] = useState(0);



  const fetchTransactions = useCallback(async () => {

    try {

      const response = await api.get("/transactions");

      setTransactions(response.data);

    } catch (_) {}

  }, []);



  const refreshWalletData = useCallback(async () => {

    await fetchTransactions();

    setWalletRefreshKey((value) => value + 1);

  }, [fetchTransactions]);



  const fetchFamily = useCallback(async () => {

    try {

      const response = await api.get("/families/me");

      setFamilyBudget(response.data);

    } catch (_) {

      setFamilyBudget(null);

    }

  }, []);



  useEffect(() => {

    fetchTransactions();

    fetchFamily();

  }, [fetchTransactions, fetchFamily]);



  const openAddModal = useCallback(() => {

    setIsModalOpen(true);

  }, []);



  const closeAddModal = useCallback(() => {

    setIsModalOpen(false);

  }, []);



  const openImportModal = useCallback(() => {

    setIsImportOpen(true);

  }, []);



  const closeImportModal = useCallback(() => {

    setIsImportOpen(false);

  }, []);



  const currency = familyBudget?.currency || "RUB";



  return (

    <div className="dashboard-layout wallet-page">

      <Sidebar />



      <main className="dashboard-content app-page-panel wallet-content">

        <PageHeader

          title="Кошелёк"

          subtitle="Операции и накопления в одном месте"

          actions={

            <>

              <button

                type="button"

                className="wallet-action-btn primary"

                onClick={openAddModal}

              >

                <FiPlus />

                <span>Добавить</span>

              </button>

              <button

                type="button"

                className="wallet-action-btn"

                onClick={openImportModal}

              >

                <FiUpload />

                <span>Импорт</span>

              </button>

            </>

          }

        />



        <section className="wallet-hero">

          <BalanceCard

            variant="hero"

            transactions={transactions}

            initialBalance={familyBudget?.initial_balance || 0}

            currency={currency}

            isShared={Boolean(familyBudget)}

          />

          <GoalsPanel variant="wallet" />

        </section>



        <WalletQuickStats transactions={transactions} />



        <div className="wallet-body">

          <Suspense fallback={<WalletWidgetFallback />}>

            <WalletInsights refreshKey={walletRefreshKey} />

          </Suspense>



          <div className="wallet-split">

            <TransactionList

              compact

              transactions={transactions}

              currency={currency}

              isFamilyView={Boolean(familyBudget)}

              onAddTransaction={openAddModal}

              onImportStatement={openImportModal}

              onTransactionUpdated={refreshWalletData}

            />

            <TopCategoriesWidget transactions={transactions} />

          </div>

        </div>



        {isModalOpen && (

          <Suspense fallback={null}>

            <AddTransactionModal

              isOpen={isModalOpen}

              onClose={closeAddModal}

              onTransactionAdded={refreshWalletData}

            />

          </Suspense>

        )}



        {isImportOpen && (

          <Suspense fallback={null}>

            <ImportStatementModal

              isOpen={isImportOpen}

              onClose={closeImportModal}

              onTransactionsImported={refreshWalletData}

            />

          </Suspense>

        )}

      </main>

    </div>

  );

}



export default Wallet;

