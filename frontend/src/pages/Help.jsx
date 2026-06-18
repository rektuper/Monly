import { useContext, useMemo, useState } from "react";
import { FiChevronRight, FiHelpCircle } from "react-icons/fi";

import { AuthContext } from "../context/AuthContext";
import {
  getArticlesForUser,
  getCategoriesForUser,
} from "../data/helpArticles";

import Sidebar from "../components/layout/Sidebar";
import PageHeader from "../components/layout/PageHeader";
import HelpArticleModal from "../components/help/HelpArticleModal";

import "../styles/pages/Help.css";

function Help() {
  const { user } = useContext(AuthContext);
  const isAdmin = user?.role === "admin";

  const categories = useMemo(
    () => getCategoriesForUser(isAdmin),
    [isAdmin]
  );

  const articles = useMemo(
    () => getArticlesForUser(isAdmin),
    [isAdmin]
  );

  const [activeArticle, setActiveArticle] = useState(null);

  return (
    <div className="dashboard-layout help-page">
      <Sidebar />

      <main className="dashboard-content app-page-panel help-content">
        <PageHeader
          icon={FiHelpCircle}
          title="Помощь"
          subtitle="Инструкции по кошельку, импорту, AI-категоризации и аналитике"
        />

        <div className="help-sections">
          {categories.map((category) => {
            const items = articles.filter(
              (article) => article.category === category.id
            );

            if (items.length === 0) {
              return null;
            }

            return (
              <section
                key={category.id}
                className="help-category-block"
              >
                <h2>{category.label}</h2>

                <ul className="help-article-list">
                  {items.map((article) => (
                    <li key={article.id}>
                      <button
                        type="button"
                        className="help-article-item"
                        onClick={() =>
                          setActiveArticle(article)
                        }
                      >
                        <span>{article.title}</span>
                        <FiChevronRight />
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      </main>

      <HelpArticleModal
        article={activeArticle}
        isOpen={!!activeArticle}
        onClose={() => setActiveArticle(null)}
      />
    </div>
  );
}

export default Help;
