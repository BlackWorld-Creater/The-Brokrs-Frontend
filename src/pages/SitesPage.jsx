import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import SyncBanner from '../components/ui/SyncBanner'
import ChangeHistoryDrawer from '../components/ui/ChangeHistoryDrawer'
import useSyncStore from '../store/syncStore'
import { changeHistoryAPI } from '../services/api'
import { sitesAPI, companiesAPI, usersAPI } from '../services/api'
import useAuthStore from '../store/authStore'
import {
  MapPin, Plus, Edit, Trash2, X, Globe, Phone, Mail,
  Building2, Search, RefreshCw, Eye, Star, Users, Map, Clock
} from 'lucide-react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'

const SITE_TYPES = [
  { value: 'hq',            label: '🏛 Headquarters'  },
  { value: 'branch',        label: '🏢 Branch Office'  },
  { value: 'warehouse',     label: '🏭 Warehouse'      },
  { value: 'factory',       label: '⚙️ Factory / Plant' },
  { value: 'data_center',   label: '🖥 Data Center'    },
  { value: 'retail',        label: '🛍 Retail Store'   },
  { value: 'service_center',label: '🔧 Service Center' },
  { value: 'remote',        label: '🌐 Remote Office'  },
  { value: 'other',         label: '📍 Other'          },
]

