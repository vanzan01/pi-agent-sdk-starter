/**
 * Domain Configuration Panel
 * Allows users to create, edit, and delete domain configurations.
 */

import {
  Check,
  ChevronDown,
  ChevronUp,
  Layers,
  Palette,
  Pencil,
  Plus,
  Trash2,
  X
} from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';

import type { AppManifest } from '../../shared/apps/types';
import type { DomainConfig } from '../../shared/domains';
import { useDomainConfig } from '../hooks/useDomainConfig';

// Common Lucide icon names for domains
const DOMAIN_ICONS = [
  'Layers',
  'Folder',
  'Box',
  'Briefcase',
  'Code',
  'Database',
  'FileText',
  'Globe',
  'Heart',
  'Home',
  'Lightbulb',
  'Rocket',
  'Settings',
  'Star',
  'Target',
  'Users',
  'Zap'
];

// Preset colors for domains
const DOMAIN_COLORS = [
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#14b8a6', // teal
  '#06b6d4', // cyan
  '#6366f1' // indigo
];

interface DomainEditorProps {
  domain?: DomainConfig;
  availableApps: AppManifest[];
  onSave: (
    name: string,
    appIds: string[],
    primaryAppId: string,
    options?: { description?: string; icon?: string; color?: string }
  ) => void;
  onCancel: () => void;
  onDelete?: () => void;
}

