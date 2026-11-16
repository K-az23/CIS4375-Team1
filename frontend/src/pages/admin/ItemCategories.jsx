import { useState } from 'react';
import { Check, Info } from 'lucide-react';
import Panel from '../../components/Panel';
import DataTable from '../../components/DataTable';
import { api } from '../../api/client';

export default function ItemCategories({ categories, onUpdated }) {
  const [editingId, setEditingId] = useState(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function reload() {
    const data = await api('/api/admin/item-categories');
    onUpdated(data.categories ?? data.item_categories ?? []);
  }

  function edit(category) {
    setEditingId(category.category_id);
    setName(category.category_name);
    setDescription(category.description ?? '');
    setMessage('');
    setError('');
  }

  function clearForm() {
    setEditingId(null);
    setName('');
    setDescription('');
  }

  async function saveCategory(e) {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');
    try {
      const body = {
        category_name: name.trim(),
        description: description.trim() || null,
      };
      if (editingId === null) {
        await api('/api/admin/item-categories', { method: 'POST', body });
        setMessage('Category created.');
      } else {
        await api(`/api/admin/item-categories/${editingId}`, { method: 'PATCH', body });
        setMessage('Category updated.');
      }
      clearForm();
      await reload();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(category) {
    setSaving(true);
    setMessage('');
    setError('');
    try {
      if (category.is_active) {
        await api(`/api/admin/item-categories/${category.category_id}`, { method: 'DELETE' });
        setMessage('Category deactivated. Existing inventory items were kept.');
      } else {
        await api(`/api/admin/item-categories/${category.category_id}`, {
          method: 'PATCH',
          body: { is_active: true },
        });
        setMessage('Category reactivated.');
      }
      await reload();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const columns = [
    { key: 'category_name', label: 'Category' },
    { key: 'description', label: 'Description', render: (row) => row.description || '—' },
    { key: 'status', label: 'Status', render: (row) => row.is_active ? 'Active' : 'Inactive' },
    {
      key: 'actions',
      label: '',
      render: (row) => (
        <div className="row">
          <button type="button" className="btn btn-outline btn-sm" disabled={saving} onClick={() => edit(row)}>Edit</button>
          <button type="button" className="btn btn-outline btn-sm" disabled={saving} onClick={() => toggleActive(row)}>{row.is_active ? 'Deactivate' : 'Reactivate'}</button>
        </div>
      ),
    },
  ];

  return (
    <Panel title="Item categories">
      <div className="page-stack">
        {message && <p className="notice"><Check size={16} /> {message}</p>}
        {error && <p className="notice notice--warning"><Info size={16} /> {error}</p>}
        <form className="form" onSubmit={saveCategory}>
          <h4>{editingId === null ? 'New category' : 'Edit category'}</h4>
          <div className="field">
            <label htmlFor="category-name">Category name</label>
            <input id="category-name" required maxLength={100} value={name} onChange={(e) => setName(e.target.value)} disabled={saving} />
          </div>
          <div className="field">
            <label htmlFor="category-description">Description (optional)</label>
            <textarea id="category-description" maxLength={255} value={description} onChange={(e) => setDescription(e.target.value)} disabled={saving} />
          </div>
          <div className="row">
            <button className="btn btn-gold" disabled={saving}>{saving ? 'Saving…' : editingId === null ? 'Add category' : 'Save category'}</button>
            {editingId !== null && <button type="button" className="btn btn-outline" disabled={saving} onClick={clearForm}>Cancel edit</button>}
          </div>
        </form>
        <DataTable
          columns={columns}
          rows={(categories ?? []).map((category) => ({ ...category, id: category.category_id }))}
          emptyMessage="No categories yet."
        />
      </div>
    </Panel>
  );
}
