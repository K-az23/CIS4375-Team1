import { useState } from 'react';
import Panel from '../../components/Panel';
import DataTable from '../../components/DataTable';
import {
  getItemCategories,
  getItemCategory,
  createItemCategory,
  updateItemCategory,
  deactivateItemCategory,
} from '../../services/itemCategories';

// Show field validation messages from Flask in one readable message.
function getErrorMessage(error) {
  if (error.details) return Object.values(error.details).join(' ');
  return error.message;
}

export default function ItemCategories({ categories, error, onUpdated, onBusyChange }) {
  const [editingId, setEditingId] = useState(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [actionError, setActionError] = useState('');
  const [listError, setListError] = useState('');

  // Re-read the list after a change. The Inventory page uses this same list
  // for category names and for the New item dropdown.
  async function reloadCategories() {
    setListError('');
    try {
      const savedCategories = await getItemCategories();
      onUpdated(savedCategories);
    } catch (error) {
      setListError('Couldn’t refresh categories. ' + error.message);
    }
  }

  async function refresh() {
    setSaving(true);
    onBusyChange(true);
    await reloadCategories();
    setSaving(false);
    onBusyChange(false);
  }

  // Read the selected category from Flask, then fill in the edit form.
  async function editCategory(id) {
    setMessage('');
    setActionError('');
    setSaving(true);
    onBusyChange(true);
    try {
      const category = await getItemCategory(id);
      setEditingId(category.category_id);
      setName(category.category_name);
      setDescription(category.description || '');
    } catch (error) {
      setActionError(getErrorMessage(error));
    } finally {
      setSaving(false);
      onBusyChange(false);
    }
  }

  function cancelEdit() {
    setEditingId(null);
    setName('');
    setDescription('');
    setActionError('');
  }

  // Use the same form to add a category or save the selected category.
  // Keep its inputs filled if the backend rejects the change.
  async function saveCategory(event) {
    event.preventDefault();
    setMessage('');
    setActionError('');
    if (!name.trim()) {
      setActionError('Enter a category name.');
      return;
    }

    setSaving(true);
    onBusyChange(true);
    const fields = {
      category_name: name.trim(),
      description: description.trim() || null,
    };
    try {
      if (editingId === null) {
        await createItemCategory(fields);
        setMessage('Category created.');
      } else {
        await updateItemCategory(editingId, fields);
        setMessage('Category changes saved.');
      }
      setEditingId(null);
      setName('');
      setDescription('');
      await reloadCategories();
    } catch (error) {
      setActionError(getErrorMessage(error));
    } finally {
      setSaving(false);
      onBusyChange(false);
    }
  }

  // Deactivation removes the category from new-item choices. Existing
  // inventory items keep their category and are not deleted.
  async function deactivate(category) {
    const confirmed = window.confirm(`Deactivate ${category.category_name}? Existing inventory items will be kept.`);
    if (!confirmed) return;

    setMessage('');
    setActionError('');
    setSaving(true);
    onBusyChange(true);
    try {
      await deactivateItemCategory(category.category_id);
      if (editingId === category.category_id) {
        setEditingId(null);
        setName('');
        setDescription('');
      }
      setMessage('Category deactivated. Existing inventory items were kept.');
      await reloadCategories();
    } catch (error) {
      setActionError(getErrorMessage(error));
    } finally {
      setSaving(false);
      onBusyChange(false);
    }
  }

  // The existing backend also lets an admin make a category active again.
  async function reactivate(category) {
    setMessage('');
    setActionError('');
    setSaving(true);
    onBusyChange(true);
    try {
      await updateItemCategory(category.category_id, { is_active: true });
      setMessage('Category reactivated.');
      await reloadCategories();
    } catch (error) {
      setActionError(getErrorMessage(error));
    } finally {
      setSaving(false);
      onBusyChange(false);
    }
  }

  const columns = [
    { key: 'category_name', label: 'Category' },
    { key: 'description', label: 'Description', render: (category) => category.description || '—' },
    { key: 'is_active', label: 'Status', render: (category) => category.is_active ? 'Active' : 'Inactive' },
    { key: 'actions', label: '', render: (category) => (
      <div className="row" style={{ flexWrap: 'wrap' }}>
        <button type="button" className="btn btn-outline btn-sm" disabled={saving} onClick={() => editCategory(category.category_id)}>Edit</button>
        {category.is_active ? (
          <button type="button" className="btn btn-outline btn-sm" disabled={saving} onClick={() => deactivate(category)}>Deactivate</button>
        ) : (
          <button type="button" className="btn btn-outline btn-sm" disabled={saving} onClick={() => reactivate(category)}>Reactivate</button>
        )}
      </div>
    ) },
  ];

  // Searching only filters the displayed table; it does not change saved data.
  const searchText = search.trim().toLowerCase();
  const visibleCategories = categories?.filter((category) => category.category_name.toLowerCase().includes(searchText));
  const rows = visibleCategories?.map((category) => ({ ...category, id: category.category_id }));
  const displayedError = listError || error;

  return (
    <Panel title="Item categories">
      <div className="page-stack">
        {message && <p role="status" className="notice">{message}</p>}
        {actionError && <p role="alert" className="notice notice--warning">{actionError}</p>}
        {displayedError && <p role="alert" className="notice notice--warning">{displayedError}</p>}
        {!categories && !displayedError && <p role="status">Loading categories…</p>}
        <div><button type="button" className="btn btn-outline btn-sm" disabled={saving} onClick={refresh}>Refresh categories</button></div>

        {/* The name is required. The description is optional. */}
        <form className="form" onSubmit={saveCategory}>
          <h4>{editingId === null ? 'New category' : 'Edit category'}</h4>
          <div className="field">
            <label htmlFor="category-name">Category name</label>
            <input id="category-name" required maxLength={100} value={name} disabled={saving || !categories} onChange={(event) => setName(event.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="category-description">Description (optional)</label>
            <textarea id="category-description" maxLength={255} value={description} disabled={saving || !categories} onChange={(event) => setDescription(event.target.value)} />
          </div>
          <div className="row">
            <button className="btn btn-gold" disabled={saving || !categories}>{saving ? 'Please wait…' : editingId === null ? 'Add category' : 'Save category'}</button>
            {editingId !== null && <button type="button" className="btn btn-outline" disabled={saving} onClick={cancelEdit}>Cancel edit</button>}
          </div>
        </form>

        {/* Inactive categories stay visible here so they can be reviewed or reactivated. */}
        <div className="field">
          <label htmlFor="category-search">Search categories</label>
          <input id="category-search" type="search" value={search} onChange={(event) => setSearch(event.target.value)} />
        </div>
        {rows && <DataTable columns={columns} rows={rows} emptyMessage={searchText ? 'No categories match your search.' : 'No categories yet.'} />}
      </div>
    </Panel>
  );
}