function DomainEditor({ domain, availableApps, onSave, onCancel, onDelete }: DomainEditorProps) {
  const [name, setName] = useState(domain?.name ?? '');
  const [description, setDescription] = useState(domain?.description ?? '');
  const [selectedAppIds, setSelectedAppIds] = useState<string[]>(domain?.appIds ?? []);
  const [primaryAppId, setPrimaryAppId] = useState(domain?.primaryAppId ?? '');
  const [icon, setIcon] = useState(domain?.icon ?? 'Layers');
  const [color, setColor] = useState(domain?.color ?? DOMAIN_COLORS[0]);
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);

  const isEditing = !!domain;

  // Filter available apps for primary selection
  const selectedApps = useMemo(
    () => availableApps.filter((app) => selectedAppIds.includes(app.id)),
    [availableApps, selectedAppIds]
  );

  const effectivePrimaryAppId =
    primaryAppId && selectedAppIds.includes(primaryAppId)
      ? primaryAppId
      : selectedAppIds[0] ?? '';

  const toggleApp = useCallback((appId: string) => {
    setSelectedAppIds((prev) =>
      prev.includes(appId) ? prev.filter((id) => id !== appId) : [...prev, appId]
    );
  }, []);

  const handleSave = useCallback(() => {
    if (!name.trim() || selectedAppIds.length === 0) return;

    const finalPrimaryId = effectivePrimaryAppId || selectedAppIds[0];
    onSave(name.trim(), selectedAppIds, finalPrimaryId, {
      description: description.trim() || undefined,
      icon,
      color
    });
  }, [name, selectedAppIds, effectivePrimaryAppId, description, icon, color, onSave]);

  const canSave = name.trim() && selectedAppIds.length > 0;

  return (
    <div className="space-y-4 rounded-2xl border border-neutral-200/80 bg-neutral-50/50 p-4 dark:border-neutral-700 dark:bg-neutral-800/50">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">
          {isEditing ? 'Edit Domain' : 'Create New Domain'}
        </h3>
        <div className="flex items-center gap-2">
          {isEditing && onDelete && (
            <button
              onClick={onDelete}
              className="rounded-full p-1.5 text-red-500 transition hover:bg-red-100 dark:hover:bg-red-900/30"
              title="Delete domain"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={onCancel}
            className="rounded-full p-1.5 text-neutral-500 transition hover:bg-neutral-200 dark:hover:bg-neutral-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Name Input */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
          Domain Name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., News Team, Dev Tools"
          className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder:text-neutral-500"
        />
      </div>

      {/* Description Input */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
          Description (optional)
        </label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What does this domain do?"
          className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder:text-neutral-500"
        />
      </div>

      {/* Icon & Color Pickers */}
      <div className="flex gap-3">
        {/* Icon Picker */}
        <div className="relative flex-1 space-y-1.5">
          <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Icon</label>
          <button
            onClick={() => setShowIconPicker(!showIconPicker)}
            className="flex w-full items-center justify-between rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 transition hover:border-neutral-300 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:hover:border-neutral-600"
          >
            <span className="flex items-center gap-2">
              <Layers className="h-4 w-4" style={{ color }} />
              {icon}
            </span>
            {showIconPicker ?
              <ChevronUp className="h-4 w-4 text-neutral-400" />
            : <ChevronDown className="h-4 w-4 text-neutral-400" />}
          </button>
          {showIconPicker && (
            <div className="absolute top-full left-0 z-10 mt-1 grid max-h-40 w-full grid-cols-4 gap-1 overflow-y-auto rounded-xl border border-neutral-200 bg-white p-2 shadow-lg dark:border-neutral-700 dark:bg-neutral-800">
              {DOMAIN_ICONS.map((iconName) => (
                <button
                  key={iconName}
                  onClick={() => {
                    setIcon(iconName);
                    setShowIconPicker(false);
                  }}
                  className={`flex items-center justify-center rounded-lg p-2 text-xs transition ${
                    icon === iconName ?
                      'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                    : 'text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-700'
                  }`}
                  title={iconName}
                >
                  <Layers className="h-4 w-4" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Color Picker */}
        <div className="relative flex-1 space-y-1.5">
          <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
            Color
          </label>
          <button
            onClick={() => setShowColorPicker(!showColorPicker)}
            className="flex w-full items-center justify-between rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 transition hover:border-neutral-300 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:hover:border-neutral-600"
          >
            <span className="flex items-center gap-2">
              <Palette className="h-4 w-4" style={{ color }} />
              <span
                className="h-4 w-4 rounded-full border border-neutral-300 dark:border-neutral-600"
                style={{ backgroundColor: color }}
              />
            </span>
            {showColorPicker ?
              <ChevronUp className="h-4 w-4 text-neutral-400" />
            : <ChevronDown className="h-4 w-4 text-neutral-400" />}
          </button>
          {showColorPicker && (
            <div className="absolute top-full left-0 z-10 mt-1 flex flex-wrap gap-1 rounded-xl border border-neutral-200 bg-white p-2 shadow-lg dark:border-neutral-700 dark:bg-neutral-800">
              {DOMAIN_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => {
                    setColor(c);
                    setShowColorPicker(false);
                  }}
                  className={`h-6 w-6 rounded-full border-2 transition ${
                    color === c ?
                      'border-neutral-900 dark:border-white'
                    : 'border-transparent hover:scale-110'
                  }`}
                  style={{ backgroundColor: c }}
                  title={c}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* App Selection */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
          Select Apps ({selectedAppIds.length} selected)
        </label>
        <div className="grid grid-cols-2 gap-2">
          {availableApps.map((app) => {
            const isSelected = selectedAppIds.includes(app.id);
            return (
              <button
                key={app.id}
                onClick={() => toggleApp(app.id)}
                className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm transition ${
                  isSelected ?
                    'border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-400 dark:bg-blue-900/30 dark:text-blue-300'
                  : 'border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:border-neutral-600'
                }`}
              >
                <span
                  className={`flex h-4 w-4 items-center justify-center rounded border ${
                    isSelected ?
                      'border-blue-500 bg-blue-500 dark:border-blue-400 dark:bg-blue-400'
                    : 'border-neutral-300 dark:border-neutral-600'
                  }`}
                >
                  {isSelected && <Check className="h-3 w-3 text-white" />}
                </span>
                <span className="truncate">{app.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Primary App Selection */}
      {selectedApps.length > 0 && (
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
            Primary App (opens by default)
          </label>
          <select
            value={effectivePrimaryAppId}
            onChange={(e) => setPrimaryAppId(e.target.value)}
            className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
          >
            {selectedApps.map((app) => (
              <option key={app.id} value={app.id}>
                {app.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-end gap-2 pt-2">
        <button
          onClick={onCancel}
          className="rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={!canSave}
          className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-blue-500 dark:hover:bg-blue-600"
        >
          {isEditing ? 'Save Changes' : 'Create Domain'}
        </button>
      </div>
    </div>
  );
}

interface DomainCardProps {
  domain: DomainConfig;
  apps: AppManifest[];
  onEdit: () => void;
}

function DomainCard({ domain, apps, onEdit }: DomainCardProps) {
  const domainApps = apps.filter((app) => domain.appIds.includes(app.id));
  const primaryApp = apps.find((app) => app.id === domain.primaryAppId);

  return (
    <div
      className="group relative rounded-2xl border border-neutral-200/80 bg-white p-4 transition hover:border-neutral-300 hover:shadow-md dark:border-neutral-700 dark:bg-neutral-800/70 dark:hover:border-neutral-600"
      style={{ borderLeftColor: domain.color, borderLeftWidth: 4 }}
    >
      <button
        onClick={onEdit}
        className="absolute top-3 right-3 rounded-full p-1.5 text-neutral-400 opacity-0 transition group-hover:opacity-100 hover:bg-neutral-100 dark:hover:bg-neutral-700"
        title="Edit domain"
      >
        <Pencil className="h-3.5 w-3.5" />
      </button>

      <div className="flex items-start gap-3">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-xl"
          style={{ backgroundColor: `${domain.color}20`, color: domain.color }}
        >
          <Layers className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="font-semibold text-neutral-900 dark:text-neutral-100">{domain.name}</h4>
          {domain.description && (
            <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
              {domain.description}
            </p>
          )}
          <div className="mt-2 flex flex-wrap gap-1">
            {domainApps.map((app) => (
              <span
                key={app.id}
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
                  app.id === domain.primaryAppId ?
                    'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                  : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-400'
                }`}
              >
                {app.name}
                {app.id === domain.primaryAppId && ' ★'}
              </span>
            ))}
          </div>
          <p className="mt-2 text-[10px] text-neutral-400 dark:text-neutral-500">
            {domainApps.length} app{domainApps.length !== 1 ? 's' : ''} •{' '}
            {primaryApp ? `Opens: ${primaryApp.name}` : 'No primary set'}
          </p>
        </div>
      </div>
    </div>
  );
}

export function DomainConfigPanel() {
  const { domainList, createDomain, updateDomain, deleteDomain, getAvailableApps } =
    useDomainConfig();

  const [isCreating, setIsCreating] = useState(false);
  const [editingDomainId, setEditingDomainId] = useState<string | null>(null);

  const availableApps = getAvailableApps();

  const handleCreate = useCallback(
    (
      name: string,
      appIds: string[],
      primaryAppId: string,
      options?: { description?: string; icon?: string; color?: string }
    ) => {
      createDomain(name, appIds, primaryAppId, options);
      setIsCreating(false);
    },
    [createDomain]
  );

  const handleUpdate = useCallback(
    (
      domainId: string,
      name: string,
      appIds: string[],
      primaryAppId: string,
      options?: { description?: string; icon?: string; color?: string }
    ) => {
      updateDomain(domainId, {
        name,
        appIds,
        primaryAppId,
        description: options?.description,
        icon: options?.icon,
        color: options?.color
      });
      setEditingDomainId(null);
    },
    [updateDomain]
  );

  const handleDelete = useCallback(
    (domainId: string) => {
      if (window.confirm('Are you sure you want to delete this domain?')) {
        deleteDomain(domainId);
        setEditingDomainId(null);
      }
    },
    [deleteDomain]
  );

  const editingDomain = editingDomainId ? domainList.find((d) => d.id === editingDomainId) : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-50">
            Domain Configuration
          </h2>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            Group apps together into custom domains for personalized workflows.
          </p>
        </div>
        {!isCreating && !editingDomainId && (
          <button
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
          >
            <Plus className="h-4 w-4" />
            New Domain
          </button>
        )}
      </div>

      {/* Create/Edit Form */}
      {(isCreating || editingDomain) && (
        <DomainEditor
          domain={editingDomain ?? undefined}
          availableApps={availableApps}
          onSave={
            editingDomain ?
              (name, appIds, primaryAppId, options) =>
                handleUpdate(editingDomain.id, name, appIds, primaryAppId, options)
            : handleCreate
          }
          onCancel={() => {
            setIsCreating(false);
            setEditingDomainId(null);
          }}
          onDelete={editingDomain ? () => handleDelete(editingDomain.id) : undefined}
        />
      )}

      {/* Domain List */}
      {domainList.length === 0 && !isCreating ?
        <div className="rounded-2xl border border-dashed border-neutral-300 bg-neutral-50/50 py-12 text-center dark:border-neutral-700 dark:bg-neutral-800/30">
          <Layers className="mx-auto h-10 w-10 text-neutral-300 dark:text-neutral-600" />
          <p className="mt-3 text-sm text-neutral-500 dark:text-neutral-400">
            No domains configured yet
          </p>
          <p className="mt-1 text-xs text-neutral-400 dark:text-neutral-500">
            Create a domain to group related apps together
          </p>
          <button
            onClick={() => setIsCreating(true)}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Create Your First Domain
          </button>
        </div>
      : <div className="grid gap-3 sm:grid-cols-2">
          {domainList.map((domain) => (
            <DomainCard
              key={domain.id}
              domain={domain}
              apps={availableApps}
              onEdit={() => setEditingDomainId(domain.id)}
            />
          ))}
        </div>
      }
    </div>
  );
}