/* ── SiteModal — receives onSyncResult as prop ───────────────────── */
function SiteModal({ site, companies, users, onClose, onSaved, onSyncResult }) {
  const isEdit = !!site
  const [tab, setTab] = useState('basic')
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    defaultValues: site ? {
      companyId:    site.company_id,
      code:         site.code,
      name:         site.name,
      type:         site.type,
      email:        site.email,
      phone:        site.phone,
      fax:          site.fax,
      addressLine1: site.address_line1,
      addressLine2: site.address_line2,
      city:         site.city,
      state:        site.state,
      country:      site.country,
      pincode:      site.pincode,
      gstin:        site.gstin,
      latitude:     site.latitude,
      longitude:    site.longitude,
      timezone:     site.timezone,
      isActive:     site.is_active,
      isHq:         site.is_hq,
      managerId:    site.manager_id,
      capacity:     site.capacity,
      areaSqft:     site.area_sqft,
      description:  site.description,
    } : {
      type: 'branch', country: 'India',
      timezone: 'Asia/Kolkata', isActive: true, isHq: false,
    }
  })

  const onSubmit = async (data) => {
    try {
      if (isEdit) {
        const res = await sitesAPI.update(site.id, data)
        // Pass sync result UP to parent via prop — don't call store here
        onSyncResult?.('site', data.name, res.data?.data?.syncSummary)
      } else {
        await sitesAPI.create(data)
      }
      toast.success(isEdit ? 'Site updated' : 'Site created')
      onSaved()
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed')
    }
  }

  const TABS = [
    { id: 'basic',   label: 'Basic'   },
    { id: 'address', label: 'Address' },
    { id: 'details', label: 'Details' },
  ]

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-content" style={{ maxWidth: 600 }}>
        {/* Header */}
        <div className="flex items-center justify-between p-5"
          style={{ borderBottom: '1px solid rgba(var(--border))' }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(var(--success),0.1)', border: '1px solid rgba(var(--success),0.2)' }}>
              <MapPin size={15} style={{ color: 'rgb(var(--success))' }} />
            </div>
            <h2 className="section-title">{isEdit ? `Edit: ${site.name}` : 'New Site'}</h2>
          </div>
          <button onClick={onClose} className="btn-ghost p-1.5"><X size={16} /></button>
        </div>

        {/* Tab strip */}
        <div className="flex gap-0.5 px-5 pt-4">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={{
                background: tab === t.id ? 'rgba(var(--accent),0.15)' : 'transparent',
                color:      tab === t.id ? 'rgb(var(--accent-light))' : 'rgb(var(--text-muted))',
                border:     tab === t.id ? '1px solid rgba(var(--accent),0.25)' : '1px solid transparent',
              }}>
              {t.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="p-5 overflow-y-auto" style={{ maxHeight: '55vh' }}>

            {/* ── BASIC ── */}
            {tab === 'basic' && (
              <div className="space-y-4">
                <div>
                  <label className="label">Company *</label>
                  <select className="input-field"
                    {...register('companyId', { required: 'Company is required' })}
                    disabled={isEdit}>
                    <option value="">Select company</option>
                    {companies?.map(c => (
                      <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                    ))}
                  </select>
                  {errors.companyId && (
                    <p className="text-xs mt-1" style={{ color: 'rgb(var(--danger))' }}>{errors.companyId.message}</p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Site Code *</label>
                    <input className="input-field font-mono" placeholder="HQ001"
                      {...register('code', { required: 'Code is required' })} />
                    {errors.code && (
                      <p className="text-xs mt-1" style={{ color: 'rgb(var(--danger))' }}>{errors.code.message}</p>
                    )}
                  </div>
                  <div>
                    <label className="label">Site Type</label>
                    <select className="input-field" {...register('type')}>
                      {SITE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="label">Site Name *</label>
                  <input className="input-field" placeholder="Head Office Mumbai"
                    {...register('name', { required: 'Name is required' })} />
                  {errors.name && (
                    <p className="text-xs mt-1" style={{ color: 'rgb(var(--danger))' }}>{errors.name.message}</p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Email</label>
                    <input type="email" className="input-field" {...register('email')} />
                  </div>
                  <div>
                    <label className="label">Phone</label>
                    <input className="input-field" {...register('phone')} />
                  </div>
                </div>
                <div>
                  <label className="label">Site Manager</label>
                  <select className="input-field" {...register('managerId')}>
                    <option value="">No manager</option>
                    {users?.filter(u => u.status === 'active').map(u => (
                      <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* ── ADDRESS ── */}
            {tab === 'address' && (
              <div className="space-y-4">
                <div>
                  <label className="label">Address Line 1</label>
                  <input className="input-field" {...register('addressLine1')} />
                </div>
                <div>
                  <label className="label">Address Line 2</label>
                  <input className="input-field" {...register('addressLine2')} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">City</label>
                    <input className="input-field" {...register('city')} />
                  </div>
                  <div>
                    <label className="label">State</label>
                    <input className="input-field" {...register('state')} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Country</label>
                    <input className="input-field" {...register('country')} />
                  </div>
                  <div>
                    <label className="label">Pincode</label>
                    <input className="input-field font-mono" {...register('pincode')} />
                  </div>
                </div>
                <div>
                  <label className="label">GSTIN</label>
                  <input className="input-field font-mono uppercase" {...register('gstin')} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Latitude</label>
                    <input type="number" step="0.0000001" className="input-field" {...register('latitude')} />
                  </div>
                  <div>
                    <label className="label">Longitude</label>
                    <input type="number" step="0.0000001" className="input-field" {...register('longitude')} />
                  </div>
                </div>
              </div>
            )}

            {/* ── DETAILS ── */}
            {tab === 'details' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Capacity (persons)</label>
                    <input type="number" className="input-field" {...register('capacity')} />
                  </div>
                  <div>
                    <label className="label">Area (sq.ft)</label>
                    <input type="number" step="0.01" className="input-field" {...register('areaSqft')} />
                  </div>
                </div>
                <div>
                  <label className="label">Description</label>
                  <textarea className="input-field" rows={3} {...register('description')} />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 rounded-xl"
                    style={{ background: 'rgba(var(--bg-hover))', border: '1px solid rgba(var(--border))' }}>
                    <div>
                      <p className="text-sm font-semibold" style={{ color: 'rgb(var(--text-primary))' }}>Active</p>
                      <p className="text-xs" style={{ color: 'rgb(var(--text-muted))' }}>Site is operational</p>
                    </div>
                    <input type="checkbox" {...register('isActive')}
                      style={{ accentColor: 'rgb(var(--accent))', width: 16, height: 16 }} />
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-xl"
                    style={{ background: 'rgba(var(--accent),0.06)', border: '1px solid rgba(var(--accent),0.15)' }}>
                    <div>
                      <p className="text-sm font-semibold" style={{ color: 'rgb(var(--accent-light))' }}>Headquarters</p>
                      <p className="text-xs" style={{ color: 'rgb(var(--text-muted))' }}>Mark as HQ for this company</p>
                    </div>
                    <input type="checkbox" {...register('isHq')}
                      style={{ accentColor: 'rgb(var(--accent))', width: 16, height: 16 }} />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-3 px-5 pb-5">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="btn-primary flex-1 justify-center">
              {isSubmitting ? 'Saving...' : isEdit ? 'Update Site' : 'Create Site'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ── Main Page ───────────────────────────────────────────────────── */
export default function SitesPage() {
  const { hasPermission } = useAuthStore()
  const queryClient = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing]     = useState(null)
  const [deleting, setDeleting]   = useState(null)
  const [historyFor, setHistoryFor] = useState(null)
  const [search, setSearch]         = useState('')
  const [companyFilter, setCompanyFilter] = useState('')
  const [typeFilter, setTypeFilter]       = useState('')
  const [page, setPage]             = useState(1)

  // handleSyncResult lives HERE in the parent, passed down as prop
  const { handleSyncResult } = useSyncStore()

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['sites', search, companyFilter, typeFilter, page],
    queryFn: () => sitesAPI.getAll({
      search, companyId: companyFilter, type: typeFilter, page, limit: 15,
    }).then(r => r.data),
    keepPreviousData: true,
  })

  const { data: companies } = useQuery({
    queryKey: ['companies-list'],
    queryFn: () => companiesAPI.getAll({ limit: 100 }).then(r => r.data.data),
  })

  const { data: usersData } = useQuery({
    queryKey: ['users-active'],
    queryFn: () => usersAPI.getAll({ limit: 200, status: 'active' }).then(r => r.data.data),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => sitesAPI.delete(id),
    onSuccess: () => {
      toast.success('Site deleted')
      queryClient.invalidateQueries(['sites'])
      setDeleting(null)
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Cannot delete HQ site'),
  })

  const sites      = data?.data || []
  const pagination = data?.pagination
  const hqCount    = sites.filter(s => s.is_hq).length
  const activeCount= sites.filter(s => s.is_active).length

  return (
    <div className="space-y-5">
      <SyncBanner />

      {/* Stats */}
      {pagination && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total Sites', value: pagination.total,        color: 'rgb(var(--accent-light))' },
            { label: 'Active',      value: activeCount,             color: 'rgb(var(--success))' },
            { label: 'HQ Sites',    value: hqCount,                 color: 'rgb(var(--warning))' },
            { label: 'Companies',   value: companies?.length ?? 0,  color: 'rgb(var(--info))' },
          ].map(s => (
            <div key={s.label} className="stat-card text-center py-4">
              <p className="text-2xl font-display font-bold" style={{ color: s.color }}>{s.value}</p>
              <p className="text-xs mt-0.5" style={{ color: 'rgb(var(--text-muted))' }}>{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: 'rgb(var(--text-muted))' }} />
          <input className="input-field pl-9" placeholder="Search sites..."
            value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
        </div>
        <select className="input-field" style={{ width: 180 }}
          value={companyFilter} onChange={e => { setCompanyFilter(e.target.value); setPage(1) }}>
          <option value="">All Companies</option>
          {companies?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select className="input-field" style={{ width: 160 }}
          value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(1) }}>
          <option value="">All Types</option>
          {SITE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <button onClick={() => queryClient.invalidateQueries(['sites'])} className="btn-secondary px-3">
          <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
        </button>
        {hasPermission('sites', 'create') && (
          <button className="btn-primary whitespace-nowrap"
            onClick={() => { setEditing(null); setShowModal(true) }}>
            <Plus size={14} /> New Site
          </button>
        )}
      </div>

      {/* Table */}
      <div className="card">
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Site</th>
                <th>Company</th>
                <th>Type</th>
                <th>Location</th>
                <th>Manager</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                [...Array(6)].map((_, i) => (
                  <tr key={i}>{[...Array(7)].map((_, j) => (
                    <td key={j}><div className="h-4 rounded animate-pulse"
                      style={{ background: 'rgba(var(--bg-hover))' }} /></td>
                  ))}</tr>
                ))
              ) : sites.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-14">
                    <MapPin size={36} className="mx-auto mb-2" style={{ color: 'rgb(var(--text-muted))' }} />
                    <p style={{ color: 'rgb(var(--text-muted))' }}>No sites found</p>
                    {hasPermission('sites', 'create') && (
                      <button className="btn-primary mx-auto mt-3"
                        onClick={() => { setEditing(null); setShowModal(true) }}>
                        <Plus size={13} /> Add Site
                      </button>
                    )}
                  </td>
                </tr>
              ) : sites.map(s => (
                <tr key={s.id}>
                  <td>
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ background: s.is_hq ? 'rgba(var(--accent),0.15)' : 'rgba(var(--bg-hover))' }}>
                        <MapPin size={13} style={{ color: s.is_hq ? 'rgb(var(--accent-light))' : 'rgb(var(--text-muted))' }} />
                      </div>
                      <div>
                        <p className="font-medium text-sm" style={{ color: 'rgb(var(--text-primary))' }}>{s.name}</p>
                        <p className="text-xs font-mono" style={{ color: 'rgb(var(--text-muted))' }}>{s.code}</p>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div>
                      <p className="text-xs font-medium" style={{ color: 'rgb(var(--text-primary))' }}>{s.company_name}</p>
                      <p className="text-xs font-mono" style={{ color: 'rgb(var(--text-muted))' }}>{s.company_code}</p>
                    </div>
                  </td>
                  <td>
                    <div className="flex items-center gap-1.5">
                      <span className="badge badge-neutral capitalize" style={{ fontSize: 10 }}>
                        {s.type?.replace('_', ' ')}
                      </span>
                      {s.is_hq && <span className="badge badge-accent" style={{ fontSize: 10 }}>HQ</span>}
                    </div>
                  </td>
                  <td>
                    {s.city
                      ? <span className="text-xs" style={{ color: 'rgb(var(--text-secondary))' }}>
                          {[s.city, s.state].filter(Boolean).join(', ')}
                        </span>
                      : <span style={{ color: 'rgb(var(--text-muted))' }}>—</span>
                    }
                  </td>
                  <td>
                    {s.mgr_first
                      ? <span className="text-xs" style={{ color: 'rgb(var(--text-secondary))' }}>
                          {s.mgr_first} {s.mgr_last}
                        </span>
                      : <span style={{ color: 'rgb(var(--text-muted))' }}>—</span>
                    }
                  </td>
                  <td>
                    <span className={`badge ${s.is_active ? 'badge-success' : 'badge-neutral'}`}>
                      {s.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <div className="flex gap-1">
                      <button onClick={() => setHistoryFor(s)} title="Change History"
                        className="w-7 h-7 rounded flex items-center justify-center hover:bg-white/5"
                        style={{ color: 'rgb(var(--text-muted))' }}>
                        <Clock size={12} />
                      </button>
                      {hasPermission('sites', 'update') && (
                        <button onClick={() => { setEditing(s); setShowModal(true) }}
                          className="w-7 h-7 rounded flex items-center justify-center hover:bg-white/5"
                          style={{ color: 'rgb(var(--text-muted))' }}>
                          <Edit size={12} />
                        </button>
                      )}
                      {hasPermission('sites', 'delete') && !s.is_hq && (
                        <button onClick={() => setDeleting(s)}
                          className="w-7 h-7 rounded flex items-center justify-center"
                          style={{ color: 'rgb(var(--danger))' }}>
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {pagination && (
          <div className="flex items-center justify-between px-4 py-3"
            style={{ borderTop: '1px solid rgba(var(--border))' }}>
            <p className="text-xs" style={{ color: 'rgb(var(--text-muted))' }}>
              {pagination.total} sites · Page {pagination.page}/{pagination.totalPages}
            </p>
            <div className="flex gap-2">
              <button disabled={!pagination.hasPrevPage} onClick={() => setPage(p => p - 1)}
                className="btn-secondary text-xs px-3 py-1.5 disabled:opacity-40">Prev</button>
              <button disabled={!pagination.hasNextPage} onClick={() => setPage(p => p + 1)}
                className="btn-secondary text-xs px-3 py-1.5 disabled:opacity-40">Next</button>
            </div>
          </div>
        )}
      </div>

      {/* Delete confirm */}
      {deleting && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setDeleting(null)}>
          <div className="modal-content" style={{ maxWidth: 360 }}>
            <div className="p-6 text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto"
                style={{ background: 'rgba(var(--danger),0.1)', border: '1px solid rgba(var(--danger),0.2)' }}>
                <Trash2 size={20} style={{ color: 'rgb(var(--danger))' }} />
              </div>
              <div>
                <p className="font-semibold" style={{ color: 'rgb(var(--text-primary))' }}>
                  Delete "{deleting.name}"?
                </p>
                <p className="text-xs mt-1" style={{ color: 'rgb(var(--text-muted))' }}>
                  This action cannot be undone.
                </p>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setDeleting(null)} className="btn-secondary flex-1">Cancel</button>
                <button onClick={() => deleteMutation.mutate(deleting.id)}
                  disabled={deleteMutation.isPending} className="btn-danger flex-1 justify-center">
                  {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Change history drawer */}
      {historyFor && (
        <ChangeHistoryDrawer
          entityType="site"
          entityId={historyFor.id}
          entityName={historyFor.name}
          fetchFn={() => changeHistoryAPI.getSiteChanges(historyFor.id)}
          onClose={() => setHistoryFor(null)}
        />
      )}

      {/* Site form modal — onSyncResult passed down as prop */}
      {showModal && (
        <SiteModal
          site={editing}
          companies={companies}
          users={usersData}
          onClose={() => setShowModal(false)}
          onSaved={() => queryClient.invalidateQueries(['sites'])}
          onSyncResult={handleSyncResult}
        />
      )}
    </div>
  )
}
