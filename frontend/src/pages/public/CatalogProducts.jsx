import { useEffect, useState } from 'react';
import SectionHeader from '../../components/SectionHeader';
import { getCatalogItems } from '../../services/catalog';

export default function CatalogProducts() {
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();

    async function loadCatalog() {
      try {
        const result = await getCatalogItems({ signal: controller.signal });

        if (!Array.isArray(result)) {
          throw new Error('The server returned an invalid catalog list.');
        }

        if (!controller.signal.aborted) setItems(result);
      } catch (error) {
        if (!controller.signal.aborted) setError(error.message);
      }
    }

    loadCatalog();
    return () => controller.abort();
  }, []);

  return (
    <section className="section">
      <div className="container">
        <SectionHeader eyebrow="Catalog" title="Hair system products" />
        {!items && !error && <p role="status">Loading catalog products…</p>}
        {error && <p role="alert" className="notice notice--warning">Couldn’t load catalog products. {error}</p>}
        {items?.length === 0 && <p className="muted">No catalog products are available right now.</p>}
        {items?.length > 0 && (
          <div className="two-col">
            {items.map((item) => (
              <article key={item.catalog_item_id} className="card stack">
                <h3>{item.item_name}</h3>
                {item.description && <p className="muted">{item.description}</p>}
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
